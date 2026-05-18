from __future__ import annotations

from dataclasses import dataclass

from ad.xiaoqiao.models import WorkflowLevel


BUSINESS_KEYWORDS = (
    "广告",
    "归因",
    "投放",
    "联调",
    "回传",
    "回推",
    "数据",
    "素材",
    "roi",
    "ltv",
    "媒体",
    "计划",
    "监控",
    "bi",
    "激活",
)

HELP_KEYWORDS = ("什么意思", "怎么", "哪里看", "在哪看", "逻辑", "指标", "口径", "帮助", "说明")
DIAGNOSIS_KEYWORDS = ("为什么", "异常", "少了", "不对", "对不上", "gap", "排查", "归因")
DEMAND_KEYWORDS = ("需求", "接入", "对接", "配置", "提单", "新增", "支持")
DEBUGGING_KEYWORDS = ("联调", "白名单", "设备", "浏览器", "自动化", "回放")


@dataclass
class RoutingDecision:
    is_business_related: bool
    business_domain: str | None
    intent_type: str | None
    workflow_level: WorkflowLevel
    clarification_needed: bool
    decision_reason: str


def route_message(content: str) -> RoutingDecision:
    text = content.strip().lower()
    if not text:
        return RoutingDecision(
            is_business_related=False,
            business_domain=None,
            intent_type=None,
            workflow_level="none",
            clarification_needed=True,
            decision_reason="输入为空，先追问用户要处理什么问题。",
        )

    if not any(keyword in text for keyword in BUSINESS_KEYWORDS):
        return RoutingDecision(
            is_business_related=False,
            business_domain=None,
            intent_type=None,
            workflow_level="none",
            clarification_needed=False,
            decision_reason="未命中广告业务关键词，按普通自然问答处理。",
        )

    if any(keyword in text for keyword in DEBUGGING_KEYWORDS):
        return RoutingDecision(True, "ad", "debugging", "heavy", False, "命中联调/自动化关键词，进入广告联调重工作流。")
    if any(keyword in text for keyword in DEMAND_KEYWORDS):
        return RoutingDecision(True, "ad", "demand", "heavy", False, "命中需求/接入关键词，进入需求沟通重工作流。")
    if any(keyword in text for keyword in DIAGNOSIS_KEYWORDS):
        return RoutingDecision(True, "ad", "diagnosis", "heavy", False, "命中异常/原因/排查关键词，进入问题排查重工作流。")
    if any(keyword in text for keyword in HELP_KEYWORDS):
        return RoutingDecision(True, "ad", "help", "light", False, "命中帮助/指标/逻辑关键词，进入使用帮助轻工作流。")

    return RoutingDecision(
        is_business_related=True,
        business_domain="ad",
        intent_type="help",
        workflow_level="light",
        clarification_needed=True,
        decision_reason="可判断为广告域，但诉求类型不够明确，先按轻工作流追问。",
    )

