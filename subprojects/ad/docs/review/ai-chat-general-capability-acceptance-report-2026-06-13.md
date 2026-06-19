# 通用 Chat 能力后验验收报告

- status: `runtime_partial_pass_scope_limited`
- date: `2026-06-13`
- scope: `/api/chat` 通用回答、公开联网、内部 MCP/API 问数、信息源仲裁、ResponseContract、Trace、模型降级、编码健康
- related design:
  - `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
  - `docs/architecture/governance/ai-chat-implementation-guardrails.md`
  - `docs/review/ai-chat-information-source-coordination-user-review-brief-2026-06-13.md`
  - `docs/review/ai-chat-information-source-coordination-review-packet-2026-06-13.md`

## 1. 验收结论

当前实现已经比原始状态前进一步：系统不再把“是否联网”作为先验主路由，而是引入了事实需求、Provider 资格、搜索计划和信息源仲裁。公开联网、内部能力、模型降级和 ResponseContract 已能在回归里形成可追溯证据。

但不能宣称“智能好用的通用 Chat 能力已经完整达标”。原因是：

- 内部知识库候选在问数混合场景中的 runtime 采纳/拒绝证据仍不足。
- 个人记忆、偏好和历史上下文已补 `/api/chat` 端到端验收，能证明候选进入 ResponseContract metadata、信息源仲裁和运行过程审计；但真实长期用户画像冲突和偏好覆盖边界仍需扩大验收。
- 公开联网真实生产 provider 未在本轮接入；本轮使用 mocked provider 和 not-configured 链路验收。
- 部分诊断/系统操作场景仍是受控降级，不是完整任务执行闭环。

综合结论：`partial_pass`。可以进入下一阶段扩大 runtime 验收，但不能标记总目标完成。

## 2. 本轮已实施的核心能力

| 能力 | 当前实现 | 证据 |
|---|---|---|
| 事实需求建模 | 新增 `FactNeed`，用事实可见性、权威要求、时效、敏感级别、回答形态、歧义影响描述需求 | `frontend/src/src/contracts/request-understanding/fact-need-contract.ts` |
| Provider 资格判断 | 新增 `ProviderAuthorityProfile` / `ProviderEligibility`，公开联网不再默认可抢答 | `frontend/src/src/lib/fact-need-reasoner.ts` |
| 搜索计划 | 新增 `SearchPlan`，按证据需求决定搜索深度、来源策略、查询策略和脱敏策略 | `frontend/src/src/lib/fact-need-reasoner.ts` |
| 公开联网执行门禁 | `detectPublicWebNeed` 先生成事实需求和搜索计划；`executePublicWebQuery` 遵守 block/redaction | `frontend/src/src/lib/public-web-runtime.ts` |
| 信息源仲裁 | `/api/chat` 记录 `planner.arbitrated`，公开联网只是候选，内部能力可优先 | `frontend/src/src/lib/information-source-arbitration.ts`、`frontend/src/src/app/api/chat/route.ts` |
| 内部能力提升执行 | Capability Discovery 命中内部问数能力时，不再被旧 route `requiresExecution` 否决 | `frontend/src/src/app/api/chat/route.ts` |
| 稳定回归 | `chat-runtime-regression` 临时关闭外部模型和 Trace 导出，避免把环境连通性当主链路失败 | `frontend/src/scripts/chat-runtime-regression.ts` |
| 专项验收 | 新增 `test:fact-need-public-web`，覆盖核心非硬编码不变量和 mocked public web 执行 | `frontend/src/scripts/fact-need-public-web-acceptance.ts` |
| 上下文验收 | 新增 `test:open-answer-context`，覆盖知识命中、记忆/近期会话选择和能力概览动态信号 | `frontend/src/scripts/open-answer-context-acceptance.ts` |
| 开放回答上下文端到端 | 新增 `test:open-answer-runtime-context`，覆盖知识库命中、记忆偏好、近期会话进入 `/api/chat` ResponseContract metadata 和运行审计 | `frontend/src/scripts/open-answer-runtime-context-acceptance.ts` |

## 3. 验收矩阵

| 验收维度 | 期望 | 当前结果 | 证据强度 |
|---|---|---|---|
| 普通开放式对话 | 不进入问数，不伪造工具或来源，允许 model-only / template fallback | 通过 | `test:chat-runtime-regression` 中普通对话 case |
| 公开实时/近期事实 | public web 未配置时明确说明配置缺口，不让模型编造 | 通过 | `test:chat-runtime-regression` 中公开事实 not-configured case |
| 公开官方/来源事实 | 允许 public web，要求 source refs 和 `web.search/web.result` trace | 通过，mocked provider | `test:fact-need-public-web` |
| 私有企业事实 | 不发送到公开联网，要求系统记录或内部能力 | 通过 | `test:fact-need-public-web`、`test:chat-runtime-regression` |
| 内部 MCP/API 问数 | 内部能力优先，公开联网不能抢路 | 通过基础用例 | `test:chat-runtime-regression` 中内部数据 case |
| 能力发现提升执行 | capability evidence 可把通用输入提升到问数链路 | 通过 | `test:chat-runtime-regression` 中日报能力 case |
| 知识库 | mocked knowledge provider 命中时，`/api/chat` 可将知识候选选为主证据并写入 ResponseContract metadata；真实外部知识库服务仍待验证 | 通过当前切片，生产待验 | `test:open-answer-context`、`test:open-answer-runtime-context` |
| 个人记忆和偏好 | runtime memory / recent conversation 可被相关性门禁采纳；当前轮显式否定偏好时可拒绝冲突记忆并记录原因；长期画像冲突仍待扩展 | 通过当前切片，长期冲突待验 | `test:open-answer-context`、`test:open-answer-runtime-context` |
| IntentOrch | disabled/候选隔离可观测，启用态冲突仲裁未充分证明 | 部分通过 | 当前 regression 主要覆盖 disabled/fallback |
| 歧义处理 | 高影响事实需求可标出 `ask_user` | 部分通过 | `test:fact-need-public-web` 覆盖 unknown system-record |
| ResponseContract | evidence_mode、answer_origin、tool_call_trace、source_refs 基础可用 | 通过基础用例 | `test:chat-runtime-regression` |
| Trace / Observability | `planner.arbitrated`、`web.search`、`web.result` 可见 | 通过 | 两组 regression |
| 编码健康 | 无跟踪文本乱码 | 通过 | `npm.cmd run check:mojibake` |

## 4. 关键命令结果

本轮已通过：

```txt
npm.cmd run ts-check
npm.cmd run test:fact-need-public-web
npm.cmd run test:open-answer-context
npm.cmd run test:open-answer-runtime-context
npm.cmd run test:model-service-governance
npm.cmd run check:mojibake
npm.cmd run test:chat-runtime-regression
```

说明：

- `test:chat-runtime-regression` 在脚本内临时关闭外部模型服务和外部 Trace 导出，目的是验证主链路契约和降级行为，而不是验证外部服务连通性。
- 公开联网成功取源使用 mocked provider；生产 provider 配置和真实公网搜索质量仍需单独验收。

## 5. 专家委员会后验评审

| 角色 | 结论 | 评审意见 |
|---|---|---|
| B 端数据产品 | `conditional_pass` | 内部数据优先和公开联网候选化方向正确；知识库和记忆命中体验还未证明 |
| AI 架构 | `pass_for_current_slice` | FactNeed / ProviderEligibility / SearchPlan 没有新增平行 OS，符合 Planner-first 主线 |
| 搜索专家 | `conditional_pass` | 搜索深度和来源策略已抽象化；真实 provider 的来源质量和 query rewrite 仍需验收 |
| 数据安全 | `pass` | 私有企业事实和敏感上下文不会进入公开联网主答路径 |
| 工程治理 | `conditional_pass` | 关键回归通过，核心文件禁用场景词扫描通过；仍需补知识库/记忆矩阵和真实 provider case |

总体：`runtime_partial_pass_scope_limited`。

## 6. 当前不可宣称完成的事项

1. 不能宣称“通用 Chat 已完整智能好用”。目前只是信息源仲裁和公开联网/内部数据基础链路通过。
2. 不能宣称知识库已在问数混合场景中正确参与。还缺真实 runtime 证据。
3. 不能宣称个人记忆和偏好已正确影响最终回答。当前只证明了选择/概览和候选元数据，仍缺真实命中、冲突和覆盖当前轮的验收。
4. 不能宣称公开联网生产可用。还缺真实 provider 配置、官方来源优先、低相关拒绝、多源冲突处理验收。
5. 不能宣称所有 Composer 输入都完成白名单治理。还需全路径 raw payload 隔离审计。

## 7. 下一阶段最小验收计划

| 优先级 | 任务 | 验收标准 |
|---|---|---|
| P0 | 补知识库 runtime case | 命中、无命中、旧口径三类均进入 Evidence/ResponseContract |
| P0 | 补记忆/偏好 runtime case | 偏好只影响表达/展示建议，不覆盖当前轮事实 |
| P0 | 补真实 public web provider case | 官方来源优先、source_refs、tool_call_trace、disclaimer 均通过 |
| P1 | 补混合证据 case | 内部指标 + 外部公开事实进入 `mixed_grounded`，不得强因果归因 |
| P1 | 补 IntentOrch 启用态冲突 case | IntentOrch 只能作为候选，不能直接改参数或选工具 |
| P1 | Composer 输入白名单审计 | raw tool payload、route rules、prompt hidden reasoning 不进入 Composer |

## 8. 给用户的审查建议

建议用户把当前结果视为“第一阶段 runtime slice 通过”，而不是最终完成。下一步应优先审查：

1. 是否认可 FactNeed / ProviderEligibility / SearchPlan 作为通用事实需求底座。
2. 是否认可内部 MCP/API > 知识库 > 公开联网 > model-only > clarify 的默认权威顺序。
3. 是否要求先补知识库和记忆真实验收，再继续扩大公开联网 provider 接入。
4. 是否允许将本报告第 7 节转成下一轮实施计划。

## 9. Runtime 授权后补充切片

- status: `knowledge_candidate_runtime_state_added`
- date: `2026-06-13`
- trigger: 用户已审核并授权 runtime 实施。

本切片完成：

- `InformationSourceArbitration` 支持知识库候选 runtime 状态和 metadata。
- 开放回答 final metadata 使用实际 `plannerContext.knowledge` 状态重新生成 `info_source_arbitration`。
- 问数分支显式记录 `knowledge.status = not_collected_in_report_pre_execution`，避免知识库候选被静默省略。
- 新增单测覆盖知识库命中 selected、内部能力优先时 knowledge verification、问数预执行未收集知识库 not_evaluated。

已验证：

```txt
npm.cmd exec vitest run tests/information-source-arbitration.test.ts
npm.cmd run ts-check
```

仍不能宣称完成：

- 真实外部知识库服务命中/无命中/旧口径三类 `/api/chat` 端到端 case 尚未跑通。
- 记忆/偏好 runtime 命中和冲突场景仍待补。
- 真实 public web provider 仍待接入和验收。
- Composer 全路径 raw payload 白名单审计仍待补。

## 10. 回归稳定性后补

- status: `runtime_regression_stability_fixed`
- date: `2026-06-13`
- trigger: `test:chat-runtime-regression` 曾在并发/残留运行后出现 Windows `EPERM`，位置为 `.runtime/zhitou-chat/v2/workflow-tasks.json.tmp` rename。

本切片完成：

- `workflow-task-store` 不再使用固定 `.tmp` 文件名，改为按进程、时间和随机后缀生成单次写入临时文件。
- 对 Windows 上短暂文件锁导致的 `EPERM` / `EBUSY` / `EACCES` rename 增加有限重试。
- 不改变 Chat Core、FactNeed、ProviderEligibility、SearchPlan、ResponseContract 或 Prompt 行为。

已验证：

```txt
npm.cmd run ts-check
npm.cmd run check:mojibake
npm.cmd run test:chat-runtime-regression
```

结论：

- 回归脚本单独运行已完成，未复现固定临时文件冲突。
- 该修复只提升验收基础设施稳定性，不改变本报告 `runtime_partial_pass_scope_limited` 的总体结论。

## 11. 知识库候选与 Composer 输入审计补充

- status: `knowledge_candidate_planner_metadata_and_contract_audit_added`
- date: `2026-06-13`
- trigger: 用户指出真实外部知识库命中/无命中/旧口径三类 `/api/chat` 端到端 case 尚未跑，记忆/偏好 runtime 冲突、真实 public web provider、Composer raw payload 白名单审计仍是下一批。

本切片完成：

- `OpenAnswerPlannerProjection` 新增显式 `knowledge` planner candidate，记录 `status`、`hit_count`、`evidence_role`、`freshness`、`risk_flags`，避免知识库只隐含在 evidence hint 中。
- 知识库命中进入 `candidate_evidence`；知识库无命中只记录 `knowledge_no_hit`，不得伪造内部证据；旧口径/过期知识只作为 `verification`，并要求刷新证据后才能输出确定结论。
- `chat_answer` prompt variable contract 补充禁止 `raw_kb_chunks`、`raw_knowledge_hits`，并回归验证 `route_rules`、`tool_priority` 不得进入 Composer prompt。
- `test:open-answer-context` 等价覆盖知识库命中、无命中、旧口径三类 planner/composer 元数据行为。
- 修正 `open-answer-runtime-context-acceptance` 中验收 fixture 的记忆来源枚举，使用受治理的 `system_default`。

已验证：

```txt
npm.cmd exec vitest run tests/open-answer-planner-context.test.ts tests/prompt-variable-contract.test.ts tests/information-source-arbitration.test.ts
npm.cmd exec tsx scripts/open-answer-context-acceptance.ts
npm.cmd run ts-check
git diff --check -- frontend/src/src/lib/open-answer-planner-context.ts frontend/src/src/app/api/chat/route.ts frontend/src/src/contracts/model-service/prompt-variable-contract.ts frontend/src/tests/open-answer-planner-context.test.ts frontend/src/tests/prompt-variable-contract.test.ts frontend/src/scripts/open-answer-context-acceptance.ts frontend/src/scripts/open-answer-runtime-context-acceptance.ts docs/review/ai-chat-general-capability-acceptance-report-2026-06-13.md
```

本切片仍不宣称完成：

- 真实外部知识库 provider 的命中/无命中/旧口径三类 `/api/chat` 端到端 case 尚未跑；本轮是 runtime 等价回归和契约审计。
- 记忆/偏好与当前轮显式输入冲突的真实 `/api/chat` 采纳质量仍待补。
- 真实 public web provider 的官方来源优先、低相关拒绝和多源冲突仍待补。

## 12. 开放回答上下文 runtime 端到端后补

- status: `open_answer_runtime_context_slice_passed`
- date: `2026-06-13`
- trigger: 总目标要求通用 Chat 既能用知识库，也能结合个人记忆、偏好和上下文；原验收只证明抽象选择函数，证据强度不足。

本切片完成：

- `evaluation-runtime-runner` 支持显式 `conversationId`、history 和 headers，用于构造隔离的端到端验收作用域。
- `/api/chat` 开放回答分支把 `plannerContext.arbitrationSummary.evidence_mode_hint` 映射到 ResponseContract `evidence_mode`，避免知识库/混合上下文证据只藏在 metadata 中。
- 新增 `test:open-answer-runtime-context`：构造本地用户记忆、近期会话和 mocked knowledge provider，断言知识库被选为主证据，记忆/历史作为上下文候选，公开联网不抢答，ResponseContract 显式为 `mixed_grounded`。

已验证：

```txt
npm.cmd run test:open-answer-runtime-context
npm.cmd run ts-check
npm.cmd run test:open-answer-context
npm.cmd run check:mojibake
```

仍不能宣称完成：

- mocked provider 不等于生产知识库服务质量验收。
- 仍需补无命中、旧口径、权限不足、长期画像冲突、历史上下文误召回等端到端矩阵。
- 真实公开联网 provider 和混合证据冲突处理仍待验收。

## 13. 当前轮显式约束覆盖记忆偏好后补

- status: `current_turn_overrides_memory_preference_passed`
- date: `2026-06-13`
- trigger: 总目标要求结合个人记忆、偏好和上下文，但好用的通用 Chat 必须保证记忆不能覆盖当前轮用户显式要求。

本切片完成：

- `selectOpenAnswerContextCandidates` 新增通用偏好冲突门禁：当当前轮明确否定候选记忆/偏好中的词项时，拒绝该记忆。
- planning metadata 对 rejected context 增加 `id/source/score/reasons/reason_codes` 审计，不输出记忆正文。
- `test:open-answer-runtime-context` 扩展端到端 case，验证冲突记忆不会被选中，并记录 `explicit_user_constraint_conflict` 与 `current_turn_overrides_memory`。

已验证：

```txt
npm.cmd exec vitest run tests/open-answer-planner-context.test.ts
npm.cmd run test:open-answer-runtime-context
npm.cmd run ts-check
npm.cmd run check:mojibake
npm.cmd run test:open-answer-context
```

仍不能宣称完成：

- 当前只覆盖“用户显式否定某个偏好词项”的冲突；更复杂的语义反向偏好、长期画像互斥、时间过期和多记忆互相冲突仍需后续矩阵。
- 该门禁不改变 MCP/API、知识库、公开联网的权威顺序，只补上下文采纳安全性。

## 14. Mock / Fixture / 真实验证审计

- status: `real_validation_audit_failed_partial`
- date: `2026-06-13`
- trigger: 用户要求检查是否存在 mock 和造假流程用于测试，务必真实验证。

审计结论：

- 存在 mock / fixture / 等价回归测试，不能作为真实 provider 通过证据。
- 当前环境真实 provider 配置存在：知识库有 credentials、endpoint，能解析 5 个知识库 ID；公开联网 enabled 且 search endpoint 已配置。
- 真实 provider E2E 已运行，但不是全绿，不能宣称通用 Chat 真实生产能力完整达标。

明确不算真实 provider 验收的用例：

| 脚本 | 性质 | 可证明 | 不可证明 |
|---|---|---|---|
| `test:fact-need-public-web` | mocked provider / 单元级门禁 | FactNeed、ProviderEligibility、SearchPlan、source_refs 契约 | 真实公开搜索质量 |
| `test:open-answer-context` | 函数级/等价回归 | 上下文选择、知识候选 metadata、raw payload 隔离 | `/api/chat` 真实 provider 质量 |
| `test:open-answer-runtime-context` | `/api/chat` + mocked knowledge provider + 本地 runtime state | ResponseContract metadata、记忆/历史采纳、公开联网不抢答 | 真实知识库召回质量 |
| `chat-runtime-regression` | 受控 runtime regression，关闭外部模型/Trace，含 mocked fetch/unsafe endpoint | 主链路契约、降级、内部数据不外泄 | 真实外部服务连通性 |

真实 provider 探测结果：

```txt
npm.cmd exec tsx scripts/real-provider-config-probe.ts

