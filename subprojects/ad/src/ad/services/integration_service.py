import json
from collections import deque
from pathlib import Path
from uuid import uuid4

from ad.schemas import (
    ActivityFeedResponse,
    ActivityItemResponse,
    AnalysisFollowupRequest,
    AnalysisFollowupResponse,
    AnalysisRowResponse,
    AnalysisRunRequest,
    AnalysisRunResponse,
    CaseArchiveRequest,
    CaseArchiveResponse,
    ChecklistItem,
    DemandIntakeRequest,
    DemandIntakeResponse,
    DiagnosisFollowupRequest,
    DiagnosisFollowupResponse,
    DiagnosisResultResponse,
    DiagnosisRunRequest,
    DiagnosisRunResponse,
    DockingPlaybackStep,
    FeatureMockEntry,
    FeatureModuleResponse,
    FullFunctionDesignResponse,
    FullFunctionMockCardsResponse,
    IntegrationPocResponse,
    IntegrationStep,
    POCScope,
    ProjectMetaResponse,
    ReplayEvent,
    RiskItem,
    StandardDockingPlaybackResponse,
    StandardDockingRunRequest,
    StandardDockingRunResponse,
    SummaryCard,
    WalkthroughStepResponse,
)

_ACTIVITY_FEED: deque[ActivityItemResponse] = deque(maxlen=24)


def _load_full_function_design_raw() -> dict:
    mock_data_path = Path(__file__).resolve().parents[3] / "docs" / "mock-data" / "full-function-design-mock-data.json"
    return json.loads(mock_data_path.read_text(encoding="utf-8"))


def _build_feature_module(module: dict) -> FeatureModuleResponse:
    return FeatureModuleResponse(**{**module, "mock_entry": FeatureMockEntry(data=module["mock_entry"])})


def _record_activity(kind: str, title: str, detail: str) -> None:
    _ACTIVITY_FEED.appendleft(
        ActivityItemResponse(
            id=f"ACT-{uuid4().hex[:8].upper()}",
            kind=kind,
            title=title,
            detail=detail,
            created_at="2026-04-22 10:50",
        )
    )


