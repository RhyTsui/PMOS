# 小乔智投 Master Spec

## 0. 规格地位

本文是当前工程的系统主规格，用于统一产品方向、运行时边界、MCP / Skill 边界和前端渲染协议。

项目级顶层架构以 `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` 为准，二级规范索引以 `docs/architecture/00_SPEC_INDEX.md` 为准。本文是小乔智投当前实现阶段的主规格，必须服从 Enterprise AI Chat OS 的分层：Unified Semantic Contract 管最终业务结果，Runtime Display Protocol 管运行过程，Component Binding System 管具体渲染挂载。

本文不创建新的复杂 Runtime，不引入无意义 Multi-Agent，不把已有 MCP / Skill 中已经存在的 workflow 能力搬回 Chat 侧重写。

当前代码真源：

| 规格对象 | 当前代码映射 |
|---|---|
| Chat Runtime 入口 | `frontend/src/src/app/api/chat/route.ts` |
| 前端会话消费 | `frontend/src/src/hooks/useConversation.ts` |
| 会话渲染 | `frontend/src/src/components/cognitive/ChatContainer.tsx` |
| 过程事件适配 | `frontend/src/src/lib/agent-runtime.ts` |
| 意图路由 | `frontend/src/src/lib/intent-router.ts`, `frontend/src/src/lib/intent-route-engine.ts`, `frontend/src/src/lib/intent-route-rules.ts` |
| 意图编排增强 | `frontend/src/src/lib/intent-orch-enhancer.ts` |
| 请求理解 | `frontend/src/src/lib/request-understanding.ts`, `frontend/src/src/lib/request-understanding-merge.ts` |
| 实体解析 | `frontend/src/src/lib/entity-resolution.ts`, `frontend/src/src/contracts/request-understanding/entity-resolution.ts` |
| 事实需求推理 | `frontend/src/src/lib/fact-need-reasoner.ts`, `frontend/src/src/contracts/request-understanding/fact-need-contract.ts` |
| 信息源仲裁 | `frontend/src/src/lib/information-source-arbitration.ts`, `frontend/src/src/contracts/request-understanding/information-source-arbitration-contract.ts` |
| Planner 编排 | `frontend/src/src/lib/planner-orchestrator.ts`, `frontend/src/src/lib/planner-contract-validator.ts`, `frontend/src/src/lib/planner-shadow.ts` |
| Planner 契约 | `frontend/src/src/contracts/planner/planner-plan-contract.ts` |
| 能力编排 | `frontend/src/src/lib/capability-orchestration.ts`, `frontend/src/src/contracts/capability/capability-manifest.ts` |
| Skill 编排 | `frontend/src/src/lib/skill-orchestration.ts`, `frontend/src/src/lib/skill-contract-store.ts`, `frontend/src/src/lib/skill-store.ts` |
| 上下文编译 | `frontend/src/src/lib/context-engine.ts`, `frontend/src/src/lib/context-compiler.ts`, `frontend/src/src/lib/conversation-context.ts`, `frontend/src/src/lib/slot-resolver.ts` |
| MCP 管理与发现 | `frontend/src/src/lib/mcp-server-store.ts`, `frontend/src/src/lib/mcp-discovery.ts`, `frontend/src/src/lib/mcp-tool-output-adapter.ts` |
| MCP 工具适配 | `frontend/src/src/contracts/mcp/tool-capability-normalization.ts` |
| Skill Contract | `frontend/src/src/lib/skill-contract-store.ts`, `frontend/src/src/types/index.ts`, `frontend/src/src/contracts/skills/` |
| 模型路由 | `frontend/src/src/lib/model-router.ts`, `frontend/src/src/lib/model-resilience.ts`, `frontend/src/src/lib/model-use-case-runtime.ts` |
| 模型服务契约 | `frontend/src/src/contracts/model-service/` |
| 搜索编排 | `frontend/src/src/lib/search-orchestrator.ts`, `frontend/src/src/lib/search-provider-adapter.ts`, `frontend/src/src/lib/search-provider-config.ts` |
| 检索层契约 | `frontend/src/src/contracts/retrieval/retrieval-layer-contract.ts` |
| 公开联网 | `frontend/src/src/lib/public-web-runtime.ts`, `frontend/src/src/contracts/public-web/source-grounding.ts` |
| 问数编排 | `frontend/src/src/lib/report-query-orchestrator.ts`, `frontend/src/src/lib/report-agent.ts` |
| 结果契约派生 | `frontend/src/src/lib/response-contract.ts`, `frontend/src/src/contracts/result-assembly/semantic-result-assembly.ts` |
| 契约安全检查 | `frontend/src/src/lib/contract-safety.ts`, `frontend/src/src/contracts/validation/` |
| Disclosure 契约 | `frontend/src/src/contracts/disclosure/` |
| Disclosure 渲染 | `frontend/src/src/components/cognitive/MessagePresentationRenderer.tsx`, `frontend/src/src/components/cognitive/MessageDisclosureDrawer.tsx` |
| 自动化调度 | `frontend/src/src/lib/automation-scheduler.ts`, `frontend/src/src/lib/automation-execution-store.ts` |
| 自动化契约 | `frontend/src/src/contracts/automation/` |
| 工作流记录 | `frontend/src/src/lib/workflow-task-store.ts`, `frontend/src/src/lib/workflow-engine.ts` |
| Trace 追踪 | `frontend/src/src/lib/trace.ts`, `frontend/src/src/contracts/observability/` |
| 业务语义 | `frontend/src/src/contracts/business-semantics/` |
| 统一类型承载 | `frontend/src/src/types/index.ts` |
| 企业级 AI Chat OS 总纲 | `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` |
| AI Chat OS 二级规范索引 | `docs/architecture/00_SPEC_INDEX.md` |
| 前端 contract 类型真源 | `frontend/src/src/contracts/semantic`, `frontend/src/src/contracts/runtime`, `frontend/src/src/contracts/renderer`, `frontend/src/src/contracts/disclosure`, `frontend/src/src/contracts/validation` |
| 前端 contract 类型真源（扩展） | `frontend/src/src/contracts/planner`, `frontend/src/src/contracts/retrieval`, `frontend/src/src/contracts/model-service`, `frontend/src/src/contracts/automation`, `frontend/src/src/contracts/request-understanding`, `frontend/src/src/contracts/capability` |
| 前端设计系统 | `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md` |
| 数据可视化体验 | `docs/architecture/interaction-system/data-visualization-ux.md` |
| 色彩 token | `frontend/src/src/lib/zhitou-chat-colors.ts`, `frontend/src/src/app/globals.css`, `frontend/src/src/components/AntdProvider.tsx` |

