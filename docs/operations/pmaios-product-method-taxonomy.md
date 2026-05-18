# PMAIOS 产品方法总表

- version: v0.1
- date: 2026-04-27
- status: draft
- owner: product office
- registry: `config/product-management/product-method-registry.json`

## 1. 目的

这份文档不是列举几个方法名，而是建立 `PMAIOS` 的产品方法母表。

它要解决的问题是：

1. 产品方法以前只零散出现在 prompt、PRD 或对话里。
2. 系统知道少量方法名，但不知道如何系统选用。
3. 方法没有形成标准化的 skill 入口、方法卡、产物和后续路由。

所以这份总表的目标是先把“方法体系”收成一张图，再逐步接到 Product Chief 和 workflow。

---

## 2. 分类原则

产品方法不按“想到什么写什么”收纳，而按产品工作链路分层：

1. `Product Definition`
定义产品是什么、为什么成立、边界在哪里。

2. `User Research`
定义用户、场景、任务、痛点和相关利益方。

3. `Requirement Decision`
定义需求如何分类、比较、接受或拒绝。

4. `Prioritization`
定义多个机会和需求如何排序。

5. `Value And Metrics`
定义产品是否真正创造了价值，如何衡量。

6. `Solution And Architecture`
定义产品意图如何落到能力结构、边界和交互上。

7. `Retrospective And Learning`
定义结果如何回流成下次的产品方法和治理升级。

---

## 3. 当前第一批方法

## 3.1 P0 方法

- `5W2H`
- `Persona`
- `Jobs-To-Be-Done`

这三类方法优先级最高，因为它们直接决定：

- 这个产品到底是什么
- 它服务谁
- 用户真正想完成什么

如果这三件事没收住，后面讨论需求、优先级、页面和图，都会飘。

## 3.2 P1 方法

- `Kano Model`
- `RICE`
- `North Star Metric`
- `System Boundary`

这些方法解决的是：

- 需求怎么分层
- 需求怎么排序
- 成功怎么衡量
- 方案边界怎么定

它们是在 `P0` 已经清楚之后，帮助产品进入治理和交付的关键方法。

---

## 4. 方法之间的关系

这些方法不是并列清单，而是前后关联：

`5W2H`
-> 先定义问题、边界、目标和约束

`Persona`
-> 再定义谁是目标用户、谁是关键利益方

`Jobs-To-Be-Done`
-> 再把“用户想要的功能”提升成“用户真正想完成的进展”

`Kano Model`
-> 再区分哪些是基础要求，哪些是期望，哪些是惊喜项

`RICE`
-> 再在多个候选项中做优先级排序

`North Star Metric`
-> 再确认整个产品的价值衡量口径

`System Boundary`
-> 最后把解决方案收成可执行边界，而不是无限膨胀

所以正确顺序不是：

`先画页面 -> 再补产品逻辑`

而应该是：

`先产品定义 -> 再用户理解 -> 再需求判断 -> 再优先级 -> 再价值指标 -> 再方案边界 -> 最后呈现`

---

## 5. 当前落地状态

当前第一批方法的落地状态如下：

- `5W2H`：已 skill 化，但主要仍嵌在 PRD prompt 里
- `Persona`：已 skill 化，但仍缺独立方法卡和产物契约治理
- `Jobs-To-Be-Done`：未接入运行链，现进入第一批方法卡
- `Kano Model`：未接入运行链，现进入第一批方法卡
- `RICE`：未接入运行链，现进入第一批方法卡
- `North Star Metric`：未接入运行链，现进入第一批方法卡
- `System Boundary`：已 skill 化，但还需和方法卡体系对齐

因此当前整体判断是：

- 方法体系识别：`solved`
- 方法体系真源化：`partial`
- 方法体系运行态接入：`partial`

---

## 6. 接下来怎么继续落地

后续建议按三段走：

### 6.1 先补文档真源

补齐第一批方法卡，完成：

- 问题定义
- 适用场景
- 不适用场景
- 输入输出
- 关联产物

### 6.2 再补 skill registry

让方法从“文档概念”升级为“系统登记对象”。

### 6.3 最后补 Product Chief 路由

让 Product Chief 不只是能搜到方法名，而是能根据 brief 决定：

- 先用哪个方法
- 再用哪个方法
- 输出沉淀到哪里

---

## 7. 当前结论

“产品方法要沉淀成产品经理技能”这条方向没有错，错的是以前只做到“登记少数 skill”，没有做到“建立方法体系”。

从现在开始，`config/product-management/product-method-registry.json` 和这一份总表，就是这条线的第一批真源。
