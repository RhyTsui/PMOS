---

# File: `CODEX_CLI_IMPLEMENTATION_PROMPT.md`

# Codex CLI Implementation Prompt

请按照 `docs/architecture/02_ORCHESTRATION_LAYER_INDEX.md` 实施 Request Understanding & Capability Orchestration。

## 第一阶段：只做架构补齐，不改视觉

1. 将本包的 docs 和 frontend/src/src/contracts 文件合入项目。
2. 更新 `ENTERPRISE_AI_CHAT_OS_SPEC.md`，增加 `ENTERPRISE_AI_CHAT_OS_SPEC_ORCHESTRATION_PATCH.md` 中的总纲补丁。
3. 新增或对齐 `UserRequirementContract`、`CapabilityManifest`、`RoutingTrace` 类型真源。
4. 将 MCP tools 通过 `normalizeMcpToolToCapability()` 归一成 CapabilityManifest。
5. 将现有 `intent-router.ts` 输出升级为 `UserRequirementContract`，不要只输出 intent string。
6. 将 `report-query-orchestrator.ts` 中的工具选择改为 `selectCapability(requirement, capabilities)`。
7. 禁止在 router、orchestrator、prompt 中写死 `素材 -> get_zt_ad_mat_report`。
8. 当 `requestedSubject = material` 且 `requiredDatasetAuthority = material-performance` 时，素材能力应作为 primary；日报能力只能作为 fallback。
9. fallback 必须写入 RoutingTrace，并在 SemanticResultContract 的 warnings/sourceRefs/evidenceRefs 中披露。
10. 将工具输出通过 Result Assembly 进入 SemanticResultContract，不得直接渲染旧私有 schema。
11. 增加 golden tests：
    - “看下素材数据”不得 primary 调用 account daily report。
    - “近30天素材消耗和ROI趋势”必须选择 material-performance capability。
    - “今天大盘日报”必须选择 account daily report capability。
    - 素材能力不可用时允许 fallback，但必须 disclosure。
12. 接入 `scripts/guardrails/check-routing-governance.ts`。

## 禁止实现方式

```txt
if (query.includes("素材")) return "get_zt_ad_mat_report"
```

正确实现方式：

```txt
用户请求 -> UserRequirementContract -> CapabilityManifest -> SelectionPolicy -> RoutingTrace -> ToolInvocationPlan
```


---

# File: `README.md`

# AI Chat OS Orchestration Layer Pack

Version: 1.0  
Date: 2026-05-28  
Target project: Enterprise AI Chat OS

本包用于补齐 `ENTERPRISE_AI_CHAT_OS_SPEC.md` 在“用户请求如何被理解、能力如何被选择、MCP 工具如何被治理、结果如何被组装、路由如何被观测”方面的系统化架构缺口。

本包不是新的平行总纲，也不替代 Unified Semantic Contract / Runtime Display Protocol / Execution Layer。它是 Enterprise AI Chat OS 下的 **Request Understanding & Capability Orchestration** 补充层。

## 建议放置路径

```txt
docs/architecture/
├─ 02_ORCHESTRATION_LAYER_INDEX.md
├─ ENTERPRISE_AI_CHAT_OS_SPEC_ORCHESTRATION_PATCH.md
├─ request-understanding/
├─ capability-orchestration/
├─ business-semantics/
├─ context-memory/
├─ mcp-governance/
├─ result-assembly/
├─ observability/
└─ prompting/

frontend/src/src/contracts/
├─ request-understanding/
├─ capability/
├─ business-semantics/
├─ context-memory/
├─ mcp/
├─ result-assembly/
└─ __tests__/

scripts/guardrails/
└─ check-routing-governance.ts
```

## 第一轮实施目标

```txt
1. 将 MCP tool 归一为 CapabilityManifest。
2. 将用户问题解析为 UserRequirementContract，而不是只解析 intent。
3. 用 CapabilitySelectionPolicy 选择能力，禁止 LLM 直接自由选择最终 tool。
4. 将素材数据 / 素材趋势 / 素材表现类问题优先匹配 material-performance 权威能力。
5. 泛化日报能力只能作为 fallback，并必须产生 disclosure。
6. 所有路由决策必须输出 RoutingTrace。
7. 工具执行结果必须通过 Result Assembly 进入 SemanticResultContract。
8. 增加 golden routing tests 防止素材问题再次被日报抢走。
```

## 和已有三层规范的关系

```txt
ENTERPRISE_AI_CHAT_OS_SPEC.md
  = 顶层总纲，定义系统边界和原则

00_SPEC_INDEX.md
  = 二级规范索引，定义各子系统入口

01_EXECUTION_LAYER_INDEX.md
  = 执行层，定义 validator / adapter / registry / golden / guardrail / observability

02_ORCHESTRATION_LAYER_INDEX.md
  = 请求理解与能力编排层，定义 intent / slots / capability / MCP / routing / result assembly
```

## 禁止事项

```txt
1. 禁止通过 query.includes("素材") 直接绑定 get_zt_ad_mat_report。
2. 禁止在 prompt 中硬写“素材问题必须调用某个 toolName”。
3. 禁止让日报、素材、ROI 等工具只凭 LLM 自由竞争。
4. 禁止让旧 ResponseContract / ReportQueryViewModel / MetricExplainerUISchema 继续作为最终渲染协议。
5. 禁止 MCP tool 未经过 CapabilityManifest 归一化就进入选择。
6. 禁止 fallback 后不向用户披露数据来源和能力降级。
```


---

# File: `docs/architecture/02_ORCHESTRATION_LAYER_INDEX.md`

# 02 Orchestration Layer Index

本索引用于补齐 Enterprise AI Chat OS 的“请求理解与能力编排”层。该层回答：

```txt
用户说了什么？
用户真正需要什么业务能力？
系统应该调用哪个能力？
MCP tool 如何被治理？
能力选择是否可解释、可回放、可测试？
工具结果如何进入 SemanticResultContract？
```

## 一、定位

Orchestration Layer 不属于 Unified Semantic Contract，也不属于 Data Visualization UX。它位于用户输入之后、Runtime 执行之前：

```txt
User Message
  ↓
Request Understanding System
  ↓
Capability Orchestration System
  ↓
Runtime / Tool Invocation
  ↓
Result Assembly
  ↓
Unified Semantic Contract
  ↓
Component Registry
  ↓
Frontend Rendering
```

## 二、目录

### 1. Request Understanding System

- `request-understanding/request-understanding-system.md`
- `request-understanding/intent-governance.md`
- `request-understanding/user-requirement-contract.md`
- `request-understanding/slot-schema.md`
- `request-understanding/dictionary-resolution.md`
- `request-understanding/ambiguity-clarification-policy.md`
- `request-understanding/golden-intent-cases.md`

### 2. Capability Orchestration System

- `capability-orchestration/capability-orchestration-system.md`
- `capability-orchestration/capability-manifest.md`
- `capability-orchestration/mcp-tool-normalization.md`
- `capability-orchestration/capability-selection-policy.md`
- `capability-orchestration/fallback-policy.md`
- `capability-orchestration/permission-cost-freshness-policy.md`
- `capability-orchestration/routing-trace.md`

### 3. Business Semantic Layer

- `business-semantics/business-semantic-layer.md`
- `business-semantics/metric-catalog.md`
- `business-semantics/dimension-catalog.md`
- `business-semantics/entity-catalog.md`
- `business-semantics/dataset-authority.md`
- `business-semantics/date-granularity-rules.md`
- `business-semantics/advertising-domain-semantics.md`

### 4. Context & Memory System

- `context-memory/conversation-context-system.md`
- `context-memory/follow-up-resolution.md`
- `context-memory/context-carryover-policy.md`
- `context-memory/context-expiry-policy.md`

### 5. MCP Governance

- `mcp-governance/mcp-tool-governance.md`
- `mcp-governance/tool-onboarding-checklist.md`
- `mcp-governance/tool-capability-normalization.md`
- `mcp-governance/tool-output-adapter-policy.md`
- `mcp-governance/tool-versioning.md`
- `mcp-governance/tool-deprecation-policy.md`

### 6. Result Assembly System

