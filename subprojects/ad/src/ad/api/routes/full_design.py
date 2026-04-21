from fastapi import APIRouter, HTTPException

from ad.schemas import (
    ActivityFeedResponse,
    AnalysisFollowupRequest,
    AnalysisFollowupResponse,
    AnalysisRunRequest,
    AnalysisRunResponse,
    CaseArchiveRequest,
    CaseArchiveResponse,
    DemandIntakeRequest,
    DemandIntakeResponse,
    DiagnosisFollowupRequest,
    DiagnosisFollowupResponse,
    DiagnosisRunRequest,
    DiagnosisRunResponse,
    FeatureModuleResponse,
    FullFunctionDesignResponse,
    FullFunctionMockCardsResponse,
    StandardDockingPlaybackResponse,
    StandardDockingRunRequest,
    StandardDockingRunResponse,
    WalkthroughStepResponse,
)
from ad.services.integration_service import (
    archive_case,
    follow_up_analysis,
    follow_up_diagnosis,
    get_full_function_design,
    get_recent_activity_feed,
    get_full_function_mock_cards,
    get_full_function_module,
    get_full_function_modules,
    get_full_function_walkthrough,
    get_standard_docking_playback,
    run_analysis,
    run_diagnosis,
    run_standard_docking,
    submit_demand_intake,
)

router = APIRouter()


@router.get("/full-function-design", response_model=FullFunctionDesignResponse)
def read_full_function_design() -> FullFunctionDesignResponse:
    return get_full_function_design()


@router.get("/full-function-design/modules", response_model=list[FeatureModuleResponse])
def read_full_function_modules() -> list[FeatureModuleResponse]:
    return get_full_function_modules()


@router.get("/full-function-design/modules/{module_id}", response_model=FeatureModuleResponse)
def read_full_function_module(module_id: str) -> FeatureModuleResponse:
    module = get_full_function_module(module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="module not found")
    return module


@router.get("/full-function-design/walkthrough", response_model=list[WalkthroughStepResponse])
def read_full_function_walkthrough() -> list[WalkthroughStepResponse]:
    return get_full_function_walkthrough()


@router.get("/full-function-design/mock-cards", response_model=FullFunctionMockCardsResponse)
def read_full_function_mock_cards() -> FullFunctionMockCardsResponse:
    return get_full_function_mock_cards()


@router.get("/full-function-design/activity-feed", response_model=ActivityFeedResponse)
def read_recent_activity_feed() -> ActivityFeedResponse:
    return get_recent_activity_feed()


@router.post("/full-function-design/intake", response_model=DemandIntakeResponse)
def create_demand_intake(payload: DemandIntakeRequest) -> DemandIntakeResponse:
    return submit_demand_intake(payload)


@router.post("/full-function-design/case-archive", response_model=CaseArchiveResponse)
def create_case_archive(payload: CaseArchiveRequest) -> CaseArchiveResponse:
    return archive_case(payload)


@router.post("/full-function-design/standard-docking/run", response_model=StandardDockingRunResponse)
def create_standard_docking_run(payload: StandardDockingRunRequest) -> StandardDockingRunResponse:
    return run_standard_docking(payload)


@router.get("/full-function-design/standard-docking/{task_id}/playback", response_model=StandardDockingPlaybackResponse)
def read_standard_docking_playback(task_id: str) -> StandardDockingPlaybackResponse:
    return get_standard_docking_playback(task_id)


@router.post("/full-function-design/diagnosis/run", response_model=DiagnosisRunResponse)
def create_diagnosis_run(payload: DiagnosisRunRequest) -> DiagnosisRunResponse:
    return run_diagnosis(payload)


@router.post("/full-function-design/diagnosis/follow-up", response_model=DiagnosisFollowupResponse)
def create_diagnosis_follow_up(payload: DiagnosisFollowupRequest) -> DiagnosisFollowupResponse:
    return follow_up_diagnosis(payload)


@router.post("/full-function-design/analysis/run", response_model=AnalysisRunResponse)
def create_analysis_run(payload: AnalysisRunRequest) -> AnalysisRunResponse:
    return run_analysis(payload)


@router.post("/full-function-design/analysis/follow-up", response_model=AnalysisFollowupResponse)
def create_analysis_follow_up(payload: AnalysisFollowupRequest) -> AnalysisFollowupResponse:
    return follow_up_analysis(payload)
