# PMAIOS 企业级 Chat「过程与依据披露层」设计、展示与实施 Spec

> 面向 Codex CLI / 工程实现的总纲级方案。目标是在 PMAIOS 既有总纲架构下，把企业级 Chat 的回答过程、数据依据、字段口径、质量检查、原始排障信息统一为一个可治理、可审计、可扩展的 Disclosure Layer。  
> 本方案不做前端硬编码，不围绕单一报表工具局部修补；所有展示都来自后端标准契约、运行时事件、证据包、字段目录和 Trace Projection。

---

## 0. Codex CLI 执行目标

请在现有代码库中实现 **Enterprise Chat Process & Evidence Disclosure Layer v1**。优先保持兼容，先落地标准数据契约、Projection Builder、Chat 右侧面板展示、质量检查和 Legacy Adapter。不要把工具名、字段名、业务指标口径写死在前端。

实施时遵循以下顺序：

1. 搜索现有 `message`、`trace`、`tool_call`、`source`、`artifact`、`field`、`report`、`runtime`、`workflow`、`mcp` 相关代码。
2. 新增共享类型与契约：`MessageDisclosureView`、`ExecutionStep`、`EvidenceBundle`、`FieldCatalogView`、`QualityCheck`、`ToolResultEnvelope`、`DisclosureEvent`。
3. 新增或改造后端 Projection Builder：从 runtime events / tool calls / trace spans / artifacts / field catalog / quality checks 生成 `MessageDisclosureView`。
4. 新增 Chat UI 右侧「过程与依据」抽屉/侧栏，默认展示概览，不默认展示 raw JSON。
5. 将现有「来源」入口兼容升级为「过程与依据」，保留旧数据适配，避免破坏当前功能。
6. 增加单元测试、组件测试、端到端验收用例。

---

## 1. 设计定位

### 1.1 模块名称

统一命名为：

```text
过程与依据披露层
Process & Evidence Disclosure Layer
```

不要继续把该能力狭义命名为「来源」。来源只是证据的一类；企业级 Chat 需要同时披露：

- 系统把用户问题理解成了什么。
- 提取了哪些参数。
- 选择了哪个 Skill / Workflow / Tool / MCP。
- 请求参数是什么。
- 返回参数是什么。
- 数据或知识依据来自哪里。
- 返回字段是什么意思。
- 字段是否覆盖用户问题。
- 是否存在质量风险。
- 完整 Trace 在哪里查看。

### 1.2 总纲架构位置

在 PMAIOS 总纲架构下，本模块是 **横切披露层**，不替代 Runtime、Trace、Artifact、Skill Contract 或 Chat UI。

```text
Chat UI
  └─ ProcessEvidenceDrawer / Disclosure Viewer

Disclosure Projection Service
  ├─ MessageDisclosureView Builder
  ├─ Legacy Tool Result Adapter
  ├─ Quality Check Engine
  └─ Redaction / Permission Projection

PMAIOS Runtime / Kernel
  ├─ Intent Understanding
  ├─ Slot Extraction
  ├─ Skill Contract Resolution
  ├─ Workflow / MCP Orchestration
  ├─ Tool Execution
  └─ Response Generation

Evidence / Artifact Store
  ├─ SourceRefs
  ├─ EvidenceItems
  ├─ Result Tables
  ├─ Files / Documents
  └─ Raw Artifacts

Catalog Layer
  ├─ Skill Catalog
  ├─ Tool Capability Descriptor
  ├─ Field / Metric Catalog
  └─ Report Schema / Semantic Layer

Observability / Trace
  ├─ Trace
  ├─ Span Tree
  ├─ Events
  ├─ Logs
  └─ Costs / Latency / Errors
```

### 1.3 职责边界

| 层 | 负责 | 不负责 |
|---|---|---|
| Chat UI | 展示 `MessageDisclosureView` | 猜字段含义、解析工具私有结构、硬编码业务指标 |
| Projection Service | 汇总过程、证据、字段、质量检查 | 执行业务查询、保存完整工程日志 |
| Runtime / Kernel | 产生日志、事件、span、tool envelope | 面向用户组织披露页面 |
| Evidence Store | 保存证据、结果、artifact | 生成 UI 展示文案 |
| Field / Metric Catalog | 提供字段定义和口径 | 让前端按字段名猜测中文名 |
| Observability | 保存完整 trace | 直接暴露全部内部实现给普通用户 |

核心原则：

```text
消息正文负责结果。
过程与依据侧栏负责可读披露。
观测平台负责完整工程 Trace。
```

---

## 2. 核心原则

### 2.1 不披露隐藏思维链，披露可审计过程

可展示：

- 可解释判断摘要。
- 执行阶段。
- 规范化请求参数。
- 脱敏后的工具请求与返回。
- 数据来源与证据项。
- 字段口径。
- 质量检查结果。
- Trace ID 和跳转链接。

不可展示：

- 模型隐藏思维链全文。
- 系统提示词全文。
- 密钥、token、内部安全策略。
- 未脱敏个人信息和敏感权限信息。
- 不应对当前用户披露的上下文、缓存和策略细节。

### 2.2 Tool Call 不是完整过程

工具调用只是 Trace 的叶子节点或中间节点。完整过程至少包括：

```text
理解问题
→ 加载上下文
→ 提取槽位
→ 解析 Skill Contract
→ 权限检查
→ 编排 Workflow / MCP
→ 调用工具
→ 读取证据
→ 字段口径解析
→ 质量检查
→ 生成回复
→ 渲染 UI
```

### 2.3 Source 不是全部依据

「来源」只表示 source refs。企业级依据还包括：

- 查询条件。
- 数据快照时间。
- 报表 ID / 查询 ID。
- 返回字段。
- 字段定义。
- 结果 artifact。
- 召回片段。
- 工具响应摘要。
- 质量检查结论。