model_enabled=true
kb_has_credentials=true
kb_endpoint_set=true
kb_ids_count=5
public_web_enabled=true
public_web_endpoint_set=true
public_web_method=POST
```

旧版真实 provider E2E 结果（已降级为问题发现证据，不作为最终真实验收通过证据）：

```txt
npm.cmd run test:real-provider-chat-e2e

PASS real_provider knowledge_hit_api_chat_e2e
FAIL real_provider knowledge_no_hit_api_chat_e2e
FAIL real_provider knowledge_stale_api_chat_e2e
PASS local_runtime_state memory_preference_current_turn_conflict_api_chat_e2e
PASS real_provider public_web_official_source_real_provider
FAIL real_provider public_web_low_relevance_real_provider
PASS real_provider public_web_multi_source_real_provider
```

失败解释：

- `knowledge_no_hit_api_chat_e2e`：旧脚本使用随机/不存在查询，不能算严格真实验收；但它暴露出真实知识库 provider 可能存在低相关召回问题。
- `knowledge_stale_api_chat_e2e`：真实知识库 provider 未返回可识别的 stale / expired / deprecated freshness 信号，旧口径治理缺少真源字段或受控测试数据。
- `public_web_low_relevance_real_provider`：旧脚本使用随机低相关公开查询，不能算严格真实验收；但它暴露出公开联网结果门禁可能缺少低相关拒绝。

本轮已修正：

- 恢复 `scripts/real-provider-config-probe.ts`，输出 `evidence_tier=real_provider_config_probe` 和 `uses_mock=false`。
- 恢复 `scripts/real-provider-chat-e2e.ts`，删除 mocked fetch 和本地记忆 fixture，不再用随机 query 凑真实用例。
- 严格真实 E2E 改为必须由环境变量提供受控真实样本：
  - `XIAOQIAO_REAL_KB_HIT_QUERY`
  - `XIAOQIAO_REAL_KB_NO_HIT_QUERY`
  - `XIAOQIAO_REAL_KB_STALE_QUERY`
  - `XIAOQIAO_REAL_WEB_OFFICIAL_QUERY`
  - `XIAOQIAO_REAL_WEB_LOW_RELEVANCE_QUERY`
  - `XIAOQIAO_REAL_WEB_MULTI_SOURCE_QUERY`

严格真实 E2E 当前状态：

```txt
npm.cmd run ts-check
PASS

