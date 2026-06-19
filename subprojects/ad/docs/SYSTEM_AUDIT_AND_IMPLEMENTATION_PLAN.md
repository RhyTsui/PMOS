# 小乔智投 1.0 — 系统审查与实施计划

> 审查日期：2026-06-18

---

## 一、系统现状概览

### 规模

| 维度 | 数量 |
|------|------|
| `lib/` 运行时模块 | 159 个 TS 文件 |
| `contracts/` 契约定义 | 73 个 TS 文件 |
| `components/cognitive/` 会话区组件 | 24 个 |
| `components/admin/` 管理后台 Tab | 20 个 |
| Store 持久化模块 | 32 个 JSON 文件 store |

### 当前支撑度评估

| 能力层 | 状态 | 支撑度 |
|--------|------|--------|
| 语义理解 | ✅ semanticFrame + objectResolver + Catalog 驱动 | 80% |
| 路由决策 | ✅ route rules + LLM signal + capability discovery | 70% |
| 安全护栏 | ✅ 3 层 guardrail（input/tool/output） | 90% |
| 证据追溯 | ✅ Evidence Ledger + Disclosure Contract | 60%（不跨请求） |
| 可观测性 | ✅ Runner hooks + trace spans + admin 面板 | 85% |
| 问数链路 | ✅ report-query-stage + MCP 调用 + 结果组装 | 70% |
| 排查链路 | ✅ diagnosis-stage（仅归因回传诊断 Skill） | 40% |
| 服务目录 | ❌ 散落两处枚举，不统一 | 20% |
| CaseFrame | ❌ 无跨轮持久状态 | 0% |
| 服务提案卡 | ❌ 无前端组件 | 0% |
| 拼表 | ❌ 无 pipeline stage | 0% |
| 取包 | ⚠️ Skill 已注册但无路由分发 | 10% |
| 创意数据 | ❌ 无 pipeline stage | 0% |
| 自动化执行 | ❌ Worker 空壳 | 5% |
| 服务沉淀 | ❌ 无 Feedback Loop | 0% |

---

## 二、当前系统 10 大缺陷

### P0 级（上线阻断）

#### 缺陷 1：5 个 pipeline stage 文件有 `@ts-nocheck`

```
report-query-stage.ts:     // @ts-nocheck
open-answer-stage.ts:      // @ts-nocheck
understanding-stage.ts:    // @ts-nocheck
diagnosis-stage.ts:        // @ts-nocheck
public-web-stage.ts:       // @ts-nocheck
```

类型错误在生产构建时不会被捕获，`pnpm ts-check` 门禁实际上绕过了主链路。

#### 缺陷 2：没有 Service Catalog — 服务类型散落且不统一

- `ServiceIntent`（route-decision-contract.ts）定义了 11 种
- `PlannerServiceIntent`（planner-plan-contract.ts）定义了 10 种
- 两者不完全一致：Planner 有 `report_summary`/`requirement_drafting`/`clarification`，而 ServiceIntent 没有
- 新增服务类型需要改两个枚举，无法动态查询"系统能提供什么服务"

#### 缺陷 3：没有 CaseFrame — 无跨轮持久状态

- `conversation-store.ts` 只存 conversation + messages（文本级别）
- `semanticFrame` 是每轮重新推理的中间产物，不跨轮持久化
- 没有 `caseId` 概念 — 一个 conversation 中的多个独立 case 无法区分
- 没有 case 生命周期状态机

#### 缺陷 4：没有 Service Proposal Card — 用户感知不到服务前台

- `MessageBubble.tsx` 只渲染 markdown 文本 + tool_calls 标签
- 没有任何组件渲染"我理解你的目标 → 我能帮你做 3 件事 → 我还需要确认什么"的三段式结构
- 系统虽然能在后端正确路由，但前端体验仍然是"一问一答"

#### 缺陷 5：Automation Worker 是空壳

```typescript
// automation-worker.ts:48
export async function executeAutomationTask(task) {
  // Stage 0: 模拟执行 — 不实际调用 chat runtime 或 MCP
  return { runId, taskId, status: 'success', artifacts: [], notifications: [] };
}
```

### P1 级（核心能力补齐）

#### 缺陷 6：Planner Shadow 只观测不干预

- `planner-shadow.ts` 明确标注"只生成候选，只记录观测，不接管路由"
- `planner-route-alignment.ts` 对比 route vs planner，但"只进 trace，不改变 route/tool/answer"
- Planner 的 `plan_steps`、`candidate_capabilities`、`required_inputs` 全部是观测数据，不驱动执行

#### 缺陷 7：拼表/取包/创意数据 — 无对应 pipeline stage

- route.ts 主链路只有 3 个分支：report-query / diagnosis / open-answer
- 取包 Skill 已注册但未被 route 分发到
- 没有 join-table-stage 和 creative-data-stage

