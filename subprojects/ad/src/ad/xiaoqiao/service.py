from __future__ import annotations

import re
from datetime import datetime
from uuid import uuid4

from ad.xiaoqiao.models import (
    AttachmentInput,
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationSummary,
    FeatureSwitchRecord,
    MessageCreateRequest,
    MessageEntryResponse,
    MessageRecord,
    PromptBindingRecord,
    PromptConfigRecord,
    PromptVersionRecord,
    RoutingDecisionRecord,
    TaskContextRecord,
    TaskContextUpdateRequest,
    TaskDetailResponse,
    TaskRecord,
    WorkspaceResponse,
    WorkflowResultRecord,
)
from ad.xiaoqiao.routing import route_message
from ad.xiaoqiao.store import STORE


def _now() -> datetime:
    return datetime.now()


def _seed_prompt_admin() -> None:
    if STORE.prompts:
        return

    now = _now()
    prompt_items = [
        (
            "prompt_help_v1",
            "帮助解释模板",
            "help",
            "xiaoqiao-help",
            "xiaoqiao",
            "gpt-5",
            "published",
            "v1.0",
            "请按广告业务帮助问题输出解释、路径、来源与下一步建议。",
            ["subject", "system_name", "metric_name"],
        ),
        (
            "prompt_demand_v1",
            "需求收口模板",
            "demand",
            "xiaoqiao-demand",
            "xiaoqiao",
            "gpt-5",
            "published",
            "v1.0",
            "请把模糊广告需求收成结构化需求单，并输出缺失字段与依赖项。",
            ["media", "app_name", "target_object"],
        ),
        (
            "prompt_diag_v1",
            "排查结果模板",
            "diagnosis",
            "xiaoqiao-diagnosis",
            "xiaoqiao",
            "gpt-5",
            "draft",
            "v0.9",
            "请输出一句话结论、证据链、置信度与下一步动作。",
            ["issue_type", "time_range", "evidence_refs"],
        ),
    ]

    for (
        prompt_id,
        name,
        category,
        business_flow,
        agent_scope,
        model_scope,
        status,
        version,
        content,
        variables,
    ) in prompt_items:
        STORE.prompts[prompt_id] = PromptConfigRecord(
            id=prompt_id,
            name=name,
            category=category,
            business_flow=business_flow,
            agent_scope=agent_scope,
            model_scope=model_scope,
            status=status,  # type: ignore[arg-type]
            current_version=version,
            updated_at=now,
        )
        STORE.prompt_versions[prompt_id] = [
            PromptVersionRecord(
                id=f"{prompt_id}_{version}",
                prompt_id=prompt_id,
                version=version,
                content=content,
                variables=variables,
                created_at=now,
            )
        ]
        STORE.prompt_bindings[prompt_id] = PromptBindingRecord(
            prompt_id=prompt_id,
            business_flow=business_flow,
            agent_scope=agent_scope,
            model_scope=model_scope,
            enabled=status == "published",
            updated_at=now,
        )

    STORE.feature_switches["prompt-management"] = FeatureSwitchRecord(
        key="prompt-management",
        label="提示词管理",
        enabled=True,
        updated_at=now,
    )
    STORE.feature_switches["debug-automation"] = FeatureSwitchRecord(
        key="debug-automation",
        label="自动联调专项",
        enabled=False,
        updated_at=now,
    )


def _conversation_title_from_message(content: str) -> str:
    clean = content.strip()
    return clean[:24] if clean else "新建对话"


def _reply_for_non_business(content: str) -> str:
    return f"这条输入当前不进入广告业务工作流，我先按普通对话方式接住：{content}"


def _guess_media(content: str) -> str | None:
    media_keywords = {
        "巨量引擎": ["巨量", "穿山甲", "抖音", "头条"],
        "腾讯广告": ["腾讯", "广点通", "微信"],
        "快手广告": ["快手"],
        "百度广告": ["百度"],
    }
    for media, keywords in media_keywords.items():
        if any(keyword in content for keyword in keywords):
            return media
    return None


def _guess_app(content: str) -> str | None:
    match = re.search(r"(APP|应用|产品)[:：]?\s*([A-Za-z0-9_\-\u4e00-\u9fa5]+)", content)
    if match:
        return match.group(2)
    return None


