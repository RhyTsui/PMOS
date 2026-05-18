# 智投 Chat Agent 运行时协议 MVP

## 目标

智投 Chat 后续不再把思维链、Skill、MCP、知识库、来源、动态组件拆成多个临时字段各自维护。

统一采用 `AgentProcessEvent` 作为前后端、后台管理和连弩评测的过程事件真源：

- 前端负责渲染事件，不再承担业务路由判断。
- 后端负责产出事件、来源、组件和结果。
- 评测系统按事件链验证意图、追问、工具调用、来源和交付闭环。

## 事件模型

当前已落地类型：`imported/projects/src/types/index.ts`

核心事件：

- `intent.detected`：识别用户服务意图。
- `context.prepared`：准备项目、用户、时间、指标等上下文。
- `clarify.requested` / `clarify.submitted`：结构化追问和用户提交。
- `skill.selected` / `skill.started` / `skill.step` / `skill.finished`：Skill 运行过程。
- `mcp.tool_call` / `mcp.tool_result` / `mcp.tool_error`：MCP 调用过程。
- `knowledge.search` / `knowledge.result` / `knowledge.rejected`：知识库检索和相关性处理。
- `web.search` / `web.result`：联网查询过程。
- `source.attached`：来源披露。
- `ui.component_rendered`：动态组件渲染。
- `answer.delta` / `answer.final`：回答流式输出和最终结果。

## 兼容策略

当前版本采用“新协议并行旧字段”的方式落地：

- `/api/chat` 继续输出旧 SSE：`route`、`thinking_step`、`tool_call`、`tool_result`、`done`。
- 同时输出新 SSE：`process_event`。
- `done.metadata.process_events` 会携带完整事件链，保证刷新后可恢复。
- 前端 `useConversation` 会保存 `process_events`，并兼容转换为旧 `thinking_steps`、`tool_calls`。
- `ChatContainer` 会优先使用已有 `thinking_steps`，没有时从 `process_events` 恢复思维链和能力区。

## P0 Skill 合同

P0 Skill 必须按 `SkillContract` 补齐：

- `metric_explainer_skill`：指标解释器。
- `spend_diagnosis_skill`：媒体消耗排查。
- `postback_discrepancy_skill`：激活、注册、付费差异排查。
- `report_composer_skill`：报表模板确认、查数、定时任务。
- `monitor_alert_skill`：监控任务创建和告警触发。
- `oceanengine_debug_skill`：巨量联调。

每个 Skill 必须明确：

- 输入字段。
- 缺失字段和一次性确认表单。
- 工作步骤。
- MCP / Tool 绑定。
- 输出组件。
- 来源披露。
- 评测用例。
- 不可交付时的第一句话。

## 评测规则

连弩评测不只看最终文本，需要校验：

- 是否正确识别意图。
- 是否在条件不足时生成结构化追问。
- 是否调用正确 Skill / MCP。
- 是否丢弃低相关知识库片段。
- 是否披露来源。
- 是否使用动态组件完成确认和交付。
- 是否把结果事件写入 `process_events`。

当前 `evaluation-adapter` 已开始返回新版 `AgentProcessEvent`，后续应把 P0 case 全部升级到该协议。

## 下一步

1. 把前端局部关键词拦截逐步迁移到后端 Agent runtime。
2. 为 P0 Skill 建立真实合同文件和后台管理编辑入口。
3. 删除会冒充真实能力的 mock MCP 结果，缺能力时显式返回缺失项。
4. 用浏览器和连弩接口分别验证刷新恢复、来源点击、表单确认、流式步骤。
