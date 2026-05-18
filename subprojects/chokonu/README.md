# ChoKoNu / 连弩-AI测试平台

`ChoKoNu` 是 PMAIOS 下用于承接 AI 应用测试、评测、自动化回归、结果报告与治理闭环的子项目。

## 当前定位

当前项目主线是：

- AI 应用测试与评测
- 评测集与样本资产沉淀
- 评估器与规则执行
- 自动化测试与回归
- 结果报告、异常 Trace 与治理闭环

当前主目录为：

- `subprojects/chokonu/`

## 与 tracking-acceptance 的关系

- `tracking-acceptance` 现在是独立的 `AI 埋点验收` 子项目
- `ChoKoNu` 不再把埋点验收文档当作自己的活跃真源
- 历史上误落在 `ChoKoNu/docs/analysis/` 的埋点验收分析文档，已在 `2026-04-28` 归位回 `subprojects/tracking-acceptance/docs/analysis/`

## 当前活跃真源

优先看下面这些文档：

- `docs/workflow/ChoKoNu项目执行工作流.md`
- `docs/workflow/ChoKoNu产品经理任务单.md`
- `docs/requirements/ChoKoNu首版总规划.md`
- `docs/requirements/ChoKoNu首版需求清单.md`
- `docs/requirements/ChoKoNu首版需求清单-人读版.md`
- `docs/review/ChoKoNu版本评审输入稿.md`
- `docs/memory/ChoKoNu文档验收状态清单.md`

## 文档结构

- `docs/overview/`
  - 项目背景、立项说明、首版方案总述
- `docs/analysis/`
  - 仅保留 `ChoKoNu` 自身的收口分析与平台定义
- `docs/workflow/`
  - 项目执行工作流、产品经理任务单
- `docs/requirements/`
  - 首版总规划、需求清单、人读版需求清单
- `docs/review/`
  - 版本评审输入稿
- `docs/product/`
  - 产品结构草图、工作台架构与竞品判断
- `docs/memory/`
  - 项目记忆与文档验收状态
- `docs/legacy/`
  - 历史 `tracking-acceptance` / ChoKoNu 草稿归档

## 输入规则

唯一原始输入源仍然是：

- `docs/sources/inbox/`

子项目目录只承接整理后的正式文档，不直接作为原始输入仓。

## 当前说明

`subprojects/tracking-acceptance/` 不是 `ChoKoNu` 的兼容壳，而是独立的埋点验收子项目。`ChoKoNu` 如需引用埋点验收背景，应通过链接或归档说明引用，不再把相关分析正文继续维护在本目录下。
