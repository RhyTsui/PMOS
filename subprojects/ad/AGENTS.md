# AD Repository Rules

## Mandatory AI Chat OS 规范入口（本仓库级）

本仓库后续任何涉及通用 Chat 体系（含 `/api/chat` 运行链路、Capability/Intent/Tool/ResponseContract、Prompt/Model/Trace 分层）的任务，默认执行前必须先阅读并遵循以下文档（作为实施前置强约束）：

1. `AGENTS.md`（本文件）
2. `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
3. `docs/architecture/governance/ai-chat-implementation-guardrails.md`
4. `docs/operations/ui-guardrail.md`（涉及前端页交付）

每个任务开始前必须输出：

- 当前问题的真实表现与边界（至少含运行面/控制面/展示面/观测面/配置面归类）
- 可能根因与影响链路
- 涉及的架构层级（Request Understanding / Chat Domain / Capability Discovery / MCP / Model Service / Prompt / ResponseContract / Frontend Presentation / Observability / Admin）
- 硬编码风险识别
- 是否影响主链路、MCP、模型、Prompt、ResponseContract、Trace
- 最小修改方案与验证方案

除非任务显式要求只做文档/规范，不应直接改动 runtime 代码再补丁收口。

本文件是 `ad` 子项目的仓库级执行规则。进入本仓库工作的 agent 必须先读本文件，再开始分析、设计、编码或输出页面文案。

## 2026-06-12 通用 Chat 架构治理补充

本仓库当前优先目标是把通用 Chat 底座收敛到 `Planner-first, tool-grounded, contract-guarded`。任何涉及 `/api/chat`、会话页、意图理解、任务规划、能力发现、工具执行、模型调用、提示词、结果契约、Trace、Admin 配置或用户可见页面的任务，必须遵守以下新增硬约束：

- **职责分层不可混写**：Request Understanding 负责结构化理解用户目标与上下文；Task Planner 负责生成候选计划；Plan Arbitrator 负责合并 LLM、IntentOrch、rules/config fallback 候选；Capability Discovery 负责发现候选能力；Execution Policy 负责权限、风险、preflight、fallback 和执行决策；Tool/MCP/API/知识库/公开联网提供事实、证据与动作；Answer Composer 基于证据综合最终回答；ContractSafety 做不可绕过的后置检查；ResponseContract/SemanticResultContract 承载结果契约；Frontend 只做展示和下一步动作；Trace 只做观测审计。
- **禁止硬编码和业务强耦合**：不得在通用 Chat Core、Prompt、UI renderer、handler 中用广告业务词、媒体名、指标名、报表名、单个客户样例或临时需求写死路由、参数补齐或结果判断。
- **禁止业务 if/else 路由**：不得用 `includes()`、正则、if/else、switch 针对业务关键词绕过 Request Understanding、Capability Contract、Tool Contract 或 Admin 配置。业务差异必须进入 capability manifest、route rules、tool metadata、metric catalog、prompt/model 配置或受治理 seed。
- **LLM 用途必须契约化**：LLM 可用于 Request Understanding、Task Planning、Answer Composition、Explanation 和 Rewrite，但必须输出受 schema 校验的契约结果，不得绕过 Tool/MCP/API、Evidence Ledger、ResponseContract 或 ContractSafety。
- **禁止平行架构和兼容兜底失控**：不得新增 `*OS`、`*Protocol`、`*Schema`、`*Contract` 等平行总体系绕开 Enterprise AI Chat OS；兼容旧字段只能做局部 adapter，必须标明迁移边界和最终收口位置，不能把 fallback 写成长期主路径。
- **严格编码规范**：所有文档、源码、页面文案、JSON fixture、golden schema 必须以 UTF-8 正常中文提交；禁止提交常见 GBK/UTF-8 错读片段和替换字符（如 U+951B、U+9428、U+6D93、U+7EDB、U+FFFD）。终端显示错读不等于文件本体乱码，但源码/文档文本中真实存在的错码必须修复。
- **必须审查才能上线**：涉及主链路、前端交付、契约、Prompt、模型、MCP、Trace、Admin 配置的变更，必须先完成影响分析、最小方案、静态验证、真实链路或等价回归验证；每条 case 必须补充非硬编码补测和乱码健康验收，并在最终输出中明确是否可进入下一阶段。

## 默认语言

- 除非用户明确指定其他语言，默认使用中文沟通。
- proper nouns、文件路径、代码标识符、必要技术名词可以保留英文。

## 用户页文案规则

面向真实用户的前端页面，必须使用产品语言和用户语言，不得混入研发实现语言。

- 页面标题、副标题、分区名、按钮文案、空态文案、提示文案，必须先回答“这是什么”“帮用户做什么”“下一步能做什么”。
- 不得把工程边界、实现阶段、联调状态、架构分层直接写到用户可见页面上。
- 工程说明只能写在开发文档、checkpoint、注释、提交说明、评审记录里，不得写进用户页面。

### 禁止出现在用户页面的词

以下词汇默认视为工程黑话，禁止直接出现在用户可见 UI 文案中：

- `子项目`
- `聚合`
- `首页聚合`
- `主链`
- `会话主链`
- `全局状态`
- `任务回看`
- `接口`
- `contract`
- `schema`
- `mock`
- `workspace`（当其含义是内部接口名或聚合视图名时）
- `独立子项目`
- `联调状态`（如是内部工程状态表达）

如果确实需要表达相关含义，必须改写成用户语言，例如：

- “最近处理”
- “当前进展”
- “历史记录”
- “我可以帮你做什么”
- “输入问题、需求或联调目标”

## 前端交付自检

每次输出或修改面向用户的前端页面前，必须先做下面的自检：

1. 这段文案给真实用户看，像产品页面，还是像研发说明页？
2. 页面上是否出现了工程命名、内部接口名、架构层词汇？
3. 用户是否能直接理解每个区块在帮他做什么？
4. 如果删掉所有研发背景说明，这个页面是否仍然成立？

只要以上任一问题答案不合格，就不能把当前文案当作交付版页面文案。

## Ant Design X 默认规则

本仓库前端默认采用 Ant Design X 官方体系作为主线真源。

默认真源文件：

- `docs/小乔智投-Ant-Design-X默认规范-2026-05-09.md`

默认要求：

1. AI 产品交互设计默认采用 `RICH` 范式
2. 会话与工作台组件默认采用 `Ant Design + Ant Design X`
3. 会话数据流默认采用 `X SDK`
4. 会话与结果说明渲染默认采用 `X Markdown`
5. 页面样板默认参考 `Ultramodern Playground`
6. `X Skill` 作为开发辅助工具链使用

没有充分理由时，不得重新把前端主线切去其他 AI 前端框架。

## UI Guardrail：禁止退回传统后台

本仓库的前端默认不是传统 antd admin dashboard。任何面向小乔智投真实用户的页面，都必须先被判断为：

- AI 会话驱动的工作台
- 任务上下文 + 证据 + 建议 + 行动的处理界面
- 能把结果带回当前对话或下一步操作的协同表面

除非用户明确要求“后台管理页”，不得把新页面做成：

- 顶部筛选 + 指标卡 + 表格的通用后台
- Ant Design Pro 风格 dashboard
- 平铺卡片墙
- 营销介绍页
- 只有静态展示、没有会话或行动承接的页面

### 前端任务强制顺序

涉及首页、会话工作台、我的资产、需求、联调、报告、AI 助手、审批或任何用户可见页面时，必须先完成下面步骤，再写 React：

1. 读取 `docs/小乔智投-Ant-Design-X默认规范-2026-05-09.md`
2. 读取 `docs/operations/ui-guardrail.md`
3. 确认参考截图或设计图；如果没有专属截图，必须写明使用哪张现有截图作为视觉基准
4. 先补或更新 UISchema / golden schema，声明 `screenType`、`layout`、`regions`、sourceRefs、evidenceRefs
5. 明确组件契约：哪些区域使用 Ant Design X / Ant Design / 自定义组件，哪些状态必须覆盖
6. React 实现只能按上述契约落地，不得自由发挥成后台模板

### 组件契约底线

- 会话入口、结果承接、资产引用、建议动作优先使用 Ant Design X 语义：`Sender`、`Prompts`、`Bubble`、`Actions`、`Attachments`、`X Markdown`、动态卡片或等价封装。
- 基础控件可以用 Ant Design，但只能作为工作台局部控件，不得拼成 Pro Dashboard。
- 列表、表格、筛选器必须服务于明确任务，例如“选择资产并带回对话”“查看证据并继续处理”，不能只是后台数据浏览。
- 任何推荐、结论或风险动作必须有来源、证据、下一步动作；高风险动作必须有审批或确认语义。

### Review 阻断规则

前端交付前必须自查：

- 是否存在传统后台布局：顶部筛选、指标卡、表格三件套作为主结构？
- 是否缺少 UISchema / golden schema？
- 是否缺少参考截图或设计图 sourceRefs？
- 是否出现工程黑话、乱码或内部接口名？
- 是否没有说明“用户下一步能做什么”？
- 是否没有移动端堆叠决策流？

任一问题为“是”，不得标记交付完成。

## 执行要求

- 当用户指出页面文案“像内部实现说明”时，必须优先判定为文案错误，而不是向用户解释术语合理性。
- 当快速搭建最小可运行页面时，也不能牺牲用户语言质量来换速度。
- 若内部对象名必须保留给代码使用，应只保留在代码标识符、接口层、开发说明中，不得直接透传到 UI。
