# Execution Gate 详细设计

> **Status**: P0 Implemented  
> **Version**: 1.0.0  
> **Last Updated**: 2024-01-XX  
> **Parent**: [Semantic Frame Runtime Spec](./00_SEMANTIC_FRAME_RUNTIME_SPEC.md)

## 1. 概述

Execution Gate 是**多维度授权机制**，决定请求是否可以进入 report execution。它取代了遗留的单点授权（单独 capability match、单独关键词 match），使用要求所有条件都满足的综合门控。

### 1.1 设计原则

**没有单点可以授权执行**。执行需要：
- Semantic frame（语义真源）
- Route decision（路由授权）
- Capability contract（能力对齐）
- Service intent policy（策略合规）

## 2. Report Execution 前置条件

### 2.1 门控函数签名

```typescript
interface ReportExecutionGateInput {
  route: RequestRouteDecision;
  userRequirement: UserRequirementContract;
  semanticFrame?: RequestSemanticFrame | null;
  selectedCapability?: CapabilityManifest | { capability: CapabilityManifest } | null;
  capabilityReportMatch: boolean;
  reportRouteMatch: boolean;
}

interface ReportExecutionGateResult {
  shouldEnter: boolean;
  reasons: string[];      // 通过的条件
  blockedBy: string[];    // 失败的条件
  policy: {
    serviceIntent: string;
    category: string;
    executionMode?: ExecutionMode;
    requiresToolExecution: boolean;
    capabilityPurpose?: CapabilityPurpose;
  };
}
```

### 2.2 门控条件（必须全部满足）

| # | 条件 | 检查 | 阻止原因 |
|---|------|------|---------|
| 1 | Route intent | `route.intent_type === 'report_query'` | `route_intent:{actual_intent}` |
| 2 | Execution authorization | `route.requiresExecution === true` | `requires_execution:false` |
| 3 | Execution mode | `semanticFrame.executionMode` 允许 report execution | `execution_mode:{mode}` |
| 4 | Service intent policy | `policy.category === 'execution'` | `service_intent_policy:{category}` |
| 5 | Capability purpose | `selectedCapability.purpose` 在 `policy.allowedPurposes` 中 | `capability_purpose:{purpose}` |

### 2.3 Execution Mode 授权

| ExecutionMode | 可进入 Report Execution？ | 原因 |
|---------------|-------------------------|------|
| `none` | ❌ No | 纯回答，不调用工具 |
| `read_only_lookup` | ❌ No | 只读查询，不是数据执行 |
| `data_execution` | ✅ Yes | 数据执行（查询报表） |
| `diagnostic_evidence` | ✅ Yes | 诊断证据收集 |
| `workflow_execution` | ✅ Yes | 工作流执行 |
| `mutation` | ✅ Yes | 状态变更 |

**实现**：
```typescript
function isExecutionModeAllowedForReport(mode: ExecutionMode): boolean {
  return mode === 'data_execution' ||
         mode === 'diagnostic_evidence' ||
         mode === 'workflow_execution';
}
```

## 3. Service Intent Policy

### 3.1 Policy Categories

| Category | 描述 | 可进入 Report Execution？ |
|----------|------|-------------------------|
| `non_execution` | 不需要执行 | ❌ No |
| `execution` | 需要执行 | ✅ Yes |
| `evidence_execution` | 需要证据收集 | ✅ Yes |
| `workflow_execution` | 需要工作流执行 | ✅ Yes |

### 3.2 Service Intent → Category 映射

| ServiceIntent | Category | ExecutionMode |
|---------------|----------|---------------|
| `general_chat` | `non_execution` | `none` |
| `help_qa` | `non_execution` | `read_only_lookup` |
| `field_definition` | `non_execution` | `read_only_lookup` |
| `knowledge_answer` | `non_execution` | `read_only_lookup` |
| `data_query` | `execution` | `data_execution` |
| `report_delivery` | `execution` | `data_execution` |
| `issue_diagnosis` | `evidence_execution` | `diagnostic_evidence` |
| `package_fetch` | `execution` | `workflow_execution` |
| `integration_workflow` | `workflow_execution` | `workflow_execution` |
| `system_operation` | `workflow_execution` | `workflow_execution` |

### 3.3 Capability Purpose 授权

| CapabilityPurpose | 允许用于 |
|-------------------|---------|
| `report_execution` | `data_query`, `report_delivery`, `issue_diagnosis` |
| `dictionary_lookup` | `field_definition`, `knowledge_answer`, `data_query` |
| `schema_lookup` | `field_definition`, `knowledge_answer`, `data_query` |
| `diagnostic_evidence` | `issue_diagnosis` |
| `workflow_execution` | `package_fetch`, `integration_workflow`, `system_operation` |

