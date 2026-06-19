# AI Chat 通用实施守护规范（Planner-first 版）

> Last Updated: 2026-06-12
> Scope: 通用 `/api/chat`、会话工作台、Request Understanding、Task Planning、Capability/Intent/Tool/ResponseContract、Prompt/Model/Trace、Admin 配置与用户可见前端。
> Canonical architecture: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
> Confirmed Decisions: 2026-06-12 用户确认 1-6 架构收口方向

## 1. 准入原则

任何涉及通用 Chat 主链路、模型调用、Prompt、工具、MCP、知识库、公开联网、ResponseContract、Trace、Admin 配置或用户可见前端的任务，必须先按 `Planner-first, tool-grounded, contract-guarded` 判断归属。

默认顺序：

1. 阅读 `AGENTS.md`、总纲、本文件和涉及前端时的 UI guardrail。
2. 输出当前问题真实表现和边界。
3. 输出影响层级、可能根因、硬编码风险和最小修改方案。
4. 若涉及架构范式、契约或主链路，先更新规格文档或明确规格依据。
5. 再制定实施计划。
6. 最后改 runtime / contract / tests。

禁止先改 runtime，再用文档补丁解释已经发生的实现。

## 2. 前置分析必填项

每次修改前必须输出：

- 当前问题的真实表现。
- 运行面、控制面、展示面、观测面、配置面边界。
- 可能根因。
- 影响链路。
- 涉及层级：
  - Request Understanding
  - Task Planning / Planner
  - IntentOrch
  - Plan Arbitrator
  - Capability Discovery
  - Execution Policy
  - Tool / MCP / API
  - Knowledge / Public Web
  - Model Service
  - Prompt
  - Answer Composer
  - ContractSafety
  - ResponseContract / SemanticResultContract
  - Frontend Presentation
  - Admin Control Plane
  - Observability / Trace
- 是否存在硬编码或业务强耦合风险。
- 是否影响主链路、MCP、模型、Prompt、ResponseContract、Trace。
- 是否需要更新规格、golden、fixture 或回归用例。
- 最小修改方案与验证方案。

高风险、跨主链路、不可逆、契约边界变化或可能影响真实用户的变更，应在实施前请求明确确认。

## 3. 目标架构守护

实施目标不是修一个输入样例，而是保证通用 Chat 底座可治理、可观测、可回归、可配置。

必须守住：

- 用户输入先进入 LLM 结构化理解与任务规划。
- Planner 输出必须是严格 JSON，并经过 schema 校验。
- IntentOrch 是 planner candidate，不是私自绕过仲裁器的并行主链。
- Plan Arbitrator 统一合并 LLM、IntentOrch、rules/config fallback 候选。
- MCP/API/知识库/公开联网是证据和动作来源，必须进入 SourceRef/EvidenceRef/ToolCallTrace。
- Answer Composer 基于证据综合最终回答。
- ContractSafety 是不可绕过的后置检查层。
- ResponseContract 是唯一对外响应收口，不新增平行协议。
- Frontend 只消费契约，不从正文、正则、关键词或样式反推业务状态。
- Prompt 变量是可校验契约，不是中文提示词补丁。每个模型 use case 必须声明 allowed/required/forbidden variables，并由 Context Builder 白名单注入。
- 开放式回答必须显式声明 `evidence_mode`，即使是闲聊、能力说明或 model-only 回答，也不得绕过 Evidence Ledger / ContractSafety。

## 3.1 本轮已确认实施边界

本轮实施必须按以下边界推进：

1. `route.ts` 历史业务关键词路由迁移到 `Planner candidate + config fallback`，只保留安全、权限、内部数据保护和 schema 类规则边界。
2. 业务域规则包作为受治理 seed / capability policy 保留，但不能进入通用 Core 或 renderer。
3. 默认仲裁优先级固定为 `MCP/API > 内部知识库 > 公开联网 > model-only > clarify`。
4. 失败处理中的 LLM 只能解释失败原因，不允许改参数、切工具或绕过 Execution Policy。
5. 前端运行过程只消费后端 `DisclosureProjection`，不得从正文或关键词反推步骤含义。
6. 规格文档先行，runtime、contract、tests 后续实现必须以总纲为准。

