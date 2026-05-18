from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from ad.xiaoqiao.models import (
    ArtifactLinkRecord,
    AutonomousRunCheckpointCreateRequest,
    AutonomousRunCheckpointRecord,
    AutonomousRunCreateRequest,
    AutonomousRunDashboardRecord,
    AutonomousRunDetailResponse,
    AutonomousRunHeartbeatRequest,
    AutonomousRunRecord,
    AutonomousRunResumeRequest,
    AutonomousTaskRecord,
    ContextFactRecord,
    ContextInjectionBundleRecord,
    GoalNodeRecord,
    ReviewDeductionRecord,
    ReviewDimensionScoreRecord,
    ReviewScoreInput,
    ReviewScorecardRecord,
    ReworkRecord,
)
from ad.xiaoqiao.store import STORE


PRESSURE_EVIDENCE_PATH = Path("docs/evidence/xiaoqiao-autonomous-runtime-pressure-run-2026-05-09.json")


def _now() -> datetime:
    return datetime.now()


GOAL_TEMPLATE = [
    {
        "id": "G0",
        "title": "把 ad 收口成可持续推进的交付级实现样本",
        "summary": "围绕工作台主链、结构化结果、评分返工和运行追踪形成闭环。",
        "owner": "Delivery PM",
        "priority": "P0",
        "acceptance_criteria": [
            "工作台主链可持续执行",
            "结果结构可被页面直接消费",
            "评审与返工记录可回放",
        ],
    },
    {
        "id": "G1",
        "title": "工作台主链可稳定运行",
        "summary": "先跑通工作台头部、会话链路和历史任务回看。",
        "owner": "Frontend PM",
        "priority": "P0",
        "parent": "G0",
        "acceptance_criteria": ["会话和任务主链可用", "页面能回看真实任务与结果"],
    },
    {
        "id": "G2",
        "title": "四类结构化结果可稳定返回",
        "summary": "帮助、需求、排查、联调结果都具备真实业务字段。",
        "owner": "Backend PM",
        "priority": "P0",
        "parent": "G0",
        "acceptance_criteria": ["四类结果都有结构化字段", "结果可被页面稳定消费"],
    },
    {
        "id": "G3",
        "title": "评审与返工闭环可运行",
        "summary": "评审分数不达标时，系统可以自动打回并保留返工历史。",
        "owner": "Review PM",
        "priority": "P1",
        "parent": "G0",
        "acceptance_criteria": ["评分卡可用", "低分自动进入返工"],
    },
    {
        "id": "G4",
        "title": "运行状态可在工作台追踪",
        "summary": "run、task、review、rework、checkpoint 关键字段都可观察。",
        "owner": "Platform PM",
        "priority": "P1",
        "parent": "G0",
        "acceptance_criteria": ["运行字段可追踪", "关键 artifact 可回看"],
    },
    {
        "id": "G5",
        "title": "支持持续执行与中断恢复",
        "summary": "通过 heartbeat、checkpoint 和 resume 保持长周期执行稳定。",
        "owner": "Runtime PM",
        "priority": "P1",
        "parent": "G0",
        "acceptance_criteria": ["可连续执行 60 分钟", "中断后可恢复任务推进"],
    },
]