- `result-assembly/result-assembly-system.md`
- `result-assembly/tool-result-to-semantic-result.md`
- `result-assembly/partial-result-policy.md`
- `result-assembly/insufficient-data-policy.md`
- `result-assembly/multi-tool-result-merge.md`
- `result-assembly/result-quality-policy.md`

### 7. Observability & Evaluation

- `observability/routing-trace.md`
- `observability/intent-evaluation.md`
- `observability/capability-selection-evaluation.md`
- `observability/regression-replay.md`

### 8. Prompt Governance

- `prompting/prompt-governance.md`
- `prompting/request-understanding-prompt-contract.md`
- `prompting/capability-selection-prompt-policy.md`
- `prompting/forbidden-prompt-patterns.md`

## 三、执行顺序

```txt
Phase 1: UserRequirementContract + Intent Governance
Phase 2: CapabilityManifest + MCP Tool Normalization
Phase 3: CapabilitySelectionPolicy + FallbackPolicy
Phase 4: RoutingTrace + Golden Routing Tests
Phase 5: ResultAssembly -> SemanticResultContract
Phase 6: Guardrails + Telemetry + Regression Replay
```

## 四、核心原则

```txt
1. Intent 是 Request Understanding System 的一部分，不是总纲之外的新体系。
2. MCP tool 不得直接进入最终选择，必须先归一化为 CapabilityManifest。
3. LLM 可以辅助理解用户需求，但不得自由选择最终 tool。
4. Capability Selection 必须受 subject、authority、coverage、permission、freshness、fallback policy 约束。
5. 结果展示必须进入 SemanticResultContract。
6. 执行过程必须进入 RuntimeDisplayProtocol。
7. 路由必须有 RoutingTrace，可回放、可验收、可调试。
```


---

# File: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC_ORCHESTRATION_PATCH.md`

# ENTERPRISE_AI_CHAT_OS_SPEC Orchestration Patch

本文是对 `ENTERPRISE_AI_CHAT_OS_SPEC.md` 的增量补丁建议，用于把 Request Understanding 与 Capability Orchestration 纳入总纲。

## 建议新增章节

```md
## Request Understanding & Capability Orchestration System

Enterprise AI Chat OS 不仅需要定义结果如何渲染，也必须定义用户请求如何被理解、能力如何被选择、MCP 工具如何被治理、路由如何被解释、工具结果如何进入统一语义契约。

该系统由以下子系统组成：

1. Request Understanding System  
   负责 intent、slot、entity、dictionary、ambiguity、clarification 和 UserRequirementContract。

2. Capability Orchestration System  
   负责 CapabilityManifest、MCP tool normalization、CapabilitySelectionPolicy、ToolInvocationPlan、FallbackPolicy 和 RoutingTrace。

3. Business Semantic Layer  
   负责 metric、dimension、business entity、dataset authority、date range、granularity、advertising domain semantics 的统一解释。

4. Context & Memory System  
   负责多轮对话中的主体、指标、时间范围、上一次能力、上一次结果和 follow-up 指代解析。

5. Result Assembly System  
   负责将 tool result、multi-tool result、partial result、insufficient data result 组装为 SemanticResultContract。

6. Observability & Evaluation System  
   负责 intent trace、capability routing trace、tool call trace、contract validation trace、golden tests 和 regression replay。

### 关键边界

- Intent 属于 Request Understanding System，不属于 Unified Semantic Contract。
- Capability Selection 属于 Capability Orchestration System，不属于 Data Visualization UX 或 Component Registry。
- MCP tool 必须先归一化为 CapabilityManifest，再进入能力选择。
- LLM 不得直接自由选择最终 tool。LLM 可以参与需求解析、候选解释和计划生成，但最终选择必须受 CapabilityManifest、SelectionPolicy、PermissionPolicy、FallbackPolicy 和 Runtime Validation 约束。
- 所有最终业务结果必须进入 SemanticResultContract。
- 所有执行过程必须进入 RuntimeDisplayProtocol。
- 所有路由决策必须产生 RoutingTrace，支持回放、调试和 golden tests。

### 禁止模式

- 禁止通过关键词硬编码绑定 toolName，例如 `if query includes 素材 then get_zt_ad_mat_report`。
- 禁止在 prompt 中硬写某类问题必须调用某个固定 toolName。
- 禁止让泛化日报能力与素材专用能力只凭 LLM 描述平级竞争。
- 禁止 fallback 后不披露降级原因、数据来源和证据。
- 禁止旧私有 schema 继续作为最终渲染协议。
```

## 和既有总纲关系

```txt
Unified Semantic Contract
  负责最终业务结果如何被前端自主渲染。

Runtime Display Protocol
  负责 AI / Agent / Tool / Workflow 执行过程如何展示。

Request Understanding System
  负责用户请求如何被结构化为 UserRequirementContract。

Capability Orchestration System
  负责能力如何被选择、工具如何被调用、fallback 如何披露。

Result Assembly System
  负责将工具输出转为 SemanticResultContract。
```


---

# File: `docs/architecture/business-semantics/advertising-domain-semantics.md`

# Advertising Domain Semantics

## 1. 广告域核心语义

```txt
大盘 = account-level summary
日报 = daily performance report，不等于 account subject 的绝对覆盖
素材 = material / creative asset
创意 = creative idea / content quality / material metadata
趋势 = time-series view
归因 = diagnosis / attribution
下钻 = drill_down action
```

## 2. 素材相关问题分类

```txt
素材数据 / 素材表现 / 素材消耗 / 素材 ROI
  -> material-performance

素材视频 / 图片画面 / 卖点 / 创意方向
  -> creative-quality

素材为什么下降 / 哪些素材拖累
  -> material-performance-diagnosis

素材导出
  -> export_result + material-performance
```

## 3. 日报相关问题分类

```txt
今天大盘怎么样 / 账户日报 / 整体投放表现
  -> account-daily-performance

近7天 ROI 趋势，未指定主体
  -> account-daily-performance，除非上下文 subject 已承接为 material/campaign
```

## 4. 上下文承接

如果上一轮用户已在看素材，下一轮说：

```txt
那 ROI 呢？
```

应继承：

```txt
requestedSubject = material
requestedView = trend 或 summary
metric = roi
```


---

# File: `docs/architecture/business-semantics/business-semantic-layer.md`

# Business Semantic Layer

## 1. 目标

Business Semantic Layer 统一业务词、指标、维度、实体、数据源权威性和时间粒度规则，防止不同模块对同一概念各自解释。

它是 Request Understanding、Capability Selection、Result Assembly 的共同基础。

## 2. 子模块

```txt
Metric Catalog
Dimension Catalog
Business Entity Catalog
Dataset Authority
Date / Granularity Rules
Advertising Domain Semantics
```

## 3. 核心原则

```txt
1. 业务术语必须映射到 canonical id。
2. 指标与维度必须有统一口径。
3. 数据源必须声明 authoritativeFor。
4. 业务主体必须明确层级关系。
5. 时间范围和粒度必须可校验。
6. 输出结论必须引用 sourceRefs / evidenceRefs。
```


---

# File: `docs/architecture/business-semantics/dataset-authority.md`

# Dataset Authority

## 1. 目标

定义哪个数据源对哪个业务问题具有权威性。

## 2. 结构

```ts
type DatasetAuthority = {
  authorityId: string
  datasetName: string
  authoritativeFor: string[]
  subjects: string[]
  metrics: string[]
  dimensions: string[]
  freshnessSla: string
  owner?: string
}
```

## 3. 推荐权威域

```txt
account-daily-performance       账户大盘日报
campaign-performance            计划表现
adgroup-performance             广告组表现
material-performance            素材表现
creative-quality                素材内容质量
roi-summary                     ROI 汇总
conversion-performance          转化表现
workflow-runtime                工作流执行状态
```

## 4. 规则

```txt
1. CapabilityManifest.authority.authoritativeFor 必须引用本表。
2. UserRequirement.requiredDatasetAuthority 必须引用本表。
3. 选择阶段以 authority 匹配作为高权重评分项。
4. fallback 到非权威数据源时必须披露。
```


---

# File: `docs/architecture/business-semantics/date-granularity-rules.md`

