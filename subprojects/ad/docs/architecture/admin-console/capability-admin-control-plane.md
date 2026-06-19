# Capability Admin Control Plane

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定位

Admin 控制面治理 Capability Source、Capability Contract、Tool Contract、Model/Prompt version、MCP server、Report Domain 配置、Route rules 与评估开关。

## 必须治理

- capability enable/disable。
- source registry 与权限。
- tool schema、business outcome mapping、retry/fallback。
- prompt/model version。
- evidence policy 与 disclosure policy。
- evaluation golden set 与 rollout。

## 禁止项

不得通过修改通用 Chat Core 的硬编码分支临时接入业务能力。配置变更必须带版本并进入 Trace。
