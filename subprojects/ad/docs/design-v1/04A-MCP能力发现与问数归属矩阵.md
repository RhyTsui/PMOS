# MCP 能力发现与问数归属矩阵

## 1. 文档目的

本文是 `04-数据查询与报表系统设计.md` 的能力发现附录，用于纠正一个关键风险：不能把问数测试集反推项默认写成 MCP 缺失。当前系统已经绑定了多个真实 MCP，其中报表 MCP 已披露大量问数 tool 和字典 tool。设计阶段必须先做 MCP 能力发现和能力归属，再判断 Chat、Workflow、Skill、MCP、UI 各自需要补什么。

本文回答四个问题：

- 当前运行态实际绑定了哪些 MCP。
- 问数相关 MCP 已披露了哪些能力。
- 测试集里的需求应如何归属。
- 当前能力发现为什么“有基础但没有产品化生效”。

## 2. 当前运行态 MCP 事实盘点

数据来源：`.runtime/zhitou-chat/mcp-servers.json`。

| MCP | 状态 | endpoint | tool 数 | 主要能力归属 |
|---|---:|---:|---:|---|
| 报表MCP `mcp_1778588331776` | connected | 有 | 47 | 广告问数、报表、字典、项目列表 |
| 智投配置mcp `mcp_1778658890818` | connected | 有 | 37 | 应用、包、媒体、归因配置、活动、账号 |
| 智投配置 MCP `mcp-zhitou-config` | connected | 有 | 14 | 应用、包、活动、渠道包、账户 token |
| 自动联调 MCP `mcp-debug-automation` | connected | 有 | 10 | 联调任务、步骤、结果、运行开关 |
| 巨量引擎 MCP `mcp-oceanengine` | connected | 有 | 5 | 巨量应用管理、共享、扩展包、包解析 |
| 归因mcp `mcp_1778590915247` | connected | 有 | 10 | 归因配置、归因统计、缺失回传设备、SQL |
| 运维调度mcp `mcp_1778757767432` | connected | 有 | 3 | Azkaban 执行、日志、flow |
| 监测链接 MCP `mcp-tracking-link` | connected | 有 | 37 | 当前运行态工具列表实际更像智投配置能力，需要继续核对配置来源 |
| Pixso MCP `mcp-pixso` | disconnected | 无 | 0 | 设计资产，当前不可用 |

关键结论：

- 问数主能力不是空白，运行态 `报表MCP` 已 connected，且披露 47 个 tool。
- 当前文档和工程不能再把日报、周报、月报、小时报表、ROI、留存、素材、媒体字典、终端字典、团队字典、应用类型字典写成“待建设 MCP”。
- 仍需核对的是：Chat 是否能发现这些 tool，是否能按 schema 正确补参，是否能按权限和项目上下文调用，是否能解析返回和展示证据。
- `mcp-tracking-link` 运行态 tools 与名称不一致，显示出 MCP 配置治理还存在历史迁移或覆盖问题，需要工程单独清理。

## 3. 问数相关 MCP 原生能力

### 3.1 主报表工具

