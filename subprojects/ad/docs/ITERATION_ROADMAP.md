# 小乔智投 迭代路线图

> 制定日期：2026-06-17
> 来源：18 项已知缺陷 × 6 阶段实施计划

---

## VNext 关系说明

2026-06-20 起，产品定位升级为“面向游戏发行体系的 AI 服务平台”。当前 VNext P0-P3 迭代真源见：

- `docs/小乔智投-VNext-P0-P3迭代计划-2026-06-20.md`
- `docs/review/xiaoqiao-vnext-p0-p3-review-docket-2026-06-20.md`

本文仍保留为 runtime 缺陷治理和工程阶段路线图。两者关系如下：

- VNext 文档定义产品定位、五大能力中心、P0-P3 业务与治理门禁。
- 本文定义 Enterprise AI Chat OS 主链路的工程缺陷修复顺序。
- VNext 五大中心不得绕开本文中的 Evidence、Guardrail、Capability、Trace、Admin 治理阶段。

---

## 一、缺陷全景

| # | 缺陷 | 来源 | 严重度 |
|---|------|------|--------|
| D1 | 请求理解双轨：request-understanding.ts 关键词 fallback 未迁移至 semanticFrame + Object Resolver | 迭代 #34-37 | 🔴 |
| D2 | Evidence Ledger 仅覆盖 open-answer 路径，问数/诊断/工具结果未入账 | 迭代 #82-86 | 🔴 |
| D3 | Contract Safety 缺口：无证据断言、工具结果改写、raw params 泄露、shadow 伪装等 6 项未检 | 迭代 #87-92 | 🔴 |
| D4 | Planner Shadow 无指标聚合（avg duration / success rate / task_type 分布） | 迭代 #17-18 | 🟡 |
| D5 | 无 offline shadow comparison（planner_route_alignment） | 迭代 #19-21 | 🟡 |
| D6 | capabilityRefs 无 resolver 层，ontology capabilityRefs 未验证 | 迭代 #50-57 | 🟡 |
| D7 | Capability Manifest 缺 executionClass / supportedSemanticTasks / requiredSlots / outputContract / riskLevel | 迭代 #44-45 | 🟡 |
| D8 | 无 Tool Fallback Policy（permission_blocked / unsupported / empty_data / business_failed / schema_mismatch） | 迭代 #75-81 | 🟡 |
| D9 | DataVizRenderer 无 columnSchema（仅 columns: string[]） | 迭代 #95-99 | 🟡 |
| D10 | Admin 治理能力不足（缺 Planner Shadow / Prompt / Capability / Feature Flags / Trace Sampling） | 迭代 #24, #102-106 | 🟡 |
| D11 | 无 Planner Assisted Routing（route review / confidence boost / candidate supplement） | 迭代 #107-109 | 🟡 |
| D12 | Automation Worker/Run History 缺口 | 迭代 #115-116 | 🟡 |
| D13 | Runner 4007 行单体，无清晰生命周期分解 | 最佳实践 | 🔴 |
| D14 | Guardrail 单层后置，无 input/tool/output 三层 + tripwire 熔断 | 最佳实践 | 🔴 |
| D15 | Trace 无 span 层级，非 trace-and-span 模型 | 最佳实践 | 🟡 |
| D16 | 无 Lifecycle Hooks（on_run_start/end, on_tool_start/end, on_llm_start/end） | 最佳实践 | 🟡 |
| D17 | 无 per-tool input/output guardrail | 最佳实践 | 🟡 |
| D18 | Answer Composer / Intent Router LLM 输出未强制结构化 | 最佳实践 | 🟡 |

---

## 二、阶段路线图

```
Stage 0 (Runner 分解 + Hook 基础设施)
  ↓
Stage 1 (请求理解收口)
  ↓
Stage 2 (3 层 Guardrail + Evidence & Safety)  ← D14 与 D2/D3 合并
  ↓
Stage 3 (Planner 度量 + 对齐 + 结构化输出)   ← D18 并入
  ↓
Stage 4 (能力层治理)
  ↓
Stage 5 (UI/Admin/辅助路由/Automation)
```

---

## 三、各阶段任务明细

### Stage 0 — Runner 分解 + Hook 基础设施（D13, D15, D16）

**目标**：将 route.ts 4007 行单体分解为清晰生命周期阶段，建立 trace-and-span + lifecycle hooks。

| 任务 | 对应缺陷 | 改动范围 |
|------|---------|---------|
| 0.1 定义 Runner Lifecycle 阶段：understanding → planning → capability_discovery → preflight → execution → result_assembly → safety → disclosure | D13 | 新增 lib/runner-lifecycle.ts |
| 0.2 定义 RunHooks 接口：on_stage_start/end、on_tool_start/end、on_llm_start/end、on_error | D16 | 新增 contracts/observability/runner-hooks.ts |
| 0.3 将 route.ts 按 lifecycle 阶段拆分为独立模块（每个 ≤500 行） | D13 | 重构 app/api/chat/route.ts |
| 0.4 Trace 升级：增加 span_id / parent_span / span_type，兼容 OpenTelemetry | D15 | lib/trace.ts + contracts/observability/ |
| 0.5 迁移现有 pushEvent(createProcessEvent(...)) 调用到 hook 系统 | D16 | lib/agent-runtime.ts + route.ts |

