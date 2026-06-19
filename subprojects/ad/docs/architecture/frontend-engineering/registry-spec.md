# Registry Spec

> Scope: component registry and renderer resolution

## 核心职责

- 注册 renderer
- 校验 region.data
- 解析 fallback
- 记录 telemetry
- 输出稳定的 React tree

## 必备能力

1. `register`
2. `unregister`
3. `resolve`
4. `renderRegion`
5. `renderResult`
6. `validate`
7. `fallback`

## 规则

- registry 是批量注册入口，不是页面里的 if-else 集合。
- renderer 不能直接访问全局状态。
- renderer 必须支持 fallback。