npm.cmd exec tsx scripts/real-provider-config-probe.ts
PASS, uses_mock=false, kb_ids_count=5, public_web_enabled=true

npm.cmd run test:real-provider-chat-e2e
FAIL, validation_mode=strict_real_provider_no_mock_no_fixture_no_random
FAIL knowledge_hit_api_chat_e2e: missing XIAOQIAO_REAL_KB_HIT_QUERY
FAIL knowledge_no_hit_api_chat_e2e: missing XIAOQIAO_REAL_KB_NO_HIT_QUERY
FAIL knowledge_stale_api_chat_e2e: missing XIAOQIAO_REAL_KB_STALE_QUERY
FAIL public_web_official_source_real_provider: missing XIAOQIAO_REAL_WEB_OFFICIAL_QUERY
FAIL public_web_low_relevance_real_provider: missing XIAOQIAO_REAL_WEB_LOW_RELEVANCE_QUERY
FAIL public_web_multi_source_real_provider: missing XIAOQIAO_REAL_WEB_MULTI_SOURCE_QUERY
```

整改判断：

- mocked/fixture 测试只能保留为契约和负例门禁，不得写成“真实验收通过”。
- 当前真实验证结论是 `config_real_provider_available_but_strict_e2e_missing_controlled_samples`：provider 配置可连通，但严格 E2E 缺少受控真实样本，不允许用默认、随机、mock 或 fixture 替代。
- 下一阶段 P0 应配置上述真实验收样本环境变量，并重跑 `test:real-provider-chat-e2e`；若仍失败，再分别修知识库 no-hit 阈值、知识 freshness 字段映射和公开联网低相关拒绝。

扫码登录后补充：

- date: `2026-06-14`
- 用户已扫码登录，重新运行真实配置探测：知识库 credentials、endpoint、5 个 KB id、公开联网 endpoint 均存在。
- 重新运行严格真实 E2E：仍失败在 6 个受控真实样本环境变量缺失；登录态不能替代验收样本。
- 已验证脚本本身无 mock / fixture / random：静态扫描仅命中说明文案中的禁止词。
- `npm.cmd run ts-check` 已通过；`npm.cmd run check:mojibake` 已通过。

样本文件后补：

- date: `2026-06-14`
- `scripts/real-provider-chat-e2e.ts` 支持读取 gitignored 本地样本文件：`.runtime/zhitou-chat/v2/real-provider-e2e-samples.json`。
- 已在本地创建空模板，等待填入真实验收样本；空模板不构成验收数据。
- 当前不需要再次扫码登录；下一步需要填入 6 个真实 query 后重跑 `npm.cmd run test:real-provider-chat-e2e`。

用户样本实测后补：

- date: `2026-06-14`
- validation_mode: `strict_real_provider_no_mock_no_fixture_no_random`
- sample_file: `.runtime/zhitou-chat/v2/real-provider-e2e-samples.json`

真实 E2E 结果：

```txt
PASS knowledge_hit_api_chat_e2e
  query="最近智投更新了什么功能", direct_hits=9, planner_hits=5

