"""
PMAIOS v2.1 - Hermes Agent 增强型工作流

基于"产品 workflow 基础上增加 Hermes Agent.md"规范实现
核心原则：Hermes = 增强器 (Enhancer)，不是流程控制器 (Controller)

架构：
- Fixed Workflow Backbone (固定主流程)
- Product Agent (主执行者)
- Hermes Synth (PRD 增强器)
- Hermes Review (产品门禁系统)
- Hermes Router (路径修正器)
"""

from typing import TypedDict, List, Dict, Optional, Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from datetime import datetime
import os
import json

# ========================
# 配置
# ========================
os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY", "AIzaSyDS6vA3NJXPS5B2SjMGMFaunNjXHpAbsZc")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.7,
    max_tokens=2048
)

# ========================
# 状态定义
# ========================
class AgentView(TypedDict):
    role: str
    output: str
    timestamp: str
    confidence: float
    analysis: Dict


class ReviewResult(TypedDict):
    score: int
    decision: Literal["approve", "reject", "revise"]
    feedback: str
    issues: List[str]
    suggestions: List[str]
    blocker_level: Literal["low", "medium", "high"]
    scores: Dict[str, int]


class PRD(TypedDict):
    idea: str
    business_analysis: str
    user_analysis: str
    data_metrics: str
    ai_automation: str
    technical_feasibility: str
    versions: List[str]
    gaps: List[str]  # 信息缺口
    multiple_solutions: List[Dict]


class WorkflowState(TypedDict):
    idea: str
    views: List[AgentView]
    prd: Optional[PRD]
    review: Optional[ReviewResult]
    decision: str
    artifacts: Dict
    memory: List[Dict]
    iteration: int
    step_count: int


# ========================
# Hermes Agent 层
# ========================
class HermesSynthAgent:
    """
    Hermes Synth Agent - PRD 增强器

    职责：
    1. 判断信息是否足够
    2. 如果不足 → 在 PRD 中标记缺口
    3. 输出结构化 PRD（必须可执行）

    不是：决策系统
    而是：PRD 增强器
    """

    def __call__(self, state: WorkflowState) -> WorkflowState:
        context = "\n\n".join([v["output"] for v in state.get("views", [])])

        prompt = ChatPromptTemplate.from_messages([
            ("system", """你是资深产品经理，负责 PRD 增强。

职责：
1. 判断信息是否足够
2. 如果不足 → 在 PRD 中标记缺口 (gaps)
3. 输出结构化 PRD（必须可执行）

限制：
- 不要改变主流程结构
- 只做 PRD 增强，不做决策"""),
            ("user", """请基于以下多 Agent 输出生成 PRD：

{context}

输出 JSON 格式：
{{
    "idea": "...",
    "business_analysis": "...",
    "user_analysis": "...",
    "data_metrics": "...",
    "ai_automation": "...",
    "technical_feasibility": "...",
    "gaps": ["缺口 1", "缺口 2"],  // 如果信息不足
    "multiple_solutions": [
        {{"type": "激进 AI-first", "description": "...", "pros": [], "cons": []}},
        {{"type": "平衡方案 (推荐)", "description": "...", "pros": [], "cons": []}},
        {{"type": "保守传统方案", "description": "...", "pros": [], "cons": []}}
    ]
}}
""")
        ])

        chain = prompt | llm
        response = chain.invoke({"context": context})

        try:
            prd_data = json.loads(response.content)
            prd: PRD = {
                "idea": prd_data.get("idea", state["idea"]),
                "business_analysis": prd_data.get("business_analysis", ""),
                "user_analysis": prd_data.get("user_analysis", ""),
                "data_metrics": prd_data.get("data_metrics", ""),
                "ai_automation": prd_data.get("ai_automation", ""),
                "technical_feasibility": prd_data.get("technical_feasibility", ""),
                "versions": [f"v{state.get('iteration', 1)}.0"],
                "gaps": prd_data.get("gaps", []),
                "multiple_solutions": prd_data.get("multiple_solutions", [])
            }
        except json.JSONDecodeError:
            # Fallback: 生成基础 PRD
            prd: PRD = {
                "idea": state["idea"],
                "business_analysis": "待补充",
                "user_analysis": "待补充",
                "data_metrics": "待补充",
                "ai_automation": "待补充",
                "technical_feasibility": "待补充",
                "versions": [f"v{state.get('iteration', 1)}.0"],
                "gaps": ["信息提取失败，需要重新分析"],
                "multiple_solutions": []
            }

        return {"prd": prd}


