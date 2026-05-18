"""
PMAIOS v0.3.4 多产品线需求池

核心功能:
- 从会议纪要自动提取需求
- 从日报自动提取需求
- 从 OKR 自动提取需求
- 根据项目文档自动收敛
- 保存每次更新记录
"""
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, asdict, field
from enum import Enum
import hashlib

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


def create_anthropic_client():
    import anthropic
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else anthropic.Anthropic()


class RequirementSource(str, Enum):
    """需求来源"""
    MEETING = "meeting"  # 会议纪要
    DAILY_REPORT = "daily_report"  # 日报
    OKR = "okr"  # OKR
    PROJECT_DOC = "project_doc"  # 项目文档
    MANUAL = "manual"  # 手动创建


class RequirementStatus(str, Enum):
    """需求状态"""
    DRAFT = "draft"  # 草稿
    BACKLOG = "backlog"  # 待办
    ANALYZING = "analyzing"  # 分析中
    READY = "ready"  # 就绪
    IN_PROGRESS = "in_progress"  # 进行中
    DONE = "done"  # 已完成
    ARCHIVED = "archived"  # 已归档


class RequirementPriority(str, Enum):
    """需求优先级"""
    P0 = "P0"  # 紧急重要
    P1 = "P1"  # 重要
    P2 = "P2"  # 一般
    P3 = "P3"  # 低优先级


@dataclass
class Requirement:
    """需求定义"""
    id: str
    title: str
    description: str
    product_line: str
    source: RequirementSource
    source_doc_id: str
    status: RequirementStatus = RequirementStatus.DRAFT
    priority: RequirementPriority = RequirementPriority.P2
    created_at: str = ""
    updated_at: str = ""
    tags: List[str] = field(default_factory=list)
    related_requirements: List[str] = field(default_factory=list)
    owner: Optional[str] = None
    acceptance_criteria: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.5  # 需求置信度 0-1

    def __post_init__(self):
        now = datetime.utcnow().isoformat()
        if not self.created_at:
            self.created_at = now
        if not self.updated_at:
            self.updated_at = now

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Requirement":
        data["source"] = RequirementSource(data.get("source", "manual"))
        data["status"] = RequirementStatus(data.get("status", "draft"))
        data["priority"] = RequirementPriority(data.get("priority", "P2"))
        return cls(**data)


@dataclass
class UpdateRecord:
    """更新记录"""
    id: str
    timestamp: str
    update_type: str  # create, update, merge, converge, archive
    requirements_affected: List[str]
    source_doc_id: str
    changes: Dict[str, Any]
    summary: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProductLine:
    """产品线"""
    id: str
    name: str
    description: str
    okrs: List[Dict[str, Any]] = field(default_factory=list)
    active_requirements: int = 0
    completed_requirements: int = 0


