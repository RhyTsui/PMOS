# Runtime Display Protocol Specification

> Canonical path: `docs/architecture/runtime/runtime-display-protocol.md`  
> Type source: `frontend/src/src/contracts/runtime/runtime-display-protocol.ts`  
> Scope: Runtime Plane / AI、Agent、Tool、Workflow、Streaming 的运行态展示协议

## 1. 文档定位

`RuntimeDisplayProtocol` 是 AI Chat OS 的运行态展示协议。

它回答的问题是：

```txt
AI 是如何执行的？模型、工具、Agent、Workflow、Trace、错误、重试、审批状态如何展示？
```

它不负责最终业务结果。最终业务结果必须进入 `SemanticResultContract`。

## 2. 与 SemanticResultContract 的关系

```txt
SemanticResultContract = Result Plane = 最终业务结果
RuntimeDisplayProtocol = Runtime Plane = 执行过程
```

二者通过引用关联：

```txt
SemanticResultContract.regions[].runtimeRefs[]
RuntimeDisplayProtocol.runtimeId / events[].id / toolCalls[].id / workflows[].id
```

规则：

1. Runtime events 不得直接嵌入 `region.data`。
2. 业务结论不得只存在 Runtime trace 里。
3. Runtime 可以为 evidence 提供执行证明，但不能替代业务证据。

## 3. 核心结构

```txt
RuntimeDisplayProtocol
├─ contractType
├─ version
├─ runtimeId
├─ conversationId
├─ messageId
├─ executionId
├─ status
├─ startedAt
├─ endedAt
├─ agents[]
├─ toolCalls[]
├─ workflows[]
├─ streaming
├─ events[]
├─ errors[]
├─ approvals[]
├─ recovery
├─ visibility
├─ permission
└─ metadata
```

## 4. RuntimeStatus

推荐枚举：

```txt
idle                    未开始
queued                  排队中
planning                规划中
running                 运行中
streaming               流式输出中
waiting-for-user        等待用户输入
waiting-for-approval    等待审批
retrying                重试中
recovering              恢复中
succeeded               成功
partially-succeeded     部分成功
failed                  失败
cancelled               已取消
expired                 已过期
```

展示规则：

| 状态 | 普通用户展示 | 管理员展示 |
|---|---|---|
| planning | 正在规划 | 展示 planner / agent 状态 |
| running | 正在执行 | 展示工具、节点、耗时 |
| streaming | 正在生成 | 展示 token / chunk 状态可选 |
| waiting-for-approval | 等待确认 | 展示审批对象和风险 |
| failed | 执行失败 | 展示错误类型、trace、retry |
| partially-succeeded | 部分完成 | 展示成功和失败节点 |

## 5. RuntimeEvent

`RuntimeEvent` 是运行态时间线的最小单位。

推荐 event type：

```txt
runtime-started
runtime-completed
runtime-failed
model-started
model-stream-started
model-token
model-stream-ended
agent-started
agent-completed
agent-failed
tool-call-started
tool-call-progress
tool-call-succeeded
tool-call-failed
workflow-started
workflow-step-started
workflow-step-completed
workflow-step-failed
approval-requested
approval-granted
approval-rejected
retry-scheduled
retry-started
recovery-started
recovery-completed
user-input-requested
user-input-received
```

字段：

```txt
id
runtimeId
type
status
timestamp
title
summary
actor
agentId
toolCallId
workflowId
stepId
durationMs
payload
visibility
permission
error
```

规则：

1. `model-token` 事件不应全部长期保存在前端 state。
2. 面向普通用户的 timeline 应合并高频 event。
3. 管理员可查看原始 event，但敏感参数必须脱敏。

## 6. AgentRuntimeState

字段：

```txt
id
name
role
status
startedAt
endedAt
currentStep
summary
progress
inputRefs
outputRefs
errorRefs
visibility
```

规则：

1. 多 Agent 展示必须有角色区分。
2. 普通用户默认看 Agent 摘要，不看内部 prompt。
3. Agent 输出若成为业务结果，必须写入 SemanticResultContract。

## 7. ToolCallState

字段：

```txt
id
toolName
toolDisplayName
status
startedAt
endedAt
durationMs
inputSummary
outputSummary
inputArtifactRefs
outputArtifactRefs
error
retry
approval
visibility
permission
```

规则：

1. 不得展示原始密钥、token、cookie、完整 SQL 中的敏感字段。
2. 工具输出如果用于业务结论，必须生成 EvidenceRef。
3. 工具失败必须提供用户可理解错误。
4. 可重试工具必须提供 `ActionContract(type=retry)`。

## 8. WorkflowRuntimeState

字段：

```txt
id
name
status
startedAt
endedAt
steps[]
edges[]
currentStepId
progress
criticalPath
errors[]
```

