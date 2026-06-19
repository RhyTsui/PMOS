# AI Chat OS Specification Extension Pack — Combined Markdown

> This combined file is generated from the specification pack. Prefer the folder structure in the zip for implementation.


---

<!-- Source: README.md -->

# AI Chat OS Specification Extension Pack

> 基于 `ENTERPRISE_AI_CHAT_OS_SPEC.md` 的下一阶段规范包。  
> 用途：补齐 Unified Semantic Contract、Action / Evidence / Source、Runtime Display Protocol、Component Registry / Renderer、AI Runtime UX、AI Trust UX、Frontend Engineering、Visual / Conversation / Input / Feedback 的落地文档与前端类型真源。

## 0. 包定位

本规范包不是新的顶层体系，不替代 `ENTERPRISE_AI_CHAT_OS_SPEC.md`。

它的职责是把总纲中的方向拆成可实施、可校验、可由 Codex CLI 遍历重构的二级规范与 TypeScript 类型落点。

```txt
Enterprise AI Chat OS
├─ 总纲：docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md
└─ 本扩展包：协议真源 + Runtime + Renderer + UX + Engineering 细则
```

## 1. 优先实施顺序

```txt
P0. Unified Semantic Contract 详细规范
P0. Action / Evidence / Source 三个统一子契约
P1. Runtime Display Protocol 详细规范
P1. Component Registry / Renderer 规范
P2. AI Runtime UX
P2. AI Trust UX
P2. Frontend Engineering System 细化
P3. Visual System 拆分
P3. Conversation UX / Input UX / Feedback UX
P3. Legacy Contract Mapping
```

## 2. 推荐放置路径

将本包内容复制到项目根目录后，推荐形成：

```txt
docs/
└─ architecture/
   ├─ ENTERPRISE_AI_CHAT_OS_SPEC.md
   ├─ 00_SPEC_INDEX.md
   ├─ semantic-contract/
   │  ├─ semantic-result-contract.md
   │  ├─ action-contract.md
   │  ├─ evidence-contract.md
   │  └─ source-contract.md
   ├─ runtime/
   │  └─ runtime-display-protocol.md
   ├─ frontend-engineering/
   │  ├─ component-registry-renderer.md
   │  └─ frontend-engineering-system.md
   ├─ interaction-system/
   │  ├─ ai-runtime-ux.md
   │  ├─ ai-trust-ux.md
   │  └─ conversation-input-feedback-ux.md
   ├─ visual-system/
   │  └─ visual-system-breakdown.md
   └─ migration/
      └─ legacy-contract-mapping.md

src/
└─ contracts/
   ├─ semantic/
   │  ├─ index.ts
   │  ├─ semantic-result-contract.ts
   │  ├─ action-contract.ts
   │  ├─ evidence-contract.ts
   │  └─ source-contract.ts
   ├─ runtime/
   │  ├─ index.ts
   │  └─ runtime-display-protocol.ts
   └─ renderer/
      ├─ index.ts
      └─ component-registry.ts
```

## 3. 核心收口原则

1. 凡是最终业务结果展示，必须进入 `SemanticResultContract`。
2. 凡是执行过程展示，必须进入 `RuntimeDisplayProtocol`。
3. 凡是具体展示形态，只能作为 `regions[].componentBinding` 的子规范。
4. 凡是用户可点击动作，只走 `ActionContract`。
5. 凡是结论、洞察、风险判断、建议、异常解释，必须挂 `EvidenceRef` / `SourceRef`。
6. 不允许 `ReportQueryViewModel`、`MetricExplainerUISchema`、`VizSpec`、`AgentProcessEvent` 各自发明独立 action、source、evidence、region 结构。

## 4. Codex CLI 推荐执行方式

第一轮只做类型与引用收口，不改视觉：

```txt
1. 搜索所有 ResponseContract / UISchema / ViewModel / VizSpec / ProcessEvent / Timeline 类型。
2. 标记是否属于 Result Plane、Runtime Plane、Renderer Plane 或纯业务 DTO。
3. 将最终前端展示结果统一映射到 SemanticResultContract。
4. 将用户动作统一映射到 ActionContract。
5. 将证据和来源统一映射到 EvidenceRef / SourceRef。
6. 将 AgentProcessEvent / process_events / Timeline 映射到 RuntimeDisplayProtocol。
7. 建立 Component Registry，不再让业务组件直接判断任意 schema。
```

第二轮再做 UI / UX / 性能重构：

```txt
1. Data Visualization 只作为 data-visualization renderer。
2. AI Runtime 只作为 ai-runtime / workflow-trace renderer。
3. 大表格、大图表、长会话、Artifact 全部按 frontend-engineering 规范改造。
4. Visual System token 化，禁止散落硬编码。
```


---

<!-- Source: docs/architecture/00_SPEC_INDEX.md -->

# AI Chat OS Architecture Specification Index

> Canonical index for all Enterprise AI Chat OS architecture and implementation specifications.

## 1. 顶层总纲

| 文档 | 位置 | 角色 |
|---|---|---|
| Enterprise AI Chat OS 总纲 | `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` | 总体系、层级、边界、原则 |

## 2. P0：协议真源

| 文档 | 位置 | 角色 |
|---|---|---|
| Unified Semantic Contract | `docs/architecture/semantic-contract/semantic-result-contract.md` | 最终业务结果渲染协议 |
| Action Contract | `docs/architecture/semantic-contract/action-contract.md` | 用户动作统一协议 |
| Evidence Contract | `docs/architecture/semantic-contract/evidence-contract.md` | 证据统一协议 |
| Source Contract | `docs/architecture/semantic-contract/source-contract.md` | 来源统一协议 |

对应前端类型真源：

```txt
src/contracts/semantic/
```

## 3. P1：Runtime 与 Renderer

| 文档 | 位置 | 角色 |
|---|---|---|
| Runtime Display Protocol | `docs/architecture/runtime/runtime-display-protocol.md` | Agent / Tool / Workflow / Streaming 运行态展示协议 |
| Component Registry / Renderer | `docs/architecture/frontend-engineering/component-registry-renderer.md` | componentBinding 到 renderer 的工程规范 |

对应前端类型真源：

```txt
src/contracts/runtime/
src/contracts/renderer/
```

## 4. P2：体验与工程约束

| 文档 | 位置 | 角色 |
|---|---|---|
| AI Runtime UX | `docs/architecture/interaction-system/ai-runtime-ux.md` | 运行过程的用户体验规范 |
| AI Trust UX | `docs/architecture/interaction-system/ai-trust-ux.md` | 可信解释、证据、置信度、风险提示规范 |
| Frontend Engineering System | `docs/architecture/frontend-engineering/frontend-engineering-system.md` | 长会话、大表格、流式渲染、懒加载、可观测性约束 |

## 5. P3：基础体验域与迁移

| 文档 | 位置 | 角色 |
|---|---|---|
| Visual System Breakdown | `docs/architecture/visual-system/visual-system-breakdown.md` | 字体、颜色、图标、间距、动效、层级拆分 |
| Conversation / Input / Feedback UX | `docs/architecture/interaction-system/conversation-input-feedback-ux.md` | Chat OS 核心交互域 |
| Legacy Contract Mapping | `docs/architecture/migration/legacy-contract-mapping.md` | ResponseContract / MetricExplainerUISchema / VizSpec / AgentProcessEvent 映射规则 |

## 6. 总体依赖关系

```txt
Enterprise AI Chat OS Spec
        ↓
Unified Semantic Contract
        ↓
Action / Evidence / Source Contract
        ↓
Component Registry / Renderer
        ↓
Interaction UX + Frontend Engineering
```

Runtime 是并行协议线：

```txt
Runtime Display Protocol
        ↓
ai-runtime / workflow-trace renderer
        ↓
AI Runtime UX
```

## 7. 禁止事项

1. 禁止新增与 `SemanticResultContract` 平级竞争的最终 UI schema。
2. 禁止 renderer 私有定义 action、evidence、source。
3. 禁止 Runtime Trace 直接污染业务结果结构。
4. 禁止 Data Visualization UX 成为新的总协议。
5. 禁止 `VizSpec` 替代 `regions` / `componentBinding`。
6. 禁止图表、表格、报告、AI Insight 分别定义各自的导出、下钻、来源、证据结构。


---

<!-- Source: docs/architecture/semantic-contract/semantic-result-contract.md -->

# Unified Semantic Contract — SemanticResultContract Specification

> Canonical path: `docs/architecture/semantic-contract/semantic-result-contract.md`  
> Type source: `src/contracts/semantic/semantic-result-contract.ts`  
> Scope: Result Plane / 最终业务结果渲染协议

## 1. 文档定位

`SemanticResultContract` 是 Enterprise AI Chat OS 的最终业务结果渲染总协议。

它回答的问题是：

```txt
AI / Backend / Agent 产出的业务结果，前端如何自主、可靠、可控地渲染？
```

它不负责描述模型执行过程、工具调用过程、Workflow Trace 细节。那些属于 `RuntimeDisplayProtocol`。

## 2. 边界

### 2.1 属于 SemanticResultContract 的内容

- 分析结论
- 摘要
- 指标解释
- 报告结果
- 图表区域
- 表格区域
- AI Insight
- Evidence / Source 引用
- 用户下一步动作
- 可被前端渲染的业务结果区块

### 2.2 不属于 SemanticResultContract 的内容

- token 级流式过程
- Tool Call 原始过程
- Agent 内部状态机
- Workflow 节点执行日志
- Trace 原始记录
- Runtime retry / recovery 过程

这些内容必须放入：

```txt
RuntimeDisplayProtocol
```

但 `SemanticResultContract.regions[].runtimeRefs` 可以引用运行态对象。

