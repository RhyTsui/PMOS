# Codex CLI 可粘贴提示文档：AI 广告系统 UI Schema 强约束与反 Demo 规范

版本：2026-05-12

## 用途

这份文档用于解决你现在遇到的核心问题：本地 Codex CLI 在实现 UI 时缺少强 UISchema、组件注册表和业务信息架构约束，容易不断生成默认 demo 演示系统、平铺海报、Claude 风格卡片墙和通用 AI SaaS 首页。

把本文档中的「主提示词」整段粘贴给 Codex CLI，目标是让 Codex 在你的仓库里建立一套工程化约束：

- AGENTS.md
- UI_CONTRACT
- UI_SCHEMA_SPEC
- UI_PATTERNS
- Codex Skill
- UISchema 类型定义
- 组件 registry
- golden schema
- 反 demo lint 脚本

## 推荐使用方式

1. 在仓库根目录打开 Codex CLI。
2. 先粘贴下面的「主提示词」。
3. 等 Codex 完成后，再用「后续页面开发提示词」开发具体页面。
4. 如果它又生成 demo 风格，用「纠偏提示词」强制重做。

---

# 一、主提示词：第一次交给 Codex CLI

```text
你现在在一个 AI 广告系统仓库中工作。请严格按本提示执行。

# 背景

当前本地 UI Schema 能力太弱，导致你经常生成默认 demo 演示系统：平铺海报、Claude 风格卡片墙、渐变 AI SaaS 首页、功能展示页。这是错误方向。

本项目是游戏广告投放团队使用的 AI Copilot 工作台，不是通用演示系统。

产品正确形态：

- Web Copilot 作战台
- 手机端轻量预警与审批
- 后台 Agent / Workflow 编排
- 数据证据面板
- 归因诊断
- 素材疲劳分析
- 审批与审计闭环

# 硬性目标

请在当前仓库中建立一套 UI Schema 强约束系统，阻止后续 UI 继续产出 demo 风格。

你必须创建或更新以下文件：

- AGENTS.md
- docs/UI_CONTRACT.md
- docs/UI_SCHEMA_SPEC.md
- docs/UI_PATTERNS.md
- .codex/skills/ai-ad-ui/SKILL.md
- src/ui-schema/schema.ts
- src/ui-schema/registry.ts
- golden/campaign-diagnosis-workbench.schema.json
- scripts/check-ui-demo-patterns.ts

如果仓库已有同名或类似文件，先阅读并合并，不要粗暴覆盖业务代码。

# 禁止事项

禁止生成：

- landing page
- hero section
- poster card
- feature grid
- marketing CTA
- Claude-style flat card wall
- fake dashboard
- standalone demo app
- 无业务数据密度的 AI SaaS 模板
- 平铺 Agent 头像海报
- 大面积渐变背景
- 玻璃拟态

# 强制架构

AI 不直接自由设计页面。
AI 必须先生成或修改 UISchema。
UISchema 只能引用 registry 中声明的业务组件。
React 页面只能通过 schema renderer 或已有业务组件渲染。

# 先做仓库扫描

在修改前，请先检查：

- package.json
- 当前前端框架：Next.js / Vite / React / Vue / 其他
- src/app、src/pages、src/components、app、pages、components 是否存在
- 是否已有 schema、renderer、component registry
- 是否已有 lint、typecheck、test 脚本
- 是否使用 Tailwind、CSS Modules、shadcn/ui 或其他组件库

# 执行步骤

1. 创建文档约束：AGENTS.md、UI_CONTRACT、UI_SCHEMA_SPEC、UI_PATTERNS。
2. 创建 UISchema 类型定义：src/ui-schema/schema.ts。
3. 创建业务组件 registry：src/ui-schema/registry.ts。
4. 创建 golden schema：golden/campaign-diagnosis-workbench.schema.json。
5. 创建反 demo 检查脚本：scripts/check-ui-demo-patterns.ts。
6. 如果 package.json 存在，请尽量添加：
   - ui:lint
   - validate
7. 不要在本轮重写整个应用界面，除非仓库已经有明显 demo 页面需要替换。
8. 如果发现现有首页就是 demo 风格，请将它改成基于 campaign-diagnosis-workbench schema 的投放异常诊断工作台。

# 桌面端布局要求

必须优先使用三栏 command center：

- context rail：项目、渠道、日期、KPI、风险队列
- main：对话、Agent 诊断、建议动作
- evidence panel：数据证据、归因时间线、日志
- approval drawer：高风险动作审批

# 手机端布局要求

必须降级为 stacked decision flow：

- 风险摘要
- Agent 结论
- 关键证据
- 建议动作
- 批准 / 驳回 / 追问

# Agent 诊断内容要求

任何 Agent 诊断必须包含：

- summary
- causes
- confidence
- impact
- recommendedActions
- evidenceRefs

任何 recommendedAction 必须包含：

- actionType
- label
- riskLevel
- requiresApproval
- rollbackPlan
- auditRequired

涉及预算、暂停计划、切换回传事件、素材上线、品牌 KV 修改的动作，必须 requiresApproval=true。

# 完成后请输出

请最后用中文输出：

1. 你扫描到的仓库结构
2. 创建 / 修改了哪些文件
3. 是否发现现有 demo 风格 UI
4. 是否已建立 UISchema 强约束
5. 是否已添加 ui:lint / validate
6. 执行了哪些命令
7. 哪些地方因为项目现状无法完成

```

---

# 二、后续页面开发提示词