# Date & Granularity Rules

## 1. DateRangeSpec

```ts
type DateRangeSpec =
  | { type: 'relative'; value: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' }
  | { type: 'absolute'; start: string; end: string }
```

## 2. Granularity

```txt
hour
day
week
month
quarter
```

## 3. 默认规则

```txt
1. 未指定时间范围：数据查询默认 last_7_days，诊断默认 last_30_days。
2. 趋势查询必须有 dateRange。
3. dateRange <= 2 天且工具支持 hour 时可用 hour。
4. dateRange <= 90 天默认 day。
5. dateRange > 90 天可建议 week。
6. 趋势图至少需要 2 个日期点。
```

## 4. 不足数据规则

若 trend 数据点少于 2：

```txt
1. 不渲染折线趋势图。
2. 返回 insufficient-data region。
3. 可提供表格或单点指标卡。
4. 必须展示 dataCoverage。
```


---

# File: `docs/architecture/business-semantics/dimension-catalog.md`

# Dimension Catalog

## 1. 结构

```ts
type DimensionDefinition = {
  dimensionId: string
  label: string
  aliases: string[]
  level: 'time' | 'account' | 'campaign' | 'adgroup' | 'ad' | 'material' | 'creative' | 'product' | 'audience'
  compatibleMetrics: string[]
  compatibleSubjects: string[]
}
```

## 2. 推荐维度

```txt
date
hour
account
project
campaign
adgroup
ad
material
creative
media
terminal
app
product
audience
region
```

## 3. 规则

```txt
1. material 类请求应优先包含 material 或 creative 维度。
2. trend 请求必须包含 date 或 hour 维度。
3. ranking 请求必须包含排序维度和排序指标。
4. campaign/account 泛化维度不得替代 material 维度作为 primary 回答。
```


---

# File: `docs/architecture/business-semantics/entity-catalog.md`

# Entity Catalog

## 1. 业务实体层级

```txt
account
  └─ campaign
      └─ adgroup
          └─ ad
              └─ material / creative
```

## 2. BusinessSubject

```txt
account       大盘 / 账户整体
campaign      计划 / 活动
adgroup       广告组
ad            广告
material      素材 / 创意素材 / 图片素材 / 视频素材
creative      创意 / 创意方向 / 卖点
product       商品
audience      人群
```

## 3. 规则

```txt
1. 上层实体可以做聚合，但不能替代下层实体的明细能力。
2. 用户明确请求 material 时，不得自动改写为 account。
3. 用户说“大盘”时，默认 subject = account。
4. 用户说“素材内容/画面/视频/图片”时，优先 creative-quality，而不是 material-performance。
```


---

# File: `docs/architecture/business-semantics/metric-catalog.md`

# Metric Catalog

## 1. 结构

```ts
type MetricDefinition = {
  metricId: string
  label: string
  aliases: string[]
  description?: string
  valueType: 'number' | 'currency' | 'percentage' | 'ratio' | 'integer'
  unit?: string
  formula?: string
  higherIsBetter?: boolean
  compatibleSubjects: string[]
  compatibleDimensions: string[]
  requiredSourceAuthority?: string[]
}
```

## 2. 推荐指标

```txt
cost        消耗 / 花费 / spend
roi         ROI / 投产 / 投入产出
revenue     收入 / GMV
impression  展示
click       点击
ctr         点击率
conversion  转化
cvr         转化率
cpa         转化成本
ecpv        有效播放成本
material_count 素材数
```

## 3. 规则

```txt
1. 指标名必须 canonical 化。
2. 趋势类指标必须支持时间维度。
3. 计算指标必须记录 formula 和 source metrics。
4. 结论中使用派生指标时必须有 evidenceRefs。
```


---

# File: `docs/architecture/capability-orchestration/capability-manifest.md`

# Capability Manifest

## 1. 定位

CapabilityManifest 是 MCP tool、内部 API、Agent workflow、前端本地能力进入系统的统一能力声明。

所有工具必须先声明为 CapabilityManifest，才能参与能力选择。

## 2. TypeScript 结构

```ts
type CapabilityManifest = {
  capabilityId: string
  displayName: string
  description: string
  provider: 'mcp' | 'internal' | 'agent' | 'frontend'
  toolName?: string
  version: string

  capabilityType:
    | 'report.query'
    | 'report.trend'
    | 'material.analysis'
    | 'diagnosis'
    | 'attribution'
    | 'workflow.execution'
    | 'export'

  businessDomain: string
  subject: BusinessSubject

  supportedIntents: string[]
  supportedViews: string[]
  supportedMetrics: string[]
  supportedDimensions: string[]
  supportedGranularity: string[]

  authority: {
    sourceDataset: string
    authoritativeFor: string[]
    freshnessSla?: string
  }

  inputSchemaRef?: string
  outputSchemaRef?: string

  permissions?: {
    required: string[]
    optional?: string[]
  }

  fallback?: {
    isFallbackCapability: boolean
    fallbackFor?: string[]
    disclosureRequired: boolean
  }

  runtime?: {
    averageLatencyMs?: number
    costLevel?: 'low' | 'medium' | 'high'
    supportsStreaming?: boolean
  }

  lifecycle: {
    status: 'active' | 'deprecated' | 'experimental' | 'disabled'
    deprecatedBy?: string
  }
}
```

## 3. 素材报表能力示例

```json
{
  "capabilityId": "ad.material.performance.report",
  "displayName": "素材表现报表",
  "provider": "mcp",
  "toolName": "get_zt_ad_mat_report",
  "version": "1.0",
  "capabilityType": "report.query",
  "businessDomain": "advertising",
  "subject": "material",
  "supportedIntents": ["report_query", "trend_query", "performance_analysis"],
  "supportedViews": ["summary", "trend", "table", "chart", "ranking"],
  "supportedMetrics": ["cost", "roi", "ctr", "cvr", "impression", "click", "conversion"],
  "supportedDimensions": ["date", "material", "creative", "campaign"],
  "supportedGranularity": ["day", "week", "month"],
  "authority": {
    "sourceDataset": "zt_ad_mat_report",
    "authoritativeFor": ["material-performance"]
  },
  "fallback": {
    "isFallbackCapability": false,
    "disclosureRequired": false
  },
  "lifecycle": { "status": "active" }
}
```

## 4. 日报能力示例

```json
{
  "capabilityId": "ad.account.daily.report",
  "displayName": "账户大盘日报",
  "provider": "mcp",
  "toolName": "get_zt_ad_day_report",
  "version": "1.0",
  "capabilityType": "report.query",
  "businessDomain": "advertising",
  "subject": "account",
  "supportedIntents": ["report_query", "trend_query"],
  "supportedViews": ["summary", "trend", "table", "chart"],
  "supportedMetrics": ["cost", "roi", "ctr", "cvr", "impression", "click", "conversion"],
  "supportedDimensions": ["date", "account", "campaign"],
  "supportedGranularity": ["day", "week", "month"],
  "authority": {
    "sourceDataset": "zt_ad_day_report",
    "authoritativeFor": ["account-daily-performance"]
  },
  "fallback": {
    "isFallbackCapability": true,
    "fallbackFor": ["material-performance"],
    "disclosureRequired": true
  },
  "lifecycle": { "status": "active" }
}
```


---

# File: `docs/architecture/capability-orchestration/capability-orchestration-system.md`

# Capability Orchestration System

## 1. 目标

Capability Orchestration System 负责把 `UserRequirementContract` 转换为可执行的 `ToolInvocationPlan`。

它不依赖 LLM 自由选择工具，也不依赖关键词硬编码工具名，而是基于 CapabilityManifest 和 SelectionPolicy 进行能力选择。

## 2. 主链路

```txt
UserRequirementContract
  ↓
Candidate Capability Retrieval
  ↓
Hard Constraint Filtering
  ↓
Capability Scoring
  ↓
Fallback / Clarification Policy
  ↓
ToolInvocationPlan
  ↓
RuntimeDisplayProtocol
```

## 3. 核心对象

```txt
CapabilityManifest       能力声明
CapabilityCandidate      候选能力
CapabilityScore          能力评分
CapabilitySelectionTrace 选择过程
ToolInvocationPlan       工具调用计划
FallbackDecision         兜底决策
```