## 3. 核心结构

```txt
SemanticResultContract
├─ contractType
├─ version
├─ resultId
├─ screenType
├─ regions[]
│  ├─ id
│  ├─ type
│  ├─ componentBinding
│  ├─ data
│  ├─ layoutHints
│  ├─ actions[]
│  ├─ evidenceRefs[]
│  ├─ sourceRefs[]
│  ├─ runtimeRefs[]
│  ├─ visibility
│  ├─ permission
│  └─ fallback
├─ actions[]
├─ evidenceRefs[]
├─ sourceRefs[]
├─ runtimeRefs[]
├─ layoutHints
├─ visibility
├─ permission
└─ fallback
```

## 4. TypeScript 真源

前端必须以 `src/contracts/semantic/semantic-result-contract.ts` 为类型真源。

禁止在业务模块中重复定义以下类型：

- `SemanticResultContract`
- `SemanticRegion`
- `ScreenType`
- `RegionType`
- `ComponentBinding`
- `LayoutHints`
- `VisibilityPolicy`
- `PermissionPolicy`
- `FallbackPolicy`

## 5. ScreenType

`screenType` 描述整个结果的屏幕语义，不描述具体组件。

推荐初始枚举：

```txt
conversation-answer     对话回答
analysis-result         分析结果
report-result           报告结果
dashboard-result        仪表盘结果
metric-explainer        指标解释
decision-review         决策复核
workflow-result         Workflow 结果
asset-viewer            文件 / Artifact 查看
error-result            错误结果
empty-result            空结果
permission-blocked      权限受限结果
```

规则：

1. `screenType` 不能用于选择具体图表或表格组件。
2. 具体组件只能由 `regions[].componentBinding` 决定。
3. `screenType` 可影响页面级布局、导航、标题、默认 region 排序。

## 6. RegionType

`region.type` 描述区块语义。

推荐初始枚举：

```txt
summary                 摘要
primary-result          主结果
supporting-detail       补充细节
insight                 洞察
metric                  指标
data-view               数据视图
evidence                证据
source                  来源
action-bar              动作区
runtime                 运行态摘要
workflow                工作流结果
asset                   文件 / Artifact
form                    表单
warning                 警告
error                   错误
metadata                元信息
```

规则：

1. `region.type` 负责语义排序和布局权重。
2. `region.componentBinding` 负责实际渲染器选择。
3. 同一个 `RegionType` 可以绑定不同 renderer。

示例：

```json
{
  "type": "insight",
  "componentBinding": "data-visualization"
}
```

## 7. ComponentBinding

`componentBinding` 是唯一渲染挂载入口。

推荐初始枚举：

```txt
markdown-result         Markdown / rich text 结果
data-visualization      指标卡、表格、图表、路径分析、Sankey 等
ai-runtime              AI 执行过程摘要或嵌入区
workflow-trace          Workflow Timeline / DAG Trace
asset-reference         文件、报告、图片、表格 Artifact 引用
decision-card           决策卡 / 审批卡
evidence-panel          证据面板
source-list             来源列表
action-bar              动作按钮组
form-input              表单输入
feedback-panel          用户反馈
permission-gate         权限提示
empty-state             空状态
error-state             错误状态
```

规则：

1. renderer 必须通过 `componentBinding` 注册。
2. renderer 不得要求后端传入 React 组件名。
3. renderer 不得私有定义 action、evidence、source。
4. Data Visualization UX 只能作为 `data-visualization` 的子规范。
5. AI Runtime UX 只能作为 `ai-runtime` / `workflow-trace` 的子规范。

## 8. layoutHints

`layoutHints` 是弱约束，不是硬 UI 指令。

允许字段：

```txt
priority                区块排序优先级
placement               main / side / header / footer / inline / modal
width                   full / half / third / auto
height                  auto / compact / medium / expanded
minHeight               最小高度提示
maxHeight               最大高度提示
density                 compact / comfortable / spacious
collapsible             是否可折叠
defaultCollapsed        是否默认折叠
sticky                  是否吸顶 / 固定
scrollMode              normal / virtualized / paginated
responsiveBehavior      stack / collapse / hide / drawer
preferredVariant        renderer 推荐变体
```

规则：

1. `layoutHints` 不得直接携带 CSS class。
2. `layoutHints` 不得直接携带 Tailwind class。
3. 前端可以根据设备、权限、性能状态降级处理。
4. `layoutHints` 不得覆盖 Visual System token。

## 9. runtimeRefs

`runtimeRefs` 用于从 Result Plane 引用 Runtime Plane。

示例：

```json
{
  "id": "region-runtime-summary",
  "type": "runtime",
  "componentBinding": "ai-runtime",
  "runtimeRefs": ["runtime_exec_001"]
}
```

规则：

1. `runtimeRefs` 只能引用 runtime id / event id / toolCall id / workflow id。
2. 不得把完整 runtime events 嵌入 `region.data`。
3. Runtime 展示细节必须由 `RuntimeDisplayProtocol` 提供。
4. 普通用户默认只看 runtime 摘要，管理员可展开详细 trace。

## 10. fallback 规则

所有 region 必须具备 fallback 策略。

常见 fallback：

```txt
unsupported-binding     找不到 renderer
invalid-data            data 不符合 renderer schema
permission-denied       无权限
source-unavailable      来源不可见或已删除
evidence-unavailable    证据不可见
runtime-unavailable     运行态引用失效
empty-data              无数据
render-error            renderer 抛错
```

默认处理：

| 场景 | 默认展示 |
|---|---|
| unsupported-binding | `Unsupported content` + region title |
| invalid-data | `Unable to render this result` + 错误码 |
| permission-denied | `You do not have permission to view this content` |
| source-unavailable | 显示脱敏来源占位 |
| evidence-unavailable | 显示“证据不可见”提示 |
| runtime-unavailable | 显示运行态摘要不可用 |
| empty-data | 显示空状态 |
| render-error | Error boundary 降级 |

## 11. visibility 规则

`visibility` 负责“谁可见、何时可见”。

推荐字段：

```txt
defaultVisible          默认是否可见
audiences               user / admin / operator / developer / auditor
roles                   业务角色
conditions              条件表达式引用
redaction               none / partial / full
collapsedFor            默认折叠对象
hiddenReason            隐藏原因
```

规则：

1. 可见性判断必须发生在 renderer 之前。
2. 不可见内容不得进入 DOM。
3. 脱敏内容可以进入 DOM，但必须已经脱敏。
4. 管理员可见 runtime trace，不代表普通用户可见。

## 12. permission 规则

`permission` 负责“是否有权操作或查看”。

推荐字段：

```txt
requiredPermissions     权限点数组
deniedBehavior          hide / redact / disable / request-access
requestAccessActionId   申请权限动作
redactionPolicy         脱敏策略
```

规则：

1. 权限失败不得抛前端异常。
2. 权限失败必须有可解释状态。
3. 高风险 action 必须二次确认。
4. 来源和证据的权限要独立判断。

## 13. freshness / confidence 规则

业务结果涉及数据时，必须提供数据新鲜度：

```txt
generatedAt             结果生成时间
asOf                    数据统计截止时间
sourceUpdatedAt         来源更新时间
freshnessStatus         fresh / stale / unknown / expired
```

涉及 AI 判断时，必须提供置信度：

```txt
confidence.level        high / medium / low / unknown
confidence.score        0 到 1，可选
confidence.basis        evidence / source / model / heuristic / human
```

规则：

1. 数据类结论必须显示 `asOf` 或等效字段。
2. AI 推断必须与真实数据区分。
3. 低置信度洞察必须降级为提示，不得作为确定结论展示。

## 14. 最小示例

```json
{
  "contractType": "semantic-result",
  "version": "1.0.0",
  "resultId": "res_001",
  "screenType": "analysis-result",
  "title": "广告投放异常分析",
  "createdAt": "2026-05-27T10:00:00+08:00",
  "regions": [
    {
      "id": "summary",
      "type": "summary",
      "componentBinding": "markdown-result",
      "data": {
        "markdown": "本周 CPA 上升主要由素材疲劳和高成本渠道放量导致。"
      },
      "evidenceRefs": ["ev_001"],
      "sourceRefs": ["src_001"]
    },
    {
      "id": "chart",
      "type": "data-view",
      "componentBinding": "data-visualization",
      "data": {
        "kind": "line-chart",
        "metric": "CPA",
        "datasetRef": "artifact_dataset_001"
      },
      "actions": [
        {
          "id": "act_drill_down_channel",
          "type": "drill-down",
          "intent": "secondary",
          "label": "按渠道下钻",
          "target": {
            "kind": "semantic-query",
            "value": "drilldown:channel"
          }
        }
      ]
    }
  ],
  "evidenceRefs": [
    {
      "id": "ev_001",
      "type": "query-result",
      "title": "CPA 周环比查询结果",
      "sourceRefIds": ["src_001"],
      "confidence": { "level": "high", "basis": "source" }
    }
  ],
  "sourceRefs": [
    {
      "id": "src_001",
      "type": "warehouse-table",
      "title": "ads_performance_daily",
      "freshness": {
        "asOf": "2026-05-26T23:59:59+08:00",
        "status": "fresh"
      }
    }
  ]
}
```

## 15. 验收清单

- [ ] 所有最终业务结果都可以表示为 `SemanticResultContract`。
- [ ] 所有 region 都有 `componentBinding`。
- [ ] 所有 action 都使用 `ActionContract`。
- [ ] 所有结论、洞察、风险建议都挂 `EvidenceRef` / `SourceRef`。
- [ ] Runtime 过程不嵌入业务结果，只通过 `runtimeRefs` 引用。
- [ ] 无权限、不可见、fallback 场景都有可解释状态。
- [ ] 前端 renderer 可以仅依赖 contract 和 registry 自主渲染。