## 4. LLM 使用边界

### 4.1 允许

- Request Understanding：将用户输入、上下文、约束、歧义、风险信号结构化。
- Task Planning：生成候选计划、所需证据、执行依赖和澄清条件。
- Answer Composition：基于已收集证据、来源、工具结果和风险限制组织最终回答。
- Explainer：解释工具结果、失败原因、置信边界和下一步动作。
- Rewriter：在不改变事实和来源的前提下改善表达、排版和可读性。

### 4.2 禁止

- 编造 MCP/API/知识库/公开联网没有返回的事实。
- 用自然语言推测替代缺失证据。
- 把周末、节假日、季节、暑假、系统升级等动态因素当成默认原因；没有工具数据、知识库、公开来源、历史同期、业务日历或用户上下文证据时，只能标为待验证假设或不提。
- 直接覆盖 Tool Contract、权限、schema、配置、ContractSafety 或 Trace。
- 让 Prompt 承载业务关键词路由、参数补齐或硬编码样例。
- 只用中文语义描述替代 PromptVariableSchema，例如把“如果用户问 X 就 Y”写进 Prompt 来绕过 Planner、Evidence 或 ExecutionPolicy。
- 让 LLM 修改失败工具的参数后自动切工具重试，除非 Execution Policy 明确允许且有审计记录。
- 让模型输出绕过 ResponseContract 直接被前端渲染成结构化结果。

### 4.3 动态因素相关性门禁

Planner 和 Answer Composer 可以使用时间、节假日、季节、工作日/周末、系统升级、用户角色、当前项目、历史问题等上下文，但必须先判断相关性：

- 有明确证据链时，才可作为结论或原因。
- 只有弱信号时，只能放入“待验证假设”，并说明需要验证的数据。
- 没有证据时，不得为了显得聪明而主动补充泛化解释。

数据解读、问数总结、诊断解释和通用回答都必须遵守该门禁。

### 4.4 Prompt 变量治理

Prompt 由两层组成：

1. **中文语义层**：描述模型职责、表达风格、输出格式和禁止事项。
2. **变量契约层**：机器可校验的 `required_variables`、`optional_variables`、`forbidden_variables`、变量来源、自动更新策略、脱敏策略和输出契约。

禁止把变量契约降级成中文说明。以下规则为 P0 准入：

- `planner`、`chat_answer`、`answer_composer`、`knowledge_answer`、`failure_explainer` 等模型 use case 必须声明 PromptVariableSchema。
- Context Builder 只能注入当前 use case 白名单变量。
- 缺少 required variable 时必须进入 FailureContract 或 prompt-variable failure，不得调用模型。
- 命中 forbidden variable 时必须进入 `prompt_variable_violation`，不得调用模型。
- Composer 不能接收 `raw_tool_args`、`raw_tool_result`、`raw_kb_chunks_not_filtered`、`route_rules`、`tool_priority`、`raw_stack_trace`、`prompt_hidden_reasoning`、`model_chain_of_thought`、`full_user_profile`。
- 能力摘要、IntentOrch 候选、Planner 候选集合、仲裁摘要、用户角色、项目上下文、用户偏好、记忆、最近会话、系统能力、知识命中、公开来源和时间上下文可以作为变量，但必须记录来源、版本、更新时间和脱敏策略。
- IntentOrch 只能注入摘要后的 `intentorch_candidate` 或 `planner_candidates[]`，用于 Planner/Arbitrator/Composer 理解候选意图；它不能直接选择工具、修改参数、绕过 Evidence Ledger，或替代 `arbitration_summary` 成为最终执行依据。
- `arbitration_summary` 由 Plan Arbitrator 生成，表达最终采用路径、拒绝候选、风险标记和证据需求；Composer 只能按该摘要和 evidence/context 组织回答。
- 自动更新变量必须来自受治理来源，例如 capability manifest 从最新 tool 派生，用户角色从 user profile 读取，项目从登录态和权限读取，知识源从 Knowledge Source Policy 读取。

