# AI Chat B5 Public Source Arbitration 规则债务评审包

- packet id: `ai-chat-rule-debt-b5-public-source-review-packet-2026-06-14`
- inventory: `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- migration queue: `docs/review/ai-chat-rule-debt-migration-queue-2026-06-13.md`
- batch: `B5-public-source-arbitration`
- status: `pending_expert_review`
- runtime migration: `blocked`
- validation status: `blocked_real_validation_failures`

## 1. 评审结论占位

本评审包只整理 B5 批次的准入证据和待审问题，不批准 runtime 迁移。

当前结论：

- `committee_status` 仍为 `pending`。
- `runtime_migration_gate` 仍为 `blocked_until_expert_committee_approval`。
- 严格真实 `/api/chat` / provider E2E 已使用真实样本运行，但存在真实失败。
- 不得把当前 runtime 中新增的 query rewrite、query strategy、天气标题、公开联网 need 判断视为已迁移完成。

## 2. 当前真实失败

命令：`npm run test:real-provider-chat-e2e`

样本来源：用户于 2026-06-14 提供的 6 个真实样本，未使用 mock、fixture、随机串或默认样例。

| Case | 当前结果 | 准入影响 |
|---|---|---|
| `knowledge_hit_api_chat_e2e` | 失败：知识源仲裁为 `rejected`，不是 `selected` | 知识候选、source arbitration 和 ResponseContract metadata 需要复核 |
| `knowledge_no_hit_api_chat_e2e` | 失败：预期 no-hit 的问题实际返回 5 条知识命中 | 样本定义或知识库召回阈值需要重新确认 |
| `knowledge_stale_api_chat_e2e` | 失败：知识库未返回 stale / expired / deprecated freshness 信号 | Knowledge metadata taxonomy 与 freshness projection 不可批准 |
| `public_web_official_source_real_provider` | 失败：公网检索 `public_web.query_failed` | Public web provider、query strategy、source relevance 和错误归因需要复核 |
| `public_web_low_relevance_real_provider` | 通过：低相关输入未进入公网检索需求 | 可作为负例证据，但不能单独批准 B5 |
| `public_web_multi_source_real_provider` | 失败：公网检索 `public_web.query_failed` | 多源共识 query strategy 和 provider 返回处理需要复核 |

## 3. B5 待审条目

| ID | 位置 | 当前权力 | 待审焦点 | 准入状态 |
|---|---|---:|---|---|
| `PWR-001` | `public-web-runtime.ts` `buildHeuristicNeed` | 阻断执行 | 公开联网 need 判断是否只作为 candidate，是否记录拒绝原因 | `pending_review_evidence` |
| `PWR-002` | `public-web-runtime.ts` `detectPublicWebNeed` | 阻断执行 | 模型与 heuristic 合并是否进入 Plan Arbitrator，而不是 runtime 直接裁决 | `pending_review_evidence` |
| `PWR-003` | `public-web-runtime.ts` `buildModelSearchQueryCandidates` | 补参数 | query rewrite 是否具备独立 PromptVariableSchema、输出 schema 和采纳/拒绝 Trace | `pending_review_evidence` |
| `FNR-001` | `fact-need-reasoner.ts` `buildSearchQueries` | 补参数 | `official/latest/source comparison/reference` 等查询短语是否应进入 Query Strategy Catalog | `pending_review_evidence` |
| `FNR-002` | `fact-need-reasoner.ts` `inferAnswerShape` | 影响打分 | yes/no 公共事件问法 signal 是否只是 FactNeed classifier candidate，而不是单样本 runtime patch | `pending_review_evidence` |
| `API-005` | `route.ts` `publicWebNeed` | 阻断执行 | route handler 是否只消费 source arbitration candidate，不直接决定最终路径 | `pending_review_evidence` |
| `API-008` | `route.ts` `normalizeKnowledgeFreshness` | 影响打分 | freshness/stale 是否来自 Knowledge metadata taxonomy，而不是字符串归一化 | `pending_review_evidence` |
| `API-009` | `route.ts` `readKnowledgeHitFreshness` | 影响打分 | raw knowledge hit freshness 字段读取是否位于 provider adapter / Source Contract，而不是 route handler | `pending_review_evidence` |
| `OAPC-002` | `open-answer-planner-context.ts` `normalizeKnowledgeStatus` | 影响打分 | open-answer planning 是否只消费结构化 source state | `pending_review_evidence` |
| `RTC-001` | `runtime-config.ts` `normalizeDefaultPublicWebLookupRouteIntents` | 影响打分 | 默认联网 route intents 是否有 owner、version、退出条件 | `pending_review_evidence` |
| `RTC-002` | `runtime-config.ts` `mergePublicWebDefaultSignals` | 影响打分 | public-web signal 是否只作为弱候选 seed | `pending_review_evidence` |
| `WSR-001` | `web-search/route.ts` `formatWeatherLocationTitle` | 生成最终回答 | 天气/来源展示名是否来自 Source Contract display metadata | `pending_review_evidence` |

## 4. 专家委员会审查问题

| 角色 | 必审问题 |
|---|---|
| 架构负责人 | B5 是否复用 Enterprise AI Chat OS 的 Source Contract、Plan Arbitrator、Execution Policy、ResponseContract，不新增平行协议 |
| Chat Runtime 负责人 | runtime 是否只消费 approved candidate；query rewrite、search strategy、freshness 是否不会直接覆盖 Planner 或当前轮显式输入 |
| 业务域负责人 | 公开联网、知识库和天气展示规则是否有真实业务价值，而不是单个验收句补丁 |
| 数据/模型负责人 | query rewrite prompt 是否有变量契约、输出 schema、超时/fallback 边界；signal 是否保持弱候选 |
| QA/Eval 负责人 | 必须覆盖真实 hit、真实 no-hit、真实 stale、官方来源、多源来源、低相关负例、内部数据阻断 |
| 安全/治理负责人 | 内部账号、project、token、业务私有上下文不得进入公网 query；Trace 不得泄露敏感信息 |
| 产品负责人 | 主回答不暴露内部术语；公网失败时用户看到的是可理解的限制和下一步动作 |

## 5. 批准前必须补齐

- 结构化 `review_evidence`，覆盖 7 个委员会角色。
- 真实 `/api/chat` 或等价 runtime regression，不能使用 mock、fake、stub、fixture、synthetic 证据。
- `knowledge_no_hit` 样本必须由知识库负责人确认无命中；若当前样本真实命中，则更换样本或调整预期。
- `knowledge_stale` 必须有真实 stale / expired / deprecated / archived metadata；若知识库不支持该字段，需先定义 Knowledge metadata taxonomy。
- `public_web_official_source` 和 `public_web_multi_source` 必须证明 provider 可用、query strategy 可追踪、来源相关性门禁可解释。
- Query rewrite prompt 必须有 PromptVariableSchema，且 forbidden variables 覆盖 raw private context、token、account、project、tenant、workspace id。
- Source arbitration Trace 必须记录候选 query、采用/拒绝、来源、失败原因、redaction policy 和 provider eligibility。
- `npm run check:rule-debt-inventory`、`npm run validate:ad-ui`、`git diff --check`、乱码扫描必须通过。

## 6. 当前处理建议

- 不批准 B5 runtime 迁移。
- 允许继续做评审材料、契约草案、评测样本和 Trace 字段设计。
- 若后续要迁移，建议顺序为：Knowledge metadata taxonomy -> Source Contract / Query Strategy Catalog -> PromptVariableSchema -> Plan Arbitrator candidate wiring -> Execution Policy -> ResponseContract projection。
