# Region Contract

> Canonical scope: `SemanticResultContract.regions[]`

## 定位

`region` 是结果页的最小语义单元。

它描述的是“这一块内容是什么”，而不是“这个块长什么样”。

## 必备字段

- `id`
- `type`
- `componentBinding`
- `data`
- `layoutHints`
- `actions`
- `evidenceRefs`
- `sourceRefs`
- `runtimeRefs`
- `visibility`
- `permission`
- `fallback`

## 规则

1. `type` 负责语义排序和布局权重。
2. `componentBinding` 负责渲染器选择。
3. `data` 只承载当前 region 的数据，不承载整条消息。
4. region 可以引用 evidence/source/runtime，但不能私有定义它们。