P1 可引入 Prompt quality review 和 evidence quality review，但它们只能作为 review/shadow 或发布前辅助，P0 阻断必须依靠 deterministic schema、白名单和 ContractSafety。

## 5. Planner 与仲裁准入

### 5.1 RequestUnderstandingContract

必须有严格 schema，至少表达：

- `user_goal`
- `intent_type`
- `domain_signals`
- `constraints`
- `context_refs`
- `missing_info`
- `risk_flags`
- `confidence`

schema 校验失败时只能重试、clarify 或进入配置化保守 fallback。不得用业务关键词分支替代。

### 5.2 TaskPlanContract

必须表达：

- `planner_source`
- `task_type`
- `candidate_paths`
- `required_evidence`
- `required_inputs`
- `risk_flags`
- `confidence`
- `recommended_path_id`
- `clarification`

### 5.3 Plan Arbitrator

仲裁器必须记录：

- 候选来源：LLM Planner、IntentOrch、rules/config fallback。
- 候选分歧。
- 路径优先级。
- 风险与置信度。
- 证据完整度。
- 最终选择原因。
- 被拒绝候选原因。

默认优先级：

1. MCP/API
2. 内部知识库
3. 公开联网
4. model-only
5. clarify

同优先级按低风险、高置信、证据完整度、上下文一致性排序。

### 5.4 弱信号合并门禁

LLM Planner、Request Understanding corrections、IntentOrch 候选、多轮继承和公开联网/知识库候选，都只能作为“候选”或“弱信号”进入仲裁，不得直接改写当前轮用户明确表达的目标、槽位、工具或参数。

合并弱信号必须满足：

- 只填补空槽位，不覆盖当前轮已解析出的明确 `metrics`、`dimensions`、`dateRange`、`task`、实体、权限范围和工具入参。
- 所有模型输出必须先归一化成既有契约形状；例如时间范围必须落到 `dateRange.type/value`，不得把模型私有字段直接 cast 进 contract。
- 不支持的字段必须拒绝并记录原因，不能静默吞掉后在后续链路继续使用。
- 每次采纳和拒绝都要写入运行日志或 Trace，至少包含来源、字段、原因和是否采纳。
- 多轮继承不能覆盖本轮显式输入；只能在本轮缺失且上下文仍相关时填空。
- IntentOrch 失败、超时或未初始化只能降低该候选置信度，不能让其他链路伪装成 IntentOrch 决策。

任何新增的合并器必须有回归断言：显式输入不被覆盖、非法模型 shape 被拒绝、候选只进入审计或 resolver candidate lane，不直接成为执行权威。

## 6. 硬编码与反面清单

严禁在通用 Chat Core、route handler、Prompt glue、renderer、client hook、fallback 中写入以下逻辑：

- 用 `includes()`、正则、if/else、switch 按业务关键词、媒体名、指标名、报表名、客户样例或测试输入决定路由。
- 用单个用户例子修正通用意图。
- 用业务 pack 反向覆盖用户 Top Intent。
- 用 Prompt 代替 Tool Contract、权限、schema、MCP 执行或配置治理。
- UI 兜底业务逻辑。
- Trace/Observability 作为主链路依赖点。
- 把模型失败伪装为成功回答。
- 把兼容 fallback 写成长期主路径。
- 新增平行 OS、Protocol、Schema、Contract。
- 提交含乱码的源码、文档、fixture、golden schema 或用户可见文案。

允许：

