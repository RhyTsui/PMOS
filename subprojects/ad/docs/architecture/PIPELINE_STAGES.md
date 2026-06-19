# Pipeline Stages 架构文档

> 版本：1.0.0  
> 最后更新：2026-06-18  
> 状态：实现已完成，文档待评审

---

## 概述

Chat Pipeline 是 Enterprise AI Chat OS 的核心执行链路，负责将用户输入转化为可执行的查询并返回结果。

Pipeline 采用**阶段式架构**，每个 stage 有明确的职责和进入条件。stage 之间通过 `ChatPipelineContext` 传递状态。

---

## Stage 总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Understanding Stage                       │
│  职责：意图识别、路由决策、上下文编译、能力发现           │
│  输出：route、userRequirement、semanticFrame               │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                  ┌──────────────────┐
│ Diagnosis Stage  │                  │  Public Web Stage │
│ 诊断类问题处理    │                  │  公开联网搜索     │
└──────────────────┘                  └──────────────────┘
        ↓                                       ↓
        └───────────────────┬───────────────────┘
                            ↓
              ┌─────────────────────────┐
              │  Open Answer Stage      │
              │  开放式回答（兜底）      │
              └─────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                  ┌──────────────────┐
│ Multi-Query      │                  │ Report Query     │
│ Stage            │  ──fallback──>   │ Stage            │
│ 多工具编排/拼表   │                  │ 单工具报表查询    │
└──────────────────┘                  └──────────────────┘
```

---

## Stage 详细说明

### 1. Understanding Stage

**文件**: `understanding-stage.ts`  
**职责**: 意图识别、路由决策、上下文编译、能力发现

**进入条件**: 始终执行（pipeline 入口）

**核心流程**:
1. 编译上下文（项目信息、历史对话、slot 状态）
2. 推导 semanticFrame（言语行为、语义任务、业务对象）
3. 推导 userRequirement（指标、维度、时间范围、筛选条件）
4. 路由决策（rule-based + LLM shadow）
5. 能力发现（capability manifest、candidates）
6. 服务提案生成（service proposal）

**输出**:
- `route`: 路由决策结果
- `userRequirement`: 用户需求契约
- `semanticFrame`: 语义框架
- `routeCapabilityManifest`: 能力清单
- `routeCapabilityCandidates`: 候选能力
- `serviceProposal`: 服务提案（三段式响应）

**关键函数**:
- `executeUnderstandingStage(ctx, io)` — 主入口

---

### 2. Diagnosis Stage

**文件**: `diagnosis-stage.ts`  
**职责**: 诊断类问题处理（异常、报错、归因问题）

**进入条件**:
- `route.intent_type === 'diagnosis'` 或
- 用户问题匹配诊断类 pattern（为什么、异常、失败、报错等）

**核心流程**:
1. 加载诊断 Skill
2. 执行诊断流程（证据收集、根因分析）
3. 生成诊断报告

**输出**:
- 诊断结论
- 证据链
- 建议操作

**关键函数**:
- `executeDiagnosisStage(ctx, io)` — 主入口

---

### 3. Public Web Stage

**文件**: `public-web-stage.ts`  
**职责**: 公开联网搜索（事实性查询兜底）

**进入条件**:
- `publicWebNeed.required === true`（由 understanding stage 判断）
- 内部能力不足时需要公开信息补充

**核心流程**:
1. 构建搜索 query
2. 调用搜索 provider（Perplexity/Tavily 等）
3. 结果相关性过滤
4. 生成 source refs

**输出**:
- `publicWebResult`: 搜索结果
- `sourceRefs`: 来源引用

**关键函数**:
- `executePublicWebStage(ctx, io)` — 主入口

---

### 4. Open Answer Stage

**文件**: `open-answer-stage.ts`  
**职责**: 开放式回答生成（兜底 stage）

**进入条件**:
- 未进入其他 terminal stage
- 或前序 stage 返回 `terminal: false`

**核心流程**:
1. 收集上下文（知识库、公开联网结果）
2. 构建 prompt
3. 调用 LLM 生成回答
4. 附加 source refs 和 disclaimers

**输出**:
- 回答内容（markdown）
- 来源引用
- 免责声明

**关键函数**:
- `executeOpenAnswerStage(ctx, io)` — 主入口

---

### 5. Multi-Query Stage

**文件**: `multi-query-stage.ts`  
**职责**: 多工具编排/拼表（跨工具联邦查询）

**进入条件**:
1. `isReportQuery === true`（报表查询场景）
2. 用户需要多个指标或维度
3. **没有任何单个工具能满足完整需求**（关键条件）

**核心逻辑**:
- 检查是否存在一个工具能同时覆盖所有请求的指标和维度
- 如果有这样的工具 → 不需要 multi-query，走 report-query
- 如果没有这样的工具 → 需要 multi-query 拼表

**典型场景**:

**场景 1：单工具满足（走 report-query）**
```
查询："查看消耗和 ROI"
工具：get_zt_ad_day_report（同时支持 cost 和 roi 指标）
结果：✅ 一个工具就能提供两个指标 → 走 report-query
```

**场景 2：需要多工具拼表（走 multi-query）**
```
查询："查看消耗、ROI、次留"
工具：
  - get_zt_ad_day_report（支持 cost、roi，但不支持 retention）
  - get_zt_ad_retention_report（支持 retention，但不支持 cost、roi）