## 4. 硬约束

以下不满足时不得作为 primary capability：

```txt
subject coverage
metric coverage
dimension coverage
granularity coverage
permission coverage
dataset authority compatibility
input schema compatibility
runtime availability
```

## 5. 评分因素

```txt
specificity          主体特异性
sourceAuthority      数据源权威性
metricCoverage       指标覆盖
dimensionCoverage    维度覆盖
granularityCoverage  粒度覆盖
freshness            数据新鲜度
cost                 调用成本
latency              预估耗时
fallbackPenalty      兜底惩罚
riskPenalty          风险惩罚
```

## 6. 关键原则

```txt
1. 泛化能力不得在 primary 阶段击败更特异、更权威的能力。
2. fallback 只能在 primary 不可用、无权限、无数据、指标不支持时发生。
3. fallback 必须产生 disclosure，并写入 sourceRefs / evidenceRefs / warnings。
4. 每次选择必须生成 RoutingTrace。
5. 选择结果必须可测试、可回放、可解释。
```


---

# File: `docs/architecture/capability-orchestration/capability-selection-policy.md`

# Capability Selection Policy

## 1. 目标

选择最合适的 capability，而不是让 LLM 自由选 tool，也不是通过关键词绑定 tool。

## 2. Selection Pipeline

```txt
1. Retrieve candidates by businessDomain + intent + requestedSubject
2. Apply hard constraints
3. Score candidates
4. Detect ambiguity
5. Decide primary / fallback / clarification
6. Produce ToolInvocationPlan
7. Produce RoutingTrace
```

## 3. 硬约束

```txt
subjectCoverage >= required
metricCoverage >= required
viewCoverage >= required
granularityCoverage >= required
permissionAvailable = true
lifecycle.status = active
inputSchemaCompatible = true
```

## 4. 评分公式建议

```txt
score =
  specificity * 0.25 +
  authority * 0.25 +
  metricCoverage * 0.15 +
  dimensionCoverage * 0.10 +
  granularityCoverage * 0.10 +
  freshness * 0.05 +
  reliability * 0.05 -
  fallbackPenalty * 0.20 -
  riskPenalty * 0.10
```

## 5. 特异性规则

```txt
material > creative > ad > adgroup > campaign > account
```

当 requestedSubject = material 时，subject = account 的 capability 不得作为 primary，除非没有任何 material / creative / ad 级能力可用。

## 6. 数据权威性规则

当 `requiredDatasetAuthority` 包含某个领域时：

```txt
authoritativeFor 包含该领域的 capability 优先。
不包含该领域但可近似回答的 capability 只能作为 fallback。
```

## 7. 素材数据标准规则

```txt
当 UserRequirement.requestedSubject = material
且 requestedView 属于 summary / trend / table / chart / ranking / performance_analysis
且 requiredDatasetAuthority 包含 material-performance
系统必须优先选择：
  subject = material
  authority.authoritativeFor 包含 material-performance
  支持所需 metrics / dimensions / granularity
的 capability。

account / day-report / roi-summary 类泛化能力不得 primary 胜出。
```

## 8. Ambiguity Policy

当最高分与第二名差距低于阈值，且两个 capability 会产生不同业务含义时，应触发 clarification。

```txt
scoreGap < 0.08 -> clarify or ask user
```


---

# File: `docs/architecture/capability-orchestration/fallback-policy.md`

# Fallback Policy

## 1. 允许 fallback 的场景

```txt
1. primary capability 不存在。
2. primary capability 暂不可用。
3. 用户无权限使用 primary capability。
4. primary capability 不支持请求指标、维度或粒度。
5. primary capability 查询结果为空，但 fallback 可提供近似参考。
6. primary capability runtime error 且 fallback 被声明为安全替代。
```

## 2. 禁止 fallback 的场景

```txt
1. fallback 会改变业务主体但不披露。
2. fallback 会改变数据源权威性但不披露。
3. fallback 会导致结论误导。
4. 用户要求精确数据，fallback 只能近似。
5. 风险决策、预算调整、审批等高风险动作。
```

## 3. FallbackDisclosure

```ts
type FallbackDisclosure = {
  used: boolean
  originalRequiredAuthority: string[]
  fallbackCapabilityId: string
  reason:
    | 'primary_unavailable'
    | 'permission_denied'
    | 'metric_not_supported'
    | 'dimension_not_supported'
    | 'empty_result'
    | 'runtime_error'
  userMessage: string
  severity: 'info' | 'warning' | 'critical'
}
```

## 4. UI 披露要求

fallback 必须进入 SemanticResultContract：

```txt
warnings[]
sourceRefs[]
evidenceRefs[]
regions[].data.disclosure
```

示例用户文案：

```txt
当前未获取到素材专用数据，以下结果基于账户日报数据聚合，仅供趋势参考。
```

## 5. 素材 fallback 规则

```txt
material-performance -> account-daily-performance
只允许作为降级参考，不允许作为 primary。
必须披露“非素材专用数据源”。
```


---

# File: `docs/architecture/capability-orchestration/mcp-tool-normalization.md`

# MCP Tool Normalization

## 1. 目标

MCP 工具不能直接参与最终能力选择。所有 MCP tool 必须先被归一化为 CapabilityManifest。

```txt
MCP Tool Description
  ↓
Tool Capability Normalizer
  ↓
CapabilityManifest
  ↓
Capability Selection
```

## 2. 归一化输入

```ts
type McpToolDescriptor = {
  name: string
  description?: string
  inputSchema?: unknown
  outputSchema?: unknown
  annotations?: Record<string, unknown>
}
```

## 3. 归一化输出

```ts
type NormalizedMcpCapability = {
  manifest: CapabilityManifest
  normalizationTrace: {
    inferredSubject: string
    inferredMetrics: string[]
    inferredDimensions: string[]
    confidence: number
    warnings: string[]
  }
}
```

## 4. 归一化规则

```txt
1. tool name 只能作为弱信号，不能作为唯一判断依据。
2. tool description、input schema、output schema、已知数据源映射都必须参与归一化。
3. subject、authority、supportedMetrics、supportedDimensions 必须显式化。
4. 无法确定 authority 的工具只能作为 low-confidence capability，不得 primary 自动胜出。
5. fallback eligibility 必须显式声明。
```

## 5. 低质量描述处理

如果 MCP tool 描述过短或不明确，应进入人工补齐或配置覆盖：

```txt
capability-overrides.json
```

示例：

```json
{
  "get_zt_ad_mat_report": {
    "subject": "material",
    "authority": {
      "sourceDataset": "zt_ad_mat_report",
      "authoritativeFor": ["material-performance"]
    },
    "supportedDimensions": ["date", "material", "creative", "campaign"]
  }
}
```

这不是硬编码路由，而是工具元数据治理。


---

# File: `docs/architecture/capability-orchestration/permission-cost-freshness-policy.md`

# Permission / Cost / Freshness Policy

## 1. Permission Policy

能力选择必须先检查权限。

```txt
permission denied 的 capability 不得 primary 选中。
如果有可用 fallback，必须披露权限原因。
如果没有 fallback，返回权限申请 ActionContract。
```

## 2. Cost Policy

高成本 capability 不应默认调用，除非：

```txt
1. 用户明确要求深度分析。
2. 普通报表能力无法回答。
3. 需要多模态素材分析。
4. 已获得用户确认。
```

## 3. Freshness Policy

能力必须声明数据新鲜度：

```ts
freshnessSla: 'real_time' | 'hourly' | 'daily' | 'manual'
```

最终结果必须在 sourceRefs 或 dataCoverage 中展示数据时间。

## 4. 选择优先级

```txt
permission > authority > subject specificity > coverage > freshness > cost
```

权限不足时，不得为了得分选择无权限能力；应触发权限申请或 fallback。


---

# File: `docs/architecture/capability-orchestration/routing-trace.md`

# Routing Trace

## 1. 目标

RoutingTrace 用于记录请求理解和能力选择全过程，让系统可解释、可回放、可调试、可验收。

## 2. 结构