```text
Use the ai-ad-ui skill.

你不是在设计 demo 页面。
你是在已有 AI 广告数据产品中实现生产级 UI。

第一步只允许阅读：

- AGENTS.md
- docs/UI_CONTRACT.md
- docs/UI_SCHEMA_SPEC.md
- docs/UI_PATTERNS.md
- src/ui-schema/registry.ts
- golden/campaign-diagnosis-workbench.schema.json
- 当前页面相关代码

禁止：

- hero section
- poster card
- feature grid
- landing page
- Claude-style flat demo cards
- 大面积渐变
- 玻璃拟态
- mock marketing copy
- 自由新增布局

目标：实现 / 修改「{这里填页面名称}」。

要求：

1. 先输出 screenType、页面任务、信息优先级。
2. 先生成或修改 UISchema，不要直接写 React。
3. 只能使用 registry 中允许的业务组件。
4. 如果组件不足，先提出 component contract，不要自由造页面。
5. 桌面端必须是 command center 或诊断型二栏结构。
6. 移动端必须是 stacked decision flow。
7. Agent 结论必须包含 summary、causes、confidence、impact、recommendedActions、evidenceRefs。
8. 所有推荐动作必须有 riskLevel、requiresApproval、rollbackPlan、auditRequired。
9. 最后运行可用的 typecheck、lint、ui:lint 或 validate。

```

---

# 三、纠偏提示词：Codex 又产出 demo 风格时使用

```text
你刚才的产出仍然偏 demo / landing / Claude 风格卡片墙，请停止继续实现并回滚这部分 UI 方向。

请重新执行：

1. 阅读 AGENTS.md、docs/UI_CONTRACT.md、docs/UI_SCHEMA_SPEC.md、docs/UI_PATTERNS.md、src/ui-schema/registry.ts。
2. 删除或重构 hero、poster、feature grid、marketing card、gradient showcase 等结构。
3. 把页面改为广告投放 command center：context rail + main diagnosis + evidence panel + approval drawer。
4. 先输出 UISchema，再实现组件。
5. 任何卡片必须绑定真实业务语义：KPI、风险、诊断、证据、建议动作、审批或审计。
6. 不允许出现 Get Started、Explore Features、AI-powered platform、beautiful dashboard 等营销文案。
7. 运行 ui:lint 并修复所有违规项。

```

---

# 四、建议 Codex 创建的文件内容

下面是可直接放入仓库的文件模板。Codex 可以按项目结构合并或创建。

## AGENTS.md

```md
# AGENTS.md

## 项目身份

这是一个面向游戏广告优化师、投放负责人、广告产品团队使用的 AI 广告数据产品。

它不是 landing page，不是通用 SaaS demo，不是海报展示页，不是 Claude 风格卡片墙，也不是只展示功能卖点的 AI 工具首页。

产品前台应该是：

- Web Copilot 工作台
- 手机端轻量预警与审批
- 自然语言多轮对话
- 数据证据面板
- Agent 诊断建议
- 人类审批与审计闭环

产品后台可以接入 Coze Studio / Workflow / Agent 编排系统，但 Coze Studio 不是终端用户主界面。

## 当前核心问题

本地 UI Schema 能力弱，AI 经常生成默认 demo 演示系统：

- 平铺海报
- 功能卡片墙
- Claude 风格大卡片
- 渐变背景
- marketing copy
- 无真实业务密度的 dashboard
- 把 Agent 做成宣传卡片

本项目要从工程上阻止这些产出。

## 总原则

AI 不直接自由设计页面。

AI 必须先生成或修改 UISchema。
UISchema 只能引用 registry 中声明的业务组件。
React 页面只能通过 schema renderer 或已有业务组件渲染。
视觉风格必须由 design token、组件库和布局模式锁定。

## 强制工作流

执行任何 UI 任务时，必须按以下顺序：

1. 阅读本文件。
2. 阅读 `docs/UI_CONTRACT.md`。
3. 阅读 `docs/UI_SCHEMA_SPEC.md`。
4. 阅读 `docs/UI_PATTERNS.md`。
5. 阅读 `src/ui-schema/registry.ts`。
6. 判断目标页面的 screenType。
7. 先输出或修改 UISchema。
8. 仅当 registry 无法表达需求时，才新增组件 contract。
9. 不允许直接自由写页面布局。
10. 修改完成后运行项目已有校验命令；如果没有统一命令，则至少运行 typecheck、lint 和 UI demo pattern 检查。

## 严禁生成的 UI

禁止创建或使用：

- hero section
- poster card
- feature grid
- landing page
- marketing CTA
- pricing card
- showcase section
- glassmorphism
- large gradient background
- purple/blue AI SaaS template
- Claude-style flat card wall
- fake dashboard
- fake marketing copy
- “3 个功能卡片 + 1 个按钮”的首页
- 平铺 Agent 头像卡
- 把每个 Agent 设计成宣传海报
- standalone demo app
- sample app not connected to existing project

## 强制页面模式

桌面端优先采用 command center 结构：

- context rail：项目、渠道、日期、风险队列、关键 KPI
- main：对话、Agent 诊断、建议动作、审批入口
- evidence panel：数据证据、归因链路、表格、日志
- approval drawer：预算、暂停、回传、素材上线等高风险动作审批

手机端优先采用 stacked decision flow：

- 风险摘要
- Agent 结论
- 关键证据
- 建议动作
- 批准 / 驳回 / 追问

## 允许优先使用的业务组件

优先使用：

- CommandCenterShell
- ContextRail
- ConversationPanel
- KPICompareStrip
- CampaignRiskQueue
- AgentDiagnosisCard
- EvidenceTable
- AttributionTimeline
- CreativeFatiguePanel
- ApprovalActionPanel
- AuditLogPanel
- WorkflowStatusPanel
- DataSourceHealthPanel

## 业务内容要求

任何 Agent 诊断结论必须包含：

- summary：一句话结论
- causes：原因列表
- confidence：置信度
- impact：影响范围
- recommendedActions：建议动作
- evidenceRefs：证据引用
- riskLevel：风险等级

任何执行动作必须包含：

- actionType
- label
- targetObject
- riskLevel
- requiresApproval
- rollbackPlan
- auditRequired

涉及预算、暂停计划、切换回传事件、素材上线、修改品牌 KV 的动作，必须 requiresApproval=true。

## 文案规则

文案必须是投放业务语言，不允许泛化 SaaS 营销文案。

不要写：

- Transform your workflow
- AI-powered platform
- Boost your productivity
- Get Started
- Explore Features
- Beautiful dashboard

应该写：

- D1 ROAS 低于阈值
- 首充回传延迟扩大
- 3 条高消耗低回收计划待审批
- 素材疲劳度达到临界值
- 建议切换更深度付费事件回传
- 预计预算风险 42,000 元

## 代码实现规则

- 不要创建新的 demo 项目。
- 不要绕过现有路由和组件体系。
- 不要新增无业务含义的 Card/Grid/Hero 组件。
- 如果需要新增组件，先定义 component contract，再实现。
- 优先使用现有 design tokens、CSS variables、Tailwind tokens 或组件库。
- 不要硬编码大面积渐变、玻璃拟态和海报样式。
- 空状态也必须业务化，例如“暂无异常计划”，而不是“No data”。

## 输出格式要求

每次 UI 任务完成后，回复必须包含：

1. 目标 screenType
2. 修改了哪些 UISchema
3. 使用了哪些 registry 组件
4. 覆盖了哪些业务状态
5. 桌面端布局
6. 手机端布局
7. 执行了哪些校验命令
8. 是否发现无法完成的约束

```

