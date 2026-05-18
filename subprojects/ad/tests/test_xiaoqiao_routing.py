from unittest import TestCase

from ad.xiaoqiao.routing import route_message


class XiaoQiaoRoutingTests(TestCase):
    def test_non_business_message_stays_in_natural_chat(self) -> None:
        decision = route_message("今天天气真好")

        self.assertFalse(decision.is_business_related)
        self.assertEqual(decision.workflow_level, "none")
        self.assertIsNone(decision.intent_type)

    def test_help_message_enters_light_workflow(self) -> None:
        decision = route_message("这个广告归因指标是什么意思")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.business_domain, "ad")
        self.assertEqual(decision.intent_type, "help")
        self.assertEqual(decision.workflow_level, "light")

    def test_diagnosis_message_enters_heavy_workflow(self) -> None:
        decision = route_message("为什么这个广告计划激活比BI少了28%")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.intent_type, "diagnosis")
        self.assertEqual(decision.workflow_level, "heavy")

    def test_demand_message_enters_heavy_workflow(self) -> None:
        decision = route_message("我们要接一个新的媒体回传需求")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.intent_type, "demand")
        self.assertEqual(decision.workflow_level, "heavy")

    def test_debugging_message_enters_heavy_workflow(self) -> None:
        decision = route_message("帮我开始广告联调，先绑定白名单设备")

        self.assertTrue(decision.is_business_related)
        self.assertEqual(decision.intent_type, "debugging")
        self.assertEqual(decision.workflow_level, "heavy")