## 4. read_only_lookup 行为

### 4.1 read_only_lookup 阻止什么

❌ **阻止**：
- `report_execution`（数据查询）
- `diagnostic_evidence`（诊断）
- `workflow_execution`（工作流）

### 4.2 read_only_lookup 允许什么

✅ **允许**：
- `dictionary_lookup`（字段字典）
- `schema_lookup`（schema 注册表）
- `knowledge_lookup`（知识库）

### 4.3 设计原理

`read_only_lookup` 用于**解释和查询**，不是用于**数据执行**。它应该：
- 阻止 report execution（不查询数据）
- 允许 dictionary/schema/knowledge lookup（解释）
- 不要与"完全不调用工具"混淆

**示例**：
- "素材报表的未知是什么" → `field_definition` + `read_only_lookup` → ❌ 阻止 report execution，✅ 允许 dictionary lookup
- "今天素材报表的数据" → `data_query` + `data_execution` → ✅ 允许 report execution

## 5. diagnostic_evidence vs report_query

### 5.1 关键区别

| 方面 | report_query | diagnosis |
|------|--------------|-----------|
| SemanticTask | `retrieve_report_data` | `diagnose_data_issue` |
| ExecutionMode | `data_execution` | `diagnostic_evidence` |
| ServiceIntent | `data_query` / `report_delivery` | `issue_diagnosis` |
| Route Intent | `report_query` | `diagnosis` |
| Capability Purpose | `report_execution` | `diagnostic_evidence` |
| Execution Path | Report query execution | Diagnosis skill execution |

### 5.2 为什么它们不同

- **report_query**：查询数据，返回结果
- **diagnosis**：收集证据，分析根因，提供诊断

它们使用不同的执行路径、不同的能力、不同的结果格式。

### 5.3 门控行为

```typescript
// report_query
semanticFrame.executionMode === 'data_execution' &&
serviceIntent === 'data_query' &&
capability.purpose === 'report_execution'
→ ✅ 进入 report execution

// diagnosis
semanticFrame.executionMode === 'diagnostic_evidence' &&
serviceIntent === 'issue_diagnosis' &&
capability.purpose === 'diagnostic_evidence'
→ ✅ 进入 diagnosis execution（不是 report execution）
```

## 6. capabilityReportMatch 作为候选证据

### 6.1 capabilityReportMatch 的含义

`capabilityReportMatch === true` 表示："在 capability manifest 中有一个报表能力可以潜在处理这个请求。"

### 6.2 capabilityReportMatch 不能做什么

❌ **不能**：
- 直接触发 report execution
- 覆盖 semantic frame
- 绕过执行门控
- 授权工具执行

### 6.3 capabilityReportMatch 能做什么

✅ **能**：
- 作为门控决策的候选证据
- 在与其他信号结合时通知路由决策
- 在门控原因中记录以提供可追踪性

### 6.4 实现

```typescript
// 在 shouldEnterReportExecution 中
if (input.capabilityReportMatch) {
  reasons.push('capability_report_match:candidate_evidence_only');
}
```

注意：它被添加到 `reasons`，不用于门控条件。它用于可追踪性，不是授权。

## 7. 典型用例矩阵

### 7.1 字段解释用例

| 输入 | SpeechAct | SemanticTask | ExecutionMode | ServiceIntent | 门控结果 | 原因 |
|------|-----------|--------------|---------------|---------------|---------|------|
| "素材报表的未知是什么" | `ask_definition` | `explain_field_or_value` | `read_only_lookup` | `field_definition` | ❌ Blocked | `execution_mode:read_only_lookup` |
| "未知是什么意思" | `ask_definition` | `explain_field_or_value` | `read_only_lookup` | `field_definition` | ❌ Blocked | `execution_mode:read_only_lookup` |

### 7.2 报表数据用例

| 输入 | SpeechAct | SemanticTask | ExecutionMode | ServiceIntent | 门控结果 | 原因 |
|------|-----------|--------------|---------------|---------------|---------|------|
| "今天素材报表的数据" | `ask_data` | `retrieve_report_data` | `data_execution` | `data_query` | ✅ Allowed | 所有条件满足 |
| "查日报" | `ask_data` | `retrieve_report_data` | `data_execution` | `data_query` | ✅ Allowed | 所有条件满足 |

### 7.3 诊断用例

| 输入 | SpeechAct | SemanticTask | ExecutionMode | ServiceIntent | 门控结果 | 原因 |
|------|-----------|--------------|---------------|---------------|---------|------|
| "为什么素材显示未知" | `ask_diagnosis` | `diagnose_data_issue` | `diagnostic_evidence` | `issue_diagnosis` | ❌ Blocked（对 report） | Route intent 是 `diagnosis`，不是 `report_query` |

