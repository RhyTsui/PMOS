# Component Registry / Renderer Specification

> Canonical path: `docs/architecture/frontend-engineering/component-registry-renderer.md`  
> Type source: `frontend/src/src/contracts/renderer/component-registry.ts`  
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