## docs/UI_CONTRACT.md

```md
# UI_CONTRACT.md

# AI 广告系统 UI Contract

## 一句话定位

这是一个面向游戏广告投放团队的 AI Copilot 作战台，用于异常诊断、归因分析、素材复盘、预算建议、审批决策和审计追踪。

它不是宣传页，不是通用后台模板，不是 AI SaaS demo。

## 产品结构

前台：

- Web Chat / Copilot 工作台
- 手机端预警与审批
- 飞书 / 企业微信通知入口

后台：

- Coze Studio / Agent Workflow / RAG / Plugin 编排
- 广告数据中台
- MMP / BI / 媒体 API
- 权限网关
- 审批与审计系统

## 关键用户

1. 初级执行优化师
   - 关注盯盘、日报、预算、素材上传、异常提醒
   - UI 要帮助其减少重复操作

2. 资深策略优化师
   - 关注归因诊断、素材分析、Campaign 策略
   - UI 要提供数据证据、原因链和建议动作

3. 专家级投放总监
   - 关注 ROI、品牌安全、用户质量、合规风险、跨部门决策
   - UI 要支持高层摘要、风险预警、审批和审计

## 设计目标

- 让用户能指挥 AI，而不是被 AI 淹没。
- 让 Agent 的建议可解释、可追问、可审批、可回滚。
- 让每个结论都有数据证据。
- 让高风险动作必须经过人类批准。
- 让 Web 端承载完整作战台，移动端承载轻决策。

## 强制禁止的 UI 风格

严禁：

- landing page
- hero section
- poster card
- feature grid
- marketing CTA
- pricing section
- fake dashboard
- mock SaaS homepage
- 玻璃拟态
- 大面积渐变背景
- 紫蓝色 AI 套壳风
- Claude-style flat card wall
- Agent 头像海报墙
- 无业务数据的功能展示卡片

## 强制采用的信息架构

桌面端：三栏或二栏作战台。

```text
┌────────────────────────────────────────────────────────────┐
│ TopBar：项目 / 渠道 / 日期 / 账户 / 当前风险状态             │
├───────────────┬──────────────────────────┬─────────────────┤
│ Context Rail  │ Main Conversation / Task │ Evidence Panel  │
│ 项目上下文     │ 用户提问 + Agent 诊断      │ 数据证据 / 图表   │
│ 指标摘要       │ 建议卡片 / 审批动作        │ 归因链路 / 日志   │
│ 异常列表       │                          │                 │
└───────────────┴──────────────────────────┴─────────────────┘
```

手机端：纵向决策流。

```text
风险摘要
↓
Agent 结论
↓
关键证据
↓
建议动作
↓
批准 / 驳回 / 追问
```

## 页面必须体现的业务密度

页面不能只是看起来漂亮，必须回答：

- 发生了什么？
- 影响多大？
- 为什么发生？
- 证据是什么？
- 建议怎么做？
- 风险是什么？
- 是否需要审批？
- 谁负责？
- 执行后如何回滚？

## 视觉原则

- 高信息密度，但层级清晰。
- 用风险、证据、动作组织信息，不用营销卖点组织信息。
- 表格、时间线、KPI、诊断卡必须服务决策。
- 色彩只用于状态表达：normal / warning / critical / success。
- 不使用大面积装饰性渐变。
- 不使用无意义插画。

## 数据与权限原则

- Agent 只能提出建议，不能裸连高风险执行 API。
- 预算、暂停计划、切换回传事件、素材上线、品牌 KV 修改必须走审批。
- 所有建议动作必须产生审计日志。
- 所有数据结论必须保留 source 与 lastUpdatedAt。

```

## docs/UI_SCHEMA_SPEC.md

```md
# UI_SCHEMA_SPEC.md

# AI 广告系统 UISchema 规范

## 目标

UISchema 是本项目 UI 生成的唯一合法入口。AI 不允许自由生成页面，只能生成或修改结构化 UISchema，再由 renderer 通过 registry 中的业务组件渲染。

## ScreenType

```ts
export type ScreenType =
  | "agent-copilot-workbench"
  | "campaign-diagnosis"
  | "attribution-drilldown"
  | "creative-fatigue-analysis"
  | "approval-review"
  | "data-source-health"
  | "workflow-audit";
```

## AdAIScreenSchema

```ts
export interface AdAIScreenSchema {
  schemaVersion: "1.0";
  screenId: string;
  screenType: ScreenType;
  title: string;
  description?: string;

