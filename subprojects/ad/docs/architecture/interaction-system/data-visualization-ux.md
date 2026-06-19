# Data Visualization UX

- status: active
- parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
- binding: `regions[].componentBinding = "data-visualization"`
- design-system: `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md`

## 1. 定位

Data Visualization UX 是 Enterprise AI Chat OS 的 Interaction System 子规范，负责广告数据结果如何被看懂、追溯和继续处理。

它不是新的总协议。任何指标卡、表格、图表、Sankey、路径分析或 AI Insight 都必须挂在 Unified Semantic Contract 的 region 下：

```text
SemanticResultContract
└─ regions[]
   ├─ componentBinding: "data-visualization"
   ├─ actions: ActionContract[]
   ├─ evidenceRefs: string[]
   ├─ sourceRefs: string[]
   └─ data: DataVisualizationRegionData
```

## 2. 统一规则

1. 数据展示必须来自结构化数据、`datasetRef` 或旧结果兼容输入，不从自然语言正文解析事实。
2. 所有下钻、导出、继续分析、筛选、排序、切换视图都必须走 ActionContract。
3. 所有洞察、异常、风险、归因、建议必须挂 EvidenceRef / SourceRef。
4. Data Visualization renderer 只能定义局部 data shape，不得重新定义 screenType、regions、actions、evidenceRefs 或 sourceRefs。
5. 未知或不完整数据必须降级为 fallback，不展示虚构趋势。
6. 移动端优先展示结论、关键指标和下一步动作，再展示图表和明细。

## 3. 展示类型

| 类型 | 用途 | 必备内容 | 交互 |
| --- | --- | --- | --- |
| 指标卡 | 展示核心 KPI 和变化 | 指标名、数值、单位、时间范围、环比/同比、口径 | 查看口径、继续分析、下钻 |
| 表格 | 展示明细与对比 | 列定义、行数据或 datasetRef、空态、大数据策略 | 排序、筛选、固定关键列、导出、行级下钻 |
| 图表 | 展示趋势、构成、对比 | chartType、datasetRef 或 series、坐标语义、tooltip | hover/tap tooltip、legend、zoom、brush、drill-down |
| Sankey | 展示流量、转化、消耗路径 | nodes、links、value、阶段、损耗 | 节点下钻、链路解释、异常路径查看 |
| 路径分析 | 展示用户或投放路径 | steps、conversion、dropoff、attribution | 阶段下钻、对比路径、查看证据 |
| AI Insight | 展示洞察与建议 | conclusion、confidence、severity、evidenceRefs、sourceRefs | 查看证据、继续分析、创建任务 |

## 4. 指标卡规范

指标卡只用于回答“哪个指标值得用户立刻关注”。不得为了填充页面批量堆叠。

必备字段：

- `metricId`
- `label`
- `value`
- `unit`
- `timeRange`
- `trend`
- `definitionRef` 或 `evidenceRefs`
- `actions`

状态规则：

- 上升或下降不能只靠颜色表达，必须有文字或图标语义。
- 风险指标使用风险等级色，但必须说明依据。
- 多指标并列时最多突出 1 个主指标，其余保持辅助层级。

## 5. 表格规范

表格服务于“核对、定位、选择、下钻”，不能作为页面主结构堆数据。

必备能力：

- 列类型：文本、数字、金额、百分比、时间、状态、动作。
- 关键列固定：移动端至少保留主对象列。
- 大数据策略：分页、虚拟滚动、采样预览或 datasetRef。
- 空态说明：当前条件、无数据原因、下一步建议。
- 行级动作：必须映射为 ActionContract。

禁止：

- 把大表格直接塞入 Markdown。
- 一次性渲染超大明细全集。
- 使用没有来源或时间范围的表格结论。

## 6. 图表交互规范

所有图表必须具备可理解的非视觉摘要，避免用户只能靠颜色判断。

基础规则：

- Tooltip 显示指标名、值、单位、时间或维度、口径提示。
- Drill-down 使用 ActionContract，不在 chart option 里私有化动作。
- 图表联动通过统一 action 或本地 UI state 完成，跨 region 联动必须有明确 region id。
- 图例可隐藏系列，但不得改变原始数据事实。
- 图表为空时展示条件、原因和建议动作。

移动端规则：

- 默认单列展示。
- Tooltip 支持 tap。
- 复杂图表可提供“查看明细”或“展开图表”动作。
- 表格明细优先进入全屏或抽屉，不压缩到不可读。

## 7. Sankey 与路径分析

Sankey 用于展示预算、流量、曝光、点击、转化、成本或用户路径的流动关系。

路径分析用于展示阶段转化、跳出点、瓶颈和归因线索。

必备规则：

- 每条链路必须有 `value`、`source`、`target` 和时间范围。
- 损耗或异常必须挂 EvidenceRef。
- 节点点击只能触发 ActionContract。
- 节点过多时默认聚合长尾，并提供展开动作。
- 移动端默认展示 Top path 和关键异常，不完整展开全图。

## 8. AI Insight 展示

AI Insight 既属于 Data Visualization UX，也属于 AI Trust UX。

每条 Insight 必须包含：

- 结论：用户能直接理解的业务语言。
- 置信度或确定性等级。
- 证据引用：`evidenceRefs`。
- 来源引用：`sourceRefs`。
- 限制说明：数据不足、推断、口径差异或权限限制。
- 下一步动作：继续分析、下钻、导出、创建任务或查看来源。

没有证据的内容只能标记为建议或假设，不能展示为确定结论。

## 9. 当前代码映射

| 当前对象 | 新归属 |
| --- | --- |
| `frontend/src/src/types/viz.ts` | `data-visualization` binding 的兼容局部 data shape |
| `DataVizRenderer` | `componentBinding = "data-visualization"` 的 renderer |
| `ReportQueryResultCard` | `report-result` 的结果卡，内部可包含 data-visualization region |
| `ReportQueryViewModel.insights` | AI Insight 兼容输入，后续迁移到 EvidenceRef / SourceRef |
| `next_actions` | 兼容输入，后续迁移到 ActionContract |

## 10. 验收清单

- [ ] Data Visualization 没有成为平行总协议。
- [ ] 图表、表格、指标卡、Sankey、路径分析都挂在 `componentBinding = "data-visualization"`。
- [ ] Drill-down、导出、继续分析、图表联动使用 ActionContract。
- [ ] AI Insight 有 EvidenceRef / SourceRef。
- [ ] 大数据量有分页、虚拟化、采样或 datasetRef 策略。
- [ ] 移动端有单列、横滑、抽屉或全屏明细降级。
- [ ] 空态、错误、权限不足、数据延迟都有用户可理解的下一步。