TASK_TEMPLATE = [
    {
        "id": "T-01",
        "title": "工作台头部与运行状态区接入真实 workspace",
        "summary": "把工作台头部、运行状态和快捷入口绑定到真实状态数据。",
        "owner": "Frontend PM",
        "goal_refs": ["G1", "G4"],
        "dependencies": [],
        "artifacts": [
            ("工作台页面", "frontend/src/App.jsx", "ui", "working-output"),
            ("交付总控", "docs/小乔智投-交付总控-2026-05-08.md", "document", "upstream-truth"),
        ],
    },
    {
        "id": "T-02",
        "title": "主对话区与消息发送链路接入真实会话",
        "summary": "把会话创建、消息发送和最近消息承接到真实 conversations/messages。",
        "owner": "Frontend PM",
        "goal_refs": ["G1"],
        "dependencies": ["T-01"],
        "artifacts": [
            ("会话页面", "frontend/src/App.jsx", "ui", "working-output"),
            ("接口真源", "docs/小乔智投-接口真源-2026-05-07.md", "api", "upstream-truth"),
        ],
    },
    {
        "id": "T-03",
        "title": "历史任务区与任务详情接入真实 tasks",
        "summary": "让历史任务、任务详情和结果区能稳定回看真实任务对象。",
        "owner": "Frontend PM",
        "goal_refs": ["G1", "G4"],
        "dependencies": ["T-02"],
        "artifacts": [
            ("任务页面", "frontend/src/App.jsx", "ui", "working-output"),
            ("开发任务拆解", "docs/小乔智投-开发任务拆解与技术评审-2026-05-08.md", "task", "upstream-truth"),
        ],
    },
    {
        "id": "T-11",
        "title": "使用帮助结果 contract 收口",
        "summary": "帮助结果必须输出结论、适用场景、关键路径和下一步动作。",
        "owner": "Backend PM",
        "goal_refs": ["G2"],
        "dependencies": ["T-03"],
        "artifacts": [
            ("结果服务", "src/ad/xiaoqiao/service.py", "code", "working-output"),
            ("使用帮助设计", "docs/小乔智投-使用帮助设计-2026-05-08.md", "document", "upstream-truth"),
        ],
    },
    {
        "id": "T-21",
        "title": "需求沟通结果 contract 收口",
        "summary": "需求结果必须输出目标、范围、缺失字段、依赖和交付动作。",
        "owner": "Backend PM",
        "goal_refs": ["G2"],
        "dependencies": ["T-03"],
        "artifacts": [
            ("结果服务", "src/ad/xiaoqiao/service.py", "code", "working-output"),
            ("需求文档", "docs/小乔智投-需求文档-2026-05-08.md", "document", "upstream-truth"),
        ],
    },
    {
        "id": "T-31",
        "title": "问题排查结果 contract 收口",
        "summary": "排查结果必须输出结论、证据链、风险和待核查动作。",
        "owner": "Backend PM",
        "goal_refs": ["G2"],
        "dependencies": ["T-03"],
        "artifacts": [
            ("结果服务", "src/ad/xiaoqiao/service.py", "code", "working-output"),
            ("问题排查设计", "docs/小乔智投-问题排查设计-2026-05-08.md", "document", "upstream-truth"),
        ],
    },
    {
        "id": "T-41",
        "title": "广告联调结果 contract 收口",
        "summary": "联调结果必须输出阶段、执行记录、阻塞、回退动作和验收判断。",
        "owner": "Backend PM",
        "goal_refs": ["G2"],
        "dependencies": ["T-03"],
        "artifacts": [
            ("结果服务", "src/ad/xiaoqiao/service.py", "code", "working-output"),
            ("自动联调设计", "docs/小乔智投-自动联调设计-2026-05-08.md", "document", "upstream-truth"),
        ],
    },
    {
        "id": "T-51",
        "title": "Review 评分与自动返工接入",
        "summary": "Review 必须输出分数、扣分项和阻塞问题，低于 80 分自动打回。",
        "owner": "Review PM",
        "goal_refs": ["G3", "G4"],
        "dependencies": ["T-11", "T-21", "T-31", "T-41"],
        "artifacts": [
            ("运行时服务", "src/ad/xiaoqiao/autonomous_runtime.py", "code", "working-output"),
            ("测试方案", "docs/小乔智投-autonomous-delivery-run-测试方案-2026-05-09.md", "document", "upstream-truth"),
        ],
    },
    {
        "id": "T-61",
        "title": "60 分钟连续执行压测与中断恢复验证",
        "summary": "验证 heartbeat、checkpoint、resume 和 rework 历史是否稳定。",
        "owner": "Runtime PM",
        "goal_refs": ["G4", "G5"],
        "dependencies": ["T-51"],
        "artifacts": [
            ("运行时服务", "src/ad/xiaoqiao/autonomous_runtime.py", "code", "working-output"),
            ("运行测试", "tests/test_autonomous_runtime.py", "code", "working-output"),
        ],
    },
]


