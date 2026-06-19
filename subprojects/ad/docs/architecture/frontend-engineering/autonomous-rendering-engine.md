# Autonomous Rendering Engine

> Scope: contract-driven message rendering pipeline

## 定位

自动渲染引擎接收 `SemanticResultContract`，按 `regions[]` 和 `componentBinding` 渲染 React 树。

## 链路

```txt
SemanticResultContract
→ regions[]
→ componentBinding
→ registry
→ renderer
→ React tree
```

## 规则

1. 渲染调度是声明式的，不是页面层手写 if-else。
2. 新增业务结果只需要新增 region/binding/renderer。
3. 旧 payload 只能在 adapter 层归一。