```ts
type RoutingTrace = {
  traceId: string
  requestId: string
  rawUserMessage: string
  createdAt: string

  requirement: UserRequirementContract

  intentDecision: {
    selectedIntent: string
    confidence: number
    rejectedIntents: Array<{
      intent: string
      confidence: number
      reason: string
    }>
  }

  slotResolution: Array<{
    slotId: string
    value: unknown
    source: 'message' | 'context' | 'default' | 'dictionary' | 'user_confirmation'
    confidence: number
  }>

  capabilityDecision: {
    selectedCapabilityId?: string
    selectedAs: 'primary' | 'fallback' | 'none'
    candidates: Array<{
      capabilityId: string
      score: number
      accepted: boolean
      rejectedByHardConstraint?: string[]
      reasons: string[]
    }>
  }

  fallback?: FallbackDisclosure
  clarification?: ClarificationRequest

  finalDecision:
    | 'invoke_tool'
    | 'ask_clarification'
    | 'permission_request'
    | 'return_no_capability'
}
```

## 3. 必填要求

```txt
1. 每一次工具调用前必须有 RoutingTrace。
2. 每一次 fallback 必须记录 fallback.reason。
3. 每一个被拒绝的候选 capability 必须记录 reasons。
4. 每一个低置信度 slot 必须记录 source 和 confidence。
5. RoutingTrace 必须能关联 RuntimeDisplayProtocol 与 SemanticResultContract。
```

## 4. 素材问题 trace 期望

输入：

```txt
近30天素材消耗和ROI趋势
```

期望：

```txt
selectedIntent = trend_query
requestedSubject = material
selectedCapabilityId = ad.material.performance.report
rejected account daily report reason = subject_mismatch / authority_mismatch / fallback_only
```


---

# File: `docs/architecture/context-memory/context-carryover-policy.md`

# Context Carryover Policy

## 1. 承接优先级

```txt
explicit user message > selected UI context > last active context > safe default
```

## 2. 冲突处理

如果用户当前消息和上下文冲突，以当前消息为准，并记录 trace。

示例：

```txt
上一轮 subject = material
本轮用户说“看大盘”
```

结果：

```txt
requestedSubject = account
contextCarryover = false
```

## 3. 安全规则

```txt
1. 高风险动作不可仅靠上下文承接执行。
2. 跨项目/账户上下文不可静默承接。
3. 时间范围超过过期策略时必须重新确认或默认。
4. 权限变化后上下文能力必须重新校验。
```


---

# File: `docs/architecture/context-memory/context-expiry-policy.md`

# Context Expiry Policy

## 1. 默认过期

```txt
activeRequirement: 30 minutes
selectedRows: 15 minutes
runtimeTrace: 24 hours
exportContext: 10 minutes
approvalContext: immediate confirmation required
```

## 2. 过期后处理

```txt
1. 不再自动承接。
2. 可以提示用户重新确认。
3. 不可基于过期上下文执行动作。
4. 可以保留 summary 作为解释背景，但不能作为工具输入真源。
```


---

# File: `docs/architecture/context-memory/conversation-context-system.md`

# Conversation Context System

## 1. 目标

多轮对话中，用户经常省略主体、时间、指标和对象。Context System 负责保存并安全承接这些信息。

## 2. Context Snapshot

```ts
type ConversationContextSnapshot = {
  conversationId: string
  lastRequirement?: UserRequirementContract
  lastSemanticResultId?: string
  lastRuntimeTraceId?: string
  activeSubject?: string
  activeMetrics?: string[]
  activeDimensions?: string[]
  activeDateRange?: DateRangeSpec
  activeGranularity?: string
  activeCapabilityId?: string
  activeDatasetAuthority?: string[]
  expiresAt?: string
}
```

## 3. 可承接字段

```txt
requestedSubject
metrics
dimensions
dateRange
granularity
filters
selected rows / selected materials
last capability
last dataset authority
```

## 4. 禁止承接字段

```txt
权限确认
高风险操作确认
过期数据源
已失效工具调用结果
敏感脱敏前数据
```


---

# File: `docs/architecture/context-memory/follow-up-resolution.md`

# Follow-up Resolution

## 1. 目标

解析“继续看”“那 ROI 呢”“换成近30天”“导出这个”等多轮省略表达。

## 2. 规则

```txt
1. 指标追问继承 subject / dateRange / filters。
2. 时间修改保留 subject / metrics / dimensions。
3. 展示方式修改只改变 requestedView / outputPreference。
4. 导出动作必须引用 lastSemanticResultId 或用户明确选择对象。
5. 如果上下文存在多个候选对象，必须澄清。
```

## 3. 示例

上一轮：

```txt
看下近7天素材表现
```

下一轮：

```txt
那 ROI 呢？
```

解析：

```json
{
  "intent": "report_query",
  "requestedSubject": "material",
  "metrics": ["roi"],
  "dateRange": { "type": "relative", "value": "last_7_days" },
  "contextRefs": [{ "type": "lastRequirement" }]
}
```


---

# File: `docs/architecture/mcp-governance/mcp-tool-governance.md`

# MCP Tool Governance

## 1. 目标

MCP 工具接入必须产品化治理，不能只依赖 tool name 和 description。

## 2. 接入流程

```txt
1. Discover MCP tool
2. Validate tool schema
3. Normalize to CapabilityManifest
4. Declare permission / cost / freshness / authority
5. Register output adapter
6. Add golden routing cases
7. Add telemetry and audit
8. Mark lifecycle status
```

## 3. 工具状态

```txt
experimental
active
deprecated
disabled
```

## 4. 禁止事项

```txt
1. 未声明 authority 的 MCP tool 不得 primary 参与业务问数。
2. 未声明 output adapter 的 MCP tool 不得进入 SemanticResultContract。
3. deprecated 工具不得被自动选择。
4. disabled 工具只能用于历史回放，不得调用。
```


---

# File: `docs/architecture/mcp-governance/tool-capability-normalization.md`

# Tool Capability Normalization

## 1. Tool Name 不是能力

工具名只是实现标识。能力必须通过 CapabilityManifest 表达。

```txt
get_zt_ad_mat_report
  -> capabilityId = ad.material.performance.report
  -> subject = material
  -> authoritativeFor = material-performance
```

## 2. Override 机制

对于描述不足的工具，可通过配置补充：

```txt
capability-overrides.json
```

但 override 只允许补工具元数据，不允许写路由规则。

允许：

```txt
get_zt_ad_mat_report.authority.authoritativeFor = material-performance
```

禁止：

```txt
if query contains 素材 then choose get_zt_ad_mat_report
```


---

# File: `docs/architecture/mcp-governance/tool-deprecation-policy.md`

# Tool Deprecation Policy

## 1. 生命周期

```txt
experimental -> active -> deprecated -> disabled
```

## 2. deprecated 规则

```txt
1. deprecated 工具不得作为 primary 自动选择。
2. 如果必须兼容历史流程，应通过 compatibility adapter。
3. 必须声明 deprecatedBy。
4. golden tests 不得依赖 deprecated 工具作为期望主路径。
```


---

# File: `docs/architecture/mcp-governance/tool-onboarding-checklist.md`

# Tool Onboarding Checklist

每个新 MCP tool 接入前必须完成：

```txt
[ ] tool name
[ ] description
[ ] input schema
[ ] output schema
[ ] businessDomain
[ ] subject
[ ] capabilityType
[ ] supportedIntents
[ ] supportedViews
[ ] supportedMetrics
[ ] supportedDimensions
[ ] supportedGranularity
[ ] authority.sourceDataset
[ ] authority.authoritativeFor
[ ] permissions
[ ] freshnessSla
[ ] output adapter
[ ] error mapping
[ ] fallback eligibility
[ ] golden routing tests
[ ] telemetry event mapping
[ ] lifecycle status
```


---

# File: `docs/architecture/mcp-governance/tool-output-adapter-policy.md`

# Tool Output Adapter Policy

## 1. 目标

工具输出不能直接渲染，必须通过 adapter 进入 Result Assembly，再生成 SemanticResultContract。

```txt
MCP Tool Result
  ↓
Tool Output Adapter
  ↓
NormalizedToolResult
  ↓
Result Assembly
  ↓
SemanticResultContract
```