- 能力规则在 Capability Manifest、Route rules、Tool metadata、Metric catalog、Admin policy、Prompt/Model 配置或受治理 seed 中维护。
- 安全、合规、权限、数据保护规则由 ContractSafety 或 Execution Policy 承载。
- 通过 adapter 兼容旧字段，但必须标明迁移目标和退出条件。

配置化不自动等于合规。以下情况即使写在 config、seed 或测试中，也仍按硬编码处理：

- 用单个验收句、同义句片段、城市名、角色名、项目名或业务样例作为排除条件，直接决定是否走某条能力链路。
- 用“助手元问题”“能力说明”等文本信号绕过 Planner/ExecutionPolicy，而不是把它们作为 Request Understanding 的结构化意图和 evidence need。
- 为了修复一个 case，把关键词列表加长，却没有把能力候选、证据候选、仲裁原因、被拒候选和 ContractSafety 记录下来。
- 用配置词表替代 LLM Planner 的结构化输出、Capability Manifest 的能力描述、Tool Contract 的输入输出约束或 Evidence Ledger 的证据状态。

配置/seed 的合规用途是提供能力描述、安全边界、权限开关、受治理术语、模型路由和策略阈值；它不能成为测试输入到执行路径的隐形映射表。

### 6.1 硬编码审查分级

每次发现 `includes()`、正则、if/else、switch 或样例文本时，必须先分级再处理：

| 等级 | 特征 | 处理 |
|---|---|---|
| P0 阻断 | 在通用 route handler、Chat Core、Prompt glue 或 renderer 中按业务词、城市名、媒体名、指标名、单个测试句决定路由、工具、参数或最终回答 | 当轮迁出、删除或改为消费 Contract/Config；不能上线 |
| P1 必须迁移 | 位于 Request Understanding、Capability Discovery、slot resolver、orchestrator 中的业务词典或得分规则，但仍承担执行决策 | 迁入 Capability Manifest、Route rules、Tool metadata、Metric catalog、Admin policy 或受治理 seed，并补回归 |
| P2 可治理保留 | 受控术语、状态枚举、安全/合规、schema 校验、UI 状态色、日志级别、非业务文本格式化 | 可保留，但不得反推业务语义 |
| P3 观测风险 | 历史文档、审查快照、测试记录、一次性验收 artifact 中的旧样例或旧规则 | 不阻断 runtime，但不得被当前服务引用；乱码仍必须清理 |

P0 与 P1 不能用”模型会修正”作为豁免理由。模型可以提供理解、规划、解释和表达，但最终权威必须来自 Contract、Evidence、Execution Policy 和受治理配置。

### 6.2 Semantic Frame Runtime 授权边界（P0/P1-1 已实施）

> 详细规格：`docs/architecture/semantic-frame-runtime/00_SEMANTIC_FRAME_RUNTIME_SPEC.md`  
> 执行门控设计：`docs/architecture/semantic-frame-runtime/05_EXECUTION_GATE.md`

Semantic Frame Runtime 是 Request Understanding 的中间语义层，为路由决策、用户需求和执行门控提供结构化语义解释。必须遵守以下授权边界：

**禁止单点授权执行**：

- ❌ 禁止 `capability match` 单独触发 `report execution`
- ❌ 禁止 `keyword match` 单独触发 `report execution`
- ❌ 禁止 `route decision` 单独触发 `report execution`
- ❌ 禁止 `LLM output` 单独触发 `report execution`
- ✅ 必须 `semantic frame + route + capability + gate` 联合授权

**执行门控必要条件**（必须全部满足）：

1. `route.intent_type === 'report_query'`
2. `route.requiresExecution === true`
3. `semanticFrame.executionMode` 允许 report execution（`data_execution` / `diagnostic_evidence` / `workflow_execution`）
4. `serviceIntent` policy category 是 `execution`
5. `selectedCapability.purpose` 在 `policy.allowedPurposes` 中

**Execution Mode 授权规则**：