### 2.4 前端只消费 Projection

前端不得直接从 raw JSON 中猜：

- 当前是哪一步。
- 哪些字段是注册数。
- 哪个工具是报表查询。
- 哪个 JSON key 是来源。
- 哪个 warning 需要展示。

前端只读取标准契约：

```text
MessageDisclosureView
```

### 2.5 支持多轮、多步骤、单消息默认

点击某条消息的「过程与依据」时，默认展示：

```text
scope = message
```

侧栏可切换：

```text
本次回复 message
当前任务 task
全会话 conversation
```

但 v1 必须先实现 message scope，task / conversation 可作为后续增强。

---

## 3. 用户体验设计

### 3.1 消息操作入口

消息操作栏入口从「来源」升级为：

```text
过程与依据
```

兼容旧入口：如果已有「来源」按钮，点击后打开同一个侧栏，并默认定位到「数据依据」tab。

### 3.2 右侧侧栏信息架构

侧栏标题：

```text
过程与依据
```

顶部 Header 展示本次执行摘要：

```text
状态：已完成 / 部分完成 / 失败 / 运行中
耗时：8127ms
执行步骤：7
工具调用：1
数据来源：0 / 1 / N
返回字段：7
字段口径：0/7 已匹配
质量检查：3 个警告
Trace ID：trace_xxx
```

Tab 结构：

```text
概览
执行链路
数据依据
字段口径
质量检查
原始信息
```

默认打开「概览」。不要默认展示 raw JSON。

### 3.3 概览 Tab

面向普通业务用户，回答四件事：

1. 系统理解了什么。
2. 系统实际做了什么。
3. 结果依据来自哪里。
4. 有没有需要注意的问题。

展示结构：

```text
本次回答摘要
- 任务类型：报表查询
- 识别对象：指间山海
- 时间范围：2026-03-01 至 2026-03-15
- 用户请求指标：激活数、注册数

执行摘要
- 匹配能力：report.query
- 调用工具：1 次
- 返回结果：1 个数据结果，7 个字段
- 完整 Trace：可在观测平台查看

注意事项
- 字段口径缺失：7 个字段未匹配指标字典
- 指标覆盖待确认：未发现明确的激活数字段
- 来源元数据缺失：工具未返回 source_refs / query_id / snapshot_at
```

### 3.4 执行链路 Tab

展示阶段树或时间线。标准阶段如下，未知阶段用通用 StepCard 展示，不得丢弃：

```text
understanding
context_loading
slot_extract
skill_contract
permission_check
workflow
mcp_orchestration
tool_call
data_fetching
analysis
field_resolution
quality_check
response_generation
rendering
```

每个 StepCard 展示：

```text
状态图标：success / warning / failed / skipped / running
步骤标题
阶段类型
耗时
组件名
输入摘要
输出摘要
告警
展开查看：请求参数、返回摘要、关联 span_id、raw artifact ref
```

不要在列表层直接展开完整 JSON。JSON 只在展开态或「原始信息」中展示。

### 3.5 数据依据 Tab

面向「数据从哪来」。展示：

- 外部文档 / 网页来源。
- 内部报表 / 数据 API 来源。
- MCP 工具来源。
- 文件 / 知识库 / 数据库来源。
- 查询结果 artifact。
- source 缺失原因。

空状态必须解释，不允许只显示「空」。

场景 A：没有外部来源，但有内部工具依据：

```text
本次未引用外部文档或网页。
回答依据来自内部工具调用结果。
```

场景 B：工具未返回来源元数据：

```text
本次工具调用未返回可展示的 source_refs。
建议检查工具响应是否补充 source_refs、query_id、snapshot_at、report_id。
```

场景 C：本次未调用工具：

```text
本次回答未调用外部工具，基于当前对话上下文生成。
```

### 3.6 字段口径 Tab

展示字段与指标目录的匹配状态。字段定义必须来自 Catalog / Semantic Layer / ToolResultEnvelope，不允许前端按字段名硬猜。

字段表列：

| 列 | 说明 |
|---|---|
| 字段 | 原始字段名 |
| 中文名 | catalog label |
| 类型 | number / string / date / ratio / money 等 |
| 单位 | 元 / 人 / 次 / % 等 |
| 口径 | 指标定义摘要 |
| 计算公式 | 可选 |
| 归因窗口 | 可选 |
| 目录版本 | catalog_version |
| 状态 | matched / ambiguous / unmatched / masked |

字段覆盖检查：

```text
用户请求指标 requested_metrics
实际返回字段 returned_fields
字段目录匹配 field_catalog
质量检查 metric_coverage
```

如果字段未匹配：

```text
返回 7 个字段，其中 0 个命中指标字典。
无法确认 composite_ltv24_reg_cnt 是否等价于“注册数”。
建议在 Field Catalog 中补充映射。
```

### 3.7 质量检查 Tab

质量检查由后端生成，前端只渲染。v1 内置检查：

| 检查 | 目的 |
|---|---|
| intent_slot_completeness | 用户请求是否被完整提取 |
| source_metadata_coverage | 是否有 source_refs / query_id / snapshot_at |
| field_catalog_coverage | 返回字段是否有口径 |
| requested_metric_coverage | 返回字段是否覆盖用户请求指标 |
| result_non_empty | 结果是否为空 |
| permission_redaction | 是否有脱敏或权限裁剪 |
| response_render_alignment | 正文使用的数据是否来自返回结果 |
| tool_error_warning | 工具是否失败、重试或降级 |

状态：

```text
pass
warning
fail
info
```

### 3.8 原始信息 Tab

面向研发 / 管理员。普通业务用户默认看不到敏感请求参数。

结构：

```text
Trace
- trace_id
- trace_url
- run_id
- message_id

Tool Calls
- tool_call_id
- capability
- status
- duration
- request_redacted
- response_redacted

Raw Artifacts
- runtime_state
- raw_result
- span_events
```