FAIL knowledge_no_hit_api_chat_e2e
  query="最近巨量更新了什么功能", direct real knowledge no-hit query unexpectedly returned 5 hits

FAIL knowledge_stale_api_chat_e2e
  query="智投的注册设备率怎么算", provider returned no stale/expired/deprecated freshness signal

PASS public_web_official_source_real_provider
  query="NBA总决赛2026年谁是总冠军", sources=2

PASS public_web_low_relevance_real_provider
  query="我今天很开心", required=false, reason=public_web.need_not_detected

FAIL public_web_multi_source_real_provider
  query="乌克兰是否真要和俄罗斯停火", reason=public_web.no_results
```

真实结论：

- 真实知识库“命中并进入 `/api/chat` 仲裁”通过。
- 真实公开联网“官方/实时事实可返回来源”通过。
- 普通情绪/闲聊不触发公开联网通过。
- 知识库 no-hit 样本失败：用户给的“最近巨量更新了什么功能”实际命中知识库 5 条，不能作为 no-hit 样本；也提示知识库可能覆盖外部平台内容，需进一步看命中相关性。
- 知识库旧口径样本失败：provider 未给出可识别 freshness / stale / deprecated 字段，旧口径治理缺真源元数据或映射。
- 公开联网多源样本失败：当前 provider 对“乌克兰是否真要和俄罗斯停火”返回 no_results，需检查搜索 query rewrite、provider 可达性和来源策略。

真实浏览器 E2E 后补：

- date: `2026-06-14`
- validation_mode: `browser_real_http_no_mock_no_route_import`
- command: `npm.cmd exec tsx scripts/browser-real-chat-e2e.ts`
- browser entry: Playwright Chromium page context, `window.fetch('/api/chat')`
- log: `frontend/src/tmp-browser-real-chat-e2e.log`

已完成真实浏览器 `/api/chat` E2E：

```txt
PASS browser_api_chat_knowledge_hit
  evidence_mode=mixed_grounded, knowledge_status=selected, hit_count=2

