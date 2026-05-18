from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


WorkflowLevel = Literal["none", "light", "heavy"]
TaskType = Literal["help", "diagnosis", "demand", "debugging", "monitor", "material-analysis", "forecast"]
ConversationMode = Literal["natural-chat", "light-workflow", "heavy-workflow"]
PromptStatus = Literal["draft", "published", "disabled"]
GoalState = Literal["pending", "running", "blocked", "needs_rework", "completed"]
AutonomousRunState = Literal["initialized", "running", "paused", "needs_rework", "manual_attention", "completed"]
AutonomousTaskState = Literal["pending", "running", "blocked", "needs_rework", "manual_attention", "completed"]
ReviewDecision = Literal["pass", "conditional_pass", "reject"]
ArtifactType = Literal["document", "code", "api", "ui", "task", "checkpoint"]
FactKind = Literal["fact", "judgment", "candidate", "unknown"]


class AttachmentInput(BaseModel):
    name: str
    url: str | None = None
    kind: str | None = None


class ConversationCreateRequest(BaseModel):
    user_id: str
    title: str | None = None


class MessageCreateRequest(BaseModel):
    content: str
    attachments: list[AttachmentInput] = Field(default_factory=list)


class ConversationSummary(BaseModel):
    id: str
    user_id: str
    title: str
    status: Literal["active", "archived", "closed"]
    current_mode: ConversationMode
    started_at: datetime
    updated_at: datetime
    last_message_at: datetime | None = None


class MessageRecord(BaseModel):
    id: str
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    message_type: Literal["user_input", "assistant_reply", "clarification", "system_notice", "workflow_summary"]
    content: str
    related_task_id: str | None = None
    created_at: datetime


class RoutingDecisionRecord(BaseModel):
    id: str
    conversation_id: str
    source_message_id: str
    is_business_related: bool
    business_domain: str | None = None
    intent_type: str | None = None
    workflow_level: WorkflowLevel = "none"
    clarification_needed: bool = False
    decision_reason: str
    created_at: datetime


class TaskContextRecord(BaseModel):
    task_id: str
    is_business_related: bool
    business_domain: str | None = None
    intent_type: str | None = None
    media: str | None = None
    app: str | None = None
    plan_id: str | None = None
    device_id: str | None = None
    time_range: str | None = None
    attachments_json: list[dict[str, object]] = Field(default_factory=list)
    missing_fields_json: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class TaskRecord(BaseModel):
    id: str
    conversation_id: str
    task_type: TaskType
    workflow_level: Literal["light", "heavy"]
    status: Literal["created", "clarifying", "running", "waiting", "completed", "archived", "downgraded"]
    owner_type: Literal["xiaoqiao", "sub-agent", "human-escalation"] = "xiaoqiao"
    source_message_id: str | None = None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None


class WorkflowResultRecord(BaseModel):
    id: str
    task_id: str
    result_type: str
    summary: str
    structured_payload_json: dict[str, object] = Field(default_factory=dict)
    confidence: str | None = None
    next_action: str | None = None
    created_at: datetime


class ConversationDetailResponse(BaseModel):
    conversation: ConversationSummary
    recent_task: TaskRecord | None = None
    last_routing: RoutingDecisionRecord | None = None
    messages: list[MessageRecord] = Field(default_factory=list)


class TaskDetailResponse(BaseModel):
    task: TaskRecord
    context: TaskContextRecord | None = None
    latest_result: WorkflowResultRecord | None = None


class MessageEntryResponse(BaseModel):
    message: MessageRecord
    routing: RoutingDecisionRecord
    task: TaskRecord | None = None
    assistant_reply: MessageRecord


class WorkspaceResponse(BaseModel):
    status_summary: dict[str, object]
    quick_modes: list[dict[str, str]]
    recent_tasks: list[TaskRecord]
    support_summary: dict[str, object]


class PromptConfigRecord(BaseModel):
    id: str
    name: str
    category: str
    business_flow: str
    agent_scope: str
    model_scope: str
    status: PromptStatus
    current_version: str
    updated_at: datetime


class PromptVersionRecord(BaseModel):
    id: str
    prompt_id: str
    version: str
    content: str
    variables: list[str] = Field(default_factory=list)
    created_at: datetime


class PromptBindingRecord(BaseModel):
    prompt_id: str
    business_flow: str
    agent_scope: str
    model_scope: str
    enabled: bool
    updated_at: datetime


class FeatureSwitchRecord(BaseModel):
    key: str
    label: str
    enabled: bool
    updated_at: datetime


class PromptConfigCreateRequest(BaseModel):
    name: str
    category: str
    business_flow: str
    agent_scope: str
    model_scope: str
    content: str
    variables: list[str] = Field(default_factory=list)


class PromptConfigUpdateRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    business_flow: str | None = None
    agent_scope: str | None = None
    model_scope: str | None = None
    status: PromptStatus | None = None
    content: str | None = None
    variables: list[str] | None = None


class PromptBindingUpdateRequest(BaseModel):
    business_flow: str
    agent_scope: str
    model_scope: str
    enabled: bool


class FeatureSwitchUpdateRequest(BaseModel):
    enabled: bool


class PromptDetailResponse(BaseModel):
    prompt: PromptConfigRecord
    latest_version: PromptVersionRecord | None = None
    binding: PromptBindingRecord | None = None


class TaskContextUpdateRequest(BaseModel):
    media: str | None = None
    app: str | None = None
    plan_id: str | None = None
    device_id: str | None = None
    time_range: str | None = None


class AttributionCaseSummary(BaseModel):
    case_id: str
    case_type: str
    description: str
    app_id: str
    os_type: str
    media_id: str
    expected_result: str