  businessContext: BusinessContext;
  layout: ScreenLayout;
  regions: ScreenRegions;
  dataRequirements?: DataRequirement[];
  permissionRequirements?: PermissionRequirement[];
  validationRules?: ValidationRule[];
}
```

## BusinessContext

```ts
export interface BusinessContext {
  projectId?: string;
  projectName?: string;
  gameName?: string;
  channel?: "巨量引擎" | "腾讯广告" | "快手" | "Google" | "Meta" | "mixed";
  accountId?: string;
  campaignId?: string;
  dateRange?: "today" | "yesterday" | "last_7_days" | "custom";
  objective?: "ROAS" | "CPA" | "CPI" | "付费率" | "留存" | "起量" | "素材消耗";
  userRole?: "junior_optimizer" | "senior_optimizer" | "ua_director" | "admin";
}
```

## ScreenLayout

```ts
export interface ScreenLayout {
  desktop:
    | "three-column-command-center"
    | "two-column-diagnosis"
    | "single-column-audit";
  mobile:
    | "stacked-decision-flow"
    | "compact-alert-review";
  density: "high" | "medium";
  stickyActions?: boolean;
}
```

## ScreenRegions

```ts
export interface ScreenRegions {
  topBar?: UISchemaBlock[];
  contextRail?: UISchemaBlock[];
  main?: UISchemaBlock[];
  evidencePanel?: UISchemaBlock[];
  approvalDrawer?: UISchemaBlock[];
  auditTrail?: UISchemaBlock[];
}
```

## UISchemaBlock

```ts
export type UISchemaBlock =
  | KPICompareStripBlock
  | CampaignRiskQueueBlock
  | ConversationPanelBlock
  | AgentDiagnosisCardBlock
  | EvidenceTableBlock
  | AttributionTimelineBlock
  | CreativeFatiguePanelBlock
  | ApprovalActionPanelBlock
  | AuditLogPanelBlock
  | WorkflowStatusPanelBlock
  | DataSourceHealthPanelBlock;
```

## AgentDiagnosisCardBlock

```ts
export interface AgentDiagnosisCardBlock {
  type: "AgentDiagnosisCard";
  id: string;
  agentName: "磐石" | "灵感" | "智囊" | "护盾" | string;
  agentRole?: string;
  severity: "normal" | "warning" | "critical";
  summary: string;
  confidence: number;
  causes: string[];
  impact: {
    budgetAtRisk?: number;
    affectedCampaigns?: number;
    affectedCreatives?: number;
    affectedUsers?: number;
    metricDelta?: string;
  };
  recommendedActions: RecommendedAction[];
  evidenceRefs: string[];
}
```

## RecommendedAction

```ts
export interface RecommendedAction {
  id: string;
  actionType:
    | "pause_campaigns"
    | "adjust_budget"
    | "switch_conversion_event"
    | "launch_creative_variant"
    | "request_human_review"
    | "run_deep_diagnosis";
  label: string;
  targetObject?: string;
  riskLevel: "low" | "medium" | "high";
  requiresApproval: boolean;
  estimatedImpact?: string;
  rollbackPlan?: string;
  auditRequired: boolean;
}
```

## EvidenceTableBlock

```ts
export interface EvidenceTableBlock {
  type: "EvidenceTable";
  id: string;
  title: string;
  source: string;
  lastUpdatedAt: string;
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  emptyState?: string;
}
```

## AttributionTimelineBlock

```ts
export interface AttributionTimelineBlock {
  type: "AttributionTimeline";
  id: string;
  title: string;
  events: Array<{
    label: string;
    status: "normal" | "warning" | "critical" | "unknown";
    timestamp?: string;
    note?: string;
  }>;
  highlight?: string;
}
```

## KPICompareStripBlock

```ts
export interface KPICompareStripBlock {
  type: "KPICompareStrip";
  id: string;
  title: string;
  metrics: Array<{
    key: string;
    label: string;
    value: string | number;
    unit?: string;
    delta?: number;
    status: "normal" | "warning" | "critical" | "success";
    threshold?: string;
  }>;
}
```

## 禁止出现的 block type

严禁在 UISchema 中出现：

```ts
"Hero"
"Poster"
"FeatureGrid"
"MarketingCard"
"PricingCard"
"LandingSection"
"Showcase"
"CTASection"
"GlassCard"
"GradientPanel"
```

## 质量要求

- 每个 block 必须有业务目的。
- 每个诊断结论必须有 evidenceRefs。
- 每个执行动作必须声明 riskLevel 和 requiresApproval。
- 每个表格必须声明 source 和 lastUpdatedAt。
- 移动端必须能按 stacked decision flow 降级。

```

## docs/UI_PATTERNS.md

```md
# UI_PATTERNS.md

# AI 广告系统 UI Patterns

## Pattern 1: Agent Copilot Workbench

适用：主工作台、多轮对话、跨项目投放问题追问。

桌面布局：three-column-command-center

- contextRail：项目上下文、KPI、风险队列
- main：ConversationPanel + AgentDiagnosisCard
- evidencePanel：EvidenceTable + AttributionTimeline + AuditLogPanel
- approvalDrawer：ApprovalActionPanel

不允许：大标题欢迎页、功能卡片、Agent 海报墙。

## Pattern 2: Campaign Diagnosis

适用：ROAS 下滑、消耗突增、激活异常、付费异常、冷启动不起量。

必须回答：

- 异常指标是什么？
- 与昨日 / 大盘 / 阈值相比差多少？
- 影响哪些计划 / 素材 / 渠道？
- 初步原因是什么？
- 证据是什么？
- 建议动作是什么？
- 动作风险和审批要求是什么？

## Pattern 3: Attribution Drilldown

适用：归因链路、回传延迟、MMP 与媒体差异、事件质量。

必须包含：

- 曝光
- 点击
- 激活
- 注册 / 创角
- 首充 / 深度付费
- 回传
- 延迟与断链提示

## Pattern 4: Creative Fatigue Analysis

适用：素材衰退、爆款复盘、脚本发散、素材生命周期管理。

必须包含：

- 素材 ID / 名称
- CTR / CVR / CPA / ROAS
- 前 3 秒钩子表现
- 衰退曲线
- 可裂变方向
- 上线建议
- 合规风险

## Pattern 5: Approval Review

适用：预算调整、暂停计划、切换回传、素材上线、品牌 KV 修改。

必须包含：

- 建议动作
- 触发原因
- 影响范围
- 风险等级
- 回滚方案
- 审批人
- 审计日志

## 移动端 Pattern

移动端不复制复杂桌面布局，只保留决策流：

1. 风险摘要
2. Agent 结论
3. 关键证据
4. 建议动作
5. 批准 / 驳回 / 追问

## 业务状态

所有核心页面至少覆盖：

- loading
- normal
- warning
- critical
- empty
- no_permission
- data_stale
- approval_required
- execution_failed
- rollback_available

```

