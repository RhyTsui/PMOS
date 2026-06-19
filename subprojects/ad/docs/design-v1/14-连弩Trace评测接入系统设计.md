# 小乔智投连弩 Trace 评测接入系统设计

## 1. 设计定位

连弩 Trace 评测接入用于记录小乔智投从用户问题到真实工具执行、结果解析、回答生成、失败闭环的结构化链路，并把关键记录发送到连弩测试平台。

本设计只定义小乔侧应生成和发送什么，不在小乔后台重建评测平台。连弩负责完整回放、评测集管理、断言规则、证据规则和测试报告。

## 2. 与资产证据的边界

| 对象 | 用途 | 用户是否直接消费 | 归属 |
|---|---|---:|---|
| EvidenceRef | 支撑业务结论的来源引用 | 是 | 小乔资产证据体系 |
| AssetRecord | 可复用、可归档的业务产物 | 是 | 小乔资产体系 |
| TraceEnvelope | 执行链路回放和评测 | 否，主要给产研和评测平台 | 小乔生成，连弩消费 |
| TraceEvent | 某个执行阶段事件 | 否 | 小乔生成，连弩消费 |

Trace 可以引用 EvidenceRef 和 AssetRecord，但不能替代它们。

## 3. 当前实现核对

当前系统已存在 Trace 配置和部分发送能力，设计阶段需要把它标准化为统一契约：

- 已有 Trace 配置入口和测试接口。
- 已有会话路由侧的 Trace 发射点。
- 已有 Evaluation Adapter / Runtime 的基础结构。
- 需要补齐每个核心场景的字段、断言、失败分类和连弩字段映射。

## 4. Trace 覆盖阶段

每次用户请求至少覆盖以下阶段：

1. `message_received`：收到用户问题。
2. `context_resolved`：用户、角色、顶部项目、显式项目、会话上下文解析。
3. `glossary_normalized`：术语归一化和候选命中。
4. `intent_routed`：候选意图、最终意图、置信度、路由原因。
5. `capability_discovered`：候选 MCP / Skill / Workflow、健康状态、schema 摘要。
6. `preflight_checked`：权限、项目、slot、能力可用性检查。
7. `followup_asked`：需要追问时记录追问原因和缺失字段。
8. `tool_called`：真实工具调用开始、输入摘要、调用引用。
9. `tool_result_parsed`：结果解析、空结果、部分成功、错误分类。
10. `answer_generated`：回答摘要、下一步建议、引用证据。
11. `asset_or_case_created`：资产、证据、Case 生成结果。
12. `completion_marked`：闭环状态。

## 5. Trace 数据模型

### 5.1 XiaoqiaoTraceEnvelope

```ts
interface XiaoqiaoTraceEnvelope {
  trace_id: string;
  environment: 'dev' | 'test' | 'prod';
  app: 'xiaoqiao-ad-chat';
  created_at: string;
  user_context: TraceUserContext;
  conversation_context: TraceConversationContext;
  route_context: TraceRouteContext;
  project_context: TraceProjectContext;
  capability_context: TraceCapabilityContext;
  execution_context: TraceExecutionContext;
  result_context: TraceResultContext;
  refs: TraceRefs;
  completion_status: TraceCompletionStatus;
}
```

### 5.2 核心上下文

```ts
interface TraceProjectContext {
  ui_selected_project_ref?: ProjectRef;
  explicit_project_refs: ProjectRef[];
  effective_project_refs: ProjectRef[];
  project_resolution_source:
    | 'ui_selected'
    | 'user_explicit'
    | 'conversation_context'
    | 'followup_confirmed';
  conflict_status: 'none' | 'needs_confirm' | 'blocked_no_permission';
}

interface TraceRouteContext {
  original_utterance: string;
  normalized_terms: Array<{
    raw: string;
    normalized: string;
    source: 'controlled_glossary' | 'runtime_alias' | 'knowledge_retrieval';
    confidence: number;
  }>;
  candidate_intents: Array<{
    intent: string;
    score: number;
    reason: string;
  }>;
  final_intent: string;
  route_decision_source: 'rule' | 'llm' | 'hybrid' | 'manual_override';
}

interface TraceCapabilityContext {
  selected_capability_id?: string;
  selected_capability_type?: 'mcp' | 'skill' | 'workflow';
  candidate_capabilities: Array<{
    capability_id: string;
    capability_type: 'mcp' | 'skill' | 'workflow';
    health_status: 'available' | 'degraded' | 'unavailable';
    schema_version?: string;
  }>;
  preflight_status: 'passed' | 'need_followup' | 'blocked';
  missing_slots: string[];
}
```

