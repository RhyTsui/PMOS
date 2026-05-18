# 项目入口契约

- version: v0.2
- date: 2026-04-22
- status: active draft
- scope: active subprojects and future subprojects

## Purpose

这份文档定义 PMAIOS 中每个活跃项目最小的人读入口与治理入口契约。

目标是：

- 每个项目始终可解释
- 每个项目始终有可阅读入口
- 每个项目始终暴露出足够的结构，既支持人协作，也支持 AI 追溯

## Minimum Project Entry Set

每个活跃项目默认应维护：

### Human-Facing Entry

- `project-board.svg`
- `roadmap-board.svg`
- `decision-board.svg`
- `change-log.md`

### Repo Entry

- `README.md`
- governed docs directory
- project memory when applicable

### AI / Governance Entry

- requirement pool
- requirement trace
- version trace
- linked artifacts

## Purpose Of Each File

### `requirement-pool.md` or equivalent

回答：
- 这个项目最近收到了哪些反馈或纠偏
- 哪些反馈已经被升级成正式需求
- 哪些反馈被暂缓、拒绝或待补依赖
- 当前反馈是如何进入 plan / backlog / 真源的

硬规则：
- 活跃项目不能只有会议纪要或聊天结论，而没有需求池入口
- 如果项目正在持续接收反馈，但没有需求池文档，则项目入口合同视为不完整

### `project-board.svg`

回答：

- 这个项目是什么
- 当前范围是什么
- 当前状态是什么
- 当前关键决策是什么
- 下一步该从哪里继续看

### `roadmap-board.svg`

回答：

- 项目正处在哪些阶段
- 当前聚焦点是什么
- 下一步会去哪里

### `decision-board.svg`

回答：

- 已经决定了什么
- 还有什么没有解决
- 什么需要 chief 或 owner 确认

### `change-log.md`

回答：

- 最近改了什么
- 为什么改
- 影响了哪些产物或版本

## Human-Facing Vs AI-Facing

人读资产应优化：

- readability
- explanation
- quick orientation

AI-facing 资产应优化：

- traceability
- structured retrieval
- regeneration

两层必须保持强关联，而不是各自孤立。

## Access Rule

项目应能从两个入口被阅读：

- 项目目录自身
- 统一 PMAIOS reading surface

推荐路径：

- 项目目录内直接放置入口文件
- 同时通过统一入口暴露，例如：
  - `/pmaios/subprojects/<project>/project-board.svg`
  - `/pmaios/subprojects/<project>/roadmap-board.svg`
  - `/pmaios/subprojects/<project>/decision-board.svg`
  - `/pmaios/subprojects/<project>/change-log.md`

## Change Rule

当项目发生实质变化时：

- 更新 `change-log.md`
- 更新受影响的 board
- 保持阅读入口与真实状态一致

项目入口不能退化成过时的展示壳。

## Runtime Narrative Rule

项目图板不是临时汇报材料，而是持续更新的实时叙事面。

默认关系是：

- `change-log.md` 提供时间序列真源
- `project-board.svg` 提供当前总览
- `roadmap-board.svg` 提供阶段与方向
- `decision-board.svg` 提供关键判断与待确认项

别人随时来问项目时，应能直接打开这些入口，而不需要重新拼材料。

## Suggested First Implementation Order

1. 让 `project-board.svg` 成为活跃项目的必备入口
2. 让 `change-log.md` 成为活跃项目的必备时间序列真源
3. 对存在持续演进的项目补齐 `roadmap-board.svg` 和 `decision-board.svg`
4. 把这些入口接进统一阅读面与版本跟踪
