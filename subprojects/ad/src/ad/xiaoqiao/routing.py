from __future__ import annotations

from dataclasses import dataclass

from ad.xiaoqiao.models import WorkflowLevel
from ad.xiaoqiao.legacy_route_signals import match_legacy_route_signals


@dataclass
class RoutingDecision:
    is_business_related: bool
    business_domain: str | None
    intent_type: str | None
    workflow_level: WorkflowLevel
    clarification_needed: bool
    decision_reason: str
    source: str = "legacy_keyword_adapter"
    decision_scope: str = "candidate_only"
    deprecation_target: str = "Enterprise AI Chat OS capability discovery / planner arbitration"
    final_route_authority: str = "requires_arbitration"
    matched_signal_groups: tuple[str, ...] = ()


def route_message(content: str) -> RoutingDecision:
    text = content.strip().lower()
    if not text:
        return RoutingDecision(
            is_business_related=False,
            business_domain=None,
            intent_type=None,
            workflow_level="none",
            clarification_needed=True,
            decision_reason="Legacy adapter candidate: 输入为空，只能建议澄清，不授权业务工作流。",
        )

    matched_groups = match_legacy_route_signals(text)

    if "business_domain_signal" not in matched_groups:
        return RoutingDecision(
            is_business_related=False,
            business_domain=None,
            intent_type=None,
            workflow_level="none",
            clarification_needed=False,
            decision_reason="Legacy adapter candidate: 未发现业务候选信号，建议交由 Planner/Capability Discovery 继续判断。",
            matched_signal_groups=tuple(matched_groups),
        )

    if "debugging_signal" in matched_groups:
        return RoutingDecision(True, "ad", "debugging", "none", False, "Legacy adapter candidate: 发现联调/自动化候选信号，仅供仲裁参考。", matched_signal_groups=tuple(matched_groups))
    if "demand_signal" in matched_groups:
        return RoutingDecision(True, "ad", "demand", "none", False, "Legacy adapter candidate: 发现需求/接入候选信号，仅供仲裁参考。", matched_signal_groups=tuple(matched_groups))
    if "help_signal" in matched_groups:
        return RoutingDecision(True, "ad", "help", "none", False, "Legacy adapter candidate: 发现帮助/指标/逻辑候选信号，仅供仲裁参考。", matched_signal_groups=tuple(matched_groups))
    if "diagnosis_signal" in matched_groups:
        return RoutingDecision(True, "ad", "diagnosis", "none", False, "Legacy adapter candidate: 发现异常/原因/排查候选信号，仅供仲裁参考。", matched_signal_groups=tuple(matched_groups))

    return RoutingDecision(
        is_business_related=True,
        business_domain="ad",
        intent_type=None,
        workflow_level="none",
        clarification_needed=True,
        decision_reason="Legacy adapter candidate: 可判断为广告域候选，但诉求类型不够明确，建议 Planner 追问或继续发现能力。",
        matched_signal_groups=tuple(matched_groups),
    )
