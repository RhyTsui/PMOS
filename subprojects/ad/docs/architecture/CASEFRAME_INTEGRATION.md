# CaseFrame 集成架构文档

> 版本：1.0.0  
> 最后更新：2026-06-18  
> 状态：已实现

---

## 概述

CaseFrame 是跨轮持久的结构化状态对象，表示一个"服务案例"的完整生命周期。与 `semanticFrame`（单轮推理）不同，CaseFrame 贯穿多个对话轮次，跟踪从"发现需求"到"交付结果"再到"沉淀知识"的完整过程。

### 设计原则

1. **CaseFrame 按 caseId 聚合**：一个 conversation 可包含多个 case
2. **每轮 semanticFrame 产出后 merge 进当前 CaseFrame**
3. **CaseFrame 有明确的生命周期阶段（CaseStage）**
4. **CaseFrame 是 Feedback Loop（服务沉淀）的数据基础**

### 与 semanticFrame 的关系

- **semanticFrame**：单轮推理结果（这一轮用户说了什么、推断出什么）
- **CaseFrame**：跨轮聚合状态（这个 case 整体进展到哪一步、积累了什么）
- **类比**：semanticFrame 是一次听诊结果，CaseFrame 是整份病历

---

## 架构集成点

### 1. Understanding Stage（理解阶段）

**位置**：`src/lib/chat-pipeline/understanding-stage.ts`

**职责**：
- 获取或创建 CaseFrame
- 更新消息 ID 和业务上下文
- 将 CaseFrame 传递到 Pipeline Context

**实现**：
```typescript
// 获取当前会话的活跃 CaseFrame，如果没有则创建新的
let caseFrame = await getActiveCaseFrame(userScopeKey, conversationId);
if (!caseFrame) {
  caseFrame = await createCaseFrame(userScopeKey, {
    conversationId,
    serviceType: intentToServiceType(route.intent_type),
    realGoal: semanticFrame?.fieldDefinition?.targetTerm || message,
    priority: 'medium',
    initialMessage: message,
    messageId: traceId,
  });
} else {
  // 更新已有 CaseFrame：添加消息 ID 和业务上下文
  caseFrame = await addMessageId(userScopeKey, caseFrame, traceId);
  caseFrame = await updateBusinessContext(userScopeKey, caseFrame, {
    project: compiledContext.businessContext?.project,
    app: compiledContext.businessContext?.app,
    media: compiledContext.businessContext?.media,
    timeRange: compiledContext.businessContext?.timeRange,
  });
}
```

**输出**：
- `caseFrame` 添加到 `UnderstandingResult`
- 传递到 `ChatPipelineContext`

---

### 2. Evidence Ledger 集成

**位置**：`src/app/api/chat/route.ts`

**职责**：
- 使用 CaseFrame 的 caseId 作为 Evidence Ledger 的存储键
- 支持跨请求的证据累积

**实现**：
```typescript
// understanding-stage 产出了 CaseFrame，现在切换到正确的 Evidence Ledger
if (caseFrame?.caseId) {
  const correctEvidenceCaseId = caseFrame.caseId;
  if (correctEvidenceCaseId !== evidenceCaseId) {
    // 从存储中加载对应的 Evidence Ledger
    const correctLedger = await getEvidenceLedgerByCase(userScopeKey, correctEvidenceCaseId)
      .catch(() => createEmptyEvidenceLedger());
    streamIO.setEvidenceLedger(correctLedger);
    // 更新本地的 evidenceCaseId 引用（用于后续保存）
    evidenceCaseId = correctEvidenceCaseId;
  }
}
```

**工作流程**：
```
1. 请求进入 → 使用临时 evidenceCaseId (conv-${conversationId})
   ↓
2. Understanding Stage → 创建/获取 CaseFrame
   ↓
3. 切换 Evidence Ledger → 使用 CaseFrame.caseId
   ↓
4. 后续 stages → 使用正确的 Evidence Ledger
   ↓
5. 请求结束 → 保存到正确的 CaseFrame
```

---

### 3. Pipeline Context 传递

**位置**：`src/lib/chat-pipeline/pipeline-types.ts`

**字段定义**：
```typescript
export interface ChatPipelineContext {
  // ... 其他字段
  caseFrame?: CaseFrame;
  // ...
}
```

**用途**：
- 所有后续 stage 都可以访问 CaseFrame
- 可以在执行阶段更新 CaseFrame 状态
- 可以在结果阶段添加产物和证据

---

## CaseFrame 生命周期

### 阶段定义

```typescript
export const CASE_STAGES = [
  'discovering',        // 发现中：正在理解用户诉求
  'clarifying',         // 澄清中：需要补充信息
  'ready_to_execute',   // 就绪：信息已齐，等待执行
  'executing',          // 执行中：正在调用工具/服务
  'waiting_user',       // 等待用户：需要用户确认或补充
  'resolved',           // 已解决：服务完成
  'converted_to_task',  // 已转任务：沉淀为待办/需求
  'abandoned',          // 已放弃：用户取消或超时
] as const;
```