PASS browser_api_chat_knowledge_no_hit
  query=xqkbnohit8agm65ymgt, planner_status=no_hit, evidence_mode=model_only

PASS browser_api_chat_memory_preference_conflict
  context_status=candidate, answer_length=105
```

真实浏览器 E2E 未通过项：

```txt
FAIL browser_api_chat_knowledge_stale
  provider/runtime did not expose stale freshness:
  planner status=searched, freshness=fresh, evidence_role=candidate_evidence

FAIL browser_api_chat_public_web_official_source
  entered public web path but no public web sources returned

FAIL browser_api_chat_public_web_low_relevance_reject
  entered public web path but provider aborted:
  output.error="This operation was aborted"

FAIL browser_api_chat_public_web_multi_source
  browser /api/chat request failed after provider/search path instability:
  TypeError: Failed to fetch
```

整改判断：

- 真实浏览器层已证明知识库命中、知识库无命中、记忆/偏好弱信号不覆盖当前轮显式输入三项成立。
- 旧口径仍不能宣称通过：真实知识库 provider 对测试 query 返回 fresh，未暴露 stale / expired / deprecated 信号；需要 provider 元数据或明确旧口径样本。
- 公开联网三项均已真实跑过，但不能宣称通过：失败集中在真实 public web provider 的 source refs / timeout / no-results 稳定性，而不是 mock 或脚本替代。
- 后续 P0 是修 public web provider 可达性、source_refs 返回和多源 query rewrite；修完后重跑 `test:browser-real-chat-e2e`，而不是回退到 mocked acceptance。

真实浏览器 E2E 修复后复跑：

- date: `2026-06-14`
- validation_mode: `browser_real_http_no_mock_no_route_import`
- browser entry: Playwright Chromium page context, `window.fetch('/api/chat')`
- runtime fixes:
  - public web provider HTTP 非 2xx 进入结构化错误，不再被当作空 JSON。
  - public web result parser 支持 `webPages.value`、`data/results/items/list/value`、`organicResults`、`sources/citations` 等常见真实 provider 形态。
  - 本地真实 `/api/xiaoqiao/web-search` 的 Bing fallback 超时/失败返回结构化 no-results，不让浏览器 `/api/chat` 直接 `Failed to fetch`。
  - runtime search query 保留原 query，同时追加去掉“请联网查/不要只看一个来源”等指令壳的候选 query；该处理只作用于公开检索 query，不参与业务路由。
  - 浏览器 E2E 支持 `--case=` 单 case 复跑，并修正多次 `web.result` 场景下只读取第一个失败事件的问题。

真实浏览器 `/api/chat` public web 复跑结果：

```txt
PASS browser_api_chat_public_web_official_source
  command=npm.cmd exec -- tsx scripts/browser-real-chat-e2e.ts --case=public_web_official_source
  source_count=4, evidence_mode=mixed_grounded

