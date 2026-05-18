from fastapi import APIRouter, HTTPException

from ad.xiaoqiao.admin_service import (
    create_prompt,
    get_prompt,
    list_feature_switches,
    list_prompt_versions,
    list_prompts,
    update_feature_switch,
    update_prompt,
    update_prompt_binding,
)
from ad.xiaoqiao.autonomous_runtime import (
    checkpoint_autonomous_run,
    create_autonomous_run,
    get_autonomous_dashboard,
    get_latest_pressure_evidence,
    get_autonomous_run,
    get_context_bundle,
    heartbeat_autonomous_run,
    list_autonomous_runs,
    resume_autonomous_run,
    review_autonomous_task,
)
from ad.xiaoqiao.models import (
    AutonomousRunCheckpointCreateRequest,
    AutonomousRunCheckpointRecord,
    AutonomousRunCreateRequest,
    AutonomousRunDashboardRecord,
    AutonomousRunDetailResponse,
    AutonomousRunHeartbeatRequest,
    AutonomousRunRecord,
    AutonomousRunResumeRequest,
    AttributionCaseDetailResponse,
    AttributionCaseSummary,
    ConversationCreateRequest,
    ContextInjectionBundleRecord,
    ConversationDetailResponse,
    ConversationSummary,
    FeatureSwitchRecord,
    FeatureSwitchUpdateRequest,
    MessageCreateRequest,
    MessageEntryResponse,
    TaskContextUpdateRequest,
    PromptBindingRecord,
    PromptBindingUpdateRequest,
    PromptConfigCreateRequest,
    PromptConfigRecord,
    PromptConfigUpdateRequest,
    PromptDetailResponse,
    PromptVersionRecord,
    ReviewScoreInput,
    ReviewScorecardRecord,
    TaskDetailResponse,
    TaskRecord,
    WorkspaceResponse,
    WorkflowResultRecord,
)
from ad.xiaoqiao.attribution_mock import get_attribution_case, list_attribution_cases
from ad.xiaoqiao.service import (
    create_conversation,
    get_conversation,
    get_task,
    get_task_results,
    get_workspace,
    list_conversations,
    list_tasks,
    post_message,
    update_task_context,
)

router = APIRouter(prefix="/xiaoqiao", tags=["xiaoqiao"])


@router.post("/conversations", response_model=ConversationSummary)
def create_xiaoqiao_conversation(payload: ConversationCreateRequest) -> ConversationSummary:
    return create_conversation(payload)