| tool | MCP 原生覆盖 | 必填字段 | 关键可选字段 / 维度 | Chat 侧主要工作 |
|---|---|---|---|---|
| `get_zt_ad_day_report` | 国内广告日 / 周 / 月报，消耗、激活、注册、付费、ROI 等核心表现 | `appId`、`startDate`、`endDate`、`promotionSource`、`timeType` | `mediaId`、`appPackageType`、`osTypes`、`subGroup`、`teamIds` | 日期语义、项目解析、媒体 / 团队 / 应用类型字典、`timeType`、`promotionSource`、`subGroup` 映射 |
| `get_zt_hour_report` | 国内广告小时报表，实时 / 分时段 / 截至某小时表现 | `appId`、`startDate`、`endDate` | `baseTimeType`、`dh`、`mediaId`、`appPackageType`、`subGroup`、`teamId`、`viewCriteria` | 小时语义、累计口径 vs 新增口径、按媒体小时拆分、避免二次累计 |
| `get_zt_ad_roi_report` | ROI、回收、累计 ROI、区间 ROI | `appId`、`startDate`、`endDate`、`promotionSource`、`timeType`、`dataType` | `mediaId`、`appPackageType`、`teamIds`、`pkgId`、`accountId`、`subGroup` | 区间 / 累计口径判断，不确定时追问，ROI 相关问题优先路由 |
| `get_zt_ad_retention_report` | 设备留存、注册留存、首日付费账号留存，支持日 / 周 / 月 | `appId`、`startDate`、`endDate`、`promotionSource`、`retentionType`、`timeType` | `mediaId`、`appPackageType`、`teamIds`、`pkgId`、`optimizerIds`、`subGroup` | 留存类型判断，不确定时追问，D2/D3/D7/D30 等留存窗口解释 |
| `get_zt_ad_mat_report` | 广告素材报表 | `appId`、`startDate`、`endDate`、`timeType` | 账户、计划、素材、媒体、优化师、团队、素材类型、来源、标签等 | 素材 / 创意意图路由，筛选字段别名，结果表格和排序 |

### 3.2 字典和项目能力

| tool | MCP 原生覆盖 | Chat 侧主要工作 |
|---|---|---|
| `list_all_apps` | 列出有权限的所有应用，`appId`、项目 ID、游戏 ID、应用 ID 等都指向 `appId`，项目 / 应用 / 游戏名称指向 `appName` | 项目名称解析、多候选追问、权限上下文校验 |
| `get_dict_zt_all_media` | 国内广告媒体 ID 列表 | 巨量、腾讯、快手等自然语言别名到 `mediaId` |
| `get_dict_zt_rpt_os_type_v2` | 终端类型字典，且受 `deviceType` 是否包含 H5 游戏影响 | 安卓 / iOS / 鸿蒙等终端别名和适用性判断 |
| `get_dict_zt_label_team` | 国内广告团队列表 | 团队名别名、团队权限范围 |
| `get_dict_zt_app_package_type` | 国内广告应用类型列表 | 应用类型别名，安卓 / iOS 与应用类型字段的边界 |
| `get_dict_zt_report_media`、`get_dict_zt_media` | 报表媒体 / 媒体字典 | 与 `get_dict_zt_all_media` 的使用边界需要固化 |
| 其他 `get_dict_zt_*` | 账户、优化目标、素材状态、投放模式、包体、用户、资产团队等 | 作为细分筛选和素材报表补参能力 |

## 4. 问数测试集需求归属矩阵

| 测试集反推需求 | 首要归属 | 当前判断 | 不应误判为 |
|---|---|---|---|
| 日报、周报、月报 | `mcp_native` + `chat_mapping_required` | `get_zt_ad_day_report` 已支持 `DAY`、`NATURAL_WEEK`、`NATURAL_MONTH` | MCP 缺失 |
| 广告小时报表 | `mcp_native` + `chat_mapping_required` | `get_zt_hour_report` 已支持小时、实时、截至某小时 | MCP 缺失 |
| ROI、累计 ROI、区间 ROI | `mcp_native` + `chat_mapping_required` | `get_zt_ad_roi_report` 已支持，Chat 需判断 `dataType` | MCP 缺失 |
| 留存、次留、注册留存、设备留存 | `mcp_native` + `chat_mapping_required` | `get_zt_ad_retention_report` 已支持，Chat 需判断 `retentionType` | MCP 缺失 |
| 素材 / 创意分析 | `mcp_native` + `chat_mapping_required` | `get_zt_ad_mat_report` 已支持素材维度 | MCP 缺失 |
| 媒体、团队、应用类型、终端筛选 | `mcp_native` + `chat_mapping_required` | 多个 `get_dict_zt_*` 已支持，Chat 需先调字典再填 ID | MCP 缺失 |
| 自然量、广告量、广告量+自然量 | `mcp_native` + `chat_mapping_required` | tool 描述已定义 `promotionSource` 和自然量 mediaId 规则 | MCP 缺失 |
| 日期语义、上周、本月、近 7 天、小时段 | `chat_mapping_required` | MCP 接收结构化日期，Chat 必须解析或追问 | MCP 缺失 |
| 项目名、简称、appId、多候选 | `chat_mapping_required` | `list_all_apps` 已支持应用列表，Chat 需项目解析和权限校验 | MCP 缺失 |
| TopN、最高、最低、环比、高多少 | `orchestrator_postprocess` | 基于 MCP 返回 rows 计算，除非 tool 后续披露排序参数 | MCP 缺失 |
| 总计与明细一致性核对 | `orchestrator_postprocess` | 依赖一次或多次 MCP 查询结果做汇总核对 | MCP 缺失 |
| 多轮继承、条件分支 | `chat_mapping_required` + `orchestrator_postprocess` | 会话上下文和编排负责，MCP 只执行单次结构化查询 | MCP 缺失 |
| 表格、图表、来源、下一步建议 | `ui_required` + 后端结果契约 | MCP 返回数据，不负责 Chat UI | MCP 缺失 |
| 可解释调用、Trace 回放 | Trace / Evidence | Chat 记录 server、tool、input、output summary、source refs | MCP 缺失 |
| 无权限、空结果、超时、解析失败 | MCP 错误结构 + Chat 失败闭环 | 需要区分错误类型并生成建议或 Case | MCP 缺失 |