| ExecutionMode | 可进入 Report Execution？ | 说明 |
|---------------|-------------------------|------|
| `none` | ❌ No | 纯回答，不调用工具 |
| `read_only_lookup` | ❌ No | 只读查询（字典/schema/知识库），不是数据执行 |
| `data_execution` | ✅ Yes | 数据执行（查询报表） |
| `diagnostic_evidence` | ✅ Yes | 诊断证据收集（但作为 diagnosis，不是 report_query） |
| `workflow_execution` | ✅ Yes | 工作流执行（但作为 debugging/system_operation） |
| `mutation` | ✅ Yes | 状态变更（但作为 system_operation） |

**capabilityReportMatch 的定位**：

- ✅ 可以作为候选证据
- ✅ 可以通知路由决策（与其他信号结合时）
- ✅ 可以记录在门控原因中（用于可追踪性）
- ❌ 不能直接触发 report execution
- ❌ 不能覆盖 semantic frame
- ❌ 不能绕过执行门控
- ❌ 不能授权工具执行

**业务对象解析迁移要求**：

- ❌ 禁止在通用 Chat Core 中用业务关键词（日报/报表/数据/查数等）直接决定 `route` / `serviceIntent` / `execution`
- ✅ 业务对象必须迁移到 `Domain Ontology` / `Report Catalog` / `Capability Manifest`
- ✅ `semantic-frame-resolver` 必须从 ontology 解析业务对象，不能使用硬编码正则
- ✅ 遗留关键词逻辑只能作为迁移期 fallback，不能成为主路径

**遗留关键词 Fallback 治理**：

以下函数仍包含遗留关键词正则，必须在 P1-2 迁移到 Domain Ontology / Object Resolver：

- `hasStrongReportIntent`: `/(查数|查询|看下|...)/i`
- `inferServiceIntentFromRequirement`: `/(生成|导出|订阅|报告|...)/i`
- `deriveUserRequirement` 回填: `/(日报|周报|月报|报告|...)/i`
- `detectSpeechAct`: `/(查|查询|看下|数据|报表|日报|...)/i`
- `detectBusinessObjects`: `/(报表|日报|周报|月报)/i`

**迁移优先级**：

1. **P1-2（关键）**：实现 Domain Ontology / Object Resolver，迁移 `semantic-frame-resolver.ts`
2. **P1-3（关键）**：添加 `/api/chat` 集成测试，验证 semantic frame 在生产环境的行为
3. **P1-4（重要）**：移除遗留关键词模式（在验证 semantic frame 覆盖后）

**违反后果**：

- 如果 `capabilityReportMatch` 单独触发执行 → **P0 阻断**，必须修复
- 如果在通用 Chat Core 中硬编码业务关键词决定路由 → **P0 阻断**，必须迁出
- 如果遗留关键词成为主路径而非 fallback → **P1 必须迁移**
- 如果 semantic frame 未正确生成或消费 → **P1 必须修复**

## 7. 证据、公开联网与知识库

- 内部 MCP/API/知识库优先于公开联网。
- 公开联网默认可作为公共事实兜底，但必须经过 Planner/ExecutionPolicy 判断、相关性门禁和 Evidence Ledger 录入。
- 公开联网分为“联网能力候选”和“联网结果候选”：前者回答是否值得执行取证，后者回答工具返回是否可作为证据。二者都必须可观测，不得直接替代最终回答。
- `public_web_qa` / default general lookup 类开放问题的联网结果只能作为 candidate evidence 进入 Composer；天气、政策、公告、新闻、显式联网等强公开事实场景才可作为 direct answer candidate。
- 低相关来源、无来源内容、与问题不匹配的搜索结果不得进入 Evidence Ledger。
- 公开网络信息必须带 disclaimer。
- 知识库、公开联网、工具结果都必须进入 SourceRef/EvidenceRef/ToolCallTrace。
- 无证据时不能输出确定结论，只能降级、追问或说明无法确认。
- 知识库是 Evidence Source，不是回答旁路。`knowledge_answer` 不能直接生成最终主消息，只能产出过滤后的知识证据、候选摘要或 insufficient evidence。
- `source_count = 0`、低分 chunk 全拒、知识库未配置、权限不足或公开来源为空时，必须进入 `insufficient_evidence` 或 FailureContract，不得 fallback 到模型自答内部事实。
- model-only 回答必须标记 `evidence_mode = model_only` 或 `no_external_evidence_required`，并禁止声称已查询、已检索、已验证或已调用工具。