---

<!-- Source: docs/architecture/semantic-contract/action-contract.md -->

# Action Contract Specification

> Canonical path: `docs/architecture/semantic-contract/action-contract.md`  
> Type source: `src/contracts/semantic/action-contract.ts`  
> Scope: 所有用户可点击动作、系统触发动作、AI 建议动作的统一协议

## 1. 文档定位

`ActionContract` 是 Enterprise AI Chat OS 的唯一动作协议。

所有以下动作必须收口到 `ActionContract`：

- 图表下钻
- 表格排序 / 筛选 / 导出
- 打开来源
- 打开证据
- 打开 Artifact
- 继续分析
- 重新生成
- 重试工具调用
- 审批 / 拒绝
- 创建任务
- 导航
- 复制
- 下载
- 风险操作确认

禁止 Data Visualization、Report、MetricExplainer、Runtime、Workflow 各自定义私有 action。

## 2. 核心结构

```txt
ActionContract
├─ id
├─ type
├─ intent
├─ label
├─ description
├─ icon
├─ target
├─ payload
├─ confirm
├─ feedbackPolicy
├─ permission
├─ visibility
├─ evidenceRefs
├─ sourceRefs
├─ runtimeRefs
├─ disabledReason
├─ audit
└─ telemetry
```

## 3. ActionType

推荐初始枚举：

```txt
navigate                页面内导航
open-url                打开外部链接
open-source             打开来源
open-evidence           打开证据
open-artifact           打开文件 / 表格 / 图表 artifact
query                   发起语义查询
drill-down              下钻
filter                  筛选
sort                    排序
export                  导出
copy                    复制
share                   分享
continue-analysis       继续分析
regenerate              重新生成
retry                   重试
run-workflow            运行 workflow
approve                 审批
reject                  拒绝
request-access          申请权限
create-task             创建任务
submit-feedback         提交反馈
dismiss                 关闭 / 忽略
custom                  扩展动作
```

规则：

1. 新增 `ActionType` 前必须确认无法由现有类型表达。
2. 图表下钻必须用 `drill-down`，不能私有定义 `chartDrilldown`。
3. 继续分析必须用 `continue-analysis`，不能私有定义 `followupAction`。
4. Runtime 重试必须用 `retry`，不能私有定义 `toolRetryAction`。

## 4. ActionIntent

`intent` 描述动作意图和风险等级。

推荐枚举：

```txt
primary                 主动作
secondary               次动作
tertiary                弱动作
destructive             破坏性动作
risky                   风险动作
system                  系统动作
background              后台动作
```

规则：

1. `destructive` 必须配置 `confirm.required = true`。
2. `risky` 必须提供证据或来源，并显示风险提示。
3. `primary` 在同一区域中建议最多一个。
4. `background` 不应作为普通按钮直接暴露。

## 5. ActionTarget

动作目标统一使用 `target` 描述。

推荐 target 类型：

```txt
route                   前端路由
url                     外部 URL
semantic-query          语义查询
artifact                Artifact id
source                  SourceRef id
evidence                EvidenceRef id
runtime                 Runtime id / event id / tool call id
workflow                Workflow id / step id
api                     后端 API action id，不直接暴露 URL
clipboard               剪贴板
local-state             前端局部状态
```

规则：

1. 前端不得直接信任后端传入的任意 URL。
2. `api` 类型必须走 action dispatcher，不得由 renderer 直接 fetch。
3. `semantic-query` 由 Chat / Query 层执行。
4. `source` / `evidence` 目标必须能在根级 refs 中找到。

## 6. ActionConfirm

高风险动作必须定义确认策略。

字段：

```txt
required                是否必需确认
title                   确认标题
description             确认说明
riskLevel               low / medium / high / critical
requireTextInput        是否要求输入确认文本
confirmText             需要输入的文本
consequences            后果说明数组
```

规则：

1. `destructive` 和 `critical` 必须二次确认。
2. 涉及预算、账户、权限、删除、外发数据的动作必须二次确认。
3. 确认文案必须说明后果，不得只写“确定吗”。

## 7. ActionFeedbackPolicy

动作执行反馈统一定义。

字段：

```txt
loadingMessage          执行中文案
successMessage          成功文案
errorMessage            失败文案
showToast               是否 toast
showInlineStatus        是否在原区域内展示状态
optimistic              是否乐观更新
retryable               是否可重试
resultHandling          ignore / refresh-region / append-message / replace-result / open-panel
```

规则：

1. 所有异步 action 必须有 loading 状态。
2. 所有失败必须可解释。
3. `retryable=true` 时必须能重新执行相同 action。
4. `append-message` 通常用于继续分析、追问、重新生成。

## 8. 权限与可见性

动作可见性和可执行性分离：

```txt
visibility 控制是否展示
permission 控制是否可执行
```

规则：

1. 无权限但需要引导申请时，展示 disabled 状态 + request-access action。
2. 不应把不可执行动作完全隐藏，除非暴露该动作本身会泄露信息。
3. 所有高风险动作必须写 audit。

## 9. Action Dispatcher

前端必须通过统一 dispatcher 执行动作：

```txt
ActionContract
    ↓
ActionDispatcher
    ↓
Permission Check
    ↓
Confirm Check
    ↓
Executor
    ↓
FeedbackPolicy
```

禁止 renderer 内部直接执行 API 调用、跳转、导出、下钻。

## 10. 最小示例

```json
{
  "id": "act_drilldown_campaign",
  "type": "drill-down",
  "intent": "secondary",
  "label": "按 Campaign 下钻",
  "target": {
    "kind": "semantic-query",
    "value": "drilldown:campaign"
  },
  "payload": {
    "metric": "CPA",
    "dimension": "campaign_id"
  },
  "feedbackPolicy": {
    "loadingMessage": "正在下钻分析 Campaign...",
    "resultHandling": "append-message",
    "retryable": true
  },
  "evidenceRefs": ["ev_001"],
  "sourceRefs": ["src_001"]
}
```

## 11. 验收清单

- [ ] 所有可点击动作都使用 `ActionContract`。
- [ ] 不存在 chart / table / report 私有 action。
- [ ] destructive / risky 动作都有 confirm。
- [ ] 异步 action 都有 feedbackPolicy。
- [ ] renderer 不直接执行 action。
- [ ] action 可以关联 evidence / source / runtime。


---

<!-- Source: docs/architecture/semantic-contract/evidence-contract.md -->

# Evidence Contract Specification

> Canonical path: `docs/architecture/semantic-contract/evidence-contract.md`  
> Type source: `src/contracts/semantic/evidence-contract.ts`  
> Scope: 结论、洞察、建议、风险判断、异常解释的证据统一协议

## 1. 文档定位

`EvidenceRef` 是 AI Chat OS 的证据引用协议。

它回答的问题是：

```txt
这个结论为什么可信？它依据什么数据、计算、文档、工具输出或人工确认？
```

`EvidenceRef` 不等于 `SourceRef`：

```txt
SourceRef = 来源在哪里
EvidenceRef = 支撑某个结论的证据是什么
```

## 2. 必须挂证据的内容

以下内容必须挂 `EvidenceRef`：

1. 指标异常解释。
2. 归因结论。
3. 趋势判断。
4. 风险建议。
5. 预算、投放、权限、账户相关建议。
6. AI Insight。
7. 预测、估算、推断。
8. 排名、对比、最佳 / 最差判断。
9. 需要用户执行动作的建议。
10. 任何可能影响业务决策的结论。

## 3. EvidenceType

推荐初始枚举：

```txt
metric-value            指标值
data-row                数据行
data-snapshot           数据快照
query-result            查询结果
calculation             计算过程
chart-observation       图表观察
document-excerpt        文档片段
tool-output             工具输出
runtime-trace           运行态 trace 摘要
human-approval          人工确认
model-output            模型输出
experiment-result       实验结果
external-reference      外部引用
policy-rule             规则 / 策略
unknown                 未知证据
```

规则：

1. `model-output` 不能单独支撑高风险业务建议。
2. `unknown` 只能作为降级状态，不得作为可信证据展示。
3. `runtime-trace` 可作为执行证明，但不等于业务数据证据。

## 4. 核心结构

```txt
EvidenceRef
├─ id
├─ type
├─ title
├─ summary
├─ sourceRefIds[]
├─ artifactRef
├─ locator
├─ fields
├─ confidence
├─ freshness
├─ permission
├─ redaction
├─ verification
└─ metadata
```

## 5. Confidence

置信度描述证据支持强度。

字段：

```txt
level                   high / medium / low / unknown
score                   0 到 1，可选
basis                   source / calculation / human / model / heuristic / mixed
explanation             简短解释
```

展示规则：

| level | 展示策略 |
|---|---|
| high | 可作为明确结论 |
| medium | 可作为建议或倾向 |
| low | 必须显示不确定性 |
| unknown | 不得作为确定结论 |

## 6. Freshness

数据类证据必须提供新鲜度。

字段：

```txt
asOf                    数据截止时间
generatedAt             证据生成时间
retrievedAt             证据读取时间
status                  fresh / stale / expired / unknown
maxAgeMs                最大可接受年龄
```

规则：

1. 数据证据必须显示 `asOf` 或等效文案。
2. `stale` 证据支撑的结论必须显示过期提示。
3. `expired` 证据不得支撑确定结论。

## 7. Permission / Redaction

证据可以不可见，但结论必须解释证据受限。

常见场景：

```txt
可见证据              正常展示
部分脱敏              展示摘要 + 脱敏字段
无权限                展示“证据受权限限制”
来源删除              展示“证据来源不可用”
```

规则：

