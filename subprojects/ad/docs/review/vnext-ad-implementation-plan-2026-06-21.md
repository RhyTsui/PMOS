# VNext AD 系统性实施计划

日期：2026-06-21

目标：围绕 VNext 产品真源，把 AD 从局部 MIG 修复推进到统一服务入口、统一数据入口、统一交付入口、统一自动化运行入口的系统收口。实施过程中禁止硬编码、业务 if/else、信号词堆叠、样例补丁、Prompt 绕路和 UI 反推。

## Phase 1：恢复真实回放入口

目标：先让测试入口可重复运行，避免继续靠局部猜测判断质量。

1. 刷新 `tmp/auth-state.json` 登录态。
2. 启动 8002 服务后执行：

```powershell
$env:SECOND_ROUND_NON_INTERACTIVE='1'
$env:SECOND_ROUND_KILL_SERVER_ON_MEMORY_GUARD='1'
$env:SECOND_ROUND_EXCEL_ROWS='2-16'
node scripts\run-second-round-tests.cjs
```

3. 对 Batch A 每条 case 补齐 `/api/chat`、SSE done、ResponseContract、Evidence Ledger、SourceRef、ToolCallTrace、process_events、answer_origin、ContractSafety、乱码健康和非硬编码补测。

退出条件：rows 2-16 不再因登录态阻断，失败项全部归因到真实链路、数据口径、权限或规则债务。

## Phase 2：P0 规则债务迁移

目标：把运行链路中的业务词规则迁移到受治理配置。

1. `query-decomposer.ts`：迁移指标、时间、维度同义词到 metric catalog 和 query intent contract。
2. `report-query-orchestrator.ts`：迁移报表形态、字段投影、分组策略到 report capability/tool contract。
3. `tool-capability-normalization.ts`：能力分类只读取 manifest/tool metadata，不通过工具名正则推断。
4. `intent-route-engine.ts` 与旧 `intent-router.ts`：route policy 进入 Admin policy，runtime 只消费编译后的 policy id。
5. `debug-automation`：通过 workflow runtime metadata 和 trace event type 识别，不通过名称正则识别。

退出条件：P0 规则债务清零，`check:rule-debt-inventory` 与新增非硬编码反样例通过。

## Phase 3：Data Intelligence 产品化回答

目标：报表、问数、诊断、复盘不只返回证据表，而是输出可交付结论。

1. 建立 report answer contract：结论、证据、口径、风险、下一步动作。
2. 报表字段投影统一走 contract，禁止在 Answer Composer 或 Prompt 中硬补测试值。
3. 数据/测试口径冲突进入复核清单，真实 MCP 返回默认作为事实证据。
4. 对 rows 17-76 做分片回放，保留 checkpoint 与明细表。

退出条件：报表类 case 的 `source_refs/evidence_refs/tool_call_trace/contract_safety` 一致，且用户答案具备结论和动作。

## Phase 4：Evidence Ledger 闭环

目标：所有答案都能追溯事实、推断、工具执行和降级路径。

覆盖样例必须包括：

- 工具成功
- 工具失败
- 空结果
- 知识库
- 公开联网
- planner inference
- fallback
- invalid date
- 权限不足
- 模型降级

退出条件：Output Guardrail 真实回放不再只依赖自测，能够从 checkpoint 抽样验证 evidence 与 contract 一致。

## Phase 5：Admin Control Plane 与 Task Center

目标：控制面统一治理，任务运行统一承接。

1. Admin 统一管理 capability、tool contract、route policy、model/prompt、Evidence policy、Safety policy、Trace、feature flags。
2. Task Center 承接会话中的任务、巡检、诊断、交付、自动化运行状态。
3. Workflow Runtime 增加审批、回滚、审计、告警和移动端继续处理。

退出条件：交付和自动化类 case 可从会话进入任务中心，并能回到会话继续处理。

## Phase 6：UISchema、Golden 与移动端

目标：前端交付符合 Ant Design X + UI Guardrail，避免传统后台和工程说明页。

1. 会话工作台、运行过程、Task Center、Admin、结果区域补 UISchema/golden。
2. 每个结果区域声明 `screenType`、`layout`、`regions`、`sourceRefs`、`evidenceRefs`。
3. 覆盖空态、加载、错误、权限、移动端堆叠和下一步动作。
4. 用户可见文案不得出现工程黑话。

退出条件：`validate:ad-ui`、移动端布局检查、golden 检查和乱码健康全部通过。

## Phase 7：上线准入

准入前必须完成：

1. 当前测试集 107 条有用例 ID 的有效用例全部完成真实回放。
2. P0 规则债务清零，P1 有 owner、迁移方案、验证方式和退出日期。
3. Batch A/B/C 都有 checkpoint、失败归因和数据口径复核结论。
4. `validate:ad-ui`、`check:encoding`、`git diff --check`、Output Guardrail、report-query/multi-query self-test、二轮评估器 self-test 全部通过。
5. 上线准入文档明确哪些能力可进入下一阶段，哪些因真实链路、证据、控制面、移动端或硬编码风险阻断。
