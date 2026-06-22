from unittest import TestCase

from ad.xiaoqiao.routing import route_message


class XiaoQiaoRoutingTests(TestCase):
    def test_non_business_message_stays_in_natural_chat(self) -> None:
        decision = route_message("今天天气真好")

        self.assertFalse(decision.is_business_related)
        self.assertEqual(decision.workflow_level, "none")
        self.assertIsNone(decision.intent_type)
        self.assertEqual(decision.decision_scope, "candidate_only")
        self.assertEqual(decision.final_route_authority, "requires_arbitration")

    def test_help_message_is_candidate_only(self) -> None:
        decision = route_message("这个广告归因指标是什么意思")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.business_domain, "ad")
        self.assertEqual(decision.intent_type, "help")
        self.assertEqual(decision.workflow_level, "none")
        self.assertEqual(decision.source, "legacy_keyword_adapter")
        self.assertEqual(decision.decision_scope, "candidate_only")
        self.assertEqual(decision.final_route_authority, "requires_arbitration")
        self.assertIn("help_signal", decision.matched_signal_groups)

    def test_diagnosis_message_is_candidate_only(self) -> None:
        decision = route_message("为什么这个广告计划激活比BI少了28%")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.intent_type, "diagnosis")
        self.assertEqual(decision.workflow_level, "none")
        self.assertEqual(decision.decision_scope, "candidate_only")

    def test_demand_message_is_candidate_only(self) -> None:
        decision = route_message("我们要接一个新的媒体回传需求")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.intent_type, "demand")
        self.assertEqual(decision.workflow_level, "none")
        self.assertEqual(decision.decision_scope, "candidate_only")

    def test_debugging_message_is_candidate_only(self) -> None:
        decision = route_message("帮我开始广告联调，先绑定白名单设备")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.intent_type, "debugging")
        self.assertEqual(decision.workflow_level, "none")
        self.assertEqual(decision.decision_scope, "candidate_only")

    def test_keyword_adapter_does_not_authorize_workflow(self) -> None:
        decision = route_message("帮我检查投放异常")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.workflow_level, "none")
        self.assertEqual(decision.final_route_authority, "requires_arbitration")