class HermesReviewAgent:
    """
    Hermes Review Agent - 产品门禁系统

    职责：
    1. 结构化评审 PRD
    2. 决定是否通过
    3. 输出问题和 retomar 建议

    从"评分器" → "产品门禁系统"
    """

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prd = state.get("prd", {})

        prompt = ChatPromptTemplate.from_messages([
            ("system", """你是资深产品评审专家，负责产品门禁评审。

评审维度：
- ROI (25 分)
- 用户价值 (25 分)
- 可执行性 (25 分)
- AI 潜力 (25 分)

输出严格的 JSON 格式：
{
    "score": 0-100,
    "decision": "approve/reject/revise",
    "issues": ["问题 1", "问题 2"],
    "suggestions": ["建议 1", "建议 2"],
    "blocker_level": "low/medium/high",
    "scores": {
        "ROI": 0-25,
        "user_value": 0-25,
        "executable": 0-25,
        "ai_potential": 0-25
    }
}

规则：
- score >= 80 → approve
- score >= 60 → revise
- score < 60 → reject
- blocker_level = high 时，必须 reject""")
            ("user", """请评审以下 PRD：

{prd}
""")
        ])

        chain = prompt | llm
        response = chain.invoke({"prd": json.dumps(prd, ensure_ascii=False)})

        try:
            review_data = json.loads(response.content)
            review: ReviewResult = {
                "score": review_data.get("score", 0),
                "decision": review_data.get("decision", "revise"),
                "feedback": f"综合评分：{review_data.get('score', 0)}/100",
                "issues": review_data.get("issues", []),
                "suggestions": review_data.get("suggestions", []),
                "blocker_level": review_data.get("blocker_level", "medium"),
                "scores": review_data.get("scores", {})
            }
        except json.JSONDecodeError:
            # Fallback
            review: ReviewResult = {
                "score": 50,
                "decision": "revise",
                "feedback": "评审解析失败",
                "issues": ["PRD 评审解析失败"],
                "suggestions": ["重新生成 PRD"],
                "blocker_level": "medium",
                "scores": {"ROI": 10, "user_value": 10, "executable": 10, "ai_potential": 10}
            }

        return {"review": review, "decision": review["decision"]}


class HermesRouterAgent:
    """
    Hermes Router Agent - 路径修正器

    职责：
    1. 在固定路径中局部跳转
    2. 不能改变主流程结构

    不是：自由调度
    而是：路径修正器

    允许的操作：
    - forward (下一步)
    - fallback (回到上一节点)
    - skip (跳过非关键节点，但不能跳核心节点)
    """

    ALLOWED_STEPS = ["business", "user", "data", "ai", "synth", "review", "presentation"]

    def __call__(self, state: WorkflowState) -> WorkflowState:
        # 简化实现：基于决策路由
        decision = state.get("decision", "")

        if decision == "approve":
            next_step = "presentation"
        elif decision == "revise":
            next_step = "business"  # 回流重新生成
        else:
            next_step = "end"

        return {"artifacts": {"next_step": next_step}}


