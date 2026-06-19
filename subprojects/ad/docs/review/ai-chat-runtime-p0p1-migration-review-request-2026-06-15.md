# AI Chat P0/P1 Runtime 迁移评审请求

- request_id: `RULE-DEBT-RUNTIME-REVIEW-REQUEST-20260615`
- status: `pending_expert_committee_review`
- created_at: `2026-06-15T13:25:00.000+08:00`
- inventory_ref: `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- evidence_classification_ref: `docs/review/ai-chat-rule-debt-runtime-mig003-evidence-classification-2026-06-15.md`

## 当前表现与边界

当前工作区存在 7 个 runtime 文件和 3 个测试文件的剩余迁移差异。它们主要围绕开放回答证据账本、公开联网显式 URL 识别、低相关来源过滤、知识库 fallback、Prompt 变量约束和未配置 MCP 默认禁用。

边界：

- 运行面：`/api/chat`、`/api/xiaoqiao/web-search`、public web runtime、open answer fallback。
- 控制面：rule-debt inventory、runtime migration gate、Prompt seed、MCP server store。
- 观测面：MIG-003 与 runtime full no-browser 验证报告。
- 配置面：managed prompt seeds、MCP 内置配置、public web policy。
- 展示面：不改用户前端页面，只涉及回答文案 catalog。

## 待评审 runtime scope

| 文件 | 变更意图 | 关联规则债务 | 当前风险 |
| --- | --- | --- | --- |
| `frontend/src/src/app/api/chat/route.ts` | 向 chat answer 注入 `evidence_ledger`、`planner_output`、`answer_constraints`，知识库检索增加重试和超时元数据。 | `API-005`、`API-008`、`API-009`、`API-002` | `route.ts` if_count 从 88 上限膨胀到 99，必须评审后才可进 runtime。 |
| `frontend/src/src/lib/public-web-runtime.ts` | 显式公开 URL 作为 public evidence，过滤 URL 壳噪声，低相关来源不进证据。 | `PWR-001`、`PWR-002`、`PWR-003` | 仍包含 heuristic if/else，需要确认仅为 source candidate / relevance gate。 |
| `frontend/src/src/lib/open-answer-fallback.ts` | 模型组合不可用时，只在有知识库 hits 时输出 grounded 摘要，避免泛化自答。 | `API-002`、open answer fallback hotspot | 仍会生成用户可见 fallback，需产品和 ContractSafety 复核。 |
| `frontend/src/src/lib/chat-answer-message-catalog.ts` | `public_web.no_results` 文案去掉单场景例子，改为证据不足和补充官方链接。 | answer catalog fallback | 低风险，但属于用户可见回答文案。 |
| `frontend/src/src/lib/managed-prompt-seeds.ts` | `chat_answer` Prompt seed 增加 evidence_ledger / answer_constraints 变量。 | `MR-001` / Prompt variable governance | 必须确认不会把 Prompt 变成业务规则容器。 |
| `frontend/src/src/lib/mcp-server-store.ts` | 未配置联网搜索 MCP 默认禁用，避免 localhost 被当成真实 MCP。 | `MCP-001` / Tool Contract | 需要确认真实公开联网改由 Public Web Provider 管理。 |
| `frontend/src/src/app/api/xiaoqiao/web-search/route.ts` | 将 `fakeRequest` 变量改名为 `delegatedRequest`，避免测试/代码中出现 fake 流程误导。 | WSR / mock-fake governance | 行为不变，但属于 runtime 文件，仍受 gate 约束。 |

## 当前验证

- `npm.cmd exec vitest run tests/public-web-runtime.test.ts tests/open-answer-fallback.test.ts tests/chat-answer-message-catalog.test.ts`：通过，3 个文件 23 个用例。
- `npm.cmd run check:runtime-migration-gate:self-test`：通过。
- `git diff --check`：通过。
- 乱码扫描：未命中替换字符和已知 GBK/UTF-8 错读片段。
- `npm.cmd run check:runtime-migration-gate`：阻断，6 个 runtime 文件在 41 个 P0/P1 条目 pending 时变化。
- `npm.cmd run check:rule-debt-inventory`：阻断，`route.ts` if_count `99/88`。
- `runtime-full-no-browser-20260615-rest`：只完成 2/73，均为 `REVIEW`，不能作为 runtime 通过证据。

## 评审请求

请专家委员会逐项确认：

- 是否允许把 `route.ts` 的 evidence ledger 组装保留在 handler，或必须先抽到 Answer Composer / Evidence Ledger 模块再提交。
- `public-web-runtime.ts` 的显式 URL 与相关性门禁是否只是 source candidate / relevance gate，而不是业务路由。
- 知识库 fallback 是否只消费已有 hits，不生成无证据事实。
- `chat_answer` Prompt seed 新变量是否符合 PromptVariableSchema，不引入业务 if/else。
- 未配置 MCP 默认禁用是否符合 Tool Contract 与 Admin 控制面策略。
- `web-search/route.ts` 的 `fakeRequest` 改名是否可作为 mock/fake 治理的安全修正进入 runtime。

## 可接受结论

- `approved`：补齐 inventory 中对应条目的结构化 `review_evidence` 后可提交 runtime。
- `approved_with_conditions`：按条件拆分或抽模块后，再补 `review_evidence`。
- `rejected`：不得提交 runtime，只保留分析和测试。
- `defer`：保留工作区差异或转 patch，等待复审时间。