def get_integration_poc() -> IntegrationPocResponse:
    return IntegrationPocResponse(
        title="巨量 × 指间山海 Android 联调工作台",
        subtitle="首轮只验证已安装路径下的入口消费、打开游戏、启动与登录，不把归因、回传和付费作为硬门槛。",
        scope=POCScope(
            media="巨量",
            game="指间山海",
            device_path="Android 真机 / 已安装游戏",
            acceptance=["打开游戏", "启动", "登录"],
        ),
        summary_cards=[
            SummaryCard(title="首轮范围", value="巨量 × 指间山海", detail="先跑通单媒体、单项目、单设备主链路，不做多媒体并行和 iOS 分支。", tone="brand"),
            SummaryCard(title="设备路径", value="Android / 已安装", detail="先绕开下载和安装，把广告侧推进到游戏启动链路。", tone="neutral"),
            SummaryCard(title="验收口径", value="启动 + 登录", detail="归因、回传、付费先降级为增强项，不作为首轮硬门槛。", tone="success"),
            SummaryCard(title="当前重点", value="主链路先打通", detail="优先验证入口送达、抖音消费入口、广告到游戏、游戏登录四个硬节点。", tone="warning"),
        ],
        checklist=[
            ChecklistItem(id="media", title="巨量联调账号与入口页面固定", status="ready", owner="广告支持", detail="首轮只保留一套巨量联调页面和一条标准入口生成路径。"),
            ChecklistItem(id="device", title="Android 测试机已安装抖音和指间山海", status="ready", owner="测试 / 广告支持", detail="设备需要能被稳定唤起和控制，不切换多机型。"),
            ChecklistItem(id="douyin", title="抖音账号登录态可用", status="ready", owner="投放", detail="首轮目标是不被登录、风控和弹窗直接阻断。"),
            ChecklistItem(id="game-account", title="游戏测试账号可稳定登录", status="ready", owner="测试 / 运营", detail="首轮只验证登录，不验证付费与复杂风控路径。"),
        ],
        steps=[
            IntegrationStep(
                id="step-1",
                index=1,
                title="创建联调任务",
                stage="任务初始化",
                goal="把本次巨量 × 指间山海联调变成唯一任务对象。",
                status="pending",
                inputs=["媒体=巨量", "项目=指间山海", "路径=Android已安装", "验收=启动+登录"],
                outputs=["task_id", "任务摘要", "待执行状态"],
                success_criteria=["任务创建成功", "当前范围与验收口径已锁定"],
                failure_modes=["关键信息不完整", "前置校验未通过"],
                next_action="进入巨量后台并生成本次联调入口。",
            ),
            IntegrationStep(
                id="step-2",
                index=2,
                title="登录巨量后台",
                stage="浏览器自动化",
                goal="进入可操作页面，准备创建联调入口。",
                status="pending",
                inputs=["巨量账号", "目标后台页面"],
                outputs=["登录态", "页面上下文"],
                success_criteria=["已进入可操作页面", "入口创建控件可见"],
                failure_modes=["登录失败", "风控验证码", "页面结构变化"],
                next_action="创建入口对象并绑定任务。",
            ),
            IntegrationStep(
                id="step-3",
                index=3,
                title="送达到 Android 设备",
                stage="设备桥接",
                goal="让测试机稳定拿到本次任务入口。",
                status="pending",
                inputs=["入口对象", "测试设备", "桥接方式"],
                outputs=["设备可访问入口", "送达状态"],
                success_criteria=["入口已送达", "后续脚本可直接消费"],
                failure_modes=["入口无法送达", "设备读取不到入口"],
                next_action="唤起抖音并消费入口。",
            ),
            IntegrationStep(
                id="step-4",
                index=4,
                title="抖音消费入口",
                stage="真机控制",
                goal="在抖音内进入正确广告页或落地页。",
                status="pending",
                inputs=["抖音登录态", "入口对象"],
                outputs=["广告页状态", "落地页状态"],
                success_criteria=["已进入目标广告页", "页面稳定可继续"],
                failure_modes=["扫码失败", "链接不可消费", "跳转错误"],
                next_action="打开指间山海。",
            ),
            IntegrationStep(
                id="step-5",
                index=5,
                title="打开游戏并登录",
                stage="游戏动作",
                goal="把链路推进到业务事件已发生的状态。",
                status="pending",
                inputs=["广告页", "游戏安装态", "测试账号"],
                outputs=["启动结果", "登录结果", "事件时间点"],
                success_criteria=["游戏稳定启动", "测试账号登录完成"],
                failure_modes=["首屏卡死", "登录失败", "UI 差异过大"],
                next_action="输出首轮联调结论。",
            ),
        ],
        replay_events=[
            ReplayEvent(offset_ms=0, step_id="step-1", step_status="running", level="info", message="正在创建联调任务并锁定首轮范围。"),
            ReplayEvent(offset_ms=900, step_id="step-1", step_status="success", level="success", message="任务创建完成，验收口径锁定为启动 + 登录。"),
            ReplayEvent(offset_ms=1500, step_id="step-2", step_status="running", level="info", message="浏览器自动化已进入巨量后台。"),
            ReplayEvent(offset_ms=2600, step_id="step-2", step_status="success", level="success", message="后台登录成功，目标入口页面可操作。"),
            ReplayEvent(offset_ms=3400, step_id="step-3", step_status="running", level="warning", message="正在把入口送达到 Android 测试机。"),
            ReplayEvent(offset_ms=4500, step_id="step-3", step_status="success", level="success", message="设备已拿到入口，后续可直接消费。"),
            ReplayEvent(offset_ms=5200, step_id="step-4", step_status="running", level="info", message="抖音开始消费入口并尝试跳转广告页。"),
            ReplayEvent(offset_ms=6400, step_id="step-4", step_status="success", level="success", message="已进入正确广告页，准备打开游戏。"),
            ReplayEvent(offset_ms=7200, step_id="step-5", step_status="running", level="warning", message="正在处理首屏中间态并执行登录。"),
            ReplayEvent(offset_ms=8600, step_id="step-5", step_status="success", level="success", message="启动与登录完成，首轮主链路可判定为已打通。"),
        ],
        risks=[
            RiskItem(title="入口送达设备", detail="电脑侧对象如何稳定进入手机仍是第一硬风险，后续必须固化唯一桥接路径。", severity="high"),
            RiskItem(title="抖音入口消费方式", detail="需要尽快确认必须扫码还是可被稳定替换为直链。", severity="high"),
            RiskItem(title="游戏首屏差异", detail="首屏弹窗、账号风控和登录路径必须在首轮固化，不做通用脚本。", severity="medium"),
        ],
    )