# ========================
# 基础 Agent 层
# ========================
class BusinessAgent:
    """商业 Agent - ROI/成本/收益分析"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是专业的商业分析师。"),
            ("user", "请分析 '{idea}' 的:\n1. ROI 预期\n2. 成本结构\n3. 收益模式\n4. 市场机会")
        ])
        response = (prompt | llm).invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "business_analyst",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.85,
            "analysis": {"dimension": "Business", "factors": ["ROI", "成本", "收益", "市场"]}
        })
        return {"views": views, "step_count": state.get("step_count", 0) + 1}


class UserAgent:
    """用户 Agent - 用户路径/行为链路/痛点分析"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是资深用户研究员。"),
            ("user", "请分析 '{idea}' 的:\n1. 目标用户画像\n2. 用户路径/行为链路\n3. 核心痛点\n4. 使用场景")
        ])
        response = (prompt | llm).invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "user_researcher",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.80,
            "analysis": {"dimension": "User", "factors": ["用户画像", "行为链路", "痛点", "场景"]}
        })
        return {"views": views, "step_count": state.get("step_count", 0) + 1}


class DataAgent:
    """数据 Agent - 指标体系/埋点设计/归因逻辑"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是数据科学专家。"),
            ("user", "请为 '{idea}' 设计:\n1. 核心指标体系\n2. 埋点设计方案\n3. 归因逻辑")
        ])
        response = (prompt | llm).invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "data_scientist",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.75,
            "analysis": {"dimension": "Data", "factors": ["指标体系", "埋点设计", "归因逻辑"]}
        })
        return {"views": views, "step_count": state.get("step_count", 0) + 1}


class AIAgent:
    """AI Agent - 自动化比例/Agent 替代空间/模型需求"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是 AI 架构师。"),
            ("user", "请评估 '{idea}' 的:\n1. 自动化比例\n2. Agent 替代空间\n3. 模型需求\n4. AI First vs 传统方案对比")
        ])
        response = (prompt | llm).invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "ai_architect",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.90,
            "analysis": {"dimension": "AI First", "factors": ["自动化比例", "Agent 替代", "模型需求"]}
        })
        return {"views": views, "step_count": state.get("step_count", 0) + 1}


class TechAgent:
    """技术 Agent - 架构可行性/性能约束/技术选型"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是技术负责人。"),
            ("user", "请评估 '{idea}' 的:\n1. 架构可行性\n2. 性能约束\n3. 技术选型建议\n4. 潜在技术风险")
        ])
        response = (prompt | llm).invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "tech_lead",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.85,
            "analysis": {"dimension": "Tech", "factors": ["架构可行性", "性能约束", "技术选型"]}
        })
        return {"views": views, "step_count": state.get("step_count", 0) + 1}


class PresentationAgent:
    """展示 Agent - 生成可视化输出"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        artifacts = {
            "flow_chart": "IDEA -> Multi-Agent -> Hermes Synth -> Hermes Review -> Output",
            "ui_schema": ["dashboard", "metric_cards", "flow_view"],
            "architecture": {
                "backbone": "Fixed Workflow",
                "enhancer": "Hermes Agent Layer",
                "agents": ["Business", "User", "Data", "AI", "Tech"],
                "memory": "Vector DB + Notion"
            },
            "prd": state.get("prd", {}),
            "review": state.get("review", {})
        }
        return {"artifacts": artifacts}