### 7.4 帮助用例

| 输入 | SpeechAct | SemanticTask | ExecutionMode | ServiceIntent | 门控结果 | 原因 |
|------|-----------|--------------|---------------|---------------|---------|------|
| "如何配置监测链接" | `ask_how_to` | `general_chat` | `none` | `help_qa` | ❌ Blocked | `execution_mode:none` |

### 7.5 包用例

| 输入 | SpeechAct | SemanticTask | ExecutionMode | ServiceIntent | 门控结果 | 原因 |
|------|-----------|--------------|---------------|---------------|---------|------|
| "投放包地址" | `request_operation` | `execute_workflow` | `workflow_execution` | `package_fetch` | ❌ Blocked（对 report） | Route intent 是 `get_delivery_packages`，不是 `report_query` |

## 8. Capability 归一化

### 8.1 输入类型

门控接受两种类型的 capability 输入：

1. **CapabilityManifest**：直接的 capability manifest
2. **CapabilitySelectionCandidate**：带有 capability 属性的包装器

```typescript
interface CapabilitySelectionCandidate {
  capability: CapabilityManifest;
  score: number;
  reasons: string[];
  dataCoverage?: CapabilityCoverageDetail;
  presentationCoverage?: PresentationCoverageDetail;
}
```

### 8.2 归一化逻辑

```typescript
function normalizeCapability(
  input: CapabilityManifest | CapabilitySelectionCandidate | null | undefined,
): CapabilityManifest | null {
  if (!input) return null;
  if ('capability' in input && input.capability) {
    return input.capability;
  }
  return input as CapabilityManifest;
}
```

这确保门控正确工作，无论输入是直接的 manifest 还是 candidate 包装器。

## 9. 门控输出结构

### 9.1 shouldEnter

如果所有门控条件满足则为 `true`，否则为 `false`。

### 9.2 reasons

通过的条件数组。用于：
- 可追踪性
- 调试
- 可观测性

示例：
```typescript
reasons: [
  'route_intent:report_query',
  'requires_execution:true',
  'execution_mode:data_execution:allowed',
  'service_intent_policy:execution',
  'capability_purpose:report_execution:allowed',
  'capability_report_match:candidate_evidence_only',
]
```

### 9.3 blockedBy

失败的条件数组。用于：
- 理解为什么执行被阻止
- 向用户提供反馈
- 调试

示例：
```typescript
blockedBy: [
  'execution_mode:read_only_lookup',
  'service_intent_policy:non_execution',
]
```

### 9.4 policy

用于门控决策的策略快照：
```typescript
policy: {
  serviceIntent: 'data_query',
  category: 'execution',
  executionMode: 'data_execution',
  requiresToolExecution: true,
  capabilityPurpose: 'report_execution',
}
```

## 10. 测试覆盖

### 10.1 单元测试

- `tests/report-execution-gate.test.ts`（10 个测试）
  - 字段定义请求被阻止
  - 诊断请求被阻止
  - 正常报表查询被允许
  - 单独的 capability match 不能触发
  - 非报表意图不被劫持
  - 门控输出结构

### 10.2 集成测试

- `tests/report-execution-integration.test.ts`（11 个测试）
  - P0-1: 素材报表的未知是什么
  - P0-2: 未知是什么意思
  - P0-3: 为什么素材显示未知
  - P0-4: 今天素材报表的数据
  - P0-5: 查日报
  - P0-6: 如何配置监测链接
  - P0-7: Package/integration/diagnosis 不被劫持
  - P0-8: capabilityReportMatch + field_definition 被拒绝

### 10.3 测试结果

**62/62 测试通过** ✅

## 11. 文件位置

### 11.1 实现
- `frontend/src/src/lib/report-execution-gate.ts`

### 11.2 Policy
- `frontend/src/src/lib/service-intent-execution-policy.ts`

### 11.3 测试
- `frontend/src/tests/report-execution-gate.test.ts`
- `frontend/src/tests/report-execution-integration.test.ts`

## 12. 相关文档

- [Semantic Frame Runtime Spec](./00_SEMANTIC_FRAME_RUNTIME_SPEC.md)
- [演进路线图](./EVOLUTION_ROADMAP.md)
- [实现护栏](../governance/ai-chat-implementation-guardrails.md)

## 13. 变更日志

| 日期 | 版本 | 变更 | 作者 |
|------|------|------|------|
| 2024-01-XX | 1.0.0 | 初始设计（P0） | Claude |