## 5. 从测试集真正反推出的需求

测试集当然可以反推需求。只是反推出来的需求不能粗暴归为“补 MCP”，而要落到正确责任层。基于当前 MCP 已披露能力，可以明确反推出以下真实需求。

### 5.1 Chat 路由与意图需求

1. 问数意图必须细分到报表域
   不能只有 `report_query` 一个粗意图。至少要识别：

   - `ad_daily_report`
   - `ad_hour_report`
   - `ad_roi_report`
   - `ad_retention_report`
   - `ad_material_report`
   - `ad_dictionary_lookup`
   - `report_diagnosis_candidate`

2. 工具选择不能只靠关键词
   用户说“回收”“回本”“ROI”“累计 ROI”必须优先进入 ROI 报表；用户说“小时”“实时”“截至 15 点”必须进入小时报表；用户说“次留”“7 留”“注册留存”必须进入留存报表。

3. 问数转诊断要有路由分叉
   “ROI 多少”是查数；“为什么 ROI 下降”是先查数再进入诊断候选。系统必须保留查询证据，并建议继续查媒体、团队、应用类型、素材、账号或采集质量。

### 5.2 Slot 解析与补参需求

1. 项目解析必须优先于工具入参
   MCP 要 `appId`，用户可能给项目名、游戏名、简称、应用名或 appId。Chat 必须调用项目 / 应用列表能力做唯一匹配，多候选时追问，不能默认使用右上角项目。

2. 日期解析必须结构化
   “昨天”“近 7 天”“上周”“本月”“二月”“5.1-5.7”“截至 15 点”都必须转成明确 `startDate`、`endDate`、`timeType`、必要时 `dh`。无效日期必须阻断。

3. 字典 slot 必须先查字典再填 ID
   媒体、终端、团队、应用类型、账户、包体、优化师等字段不能把中文名直接塞给报表 tool。必须先通过对应 `get_dict_zt_*` tool 解析到 MCP 可识别值。

4. 不确定口径必须追问
   例如 ROI 的 `dataType` 是区间还是累计，留存的 `retentionType` 是设备留存、注册留存还是首日付费账号留存；无法从语义和上下文判断时必须追问。

### 5.3 Schema Adapter 需求

1. `timeType` 适配
   日报、周报、月报分别映射 `DAY`、`NATURAL_WEEK`、`NATURAL_MONTH`。

2. `promotionSource` 适配
   广告量、不含自然量、广告量+自然量、单独自然量必须按 MCP 描述映射，不能用自然语言字段传入。

3. `subGroup` 适配
   “按媒体拆”“按团队拆”“按应用类型拆”“媒体+团队”“媒体+应用类型”必须映射为 tool 支持的 `subGroup` 值。未明确拆分时不要乱传。

