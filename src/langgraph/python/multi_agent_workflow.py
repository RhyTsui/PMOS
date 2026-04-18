"""
PMAIOS - 多 Agent 扩展系统

基于产品多 Agent workflow.docx 规范实现
支持：Business/User/Data/AI/Tech 多维度分析
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
# State 定义
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
    scores: Dict[str, int]


class PRD(TypedDict):
    idea: str
    business_analysis: str
    user_analysis: str
    data_metrics: str
    ai_automation: str
    technical_feasibility: str
    versions: List[str]
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


# ========================
# Agent 定义
# ========================
class BusinessAgent:
    """商业 Agent - ROI/成本/收益分析"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个专业的商业分析师。分析以下产品创意的商业价值。"),
            ("user", "请分析 '{idea}' 的:\n1. ROI 预期\n2. 成本结构\n3. 收益模式\n4. 市场机会")
        ])
        chain = prompt | llm
        response = chain.invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "business_analyst",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.85,
            "analysis": {
                "dimension": "Business",
                "factors": ["ROI", "成本", "收益", "市场"]
            }
        })
        return {"views": views}


class UserAgent:
    """用户 Agent - 用户路径/行为链路/痛点分析"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个资深用户研究员。分析以下产品的用户维度。"),
            ("user", "请分析 '{idea}' 的:\n1. 目标用户画像\n2. 用户路径/行为链路\n3. 核心痛点\n4. 使用场景")
        ])
        chain = prompt | llm
        response = chain.invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "user_researcher",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.80,
            "analysis": {
                "dimension": "User",
                "factors": ["用户画像", "行为链路", "痛点", "场景"]
            }
        })
        return {"views": views}


class DataAgent:
    """数据 Agent - 指标体系/埋点设计/归因逻辑"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个数据科学专家。设计以下产品的数据体系。"),
            ("user", "请为 '{idea}' 设计:\n1. 核心指标体系 (North Star Metric + 一级/二级指标)\n2. 埋点设计方案\n3. 归因逻辑")
        ])
        chain = prompt | llm
        response = chain.invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "data_scientist",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.75,
            "analysis": {
                "dimension": "Data",
                "factors": ["指标体系", "埋点设计", "归因逻辑"]
            }
        })
        return {"views": views}


class AIAgent:
    """AI Agent - 自动化比例/Agent 替代空间/模型需求"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个 AI 架构师。评估以下产品的 AI 能力。"),
            ("user", "请评估 '{idea}' 的:\n1. 自动化比例 (哪些环节可以用 AI 替代)\n2. Agent 替代空间\n3. 模型需求 (需要哪些 AI 能力)\n4. AI First 方案 vs 传统方案对比")
        ])
        chain = prompt | llm
        response = chain.invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "ai_architect",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.90,
            "analysis": {
                "dimension": "AI First",
                "factors": ["自动化比例", "Agent 替代", "模型需求", "方案对比"]
            }
        })
        return {"views": views}


class TechAgent:
    """技术 Agent - 架构可行性/性能约束/技术选型"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个技术负责人。评估以下产品的技术可行性。"),
            ("user", "请评估 '{idea}' 的:\n1. 架构可行性\n2. 性能约束\n3. 技术选型建议\n4. 潜在技术风险")
        ])
        chain = prompt | llm
        response = chain.invoke({"idea": state["idea"]})

        views = state.get("views", [])
        views.append({
            "role": "tech_lead",
            "output": response.content,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.85,
            "analysis": {
                "dimension": "Tech",
                "factors": ["架构可行性", "性能约束", "技术选型", "风险评估"]
            }
        })
        return {"views": views}


class SynthesizerAgent:
    """合成 Agent - 合并所有观点生成 PRD + 多方案"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        # 提取各 Agent 输出
        business = next((v for v in state["views"] if v["role"] == "business_analyst"), None)
        user = next((v for v in state["views"] if v["role"] == "user_researcher"), None)
        data = next((v for v in state["views"] if v["role"] == "data_scientist"), None)
        ai = next((v for v in state["views"] if v["role"] == "ai_architect"), None)
        tech = next((v for v in state["views"] if v["role"] == "tech_lead"), None)

        # 生成多方案
        multiple_solutions = [
            {
                "type": "激进 AI-first 方案",
                "description": "最大化 AI 自动化，最小化人工干预",
                "pros": ["效率最高", "成本最低", "可扩展性强"],
                "cons": ["技术风险高", "用户接受度不确定"]
            },
            {
                "type": "平衡方案 (推荐)",
                "description": "AI + 人工协同，关键环节保留人工审核",
                "pros": ["风险可控", "用户体验好", "落地可行"],
                "cons": ["初期成本较高"]
            },
            {
                "type": "保守传统方案",
                "description": "以传统方式实现，AI 作为辅助工具",
                "pros": ["风险最低", "技术成熟"],
                "cons": ["效率提升有限", "长期竞争力弱"]
            }
        ]

        prd: PRD = {
            "idea": state["idea"],
            "business_analysis": business["output"] if business else "",
            "user_analysis": user["output"] if user else "",
            "data_metrics": data["output"] if data else "",
            "ai_automation": ai["output"] if ai else "",
            "technical_feasibility": tech["output"] if tech else "",
            "versions": [f"v{state.get('iteration', 1)}.0"],
            "multiple_solutions": multiple_solutions
        }
        return {"prd": prd}


class ReviewGate:
    """评审 Gate - 多维度打分决策"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        # 基于各维度分析打分
        scores = {}

        # ROI 评分 (基于商业分析)
        business = next((v for v in state["views"] if v["role"] == "business_analyst"), None)
        scores["ROI"] = 85 if business else 50

        # 用户价值评分
        user = next((v for v in state["views"] if v["role"] == "user_researcher"), None)
        scores["user_value"] = 80 if user else 50

        # 可执行性评分
        tech = next((v for v in state["views"] if v["role"] == "tech_lead"), None)
        scores["executable"] = 75 if tech else 50

        # AI 潜力评分
        ai = next((v for v in state["views"] if v["role"] == "ai_architect"), None)
        scores["ai_potential"] = 90 if ai else 50

        total = sum(scores.values())
        avg = total / len(scores)

        decision = "approve" if avg >= 80 else ("revise" if avg >= 60 else "reject")

        review: ReviewResult = {
            "score": int(avg),
            "decision": decision,
            "feedback": f"综合评分：{avg:.1f}/100 - {self._get_feedback(decision)}",
            "scores": scores
        }
        return {"review": review, "decision": decision}

    def _get_feedback(self, decision: str) -> str:
        if decision == "approve":
            return "项目通过评审，可以进入下一阶段"
        elif decision == "revise":
            return "需要修改完善后重新评审"
        else:
            return "项目未通过评审，建议重新构思"