**Done 定义**：
- route.ts < 800 行（仅编排入口）
- 每个 lifecycle 阶段独立文件 ≤ 500 行
- 所有现有 SSE 事件通过 hook 系统发出
- trace 有 span_id/parent_span，可用 trace_id 查询完整 span 树

---

### Stage 1 — 请求理解收口（D1）

**目标**：消除 request-understanding.ts 关键词双轨，统一走 semanticFrame + Object Resolver + Dictionaries。

| 任务 | 迭代条目 | 改动范围 |
|------|---------|---------|
| 1.1 inferRequestedView 改为优先读 semanticFrame，正则仅 fallback | #37 | lib/request-understanding.ts |
| 1.2 inferMetrics 改为读 Metric Dictionary，正则仅 fallback | #41 | lib/request-understanding.ts |
| 1.3 inferDimensions 改为读 Dimension Catalog，正则仅 fallback | #40 | lib/request-understanding.ts |
| 1.4 hasStrongReportIntent 改为优先消费 semanticFrame + Object Resolver | #34-35 | lib/request-understanding.ts |
| 1.5 deriveUserRequirement 删除反向回填（关键词→报表意图），仅保留 semanticFrame 驱动 | #36 | lib/request-understanding.ts |
| 1.6 形式化 Schema Registry：lib/schema-registry.ts | #42 | 新增文件 |
| 1.7 field_definition 问题接入 Field Dictionary / Schema Registry | #43 | lib/field-definition-resolver.ts |

**Done 定义**：request-understanding.ts 中无独立关键词判断 serviceIntent / requestedView / metrics / dimensions；semanticFrame 为所有决策主输入。

---

### Stage 2 — 3 层 Guardrail + Evidence & Safety（D2, D3, D14, D17）

**目标**：参照 OpenAI Agents SDK 的 Input / Tool I/O / Output 三层 guardrail + tripwire 熔断。

| 任务 | 对应缺陷 | 改动范围 |
|------|---------|---------|
| 2.1 定义 3 层 Guardrail 契约（InputGuardrail / ToolGuardrail / OutputGuardrail），每层有 tripwire_triggered | D14 | 新增 contracts/validation/guardrail-contract.ts |
| 2.2 Input Guardrail 实现：PII 检测、prompt injection 检测、敏感话题熔断。挂载到 on_run_start hook | D14 | 新增 lib/guardrails/input-guardrail.ts |
| 2.3 Tool Guardrail 实现：tool input 参数合规、output 敏感信息过滤。挂载到 on_tool_start/end hook | D14, D17 | 新增 lib/guardrails/tool-guardrail.ts |
| 2.4 Output Guardrail 重构：将现有 contract-safety.ts 改造，补充 #88-92 检查项 | D3, D14 | lib/contract-safety.ts → lib/guardrails/output-guardrail.ts |
| 2.5 新增 lib/evidence-ledger.ts，定义 EvidenceLedger 类型（5 种分类） | D2 | 新增文件 |
| 2.6 问数/诊断/工具调用结果全部写入 Evidence Ledger | D2 | app/api/chat/route.ts |
| 2.7 Planner inference 单独标记为 planner_inference evidence type，与 tool_result 物理隔离 | D2 | lib/planner-shadow.ts + evidence-ledger |
| 2.8 Answer Composer 改为只基于 Evidence Ledger 生成答案 | D2 | lib/chat-answer-boundary.ts + prompt |
| 2.9 Output Guardrail 新增：无证据业务断言、工具结果被改写、raw params 泄露等检查 | D3 | lib/guardrails/output-guardrail.ts |

**Done 定义**：3 层 Guardrail 各自独立，tripwire 可中断请求；所有工具事实入 Ledger；Answer 只基于 Ledger；Output Guardrail 覆盖 #88-92 全部检查项。

---

### Stage 3 — Planner 度量 + 对齐 + 结构化输出（D4, D5, D18）

**目标**：Planner Shadow 可度量 + offline route 对齐 + Answer Composer 强制结构化输出。

| 任务 | 对应缺陷 | 改动范围 |
|------|---------|---------|
| 3.1 新增 lib/planner-shadow-metrics.ts，按 status 聚合计数 + 平均耗时 + task_type 分布 | D4 | 新增文件 |
| 3.2 新增 lib/planner-route-alignment.ts，对比 route.intent_type / planner.task_type 等字段 | D5 | 新增文件 |
| 3.3 输出 planner_route_alignment: matched / diverged / planner_uncertain / existing_uncertain | D5 | planner-route-alignment |
| 3.4 Answer Composer 增加 structured output 约束：facts[] / inferences[] / unverified[] / source_refs[] | D18 | lib/chat-answer-boundary.ts + prompt |
| 3.5 Intent Router LLM 路径增加 json_schema 约束，输出必须匹配 IntentRouteDecision contract | D18 | lib/intent-router.ts |

