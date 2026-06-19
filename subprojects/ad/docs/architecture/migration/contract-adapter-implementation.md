# Legacy Contract Adapter 实施规范

## 1. 目标

迁移期不要求一次性删除旧 schema，但所有旧 schema 必须进入统一适配层，最终输出只能是：

```txt
SemanticResultContract
RuntimeDisplayProtocol
```

## 2. 适配对象

必须覆盖：

```txt
ResponseContract -> SemanticResultContract
ReportQueryResult -> SemanticResultContract
ReportQueryViewModel -> SemanticResultContract
MetricExplainerUISchema -> SemanticResultContract
VizSpec -> data-visualization region.data
AgentProcessEvent -> RuntimeDisplayProtocol
process_events -> RuntimeDisplayProtocol.events
Timeline -> RuntimeDisplayProtocol / workflow-trace region
```

## 3. 禁止事项

```txt
1. 禁止页面组件继续把 MetricExplainerUISchema 当最终 UI 协议。
2. 禁止 VizSpec 独立携带 chartActions / tableButtons。
3. 禁止 ResponseContract 自己定义 evidence/source/action。
4. 禁止 AgentProcessEvent 混入 SemanticResultContract.regions[].data 作为业务结果。
```

## 4. 适配原则

### 4.1 Result Plane

业务结果进入：

```txt
SemanticResultContract.regions[]
```

典型映射：

| Legacy | Target |
|---|---|
| answer / summary | markdown-result region |
| report table | data-visualization region |
| chart / VizSpec | data-visualization region.data.vizSpec |
| metric insight | insight region / data-visualization.insights |
| source list | sourceRefs + source-list region |
| evidence bundle | evidenceRefs + evidence-panel region |
| CTA / buttons | ActionContract |

### 4.2 Runtime Plane

过程事件进入：

```txt
RuntimeDisplayProtocol.events
RuntimeDisplayProtocol.toolCalls
RuntimeDisplayProtocol.agents
RuntimeDisplayProtocol.workflows
```

最终结果如果需要引用过程，只使用：

```txt
region.runtimeRefs
```

## 5. Adapter 输出后必须校验

每个 adapter 末尾必须执行：

```ts
const validation = validateSemanticResultContract(result)
```

或：

```ts
const validation = validateRuntimeDisplayProtocol(runtime)
```

迁移初期可以允许 warning，但 error 必须 fallback 或阻断渲染。
