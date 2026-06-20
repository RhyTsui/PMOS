# Enterprise AI Chat OS Architecture & Design Specification

> Canonical file: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
> Version: `0.5.0`
> Status: Architecture Canonical / Refactor Guidance
> Last Updated: 2026-06-18
> Confirmed Decisions: 2026-06-12 用户确认 1-6 架构收口方向

## 0. 文档定位

本文件是 Enterprise AI Chat OS 的总纲，约束通用 `/api/chat` 运行链路、Request Understanding、Task Planning、Capability/Intent/Tool、Knowledge/Web/MCP/API、Model/Prompt、ResponseContract、Trace、Admin 配置，以及前端主消息与运行过程披露边界。

本文不是 UI 规范、单点 Agent Runtime 或某个业务域协议。它的职责是定义企业级 Chat 底座如何把用户输入转化为可审计计划、可验证执行、可追溯证据、可消费回答和可治理上线过程。

后续任何涉及通用 Chat 主链路的任务，必须先以本文判断架构归属，再读取二级文档。若二级文档或存量实现与本文冲突，以本文为准，并在变更计划中标明迁移边界。

## 1. 一句话定义

Enterprise AI Chat OS 是一个 `Planner-first, tool-grounded, contract-guarded` 的企业级 AI 会话操作系统。

它以 LLM 结构化理解与任务规划作为主脑，以 MCP/API/知识库/公开联网等受治理能力作为事实与动作来源，以 Evidence Ledger、ResponseContract、ContractSafety 和 Trace 作为上线边界，最终向用户交付有证据、有置信度、有来源、有下一步动作的回答。

### 1.1 小乔智投 VNext 产品定位

基于 `小乔智投 AI 服务平台白皮书 VNext`，小乔智投产品定位升级为面向游戏发行与广告投放场景的 AI 服务平台。该升级不改变 Enterprise AI Chat OS 的运行架构，不新增平行 OS、Protocol、Schema 或 Contract。

五大能力中心在本规格中的架构定位如下：

| 能力中心 | 架构归属 | 接入方式 |
|---|---|---|
| Conversation OS | Request Understanding / Task Planning / Chat Domain / Frontend Presentation | 通过 ServiceCatalog、CapabilityManifest、ResponseContract、DisclosureProjection 表达服务分诊、任务承接和结果解释 |
| Data Intelligence | Capability Discovery / MCP / Report Domain / Evidence Ledger | 通过 Metric Catalog、Report Catalog、Tool Contract、EvidenceRef 和 SemanticResultContract 表达查数、拼表、报表、分析和洞察 |
| Intelligence Center | Knowledge/Public Web / Model Service / Answer Composer | 作为证据辅助和 shadow 决策能力进入 Planner 与 Composer，不替代内部数据和人工确认 |
| Delivery & Integration OS | Workflow / MCP / Task / ActionContract | 通过交付 SOP、包状态、联调、配置检查、CaseFrame 和任务产物接入 |
| AI Service OS | Task Center / Automation / Execution Policy / Observability | 作为自动化运行层接入 L0-L5 风险分级、审批、审计、回滚和运行历史 |

因此，五大中心只是 `ServiceCatalog + CapabilityManifest` 的产品分类和治理标签，运行时仍必须经过 Request Understanding、Planner、Arbitrator、Capability Discovery、Execution Policy、Evidence Ledger、Answer Composer、ContractSafety、ResponseContract 和 Trace。

VNext 最小契约字段：

- `ServiceDefinition.governance.center`
- `ServiceDefinition.governance.serviceLine`
- `ServiceDefinition.governance.automationLevel`
- `ServiceDefinition.governance.riskLevel`
- `ServiceDefinition.governance.toolContractRefs`
- `ServiceDefinition.governance.evidenceNeed`
- `ServiceDefinition.governance.outputSurface`
- `ServiceDefinition.governance.approvalPolicy`
- `CapabilityManifest.center`
- `CapabilityManifest.serviceLine`
- `CapabilityManifest.automationLevel`
- `CapabilityManifest.evidenceNeed`
- `CapabilityManifest.outputSurface`
- `CapabilityManifest.approvalPolicy`

这些字段不得直接授权执行。执行授权必须继续由 `semantic frame + route + capability + execution gate + safety policy` 联合决定。

## 2. 当前现状与差距

### 2.1 当前规格文档现状

- 总纲曾强调“工具优先、模型辅助”的历史口径，适合防止模型伪造业务事实，但不足以承载通用 Chat 中“先理解、再规划、再选择信息源、最后综合回答”的主路径。
- 守护规范已经覆盖禁止硬编码、职责分层、禁止平行协议、乱码门禁和审查上线，但尚未把 Planner、Plan Arbitrator、Evidence Collection、Answer Composer、ContractSafety 定义成完整闭环。
- 前端 UI guardrail 已明确展示层不能反推业务、不能把内部工程词透传给用户，说明运行过程披露必须来自后端契约，而不是 renderer 自行猜测。

### 2.2 当前实现现状

- `/api/chat` 中 LLM 调用分布在意图理解、路由观测、公开联网、问数、诊断和普通回答中，节点能力存在但尚未被统一编排为一个严格的 planner/composer 主路径。
- IntentOrch 当前是串行增强层，运行在意图理解后、能力发现前，能提供规划辅助和工具建议，但还不是主 planner，也缺少候选仲裁与分歧日志的统一契约。
- 公开联网已有默认策略和相关性门禁雏形，可以作为公共事实兜底能力，但仍需进入统一 evidence/source/tool trace，不应以业务关键词或单个样例驱动。
- ResponseContract 已有 `source_refs`、`answer_origin`、`semantic_result` 等字段，部分类型已有 `confidence`，但 `tool_call_trace`、`disclaimers`、planner candidates、arbitration、contract safety events 尚未标准化。
- 开放式回答已有 `planner_first_context`、`chat_answer`、知识库检索和公开联网兜底雏形，但仍存在回答路径直接产出 `answer_markdown`、source_count 为 0 后模型增强 fallback、Prompt 变量未结构化治理、model-only 未显式标注 `evidence_mode` 的风险。
- 前端运行过程面板已经逐步靠近 DisclosureProjection，但仍必须避免在 renderer 中用正则、关键词或文案推断业务语义。

### 2.3 当前主要问题