### 合法迁移路径

```
discovering → clarifying → ready_to_execute → executing → resolved → converted_to_task
     ↓              ↓              ↓              ↓
  waiting_user  waiting_user   waiting_user   waiting_user
     ↓              ↓              ↓              ↓
 abandoned     abandoned      abandoned      abandoned
```

### 状态更新辅助函数

**位置**：`src/lib/case-frame-helpers.ts`

提供的辅助函数：
- `transitionCaseFrameStage()` — 更新阶段
- `addKnownFact()` — 添加已知事实
- `addEvidenceRef()` — 添加证据引用
- `addDeliverable()` — 添加产物
- `updateBusinessContext()` — 更新业务上下文
- `addMessageId()` — 添加消息 ID
- `updateServiceIntent()` — 更新服务类型和目标
- `markAsDeposited()` — 标记为已沉淀

---

## 未来集成点

### Planning Stage（规划阶段）

**建议位置**：`src/lib/chat-pipeline/planning-stage.ts`（待实现）

**职责**：
- 更新 CaseFrame 阶段为 `clarifying` 或 `ready_to_execute`
- 添加规划结果到 metadata
- 记录缺失信息

**示例代码**：
```typescript
import { transitionCaseFrameStage } from '@/lib/case-frame-helpers';

if (needsClarification) {
  caseFrame = await transitionCaseFrameStage(
    userScopeKey,
    caseFrame,
    'clarifying',
    { missingInputs: ['appId', 'dateRange'] }
  );
} else {
  caseFrame = await transitionCaseFrameStage(
    userScopeKey,
    caseFrame,
    'ready_to_execute'
  );
}
```

---

### Execution Stage（执行阶段）

**建议位置**：各个执行 stage（report-query-stage, diagnosis-stage 等）

**职责**：
- 更新阶段为 `executing`
- 添加证据引用
- 记录工具调用

**示例代码**（report-query-stage）：
```typescript
import { transitionCaseFrameStage, addEvidenceRef } from '@/lib/case-frame-helpers';

// 开始执行
caseFrame = await transitionCaseFrameStage(userScopeKey, caseFrame, 'executing');

// 执行 MCP 工具调用
const result = await executeMcpTool(...);

// 添加证据
if (result.evidenceId) {
  caseFrame = await addEvidenceRef(userScopeKey, caseFrame, result.evidenceId);
}
```

---

### Result Stage（结果阶段）

**建议位置**：各个结果组装 stage

**职责**：
- 更新阶段为 `resolved`
- 添加产物（报表、分析结果等）
- 记录最终回复

**示例代码**：
```typescript
import { transitionCaseFrameStage, addDeliverable } from '@/lib/case-frame-helpers';

// 添加产物
if (reportResult) {
  caseFrame = await addDeliverable(userScopeKey, caseFrame, {
    type: 'report',
    id: reportResult.reportId,
    summary: `查询了 ${reportResult.metrics.join(', ')} 的数据`,
  });
}

// 标记为已解决
caseFrame = await transitionCaseFrameStage(
  userScopeKey,
  caseFrame,
  'resolved',
  { finalReply: answer }
);
```

---

### Open Answer Stage（开放式回答阶段）

**位置**：`src/lib/chat-pipeline/open-answer-stage.ts`

**职责**：
- 更新阶段为 `resolved`
- 添加知识库/公开联网的证据

**示例代码**：
```typescript
import { addEvidenceRef, addDeliverable, transitionCaseFrameStage } from '@/lib/case-frame-helpers';

// 添加公开联网证据
for (const sourceRef of sourceRefs) {
  caseFrame = await addEvidenceRef(userScopeKey, caseFrame, sourceRef.id);
}

// 添加回答产物
caseFrame = await addDeliverable(userScopeKey, caseFrame, {
  type: 'answer',
  summary: answer.slice(0, 100),
});

// 标记为已解决
caseFrame = await transitionCaseFrameStage(userScopeKey, caseFrame, 'resolved');
```

---

## Feedback Loop 集成

### 自动沉淀触发

**位置**：`src/lib/case-frame-store.ts`

**逻辑**：
```typescript
// 触发 Feedback Loop：当 frame 进入 resolved 且尚未沉淀时
if (
  frame.stage === 'resolved' &&
  !frame.deposited &&
  (!previousFrame || previousFrame.stage !== 'resolved')
) {
  // 异步沉淀，不阻塞主流程
  void depositCaseFrame(frame).catch(err => {
    console.error('[case-frame-store] feedback deposit failed:', err);
  });
}
```

### 沉淀类型