要求：

- 默认折叠。
- 提供复制按钮，但复制内容必须是脱敏版本。
- 标注权限状态：visible / redacted / hidden。
- 支持跳转完整观测平台。

---

## 4. 标准数据契约

### 4.1 MessageDisclosureView

所有 Chat 侧栏展示都基于该对象。

```ts
export type DisclosureScope = 'message' | 'task' | 'conversation';

export type DisclosureStatus =
  | 'running'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled';

export type DisclosureSeverity = 'info' | 'success' | 'warning' | 'error';

export type DisclosureVisibility = 'visible' | 'redacted' | 'hidden';

export type DisclosureStage =
  | 'understanding'
  | 'context_loading'
  | 'slot_extract'
  | 'skill_contract'
  | 'permission_check'
  | 'workflow'
  | 'mcp_orchestration'
  | 'tool_call'
  | 'data_fetching'
  | 'analysis'
  | 'field_resolution'
  | 'quality_check'
  | 'response_generation'
  | 'rendering'
  | 'unknown';

export interface MessageDisclosureView {
  schema_version: 'pmaios.disclosure.v1';

  tenant_id?: string;
  conversation_id: string;
  message_id: string;
  task_id?: string;
  run_id: string;
  trace_id?: string;
  trace_url?: string;
  scope: DisclosureScope;

  status: DisclosureStatus;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;

  summary: DisclosureSummary;
  intent?: IntentDisclosure;
  route?: RouteDisclosure;
  steps: ExecutionStep[];
  evidence: EvidenceBundle;
  fields: FieldCatalogView;
  quality: QualityCheck[];
  raw: RawInfoBundle;
  permissions: DisclosurePermissionView;
  ui_hints?: DisclosureUiHints;
}
```

### 4.2 Summary

```ts
export interface DisclosureSummary {
  title: string;
  description?: string;
  task_type?: string;

  counters: {
    step_count: number;
    tool_call_count: number;
    source_count: number;
    evidence_count: number;
    returned_field_count: number;
    matched_field_count: number;
    warning_count: number;
    error_count: number;
  };

  highlights: Array<{
    label: string;
    value: string | number;
    severity?: DisclosureSeverity;
  }>;

  warnings?: Array<{
    code: string;
    message: string;
    stage?: DisclosureStage;
  }>;
}
```

### 4.3 Intent Disclosure

```ts
export interface IntentDisclosure {
  raw_user_query?: string;
  intent_type?: string;
  normalized_task?: string;
  confidence?: number;

  slots: Array<{
    key: string;
    label?: string;
    value: unknown;
    display_value?: string;
    confidence?: number;
    source?: 'user' | 'context' | 'default' | 'inferred' | 'system';
  }>;

  requested_metrics?: Array<{
    key?: string;
    label: string;
    canonical_metric_id?: string;
    confidence?: number;
  }>;
}
```

### 4.4 Route Disclosure

```ts
export interface RouteDisclosure {
  task_intent?: string;
  skill_contract_id?: string;
  skill_contract_version?: string;
  workflow_id?: string;
  workflow_version?: string;
  agent_id?: string;

  capabilities: Array<{
    capability_id: string;
    name?: string;
    type: 'tool' | 'workflow' | 'mcp' | 'model' | 'retriever' | 'renderer' | 'other';
    descriptor_version?: string;
  }>;
}
```

### 4.5 Execution Step

```ts
export interface ExecutionStep {
  step_id: string;
  parent_step_id?: string;
  order: number;
  stage: DisclosureStage;
  title: string;
  status: 'running' | 'success' | 'warning' | 'failed' | 'skipped';
  severity?: DisclosureSeverity;

  component?: string;
  capability_id?: string;
  span_id?: string;
  parent_span_id?: string;
  tool_call_id?: string;

  started_at?: string;
  completed_at?: string;
  duration_ms?: number;

  input_summary?: string;
  output_summary?: string;

  request?: RedactedPayload;
  response?: RedactedPayload;

  artifacts?: Array<ArtifactRef>;

  warnings?: Array<{
    code: string;
    message: string;
    suggestion?: string;
  }>;

  errors?: Array<{
    code: string;
    message: string;
    retryable?: boolean;
  }>;
}

export interface RedactedPayload {
  visibility: DisclosureVisibility;
  redaction_reason?: string;
  content_type: 'json' | 'text' | 'table' | 'markdown' | 'binary_ref';
  data?: unknown;
  artifact_id?: string;
}

export interface ArtifactRef {
  artifact_id: string;
  type: 'table' | 'json' | 'text' | 'file' | 'image' | 'chart' | 'log' | 'other';
  title?: string;
  preview_url?: string;
  download_url?: string;
  visibility?: DisclosureVisibility;
}
```

### 4.6 Evidence Bundle

```ts
export interface EvidenceBundle {
  sources: SourceRef[];
  items: EvidenceItem[];

  empty_state?: {
    reason:
      | 'no_tool_call'
      | 'no_external_source'
      | 'source_metadata_missing'
      | 'permission_hidden'
      | 'not_applicable';
    message: string;
    suggestion?: string;
  };
}

export interface SourceRef {
  source_id: string;
  type:
    | 'data_api'
    | 'report'
    | 'database'
    | 'knowledge_base'
    | 'file'
    | 'web'
    | 'mcp_tool'
    | 'runtime_context'
    | 'conversation'
    | 'other';

  name: string;
  description?: string;
  owner?: string;

  query_id?: string;
  report_id?: string;
  dataset_id?: string;
  table_name?: string;
  snapshot_at?: string;
  catalog_version?: string;

  permission_status?: 'allowed' | 'redacted' | 'hidden' | 'denied';
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceItem {
  evidence_id: string;
  source_id?: string;
  type:
    | 'metric'
    | 'table'
    | 'document_snippet'
    | 'query_result'
    | 'tool_response'
    | 'file_excerpt'
    | 'chart'
    | 'log'
    | 'other';

  title: string;
  summary?: string;
  artifact_id?: string;
  preview?: RedactedPayload;
  related_fields?: string[];
  related_steps?: string[];
}
```