# ========================
# 工作流构建器 (v2.1 Hermes 增强版)
# ========================
class HermesWorkflowBuilder:
    """
    Hermes 增强型工作流构建器 v2.1

    架构：
    Fixed Workflow Backbone (固定主流程)
        ↓
    Product Agent (执行)
        ↓
    Hermes Synth (增强)
        ↓
    Hermes Review (门禁)
        ↓
    Memory
    """

    MAX_STEPS = 8  # 状态锁：最大步骤数

    def __init__(self):
        self.workflow = StateGraph(WorkflowState)
        self._setup_nodes()
        self._setup_edges()

    def _setup_nodes(self):
        """设置节点"""
        # 基础 Agent
        self.workflow.add_node("business", BusinessAgent())
        self.workflow.add_node("user", UserAgent())
        self.workflow.add_node("data", DataAgent())
        self.workflow.add_node("ai", AIAgent())
        self.workflow.add_node("tech", TechAgent())

        # Hermes Agent 层
        self.workflow.add_node("hermes_synth", HermesSynthAgent())
        self.workflow.add_node("hermes_review", HermesReviewAgent())
        self.workflow.add_node("hermes_router", HermesRouterAgent())
        self.workflow.add_node("presentation", PresentationAgent())

    def _setup_edges(self):
        """设置边 - 固定主流程 + Hermes 修正"""
        # 固定主流程 (不可改变)
        self.workflow.set_entry_point("business")

        self.workflow.add_edge("business", "user")
        self.workflow.add_edge("user", "data")
        self.workflow.add_edge("data", "ai")
        self.workflow.add_edge("ai", "tech")

        # Hermes Synth 增强层
        self.workflow.add_edge("tech", "hermes_synth")

        # Hermes Review 门禁
        self.workflow.add_edge("hermes_synth", "hermes_review")

        # Hermes Router 条件路由
        def route_after_review(state: WorkflowState) -> str:
            # 状态锁检查
            if state.get("step_count", 0) >= self.MAX_STEPS:
                return "presentation"  # 强制结束

            decision = state.get("decision", "revise")
            blocker = state.get("review", {}).get("blocker_level", "medium")

            # 高阻塞级别 → 拒绝
            if blocker == "high":
                return "presentation"  # 带问题输出

            if decision == "approve":
                return "presentation"
            elif decision == "revise":
                return "business"  # 回流
            else:
                return "presentation"

        self.workflow.add_conditional_edges(
            "hermes_review",
            route_after_review,
            {
                "presentation": "presentation",
                "business": "business",
            }
        )

        self.workflow.add_edge("presentation", END)

    def compile(self, memory: Optional[MemorySaver] = None):
        """编译工作流"""
        return self.workflow.compile(checkpointer=memory)


# ========================
# CLI 入口
# ========================
def run_workflow(idea: str, verbose: bool = True):
    """运行 Hermes 增强型工作流"""
    print(f"[*] PMAIOS v2.1 Hermes 增强型工作流")
    print(f"    产品创意：{idea}")
    print("=" * 60)

    workflow = HermesWorkflowBuilder().compile()

    initial_state: WorkflowState = {
        "idea": idea,
        "views": [],
        "prd": None,
        "review": None,
        "decision": "",
        "artifacts": {},
        "memory": [],
        "iteration": 1,
        "step_count": 0
    }

    result = workflow.invoke(initial_state)

    print("\n[+] 工作流执行完成")
    print(f"    决策：{result['decision']}")
    if result.get('review'):
        print(f"    评审分数：{result['review'].get('score', 'N/A')}/100")
        print(f"    阻塞级别：{result['review'].get('blocker_level', 'N/A')}")
        if result['review'].get('issues'):
            print(f"    问题列表：{len(result['review']['issues'])} 个")
    print(f"    参与 Agent 数：{len(result.get('views', []))}")
    print(f"    总步骤数：{result.get('step_count', 0)}/{HermesWorkflowBuilder.MAX_STEPS}")

    # 输出 PRD 摘要
    if result.get('prd'):
        prd = result['prd']
        print("\n" + "=" * 60)
        print("PRD 摘要:")
        print(f"    创意：{prd['idea']}")
        print(f"    信息缺口：{len(prd.get('gaps', []))} 个")
        if prd.get('gaps'):
            for gap in prd['gaps'][:3]:
                print(f"      - {gap}")
        print(f"    多方案数：{len(prd.get('multiple_solutions', []))} 个")

    # 保存到文件
    output_file = "prd_hermes_output.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n[+] 结果已保存到：{output_file}")

    return result


if __name__ == "__main__":
    import sys
    idea = sys.argv[1] if len(sys.argv) > 1 else "PMAIOS v0.5 - 增加多项目协作和团队权限管理功能"
    run_workflow(idea)
