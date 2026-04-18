"""
PMAIOS v0.3.3 Worker Agent

执行单元：调用 Claude API 执行任务
"""
import anthropic
from typing import Optional, Dict, Any
from dataclasses import dataclass
from .config import Config


@dataclass
class WorkerResult:
    """Worker 执行结果"""
    task_id: str
    worker_id: int
    output: str
    success: bool
    error: Optional[str] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class WorkerAgent:
    """Worker Agent - Claude 执行单元"""

    def __init__(self, worker_id: int, config: Optional[Config] = None):
        self.worker_id = worker_id
        self.config = config or Config.from_env()
        self.client = anthropic.Anthropic(api_key=self.config.claude_api_key)
        self.model = self.config.claude_model
        self.max_tokens = self.config.claude_max_tokens

    def run(self, task_content: str, system_prompt: Optional[str] = None) -> WorkerResult:
        """执行任务"""
        try:
            # 构建 prompt
            prompt = self._build_prompt(task_content)

            # 调用 Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt or self._default_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            output = response.content[0].text if response.content else ""

            return WorkerResult(
                task_id="",  # 由调用者设置
                worker_id=self.worker_id,
                output=output,
                success=True
            )

        except Exception as e:
            return WorkerResult(
                task_id="",
                worker_id=self.worker_id,
                output="",
                success=False,
                error=str(e)
            )

    def _default_system_prompt(self) -> str:
        """默认系统提示词"""
        return """You are a Worker Agent in PMAIOS v0.3.3 Agent OS.

Your role:
- Execute tasks assigned to you efficiently
- Return structured, actionable output
- Follow the task instructions precisely

Output format:
- Be concise and clear
- Include relevant details
- Flag any issues or ambiguities"""

    def _build_prompt(self, task_content: str) -> str:
        """构建任务 prompt"""
        return f"""
You are Worker Agent #{self.worker_id}

Task:
{task_content}

Return structured output in the following format:
1. Summary - Brief overview of what you accomplished
2. Details - Key findings, decisions, or outputs
3. Next Steps - Recommended actions or follow-ups
4. Issues - Any problems encountered (if applicable)
"""


class PlannerAgent:
    """Planner Agent - 生成任务流"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.from_env()
        self.client = anthropic.Anthropic(api_key=self.config.claude_api_key)
        self.model = self.config.claude_model

    def create_tasks(self, state: Dict[str, Any]) -> list:
        """根据状态生成并行任务列表"""
        prompt = f"""
Break this state into parallel tasks:

State:
{state}

Return a JSON list of tasks in the following format:
[
  {{
    "id": "task-1",
    "title": "Task title",
    "content": "Detailed task description",
    "priority": 1,
    "dependencies": []
  }}
]
"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.content[0].text if response.content else "[]"

        # 简单解析 JSON
        import json
        try:
            # 提取 JSON 部分
            start = output.find("[")
            end = output.rfind("]") + 1
            if start >= 0 and end > start:
                return json.loads(output[start:end])
        except:
            pass

        return []


class ReviewerAgent:
    """Reviewer Agent - 质量控制"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.from_env()
        self.client = anthropic.Anthropic(api_key=self.config.claude_api_key)
        self.model = self.config.claude_model

    def review(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """评审状态"""
        prompt = f"""
Review this state and provide quality assessment:

State:
{state}

Return JSON in the following format:
{{
  "status": "ok" | "needs_revision" | "rejected",
  "score": 0.0-1.0,
  "issues": ["list of issues"],
  "suggestions": ["list of suggestions"]
}}
"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.content[0].text if response.content else "{}"

        import json
        try:
            start = output.find("{")
            end = output.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(output[start:end])
        except:
            pass

        return {"status": "ok", "score": 0.8, "issues": [], "suggestions": []}


class SynthesizerAgent:
    """Synthesizer Agent - 结果合并"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.from_env()
        self.client = anthropic.Anthropic(api_key=self.config.claude_api_key)
        self.model = self.config.claude_model

    def merge(self, results: list, state: Dict[str, Any]) -> Dict[str, Any]:
        """合并多个结果"""
        prompt = f"""
Merge these results into a coherent final output:

Results:
{results}

Current State:
{state}

Return JSON in the following format:
{{
  "final_output": "merged result summary",
  "state": {{ updated state }},
  "artifacts": ["list of generated artifacts"]
}}
"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.content[0].text if response.content else "{}"

        import json
        try:
            start = output.find("{")
            end = output.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(output[start:end])
        except:
            pass

        return {"final_output": "", "state": state, "artifacts": []}
