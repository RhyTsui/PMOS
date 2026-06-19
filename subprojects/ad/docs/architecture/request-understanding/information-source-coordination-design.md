# 通用 Chat 信息源协同与仲裁设计方案

- status: `design_pass_runtime_gate_pending`
- canonical spec: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
- guardrail: `docs/architecture/governance/ai-chat-implementation-guardrails.md`
- scope: 公开联网、内部 MCP/API 能力、内部知识库、IntentOrch、用户上下文在 Planner / Evidence / Composer 中的协同优先级
- owner layer: Request Understanding / Task Planning / Plan Arbitrator / Evidence Collection / Answer Composer / ResponseContract / Observability
- last updated: 2026-06-13

## 1. 真实表现与边界

当前真实表现不是“系统完全不会联网”或“内部能力完全不可用”，而是多种信息源已经能进入回答，但在不同分支里的权威等级不一致：

- 开放问答已有 `planner_candidates`、`arbitration_summary`、知识库和公开联网雏形。
- 问数链路仍更接近“先路由到 report query，再做能力执行”，知识库候选和公开联网候选的采纳/拒绝记录不完整。
- 公开联网曾在部分路径以 `required` 影响是否进入内部问数，导致外部搜索和内部数据调用从互补关系变成抢路关系。
- IntentOrch、用户上下文、模型修正、多轮继承都能提供有用信号，但若没有统一仲裁，容易变成“看起来聪明、实际不可审计”的特殊处理。

边界归类：

| 边界 | 本方案负责 | 本方案不负责 |
|---|---|---|
| 运行面 | `/api/chat` 中信息源候选、仲裁、证据收集、Composer 输入边界 | 单个 MCP 工具内部业务计算 |
| 控制面 | Capability manifest、Knowledge source policy、Public web policy、Planner/Arbitrator policy、Prompt variable policy | 临时 runtime 业务词 if/else |
| 展示面 | ResponseContract、DisclosureProjection 消费仲裁和证据结果 | 前端从正文、关键词、样式反推业务含义 |
| 观测面 | Trace 记录候选、采纳、拒绝、降级、模型参与和配置版本 | Trace 影响主链路成功/失败语义 |
| 配置面 | 业务域术语、指标、工具、知识源进入受治理配置 | 业务词散落在 handler、Prompt glue、renderer |

## 2. 核心判断

争议问题不是二选一：

- 不是“先查能力再候选”。这样会把 Capability Discovery 变成路由主脑，遇到公开事实、知识解释、混合任务时容易过早收窄。
- 也不是“先排查再查能力再候选”。这样会把 Request Understanding 或 public web need 当成事实权威，仍可能抢掉内部工具。

正确顺序是：

```txt
先理解当前轮目标和证据需求
  -> 同步形成五类候选
  -> 仲裁候选和风险
  -> 按仲裁结果执行取证
  -> 对证据再次做采纳/拒绝
  -> Composer 只基于证据和仲裁摘要回答
  -> ContractSafety 兜底
```

更精确地说，Capability Discovery 不是一个“必须在所有候选之前或之后”的单点步骤，而是候选生成的一条权威输入：

- 轻量能力索引可以在 Planner 前提供上下文，告诉模型“系统可能有哪些受治理能力”。
- 真实可执行性检查必须在仲裁前完成，告诉 Arbitrator“内部能力此刻是否可用、缺什么、风险是什么”。
- 工具执行只能在仲裁后发生，不能让某个候选来源绕过 Execution Policy。

## 3. 设计原则