1. 不可见证据不得泄露字段名、表名、客户名、账户名。
2. 证据不可见时，不得伪装为无证据。
3. 管理员可见不等于普通用户可见。

## 8. Evidence 与 Source 的关系

一个 evidence 可以引用多个 source：

```json
{
  "id": "ev_001",
  "type": "calculation",
  "sourceRefIds": ["src_cost", "src_conversion"]
}
```

一个 source 也可以支撑多个 evidence。

规则：

1. Evidence 必须尽量引用 Source。
2. Source 不足以替代 Evidence。
3. Evidence 是结论级引用，Source 是出处级引用。

## 9. Evidence Panel 展示规则

默认展示：

```txt
证据标题
证据摘要
来源数量
数据截止时间
置信度
可展开详情
```

高级模式展示：

```txt
字段级证据
查询结果
计算公式
运行工具
来源详情
脱敏说明
```

## 10. 最小示例

```json
{
  "id": "ev_cpa_increase_calc",
  "type": "calculation",
  "title": "CPA 周环比上升计算",
  "summary": "本周 CPA 较上周上升 18.4%，主要来自 Channel A 的成本增长。",
  "sourceRefIds": ["src_ads_daily"],
  "fields": {
    "metric": "CPA",
    "currentValue": 42.3,
    "previousValue": 35.7,
    "deltaPct": 0.184
  },
  "confidence": {
    "level": "high",
    "basis": "calculation"
  },
  "freshness": {
    "asOf": "2026-05-26T23:59:59+08:00",
    "status": "fresh"
  }
}
```

## 11. 验收清单

- [ ] 所有 AI Insight 都挂 EvidenceRef。
- [ ] 所有风险建议都挂 EvidenceRef。
- [ ] 所有数据类 evidence 都有 freshness。
- [ ] Evidence 与 Source 分离。
- [ ] 低置信度证据不会被展示为确定结论。
- [ ] 权限受限证据有脱敏或解释。


---

<!-- Source: docs/architecture/semantic-contract/source-contract.md -->

# Source Contract Specification

> Canonical path: `docs/architecture/semantic-contract/source-contract.md`  
> Type source: `src/contracts/semantic/source-contract.ts`  
> Scope: 数据、文档、工具、人工输入、系统对象的来源统一协议

## 1. 文档定位

`SourceRef` 是 AI Chat OS 的来源引用协议。

它回答的问题是：

```txt
这个数据、证据或结论来自哪里？来源是否可见、是否新鲜、是否可靠？
```

## 2. SourceType

推荐初始枚举：

```txt
warehouse-table         数仓表
warehouse-query         数仓查询
api                     API
file                    文件
document                文档
url                     URL
email                   邮件
spreadsheet             表格文件
chart                   图表
report                  报告
artifact                系统 artifact
tool                    工具输出
runtime                 运行态对象
human                   人工输入
model                   模型输出
system                  系统配置
policy                  策略 / 规则
unknown                 未知来源
```

规则：

1. `model` 来源不能单独支撑事实性结论。
2. `unknown` 来源只能作为降级状态。
3. 涉及外部 URL 必须经过安全校验。

## 3. 核心结构

```txt
SourceRef
├─ id
├─ type
├─ title
├─ description
├─ locator
├─ owner
├─ retrievedAt
├─ freshness
├─ permission
├─ redaction
├─ reliability
├─ citationPolicy
└─ metadata
```

## 4. Locator

`locator` 描述来源如何定位。

推荐类型：

```txt
table                   表名 / schema / partition
query                   query id / SQL hash
file                    file id / path / version
document                document id / section / anchor
url                     normalized URL
artifact                artifact id
runtime                 runtime id / event id
tool                    tool name / call id
human                   user id / role / timestamp
```

规则：

1. 前端不得直接暴露敏感 locator。
2. locator 可以被脱敏。
3. 可点击来源必须走 `ActionContract(type=open-source)`。

## 5. Freshness

字段：

```txt
asOf                    数据截止时间
retrievedAt             读取时间
updatedAt               来源更新时间
status                  fresh / stale / expired / unknown
staleReason             过期原因
```

展示规则：

| status | 展示 |
|---|---|
| fresh | “数据截至 …” |
| stale | “数据可能不是最新” |
| expired | “数据已过期，不建议用于决策” |
| unknown | “数据新鲜度未知” |

## 6. Reliability

字段：

```txt
level                   verified / trusted / user-provided / model-generated / unknown
explanation             可靠性说明
```

规则：

1. `model-generated` 不能作为事实来源。
2. `user-provided` 需要在高风险场景提示来源为用户输入。
3. `verified` 来源可作为高置信度证据基础。

## 7. Permission / Redaction

来源可能包含敏感信息。

脱敏等级：

```txt
none                    不脱敏
partial                 部分脱敏
full                    完全隐藏
```

规则：

1. 无权限来源不得暴露原始 URI、表名、客户名、邮箱、账户名。
2. 可点击来源必须先过权限判断。
3. 只要 source 不可见，引用它的 evidence 也必须显示受限状态。

## 8. CitationPolicy

字段：

```txt
required                是否必须引用
format                  inline / panel / footnote / hidden
clickable               是否可点击
quoteAllowed            是否允许展示原文摘录
maxQuoteLength          最大摘录长度
```

规则：

1. 外部文档引用默认不大段复制原文。
2. 高风险结论默认要求可追溯 citation。
3. 不可点击来源仍应显示脱敏来源类型。

## 9. 最小示例

```json
{
  "id": "src_ads_daily",
  "type": "warehouse-table",
  "title": "ads_performance_daily",
  "description": "广告投放日粒度表现数据",
  "locator": {
    "kind": "table",
    "value": "warehouse.marketing.ads_performance_daily",
    "redacted": false
  },
  "freshness": {
    "asOf": "2026-05-26T23:59:59+08:00",
    "retrievedAt": "2026-05-27T10:00:00+08:00",
    "status": "fresh"
  },
  "reliability": {
    "level": "verified",
    "explanation": "来自生产数仓 ETL 完成后的正式表。"
  },
  "permission": {
    "requiredPermissions": ["ads.performance.read"],
    "deniedBehavior": "redact"
  }
}
```

## 10. 验收清单

- [ ] 所有 EvidenceRef 能追溯 SourceRef。
- [ ] Source freshness 可展示。
- [ ] Source 权限和脱敏独立处理。
- [ ] 不存在图表、报告、表格私有 source 结构。
- [ ] 可点击来源统一通过 ActionContract。


---

<!-- Source: docs/architecture/runtime/runtime-display-protocol.md -->

# Runtime Display Protocol Specification

> Canonical path: `docs/architecture/runtime/runtime-display-protocol.md`  
> Type source: `src/contracts/runtime/runtime-display-protocol.ts`  
> Scope: Runtime Plane / AI、Agent、Tool、Workflow、Streaming 的运行态展示协议

## 1. 文档定位

`RuntimeDisplayProtocol` 是 AI Chat OS 的运行态展示协议。

它回答的问题是：

```txt
AI 是如何执行的？模型、工具、Agent、Workflow、Trace、错误、重试、审批状态如何展示？
```

它不负责最终业务结果。最终业务结果必须进入 `SemanticResultContract`。

## 2. 与 SemanticResultContract 的关系

```txt
SemanticResultContract = Result Plane = 最终业务结果
RuntimeDisplayProtocol = Runtime Plane = 执行过程
```

二者通过引用关联：

```txt
SemanticResultContract.regions[].runtimeRefs[]
RuntimeDisplayProtocol.runtimeId / events[].id / toolCalls[].id / workflows[].id
```

规则：

1. Runtime events 不得直接嵌入 `region.data`。
2. 业务结论不得只存在 Runtime trace 里。
3. Runtime 可以为 evidence 提供执行证明，但不能替代业务证据。

## 3. 核心结构

```txt
RuntimeDisplayProtocol
├─ contractType
├─ version
├─ runtimeId
├─ conversationId
├─ messageId
├─ executionId
├─ status
├─ startedAt
├─ endedAt
├─ agents[]
├─ toolCalls[]
├─ workflows[]
├─ streaming
├─ events[]
├─ errors[]
├─ approvals[]
├─ recovery
├─ visibility
├─ permission
└─ metadata
```

## 4. RuntimeStatus

推荐枚举：

```txt
idle                    未开始
queued                  排队中
planning                规划中
running                 运行中
streaming               流式输出中
waiting-for-user        等待用户输入
waiting-for-approval    等待审批
retrying                重试中
recovering              恢复中
succeeded               成功
partially-succeeded     部分成功
failed                  失败
cancelled               已取消
expired                 已过期
```

展示规则：

| 状态 | 普通用户展示 | 管理员展示 |
|---|---|---|
| planning | 正在规划 | 展示 planner / agent 状态 |
| running | 正在执行 | 展示工具、节点、耗时 |
| streaming | 正在生成 | 展示 token / chunk 状态可选 |
| waiting-for-approval | 等待确认 | 展示审批对象和风险 |
| failed | 执行失败 | 展示错误类型、trace、retry |
| partially-succeeded | 部分完成 | 展示成功和失败节点 |

## 5. RuntimeEvent

`RuntimeEvent` 是运行态时间线的最小单位。

推荐 event type：

```txt
runtime-started
runtime-completed
runtime-failed
model-started
model-stream-started
model-token
model-stream-ended
agent-started
agent-completed
agent-failed
tool-call-started
tool-call-progress
tool-call-succeeded
tool-call-failed
workflow-started
workflow-step-started
workflow-step-completed
workflow-step-failed
approval-requested
approval-granted
approval-rejected
retry-scheduled
retry-started
recovery-started
recovery-completed
user-input-requested
user-input-received
```

字段：

