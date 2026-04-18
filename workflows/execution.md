# Execution Rules

## Principles
- 文件真源优先于内嵌常量与临时状态
- 内核闭环优先于单点演示能力
- 显式契约优先于隐式约定
- 人类可读与机器可消费并存
- 平台能力与子项目作用域严格分离

## v0.6 release-system scope
- 本轮先完成 PMAIOS 闭环发布系统，不把 MCP/业务子项目混入顶层基线定义
- 现阶段继续采用本地 file-based persistence，逐步增强 requirement、version、trace、gate 与 observability
- LangGraph / Hermes / Dify / n8n / Meta Layer 仍只保留迁移位与接入边界

## Execution guards
- 高风险外部写入动作仍需显式审批
- Provider 密钥只能来自环境变量
- Workflow 状态必须持久化到文件或 API 可见数据
- Review gate 必须可阻塞、可返工、可恢复推进
- Telemetry 只记录本地 workflow 事件与指标，不扩展为外部追踪系统

## Gate / rework rules
- 任一阶段若存在依赖未满足，不得激活下一阶段
- Review 中任何 `Reject` 都会阻止继续推进
- `Conditional` 必须对应问题跟踪、缓解说明与返工摘要
- `needs-rework` 状态恢复后必须保留原有 trace 与 gate 历史

## Trace / telemetry scope
- 记录阶段开始、阶段完成、阶段阻塞、返工恢复、产物写入、评审记录、provider 调用事件
- 记录阶段数、完成数、阻塞数、返工数、产物数、评审问题数等指标
- 首版以本地统一 schema 为准，允许后续增加耗时、失败原因、依赖命中与 capability 维度