- 规则和模板仍有主导路径风险，尤其是 route、public web、renderer 中出现业务关键词分支时，会让通用 Chat 底座变成场景补丁集合。
- LLM 被分散使用，缺少一个统一的结构化理解、任务规划和证据综合回答闭环。
- 工具、知识库、公开联网、model-only、clarify 之间缺少统一仲裁对象，导致执行路径优先级、风险、置信度和证据完整度难以审计。
- 最终回答综合尚未统一收口到 Answer Composer，存在不同链路各自拼正文、拼来源、拼运行过程的风险。
- Prompt 仍可能以中文语义规则承载业务 if/else，缺少机器可校验的变量契约、变量白名单、required/forbidden 校验和自动更新来源记录。
- 开放式回答质量的主要卡点不是“是否联网”或“是否给足上下文”，而是是否所有回答都经过 Planner、Evidence Ledger、Answer Composer、ContractSafety 和 ResponseProjection，且不得由 fallback、知识库直答、Prompt 分支或蒸馏规则绕开。

## 3. 核心原则

1. **Planner-first**：用户输入必须先进入 LLM 结构化理解与任务规划，输出严格 JSON 契约；规则只能提供配置约束、风险边界、候选补充或安全兜底，不能替代主规划。
2. **Tool-grounded**：业务事实、内部数据、知识库内容、公开网络信息和真实动作必须来自 MCP/API/知识库/公开联网/File/Task 等受治理来源；LLM 不得伪造工具结果、来源、指标、权限、任务状态或执行成功。
3. **Contract-guarded**：Planner、Capability、Tool、Evidence、Answer、Response、Disclosure、Trace 都必须有契约；Prompt 不能替代契约、权限、schema、MCP 执行、Trace 或配置治理。
4. **Evidence-ledger by default**：进入最终回答的事实、来源、工具结果、推断、计算和模型综合都必须能追溯到 Evidence Ledger；无证据断言必须被 ContractSafety 阻断或降级。
5. **LLM composes, safety governs**：最终自然语言回答由 Answer Composer 基于证据综合生成；ContractSafety 是不可绕过的后置规则层，负责合规、敏感信息、来源一致性、低置信标注、乱码和契约策略检查。
6. **Result Plane / Runtime Plane / Disclosure Plane 分离**：主消息承载用户可消费答案；Runtime 记录执行过程；右侧披露展示规划、工具、来源、日志、提示词、质量与原始信息，不污染主消息。
7. **Configuration governed, not hardcoded**：能力来源、Route rules、Tool Contract、MCP server、Model/Prompt version、Planner policy、Safety policy、Report Domain 配置由控制面治理，不得散落为运行时业务 if/else。
8. **No business if/else in generic core**：通用 Chat Core、router、handler、renderer、Prompt glue 不得用业务关键词、媒体名、指标名、报表名、客户样例或测试输入写死分支。
9. **No parallel architecture**：不得新增绕开本文的平行 OS、Protocol、Schema 或 Contract。旧字段兼容只能是局部 adapter，必须标明输入来源、迁移目标、废弃条件和收口位置。
10. **Trace fail-open**：观测写入或上报失败不得导致 Chat 主链路失败，不得把观测失败伪装为业务失败；但必须尽最大可能记录降级事件。
11. **Encoding and review gates**：文档、源码、配置、fixture、golden schema 和用户可见文案必须保持 UTF-8 正常中文；禁止带乱码提交。涉及主链路、契约、模型、Prompt、MCP、Trace、Admin 或前端交付的变更必须完成影响分析、验证和审查。
12. **Prompt variables are contracts**：Prompt 不是业务规则容器。每个 Prompt use case 必须声明 `required_variables`、`optional_variables`、`forbidden_variables`、变量来源、更新策略和脱敏策略；运行时只能按白名单注入变量，缺 required 或命中 forbidden 时不得调用模型。
13. **Open answers are evidence-scoped**：开放式问答、闲聊、能力说明、写作、总结、知识解释都必须显式声明 `evidence_mode`。无外部事实依赖时使用 `model_only` 或 `no_external_evidence_required`，不得伪装为工具、知识库或公开来源事实。

## 3.1 已确认架构决策

以下决策已作为本轮实施基线确认，不再按旧范式回退：

1. `route.ts` 中历史业务关键词路由迁移为 `Planner candidate + config fallback`；运行时只保留安全、权限、内部数据保护、schema 校验等规则边界。
2. `advertising-domain-pack.ts`、`report-query-policy-store.ts` 等业务域规则作为受治理 seed / capability policy 保留，不直接删除；但不得散落进通用 Core 或 renderer。
3. 默认仲裁优先级为 `MCP/API > 内部知识库 > 公开联网 > model-only > clarify`；公开联网默认可用，但不能抢占明确内部业务数据路由。
4. `operation_risk_review` 只解释失败原因和风险，不允许 LLM 改参数、切工具或绕过 Execution Policy。
5. 前端旧 `ExecutionTab.tsx` 中基于正文、关键词、正则的业务语义反推迁移到后端 `DisclosureProjection`；前端只渲染契约字段。
6. 本文与实施守护规范作为最终规格真源；后续 runtime、contract、tests 必须以本文为准。

## 4. 目标总体链路

```txt
User Request
  -> Request Understanding
     -> strict JSON: user goal / context / constraints / ambiguity / risk signals
  -> Task Planning
     -> LLM planner candidate
     -> IntentOrch candidate
     -> rules/config fallback candidate
  -> Plan Arbitrator
     -> execution path / priority / risk / confidence / evidence requirement
  -> Evidence Collection & Execution
     -> MCP/API / Knowledge / Public Web / File / Task / Model-only / Clarify
  -> Answer Composer
     -> LLM composes final answer from evidence, source refs, tool results and limits
  -> ContractSafety
     -> policy / compliance / source consistency / hallucination guard / mojibake guard
  -> ResponseContract
     -> text / semantic_result / source_refs / evidence_refs / confidence / disclaimers / tool_call_trace
  -> Frontend Presentation & Disclosure
     -> main answer / runtime process / raw info / actions
  -> Observability & Admin
     -> planner candidates / arbitration / executions / safety events / config versions
```

## 5. 职责边界