结果：❌ 没有一个工具能同时提供所有指标 → 走 multi-query
```

**核心流程**:
1. 从 userRequirement 提取指标和维度
2. 检查是否存在单个工具能满足完整需求
3. 如果需要多工具，调用 multi-tool-orchestrator 执行联邦查询
4. 各工具并行取数
5. 结果合并（按维度 JOIN）
6. 转换为 markdown 表格 + 结构化数据

**与 Report Query Stage 的关系**:
- **互斥关系**：如果 single tool 能满足需求，走 report-query；否则走 multi-query
- **Fallback 关系**：如果 multi-query 不满足条件或执行失败，可 fallback 到 report-query
- **增强关系**：multi-query 是 report-query 的增强版，支持跨工具查询

**输出**:
- 合并后的表格数据
- 各工具的执行 trace
- 结构化结果（semantic result）

**关键函数**:
- `shouldEnterMultiQueryStage(ctx, servers)` — 进入条件判断（核心逻辑）
- `executeMultiQueryStage(ctx, io)` — 主入口

**指标域映射**:
```typescript
const METRIC_DOMAIN_MAP = {
  cost: 'daily',
  activation: 'daily',
  register: 'daily',
  payment: 'daily',
  revenue: 'daily',
  arppu: 'daily',
  roi: 'roi',
  roas: 'roi',
  retention_d1: 'retention',
  retention_d7: 'retention',
  retention_d30: 'retention',
};
```

---

### 6. Report Query Stage

**文件**: `report-query-stage.ts`  
**职责**: 单工具报表查询（标准问数链路）

**进入条件**:
- `isReportQuery === true`
- 未进入 multi-query stage 或 multi-query fallback

**典型场景**:
- "巨量近 7 天的消耗"（单域查询）
- "昨天激活数"（单指标查询）

**核心流程**:
1. 选择能力（capability selection）
2. 执行 MCP 工具调用
3. 结果转换（表格数据、图表数据）
4. 生成 semantic result

**输出**:
- 表格/图表数据
- 执行 trace
- 结构化结果

**关键函数**:
- `executeReportQueryStage(ctx, io)` — 主入口

---

### 7. Package Stage（新增）

**文件**: `package-stage.ts`  
**职责**: 包查询/交付 Skill 执行

**进入条件**:
- `route.intent_type === 'get_delivery_packages'`
- 选中的 skill 为 `package_status_query_skill` 或 `package_delivery_execution_skill`

**典型场景**:
- "查看可投放包"
- "下载 APK"

**核心流程**:
1. 加载包查询 Skill
2. 执行包查询/交付
3. 返回包信息

**输出**:
- 包列表或包文件

**关键函数**:
- `executePackageStage(ctx, io)` — 主入口

---

## Stage 调度逻辑

### route.ts 中的调度顺序

```typescript
// 1. Understanding Stage（始终执行）
const understandingResult = await executeUnderstandingStage(ctx, io);

// 2. Diagnosis Stage（诊断类问题）
if (route.intent_type === 'diagnosis') {
  const diagnosisResult = await executeDiagnosisStage(ctx, io);
  if (diagnosisResult.terminal) return;
}

// 3. Public Web Stage（公开联网）
if (publicWebNeed.required) {
  const publicWebResult = await executePublicWebStage(ctx, io);
}

