# 小乔智投下一步实施计划

生成时间：2026-05-26  
计划定位：基于本次代码全景 Review 的第四阶段实施前纠偏计划。  
主线原则：先把问数最低闭环做真，再扩展包交付、异常排查、资产、个人知识库、Case 等模块。

## 1. 当前优先级判断

第一批不应该继续扩大业务面，而应该收敛到问数闭环：

```text
用户自然语言问数
-> 意图路由
-> 项目解析与权限校验
-> 能力发现与预检
-> slot / 字典 / 受控术语
-> MCP 真实调用
-> 结果解析
-> Result Protocol / MessagePart
-> 现有 ChatContainer 渲染
-> 下一步建议 / 证据 / Trace
```

原因：

- `ad/frontend/src/src/lib/report-query-orchestrator.ts` 已有最完整的真实执行基础。
- `ad/frontend/src/src/lib/mcp-discovery.ts` 已有真实 MCP tools/list 和 tools/call。
- `ad/frontend/src/src/components/cognitive/ReportQueryResultCard.tsx` 与 `DataVizRenderer.tsx` 已能承接结果展示。
- 包交付、异常排查、个人知识库、资产、Case 仍存在更多业务定义与接口契约缺口，不适合抢在问数闭环前编码。

## 2. P0 任务

### P0-1 项目解析与权限冲突

目标：解决“顶部选择 A 项目，但用户在会话中问 B 项目，请求却使用 A 项目”的问题。

实施边界：

- 允许修改：`intent-router.ts`、`intent-route-engine.ts`、`context-compiler.ts`、`conversation-context.ts`、`report-query-orchestrator.ts`、`app/api/chat/route.ts`。
- 谨慎修改：`useConversation.ts`，只传递上下文，不重写 send message API。
- 禁止修改：Header、Sidebar、Workspace、Drawer、全局路由、全局状态、conversation store 主 schema。

验收：

- 顶部 A，用户问 B，有 B 权限，则 MCP 入参使用 B。
- 顶部 A，用户问无权限 B，则阻断，不请求 A。
- 用户说“这个项目”，且没有显式项目时，才使用顶部项目。
- 跨项目比较时逐项目校验权限。

### P0-2 能力发现与预检

目标：避免“补齐了信息但最终不能执行”。

实施边界：

- 基于 `report-capability-manifest.ts`、`report-query-policy-store.ts`、`mcp-server-store.ts`、`mcp-discovery.ts`、`report-query-orchestrator.ts`。
- 问数必须先确认报表工具、字典工具、项目解析能力是否可用。
- MCP 已披露但 Chat 未映射时，归类为 Chat 映射缺口，不归咎 MCP 缺失。

验收：

- 禁用关键 tool 后，preflight 明确 missing。
- 字典能力缺失时，不调用报表 tool。
- preflight 结果进入 response metadata，前端能展示真实状态。

### P0-3 问数 MCP 执行链路

目标：把 `智投Chat_广告业务（问数）测试集_预期精简版_v3.xlsx` 反推为自测覆盖，但不把它当成唯一验收范围。

实施边界：

- 基于 `report-query-orchestrator.ts`、`report-answer-composer.ts`、`controlled-glossary-index.ts`、`slot-resolver.ts`。
- 继续使用真实 MCP 调用，不允许用 mock 数据替代成功。

验收：

- 日报、小时、ROI、留存、素材、字典筛选至少各有一条可执行路径。
- MCP 失败不显示为成功。
- 空结果展示查询条件和放宽建议。
- 部分成功展示成功部分、失败部分与影响。

### P0-4 ResponseContract / MessagePart

目标：让前端不再从自然语言或散落字段反推业务状态。

最小协议：

