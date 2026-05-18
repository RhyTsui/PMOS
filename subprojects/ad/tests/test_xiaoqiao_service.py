from unittest import TestCase

from ad.xiaoqiao.models import ConversationCreateRequest, MessageCreateRequest
from ad.xiaoqiao.service import (
    create_conversation,
    get_task,
    get_task_results,
    get_workspace,
    list_tasks,
    post_message,
)
from ad.xiaoqiao.store import STORE


class XiaoQiaoServiceTests(TestCase):
    def setUp(self) -> None:
        STORE.conversations.clear()
        STORE.messages.clear()
        STORE.conversation_messages.clear()
        STORE.tasks.clear()
        STORE.conversation_tasks.clear()
        STORE.task_contexts.clear()
        STORE.results.clear()
        STORE.routings.clear()
        STORE.conversation_routings.clear()
        STORE.autonomous_runs.clear()
        STORE.autonomous_goals.clear()
        STORE.autonomous_tasks.clear()
        STORE.autonomous_artifacts.clear()
        STORE.autonomous_checkpoints.clear()
        STORE.autonomous_reviews.clear()
        STORE.autonomous_reworks.clear()
        STORE.autonomous_context_bundles.clear()
        STORE.autonomous_events.clear()

    def test_posting_business_message_creates_task_and_result(self) -> None:
        conversation = create_conversation(ConversationCreateRequest(user_id="user-001"))

        response = post_message(
            conversation.id,
            MessageCreateRequest(content="为什么这个广告计划激活比BI少了28%"),
        )

        self.assertIsNotNone(response)
        assert response is not None
        self.assertEqual(response.routing.intent_type, "diagnosis")
        self.assertIsNotNone(response.task)
        assert response.task is not None
        self.assertEqual(response.task.workflow_level, "heavy")
        self.assertEqual(response.assistant_reply.related_task_id, response.task.id)

        task_detail = get_task(response.task.id)
        self.assertIsNotNone(task_detail)
        assert task_detail is not None
        self.assertEqual(task_detail.task.task_type, "diagnosis")
        self.assertIsNotNone(task_detail.latest_result)

        results = get_task_results(response.task.id)
        self.assertIsNotNone(results)
        assert results is not None
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].result_type, "diagnosis_report")

    def test_posting_non_business_message_does_not_create_task(self) -> None:
        conversation = create_conversation(ConversationCreateRequest(user_id="user-001"))

        response = post_message(
            conversation.id,
            MessageCreateRequest(content="今天天气真好"),
        )

        self.assertIsNotNone(response)
        assert response is not None
        self.assertFalse(response.routing.is_business_related)
        self.assertIsNone(response.task)
        self.assertEqual(list_tasks(), [])

    def test_workspace_aggregates_recent_tasks(self) -> None:
        conversation = create_conversation(ConversationCreateRequest(user_id="user-001"))
        post_message(conversation.id, MessageCreateRequest(content="这个广告归因逻辑是什么意思"))

        workspace = get_workspace()

        self.assertEqual(workspace.status_summary["conversation_count"], 1)
        self.assertEqual(workspace.status_summary["task_count"], 1)
        self.assertEqual(len(workspace.quick_modes), 4)
        self.assertEqual(len(workspace.recent_tasks), 1)