| 层级 | 负责 | 禁止 |
|---|---|---|
| Request Understanding | 理解用户目标、上下文、约束、歧义、风险信号，输出严格 JSON | 直接选择工具、补最终参数、生成业务事实 |
| Task Planner | 生成任务计划、候选路径、所需证据、执行依赖、澄清条件 | 越过 ContractSafety，直接写最终响应 |
| IntentOrch | 提供外部规划候选、工具建议、意图分解和增强上下文 | 直接替代仲裁器或绕过执行策略 |
| Plan Arbitrator | 合并 LLM、IntentOrch、规则/配置候选，决定执行路径和优先级 | 用单个业务关键词硬切路径 |
| Capability Discovery | 发现系统当前可用能力、输入要求、风险和证据策略 | 覆盖用户目标，直接拼 tool arguments |
| Execution Policy | 权限、风险、配额、preflight、retry、fallback、clarify、degrade | 让 LLM 修改工具返回或绕过权限 |
| Tool / MCP / API | 提供真实业务数据、动作、状态、结构化结果和证据 | 把 transport success 当作业务成功 |
| Knowledge / Public Web | 提供内部知识或公开信息证据，必须带来源、时间和相关性 | 低相关来源进入最终证据 |
| Model / Prompt | 结构化理解、任务规划、基于证据综合回答、解释和追问 | 编造事实、替代工具、替代安全规则 |
| Prompt Variable Governance | 定义每个 Prompt use case 可见变量、必填变量、禁止变量、来源、版本和脱敏策略 | 用中文 Prompt if/else 承载路由、工具选择、知识库选择、权限判断或原始 payload 泄露 |
| ResponseContract | 收口状态、正文、来源、证据、置信度、disclaimer、动作和兼容字段 | 承载 renderer 私有结构或业务计算 |
| Frontend Presentation | 消费契约并展示答案、运行过程和下一步动作 | 用正文、正则或关键词反推业务状态 |
| Observability / Trace | 记录规划、仲裁、工具、模型、安全、降级和配置版本 | 改变用户成功/失败语义 |
| Admin Control Plane | 治理 capability、route rules、tool contract、MCP、model/prompt、planner policy、safety policy | 让运行时代码私自绕过配置真源 |

### 5.1 动态上下文相关性门禁

时间、节假日、季节、工作日/周末、暑假、系统升级、用户角色、当前项目、历史问题等动态上下文是 Planner 和 Answer Composer 可使用的证据信号，但不是默认原因。

- 可进入结论：必须有工具数据、知识库资料、公开来源、历史同期对比、业务日历或用户上下文中的明确证据支持。
- 可进入待验证假设：只有弱信号或常识相关性时，必须标注为待验证，并说明需要补充哪些数据验证。
- 不得进入回答：没有证据链时，不得把泛化因素写成数据波动、用户行为或业务异常原因。

Prompt 不得写成“遇到数据波动就考虑周末/节假日/季节”等泛化归因；ContractSafety 和数据解读用例必须把无证据动态归因降级为假设或删除。

## 6. Request Understanding Contract

Request Understanding 必须优先以 LLM 输出严格 JSON，并经 schema 校验。建议最小字段：

```json
{
  "user_goal": "string",
  "intent_type": "ask | analyze | execute | report | diagnose | create | approve | chat | clarify",
  "domain_signals": ["string"],
  "constraints": ["string"],
  "context_refs": ["string"],
  "missing_info": ["string"],
  "risk_flags": ["string"],
  "confidence": "high | medium | low"
}
```

校验失败时，只能进入受控 fallback：重试、降级为 clarify、或使用配置化保守候选。不得用业务关键词分支替代结构化理解。

### 6.5 Semantic Frame Runtime（P0/P1-1 已实现）

> 详细规格：`docs/architecture/semantic-frame-runtime/00_SEMANTIC_FRAME_RUNTIME_SPEC.md`

Semantic Frame Runtime 是 Request Understanding 的**中间语义层**，为路由决策、用户需求和执行门控提供结构化语义解释。

**核心定位**：
- **语义真源**：为 route decision、user requirement、execution gate 提供统一的语义输入
- **中间层**：介于用户输入和执行授权之间，解耦理解与执行
- **契约化**：基于 contract 的中间表示，不直接授权工具执行

**主链路（P0/P1-1）**：
```
User Input
  ↓
deriveRequestSemanticFrame(message)
  ↓ semanticFrame { speechAct, semanticTask, executionMode, serviceIntent, ... }
deriveUserRequirement(message, context, semanticFrame)
  ↓ userRequirement { task, serviceIntent, metrics, dimensions, ... }
deriveRequestRouteDecision(message, { semanticFrame, ... })
  ↓ route { intent_type, requiresExecution, ... }
capability discovery
  ↓ selectedCapability { capabilityPurpose, supportedServiceIntents, ... }
execution gate
  ↓ shouldEnter { shouldEnter, blockedBy, reasons, policy }
tool / KB / schema / web execution
```

**核心概念**：
- **SpeechAct**：言语行为（ask_definition, ask_data, ask_diagnosis, ask_how_to, request_operation, chat）
- **SemanticTask**：语义任务（retrieve_report_data, explain_field_or_value, diagnose_data_issue, ...）
- **ExecutionMode**：执行模式（none, read_only_lookup, data_execution, diagnostic_evidence, workflow_execution, mutation）
- **EvidenceNeed**：证据需求（field_dictionary, schema_registry, knowledge_base, data_mcp, ...）

**关键原则**：
1. **Semantic frame 是语义真源**：route decision、user requirement、execution gate 必须将其作为主要输入
2. **LLM 不直接授权执行**：LLM 可以生成/审查 semantic frame，但不能绕过执行门控
3. **单点不能授权执行**：必须 semantic frame + route + capability + gate 联合授权

**执行门控（P0）**：
- 多维度授权：route + executionMode + serviceIntent + capability 联合判断
- `read_only_lookup` 阻止 `report_execution`，但允许 `dictionary_lookup` / `schema_lookup` / `knowledge_lookup`
- `data_execution` 允许 `report_execution`
- `diagnostic_evidence` 用于诊断，不等同于 `report_query`
- `capabilityReportMatch` 仅作为候选证据，不能单独触发执行

**已实现场景**：
- ✅ 字段解释（"素材报表的未知是什么"）→ help + field_definition
- ✅ 报表查询（"今天素材报表的数据"、"查日报"）→ report_query + data_execution
- ✅ 诊断（"为什么素材显示未知"）→ diagnosis + diagnostic_evidence
- ✅ 包（"投放包地址"）→ get_delivery_packages
- ✅ 帮助（"如何配置监测链接"）→ help + ask_how_to