def _guess_time_range(content: str) -> str | None:
    if any(keyword in content for keyword in ["今天", "今日"]):
        return "今天"
    if any(keyword in content for keyword in ["昨天", "昨日"]):
        return "昨天"
    if "近7天" in content:
        return "近7天"
    if "近30天" in content:
        return "近30天"
    return None


def _help_result(content: str) -> tuple[str, str, dict[str, object]]:
    summary = "这条输入已进入广告使用帮助工作流。"
    reply = "我先按使用帮助处理，给你明确指标口径、系统路径和自查动作；如果你实际是在排查异常或推进需求，我会继续切到对应任务流。"
    payload = {
        "question": content,
        "answer": "先给出指标解释、适用场景和系统入口，帮助你判断下一步应该继续查看定义、发起排查，还是转成正式需求。",
        "system_path": "广告工作台 / 账户与投放设置 / 诊断与联调入口",
        "metric_definition": "优先确认指标定义、归因口径和更新时间，再判断是不是系统异常。",
        "applicable_scenarios": [
            "查看指标含义和计算口径",
            "确认功能入口和操作路径",
            "判断问题该走帮助、排查还是联调",
        ],
        "self_check_steps": [
            "先确认媒体、应用和时间范围",
            "核对当前看的是否是同一套归因口径",
            "确认是否存在延迟刷新或审核中的状态",
        ],
        "reference_sources": [
            {"label": "设计文档", "path": "docs/小乔智投-设计文档-2026-05-08.md"},
            {"label": "功能开发说明", "path": "docs/小乔智投-功能开发说明文档-2026-05-08.md"},
        ],
        "confidence": "medium",
        "follow_up_questions": [
            "你现在要看的，是指标定义、投放路径，还是异常排查？",
            "能否补充具体媒体、应用或时间范围？",
        ],
    }
    return summary, reply, payload


def _diagnosis_result(content: str) -> tuple[str, str, dict[str, object]]:
    summary = "这条输入已进入广告异常排查工作流。"
    reply = "我先按排查任务接住，后续会围绕结论、证据链、风险等级和下一步动作继续推进。"
    payload = {
        "question": content,
        "summary": "当前先按异常排查主线收口，待补齐媒体、应用和时间范围后可以继续细化。",
        "diagnosis": "疑似投放链路配置缺失、归因延迟，或素材审核状态导致结果异常。",
        "issue_level": "P1",
        "metric_snapshot": [
            {"label": "激活量波动", "value": "-28%", "trend": "down"},
            {"label": "归因回传延迟", "value": "2-4 小时", "trend": "warning"},
            {"label": "素材审核状态", "value": "部分待审", "trend": "warning"},
        ],
        "evidence_chain": [
            "已识别为广告异常排查类输入，需要进入诊断工作流。",
            "当前缺少明确媒体、应用和时间范围，只能给出中等置信度初判。",
            "如果补充截图、计划和账户信息，可以继续细化证据链。",
        ],
        "confidence": "medium",
        "likely_root_causes": [
            "归因配置未与媒体当前计划保持一致",
            "新素材或新计划仍在审核或冷启动阶段",
            "数据回传链路存在延迟或回补",
        ],
        "pending_checks": [
            "确认媒体平台、账户和计划范围",
            "确认异常出现的时间窗口",
            "核对是否有截图、报错文案或核心指标波动",
        ],
        "next_actions": [
            "补充媒体、应用、计划和时间范围",
            "补充截图、报错文案或关键指标变化",
            "确认是否需要升级为联调任务",
        ],
        "context_snapshot": {
            "media": _guess_media(content),
            "app": _guess_app(content),
            "time_range": _guess_time_range(content),
        },
    }
    return summary, reply, payload


def _demand_result(content: str) -> tuple[str, str, dict[str, object]]:
    summary = "这条输入已进入需求沟通工作流。"
    reply = "我会先把它收成结构化需求，缺字段的地方继续追问。"
    payload = {
        "question": content,
        "requirement_summary": "当前按广告需求收口处理，目标是拆清业务目标、范围、依赖、风险和交付边界。",
        "requirement_name": "广告投放协同需求收口",
        "objective": "把模糊诉求收口成可执行的需求单，明确交付节奏和协同边界。",
        "success_metrics": [
            "需求范围明确，可直接进入开发拆解",
            "依赖方、时间点和验收口径清晰",
            "缺失信息被追问并显式记录",
        ],
        "field_groups": [
            "业务目标与成功标准",
            "媒体 / 应用 / 计划范围",
            "期望时间与交付节奏",
            "上下游依赖与协同角色",
        ],
        "missing_fields": [
            "具体媒体 / 应用 / 计划范围",
            "目标上线时间",
            "依赖系统或外部协同方",
        ],
        "dependencies": [
            "可能依赖投放、数据、研发或联调支持",
            "如果涉及埋点与归因，需要同步数据口径",
        ],
        "scope": [
            "本轮先收口主工作台和结构化结果区",
            "不在本轮接入真实生产数据库",
        ],
        "next_actions": [
            "补齐媒体、应用和目标日期",
            "说明预期结果和验收标准",
            "确认是否需要拆成正式任务推进",
        ],
    }
    return summary, reply, payload