PASS browser_api_chat_public_web_low_relevance_reject
  command=npm.cmd exec -- tsx scripts/browser-real-chat-e2e.ts --case=public_web_low_relevance
  web_result_status=error, filter_reason=relevance_gate_filtered_all

PASS browser_api_chat_public_web_multi_source
  command=npm.cmd exec -- tsx scripts/browser-real-chat-e2e.ts --case=public_web_multi_source
  source_count=5, evidence_mode=source_grounded
```

知识库旧口径复核：

```txt
npm.cmd run test:real-provider-chat-e2e
FAIL overall
SKIP knowledge_stale_api_chat_e2e:
  no real stale/expired/deprecated knowledge sample is currently available;
  keep this as a future knowledge-governance acceptance case
```

当前结论：

- 真实 public web provider 的官方来源优先、低相关拒绝、多源来源三项已在真实浏览器 `/api/chat` 层通过。
- 知识库旧口径仍不能标记完成：runtime 已支持 freshness/stale 字段进入 planner candidate，但真实 provider 仍缺少可识别旧口径元数据或明确旧样本 query。
- 下一步 P0 是治理知识库 freshness 元数据：要求 provider 返回 `freshness/status/lifecycle_status/validity/state` 或 `stale/is_stale/outdated/expired/deprecated`，或者提供一个真实旧口径样本 query 后用 `--case=knowledge_stale` 复跑浏览器 E2E。

知识库旧口径 nested metadata 复核：

- date: `2026-06-14`
- runtime change: 知识库 hit freshness 读取已扩展为递归读取 nested metadata，仅识别元数据键，不从正文关键词推断旧口径。
- accepted keys:
  - freshness/status: `freshness`, `status`, `lifecycle_status`, `lifecycleStatus`, `validity`, `state`, `version_status`, `versionStatus`
  - stale flags: `stale`, `is_stale`, `isStale`, `outdated`, `expired`, `deprecated`, `isDeprecated`, `isOutdated`, `isExpired`

真实浏览器 `/api/chat` 复跑结果：

```txt
npm.cmd exec -- tsx scripts/browser-real-chat-e2e.ts --case=knowledge_stale
FAIL browser_api_chat_knowledge_stale
  provider/runtime did not expose stale freshness:
  status=searched, hit_count=1, evidence_role=candidate_evidence, freshness=fresh
```

最新判断：

- 旧口径未完成不是 mock/fixture 或测试读取问题；当前真实 provider 对测试 query 返回的是 fresh 候选。
- 若要让 `knowledge_stale` 通过，需要真实知识库 provider 返回上述 freshness/stale 元数据，或在 `.runtime/zhitou-chat/v2/real-provider-e2e-samples.json` 中配置一个确实能返回 stale/expired/deprecated 信号的 `XIAOQIAO_REAL_KB_STALE_QUERY`。
- 在未满足上述任一条件前，目标仍不得标记完成。