**未完成（P1-2+）**：
- ⏳ Domain Ontology / Report Catalog（业务对象解析）
- ⏳ Evidence Ledger（证据追踪）
- ⏳ Render Surface Policy（渲染表面策略）
- ⏳ /api/chat 真实回归测试
- ⏳ LLM 审查层

**测试覆盖**：62/62 测试通过

## 7. Task Planner 与 Plan Arbitrator

### 7.1 Planner 候选来源

- **LLM Planner**：主候选，基于 Request Understanding、会话上下文、可用能力摘要和策略约束生成结构化计划。
- **IntentOrch**：增强候选，提供意图分解、工具建议和外部规划信号，必须有超时、错误隔离和分歧日志。
- **Rules/config fallback**：配置化兜底，只能承载安全、权限、能力开关、强约束和冷启动保守策略，不能承载业务样例硬编码。

### 7.2 TaskPlanContract

建议最小字段：

```json
{
  "planner_source": "model | intentorch | rules",
  "task_type": "chat | knowledge_lookup | public_lookup | business_tool | report | diagnose | clarify",
  "candidate_paths": [
    {
      "path_id": "string",
      "sources": ["mcp", "api", "knowledge", "public_web", "file", "model"],
      "required_evidence": ["string"],
      "required_inputs": ["string"],
      "risk_flags": ["string"],
      "confidence": "high | medium | low"
    }
  ],
  "recommended_path_id": "string",
  "clarification": {
    "required": false,
    "question": "string"
  }
}
```

### 7.3 仲裁规则

Plan Arbitrator 负责合并多个候选，而不是让任一模型或规则直接独占最终路径。

优先级默认如下，可由 Admin policy 配置：

1. MCP/API：内部系统事实和动作优先。
2. 内部知识库：组织知识、制度、文档、Prompt 中台和业务沉淀。
3. 公开联网：公共事实兜底，必须经过相关性门禁。
4. model-only：仅用于无外部事实依赖的解释、写作、归纳或闲聊。
5. clarify：证据不足、权限不足、输入缺失或风险过高时追问。

同优先级候选按低风险、高置信、证据完整度、上下文一致性排序。候选分歧必须进入 Trace，不得静默覆盖。

公开联网在仲裁中必须拆成两层对象：

- **联网能力候选**：Planner/ExecutionPolicy 判断当前问题是否可能需要公共事实、时效信息或外部资料。该判断可以由 LLM Planner、IntentOrch、能力配置、用户显式指令和安全策略共同给出，但不能由单个测试句、业务词或“助手元问题”排除词决定。
- **联网结果候选**：联网工具执行后返回的来源、片段、相关性、失败原因、耗时和 disclaimer。结果只能进入 Evidence Ledger 或 planner evidence candidate；除强公共事实问题、用户显式联网、政策/公告/天气等来源必需场景外，不得绕过 Answer Composer 直接成为最终主消息。

因此，公开联网“是否执行”和“结果是否采纳”是两个独立决策。执行公开联网不等于公开联网抢占最终路径；公开联网为空也不等于模型可以编造答案。最终回答必须由 Composer 基于内部能力、知识库、项目上下文、记忆、公开来源和 model-only 边界综合生成，并由 ContractSafety 复核。

### 7.4 候选与弱信号合并

LLM Planner、Request Understanding corrections、IntentOrch、多轮继承、知识库候选和公开联网候选都属于“候选/弱信号”输入。它们可以帮助补全计划、发现证据需求和解释分歧，但不能直接覆盖当前轮用户显式输入、工具契约、权限范围或最终执行参数。

合并规则：

- 当前轮显式解析出的目标、指标、维度、时间范围、实体和工具入参优先级最高。
- 弱信号只能填补空槽位，不能覆盖已存在的显式槽位。
- 所有模型输出必须归一化到现有 contract shape；不得把模型私有字段直接 cast 成契约字段。
- 被采纳和被拒绝的弱信号都必须进入 Trace / runtime log，记录来源、字段、原因和结果。
- IntentOrch 超时、失败或未初始化必须作为候选风险记录，不得伪装成成功规划，也不得导致公开联网或 model-only 静默抢占。

## 8. Tool-grounded Execution

工具执行是证据和动作来源，不是路由捷径。

- MCP/API 必须声明 Tool Contract、输入 schema、权限、业务失败语义、证据输出和 trace 字段。
- Knowledge/Public Web/File 必须进入统一 SourceRef/EvidenceRef，不得把来源只写在自然语言正文里。
- 公开联网默认可作为公共事实兜底，但低相关来源不得进入最终证据；来源不足时必须降级说明，不能让模型补齐事实。
- model-only 只能用于无外部事实依赖的场景，且必须标记 `answer_origin` 和置信边界。

MCP 返回的 transport success 不等于业务成功。所有工具结果必须归一化为：

- `succeeded`
- `business_failed`
- `tool_failed`
- `unavailable`
- `partial`

业务失败不得渲染成成功回答，模型不得用猜测填补失败工具结果。

## 9. Evidence Ledger 与 SourceRef

Evidence Ledger 是系统内所有证据的统一账本，贯穿 source quote、tool output、file chunk、calculation、model inference、artifact、task state、trace event。

最小证据字段：

- `evidence_id`
- `type`
- `title`
- `source_ref_ids`
- `payload_ref`
- `quote` 或 `summary`
- `confidence`
- `generated_by`
- `created_at`
- `risk_flags`
- `trace_id`

进入最终回答的证据必须可追溯；未进入证据的候选来源可以留在运行日志，但不得作为回答事实依据。

### 9.1 Evidence Mode

所有回答路径必须显式声明 `evidence_mode`，并写入 ResponseContract / SemanticResultContract / DisclosureProjection 可消费位置。

建议枚举：

- `model_only`：无外部事实依赖，模型基于通用语言能力回答，例如问候、写作润色、无事实承诺的开放式创作。
- `no_external_evidence_required`：问题可由稳定常识、系统身份、用户已给上下文回答，不需要外部来源，但不得伪装成工具或知识库结果。
- `knowledge_grounded`：回答基于内部知识库或受治理知识源。
- `source_grounded`：回答基于公开网页、实时公开信息或外部来源。
- `tool_grounded`：回答基于 MCP/API/File/Task/业务工具返回。
- `mixed_grounded`：回答基于多类证据，必须列出证据组合。
- `insufficient_evidence`：证据不足、source_count 为 0、低相关来源被拒、知识库无结果或工具不可用，不能生成确定结论。