class RequirementPool:
    """需求池主类"""

    def __init__(self, storage_dir: str = "./requirement_pool"):
        self.storage_dir = storage_dir
        self.requirements_dir = os.path.join(storage_dir, "requirements")
        self.records_dir = os.path.join(storage_dir, "records")
        self.product_lines_dir = os.path.join(storage_dir, "product_lines")

        # 确保目录存在
        os.makedirs(self.requirements_dir, exist_ok=True)
        os.makedirs(self.records_dir, exist_ok=True)
        os.makedirs(self.product_lines_dir, exist_ok=True)

        # 内存缓存
        self._requirements: Dict[str, Requirement] = {}
        self._product_lines: Dict[str, ProductLine] = {}
        self._update_records: List[UpdateRecord] = []

        # 加载现有数据
        self._load_all()

    def _load_all(self) -> None:
        """加载所有数据"""
        # 加载需求
        if os.path.exists(self.requirements_dir):
            for filename in os.listdir(self.requirements_dir):
                if filename.endswith(".json"):
                    filepath = os.path.join(self.requirements_dir, filename)
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        req = Requirement.from_dict(data)
                        self._requirements[req.id] = req

        # 加载产品线
        if os.path.exists(self.product_lines_dir):
            for filename in os.listdir(self.product_lines_dir):
                if filename.endswith(".json"):
                    filepath = os.path.join(self.product_lines_dir, filename)
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        pl = ProductLine(**data)
                        self._product_lines[pl.id] = pl

        # 加载更新记录
        if os.path.exists(self.records_dir):
            for filename in os.listdir(self.records_dir):
                if filename.endswith(".json"):
                    filepath = os.path.join(self.records_dir, filename)
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        record = UpdateRecord(**data)
                        self._update_records.append(record)

    def _save_requirement(self, req: Requirement) -> None:
        """保存需求"""
        req.updated_at = datetime.utcnow().isoformat()
        filepath = os.path.join(self.requirements_dir, f"{req.id}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(req.to_dict(), f, indent=2, ensure_ascii=False)
        self._requirements[req.id] = req

    def _save_record(self, record: UpdateRecord) -> None:
        """保存更新记录"""
        filepath = os.path.join(self.records_dir, f"{record.id}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, indent=2, ensure_ascii=False)
        self._update_records.append(record)

    def _generate_id(self, prefix: str = "") -> str:
        """生成 ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        return f"{prefix}{timestamp}" if prefix else timestamp

    # ============================================================
    # 核心 API - 从不同来源提取需求
    # ============================================================

    def extract_from_meeting(self, meeting_notes: str, product_line: str, meeting_id: str = "") -> List[Requirement]:
        """从会议纪要提取需求"""
        client = create_anthropic_client()

        if not meeting_id:
            meeting_id = self._generate_id("mtg_")

        prompt = f"""
从以下会议纪要中提取产品需求：

会议纪要：
{meeting_notes}

产品线：{product_line}

请提取所有潜在的产品需求，返回 JSON 列表格式：
[
  {{
    "title": "需求标题",
    "description": "需求详细描述",
    "priority": "P0|P1|P2|P3",
    "tags": ["标签 1", "标签 2"],
    "acceptance_criteria": ["验收标准 1", "验收标准 2"],
    "confidence": 0.8
  }}
]
"""
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.content[0].text if response.content else "[]"

        # 解析 JSON
        requirements = self._parse_json_list(output)

        created = []
        for req_data in requirements:
            req = Requirement(
                id=self._generate_id("req_"),
                title=req_data.get("title", ""),
                description=req_data.get("description", ""),
                product_line=product_line,
                source=RequirementSource.MEETING,
                source_doc_id=meeting_id,
                priority=RequirementPriority(req_data.get("priority", "P2")),
                tags=req_data.get("tags", []),
                acceptance_criteria=req_data.get("acceptance_criteria", []),
                confidence=req_data.get("confidence", 0.5),
            )
            self._save_requirement(req)
            created.append(req)

        # 记录更新
        if created:
            record = UpdateRecord(
                id=self._generate_id("rec_"),
                timestamp=datetime.utcnow().isoformat(),
                update_type="create",
                requirements_affected=[r.id for r in created],
                source_doc_id=meeting_id,
                changes={"count": len(created)},
                summary=f"从会议纪要提取 {len(created)} 个需求"
            )
            self._save_record(record)

        return created

    def extract_from_daily_report(self, report_content: str, author: str, product_line: str, report_id: str = "") -> List[Requirement]:
        """从日报提取需求"""
        client = create_anthropic_client()

        if not report_id:
            report_id = self._generate_id("daily_")

        prompt = f"""
从以下日报中提取潜在的产品需求或改进点：

日报内容：
{report_content}

作者：{author}
产品线：{product_line}

请提取所有潜在需求，返回 JSON 列表：
[
  {{
    "title": "需求标题",
    "description": "需求描述",
    "priority": "P1|P2|P3",
    "tags": ["标签"],
    "confidence": 0.7
  }}
]
"""
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.content[0].text if response.content else "[]"
        requirements = self._parse_json_list(output)

        created = []
        for req_data in requirements:
            req = Requirement(
                id=self._generate_id("req_"),
                title=req_data.get("title", ""),
                description=req_data.get("description", ""),
                product_line=product_line,
                source=RequirementSource.DAILY_REPORT,
                source_doc_id=report_id,
                priority=RequirementPriority(req_data.get("priority", "P2")),
                tags=req_data.get("tags", []),
                confidence=req_data.get("confidence", 0.5),
                metadata={"author": author}
            )
            self._save_requirement(req)
            created.append(req)

        if created:
            record = UpdateRecord(
                id=self._generate_id("rec_"),
                timestamp=datetime.utcnow().isoformat(),
                update_type="create",
                requirements_affected=[r.id for r in created],
                source_doc_id=report_id,
                changes={"count": len(created), "author": author},
                summary=f"从 {author} 的日报提取 {len(created)} 个需求"
            )
            self._save_record(record)

        return created

    def extract_from_okr(self, okr_data: Dict[str, Any], product_line: str, okr_id: str = "") -> List[Requirement]:
        """从 OKR 提取需求"""
        client = create_anthropic_client()

        if not okr_id:
            okr_id = self._generate_id("okr_")

        prompt = f"""
从以下 OKR 中提取产品需求：

OKR 数据：
{json.dumps(okr_data, ensure_ascii=False, indent=2)}

产品线：{product_line}

请分析 OKR 并提取实现这些目标所需的产品需求，返回 JSON 列表：
[
  {{
    "title": "需求标题",
    "description": "需求描述，关联到哪个 O 或 KR",
    "priority": "P0|P1|P2",
    "tags": ["OKR 驱动", "标签"],
    "acceptance_criteria": ["如何衡量 KR 达成"],
    "confidence": 0.9
  }}
]
"""
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.content[0].text if response.content else "[]"
        requirements = self._parse_json_list(output)

        created = []
        for req_data in requirements:
            req = Requirement(
                id=self._generate_id("req_"),
                title=req_data.get("title", ""),
                description=req_data.get("description", ""),
                product_line=product_line,
                source=RequirementSource.OKR,
                source_doc_id=okr_id,
                priority=RequirementPriority(req_data.get("priority", "P1")),
                tags=req_data.get("tags", []),
                acceptance_criteria=req_data.get("acceptance_criteria", []),
                confidence=req_data.get("confidence", 0.7),
                metadata={"okr": okr_data}
            )
            self._save_requirement(req)
            created.append(req)

        if created:
            record = UpdateRecord(
                id=self._generate_id("rec_"),
                timestamp=datetime.utcnow().isoformat(),
                update_type="create",
                requirements_affected=[r.id for r in created],
                source_doc_id=okr_id,
                changes={"count": len(created)},
                summary=f"从 OKR 提取 {len(created)} 个需求"
            )
            self._save_record(record)

        return created

    # ============================================================
    # 需求收敛 - 根据项目文档自动合并相似需求
    # ============================================================

    def converge_requirements(self, project_docs: List[Dict[str, Any]]) -> List[Requirement]:
        """根据项目文档收敛需求"""
        client = create_anthropic_client()

        # 获取所有待收敛的需求
        draft_requirements = [
            r for r in self._requirements.values()
            if r.status in [RequirementStatus.DRAFT, RequirementStatus.BACKLOG]
        ]

        if not draft_requirements:
            return []

        prompt = f"""
分析以下需求和项目文档，进行需求收敛和合并：

现有需求池 ({len(draft_requirements)} 个需求):
{json.dumps([r.to_dict() for r in draft_requirements[:20]], ensure_ascii=False, indent=2)}

项目文档:
{json.dumps(project_docs, ensure_ascii=False, indent=2)}

请：
1. 识别重复或相似的需求
2. 合并相关需求
3. 根据项目文档调整需求优先级
4. 标记需要进一步分析的需求

返回 JSON 格式：
{{
  "merges": [
    {{"target": "req_xxx", "sources": ["req_aaa", "req_bbb"], "reason": "重复需求"}}
  ],
  "priority_updates": [
    {{"id": "req_xxx", "new_priority": "P0", "reason": "项目文档中明确提到"}}
  ],
  "new_requirements": [
    {{"title": "...", "description": "...", "priority": "P1"}}
  ]
}}
"""
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.content[0].text if response.content else "{}"
        result = self._parse_json(output)

        affected = []

        # 执行合并
        for merge in result.get("merges", []):
            target_id = merge.get("target")
            sources = merge.get("sources", [])
            if target_id and target_id in self._requirements:
                target = self._requirements[target_id]
                for src_id in sources:
                    if src_id in self._requirements:
                        src = self._requirements[src_id]
                        # 合并描述
                        target.description += f"\n\n[合并自 {src_id}]: {src.description}"
                        target.related_requirements.append(src_id)
                        target.confidence = min(1.0, target.confidence + 0.1)
                        self._save_requirement(target)
                        affected.append(src_id)
                affected.append(target_id)

        # 更新优先级
        for update in result.get("priority_updates", []):
            req_id = update.get("id")
            new_priority = update.get("new_priority")
            if req_id and req_id in self._requirements and new_priority:
                req = self._requirements[req_id]
                req.priority = RequirementPriority(new_priority)
                self._save_requirement(req)
                affected.append(req_id)

        # 创建新需求
        for new_req in result.get("new_requirements", []):
            req = Requirement(
                id=self._generate_id("req_"),
                title=new_req.get("title", ""),
                description=new_req.get("description", ""),
                product_line="",
                source=RequirementSource.PROJECT_DOC,
                source_doc_id="auto_converge",
                priority=RequirementPriority(new_req.get("priority", "P2")),
                confidence=0.6
            )
            self._save_requirement(req)
            affected.append(req.id)

        # 记录更新
        if affected:
            record = UpdateRecord(
                id=self._generate_id("rec_"),
                timestamp=datetime.utcnow().isoformat(),
                update_type="converge",
                requirements_affected=affected,
                source_doc_id="project_docs",
                changes=result,
                summary=f"需求收敛：影响 {len(affected)} 个需求"
            )
            self._save_record(record)

        return [self._requirements[id] for id in affected if id in self._requirements]

    # ============================================================
    # 查询 API
    # ============================================================

    def get_requirements(self,
                         product_line: Optional[str] = None,
                         status: Optional[RequirementStatus] = None,
                         source: Optional[RequirementSource] = None,
                         priority: Optional[RequirementPriority] = None) -> List[Requirement]:
        """查询需求"""
        results = list(self._requirements.values())

        if product_line:
            results = [r for r in results if r.product_line == product_line]
        if status:
            results = [r for r in results if r.status == status]
        if source:
            results = [r for r in results if r.source == source]
        if priority:
            results = [r for r in results if r.priority == priority]

        return sorted(results, key=lambda x: x.created_at, reverse=True)

    def get_requirement(self, req_id: str) -> Optional[Requirement]:
        """获取单个需求"""
        return self._requirements.get(req_id)

    def get_update_records(self, limit: int = 50) -> List[UpdateRecord]:
        """获取更新记录"""
        return sorted(self._update_records, key=lambda x: x.timestamp, reverse=True)[:limit]

    def get_product_line_summary(self, product_line: str) -> Dict[str, Any]:
        """获取产品线摘要"""
        reqs = self.get_requirements(product_line=product_line)
        return {
            "product_line": product_line,
            "total": len(reqs),
            "by_status": {
                status.value: len([r for r in reqs if r.status == status])
                for status in RequirementStatus
            },
            "by_priority": {
                priority.value: len([r for r in reqs if r.priority == priority])
                for priority in RequirementPriority
            },
            "by_source": {
                source.value: len([r for r in reqs if r.source == source])
                for source in RequirementSource
            },
        }

    def get_all_summaries(self) -> Dict[str, Any]:
        """获取所有产品线摘要"""
        product_lines = set(r.product_line for r in self._requirements.values() if r.product_line)
        return {
            "total_requirements": len(self._requirements),
            "total_product_lines": len(product_lines),
            "product_lines": {
                pl: self.get_product_line_summary(pl)
                for pl in product_lines
            },
            "recent_updates": [r.to_dict() for r in self.get_update_records(10)]
        }

    # ============================================================
    # 工具方法
    # ============================================================

    def _parse_json_list(self, text: str) -> List[Dict[str, Any]]:
        """解析 JSON 列表"""
        import json
        try:
            start = text.find("[")
            end = text.rfind("]") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except:
            pass
        return []

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """解析 JSON 对象"""
        import json
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except:
            pass
        return {}

    def update_requirement_status(self, req_id: str, status: RequirementStatus) -> bool:
        """更新需求状态"""
        if req_id not in self._requirements:
            return False
        req = self._requirements[req_id]
        old_status = req.status
        req.status = status
        self._save_requirement(req)

        record = UpdateRecord(
            id=self._generate_id("rec_"),
            timestamp=datetime.utcnow().isoformat(),
            update_type="update",
            requirements_affected=[req_id],
            source_doc_id="manual",
            changes={"old_status": old_status.value, "new_status": status.value},
            summary=f"需求 {req_id} 状态从 {old_status.value} 更新为 {status.value}"
        )
        self._save_record(record)
        return True

    def merge_requirements(self, target_id: str, source_ids: List[str], reason: str) -> bool:
        """合并需求"""
        if target_id not in self._requirements:
            return False

        target = self._requirements[target_id]
        for src_id in source_ids:
            if src_id not in self._requirements:
                continue
            src = self._requirements[src_id]
            target.description += f"\n\n[合并自 {src_id}]: {src.description}"
            target.related_requirements.append(src_id)
            self._save_requirement(target)

        record = UpdateRecord(
            id=self._generate_id("rec_"),
            timestamp=datetime.utcnow().isoformat(),
            update_type="merge",
            requirements_affected=[target_id] + source_ids,
            source_doc_id="manual",
            changes={"target": target_id, "sources": source_ids, "reason": reason},
            summary=f"合并需求：{target_id} 合并 {len(source_ids)} 个需求"
        )
        self._save_record(record)
        return True
