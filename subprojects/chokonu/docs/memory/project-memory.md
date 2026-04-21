---
name: 连弩-AI测试平台
description: ChoKoNu 项目的阶段记忆、定位变更与关键上下文。
type: project
---

## 项目记忆

该子项目最初以 `tracking-acceptance` 目录启动，历史上承接过 AI 埋点验收相关材料。

截至 `2026-04-20`，当前活跃项目语义已经切换为：

- 中文名：`连弩-AI测试平台`
- 英文名：`ChoKoNu`
- 当前目录：`subprojects/chokonu`

## 当前定位

当前主线不是单点埋点验收工具，而是面向 AI 应用测试与评测的平台型子项目，首版重点覆盖：

- 测试标准与规则
- 样本与评测集资产
- 评估器与执行链路
- 自动化测试与回归
- 报告、异常 Trace 与治理闭环

## 历史说明

旧目录语义和历史草稿仍保留在：

- `subprojects/chokonu/docs/legacy/`

这些材料可作为背景输入和历史决策记录，但不再代表当前主定义。

## 当前约束

- 活跃路径统一使用 `subprojects/chokonu`
- 平台级引用应优先使用 `chokonu` 子项目 id
- 如需兼容历史数据，可在代码层暂时兼容 `tracking-acceptance`，但文档与元数据不再以旧名为准
