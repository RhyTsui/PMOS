# Project Entry Rollout Status

- date: 2026-04-22
- scope: active subprojects
- purpose: 用统一分母跟踪项目标准入口 rollout，而不是只说“部分完成”

## Standard Entry Set

每个活跃子项目当前按这 4 个标准入口跟踪：

1. `project-board.svg`
2. `roadmap-board.svg`
3. `decision-board.svg`
4. `change-log.md`

## Aggregate Coverage

- active subprojects counted: `5`
- projects with `project-board.svg`: `3 / 5`
- projects with `roadmap-board.svg`: `0 / 5`
- projects with `decision-board.svg`: `0 / 5`
- projects with `change-log.md`: `0 / 5`

## Per-Project Status

### `subprojects/knowledge-base`

- `project-board.svg`: present
- `roadmap-board.svg`: missing
- `decision-board.svg`: missing
- `change-log.md`: missing

### `subprojects/ad`

- `project-board.svg`: present
- `roadmap-board.svg`: missing
- `decision-board.svg`: missing
- `change-log.md`: missing

### `subprojects/chokonu`

- `project-board.svg`: present
- `roadmap-board.svg`: missing
- `decision-board.svg`: missing
- `change-log.md`: missing

### `subprojects/server`

- `project-board.svg`: missing
- `roadmap-board.svg`: missing
- `decision-board.svg`: missing
- `change-log.md`: missing

### `subprojects/tracking-acceptance`

- `project-board.svg`: missing
- `roadmap-board.svg`: missing
- `decision-board.svg`: missing
- `change-log.md`: missing

## Current Judgment

- `knowledge-base / ad / chokonu` 已进入“有项目总览入口，但未形成完整叙事面”的阶段。
- `server / tracking-acceptance` 仍未进入标准入口集。
- 当前 `workflow rollout` 更准确的状态不是笼统 `partial adoption`，而是：
  - `project-board` 已有首轮覆盖
  - `roadmap / decision / change-log` 仍是普遍缺口

## Next Rollout Order

1. 先给 `knowledge-base / ad / chokonu` 补齐 `roadmap-board.svg`
2. 再补 `decision-board.svg`
3. 再补 `change-log.md`
4. 最后拉起 `server / tracking-acceptance` 的首个 `project-board.svg`

## Relation To v0.4 / v0.5

- 这份文档是 `v0.4` 收口中 “subproject workflow rollout” 的真实分母依据
- 同时也是 `v0.5` 人阅读层和项目实时叙事面的 rollout 基线