**Done 定义**：Planner 指标可查询；每次请求有 alignment 分类；answer 和 intent 的 LLM 输出有 schema 强制。

---

### Stage 4 — 能力层治理（D6, D7, D8）

**目标**：capabilityRefs 可验证 + Tool Contract Matching + Resolver Chain + Fallback Policy。

| 任务 | 迭代条目 | 改动范围 |
|------|---------|---------|
| 4.1 Capability Manifest 补强：executionClass / supportedSemanticTasks / requiredSlots / outputContract / riskLevel | #44-45 | contracts/capability/ + capability-orchestration.ts |
| 4.2 新增 lib/capability-refs-resolver.ts：capabilityRefs → 真实 MCP tool | D6, #50-51 | 新增文件 |
| 4.3 新增 lib/planner-capability-grounding.ts：PlannerPlan → Capability Candidate | D6, #52-57 | 新增文件 |
| 4.4 新增 lib/planner-tool-contract-matching.ts：校验 toolPurpose / requiredInputs / permission 等 | D6, #58-68 | 新增文件 |
| 4.5 接入 Resolver Chain：Context → Entity → Dictionary → Default Policy → Required Input Assist | D6, #70-74 | 新增 lib/resolver-chain.ts |
| 4.6 实现 Tool Fallback Policy：permission_blocked 不 fallback / unsupported 允许 / empty_data 支持等 | D8, #75-81 | 新增 lib/tool-fallback-policy.ts |

**Done 定义**：Capability Candidate → Executable → Tool Contract Matching → Resolver/Preflight 链路跑通；Fallback Policy 按规则分流。

---

### Stage 5 — UI / Admin / 辅助路由 / Automation（D9, D10, D11, D12）

**目标**：DataViz columnSchema + Admin 治理面板 + Planner 辅助路由 + Automation Worker。

| 任务 | 迭代条目 | 改动范围 |
|------|---------|---------|
| 5.1 DataVizRenderer 新增 columnSchema: [{key, label, type, visible}]，优先展示 label，禁用 as any | D9, #95-99 | types/viz.ts + DataVizRenderer.tsx |
| 5.2 Admin 新增 Planner Shadow Metrics 面板：ModelUseCase 分布、Prompt version、Shadow Success Rate | D10, #24, #103-104, #106 | components/admin/OrchestrationGovernanceTab.tsx |
| 5.3 Admin 新增 Capability Manifest / Tool Contract / Resolver Policy / Evidence Policy / Safety Policy 展示 | D10, #105 | admin |
| 5.4 Admin 新增 Feature Flags / Trace Sampling / 3 层 Guardrail 状态展示 | D10, #106 | admin |
| 5.5 Planner Assisted Routing Phase 1：route review（不覆盖 route） | D11, #107 | 新增 lib/planner-assisted-routing.ts |
| 5.6 Planner Assisted Routing Phase 2：Planner 与规则一致时提高 confidence；与 capability grounding 一致时补充候选 | D11, #108-109 | planner-assisted-routing |
| 5.7 Automation Worker 实现 + Run History UI | D12, #115-116 | 新增 lib/automation-worker.ts + admin |

**Done 定义**：DataViz 有 columnSchema；Admin 5 个新面板可用；Planner 辅助路由不覆盖主链但增强 confidence；Automation Worker 可执行已调度任务。

---

## 四、里程碑

| 里程碑 | 阶段 | 预计时长 | 关键交付 |
|--------|------|---------|---------|
| M0 Runner + Hook 基础设施 | Stage 0 | 1 周 | route.ts < 800 行；trace 有 span 树 |
| M1 请求理解单轨化 | Stage 1 | 1 周 | semanticFrame 驱动所有路由决策 |
| M2 3 层 Guardrail + Evidence 闭环 | Stage 2 | 1.5 周 | Input/Tool/Output 三层 + tripwire + 全量 Evidence Ledger |
| M3 Planner 可观测 + 结构化输出 | Stage 3 | 1 周 | Planner 指标 + alignment + LLM 输出 schema 强制 |
| M4 能力层全链路 | Stage 4 | 2 周 | capabilityRefs 验证 + Tool Matching + Fallback |
| M5 UI/Admin/辅助路由 | Stage 5 | 1-2 周 | DataViz columnSchema + Admin 面板 + 辅助路由 |

**总计约 7-8.5 周**

---

## 五、排除项

| 类型 | 迭代条目 | 原因 |
|------|---------|------|
| 测试/验收 | #38, #100, #101 | 用户要求排除 |
| 多 Agent 规划 | #118-124 | 用户要求排除；且依赖 Stage 1-4 完成 |
| 已落地 | #1-16, #22-33, #93-94, #96, #110-113 等 33 条 | 已有代码证据 |