1. 当前轮显式输入优先于历史上下文、记忆、模型修正和 IntentOrch。
2. 内部 MCP/API 是企业业务事实和动作的最高权威；公开联网不能覆盖内部数据。
3. 内部知识库优先于公开联网，但知识库必须有权限、来源、相关性和时间边界。
4. 公开联网拆成“是否需要查”和“查到的结果能否采纳”两阶段。
5. IntentOrch 是 planner candidate，不是工具选择器，也不是参数改写器。
6. 用户上下文是弱信号，只能填空、约束口径和改善表达，不是事实覆盖源。
7. model-only 只适用于无外部事实依赖的解释、写作、总结或闲聊，并必须显式标记 evidence mode。
8. Composer 不消费 raw tool result、raw KB chunk、route rules、tool priority 或完整用户画像，只消费 Evidence Ledger、SourceRef、ToolCallTrace、ArbitrationSummary 和脱敏上下文。
9. 业务域需要保留，但必须进入 capability manifest、metric catalog、tool metadata、knowledge policy、Admin policy 或受治理 seed。
10. 所有候选必须有采纳/拒绝原因；没有证据不能输出确定结论。

## 4. 分层职责

| 层级 | 输入 | 输出 | 禁止 |
|---|---|---|---|
| Request Understanding | 当前轮消息、会话上下文、权限摘要 | user goal、intent、fact need、risk、missing info | 直接选工具或生成最终事实 |
| Task Planner | 结构化理解、轻量能力索引、策略摘要 | candidate paths、required evidence、clarify condition | 把单个候选当最终路径 |
| Capability Discovery | capability manifest、tool contract、用户权限、项目范围 | internal capability candidate、可执行性、缺失输入 | 用业务关键词抢路由 |
| Knowledge Candidate Builder | knowledge source policy、检索命中、权限 | knowledge candidate、SourceRef、相关性 | 知识库直答绕过 Evidence Ledger |
| Public Web Need Planner | fact need、public web policy、用户显式要求 | public web need candidate | 用 `required` 排除内部能力 |
| IntentOrch Adapter | IntentOrch 输出 | intentorch candidate、工具建议摘要、失败/超时 | 直接改工具、参数或执行路径 |
| Context Adapter | 用户上下文、记忆、历史会话、项目 | context candidate、可填空槽位、偏好 | 覆盖当前轮明确指标、实体、时间 |
| Plan Arbitrator | 五类候选、风险、可执行性 | selected path、rejected candidates、reason、evidence plan | 静默覆盖候选分歧 |
| Evidence Collection | 仲裁后的执行计划 | ToolCallTrace、EvidenceRef、SourceRef | 无仲裁先执行高风险动作 |
| Evidence Arbitrator | 工具结果、知识、公开来源、模型推断 | accepted/rejected evidence | 低相关来源进入最终证据 |
| Answer Composer | Evidence Ledger、SourceRef、ArbitrationSummary、Response policy | final answer draft、disclaimer、next actions | 编造工具没有返回的事实 |
| ContractSafety | answer draft、evidence、policy | ResponseContract 或阻断/降级 | 被 Prompt 或前端绕过 |

## 5. 五类候选

### 5.1 `internal_capability_candidate`

来源：MCP/API、内部报表、内部任务、内部系统动作。

默认优先级最高，因为它代表企业内部受权限控制的事实或动作。它必须记录：

- capability id / tool name / server
- covered inputs / missing inputs
- permission status
- data coverage / presentation coverage
- risk flags
- executable / needs clarification / blocked / unavailable

采纳条件：

- 用户问题需要内部数据、内部状态、内部动作或企业私有上下文。
- 对应能力可执行，或缺失信息可通过 clarify 补齐。

拒绝条件：

- 无权限、能力不可用、输入缺失且无法追问、工具契约不支持、风险过高。

### 5.2 `knowledge_candidate`

来源：内部知识库、组织文档、制度、口径说明、历史沉淀。

它优先于公开联网，但不能替代 MCP/API 的实时内部数据。它适合回答：

- 内部制度、口径、流程、指标定义。
- 工具使用说明、能力说明、业务知识解释。
- 内部数据结果的口径补充。

采纳条件：

- 命中来源有权限、相关性达标、时间边界明确。
- 与当前轮问题匹配，不只是关键词相似。

拒绝条件：

- 无命中、低相关、无权限、过期、来源不可审计、与用户问题冲突。

### 5.3 `public_web_need_candidate`

来源：Request Understanding、用户显式要求、fact need、public web policy。

它只回答“是否可能需要公开信息”，不回答“公开结果是否可信”。适合：