## Execution Layer

Enterprise AI Chat OS 的正式落地顺序是：

```text
总纲 -> 二级规范 -> 01_EXECUTION_LAYER_INDEX.md -> frontend/src/src/contracts/*
```

## 1. 系统世界观

小乔智投不是通用聊天机器人，不是后台菜单搜索框，也不是独立 Multi-Agent 平台。

小乔智投是广告业务协同工作台。用户在会话区提出目标，系统完成意图识别、上下文整理、能力选择、参数补齐、工具调用、结果表达和后续动作承接。

系统采用：

```text
Fat MCP / Fat Skill
+
Thin Chat Runtime
```

含义：

- MCP / Skill 承载业务能力、步骤、状态、失败原因、建议和 workflow。
- Chat Runtime 只做轻编排、上下文治理和展示协议转换。
- UI 只消费标准 Result / Timeline / MessagePart，不反推业务事实。
- 如果没有真实 MCP / Skill / 数据源返回，不允许展示为已完成事实。
- UI 的字体、色彩、背景、组件语义和渲染边界以 `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md` 为当前 Visual System 真源。
- Data Visualization UX 以 `docs/architecture/interaction-system/data-visualization-ux.md` 为当前交互体验真源，且只能作为 Unified Semantic Contract 下的 `componentBinding = "data-visualization"` 子域。

## 1.1 Enterprise AI Chat OS 分层边界

本项目采用以下顶层分层，不再新增平行总协议：

```text
Enterprise AI Chat OS
├─ Unified Semantic Contract
│  └─ SemanticResultContract：最终业务结果如何被前端自主渲染
├─ Runtime Display Protocol：AI / Agent / Tool / Workflow 执行过程如何展示
├─ Component Binding System：regions[].componentBinding 到 renderer 的唯一挂载
├─ Interaction System：Conversation、Data Visualization、AI Runtime、AI Trust 等体验域
├─ Visual System：字体、色彩、图标、间距、动效 token
└─ Frontend Engineering System：渲染、性能、状态、响应式、可观测性
```

收口规则：