```txt
id
runtimeId
type
status
timestamp
title
summary
actor
agentId
toolCallId
workflowId
stepId
durationMs
payload
visibility
permission
error
```

规则：

1. `model-token` 事件不应全部长期保存在前端 state。
2. 面向普通用户的 timeline 应合并高频 event。
3. 管理员可查看原始 event，但敏感参数必须脱敏。

## 6. AgentRuntimeState

字段：

```txt
id
name
role
status
startedAt
endedAt
currentStep
summary
progress
inputRefs
outputRefs
errorRefs
visibility
```

规则：

1. 多 Agent 展示必须有角色区分。
2. 普通用户默认看 Agent 摘要，不看内部 prompt。
3. Agent 输出若成为业务结果，必须写入 SemanticResultContract。

## 7. ToolCallState

字段：

```txt
id
toolName
toolDisplayName
status
startedAt
endedAt
durationMs
inputSummary
outputSummary
inputArtifactRefs
outputArtifactRefs
error
retry
approval
visibility
permission
```

规则：

1. 不得展示原始密钥、token、cookie、完整 SQL 中的敏感字段。
2. 工具输出如果用于业务结论，必须生成 EvidenceRef。
3. 工具失败必须提供用户可理解错误。
4. 可重试工具必须提供 `ActionContract(type=retry)`。

## 8. WorkflowRuntimeState

字段：

```txt
id
name
status
startedAt
endedAt
steps[]
edges[]
currentStepId
progress
criticalPath
errors[]
```

Step 字段：

```txt
id
name
type
status
agentId
toolCallIds[]
dependsOn[]
startedAt
endedAt
summary
error
```

规则：

1. DAG 展示和 Timeline 展示必须来自同一 WorkflowRuntimeState。
2. 失败 step 必须可定位。
3. Workflow 结果必须回写 SemanticResultContract，而不是只停留在 runtime。

## 9. StreamingState

字段：

```txt
status                  idle / streaming / paused / completed / failed
startedAt
lastChunkAt
chunkCount
estimatedCompletion
backpressure            normal / slow-client / paused / dropped
partialMessageRef
```

规则：

1. 前端必须支持 streaming backpressure。
2. 长输出必须分块渲染，不得每个 token 触发全局重渲染。
3. Streaming 完成后应落成稳定的 SemanticResultContract 或消息内容。

## 10. RuntimeError

字段：

```txt
id
code
category                model / tool / workflow / permission / network / timeout / validation / unknown
severity                info / warning / error / critical
message
userMessage
recoverable
retryable
source
occurredAt
relatedEventIds[]
relatedToolCallIds[]
```

规则：

1. 所有错误必须有 `userMessage`。
2. 可恢复错误必须提供 recovery action。
3. 权限错误不能展示内部资源路径。
4. critical 错误必须进入 observability。

## 11. Retry / Recovery / Approval

### Retry

```txt
retryable
maxAttempts
attempt
nextRetryAt
backoffMs
retryActionId
```

### Recovery

```txt
recoveryActions[]
recommendedActionId
autoRecoverable
```

### Approval

```txt
approvalId
status                  pending / approved / rejected / expired
requestedBy
riskLevel
summary
requiredRole
approveActionId
rejectActionId
```

规则：

1. 等待用户确认时必须暂停相关 runtime。
2. 审批 action 必须走 ActionContract。
3. 审批通过后的执行必须形成新的 RuntimeEvent。

## 12. 与现有 AgentProcessEvent / process_events / Timeline 对齐

迁移规则：

```txt
AgentProcessEvent.id              -> RuntimeEvent.id
AgentProcessEvent.type            -> RuntimeEvent.type
AgentProcessEvent.created_at      -> RuntimeEvent.timestamp
AgentProcessEvent.agent_name      -> RuntimeEvent.agentId / actor
AgentProcessEvent.tool_name       -> RuntimeEvent.toolCallId + ToolCallState.toolName
AgentProcessEvent.status          -> RuntimeEvent.status
AgentProcessEvent.payload         -> RuntimeEvent.payload
process_events[]                  -> RuntimeDisplayProtocol.events[]
Timeline item                     -> RuntimeEvent projection
```

禁止：

```txt
process_events 直接驱动业务结果 UI
Timeline 私有定义 event type
ToolCallState 私有定义 retry / approval / error
```

## 13. 最小示例

```json
{
  "contractType": "runtime-display",
  "version": "1.0.0",
  "runtimeId": "runtime_001",
  "executionId": "exec_001",
  "status": "running",
  "startedAt": "2026-05-27T10:00:00+08:00",
  "agents": [
    {
      "id": "agent_analyzer",
      "name": "Performance Analyzer",
      "role": "analysis",
      "status": "running",
      "summary": "正在分析广告表现异常"
    }
  ],
  "toolCalls": [
    {
      "id": "tool_sql_001",
      "toolName": "warehouse.query",
      "toolDisplayName": "查询广告数据",
      "status": "succeeded",
      "durationMs": 1280,
      "inputSummary": "查询近 14 天广告表现",
      "outputSummary": "返回 14 天日粒度数据"
    }
  ],
  "events": [
    {
      "id": "evt_001",
      "runtimeId": "runtime_001",
      "type": "tool-call-succeeded",
      "status": "succeeded",
      "timestamp": "2026-05-27T10:00:04+08:00",
      "title": "广告数据查询完成",
      "toolCallId": "tool_sql_001"
    }
  ]
}
```

## 14. 验收清单

- [ ] AgentProcessEvent 可以无损映射到 RuntimeEvent。
- [ ] process_events 可以统一进入 RuntimeDisplayProtocol。
- [ ] Timeline UI 不私有定义事件结构。
- [ ] retry / recovery / approval 都走统一结构。
- [ ] Runtime 结果不替代 SemanticResultContract。
- [ ] 普通用户和管理员可见性有差异。


---

<!-- Source: docs/architecture/frontend-engineering/component-registry-renderer.md -->

# Component Registry / Renderer Specification

> Canonical path: `docs/architecture/frontend-engineering/component-registry-renderer.md`  
> Type source: `src/contracts/renderer/component-registry.ts`  
> Scope: `componentBinding` 到前端 renderer 的注册、校验、fallback、action/evidence/source/runtime 接入规范

## 1. 文档定位

Component Registry 是前端自主渲染的工程核心。

它回答的问题是：

```txt
SemanticResultContract.regions[].componentBinding 如何被映射到真实前端组件？
```

## 2. 基本链路

```txt
SemanticResultContract
    ↓
SemanticResultRenderer
    ↓
regions[]
    ↓
ComponentRegistry.resolve(componentBinding)
    ↓
Renderer.validate(region.data)
    ↓
Renderer.render(region, RendererContext)
    ↓
ActionDispatcher / EvidenceResolver / SourceResolver / RuntimeResolver
```

## 3. Registry 结构

每个 renderer 注册项必须包含：

```txt
binding                 ComponentBinding
version                 renderer 版本
displayName             可读名称
supportedRegionTypes    支持的 RegionType
validate                data 校验函数
render                  渲染函数
fallback                局部 fallback renderer
capabilities            能力声明
performance             性能策略声明
```

## 4. 必备 renderer

首批必须注册：

```txt
markdown-result
data-visualization
ai-runtime
workflow-trace
asset-reference
decision-card
evidence-panel
source-list
action-bar
permission-gate
empty-state
error-state
```

## 5. Renderer 不得做的事

renderer 禁止：

1. 私有定义 action 结构。
2. 私有定义 evidence 结构。
3. 私有定义 source 结构。
4. 私有定义 runtime event 结构。
5. 直接调用业务 API。
6. 直接执行 destructive action。
7. 直接读取全局 store 中与 region 无关的数据。
8. 直接解析未注册的 schema。
9. 将后端传入字符串当作组件名动态执行。
10. 绕过权限与可见性判断。

## 6. RendererContext

所有 renderer 只能通过统一 context 接入外部能力：

```txt
RendererContext
├─ actionDispatcher
├─ evidenceResolver
├─ sourceResolver
├─ runtimeResolver
├─ artifactResolver
├─ permissionChecker
├─ visibilityEvaluator
├─ telemetry
├─ featureFlags
└─ environment
```

## 7. validate 机制

每个 renderer 必须提供 `validate(data)`。

返回：

```txt
valid                   是否有效
errors[]                致命错误
warnings[]              可降级问题
normalizedData          可选，规范化后的数据
```

规则：

1. validate 失败时进入 fallback renderer。
2. validate warning 不阻断渲染，但必须打 telemetry。
3. 生产环境不得直接展示 raw validation error。

## 8. fallback renderer

fallback 层级：

```txt
1. renderer.localFallback
2. registry.globalFallback
3. SemanticRegion.fallback
4. ErrorBoundary fallback
```

常见 fallback：

```txt
UnsupportedBindingRenderer
InvalidDataRenderer
PermissionBlockedRenderer
SourceUnavailableRenderer
EvidenceUnavailableRenderer
RuntimeUnavailableRenderer
RenderErrorRenderer
```

## 9. data-visualization renderer

`data-visualization` 负责：

```txt
metric-card
table
pivot-table
line-chart
bar-chart
area-chart
scatter-chart
funnel
sankey
path-analysis
cohort
ai-insight
```

规则：

1. `VizSpec` 只能作为 `region.data` 的局部 shape。
2. 下钻、筛选、导出、继续分析必须使用 `ActionContract`。
3. 指标解释、异常、Insight 必须挂 EvidenceRef。
4. 大表格必须支持分页或虚拟化。
5. 大图表必须支持懒加载和降级。

## 10. ai-runtime renderer

`ai-runtime` 负责：

```txt
模型生成状态
Agent 摘要
工具调用摘要
等待用户确认
错误与重试
```