- 新闻、公告、政策、天气、汇率、版本、实时价格、外部公司/人物等公共事实。
- 用户明确要求“联网查”“最新”“官网”“公开资料”。
- 内部分析需要外部环境解释，但只能作为补充证据。

关键约束：

- `public_web.required = true` 只能进入仲裁，不能排除内部 MCP/API。
- 内部业务数据问题即使出现“最新”“趋势”等词，也应优先内部能力。
- 公开联网执行失败不能让 model-only 编造公开事实。

### 5.4 `public_web_evidence_candidate`

来源：联网工具执行结果。

它回答“查到的公开来源能否作为证据”。必须包含：

- source refs
- relevance score
- freshness
- official / secondary / unknown source type
- query and provider
- failure reason
- disclaimer

采纳条件：

- 来源相关、可引用、时效满足 fact need。
- 对用户问题提供必要公共事实。

拒绝条件：

- 低相关、无来源、来源不可信、与内部数据冲突且无法解释、需要内部权限才能确认。

### 5.5 `intentorch_candidate`

来源：IntentOrch。

它只能增强规划：

- 提供意图拆解。
- 提供可能工具或流程建议。
- 提供上下文解释。

它不能：

- 直接选工具。
- 直接改参数。
- 覆盖当前轮显式输入。
- 绕过 Capability Discovery、Execution Policy 或 Evidence Ledger。

IntentOrch 失败、超时、未初始化时，只记录候选失败，不改变主链路成功/失败语义。

### 5.6 `context_candidate`

来源：用户画像、项目、角色、记忆、历史会话、当前工作上下文。

它只能：

- 填补空槽位。
- 调整表达重点。
- 缩小权限和项目范围。
- 作为待验证假设或偏好。

它不能：

- 覆盖当前轮明确指标、实体、时间范围、动作。
- 成为内部数据或公开事实的唯一证据。
- 把历史问题静默继承为当前问题。

## 6. Planner / Evidence / Composer 优先级

### 6.1 Planner 阶段

Planner 的优先级不是“哪个信息源先回答”，而是“先判断当前问题需要哪些证据”。

优先顺序：

1. 当前轮显式目标、约束、风险和缺失信息。
2. 安全、权限、内部数据保护、合规边界。
3. 内部能力是否可能满足业务事实或动作。
4. 内部知识库是否可能满足口径、制度、说明。
5. 公开联网是否可能满足公共事实或时效事实。
6. IntentOrch 候选。
7. 用户上下文和历史弱信号。
8. model-only 是否允许。
9. 是否必须 clarify。

Planner 可以并行生成候选，但不能在 Planner 阶段执行工具或采纳公开结果。

### 6.2 Evidence 阶段

Evidence 阶段的优先级是证据权威等级：

1. 成功的内部 MCP/API 工具结果。
2. 有权限、有来源、有相关性的内部知识库证据。
3. 有来源、有相关性、有时效性的公开联网证据。
4. 文件、用户上传材料或用户明确提供的信息。
5. 用户上下文中的偏好和范围信号。
6. model inference，仅作为解释、改写或无外部事实依赖回答。

冲突处理：

- 内部工具结果与公开来源冲突时，业务事实以内部工具为准；公开来源可作为外部环境补充。
- 知识库与公开来源冲突时，内部制度/口径以知识库为准；公开来源可作为外部背景。
- 用户上下文与当前轮冲突时，当前轮优先。
- 模型与任何证据冲突时，模型必须让位。

### 6.3 Composer 阶段

Composer 的优先级是“证据可用性 + 用户任务”：

1. 使用 accepted evidence 中与用户问题直接相关的事实。
2. 明确说明无法确认、低置信、权限不足、来源不足。
3. 只在证据允许时给结论。
4. 混合问题返回 `mixed_grounded`，区分内部数据结论和外部公共事实。
5. 没有证据时输出 clarify、degraded answer 或 failure，不输出确定结论。

Composer 必须禁止接收：