1. 最终业务结果必须能映射到 Unified Semantic Contract。
2. 运行过程必须能映射到 Runtime Display Protocol。
3. 具体展示形态只能作为 `regions[].componentBinding` 的子规范。
4. 用户动作统一走 ActionContract。
5. 结论、洞察、风险和建议统一挂 EvidenceRef / SourceRef。
6. `ReportQueryViewModel`、`MetricExplainerUISchema`、`VizSpec` 只作为兼容输入或局部 data shape，不作为新的最终结果总协议。
7. 扩展包补齐的 contract 类型先作为新真源引入，不立即强迁移现有 `ResponseContract`、`MessagePart`、`AgentProcessEvent`。
8. 问数趋势展示修复是 `report-result -> MessagePart -> data-visualization` 的优先迁移用例，规范补全不得覆盖其提示词、数据覆盖检查和不足数据降级规则。

## 2. Runtime Boundary Definition

### 2.1 Chat Runtime 负责什么

Chat Runtime 负责以下事情：

1. 接收用户消息和会话上下文。
2. 执行 Intent Router，得到 `intent_type`、`agent`、`workflow_level` 和路由原因。
3. 执行 Skill Router 或能力选择，决定调用哪个 Skill / MCP / workflow。
4. 编译用户、项目、历史消息、附件和偏好形成上下文包。
5. 做参数补齐和缺字段判断。
6. 做权限和范围校验，生成可调用的 effective scope。
7. 调用 MCP / Skill / workflow。
8. 把返回结果转换为 Result Protocol。
9. 把执行过程转换为 Timeline Protocol。
10. 把结果和过程派生为 MessagePart Protocol。
11. 通过 SSE 将过程和结果发给前端。
12. 将消息、过程事件、结果、workflow task/run 持久化。

当前已有映射：

- `/api/chat` 已负责 SSE、intent route、context compile、workflow task/run 创建、问数 MCP 编排和 `process_events` 输出。
- `useConversation` 已消费 `process_event`、`content`、`done`，并保存 assistant message。
- `agent-runtime.ts` 已把 SSE payload 转为 `AgentProcessEvent`、`thinking_steps`、`tool_calls`。
- `ChatContainer` 已可从 `process_events` 恢复 Timeline 和 Tool 展示。

### 2.2 Chat Runtime 不负责什么

Chat Runtime 不负责：

1. 不实现复杂 Multi-Agent 调度。
2. 不自己维护业务 workflow 状态机来替代 MCP / Skill。
3. 不生成假工具结果。
4. 不把前端展示需要倒推为业务事实。
5. 不把每种业务场景写成独立 hardcoded 分支。
6. 不把 MCP 的步骤、状态、失败原因和建议拆散后重造一套。

### 2.3 当前必须补齐的 Runtime 缺口

当前 `/api/chat` 已有运行链路，但还缺少强约束：

| 缺口 | 当前风险 | 目标 |
|---|---|---|
| 用户 scope 校验 | `x-conversation-id` 可直接进入运行链路 | `/api/chat` 必须从 cookie 解析用户，校验 conversation ownership |
| 项目权限校验 | MCP 入参可能来自未校验上下文 | MCP 入参只能来自 effective scope |
| Result Protocol 类型 | 当前靠 `WorkflowResult` + metadata 散落字段 | 增加统一 `ResponseContract` |
| MessagePart 类型 | 文档有概念，代码未落类型 | 增加统一 `MessagePart` |
| Timeline 规范 | 当前主要由 `AgentProcessEvent` 承载 | 明确事件类型、状态、可见性和渲染规则 |

## 3. MCP Boundary Definition

### 3.1 MCP 是能力事实源

MCP 是外部或内部业务能力的事实源。对 Chat 来说，MCP 返回的内容优先级高于模型文本。

MCP 可以包含：

- 步骤。
- 状态。
- 失败原因。
- 建议动作。
- Workflow 进度。
- 工具返回数据。
- 数据源引用。
- 权限失败、schema mismatch、空结果、未配置等失败分类。

当前映射：

- `McpServerConfig` / `McpToolConfig` 在 `types/index.ts`。
- MCP 管理在 `mcp-server-store.ts`。
- MCP 协议发现和调用在 `mcp-discovery.ts`。
- 问数能力选择和调用在 `report-query-orchestrator.ts`。

### 3.2 MCP 应输出什么