## 2. Adapter 要求

```txt
1. 校验工具输出 schema。
2. 标准化字段名、指标、维度、时间。
3. 生成 dataCoverage。
4. 生成 sourceRefs。
5. 生成 evidenceRefs。
6. 标记 partial / insufficient / fallback。
7. 不直接返回 React component 或私有 UI schema。
```


---

# File: `docs/architecture/mcp-governance/tool-versioning.md`

# Tool Versioning

## 1. 版本字段

```txt
tool version
capability manifest version
input schema version
output schema version
adapter version
contract version
```

## 2. 兼容规则

```txt
1. output schema breaking change 必须升级 adapter。
2. deprecated tool 必须声明 replacement。
3. version mismatch 必须写入 telemetry。
4. 历史 trace 应保留调用时版本。
```


---

# File: `docs/architecture/observability/capability-selection-evaluation.md`

# Capability Selection Evaluation

## 1. 指标

```txt
primary_selection_accuracy
fallback_correctness
authority_match_rate
subject_match_rate
permission_block_rate
candidate_rejection_explainability
```

## 2. 关键验收

```txt
1. material-performance 请求不得 primary 选择 account-daily-performance。
2. fallback 必须有 disclosure。
3. 选择 trace 必须包含所有候选分数和拒绝原因。
4. 旧私有 schema 不得作为最终结果。
```


---

# File: `docs/architecture/observability/intent-evaluation.md`

# Intent Evaluation

## 1. 指标

```txt
intent_accuracy
subject_accuracy
slot_accuracy
clarification_rate
false_fallback_rate
material_to_daily_misroute_rate
```

## 2. Golden Set

必须覆盖：

```txt
素材数据
素材趋势
素材内容分析
素材表现诊断
大盘日报
ROI 趋势
计划表现
多轮追问
权限不足
能力不可用 fallback
```


---

# File: `docs/architecture/observability/regression-replay.md`

# Regression Replay

## 1. 目标

将历史错误路由、用户反馈、线上失败转化为可回放测试。

## 2. Replay 输入

```ts
type RoutingReplayCase = {
  caseId: string
  userMessage: string
  context?: ConversationContextSnapshot
  availableCapabilities: CapabilityManifest[]
  expectedRequirement?: Partial<UserRequirementContract>
  expectedCapabilityId?: string
  expectedFallback?: boolean
}
```

## 3. 必须回放的案例

```txt
素材数据被日报抢走
趋势单点被画折线
ROI 指标被当成 intent
日报词覆盖 material subject
多轮“那 ROI 呢”丢失上下文
```


---

# File: `docs/architecture/observability/routing-trace.md`

# Routing Trace Observability

## 1. 事件

```txt
request_understanding_started
request_understanding_completed
intent_selected
slot_resolved
capability_candidates_generated
capability_selected
fallback_used
clarification_requested
tool_invocation_planned
```

## 2. 必须关联 ID

```txt
requestId
traceId
conversationId
runtimeTraceId
semanticResultId
selectedCapabilityId
```

## 3. 素材误路由排查必须能回答

```txt
1. 用户需求是否解析出 requestedSubject = material？
2. requiredDatasetAuthority 是否是 material-performance？
3. material capability 是否在候选里？
4. 如果被拒绝，原因是什么？
5. 如果日报被选中，它是 primary 还是 fallback？
6. fallback disclosure 是否展示给用户？
```


---

# File: `docs/architecture/prompting/capability-selection-prompt-policy.md`

# Capability Selection Prompt Policy

## 1. LLM 的角色

LLM 可以辅助解释候选能力，但最终选择由系统评分策略决定。

允许：

```txt
解释 candidate A 为什么更匹配 material-performance。
解释 candidate B 为什么只是 fallback。
```

禁止：

```txt
直接输出 selectedToolName 并绕过评分。
```

## 2. 最终选择必须基于

```txt
CapabilityManifest
CapabilitySelectionPolicy
PermissionPolicy
FallbackPolicy
Runtime availability
```


---

# File: `docs/architecture/prompting/forbidden-prompt-patterns.md`

# Forbidden Prompt Patterns

禁止：

```txt
只要用户问素材，就调用 get_zt_ad_mat_report。
```

改为：

```txt
当 UserRequirement.requestedSubject = material 且 requiredDatasetAuthority 包含 material-performance 时，能力选择阶段应优先选择 subject=material 且 authoritativeFor 包含 material-performance 的 capability。
```

禁止：

```txt
让模型在所有 MCP tools 中自由选择最合适工具。
```

改为：

```txt
模型只输出 UserRequirementContract 草案，最终 tool selection 由 Capability Orchestration System 完成。
```


---

# File: `docs/architecture/prompting/prompt-governance.md`

# Prompt Governance

## 1. 定位

Prompt 可以辅助请求理解、候选解释和结果总结，但不得绕过系统化契约。

## 2. Prompt 可做

```txt
1. 从用户文本抽取 intent / slots / entities。
2. 生成 UserRequirementContract 草案。
3. 解释候选能力差异。
4. 生成最终自然语言 summary。
5. 基于 evidenceRefs 写可信洞察。
```

## 3. Prompt 不可做

```txt
1. 直接指定最终 toolName。
2. 绕过 CapabilitySelectionPolicy。
3. 绕过 PermissionPolicy。
4. 伪造 evidence/source。
5. 生成未通过 validation 的 SemanticResultContract。
```


---

# File: `docs/architecture/prompting/request-understanding-prompt-contract.md`

# Request Understanding Prompt Contract

## 1. 输出要求

请求理解 prompt 必须输出结构化字段：

```txt
intent
requestedSubject
requestedView
metrics
dimensions
dateRange
granularity
filters
confidence
ambiguity
clarificationQuestion
```

## 2. 禁止输出

```txt
toolName
React component
private schema
raw SQL
最终 UI 结构
```

## 3. 校验

Prompt 输出必须通过 `validateUserRequirementContract()`，否则进入 clarification 或 safe fallback。


---

# File: `docs/architecture/request-understanding/ambiguity-clarification-policy.md`

# Ambiguity & Clarification Policy

## 1. 何时认为有歧义

```txt
1. 多个 requestedSubject 置信度接近。
2. 用户缺少必要业务主体。
3. 用户请求执行型动作但缺少对象或时间。
4. 多个 capability 分数接近且输出含义不同。
5. 权限、数据源或粒度限制导致不能确定正确路径。
```

## 2. 何时必须澄清

```txt
1. 会改变数据源权威性的选择。
2. 会导致执行实际操作、审批、导出、预算调整。
3. 关键槽位无安全默认值。
4. 使用 fallback 会显著改变结论含义。
```

## 3. 何时可以默认

```txt
1. 用户未给时间范围，但业务有明确默认窗口，例如 last_7_days。
2. 用户未给展示形式，系统可同时给 summary + chart + table。
3. 用户未给排序，排名类问题可默认按核心指标降序。
```

## 4. ClarificationRequest

```ts
type ClarificationRequest = {
  reason: string
  question: string
  options?: Array<{
    label: string
    value: string
    resultingRequirementPatch?: Partial<UserRequirementContract>
  }>
  blocking: boolean
}
```

## 5. 示例

用户：

```txt
看下素材情况
```

如果上下文没有项目、时间范围、素材范围，系统可以问：

```txt
你想看素材的投放表现数据，还是想分析素材内容质量？
```

选项：

```txt
1. 素材表现数据：消耗、ROI、点击率、转化等
2. 素材内容分析：图片/视频创意、卖点、问题点等
```


---

# File: `docs/architecture/request-understanding/dictionary-resolution.md`

# Dictionary & Alias Resolution

## 1. 目标

统一业务术语、别名、缩写和同义词，避免不同模块对同一个词产生不同解释。

## 2. Dictionary Entry

```ts
type DictionaryEntry = {
  canonicalId: string
  canonicalName: string
  type: 'metric' | 'dimension' | 'entity' | 'subject' | 'intent' | 'dataset' | 'toolAlias'
  aliases: string[]
  deprecatedAliases?: string[]
  negativeAliases?: string[]
  domain?: string
  mapsTo?: {
    metricId?: string
    dimensionId?: string
    subject?: string
    datasetAuthority?: string
  }
}
```

