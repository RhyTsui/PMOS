# UI Component Registry

> Scope: `frontend/src/src/components/ui`

## 1. 目标

把前端常用 UI 基座组件收口到统一导出与统一注册表，避免页面层分散 import 和手工拼装。

## 2. 统一入口

```txt
frontend/src/src/components/ui/index.ts
frontend/src/src/components/ui/registry.ts
```

## 3. 能力

- `index.ts` 提供统一导出入口，便于直接按组件名引入。
- `registry.ts` 提供按名解析能力，便于在统一渲染或配置驱动场景中直接定位组件。
- 组件注册只覆盖通用 UI 基座，不替代 `componentBinding -> renderer` 的消息渲染注册层。

## 4. 注册范围

优先收口以下常用组件：

- 布局与容器：`Card`、`GlassPanel`、`Separator`、`ScrollArea`、`Resizable`
- 输入与交互：`Button`、`ButtonGroup`、`Input`、`Textarea`、`Select`、`Switch`、`Slider`、`Checkbox`
- 反馈与状态：`Badge`、`StatusBadge`、`Alert`、`Progress`、`Skeleton`、`Spinner`、`Empty`
- 导航与弹层：`Tabs`、`Dialog`、`Drawer`、`Popover`、`Tooltip`、`DropdownMenu`、`ContextMenu`、`Menubar`
- 数据与展示：`Table`、`Chart`、`MetricCard`、`CodeBlock`、`FancyCodeBlock`
- 其他常用：`Avatar`、`Kbd`、`IconAsset`、`Toaster`

## 5. 规则

1. 页面层优先通过统一入口导入组件。
2. registry 只负责组件名解析，不承载业务协议。
3. 消息展示的语义渲染仍以 `SemanticResultContract` 和 `componentBinding` 为真源。
4. registry 不得替代 renderer registry，也不得回流成新的页面 if-else 集合。
