from pydantic import BaseModel


class FlowNode(BaseModel):
    id: str
    label: str
    type: str
    user_count: int


class FlowLink(BaseModel):
    source: str
    target: str
    value: int


class FlowResponse(BaseModel):
    nodes: list[FlowNode]
    links: list[FlowLink]


class NodeUser(BaseModel):
    user_id: str
    device_id: str
    source_type: str
    user_type: str
    current_node: str
    result_node: str
    visited_nodes: list[str]


class NodeUsersResponse(BaseModel):
    node_id: str
    users: list[NodeUser]


class TraceStep(BaseModel):
    step: str
    time: str


class UserTraceResponse(BaseModel):
    user_id: str
    trace: list[TraceStep]


class POCScope(BaseModel):
    media: str
    game: str
    device_path: str
    acceptance: list[str]


class SummaryCard(BaseModel):
    title: str
    value: str
    detail: str
    tone: str


class ChecklistItem(BaseModel):
    id: str
    title: str
    status: str
    owner: str
    detail: str


class IntegrationStep(BaseModel):
    id: str
    index: int
    title: str
    stage: str
    goal: str
    status: str
    inputs: list[str]
    outputs: list[str]
    success_criteria: list[str]
    failure_modes: list[str]
    next_action: str


class ReplayEvent(BaseModel):
    offset_ms: int
    step_id: str
    step_status: str
    level: str
    message: str


class RiskItem(BaseModel):
    title: str
    detail: str
    severity: str


class IntegrationPocResponse(BaseModel):
    title: str
    subtitle: str
    scope: POCScope
    summary_cards: list[SummaryCard]
    checklist: list[ChecklistItem]
    steps: list[IntegrationStep]
    replay_events: list[ReplayEvent]
    risks: list[RiskItem]


class FeatureMockEntry(BaseModel):
    data: dict[str, object]


class FeatureModuleResponse(BaseModel):
    id: str
    name: str
    goal: str
    demo_priority: str
    actors: list[str]
    core_fields: list[str]
    mock_entry: FeatureMockEntry


class WalkthroughStepResponse(BaseModel):
    step: int
    module: str
    title: str
    expected_output: str


class DiagnosisResultResponse(BaseModel):
    title: str
    summary: str
    evidence: list[str]
    action: str


class AnalysisRowResponse(BaseModel):
    target: str
    spend: int
    roi: float
    ctr: float


class FullFunctionMockCardsResponse(BaseModel):
    diagnosis_result: DiagnosisResultResponse
    analysis_table: list[AnalysisRowResponse]


class DemandIntakeRequest(BaseModel):
    submitter: str
    media: str
    app: str
    request_type: str
    target_date: str
    document_url: str


class DemandIntakeResponse(BaseModel):
    request_id: str
    status: str
    submitter: str
    media: str
    app: str
    request_type: str
    target_date: str
    document_url: str
    structured_fields: list[str]
    next_action: str


class CaseArchiveRequest(BaseModel):
    request_id: str
    submitter: str
    scene: str
    summary: str
    follow_up: str


class CaseArchiveResponse(BaseModel):
    case_id: str
    request_id: str
    submitter: str
    scene: str
    summary: str
    follow_up: str
    status: str
    archived_at: str


class StandardDockingRunRequest(BaseModel):
    media: str
    app: str
    entry_mode: str
    device_id: str
    acceptance: list[str]


class StandardDockingRunResponse(BaseModel):
    task_id: str
    media: str
    app: str
    entry_mode: str
    device_id: str
    acceptance: list[str]
    current_stage: str
    status: str
    next_action: str
    timeline: list[str]


class DockingPlaybackStep(BaseModel):
    step: int
    title: str
    status: str
    detail: str


class StandardDockingPlaybackResponse(BaseModel):
    task_id: str
    steps: list[DockingPlaybackStep]


class DiagnosisRunRequest(BaseModel):
    question: str
    time_range: str
    plan_id: str


class DiagnosisRunResponse(BaseModel):
    question: str
    time_range: str
    plan_id: str
    title: str
    summary: str
    evidence: list[str]
    action: str
    confidence: str


class DiagnosisFollowupRequest(BaseModel):
    question: str
    time_range: str
    plan_id: str
    follow_up: str


class DiagnosisFollowupResponse(BaseModel):
    follow_up: str
    answer: str
    evidence: list[str]
    next_suggestion: str


class AnalysisRunRequest(BaseModel):
    question: str
    compare_targets: list[str]
    metrics: list[str]
    time_range: str


class AnalysisRunResponse(BaseModel):
    question: str
    compare_targets: list[str]
    metrics: list[str]
    time_range: str
    summary: str
    key_findings: list[str]
    analysis_table: list[AnalysisRowResponse]


class AnalysisFollowupRequest(BaseModel):
    question: str
    compare_targets: list[str]
    metrics: list[str]
    time_range: str
    follow_up: str


class AnalysisFollowupResponse(BaseModel):
    follow_up: str
    answer: str
    key_points: list[str]


class ActivityItemResponse(BaseModel):
    id: str
    kind: str
    title: str
    detail: str
    created_at: str


class ActivityFeedResponse(BaseModel):
    items: list[ActivityItemResponse]


class ProjectMetaResponse(BaseModel):
    id: str
    name: str
    date: str
    scope: str


class FullFunctionDesignResponse(BaseModel):
    project: ProjectMetaResponse
    feature_modules: list[FeatureModuleResponse]
    walkthrough: list[WalkthroughStepResponse]
    mock_cards: FullFunctionMockCardsResponse
