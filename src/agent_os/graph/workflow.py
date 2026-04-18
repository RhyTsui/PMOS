"""
PMAIOS v0.3.3 LangGraph 工作流编排

核心功能:
- State Graph 定义
- 节点执行
- 条件边路由
- 状态持久化
"""
import json
import os
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver


class NodeStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class NodeResult:
    """节点执行结果"""
    node_id: str
    status: NodeStatus
    output: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class AgentOSState(dict):
    """Agent OS 状态 - 继承 dict 以兼容 LangGraph"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setdefault("run_id", "")
        self.setdefault("current_node", None)
        self.setdefault("nodes", {})
        self.setdefault("messages", [])
        self.setdefault("artifacts", [])
        self.setdefault("status", "running")
        self.setdefault("memory", {
            "evolution_log": [],
            "failure_patterns": [],
            "success_patterns": []
        })

    def get_run_id(self) -> str:
        return self.get("run_id", "")

    def get_current_node(self) -> Optional[str]:
        return self.get("current_node")

    def set_current_node(self, node_id: str) -> None:
        self["current_node"] = node_id

    def get_node_status(self, node_id: str) -> Optional[NodeStatus]:
        nodes = self.get("nodes", {})
        if node_id in nodes:
            return nodes[node_id].get("status")
        return None

    def set_node_status(self, node_id: str, status: NodeStatus, **kwargs) -> None:
        if "nodes" not in self:
            self["nodes"] = {}
        if node_id not in self["nodes"]:
            self["nodes"][node_id] = {"status": NodeStatus.PENDING}
        self["nodes"][node_id].update({
            "status": status,
            **kwargs
        })

    def add_artifact(self, artifact: Dict[str, Any]) -> None:
        if "artifacts" not in self:
            self["artifacts"] = []
        self["artifacts"].append(artifact)

    def add_message(self, message: str) -> None:
        if "messages" not in self:
            self["messages"] = []
        self["messages"].append(message)

    def add_memory_entry(self, entry: Dict[str, Any]) -> None:
        if "memory" not in self:
            self["memory"] = {"evolution_log": [], "failure_patterns": [], "success_patterns": []}
        self["memory"]["evolution_log"].append(entry)


class LangGraphWorkflow:
    """LangGraph 工作流编排器"""

    def __init__(self, workflow_id: str = "default"):
        self.workflow_id = workflow_id
        self.graph: Optional[StateGraph] = None
        self.app = None
        self.nodes: Dict[str, Callable] = {}
        self.edges: List[tuple] = []
        self.conditional_edges: List[tuple] = []

    def add_node(self, node_id: str, handler: Callable) -> "LangGraphWorkflow":
        """添加节点"""
        self.nodes[node_id] = handler
        return self

    def add_edge(self, from_node: str, to_node: str) -> "LangGraphWorkflow":
        """添加边"""
        self.edges.append((from_node, to_node))
        return self

    def add_conditional_edge(self, from_node: str, condition: Callable, mapping: Dict[str, str]) -> "LangGraphWorkflow":
        """添加条件边"""
        self.conditional_edges.append((from_node, condition, mapping))
        return self

    def compile(self, entry_point: str = "start") -> "LangGraphWorkflow":
        """编译工作流"""
        # 创建 StateGraph
        self.graph = StateGraph(AgentOSState)

        # 添加所有节点
        for node_id, handler in self.nodes.items():
            self.graph.add_node(node_id, handler)

        # 添加入口点
        self.graph.set_entry_point(entry_point)

        # 添加普通边
        for from_node, to_node in self.edges:
            self.graph.add_edge(from_node, to_node)

        # 添加条件边
        for from_node, condition, mapping in self.conditional_edges:
            self.graph.add_conditional_edges(from_node, condition, mapping)

        # 编译应用
        memory = MemorySaver()
        self.app = self.graph.compile(checkpointer=memory)

        return self

    async def run(self, initial_state: Dict[str, Any]) -> AgentOSState:
        """运行工作流"""
        if not self.app:
            raise RuntimeError("Workflow not compiled. Call compile() first.")

        state = AgentOSState(**initial_state)
        state["run_id"] = f"run-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        # 异步执行
        result = await self.app.ainvoke(state)
        return AgentOSState(**result)

    def run_sync(self, initial_state: Dict[str, Any]) -> AgentOSState:
        """同步运行工作流"""
        import asyncio
        return asyncio.run(self.run(initial_state))


# ============================================================
# 预定义节点处理器
# ============================================================

def plan_node(state: AgentOSState) -> Dict[str, Any]:
    """规划节点 - 生成任务列表"""
    from .agents.worker import PlannerAgent

    planner = PlannerAgent()
    tasks = planner.create_tasks(dict(state))

    state.set_node_status("plan", NodeStatus.COMPLETED)
    state.add_message(f"Generated {len(tasks)} tasks")

    return {
        **state,
        "tasks": tasks,
    }


def review_node(state: AgentOSState) -> Dict[str, Any]:
    """评审节点 - 质量控制"""
    from .agents.worker import ReviewerAgent

    reviewer = ReviewerAgent()
    result = reviewer.review(dict(state))

    state.set_node_status("review", NodeStatus.COMPLETED, score=result.get("score", 0))
    state.add_message(f"Review score: {result.get('score', 0)}")

    return {
        **state,
        "review_result": result,
    }


def synth_node(state: AgentOSState) -> Dict[str, Any]:
    """合成节点 - 结果合并"""
    from .agents.worker import SynthesizerAgent

    results = state.get("worker_results", [])
    synthesizer = SynthesizerAgent()
    result = synthesizer.merge(results, dict(state))

    state.set_node_status("synth", NodeStatus.COMPLETED)
    state.add_message("Results merged")

    return {
        **state,
        "final_output": result.get("final_output", ""),
        "artifacts": result.get("artifacts", []),
    }


def review_router(state: AgentOSState) -> str:
    """评审路由决策"""
    review_result = state.get("review_result", {})
    score = review_result.get("score", 0)

    if score >= 0.8:
        return "approve"
    elif score >= 0.5:
        return "revise"
    else:
        return "reject"


# ============================================================
# 预定义工作流模板
# ============================================================

def create_simple_workflow() -> LangGraphWorkflow:
    """创建简单工作流：plan -> review -> synth"""
    workflow = LangGraphWorkflow(workflow_id="simple")

    workflow.add_node("plan", plan_node)
    workflow.add_node("review", review_node)
    workflow.add_node("synth", synth_node)

    workflow.add_edge("plan", "review")
    workflow.add_conditional_edge("review", review_router, {
        "approve": "synth",
        "revise": "plan",
        "reject": "plan",
    })
    workflow.add_edge("synth", END)

    workflow.compile(entry_point="plan")
    return workflow
