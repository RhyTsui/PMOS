# AgentRuntimeContract 与总控运行链路实施方案

## 1. 文档定位

本文承接 `13-DeerFlow框架对照与小乔智投取舍评估.md` 中识别出的 P0 新增项，将“会话总控 Agent / AgentRuntimeContract”从架构判断落到工程实施契约。

本文解决的问题：

- Chat 到底负责什么，不负责什么。
- 路由、项目权限、术语、上下文、能力发现、工具调用、结果解析、Trace、资产、Case 如何串成一条链。
- 哪些规则必须写死，哪些可以配置，哪些必须来自 Tool / MCP / Workflow，哪些可以来自知识库。
- 现有 `src/ad/xiaoqiao/routing.py` 这类关键词路由如何升级，而不是推倒重来。

本文不直接定义具体代码文件改造，但给出代码阶段必须实现的运行时类型、服务职责和验收门禁。

## 2. 核心结论

小乔需要的是一个轻量但强约束的 Thin Chat Runtime，不是引入完整 DeerFlow，也不是继续让 Chat 通过 Prompt 伪装业务系统。

运行时边界必须收敛为：

```text
Thin Chat Runtime
  -> 负责意图、上下文、项目权限、能力预检、调用编排、结果协议、Trace

Fat MCP / Fat Skill / Workflow
  -> 负责报表、联调、排查、检查、状态机、业务执行和失败原因
```

Chat 不能把 MCP / Workflow / Skill 已经内聚的业务逻辑重新实现一遍。Chat 的价值是把用户自然语言和真实业务能力连接起来，并把真实结果组织成可解释、可渲染、可追溯的响应协议。

总控运行链路应固定为：

```text
UserMessage
  -> InputNormalize
  -> ControlledGlossaryNormalize
  -> ProjectResolution
  -> PermissionCheck
  -> ContextMerge
  -> TaskPlanBuild
  -> CapabilityPreflight
  -> AskOrExecute
  -> ToolCallEnvelope / WorkflowCallEnvelope
  -> ResultParser
  -> ResponseComposer
  -> Trace / Asset / Case / Memory
```

其中每一步都必须有结构化输入输出。任何一步失败，都不能跳过后伪装成功。

## 3. AgentRuntimeContract

### 3.1 目标

`AgentRuntimeContract` 是小乔业务 Chat 的总控契约，用于约束一次用户请求从输入到闭环的完整过程。

它不是一个单独大模型提示词，也不是一个 MCP tool。它是 Chat 后端运行时的统一接口。

### 3.2 最小输入

```ts
type AgentRuntimeInput = {
  conversation_id: string
  message_id: string
  user_id: string
  role_id: string
  raw_text: string
  ui_selected_project_ref?: string
  attachments?: RuntimeAttachment[]
  client_context?: {
    current_page?: string
    focused_object?: RuntimeObjectRef
    timezone?: string
  }
}
```

### 3.3 最小输出

```ts
type AgentRuntimeOutput = {
  runtime_id: string
  trace_id: string
  route_status:
    | 'answered_general'
    | 'need_clarification'
    | 'blocked'
    | 'executed'
    | 'partial_success'
    | 'failed_case_created'
    | 'failed_case_pending_confirmation'
  task_plan: TaskPlan
  project_resolution: ProjectResolution
  permission_result: PermissionCheckResult
  capability_preflight: CapabilityPreflightResult
  execution_results: RuntimeExecutionResult[]
  response_contract: ResponseContract
  persistence_results: RuntimePersistenceResult[]
}
```

### 3.4 现有系统映射

| 当前模块 | 保留方式 | 需要升级 |
|---|---|---|
| `routing.py` | 作为初始 intent candidate 生成器保留 | 不再作为最终路由事实 |
| `service.py` conversation/task/result | 保留会话和任务模型 | 补 runtime_id、trace_id、TaskPlan、执行结果 |
| `mcp.py` | 保留 MCP 协议入口 | 接入 CapabilityRegistry 和 ToolCallEnvelope |
| `autonomous_runtime.py` | 保留交付运行追踪 | 不作为业务 Agent Runtime |

