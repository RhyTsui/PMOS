# Project Continuation Runtime

- version: v0.2
- date: 2026-04-30
- status: active
- owner: product office

## Purpose

这份文档解决一个平台级问题：

`对话模式很好，但有些项目没有运行下去。`

这说明当前系统已经具备较好的单轮协作体验，但还缺：

- 跨轮持续推进
- 中断后自动续接
- 项目主线不掉落

## Core Definition

`Project Continuation Runtime` 不是聊天模式，而是项目持续执行层。

它负责：

1. 让每个项目有明确主线
2. 让每次中断后都能恢复到“下一安全步”
3. 防止项目只停在讨论、摘要或半成品阶段
4. 把好对话升级为可持续推进的运行时

## Current Failure Modes

当前常见掉线点包括：

1. 某轮对话结束时没有明确主线
2. 有 task / checkpoint，但没有 next safe step
3. 子项目 adoption 不一致，无法自动接续
4. 对话结束后没有“续跑责任主体”
5. 项目被 side topic 打断后没有回到 mainline

## Minimum Runtime Objects

每个活动项目至少要有：

- `active mainline`
- `next safe step`
- `parked side lines`
- `blocker state`
- `resume anchor`

## Runtime Rules

1. 每个活动项目必须有 `active mainline`
2. 每轮结束若无真实 blocker，必须留下 `next safe step`
3. 廉价问题不能替代主线
4. 摘要不是暂停信号
5. 恢复时先读主线锚点，而不是只靠聊天记忆

## Relation To mcp-context

`mcp-context` 已有 task / checkpoint / mode，但还不够。

Continuation Runtime 需要额外补齐：

- 哪条是 mainline
- 当前 next safe step 是什么
- 哪些 side lines 被 parked
- 为什么项目现在停住

## Relation To Do Mode

- `do mode` 解决“这一轮别停”
- continuation runtime 解决“下轮还能接上”

## v0.6 Minimum Requirement

`v0.6` 至少要做到：

1. 每个活动项目可见 `active mainline`
2. 每个活动项目可见 `next safe step`
3. side lines 可被 parked 而不丢失
4. summary / side question 不会自动导致主线失焦
5. workspace 能看出项目为什么没有继续跑

## Suggested Minimum Fields

- `mainlineLabel`
- `mainlineTaskId`
- `nextSafeStep`
- `parkedLines`
- `blockerType`
- `resumeAnchor`
- `lastMeaningfulAdvanceAt`

## Relation To Hermes

`Continuation Runtime` 管不断线，`Hermes` 管不断优。

## User-Requirement Backcheck

- 问题已被正式识别为 runtime 问题：`solved`
- Continuation Runtime 已被收成平台真源：`solved`
- 真正落地到统一 task/kernel/workspace 运行时：`partial`
