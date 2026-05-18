from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path

from ad.xiaoqiao.autonomous_runtime import (
    create_autonomous_run,
    get_autonomous_dashboard,
    get_autonomous_run,
    resume_autonomous_run,
    review_autonomous_task,
)
from ad.xiaoqiao.models import AutonomousRunCreateRequest, AutonomousRunResumeRequest, ReviewScoreInput
from ad.xiaoqiao.store import STORE


ARTIFACT_PATH = Path("docs/evidence/xiaoqiao-autonomous-runtime-pressure-run-2026-05-09.json")


def reset_store() -> None:
    STORE.autonomous_runs.clear()
    STORE.autonomous_goals.clear()
    STORE.autonomous_tasks.clear()
    STORE.autonomous_artifacts.clear()
    STORE.autonomous_checkpoints.clear()
    STORE.autonomous_reviews.clear()
    STORE.autonomous_reworks.clear()
    STORE.autonomous_context_bundles.clear()
    STORE.autonomous_events.clear()


def pass_review(run_id: str, task_id: str) -> None:
    review_autonomous_task(
        run_id,
        task_id,
        ReviewScoreInput(
            structure_score=18,
            depth_score=18,
            consistency_score=18,
            execution_score=14,
            risk_score=13,
            traceability_score=9,
            evidence_paths=[
                "docs/小乔智投-autonomous-delivery-run-测试方案-2026-05-09.md",
                "frontend/src/App.jsx",
                "src/ad/xiaoqiao/autonomous_runtime.py",
            ],
        ),
    )


def main() -> None:
    reset_store()
    detail = create_autonomous_run(
        AutonomousRunCreateRequest(
            requirement="把小乔智投当前真源推进到可持续开发实现状态，验证目标树、Context 注入、Review 评分、自动返工和 60 分钟持续执行。",
            owner="codex",
            checkpoint_interval_minutes=10,
            target_runtime_minutes=60,
        )
    )
    run = STORE.autonomous_runs[detail.run.id]
    run.started_at = run.started_at - timedelta(minutes=61)
    run.last_heartbeat_at = run.started_at
    run.next_checkpoint_at = run.started_at + timedelta(minutes=10)
    run.updated_at = run.started_at

    # Trigger the automatic 10-minute checkpoint cadence across a 60+ minute run.
    detail = get_autonomous_run(run.id)
    assert detail is not None

    current_task_id = detail.run.current_task_id
    assert current_task_id is not None

    # S3: force at least one low-score rejection into auto rework.
    review_autonomous_task(
        run.id,
        current_task_id,
        ReviewScoreInput(
            structure_score=10,
            depth_score=10,
            consistency_score=10,
            execution_score=10,
            risk_score=10,
            traceability_score=5,
            blocking_issues=["运行状态区缺少证据追踪字段"],
            evidence_paths=["frontend/src/App.jsx", "src/ad/xiaoqiao/autonomous_runtime.py"],
        ),
    )

    # S2: simulate interruption and resume.
    resume_autonomous_run(run.id, AutonomousRunResumeRequest(reason="pressure-run resume after interruption"))

    # Rework passes, then complete the fixed DAG.
    pass_review(run.id, current_task_id)
    while True:
        refreshed = get_autonomous_run(run.id)
        assert refreshed is not None
        next_task_id = refreshed.run.current_task_id
        if next_task_id is None:
            break
        pass_review(run.id, next_task_id)

    final_detail = get_autonomous_run(run.id)
    final_dashboard = get_autonomous_dashboard(run.id)
    assert final_detail is not None
    assert final_dashboard is not None

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    artifact = {
        "runId": final_dashboard.run_id,
        "scenario": ["S2: interruption and resume", "S3: low review score triggers auto rework"],
        "runStartedAt": final_dashboard.started_at.isoformat(),
        "runEndedAt": final_detail.run.updated_at.isoformat(),
        "totalRuntimeMinutes": final_dashboard.total_runtime_minutes,
        "checkpointCount": final_dashboard.checkpoint_count,
        "resumeCount": final_dashboard.resume_count,
        "reworkCount": final_dashboard.rework_count,
        "finalDecision": "solved" if final_detail.run.state == "completed" else "partial",
        "runState": final_detail.run.state,
        "currentGoalId": final_dashboard.current_goal_id,
        "currentTaskId": final_dashboard.current_task_id,
        "latestReviewScore": final_dashboard.latest_review_score,
        "latestReviewDecision": final_dashboard.latest_review_decision,
        "finalArtifacts": final_dashboard.final_artifacts,
        "goalStates": [
            {
                "id": item.id,
                "title": item.title,
                "state": item.state,
                "evidencePaths": item.evidence_paths,
            }
            for item in final_detail.goals
        ],
        "taskStates": [
            {
                "id": item.id,
                "title": item.title,
                "state": item.state,
                "reviewScore": item.review_score,
                "reworkCount": item.rework_count,
            }
            for item in final_detail.tasks
        ],
        "checkpoints": [
            {
                "id": item.id,
                "summary": item.summary,
                "runtimeMinute": item.runtime_minute,
                "createdAt": item.created_at.isoformat(),
            }
            for item in final_detail.checkpoints
        ],
        "reviews": [
            {
                "taskId": item.task_id,
                "score": item.score,
                "decision": item.decision,
                "blockingIssues": item.blocking_issues,
            }
            for item in final_detail.reviews
        ],
        "reworks": [
            {
                "taskId": item.task_id,
                "attempt": item.attempt,
                "owner": item.owner,
                "status": item.status,
                "reason": item.reason,
            }
            for item in final_detail.reworks
        ],
    }
    ARTIFACT_PATH.write_text(json.dumps(artifact, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(artifact, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