#### 缺陷 8：Service Discovery 不输出 possibleServices

- `semanticFrame` 只输出单一 `serviceIntent` + `semanticTask`
- 没有输出"可选服务列表 + 缺失信息 + 推荐下一步"

#### 缺陷 9：没有 Feedback Loop / 服务沉淀机制

- 没有 case 结束后的自动沉淀：知识草稿、别名候选、评测用例、能力缺口
- 每次服务从零开始，无法复用历史排查结论

#### 缺陷 10：Evidence Ledger 不跨请求持久化

- 每次 `/api/chat` 请求创建新的空 `EvidenceLedger`
- Ledger 在该请求结束后不再可查
- 无法实现跨请求的证据关联

---

## 三、多工具编排（拼表）设计

### 核心原则

> 用户问的拼表，维度口径肯定要一样。如果 B 工具不支持对应的维度，就不用去选择它。

### 架构

```
用户: "给我昨天三小的消耗、激活、ROI、次留，按媒体拆"
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. DECOMPOSE（拆解）                                         │
│    识别：需要维度 [media, date]，需要指标 [消耗, 激活, ROI, 次留]  │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TOOL SELECTION（按能力 + 维度过滤）                         │
│    daily_tool: supports dimensions=[media, date] ✅          │
│    roi_tool: supports dimensions=[media, date] ✅            │
│    retention_tool: supports dimensions=[media, date] ✅      │
│    some_tool: supports dimensions=[date] ❌ 不支持 media，跳过 │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────┬─────────────┬─────────────┐
│ 3. EXECUTE（并行调用）                      │
│    daily_tool → 消耗/激活  roi_tool → ROI  retention_tool → 次留 │
└─────────────┴─────────────┴─────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. NORMALIZE（维度归一化 — 复用 entity resolution）            │
│    日期格式统一、媒体名称对齐                                   │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. JOIN（按共同维度 FULL JOIN，固定策略）                       │
│    JOIN KEY = [date, media]                                  │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. PRESENT → 消息内表格 / 图表 / Excel 下载                    │
└─────────────────────────────────────────────────────────────┘
```

### 核心类型定义

```typescript
// 子查询
interface SubQuery {
  subQueryId: string;
  toolName: string;
  serverName: string;
  metrics: string[];       // 该工具负责取的指标
  dimensions: string[];    // 统一的维度
  filters: Record<string, string[]>;
}

// 查询拆解结果
interface QueryDecomposition {
  originalQuery: string;
  requiredDimensions: string[];
  subQueries: SubQuery[];
}

// 合并后的结果
interface FederatedQueryResult {
  columns: Column[];
  rows: Row[];
  sourceTrace: Record<string, { tool: string; server: string }>;
  subQueryResults: SubQueryResult[];
}
```

### 工具选择逻辑

```typescript
function selectToolsForQuery(
  requiredMetrics: string[],
  requiredDimensions: string[],
  capabilities: CapabilityManifest[]
): CapabilityManifest[] {
  return capabilities.filter(cap => {
    // 必须支持所有需要的维度
    const supportsAllDimensions = requiredDimensions.every(
      dim => cap.supports.dimensions.includes(dim)
    );
    // 至少支持一个需要的指标
    const supportsSomeMetric = requiredMetrics.some(
      metric => cap.supports.metrics.includes(metric)
    );
    return supportsAllDimensions && supportsSomeMetric;
  });
}
```

### 维度归一化

复用已有的 entity resolution 基础设施，从 domain ontology 读取标准化映射。

### Join 策略

固定为 FULL JOIN（保留所有维度组合，缺失填空），因为：
- 所有被选中的工具都支持相同的维度（选择阶段已保证）
- 不需要用户选择策略
- 缺失数据填空值即可

### 实现文件清单

| 文件 | 说明 | 预计行数 |
|------|------|---------|
| `contracts/multi-query/query-decomposition-contract.ts` | 查询拆解契约 | ~80 行 |
| `lib/query-decomposer.ts` | 查询拆解器 | ~150 行 |
| `lib/dimension-normalizer.ts` | 维度归一化 | ~100 行 |
| `lib/result-joiner.ts` | 结果合并 | ~150 行 |
| `lib/multi-tool-orchestrator.ts` | 编排器（串联上述模块） | ~200 行 |
| `lib/chat-pipeline/multi-query-stage.ts` | Pipeline stage | ~300 行 |
| `app/api/chat/route.ts` | 集成新 stage | 修改 |
| **总计** | | **~1000 行** |

---

## 四、开源框架对比与决策