规则：

1. 详细 trace 默认折叠。
2. 普通用户默认看摘要。
3. 管理员可展开 ToolCall、Workflow、Event。
4. retry / approval 必须走 ActionContract。

## 11. workflow-trace renderer

`workflow-trace` 负责：

```txt
Timeline
DAG Viewer
Step Status
Critical Path
Error Step
Retry Step
```

规则：

1. 数据源必须是 RuntimeDisplayProtocol.workflows[] 和 events[]。
2. 不得私有维护另一套 timeline schema。
3. 节点操作使用 ActionContract。

## 12. evidence-panel renderer

规则：

1. 只渲染 EvidenceRef。
2. 展示 EvidenceRef 与 SourceRef 的关系。
3. 证据不可见时显示权限或脱敏提示。
4. 低置信度证据要明确标识。

## 13. source-list renderer

规则：

1. 只渲染 SourceRef。
2. 可点击来源必须通过 `ActionContract(type=open-source)`。
3. 显示 freshness / reliability / permission 状态。
4. 不直接暴露敏感 locator。

## 14. 性能约束

renderer 必须声明：

```txt
virtualized             是否需要虚拟化
lazy                    是否懒加载
streamingAware          是否支持流式
maxInlineItems          内联最大项目数
artifactBacked          是否依赖 artifact
mobileDegradable        移动端是否降级
```

规则：

1. 大表格不得一次性渲染全部行列。
2. 长 markdown 必须分块渲染。
3. 大图表必须懒加载。
4. Runtime 高频事件必须合并或虚拟化。

## 15. 验收清单

- [ ] 所有 componentBinding 都在 registry 中注册。
- [ ] 所有 renderer 有 validate。
- [ ] 所有 renderer 有 fallback。
- [ ] renderer 通过 context 使用 action/evidence/source/runtime。
- [ ] renderer 不私有定义协议。
- [ ] renderer 有性能声明。


---

<!-- Source: docs/architecture/interaction-system/ai-runtime-ux.md -->

# AI Runtime UX Specification

> Canonical path: `docs/architecture/interaction-system/ai-runtime-ux.md`  
> Depends on: `RuntimeDisplayProtocol`, `ActionContract`, `Component Registry`  
> Scope: AI 执行过程、工具调用、Trace、错误、重试、审批、多 Agent 的体验规范

## 1. 文档定位

AI Runtime UX 是 Interaction System 下的运行态体验域。

它不定义新的协议，必须使用：

```txt
RuntimeDisplayProtocol
ActionContract
ComponentBinding = ai-runtime / workflow-trace
```

## 2. 基本体验原则

1. 普通用户看“可理解的进度”，不是底层日志。
2. 管理员和开发者可以展开 trace。
3. Runtime 过程不抢占最终结果。
4. 失败状态必须可解释、可恢复。
5. 等待用户确认时必须明确阻塞原因和风险。
6. 工具调用必须脱敏。

## 3. 状态展示

| RuntimeStatus | 用户文案 | 展示方式 |
|---|---|---|
| queued | 已加入队列 | 轻量状态条 |
| planning | 正在规划分析步骤 | 思考状态 |
| running | 正在执行 | 进度条 / timeline 摘要 |
| streaming | 正在生成回答 | 流式输出 |
| waiting-for-user | 需要你的补充 | 输入提示 |
| waiting-for-approval | 等待确认 | 审批卡 |
| retrying | 正在重试 | 状态条 + 尝试次数 |
| recovering | 正在恢复 | 恢复提示 |
| succeeded | 已完成 | 自动收起 runtime |
| partially-succeeded | 部分完成 | 展示失败项 |
| failed | 执行失败 | 错误卡 + retry |

## 4. 模型生成状态

普通用户展示：

```txt
正在理解问题
正在分析数据
正在组织回答
```

管理员可展开：

```txt
model id
latency
token count
stream chunks
truncation / context compression status
```

禁止展示：

```txt
系统 prompt
密钥
完整隐藏上下文
未脱敏内部参数
```

## 5. 工具调用卡

工具调用卡分两层：

```txt
普通摘要层：工具名称、状态、耗时、结果摘要
高级详情层：输入摘要、输出摘要、错误、重试、artifact
```

字段展示：

| 字段 | 普通用户 | 管理员 |
|---|---|---|
| toolDisplayName | 显示 | 显示 |
| toolName | 隐藏或弱显示 | 显示 |
| inputSummary | 显示脱敏摘要 | 显示脱敏详情 |
| outputSummary | 显示 | 显示 |
| raw input | 不显示 | 视权限显示 |
| raw output | 不显示 | 视权限显示 |
| error code | 简化 | 完整 |

## 6. Trace 展示

默认策略：

```txt
普通用户：默认折叠，只看关键节点
管理员：可展开完整 timeline
开发者：可查看 event payload 脱敏版
```

Trace 展示形态：

```txt
compact timeline
expanded timeline
DAG viewer
step detail drawer
error focus view
```

规则：

1. 高频事件必须合并。
2. 失败节点必须自动定位。
3. 成功完成后 runtime 默认折叠。
4. Trace 不得压过最终 answer。

## 7. 错误与重试

错误卡必须包含：

```txt
用户可理解原因
影响范围
是否已产生部分结果
可选恢复动作
retry action
联系管理员提示，可选
```

规则：

1. 可重试错误必须显示 retry。
2. 权限错误显示申请权限，而不是 retry。
3. 数据为空不是系统错误，应走 empty-state。
4. 多次失败后必须降级，避免无限 retry。

## 8. 等待用户确认

等待确认使用 `decision-card` 或 `ai-runtime` 区块。

必须显示：

```txt
要执行什么
为什么需要确认
风险等级
影响对象
证据 / 来源
确认 / 拒绝 action
```

规则：

1. 风险动作必须二次确认。
2. 审批动作走 ActionContract。
3. 审批完成写入 RuntimeEvent。

## 9. 多 Agent 展示

多 Agent 展示必须区分：

```txt
Agent 名称
Agent 角色
当前状态
产出摘要
依赖关系
```

推荐展示：

```txt
Agent chips
Agent timeline lanes
Workflow DAG node group
```

规则：

1. 不同 Agent 的错误必须可定位。
2. Agent 内部 prompt 默认不展示。
3. Agent 最终产出必须进入 SemanticResultContract。

## 10. 可见性差异

| 内容 | 普通用户 | 管理员 | 开发者 |
|---|---|---|---|
| 模型状态 | 摘要 | 详情 | 详情 |
| 工具名称 | 业务名 | 业务名 + 内部名 | 完整 |
| Tool input | 摘要 | 脱敏详情 | 权限内详情 |
| Trace payload | 不显示 | 脱敏 | 权限内完整 |
| Latency | 可选 | 显示 | 显示 |
| Error code | 简化 | 完整 | 完整 |

## 11. 折叠策略

默认折叠：

```txt
成功完成的 tool call
高频 model-token event
内部 workflow step
管理员详情
```

默认展开：

```txt
当前正在执行的步骤
等待用户确认
失败步骤
部分成功说明
```

## 12. 验收清单

- [ ] Runtime UX 不定义新协议。
- [ ] Runtime UI 来自 RuntimeDisplayProtocol。
- [ ] retry / approval 走 ActionContract。
- [ ] 普通用户和管理员展示不同。
- [ ] 工具调用脱敏。
- [ ] 失败可解释、可恢复。


---

<!-- Source: docs/architecture/interaction-system/ai-trust-ux.md -->

# AI Trust UX Specification

> Canonical path: `docs/architecture/interaction-system/ai-trust-ux.md`  
> Depends on: `EvidenceRef`, `SourceRef`, `ActionContract`, `SemanticResultContract`  
> Scope: 可信解释、证据、来源、置信度、新鲜度、AI 推断、风险提示的体验规范

## 1. 文档定位

AI Trust UX 是 Interaction System 下的可信体验域。

它不定义新的 evidence/source 协议，必须复用：

```txt
EvidenceRef
SourceRef
ActionContract
SemanticResultContract.evidenceRefs / sourceRefs
```

## 2. 哪些内容必须显示证据

必须显示证据或证据入口：

1. 指标变化原因。
2. 异常归因。
3. AI Insight。
4. 风险建议。
5. 预算 / 投放 / 账户 / 权限相关建议。
6. 排名、对比、最优、最差判断。
7. 预测、估算、推断。
8. 继续分析建议。
9. 自动化执行建议。
10. 用户可能据此做业务决策的结论。

## 3. 证据展示层级

### L1：轻量标识

```txt
有证据
数据截至 2026-05-26
高置信度
```

### L2：证据摘要

```txt
证据标题
摘要
来源数量
置信度
新鲜度
```

### L3：证据详情

```txt
字段值
计算过程
查询结果
文档片段
工具输出摘要
脱敏说明
```

## 4. 置信度展示

| Confidence | 展示文案 | 使用限制 |
|---|---|---|
| high | 高可信 | 可作为明确结论 |
| medium | 中等可信 | 建议用户复核 |
| low | 低可信 | 只能作为线索 |
| unknown | 可信度未知 | 不得作为确定结论 |

规则：

1. 低置信度结论必须使用“可能”、“建议复核”等语气。
2. 高风险动作不能只基于低置信度证据。
3. 置信度不是模型自信度的简单外显，必须说明 basis。

## 5. AI 推断与真实数据区分

必须区分：

```txt
真实数据              来自 SourceRef 的数据
计算结果              基于数据和公式得到
AI 推断               模型根据证据做出的解释
人工确认              人类审批或确认
```

展示标签：

```txt
Data-backed
Calculated
AI-inferred
Human-approved
```

中文可用：

```txt
数据支持
计算得出
AI 推断
人工确认
```