## 4. TaskPlan

### 4.1 目标

`TaskPlan` 用于表达用户一次输入中包含的一个或多个任务，以及这些任务之间的依赖关系。

它替代“只给一个 intent_type”的旧做法。

### 4.2 数据结构

```ts
type TaskPlan = {
  plan_id: string
  original_text: string
  normalized_text: string
  tasks: RuntimeTask[]
  plan_status:
    | 'ready'
    | 'needs_clarification'
    | 'blocked_by_permission'
    | 'blocked_by_capability'
    | 'blocked_by_risk'
}

type RuntimeTask = {
  task_id: string
  intent_key: string
  domain:
    | 'report_query'
    | 'package_delivery'
    | 'diagnosis'
    | 'metric_explanation'
    | 'demand_case'
    | 'automation'
    | 'general_answer'
  depends_on: string[]
  slots: Record<string, RuntimeSlot>
  risk_level: 'read_only' | 'content_generation' | 'state_change' | 'external_send'
  selected_capability_id?: string
  task_status:
    | 'ready'
    | 'needs_clarification'
    | 'blocked'
    | 'executing'
    | 'succeeded'
    | 'partial_success'
    | 'failed'
}

type RuntimeSlot = {
  value: unknown
  source:
    | 'explicit_user'
    | 'ui_context'
    | 'conversation_context'
    | 'personal_memory'
    | 'controlled_glossary'
    | 'tool_result'
    | 'system_default'
  confidence: number
  confirmed_by_user: boolean
  version: number
}
```

### 4.3 必须写死的规则

- 用户显式输入优先于顶部项目。
- 用户显式纠错优先于历史上下文和个人记忆。
- 写操作、外发、预算、投放状态变更必须确认。
- 无真实工具调用不得输出数据事实、包状态、联调结论、Case 创建结果。

### 4.4 可配置的规则

- intent route terms。
- 默认追问文案。
- 能力优先级。
- 低风险默认值。
- 置信度阈值，但不能低于安全下限。

## 5. MiddlewarePipeline

### 5.1 固定顺序

| 顺序 | Middleware | 职责 | 失败处理 |
|---|---|---|---|
| 1 | InputNormalize | 清洗输入、识别语言、相对时间初步解析 | 空输入追问 |
| 2 | ControlledGlossaryNormalize | 术语、指标、媒体、项目别名归一化 | 多候选追问 |
| 3 | ProjectResolution | 解析用户明示项目、顶部项目、上下文项目 | 冲突或无权限阻断 |
| 4 | PermissionCheck | 按最新用户权限生成 effective_project_refs | 无权限阻断 |
| 5 | ContextMerge | 合并会话上下文、任务上下文、个人记忆 | 低置信度追问 |
| 6 | TaskPlanBuild | 生成任务图和依赖关系 | 缺关键 slot 追问 |
| 7 | CapabilityPreflight | 查询 CapabilityRegistry，确认能力可执行 | 缺能力生成缺口或 Case |
| 8 | RiskGate | 判断是否需用户确认 | 高风险确认 |
| 9 | TraceStart | 初始化 trace_id 和关键链路字段 | 失败不阻断主链，但记录 |

### 5.2 不能分散实现的内容

以下逻辑必须由 MiddlewarePipeline 统一处理，不应让问数、包交付、异常排查各自实现一套：

- 项目解析。
- 项目权限校验。
- 术语归一化。
- 会话上下文合并。
- 能力预检。
- 风险确认。
- Trace 初始化。

## 6. CapabilityRegistry

### 6.1 目标

`CapabilityRegistry` 统一管理小乔可调用能力，不再让 Chat 根据关键词猜系统能不能做。

### 6.2 能力来源

| 来源 | 示例 | 说明 |
|---|---|---|
| MCP tools/list | 报表 MCP、配置 MCP、自动联调 MCP | 运行态能力事实 |
| Workflow Contract | 包交付、异常排查、定时报表 | 开发提供的流程能力 |
| Skill Contract | 指标解释、需求沟通、排查 SOP | 场景方法和轻编排 |
| Internal API | Case 创建、资产保存、用户配置 | 内部业务接口 |
| Model Answer | 通用知识回答、语言归纳 | 兜底能力，不提供业务事实 |

