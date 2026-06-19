# Observability / Audit 可执行规范

## 1. 目标

AI Chat OS 的展示层必须可追踪：

```txt
谁触发了什么 action
哪个 renderer 出错
哪个 contract validation 失败
哪个 runtime 慢
哪个 prompt/tool/contract version 产生了结果
哪些高风险动作被审批或拒绝
```

## 2. 必须记录的事件

```txt
action_invoked
action_succeeded
action_failed
action_confirmed
action_cancelled
renderer_error
renderer_fallback_used
contract_validation_failed
runtime_latency_recorded
runtime_error_shown
prompt_contract_generated
audit_trail_recorded
```

## 3. Action Tracking 结构

必须包含：

```txt
eventName
actionId
actionType
actionIntent
resultId
regionId
conversationId
messageId
runtimeId
sourceRefs
evidenceRefs
userId/sessionId
confirmed
permissionState
timestamp
```

## 4. Renderer Error Telemetry

必须包含：

```txt
binding
rendererVersion
regionId
resultId
errorName
errorMessage
errorStackHash
fallbackUsed
contractVersion
producer
```

## 5. Runtime Latency

必须包含：

```txt
runtimeId
status
startedAt
endedAt
durationMs
agentCount
toolCallCount
retryCount
approvalWaitMs
slowestToolCall
```

## 6. Prompt / Tool / Contract Version 追踪

SemanticResultContract.metadata 建议包含：

```txt
promptVersion
toolVersion
contractVersion
adapterVersion
rendererVersion
model
workflowVersion
```

RuntimeDisplayProtocol.metadata 建议包含：

```txt
orchestratorVersion
agentVersion
toolVersions
workflowVersion
traceId
```

## 7. Audit Trail 与 ActionContract 的关系

高风险动作必须设置：

```ts
action.audit.required = true
action.confirm.required = true
```

包括：

```txt
approve
reject
run-workflow
destructive
risky
export sensitive data
request external tool execution
```

Audit 记录必须能回溯到：

```txt
ActionContract.id
SemanticResultContract.resultId
region.id
evidenceRefs/sourceRefs
runtimeRefs
user/session/role
```