def get_full_function_design() -> FullFunctionDesignResponse:
    raw = _load_full_function_design_raw()
    return FullFunctionDesignResponse(
        project=ProjectMetaResponse(**raw["project"]),
        feature_modules=[_build_feature_module(module) for module in raw["feature_modules"]],
        walkthrough=[WalkthroughStepResponse(**step) for step in raw["walkthrough"]],
        mock_cards=FullFunctionMockCardsResponse(
            diagnosis_result=DiagnosisResultResponse(**raw["mock_cards"]["diagnosis_result"]),
            analysis_table=[AnalysisRowResponse(**row) for row in raw["mock_cards"]["analysis_table"]],
        ),
    )


def get_full_function_modules() -> list[FeatureModuleResponse]:
    raw = _load_full_function_design_raw()
    return [_build_feature_module(module) for module in raw["feature_modules"]]


def get_full_function_module(module_id: str) -> FeatureModuleResponse | None:
    raw = _load_full_function_design_raw()
    module = next((item for item in raw["feature_modules"] if item["id"] == module_id), None)
    if module is None:
        return None
    return _build_feature_module(module)


def get_full_function_walkthrough() -> list[WalkthroughStepResponse]:
    raw = _load_full_function_design_raw()
    return [WalkthroughStepResponse(**step) for step in raw["walkthrough"]]


def get_full_function_mock_cards() -> FullFunctionMockCardsResponse:
    raw = _load_full_function_design_raw()
    return FullFunctionMockCardsResponse(
        diagnosis_result=DiagnosisResultResponse(**raw["mock_cards"]["diagnosis_result"]),
        analysis_table=[AnalysisRowResponse(**row) for row in raw["mock_cards"]["analysis_table"]],
    )


def get_recent_activity_feed() -> ActivityFeedResponse:
    if not _ACTIVITY_FEED:
        _record_activity("system", "工作台已就绪", "当前可演示需求接入、联调执行、联调回放、异常诊断、对话式分析和 Case 归档。")
    return ActivityFeedResponse(items=list(_ACTIVITY_FEED))


def submit_demand_intake(payload: DemandIntakeRequest) -> DemandIntakeResponse:
    response = DemandIntakeResponse(
        request_id=f"REQ-{uuid4().hex[:8].upper()}",
        status="已结构化",
        submitter=payload.submitter,
        media=payload.media,
        app=payload.app,
        request_type=payload.request_type,
        target_date=payload.target_date,
        document_url=payload.document_url,
        structured_fields=["媒体", "应用", "需求类型", "目标日期", "文档地址", "提交人"],
        next_action="进入标准联调任务创建并生成首轮执行单",
    )
    _record_activity("intake", "提交结构化需求", f"{payload.media} / {payload.app} / {payload.request_type}")
    return response


def archive_case(payload: CaseArchiveRequest) -> CaseArchiveResponse:
    response = CaseArchiveResponse(
        case_id=f"CASE-{uuid4().hex[:8].upper()}",
        request_id=payload.request_id,
        submitter=payload.submitter,
        scene=payload.scene,
        summary=payload.summary,
        follow_up=payload.follow_up,
        status="待复盘",
        archived_at="2026-04-22 10:50",
    )
    _record_activity("archive", "生成 Case 归档", f"{payload.scene} / {payload.summary}")
    return response


def run_standard_docking(payload: StandardDockingRunRequest) -> StandardDockingRunResponse:
    response = StandardDockingRunResponse(
        task_id=f"TASK-{uuid4().hex[:8].upper()}",
        media=payload.media,
        app=payload.app,
        entry_mode=payload.entry_mode,
        device_id=payload.device_id,
        acceptance=payload.acceptance,
        current_stage="已完成入口生成、设备送达、广告消费、游戏启动与登录校验",
        status="主链路打通",
        next_action="进入异常诊断或对话式分析，确认数据与业务结果是否一致",
        timeline=[
            "创建联调任务并锁定验收口径",
            "生成入口对象并送达到测试设备",
            "在抖音内消费入口并跳转广告页",
            "打开游戏并完成测试账号登录",
            "输出首轮联调结论，主链路可演示",
        ],
    )
    _record_activity("docking", "执行标准联调", f"{payload.media} / {payload.app} / {payload.device_id}")
    return response