MCP 或 MCP 适配层应输出稳定结构：

```ts
type McpExecutionResult = {
  status: 'success' | 'empty' | 'failed' | 'blocked' | 'not_configured';
  message: string;
  data?: unknown;
  steps?: TimelineEvent[];
  failure_reason?: string;
  recommended_actions?: string[];
  source_refs?: SourceRef[];
  raw_result_preview?: unknown;
};
```

当前问数链路已有近似结构：

- `ExecuteReportQueryStepResult.status`
- `tool_chain`
- `message`
- `preflight`
- `resolved_filters`
- `selection_trace`
- `ReportQueryResult.quality_check`
- `ReportQueryResult.empty_diagnosis`

### 3.3 MCP 不负责什么

MCP 不负责：

- 决定 Chat 页面如何排版。
- 生成前端组件细节。
- 直接返回 React 组件。
- 替代 Chat 的用户上下文权限判断。
- 替代 Chat 的跨会话记忆和前端展示协议。

MCP 可以返回 `ui_component.type` 或业务组件建议，但最终渲染由 Chat UI Renderer 决定。

## 4. Skill Boundary Definition

Skill 是业务能力契约，不是独立智能体。

Skill Contract 负责定义：

- 适用意图。
- 输入 schema。
- 需要补齐的参数。
- workflow steps。
- 绑定的 MCP / API / 工具。
- 输出 schema。
- 风险 guardrail。
- 评测用例。

当前映射：

- `SkillContract` 类型在 `types/index.ts`。
- 内置 Skill 在 `skill-contract-store.ts`。
- 普通 MCP Skill 列表在 `skill-store.ts`。

Skill 不负责：

- 自己启动独立聊天循环。
- 自己改写会话 UI。
- 自己生成无法追踪的业务结论。

## 5. Result Protocol

### 5.1 定义

Result Protocol 是 Chat Runtime 对 MCP / Skill / workflow 返回的统一结果封装。

它的目标是让 UI 不再从自然语言正文里反推状态。

标准结构：

```ts
type ResultStatus =
  | 'success'
  | 'empty'
  | 'partial_success'
  | 'missing_input'
  | 'blocked'
  | 'failed'
  | 'not_configured';

type ResponseContract = {
  schema_version: 1;
  result_id: string;
  task_id?: string;
  run_id?: string;
  conversation_id: string;
  message_id?: string;
  intent_type: IntentType;
  agent?: AgentType | string;
  status: ResultStatus;
  title: string;
  summary: string;
  data?: unknown;
  quality_check?: {
    ok: boolean;
    issues: string[];
    root_cause?: string;
  };
  missing_fields?: MissingField[];
  recommended_actions: string[];
  source_refs: SourceRef[];
  timeline: TimelineEvent[];
  message_parts: MessagePart[];
  raw?: unknown;
};
```

### 5.2 当前代码映射

| Result 字段 | 当前来源 |
|---|---|
| `status` | `ReportQueryResult.status`, `ExecuteReportQueryStepResult.status`, workflow run status |
| `summary` | `WorkflowResult.summary`, `ReportQueryResult.message` |
| `data` | `WorkflowResult.structured_payload`, `report_query_result` |
| `quality_check` | `ReportQueryResult.quality_check` |
| `missing_fields` | `missing_fields`, `preflight.missing_context_fields` |
| `recommended_actions` | `WorkflowResult.next_actions`, `empty_diagnosis.next_actions` |
| `source_refs` | `AgentProcessEvent.source_refs`, report capability evidence refs |
| `timeline` | `process_events`, `tool_chain` |
| `message_parts` | 当前缺失，需要从 Result 派生 |

### 5.3 Result 状态语义

| 状态 | 语义 | UI 行为 |
|---|---|---|
| `success` | 真实能力返回可用结果 | 展示结论、数据卡、来源、下一步 |
| `empty` | 调用成功但无数据 | 展示空结果原因、查询条件、放宽建议 |
| `partial_success` | 部分子查询成功 | 展示成功部分和失败部分 |
| `missing_input` | 缺少必要参数 | 展示补充字段卡 |
| `blocked` | 权限、能力、配置或流程阻断 | 展示阻断原因和处理建议 |
| `failed` | 调用失败或解析失败 | 展示失败阶段、错误分类、重试建议 |
| `not_configured` | 能力未配置 | 展示未接入，不展示业务结论 |

