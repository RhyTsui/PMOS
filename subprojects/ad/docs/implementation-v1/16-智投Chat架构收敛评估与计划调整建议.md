# 智投 Chat 架构收敛评估与计划调整建议

## 1. 文档定位

本文评估 inbox 新增调研文档《智投 Chat 架构收敛.md》，并结合当前实现和 `implementation-v1` 已有计划判断是否需要追加或调整。

本文不是新的架构重构方案，也不是要求引入新的 Agent 框架或聊天 UI 框架。

本文目标：

- 明确调研结论中哪些应采纳、哪些已覆盖、哪些不采纳。
- 把“Fat MCP / Fat Skill + Thin Chat Runtime”写成当前实施阶段的边界原则。
- 补齐当前计划中不够明确的 `Result Protocol / MessagePart Protocol`。
- 防止后续继续把前端展示、工具调用、思维链、业务状态混在一起做成假闭环。

关联文档：

- `13-DeerFlow框架对照与小乔智投取舍评估.md`
- `14-AgentRuntimeContract与总控运行链路实施方案.md`
- `15-第一批代码实施任务拆解与验收门禁.md`

## 2. 总体评估结论

新增调研文档方向正确，应采纳为当前实施阶段的架构收敛原则。

核心判断：

```text
Fat MCP / Fat Skill
  +
Thin Chat Runtime
  +
Result Protocol
  +
Timeline / Stepper / Card Renderer
```

当前小乔不缺一个复杂 Multi-Agent Runtime，真正缺的是：

- Intent Router 稳定性。
- 能力发现和预检前置化。
- MCP / Workflow / Skill 返回结果协议化。
- 前端把真实执行过程和结果产品化展示。
- 禁止伪 CoT 和后台感较重的过程平铺。

因此本次调整不是推翻 13/14/15，而是在 14/15 中补强两点：

1. `AgentRuntimeContract` 必须明确是薄运行时，不是厚 Agent 框架。
2. `ResponseContract` 下面需要补一个面向前端的 `MessagePart Protocol`。

## 3. 与当前实现的对照

### 3.1 已有基础

| 当前实现 | 已具备能力 | 问题 |
|---|---|---|
| `agent-runtime.ts` | 将 SSE route、thinking、tool_call、tool_result 转为 `AgentProcessEvent` | 仍有 `thinking_step` 和 `ThinkingChain` 命名，容易被理解为思维链 |
| `types/index.ts` | 已定义 `AgentProcessEvent`、`ProcessEventType`、`SourceRef`、`WorkflowResult` | 尚未定义统一 `MessagePart` 展示协议 |
| `report-query-orchestrator.ts` | 已有 query plan、preflight、tool_chain、ReportQueryResult、viz_spec | 问数结果已有雏形，但还没被提升成通用 Result Protocol |
| `ChatContainer.tsx` | 已能展示过程、工具、证据、问数卡片、图表、缺字段追问 | 渲染逻辑集中且依赖多个散落字段 |
| `controlled-glossary-index.ts` | 已支持受控术语归一化 | 需要继续作为路由和问数前置，不作为实时业务事实来源 |
| `intent-route-engine.ts` / `intent-router.ts` | 已有规则、角色、上下文、模型判别融合 | 还需要和能力预检、项目权限、MessagePart 结果绑定 |

### 3.2 当前计划已覆盖

| 调研结论 | 当前文档覆盖情况 |
|---|---|
| 不强依赖 LangGraph / DeerFlow | 13 已明确不整体迁移 DeerFlow |
| Fat MCP / Workflow Service | 13/14 已明确 MCP / Workflow / Skill 边界 |
| 不更换 Ant Design X | 15 的 C9 已明确不引入第三方聊天渲染框架 |
| 不重构 Header / Sidebar / Workspace / Sender / Conversation | 15 的 C9 已明确页面保护约束 |
| Intent Router 稳定优先 | 14/15 已把 Runtime、TaskPlan、CapabilityPreflight 放入 P0 |

### 3.3 当前计划不足

| 不足 | 影响 | 调整建议 |
|---|---|---|
| 缺统一 `MessagePart Protocol` | 前端继续依赖 `workflow_result`、`report_query_result`、`tool_calls`、`thinking_steps` 等散落字段 | 在 14/15 中补充展示子协议 |
| `ThinkingChain` 语义不佳 | 用户可能误解为模型内部思维链或伪 CoT | 改为“执行过程 / Timeline”产品语义 |
| Result Protocol 未单独成章 | 后端真实执行结果和前端卡片展示之间缺稳定契约 | 在 `ResponseContract` 下增加 `message_parts` |
| Timeline / Stepper 的验收未写清 | 容易继续做后台日志式平铺 | 定义只展示用户可理解的结构化事件 |

## 4. 采纳项

### 4.1 采纳：Thin Chat Runtime

Chat Runtime 只负责：

- 输入标准化。
- 受控术语归一化。
- 意图候选和 TaskPlan。
- 项目和权限解析。
- 上下文合并。
- 能力发现和预检。
- 调用 MCP / Workflow / Skill。
- 解析结果。
- 组织 `ResponseContract` 和 `MessagePart`。
- 发送 Trace。

Chat Runtime 不负责：

- 自己实现报表查询业务逻辑。
- 自己实现联调状态机。
- 自己实现异常排查步骤。
- 自己伪造工具结果。
- 自己维护复杂多 Agent 编队。

### 4.2 采纳：Fat MCP / Fat Skill

业务逻辑优先沉在 MCP / Workflow Skill 中：