def _debugging_result(content: str) -> tuple[str, str, dict[str, object]]:
    summary = "这条输入已进入广告联调工作流。"
    reply = "我会把它按联调任务推进，重点看账户、设备、自动化状态和联调结论。"
    payload = {
        "question": content,
        "stage": "待补齐联调上下文",
        "progress_summary": "当前已建立联调任务，但还缺账户、设备、入口方式和失败节点。",
        "execution_log": [
            "已接入联调工作流",
            "等待补充账户、设备、入口方式和失败节点",
        ],
        "acceptance_verdict": "当前信息不足，暂不能判断联调通过或失败。",
        "blocking_items": [
            "未提供具体设备和系统版本",
            "未说明是投放入口、回调入口还是归因校验入口",
        ],
        "fallback_actions": [
            "先确认入口方式和环境信息",
            "补充失败节点截图或日志",
            "必要时回退到诊断工作流做问题归因",
        ],
        "required_checkpoints": [
            "账户是否正确",
            "设备与环境是否一致",
            "入口方式是否明确",
            "失败节点是否可复现",
        ],
        "screenshots": [],
    }
    return summary, reply, payload


def create_conversation(payload: ConversationCreateRequest) -> ConversationSummary:
    now = _now()
    conversation = ConversationSummary(
        id=f"conv_{uuid4().hex[:12]}",
        user_id=payload.user_id,
        title=payload.title or "新建对话",
        status="active",
        current_mode="natural-chat",
        started_at=now,
        updated_at=now,
        last_message_at=None,
    )
    STORE.conversations[conversation.id] = conversation
    STORE.conversation_messages[conversation.id] = []
    STORE.conversation_tasks[conversation.id] = []
    STORE.conversation_routings[conversation.id] = []
    return conversation


def _seed_demo_workspace() -> None:
    if STORE.conversations or STORE.tasks:
        return

    conversation = create_conversation(ConversationCreateRequest(user_id="demo-user", title="投放异常快查"))
    post_message(
        conversation.id,
        MessageCreateRequest(content="为什么这个广告计划的激活量比 BI 少了 28%，先帮我排查一下"),
    )
    post_message(
        conversation.id,
        MessageCreateRequest(content="我们还要补一个新的媒体回传需求，先收口范围和依赖"),
    )


def list_conversations() -> list[ConversationSummary]:
    return sorted(STORE.conversations.values(), key=lambda item: item.updated_at, reverse=True)


def get_conversation(conversation_id: str) -> ConversationDetailResponse | None:
    conversation = STORE.conversations.get(conversation_id)
    if conversation is None:
        return None

    recent_task = None
    task_ids = STORE.conversation_tasks.get(conversation_id, [])
    if task_ids:
        recent_task = STORE.tasks.get(task_ids[-1])

    last_routing = None
    routing_ids = STORE.conversation_routings.get(conversation_id, [])
    if routing_ids:
        last_routing = STORE.routings.get(routing_ids[-1])

    messages = [
        STORE.messages[message_id]
        for message_id in STORE.conversation_messages.get(conversation_id, [])
        if message_id in STORE.messages
    ]

    return ConversationDetailResponse(
        conversation=conversation,
        recent_task=recent_task,
        last_routing=last_routing,
        messages=messages,
    )


def _create_task(
    conversation_id: str, source_message_id: str, intent_type: str, workflow_level: str
) -> TaskRecord:
    now = _now()
    task = TaskRecord(
        id=f"task_{uuid4().hex[:12]}",
        conversation_id=conversation_id,
        task_type=intent_type,  # type: ignore[arg-type]
        workflow_level=workflow_level,  # type: ignore[arg-type]
        status="clarifying" if workflow_level == "light" else "running",
        source_message_id=source_message_id,
        created_at=now,
        updated_at=now,
    )
    STORE.tasks[task.id] = task
    STORE.conversation_tasks[conversation_id].append(task.id)
    return task


