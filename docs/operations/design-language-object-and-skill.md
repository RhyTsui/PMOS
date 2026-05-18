# `DESIGN.md` 平台对象与 `design-language-md` Skill 定义

- version: v0.1
- date: 2026-05-06
- status: active
- scope: PMAIOS platform and active subprojects
- purpose: 把 `DESIGN.md` 从历史概念升级为 `v0.7` 主链可治理、可引用、可承接的正式平台对象，并补最小 repo 内 skill 骨架

## 1. 为什么现在要补这个对象

这次 `tracking-acceptance` 的设计链已经说明一个问题：

1. 只有原型、交互、视觉稿和静态 HTML 还不够。
2. 如果没有一份稳定的“设计语言真源”，每一轮出稿都会重新漂一次。
3. 设计规范如果只散在聊天、侧栏、截图和单页稿件里，后续组件承接与 UI schema 会继续失真。

因此 PMAIOS 需要单独确立：

1. `DESIGN.md` 作为项目级设计语言真源
2. `design-language-md` 作为生成和维护该真源的最小 skill

## 2. `DESIGN.md` 的平台定位

`DESIGN.md` 不是最终交付物，也不是高保真设计稿替代品。

它在 PMAIOS 中的准确定位是：

1. 项目级设计语言真源
2. 设计链上游约束对象
3. `html-direction-pack`、`ui-schema-spec`、设计确认链、组件承接链的共同参考基线

它不负责直接证明：

1. 页面已确认
2. 静态 HTML 已通过
3. 前端实现已对齐

这些仍然需要：

1. `design-confirmation-record`
2. `design-confirmed gate`
3. 组件承接稿 / `ui-schema-spec`

## 3. `DESIGN.md` 在当前主链中的位置

推荐链路：

`requirement baseline -> plan-prd -> functional-spec-pack -> DESIGN.md -> html-direction-pack -> ui-schema-spec -> delivery design / static HTML -> implementation handoff`

解释：

1. `DESIGN.md` 应在真正开始 UI 方向收口前建立。
2. 它早于静态 HTML，但晚于需求和功能定义。
3. 它不替代结构化交付物，只约束这些交付物的视觉语言和交互表达基线。

## 4. `DESIGN.md` 的最小字段结构

推荐最小结构如下：

```md
# DESIGN.md

## 1. Meta
- project
- version
- status
- owner
- last-updated

## 2. Design Intent
- target users
- target operator role
- expected feeling
- product posture

## 3. Page Family
- page types
- common layout model
- information density strategy

## 4. Visual Language
- typography
- color system
- spacing
- radius
- border / shadow / surface rules

## 5. Interaction Language
- click behavior baseline
- state feedback
- empty / loading / error handling
- drawer / modal / detail-panel rules

## 6. Component Semantics
- preferred component system
- component mapping principles
- business block expression rules

## 7. Content Rules
- allowed copy style
- forbidden explanatory copy
- label / table / form wording rules

## 8. Anti-Patterns
- prohibited design patterns
- prohibited interaction patterns
- prohibited visual drift

## 9. Confirmation Notes
- related design confirmation records
- current applicable scope
- known exceptions
```

## 5. 强制边界

### 5.1 它必须回答什么

`DESIGN.md` 必须至少回答：

1. 这个项目想给用户什么感受
2. 页面家族和信息密度怎么控制
3. 组件语义默认靠什么体系
4. 哪些设计写法是禁止的
5. 哪些页面表达约束必须传递给下游实现

### 5.2 它不能冒充什么

`DESIGN.md` 不能冒充：

1. 高保真视觉稿
2. 页面结构 schema
3. 静态 HTML 确认稿
4. 前端实现承接稿

如果一个项目只有 `DESIGN.md`，没有后续确认链和结构化承接链，不能宣称“设计已交付”。

## 6. Gate：`design-language-ready`

### 6.1 Gate 问题

`在进入高保真设计、静态 HTML 或实现承接前，项目是否已有可引用的设计语言真源？`

### 6.2 Block 条件

以下任一满足即 `block`：

1. 项目没有 `DESIGN.md`
2. 有 `DESIGN.md`，但只是历史概念稿，未覆盖当前页面家族
3. 缺少组件体系偏好
4. 缺少禁项定义
5. `DESIGN.md` 与当前确认链明显冲突但未回写修正

### 6.3 Pass 条件

必须同时满足：

1. 项目存在正式 `DESIGN.md`
2. 至少覆盖 design intent、visual language、interaction language、component semantics、anti-patterns
3. 已指明目标组件体系或至少指明组件偏好
4. 当前页面家族在适用范围内

## 7. Repo 内 Skill：`design-language-md`

### 7.1 职责

`design-language-md` 不直接生成界面，而是：

1. 生成或更新项目级 `DESIGN.md`
2. 把分散设计约束沉淀成自然语言真源
3. 识别缺失项、冲突项、禁项
4. 为后续 `ui-schema-spec` 和组件承接稿提供稳定上游

### 7.2 它的输入

推荐输入来源：

1. 项目需求与功能定义
2. 已确认的原型/交互/视觉稿
3. 现有通用设计规范
4. 组件体系约束，例如 `YokaUI`
5. 反模式或禁项清单

### 7.3 它的输出

最小输出：

1. 一个项目级 `DESIGN.md`
2. 缺失项提示
3. 与确认链的引用关系

## 8. 与现有文档的关系

### 8.1 与旧版 `PMAIOS_v0.2`

旧文档里已经提出过 `DESIGN.md`，但那时它还是概念层引入。

本文件的升级点在于：

1. 把它接入 `v0.7` 主链
2. 明确它不是最终交付物
3. 给它补 gate 和 skill 入口

### 8.2 与 `confirmation-chain-object-and-gate`

两者分工明确：

1. `DESIGN.md` 管设计语言真源
2. `design-confirmation-record` 管确认状态

### 8.3 与 `design-skill-evaluation-and-absorption-proposal`

本文件是那份提案里两项内容的正式落地入口：

1. `DESIGN.md`
2. `design-language-md`

## 9. 推荐下一步

建议继续按这个顺序推进：

1. 把活跃项目的 `DESIGN.md` 样板建立起来
2. 把 `design-language-ready` 接到 gate runtime
3. 再做 `design-to-component-handoff`
4. 最后再补 `design-prompt-refiner`

## 10. 用户诉求回查

- 用户诉求：结合埋点项目实施情况做提炼
  - 当前状态：`partial`
  - 说明：`DESIGN.md` 已从外部灵感吸收升级为平台对象定义，但项目级实例还未批量回写

- 用户诉求：处理 PMAIOS v0.7 及遗留项
  - 当前状态：`partial`
  - 说明：本文件直接服务 `UI schema productization` 与 `Gate Runtime` 深化，但老任务清洗还未开始
