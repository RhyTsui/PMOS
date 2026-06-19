# Semantic Frame Runtime Specification

> **Status**: P0/P1-1 Implemented  
> **Version**: 1.0.0  
> **Last Updated**: 2024-01-XX

## 1. Positioning

Semantic Frame Runtime 是 Request Understanding 的**中间语义层**，不是替代整个 Chat Runtime，而是为路由决策、用户需求和执行门控提供结构化语义解释。

### 1.1 核心定位

- **语义真源**：为 route decision、user requirement、execution gate 提供统一的语义输入
- **中间层**：介于用户输入和执行授权之间，解耦理解与执行
- **契约化**：基于 contract 的中间表示，不直接授权工具执行

### 1.2 不是什麼

- ❌ 不是整个 Chat Runtime 的替代品
- ❌ 不是执行授权机制（semantic frame 本身不能授权执行）
- ❌ 不是业务关键词路由系统

## 2. 主链路（P0/P1-1 已实现）

```
User Input
    ↓
deriveRequestSemanticFrame(message)
    ↓ semanticFrame { speechAct, semanticTask, executionMode, serviceIntent, ... }
deriveUserRequirement(message, context, semanticFrame)
    ↓ userRequirement { task, serviceIntent, metrics, dimensions, ... }
deriveRequestRouteDecision(message, { semanticFrame, ... })
    ↓ route { intent_type, requiresExecution, ... }
capability discovery
    ↓ selectedCapability { capabilityPurpose, supportedServiceIntents, ... }
execution gate
    ↓ shouldEnter { shouldEnter, blockedBy, reasons, policy }
tool / KB / schema / web execution
    ↓ result
result normalization → evidence ledger → answer composer → render surface
```

### 2.1 关键原则

**Semantic frame 是语义真源**，不是建议或提示。Route decision、user requirement 和 execution gate 必须将 semantic frame 作为主要输入消费。

## 3. 核心概念

### 3.1 SpeechAct

用户意图的言语行为分类：

| SpeechAct | 描述 | 示例 |
|-----------|------|------|
| `ask_definition` | 询问定义/含义 | "素材报表的未知是什么" |
| `ask_data` | 询问数据/报表 | "今天素材报表的数据" |
| `ask_diagnosis` | 询问诊断 | "为什么素材显示未知" |
| `ask_how_to` | 询问方法/如何做 | "如何配置监测链接" |
| `request_operation` | 请求执行操作 | "执行配置检查" |
| `chat` | 通用对话 | "你好" |

### 3.2 SemanticTask

结构化任务类型：

| SemanticTask | 描述 | 典型 ExecutionMode |
|--------------|------|-------------------|
| `retrieve_report_data` | 查询报表数据 | `data_execution` |
| `explain_field_or_value` | 解释字段/值含义 | `read_only_lookup` |
| `diagnose_data_issue` | 诊断数据问题 | `diagnostic_evidence` |
| `draft_requirement` | 起草需求文档 | `none` |
| `execute_workflow` | 执行工作流 | `workflow_execution` |
| `general_chat` | 通用对话 | `none` |

### 3.3 ExecutionMode

执行模式分类：

| ExecutionMode | 描述 | 可进入 Report Execution？ |
|---------------|------|-------------------------|
| `none` | 纯回答，不调用工具 | ❌ No |
| `read_only_lookup` | 只读查询（字典/schema/知识库） | ❌ No |
| `data_execution` | 数据执行（查询报表） | ✅ Yes |
| `diagnostic_evidence` | 诊断证据收集 | ✅ Yes（但作为 diagnosis，不是 report_query） |
| `workflow_execution` | 工作流执行 | ✅ Yes（但作为 debugging/system_operation） |
| `mutation` | 状态变更 | ✅ Yes（但作为 system_operation） |

### 3.4 EvidenceNeed

任务需要的证据类型：