def _create_task_context(
    task: TaskRecord, attachments: list[AttachmentInput], clarification_needed: bool
) -> TaskContextRecord:
    now = _now()
    context = TaskContextRecord(
        task_id=task.id,
        is_business_related=True,
        business_domain="ad",
        intent_type=task.task_type,
        attachments_json=[attachment.model_dump() for attachment in attachments],
        missing_fields_json=["具体媒体 / 应用 / 计划上下文"] if clarification_needed else [],
        created_at=now,
        updated_at=now,
    )
    STORE.task_contexts[task.id] = context
    return context


def _create_result(task: TaskRecord, content: str) -> WorkflowResultRecord:
    if task.task_type == "help":
        summary, _reply, payload = _help_result(content)
        result_type = "help_answer"
        confidence = "medium"
        next_action = "如果你实际要排查异常，可以继续补充媒体、应用、计划或时间范围。"
    elif task.task_type == "diagnosis":
        summary, _reply, payload = _diagnosis_result(content)
        result_type = "diagnosis_report"
        confidence = "medium"
        next_action = "继续补充计划、媒体、时间范围或截图，我再把证据链细化。"
    elif task.task_type == "demand":
        summary, _reply, payload = _demand_result(content)
        result_type = "demand_form"
        confidence = "medium"
        next_action = "继续补充媒体、应用、目标日期和依赖系统。"
    else:
        summary, _reply, payload = _debugging_result(content)
        result_type = "debugging_report"
        confidence = "medium"
        next_action = "继续补充设备、账户、入口方式和当前失败节点。"

    result = WorkflowResultRecord(
        id=f"result_{uuid4().hex[:12]}",
        task_id=task.id,
        result_type=result_type,
        summary=summary,
        structured_payload_json=payload,
        confidence=confidence,
        next_action=next_action,
        created_at=_now(),
    )
    STORE.results.setdefault(task.id, []).append(result)
    return result


def _assistant_reply(
    conversation_id: str,
    task: TaskRecord | None,
    content: str,
    clarification_needed: bool,
    is_business_related: bool,
) -> MessageRecord:
    if not is_business_related:
        reply = _reply_for_non_business(content)
        message_type = "assistant_reply"
    elif task is None:
        reply = "我先按广告域问题接住了，但还缺关键信息。你可以补充媒体、应用、计划或想解决的具体问题。"
        message_type = "clarification"
    elif task.task_type == "help":
        reply = "这条我先按广告使用帮助处理。如果你需要，我可以继续展开指标定义、系统路径，或把它升级成具体排查任务。"
        message_type = "assistant_reply"
    elif task.task_type == "diagnosis":
        reply = "这条我先按广告异常排查接住。下一步建议你补充媒体、应用、计划和时间范围，我会继续给出结论和证据链。"
        message_type = "workflow_summary"
    elif task.task_type == "demand":
        reply = "这条我先按需求沟通任务接住。你继续补充媒体、应用、目标日期和对接范围，我会往结构化需求单收口。"
        message_type = "workflow_summary"
    else:
        reply = "这条我先按广告联调任务接住。你继续补充设备、账户、入口方式和当前卡点，我会往联调流程推进。"
        message_type = "workflow_summary"

    if clarification_needed and is_business_related:
        reply = f"{reply} 当前判断还不够完整，我会先追问再正式分发。"

    assistant = MessageRecord(
        id=f"msg_{uuid4().hex[:12]}",
        conversation_id=conversation_id,
        role="assistant",
        message_type=message_type,
        content=reply,
        related_task_id=task.id if task else None,
        created_at=_now(),
    )
    STORE.messages[assistant.id] = assistant
    STORE.conversation_messages[conversation_id].append(assistant.id)
    return assistant