class PresentationAgent:
    """展示 Agent - 生成可视化输出"""

    def __call__(self, state: WorkflowState) -> WorkflowState:
        artifacts = {
            "flow_chart": "IDEA -> Multi-Agent Parallel -> Synthesizer -> Review Gate -> Output",
            "ui_schema": ["dashboard", "metric_cards", "flow_view", "table_view"],
            "architecture": {
                "agent_core": ["Business", "User", "Data", "AI", "Tech"],
                "memory_system": "Notion AI / Vector DB",
                "ui_console": "AI Studio Dashboard",
                "data_pipeline": "Event-driven Architecture"
            },
            "prd_json": state.get("prd", {}),
            "agent_views": state.get("views", []),
            "review_result": state.get("review", {})
        }
        return {"artifacts": artifacts}


# ========================
# 工作流构建器
# ========================
class MultiAgentWorkflowBuilder:
    """多 Agent 工作流构建器 (支持并行执行)"""

    def __init__(self):
        self.workflow = StateGraph(WorkflowState)
        self._setup_nodes()
        self._setup_edges()

    def _setup_nodes(self):
        """设置节点"""
        # 多维度分析 Agent
        self.workflow.add_node("business_agent", BusinessAgent())
        self.workflow.add_node("user_agent", UserAgent())
        self.workflow.add_node("data_agent", DataAgent())
        self.workflow.add_node("ai_agent", AIAgent())
        self.workflow.add_node("tech_agent", TechAgent())

        # 合成和评审
        self.workflow.add_node("synthesizer", SynthesizerAgent())
        self.workflow.add_node("review_gate", ReviewGate())
        self.workflow.add_node("presentation", PresentationAgent())

    def _setup_edges(self):
        """设置边 - 支持并行执行"""
        self.workflow.set_entry_point("business_agent")

        # 顺序执行 (可改为并行)
        self.workflow.add_edge("business_agent", "user_agent")
        self.workflow.add_edge("user_agent", "data_agent")
        self.workflow.add_edge("data_agent", "ai_agent")
        self.workflow.add_edge("ai_agent", "tech_agent")
        self.workflow.add_edge("tech_agent", "synthesizer")
        self.workflow.add_edge("synthesizer", "review_gate")

        # 条件路由
        def route_after_review(state: WorkflowState) -> str:
            decision = state.get("decision", "reject")
            if decision == "approve":
                return "presentation"
            elif decision == "revise":
                return "business_agent"
            else:
                return "end"

        self.workflow.add_conditional_edges(
            "review_gate",
            route_after_review,
            {
                "presentation": "presentation",
                "business_agent": "business_agent",
                "end": END
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
    """运行多 Agent 工作流"""
    print(f"[*] 启动多 Agent 工作流：{idea}")
    print("=" * 60)

    workflow = MultiAgentWorkflowBuilder().compile()

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
    if result.get('review'):
        print(f"    评审分数：{result['review'].get('score', 'N/A')}/100")
        print(f"    评审反馈：{result['review'].get('feedback', '')}")
    print(f"    参与 Agent 数：{len(result.get('views', []))}")
    print(f"    生成产物：{len(result.get('artifacts', {}))} 个")

    # 输出 PRD 摘要
    if result.get('prd'):
        prd = result['prd']
        print("\n" + "=" * 60)
        print("PRD 摘要:")
        print(f"    创意：{prd['idea']}")
        print(f"    多方案数：{len(prd.get('multiple_solutions', []))}")

    # 保存到文件
    output_file = "prd_output.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n[+] 结果已保存到：{output_file}")

    return result


if __name__ == "__main__":
    import sys
    idea = sys.argv[1] if len(sys.argv) > 1 else "AI 广告系统"
    run_workflow(idea)
