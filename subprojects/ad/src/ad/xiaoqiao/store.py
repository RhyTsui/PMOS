from __future__ import annotations

from dataclasses import dataclass, field

from ad.xiaoqiao.models import (
    ArtifactLinkRecord,
    AutonomousRunCheckpointRecord,
    AutonomousRunRecord,
    AutonomousTaskRecord,
    ConversationSummary,
    ContextInjectionBundleRecord,
    FeatureSwitchRecord,
    GoalNodeRecord,
    MessageRecord,
    PromptBindingRecord,
    PromptConfigRecord,
    PromptVersionRecord,
    ReviewScorecardRecord,
    ReworkRecord,
    RoutingDecisionRecord,
    TaskContextRecord,
    TaskRecord,
    WorkflowResultRecord,
)


@dataclass
class XiaoQiaoStore:
    conversations: dict[str, ConversationSummary] = field(default_factory=dict)
    messages: dict[str, MessageRecord] = field(default_factory=dict)
    conversation_messages: dict[str, list[str]] = field(default_factory=dict)
    tasks: dict[str, TaskRecord] = field(default_factory=dict)
    conversation_tasks: dict[str, list[str]] = field(default_factory=dict)
    task_contexts: dict[str, TaskContextRecord] = field(default_factory=dict)
    results: dict[str, list[WorkflowResultRecord]] = field(default_factory=dict)
    routings: dict[str, RoutingDecisionRecord] = field(default_factory=dict)
    conversation_routings: dict[str, list[str]] = field(default_factory=dict)
    prompts: dict[str, PromptConfigRecord] = field(default_factory=dict)
    prompt_versions: dict[str, list[PromptVersionRecord]] = field(default_factory=dict)
    prompt_bindings: dict[str, PromptBindingRecord] = field(default_factory=dict)
    feature_switches: dict[str, FeatureSwitchRecord] = field(default_factory=dict)
    autonomous_runs: dict[str, AutonomousRunRecord] = field(default_factory=dict)
    autonomous_goals: dict[str, list[GoalNodeRecord]] = field(default_factory=dict)
    autonomous_tasks: dict[str, list[AutonomousTaskRecord]] = field(default_factory=dict)
    autonomous_artifacts: dict[str, list[ArtifactLinkRecord]] = field(default_factory=dict)
    autonomous_checkpoints: dict[str, list[AutonomousRunCheckpointRecord]] = field(default_factory=dict)
    autonomous_reviews: dict[str, list[ReviewScorecardRecord]] = field(default_factory=dict)
    autonomous_reworks: dict[str, list[ReworkRecord]] = field(default_factory=dict)
    autonomous_context_bundles: dict[str, dict[str, ContextInjectionBundleRecord]] = field(default_factory=dict)
    autonomous_events: dict[str, list[str]] = field(default_factory=dict)


STORE = XiaoQiaoStore()