### 4.7 Field Catalog View

```ts
export interface FieldCatalogView {
  returned_fields: FieldDefinition[];
  requested_metric_alignment?: MetricAlignment[];

  coverage: {
    returned_field_count: number;
    matched_count: number;
    ambiguous_count: number;
    unmatched_count: number;
    masked_count: number;
  };

  empty_state?: {
    reason: 'no_returned_fields' | 'catalog_missing' | 'permission_hidden' | 'not_applicable';
    message: string;
    suggestion?: string;
  };
}

export interface FieldDefinition {
  field: string;
  label?: string;
  description?: string;
  data_type?: string;
  unit?: string;
  formula?: string;
  aggregation?: string;
  attribution_window?: string;
  semantic_type?: 'metric' | 'dimension' | 'time' | 'identifier' | 'unknown';

  catalog_status: 'matched' | 'ambiguous' | 'unmatched' | 'masked';
  catalog_id?: string;
  catalog_version?: string;
  confidence?: number;

  warnings?: Array<{
    code: string;
    message: string;
  }>;
}

export interface MetricAlignment {
  requested_label: string;
  canonical_metric_id?: string;
  status: 'covered' | 'partially_covered' | 'not_covered' | 'ambiguous';
  matched_fields: string[];
  message?: string;
}
```

### 4.8 Quality Check

```ts
export interface QualityCheck {
  check_id: string;
  code: string;
  title: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  stage?: DisclosureStage;
  severity: DisclosureSeverity;
  message: string;
  suggestion?: string;
  affected_steps?: string[];
  affected_fields?: string[];
  evidence_ids?: string[];
}
```

### 4.9 Raw Info Bundle

```ts
export interface RawInfoBundle {
  visibility: DisclosureVisibility;
  redaction_reason?: string;

  trace?: {
    trace_id?: string;
    trace_url?: string;
    run_id: string;
  };

  tool_calls: Array<{
    tool_call_id: string;
    capability_id?: string;
    operation?: string;
    status: string;
    duration_ms?: number;
    request?: RedactedPayload;
    response?: RedactedPayload;
    span_id?: string;
  }>;

  artifacts: ArtifactRef[];

  legacy_raw?: RedactedPayload;
}
```

### 4.10 Permission View

```ts
export interface DisclosurePermissionView {
  viewer_role?: 'viewer' | 'business' | 'developer' | 'admin';
  can_view_raw_request: boolean;
  can_view_raw_response: boolean;
  can_view_trace_url: boolean;
  can_copy_raw: boolean;

  redactions: Array<{
    path: string;
    reason: string;
  }>;
}

export interface DisclosureUiHints {
  default_tab?: 'overview' | 'execution' | 'evidence' | 'fields' | 'quality' | 'raw';
  initially_expanded_step_ids?: string[];
  preferred_density?: 'comfortable' | 'compact';
}
```

---

## 5. Runtime 与工具返回契约

### 5.1 Disclosure Event

Runtime / Kernel 在关键节点发出事件，Projection Builder 使用这些事件构造步骤。

```ts
export interface DisclosureEvent {
  schema_version: 'pmaios.disclosure_event.v1';
  event_id: string;
  tenant_id?: string;
  conversation_id: string;
  message_id: string;
  task_id?: string;
  run_id: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;

  timestamp: string;
  stage: DisclosureStage;
  event_type:
    | 'stage_started'
    | 'stage_completed'
    | 'stage_warning'
    | 'stage_failed'
    | 'artifact_created'
    | 'source_attached'
    | 'field_resolved'
    | 'quality_check';

  title?: string;
  input_summary?: string;
  output_summary?: string;
  payload?: unknown;
  visibility?: DisclosureVisibility;
}
```

### 5.2 Tool Result Envelope

所有工具、MCP、Workflow 节点不要只返回自由 JSON，应统一包一层 envelope。工具原始响应仍可保存在 artifact/raw 中。

```ts
export interface ToolResultEnvelope<T = unknown> {
  schema_version: 'pmaios.tool_result.v1';
  tool_call_id: string;
  capability_id: string;
  operation?: string;
  status: 'success' | 'partial' | 'failed';

  trace_id?: string;
  span_id?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;

  request_redacted?: unknown;
  response_redacted?: T;

  source_refs?: SourceRef[];
  evidence_items?: EvidenceItem[];
  artifacts?: ArtifactRef[];

  returned_fields?: Array<{
    field: string;
    data_type?: string;
    semantic_type?: string;
  }>;

  field_catalog_refs?: Array<{
    field: string;
    catalog_id?: string;
    catalog_version?: string;
    status: 'matched' | 'ambiguous' | 'unmatched' | 'masked';
  }>;

  warnings?: Array<{
    code: string;
    message: string;
    suggestion?: string;
  }>;

  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}
```

### 5.3 能力描述符

不要在 UI 里按工具名判断如何展示。工具应在 Catalog 层注册 capability descriptor。

```ts
export interface CapabilityDescriptor {
  capability_id: string;
  display_name: string;
  type: 'tool' | 'workflow' | 'mcp' | 'retriever' | 'renderer' | 'other';
  version: string;

  input_schema_id?: string;
  output_schema_id?: string;
  field_catalog_namespace?: string;
  source_ref_strategy?: 'required' | 'optional' | 'not_applicable';

  disclosure: {
    default_stage: DisclosureStage;
    display_group?: string;
    raw_visibility_default: DisclosureVisibility;
    evidence_required?: boolean;
    field_resolution_required?: boolean;
  };
}
```