## 8. Answer Composer 与 ContractSafety

Answer Composer 只能基于以下输入生成最终回答：

- RequestUnderstandingContract
- TaskPlanContract 与仲裁结果
- Evidence Ledger
- SourceRef/EvidenceRef
- ToolCallTrace
- 失败、降级、缺口和安全策略

ContractSafety 必须在返回前检查：

- 无证据断言。
- 来源一致性。
- `evidence_mode` 是否存在且与来源/证据一致。
- 知识库回答是否具备 dataset/document/chunk/sourceRef 中至少一种可审计引用。
- 公开实时信息是否具备 source_ref 与 fetched_at/retrieved_at。
- Prompt 变量是否缺 required、命中 forbidden 或过曝内部变量。
- 敏感信息和权限。
- 合规策略。
- 低置信 disclaimer。
- ResponseContract schema。
- 用户可见文本乱码。
- 平行协议或非法字段。
- 主消息是否泄露 planner、contract、route policy、tool args、raw params、trace、prompt、raw KB chunk。

ContractSafety 失败时必须阻断、降级、追问或返回安全回应，并写入运行过程和 Trace。

### 8.1 开放式回答质量验收

开放式回答质量显著提升是独立验收标准，不得用单个样例通过替代。

必须满足：

- `你好`、`你能做什么`、`什么是 ROI`、内部知识无结果、公开来源无结果、同类不同表达均不依赖固定样例硬编码。
- 回答由 Planner 判断证据需求，由 Evidence Ledger / evidence_mode 限定事实边界，由 Answer Composer 生成主消息，由 ContractSafety 检查。
- 用户角色、项目、偏好、记忆、最近问题、系统能力、时间上下文可以影响回答关注点，但不能改写助手身份或生成无证据断言。
- 能力发现可基于最新 tool 自动派生，但 Composer 只能看到摘要后的 `capability_summary`，不能看到 tool priority、route rules 或原始 schema。
- 主消息自然、简洁、符合用户要求，不展示内部上下文字段、Prompt、Trace、raw params、raw KB chunk。
- 模型失败、知识库无结果、公开来源无结果时必须明确降级或证据不足，不输出“当前回答生成暂不可用”作为长期成功答案。

## 9. ResponseContract 兼容扩展

不得新增绕开 Enterprise AI Chat OS 的平行协议。ResponseContract 可做最小兼容扩展：

- `confidence`
- `tool_call_trace`
- `disclaimers`
- `source_refs`
- `evidence_refs`
- `answer_origin`
- `runtime_refs`

新增字段必须可选、向后兼容，并有前端回放和 golden 覆盖。旧字段只能作为 adapter 输入，不得成为新主路径。

## 10. 前端与 Disclosure 守护

前端只负责展示和下一步动作入口。

禁止：

- 用自然语言正文、正则、关键词或 DOM 文案推断业务状态。
- 在 renderer 中决定业务步骤隐藏、合并、命名或来源分类。
- 把原始 tool payload、trace 参数、Prompt 配置、内部枚举塞入主消息。
- 把用户页面做成传统后台 dashboard。
- 在用户可见文案中出现工程黑话或乱码。

必须：

- 主消息展示用户可消费答案。
- 右侧运行过程展示由 DisclosureProjection 输出的计划、执行、来源、日志、提示词、质量和原始信息。
- 移动端和窄屏不能挤压会话主区域，应采用遮罩或页面级悬浮。
- 新前端页面遵守 `docs/operations/ui-guardrail.md`。

