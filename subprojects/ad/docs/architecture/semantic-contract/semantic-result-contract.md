# Unified Semantic Contract — SemanticResultContract Specification

> Canonical path: `docs/architecture/semantic-contract/semantic-result-contract.md`  
> Type source: `frontend/src/src/contracts/semantic/semantic-result-contract.ts`  
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

前端必须以 `frontend/src/src/contracts/semantic/semantic-result-contract.ts` 为类型真源。

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

## v0.2 总纲一致性补充

SemanticResultContract 继续作为最终业务结果语义契约，并新增总纲级引用口径：结构化结果进入 `regions[]`；证据通过 Evidence Ledger 归档并由 `evidenceRefs` 引用；异步任务通过 `taskRefs` 引用；可保存产物通过 `artifactRefs` 引用；报表通过 Report Domain 生成后收口为 regions、artifactRefs、taskRefs 与 actions。SemanticResultContract 不承载完整 runtime trace，也不承载 MCP 原始 payload。
