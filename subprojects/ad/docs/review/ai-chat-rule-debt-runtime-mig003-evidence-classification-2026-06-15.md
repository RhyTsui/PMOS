# AI Chat Runtime MIG-003 验证证据归类

- record_id: `RULE-DEBT-EVIDENCE-CLASSIFICATION-20260615-MIG003`
- status: `not_approved_for_runtime_migration`
- created_at: `2026-06-15T09:30:00.000+08:00`
- inventory_ref: `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- migration_queue_ref: `docs/review/ai-chat-rule-debt-migration-queue-2026-06-13.md`

## 结论

本批新增 runtime MIG-003 报告只能归类为“验证证据 / 待人工复核记录”，不能作为 P0/P1 runtime 迁移已通过的专家委员会批准。

原因：

- 最新 MIG-003 记录仍为 `REVIEW`，原因是“未命中关键点，需人工复核”。
- 这些记录可以证明链路执行、来源数量、耗时和乱码健康的一部分，但不能证明业务关键点已通过。
- 现有 `runtime_migration_gate` 仍要求 P0/P1 条目补齐结构化 `review_evidence` 后才能进入 runtime 迁移。

## 已归类文件

| 文件 | 归类 | 说明 |
| --- | --- | --- |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260614b_20260614-140545.md` | mixed evidence | 批量无浏览器 runtime 记录，含 PASS 与 REVIEW。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260614b_20260614-140545.json` | mixed evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615_20260615-093226.md` | mixed evidence | 批量无浏览器 runtime 记录，需按单 case 复核。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615_20260615-093226.json` | mixed evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615-rest_20260615-131525.md` | review evidence | Rest 批次只完成 2/73，且均为 REVIEW。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615-rest_20260615-131525.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-131739.md` | review evidence | Full acceptance 只完成 42/107，且均为 REVIEW。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-131739.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615-final_20260615-150116.md` | review evidence | Final 批次只完成 17/107，16 REVIEW、1 PASS，不能作为通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615-final_20260615-150116.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615-postfix_20260615-152240.md` | review evidence | Postfix 批次完成 88/107，但 87 REVIEW、1 PASS，不能作为通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-no-browser-20260615-postfix_20260615-152240.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-failfix-diagnosis-20260615_20260615-151556.md` | scoped pass evidence | 局部 failfix diagnosis 1/1 PASS，可作为单点回归证据，不能替代 P0/P1 runtime 迁移批准。 |
| `docs/review/小乔智投测试集v1.1_runtime-failfix-diagnosis-20260615_20260615-151556.json` | scoped pass evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-failfix-integration-20260615_20260615-151558.md` | review evidence | Integration 批次 0/0，无可用通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-failfix-integration-20260615_20260615-151558.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-failfix-integration-20260615b_20260615-151639.md` | review evidence | Integration b 批次 1/1 REVIEW，不能作为通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-failfix-integration-20260615b_20260615-151639.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig021-auth-preflight-20260615d_20260615-150037.md` | review evidence | MIG-021 auth preflight 1/1 REVIEW，且来源数 0。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig021-auth-preflight-20260615d_20260615-150037.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-144514.md` | misplaced evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；仅报告片段，不能作为通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-144514.json` | misplaced empty evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；JSON 为 0 字节，不能作为机器证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-144911.md` | misplaced evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；仅报告片段，不能作为通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-144911.json` | misplaced empty evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；JSON 为 0 字节，不能作为机器证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-145311.md` | misplaced evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；仅报告片段，不能作为通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-145311.json` | misplaced empty evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；JSON 为 0 字节，不能作为机器证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-145740.md` | misplaced evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；仅报告片段，不能作为通过证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-full-acceptance_20260615-145740.json` | misplaced empty evidence | 已从 `frontend/src/docs/review` 迁回仓库级目录；JSON 为 0 字节，不能作为机器证据。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-evidence-fallback-20260614_20260614-143512.md` | review evidence | MIG-003 evidence fallback 仍为 REVIEW。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-evidence-fallback-20260614_20260614-143512.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-evidence-ledger-20260614_20260614-144146.md` | review evidence | MIG-003 evidence ledger 仍为 REVIEW。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-evidence-ledger-20260614_20260614-144146.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-public-url-20260615_20260615-085006.md` | review evidence | 显式公开 URL 有来源但仍为 REVIEW。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-public-url-20260615_20260615-085006.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-relevance-gate-20260615_20260615-085231.md` | review evidence | 相关性门禁有来源但仍为 REVIEW。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-relevance-gate-20260615_20260615-085231.json` | review evidence | 上述记录的机器结果。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-final-20260615_20260615-085409.md` | review evidence | 最终验证仍为 REVIEW，来源数 0。 |
| `docs/review/小乔智投测试集v1.1_runtime-mig003-final-20260615_20260615-085409.json` | review evidence | 上述记录的机器结果。 |
| `frontend/src/docs/review/小乔智投测试集v1.1_runtime-smoke-no-browser-20260614_20260614-140235.md` | misplaced evidence | 位置应迁到仓库级 `docs/review` 或排除，不应长期放在 frontend source tree。 |
| `frontend/src/docs/review/小乔智投测试集v1.1_runtime-smoke-no-browser-20260614_20260614-140235.json` | misplaced evidence | 同上。 |

## 后续处理办法

- P0/P1 runtime 迁移提交前，必须由真实专家委员会或项目负责人把对应 inventory 条目的 `committee_status` 更新为 `approved` 或 `approved_with_conditions`，并补齐结构化 `review_evidence`。
- MIG-003 若继续作为迁移验收，需要补一次命中关键点的真实 `/api/chat` 或等价链路记录。
- 单元测试可作为负例和回归证据，但不能替代真实 runtime 迁移批准。
- `imported/projects` 不得推送到 GitHub `https://github.com/RhyTsui/PMOS`；AD 主仓库推送目标必须保持 GitLab `https://gitlab.sh.com/aiad/xiaoqiao.git`。