## 6. Timeline Protocol

### 6.1 定义

Timeline Protocol 是用户可见的过程记录，不是模型思维链。

当前以 `AgentProcessEvent` 作为基础类型，不另造一套事件体系。

标准别名：

```ts
type TimelineEvent = AgentProcessEvent;
```

### 6.2 事件类型

当前有效事件类型以 `ProcessEventType` 为准：

- `intent.detected`
- `context.prepared`
- `capability.checked`
- `clarify.requested`
- `clarify.submitted`
- `skill.selected`
- `skill.started`
- `skill.step`
- `skill.finished`
- `skill.failed`
- `mcp.tool_call`
- `mcp.tool_result`
- `mcp.tool_error`
- `knowledge.search`
- `knowledge.result`
- `knowledge.rejected`
- `web.search`
- `web.result`
- `model.step`
- `source.attached`
- `ui.component_rendered`
- `answer.delta`
- `answer.final`

### 6.3 状态语义

| 状态 | 语义 |
|---|---|
| `running` | 正在执行 |
| `success` | 已完成 |
| `error` | 执行失败 |
| `waiting` | 等待用户、配置、权限或外部能力 |
| `rejected` | 被规则拒绝或低相关丢弃 |

### 6.4 可见性

| visibility | 语义 | UI |
|---|---|---|
| `user` | 可展示给用户 | 默认进入 Timeline |
| `internal` | 可用于调试和审计 | 默认折叠或仅管理员可见 |
| `debug` | 调试细节 | 默认不展示 |

### 6.5 Timeline 渲染规则

1. Timeline 不展示模型私有思考。
2. Timeline 只展示已结构化的过程事件。
3. `mcp.tool_call` / `mcp.tool_result` / `mcp.tool_error` 渲染为 Tool Card。
4. `ui.component_rendered` 用于提示后续 MessagePart 或卡片。
5. `source.attached` 合并进来源区域。
6. 失败事件必须展示失败阶段和可执行建议。

当前映射：

- `agent-runtime.ts` 已将 `AgentProcessEvent` 转为 `thinking_steps` 和 `tool_calls`。
- `ChatContainer` 已从 `process_events` 恢复 `thinkingSteps` 和 `toolCalls`。

## 7. MessagePart Protocol

### 7.1 定义

MessagePart 是前端渲染的最小语义单元。它不是业务事实源，而是由 Result Protocol 和 Timeline Protocol 派生出来的展示协议。

MessagePart 不替换 `Message` 存储结构。它作为 `metadata.response_contract.message_parts` 或 `metadata.message_parts` 兼容挂载。

标准结构：

```ts
type MessagePart =
  | {
      type: 'text';
      key: string;
      data: { text: string; tone?: 'normal' | 'success' | 'warning' | 'danger' };
    }
  | {
      type: 'timeline';
      key: string;
      data: { events: TimelineEvent[]; collapsed?: boolean };
    }
  | {
      type: 'tool_card';
      key: string;
      data: {
        title: string;
        status: ProcessEventStatus;
        tool_name?: string;
        provider?: string;
        input?: Record<string, unknown>;
        output?: Record<string, unknown>;
        error?: string;
      };
    }
  | {
      type: 'result_card';
      key: string;
      data: {
        status: ResultStatus;
        title: string;
        summary: string;
        recommended_actions?: string[];
      };
    }
  | {
      type: 'table';
      key: string;
      data: { columns: string[]; rows: Record<string, unknown>[]; empty_message?: string };
    }
  | {
      type: 'chart';
      key: string;
      data: { viz_spec: unknown };
    }
  | {
      type: 'action_list';
      key: string;
      data: { actions: string[] };
    }
  | {
      type: 'source_refs';
      key: string;
      data: { refs: SourceRef[] };
    }
  | {
      type: 'missing_fields';
      key: string;
      data: { fields: MissingField[] };
    }
  | {
      type: 'collapsible';
      key: string;
      data: {
        title: string;
        default_open?: boolean;
        children: MessagePart[];
      };
    };
```

### 7.2 派生规则

| 输入 | 派生 MessagePart |
|---|---|
| `summary` / answer text | `text` |
| `process_events` | `timeline` |
| `mcp.tool_*` event | `tool_card` |
| `ReportQueryResult.status` | `result_card` |
| `ReportQueryResult.rows` | `table` |
| `ReportQueryResult.viz_spec` | `chart` |
| `recommended_actions` | `action_list` |
| `source_refs` / evidence refs | `source_refs` |
| `missing_fields` | `missing_fields` |
| 大型工具输入输出 | `collapsible` |