def create_autonomous_run(payload: AutonomousRunCreateRequest) -> AutonomousRunDetailResponse:
    now = _now()
    run_id = f"run_{uuid4().hex[:12]}"
    run = AutonomousRunRecord(
        id=run_id,
        requirement=payload.requirement.strip(),
        owner=payload.owner.strip() or "codex",
        state="running",
        current_goal_id=f"{run_id}_G1",
        current_task_id=f"{run_id}_T-01",
        checkpoint_interval_minutes=payload.checkpoint_interval_minutes,
        target_runtime_minutes=payload.target_runtime_minutes,
        started_at=now,
        last_heartbeat_at=now,
        next_checkpoint_at=now + timedelta(minutes=payload.checkpoint_interval_minutes),
        created_at=now,
        updated_at=now,
    )
    STORE.autonomous_runs[run.id] = run

    _seed_goals(run)
    _seed_tasks(run)
    _build_context_bundle(run.id, run.current_task_id or f"{run.id}_T-01")
    return get_autonomous_run(run.id)


def list_autonomous_runs() -> list[AutonomousRunRecord]:
    runs = list(STORE.autonomous_runs.values())
    for run in runs:
        _sync_run_progress(run)
    return sorted(runs, key=lambda item: item.updated_at, reverse=True)


def get_autonomous_run(run_id: str) -> AutonomousRunDetailResponse | None:
    run = STORE.autonomous_runs.get(run_id)
    if run is None:
        return None

    _sync_run_progress(run)
    goals = sorted(STORE.autonomous_goals.get(run_id, []), key=lambda item: item.id)
    tasks = sorted(STORE.autonomous_tasks.get(run_id, []), key=lambda item: item.id)
    artifacts = sorted(STORE.autonomous_artifacts.get(run_id, []), key=lambda item: item.id)
    checkpoints = sorted(STORE.autonomous_checkpoints.get(run_id, []), key=lambda item: item.created_at, reverse=True)
    reviews = sorted(STORE.autonomous_reviews.get(run_id, []), key=lambda item: item.created_at, reverse=True)
    reworks = sorted(STORE.autonomous_reworks.get(run_id, []), key=lambda item: item.created_at, reverse=True)
    latest_context_bundle = None
    if run.current_task_id:
        latest_context_bundle = _build_context_bundle(run.id, run.current_task_id)
    return AutonomousRunDetailResponse(
        run=run,
        goals=goals,
        tasks=tasks,
        artifacts=artifacts,
        checkpoints=checkpoints,
        reviews=reviews,
        reworks=reworks,
        latest_context_bundle=latest_context_bundle,
    )