Step 字段：

```txt
id
name
type
status
agentId
toolCallIds[]
dependsOn[]
startedAt
endedAt
summary
error
```

规则：

1. DAG 展示和 Timeline 展示必须来自同一 WorkflowRuntimeState。
2. 失败 step 必须可定位。
3. Workflow 结果必须回写 SemanticResultContract，而不是只停留在 runtime。

## 9. StreamingState

字段：

```txt
status                  idle / streaming / paused / completed / failed
startedAt
lastChunkAt
chunkCount
estimatedCompletion
backpressure            normal / slow-client / paused / dropped
partialMessageRef
```

规则：

1. 前端必须支持 streaming backpressure。
2. 长输出必须分块渲染，不得每个 token 触发全局重渲染。
3. Streaming 完成后应落成稳定的 SemanticResultContract 或消息内容。

## 10. RuntimeError

字段：

```txt
id
code
category                model / tool / workflow / permission / network / timeout / validation / unknown
severity                info / warning / error / critical
message
userMessage
recoverable
retryable
source
occurredAt
relatedEventIds[]
relatedToolCallIds[]
```

规则：

1. 所有错误必须有 `userMessage`。
2. 可恢复错误必须提供 recovery action。
3. 权限错误不能展示内部资源路径。
4. critical 错误必须进入 observability。

## 11. Retry / Recovery / Approval

### Retry

```txt
retryable
maxAttempts
attempt
nextRetryAt
backoffMs
retryActionId
```

### Recovery

```txt
recoveryActions[]
recommendedActionId
autoRecoverable
```

### Approval

```txt
approvalId
status                  pending / approved / rejected / expired
requestedBy
riskLevel
summary
requiredRole
approveActionId
rejectActionId
```

规则：

1. 等待用户确认时必须暂停相关 runtime。
2. 审批 action 必须走 ActionContract。
3. 审批通过后的执行必须形成新的 RuntimeEvent。

## 12. 与现有 AgentProcessEvent / process_events / Timeline 对齐

迁移规则：

```txt
AgentProcessEvent.id              -> RuntimeEvent.id
AgentProcessEvent.type            -> RuntimeEvent.type
AgentProcessEvent.created_at      -> RuntimeEvent.timestamp
AgentProcessEvent.agent_name      -> RuntimeEvent.agentId / actor
AgentProcessEvent.tool_name       -> RuntimeEvent.toolCallId + ToolCallState.toolName
AgentProcessEvent.status          -> RuntimeEvent.status
AgentProcessEvent.payload         -> RuntimeEvent.payload
process_events[]                  -> RuntimeDisplayProtocol.events[]
Timeline item                     -> RuntimeEvent projection
```

禁止：

```txt
process_events 直接驱动业务结果 UI
Timeline 私有定义 event type
ToolCallState 私有定义 retry / approval / error
```

## 13. 最小示例

```json
{
  "contractType": "runtime-display",
  "version": "1.0.0",
  "runtimeId": "runtime_001",
  "executionId": "exec_001",
  "status": "running",
  "startedAt": "2026-05-27T10:00:00+08:00",
  "agents": [
    {
      "id": "agent_analyzer",
      "name": "Performance Analyzer",
      "role": "analysis",
      "status": "running",
      "summary": "正在分析广告表现异常"
    }
  ],
  "toolCalls": [
    {
      "id": "tool_sql_001",
      "toolName": "warehouse.query",
      "toolDisplayName": "查询广告数据",
      "status": "succeeded",
      "durationMs": 1280,
      "inputSummary": "查询近 14 天广告表现",
      "outputSummary": "返回 14 天日粒度数据"
    }
  ],
  "events": [
    {
      "id": "evt_001",
      "runtimeId": "runtime_001",
      "type": "tool-call-succeeded",
      "status": "succeeded",
      "timestamp": "2026-05-27T10:00:04+08:00",
      "title": "广告数据查询完成",
      "toolCallId": "tool_sql_001"
    }
  ]
}
```

## 14. 验收清单

- [ ] AgentProcessEvent 可以无损映射到 RuntimeEvent。
- [ ] process_events 可以统一进入 RuntimeDisplayProtocol。
- [ ] Timeline UI 不私有定义事件结构。
- [ ] retry / recovery / approval 都走统一结构。
- [ ] Runtime 结果不替代 SemanticResultContract。
- [ ] 普通用户和管理员可见性有差异。

---

## v0.2 总纲一致性补充

Runtime Display Protocol 只描述执行过程，不替代 SemanticResultContract。Trace 写入失败必须 fail-open；MCP 执行状态必须区分 `succeeded`、`business_failed`、`tool_failed`、`unavailable`、`partial`。主消息只引用 runtime 摘要，完整过程进入右侧披露。
