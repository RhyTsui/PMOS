# Dataki v1.1 改动设计图合集
- 版本：v1.1
- 日期：2026-04-24
- 状态：Draft
- 适用范围：Dataki v1.1 现有设计图归档与逐点确认
- 读者对象：产品、设计、前端、AI

## 1. 用途

本文件把当前仓库里与 Dataki v1.1 改动相关的设计图集中到一处，方便逐页、逐改动点确认。

当前版本已确认的执行口径是：

1. 先解决内部知识与数据协同场景
2. 基本保留 WeKnora 产品壳
3. 只做轻品牌替换与必要范围收敛

因此本合集里的设计图分成两类：

1. 仍可作为当前版本直接参考的图
2. 早期探索图，只能作为表达参考，不能直接当当前实现基线

## 2. 现有设计图总览

### 2.1 整页概念图

| 编号 | 页面 / 模块 | 当前状态 | 说明 | 文件 |
| --- | --- | --- | --- | --- |
| P01 | 登录页整页方案 A | 可参考 | 已包含 Dataki 品牌、小闪主入口、邮箱密码备选 | [原图](./design-review/ig_0789713ef89f4fe90169ea28235a048191aca44d7adcad7d16.png) |
| P02 | 首页 / 主入口整页方案 A | 仅作探索参考 | 改动较重，超过当前“轻品牌替换”边界 | [原图](./design-review/ig_0789713ef89f4fe90169ea2869dbe08191b1051fe94a5666ec.png) |

### 2.2 页面改动点图

| 编号 | 页面 / 模块 | 当前状态 | 说明 | 文件 |
| --- | --- | --- | --- | --- |
| C01 | 登录页轻品牌版 | 可参考 | 保留左右分栏登录大页，只替换品牌与视觉表达 | [改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea3675e6d88191b03b435695400651.png) |
| C02 | 对话首页 / 主入口改动图 | 需收敛后使用 | 结构重排较多，建议只参考品牌和组件风格 | [改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea36c6f3848191a2c42537e87da066.png) |
| C03 | 能力价值卡片模块 | 仅作表达参考 | 偏品牌介绍页，不是当前产品壳必改项 | [改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea37136a8c8191a47e74fdc533c988.png) |
| C04 | 核心能力闭环模块 | 仅作表达参考 | 更适合介绍页或宣讲页，不是当前版本核心页面 | [改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea374783b08191b5446af4989875cd.png) |
| C05 | 知识页 / 知识总览页焦点图 | 待确认 | 图中内容已模糊处理，可作为“知识总览区”版式参考 | [改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea379a9ce08191a2f35f6351ec1226.png) |
| C06 | 登录页整页方案 A 复用图 | 可参考 | 与 P01 同源，保留在改动点目录内 | [改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea28235a048191aca44d7adcad7d16.png) |
| C07 | 首页 / 主入口方案 A 复用图 | 仅作探索参考 | 与 P02 同源，保留在改动点目录内 | [改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea2869dbe08191b1051fe94a5666ec.png) |

### 2.3 分享 / 权限 / 来源侧栏改动图