### 5.3 调用记录

```ts
interface TraceToolCallRecord {
  call_id: string;
  capability_id: string;
  capability_type: 'mcp' | 'skill' | 'workflow';
  input_summary: Record<string, unknown>;
  started_at: string;
  ended_at?: string;
  status: 'success' | 'partial_success' | 'empty' | 'failed' | 'timeout';
  error_code?: string;
  error_message?: string;
  result_schema_version?: string;
  evidence_refs: string[];
}
```

### 5.4 闭环状态

```ts
type TraceCompletionStatus =
  | 'completed'
  | 'completed_with_suggestion'
  | 'need_user_followup'
  | 'failed_case_created'
  | 'failed_waiting_external'
  | 'blocked_no_permission'
  | 'blocked_capability_unavailable';
```

## 6. 场景字段要求

| 场景 | 必填 Trace 字段 |
|---|---|
| 对话路由 | 原始问题、术语归一化、候选意图、最终意图、路由原因 |
| 项目解析 | 顶部项目、显式项目、最终请求项目、冲突状态、权限结果 |
| 问数 | 报表域、slot、字典调用、报表 MCP、结果解析、UI 渲染类型 |
| 定时报表 | 任务 ID、数据延迟策略、执行时间、产物资产 ID |
| 包交付 | 包类型、流程类型、上报检查、后台更新检测、联调结果、Case |
| 异常排查 | 诊断类型、已调用能力、证据链、假设 / 结论分类 |
| 指标解释 | 内部口径命中、知识来源、外部补充来源、冲突处理 |
| 需求沟通 | 缺失字段、追问轮次、确认状态、Case / 需求池编号 |
| 个人记忆 | 用户知识库 Key 状态、写入 / 检索结果、通用库 / 个人库边界 |

## 7. 连弩对接契约

小乔侧发送：

- `trace_id`
- `conversation_id`
- `message_id`
- `user_id`
- `role_id`
- `project_refs`
- `intent`
- `capability_id`
- `tool_calls`
- `evidence_refs`
- `asset_refs`
- `case_refs`
- `completion_status`
- `assertion_hints`

连弩侧负责：

- Trace 完整回放。
- 测试集管理。
- 断言规则执行。
- 证据规则评测。
- 失败样本归因。
- 评测报告输出。

小乔不负责在后台复刻这些能力，但需要保证发送字段稳定。

## 8. 评测断言类型

```ts
interface EvaluationAssertionHint {
  assertion_id: string;
  assertion_type:
    | 'route_match'
    | 'project_resolution'
    | 'permission_block'
    | 'slot_followup'
    | 'tool_called'
    | 'result_parsed'
    | 'evidence_attached'
    | 'asset_created'
    | 'case_created'
    | 'no_fake_completion';
  expected_value?: unknown;
  actual_value?: unknown;
  severity: 'P0' | 'P1' | 'P2';
}
```

必须覆盖的评测集：

- 业务术语歧义导致的路由样本。
- 顶部项目与用户明示项目冲突样本。
- 跨项目问数样本。
- 权限变化导致历史资产 / 会话不可见样本。
- MCP 已上线但能力发现未命中的样本。
- 工具调用失败、空结果、schema mismatch 样本。
- 多轮追问后仍无法完成并生成 Case 的样本。

## 9. 发送失败与降级

| 失败点 | 处理 |
|---|---|
| Trace 配置缺失 | 测试 / 生产发布前阻断；本地开发允许关闭 |
| Trace 发送失败 | 不阻断用户回答，但记录本地错误并进入重试 |
| 连弩不可用 | 保留本地 trace 摘要和发送失败状态 |
| 字段 schema 不兼容 | 标记为 trace_schema_mismatch，进入评测对接缺口 |
| 证据引用无权限 | Trace 保留原始引用，连弩回放按权限策略处理 |

## 10. 验收规则

1. 每次真实业务请求都有 `trace_id`。
2. 问数请求能回放到路由、项目、slot、字典、报表 MCP、结果解析和 UI 类型。
3. 包交付请求能回放到上报检查、后台更新检测、联调触发和可投结论。
4. 项目冲突时 Trace 能看出顶部项目、用户明示项目、最终项目和追问结果。
5. 工具未真实调用时，不允许 Trace 标记为 `completed`。
6. 失败 Case 必须在 Trace 中包含 `case_refs`。
7. Trace 发送失败不影响用户主链路，但必须可追踪、可重试、可告警。