---

## 6. Projection Builder 设计

### 6.1 输入

Projection Builder 输入来自多个源：

```text
message metadata
runtime events
trace spans
tool result envelopes
artifacts
source refs
field catalog
metric catalog
quality check rules
permission / redaction policy
legacy raw execution detail
```

### 6.2 输出

输出唯一标准对象：

```text
MessageDisclosureView
```

### 6.3 构建流程

```text
1. load message/run/task context
2. load runtime events by run_id/message_id
3. load trace spans by trace_id
4. load tool result envelopes
5. normalize steps
6. attach source refs and evidence items
7. resolve returned fields using field catalog
8. align requested metrics with returned fields
9. run quality checks
10. apply permission projection and redaction
11. emit MessageDisclosureView
```

### 6.4 伪代码

```ts
export async function buildMessageDisclosureView(input: {
  tenantId?: string;
  conversationId: string;
  messageId: string;
  runId: string;
  scope: DisclosureScope;
  viewer: DisclosureViewer;
}): Promise<MessageDisclosureView> {
  const message = await messageRepo.get(input.messageId);
  const run = await runRepo.get(input.runId);
  const events = await disclosureEventRepo.listByRun(input.runId);
  const spans = run.trace_id ? await traceRepo.listSpans(run.trace_id) : [];
  const toolResults = await toolResultRepo.listByRun(input.runId);
  const artifacts = await artifactRepo.listByRun(input.runId);

  const legacy = await legacyExecutionRepo.tryLoad(input.messageId);

  const normalized = normalizeDisclosureInputs({
    message,
    run,
    events,
    spans,
    toolResults,
    artifacts,
    legacy,
  });

  const intent = buildIntentDisclosure(normalized);
  const route = buildRouteDisclosure(normalized);
  const steps = buildExecutionSteps(normalized);
  const evidence = buildEvidenceBundle(normalized);

  const fields = await resolveFieldCatalog({
    returnedFields: normalized.returnedFields,
    requestedMetrics: intent?.requested_metrics ?? [],
    capabilityIds: route?.capabilities.map(c => c.capability_id) ?? [],
    tenantId: input.tenantId,
  });

  const quality = runDisclosureQualityChecks({
    intent,
    route,
    steps,
    evidence,
    fields,
    normalized,
  });

  const raw = buildRawInfoBundle(normalized);

  const projected = applyDisclosurePolicy({
    view: assembleView({
      message,
      run,
      input,
      intent,
      route,
      steps,
      evidence,
      fields,
      quality,
      raw,
    }),
    viewer: input.viewer,
  });

  return projected;
}
```

### 6.5 Legacy Adapter

为了兼容当前只有「工具调用、执行详情、原始返回代码块」的情况，新增 Legacy Adapter。注意：这是兼容层，不是长期设计，不允许把具体报表字段硬编码在其中。

Legacy Adapter 做的事情：

- 如果没有标准 steps，则从 existing tool calls 生成一个 `tool_call` step。
- 如果有 runtime_state.completed_stages，则生成对应 stage summary。
- 如果 raw_result 中能发现字段列表，则放入 `returned_fields`，catalog_status 置为 `unmatched`。
- 如果没有 source_refs，则生成 `source_metadata_missing` empty_state。
- 如果没有 field catalog，则生成 `catalog_missing` empty_state。
- 生成质量检查 warning，而不是让 UI 只显示空。

禁止：

- 不允许将 `composite_ltv24_reg_cnt` 写死成注册数。
- 不允许按字段前缀推断业务口径。
- 不允许 UI 直接读取 legacy raw 来展示字段说明。

---

## 7. 质量检查规则

### 7.1 source_metadata_coverage

触发条件：

```text
有工具调用 / 数据结果，但 evidence.sources 为空，且没有 source_refs / query_id / snapshot_at。
```

输出：

```json
{
  "code": "source_metadata_coverage",
  "title": "来源元数据缺失",
  "status": "warning",
  "message": "本次工具调用未返回 source_refs、query_id 或 snapshot_at，无法展示数据来源和快照时间。",
  "suggestion": "请在 ToolResultEnvelope 中补充 source_refs 和数据快照元信息。"
}
```

### 7.2 field_catalog_coverage

触发条件：

```text
returned_field_count > 0 且 matched_count / returned_field_count 低于阈值，v1 阈值为 1.0，可配置。
```

输出：

```text
返回 N 个字段，其中 M 个命中指标字典。未命中字段无法展示中文名、单位和业务口径。
```

### 7.3 requested_metric_coverage

触发条件：

```text
intent.requested_metrics 非空，但 FieldCatalogView.requested_metric_alignment 中存在 not_covered 或 ambiguous。
```

输出：

```text
用户请求“激活数、注册数”，但返回字段未能明确覆盖其中部分指标。
```

### 7.4 result_non_empty

触发条件：

```text
工具成功但没有 evidence item / artifact / response rows。
```

输出：

```text
工具调用成功，但未发现可展示的数据结果。
```

### 7.5 response_render_alignment

触发条件：

```text
正文提到了某指标或结论，但没有关联 evidence_id / field / artifact。
```

v1 可先弱实现：如果 answer metadata 中没有 `used_evidence_ids`，提示 `info`，不阻断。

### 7.6 permission_redaction

触发条件：

```text
任意 payload visibility 为 redacted / hidden。
```

输出：

```text
部分请求或返回因权限策略被隐藏或脱敏。
```

---

## 8. 前端展示实现

### 8.1 组件树

建议组件结构：