4. 小时报表口径适配
   `EVENT_TIME` 返回当日累计结果，回答时不能再次累加；`REGISTER_TIME` 是按时段新增用户口径，必须在回答中说明。

### 5.4 编排后处理需求

1. 排序和 TopN
   “最高”“最低”“Top3”“哪个最好”应基于 rows 做排序，并展示排序指标、口径和范围。

2. 对比和差异
   “高多少”“差多少”“环比”“同期”必须计算差值、比例、基准期和对比期。

3. 总计与明细核对
   当用户要求核对总计与媒体 / 团队 / 应用类型明细时，Orchestrator 必须计算汇总差异，并说明可能原因。

4. 条件分支
   “如果 ROI 低于 20% 再查苹果广告”这类问题必须分两段执行，第一段查数，第二段根据结果判断是否继续，条件和执行结果写 Trace。

### 5.5 结果解释与 UI 需求

1. 结果不是纯文本
   成功结果必须输出结构化表格、关键指标摘要、可选图表 `viz_spec`、筛选条件、数据来源和更新时间。

2. 指标口径必须可见
   ROI、留存、折后消耗、转化率等指标必须展示内部口径来源；内部口径缺失时可以解释缺口，但不能编造。

3. 下一步建议必须基于结果状态
   空结果、异常波动、维度缺失、权限不足、超时、解析失败分别给不同建议，不能模板化输出。

4. 保存和资产化入口必须状态化
   一次查询默认不入资产；用户保存后才入资产；定时任务产物默认入资产；资产展示按项目权限动态过滤。

### 5.6 失败闭环需求

1. 能力不可用要定位原因
   必须区分 MCP 未配置、endpoint 不通、tool 未发现、权限失败、入参不匹配、返回为空、返回结构变化、解析失败。

2. 多轮追问后仍不能完成要生成 Case
   不应过早兜底。先继续追问确认；多轮仍不能执行或用户无法提供必要信息，再生成 Case 并告知等待处理。

3. 失败也要沉淀证据
   失败 case 至少记录用户问题、候选能力、缺失 slot、已调用 tool、错误码、返回摘要和建议处理人。

### 5.7 评测与验收需求

1. 问数测试集不只测最终回答
   每条用例必须验收：意图、项目解析、slot、字典调用、tool 选择、真实调用、结果解析、后处理、UI 契约、Trace。

2. 失败分类必须结构化
   用例失败要分类为：

   - `route_error`
   - `slot_error`
   - `dictionary_error`
   - `tool_selection_error`
   - `mcp_call_error`
   - `result_parse_error`
   - `postprocess_error`
   - `ui_contract_error`
   - `permission_error`
   - `data_empty_or_unavailable`

3. 连弩 Trace 必须能回放证据
   小乔后台不做评测平台，但必须把 trace、输入、输出、工具调用和证据规则发到连弩。

## 6. 当前能力发现为什么还不算闭环

代码层事实：

- `mcp-discovery.ts` 支持 MCP `initialize`、`tools/list`、`tools/call`。
- `mcp-server-store.ts` 能合并内置 MCP 与运行态 MCP。
- `report-query-policy-store.ts` 已有 `business_report`、`media_dictionary`、`terminal_dictionary`、`project_lookup`、`knowledge_fallback` 能力配置。
- `report-query-orchestrator.ts` 已有 `selectReportTool`、`findToolByKeywords`、`buildCapabilityPreflight`、`callConfiguredMcpTool`。
- `report-capability-manifest.ts` 已能从运行态 MCP 工具生成问数能力清单，并支持 `report-capability-overrides.json` 做人工覆盖。
- 后台 MCP 配置页已展示问数能力发现摘要，管理接口已提供 `GET /api/xiaoqiao/admin/report-capability-manifest` 和 `GET/PUT /api/xiaoqiao/admin/report-capability-overrides`。

未闭环点：

1. 能力事实来源不稳定
   当前路由选择主要依赖运行态已保存 tools 和关键词命中。若 MCP 新披露 tool 但没有保存到运行态配置，Chat 不会自然知道。