## 11. 修改影响分析

每次变更必须说明：

- 修改文件。
- 归属层级。
- 是否改主链路。
- 是否改 LLM planner/composer。
- 是否改 IntentOrch。
- 是否改 MCP/API/知识库/公开联网。
- 是否改 Prompt。
- 是否改 ResponseContract。
- 是否改 ContractSafety。
- 是否改前端展示。
- 是否改 Trace。
- 是否改 Admin 配置真值。
- 向后兼容影响与迁移策略。
- 是否需要新增 golden、fixture 或真实链路回归。

## 12. 不可逆影响保护

- 不得删除兼容字段，除非有迁移计划和回滚方案。
- 不得把临时补丁沉淀为主链。
- 不得将业务逻辑散落到 UI、Prompt、handler 或 client hook。
- 不得把观测失败视为业务失败。
- 不得伪装模型失败。
- 不得以脚本通过率替代真实 `/api/chat` 验收。
- 不得提交乱码或把终端错读误判为可交付状态。
- 不得绕过 architecture review、code review、UI guardrail 后上线。

## 13. 每条用例的非硬编码补测

每条 case 通过后必须补测：

- 同类不同表达。
- 不含原用例关键词。
- 业务数据负例不被公开联网抢路由。
- 低相关来源不能进入证据。
- 源码不得出现测试输入样例。
- 页面、SSE、API、存储回放、控制台和 Network payload 无乱码。

没有非硬编码补测的 case，不得标记为健康通过。

## 14. 真实链路优先

涉及核心能力改动，最终必须经过真实链路验收：

1. 真实 `POST /api/chat` 请求。
2. 会话页主链路展示。
3. 右侧运行过程展示。
4. `answer_origin`。
5. `source_refs` 与 `evidence_refs`。
6. `tool_call_trace`。
7. `process_events`。
8. Planner candidates 与 arbitration。
9. ContractSafety 结果。
10. Fallback、不可达、低相关和取消行为。
11. Prompt variable schema 生效值。
12. `evidence_mode`、sourceRefs、evidenceRefs 与 answer_origin 一致性。
13. 开放式回答质量：问候、能力说明、知识解释、知识库无结果、公开来源无结果、同类不同表达。

脚本通过但真实链路失败，不算通过。

## 15. 提交前验证

按任务规模执行：

- `npm.cmd exec vitest run tests/public-web-runtime.test.ts`
- `npm.cmd run validate:ad-ui`
- `git diff --check`
- 旧范式检索：确认旧主原则不再作为规格主线。
- 编码扫描：检查常见 GBK/UTF-8 错读片段和替换字符。
- Prompt 变量扫描：确认新增或修改的模型 use case 有 required/optional/forbidden variables，且 Context Builder 未注入 forbidden variables。
- 开放式回答回归：确认 `你好`、`你能做什么`、`什么是 ROI`、知识库无结果、公开来源无结果均有 `evidence_mode`，且主消息不泄露内部字段。
- 真实浏览器验收：页面链路、刷新回放、右侧运行过程、标题生成、Console、Network payload。

若只改文档，至少执行：

- 旧范式检索。
- 乱码扫描。
- `git diff --check`。

## 16. 任务结束输出

最终输出必须包含：

- 根因判断。
- 修改文件。
- 是否存在硬编码。
- 是否符合 Planner-first 架构边界。
- 是否改变主链路。
- 是否改变 MCP/API/知识库/公开联网。
- 是否改变 Prompt / Model / ResponseContract / ContractSafety / Trace。
- 验证结果。
- 剩余风险。
- 是否可进入下一阶段。
- 是否仍存在需阻断上线的问题。

本规范用于把本仓库从按场景补丁推进到架构化、契约化、可审查上线的通用 Chat 底座。