```ts
type MessagePart =
  | { type: 'text'; data: { text: string } }
  | { type: 'timeline'; data: { events: AgentProcessEvent[] } }
  | { type: 'tool_call'; data: ToolCallEnvelope }
  | { type: 'table'; data: { columns: string[]; rows: Record<string, unknown>[] } }
  | { type: 'chart'; data: { viz_spec: unknown } }
  | { type: 'action_list'; data: { actions: string[] } }
  | { type: 'source_refs'; data: { refs: SourceRef[] } }
```

实施边界：

- 新协议挂在 `metadata.message_parts` 或 `metadata.response_contract`。
- 不替换现有 `Message` 主 schema。
- 不替换 conversation store。
- 不替换 send message API 入参。

验收：

- 有 `message_parts` 时优先协议渲染。
- 没有 `message_parts` 时兼容旧消息。
- `tool_call/table/chart/action/source_refs` 均来自真实执行结果。

### P0-5 前端四态与 Timeline

目标：在现有 `ChatContainer` 内完成成功、空结果、失败、部分成功四态展示。

实施边界：

- 使用现有 `ChatContainer.tsx`、`ReportQueryResultCard.tsx`、`DataVizRenderer.tsx`。
- 禁止引入 assistant-ui。
- 禁止新增独立聊天渲染框架。
- 禁止重构 Header、Sidebar、Workspace、Drawer、路由和全局状态。
- 文案从“思维链”收敛为“执行过程”。

验收：

- 成功展示表格/图表/来源/下一步建议。
- 空结果不显示为系统失败。
- 失败展示阶段、脱敏原因、下一步建议。
- Timeline 不展示伪 CoT。

### P0-6 Trace 最小记录

目标：第一批问数链路具备研发可追溯能力，但不内建评测平台。

实施边界：

- 以 `trace.ts`、`trace-config-store.ts`、`app/api/chat/route.ts` 为基础。
- 字段最终以连弩 SDK 对接文档为准。
- 小乔后台不做评测用例拆分、误判样本规则候选和闭环成功判定。

验收：

- 成功、权限阻断、MCP 失败、schema mismatch 都有 trace_id。
- Trace 失败不阻断用户回答。
- 原始错误内部可见，前端展示脱敏错误。

## 3. P1 任务

- 个人知识库 Key 用户配置：基于 `personal-knowledge-config-store.ts` 和左下角弹窗入口补齐，但不阻断 P0 问数。
- 受控术语索引同步：把知识库中的广告业务受控术语同步成轻量 `ControlledGlossaryIndex`，优先服务路由与问数。
- 包交付状态机：基于用户已确认规则单独实施，不能夹在问数 P0 内。
- 异常排查 Workflow：等待问数的 Result Protocol 和 Timeline 稳定后复用。
- Case 创建：按“用户确认后创建，同一个 case 更新”落地。

## 4. P2 任务

- 市场情报二期。
- 预测三期。
- 广告投放自动化四期。
- 资产与证据沉淀系统。用户此前明确先不做。
- 移动端细化。用户已确认先完成 PC 端设计。

## 5. 明确先不做

- 不引入 assistant-ui。
- 不替换 Header、Sidebar、Workspace、Drawer、路由和全局状态。
- 不重构现有页面布局。
- 不把 Skill/Workflow/MCP 的业务能力写死在 Chat 前端。
- 不用 mock 数据冒充 MCP 成功。
- 不内建连弩评测平台。
- 不在第一批做包交付完整状态机、资产沉淀、个人知识库 Key、正式 Case、异常排查 Workflow。

## 6. 最小发布门禁

第一批代码实施完成前必须通过：

```text
npm run ts-check
npm run validate:ad-ui
npm run test:report-query
npm run test:report-query:mapping
npm run test:role-mapping
npm run build
```

人工验收必须覆盖：

- 顶部项目与用户显式项目冲突。
- 无权限项目不调用 MCP。
- 字典缺失不调用报表 tool。
- MCP 失败不展示“已查询”。
- 空结果与失败区分正确。
- 成功结果有表格/图表/来源/下一步建议。
- 历史旧消息仍能展示。

