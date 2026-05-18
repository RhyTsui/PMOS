# 文档生命周期治理机制

- version: v0.2
- date: 2026-05-09
- status: active

## 1. 目的

解决当前文档系统的 5 类失控：

1. AI 频繁生成碎片补充文档
2. 原文档没有被持续更新，导致协作方必须读多个文件
3. 新旧文档互相矛盾
4. 收敛和整理过程中旧内容丢失
5. 缺少淘汰、归档、删除机制

## 2. 单域单真源

每个稳定主题只能有一个 `active truth source`。

主题示例：

1. 当前版本方向
2. 当前版本进度
3. 产品 workflow 主链
4. 某子项目规划
5. 某子项目需求
6. 某子项目功能
7. 某子项目设计
8. 某子项目前端页面
9. 某子项目数据表
10. 某子项目后端接口

禁止：

1. 同一主题长期并存多个 active 主文档
2. 用“补充说明.md”长期替代更新主文档

## 3. 生命周期状态机

文档状态固定为：

1. `draft`
   - 还在生成、整理、收敛
2. `active`
   - 当前协作方应该阅读的正式真源
3. `superseded`
   - 已被新文档或新版本替代
   - 必须标明 successor
4. `archived`
   - 保留历史价值，但不再作为当前协作入口
5. `deleted`
   - 仅在完成引用迁移后允许删除

## 4. 更新原则

### 原则 1：更新原文档优先

如果某条意见是在修正当前真源，默认动作必须是：

`更新原文档`

而不是：

`新增一个补充文档`

### 原则 2：补充文档只能临时存在

允许短期存在：

1. review note
2. change pack
3. working memo

但必须在后续周期回并到主文档。

### 原则 3：长文重写优先于碎片 patch

当一份主文档已经多次被补丁式修改时：

1. 不应继续在边上堆补充文档
2. 应直接重写主文档，产出新的干净版

### 原则 4：防丢失

更新原文档时，必须同时记录：

1. 保留了什么
2. 合并了什么
3. 删除了什么
4. 删除内容迁移到了哪里

## 5. 变更包机制

对重要文档修改，先形成 `change pack`：

1. source doc
2. requested change
3. affected sections
4. merge strategy
5. loss-risk note
6. successor / archive action

`change pack` 不是最终真源，它只是帮助安全更新原文档。

## 6. 废弃与归档规则

### superseded

文档进入 `superseded` 时，必须写：

1. 替代文档路径
2. 替代日期
3. 为什么被替代

### archived

文档进入 `archived` 时，必须保证：

1. 已不再作为 active 链接入口
2. platform truth index 不再把它列为当前真源

### deleted

删除前必须完成：

1. successor 或 archive 确认
2. 引用迁移
3. 风险确认

## 7. AI 写文档规则

AI 在文档工作中必须遵守：

1. 先判断当前主题是否已有主文档
2. 若已有主文档，默认更新原文档
3. 若必须新建补充文档，要标明它只是临时工作文档
4. 产出长文时优先生成可交接主文档，而不是碎片 memo
5. 文档收敛时必须做防丢失回查

## 8. 检查门

每次准备把文档交给其他协作方前，必须检查：

1. 这件事是否只有一个 active 主文档
2. 是否还存在补充文档未回并
3. 是否还有互相矛盾的旧文档
4. 是否有 superseded 文档仍被当成当前入口
5. 更新原文档时是否发生内容丢失

## 9. 平台执行动作

后续平台要补的不是一句规则，而是机制：

1. truth source registry
2. doc status metadata
3. successor link
4. archive index
5. stale doc audit
6. merge-back workflow
7. deletion guard