2. 关键词规则不是 schema 理解
   `selectReportTool` 只基于 tool 名称、描述和关键词评分，不会完整理解 tool 的 `required`、`properties`、枚举、互斥字段和字段适用条件。

3. 报表能力矩阵已具备运行态生成，但仍需治理化
   当前已有独立的 `ReportCapabilityManifest` 和后台摘要展示，可以审计“为什么某个问题能执行 / 不能执行 / 需要追问”。后续仍需补可编辑表单、灰度发布、版本差异和回滚。

4. 字典能力与报表 tool 没有形成强依赖链
   报表 tool 描述要求先调媒体、终端、团队、应用类型字典，但当前 policy 只是配置了 dictionary capability，仍需明确每类 slot 对应哪个字典 tool。

5. 测试集没有逐条映射到能力归属
   现在只能说 P0 用例要通过，不能审计每条失败是 MCP 缺口、Chat 补参缺口、后处理缺口、UI 缺口还是权限 / 数据问题。

6. 运行态 MCP 配置存在命名和工具不一致
   例如 `mcp-tracking-link` 当前工具列表表现为智投配置类工具，需要清理来源和覆盖规则，否则能力发现会污染路由判断。

## 7. 能力发现产品化方案

### 7.0 规则归属边界

问数系统不能把所有判断都写死在代码里，也不能把所有判断都交给大模型或知识库。各类规则必须按事实来源分层。

必须写进代码的内容：

- 执行链路不变量：路由、能力发现、项目权限、slot 补齐、真实调用、结果解析、Evidence、Trace、失败闭环的顺序。
- 安全红线：不能编造数据、不能绕过项目权限、不能用顶部项目覆盖用户明示项目、不能在 MCP 未调用成功时输出完成口吻。
- 类型和状态枚举：失败分类、Trace 事件类型、结果状态、资产状态、tool 调用状态。
- Schema 校验和防御逻辑：必填字段检查、返回结构校验、错误码归类、空结果和解析失败处理。
- 测试门禁：测试集 tool mismatch、无 tool、P0 失败等必须使自动化检查失败。

应该做成动态配置的内容：

- 路由规则优先级、关键词、排除词、候选能力权重。
- 报表域到 tool 的映射 override。
- Manifest 人工覆盖项：tool 的报表域、字典依赖、路由词和临时禁用。
- 字段别名、媒体别名、终端别名、团队别名、应用类型别名。
- 默认值策略，例如默认时间、默认粒度、默认指标组合。
- Prompt 版本、追问话术、结果解释模板、失败文案。
- 灰度开关、测试集纳入范围、门禁阈值。

必须封装在 Tool / MCP / Skill 的内容：

- 真实数据查询：日报、周报、月报、小时报表、ROI、留存、素材等。
- 字典查询：项目 / 应用、媒体、终端、团队、应用类型、账号、包体、优化师。
- 业务动作：包状态、联调、上报检查、监测链接、归因配置、调度日志。
- 能力披露：tool name、description、input_schema、output_schema、错误码、权限失败结构。
- 可执行边界：哪些字段支持、哪些枚举可用、哪些组合维度可查，以 MCP schema 和接口返回为准。

应该放入知识库的内容：

- 业务术语解释、行业表达和内部表达的差异说明。
- 指标口径说明、公式来源、口径变更记录。
- SOP、排查手册、常见问题、历史 case 总结。
- 非执行型方法论和解释材料。
- 用于歧义消解的轻量术语背景，但不得覆盖 MCP schema 和权限事实。

不应放入知识库的内容：

- 项目权限、项目数据、报表结果、实时状态。
- 当前可执行 tool 清单和 tool schema 的唯一事实来源。
- 可以改变执行行为的硬规则，例如权限放行、状态流转、失败分类。

Prompt / 大模型只负责：

- 候选意图判断。
- 自然语言到结构化 slot 的候选抽取。
- 追问表达。
- 对结构化结果做解释和摘要。
- 生成下一步建议。

Prompt / 大模型不得负责：

- 决定某个能力是否真实存在。
- 绕过能力发现和权限。
- 生成真实业务数据。
- 覆盖 MCP schema、接口错误码和项目权限事实。