```text
ProcessEvidenceButton
ProcessEvidenceDrawer
  DisclosureHeader
  DisclosureScopeSwitch
  DisclosureTabs
    OverviewTab
    ExecutionChainTab
      ExecutionStepTree
      ExecutionStepCard
      StepPayloadPreview
    EvidenceTab
      SourceCardList
      EvidenceItemList
      EmptyStateExplainer
    FieldCatalogTab
      FieldCoverageSummary
      FieldDefinitionTable
      MetricAlignmentList
    QualityCheckTab
      QualityCheckSummary
      QualityCheckList
    RawInfoTab
      TraceInfoCard
      RawToolCallList
      RedactedJsonViewer
```

### 8.2 数据 Hook

```ts
export function useMessageDisclosure(params: {
  messageId: string;
  runId?: string;
  scope?: DisclosureScope;
}) {
  // fetch GET /api/chat/messages/:messageId/disclosure?scope=message
  // return { data, loading, error, refetch }
}
```

### 8.3 API

```http
GET /api/chat/messages/:messageId/disclosure?scope=message
```

响应：

```ts
MessageDisclosureView
```

错误：

```json
{
  "error": {
    "code": "disclosure_not_found",
    "message": "未找到本条消息的过程与依据记录。",
    "trace_id": "..."
  }
}
```

### 8.4 UI 状态

必须支持：

```text
loading
empty
partial
completed
failed
permission_hidden
legacy_only
```

### 8.5 空状态规范

不要只显示「空」。必须展示原因、影响和建议。

示例：

```text
未返回字段说明
本次返回了 7 个字段，但没有任何字段命中指标字典，因此无法展示中文名、单位或口径。
建议：检查工具响应的 returned_fields / field_catalog_refs，或补充 Field Catalog 映射。
```

### 8.6 可访问性与可读性

- 质量状态颜色不能作为唯一信息来源，必须有文字状态。
- 所有折叠卡片标题包含状态、阶段和摘要。
- JSON Viewer 支持复制脱敏内容。
- 大 JSON 默认折叠，只展示摘要和大小。

---

## 9. 权限、脱敏与安全

### 9.1 角色分层

| 角色 | 可看内容 |
|---|---|
| viewer | 概览、质量摘要、非敏感来源、字段口径 |
| business | 查询条件摘要、字段定义、结果证据、普通质量检查 |
| developer | 脱敏 request / response、span_id、tool_call_id |
| admin | 更多 raw artifact 和 trace 跳转，仍需脱敏密钥 |

### 9.2 脱敏策略

必须默认脱敏：

```text
token
api_key
authorization
cookie
password
secret
手机号
身份证
邮箱
精确用户标识
权限策略细节
系统提示词
```

### 9.3 权限投影

Projection Builder 在返回前执行权限投影，而不是让前端隐藏敏感内容。

```text
后端返回给前端的数据已经是当前 viewer 可见版本。
```

---

## 10. Trace 设计

### 10.1 Trace 与 Disclosure 的关系

```text
完整 Trace：工程全链路，可在观测平台查看。
Disclosure：面向 Chat 用户的可披露投影。
```

Trace 应包含完整可观测过程，但 Chat 侧栏不展示全部内部细节。

### 10.2 推荐 Span Tree

```text
trace: chat.message.run
├─ runtime.context_loading
├─ agent.understanding
├─ agent.slot_extract
├─ skill_contract.resolve
├─ permission.check
├─ workflow.execute
│  ├─ mcp.orchestrate
│  └─ tool.report.query
├─ field_catalog.resolve
├─ quality_check.run
├─ response.generate
└─ ui.render
```

### 10.3 Span 到 Step 的映射

- 一个 Step 可关联一个 span。
- 一个 Step 也可聚合多个低层 span。
- 未识别 span 不丢弃，归入 `unknown` 或 `raw trace events`。
- Step 使用 `order` 控制展示顺序，不依赖数组原始顺序。

---

## 11. 非硬编码落地策略

### 11.1 禁止项

```text
禁止前端判断 field.includes('reg') 就展示为注册数。
禁止前端判断 toolName === 'report_query' 才显示字段口径。
禁止把具体业务字段写在组件里。
禁止 raw JSON 作为默认页面。
禁止来源为空时只显示“空”。
```

### 11.2 正确做法

```text
字段说明来自 FieldCatalogView。
指标覆盖来自 MetricAlignment。
工具展示来自 CapabilityDescriptor。
来源展示来自 EvidenceBundle。
流程展示来自 ExecutionStep。
警告展示来自 QualityCheck。
原始信息展示来自 RawInfoBundle。
```

### 11.3 Renderer Registry

前端可以有通用渲染注册表，但注册表按 `content_type` / `evidence.type` / `artifact.type` 渲染，不按业务工具硬编码。

```ts
type DisclosureRenderer = (props: { payload: RedactedPayload }) => JSX.Element;

const payloadRendererRegistry: Record<string, DisclosureRenderer> = {
  json: JsonPayloadViewer,
  text: TextPayloadViewer,
  markdown: MarkdownPayloadViewer,
  table: TablePayloadViewer,
  binary_ref: ArtifactLinkViewer,
};
```

未知类型使用 GenericPayloadViewer。

---

## 12. 当前截图类问题在新设计下的表现

如果本次查询只有一个工具调用、没有 source_refs、没有 field_catalog，侧栏应展示：

```text
Header
- 状态：已完成
- 耗时：8127ms
- 工具调用：1
- 返回字段：7
- 字段口径：0/7 已匹配
- 来源元数据：缺失
- 质量检查：3 个警告
```

概览：

```text
本次完成报表查询，但存在可排查问题：
1. 工具未返回 source_refs / query_id / snapshot_at。
2. 返回字段未匹配指标字典。
3. 用户请求指标与返回字段覆盖关系无法确认。
```

字段口径：