| 框架 | 开源 | 决策 | 原因 |
|------|------|------|------|
| **LangGraph** | ✅ | ❌ P3 暂缓 | 大材小用，CaseFrame 用纯 TS ~400 行即可实现 |
| **FastMCP** | ✅ | ⚠️ 视部署环境 | Excel 解析可用 JS 库 (xlsx) 替代，避免引入 Python 依赖 |
| **Temporal** | ✅ MIT | ❌ P3 暂缓 | 当前用 node-cron + JSON store 即可，任务量大了再考虑 |
| **MarkItDown** | ✅ | ⚠️ 视 FastMCP | 处理 PDF/Word/PPT，如果不需要这类文件可跳过 |
| **Trino/Presto** | ✅ | ❌ 不适用 | 数据库联邦查询，不适用于 MCP 工具调用场景 |
| **Rasa** | ✅ | 📖 只参考 | slots/forms 概念已被 semanticFrame 覆盖 |
| **OpenAI CS Demo** | ✅ | 📖 只参考 | triage + handoff 模式可参考 |

### Excel 解析方案选择

| 方案 | 优点 | 缺点 |
|------|------|------|
| **xlsx (SheetJS)** | 纯 JS，无额外依赖 | 复杂 Excel 功能有限 |
| **FastMCP + pandas** | 功能强大，生态丰富 | 需要 Python 环境，增加运维复杂度 |

**建议**：先用 xlsx（SheetJS），功能不够再考虑 FastMCP。

---

## 五、P0/P1/P2/P3 待办清单

### 🔴 P0：第一阶段上线阻断

| # | 待办 | 说明 | 涉及文件 |
|---|------|------|---------|
| 1 | 移除 5 个 pipeline stage 的 `@ts-nocheck` | 类型安全是基础门禁 | 5 个 stage 文件 |
| 2 | 统一 Service Catalog | 合并 ServiceIntent + PlannerServiceIntent，建立服务定义 | 新建 `contracts/service-catalog/` |
| 3 | 实现 CaseFrame 契约与持久化 | 多轮对话的基础 | 新建 `contracts/case-frame/` + `lib/case-frame-store.ts` |
| 4 | 实现 Service Proposal Card 前端组件 | 用户感知服务前台 | 新建 `components/cognitive/ServiceProposalCard.tsx` |
| 5 | 实现多工具编排（拼表） | 跨 MCP 取数 + 维度对齐 + 结果拼装 | 见上方文件清单 |
| 6 | 打通取包链路 | Skill 已注册，需 route 分发 | route.ts 新增 package 分支 |
| 7 | 打通创意数据链路 | 新建 stage | `chat-pipeline/creative-data-stage.ts` |

### 🟡 P1：核心能力补齐

| # | 待办 | 说明 |
|---|------|------|
| 8 | Automation Worker 真实执行 | 用 node-cron + 现有 store，调用 chat runtime |
| 9 | Service Discovery 增强 | 输出 possibleServices + 推荐排序 |
| 10 | Feedback Loop | 知识草稿 + 字段别名 + 能力缺口沉淀 |
| 11 | Evidence Ledger 跨请求持久化 | 按 caseId 存储，复用 case-frame-store 模式 |
| 12 | 补齐排查 Skill | 数据问题排查、配置问题排查 |
| 13 | 自动聚合分析 Skill | 标签聚合、排序、对比、趋势 |
| 14 | 自动排查解答 Skill | 基于证据生成业务回复 |

### 🟢 P2：战略增强

| # | 待办 |
|---|------|
| 15 | Deep Agents 复杂任务 adapter |
| 16 | 数字优化师 Shadow Mode |
| 17 | 行业情报 / 竞品研究 |
| 18 | 多 Agent 协作编排 |
| 19 | Playbook Retriever |
| 20 | Case Library 管理后台 |

### 🔵 P3：研究储备

| # | 待办 |
|---|------|
| 21 | 预测分析能力 |
| 22 | 创意挖掘 |
| 23 | 广告搭建自动化 |
| 24 | 自动对接 |
| 25 | LangGraph 复杂多 agent DAG（等真正需要时再评估） |
| 26 | Temporal OSS 长任务编排（等任务量大了再评估） |

---

## 六、实施优先级建议

### 第一阶段（2 周）— 基础 + 拼表

1. 移除 5 个 pipeline stage 的 `@ts-nocheck`
2. 统一 Service Catalog
3. 纯 TypeScript 实现 CaseFrame 状态机
4. 打通取包链路（Skill 已注册，只需 route 分发）
5. 实现多工具编排（拼表）

### 第二阶段（2 周）— 体验 + 创意

6. 实现 Service Proposal Card 前端组件
7. 新建 creative-data-stage
8. 用 node-cron 实现 Automation Worker 真实执行
9. 实现 Service Discovery 增强（possibleServices）

### 第三阶段（2 周）— Skill 补齐

10. 补齐排查 Skill（数据问题 + 配置问题）
11. 实现自动聚合分析 Skill
12. 实现自动排查解答 Skill

### 第四阶段（持续）— 沉淀 + 进化

13. 实现 Feedback Loop
14. Evidence Ledger 跨请求持久化
15. Deep Agents adapter（P2）