- 问数：报表 MCP、字典 MCP、schema adapter、结果解析。
- 包交付：包管理 Workflow / MCP 返回状态、检查结果、联调结果。
- 异常排查：排查 Workflow / MCP 返回检查项、结论、失败原因。
- 指标解释：内部口径库和受控术语优先，外部补充只做解释增强。
- Case：内部 API 真实创建，用户确认后返回编号。

### 4.3 采纳：Result Protocol

`ResponseContract` 必须能输出前端可稳定消费的展示结构，不再依赖自然语言推断 UI。

最小结构：

```ts
type MessagePart =
  | { type: 'text'; data: TextPartData }
  | { type: 'timeline'; data: TimelinePartData }
  | { type: 'tool_call'; data: ToolCallPartData }
  | { type: 'metric_card'; data: MetricCardPartData }
  | { type: 'table'; data: TablePartData }
  | { type: 'chart'; data: ChartPartData }
  | { type: 'action_list'; data: ActionListPartData }
  | { type: 'source_refs'; data: SourceRefsPartData }
```

第一批不要求一次性支持所有复杂卡片，但问数闭环必须至少支持：

- `text`
- `timeline`
- `tool_call`
- `table`
- `chart`
- `action_list`
- `source_refs`

### 4.4 采纳：Timeline / Stepper

Timeline 只展示结构化执行事件：

```text
识别意图
-> 解析项目
-> 检查权限
-> 能力预检
-> 调用字典
-> 调用报表
-> 解析结果
-> 生成建议
```

Timeline 不展示：

- 模型内部推理。
- 伪 CoT。
- “我正在思考”类占位叙述。
- 用户无法理解的原始后台日志。

### 4.5 采纳：前端渐进增强

前端只在现有聊天体系内增强：

- 保留 Ant Design X 和现有 Ant Design 组件体系。
- 保留 Header、Sidebar、Workspace、Sender、Conversation、路由和全局状态。
- 保留现有 message schema、conversation store、send message API。
- 不引入新的第三方聊天渲染框架。

## 5. 不采纳项

当前不采纳：

- 不引入 LangGraph 作为当前主链路依赖。
- 不重构成复杂 Multi-Agent Runtime。
- 不把当前 MCP 内已具备的 workflow 能力重新造一套 Workflow Runtime。
- 不更换 Ant Design X。
- 不重做会话页面布局。
- 不把 Timeline 做成伪思维链展示。
- 不让前端根据自然语言自行判断“已查询”“已检查”“已保存”。

## 6. 对现有实施文档的调整

### 6.1 调整 14

`14-AgentRuntimeContract与总控运行链路实施方案.md` 需要追加：

- `AgentRuntimeContract` 是薄 Chat Runtime，不是复杂 Agent 框架。
- Fat MCP / Fat Skill 是业务能力承载层。
- `ResponseContract` 增加 `message_parts`。
- `MessagePart` 是展示协议，不替换 message schema。
- Timeline 由 `AgentProcessEvent` / `ToolCallEnvelope` 派生。

### 6.2 调整 15

`15-第一批代码实施任务拆解与验收门禁.md` 需要追加：

- C7 增加 `MessagePart Protocol` 验收。
- C9 继续保持前端页面保护约束。
- 第一批不引入第三方聊天渲染框架。
- 第一批前端重点是现有渲染体系内的 Timeline / Card / Table / Chart 展示补强。

## 7. 工程实施影响

### 7.1 后端影响

需要在 Runtime / 问数执行链路中补出：

- `response_contract.message_parts`
- `timeline` parts
- `tool_call` parts
- `table` / `chart` parts
- `action_list` parts
- `source_refs` parts

这些都应由真实执行结果派生，不能由自然语言二次猜测。

### 7.2 前端影响

需要在现有 `ChatContainer` / 结果卡体系内补：

- `MessagePart` 解析函数。
- Timeline / Stepper 渲染。
- ToolCard 渲染。
- Table / Chart 继续复用现有 `ReportQueryResultCard` 和 `DataVizRenderer` 能力。
- “思维链”文案收敛为“执行过程”。

不允许：

- 替换聊天页面框架。
- 替换消息 schema。
- 替换 conversation store。
- 替换发送接口。
- 引入全局样式重置。

## 8. 更新后的优先级

第一批优先级调整为：

1. Intent Router 稳定和项目权限冲突处理。
2. CapabilityPreflight 和问数 MCP 真实调用。
3. Result Protocol / MessagePart Protocol。
4. Timeline / Stepper / Card Renderer。
5. 前端视觉体验微调。

其中第 5 项只能在不影响最低闭环和页面保护约束的前提下进行。

## 9. 验收规则

新增验收：

- 无 `message_parts` 时，前端可兼容旧消息；有 `message_parts` 时优先按协议渲染。
- `timeline` 只展示结构化事件，不展示模型内部推理。
- `tool_call` 必须绑定真实 `ToolCallEnvelope` 或 `AgentProcessEvent`。
- `table` / `chart` 必须来自真实问数结果或 `viz_spec`。
- `action_list` 必须来自 `recommended_actions`，不能由前端临时拼接成业务结论。
- `source_refs` 必须能追溯到 MCP、知识库、附件、内部口径或外部来源。
- 没有真实工具成功时，不得展示“已查询”。

## 10. 最终结论

本次调研文档应追加进实施计划。

追加方式不是新增大架构，而是：

- 把 14 的 Runtime 定位收敛为 Thin Chat Runtime。
- 把 15 的 C7/C9 补成 Result Protocol 和前端保护并行。
- 新增本文作为 16，记录调研文档如何影响当前实施阶段。

这能避免两个方向性风险：

1. 继续把 Chat 做成过厚的假业务系统。
2. 继续把 MCP 真实结果用零散前端字段和自然语言硬展示。