- raw tool result 未归一化版本
- raw KB chunks 未过滤版本
- route rules
- tool priority 原始列表
- raw stack trace
- hidden chain-of-thought
- full user profile
- 未脱敏内部上下文

## 7. 推荐主链路

```txt
0. Request Intake
   - 规范化输入、权限摘要、项目范围、安全预检

1. Request Understanding + Fact Need
   - 识别用户目标、事实类型、时效、权威需求、内部/公开/知识需求

2. Candidate Harvesting
   - internal_capability_candidate
   - knowledge_candidate
   - public_web_need_candidate
   - intentorch_candidate
   - context_candidate
   - model_only_candidate / clarify_candidate

3. Plan Arbitration
   - 默认优先级：MCP/API > 内部知识库 > 公开联网 > model-only > clarify
   - 记录采纳/拒绝、风险、缺失输入、fallback

4. Evidence Collection
   - 只执行仲裁允许的工具、知识库、联网查询
   - 公开联网即使执行，也只是取证，不等于最终回答

5. Evidence Arbitration
   - 对工具结果、知识命中、公开来源做相关性、权限、时效和冲突判断

6. Answer Composition
   - 基于 Evidence Ledger / SourceRef / ToolCallTrace / ArbitrationSummary 组织答案

7. ContractSafety + ResponseContract
   - 校验来源一致性、无证据断言、敏感信息、乱码、disclaimer、next action

8. Disclosure + Trace
   - 展示候选、执行、证据、模型参与和降级，不反推业务逻辑
```

## 8. 场景推理

### 8.1 内部数据问题

用户问：“看一下昨天计划 A 的消耗和转化。”

推理：

- fact need 是内部业务数据。
- public web 即使判断“昨天”有时效，也不能抢占。
- Capability Discovery 找报表/MCP 能力。
- 若可执行，MCP/API 为 selected source。
- 若缺计划 ID，clarify；不能公开联网搜计划名。

结论：内部能力优先，公开联网 rejected 或 deferred。

### 8.2 显式联网问题

用户问：“联网查一下 Google Ads 最近的政策更新。”

推理：

- 用户显式要求联网。
- fact need 是公开政策/公告。
- 公开联网可以执行。
- 如果内部知识库也有政策解读，知识库作为内部口径补充。
- Composer 区分“公开公告事实”和“内部解读口径”。

结论：公开联网 selected for evidence，但仍需相关性门禁和 Composer。

### 8.3 混合问题

用户问：“我们昨天 ROI 掉了，是不是和某平台最新政策有关？”

推理：

- ROI 下降是内部数据问题，需要 MCP/API。
- 平台政策是公开事实，可能需要 public web。
- 两类证据都需要，但权威不同。
- Composer 不能直接把政策当成 ROI 下降原因；只能说“内部数据发现 X，公开政策显示 Y，二者相关性需要进一步验证”。

结论：`mixed_grounded`，内部数据和外部公开事实互补。

### 8.4 知识库问题

用户问：“我们内部 ROI 口径怎么算？”

推理：

- 这是内部口径知识，不是公开网页事实。
- 优先知识库。
- 无知识库命中时，不能让模型编造内部口径。

结论：knowledge selected；无证据则 insufficient evidence / clarify。

### 8.5 IntentOrch 失败

用户问：“帮我查素材表现。”

推理：

- IntentOrch 失败只是一个候选失败。
- Request Understanding + Capability Discovery 仍可推进。
- 不因 IntentOrch 失败切到 public web 或 model-only。

结论：记录 candidate failure，主链路语义不受影响。

### 8.6 用户上下文冲突

历史上下文是“项目 A”，当前轮用户问“项目 B 上周情况”。

推理：

- 当前轮项目 B 优先。
- 项目 A 只能作为历史 context rejected。
- 若项目 B 无权限，必须提示权限/澄清，不得静默改回项目 A。

结论：context candidate 是弱信号。

## 9. 业务域是否需要

业务域需要保留，否则 B 端数据产品会失去可用性：