## .codex/skills/ai-ad-ui/SKILL.md

```md
---
name: ai-ad-ui
description: Use this skill whenever implementing UI, UISchema, page layout, dashboard, workbench, chat interface, diagnosis screen, evidence panel, mobile approval flow, or Agent recommendation view for the AI advertising data product. Do not use this skill for generic landing pages.
---

# AI Ad UI Skill

## Goal

Implement production UI for an AI advertising data product used by game advertising optimizers.

The UI must help users:

- detect anomalies
- understand causes
- inspect evidence
- ask follow-up questions
- review Agent recommendations
- approve or reject risky actions
- audit decisions

## Non-goals

Never implement:

- landing page
- hero section
- poster card
- feature grid
- marketing homepage
- Claude-style card wall
- fake AI SaaS dashboard
- standalone demo app

## Required reading

Before changing UI, read:

1. `AGENTS.md`
2. `docs/UI_CONTRACT.md`
3. `docs/UI_SCHEMA_SPEC.md`
4. `docs/UI_PATTERNS.md`
5. `src/ui-schema/registry.ts`

## Workflow

1. Inspect the existing repository structure.
2. Identify the current frontend stack.
3. Identify the target screenType.
4. Create or update UISchema first.
5. Use only registry-approved business components.
6. If a component is missing, propose a component contract first.
7. Implement renderer or component changes only after schema is clear.
8. Add or update validation.
9. Run available checks.
10. Report screenType, schema changes, components used, desktop/mobile layout, validation result.

## Required output for Agent diagnosis UI

Every Agent diagnosis must include:

- summary
- causes
- confidence
- impact
- recommendedActions
- evidenceRefs
- riskLevel

Every recommended action must include:

- actionType
- label
- riskLevel
- requiresApproval
- rollbackPlan
- auditRequired

## Desktop layout

Prefer command-center structure:

- context rail
- main conversation / diagnosis
- evidence panel
- approval drawer

## Mobile layout

Prefer stacked decision flow:

- alert summary
- Agent conclusion
- key evidence
- recommended action
- approval buttons

## Validation

Run these commands if they exist:

```bash
pnpm typecheck
pnpm lint
pnpm ui:lint
pnpm validate
```

If package manager is npm or yarn, adapt commands to the repository.

```

## src/ui-schema/schema.ts