### 7.1 生成 `ReportCapabilityManifest`

每次 MCP 配置变更、tools/list 成功、管理员手动刷新后生成：

```ts
type ReportCapabilityManifest = {
  manifest_version: string
  generated_at: string
  server_id: string
  server_name: string
  endpoint_status: 'connected' | 'disconnected'
  tools: ReportToolCapability[]
  dictionary_tools: DictionaryToolCapability[]
  warnings: CapabilityWarning[]
}

type ReportToolCapability = {
  tool_name: string
  report_domains: Array<'daily' | 'weekly' | 'monthly' | 'hourly' | 'roi' | 'retention' | 'material' | 'natural' | 'media'>
  required_fields: string[]
  optional_fields: string[]
  supported_granularity: Array<'hour' | 'day' | 'natural_week' | 'natural_month'>
  supported_dimensions: string[]
  required_dictionary_tools: string[]
  route_terms: string[]
  confidence: 'schema_confirmed' | 'description_inferred' | 'manual_override'
}
```

### 7.2 能力发现执行顺序

1. 加载运行态 MCP server / tool。
2. 对 connected endpoint 定期执行 MCP `tools/list` 刷新。
3. 加载 `report-capability-overrides.json`，对自动推断的报表域、字典依赖和路由词做人工覆盖。
4. 生成 `ReportCapabilityManifest`。
5. 用户发问后先做业务术语归一化和项目上下文编译。
6. 根据 manifest 选候选能力，不直接根据关键词选择最终 tool。
7. 检查 required fields、dictionary dependency、权限和项目范围。
8. 可执行则补参并调用；不可执行则只追问会改变执行结果的字段。
9. 执行后写入 Trace：manifest 版本、候选 tool、选择原因、补参来源、调用结果。

### 7.3 测试集归属输出

每条测试用例需要形成一条归属记录：

```ts
type ReportTestCaseCapabilityMapping = {
  case_id: string
  user_question: string
  expected_intent: 'report_query' | 'report_diagnosis' | 'general_explain'
  required_capabilities: string[]
  expected_tool?: string
  ownership: Array<'mcp_native' | 'chat_mapping_required' | 'orchestrator_postprocess' | 'ui_required' | 'unknown_or_gap'>
  required_slots: string[]
  dictionary_tools: string[]
  postprocess: string[]
  ui_contract: string[]
  current_status: 'covered' | 'partial' | 'blocked' | 'unknown'
  failure_reason?: string
}
```

### 7.4 路由前受控术语索引

术语归一化不直接走完整 RAG。当前设计采用轻量 `ControlledGlossaryIndex`：

- 来源：专用受控术语知识库的结构化 JSON，同步到运行态索引；服务启动时加载，管理员可手动刷新。
- 作用：把内部专业表达、行业表达、简称和历史叫法归一为可路由信号。例如“首日付费账号留存”归一时补充“留存”，让问题优先进入留存报表，而不是被“首日”误导到 ROI。
- 边界：索引只增强路由和 slot 候选，不生成执行事实，不覆盖用户原文，不绕过 MCP schema、项目权限和字典 tool。
- 匹配：exact / alias / priority 规则优先；P0 不使用向量召回或大模型生成术语事实。
- 证据：每次命中的 `term_id`、alias、canonical、source 和 `index_version` 必须进入 Trace。

工程上已新增 `controlled-glossary-index.ts`，先支持运行态 JSON 和内置 seed；后续接入知识库同步任务时只替换索引生成来源，不改变路由使用方式。

当前同步落地方式：

- 运行态配置新增 `controlledGlossaryKnowledgeBaseId`，默认可回退使用通用 `knowledgeBaseDataset`。
- 后台接口 `GET /api/xiaoqiao/admin/controlled-glossary` 查看当前索引。
- 后台接口 `POST /api/xiaoqiao/admin/controlled-glossary` 从受控术语知识库检索结构化 JSON 并覆盖运行态索引。
- 同步只接受 JSON / fenced JSON；解析失败时不覆盖当前索引，避免把非结构化知识污染生产路由。

### 7.5 字典依赖解析落地边界