| EvidenceNeed | 描述 |
|--------------|------|
| `field_dictionary` | 字段字典查询 |
| `schema_registry` | Schema 注册表查询 |
| `metric_dictionary` | 指标字典查询 |
| `knowledge_base` | 知识库查询 |
| `data_mcp` | 数据 MCP 工具执行 |
| `config_check` | 配置检查 |
| `log_check` | 日志检查 |
| `public_web` | 公开网络搜索 |
| `conversation_context` | 对话上下文 |

## 4. 组件关系

### 4.1 Semantic Frame → Route Decision

`deriveRequestRouteDecision` 消费 semantic frame 来决定路由：

```typescript
const route = deriveRequestRouteDecision(message, {
  semanticFrame,  // ← 主要语义真源
  businessContext,
  routeRules,
  llmIntentSignal,
});
```

**映射规则**：
- `semanticTask === 'retrieve_report_data'` + `executionMode === 'data_execution'` → `route.intent_type = 'report_query'`
- `semanticTask === 'explain_field_or_value'` + `executionMode === 'read_only_lookup'` → `route.intent_type = 'help'`
- `semanticTask === 'diagnose_data_issue'` + `executionMode === 'diagnostic_evidence'` → `route.intent_type = 'diagnosis'`

### 4.2 Semantic Frame → User Requirement

`deriveUserRequirement` 消费 semantic frame 来决定 service intent 和 task：

```typescript
const requirement = deriveUserRequirement(message, context, semanticFrame);
```

**优先级**：
- 优先使用 `semanticFrame.serviceIntent` 而非关键词推断
- 优先使用 `semanticFrame.semanticTask` 进行 task 决定

### 4.3 Semantic Frame → Execution Gate

`shouldEnterReportExecution` 消费 semantic frame 来授权执行：

```typescript
const gate = shouldEnterReportExecution({
  route,
  userRequirement,
  semanticFrame,  // ← 主要语义真源
  selectedCapability,
  capabilityReportMatch,
  reportRouteMatch,
});
```

**门控条件**（必须全部满足）：
1. `route.intent_type === 'report_query'`
2. `route.requiresExecution === true`
3. `semanticFrame.executionMode` 允许 report execution（`data_execution` / `diagnostic_evidence` / `workflow_execution`）
4. `serviceIntent` policy category 是 `execution`
5. `selectedCapability.purpose` 在 `policy.allowedPurposes` 中

## 5. LLM 的角色

### 5.1 LLM 可以做什么

- **生成 semantic frame**：LLM 可以作为来源之一参与 semantic frame 生成
- **审查 semantic frame**：LLM 可以审查和优化规则解析器生成的 semantic frame
- **提供置信度**：LLM 可以为 semantic frame 字段提供置信度评分

### 5.2 LLM 不能做什么

- **直接授权工具执行**：LLM 的输出不能直接授权工具执行
- **绕过执行门控**：LLM 不能绕过多维度执行门控
- **覆盖 semantic frame**：LLM 的建议必须经过 semantic frame，不能直接影响 route/gate

### 5.3 当前实现

目前 semantic frame 由规则解析器生成（`deriveRequestSemanticFrame`）。LLM 集成计划在 P2 作为审查/优化层。

## 6. 禁止事项

### 6.1 Capability Match 不能单独触发执行

❌ **禁止**：
```typescript
if (capabilityReportMatch) {
  // 直接进入 report execution
  executeReportQuery();
}
```

✅ **要求**：
```typescript
if (capabilityReportMatch && semanticFrame.executionMode === 'data_execution' && ...) {
  // 只有在所有门控条件满足后才能进入 report execution
  executeReportQuery();
}
```

### 6.2 单点不能授权执行

❌ **禁止**：
- 关键词匹配单独 → 执行
- 路由决策单独 → 执行
- LLM 输出单独 → 执行
- Capability 匹配单独 → 执行

✅ **要求**：
- Semantic frame + route + capability + gate → 执行

### 6.3 通用 Chat Core 不能包含业务关键词

❌ **禁止**：
```typescript
// 在通用 Chat Core（request-understanding.ts 等）中
if (/日报|报表|数据|查数/.test(message)) {
  route.intent_type = 'report_query';
}
```

