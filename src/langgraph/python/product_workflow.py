"""
PMAIOS AI Product OS - LangGraph 工作流引擎

基于产品多 Agent workflow.docx 规范实现
支持：多 Agent 并行思考、Review Gate 控制、Presentation 可视化
"""

from typing import TypedDict, List, Dict, Optional, Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from datetime import datetime
import json


# ========================
# State 定义
# ========================
class AgentView(TypedDict):
    role: str
    output: str
    timestamp: str
    confidence: float


class ReviewResult(TypedDict):
    score: int
    decision: Literal["approve", "reject", "revise"]
    feedback: str
    scores: Dict[str, int]  # ROI, User, Executable, AIPotential


class PRD(TypedDict):
    idea: str
    business_analysis: str
    user_analysis: str
    data_metrics: str
    ai_automation: str
    technical_feasibility: str
    versions: List[str]


class WorkflowState(TypedDict):
    idea: str
    views: List[AgentView]
    prd: Optional[PRD]
    review: Optional[ReviewResult]
    decision: str
    artifacts: Dict
    memory: List[Dict]
    iteration: int


# ========================
# Agent 定义
# ========================
class ProductAgent:
    """产品 Agent - 生成 PRD 主体"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        views = state.get("views", [])
        views.append({
            "role": "product_manager",
            "output": f"基于需求 '{state['idea']}' 生成产品定义",
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.85
        })
        return {"views": views}


class UserAgent:
    """用户分析 Agent - 用户路径/痛点分析"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        views = state.get("views", [])
        views.append({
            "role": "user_researcher",
            "output": "用户画像 + 行为链路 + 痛点分析",
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.80
        })
        return {"views": views}


class DataAgent:
    """数据 Agent - 指标体系/埋点设计"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        views = state.get("views", [])
        views.append({
            "role": "data_analyst",
            "output": "指标体系 + 埋点设计 + 归因逻辑",
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.75
        })
        return {"views": views}


class AIAgent:
    """AI Agent - 自动化分析/Agent 替代空间"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        views = state.get("views", [])
        views.append({
            "role": "ai_engineer",
            "output": "自动化比例 + Agent 替代空间 + 模型需求",
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.90
        })
        return {"views": views}


class TechAgent:
    """技术 Agent - 架构可行性/性能约束"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        views = state.get("views", [])
        views.append({
            "role": "tech_lead",
            "output": "架构可行性 + 性能约束 + 技术选型",
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.85
        })
        return {"views": views}


class SynthesizerAgent:
    """合成 Agent - 合并所有观点生成 PRD"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prd: PRD = {
            "idea": state["idea"],
            "business_analysis": "商业价值分析...",
            "user_analysis": "用户需求分析...",
            "data_metrics": "核心指标体系...",
            "ai_automation": "AI 自动化方案...",
            "technical_feasibility": "技术可行性评估...",
            "versions": [f"v{state.get('iteration', 1)}.0"],
        }
        return {"prd": prd}


class ReviewGate:
    """评审 Gate - 多维度打分决策"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        # 评分维度
        scores = {
            "ROI": 85,
            "user_value": 80,
            "executable": 75,
            "ai_potential": 90
        }
        total = sum(scores.values())
        avg = total / len(scores)

        decision = "approve" if avg >= 80 else ("revise" if avg >= 60 else "reject")

        review: ReviewResult = {
            "score": int(avg),
            "decision": decision,
            "feedback": f"综合评分：{avg:.1f}/100",
            "scores": scores
        }
        return {"review": review, "decision": decision}


class PresentationAgent:
    """展示 Agent - 生成可视化输出"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        artifacts = {
            "flow_chart": "IDEA -> Multi-Agent -> Synthesizer -> Review -> Output",
            "ui_schema": "dashboard | metric_cards | flow_view | table_view",
            "architecture": "agent_core + memory_system + ui_console + data_pipeline",
            "prd_json": state.get("prd", {})
        }
        return {"artifacts": artifacts}


# ========================
# 工作流构建器
# ========================
class ProductWorkflowBuilder:
    """产品工作流构建器"""

    def __init__(self):
        self.workflow = StateGraph(WorkflowState)
        self._setup_nodes()
        self._setup_edges()

    def _setup_nodes(self):
        """设置节点"""
        self.workflow.add_node("product_agent", ProductAgent())
        self.workflow.add_node("user_agent", UserAgent())
        self.workflow.add_node("data_agent", DataAgent())
        self.workflow.add_node("ai_agent", AIAgent())
        self.workflow.add_node("tech_agent", TechAgent())
        self.workflow.add_node("synthesizer", SynthesizerAgent())
        self.workflow.add_node("review_gate", ReviewGate())
        self.workflow.add_node("presentation", PresentationAgent())

    def _setup_edges(self):
        """设置边"""
        # 入口点
        self.workflow.set_entry_point("product_agent")

        # 并行 Agent 执行
        self.workflow.add_edge("product_agent", "user_agent")
        self.workflow.add_edge("user_agent", "data_agent")
        self.workflow.add_edge("data_agent", "ai_agent")
        self.workflow.add_edge("ai_agent", "tech_agent")
        self.workflow.add_edge("tech_agent", "synthesizer")
        self.workflow.add_edge("synthesizer", "review_gate")

        # 条件路由
        def route_after_review(state: WorkflowState) -> str:
            if state.get("decision") == "approve":
                return "presentation"
            elif state.get("decision") == "revise":
                return "product_agent"  # 回流重新生成
            else:
                return "reject"

        self.workflow.add_conditional_edges(
            "review_gate",
            route_after_review,
            {
                "presentation": "presentation",
                "product_agent": "product_agent",
                "reject": END
            }
        )

        self.workflow.add_edge("presentation", END)

    def compile(self, memory: Optional[MemorySaver] = None):
        """编译工作流"""
        return self.workflow.compile(checkpointer=memory)


# ========================
# CLI 入口
# ========================
def run_workflow(idea: str):
    """运行产品工作流"""
    print(f"[*] 启动工作流：{idea}")

    workflow = ProductWorkflowBuilder().compile()

    initial_state: WorkflowState = {
        "idea": idea,
        "views": [],
        "prd": None,
        "review": None,
        "decision": "",
        "artifacts": {},
        "memory": [],
        "iteration": 1
    }

    result = workflow.invoke(initial_state)

    print("\n[+] 工作流执行完成")
    print(f"    决策：{result['decision']}")
    print(f"    评审分数：{result.get('review', {}).get('score', 'N/A')}/100")
    print(f"    生成产物：{len(result.get('artifacts', {}))} 个")

    return result


if __name__ == "__main__":
    import sys
    idea = sys.argv[1] if len(sys.argv) > 1 else "AI 广告系统"
    run_workflow(idea)