问数筛选字段分三层处理：

- 代码固定执行顺序：先确认项目 / appId，再按已命中的筛选项调用对应字典 tool，最后把字典 id 回填到报表 tool 入参。
- 动态配置负责“自然语言到筛选项”的别名：媒体、终端、团队、应用类型、账户、包体、优化师都应来自 `report-query-policy.json` 的 alias 或受控术语同步结果。
- MCP 负责返回真实可用值：`get_dict_zt_label_team`、`get_dict_zt_app_package_type`、`get_dict_zt_account`、`get_dict_zt_rpt_package`、`get_dict_zt_optimizer` 等是可执行事实来源。

本轮已把团队、应用类型、账户、包体、优化师接入预检、真实字典调用、结果回填和 Trace。暂不在代码里硬猜任意团队名、账户名或优化师名，避免把普通中文短语错误当成筛选条件。后续要补的是后台 alias 配置、知识库术语到策略的同步、以及真实返回字段样本的 id/name 映射校验。

## 8. 工程修改项

P0 必做：

- 新增能力清单生成脚本或服务：读取当前 MCP 配置和 `tools/list` 结果，输出 `ReportCapabilityManifest`。
- 在后台 MCP 管理页展示能力清单，而不是只展示 server / tool 原始列表。
- 新增 `report-capability-overrides.json` 运行时配置和后台 `GET/PUT` 接口，用于覆盖 tool 报表域、字典依赖和路由词；所有修改写入操作日志。
- `report-query-orchestrator` 改为优先基于 manifest 选择能力，再落到 tool selection rule。
- `report-query-orchestrator` 输出 `ReportQueryPlan`，记录原始问题、归一化问题、子查询、待补 slot、候选 tool、证据 refs 和执行状态；当同一问题明确涉及多个报表域时，按 `ReportQueryPlan` 串行执行多个报表 tool。
- 增加 slot 到字典 tool 的映射：媒体、终端、团队、应用类型、账户、包体、优化师。
- 把问数测试集转换为 `ReportTestCaseCapabilityMapping`，先跑归属覆盖，再跑真实调用自测。
- Trace 增加 `manifest_version`、`capability_id`、`candidate_tools`、`selected_tool`、`selection_reason`、`dictionary_calls`。
- Trace 增加 `glossary.index_version`、命中的受控术语和归一化后的路由文本。
- 连弩 Chat Trace 输出 `query_plan`、`preflight`、`resolved_filters`、`tool_chain`、`failure_case_id`，用于回放问数链路和失败闭环证据。
- 新增受控 `ReportAnswerComposer`：回答只读取结构化结果、`ReportQueryPlan`、Evidence、质量检查和下一步建议；不得基于模型自由补数或隐藏失败项。
- 问数硬失败或缺能力时自动生成失败 Case 到需求池；普通缺用户字段保持追问，不提前兜底。
- 清理运行态 MCP 配置中名称和工具列表不一致的问题，尤其是 `mcp-tracking-link`。
- 补齐从测试集反推的路由细分、slot 解析、schema adapter、后处理、UI 契约、失败闭环和连弩评测字段。

P1 增强：

- 对 `input_schema` 增加枚举、互斥字段、条件字段和默认值解释层。
- 对工具描述做结构化抽取，减少靠关键词命中的不稳定性。
- 支持管理员对能力归属做人工 override，但 override 必须保留审计记录。
- 在连弩测试平台回传每条用例的能力归属、工具调用和失败分类。

## 9. 当前结论

本轮纠偏后的判断：

- MCP 能力发现不是完全没生效，代码和运行态都有基础。
- 问数核心 MCP 不是缺失，运行态 `报表MCP` 已披露完整的一批 P0 工具。
- 当前真正缺的是“已披露 MCP 能力到 Chat 产品闭环”的中间层：能力矩阵、路由映射、slot 字典依赖、schema adapter、后处理、Evidence、UI 和测试集逐条归属。
- 后续需求和工程清单必须基于能力归属矩阵推进，禁止用笼统的“补齐问数能力”替代具体责任拆分。