### 6.3 数据结构

```ts
type CapabilityRecord = {
  capability_id: string
  domain: string
  display_name: string
  binding_type: 'mcp_tool' | 'workflow' | 'skill' | 'internal_api' | 'model_answer'
  binding_ref: string
  status: 'available' | 'degraded' | 'unavailable' | 'missing'
  schema_version?: string
  required_slots: string[]
  optional_slots: string[]
  project_scope: 'none' | 'single_project' | 'multi_project_allowed'
  health: 'healthy' | 'warning' | 'down' | 'unknown'
  source: 'runtime_discovery' | 'developer_contract' | 'admin_override'
}
```

### 6.4 问数专项要求

问数 MCP 已有披露能力，不得再默认写成 MCP 缺失。

问数能力缺口应按责任层分类：

- MCP 已有，Chat 未映射。
- MCP 已有，slot 未补齐。
- MCP 已有，字典未调用。
- MCP 已有，schema adapter 缺失。
- MCP 已有，UI 未渲染。
- MCP 已有，Trace 未记录。
- MCP 真缺失。

## 7. ToolCallEnvelope

### 7.1 目标

统一真实工具调用记录，保证前端文案、Trace、Case 和证据一致。

### 7.2 数据结构

```ts
type ToolCallEnvelope = {
  call_id: string
  trace_id: string
  capability_id: string
  binding_type: 'mcp_tool' | 'workflow' | 'skill' | 'internal_api'
  binding_ref: string
  input_summary: Record<string, unknown>
  raw_input_ref?: string
  started_at: string
  ended_at?: string
  result_status:
    | 'success'
    | 'partial_success'
    | 'empty'
    | 'permission_denied'
    | 'schema_mismatch'
    | 'timeout'
    | 'service_error'
    | 'parse_failed'
  output_summary?: Record<string, unknown>
  evidence_refs: string[]
  tool_error_raw?: string
  tool_error_safe?: string
  tool_error_type?: 'permission' | 'parameter' | 'network' | 'service' | 'empty' | 'timeout'
  tool_error_stage?: 'auth' | 'parameter_build' | 'call' | 'parse' | 'display'
}
```

### 7.3 前端状态绑定

| 前端文案 | 必须满足 |
|---|---|
| 已查询 | ToolCallEnvelope result_status 为 success/partial_success/empty |
| 已检查 | 真实检查类 capability 调用完成 |
| 已保存 | 资产、知识库或 Case 创建接口返回成功 |
| 检查失败 | result_status 为失败类状态 |
| 等待确认 | RiskGate 或 Case 创建需要用户确认 |

## 8. ResponseContract

### 8.1 目标

响应不只是自然语言，必须能驱动前端卡片、表格、追问、Case、保存和下一步建议。

```ts
type ResponseContract = {
  response_type:
    | 'clarification'
    | 'business_result'
    | 'partial_result'
    | 'blocked'
    | 'case_draft'
    | 'general_answer'
  user_message: string
  cards: RuntimeCard[]
  evidence_refs: string[]
  recommended_actions: RecommendedAction[]
  source_summary: SourceSummary[]
  message_parts?: MessagePart[]
}
```

### 8.2 结果来源规则

- 数值事实来自 Tool / MCP / Workflow。
- 指标口径来自内部口径库或受控术语。
- 行业补充可来自外部联网或通用模型，但必须标注。
- 用户偏好来自个人记忆。
- 经验沉淀来自个人知识库。

### 8.3 Result Protocol / MessagePart

`MessagePart` 是 `ResponseContract` 的前端展示子协议，用于把真实执行过程和结果转成稳定渲染单元。

它不是新的 message schema，也不替代 conversation store 或 send message API。

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

第一批问数闭环至少要能派生：