| 编号 | 页面 / 模块 | 当前状态 | 说明 | 文件 |
| --- | --- | --- | --- | --- |
| S01 | 对话详情页 + 来源与参考侧栏 | 可参考 | 适合作为“引用来源 + 可引用状态”表达基线 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9efaabf88191ac67f6768c99edd9.png) |
| S02 | 知识详情右侧抽屉 | 可参考 | 适合作为知识详情、共享范围、来源说明、权限说明抽屉 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9ec6026081918b932d24f6bea8e8.png) |
| S03 | 已共享对象总表弹窗 | 可参考 | 适合作为“共享对象列表 / 权限管理”弹层 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e8bb1208191819178ba84381fee.png) |
| S04 | 选择小闪用户弹窗 | 可参考 | 适合作为“共享给用户”的选择器弹窗 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e540bd0819185394e7da8b6eb64.png) |
| S05 | 分享知识主弹窗 | 可参考 | 适合作为“设置共享对象 + 权限等级”的主操作弹窗 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e1ed6d881918cfad3e723ac22b3.png) |
| S06 | 登录页整页方案 A 复用图 | 可参考 | 与 P01 同源，保留在共享目录内 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea28235a048191aca44d7adcad7d16.png) |
| S07 | 首页 / 主入口方案 A 复用图 | 仅作探索参考 | 与 P02 同源，保留在共享目录内 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea2869dbe08191b1051fe94a5666ec.png) |
| S08 | 登录页轻品牌版复用图 | 可参考 | 与 C01 同源 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea3675e6d88191b03b435695400651.png) |
| S09 | 对话首页 / 主入口改动图复用 | 需收敛后使用 | 与 C02 同源 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea36c6f3848191a2c42537e87da066.png) |
| S10 | 能力价值卡片模块复用图 | 仅作表达参考 | 与 C03 同源 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea37136a8c8191a47e74fdc533c988.png) |
| S11 | 核心能力闭环模块复用图 | 仅作表达参考 | 与 C04 同源 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea374783b08191b5446af4989875cd.png) |
| S12 | 知识页 / 知识总览页焦点图复用 | 待确认 | 与 C05 同源 | [改动图](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea379a9ce08191a2f35f6351ec1226.png) |

## 3. 当前最值得直接评审的图

如果你现在要逐项确认，而不是继续收集素材，建议先看这 7 张：

1. `P01` 登录页整页方案 A
2. `C01` 登录页轻品牌版
3. `S01` 对话详情页 + 来源与参考侧栏
4. `S02` 知识详情右侧抽屉
5. `S03` 已共享对象总表弹窗
6. `S04` 选择小闪用户弹窗
7. `S05` 分享知识主弹窗

原因：

1. 它们最贴近当前版本的轻改路线
2. 它们覆盖了当前版本真正会落地的登录、对话、知识共享、权限展示几个核心改动点
3. 它们没有强依赖“重做产品壳”的前提

## 4. 按当前版本边界的使用建议

### 4.1 可直接继续细化的部分

1. 登录页品牌替换
2. 小闪登录主入口
3. 对话页来源与参考侧栏
4. 知识详情抽屉
5. 分享知识弹窗
6. 共享对象管理弹窗
7. 小闪用户选择器

### 4.2 只能当灵感图、不能直接落实现版本的部分

1. 大改首页结构的整页图
2. 把 WeKnora 首页完全改造成 Dataki 工作台的重构图
3. 偏品牌宣讲页的能力卡片和闭环说明图

## 5. 建议下一步

建议基于本合集继续补两类产物：

1. 一份“当前版本最终采用图清单”
2. 一份“每张图对应前端文件落点表”

其中第二份最关键，应该直接回挂到：

- `Login.vue`
- `platform/index.vue`
- `chat/index.vue`

## 6. 快速预览

### P01 登录页整页方案 A

![P01 登录页整页方案 A](./design-review/ig_0789713ef89f4fe90169ea28235a048191aca44d7adcad7d16.png)

### P02 首页 / 主入口整页方案 A

![P02 首页 / 主入口整页方案 A](./design-review/ig_0789713ef89f4fe90169ea2869dbe08191b1051fe94a5666ec.png)

### C01 登录页轻品牌版

![C01 登录页轻品牌版](./design-review/change-points/ig_0789713ef89f4fe90169ea3675e6d88191b03b435695400651.png)

### C02 对话首页 / 主入口改动图

![C02 对话首页 / 主入口改动图](./design-review/change-points/ig_0789713ef89f4fe90169ea36c6f3848191a2c42537e87da066.png)

### S01 对话详情页 + 来源与参考侧栏

![S01 对话详情页 + 来源与参考侧栏](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9efaabf88191ac67f6768c99edd9.png)

### S02 知识详情右侧抽屉

![S02 知识详情右侧抽屉](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9ec6026081918b932d24f6bea8e8.png)

### S03 已共享对象总表弹窗

![S03 已共享对象总表弹窗](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e8bb1208191819178ba84381fee.png)

### S04 选择小闪用户弹窗

![S04 选择小闪用户弹窗](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e540bd0819185394e7da8b6eb64.png)

### S05 分享知识主弹窗

![S05 分享知识主弹窗](./design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e1ed6d881918cfad3e723ac22b3.png)
