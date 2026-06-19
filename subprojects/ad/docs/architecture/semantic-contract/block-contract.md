# Block Contract

> Scope: region 内部的更细颗粒结构

## 定位

当一个 region 内部还需要多个展示子块时，使用 `block`。

## 用途

- markdown 文本块
- metric card
- data table
- chart
- action group
- artifact card
- status / warning / error

## 规则

1. block 是 region 的内部结构，不是新的顶层契约。
2. block 不得绕过 `componentBinding` 直接绑定组件。
3. block 不得重新定义 action/evidence/source/runtime。