```text
composite_pay_amount        未匹配
composite_ltv27_pay_amount  未匹配
composite_ltv30_pay_amount  未匹配
composite_start_total_pay_amount 未匹配
m_roi5_rate                 未匹配
composite_ltv10_pay_amount  未匹配
composite_ltv24_reg_cnt     未匹配
```

质量检查：

```text
warning source_metadata_coverage
warning field_catalog_coverage
warning requested_metric_coverage
```

原始信息：

```text
可展开查看脱敏 request / response / raw_result / trace_id。
```

用户不需要读 2259 行 JSON 就能定位：问题不是“没有过程”，而是“过程没有被结构化投影、数据来源元数据和字段口径缺失”。

---

## 13. 推荐目录与文件变更

请根据实际仓库结构调整，但保持职责分层。

```text
packages/shared/src/disclosure/
  types.ts
  schemas.ts
  constants.ts
  guards.ts

services/disclosure/
  buildMessageDisclosureView.ts
  normalizeDisclosureInputs.ts
  legacyDisclosureAdapter.ts
  fieldCatalogResolver.ts
  qualityChecks.ts
  permissionProjection.ts

apps/chat-web/src/features/disclosure/
  api.ts
  useMessageDisclosure.ts
  ProcessEvidenceButton.tsx
  ProcessEvidenceDrawer.tsx
  DisclosureHeader.tsx
  tabs/OverviewTab.tsx
  tabs/ExecutionChainTab.tsx
  tabs/EvidenceTab.tsx
  tabs/FieldCatalogTab.tsx
  tabs/QualityCheckTab.tsx
  tabs/RawInfoTab.tsx
  components/RedactedJsonViewer.tsx
  components/EmptyStateExplainer.tsx

apps/chat-web/src/messages/
  MessageActionBar.tsx  # 接入入口

server/routes/
  chatDisclosureRoute.ts

tests/disclosure/
  buildMessageDisclosureView.test.ts
  qualityChecks.test.ts
  legacyDisclosureAdapter.test.ts
  ProcessEvidenceDrawer.test.tsx
  disclosure.e2e.ts
```

---

## 14. 实施计划

### Phase 0：契约落地

- 新增共享 TypeScript 类型。
- 新增 JSON schema 或 zod schema。
- 新增 API 响应类型。
- 建立 feature flag：`processEvidenceDisclosureV1`。

验收：项目可编译，类型可被前后端引用。

### Phase 1：Projection Builder 与 Legacy Adapter

- 从现有 message/run/tool/execution detail 中构造最小 `MessageDisclosureView`。
- 无 source 时输出 `source_metadata_missing` empty_state。
- 无字段目录时输出 `catalog_missing` empty_state。
- raw JSON 放入 `raw.legacy_raw`，权限为 redacted 或 visible。

验收：当前截图类消息可以打开侧栏，看到概览、执行链路、数据依据空状态、字段未匹配、质量警告、原始信息。

### Phase 2：标准 ToolResultEnvelope 接入

- 新工具调用统一返回 envelope。
- 将 source_refs、evidence_items、returned_fields、field_catalog_refs 写入 envelope。
- Projection Builder 优先使用 envelope，legacy 仅兜底。

验收：标准工具可以展示来源、字段口径和 artifact。

### Phase 3：Chat UI

- 消息操作栏加入「过程与依据」。
- 右侧 Drawer 按 tabs 展示。
- 默认打开概览。
- Legacy「来源」入口跳转到同一 Drawer。
- 支持 loading / empty / warning / failed。

验收：普通用户无需阅读 raw JSON 即可理解执行过程和风险。

### Phase 4：质量检查与权限

- 接入质量检查规则。
- 接入后端权限投影。
- developer/admin 才可看脱敏 request/response。
- 所有 raw copy 都是脱敏版本。

验收：普通用户不可见敏感 raw；研发可排查。

### Phase 5：Trace 深度集成

- Trace span 与 ExecutionStep 对齐。
- Header 展示 trace_id。
- 原始信息中提供 trace_url。
- 支持跳转观测平台。

验收：Chat 侧可定位概要，复杂问题可跳转完整 Trace。

---

## 15. 测试用例

### 15.1 Unit Tests

1. `buildMessageDisclosureView` 能从标准 envelope 构造完整 view。
2. `legacyDisclosureAdapter` 能从旧 tool call/raw result 构造最小 view。
3. source_refs 缺失时生成 `source_metadata_coverage` warning。
4. returned_fields 有值但 catalog 无匹配时生成 `field_catalog_coverage` warning。
5. requested_metrics 未覆盖时生成 `requested_metric_coverage` warning。
6. 权限为 viewer 时 raw request/response 被 hidden 或 redacted。
7. 权限为 developer 时可见脱敏 raw。
8. 未知 stage 不丢失，显示为 unknown。

### 15.2 Component Tests

1. Drawer 默认打开 Overview。
2. Header counters 正确显示。
3. Evidence 空状态显示原因和建议。
4. Field table 展示 matched / unmatched 状态。
5. Quality tab 展示 pass/warning/fail。
6. Raw tab 默认折叠。
7. 旧「来源」入口可以打开 Drawer 并定位 Evidence tab。

### 15.3 E2E Tests

场景：报表查询，工具返回字段但无来源和字段口径。

预期：

```text
- 侧栏显示状态 completed。
- 工具调用数为 1。
- 返回字段数为 7。
- 字段匹配为 0/7。
- 质量检查至少有 source_metadata_coverage、field_catalog_coverage。
- 原始 JSON 不在默认页展示。
```

场景：标准工具返回 source_refs 和 field_catalog_refs。

预期：

```text
- 数据依据显示内部数据源。
- 字段口径显示中文名、单位、口径。
- 质量检查通过或仅 info。
```

---

## 16. 验收标准

模块达到 10 分时，用户无需看原始 JSON，也能回答：