class AttributionCaseDetailResponse(BaseModel):
    case_id: str
    case_type: str
    description: str
    app_id: str
    os_type: str
    media_id: str
    channel_id: str
    identifiers: dict[str, str]
    expected_result: str
    note: str
    diagnosis_code: str
    timeline: list[dict[str, str]]
    important_constraint: str


class AutonomousRunCreateRequest(BaseModel):
    requirement: str
    owner: str = "codex"
    checkpoint_interval_minutes: int = Field(default=10, ge=1, le=60)
    target_runtime_minutes: int = Field(default=60, ge=10, le=240)


class AutonomousRunHeartbeatRequest(BaseModel):
    summary: str | None = None


class AutonomousRunCheckpointCreateRequest(BaseModel):
    summary: str


class AutonomousRunResumeRequest(BaseModel):
    reason: str | None = None


class ReviewScoreInput(BaseModel):
    structure_score: int = Field(ge=0, le=20)
    depth_score: int = Field(ge=0, le=20)
    consistency_score: int = Field(ge=0, le=20)
    execution_score: int = Field(ge=0, le=15)
    risk_score: int = Field(ge=0, le=15)
    traceability_score: int = Field(ge=0, le=10)
    blocking_issues: list[str] = Field(default_factory=list)
    evidence_paths: list[str] = Field(default_factory=list)


class GoalNodeRecord(BaseModel):
    id: str
    run_id: str
    parent_goal_id: str | None = None
    title: str
    summary: str
    owner: str
    state: GoalState
    priority: str
    acceptance_criteria: list[str] = Field(default_factory=list)
    evidence_paths: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ArtifactLinkRecord(BaseModel):
    id: str
    task_id: str
    label: str
    path: str
    artifact_type: ArtifactType
    role_in_task: str
    created_at: datetime


class AutonomousTaskRecord(BaseModel):
    id: str
    run_id: str
    title: str
    summary: str
    owner: str
    state: AutonomousTaskState
    goal_refs: list[str] = Field(default_factory=list)
    dependency_task_ids: list[str] = Field(default_factory=list)
    artifact_link_ids: list[str] = Field(default_factory=list)
    review_score: int | None = None
    rework_count: int = 0
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class ContextFactRecord(BaseModel):
    kind: FactKind
    content: str


class ContextInjectionBundleRecord(BaseModel):
    id: str
    run_id: str
    task_id: str
    goal_summary: list[str] = Field(default_factory=list)
    dependency_summary: list[str] = Field(default_factory=list)
    latest_checkpoint_summary: list[str] = Field(default_factory=list)
    latest_review_summary: list[str] = Field(default_factory=list)
    latest_rework_summary: list[str] = Field(default_factory=list)
    artifact_summary: list[str] = Field(default_factory=list)
    facts: list[ContextFactRecord] = Field(default_factory=list)
    created_at: datetime


class ReviewDimensionScoreRecord(BaseModel):
    dimension: str
    score: int
    max_score: int
    note: str


class ReviewDeductionRecord(BaseModel):
    dimension: str
    deducted_score: int
    reason: str


class ReviewScorecardRecord(BaseModel):
    id: str
    run_id: str
    task_id: str
    score: int
    decision: ReviewDecision
    breakdowns: list[ReviewDimensionScoreRecord] = Field(default_factory=list)
    deductions: list[ReviewDeductionRecord] = Field(default_factory=list)
    blocking_issues: list[str] = Field(default_factory=list)
    recommended_rework_task_id: str | None = None
    evidence_paths: list[str] = Field(default_factory=list)
    created_at: datetime


class ReworkRecord(BaseModel):
    id: str
    run_id: str
    task_id: str
    attempt: int
    owner: str
    reason: str
    triggered_by_review_id: str
    status: Literal["active", "completed", "manual_attention"]
    created_at: datetime
    updated_at: datetime


class AutonomousRunCheckpointRecord(BaseModel):
    id: str
    run_id: str
    summary: str
    runtime_minute: int
    created_at: datetime


class AutonomousRunRecord(BaseModel):
    id: str
    requirement: str
    owner: str
    state: AutonomousRunState
    current_goal_id: str | None = None
    current_task_id: str | None = None
    checkpoint_interval_minutes: int
    target_runtime_minutes: int
    resume_count: int = 0
    rework_count: int = 0
    started_at: datetime
    last_heartbeat_at: datetime
    next_checkpoint_at: datetime
    final_artifact_paths: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class AutonomousRunDetailResponse(BaseModel):
    run: AutonomousRunRecord
    goals: list[GoalNodeRecord] = Field(default_factory=list)
    tasks: list[AutonomousTaskRecord] = Field(default_factory=list)
    artifacts: list[ArtifactLinkRecord] = Field(default_factory=list)
    checkpoints: list[AutonomousRunCheckpointRecord] = Field(default_factory=list)
    reviews: list[ReviewScorecardRecord] = Field(default_factory=list)
    reworks: list[ReworkRecord] = Field(default_factory=list)
    latest_context_bundle: ContextInjectionBundleRecord | None = None


class AutonomousRunDashboardRecord(BaseModel):
    run_id: str
    run_state: AutonomousRunState
    started_at: datetime
    last_heartbeat_at: datetime
    next_checkpoint_at: datetime
    current_goal_id: str | None = None
    current_task_id: str | None = None
    current_task_owner: str | None = None
    current_task_state: AutonomousTaskState | None = None
    artifact_count: int = 0
    latest_review_score: int | None = None
    latest_review_decision: ReviewDecision | None = None
    rework_count: int = 0
    resume_count: int = 0
    final_artifacts: list[str] = Field(default_factory=list)
    total_runtime_minutes: int = 0
    checkpoint_count: int = 0
