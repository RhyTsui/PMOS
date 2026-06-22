# AI Chat 工作区阶段性交接 - 2026-06-21

## 当前状态

当前任务目标已暂停，不再继续修复或跑长链路 E2E。本文件用于新会话 review 当前系统、识别遗留风险并逐项处理。

## 阶段性成果

1. VNext 产品定位已收口到 Enterprise AI Chat OS：五大中心作为 `ServiceCatalog + CapabilityManifest` taxonomy，不新增平行 OS/Protocol/Schema。
2. MIG-051 已从“误路由/假成功”推进到真实链路可观测状态：multi-query、retention 入参与 contract 均可成功，当前失败点是测试期望与真实返回数据口径不一致。
3. MIG-050/052/053 的复合指标链路已能进入多工具编排，且 retention 按 `retentionType` 拆分为 `DEVICE_RETENTION`、`REG_RETENTION`、`PAY_D1_RETENTION`。
4. ROI 复合指标已按工具契约拆分：`roi_cumulative -> dataType=total`，`roi_day/roi_week/roi_month -> dataType=section`。
5. MIG-068 已修复首日 ROI 字段投影、`promotionSource=ORGANIC,AD`、`subGroup=media_id` 入参；当前失败转为真实 MCP 数据/测试样本口径不一致。
6. 第二轮评估器已收紧为所有解析出的期望关键结果必须覆盖，并补了百分比舍入容忍，避免把有数据但缺关键指标的回答判通过。
7. Output Guardrail 已新增 P0 自测并接入 `validate:ad-ui`，覆盖无证据业务断言、raw params 泄露、planner shadow 伪装执行、工具失败说成功、工具空结果说有数据。
8. `validate:ad-ui` 最新通过，包含 runtime migration gate、rule-debt inventory、output guardrail self-test、ts-check、ui guardrail。
9. E2E 内存护栏已具备超阈值停止服务进程的能力，但 runtime 内存增长根因仍未解决。

## 未解决 P0

1. 数据/测试口径不一致：
   - MIG-051 真实返回 `139 / 37.41% / 40.00% / 43.24%`，测试期望 `459 / 39.87% / 41.12% / 69.39%`。
   - MIG-050/052 的 ROI 期望仍需复核数据源与工具口径，不能在 Answer Composer 中硬编码期望值。
   - MIG-068 当前 tool 入参已正确，但当前 `appId=10100042` 下真实 MCP 证据不支撑“苹果广告 55.9%”。
2. 真实 E2E 稳定性不足：
   - MIG-050~053 targeted E2E 在 240 秒超时，未得到完整结果。
   - MIG-050~060 批量曾在 MIG-054 前触发内存护栏，RSS 采样达到约 3855MB。
3. runtime 内存增长根因未定位：
   - 当前已清理残留 8002 进程，未见 4GB Node 残留。
   - 仍需定位长链路报表 E2E 后服务 RSS 增长来源。
4. MIG-055~060 未在最新代码后完整复跑：
   - 因批量内存阻断与 targeted 超时，本轮不再继续执行。
5. 产品化回答仍需治理：
   - 周报/月报、报告类回答仍偏证据表预览，缺经营结论、风险和下一步动作。
6. Evidence Ledger 还需覆盖知识库、公开联网、planner inference、MCP 失败、fallback、日期无效等跨 stage case，并区分事实、推断、未验证。
7. Admin Control Plane、自动任务中心、UISchema / golden、移动端决策流、多角色验收材料仍未完整产品化。

## 本次工作区清理

1. 已清理 `docs/review` 下 2026-06-21 生成的未跟踪 second-round checkpoint/xlsx 原始测试产物。
2. 清理过程中误触及的一批历史 tracked 测试输出已恢复，当前不把 tracked 文件删除作为交接内容。
3. 已删除临时探针 `frontend/src/scripts/tmp-probe-roi-datatype.ts`。
4. 当前未保留 raw checkpoint/xlsx 作为权威证据；关键结论已汇总到 `docs/review/ai-chat-second-round-risk-todo-2026-06-21.md`。

## 当前重要改动文件

- `docs/review/ai-chat-second-round-risk-todo-2026-06-21.md`
- `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- `frontend/src/package.json`
- `frontend/src/scripts/output-guardrail-self-test.ts`
- `frontend/src/scripts/report-query-self-test.ts`
- `frontend/src/src/lib/report-query-orchestrator.ts`
- `frontend/src/src/lib/advertising-domain-pack.ts`
- `frontend/src/src/lib/chat-pipeline/multi-query-answer-summary.ts`
- `frontend/src/scripts/multi-query-stage-self-test.ts`
- `scripts/run-second-round-tests.cjs`

工作树中仍有其它既有改动，review 时请先按 `git status --short` 与 `git diff --stat` 分组确认来源，不要直接回滚。

## 已通过校验

- `npm.cmd exec tsx scripts\multi-query-stage-self-test.ts`
- `npm.cmd run test:output-guardrail`
- `npm.cmd run validate:ad-ui`
- `node --check scripts\run-second-round-tests.cjs`
- `npm.cmd run check:encoding`
- `git diff --check`

## 建议新会话处理顺序

1. 先 review 当前系统分层和工作树差异，不急于继续跑全量 E2E。
2. 针对 MIG-050/052/053，先确认 ROI `total/section` 拆分后真实回答是否覆盖 `第45日ROI`、`2周ROI`、`第2周ROI`。
3. 针对 MIG-051，先由数据/测试侧确认自然量、媒体筛选、团队、应用类型、留存口径，不要在 runtime 中硬补期望数值。
4. 针对内存风险，先做单 case RSS profile，再决定是否分片跑测试或修 runtime 泄漏。
5. 最后再复跑 MIG-050~060，且必须开启 `SECOND_ROUND_KILL_SERVER_ON_MEMORY_GUARD=1`。