## 3. 关键映射示例

```txt
素材 / 创意素材 / 视频素材 / 图片素材
  -> subject = material
  -> datasetAuthority = material-performance 或 creative-quality，视 taskType 而定

大盘 / 整体 / 账户整体
  -> subject = account
  -> datasetAuthority = account-daily-performance

日报 / 日报表 / 每日报告
  -> requestedView = summary 或 trend
  -> subject 需要结合上下文决定，不得默认抢占 material subject

ROI / 投产 / 投入产出
  -> metric = roi

消耗 / 花费 / cost / spend
  -> metric = cost
```

## 4. 排除规则

```txt
1. “素材”出现在“日报里的素材维度”时，仍应保留 material subject 候选。
2. “日报”不应自动覆盖 material subject。
3. “ROI”是 metric，不是 intent，不应把问题强行路由到 roi-summary capability。
4. “趋势”是 requestedView，不是 tool。
```


---

# File: `docs/architecture/request-understanding/golden-intent-cases.md`

# Golden Intent Cases

本文件定义请求理解层的回归用例。

## 1. 素材趋势

输入：

```txt
看下近30天素材消耗和ROI趋势
```

期望：

```json
{
  "intent": "trend_query",
  "requestedSubject": "material",
  "requestedView": "trend",
  "metrics": ["cost", "roi"],
  "granularity": "day",
  "requiredDatasetAuthority": ["material-performance"]
}
```

## 2. 大盘日报

输入：

```txt
今天大盘日报怎么样
```

期望：

```json
{
  "intent": "report_query",
  "requestedSubject": "account",
  "requestedView": "summary",
  "requiredDatasetAuthority": ["account-daily-performance"]
}
```

## 3. 素材内容分析

输入：

```txt
帮我分析一下这个视频素材的问题
```

期望：

```json
{
  "intent": "material_analysis",
  "requestedSubject": "material",
  "requestedView": "analysis",
  "businessDomain": "creative-quality"
}
```

## 4. 素材表现诊断

输入：

```txt
为什么这批素材 ROI 掉了
```

期望：

```json
{
  "intent": "diagnosis",
  "requestedSubject": "material",
  "requestedView": "diagnosis",
  "metrics": ["roi"],
  "requiredDatasetAuthority": ["material-performance"]
}
```


---

# File: `docs/architecture/request-understanding/intent-governance.md`

# Intent Governance

## 1. 定位

Intent 是用户请求的任务类型，不是最终工具，也不是最终 UI。Intent 只回答：

```txt
用户大概要做什么任务？
```

它必须继续通过 `UserRequirementContract` 补全业务主体、指标、维度、时间和输出偏好。

## 2. Intent 定义结构

```ts
type IntentDefinition = {
  intentId: string
  label: string
  description: string
  businessOwner?: string
  category:
    | 'report'
    | 'analysis'
    | 'diagnosis'
    | 'workflow'
    | 'creative'
    | 'configuration'
    | 'support'

  aliases: string[]
  negativeExamples: string[]
  requiredSlots: string[]
  optionalSlots: string[]

  defaultRequestedView?: string
  allowedRequestedSubjects?: string[]

  outputMapping: {
    defaultScreenType: string
    preferredRegionTypes: string[]
    preferredComponentBindings: string[]
  }

  capabilityHints?: {
    capabilityTypes: string[]
    forbiddenCapabilityTypes?: string[]
  }

  confidencePolicy: {
    minAccept: number
    askClarificationBelow: number
  }
}
```

## 3. 推荐 Intent 分类

```txt
report_query              数据查询
trend_query               趋势查询
performance_analysis      表现分析
diagnosis                 原因诊断 / 归因
comparison                对比分析
drill_down                下钻分析
material_analysis         素材内容分析
material_performance      素材表现分析
workflow_execution        执行工作流
task_schedule             创建定时任务
export_result             导出结果
permission_request        权限申请
help                      帮助 / 解释
```

## 4. 禁止规则

```txt
1. intent 不得直接等于 toolName。
2. intent 不得通过单关键词硬判。
3. intent 不得包含 UI 组件名称。
4. intent 不得绕过 UserRequirementContract 直接进入工具调用。
```

## 5. 素材类意图边界

### 素材数据类

```txt
用户表达：素材数据、素材消耗、素材 ROI、素材 CTR、素材趋势
输出：intent = report_query 或 trend_query
requestedSubject = material
businessDomain = material-performance
```

### 素材内容分析类

```txt
用户表达：分析这个视频、这个图片素材好不好、创意卖点
输出：intent = material_analysis
requestedSubject = material
businessDomain = creative-quality
```

### 素材表现诊断类

```txt
用户表达：为什么素材 ROI 掉了、哪些素材拖累账户
输出：intent = diagnosis
requestedSubject = material
businessDomain = material-performance-diagnosis
```


---

# File: `docs/architecture/request-understanding/request-understanding-system.md`

# Request Understanding System

## 1. 目标

Request Understanding System 负责把用户自然语言输入转换为稳定、可校验、可回放的 `UserRequirementContract`。

它不直接选择最终工具，也不直接生成最终 UI。它输出的是能力编排层需要的结构化需求。

```txt
User Message
  ↓
Request Understanding
  ↓
UserRequirementContract
  ↓
Capability Selection
```

## 2. 为什么不能只用 intent

单一 intent 只能说明“任务大类”，不足以决定能力选择。

例如：

```txt
看下近 30 天素材消耗和 ROI 趋势
```

如果只解析为：

```txt
intent = report_query
```

系统仍可能把它路由到 account daily report。

正确解析应包含：

```txt
intent = report_query
requestedSubject = material
requestedView = trend
metrics = cost, roi
dimensions = date, material
dateRange = last_30_days
granularity = day
requiredDatasetAuthority = material-performance
```

## 3. 子模块

```txt
Intent Governance
Slot Schema
Entity Resolution
Dictionary / Alias Resolution
Ambiguity Detection
Clarification Policy
Context Carryover
UserRequirementContract Validation
```

## 4. 输入

```ts
type RequestUnderstandingInput = {
  userMessage: string
  conversationContext?: ConversationContextSnapshot
  userProfile?: UserProfileSnapshot
  availableCapabilities?: CapabilityManifest[]
}
```

## 5. 输出

```ts
type RequestUnderstandingOutput = {
  requirement: UserRequirementContract
  trace: IntentDecisionTrace
  clarification?: ClarificationRequest
}
```

## 6. 原则

```txt
1. 先解析用户需求，再选择能力。
2. intent 不能替代 subject、view、metrics、dimensions、dateRange、granularity。
3. 同一句话可产生多个候选 intent，但必须输出 selectedIntent 与 rejectedIntents。
4. 低置信度或关键槽位缺失时，应触发 clarification，而不是错误调用工具。
5. 多轮追问必须通过 ConversationContext 解析省略项。
```


---

# File: `docs/architecture/request-understanding/slot-schema.md`

# Slot Schema

## 1. 定位

Slot 是用户需求中的参数化字段，用于填充 capability input schema 或后续 SemanticResultContract。

## 2. Slot 类型

```ts
type SlotSchema = {
  slotId: string
  slotType:
    | 'metric'
    | 'dimension'
    | 'entity'
    | 'dateRange'
    | 'granularity'
    | 'filter'
    | 'sort'
    | 'limit'
    | 'comparisonTarget'
    | 'outputFormat'

  required: boolean
  aliases: string[]
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object' | 'array'
  allowedValues?: string[]
  defaultValue?: unknown
  validation?: {
    min?: number
    max?: number
    regex?: string
  }
}
```

## 3. 广告场景推荐 Slots

```txt
metric: cost / roi / ctr / cvr / impression / click / conversion / revenue
dimension: date / account / campaign / adgroup / material / creative / product / media
entity: project / campaignName / materialName / app / team
dateRange: today / yesterday / last_7_days / last_30_days / custom
granularity: hour / day / week / month
filter: media / terminal / appType / campaignStatus / materialType
sort: metric + direction
limit: topN
```

## 4. 槽位缺失策略

