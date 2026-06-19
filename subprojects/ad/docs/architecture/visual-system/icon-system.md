# Icon System

## 1. 职责

Icon System 统一：

```txt
图标库来源
尺寸体系
描边粗细
语义命名
状态图标
AI / Agent / Tool 专属图标
数据可视化图标
权限 / 风险 / 证据图标
```

## 2. 尺寸层级

```txt
icon.size.xs
icon.size.sm
icon.size.md
icon.size.lg
icon.size.xl
```

## 3. 语义分类

```txt
navigation.*
action.*
status.*
ai.*
runtime.*
data.*
trust.*
permission.*
file.*
```

## 4. 使用规则

```txt
1. 组件不得直接导入随机第三方 icon 名称作为语义。
2. ActionContract.icon 只能填语义 icon key。
3. Runtime 状态图标必须和 RuntimeStatus 一一映射。
4. Source/Evidence 图标必须由 SourceType/EvidenceType 派生。
5. 危险动作图标不得只靠颜色表达，必须有形状语义。
```