规则：

- `knowledge_grounded` 必须包含知识源、dataset/document/chunk/sourceRef 中至少一种可审计引用。
- `source_grounded` 必须包含 source_ref 和 fetched_at/retrieved_at。
- `tool_grounded` 必须包含 tool_call_trace 和工具结果 evidence。
- `model_only` 与 `no_external_evidence_required` 不要求外部来源，但 ContractSafety 必须阻止其声称已查询、已检索、已调用或已验证。
- `insufficient_evidence` 必须进入 FailureContract 或降级回答，不能 fallback 到模型编造。

## 10. Answer Composer

Answer Composer 是最终自然语言回答的统一生成路径。它接收：

- RequestUnderstandingContract
- TaskPlanContract 与仲裁结果
- Evidence Ledger
- SourceRef/EvidenceRef
- ToolCallTrace
- 失败、降级、缺口与安全策略

Answer Composer 可以使用 LLM 组织语言、排版、解释和综合，但必须遵守：

- 只能基于证据、工具结果和明确标记的推断作答。
- 不能用“作为 AI 我推测”替代证据不足。
- 证据不足时必须输出无法确认、需要补充信息或低置信说明。
- 来源与正文断言必须一致。
- 不得输出乱码、内部工程词、未经治理的 Prompt/Trace 原始细节。

### 10.1 开放式回答主链

开放式回答覆盖问候、能力说明、普通解释、写作、总结、非结构化问题、无外部事实依赖的 model-only 问答，以及需要从知识库/公开联网/上下文综合的开放式问题。

开放式回答质量显著提升的验收标准不是“某个样例更像大模型”，而是：

1. 不依赖单个输入样例、关键词、正则、Prompt if/else 或蒸馏规则生成固定答案。
2. 先经过 Request Understanding 与 PlannerOutput，判断任务目标、证据需求、是否需要知识库、公开联网、项目上下文、记忆、能力摘要或 model-only；IntentOrch 作为 planner candidate 输入，不得被忽略，也不得直接越过仲裁器。
3. 知识库、公开联网、工具、项目上下文、用户偏好、记忆、最近会话、时间上下文只能作为 evidence/context 输入，不能直接绕过 Composer 产出主消息。
4. 所有 answer path 必须经过 Evidence Ledger 或显式 `evidence_mode`。
5. `chat_answer` 可以作为开放式 Answer Composer 的兼容 use case 名称，但不能再代表“模板增强”或“无证据兜底”；最终权威是 Evidence Ledger + ContractSafety。
6. `knowledge_answer` 不能直接生成最终主消息；它只能产出知识证据、候选摘要或 insufficient evidence，最终表达由 Answer Composer 完成。
7. `source_count = 0`、低相关来源、过期来源、权限不足、工具失败、知识库未配置时，不得 fallback 编造确定答案。
8. 用户要求“一句话”时，Composer 可以压缩表达，但不能跳过证据边界。
9. 用户问“你能做什么”时，应综合真实可用能力、用户角色、项目、偏好、记忆、最近问题、系统能力状态和知识命中，但不得把用户角色说成助手身份，也不得输出固定能力清单。
10. 主消息不得展示 Planner、Prompt、route policy、tool args、raw KB chunk、trace、内部接口、dataset 密钥或权限细节。

### 10.2 Prompt Variable Schema

Prompt 变量治理是 Prompt 的机器契约，不是中文提示词补充。每个 Prompt use case 必须声明并校验：

```ts
type PromptVariableSchema = {
  use_case: string;
  prompt_id: string;
  required_variables: string[];
  optional_variables: string[];
  forbidden_variables: string[];
  variable_sources: Array<{
    name: string;
    source:
      | 'request'
      | 'planner_output'
      | 'intent_orch'
      | 'plan_arbitrator'
      | 'evidence_ledger'
      | 'response_contract'
      | 'capability_manifest'
      | 'knowledge_source_policy'
      | 'project_context'
      | 'user_profile'
      | 'memory'
      | 'conversation_history'
      | 'temporal_context'
      | 'admin_config';
    auto_update: boolean;
    freshness_policy?: 'per_request' | 'on_config_change' | 'scheduled' | 'manual';
    redaction?: 'none' | 'summary_only' | 'hash_only' | 'sensitive_fields_removed';
  }>;
  output_contract: string;
  content_hash: string;
  updated_at: string;
};
```

P0 最小变量集：

- `required_variables`：`user_query`、`planner_output`、`evidence_ledger`、`answer_constraints`。
- `optional_variables`：`user_role`、`project_context`、`user_preferences`、`memory_items`、`recent_conversations`、`capability_summary`、`intentorch_candidate`、`planner_candidates`、`arbitration_summary`、`knowledge_hits`、`public_sources`、`temporal_context`、`allowed_actions`。
- `forbidden_variables`：`raw_tool_args`、`raw_tool_result`、`raw_kb_chunks_not_filtered`、`route_rules`、`tool_priority`、`raw_stack_trace`、`prompt_hidden_reasoning`、`model_chain_of_thought`、`full_user_profile`。

运行时要求：

- Context Builder 必须按 use case 白名单注入变量。
- 缺少 required variable 时进入 FailureContract，不调用模型。
- 出现 forbidden variable 时进入 `prompt_variable_violation`，不调用模型。
- 自动更新变量必须记录来源版本和更新时间，例如 capability manifest 从最新 tool 自动派生、用户角色从 user profile 读取、项目从当前登录态和项目权限读取、记忆从 memory store 读取、系统能力从 Admin effective config 读取。
- IntentOrch 输出只能作为 `intentorch_candidate` 或 `planner_candidates[]` 的摘要变量注入；最终采用哪条路径必须由 Plan Arbitrator 写入 `arbitration_summary`，不能由 Composer 根据 IntentOrch 文本自行切工具或改参数。
- Composer 只能看到摘要后的 `capability_summary`、过滤后的 `evidence_ledger` 和允许表达的 `allowed_actions`，不能看到完整 tool priority、route rules、原始工具参数或未过滤 KB chunk。

## 11. ContractSafety

