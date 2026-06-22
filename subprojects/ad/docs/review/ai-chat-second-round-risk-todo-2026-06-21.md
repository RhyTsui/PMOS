# AI Chat 第二轮风险待办 - 2026-06-21

## 当前结论

P0 仍不通过。本轮暂停前已完成部分复合指标链路治理、Output Guardrail 增强和评估器收紧，但真实 E2E 仍受数据口径、长耗时和内存稳定性阻断。

## 阶段性成果

1. MIG-051 当前不是误路由，也不是假成功；multi-query、retention 参数和 contract 已能成功进入真实链路。
2. ROI 复合指标已按工具契约拆分：累计 ROI 使用 `dataType=total`，第 N 日/周/月 ROI 使用 `dataType=section`。
3. 答案投影已支持 `section` ROI 直接展示当前周期字段，例如 `roi45_rate=0.00057` -> `第45日ROI=0.06%`。
4. retention 已按类型拆分为三类工具调用：设备留存、注册留存、首日付费留存。
5. 第二轮评估器已收紧到期望关键结果 100% 覆盖，并补充百分比舍入容忍。
6. Output Guardrail 已补 P0 自测，覆盖无证据业务断言、raw params 泄露、planner shadow 伪装执行、工具失败说成功、工具空结果说有数据。
7. 内存护栏支持超阈值停止服务进程，但 runtime 侧内存增长根因未定位。

## 未解决 P0

1. MIG-051 数据/测试口径不一致：真实返回约 `139 / 37.41% / 40.00% / 43.24%`，测试期望为 `459 / 39.87% / 41.12% / 69.39%`。
2. MIG-050/052 ROI 口径仍需复核：不能通过硬编码期望值解决，应确认 MCP `total/section` 返回与测试集期望定义。
3. MIG-050~053 targeted E2E 曾在 240 秒超时，未得到完整最新真实链路结果。
4. MIG-050~060 批量曾在 MIG-054 前触发内存护栏，RSS 采样约 3855MB，后续 case 未继续。
5. MIG-055~060 未在最新代码后完整复跑。
6. 周报/月报和报告型回答仍偏证据表预览，缺用户可读的经营结论、风险和下一步动作。

## 已验证命令

- `npm.cmd exec tsx scripts\multi-query-stage-self-test.ts`：通过。
- `node --check scripts\run-second-round-tests.cjs`：通过。
- `npm.cmd exec tsx scripts\probe-mig050-053-multiquery.ts`：通过，确认 MIG-050/052/053 已拆出 `total` 与 `section` ROI 子查询。
- `npm.cmd exec -- tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify`：通过。

## 清理说明

2026-06-21 未跟踪的 second-round checkpoint/xlsx 原始产物已清理，避免工作区继续膨胀。后续 review 应以本文件和 `docs/review/ai-chat-workspace-handoff-2026-06-21.md` 为入口；如需要原始 checkpoint，请重新分片跑 targeted E2E。

## 下一步建议

1. 先 review 当前系统与工作树差异，确认哪些改动属于本轮修复、哪些是既有改动。
2. 单独跑 MIG-050，验证 `第45日ROI=0.06%` 是否进入最终回答。
3. 单独跑 MIG-052，验证 `2周ROI` 与 `第2周ROI` 的 `total/section` 口径。
4. 对 MIG-051 做数据/测试口径复核，不在 runtime 写死目标值。
5. 用短批次和内存采样定位长链路 RSS 增长，再恢复 MIG-050~060 批量 gate。

## 2026-06-23 实施任务化追踪

状态：已转为可执行 checklist，后续 review 按条关闭。

| 优先级 | 任务 | 关联文件 | 验收命令 | 退出条件 |
|---|---|---|---|---|
| P0 | legacy 路由只作为候选信号，不授权最终 workflow | `src/ad/xiaoqiao/routing.py`; `src/ad/xiaoqiao/service.py`; `frontend/src/src/lib/intent-router.ts` | `python -m unittest tests.test_xiaoqiao_routing`; `npm.cmd exec vitest run tests/intent-router-governance.test.ts` | Trace / routing record 中出现 `candidate_only`，且不会由 legacy adapter 直接创建业务任务。 |
| P0 | 能力差异进入 Capability Manifest，而不是通用 Chat Core 关键词分支 | `frontend/src/src/contracts/capability/capability-manifest.ts`; `frontend/src/src/lib/capability-orchestration.ts` | `npm.cmd exec vitest run tests/capability-normalization.test.ts tests/report-query-capability-coverage.test.ts` | Capability Discovery 能看到帮助、需求、诊断、联调等受治理 builtin candidate，且字段含 owner/version/fallback policy。 |
| P1 | ResponseContract 标准化候选来源、执行决策、fallback 与 ContractSafety 引用 | `frontend/src/src/types/index.ts`; `frontend/src/src/lib/response-contract.ts` | `npm.cmd exec vitest run tests/response-contract-boundary.test.ts` | response contract 暴露 `candidate_source`、`final_route_decision`、`execution_decision`、`fallback_reason`、`contract_safety_trace_ref`。 |
| P1 | Trace 可复盘候选、仲裁、fallback、证据与安全检查 | `frontend/src/src/app/api/chat/chat-trace.ts` | `npm.cmd exec vitest run tests/model-participation-trace.test.ts` | trace output 与 `agent.plan_arbitration` span 包含 candidate source / arbitration / fallback / evidence ids / contract safety。 |
| P1 | Planner shadow/main 阶段目标可观测 | `frontend/src/src/lib/planner-orchestrator.ts` | `npm.cmd exec vitest run tests/planner-orchestrator.test.ts tests/planner-shadow-trace.test.ts` | Planner result 包含 `plannerMode`、`promptSource`、`fallbackPolicy`、`comparisonTrace`，失败仍 fail-open。 |

MIG-050~060 回归矩阵：

| Case | 关注点 | 必测场景 | 退出条件 |
|---|---|---|---|
| MIG-050 | 口径与证据一致性 | 同一指标不同表达、无原始关键词表达、低相关来源 | 回答中的结论、source_refs、evidence_refs 一致；无证据时降级。 |
| MIG-052 | 工具失败与超时 | MCP 不可用、模型不可用、公开来源为空 | ResponseContract 不伪装成功，fallback_reason 可追踪。 |
| MIG-053 | 长链路内存与过程披露 | 多步骤问数/诊断、history 较长 | Trace 记录阶段，主消息不泄露 raw payload / prompt / tool args。 |
| MIG-054~060 | 非硬编码迁移健康 | 删除单个关键词后用同义表达重放 | 仍由 Planner/Capability candidate 命中；源码不新增样例硬编码。 |
