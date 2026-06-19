# Component Registry 实际实现规范

## 1. 目标

Component Registry 是前端自主渲染的执行核心。

```txt
SemanticResultContract.regions[]
  -> componentBinding
  -> registry.resolve(binding)
  -> renderer.validate(data)
  -> renderer.render(region, context)
  -> fallback / telemetry / error boundary
```

页面组件不得直接使用 `switch(schema.type)`、`if (vizSpec.xxx)`、`if (metricExplainer.xxx)` 判断最终渲染结构。

## 2. Registry 必须提供的能力

```ts
createComponentRegistry()
registry.register(renderer)
registry.unregister(binding)
registry.resolve(binding)
registry.renderRegion(region, context)
registry.renderResult(result, context)
```

## 3. Renderer 必须包含

```ts
binding
version
displayName
supportedRegionTypes
capabilities
performance
validate(data, region)
render(region, context)
fallback(region, context, reason)
```

## 4. 默认 renderer

最小集：

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
error-state
empty-state
permission-gate
```

如真实 UI 组件尚未完成，默认 renderer 可以先返回渲染描述对象，但不能缺席 fallback。

## 5. Resolver 接入

Renderer 不直接读全局 store。所有外部依赖通过 `RendererContext` 注入：

```txt
actionDispatcher
evidenceResolver
sourceResolver
runtimeResolver
artifactResolver
permissionChecker
visibilityEvaluator
telemetry
featureFlags
environment
```

## 6. Error Boundary

每个 renderer 必须被 error boundary 包裹。错误处理规则：

```txt
1. 捕获 renderer throw。
2. 记录 renderer_error telemetry。
3. 使用 renderer.fallback 或 registry fallback。
4. 不允许一个 region 错误导致整条消息崩溃。
```

## 7. ChatContainer / ReportQueryResultCard 改造路径

### 7.1 当前典型问题

```txt
ChatContainer 直接判断 MessagePart / ResponseContract / legacy schema。
ReportQueryResultCard 直接消费 ReportQueryViewModel / VizSpec。
图表组件内部各自定义 buttons/actions/source/evidence。
```

### 7.2 目标路径

```txt
backend response / legacy view model
  -> adapter
  -> SemanticResultContract
  -> validateSemanticResultContract
  -> registry.renderResult
```

### 7.3 迁移顺序

```txt
1. 保留旧组件，但包一层 legacy adapter。
2. 新增 SemanticResultRenderer。
3. ChatContainer 只识别：plain text / SemanticResultContract / RuntimeDisplayProtocol。
4. ReportQueryResultCard 改为 data-visualization renderer 的内部实现，而不是顶层协议。
5. 移除页面层对 ReportQueryViewModel / MetricExplainerUISchema 的直接最终渲染依赖。
```