// 4. Open Answer Stage（开放式回答）
if (!isReportQuery) {
  const openAnswerResult = await executeOpenAnswerStage(ctx, io);
  if (openAnswerResult.terminal) return;
} else {
  // 5. Multi-Query Stage（多工具编排）
  if (shouldEnterMultiQueryStage(ctx, routeServers)) {
    const multiQueryResult = await executeMultiQueryStage(ctx, io);
    if (multiQueryResult.terminal) return;
  }

  // 6. Report Query Stage（单工具报表查询）
  const reportQueryResult = await executeReportQueryStage(ctx, io);
  if (reportQueryResult.terminal) return;

  // 7. Package Stage（包查询/交付）
  if (route.intent_type === 'get_delivery_packages') {
    const packageResult = await executePackageStage(ctx, io);
    if (packageResult.terminal) return;
  }
}
```

### Terminal 语义

- `terminal: true` — stage 已完成任务，pipeline 结束
- `terminal: false` — stage 未完成任务，继续下一个 stage

---

## Context 传递

所有 stage 共享 `ChatPipelineContext`，包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `message` | string | 用户原始消息 |
| `conversationId` | string | 会话 ID |
| `traceId` | string | 追踪 ID |
| `userScope` | UserScope | 用户身份 |
| `semanticFrame` | RequestSemanticFrame | 语义框架 |
| `userRequirement` | UserRequirementContract | 用户需求契约 |
| `route` | RouteDecision | 路由决策 |
| `routeCapabilityManifest` | CapabilityManifest[] | 能力清单 |
| `routeCapabilityCandidates` | CapabilityCandidate[] | 候选能力 |
| `isReportQuery` | boolean | 是否报表查询 |
| `serviceProposal` | ServiceProposal | 服务提案 |

---

## 扩展新 Stage

### 步骤

1. **创建 stage 文件**: `src/lib/chat-pipeline/new-stage.ts`
2. **定义进入条件**: `shouldEnterNewStage(ctx): boolean`
3. **实现主函数**: `executeNewStage(ctx, io): Promise<ChatPipelineResult>`
4. **导出**: 在 `index.ts` 中导出
5. **集成**: 在 `route.ts` 中按调度顺序调用

### 模板

```typescript
/**
 * New Stage — 职责说明
 *
 * 进入条件：
 * 1. 条件 1
 * 2. 条件 2
 */

export function shouldEnterNewStage(ctx: ChatPipelineContext): boolean {
  // 进入条件判断
  return condition1 && condition2;
}

export async function executeNewStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  // 1. 推送开始事件
  io.pushEvent(createProcessEvent({
    type: 'stage.started',
    label: '新 stage',
    status: 'running',
  }));

  // 2. 执行核心逻辑
  const result = await doSomething();

  // 3. 推送完成事件
  io.pushEvent(createProcessEvent({
    type: 'stage.completed',
    label: '新 stage 完成',
    status: 'success',
  }));

  // 4. 返回结果
  return {
    terminal: true,
    content: result.answer,
    metadata: { ... },
  };
}
```

---

## 待解决问题

### 1. Multi-Query 与 Report Query 的边界

**现状**: multi-query 是 report-query 的增强版，两者互斥

**问题**:
- multi-query 失败时如何 fallback 到 report-query？
- 是否需要在 multi-query 失败时保留部分结果？

**建议**:
- 明确 fallback 策略
- 在 multi-query 失败时记录原因
- 考虑部分成功场景（部分指标取到数据）

### 2. Stage 间的状态传递

**现状**: 通过 `ChatPipelineContext` 传递

**问题**:
- context 字段越来越多
- 部分字段只在特定 stage 使用

**建议**:
- 按 stage 分组 context 字段
- 考虑使用 stage-specific context

### 3. Evidence Ledger 集成

**现状**: 每个 stage 独立记录 evidence

**问题**:
- 跨 stage 的 evidence 关联不清晰
- 缺少全局 evidence chain 视图

**建议**:
- 统一 evidence ledger 接口
- 支持 stage 间 evidence 引用

---

## 参考资料

- [Enterprise AI Chat OS 架构规格](./ENTERPRISE_AI_CHAT_OS_SPEC.md)
- [Pipeline 实现代码](../src/lib/chat-pipeline/)
- [route.ts 调度逻辑](../src/app/api/chat/route.ts)