- 用户不会总是说标准指标名、标准实体、标准工具名。
- 指标口径、媒体差异、报表能力、权限边界、内部知识源都天然有业务域。
- 完全去业务域会导致 Planner 成为空泛自然语言理解，无法稳定连接工具和数据。

但业务域只能以治理形态存在：

| 应放位置 | 可以承载 | 不可承载 |
|---|---|---|
| Capability manifest | 能力描述、支持意图、输入输出、权限、数据域 | 测试句到工具的硬映射 |
| Tool metadata | 参数 schema、失败语义、证据输出 | 业务关键词 if/else |
| Metric catalog | 指标别名、口径、维度、时间粒度 | 绕过 Planner 的路由规则 |
| Knowledge source policy | 知识库范围、权限、可信度、更新时间 | 无来源直答 |
| Public web policy | 允许联网的事实类型、来源偏好、相关性阈值 | 内部数据问题转公开搜索 |
| Admin policy / governed seed | 受治理术语、风险阈值、默认优先级 | 单个客户样例或验收句 |
| Prompt variable schema | 允许注入的摘要变量 | raw 工具结果、隐式路由规则 |

判断一个业务域规则是否合规，看三点：

1. 它是否有配置真源和版本。
2. 它是否只产生候选/约束/解释，而不是直接执行。
3. 它的采纳/拒绝是否进入 Trace。

## 10. 仲裁契约建议

不新增平行 OS/Protocol，只扩展既有 TaskPlanContract、EvidenceRef、SourceRef、ResponseContract 和 Trace。

建议 `InformationSourceArbitration` 至少包含：

```json
{
  "stage": "planning | execution_arbitration | evidence_arbitration | composer",
  "priority_order": ["mcp_api", "knowledge", "public_web", "model_only", "clarify"],
  "selected_source": "mcp_api | knowledge | public_web | model_only | clarify | mixed | none",
  "public_web_decision": "not_needed | candidate_only | deferred_to_internal | selected_for_evidence | blocked",
  "candidates": [
    {
      "source": "mcp_api | knowledge | public_web | intentorch | context | model_only | clarify",
      "role": "primary_evidence | supporting_evidence | candidate_evidence | planning_signal | context_signal | fallback",
      "priority": 1,
      "status": "accepted | selected | deferred | rejected | blocked | failed | unavailable",
      "reasons": ["string"],
      "rejected_by": "arbitrator | execution_policy | evidence_policy | contract_safety",
      "evidence_required": true,
      "evidence_refs": ["evidence_id"],
      "source_refs": ["source_ref_id"],
      "risk_flags": ["string"]
    }
  ],
  "summary": "string",
  "warnings": ["string"]
}
```

## 11. Composer 输入契约

Composer 只允许看到：

- `user_goal`
- `accepted_evidence[]`
- `rejected_evidence_summary[]`
- `source_refs[]`
- `tool_call_trace[]`
- `arbitration_summary`
- `answer_policy`
- `safe_context_summary`
- `disclaimers`
- `next_action_candidates`

Composer 输出必须包含：

- final answer markdown
- evidence mode
- confidence
- disclaimer
- cited source refs
- next actions
- cannot-answer reason when evidence insufficient

ContractSafety 必须检查：

- 是否引用了不存在的 source/evidence。
- 是否把 rejected evidence 写成事实。
- 是否无证据输出确定结论。
- 是否公开联网覆盖内部能力。
- 是否模型声称查询了未执行的工具。
- 是否有内部敏感数据泄露到公开联网 query 或主消息。
- 是否有乱码。

## 12. 实施门禁

设计通过不等于 runtime 完成。进入 runtime 实施前必须满足：

1. 设计文档状态为 `design_pass_runtime_gate_pending` 或更高。
2. 专家委员会结论为 design pass。
3. 目标文件影响面明确，不新增平行协议。
4. 每个候选来源都有采纳/拒绝记录。
5. 公开联网不能通过 `required` 排除内部能力。
6. IntentOrch 不能直接改工具或参数。
7. 用户上下文不能覆盖当前轮显式输入。
8. Composer 不消费 raw result。
9. Trace 不改变主链路语义。
10. 业务域规则迁入受治理配置或 seed。