def get_standard_docking_playback(task_id: str) -> StandardDockingPlaybackResponse:
    response = StandardDockingPlaybackResponse(
        task_id=task_id,
        steps=[
            DockingPlaybackStep(step=1, title="创建联调任务", status="success", detail="任务已创建，验收口径锁定为打开游戏、启动、登录。"),
            DockingPlaybackStep(step=2, title="生成入口并送达设备", status="success", detail="入口对象已生成并送达到 ANDROID-01。"),
            DockingPlaybackStep(step=3, title="抖音消费入口", status="success", detail="已进入目标广告页，前链路跳转正常。"),
            DockingPlaybackStep(step=4, title="打开游戏", status="success", detail="游戏已启动，未出现阻断性弹窗。"),
            DockingPlaybackStep(step=5, title="测试账号登录", status="success", detail="登录完成，首轮主链路可以作为月底演示样例。"),
        ],
    )
    _record_activity("playback", "加载联调回放", f"task_id={task_id}")
    return response


def run_diagnosis(payload: DiagnosisRunRequest) -> DiagnosisRunResponse:
    mock_cards = get_full_function_mock_cards()
    response = DiagnosisRunResponse(
        question=payload.question,
        time_range=payload.time_range,
        plan_id=payload.plan_id,
        title=mock_cards.diagnosis_result.title,
        summary=mock_cards.diagnosis_result.summary,
        evidence=mock_cards.diagnosis_result.evidence,
        action=mock_cards.diagnosis_result.action,
        confidence="高",
    )
    _record_activity("diagnosis", "执行异常诊断", payload.question)
    return response


def follow_up_diagnosis(payload: DiagnosisFollowupRequest) -> DiagnosisFollowupResponse:
    response = DiagnosisFollowupResponse(
        follow_up=payload.follow_up,
        answer="缺口主要集中在晚 7 点到 9 点，说明问题更像回传时间戳格式异常，而不是全天稳定缺失。",
        evidence=[
            "19:00 到 21:00 的缺失订单最集中",
            "媒体回传链路在该时间段切换了新的参数模板",
            "BI 入库前校验日志提示时间字段格式不一致",
        ],
        next_suggestion="继续追问素材、计划或媒体版本切换时间点，判断是否只影响部分流量。",
    )
    _record_activity("diagnosis-follow-up", "追加诊断追问", payload.follow_up)
    return response


def run_analysis(payload: AnalysisRunRequest) -> AnalysisRunResponse:
    mock_cards = get_full_function_mock_cards()
    targets = " vs ".join(payload.compare_targets)
    response = AnalysisRunResponse(
        question=payload.question,
        compare_targets=payload.compare_targets,
        metrics=payload.metrics,
        time_range=payload.time_range,
        summary=f"{targets} 在 {payload.time_range} 的对比分析已生成，可继续追问素材、计划或时段差异。",
        key_findings=[
            "素材A 的 ROI 高于素材B，适合继续放量",
            "素材A 的 CTR 更高，说明前链路点击表现更稳定",
            "素材B 当前更适合作为补量素材，不适合承担主预算",
        ],
        analysis_table=mock_cards.analysis_table,
    )
    _record_activity("analysis", "执行对话式分析", payload.question)
    return response


def follow_up_analysis(payload: AnalysisFollowupRequest) -> AnalysisFollowupResponse:
    response = AnalysisFollowupResponse(
        follow_up=payload.follow_up,
        answer="素材A 的优势主要来自更高点击率，说明前链路创意吸引力更强；素材B 的问题更像点击后承接效率不足。",
        key_points=[
            "素材A CTR 更高，点击获取更稳定",
            "素材B ROI 偏低，不适合继续承担主预算",
            "下一步建议拆分时段和人群继续追问，确认差异是否集中在特定流量段",
        ],
    )
    _record_activity("analysis-follow-up", "追加分析追问", payload.follow_up)
    return response