- `text`：最终结论和用户可读说明。
- `timeline`：意图、项目、权限、能力、工具调用、解析结果。
- `tool_call`：真实 MCP / Skill / Workflow 调用摘要。
- `table`：问数结果表格。
- `chart`：问数 `viz_spec` 派生图表。
- `action_list`：下一步建议。
- `source_refs`：数据、知识库、口径、工具来源。

### 8.4 Timeline 展示规则

Timeline 只能展示用户可理解的结构化执行事件：

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

禁止展示：

- 模型内部推理。
- 伪 CoT。
- “我正在思考”类占位叙述。
- 未脱敏的原始后台日志。

Timeline 应优先由 `AgentProcessEvent`、`ToolCallEnvelope`、`CapabilityPreflightResult` 派生。

## 9. 闭环状态

一次请求必须落入以下闭环状态之一：

| 状态 | 含义 |
|---|---|
| `completed` | 已真实执行并正确解析结果 |
| `clarifying` | 仍缺用户可提供的关键输入 |
| `blocked_permission` | 权限不足，未调用业务工具 |
| `blocked_capability` | 能力缺失或未绑定 |
| `partial_success` | 部分能力成功，已标注缺失和影响 |
| `failed_retryable` | 失败但可重试 |
| `failed_case_pending_confirmation` | 建议生成 Case，等待用户确认 |
| `failed_case_created` | 用户确认后已创建 Case |

禁止出现“没有状态但自然语言说完了”的结果。

## 10. 与现有 03-13 的关系

| 文档 | 本文承接方式 |
|---|---|
| 03 对话路由 | TaskPlan、引用解析、置信度进入 Runtime |
| 04 项目权限 | ProjectResolution、PermissionCheck 进入 Middleware |
| 05 个人记忆 | MemoryPolicy 进入 Runtime 输出沉淀 |
| 06 问数报表 | CapabilityRegistry、ToolCallEnvelope、ResponseContract 承接问数闭环 |
| 07 包交付 | WorkflowCallEnvelope 承接状态机和联调结论 |
| 08 异常排查 | ToolCallEnvelope 承接真实检查项和诊断置信度 |
| 09 指标解释 | ControlledGlossary 和内部口径库进入术语中间件 |
| 10 Case | Case 创建进入 PersistenceResult |
| 11 前端 | ResponseContract 绑定真实状态文案 |
| 12 Trace | TraceEnvelope 从 Runtime 全链路生成 |
| 13 DeerFlow 对照 | 本文是 13 中 P0 运行时契约的专项落地 |

## 11. 代码阶段实施边界

### 11.1 必须先做

- 定义 Runtime 类型。
- 将现有关键词路由包装为候选 intent 生成器。
- 新增 MiddlewarePipeline。
- 新增 CapabilityRegistry 查询接口。
- 新增 ToolCallEnvelope。
- 新增 Result Protocol / MessagePart 派生规则。
- 将问数链路接入 Runtime。

### 11.2 可以后做

- 包交付 WorkflowCallEnvelope。
- 异常排查 WorkflowCallEnvelope。
- 资产、知识库、Case 的完整 PersistenceResult。
- SubagentPolicy 的具体实现。

### 11.3 明确不做

- 不整体替换现有会话接口。
- 不把 `autonomous_runtime.py` 改成业务 Agent Runtime。
- 不在 Chat 内写死 MCP 返回数据。
- 不在小乔后台做连弩评测平台。

## 12. 验收规则

- 顶部 A，用户问 B，Runtime 输出的 effective_project_refs 是 B 或阻断，不是 A。
- 问数请求必须经过 CapabilityPreflight 后才调用 MCP。
- MCP 未调用或调用失败时，不得显示“已查询”。
- 用户一句话多任务时，TaskPlan 至少包含两个 RuntimeTask 和依赖关系。
- 用户纠错后，只重跑受影响任务。
- Trace 能看到中间件、能力预检、工具调用、解析结果。
- 前端卡片状态来自 ToolCallEnvelope / PersistenceResult，而不是自然语言。
- 个人记忆和知识库检索结果不得绕过项目权限。
