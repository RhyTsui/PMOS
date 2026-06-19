# Capability Contract

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定位

Capability Contract 声明系统“能做什么”，并连接 Capability Source、Resolver Chain、Tool Contract、Execution Policy 与 Admin 控制面。

## 最小字段

`capabilityId`、`name`、`sourceType`、`intents`、`inputRequirements`、`tools`、`executionModes`、`permission`、`riskLevel`、`evidencePolicy`、`disclosurePolicy`、`configVersion`。

## 规则

- Capability Discovery 输出的是 Capability Contract 的候选集。
- Resolver Chain 只能选择已声明 capability 或明确 fallback。
- 业务扩展应新增或更新 Capability Contract，不应修改通用 Chat Core 硬编码分支。
