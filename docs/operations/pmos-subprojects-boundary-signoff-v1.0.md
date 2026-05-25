# PMOS / Subprojects 对外边界最终签版

- version: `v1.0`
- date: `2026-05-09`
- status: `signed`

> Update: 本文档此前提到的“第二设备验证”和“Notion -> Dataki -> agent retrieval”剩余发布阻塞，已在后续发布复核中关闭；当前这份文档只承担 `PMOS / subprojects` 边界签版作用，不再承担最新发布阻塞判断。

## 结论

`PMOS product repo` 对外发布时：

1. 保留 `subprojects` 相关运行时能力
2. 不捆绑任何真实业务子项目主体内容
3. 不把历史业务样板当作产品默认样板对外发布

一句话定义：

`product-repo` 发布的是“多项目产品能力”，不是“业务项目合集”。

## 现在为什么可以签版

当前仓库现实已经满足这条边界：

1. `product-repo` 代码层仍保留 `subprojects` 能力入口
2. `product-repo/subprojects` 当前没有实际业务子项目内容
3. 已去掉对 `ad` 样板的发布面硬编码引用

这意味着当前对外公开的不是某个业务项目，而是：

- 平台运行时
- 多项目注册与承接能力
- 子项目 workflow / docs / assets 的挂载机制

## 保留什么

以下内容属于 `PMOS v1.0` 正常产品能力，允许保留：

1. `subprojects` 目录结构支持
2. 子项目注册、发现、列举、运行的后端接口
3. 面向子项目的 workflow 解析与 run 初始化能力
4. 面向子项目的 docs / assets 聚合与读取能力
5. 前端对“平台 + 子项目”双层视图的支持

## 不保留什么

以下内容不属于 `PMOS v1.0 public repo` 默认发布内容：

1. 真实业务子项目源码
2. 真实业务子项目私有文档
3. `docs/sources/inbox/` 原始输入材料
4. 历史业务样板页面作为默认首页或默认壳
5. 把某个单一子项目写死为平台默认示例

## 对外口径

对外应该这样描述：

1. `PMOS` 支持多项目承接与运行
2. 公开仓默认只提供平台能力，不附带真实业务项目
3. 使用者可以自行创建 `subprojects/<id>` 来挂接自己的项目

不应这样描述：

1. `PMOS` 自带多个真实业务产品
2. `subprojects` 就等于内部业务沉淀直接公开
3. `ad` 或其他历史项目是平台的固定组成部分

## 对代码的解释

当前这些代码引用仍然是合理保留项，而不是污染：

1. `src/backend/server.ts` 中的 `subprojects` API 与 docs/assets 聚合
2. `src/core/subprojectRegistry.ts` 的子项目发现能力
3. `src/core/dagService.ts` 的按子项目加载 workflow 能力
4. `src/frontend/App.tsx` 的子项目选择与视图切换能力

它们表达的是：

- `PMOS` 是平台
- 平台可以承接多个项目

而不是：

- 平台必须夹带具体业务项目一起发布

## 发布判定更新

从这份签版开始：

- `PMOS / subprojects` 对外边界：`solved`

因此 `public v1.0` 的剩余阻塞不再包含这一项，只剩：

1. 真实第二设备完整验证
2. `Notion -> Dataki -> agent retrieval` 闭环实证