### 7.3 前端兼容策略

当前 UI 已支持：

- `MessageSurface` 渲染正文。
- Timeline 从 `thinking_steps` / `process_events` 恢复。
- Tool 展示从 `tool_calls` / `process_events` 恢复。
- `ReportQueryResultCard` 渲染问数结果。
- `DataVizRenderer` 渲染图表。
- `MissingFieldPanel` 渲染缺字段。

下一步不是重写 UI，而是新增一个派生层：

```text
WorkflowResult / ReportQueryResult / process_events
  -> ResponseContract
  -> MessagePart[]
  -> ChatContainer 现有卡片体系
```

## 8. UI Rendering Protocol

### 8.1 UI 渲染职责

UI 负责：

1. 渲染会话。
2. 渲染 Timeline / Stepper。
3. 渲染 Tool Card。
4. 渲染结果卡。
5. 渲染表格和图表。
6. 渲染来源。
7. 渲染缺字段和建议动作。
8. 折叠大段工具详情。

UI 不负责：

1. 判断业务是否成功。
2. 猜测 MCP 是否调用过。
3. 从自然语言里提取数据事实。
4. 把失败伪装成成功。
5. 直接读取未脱敏 raw error 给普通用户。

### 8.0 设计系统边界

UI Rendering Protocol 只定义“展示什么”和“按什么协议展示”。字体、色彩、背景、Ant Design token、CSS token、硬编码色值治理和移动端视觉验收，以 `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md` 为准。

Ant Design X 仍是会话与 AI 组件体系真源，但不替代 MessagePart 渲染协议。MCP / Skill 可以给出组件建议，最终展示形态由 Chat UI Renderer 基于 Result / Timeline / MessagePart 决定。

### 8.2 卡片类型

| 卡片 | 对应 MessagePart | 当前映射 |
|---|---|---|
| 普通文本 | `text` | `MessageSurface` |
| Timeline / Stepper | `timeline` | `thinkingSteps`, `process_events` |
| Tool Card | `tool_card` | `toolCalls`, process event adapter |
| 问数结果 | `result_card`, `table`, `chart` | `ReportQueryResultCard`, `DataVizRenderer` |
| 缺字段 | `missing_fields` | `MissingFieldPanel` |
| 来源 | `source_refs` | `SourceReferenceStrip`，当前部分隐藏 |
| 折叠详情 | `collapsible` | 需要标准化使用 |

### 8.3 会话区产品化规则

1. 会话区是主产品入口，不是日志面板。
2. 结果优先使用卡片表达，正文只负责解释和串联。
3. 每次工具调用都应可追溯，但默认折叠技术细节。
4. 用户只看到业务可理解的失败原因，不看内部 raw stack。
5. 数据可视化必须来自真实结构化数据。
6. 空结果要展示查询条件和下一步，不展示虚构趋势。

## 9. Intent Router Protocol

Intent Router 输出：

```ts
type IntentRouteDecision = {
  intent_type: IntentType;
  agent: AgentType | string;
  workflow_level: 'light' | 'heavy';
  is_business_related: boolean;
  reason: string;
  confidence?: 'high' | 'medium' | 'low';
  missing_fields?: MissingField[];
};
```

当前映射：

- `intent-router.ts`
- `intent-route-engine.ts`
- `intent-route-rules.ts`
- `/api/xiaoqiao/agents/intent-route`
- `/api/chat` 中的 `routeUserIntent`

Intent Router 不应直接调用 MCP。它只给出路由判断和初始缺字段。

## 10. Skill Router Protocol

Skill Router 接收：

- `IntentRouteDecision`
- `CompiledContextPackage`
- 当前启用的 `SkillContract[]`
- 当前启用的 `McpServerConfig[]`
- 用户权限和项目范围

Skill Router 输出：

```ts
type SkillRouteDecision = {
  skill_id?: string;
  status: 'selected' | 'missing_input' | 'not_configured' | 'rejected';
  reason: string;
  required_fields?: MissingField[];
  candidate_skills?: Array<{ skill_id: string; score: number; reason: string }>;
};
```

当前代码还没有独立 Skill Router 文件。近期不需要创建复杂 Runtime，可先在业务 orchestrator 中保持轻量选择逻辑，但输出必须逐步对齐该协议。