✅ **要求**：
- 业务关键词必须在 Domain Ontology / Report Catalog / Capability Manifest 中
- 通用 Chat Core 只消费结构化的 semantic frame
- 遗留关键词逻辑只能在迁移期作为 fallback

## 7. 当前实现状态

### 7.1 已实现（P0/P1-1）

✅ **Semantic Frame Contract**
- `semantic-frame-contract.ts`：SpeechAct, SemanticTask, ExecutionMode, EvidenceNeed, BusinessObjectReference

✅ **Semantic Frame Resolver**
- `semantic-frame-resolver.ts`：基于规则的 semantic frame 生成
- SpeechAct 检测
- SemanticTask 推断
- ExecutionMode 映射
- BusinessObject 检测（基础）

✅ **Route Decision 集成**
- `deriveRequestRouteDecision` 消费 `semanticFrame`
- Semantic frame adapter：semanticTask + executionMode → route decision

✅ **User Requirement 集成**
- `deriveUserRequirement` 消费 `semanticFrame`
- 优先使用 `semanticFrame.serviceIntent` 而非关键词推断
- 优先使用 `semanticFrame.semanticTask` 进行 task 决定

✅ **Execution Gate**
- `shouldEnterReportExecution` 消费 `semanticFrame`
- 多维度门控：route + executionMode + serviceIntent + capability
- `read_only_lookup` 阻止 `report_execution`
- `data_execution` 允许 `report_execution`

✅ **Field Definition 拦截**
- `field-definition-resolver.ts`：检测字段定义请求
- 字段定义请求在 capability match 之前被拦截
- `field_definition` + `read_only_lookup` 不能进入 report execution

✅ **测试覆盖**
- 62/62 测试通过
- 覆盖字段解释、报表数据、诊断、包、帮助场景

### 7.2 未实现（P1-2+）

⏳ **Domain Ontology / Report Catalog**
- 从 ontology 进行业务对象解析
- 对象别名管理
- 对象到能力的映射

⏳ **Evidence Ledger**
- 结构化证据追踪
- 证据来源归因
- 证据新鲜度管理

⏳ **Render Surface Policy**
- 基于 semantic frame 的渲染表面选择
- 多表面渲染协调

⏳ **/api/chat 真实回归测试**
- 端到端集成测试
- 真实浏览器 E2E 测试

⏳ **LLM 审查层**
- 基于 LLM 的 semantic frame 审查
- 置信度评分
- Semantic frame 优化

## 8. 文件位置

### 8.1 Contract
- `frontend/src/src/contracts/request-understanding/semantic-frame-contract.ts`

### 8.2 Resolver
- `frontend/src/src/lib/semantic-frame-resolver.ts`
- `frontend/src/src/lib/field-definition-resolver.ts`

### 8.3 集成
- `frontend/src/src/lib/request-understanding.ts`（deriveRequestRouteDecision, deriveUserRequirement）
- `frontend/src/src/lib/report-execution-gate.ts`（shouldEnterReportExecution）
- `frontend/src/src/app/api/chat/route.ts`（主流程）

### 8.4 Policy
- `frontend/src/src/lib/service-intent-execution-policy.ts`

### 8.5 测试
- `frontend/src/tests/field-definition-resolver.test.ts`
- `frontend/src/tests/service-intent-execution-policy.test.ts`
- `frontend/src/tests/report-execution-gate.test.ts`
- `frontend/src/tests/report-execution-integration.test.ts`

## 9. 相关文档

- [Execution Gate 详细设计](./05_EXECUTION_GATE.md)
- [演进路线图](./EVOLUTION_ROADMAP.md)
- [Enterprise AI Chat OS Spec](../ENTERPRISE_AI_CHAT_OS_SPEC.md)（Request Understanding 部分）
- [实现护栏](../governance/ai-chat-implementation-guardrails.md)

## 10. 变更日志

| 日期 | 版本 | 变更 | 作者 |
|------|------|------|------|
| 2024-01-XX | 1.0.0 | 初始规格（P0/P1-1） | Claude |
