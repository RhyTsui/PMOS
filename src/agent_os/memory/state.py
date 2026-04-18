"""
PMAIOS v0.3.3 Memory State

核心功能:
- State 演化记忆
- Failure/Success Pattern 记录
- 向量存储集成 (Chroma)
"""
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from .config import Config


@dataclass
class EvolutionEntry:
    """状态演化记录"""
    timestamp: str
    run_id: str
    node_id: str
    from_state_hash: str
    to_state_hash: str
    routing_decision: str
    hermes_changes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FailurePattern:
    """失败模式记录"""
    pattern: str
    fix: str
    success_rate_before: float
    success_rate_after: float
    occurrences: int = 1
    first_seen: str = ""
    last_seen: str = ""

    def __post_init__(self):
        if not self.first_seen:
            self.first_seen = datetime.utcnow().isoformat()
        self.last_seen = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SuccessPattern:
    """成功模式记录"""
    pattern: str
    description: str
    success_rate: float
    occurrences: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class MemoryState:
    """记忆状态管理"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.from_env()
        self.memory_dir = self.config.memory_dir
        self.checkpoint_dir = self.config.checkpoint_dir

        # 确保目录存在
        os.makedirs(self.memory_dir, exist_ok=True)
        os.makedirs(self.checkpoint_dir, exist_ok=True)

        # 内存缓存
        self.evolution_log: List[EvolutionEntry] = []
        self.failure_patterns: List[FailurePattern] = []
        self.success_patterns: List[SuccessPattern] = []

    def add_evolution_entry(self, entry: EvolutionEntry) -> None:
        """添加演化记录"""
        self.evolution_log.append(entry)

        # 定期持久化
        if len(self.evolution_log) % 100 == 0:
            self.save()

    def add_failure_pattern(self, pattern: FailurePattern) -> None:
        """添加失败模式"""
        # 检查是否已存在相似模式
        existing = self._find_similar_pattern(pattern.pattern, self.failure_patterns)
        if existing:
            existing.occurrences += 1
            existing.last_seen = datetime.utcnow().isoformat()
        else:
            self.failure_patterns.append(pattern)

    def add_success_pattern(self, pattern: SuccessPattern) -> None:
        """添加成功模式"""
        existing = self._find_similar_pattern(pattern.pattern, self.success_patterns)
        if existing:
            existing.occurrences += 1
            existing.success_rate = (existing.success_rate * existing.occurrences + pattern.success_rate) / (existing.occurrences + 1)
        else:
            self.success_patterns.append(pattern)

    def _find_similar_pattern(self, pattern: str, patterns_list: List) -> Optional[Any]:
        """查找相似模式"""
        for p in patterns_list:
            if p.pattern == pattern:
                return p
        return None

    def get_patterns_for_node(self, node_id: str) -> Dict[str, List]:
        """获取特定节点的失败/成功模式"""
        failures = [p for p in self.failure_patterns if node_id in p.pattern]
        successes = [p for p in self.success_patterns if node_id in p.pattern]
        return {"failures": failures, "successes": successes}

    def get_routing_history(self, run_id: str) -> List[EvolutionEntry]:
        """获取特定运行的路由历史"""
        return [e for e in self.evolution_log if e.run_id == run_id]

    def save(self) -> None:
        """持久化记忆"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")

        # 保存演化日志
        evolution_path = os.path.join(self.memory_dir, f"evolution_{timestamp}.json")
        with open(evolution_path, "w", encoding="utf-8") as f:
            json.dump([e.to_dict() for e in self.evolution_log], f, indent=2, ensure_ascii=False)

        # 保存失败模式
        failure_path = os.path.join(self.memory_dir, f"failures_{timestamp}.json")
        with open(failure_path, "w", encoding="utf-8") as f:
            json.dump([p.to_dict() for p in self.failure_patterns], f, indent=2, ensure_ascii=False)

        # 保存成功模式
        success_path = os.path.join(self.memory_dir, f"successes_{timestamp}.json")
        with open(success_path, "w", encoding="utf-8") as f:
            json.dump([p.to_dict() for p in self.success_patterns], f, indent=2, ensure_ascii=False)

        logger.info(f"Memory saved to {self.memory_dir}")

    def load_latest(self) -> None:
        """加载最新的记忆"""
        # 查找最新的演化日志
        evolution_files = sorted([f for f in os.listdir(self.memory_dir) if f.startswith("evolution_")])
        if evolution_files:
            latest = evolution_files[-1]
            with open(os.path.join(self.memory_dir, latest), "r", encoding="utf-8") as f:
                data = json.load(f)
                self.evolution_log = [EvolutionEntry(**e) for e in data]

        # 加载失败模式
        failure_files = sorted([f for f in os.listdir(self.memory_dir) if f.startswith("failures_")])
        if failure_files:
            latest = failure_files[-1]
            with open(os.path.join(self.memory_dir, latest), "r", encoding="utf-8") as f:
                data = json.load(f)
                self.failure_patterns = [FailurePattern(**p) for p in data]

        # 加载成功模式
        success_files = sorted([f for f in os.listdir(self.memory_dir) if f.startswith("successes_")])
        if success_files:
            latest = success_files[-1]
            with open(os.path.join(self.memory_dir, latest), "r", encoding="utf-8") as f:
                data = json.load(f)
                self.success_patterns = [SuccessPattern(**p) for p in data]

        logger.info("Latest memory loaded")

    def get_summary(self) -> Dict[str, Any]:
        """获取记忆摘要"""
        return {
            "evolution_entries": len(self.evolution_log),
            "failure_patterns": len(self.failure_patterns),
            "success_patterns": len(self.success_patterns),
            "top_failures": [
                {"pattern": p.pattern, "occurrences": p.occurrences}
                for p in sorted(self.failure_patterns, key=lambda x: x.occurrences, reverse=True)[:5]
            ],
            "top_successes": [
                {"pattern": p.pattern, "success_rate": p.success_rate, "occurrences": p.occurrences}
                for p in sorted(self.success_patterns, key=lambda x: x.occurrences, reverse=True)[:5]
            ],
        }


# 状态哈希工具
def hash_state(state: Dict[str, Any]) -> str:
    """计算状态哈希"""
    import hashlib
    state_str = json.dumps(state, sort_keys=True)
    return hashlib.md5(state_str.encode()).hexdigest()


logger = logging.getLogger(__name__)
import logging