规则：

1. AI 推断不能伪装为真实数据。
2. 图表观察属于 AI 推断或 chart-observation evidence。
3. 人工确认必须有时间和角色。

## 6. 来源不可见与脱敏

来源不可见时展示：

```txt
来源受权限限制
部分字段已脱敏
你没有权限查看该来源
可申请权限
```

规则：

1. 不可见来源不代表无来源。
2. 脱敏后仍应保留来源类型和新鲜度，除非会泄露敏感信息。
3. 申请权限动作必须走 ActionContract。

## 7. 数据新鲜度

数据类结果必须展示：

```txt
数据截至时间
生成时间，可选
来源更新时间，可选
是否过期
```

文案示例：

```txt
数据截至 2026-05-26 23:59
数据可能不是最新
数据新鲜度未知
该结果基于过期数据，不建议直接用于决策
```

规则：

1. `stale` 数据结论需要警示。
2. `expired` 数据结论不能触发高风险自动化动作。
3. 新鲜度未知时必须弱化结论确定性。

## 8. 幻觉风险提示

以下场景必须提示风险：

1. 无 evidence 的 AI 推断。
2. Source 不可见或 unknown。
3. 低置信度。
4. 数据过期。
5. 模型根据不完整上下文生成建议。
6. 工具调用失败后仍给出部分建议。

提示方式：

```txt
Inline warning
Evidence badge
Trust panel
Action confirm warning
```

## 9. 风险建议确认

风险建议包括：

```txt
调整预算
暂停投放
修改权限
删除数据
对外发送报告
执行自动化 workflow
```

必须包含：

```txt
风险等级
影响对象
证据
来源
确认动作
拒绝动作
审计记录
```

## 10. Trust Panel

Trust Panel 推荐内容：

```txt
证据列表
来源列表
数据新鲜度
置信度
AI 推断说明
脱敏说明
运行态引用，可选
```

## 11. 验收清单

- [ ] 所有 AI Insight 有证据入口。
- [ ] AI 推断和真实数据有区分。
- [ ] 数据新鲜度可见。
- [ ] 来源不可见时有脱敏提示。
- [ ] 风险建议需要确认。
- [ ] 低置信度不会被展示为确定结论。


---

<!-- Source: docs/architecture/frontend-engineering/frontend-engineering-system.md -->

# Frontend Engineering System Specification

> Canonical path: `docs/architecture/frontend-engineering/frontend-engineering-system.md`  
> Scope: 长会话、大表格、大图表、Streaming、Markdown、Artifact、状态、响应式、可观测性等工程约束

## 1. 文档定位

Frontend Engineering System 是 AI Chat OS 的工程约束层。

它不定义业务语义协议，但约束所有 renderer、chat surface、runtime timeline、data visualization 的实现方式。

## 2. 长会话窗口加载

原则：前端永远不要一次性加载完整会话历史。

推荐：

```txt
会话列表：cursor pagination
打开会话：只加载最近 40 条消息
向上滚动：before_message_id 加载更早消息
搜索跳转：around_message_id 加载上下文窗口
```

约束：

1. 会话列表接口不得返回完整 messages。
2. 前端状态只保存当前窗口消息。
3. 超过 100 条消息必须虚拟列表。
4. 搜索不能靠前端全量过滤。
5. 长历史可以使用 summary block 折叠。

## 3. 虚拟列表

适用场景：

```txt
消息列表超过 100 条
Runtime events 超过 100 条
表格行超过 200 行
Source / Evidence 列表超过 100 条
```

规则：

1. Chat 消息支持动态高度。
2. 向上加载历史时必须保持滚动锚点。
3. 图片、表格、Markdown 渲染完成后要修正高度。
4. 当前 streaming 消息要避免频繁重排。

## 4. 大表格处理

规则：

1. 大表格不直接放入 message body。
2. 大表格作为 `asset-reference` 或 `data-visualization` region。
3. 行分页、列裁剪、列虚拟化按需启用。
4. 默认只显示 preview。
5. 导出走 ActionContract。

建议阈值：

```txt
> 100 行：分页
> 200 行：行虚拟化
> 30 列：列管理 / 横向虚拟化
> 5000 单元格：Artifact-backed table
```

## 5. 大图表处理

规则：

1. 大图表懒加载。
2. 首屏只渲染关键图表。
3. 复杂图表移动端降级为摘要卡或表格预览。
4. 图表数据使用 datasetRef / artifactRef，避免塞入超大 JSON。
5. 图表联动、下钻、导出走 ActionContract。

## 6. Streaming backpressure

规则：

1. 不得每个 token 更新全局状态。
2. streaming chunk 应批处理。
3. Markdown streaming 分块解析。
4. 慢设备可降低更新频率。
5. 用户切换会话时暂停非可见区渲染。
6. 后端完成后应固化为稳定消息或 SemanticResultContract。

## 7. Markdown 分块渲染

规则：

1. 长 Markdown 分块渲染。
2. Code block、table、math、chart placeholder 独立懒渲染。
3. Markdown 内的 artifact 不内联大对象。
4. 渲染错误局部 fallback，不影响整条消息。

## 8. Artifact 懒加载

Artifact 类型：

```txt
table
chart
file
image
report
dataset
runtime-log
trace
```

规则：

1. 消息中只存 artifact_ref。
2. 点击或进入视口再加载 artifact。
3. 大 artifact 支持分页或 range fetch。
4. Artifact 权限独立校验。
5. Artifact 加载失败有 fallback。

## 9. 状态分层

推荐状态层：

```txt
Server state            API/cache/query result
Session state           当前会话窗口、当前 runtime
UI state                折叠、选中、面板开关
Streaming state         临时 chunk buffer
Persistent state        用户偏好、布局设置
Telemetry state         性能与错误观测
```

规则：

1. 不把 server state 复制到多个 store。
2. streaming buffer 不长期持久化。
3. region renderer 只拿自己的 region 和 context。
4. Runtime events 大量增长时使用窗口化状态。

## 10. 移动端降级

规则：

1. 多栏布局降级为单栏。
2. Side panel 降级为 drawer。
3. 大图表降级为摘要 + 查看详情。
4. 大表格默认显示关键列。
5. Runtime trace 默认折叠。
6. Action bar 收进 overflow menu。

## 11. 可观测性

必须采集：

```txt
contract validation error
renderer fallback
render duration
large artifact load time
streaming lag
virtual list dropped frame
runtime event count
action success / failure
permission denied
```

规则：

1. renderer fallback 必须打点。
2. Action failure 必须有 error code。
3. Runtime critical error 必须进入 observability。
4. 性能指标按 region / renderer 维度归因。

## 12. 验收清单

- [ ] 长会话不会全量加载。
- [ ] 消息、表格、runtime event 支持虚拟化。
- [ ] 大 Artifact 懒加载。
- [ ] Streaming 不导致全局频繁重渲染。
- [ ] 移动端有降级策略。
- [ ] renderer fallback 和性能有打点。


---

<!-- Source: docs/architecture/visual-system/visual-system-breakdown.md -->

# Visual System Breakdown Specification

> Canonical path: `docs/architecture/visual-system/visual-system-breakdown.md`  
> Scope: Visual System 的拆分目录与 token 收口规则

## 1. 文档定位

Visual System 是所有 region、renderer、runtime、data visualization、conversation surface 共用的视觉基础。

它不定义业务协议，不定义 renderer data shape。

## 2. 推荐拆分文档

```txt
visual-system/
├─ typography.md
├─ color-system.md
├─ icon-system.md
├─ spacing-system.md
├─ radius-border-system.md
├─ elevation-shadow-system.md
├─ motion-system.md
└─ illustration-visual-language.md
```

## 3. Typography

已覆盖项继续保留：

```txt
font family
font size
font weight
line height
letter spacing
数字字体
中英文混排
标题层级
body / label / caption
code / monospace
```

约束：

1. 字号、字重、行高必须 token 化。
2. Chat message、Data card、Runtime timeline 不得私有定义字体层级。

## 4. Color System

已覆盖项继续保留：

```txt
brand color
neutral color
semantic color
background layer
text color
border color
status color
chart color
AI status color
```

约束：

1. 颜色不得散落硬编码。
2. AI Trust、Runtime、Data Visualization 必须复用 semantic color。
3. 风险、错误、警告颜色必须一致。

## 5. Icon System

待补重点：

```txt
icon library
icon size scale
stroke width
filled / outlined rule
status icon
AI / agent icon
tool icon
data source icon
evidence icon
action icon
```

约束：

1. 同一语义只允许一个主图标。
2. 图标不可替代文本说明。
3. 高风险动作图标必须匹配 intent。

## 6. Spacing System

待补重点：

```txt
base spacing scale
page padding
card padding
section gap
message gap
form gap
timeline gap
data table density
responsive spacing
```

约束：

1. 不允许随意 `margin: 13px`。
2. Chat、Runtime、Data Visualization 的间距必须来自同一 scale。
3. compact / comfortable / spacious 与 layoutHints.density 对齐。

## 7. Radius / Border

待补重点：

```txt
radius scale
card radius
button radius
input radius
modal radius
border color
divider
focus ring
selected border
error border
```

约束：

1. focus ring 不能被去掉。
2. selected / active / error border 必须与 Color System 对齐。
3. Card / Panel / Message bubble 使用统一圆角等级。

## 8. Elevation / Shadow

待补重点：

```txt
layer scale
shadow token
modal elevation
drawer elevation
tooltip elevation
popover elevation
sticky header elevation
runtime floating panel elevation
```

约束：

1. z-index 必须 token 化。
2. modal / drawer / popover / tooltip 层级不得互相覆盖失控。
3. Runtime overlay 不得遮挡关键确认动作。