## 11. 权限与范围协议

所有会触发用户数据读取、workflow 写入或 MCP 调用的链路必须先得到有效范围。

标准结构：

```ts
type EffectiveScope = {
  user_scope_key: string;
  conversation_id?: string;
  project_refs: Array<{ app_id?: string; app_name?: string }>;
  permission_status: 'allowed' | 'blocked' | 'needs_clarification';
  blocked_reason?: string;
};
```

当前已有：

- `resolveUserScopeFromRequest`
- `getUserScopeKey`
- per-user runtime data path
- conversation / attachment / task API 局部使用 scope

必须补齐：

- `/api/chat` 必须解析用户 scope。
- `/api/chat` 必须校验 conversation ownership。
- MCP 入参必须只来自 `EffectiveScope.project_refs`。

## 12. 持久化协议

一条 assistant message 至少应持久化：

```ts
type PersistedAssistantMessageMetadata = {
  process_events?: AgentProcessEvent[];
  workflow_result?: WorkflowResult;
  response_contract?: ResponseContract;
  message_parts?: MessagePart[];
  compiled_context?: CompiledContextPackage;
  routing_decision?: unknown;
};
```

当前已有：

- `conversation-store.ts` 支持 `thinking_steps`、`tool_calls`、`process_events`、`metadata`。
- `/api/chat` 在 `done.metadata` 输出 `process_events`、`compiled_context`、`routing_decision`、问数结构。
- `useConversation` 保存 assistant message 时保留 metadata。

下一步要求：

- 新消息写入 `response_contract`。
- 新消息写入 `message_parts`。
- 旧消息继续兼容 `process_events` / `workflow_result`。

## 13. 当前阶段优先级

> 状态标注（2026-06-16）：✅ 已完成 🟡 大部分完成/进行中 🔴 未开始
> 详细追踪见 `NEXT_IMPLEMENTATION_PLAN.md` §P0 状态追踪表。

P0：

1. ✅ `ResponseContract` 类型和派生函数 — `lib/response-contract.ts` + `contracts/result-assembly/` 已落地
2. ✅ `MessagePart` 类型和派生函数 — `contracts/disclosure/` + `contracts/presentation/` 已落地
3. ✅ 乱码扫描门禁 — `check:encoding` + `fix:encoding` 已接入
4. ✅ Enterprise AI Chat OS 总纲接入 — `docs/architecture/` 119 个规范 + `validate:ad-ui` 门禁
5. ✅ AI Chat OS 扩展规范补全 — `contracts/` 68 个类型文件 + `docs/architecture/` 完整覆盖
6. 🟡 `/api/chat` 用户 scope、会话归属、项目权限校验 — conversation-store 护栏已落地，完整 scope 校验待确认
7. 🟡 `ChatContainer` 优先消费 MessagePart — `MessagePresentationRenderer` 已存在，legacy 路径简化中
8. 🟡 问数链路 mapping 从 `partial` 推进到可验收 — 测试脚本存在，mapping 进度待验证

P1：

1. 🔴 SourceRef 默认展示恢复。
2. 🔴 Tool Card 折叠详情统一。
3. 🔴 管理后台显示 MCP capability preflight 和 mapping gap。
4. 🔴 Workflow run 与 Timeline 统一回放。
5. 🔴 评测用例检查 `response_contract` 和 `message_parts`。

暂不做：

1. 复杂 Multi-Agent Runtime。
2. 独立 Agent 调度平台。
3. 新聊天渲染框架替换。
4. 将 MCP workflow 重写到 Chat Runtime。
5. 用 mock 数据补业务结论。

## 14. 不变量

以下规则不得被局部需求覆盖：

1. 真实业务事实来自 MCP / Skill / workflow / 知识库 / 用户输入，不来自 UI 猜测。
2. Chat Runtime 只做薄编排和协议转换。
3. MCP / Skill 是厚能力层。
4. Timeline 是可披露过程，不是模型私有思考。
5. MessagePart 是展示协议，不是业务事实源。
6. Result Protocol 是 UI 判断状态的唯一入口。
7. 无权限、未配置、缺字段、空结果、失败必须区分。
8. 未配置真实能力时，不展示为已完成。
9. 数据卡和图表必须来自结构化数据。
10. 所有新能力必须能映射到当前代码文件和协议字段。