def get_autonomous_dashboard(run_id: str) -> AutonomousRunDashboardRecord | None:
    run = STORE.autonomous_runs.get(run_id)
    if run is None:
        return None

    _sync_run_progress(run)
    current_task = _find_task(run_id, run.current_task_id)
    reviews = STORE.autonomous_reviews.get(run_id, [])
    latest_review = max(reviews, key=lambda item: item.created_at) if reviews else None
    return AutonomousRunDashboardRecord(
        run_id=run.id,
        run_state=run.state,
        started_at=run.started_at,
        last_heartbeat_at=run.last_heartbeat_at,
        next_checkpoint_at=run.next_checkpoint_at,
        current_goal_id=run.current_goal_id,
        current_task_id=run.current_task_id,
        current_task_owner=current_task.owner if current_task else None,
        current_task_state=current_task.state if current_task else None,
        artifact_count=len(STORE.autonomous_artifacts.get(run_id, [])),
        latest_review_score=latest_review.score if latest_review else None,
        latest_review_decision=latest_review.decision if latest_review else None,
        rework_count=run.rework_count,
        resume_count=run.resume_count,
        final_artifacts=run.final_artifact_paths,
        total_runtime_minutes=max(0, int((_now() - run.started_at).total_seconds() // 60)),
        checkpoint_count=len(STORE.autonomous_checkpoints.get(run_id, [])),
    )


def get_latest_pressure_evidence() -> dict[str, object] | None:
    if not PRESSURE_EVIDENCE_PATH.exists():
        return None
    return json.loads(PRESSURE_EVIDENCE_PATH.read_text(encoding="utf-8"))


def heartbeat_autonomous_run(run_id: str, payload: AutonomousRunHeartbeatRequest) -> AutonomousRunRecord | None:
    run = STORE.autonomous_runs.get(run_id)
    if run is None:
        return None

    _sync_run_progress(run)
    now = _now()
    run.last_heartbeat_at = now
    run.updated_at = now
    if payload.summary:
        STORE.autonomous_events.setdefault(run.id, []).append(payload.summary.strip())
    STORE.autonomous_runs[run.id] = run
    return run


def checkpoint_autonomous_run(
    run_id: str, payload: AutonomousRunCheckpointCreateRequest
) -> AutonomousRunCheckpointRecord | None:
    run = STORE.autonomous_runs.get(run_id)
    if run is None:
        return None

    _sync_run_progress(run)
    checkpoint = _append_checkpoint(run, payload.summary.strip(), _now())
    STORE.autonomous_runs[run.id] = run
    return checkpoint


def resume_autonomous_run(run_id: str, payload: AutonomousRunResumeRequest) -> AutonomousRunRecord | None:
    run = STORE.autonomous_runs.get(run_id)
    if run is None:
        return None

    _sync_run_progress(run)
    now = _now()
    run.state = "running"
    run.resume_count += 1
    run.last_heartbeat_at = now
    run.updated_at = now
    run.next_checkpoint_at = now + timedelta(minutes=run.checkpoint_interval_minutes)
    if payload.reason:
        STORE.autonomous_events.setdefault(run.id, []).append(f"resume: {payload.reason.strip()}")
    current_task = _find_task(run.id, run.current_task_id)
    if current_task and current_task.state in ("pending", "manual_attention", "needs_rework", "blocked"):
        current_task.state = "running"
        current_task.updated_at = now
    STORE.autonomous_runs[run.id] = run
    return run


def review_autonomous_task(run_id: str, task_id: str, payload: ReviewScoreInput) -> ReviewScorecardRecord | None:
    run = STORE.autonomous_runs.get(run_id)
    task = _find_task(run_id, task_id)
    if run is None or task is None:
        return None

    _sync_run_progress(run)
    breakdowns = [
        ReviewDimensionScoreRecord(dimension="structure", score=payload.structure_score, max_score=20, note="结构完整度"),
        ReviewDimensionScoreRecord(dimension="depth", score=payload.depth_score, max_score=20, note="内容深度"),
        ReviewDimensionScoreRecord(
            dimension="consistency", score=payload.consistency_score, max_score=20, note="与真源一致性"
        ),
        ReviewDimensionScoreRecord(dimension="execution", score=payload.execution_score, max_score=15, note="可执行性"),
        ReviewDimensionScoreRecord(dimension="risk", score=payload.risk_score, max_score=15, note="风险覆盖"),
        ReviewDimensionScoreRecord(
            dimension="traceability", score=payload.traceability_score, max_score=10, note="证据可追溯性"
        ),
    ]
    deductions = [
        ReviewDeductionRecord(
            dimension=item.dimension,
            deducted_score=item.max_score - item.score,
            reason=f"{item.note}未达满分",
        )
        for item in breakdowns
        if item.score < item.max_score
    ]
    total_score = sum(item.score for item in breakdowns)
    if total_score >= 90:
        decision = "pass"
    elif total_score >= 80:
        decision = "conditional_pass"
    else:
        decision = "reject"

    now = _now()
    review = ReviewScorecardRecord(
        id=f"review_{uuid4().hex[:12]}",
        run_id=run.id,
        task_id=task.id,
        score=total_score,
        decision=decision,
        breakdowns=breakdowns,
        deductions=deductions,
        blocking_issues=payload.blocking_issues,
        recommended_rework_task_id=task.id if decision == "reject" else None,
        evidence_paths=payload.evidence_paths,
        created_at=now,
    )
    STORE.autonomous_reviews.setdefault(run.id, []).append(review)

    task.review_score = total_score
    task.updated_at = now
    _append_evidence(run.id, task.goal_refs, payload.evidence_paths)

    if decision == "reject":
        task.rework_count += 1
        run.rework_count += 1
        if task.rework_count > 2:
            task.state = "manual_attention"
            run.state = "manual_attention"
            rework_status = "manual_attention"
        else:
            task.state = "needs_rework"
            run.state = "needs_rework"
            rework_status = "active"
        rework = ReworkRecord(
            id=f"rework_{uuid4().hex[:12]}",
            run_id=run.id,
            task_id=task.id,
            attempt=task.rework_count,
            owner=task.owner,
            reason="; ".join(payload.blocking_issues) or "Review score below 80.",
            triggered_by_review_id=review.id,
            status=rework_status,
            created_at=now,
            updated_at=now,
        )
        STORE.autonomous_reworks.setdefault(run.id, []).append(rework)
    else:
        task.state = "completed"
        task.completed_at = now
        _complete_active_reworks(run.id, task.id)
        _mark_goal_complete_if_ready(run.id, task.goal_refs)
        _advance_to_next_task(run)

    run.updated_at = now
    STORE.autonomous_runs[run.id] = run
    _build_context_bundle(run.id, run.current_task_id or task.id)
    return review


def get_context_bundle(run_id: str, task_id: str) -> ContextInjectionBundleRecord | None:
    run = STORE.autonomous_runs.get(run_id)
    task = _find_task(run_id, task_id)
    if run is None or task is None:
        return None

    _sync_run_progress(run)
    return _build_context_bundle(run.id, task.id)


def _seed_goals(run: AutonomousRunRecord) -> None:
    now = _now()
    goals: list[GoalNodeRecord] = []
    for item in GOAL_TEMPLATE:
        goal_id = f"{run.id}_{item['id']}"
        parent_goal_id = f"{run.id}_{item['parent']}" if "parent" in item else None
        state = "running" if item["id"] == "G1" else "pending"
        goals.append(
            GoalNodeRecord(
                id=goal_id,
                run_id=run.id,
                parent_goal_id=parent_goal_id,
                title=item["title"],
                summary=item["summary"],
                owner=item["owner"],
                state=state,
                priority=item["priority"],
                acceptance_criteria=item["acceptance_criteria"],
                created_at=now,
                updated_at=now,
            )
        )
    STORE.autonomous_goals[run.id] = goals


def _seed_tasks(run: AutonomousRunRecord) -> None:
    now = _now()
    tasks: list[AutonomousTaskRecord] = []
    artifacts: list[ArtifactLinkRecord] = []
    for item in TASK_TEMPLATE:
        task_id = f"{run.id}_{item['id']}"
        state = "running" if item["id"] == "T-01" else "pending"
        artifact_ids: list[str] = []
        for label, path, artifact_type, role_in_task in item["artifacts"]:
            artifact_id = f"artifact_{uuid4().hex[:12]}"
            artifact_ids.append(artifact_id)
            artifacts.append(
                ArtifactLinkRecord(
                    id=artifact_id,
                    task_id=task_id,
                    label=label,
                    path=path,
                    artifact_type=artifact_type,
                    role_in_task=role_in_task,
                    created_at=now,
                )
            )
        tasks.append(
            AutonomousTaskRecord(
                id=task_id,
                run_id=run.id,
                title=item["title"],
                summary=item["summary"],
                owner=item["owner"],
                state=state,
                goal_refs=[f"{run.id}_{goal_ref}" for goal_ref in item["goal_refs"]],
                dependency_task_ids=[f"{run.id}_{task_ref}" for task_ref in item["dependencies"]],
                artifact_link_ids=artifact_ids,
                created_at=now,
                updated_at=now,
            )
        )
    STORE.autonomous_tasks[run.id] = tasks
    STORE.autonomous_artifacts[run.id] = artifacts


def _find_task(run_id: str, task_id: str | None) -> AutonomousTaskRecord | None:
    if task_id is None:
        return None
    for task in STORE.autonomous_tasks.get(run_id, []):
        if task.id == task_id:
            return task
    return None


def _find_goal(run_id: str, goal_id: str | None) -> GoalNodeRecord | None:
    if goal_id is None:
        return None
    for goal in STORE.autonomous_goals.get(run_id, []):
        if goal.id == goal_id:
            return goal
    return None


def _build_context_bundle(run_id: str, task_id: str) -> ContextInjectionBundleRecord:
    run = STORE.autonomous_runs[run_id]
    task = _find_task(run_id, task_id)
    assert task is not None

    goals = STORE.autonomous_goals.get(run_id, [])
    artifacts = {artifact.id: artifact for artifact in STORE.autonomous_artifacts.get(run_id, [])}
    checkpoints = sorted(STORE.autonomous_checkpoints.get(run_id, []), key=lambda item: item.created_at)
    reviews = sorted(STORE.autonomous_reviews.get(run_id, []), key=lambda item: item.created_at)
    reworks = sorted(STORE.autonomous_reworks.get(run_id, []), key=lambda item: item.created_at)

    dependency_summary = []
    for dependency_id in task.dependency_task_ids:
        dependency_task = _find_task(run_id, dependency_id)
        if dependency_task is not None:
            dependency_summary.append(f"{dependency_task.title} / {dependency_task.state}")

    latest_review = reviews[-1] if reviews else None
    latest_rework = reworks[-1] if reworks else None
    bundle = ContextInjectionBundleRecord(
        id=f"context_{uuid4().hex[:12]}",
        run_id=run_id,
        task_id=task_id,
        goal_summary=[
            f"{goal.title} / {goal.state}"
            for goal in goals
            if goal.id in task.goal_refs or goal.id == run.current_goal_id
        ],
        dependency_summary=dependency_summary,
        latest_checkpoint_summary=[item.summary for item in checkpoints[-2:]],
        latest_review_summary=[
            f"{item.task_id.split('_')[-1]} / {item.score} / {item.decision}" for item in reviews[-2:]
        ],
        latest_rework_summary=[
            f"{item.task_id.split('_')[-1]} / attempt {item.attempt} / {item.status}" for item in reworks[-2:]
        ],
        artifact_summary=[
            f"{artifacts[artifact_id].label} -> {artifacts[artifact_id].path}"
            for artifact_id in task.artifact_link_ids
            if artifact_id in artifacts
        ],
        facts=[
            ContextFactRecord(kind="fact", content=f"当前任务 owner 为 {task.owner}。"),
            ContextFactRecord(kind="fact", content=f"当前任务状态为 {task.state}。"),
            ContextFactRecord(
                kind="judgment",
                content="当前主线优先保证工作台与结果闭环，再用 Review 与 rework 压测持续执行能力。",
            ),
            ContextFactRecord(
                kind="candidate",
                content="如果当前任务 review 低于 80 分，应自动进入 rework 并带上阻塞项继续执行。",
            ),
            ContextFactRecord(
                kind="unknown",
                content="真实生产数据源与预发布数据库接入不在本轮验证范围内。",
            ),
        ],
        created_at=_now(),
    )

    if latest_review is not None and latest_review.blocking_issues:
        bundle.facts.append(
            ContextFactRecord(kind="fact", content=f"最近一次 review 阻塞：{'；'.join(latest_review.blocking_issues)}。")
        )
    if latest_rework is not None:
        bundle.facts.append(
            ContextFactRecord(
                kind="fact",
                content=f"最近一次 rework 为第 {latest_rework.attempt} 次，状态 {latest_rework.status}。",
            )
        )

    STORE.autonomous_context_bundles.setdefault(run_id, {})[task_id] = bundle
    return bundle


def _append_checkpoint(run: AutonomousRunRecord, summary: str, checkpoint_at: datetime) -> AutonomousRunCheckpointRecord:
    checkpoint = AutonomousRunCheckpointRecord(
        id=f"ckpt_{uuid4().hex[:12]}",
        run_id=run.id,
        summary=summary,
        runtime_minute=max(0, int((checkpoint_at - run.started_at).total_seconds() // 60)),
        created_at=checkpoint_at,
    )
    STORE.autonomous_checkpoints.setdefault(run.id, []).append(checkpoint)
    run.updated_at = checkpoint_at
    run.next_checkpoint_at = checkpoint_at + timedelta(minutes=run.checkpoint_interval_minutes)
    return checkpoint


def _sync_run_progress(run: AutonomousRunRecord) -> None:
    if run.state not in ("running", "needs_rework"):
        return

    now = _now()
    while run.state == "running" and now >= run.next_checkpoint_at:
        current_task = _find_task(run.id, run.current_task_id)
        current_goal = _find_goal(run.id, run.current_goal_id)
        summary = (
            f"自动 checkpoint：目标={current_goal.title if current_goal else '未定位'}；"
            f"任务={current_task.title if current_task else '未定位'}；"
            f"rework={run.rework_count}；resume={run.resume_count}"
        )
        _append_checkpoint(run, summary, run.next_checkpoint_at)


def _append_evidence(run_id: str, goal_refs: list[str], evidence_paths: list[str]) -> None:
    if not evidence_paths:
        return

    now = _now()
    for goal_id in goal_refs:
        goal = _find_goal(run_id, goal_id)
        if goal is None:
            continue
        merged = list(goal.evidence_paths)
        for path in evidence_paths:
            if path not in merged:
                merged.append(path)
        goal.evidence_paths = merged
        goal.updated_at = now


def _complete_active_reworks(run_id: str, task_id: str) -> None:
    now = _now()
    for rework in reversed(STORE.autonomous_reworks.get(run_id, [])):
        if rework.task_id == task_id and rework.status == "active":
            rework.status = "completed"
            rework.updated_at = now
            break


def _mark_goal_complete_if_ready(run_id: str, goal_refs: list[str]) -> None:
    tasks = STORE.autonomous_tasks.get(run_id, [])
    now = _now()
    for goal_id in goal_refs:
        goal_tasks = [task for task in tasks if goal_id in task.goal_refs]
        if goal_tasks and all(task.state == "completed" for task in goal_tasks):
            goal = _find_goal(run_id, goal_id)
            if goal is not None:
                goal.state = "completed"
                goal.updated_at = now

    child_goals = [goal for goal in STORE.autonomous_goals.get(run_id, []) if goal.parent_goal_id]
    root_goal = _find_goal(run_id, f"{run_id}_G0")
    if root_goal and child_goals and all(goal.state == "completed" for goal in child_goals):
        root_goal.state = "completed"
        root_goal.updated_at = now


def _advance_to_next_task(run: AutonomousRunRecord) -> None:
    tasks = STORE.autonomous_tasks.get(run.id, [])
    now = _now()
    next_task = None
    for task in tasks:
        if task.state != "pending":
            continue
        dependencies_ready = all(
            (_find_task(run.id, dependency_id) or task).state == "completed"
            for dependency_id in task.dependency_task_ids
        )
        if dependencies_ready:
            next_task = task
            break

    if next_task is None:
        run.state = "completed"
        run.current_task_id = None
        run.current_goal_id = None
        run.final_artifact_paths = [
            "docs/小乔智投-需求文档-2026-05-08.md",
            "docs/小乔智投-设计文档-2026-05-08.md",
            "docs/小乔智投-接口真源-2026-05-07.md",
            "docs/小乔智投-autonomous-delivery-run-测试方案-2026-05-09.md",
            "tests/test_autonomous_runtime.py",
        ]
        run.updated_at = now
        return

    next_task.state = "running"
    next_task.updated_at = now
    run.current_task_id = next_task.id
    run.current_goal_id = next_task.goal_refs[0] if next_task.goal_refs else None
    run.state = "running"
    run.updated_at = now
    next_goal = _find_goal(run.id, run.current_goal_id)
    if next_goal is not None and next_goal.state == "pending":
        next_goal.state = "running"
        next_goal.updated_at = now