## 9. Motion System

待补重点：

```txt
duration scale
easing
hover motion
collapse / expand
streaming reveal
skeleton
loading shimmer
message insertion
runtime timeline update
toast animation
modal transition
reduced motion
```

约束：

1. 流式输出动效不得影响阅读。
2. Runtime 高频更新不得全部做动画。
3. 尊重 reduced motion。
4. 动效时长必须 token 化。

## 10. Codex CLI 检查项

```txt
1. 搜索硬编码颜色。
2. 搜索硬编码字号、字重、行高。
3. 搜索随意 margin / padding。
4. 搜索散落 z-index。
5. 搜索未 token 化 box-shadow。
6. 搜索未统一 icon import。
7. 搜索 transition duration magic number。
```


---

<!-- Source: docs/architecture/interaction-system/conversation-input-feedback-ux.md -->

# Conversation UX / Input UX / Feedback UX Specification

> Canonical path: `docs/architecture/interaction-system/conversation-input-feedback-ux.md`  
> Scope: AI Chat OS 的会话、输入、反馈核心体验域

## 1. 文档定位

Conversation UX、Input UX、Feedback UX 是 AI Chat OS 的核心交互域。

它们必须复用：

```txt
SemanticResultContract
RuntimeDisplayProtocol
ActionContract
EvidenceRef
SourceRef
Component Registry
```

## 2. 消息布局

消息类型：

```txt
user-message
assistant-message
semantic-result-message
runtime-status-message
system-notice
error-message
artifact-message
```

规则：

1. 普通文本可以 markdown 渲染。
2. 结构化结果必须使用 SemanticResultContract。
3. Runtime 状态必须使用 RuntimeDisplayProtocol。
4. Artifact 只显示引用，不内联大对象。

## 3. 长消息折叠

默认折叠对象：

```txt
超长 Markdown
大表格
长 evidence 列表
长 source 列表
runtime trace
工具调用详情
```

规则：

1. 折叠不应隐藏关键结论。
2. 展开后保持滚动锚点。
3. 搜索命中区域应自动展开。
4. 管理员详情默认折叠。

## 4. Streaming UX

阶段：

```txt
thinking / planning
running tools
generating
finalizing
completed
```

规则：

1. 流式输出应稳定，不跳动。
2. 工具调用和生成状态要区分。
3. 用户可见输出优先展示自然语言摘要。
4. 结构化结果应在完成后固化为 SemanticResultContract。

## 5. 多轮追问

规则：

1. 追问建议使用 ActionContract(type=continue-analysis)。
2. 追问按钮应携带上下文引用。
3. 追问产生新消息，不直接改写旧结果，除非 action.resultHandling 明确指定。
4. 长会话应使用 context compression 和 summary block。

## 6. Input UX

输入能力：

```txt
文本输入
多行输入
文件上传
粘贴图片 / 表格
Mention
Slash command
Prompt shortcut
语音，可选
```

规则：

1. 输入框要显示当前模式。
2. 文件上传必须显示状态、大小、权限。
3. Slash command 不应绕过 ActionContract。
4. 输入过长时提示上下文限制或自动摘要策略。

## 7. Feedback UX

反馈类型：

```txt
toast
inline status
error card
warning card
empty state
permission state
retry state
success state
```

规则：

1. 异步 action 必须有 loading / success / error。
2. 错误必须可理解。
3. 用户可恢复错误提供 action。
4. 权限错误提供解释和申请入口。
5. 空状态不等于错误。

## 8. ResponseContract 升级规则

旧响应如果只是文本：

```txt
ResponseContract.text -> markdown-result region
```

旧响应如果带图表 / 表格：

```txt
ResponseContract.visualization -> data-visualization region
```

旧响应如果带来源：

```txt
ResponseContract.sources -> SourceRef[]
```

旧响应如果带证据：

```txt
ResponseContract.evidence -> EvidenceRef[]
```

## 9. 验收清单

- [ ] 消息结构化结果使用 SemanticResultContract。
- [ ] Runtime 状态不混入普通消息 schema。
- [ ] Streaming 有阶段展示。
- [ ] 长消息和 trace 可折叠。
- [ ] 输入、反馈、错误可恢复。


---

<!-- Source: docs/architecture/migration/legacy-contract-mapping.md -->

# Legacy Contract Mapping Specification

> Canonical path: `docs/architecture/migration/legacy-contract-mapping.md`  
> Scope: 旧协议、旧 ViewModel、旧 UI Schema 向 AI Chat OS 统一协议迁移的映射规则

## 1. 文档定位

本文件用于指导 Codex CLI 遍历项目中的旧结构，并迁移到：

```txt
SemanticResultContract
ActionContract
EvidenceRef
SourceRef
RuntimeDisplayProtocol
Component Registry
```

## 2. ResponseContract -> SemanticResultContract

### 2.1 文本回答

```txt
ResponseContract.content
ResponseContract.markdown
ResponseContract.answer
```

映射为：

```txt
regions[].componentBinding = "markdown-result"
regions[].type = "summary" 或 "primary-result"
```

### 2.2 结构化结果

```txt
ResponseContract.cards
ResponseContract.sections
ResponseContract.blocks
```

映射为：

```txt
SemanticResultContract.regions[]
```

### 2.3 动作

```txt
ResponseContract.actions
ResponseContract.buttons
ResponseContract.nextSteps
```

映射为：

```txt
ActionContract[]
```

### 2.4 来源与证据

```txt
ResponseContract.sources -> SourceRef[]
ResponseContract.evidence -> EvidenceRef[]
```

## 3. MetricExplainerUISchema -> SemanticResultContract

旧结构：

```txt
MetricExplainerUISchema
├─ metric
├─ explanation
├─ drivers
├─ charts
├─ table
├─ suggestions
└─ sources
```

新结构：

```txt
SemanticResultContract
├─ screenType = "metric-explainer"
├─ regions[]
│  ├─ markdown-result summary
│  ├─ data-visualization metric-card
│  ├─ data-visualization chart
│  ├─ data-visualization table
│  └─ action-bar
├─ evidenceRefs[]
└─ sourceRefs[]
```

规则：

1. `drivers` 必须变成 insight region，并挂 evidenceRefs。
2. `suggestions` 必须变成 ActionContract 或 markdown-result 的建议区。
3. 图表下钻不能留在 chart 私有 action。

## 4. VizSpec -> data-visualization region.data

`VizSpec` 不能替代 `SemanticResultContract`。

正确落点：

```txt
regions[].componentBinding = "data-visualization"
regions[].data = VizSpec-compatible local shape
```

示例：

```json
{
  "id": "region_cpa_chart",
  "type": "data-view",
  "componentBinding": "data-visualization",
  "data": {
    "kind": "line-chart",
    "metric": "CPA",
    "datasetRef": "artifact_dataset_001"
  }
}
```

规则：

1. `VizSpec.actions` 迁移为 `ActionContract[]`。
2. `VizSpec.sources` 迁移为 `SourceRef[]`。
3. `VizSpec.evidence` 迁移为 `EvidenceRef[]`。
4. `VizSpec` 只保留图表局部表达。

## 5. ReportQueryViewModel -> SemanticResultContract

旧结构常见字段：

```txt
query
result
tables
charts
filters
exports
sources
```

新结构：

```txt
screenType = "report-result"
regions:
  summary -> markdown-result
  filters -> form-input 或 action-bar
  tables -> data-visualization
  charts -> data-visualization
  export -> ActionContract(type=export)
  sources -> source-list
```

规则：

1. `filters` 的应用动作必须走 ActionContract。
2. `exports` 必须走 ActionContract(type=export)。
3. 数据来源进入 SourceRef。
4. 报告结论进入 EvidenceRef。

## 6. AgentProcessEvent -> RuntimeDisplayProtocol

旧结构：

```txt
AgentProcessEvent
process_events[]
TimelineItem
ToolCallEvent
```

映射：

```txt
AgentProcessEvent.id              -> RuntimeEvent.id
AgentProcessEvent.type            -> RuntimeEvent.type
AgentProcessEvent.status          -> RuntimeEvent.status
AgentProcessEvent.created_at      -> RuntimeEvent.timestamp
AgentProcessEvent.agent           -> AgentRuntimeState
AgentProcessEvent.tool            -> ToolCallState
AgentProcessEvent.workflow_step   -> WorkflowRuntimeState.steps[]
AgentProcessEvent.error           -> RuntimeError
```

规则：

1. Timeline UI 从 RuntimeEvent projection 生成。
2. 不得让 TimelineItem 成为新协议。
3. Runtime 产出的业务结果必须回写 SemanticResultContract。

## 7. Codex CLI 搜索关键词

```txt
ResponseContract
UISchema
ViewModel
MetricExplainer
VizSpec
ReportQuery
AgentProcessEvent
process_events
TimelineItem
ToolCall
source
sources
evidence
actions
buttons
nextSteps
```

## 8. 迁移优先级

```txt
P0 类型定义：src/contracts/*
P0 action/evidence/source 收口
P1 ResponseContract -> SemanticResultContract
P1 AgentProcessEvent -> RuntimeDisplayProtocol
P1 ComponentRegistry 接入
P2 MetricExplainer / ReportQuery / VizSpec 映射
P3 UI 视觉和交互细节调整
```

## 9. 验收清单

- [ ] 旧 UI schema 不再作为最终渲染总协议。
- [ ] 旧 actions 已迁移为 ActionContract。
- [ ] 旧 sources 已迁移为 SourceRef。
- [ ] 旧 evidence 已迁移为 EvidenceRef。
- [ ] 旧 process_events 已迁移为 RuntimeDisplayProtocol。
- [ ] VizSpec 只存在于 data-visualization region.data。