ContractSafety 是 Answer Composer 之后、ResponseContract 返回之前的不可绕过检查层。

必须覆盖：

- 无证据断言检查
- 来源一致性检查
- `evidence_mode` 必填与合法性检查
- 知识库证据 metadata 检查，包括 dataset/document/chunk/sourceRef
- 公开实时来源 source_ref 与 fetched_at/retrieved_at 检查
- Prompt variable schema 检查，包括 required/forbidden/overexposure
- 敏感信息与权限检查
- 合规与安全策略
- 低置信 disclaimer 注入
- ResponseContract schema 校验
- 用户可见文本乱码检查
- 平行协议和非法字段检查
- 主消息内部字段泄露检查，包括 planner、contract、route policy、tool args、raw params、trace、prompt、raw KB chunk

ContractSafety 不能被 LLM 绕过。若检查失败，必须选择阻断、降级、追问或安全回应，并写入 runtime/disclosure/trace。

## 12. ResponseContract 与最小扩展

ResponseContract 是对外响应包装，负责兼容、状态、错误、正文和展示入口。SemanticResultContract 承载最终业务结果语义。

Unified Semantic Contract 是 ResponseContract、SemanticResultContract、ActionContract、EvidenceRef、SourceRef、ToolCallTrace、DisclosureProjection 的统一收口。它不改变 Planner-first 主链路，而是规定所有结果、证据、动作、来源、运行引用和展示入口必须进入同一契约家族，不能由 renderer、prompt、业务 handler 或临时 adapter 自建私有结果协议。

在不新增平行协议的前提下，ResponseContract 标准字段最小扩展为：

- `source_refs[]`：回答引用的来源数组。
- `evidence_refs[]`：回答引用的证据数组。
- `confidence`：整体回答置信度，取值 `high | medium | low | unknown`，可附 basis。
- `tool_call_trace[]`：执行过的工具/API/知识库/公开联网摘要，包括名称、参数摘要、结果摘要、状态、耗时、trace id。
- `disclaimers[]`：公开网络、低置信、未内部验证、数据缺口等用户可见说明。
- `answer_origin`：回答来源，区分 tool-grounded、knowledge-grounded、public-web-grounded、model-only、mixed、degraded。
- `runtime_refs[]`：运行过程引用，前端可据此打开右侧运行过程。

旧字段可作为 adapter 输入，但不得成为新主路径。前端只消费契约，不从自然语言正文反推来源、状态或工具调用。

不得新增平行总协议、平行 OS、私有 Schema 或长期私有 Contract。任何旧字段兼容只能作为局部 adapter，并必须标明迁移目标、废弃条件和统一收口位置。

## 13. Disclosure Contract

主消息负责给用户可消费的答案：结论、必要证据、来源、置信边界和下一步动作。

右侧运行过程负责透明披露：

- Request Understanding 摘要
- Planner candidates
- Plan arbitration
- Capability/Tool selection
- MCP/API/Knowledge/Public Web 执行
- Evidence collection
- Answer Composer
- ContractSafety
- Runtime logs
- Prompt hits
- Raw tool/source payload references
- Trace action

DisclosureProjection 必须由后端构建。前端不能用正则、关键词或正文片段决定隐藏、合并、命名步骤；只能根据 `displayRole`、`visibility`、`group`、`status`、`runtimeLog`、`promptHits`、`actions` 等契约字段渲染。

Runtime Display Protocol 承载运行过程、时间线、工具状态、模型参与记录、失败归一化、降级事件、提示词命中和 Trace action，只能进入 runtime/disclosure 展示面，不得污染主消息事实。

Component Binding System 将 `semantic_result.regions[].componentBinding` 绑定到受治理组件注册表。前端未知组件必须 fallback，不得用正文或工具名反推出业务组件。Data Visualization UX 只能作为 `componentBinding = "data-visualization"` 的子规范，用于图表、表格、Sankey、AI Insight 等结构化结果展示。

## 14. Public Web 与知识库策略

公开联网是通用 Chat 的公共事实兜底能力，适用于时效性、公开事实、外部资料和内部工具/知识库不可覆盖的问题。

约束：

- 默认可用，但不能抢占明确的内部 MCP/API/知识库路径。
- 默认公开联网可以作为 evidence candidate 执行取证，但 `public_web_qa` / default general lookup 类结果不得直接终止会话；必须进入 Planner/Composer 与内部上下文共同仲裁。
- 天气、政策、公告、新闻、用户显式要求联网、外部网页解释等强公开事实场景，可以作为 direct answer candidate，但仍必须输出 SourceRef、EvidenceRef、disclaimer 和置信边界。
- 公开来源必须经过检索相关性门禁和证据组装门禁。
- 低相关、无来源、标题/片段与问题不匹配的结果不得进入 Evidence Ledger。
- 来源不足时可返回低置信安全回答，但不能编造确定结论。
- 公开信息必须带 `disclaimers[]`，如“该信息来自公开网络，未经内部系统验证”。

知识库优先承载内部文档、制度、Prompt 中台、产品资料和组织知识。若同一问题同时命中知识库和公开联网，仲裁器应优先内部知识库，公开来源可作为补充对照。

知识库治理要求：

- Knowledge retrieval 是 EvidenceCollection，不是最终答案生成器。
- KnowledgeDiscovery 基于 Knowledge Source Policy、dataset metadata、authority、freshness、权限和任务类型发现候选知识源，不得由 Prompt 或业务关键词直接指定最终 dataset。
- KB chunk 必须经过权限、相关性、freshness、source authority 和 evidence filter 后，才能进入 Evidence Ledger。
- `source_count = 0`、低分 chunk 全部被拒、知识库未配置或权限不足时，必须输出 `evidence_mode = insufficient_evidence`，不得让 `knowledge_answer` 或 `chat_answer` 自行编造内部事实。
- 内部知识问答可以使用模型组织表达，但只能消费过滤后的 evidence summary、document title、sourceRef 和 allowed actions，不能看到 raw chunk、dataset key、权限内部细节或检索栈。
- 稳定常识可以走 `model_only`，但内部口径、指标定义、投放规范、项目资料、历史复盘必须优先要求知识库或受治理知识源证据。

## 15. Observability & Trace

Trace 是观测与审计，不是业务成功依赖。Trace 写入失败必须 fail-open。

观测至少覆盖：