@router.get("/conversations", response_model=list[ConversationSummary])
def list_xiaoqiao_conversations() -> list[ConversationSummary]:
    return list_conversations()


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_xiaoqiao_conversation(conversation_id: str) -> ConversationDetailResponse:
    response = get_conversation(conversation_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return response


@router.post("/conversations/{conversation_id}/messages", response_model=MessageEntryResponse)
def create_xiaoqiao_message(conversation_id: str, payload: MessageCreateRequest) -> MessageEntryResponse:
    response = post_message(conversation_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return response


@router.get("/tasks", response_model=list[TaskRecord])
def list_xiaoqiao_tasks() -> list[TaskRecord]:
    return list_tasks()


@router.get("/tasks/{task_id}", response_model=TaskDetailResponse)
def get_xiaoqiao_task(task_id: str) -> TaskDetailResponse:
    response = get_task(task_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return response


@router.put("/tasks/{task_id}/context", response_model=TaskDetailResponse)
def update_xiaoqiao_task_context(task_id: str, payload: TaskContextUpdateRequest) -> TaskDetailResponse:
    response = update_task_context(task_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return response


@router.get("/tasks/{task_id}/results", response_model=list[WorkflowResultRecord])
def list_xiaoqiao_task_results(task_id: str) -> list[WorkflowResultRecord]:
    response = get_task_results(task_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return response


@router.get("/workspace", response_model=WorkspaceResponse)
def get_xiaoqiao_workspace() -> WorkspaceResponse:
    return get_workspace()


@router.post("/autonomous-runs", response_model=AutonomousRunDetailResponse)
def create_xiaoqiao_autonomous_run(payload: AutonomousRunCreateRequest) -> AutonomousRunDetailResponse:
    return create_autonomous_run(payload)


@router.get("/autonomous-runs", response_model=list[AutonomousRunRecord])
def list_xiaoqiao_autonomous_runs() -> list[AutonomousRunRecord]:
    return list_autonomous_runs()


@router.get("/autonomous-runs/pressure-evidence")
def get_xiaoqiao_autonomous_pressure_evidence() -> dict[str, object]:
    response = get_latest_pressure_evidence()
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous pressure evidence not found")
    return response


@router.get("/autonomous-runs/{run_id}", response_model=AutonomousRunDetailResponse)
def get_xiaoqiao_autonomous_run(run_id: str) -> AutonomousRunDetailResponse:
    response = get_autonomous_run(run_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous run not found")
    return response


@router.get("/autonomous-runs/{run_id}/dashboard", response_model=AutonomousRunDashboardRecord)
def get_xiaoqiao_autonomous_dashboard(run_id: str) -> AutonomousRunDashboardRecord:
    response = get_autonomous_dashboard(run_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous run not found")
    return response


@router.post("/autonomous-runs/{run_id}/heartbeat", response_model=AutonomousRunRecord)
def heartbeat_xiaoqiao_autonomous_run(
    run_id: str, payload: AutonomousRunHeartbeatRequest
) -> AutonomousRunRecord:
    response = heartbeat_autonomous_run(run_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous run not found")
    return response


@router.post("/autonomous-runs/{run_id}/checkpoints", response_model=AutonomousRunCheckpointRecord)
def checkpoint_xiaoqiao_autonomous_run(
    run_id: str, payload: AutonomousRunCheckpointCreateRequest
) -> AutonomousRunCheckpointRecord:
    response = checkpoint_autonomous_run(run_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous run not found")
    return response


@router.post("/autonomous-runs/{run_id}/resume", response_model=AutonomousRunRecord)
def resume_xiaoqiao_autonomous_run(run_id: str, payload: AutonomousRunResumeRequest) -> AutonomousRunRecord:
    response = resume_autonomous_run(run_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous run not found")
    return response


@router.get("/autonomous-runs/{run_id}/tasks/{task_id}/context", response_model=ContextInjectionBundleRecord)
def get_xiaoqiao_autonomous_task_context(run_id: str, task_id: str) -> ContextInjectionBundleRecord:
    response = get_context_bundle(run_id, task_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous task not found")
    return response


@router.post("/autonomous-runs/{run_id}/tasks/{task_id}/review", response_model=ReviewScorecardRecord)
def review_xiaoqiao_autonomous_task(
    run_id: str, task_id: str, payload: ReviewScoreInput
) -> ReviewScorecardRecord:
    response = review_autonomous_task(run_id, task_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Autonomous task not found")
    return response


@router.get("/mock/attribution/cases", response_model=list[AttributionCaseSummary])
def list_xiaoqiao_attribution_cases() -> list[AttributionCaseSummary]:
    return [AttributionCaseSummary(**item) for item in list_attribution_cases()]


@router.get("/mock/attribution/cases/{case_id}", response_model=AttributionCaseDetailResponse)
def get_xiaoqiao_attribution_case(case_id: str) -> AttributionCaseDetailResponse:
    response = get_attribution_case(case_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Attribution case not found")
    return AttributionCaseDetailResponse(**response)


@router.get("/admin/prompts", response_model=list[PromptConfigRecord])
def list_xiaoqiao_prompts() -> list[PromptConfigRecord]:
    return list_prompts()


@router.get("/admin/prompts/{prompt_id}", response_model=PromptDetailResponse)
def get_xiaoqiao_prompt(prompt_id: str) -> PromptDetailResponse:
    response = get_prompt(prompt_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return response


@router.post("/admin/prompts", response_model=PromptDetailResponse)
def create_xiaoqiao_prompt(payload: PromptConfigCreateRequest) -> PromptDetailResponse:
    return create_prompt(payload)


@router.put("/admin/prompts/{prompt_id}", response_model=PromptDetailResponse)
def update_xiaoqiao_prompt(prompt_id: str, payload: PromptConfigUpdateRequest) -> PromptDetailResponse:
    response = update_prompt(prompt_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return response


@router.get("/admin/prompts/{prompt_id}/versions", response_model=list[PromptVersionRecord])
def list_xiaoqiao_prompt_versions(prompt_id: str) -> list[PromptVersionRecord]:
    response = list_prompt_versions(prompt_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return response


@router.put("/admin/prompts/{prompt_id}/binding", response_model=PromptBindingRecord)
def update_xiaoqiao_prompt_binding(prompt_id: str, payload: PromptBindingUpdateRequest) -> PromptBindingRecord:
    response = update_prompt_binding(prompt_id, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return response


@router.get("/admin/feature-switches", response_model=list[FeatureSwitchRecord])
def list_xiaoqiao_feature_switches() -> list[FeatureSwitchRecord]:
    return list_feature_switches()


@router.put("/admin/feature-switches/{switch_key}", response_model=FeatureSwitchRecord)
def update_xiaoqiao_feature_switch(
    switch_key: str, payload: FeatureSwitchUpdateRequest
) -> FeatureSwitchRecord:
    response = update_feature_switch(switch_key, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Feature switch not found")
    return response