```ts
export type ScreenType =
  | "agent-copilot-workbench"
  | "campaign-diagnosis"
  | "attribution-drilldown"
  | "creative-fatigue-analysis"
  | "approval-review"
  | "data-source-health"
  | "workflow-audit";

export type Severity = "normal" | "warning" | "critical";
export type Status = "normal" | "warning" | "critical" | "success" | "unknown";
export type RiskLevel = "low" | "medium" | "high";

export interface BusinessContext {
  projectId?: string;
  projectName?: string;
  gameName?: string;
  channel?: "巨量引擎" | "腾讯广告" | "快手" | "Google" | "Meta" | "mixed";
  accountId?: string;
  campaignId?: string;
  dateRange?: "today" | "yesterday" | "last_7_days" | "custom";
  objective?: "ROAS" | "CPA" | "CPI" | "付费率" | "留存" | "起量" | "素材消耗";
  userRole?: "junior_optimizer" | "senior_optimizer" | "ua_director" | "admin";
}

export interface ScreenLayout {
  desktop: "three-column-command-center" | "two-column-diagnosis" | "single-column-audit";
  mobile: "stacked-decision-flow" | "compact-alert-review";
  density: "high" | "medium";
  stickyActions?: boolean;
}

export interface RecommendedAction {
  id: string;
  actionType:
    | "pause_campaigns"
    | "adjust_budget"
    | "switch_conversion_event"
    | "launch_creative_variant"
    | "request_human_review"
    | "run_deep_diagnosis";
  label: string;
  targetObject?: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  estimatedImpact?: string;
  rollbackPlan?: string;
  auditRequired: boolean;
}

export interface KPICompareStripBlock {
  type: "KPICompareStrip";
  id: string;
  title: string;
  metrics: Array<{
    key: string;
    label: string;
    value: string | number;
    unit?: string;
    delta?: number;
    status: Exclude<Status, "unknown">;
    threshold?: string;
  }>;
}

export interface CampaignRiskQueueBlock {
  type: "CampaignRiskQueue";
  id: string;
  title: string;
  items: Array<{
    id: string;
    severity: Severity;
    title: string;
    ownerAgent: string;
    requiresApproval: boolean;
    affectedObject?: string;
  }>;
}

export interface ConversationPanelBlock {
  type: "ConversationPanel";
  id: string;
  mode: "diagnosis" | "strategy" | "approval" | "general";
  initialQuestion?: string;
  suggestedQuestions?: string[];
}

export interface AgentDiagnosisCardBlock {
  type: "AgentDiagnosisCard";
  id: string;
  agentName: "磐石" | "灵感" | "智囊" | "护盾" | string;
  agentRole?: string;
  severity: Severity;
  summary: string;
  confidence: number;
  causes: string[];
  impact: {
    budgetAtRisk?: number;
    affectedCampaigns?: number;
    affectedCreatives?: number;
    affectedUsers?: number;
    metricDelta?: string;
  };
  recommendedActions: RecommendedAction[];
  evidenceRefs: string[];
}

export interface EvidenceTableBlock {
  type: "EvidenceTable";
  id: string;
  title: string;
  source: string;
  lastUpdatedAt: string;
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  emptyState?: string;
}

export interface AttributionTimelineBlock {
  type: "AttributionTimeline";
  id: string;
  title: string;
  events: Array<{
    label: string;
    status: Status;
    timestamp?: string;
    note?: string;
  }>;
  highlight?: string;
}

export interface CreativeFatiguePanelBlock {
  type: "CreativeFatiguePanel";
  id: string;
  title: string;
  creatives: Array<{
    creativeId: string;
    name: string;
    ctr?: number;
    cvr?: number;
    cpa?: number;
    roas?: number;
    fatigueLevel: RiskLevel;
    recommendation: string;
  }>;
}

export interface ApprovalActionPanelBlock {
  type: "ApprovalActionPanel";
  id: string;
  title: string;
  actions: RecommendedAction[];
}

export interface AuditLogPanelBlock {
  type: "AuditLogPanel";
  id: string;
  title: string;
  logs: Array<{
    id: string;
    actor: string;
    action: string;
    timestamp: string;
    result: "pending" | "approved" | "rejected" | "executed" | "failed";
  }>;
}

export interface WorkflowStatusPanelBlock {
  type: "WorkflowStatusPanel";
  id: string;
  title: string;
  status: "idle" | "running" | "waiting_approval" | "completed" | "failed";
  currentStep?: string;
  steps?: string[];
}

export interface DataSourceHealthPanelBlock {
  type: "DataSourceHealthPanel";
  id: string;
  title: string;
  sources: Array<{
    name: string;
    status: Status;
    lastUpdatedAt?: string;
    lag?: string;
  }>;
}

export type UISchemaBlock =
  | KPICompareStripBlock
  | CampaignRiskQueueBlock
  | ConversationPanelBlock
  | AgentDiagnosisCardBlock
  | EvidenceTableBlock
  | AttributionTimelineBlock
  | CreativeFatiguePanelBlock
  | ApprovalActionPanelBlock
  | AuditLogPanelBlock
  | WorkflowStatusPanelBlock
  | DataSourceHealthPanelBlock;

export interface ScreenRegions {
  topBar?: UISchemaBlock[];
  contextRail?: UISchemaBlock[];
  main?: UISchemaBlock[];
  evidencePanel?: UISchemaBlock[];
  approvalDrawer?: UISchemaBlock[];
  auditTrail?: UISchemaBlock[];
}

export interface DataRequirement {
  source: "BI" | "MMP" | "媒体API" | "游戏服务端" | "素材库" | "RAG" | string;
  purpose: string;
  freshness: "realtime" | "hourly" | "daily" | "manual";
}

export interface PermissionRequirement {
  action: string;
  role: string;
  approvalRequired: boolean;
}

export interface ValidationRule {
  id: string;
  description: string;
  severity: "error" | "warning";
}

export interface AdAIScreenSchema {
  schemaVersion: "1.0";
  screenId: string;
  screenType: ScreenType;
  title: string;
  description?: string;
  businessContext: BusinessContext;
  layout: ScreenLayout;
  regions: ScreenRegions;
  dataRequirements?: DataRequirement[];
  permissionRequirements?: PermissionRequirement[];
  validationRules?: ValidationRule[];
}

```

## src/ui-schema/registry.ts

```ts
import type { UISchemaBlock } from "./schema";

export const allowedUIBlocks = {
  KPICompareStrip: {
    purpose: "展示核心投放指标的同比、环比、阈值与异常状态。",
    allowedIn: ["contextRail", "main"],
    forbiddenUse: "不能作为营销卡片或功能展示卡片。",
    requiredProps: ["id", "title", "metrics"],
  },
  CampaignRiskQueue: {
    purpose: "展示待处理投放异常、风险等级、负责 Agent 和是否需要审批。",
    allowedIn: ["contextRail", "main"],
    requiredProps: ["id", "title", "items"],
  },
  ConversationPanel: {
    purpose: "承载投放人员与 Agent 的多轮对话和追问。",
    allowedIn: ["main"],
    requiredProps: ["id", "mode"],
  },
  AgentDiagnosisCard: {
    purpose: "展示 Agent 的诊断结论、原因、置信度、影响范围和下一步建议。",
    allowedIn: ["main"],
    requiredProps: [
      "id",
      "agentName",
      "severity",
      "summary",
      "causes",
      "confidence",
      "impact",
      "recommendedActions",
      "evidenceRefs",
    ],
  },
  EvidenceTable: {
    purpose: "展示支持诊断结论的数据证据。",
    allowedIn: ["evidencePanel", "main"],
    requiredProps: ["id", "title", "columns", "rows", "source", "lastUpdatedAt"],
  },
  AttributionTimeline: {
    purpose: "展示曝光、点击、激活、付费、回传延迟的归因链路。",
    allowedIn: ["evidencePanel", "main"],
    requiredProps: ["id", "title", "events"],
  },
  CreativeFatiguePanel: {
    purpose: "展示素材疲劳度、衰退信号和裂变建议。",
    allowedIn: ["main", "evidencePanel"],
    requiredProps: ["id", "title", "creatives"],
  },
  ApprovalActionPanel: {
    purpose: "展示需要人工批准的预算、暂停、回传切换、素材上线动作。",
    allowedIn: ["approvalDrawer", "main"],
    requiredProps: ["id", "title", "actions"],
  },
  AuditLogPanel: {
    purpose: "展示审批、执行、回滚和系统建议的审计日志。",
    allowedIn: ["auditTrail", "evidencePanel"],
    requiredProps: ["id", "title", "logs"],
  },
  WorkflowStatusPanel: {
    purpose: "展示 Agent workflow 当前执行状态、等待审批状态和失败状态。",
    allowedIn: ["main", "evidencePanel"],
    requiredProps: ["id", "title", "status"],
  },
  DataSourceHealthPanel: {
    purpose: "展示 BI、MMP、媒体 API、游戏服务端等数据源健康度。",
    allowedIn: ["contextRail", "evidencePanel"],
    requiredProps: ["id", "title", "sources"],
  },
} as const;

export type AllowedUIBlockType = keyof typeof allowedUIBlocks;

export const forbiddenUIBlockTypes = [
  "Hero",
  "Poster",
  "FeatureGrid",
  "MarketingCard",
  "PricingCard",
  "LandingSection",
  "Showcase",
  "CTASection",
  "GlassCard",
  "GradientPanel",
] as const;

export function assertAllowedBlock(block: UISchemaBlock): void {
  if (!(block.type in allowedUIBlocks)) {
    throw new Error(`Unsupported UI block type: ${block.type}`);
  }
}

export function assertNoForbiddenBlockType(type: string): void {
  if ((forbiddenUIBlockTypes as readonly string[]).includes(type)) {
    throw new Error(`Forbidden demo UI block type: ${type}`);
  }
}

```