```txt
1. 可安全默认的槽位：dateRange 可默认 last_7_days，limit 可默认 20。
2. 不可安全默认的槽位：project、account、核心业务主体、审批对象。
3. 趋势查询缺 granularity 时，dateRange <= 60 天默认 day。
4. 对比查询缺 comparisonTarget 时必须澄清。
5. 导出或执行型动作缺关键参数时必须二次确认。
```


---

# File: `docs/architecture/request-understanding/user-requirement-contract.md`

# UserRequirementContract

## 1. 定位

`UserRequirementContract` 是 Request Understanding System 的核心输出，是 Capability Orchestration System 的核心输入。

它不是 UI 契约，也不是 tool schema。它描述用户的业务需求。

## 2. TypeScript 结构

```ts
type UserRequirementContract = {
  contractVersion: string
  requestId: string
  rawUserMessage: string

  intent: IntentId
  taskType:
    | 'report_query'
    | 'trend_query'
    | 'analysis'
    | 'diagnosis'
    | 'comparison'
    | 'workflow_execution'
    | 'export'
    | 'configuration'

  businessDomain?: string
  requestedSubject?: BusinessSubject
  requestedView?: RequestedView

  metrics?: MetricRef[]
  dimensions?: DimensionRef[]
  filters?: FilterSpec[]

  dateRange?: DateRangeSpec
  granularity?: Granularity

  outputPreference?: OutputPreference

  requiredDatasetAuthority?: string[]
  requiredCapabilities?: string[]

  slots: SlotValue[]

  confidence: number
  ambiguity?: AmbiguityState
  clarification?: ClarificationRequest

  contextRefs?: ContextRef[]
  locale?: string
}
```

## 3. 核心字段说明

### requestedSubject

业务主体：

```txt
account
campaign
adgroup
ad
material
creative
product
audience
keyword
landing_page
```

### requestedView

用户期待的结果视图：

```txt
summary
trend
table
chart
comparison
diagnosis
attribution
ranking
breakdown
export
```

### requiredDatasetAuthority

能力选择阶段用于判断权威数据源：

```txt
account-daily-performance
campaign-performance
material-performance
creative-quality
roi-summary
conversion-performance
```

## 4. 示例：素材趋势

```json
{
  "contractVersion": "1.0",
  "requestId": "req_material_trend_001",
  "rawUserMessage": "看下近30天素材消耗和ROI趋势",
  "intent": "trend_query",
  "taskType": "trend_query",
  "businessDomain": "advertising",
  "requestedSubject": "material",
  "requestedView": "trend",
  "metrics": [
    { "metricId": "cost", "label": "消耗" },
    { "metricId": "roi", "label": "ROI" }
  ],
  "dimensions": [
    { "dimensionId": "date", "label": "日期" },
    { "dimensionId": "material", "label": "素材" }
  ],
  "dateRange": { "type": "relative", "value": "last_30_days" },
  "granularity": "day",
  "requiredDatasetAuthority": ["material-performance"],
  "slots": [],
  "confidence": 0.91
}
```

## 5. 校验规则

```txt
1. requestedView = trend 时必须有 dateRange 和 granularity。
2. requestedSubject = material 且 taskType 为 report/trend/analysis 时，应生成 requiredDatasetAuthority = material-performance。
3. requestedView = chart/trend 时必须至少包含一个 metric。
4. 关键槽位缺失时不得进入工具调用，除非存在安全默认值。
5. confidence < minAccept 时必须触发 clarification 或 fallback 到 explain-intent，不得错误调用工具。
```


---

# File: `docs/architecture/result-assembly/insufficient-data-policy.md`

# Insufficient Data Policy

## 1. 数据不足类型

```txt
empty_result
single_point_trend
missing_metric
missing_dimension
time_range_too_short
permission_limited
freshness_expired
```

## 2. 输出规则

```txt
1. 不得伪造趋势。
2. 不得把单点画成趋势图。
3. 应生成 insufficient-data region。
4. 应提供用户可执行的下一步 ActionContract。
```

## 3. 示例动作

```txt
扩大时间范围
更换指标
申请权限
查看明细表
重新查询
```


---

# File: `docs/architecture/result-assembly/multi-tool-result-merge.md`

# Multi-tool Result Merge

## 1. 目标

当一个问题需要多个能力组合时，统一合并结果、证据和来源。

## 2. 合并原则

```txt
1. 同指标同口径才可合并。
2. 不同数据源必须保留 SourceRef。
3. 不同时间新鲜度必须展示 freshness。
4. 结论必须引用对应 evidenceRefs。
5. 冲突数据不得静默覆盖。
```

## 3. 冲突处理

```txt
1. 标记 dataConflict。
2. 展示各来源数值。
3. 提供“查看来源差异”动作。
4. 不给出过度确定结论。
```


---

# File: `docs/architecture/result-assembly/partial-result-policy.md`

# Partial Result Policy

## 1. 何为部分成功

```txt
1. 多个工具调用中部分成功。
2. 部分指标缺失。
3. 部分维度不可用。
4. 部分时间段无数据。
5. fallback 提供了近似数据。
```

## 2. 展示规则

```txt
1. 不隐藏部分失败。
2. 可展示已成功结果。
3. 必须说明缺失部分。
4. 必须提供 retry / adjust query / permission request 等 ActionContract。
```


---

# File: `docs/architecture/result-assembly/result-assembly-system.md`

# Result Assembly System

## 1. 目标

Result Assembly System 将工具结果、运行结果、多工具结果、fallback 结果组装为 `SemanticResultContract`。

它是 Runtime 执行结果进入前端自主渲染的唯一出口。

```txt
Tool Results
  ↓
NormalizedToolResult
  ↓
Result Assembly
  ↓
SemanticResultContract
```

## 2. 输入

```ts
type ResultAssemblyInput = {
  requirement: UserRequirementContract
  routingTrace: RoutingTrace
  runtimeTraceId?: string
  toolResults: NormalizedToolResult[]
}
```

## 3. 输出

```ts
type ResultAssemblyOutput = {
  semanticResult: SemanticResultContract
  assemblyTrace: ResultAssemblyTrace
}
```

## 4. 核心原则

```txt
1. 工具结果不得直接作为最终 UI。
2. 多工具结果必须统一 sourceRefs / evidenceRefs。
3. fallback 必须生成 warning region 或 disclosure。
4. 数据不足必须生成 insufficient-data 结果，而不是错误画图。
5. 所有 action 必须走 ActionContract。
```


---

# File: `docs/architecture/result-assembly/result-quality-policy.md`

# Result Quality Policy

## 1. 质量维度

```txt
completeness    是否覆盖用户需求
accuracy        数据口径是否正确
freshness       数据是否新鲜
traceability    是否可追溯来源
actionability   是否有下一步动作
trustworthiness 是否有证据和置信度
```

## 2. 低质量结果处理

```txt
1. 缺 sourceRefs：不得展示为确定结论。
2. 缺 evidenceRefs：洞察降级为观察。
3. 数据过期：展示 freshness warning。
4. 权限不足：展示权限申请 action。
5. 置信度低：触发澄清或加风险提示。
```


---

# File: `docs/architecture/result-assembly/tool-result-to-semantic-result.md`

# Tool Result to SemanticResultContract

## 1. 映射流程

```txt
NormalizedToolResult
  -> summary region
  -> data-visualization region
  -> data-table region
  -> evidence-panel region
  -> source-list region
  -> next-actions region
```

## 2. 数据类结果默认 region

```txt
summary               markdown-result
metric overview        metric-card
time series            data-visualization
tabular data           data-table
evidence               evidence-panel
sources                source-list
actions                decision-card / action-list
```

## 3. 趋势结果校验

```txt
1. 至少 2 个时间点才生成 line chart。
2. 单点数据生成 metric-card + table。
3. 数据为空生成 insufficient-data。
4. dataCoverage 必填。
```

## 4. SourceRef 生成

每个工具结果必须生成 SourceRef：

```txt
sourceId
sourceType
datasetName
freshness
permissionVisibility
```

## 5. EvidenceRef 生成

每个结论、洞察、风险建议必须有 EvidenceRef。