## 13. 验收矩阵

| 场景 | 期望 |
|---|---|
| 内部数据问题，内部能力可执行 | MCP/API selected；public web deferred/rejected；不得外搜替代 |
| 显式联网问题 | public web selected for evidence；来源相关性门禁；Composer 综合 |
| 内部数据 + 外部政策 | `mixed_grounded`；内部结论和外部事实分开；不强行归因 |
| 知识库问题 | knowledge 优先；无命中不得模型编造内部口径 |
| IntentOrch 失败 | 只记录候选失败；主链路可继续 |
| 用户上下文与当前轮冲突 | 当前轮优先；上下文 rejected |
| model-only 合法问题 | 标记 `model_only` 或 `no_external_evidence_required` |
| 低相关公开来源 | rejected，不进入最终证据 |
| 公开联网不可用 | 不伪装成功；必要时 degraded / cannot confirm |
| 非硬编码表达 | 同义表达、不含原关键词、业务负例均走同一仲裁逻辑 |

## 14. 专家委员会复审

### 14.1 初审

结论：`revise`

原因：

- 初版容易被理解为“公开联网 need 先判断后决定问数”，仍可能让 public web 抢内部能力。
- 对 Capability Discovery 的位置描述不够精确，像是必须全局前置或全局后置。
- 知识库在问数混合场景中的补充证据角色不够清楚。
- 业务域“需要但治理化”的边界需要更硬的判断标准。

### 14.2 修订

已修订：

- 将主顺序明确为“先理解证据需求 -> 并行形成候选 -> 仲裁 -> 执行取证 -> Composer”。
- 将公开联网拆为 `public_web_need_candidate` 和 `public_web_evidence_candidate`。
- 将 Capability Discovery 定义为候选生成中的权威输入，而不是简单前置或后置。
- 明确业务域只能进入受治理配置、manifest、metadata、catalog、policy 或 seed。
- 明确 Composer 输入白名单和 ContractSafety 检查项。

### 14.3 复审结论

| 角色 | 结论 | 理由 |
|---|---|---|
| B 端数据产品专家 | pass | 内部数据、知识口径、公开事实、用户上下文的权威等级符合企业数据产品心智；混合问题避免强行归因。 |
| AI 架构专家 | pass | 符合 `Planner-first, tool-grounded, contract-guarded`；未新增平行 OS/Protocol；IntentOrch 是候选而非主链。 |
| 数据治理专家 | pass | 候选、证据、来源、采纳/拒绝、风险和 Trace 都有审计字段；公开联网两阶段可追责。 |
| 安全与合规专家 | pass | 内部业务数据保护优先；公开联网不能覆盖内部能力；Composer 不接触 raw/private payload。 |
| 前端体验专家 | pass | 前端只消费 ResponseContract/DisclosureProjection，不从正文反推；本方案不改用户页面文案。 |

综合结论：`design_pass_runtime_gate_pending`

含义：

- 设计方案通过，可以给用户审查。
- 当前不代表 runtime 全量完成。
- 后续实施必须按第 12、13 节门禁验收，真实 `/api/chat` 回归未通过前不得升级为 `pass`。

## 15. 冲突决策矩阵

这张矩阵用于实施和评审时快速判断“谁让位给谁”。它不是新的路由表，而是对第 6 节优先级的审查化表达。