## scripts/check-ui-demo-patterns.ts

```ts
import fs from "fs";
import path from "path";

const forbidden = [
  "hero",
  "Hero",
  "poster",
  "Poster",
  "feature grid",
  "FeatureGrid",
  "landing",
  "Landing",
  "glassmorphism",
  "gradient-to",
  "from-purple",
  "to-blue",
  "Get Started",
  "Explore Features",
  "AI-powered platform",
  "beautiful dashboard",
  "pricing",
  "Pricing",
  "showcase",
  "Showcase",
  "marketing CTA",
  "MarketingCard",
];

const targetDirs = ["src/app", "src/pages", "src/components", "src/ui", "app", "pages", "components"];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (/\.(tsx|ts|jsx|js)$/.test(full)) return [full];
    return [];
  });
}

const files = targetDirs.flatMap(walk);
const violations: string[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const word of forbidden) {
    if (content.includes(word)) {
      violations.push(`${file}: contains forbidden UI demo pattern "${word}"`);
    }
  }
}

if (violations.length) {
  console.error("Forbidden demo UI patterns found:");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("UI demo pattern check passed.");

```

## golden/campaign-diagnosis-workbench.schema.json

```json
{
  "schemaVersion": "1.0",
  "screenId": "campaign-diagnosis-workbench",
  "screenType": "campaign-diagnosis",
  "title": "投放异常诊断工作台",
  "description": "用于诊断 ROAS 下滑、回传延迟、素材疲劳和预算风险的三栏作战台。",
  "businessContext": {
    "projectName": "某 MMORPG 项目",
    "gameName": "某 MMORPG 项目",
    "channel": "巨量引擎",
    "dateRange": "today",
    "objective": "ROAS",
    "userRole": "senior_optimizer"
  },
  "layout": {
    "desktop": "three-column-command-center",
    "mobile": "stacked-decision-flow",
    "density": "high",
    "stickyActions": true
  },
  "regions": {
    "contextRail": [
      {
        "type": "KPICompareStrip",
        "id": "today-core-kpi",
        "title": "今日核心指标",
        "metrics": [
          {
            "key": "cost",
            "label": "消耗",
            "value": 182300,
            "unit": "元",
            "delta": 0.18,
            "status": "warning",
            "threshold": "日预算 200,000 元"
          },
          {
            "key": "d1_roas",
            "label": "D1 ROAS",
            "value": 0.31,
            "delta": -0.22,
            "status": "critical",
            "threshold": "阈值 0.42"
          },
          {
            "key": "pay_rate",
            "label": "付费率",
            "value": 0.043,
            "delta": -0.11,
            "status": "warning",
            "threshold": "阈值 0.050"
          }
        ]
      },
      {
        "type": "CampaignRiskQueue",
        "id": "risk-queue",
        "title": "待处理异常",
        "items": [
          {
            "id": "risk-ios-roas",
            "severity": "critical",
            "title": "iOS D1 ROAS 低于阈值",
            "ownerAgent": "磐石",
            "requiresApproval": true,
            "affectedObject": "7 条计划"
          },
          {
            "id": "risk-callback-lag",
            "severity": "warning",
            "title": "首充回传延迟扩大",
            "ownerAgent": "磐石",
            "requiresApproval": false,
            "affectedObject": "MMP + 巨量 API"
          }
        ]
      }
    ],
    "main": [
      {
        "type": "ConversationPanel",
        "id": "diagnosis-chat",
        "mode": "diagnosis",
        "initialQuestion": "为什么今天巨量 iOS ROAS 掉了？",
        "suggestedQuestions": [
          "哪些计划最危险？",
          "是不是回传延迟？",
          "需要暂停哪些计划？"
        ]
      },
      {
        "type": "AgentDiagnosisCard",
        "id": "panshi-diagnosis",
        "agentName": "磐石",
        "agentRole": "资深数据与归因分析师 Agent",
        "severity": "critical",
        "summary": "D1 ROAS 下滑主要由首充回传延迟扩大与低质量流量池命中共同导致。",
        "confidence": 0.82,
        "causes": [
          "首充事件回传延迟较昨日增加 3.2 小时。",
          "新素材 CTR 正常，但激活后付费率下降。",
          "相同预算下高频命中低质量设备上下文。"
        ],
        "impact": {
          "budgetAtRisk": 42000,
          "affectedCampaigns": 7,
          "metricDelta": "D1 ROAS -22%"
        },
        "recommendedActions": [
          {
            "id": "action-switch-event",
            "actionType": "switch_conversion_event",
            "label": "临时切换为更深度付费事件回传",
            "targetObject": "巨量 iOS Campaign 组",
            "riskLevel": "medium",
            "requiresApproval": true,
            "estimatedImpact": "预计 4-6 小时后稳定模型信号",
            "rollbackPlan": "若 D1 ROAS 未恢复，回滚至原回传事件并触发深度排查。",
            "auditRequired": true
          },
          {
            "id": "action-pause-campaigns",
            "actionType": "pause_campaigns",
            "label": "暂停 3 条高消耗低回收计划",
            "targetObject": "Campaign A / B / C",
            "riskLevel": "high",
            "requiresApproval": true,
            "estimatedImpact": "预计减少今日预算风险 18,000 元",
            "rollbackPlan": "保留计划配置，审批后可一键恢复。",
            "auditRequired": true
          }
        ],
        "evidenceRefs": [
          "evidence-campaign-table",
          "timeline-attribution"
        ]
      }
    ],
    "evidencePanel": [
      {
        "type": "AttributionTimeline",
        "id": "timeline-attribution",
        "title": "归因链路",
        "events": [
          {
            "label": "曝光",
            "status": "normal"
          },
          {
            "label": "点击",
            "status": "normal"
          },
          {
            "label": "激活",
            "status": "normal"
          },
          {
            "label": "创角",
            "status": "warning",
            "note": "转化率低于昨日"
          },
          {
            "label": "首充",
            "status": "critical",
            "note": "回传延迟增加 3.2 小时"
          },
          {
            "label": "媒体回传",
            "status": "warning",
            "note": "存在信号真空期"
          }
        ],
        "highlight": "首充回传延迟较昨日增加 3.2 小时。"
      },
      {
        "type": "EvidenceTable",
        "id": "evidence-campaign-table",
        "title": "异常 Campaign 证据",
        "source": "BI + MMP + 巨量 API",
        "lastUpdatedAt": "2026-05-12T10:00:00+08:00",
        "columns": [
          "计划",
          "消耗",
          "CTR",
          "CVR",
          "D1 ROAS",
          "风险"
        ],
        "rows": [
          {
            "计划": "Campaign A",
            "消耗": 38000,
            "CTR": "3.8%",
            "CVR": "4.1%",
            "D1 ROAS": "0.24",
            "风险": "critical"
          },
          {
            "计划": "Campaign B",
            "消耗": 26000,
            "CTR": "4.0%",
            "CVR": "4.4%",
            "D1 ROAS": "0.29",
            "风险": "critical"
          },
          {
            "计划": "Campaign C",
            "消耗": 21000,
            "CTR": "3.6%",
            "CVR": "4.0%",
            "D1 ROAS": "0.30",
            "风险": "warning"
          }
        ],
        "emptyState": "暂无异常计划。"
      }
    ],
    "approvalDrawer": [
      {
        "type": "ApprovalActionPanel",
        "id": "approval-actions",
        "title": "待审批动作",
        "actions": [
          {
            "id": "action-pause-campaigns",
            "actionType": "pause_campaigns",
            "label": "暂停 3 条高消耗低回收计划",
            "targetObject": "Campaign A / B / C",
            "riskLevel": "high",
            "requiresApproval": true,
            "rollbackPlan": "审批后保留一键恢复入口。",
            "auditRequired": true
          },
          {
            "id": "action-switch-event",
            "actionType": "switch_conversion_event",
            "label": "临时切换为更深度付费事件回传",
            "targetObject": "巨量 iOS Campaign 组",
            "riskLevel": "medium",
            "requiresApproval": true,
            "rollbackPlan": "6 小时后根据回收情况自动建议回滚或保留。",
            "auditRequired": true
          }
        ]
      }
    ]
  },
  "dataRequirements": [
    {
      "source": "BI",
      "purpose": "读取项目消耗、ROAS、付费率等核心指标",
      "freshness": "hourly"
    },
    {
      "source": "MMP",
      "purpose": "读取激活、首充、回传延迟和防作弊数据",
      "freshness": "hourly"
    },
    {
      "source": "媒体API",
      "purpose": "读取计划、素材、消耗、点击和转化数据",
      "freshness": "realtime"
    }
  ],
  "permissionRequirements": [
    {
      "action": "pause_campaigns",
      "role": "senior_optimizer",
      "approvalRequired": true
    },
    {
      "action": "switch_conversion_event",
      "role": "ua_director",
      "approvalRequired": true
    }
  ],
  "validationRules": [
    {
      "id": "agent-diagnosis-requires-evidence",
      "description": "Agent 诊断必须引用证据。",
      "severity": "error"
    },
    {
      "id": "high-risk-action-requires-approval",
      "description": "高风险动作必须审批。",
      "severity": "error"
    }
  ]
}
```

