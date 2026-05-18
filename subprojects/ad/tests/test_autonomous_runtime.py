import importlib.util
import json
from pathlib import Path
from datetime import timedelta
from unittest import TestCase
from unittest.mock import patch

import ad.xiaoqiao.autonomous_runtime as autonomous_runtime_module
from ad.xiaoqiao.autonomous_runtime import (
    checkpoint_autonomous_run,
    create_autonomous_run,
    get_autonomous_dashboard,
    get_latest_pressure_evidence,
    get_context_bundle,
    get_autonomous_run,
    heartbeat_autonomous_run,
    resume_autonomous_run,
    review_autonomous_task,
)
from ad.xiaoqiao.models import (
    AutonomousRunCheckpointCreateRequest,
    AutonomousRunCreateRequest,
    AutonomousRunHeartbeatRequest,
    AutonomousRunResumeRequest,
    ReviewScoreInput,
)
from ad.xiaoqiao.store import STORE


class AutonomousRuntimeTests(TestCase):
    def setUp(self) -> None:
        STORE.autonomous_runs.clear()
        STORE.autonomous_goals.clear()
        STORE.autonomous_tasks.clear()
        STORE.autonomous_artifacts.clear()
        STORE.autonomous_checkpoints.clear()
        STORE.autonomous_reviews.clear()
        STORE.autonomous_reworks.clear()
        STORE.autonomous_context_bundles.clear()
        STORE.autonomous_events.clear()

    def _load_pressure_script(self):
        script_path = Path(__file__).resolve().parents[1] / "scripts" / "run_autonomous_runtime_pressure.py"
        spec = importlib.util.spec_from_file_location("run_autonomous_runtime_pressure", script_path)
        assert spec is not None
        assert spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_create_run_builds_goals_tasks_and_context_bundle(self) -> None:
        detail = create_autonomous_run(
            AutonomousRunCreateRequest(requirement="把小乔智投当前真源推进到可持续开发实现状态")
        )

        self.assertEqual(detail.run.state, "running")
        self.assertEqual(len(detail.goals), 6)
        self.assertEqual(len(detail.tasks), 9)
        self.assertIsNotNone(detail.latest_context_bundle)
        assert detail.latest_context_bundle is not None
        self.assertEqual(detail.run.current_task_id, detail.latest_context_bundle.task_id)
        self.assertTrue(detail.latest_context_bundle.goal_summary)

    def test_low_review_score_triggers_auto_rework_and_deductions(self) -> None:
        detail = create_autonomous_run(
            AutonomousRunCreateRequest(requirement="把小乔智投当前真源推进到可持续开发实现状态")
        )
        current_task_id = detail.run.current_task_id
        assert current_task_id is not None

        review = review_autonomous_task(
            detail.run.id,
            current_task_id,
            ReviewScoreInput(
                structure_score=10,
                depth_score=10,
                consistency_score=10,
                execution_score=10,
                risk_score=10,
                traceability_score=5,
                blocking_issues=["结果结构不完整"],
                evidence_paths=["docs/小乔智投-功能开发说明文档-2026-05-08.md"],
            ),
        )

        self.assertIsNotNone(review)
        assert review is not None
        self.assertEqual(review.score, 55)
        self.assertEqual(review.decision, "reject")
        self.assertTrue(review.deductions)
        run = STORE.autonomous_runs[detail.run.id]
        self.assertEqual(run.state, "needs_rework")
        self.assertEqual(run.rework_count, 1)
        task = next(item for item in STORE.autonomous_tasks[detail.run.id] if item.id == current_task_id)
        self.assertEqual(task.state, "needs_rework")

    def test_three_rejects_escalate_to_manual_attention(self) -> None:
        detail = create_autonomous_run(
            AutonomousRunCreateRequest(requirement="把小乔智投当前真源推进到可持续开发实现状态")
        )
        current_task_id = detail.run.current_task_id
        assert current_task_id is not None

        payload = ReviewScoreInput(
            structure_score=10,
            depth_score=10,
            consistency_score=10,
            execution_score=10,
            risk_score=10,
            traceability_score=5,
            blocking_issues=["关键业务字段未补齐"],
            evidence_paths=["docs/小乔智投-需求文档-2026-05-08.md"],
        )
        review_autonomous_task(detail.run.id, current_task_id, payload)
        review_autonomous_task(detail.run.id, current_task_id, payload)
        review_autonomous_task(detail.run.id, current_task_id, payload)

        run = STORE.autonomous_runs[detail.run.id]
        task = next(item for item in STORE.autonomous_tasks[detail.run.id] if item.id == current_task_id)
        self.assertEqual(run.state, "manual_attention")
        self.assertEqual(task.state, "manual_attention")

    def test_passing_review_advances_to_next_task_and_completes_rework(self) -> None:
        detail = create_autonomous_run(
            AutonomousRunCreateRequest(requirement="把小乔智投当前真源推进到可持续开发实现状态")
        )
        current_task_id = detail.run.current_task_id
        assert current_task_id is not None

        review_autonomous_task(
            detail.run.id,
            current_task_id,
            ReviewScoreInput(
                structure_score=10,
                depth_score=10,
                consistency_score=10,
                execution_score=10,
                risk_score=10,
                traceability_score=5,
                blocking_issues=["结果结构不完整"],
                evidence_paths=["docs/小乔智投-交付总控-2026-05-08.md"],
            ),
        )
        review = review_autonomous_task(
            detail.run.id,
            current_task_id,
            ReviewScoreInput(
                structure_score=18,
                depth_score=18,
                consistency_score=18,
                execution_score=14,
                risk_score=13,
                traceability_score=9,
                evidence_paths=["docs/小乔智投-交付总控-2026-05-08.md"],
            ),
        )

        self.assertIsNotNone(review)
        run = STORE.autonomous_runs[detail.run.id]
        self.assertEqual(run.state, "running")
        self.assertNotEqual(run.current_task_id, current_task_id)
        next_task = next(item for item in STORE.autonomous_tasks[detail.run.id] if item.id == run.current_task_id)
        self.assertEqual(next_task.state, "running")
        self.assertEqual(STORE.autonomous_reworks[detail.run.id][0].status, "completed")

    def test_overdue_run_generates_automatic_checkpoints_for_long_cycle(self) -> None:
        detail = create_autonomous_run(
            AutonomousRunCreateRequest(requirement="把小乔智投当前真源推进到可持续开发实现状态")
        )
        run = STORE.autonomous_runs[detail.run.id]
        run.next_checkpoint_at = run.started_at - timedelta(minutes=21)

        refreshed = get_autonomous_run(detail.run.id)
        assert refreshed is not None
        checkpoints = STORE.autonomous_checkpoints[detail.run.id]
        self.assertGreaterEqual(len(checkpoints), 2)
        self.assertTrue(all("自动 checkpoint" in item.summary for item in checkpoints))

    def test_checkpoint_heartbeat_resume_context_and_dashboard(self) -> None:
        detail = create_autonomous_run(
            AutonomousRunCreateRequest(requirement="把小乔智投当前真源推进到可持续开发实现状态")
        )
        run_id = detail.run.id
        current_task_id = detail.run.current_task_id
        assert current_task_id is not None

        heartbeat = heartbeat_autonomous_run(run_id, AutonomousRunHeartbeatRequest(summary="still running"))
        self.assertIsNotNone(heartbeat)
        checkpoint = checkpoint_autonomous_run(run_id, AutonomousRunCheckpointCreateRequest(summary="10 minute checkpoint"))
        self.assertIsNotNone(checkpoint)
        resumed = resume_autonomous_run(run_id, AutonomousRunResumeRequest(reason="resume after interruption"))
        self.assertIsNotNone(resumed)
        assert resumed is not None
        self.assertEqual(resumed.resume_count, 1)

        bundle = get_context_bundle(run_id, current_task_id)
        dashboard = get_autonomous_dashboard(run_id)
        self.assertIsNotNone(bundle)
        self.assertIsNotNone(dashboard)
        assert bundle is not None
        assert dashboard is not None
        self.assertTrue(any("当前任务状态为" in fact.content for fact in bundle.facts))
        self.assertEqual(dashboard.run_id, run_id)
        self.assertGreaterEqual(dashboard.checkpoint_count, 1)

    def test_can_read_pressure_evidence_file(self) -> None:
        evidence_path = Path(__file__).resolve().parents[1] / "docs" / "evidence" / "test-pressure-evidence.json"
        evidence_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "runId": "run_demo",
            "totalRuntimeMinutes": 61,
            "checkpointCount": 6,
            "resumeCount": 1,
            "reworkCount": 1,
            "finalDecision": "solved",
        }
        evidence_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        self.addCleanup(lambda: evidence_path.unlink(missing_ok=True))

        with patch.object(autonomous_runtime_module, "PRESSURE_EVIDENCE_PATH", evidence_path):
            evidence = get_latest_pressure_evidence()

        self.assertIsNotNone(evidence)
        assert evidence is not None
        self.assertEqual(evidence["runId"], "run_demo")
        self.assertEqual(evidence["finalDecision"], "solved")

    def test_pressure_script_generates_solved_artifact(self) -> None:
        module = self._load_pressure_script()
        evidence_path = Path(__file__).resolve().parents[1] / "docs" / "evidence" / "test-pressure-run.json"
        self.addCleanup(lambda: evidence_path.unlink(missing_ok=True))

        with patch.object(module, "ARTIFACT_PATH", evidence_path):
            module.main()

        self.assertTrue(evidence_path.exists())
        artifact = json.loads(evidence_path.read_text(encoding="utf-8"))
        self.assertEqual(artifact["finalDecision"], "solved")
        self.assertEqual(artifact["runState"], "completed")
        self.assertGreaterEqual(artifact["totalRuntimeMinutes"], 60)
        self.assertGreaterEqual(artifact["checkpointCount"], 6)