```text
1. 系统把我的问题理解成了什么？
2. 提取了哪些参数？
3. 选择了哪个 Skill / Workflow / Tool？
4. 请求参数是什么？
5. 返回了什么数据？
6. 数据来自哪里？
7. 字段是什么意思？
8. 返回字段是否覆盖了我的问题？
9. 如果结果有问题，问题在哪个步骤？
10. 完整 Trace 去哪里看？
```

工程验收：

```text
- 不存在业务字段硬编码。
- 不存在工具名硬编码展示逻辑。
- 所有展示来自 MessageDisclosureView。
- source 空状态有解释。
- field catalog 缺失有 warning。
- raw JSON 不作为默认页。
- 权限脱敏由后端完成。
- Legacy 数据可兼容。
- 标准 envelope 可逐步迁移。
```

---

## 17. Codex CLI 实施指令

将以下内容作为 Codex CLI 的执行指令：

```text
Implement PMAIOS Enterprise Chat Process & Evidence Disclosure Layer v1.

Constraints:
- Do not hardcode business fields, report fields, or tool names in UI.
- UI must render only MessageDisclosureView.
- Backend must provide a Projection Builder that composes message, run, trace, tool results, artifacts, field catalog, and quality checks.
- Keep legacy compatibility with existing source/tool/execution/raw detail views.
- Raw JSON must not be the default view.
- Empty source/field states must explain why they are empty and how to fix upstream metadata.
- Apply server-side redaction and permission projection before returning data to UI.

Implementation steps:
1. Locate existing chat message action bar, source panel, trace/tool execution detail code, runtime result models, and API routes.
2. Add shared disclosure types and schemas.
3. Add buildMessageDisclosureView service with legacy adapter.
4. Add quality check rules for source metadata, field catalog coverage, requested metric coverage, result empty, permission redaction.
5. Add GET /api/chat/messages/:messageId/disclosure?scope=message endpoint or equivalent existing route.
6. Add ProcessEvidenceDrawer with tabs: Overview, Execution Chain, Evidence, Field Catalog, Quality Checks, Raw Info.
7. Replace or alias Source button with Process & Evidence button; keep backwards-compatible navigation to Evidence tab.
8. Add tests listed in this spec.
9. Ensure TypeScript strict mode passes and existing behavior is not broken.
10. Document migration path for ToolResultEnvelope adoption.
```

---

## 18. 后续演进

v1：message scope、legacy adapter、标准侧栏、质量检查。  
v2：task / conversation scope、多轮链路、并发工具调用可视化。  
v3：观测平台深链、trace replay、多次运行对比、自动诊断修复建议。  
v4：字段目录治理闭环，未匹配字段一键提交 Catalog 补充任务。


---

# Codex CLI Task: Implement PMAIOS Enterprise Chat Process & Evidence Disclosure Layer v1

## Goal

Implement a generic enterprise-grade Process & Evidence Disclosure Layer for Chat messages. The UI must no longer treat “source” as the whole disclosure surface. It must show a structured, permission-safe, message-scoped projection of process, evidence, field definitions, quality checks, and raw diagnostics.

## Non-negotiable constraints

- Do not hardcode report tool names, field names, or business metric meanings in UI.
- The Chat UI must render `MessageDisclosureView` only.
- Field explanations must come from Field / Metric Catalog or the standardized tool envelope, never frontend substring logic.
- Source empty state must explain the reason instead of showing only “empty”.
- Raw JSON must be available only in Raw Info and must not be the default tab.
- Server must perform redaction and permission projection before returning data to UI.
- Existing source/execution/raw-detail functionality must remain compatible via a Legacy Adapter.

## Implement in this order

1. Search the repository for existing code:
   - message action bar
   - source button/panel
   - trace or execution detail viewer
   - tool call models
   - runtime state models
   - artifact/source models
   - report query result handling
   - API routes for message details

2. Add shared types:
   - `MessageDisclosureView`
   - `ExecutionStep`
   - `EvidenceBundle`
   - `FieldCatalogView`
   - `QualityCheck`
   - `RawInfoBundle`
   - `DisclosureEvent`
   - `ToolResultEnvelope`

3. Add a Projection Builder:
   - input: message/run/tool calls/trace/events/artifacts/legacy raw
   - output: `MessageDisclosureView`
   - include `legacyDisclosureAdapter`
   - include server-side permission projection

4. Add quality checks:
   - `source_metadata_coverage`
   - `field_catalog_coverage`
   - `requested_metric_coverage`
   - `result_non_empty`
   - `permission_redaction`
   - `tool_error_warning`

5. Add API:
   - `GET /api/chat/messages/:messageId/disclosure?scope=message`
   - If existing route conventions differ, integrate with the existing routing style.

6. Add UI:
   - Rename/alias source entry to “过程与依据” / Process & Evidence.
   - Add right drawer with tabs:
     - Overview
     - Execution Chain
     - Evidence
     - Field Catalog
     - Quality Checks
     - Raw Info
   - Default tab is Overview.
   - Legacy source button may open Evidence tab.

7. Add tests:
   - Builder from standard envelope.
   - Builder from legacy raw details.
   - Missing source metadata warning.
   - Missing field catalog warning.
   - Requested metric not covered warning.
   - UI empty states.
   - Raw JSON not shown by default.

## Acceptance scenario

Given a message with one tool call, raw result fields, no source refs, and no field catalog:

- Header shows completed state, 1 tool call, returned field count, 0 matched fields.
- Evidence tab explains source metadata is missing.
- Field Catalog tab lists returned fields as unmatched.
- Quality Checks tab shows source and field warnings.
- Raw JSON is only visible in Raw Info.
- No frontend code maps a specific field name to a business metric.

## Reference spec

Read `PMAIOS_ENTERPRISE_CHAT_DISCLOSURE_LAYER_SPEC.md` in this bundle for full contracts and implementation details.