| 冲突 | 仲裁结果 | 理由 | 必须记录 |
|---|---|---|---|
| 当前轮显式输入 vs 用户历史上下文 | 当前轮显式输入优先 | 用户刚说的话代表当前任务；历史只能填空 | rejected context field、原因 |
| 内部 MCP/API 结果 vs 公开网页结果 | 内部业务事实以 MCP/API 为准；公开网页只做外部背景 | 内部系统是企业私有事实权威 | evidence conflict、public source role |
| 内部知识库口径 vs 公开网页解释 | 内部口径以知识库为准；公开网页作为补充 | 企业口径可能不同于公开通用解释 | knowledge source、source freshness |
| 公开政策/公告 vs model-only 常识 | 公开来源优先；模型只负责总结 | 时效公共事实不能靠模型记忆 | source refs、freshness |
| IntentOrch 工具建议 vs Capability Discovery | Capability Discovery 和 Execution Policy 优先 | IntentOrch 是候选，不是执行权威 | intentorch rejected/deferred reason |
| 用户显式联网 vs 内部数据问题 | 可以联网取外部背景，但内部数据仍优先 | 显式联网不等于公开网能回答私有数据 | mixed plan、public web role |
| 知识库无命中 vs model-only | 不得编造内部口径；进入 insufficient evidence 或 clarify | 内部知识缺失不能由模型补 | source_count、cannot-answer reason |
| 公开联网无结果 vs model-only | 不得编造公共实时事实；说明无法确认 | 实时/官方事实需要来源 | public web failure、degraded status |
| 能力可执行但缺必要输入 vs 公开联网可查 | 先 clarify 或按 Execution Policy 补输入；不得外搜替代 | 缺内部参数不是改走公开搜索的理由 | missing input、clarify question |
| 权限不足 vs 用户上下文暗示有权限 | 权限系统优先 | 上下文不是授权来源 | permission denial、context rejected |

## 16. 反模式与阻断判定

以下实现即使“看起来能修一个 case”，也必须在评审中判为不通过：

| 反模式 | 为什么不通过 | 正确替代 |
|---|---|---|
| 在 `route.ts` 用业务词、媒体名、指标名 `includes()` 决定是否问数或联网 | 把业务样例变成路径权威，无法覆盖同义表达 | Request Understanding 输出 fact need，Capability/Policy 产生候选 |
| 在 public web heuristic 里用业务词表直接阻断或放行路径 | 公开联网 need 变成隐形 router | 只接受结构化 internal business signal 和 public fact need |
| IntentOrch 返回某工具后直接执行 | 绕过 Capability Discovery 和 Execution Policy | 归一化为 `intentorch_candidate`，交给 Arbitrator |
| 知识库命中后直接拼最终回答 | 绕过 Evidence Ledger、Composer、ContractSafety | 过滤为 `knowledge_candidate` 和 evidence refs |
| Composer 读取 raw tool result 或 raw KB chunk | 容易泄露、编造或引用低相关内容 | 只消费 accepted evidence 和 source refs |
| 公开联网失败后让模型“根据常识回答最新情况” | 模型补实时事实会幻觉 | 输出无法确认、降级或追问 |
| 用户上下文覆盖当前轮明确时间/实体/指标 | 多轮记忆变成错误事实 | 上下文只能填空，冲突时 rejected |
| 把业务规则从代码搬到 Prompt 中文说明里 | Prompt 成为不可校验路由器 | Prompt variable schema + Admin policy |
| 前端根据正文关键词展示运行过程 | 展示层反推业务语义 | 后端 DisclosureProjection / ResponseContract |
| 只测原始验收句，不测同义表达和负例 | 仍可能是样例硬编码 | 非硬编码回归矩阵 |

实施评审时，如果发现上述任一 P0 反模式，本方案状态不能升级为 runtime pass。

## 17. 用户审查清单

用户审查本方案时建议逐项判断：

1. 是否接受“Capability Discovery 是候选生成的权威输入，不是全局前置主脑”。
2. 是否接受“公开联网分成 need candidate 和 evidence candidate”。
3. 是否接受“内部 MCP/API > 内部知识库 > 公开联网 > model-only > clarify”的默认证据权威。
4. 是否接受“显式联网可以触发外部取证，但不能覆盖内部数据能力”。
5. 是否接受“业务域必须保留，但只能治理化存在”。
6. 是否认为 Composer 输入白名单足够严格。
7. 是否还存在某些 B 端数据场景会被该方案误杀。
8. 是否需要把某类业务域规则提升为 Admin policy，而不是代码或 Prompt。
9. 是否允许后续 runtime 实施以第 13 节验收矩阵作为准入。
10. 是否要求在进入 runtime 前再补一轮真实样例集评审。
