# Elevation / Shadow System

## 1. Token 分类

```txt
elevation.base
elevation.raised
elevation.dropdown
elevation.popover
elevation.modal
elevation.toast
elevation.command
elevation.runtime-overlay
shadow.none
shadow.sm
shadow.md
shadow.lg
shadow.overlay
zIndex.header
zIndex.sidebar
zIndex.dropdown
zIndex.popover
zIndex.modal
zIndex.toast
zIndex.commandPalette
```

## 2. 使用规则

```txt
1. 浮层层级统一由 elevation/zIndex token 管理。
2. Tooltip、Popover、Dropdown 不得各自设置任意 z-index。
3. Runtime detail panel 与 evidence/source panel 层级必须可预测。
4. Modal 永远高于 Drawer/Popover，但 Toast 与 Command Palette 规则单独定义。
```