- Request Understanding 输入摘要和 contract 校验
- Planner candidates
- IntentOrch 结果、超时、错误和分歧
- Plan arbitration 决策
- Capability discovery
- Tool/MCP/API/Knowledge/Public Web 执行
- Evidence Ledger 录入
- Answer Composer 输入摘要和输出 contract
- ContractSafety 结果
- ResponseContract 组装
- Admin config version

Trace 不可用时，主链路继续返回业务结果，并在运行过程标记观测降级。

## 16. Admin Control Plane

控制面必须治理：

- Capability manifest
- Route rules 与 fallback policy
- Tool Contract / MCP server / API capability
- Knowledge source / Public web policy
- Planner policy / Arbitrator priority
- Model use case / Prompt version
- ContractSafety policy
- Metric catalog / Report Domain 配置
- Feature switch / throttle / timeout / retry

运行时代码不得私自绕过控制面写业务规则。配置 seed 可以作为初始化来源，但必须有版本、owner、说明和回归覆盖。

## 17. Report Domain 与业务域能力

报表、问数、诊断、审批、资产处理等业务域能力必须通过 Capability Contract 和 Tool Contract 接入 Enterprise AI Chat OS。

Report Domain 是业务域协议，不是 UI schema。报表能力必须声明指标口径、数据来源、时间范围、生成步骤、证据账本、产物引用、任务状态和后续动作。报表输出最终进入 SemanticResultContract；报表文件、图表、导出包进入 Artifact；长时间生成进入 Task；过程进入 Disclosure 和 Trace。

业务域可以定义自己的能力包和工具契约，但不得在通用 Core 内通过业务 if/else 扩展。

## 18. 小乔 Chat Capability Map

小乔 Chat 能力按来源与执行方式归类：

- 普通问答：LLM Planner 判断是否需要知识库或公开联网；无外部事实依赖时可 model-only。
- 内部知识问答：Knowledge + LLM synthesis，必须引用来源或标记推断。
- 公开事实查询：Public Web + relevance gate + LLM synthesis，必须带来源与 disclaimer。
- 数据分析：MCP/API/File + calculation + LLM explanation，必须进入 Evidence Ledger。
- 报表生成：Report Domain + Task + Artifact，必须有口径、产物和来源。
- 联调/排障：MCP/Task/Trace + Disclosure，必须有步骤、状态和失败归一化。
- 资产处理：File/Artifact + ActionContract，必须可带回会话继续处理。
- 审批/高风险动作：Task/MCP + permission + confirmation，必须有 audit。
- 开放式创作：LLM，可 model-only，但不得伪装为工具证据。

## 19. 变更影响范围与风险

| 层级 | 影响 | 风险 | 控制措施 |
|---|---|---|---|
| Request Understanding | 从规则辅助理解升级为 LLM 严格 JSON 理解 | 模型输出不稳定 | schema 校验、重试、clarify fallback |
| Task Planning / IntentOrch | IntentOrch 从增强上下文升级为 planner candidate | 延迟、外部依赖、候选冲突 | 超时、错误隔离、仲裁日志 |
| ExecutionPolicy | 新增 planner 仲裁与执行路径优先级 | MCP/知识库/公开联网抢路由 | 负例回归、priority policy、risk flags |
| Public Web | 默认公共事实兜底 | 低相关来源误导 | 相关性门禁、source gate、disclaimer |
| Answer Composition | 最终回答统一由 LLM 基于证据综合 | 无证据编造 | composer prompt 约束、ContractSafety |
| ResponseContract | 扩展 confidence/tool_call_trace/disclaimers | 旧前端/回放兼容 | 字段可选、adapter、golden 回归 |
| Frontend / Disclosure | 展示 planner、工具、来源、置信度、disclaimer | 展示冗余或反推业务 | 只消费 DisclosureProjection |
| Observability / Trace | 新增 planner/arbitration/safety 事件 | Trace 不可用影响主链路 | fail-open、降级事件 |
| Testing | 每条用例新增非硬编码补测 | 测试时间变长 | 用例逐条推进，不批量跳测 |

## 20. Roadmap & Priority

### P0

- 更新总纲和守护规范，确立 `Planner-first, tool-grounded, contract-guarded`。
- 定义 RequestUnderstandingContract、TaskPlanContract、AnswerCompositionContract 和 ContractSafety。
- ResponseContract 最小兼容扩展：`confidence`、`tool_call_trace`、`disclaimers`。
- 定义 PromptVariableSchema，按 use case 校验 required/optional/forbidden 变量。
- 所有开放式回答路径强制声明 `evidence_mode`，包括 model-only 和 no-external-evidence-required。
- `chat_answer` 收口为开放式 Answer Composer 兼容入口，最终权威为 Evidence Ledger + ContractSafety，不再作为模板增强旁路。
- `knowledge_answer` 改为知识证据收集/摘要辅助，不得直接生成最终主消息。
- `source_count = 0`、知识库无结果、公开来源为空、低相关来源全拒时，进入 `insufficient_evidence` 或 FailureContract，不 fallback 编造。
- Context Builder 按 Prompt 变量白名单注入，缺 required 或命中 forbidden 时不调用模型。
- IntentOrch 纳入 planner candidate，增加超时、错误隔离和分歧日志。
- 公开联网保留默认公共事实兜底，但必须经过相关性门禁。
- 禁止通用 Core、Prompt、renderer、handler 内业务硬编码和业务 if/else。
- 禁止带乱码提交；每个 case 必须做功能健康和乱码健康验收。

### P1

- Plan Arbitrator 类型、候选排序、观测字段和低置信确认。
- Evidence Ledger 与 SourceRef/ToolCallTrace 统一组装。
- Answer Composer 主路径改造。
- ContractSafety 运行态落地。
- DisclosureProjection 输出 primarySteps、runtimeLogs、promptHits、traceAction。
- Prompt 管理后台展示 use case、active version、content hash、变量契约、风险标签和生效变量摘要。
- Knowledge Source Policy 管理后台展示 dataset metadata、authority level、freshness policy、allowed task types。
- Prompt quality review 和 evidence quality review 以 shadow/review 方式接入发布前检查，P0 不依赖 LLM reviewer 做阻断。

### P2

- Evaluation dataset、golden cases、非硬编码补测矩阵。
- Admin 控制面治理 Planner policy、Safety policy、Public Web policy。
- 旧 schema 兼容适配与迁移标记。

### P3

