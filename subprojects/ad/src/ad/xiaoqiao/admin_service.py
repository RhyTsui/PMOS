from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from ad.xiaoqiao.models import (
    FeatureSwitchRecord,
    FeatureSwitchUpdateRequest,
    PromptBindingRecord,
    PromptBindingUpdateRequest,
    PromptConfigCreateRequest,
    PromptConfigRecord,
    PromptConfigUpdateRequest,
    PromptDetailResponse,
    PromptVersionRecord,
)
from ad.xiaoqiao.store import STORE


def _now() -> datetime:
    return datetime.utcnow()


def list_prompts() -> list[PromptConfigRecord]:
    return sorted(STORE.prompts.values(), key=lambda item: item.updated_at, reverse=True)


def get_prompt(prompt_id: str) -> PromptDetailResponse | None:
    prompt = STORE.prompts.get(prompt_id)
    if prompt is None:
        return None
    versions = STORE.prompt_versions.get(prompt_id, [])
    latest_version = versions[-1] if versions else None
    binding = STORE.prompt_bindings.get(prompt_id)
    return PromptDetailResponse(prompt=prompt, latest_version=latest_version, binding=binding)


def create_prompt(payload: PromptConfigCreateRequest) -> PromptDetailResponse:
    now = _now()
    prompt_id = f"prompt_{uuid4().hex[:12]}"
    prompt = PromptConfigRecord(
        id=prompt_id,
        name=payload.name,
        category=payload.category,
        business_flow=payload.business_flow,
        agent_scope=payload.agent_scope,
        model_scope=payload.model_scope,
        status="draft",
        current_version="v1",
        updated_at=now,
    )
    version = PromptVersionRecord(
        id=f"pver_{uuid4().hex[:12]}",
        prompt_id=prompt_id,
        version="v1",
        content=payload.content,
        variables=payload.variables,
        created_at=now,
    )
    binding = PromptBindingRecord(
        prompt_id=prompt_id,
        business_flow=payload.business_flow,
        agent_scope=payload.agent_scope,
        model_scope=payload.model_scope,
        enabled=False,
        updated_at=now,
    )
    STORE.prompts[prompt_id] = prompt
    STORE.prompt_versions[prompt_id] = [version]
    STORE.prompt_bindings[prompt_id] = binding
    return PromptDetailResponse(prompt=prompt, latest_version=version, binding=binding)


def update_prompt(prompt_id: str, payload: PromptConfigUpdateRequest) -> PromptDetailResponse | None:
    prompt = STORE.prompts.get(prompt_id)
    if prompt is None:
        return None

    update_data = payload.model_dump(exclude_none=True)
    content = update_data.pop("content", None)
    variables = update_data.pop("variables", None)

    prompt = prompt.model_copy(update=update_data | {"updated_at": _now()})
    STORE.prompts[prompt_id] = prompt

    versions = STORE.prompt_versions.get(prompt_id, [])
    latest_version = versions[-1] if versions else None
    if content is not None or variables is not None:
        latest_version = PromptVersionRecord(
            id=f"pver_{uuid4().hex[:12]}",
            prompt_id=prompt_id,
            version=f"v{len(versions) + 1}",
            content=content if content is not None else (latest_version.content if latest_version else ""),
            variables=variables if variables is not None else (latest_version.variables if latest_version else []),
            created_at=_now(),
        )
        STORE.prompt_versions.setdefault(prompt_id, []).append(latest_version)
        prompt = prompt.model_copy(update={"current_version": latest_version.version, "updated_at": _now()})
        STORE.prompts[prompt_id] = prompt

    return PromptDetailResponse(
        prompt=prompt,
        latest_version=latest_version,
        binding=STORE.prompt_bindings.get(prompt_id),
    )


def list_prompt_versions(prompt_id: str) -> list[PromptVersionRecord] | None:
    if prompt_id not in STORE.prompts:
        return None
    return STORE.prompt_versions.get(prompt_id, [])


def update_prompt_binding(prompt_id: str, payload: PromptBindingUpdateRequest) -> PromptBindingRecord | None:
    if prompt_id not in STORE.prompts:
        return None
    binding = PromptBindingRecord(
        prompt_id=prompt_id,
        business_flow=payload.business_flow,
        agent_scope=payload.agent_scope,
        model_scope=payload.model_scope,
        enabled=payload.enabled,
        updated_at=_now(),
    )
    STORE.prompt_bindings[prompt_id] = binding
    STORE.prompts[prompt_id] = STORE.prompts[prompt_id].model_copy(
        update={
            "business_flow": payload.business_flow,
            "agent_scope": payload.agent_scope,
            "model_scope": payload.model_scope,
            "updated_at": _now(),
        }
    )
    return binding


def list_feature_switches() -> list[FeatureSwitchRecord]:
    return sorted(STORE.feature_switches.values(), key=lambda item: item.key)


def update_feature_switch(switch_key: str, payload: FeatureSwitchUpdateRequest) -> FeatureSwitchRecord | None:
    switch = STORE.feature_switches.get(switch_key)
    if switch is None:
        return None
    switch = switch.model_copy(update={"enabled": payload.enabled, "updated_at": _now()})
    STORE.feature_switches[switch_key] = switch
    return switch