---

# 五、package.json 建议脚本

如果仓库使用 pnpm，可以让 Codex 添加：

```json
{
  "scripts": {
    "ui:lint": "tsx scripts/check-ui-demo-patterns.ts",
    "validate": "pnpm typecheck && pnpm lint && pnpm ui:lint"
  }
}
```

如果仓库没有 `tsx`，让 Codex 根据现有工具选择 `ts-node`、`node` 或转成 JS 脚本。

---

# 六、最终验收标准

Codex 完成后，必须满足：

- 仓库中存在 UI Contract、Schema Spec、Patterns、Registry。
- 后续 UI 页面不能绕过 UISchema 直接自由生成。
- 首页或核心工作台不再是 hero / poster / feature grid。
- 页面结构是广告投放 command center，而不是 AI SaaS demo。
- Agent 诊断卡包含 summary、causes、confidence、impact、recommendedActions、evidenceRefs。
- 高风险动作 requiresApproval=true。
- 表格和证据区包含 source 和 lastUpdatedAt。
- 手机端布局是 stacked decision flow。
- `ui:lint` 能拦截明显 demo 风格关键词。

---

# 七、你对 Codex 的一句话约束

> 不要让 Codex “审美变好”，要让它失去自由审美空间，只能按 UISchema、组件注册表、业务布局和验证脚本产出。