- 可视化治理看板、自动化文档索引、更多业务域能力包。

## 21. 二级文档对应关系

| 总纲章节 | 二级文档 |
|---|---|
| Request Understanding | `request-understanding/request-understanding-architecture.md` |
| Capability Source / Discovery | `capability-orchestration/capability-source-architecture.md`、`capability-orchestration/capability-discovery-execution-policy.md` |
| Resolver / Execution Policy | `capability-orchestration/resolver-chain-architecture.md` |
| MCP Error Normalization | `capability-orchestration/mcp-business-error-normalization.md`、`runtime/mcp-execution-policy.md` |
| Tool Contract | `semantic-contract/tool-contract.md` |
| Capability Contract | `semantic-contract/capability-contract.md` |
| Evidence Ledger | `semantic-contract/evidence-ledger.md`、`disclosure-contract/evidence-ledger-disclosure.md` |
| Semantic Result / ResponseContract | `semantic-contract/semantic-result-contract.md` |
| Artifact / Task | `business-semantics/artifact-task-architecture.md` |
| Report Domain | `report-domain/report-domain-protocol.md` |
| Pipeline Stages | `PIPELINE_STAGES.md` |
| Main/Disclosure Boundary | `disclosure-contract/main-message-disclosure-boundary.md` |
| Observability / Trace | `evaluation-observability/observability-trace-architecture.md`、`runtime/trace-fail-open-policy.md` |
| Frontend / Component | `frontend-engineering/presentation-boundary.md`、`component-system/component-binding-execution-contract.md` |
| Admin Control Plane | `admin-console/capability-admin-control-plane.md` |

## 22. 后续实施计划

代码实施必须在本文和守护规范更新后进行，按以下顺序推进：

### 22.1 实施切片 A：契约与安全层

1. 新增或整理 LLM 输出契约：`RequestUnderstandingContract`、`TaskPlanContract`、`AnswerCompositionContract`。
2. 扩展 ResponseContract 可选字段：`confidence`、`tool_call_trace`、`disclaimers`、`contract_safety`。
3. 增加 ContractSafety：无证据断言、敏感信息、来源一致性、低置信 disclaimer、乱码检查。
4. 更新模型用例注册，移除 LLM 可改工具参数或切工具的失败处理口径。

### 22.2 实施切片 B：Planner 与仲裁

1. 将 IntentOrch、LLM Planner、rules/config fallback 合并为 planner candidates。
2. 实现 Plan Arbitrator：按 MCP/API、知识库、公开联网、model-only、clarify 的默认优先级仲裁。
3. 记录候选分歧、风险、置信度、证据要求和被拒绝原因。

### 22.3 实施切片 C：证据与回答

1. 将 MCP/API/知识库/公开联网统一写入 SourceRef、EvidenceRef、ToolCallTrace。
2. 将最终回答统一收口到 Answer Composer。
3. 公开联网保留默认公共事实兜底，但低相关来源不得进入 Evidence Ledger。

### 22.4 实施切片 D：展示与硬编码治理

1. 重整 DisclosureProjection，前端只渲染契约。
2. 清理 `route.ts`、public web、renderer 中承载业务意图的关键词分支，迁移到 capability manifest、tool metadata、Admin policy 或受治理 seed。
3. 保留报表业务域 policy，但标明治理来源和退出通用 Core 的边界。
4. 逐条执行 MIG case，并为每条补充同类不同表达、不含原关键词、业务负例、低相关来源、源码无测试输入样例的回归。

## 23. 验收清单

- [ ] 旧主范式不再作为总纲原则存在。
- [ ] Request Understanding 使用严格 JSON schema。
- [ ] Task Planner 有 LLM、IntentOrch、rules/config fallback 候选来源。
- [ ] Plan Arbitrator 记录候选分歧、风险、置信度和证据要求。
- [ ] 工具、知识库、公开联网均进入 Evidence Ledger。
- [ ] 所有 answer path 都有 `evidence_mode`。
- [ ] `chat_answer` 不再作为无证据模板增强旁路。
- [ ] `knowledge_answer` 不直接生成最终主消息，source_count=0 不编造。
- [ ] PromptVariableSchema 校验 required/optional/forbidden 变量，Context Builder 按 use case 白名单注入。
- [ ] 公开联网低相关来源不能进入证据。
- [ ] Answer Composer 只能基于证据综合回答。
- [ ] ContractSafety 不可绕过。
- [ ] ResponseContract 可选扩展 `confidence/tool_call_trace/disclaimers`。
- [ ] Frontend 只消费契约，不反推业务。
- [ ] Trace fail-open，不改变业务成功/失败语义。
- [ ] 通用 Core 中不存在按业务关键词、媒体名、指标名、报表名、测试输入写死的 if/else 路由。
- [ ] 开放式回答验收通过：`你好`、`你能做什么`、`什么是 ROI`、知识库无结果、公开来源无结果、同类不同表达均无固定样例硬编码，主消息自然且无内部字段泄露。
- [ ] 新增兼容 adapter 标明迁移目标和废弃条件，没有形成平行架构。
- [ ] 文档、源码、fixture、golden schema、用户可见文案无乱码。
- [ ] 每条 case 都有功能健康和乱码健康验收，并包含非硬编码补测。

## Changelog

### v0.5.0 (2026-06-18)

**新增：**
- Pipeline Stages 架构文档（`PIPELINE_STAGES.md`），详细说明各 stage 职责、进入条件和调度逻辑
- Multi-Query Stage：多工具编排/拼表，支持跨域指标查询
- Package Stage：包查询/交付 Skill 执行
- Service Proposal 生成：三段式响应（理解 → 提案 → 执行）

**改进：**
- Understanding Stage：集成 service proposal 生成
- Evidence Ledger：支持跨请求持久化（临时方案，使用 conversationId 作为 caseId）
- TypeScript 类型治理：移除多个 stage 文件的 `@ts-nocheck`

**修复：**
- Request Understanding：`general_chat` semanticTask 不再覆盖结构化信号的 fallback 判断

**已知问题：**
- Multi-Query Stage 与 Report Query Stage 的边界和 fallback 策略需要进一步明确
- Evidence Ledger 持久化方案为临时方案，需要正式化
- Package Stage 中 skill ID 硬编码，需要提取到配置

### v0.4.0 (2026-06-12)

- 用户确认 1-6 架构收口方向
- 初始版本发布
