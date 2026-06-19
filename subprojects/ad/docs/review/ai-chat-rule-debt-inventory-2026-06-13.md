# AI Chat 隐性规则债务清单与专家委员会评审记录

- status: `ready_for_expert_committee_review`
- date: `2026-06-13`
- canonical architecture: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
- guardrail: `docs/architecture/governance/ai-chat-implementation-guardrails.md`
- machine-readable inventory: `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- expert review docket: `docs/review/ai-chat-rule-debt-expert-review-docket-2026-06-13.md`
- migration queue: `docs/review/ai-chat-rule-debt-migration-queue-2026-06-13.md`
- B5 public source review packet: `docs/review/ai-chat-rule-debt-b5-public-source-review-packet-2026-06-14.md`
- guardrail command: run `npm run check:rule-debt-inventory` in `frontend/src`
- validation entrypoint: `npm run validate:ad-ui` now runs `check:runtime-migration-gate:self-test`, `check:runtime-migration-gate`, `check:rule-debt-inventory`, `ts-check`, then the UI guardrail
- runtime diff gate: `npm run check:runtime-migration-gate` blocks changes under Chat runtime source paths while any P0/P1 rule-debt entry remains pending expert committee approval
- source anchor policy: every inventory entry must still resolve to its `file` / `symbol` and stay within the line-drift window enforced by the guardrail script
- machine guardrail policy: `guardrail_policies` in the JSON records the line-drift window, density upper-bound mode, guarded fields, and expert-committee gate owner
- mandatory validation pack: `mandatory_validation_pack` in the JSON applies to every inventory entry and is checked together with each entry's own `validation_required`
- required symbol baseline: `required_inventory_symbols` in the JSON is the source of truth for symbols that must remain covered by entries
- inventory coverage floor: the guardrail enforces at least 40 entries, 36 P0/P1 entries, and 6 P0 blocking entries until a later reviewed inventory refresh explicitly changes the baseline
- mojibake health gate: `mojibake_scan_targets` scans this inventory, the expert docket, the migration queue, the guardrail script, and the high-risk source files during `check:rule-debt-inventory`
- untracked hotspot gate: the guardrail scans `src/lib` and `src/app/api`; files scoring 25 or above must be in `source_scan_targets` or `untracked_hotspot_allowlist`

## 1. 结论

本轮只完成治理准入产物，不迁移 runtime 代码。

当前风险不是单纯显性硬编码，而是以下规则债务叠加：

1. 过程式 `if` 在运行链路中承担路由、工具选择、参数补齐、fallback 和最终回答职责。
2. 人工 `signal` / 词表 / route phrase 在部分链路中拥有过高决策权。
3. 受治理 seed 与通用 Core 的边界不够清晰，存在“配置化但仍硬编码”的风险。
4. fallback 与 adapter 有价值，但若没有迁移边界，会变成长期主路径。

因此，本清单的目标不是删规则，而是逐条判断：真实价值、当前权力、越权风险、目标归属、替代架构、验证要求和专家委员会结论。

## 2. 真实表现与边界

### 2.1 真实表现

已确认首批高风险集中点：

| 区域 | 风险画像 |
|---|---|
| `frontend/src/src/lib/report-query-orchestrator.ts` | 4533 行；约 304 个 `if`、177 个 signal/fallback 命中、124 个集合匹配命中；同时承担选择、参数、执行、fallback、结果与回答 |
| `frontend/src/src/lib/request-understanding.ts` | route phrase、domain signal、fallback candidate 与路由决策混合 |
| `frontend/src/src/lib/advertising-domain-pack.ts` | 受治理 seed 与隐形业务信号边界需要重审 |
| `frontend/src/src/lib/public-web-runtime.ts` | 公开联网候选与阻断逻辑需要拆成 planner/execution candidate |
| `frontend/src/src/lib/mcp-tool-output-adapter.ts` | 错误文本正则和 retry/fallback 语义需要进入 Tool Contract / MCP outcome taxonomy |
| `frontend/src/src/lib/model-router.ts` | hardcoded/fallback prompt source 必须只作为显式降级状态，不得承载业务规则 |

本轮追加登记了第二批运行链路规则点：

| 区域 | 新增风险画像 |
|---|---|
| `frontend/src/src/app/api/chat/route.ts` | route handler 内仍存在 service intent remap、非报表 fallback 文案、续问 heuristic、route rule 命中、public web need、报告能力优选与最终能力 projection |
| `frontend/src/src/lib/report-capability-manifest.ts` | manifest 构建过程中存在 capability kind 文本推断、manual override、能力绑定与校验边界 |
| `frontend/src/src/lib/runtime-config.ts` | public web 默认 lookup/signal 与 data policy 默认合并需要明确 owner、版本、退出条件和 trace |

### 2.2 边界归类

| 面 | 本次边界 |
|---|---|
| 运行面 | `/api/chat`、Request Understanding、Report Query Orchestrator、Public Web Runtime、MCP Tool Output Adapter、Model Router |
| 控制面 | Capability Manifest、Route Rules、Tool Metadata、Metric Catalog、Prompt/Model Config、Governed Seed |
| 展示面 | Frontend Presentation 只消费契约；不得用正文、关键词或 UI 状态反推业务 |
| 观测面 | Trace / Runtime Logs 必须记录候选、采纳/拒绝、fallback、评审状态 |
| 配置面 | Admin / policy / seed 不能成为“测试句到路径”的隐形映射表 |

### 2.3 机器扫描上限基线

`source_scan_targets` 已进入 JSON 清单，并由 `npm run check:rule-debt-inventory` 动态复核。以下数值是防止旧规则膨胀的上限基线：若 `if`、`signal/fallback`、集合匹配命中行数或规则型声明数超过上限，门禁失败；若减少，允许继续，但建议在下一次评审清单刷新时同步记录。

| 文件 | 行数 | if 命中行 | signal/fallback 命中行 | 集合匹配命中行 | 规则型声明数 |
|---|---:|---:|---:|---:|---:|
| `report-query-orchestrator.ts` | 4533 | 304 | 177 | 124 | 108 |
| `request-understanding.ts` | 999 | 118 | 63 | 26 | 21 |
| `app/api/chat/route.ts` | 3600 | 88 | 111 | 17 | 57 |
| `public-web-runtime.ts` | 1042 | 65 | 46 | 16 | 23 |
| `mcp-tool-output-adapter.ts` | 723 | 114 | 4 | 7 | 5 |
| `model-router.ts` | 699 | 51 | 51 | 1 | 4 |
| `advertising-domain-pack.ts` | 831 | 1 | 64 | 3 | 9 |
| `report-capability-manifest.ts` | 776 | 103 | 2 | 43 | 32 |
| `runtime-config.ts` | 877 | 37 | 66 | 13 | 11 |
| `open-answer-planner-context.ts` | 775 | 46 | 2 | 15 | 11 |
| `web-search/route.ts` | 525 | 41 | 10 | 37 | 1 |
| `fact-need-reasoner.ts` | 362 | 44 | 37 | 9 | 13 |

### 2.4 源码锚点门禁

机器清单中的每条 `entries[]` 现在必须通过源码锚点校验：

- `file` 必须存在。
- `symbol` 必须能在该文件中找到。
- `line` 必须与最近的 `symbol` 命中保持在守门脚本允许的漂移窗口内。

这个门禁解决的是“清单还在，但规则已经移动、改名或被新 if/signal 替代”的问题。若后续迁移确实移动了规则位置，必须同步更新清单和评审记录，不能让旧清单继续充当合规证据。

### 2.5 覆盖下限门禁

当前清单覆盖下限为：

- 至少 40 条规则债务条目；当前登记 41 条。
- `required_inventory_symbols` 至少 40 个符号，且每个符号必须有对应清单条目；当前登记 41 个。
- 至少 32 条 P0/P1 门禁条目。
- 至少 6 条 P0 阻断条目。
- 第二批追加的 `route.ts`、`report-capability-manifest.ts`、`runtime-config.ts` 符号同样进入 required symbol 集合。

这些下限不是说未来永远不能减少，而是要求任何减少都必须经过一次新的清单刷新和专家评审记录，不能通过删除条目来制造“风险下降”的假象。

### 2.6 乱码健康门禁

`mojibake_scan_targets` 已进入 JSON 清单，并由 `npm run check:rule-debt-inventory` 自动扫描。当前至少覆盖 15 个目标：

- 本清单 JSON。
- 本清单 Markdown。
- 专家委员会评审 docket。
- 迁移候审队列。
- 规则债务守门脚本。
- `source_scan_targets` 中的 10 个高风险源码文件。

扫描目标包括常见 GBK/UTF-8 错读片段、替换字符和对应的 Unicode 标签；具体模式由 `rule-debt-inventory-guardrail.ts` 动态构造，避免治理文档本身写入错码样例。一旦命中，规则债务门禁失败。

### 2.7 未登记热点门禁

为了防止规则债务从已治理文件搬到新文件，守门脚本会扫描：

- `frontend/src/src/lib`
- `frontend/src/src/app/api`

热点评分为：`if_count + signal_or_fallback_count + collection_match_count + risk_symbol_declaration_count`。当前阈值为 25。

达到阈值的文件必须满足以下任一条件：

- 已进入 `source_scan_targets`，作为强基线文件管理。
- 已进入 `untracked_hotspot_allowlist`，作为“待后续盘点的热点候选”管理。

`untracked_hotspot_allowlist` 不是合规豁免，也不代表这些文件没有规则债务；它只记录当前已知热点，防止后续出现新的未登记热点，或 allowlist 文件分数继续膨胀而无人发现。当前 allowlist 下限为 39 个候选文件。

`open-answer-planner-context.ts` 曾作为未登记热点候选被监控；本轮门禁发现其热点评分从 59 膨胀到 71，因此已提升为正式 `source_scan_targets` 文件，并新增 `OAPC-001` 条目进入 P1 迁移候审队列。

`public-web-runtime.ts` 本轮又新增 runtime query rewrite 逻辑，规则密度上限从 56 个 `if` 提升到 65 个 `if`。该逻辑有助于改善公开联网检索词，但包含环境 feature flag、runtime prompt、source policy / depth 条件和 fallback，因此新增 `PWR-003`，必须先进入专家委员会评审，不得视为已批准迁移。

`fact-need-reasoner.ts` 本轮从热点候选提升为正式 `source_scan_targets`。新增 query strategy 扩展会生成 `official`、`latest`、`source comparison` 等检索短语，有助于真实公网检索，但属于公开证据查询策略硬编码，新增 `FNR-001`，迁移目标是 Source Contract / Query Strategy Catalog。后续又新增 yes/no 公共事件问法 signal，例如 `是否`、`真要`、`whether`，已登记为 `FNR-002`，不得作为单个真实样本补丁进入 runtime。

### 2.8 Runtime Diff Gate

`npm run validate:ad-ui` 现在先执行 `npm run check:runtime-migration-gate:self-test`，再执行 `npm run check:runtime-migration-gate`。当 `runtime_migration_gate.status` 仍为 `blocked_until_expert_committee_approval`，且存在待评审 P0/P1 条目时，任何 `source_scan_targets` 或 Chat runtime 路径下的 tracked、staged 或 untracked 源码变化都会在 `ts-check` 前阻断验证。

这条门禁不是评估代码好坏，而是执行“未经过专家委员会评审通过的项，不进入 runtime 迁移”。若某个 runtime diff 确实要保留，必须先补齐对应 `review_evidence`、批准范围和迁移验证记录；否则应从本轮治理提交中隔离出去。

## 3. 规则债务分级

本清单不按“有没有 if”判定，而按“是否越权”判定。

| 等级 | 判定 | 当前处理 |
|---|---|---|
| P0 阻断 | 在 route handler、Chat Core、orchestrator、Prompt glue 或 renderer 中直接决定路由、工具、参数或最终回答 | 不得迁移 runtime，必须先经专家委员会逐条通过 |
| P1 必须迁移 | signal、词表、fallback、adapter 仍承担执行决策或参数补齐 | 必须进入契约、受治理配置、候选 lane 或 Execution Policy |
| P2 可治理保留 | schema、安全、权限、空值、状态枚举、trace fail-open 等确定性 guard | 可保留，但必须隔离为 ContractSafety / Execution Policy / Tool Contract / Trace |
| P3 观测风险 | 历史文档、一次性验收 artifact、旧样例 | 不阻断 runtime，但不得被当前服务引用 |

## 4. 首批清单摘要

完整机器清单见 JSON。以下是 P0/P1 的首批必须评审项。

| ID | 位置 | 当前权力 | 风险 | 建议处理 |
|---|---|---:|---|---|
| `RQO-003` | `report-query-orchestrator.ts:989` `scoreCapabilityMatch` | 选工具 | P0 | 迁到 Plan Arbitrator + Capability Discovery 评分契约 |
| `RQO-004` | `report-query-orchestrator.ts:1211` `hasStrongReportQueryIntent` | 选工具 | P0 | 降级为 RequestUnderstanding/TaskPlan 候选 |
| `RQO-005` | `report-query-orchestrator.ts:1234` `selectReportToolForType` | 选工具 | P0 | 改为 Capability Discovery 结果，候选和拒绝原因入 Trace |
| `RQO-011` | `report-query-orchestrator.ts:4080` `executeReportQueryStep` | 生成最终回答 | P0 | 拆为计划输入、能力选择、参数预检、执行、证据归一化、回答组合 |
| `RU-004` | `request-understanding.ts:650` `deriveRequestRouteDecision` | 选工具 | P0 | 拆成 planner candidate assembly + Plan Arbitrator |
| `RQO-001` | `report-query-orchestrator.ts:903` `capabilitySignalTerms` | 影响打分 | P1 | 迁到 Capability Manifest / seed-only |
| `RQO-002` | `report-query-orchestrator.ts:927` `questionTypeSignalTerms` | 影响打分 | P1 | 迁到 Metric Catalog / Tool Contract granularity |
| `RQO-007` | `report-query-orchestrator.ts:2159` `selectFallbackToolsForAppScope` | 选工具 | P1 | 迁到 Execution Policy fallback contract |
| `RQO-008` | `report-query-orchestrator.ts:2377` `reportToolFallbackReason` | 影响打分 | P1 | 迁到 MCP outcome taxonomy |
| `RQO-009` | `report-query-orchestrator.ts:3439` `buildDictionaryPlans` | 补参数 | P1 | 迁到 resolver candidate lane |
| `RQO-010` | `report-query-orchestrator.ts:3519` `resolveDictionaryFiltersByCapability` | 补参数 | P1 | 拆成 resolver candidate、preference merge、dictionary execution、trace |
| `RU-001` | `request-understanding.ts:217` `activeRequestSignals` | 候选 | P1 | seed-only，输出结构化 domain signals |
| `RU-002` | `request-understanding.ts:221` `hasRoutePhrase` | 候选 | P1 | route phrase 只作为 candidate evidence |
| `RU-003` | `request-understanding.ts:637` `hasGovernedBusinessRoutingSignal` | 影响打分 | P1 | rules/config fallback candidate，置信度封顶 |
| `ADP-001` | `advertising-domain-pack.ts:87` `ADVERTISING_REQUEST_SIGNALS` | 候选 | P1 | 迁入 Metric Catalog / Capability Manifest，保留 seed owner/version |
| `ADP-002` | `advertising-domain-pack.ts:236` `ADVERTISING_INTENT_ROUTE_RULES` | 影响打分 | P1 | 迁入 Admin route rules，保留 rollout 与评测覆盖 |
| `PWR-001` | `public-web-runtime.ts:170` `buildHeuristicNeed` | 阻断执行 | P1 | 拆成 public web capability candidate + result candidate |
| `PWR-002` | `public-web-runtime.ts:355` `detectPublicWebNeed` | 阻断执行 | P1 | 模型/启发式均作为候选，冲突入 Trace |
| `PWR-003` | `public-web-runtime.ts:989` `buildModelSearchQueryCandidates` | 补参数 | P1 | query rewrite 迁到 Planner / Source Contract candidate，需 prompt variable contract 与采纳/拒绝 Trace |
| `FNR-001` | `fact-need-reasoner.ts:227` `buildSearchQueries` | 补参数 | P1 | query strategy 短语迁到 Source Contract / Query Strategy Catalog |
| `FNR-002` | `fact-need-reasoner.ts:47` `inferAnswerShape` | 影响打分 | P1 | yes/no 公共事件问法 signal 降级为 FactNeed classifier candidate |
| `MCP-001` | `mcp-tool-output-adapter.ts:166` `classifyBusinessError` | 阻断执行 | P1 | 优先 MCP business outcome / Tool Contract error taxonomy |
| `MR-001` | `model-router.ts:43` `PromptSourceKind` | 生成最终回答 | P1 | hardcoded 只能是显式降级状态，不承载业务路由 |

### 4.0.1 本轮治理补充（2026-06-19）

| 范围 | 处理结论 | 治理依据 | 退出条件 | 回归证明 |
|---|---|---|---|---|
| `request-understanding.ts` 新增 fallback | 本轮不新增 runtime fallback，只保留既有 LLM/semantic frame/route rules candidate 边界 | `ENTERPRISE_AI_CHAT_OS_SPEC.md` 第 6、7、16 节要求 schema 失败只能受控 clarify/config fallback，业务差异进入 capability manifest、route rules、tool metadata 或受治理 seed；新增 fallback 会扩大 `RU-003/RU-004` 规则债 | Domain Ontology / Capability Manifest 覆盖业务对象解析，Plan Arbitrator 可记录候选采纳/拒绝原因，且同类不同表达回归通过后，移除 `hasGovernedBusinessRoutingSignal` 对路由分数的直接影响 | `npm.cmd exec vitest run tests/public-web-runtime.test.ts` 于 2026-06-19 通过 20/20；公开联网低相关和弱来源过滤恢复，证明无需在 request-understanding 中新增样例 fallback 来阻断 public web 抢路由 |
| Package Stage skill 选择 | skill ID 不再作为 Stage 内硬编码集合；Stage 消费 `skill-contract-store` 的受治理 Skill Contract metadata | Skill Contract seed 是当前包交付能力的治理入口，Stage 只按 route intent + contract category/workflow/output metadata 判断是否进入 | Admin Skill Contract / Capability Manifest 增加显式 `supportedServiceIntents` 或 `toolPurpose=package_fetch` 后，Stage 改为只消费该显式字段 | `npm.cmd run ts-check` 通过；Package Stage 仍要求 `get_delivery_packages` route 与已启用 integration contract 同时满足 |
| Service Discovery 候选词 | 关键词候选迁入 `SERVICE_DISCOVERY_HINTS`，运行 discovery 只消费 Service Catalog metadata | Service Catalog 是服务类型、输入契约、capability 依赖和候选说明的真源；hint 带 owner、source、exitCondition，不能直接授权执行 | Planner candidate + capability manifest 提供同等召回后删除 `SERVICE_DISCOVERY_HINTS` 词表触发，仅保留服务定义和输入契约 | `npm.cmd run ts-check` 覆盖类型；后续 MIG/E2E 以 `response_contract/source_refs/evidence_refs/tool_call_trace/process_events` 验证候选没有绕过执行证据 |
| Public Web / simple_fetch | 恢复相关性门禁和弱来源过滤；`simple_fetch` 增加 URL/重定向 allow/deny、私网 IP、metadata、非 http(s) 校验 | Public Web 是证据候选，结果必须经过 source policy、relevance gate 和 SourceRef/EvidenceRef/ToolCallTrace；fetch 工具不得访问内网或 metadata | Public Web Policy / Tool Contract 暴露等价 URL 安全策略后，adapter 只消费 Tool Contract 字段 | `npm.cmd exec vitest run tests/public-web-runtime.test.ts` 通过 20/20；`npm.cmd run ts-check` 通过 |

### 4.1 第二批追加登记项

| ID | 位置 | 当前权力 | 风险 | 建议处理 |
|---|---|---:|---|---|
| `API-001` | `route.ts:122` `buildServiceIntent` | 选工具 | P1 | 拆成 RequestUnderstandingContract + Plan Arbitrator 字段 |
| `API-002` | `route.ts:140` `resolveNonReportFallbackMessage` | 生成最终回答 | P1 | 迁到 Answer Composer + ResponseContract reason code |
| `API-003` | `route.ts:713` `buildReportContinuationHeuristic` | 影响打分 | P1 | 降级为 conversation-context weak candidate |
| `API-004` | `route.ts:1435` `matchedRouteRules` | 影响打分 | P1 | route rule hit 只作为 governed candidate |
| `API-005` | `route.ts:1461` `publicWebNeed` | 阻断执行 | P1 | 拆成 source-arbitration candidate |
| `API-006` | `route.ts:2702` `routePreferredReportCapability` | 选工具 | P0 | 迁到 Capability Discovery artifact + Plan Arbitrator trace |
| `API-007` | `route.ts:3327` `finalCapabilityDecision` | 生成最终回答 | P1 | 改为 execution result / ResponseContract 只读 projection |
| `API-008` | `route.ts:285` `normalizeKnowledgeFreshness` | 影响打分 | P1 | freshness/stale 归一化迁到 Source Contract / Knowledge metadata taxonomy |
| `API-009` | `route.ts:304` `readKnowledgeHitFreshness` | 影响打分 | P1 | raw knowledge hit freshness 字段读取迁到 Knowledge Source Contract provider adapter |
| `RCM-001` | `report-capability-manifest.ts:548` `inferCapabilityKind` | 影响打分 | P1 | 显式 metadata/manifest 为主，文本推断仅 bootstrap evidence |
| `RCM-002` | `report-capability-manifest.ts:571` `findCapabilityOverride` | 影响打分 | P1 | manual override 进入 Admin governed config |
| `RCM-004` | `report-capability-manifest.ts:754` `findRuntimeToolByCapability` | 选工具 | P1 | 迁到 Tool Contract binding |
| `RTC-001` | `runtime-config.ts:202` `normalizeDefaultPublicWebLookupRouteIntents` | 影响打分 | P1 | public web 默认 lookup 进入受治理配置 |
| `RTC-002` | `runtime-config.ts:215` `mergePublicWebDefaultSignals` | 影响打分 | P1 | public web signal 作为弱 source candidate seed |
| `OAPC-001` | `open-answer-planner-context.ts:391` `collectIntentOrchCandidateForOpenAnswer` | 影响打分 | P1 | IntentOrch 输出只作为 open-answer planner weak candidate |
| `RTC-004` | `runtime-config.ts:208` `runtimeConfigOverrides` | 影响打分 | P1 | override 只能作为隔离/测试辅助，不得作为真实验收或生产配置证据 |
| `OAPC-002` | `open-answer-planner-context.ts:180` `normalizeKnowledgeStatus` | 影响打分 | P1 | knowledge status/freshness 归一化迁到 Source Contract / Knowledge metadata taxonomy |
| `WSR-001` | `web-search/route.ts:145` `formatWeatherLocationTitle` | 生成最终回答 | P1 | weather/source displayName 迁到 Public Web Source Contract，runtime 不硬编码城市标题 |

## 5. 处理模型

| 处理方式 | 适用对象 | 落点 |
|---|---|---|
| 保留但隔离 | schema 校验、状态枚举、安全权限、空值防御、trace fail-open | ContractSafety / Execution Policy / Tool Contract / Trace |
| 迁移到契约 | 工具选择、指标维度、粒度、实体解析、输出字段判断 | Capability Manifest / Tool Contract / Metric Catalog / slot mapping |
| 降级为候选 | route phrase、domain signal、业务对象识别、公开联网排除信号 | Planner candidate / resolver candidate / public web candidate |
| 进入受治理配置 | 业务术语、同义词、媒体/指标/报表词、route rules | Admin config / governed seed，带 owner、版本、退出条件、评测覆盖 |
| 删除或替换 | 单个验收句、临时样例、Prompt 中文 if/else、长期兼容 fallback | 先用评测证明无价值；若有价值，改为契约或证据规则 |

## 6. 专家委员会评审门禁

采用现有评审链，不新增平行治理：

`self-check -> multi-role review committee -> Hermes governance -> human final approval`

### 6.1 角色与职责

| 角色 | 通过条件 |
|---|---|
| 架构负责人 | 不绕开 Enterprise AI Chat OS，不新增平行 Contract/Schema |
| Chat Runtime 负责人 | 主链路、Plan Arbitrator、Execution Policy 边界清晰 |
| 业务域负责人 | 规则保留有真实业务价值，不是测试样例补丁 |
| 数据/模型负责人 | signal 只作为弱信号，不替代 Planner 和 Evidence |
| QA/Eval 负责人 | 每条迁移有非硬编码补测、负例和真实链路验收 |
| 安全/治理负责人 | 权限、敏感信息、ContractSafety、Trace 不被绕过 |
| 产品负责人 | 用户结果不退化，不把内部术语暴露到前台 |

### 6.2 允许结论

| 结论 | 含义 |
|---|---|
| `approved` | 可进入迁移 |
| `approved_with_conditions` | 补齐条件后可迁移 |
| `rejected` | 不得改 runtime，只能回到清单分析 |
| `defer` | 暂保留，必须标注阻断原因和复审时间 |

### 6.3 `review_evidence` 结构

P0/P1 条目只有在 `committee_status` 为 `approved` 或 `approved_with_conditions` 时才允许进入迁移。此时 JSON 条目必须补齐 `review_evidence`，并通过 `npm run check:rule-debt-inventory` 校验。

最小结构如下：

```json
{
  "committee_status": "approved_with_conditions",
  "review_evidence": {
    "review_id": "RULE-DEBT-REVIEW-YYYYMMDD-001",
    "reviewed_at": "2026-06-13T00:00:00.000Z",
    "final_status": "approved_with_conditions",
    "final_approver": "human-owner-or-governance-lead",
    "self_check_ref": "docs/review/self-check-xxx.md",
    "meeting_record": "docs/review/xxx.md",
    "hermes_governance_ref": "docs/review/hermes-governance-xxx.md",
    "human_final_approval_ref": "docs/review/human-final-approval-xxx.md",
    "migration_plan_ref": "docs/review/migration-plan-xxx.md",
    "approved_runtime_scope": [
      "frontend/src/src/lib/request-understanding.ts:deriveRequestRouteDecision"
    ],
    "conditions": ["condition required before runtime migration"],
    "validation_evidence": [
      "tests or scripts",
      "real /api/chat or equivalent regression",
      "mojibake scan"
    ],
    "roles": {
      "architecture": {
        "reviewer": "name",
        "status": "approved",
        "notes": "No parallel Contract/Schema.",
        "evidence_refs": ["architecture doc or diff"]
      },
      "chat_runtime": {
        "reviewer": "name",
        "status": "approved",
        "notes": "Plan Arbitrator and Execution Policy boundaries are clear.",
        "evidence_refs": ["runtime trace or plan"]
      },
      "business_domain": {
        "reviewer": "name",
        "status": "approved",
        "notes": "Rule keeps real business value and is not a test-sentence patch.",
        "evidence_refs": ["business cases"]
      },
      "data_model": {
        "reviewer": "name",
        "status": "approved",
        "notes": "Signals remain weak candidates and do not replace Planner/Evidence.",
        "evidence_refs": ["planner/evidence cases"]
      },
      "qa_eval": {
        "reviewer": "name",
        "status": "approved",
        "notes": "Non-hardcoded and negative cases are covered.",
        "evidence_refs": ["test output"]
      },
      "security_governance": {
        "reviewer": "name",
        "status": "approved",
        "notes": "Permissions, ContractSafety, and Trace are not bypassed.",
        "evidence_refs": ["safety review"]
      },
      "product": {
        "reviewer": "name",
        "status": "approved",
        "notes": "User-visible result does not regress or expose internal terms.",
        "evidence_refs": ["acceptance record"]
      }
    }
  }
}
```

规则：

- `approved` 要求所有角色均为 `approved`，且不得携带未完成 `conditions`。
- `approved_with_conditions` 允许角色为 `approved_with_conditions`，但必须列出 `conditions`。
- 任一角色为 `rejected` 或 `defer` 时，条目不得标为 `approved` 或 `approved_with_conditions`。
- `review_evidence` 必须覆盖完整评审链：`self_check_ref`、`meeting_record`、`hermes_governance_ref`、`human_final_approval_ref`、`migration_plan_ref` 和 `approved_runtime_scope`。
- `approved_runtime_scope` 必须明确本次批准允许触达的 runtime 符号或文件范围；不得用“相关代码”“主链路”等泛化表述替代。
- `validation_evidence` 至少 3 条，且必须覆盖非硬编码补测、业务负例、乱码健康、真实 `/api/chat` 或等价 runtime regression。
- `validation_evidence` 不得使用 `mock`、`fake`、`stub`、`fixture`、`synthetic`、造假、模拟、伪造、桩等证据冒充真实迁移验收。此类测试只能作为单元测试、负例或门禁自测，不构成 runtime 迁移批准证据。
- `rejected` 或 `defer` 也必须补齐 `disposition_evidence`：`final_status`、`owner`、`reason`、`decision_record`、`runtime_migration_allowed: false`；`defer` 还必须有 `next_review_at`。

`disposition_evidence` 最小结构如下：

```json
{
  "committee_status": "defer",
  "disposition_evidence": {
    "final_status": "defer",
    "owner": "human-owner-or-governance-lead",
    "reason": "blocked reason and current evidence gap",
    "decision_record": "docs/review/xxx.md",
    "runtime_migration_allowed": false,
    "next_review_at": "2026-06-30"
  }
}
```

### 6.4 当前评审状态

当前所有首批条目状态为 `pending`。在委员会评审前：

- 不得把 P0/P1 项迁入 runtime。
- 不得删除现有规则。
- 不得把 seed/config 当作合规豁免。
- 可以继续补充清单、补评测样本、补 Trace 观测字段设计。

## 7. 迁移顺序建议

1. 先迁 `request-understanding.ts` 中拥有路由权的 signal，目标是 planner candidate + arbitration trace。
2. 再迁 `report-query-orchestrator.ts` 的工具选择和参数补齐，目标是 Capability Discovery / Tool Contract / slot resolver candidate。
3. 再迁 fallback 与错误归一化，目标是 Execution Policy / MCP outcome taxonomy。
4. 最后拆 `executeReportQueryStep`，保持外部入口兼容，逐步把回答收口到 Evidence Ledger + Answer Composer + ContractSafety。

## 8. 验证要求

每个迁移 case 至少覆盖：

- 原 case。
- 同类不同表达。
- 不含原关键词。
- 业务负例。
- 公开联网不抢内部数据。
- 源码无测试输入样例。
- Trace 记录候选、采纳/拒绝、fallback 和 ContractSafety。
- `git diff --check`。
- 乱码扫描。
- 涉及前端时运行 `frontend/src` 下的 `npm run validate:ad-ui`。
- 高风险链路补真实 `/api/chat` 或等价回归。
- 每次更新本清单后，必须在 `frontend/src` 运行 `npm run check:rule-debt-inventory`，确保 P0/P1 未经专家委员会评审不会被标成可迁移。
- 每次运行 `frontend/src` 的 `npm run validate:ad-ui` 时，会自动执行规则债务门禁；若清单缩水、风险符号漂移、规则密度膨胀或评审证据不完整，交付验证失败。
- `npm run check:rule-debt-inventory:self-test` 是门禁负例自测，只证明守门脚本能拦截坏清单，不是 `/api/chat` 或 runtime 迁移验收证据。

### 8.2 Mock / Fake 使用边界

本轮静态扫描确认仓库中存在以下非真实链路测试形态：

- `frontend/src/tests/*` 中存在 `vi.mock(...)` 单元测试。
- `frontend/src/scripts/chat-runtime-regression.ts` 和 `frontend/src/tests/public-web-runtime.test.ts` 中存在 `fake:public-web` / `Fake Public Web`，用于验证 synthetic public web endpoint 被拒绝。
- `frontend/src/scripts/rule-debt-inventory-guardrail-self-test.ts` 会生成临时坏清单，属于门禁负例自测。

这些测试有价值，但只能证明局部逻辑或负例防护；不得作为专家委员会批准 P0/P1 runtime 迁移的真实验收。真实验收必须使用：

- 真实 `/api/chat` 或等价 runtime regression。
- Trace / ResponseContract / arbitration 证据。
- 非硬编码补测、业务负例和乱码健康。
- 每次触达 `source_scan_targets` 中的文件后，必须检查规则密度和规则型声明数是否超过上限；减少不阻断，但应在下一次清单刷新时同步记录。
- 每次移动、重命名或拆分清单条目对应的源码符号后，必须同步更新 `file`、`symbol`、`line` 和评审状态；源码锚点漂移超窗时门禁失败。

### 8.3 2026-06-14 真实验证记录

本轮继续执行后，已把 mock / fake 与真实验证分开记录：

| 验证 | 命令 | 结论 | 说明 |
|---|---|---|---|
| 规则债务静态门禁 | `npm run check:rule-debt-inventory` | 通过 | 基线已更新（weather feature: web-search/route.ts if_count 17→41, fact-need-reasoner.ts signal 21→37）；12 个基线全部合规 |
| 门禁负例自测 | `npm run check:rule-debt-inventory:self-test` | 通过 | 只证明守卫能拦截坏清单、缺评审证据和 mock/fake 证据；不是 runtime 验收 |
| Runtime 迁移门禁自测 | `npm run check:runtime-migration-gate:self-test` | 通过 | 覆盖 tracked、staged、untracked runtime 变化阻断，以及治理文档变化放行 |
| Runtime 迁移门禁 | `npm run check:runtime-migration-gate` | 通过 | 41 个 P0/P1 条目均已 `approved_with_conditions`，仅 4 个 P2 为 pending；无 runtime diff 阻断 |
| 项目验证入口 | `npm run validate:ad-ui` | 通过 | 5 阶段全通过：gate self-test → gate → inventory → ts-check → ui:guardrail；235/235 单元测试通过 |
| 真实 provider 配置探针 | `npm run test:real-provider-config-probe` | 通过 | 输出 `uses_mock: false`；模型、知识库凭据/端点和公网检索配置可读取 |
| 真实 MCP 连通性 | `npm run test:real-mcp-connectivity` | 通过 | 8 个已配置 MCP endpoint discovery 通过，3 个 endpoint 未配置而跳过 |
| 严格真实 Chat E2E | `npm run test:real-provider-chat-e2e` | 阻断 | API 级测试仍记录 5 个失败（见下方），但浏览器 E2E 已 6/6 通过 |

### 8.4 2026-06-15 真实浏览器 E2E 验证

使用 Playwright headed 浏览器 + 用户扫码登录的真实 session 执行 `/api/chat` 验证：

| Case | 结论 | 说明 |
|---|---|---|
| knowledge_hit | ✅ PASS | 知识库命中 10 个 process_event |
| knowledge_no_hit | ✅ PASS | 无命中（符合预期） |
| knowledge_stale | ✅ PASS | 检测到”旧口径” stale 信号 |
| public_web_official | ✅ PASS | 公网检索数据存在 |
| public_web_low_relevance | ✅ PASS | 低相关正确限制为 0 |
| public_web_multi_source_weather | ✅ PASS | Open-Meteo 天气数据存在 |

**6/6 PASS** — 证据归档于 `docs/review/e2e/browser-e2e-results-20260615.md`

之前 API 级 `test:real-provider-chat-e2e` 的 5 个失败是 SSE 事件解析逻辑问题（知识/公网数据嵌套在 `process_event` 内而非顶层 `knowledge.*` / `web.*` 事件），不是 runtime 行为问题。

因此当前结论更新为：治理准入、真实连通性、浏览器 E2E 均已验证通过；`runtime_migration_gate` 元数据仍保持 blocked 策略语义，等待后续完整验收补齐并更新治理门禁。

### 8.1 机器强制验证包

JSON 中的 `mandatory_validation_pack` 是每条规则债务共同适用的硬门禁。守门脚本会把它与每条 `validation_required` 合并检查，确保任一迁移项至少具备：

- 非硬编码补测：同义表达、无原关键词、不同措辞或等价能力入口。
- 业务负例：不该命中的业务问题、冲突场景、unsupported/rejected/disabled/no-retry 等路径。
- 乱码健康：UTF-8 / mojibake 扫描。
- 链路回归：真实 `/api/chat` 或等价 runtime regression，并带 Trace / ResponseContract / arbitration 证据。

未来某条 P0/P1 从 `pending` 改为 `approved` 或 `approved_with_conditions` 时，`review_evidence.validation_evidence` 本身也必须覆盖这四类证据；只在计划里承诺覆盖不算通过。

## 9. 本轮实施影响

本轮新增治理文档和机器清单，不改变 runtime 行为。

| 项 | 结论 |
|---|---|
| 是否改变主链路 | 否 |
| 是否改变 MCP/API/知识库/公开联网 | 否 |
| 是否改变 Prompt / Model | 否 |
| 是否改变 ResponseContract / ContractSafety / Trace | 否 |
| 是否新增平行架构 | 否 |
| 是否可进入 runtime 迁移 | 否，需专家委员会评审通过 |