def post_message(conversation_id: str, payload: MessageCreateRequest) -> MessageEntryResponse | None:
    conversation = STORE.conversations.get(conversation_id)
    if conversation is None:
        return None

    now = _now()
    if conversation.title == "新建对话":
        conversation.title = _conversation_title_from_message(payload.content)

    message = MessageRecord(
        id=f"msg_{uuid4().hex[:12]}",
        conversation_id=conversation_id,
        role="user",
        message_type="user_input",
        content=payload.content,
        created_at=now,
    )
    STORE.messages[message.id] = message
    STORE.conversation_messages[conversation_id].append(message.id)

    route = route_message(payload.content)
    routing = RoutingDecisionRecord(
        id=f"route_{uuid4().hex[:12]}",
        conversation_id=conversation_id,
        source_message_id=message.id,
        is_business_related=route.is_business_related,
        business_domain=route.business_domain,
        intent_type=route.intent_type,
        workflow_level=route.workflow_level,
        clarification_needed=route.clarification_needed,
        decision_reason=route.decision_reason,
        created_at=_now(),
    )
    STORE.routings[routing.id] = routing
    STORE.conversation_routings[conversation_id].append(routing.id)

    task = None
    if routing.is_business_related and routing.intent_type and routing.workflow_level in ("light", "heavy"):
        task = _create_task(conversation_id, message.id, routing.intent_type, routing.workflow_level)
        _create_task_context(task, payload.attachments, routing.clarification_needed)
        _create_result(task, payload.content)
        conversation.current_mode = "light-workflow" if routing.workflow_level == "light" else "heavy-workflow"

    assistant_reply = _assistant_reply(
        conversation_id=conversation_id,
        task=task,
        content=payload.content,
        clarification_needed=routing.clarification_needed,
        is_business_related=routing.is_business_related,
    )

    conversation.updated_at = _now()
    conversation.last_message_at = assistant_reply.created_at
    STORE.conversations[conversation.id] = conversation
    return MessageEntryResponse(message=message, routing=routing, task=task, assistant_reply=assistant_reply)


def list_tasks() -> list[TaskRecord]:
    return sorted(STORE.tasks.values(), key=lambda item: item.updated_at, reverse=True)


def get_task(task_id: str) -> TaskDetailResponse | None:
    task = STORE.tasks.get(task_id)
    if task is None:
        return None
    context = STORE.task_contexts.get(task_id)
    latest_result = None
    if STORE.results.get(task_id):
        latest_result = STORE.results[task_id][-1]
    return TaskDetailResponse(task=task, context=context, latest_result=latest_result)


def update_task_context(task_id: str, payload: TaskContextUpdateRequest) -> TaskDetailResponse | None:
    task = STORE.tasks.get(task_id)
    if task is None:
        return None

    context = STORE.task_contexts.get(task_id)
    now = _now()
    if context is None:
        context = TaskContextRecord(
            task_id=task_id,
            is_business_related=True,
            business_domain="ad",
            intent_type=task.task_type,
            created_at=now,
            updated_at=now,
        )

    for field_name in ("media", "app", "plan_id", "device_id", "time_range"):
        value = getattr(payload, field_name)
        if value is not None:
            setattr(context, field_name, value.strip() or None)

    missing_fields: list[str] = []
    if not context.media:
        missing_fields.append("媒体")
    if not context.app:
        missing_fields.append("应用")
    if task.task_type in ("diagnosis", "debugging", "demand") and not context.time_range:
        missing_fields.append("时间范围")
    if task.task_type == "debugging" and not context.device_id:
        missing_fields.append("设备")

    context.missing_fields_json = missing_fields
    context.updated_at = now
    STORE.task_contexts[task_id] = context
    task.updated_at = now
    STORE.tasks[task_id] = task
    return get_task(task_id)


def get_task_results(task_id: str) -> list[WorkflowResultRecord] | None:
    if task_id not in STORE.tasks:
        return None
    return STORE.results.get(task_id, [])


def get_workspace() -> WorkspaceResponse:
    recent_tasks = list_tasks()[:6]
    return WorkspaceResponse(
        status_summary={
            "conversation_count": len(STORE.conversations),
            "task_count": len(STORE.tasks),
            "active_mode": "xiaoqiao-unified-chat",
        },
        quick_modes=[
            {"id": "help", "label": "使用帮助"},
            {"id": "diagnosis", "label": "问题排查"},
            {"id": "demand", "label": "需求沟通"},
            {"id": "debugging", "label": "广告联调"},
        ],
        recent_tasks=recent_tasks,
        support_summary={
            "knowledge": "Dataki",
            "evaluation": "连续测试平台",
            "ops_agent": "已预留运行 Agent 适配位",
        },
    )


_seed_prompt_admin()
_seed_demo_workspace()