```typescript
export type DepositType = 'knowledge' | 'requirement' | 'eval_case' | 'alias' | 'capability_gap';
```

- **knowledge**：沉淀为知识库条目
- **requirement**：沉淀为需求
- **eval_case**：沉淀为评测用例
- **alias**：沉淀为实体别名
- **capability_gap**：沉淀为能力缺口

---

## 存储结构

### CaseFrame 存储

**位置**：`.runtime/users/{scopeKey}/case-frames.json`

**结构**：
```json
{
  "caseFrames": {
    "case-abc123": {
      "caseId": "case-abc123",
      "conversationId": "conv-xyz789",
      "stage": "resolved",
      "serviceType": "data_query",
      "realGoal": "查询近7天消耗",
      "surfaceAsks": ["巨量近7天的消耗"],
      "businessContext": {
        "media": "巨量",
        "timeRange": "近7天"
      },
      "knownFacts": [],
      "evidenceRefs": ["ev-123", "ev-456"],
      "deliverables": [
        {
          "type": "report",
          "summary": "查询了 cost 的数据",
          "createdAt": "2026-06-18T12:00:00Z"
        }
      ],
      "messageIds": ["msg-001", "msg-002"],
      "turnCount": 2,
      "deposited": false,
      "depositTypes": [],
      "createdAt": "2026-06-18T11:50:00Z",
      "updatedAt": "2026-06-18T12:00:00Z",
      "closedAt": "2026-06-18T12:00:00Z"
    }
  },
  "caseIdsByConversation": {
    "conv-xyz789": ["case-abc123"]
  }
}
```

### Evidence Ledger 存储

**位置**：`.runtime/users/{scopeKey}/evidence-ledgers.json`

**结构**：
```json
{
  "ledgers": {
    "case-abc123": {
      "caseId": "case-abc123",
      "conversationId": "conv-xyz789",
      "entries": [
        {
          "id": "ev-123",
          "source": "mcp_tool",
          "content": { ... },
          "recorded_at": "2026-06-18T11:55:00Z"
        }
      ],
      "lastUpdated": "2026-06-18T12:00:00Z"
    }
  },
  "caseIdsByConversation": {
    "conv-xyz789": ["case-abc123"]
  }
}
```

---

## 类型定义

### IntentType → ServiceType 映射

**位置**：`src/contracts/service-catalog/intent-to-service-type.ts`

```typescript
const INTENT_TO_SERVICE_TYPE: Partial<Record<IntentType, ServiceType>> = {
  report_query: 'data_query',
  diagnosis: 'data_issue_diagnosis',
  get_delivery_packages: 'package_fetch',
  debugging: 'system_operation',
  demand: 'light_requirement',
  help: 'field_definition',
  forecast: 'data_query',
  monitor: 'system_operation',
  general: 'general_chat',
};

export function intentToServiceType(intentType: IntentType | string): ServiceType {
  return INTENT_TO_SERVICE_TYPE[intentType as IntentType] ?? 'general_chat';
}
```

---

## 测试验证

### TypeScript 类型检查

```bash
cd frontend/src
pnpm ts-check
```

✅ 通过，无错误

### E2E 测试

```bash
# 启动服务
pnpm dev

# 在浏览器中访问并测试
# 1. 扫码登录
# 2. 输入 "巨量近7天的消耗"
# 3. 验证 CaseFrame 创建和 Evidence Ledger 关联
```

---

## 总结

### 已实现的集成点

1. ✅ **Understanding Stage**：创建/获取 CaseFrame，更新消息 ID 和业务上下文
2. ✅ **Evidence Ledger**：使用 CaseFrame.caseId 作为存储键
3. ✅ **Pipeline Context**：传递 CaseFrame 给后续 stages
4. ✅ **类型安全**：IntentType → ServiceType 映射，减少 `any` 和 `as` 使用
5. ✅ **辅助函数**：提供 CaseFrame 状态更新的类型安全方法

### 待实现的集成点

1. ⏳ **Planning Stage**：更新阶段为 `clarifying` 或 `ready_to_execute`
2. ⏳ **Execution Stage**：更新阶段为 `executing`，添加证据引用
3. ⏳ **Result Stage**：更新阶段为 `resolved`，添加产物
4. ⏳ **Open Answer Stage**：更新阶段，添加知识库/公开联网证据

### 架构优势

- ✅ **跨轮持久化**：CaseFrame 贯穿多个对话轮次
- ✅ **证据累积**：Evidence Ledger 与 CaseFrame 正确关联
- ✅ **类型安全**：减少 `any` 和 `as` 使用
- ✅ **可扩展**：辅助函数易于使用和扩展
- ✅ **Feedback Loop**：自动触发服务沉淀

---

**下一步**：
1. 在后续 stages 中集成 CaseFrame 状态更新
2. 完善 Feedback Loop 沉淀策略
3. 添加更多类型定义，减少 `any` 使用
