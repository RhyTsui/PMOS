# PMAIOS v0.6 到 v3.0 路线图

- version: v0.1
- date: 2026-04-28
- status: draft baseline
- owner: product office

## Purpose

这份文档用于把 `PMAIOS` 从当前已定义的 `v0.6`，一直延展到更长期的 `v3.0` 方向。

它要回答 4 个问题：

1. 现行真源已经明确到哪里
2. 长期版本路线可以怎样连续表达
3. 哪些高阶能力应该提前做
4. 哪些东西不应该过早上复杂度

## Scope Rule

这份文档是长期路线图，不替代当前 canonical version plan。

当前版本真源仍以：

- `docs/operations/pmaios-version-plan.md`
- `docs/operations/current-version-progress.md`

为准。

因此：

- `v0.6` 属于当前已进入正式规划的下一版本
- `v0.7+ / v1.x / v2.x / v3.0` 属于长期方向与结构化前瞻

## Current Canonical Read

截至 `2026-04-28`，仓库中的现行判断是：

1. `v0.5` 已正式收尾
2. `v0.6` 已被定义为“各 agent 自主协作与输出闭环”
3. 行业 OS 研究已将 `v0.6` 进一步收口为：
   - `Kernel`
   - `Gate Runtime`
   - `Task SSOT`
   - `Outbox`
   - `Scheduler`

换句话说：

`v0.6` 不是“多一点 agent”，而是 `PMAIOS` 第一次进入内核化治理阶段。

## Source Layers

### Layer 1. 现行版本真源

- `docs/operations/pmaios-version-plan.md`
- `docs/operations/current-version-progress.md`
- `docs/operations/pmaios-v0.6-kernel-architecture.md`
- `docs/operations/pmaios-gate-system.md`
- `docs/operations/pmaios-task-ssot-and-outbox.md`

### Layer 2. 长期方向输入

- `docs/research/openclaw-company-os-v1-iovp-study-for-pmaios-2026-04-28.md`
- `docs/operations/pmaios-cli-vs-host-runtime-decision.md`

### Layer 3. 历史草稿输入

- `docs/workflow0.3.2.md.txt`

注意：

`docs/workflow0.3.2.md.txt` 中的 `v2.0 / v2.1 / v3.0` 表述可作为长期方向参考，
但当前还不是 canonical version plan。

## Long-Term Route

## v0.6

### Theme

`Kernelized Product Delivery Baseline`

### Core Goal

把当前已有的产品真源治理能力，升级成可运行的协作内核。

### Must Solve

1. `Task SSOT`
2. `Gate Runtime`
3. `Agent Collaboration Levels`
4. `Autonomous Scheduler` 最小版
5. `Asset Backwrite` 作为完成条件
6. `External Sync Outbox` 基础壳层
7. 连续输出推进而不是一步一步问

### Exit Standard

至少做到：

1. 一个任务可以脱离聊天上下文，仅靠任务状态恢复
2. 一个任务可以看到 stage / gate / owner / artifact / review 状态
3. 缺前置真源时能自动 backfill
4. 长链任务可以暂停、恢复、重试
5. 需要回写的资产未落库时，任务不能假装完成

## v0.7

### Theme

`Kernel Productization`

### Core Goal

把 `v0.6` 的内核能力从“文档+局部实现”推进到“统一工作台可操作”。

### Main Focus

1. 工作台展示 task / gate / stage / owner / evidence
2. 支持人工介入 gate、resume、rework、retry
3. 把 handoff contract、review evidence、sync envelope 做成可观测对象
4. 把内核能力接入更多主链路，而不是只存在单点功能中

### Product Meaning

`v0.6` 解决“有没有内核”，`v0.7` 解决“内核能不能被运营”。

## v1.x

### Theme

`Unified Product Operations Surface`

### Core Goal

把内核、产品工作台、版本、评审、能力治理、需求池收成一个统一产品化界面。

### Main Focus

1. requirement / version / review / capability / task 共面板治理
2. 跨任务、跨版本、跨产物追踪
3. 质量、吞吐、失败、回滚、重做可见
4. 产品方法体系、模板、能力调用进入统一治理

### Product Meaning

这时 `PMAIOS` 不再只是“会治理产出”，而是成为真正可操作的 `Virtual Product Chief Workspace`。

## v2.0

### Theme

`Governed Multi-Agent System`

### Core Goal

把多 agent 协作从“可用”推进到“稳定、默认、成体系”。

### Main Focus

1. agent 之间的 ownership、handoff、review、challenge 稳定化
2. specialist 路由不靠临时规则，而靠统一协作协议
3. 多角色串行、并行、会审协作可复用
4. 复杂任务默认进入多 agent 协作闭环

### Product Meaning

`v2.0` 的重点不是 agent 数量，而是：

`多 agent 协作是否已经是系统默认工作方式`

## v2.1

### Theme

`Controlled Workflow System`

### Core Goal

把多 agent 系统进一步升级成真正受控的工作流系统。

### Main Focus

1. 明确 rework、rollback、resume、manual override
2. 支持高风险链路的强制会审与强制门禁
3. 支持更稳定的失败恢复和执行审计
4. 把工作流从“会跑”升级为“可控制、可纠偏、可追责”

### Product Meaning

`v2.0` 重点是协作，`v2.1` 重点是控制。

## v3.0

### Theme

`State Graph AI OS`

### Core Goal

把 `PMAIOS` 从流程驱动系统升级为状态驱动系统。

### Structural Shift

从：

`workflow / pipeline / staged execution`

升级为：

`state -> route -> node execution -> validation -> memory evolution`

### Main Focus

1. 用统一 state 承接任务真实状态
2. 用 graph route 决定下一步，而不是仅靠固定流程
3. agent 主要读写 state，而不是直接主导流程
4. review 从文档审批升级为 final-state validation
5. memory 记录 state evolution，而不只是结果存档

### Product Meaning

这是真正意义上的：

`State-driven AI Operating System`

## What Can Be Pulled Forward

下面这些能力虽然面向 `v1.x / v2.x / v3.0` 也有价值，但现在就值得前置：

### 1. Task SSOT 数据模型

原因：

- 这是 `v0.6` 本身就必需的基础
- 以后无论是 workflow 还是 graph，都要复用

### 2. Gate Runtime

原因：

- 未来 graph 也仍然需要 gate
- 现在先统一 gate，后面不会返工成废件

### 3. AgentAssignment / HandoffContract / GateCheck / ArtifactLink

原因：

- 这些是未来一切多 agent 协作的运行时对象
- 越晚统一，后面越难收口

### 4. SchedulerRun 最小实现

原因：

- 先把暂停、恢复、重试、冷却期做起来
- 以后再升级成 graph scheduler

### 5. State Snapshot / Evolution Log

原因：

- 先开始记状态演进历史
- 为未来 `v3.0` 的 state evolution memory 做准备

### 6. Final-State Validation 思路

原因：

- 让 review 不只看“有没有文档”
- 而是看“任务状态是否真的可交付”

### 7. Workspace 的 task / stage / gate / evidence 面板

原因：

- 这是所有后续高阶 runtime 的人机操作面
- 现在做不会浪费

### 8. Outbox 队列壳层

原因：

- 先把本地真源优先、外部写入排队、失败可见这件事固化
- 以后接 Notion / Figma / 其他平台都能直接承接

## What Should Not Be Forced Early

下面这些方向是对的，但不应该在 `v0.6` 阶段过早硬上：

### 1. 完整 State Graph Engine

不宜现在做的原因：

- 当前 task state、gate、scheduler 还没稳定
- 过早上 graph 只会把复杂度前置

### 2. 全量 Graph Route 替换现有流程

不宜现在做的原因：

- 现有流程虽然不高级，但边界更可控
- 应先有稳定状态对象，再做 route 替换

### 3. 全局 Schema Lock + State Builder

不宜现在做的原因：

- 这类机制一旦定太早，会压制现阶段需求收敛速度
- 应在 `Task SSOT` 稳定后逐步抽象

### 4. Memory Evolution 自动优化闭环

不宜现在做的原因：

- 现在先记录 execution history 即可
- 过早做自动模式学习容易变成噪音系统

### 5. 重宿主壳优先路线

不宜现在做的原因：

- 当前判断已经明确：`CLI-first is correct, CLI-only is not`
- `v0.6` 应优先补 kernel，不是先换重宿主

## Recommended Backlog To Pull Forward

如果要从长期路线中挑一批最值得现在就做的事项，建议按下面顺序：

1. `Task SSOT` 落库与读取接口
2. `Gate Runtime` 运行时判定与记录
3. `SchedulerRun` 最小模型与恢复逻辑
4. `AgentAssignment` / `HandoffContract` 标准化
5. `ArtifactLink` / `GateCheck` / `SyncEnvelope` 标准化
6. 工作台展示 task / gate / stage / review / artifact
7. `Final-State Validation` 型 review 收敛
8. `Outbox` 最小异步写出队列
9. `State Snapshot` 与 evolution log
10. 把更多现有链路迁入统一 kernel，而不是再新增分散逻辑

## Dependency Judgment

这些关系需要明确：

1. 没有 `Task SSOT`，就不要谈真正自主协作
2. 没有 `Gate Runtime`，就不要谈稳定受控协作
3. 没有 `SchedulerRun`，就不要谈长链默认推进
4. 没有 `ArtifactLink` 和 `Backwrite`，就不要谈组织级资产沉淀
5. 没有 `State Snapshot`，就不要谈未来 `v3.0` 的 state graph 演进

## User-Requirement Backcheck

原始用户方向不是单纯“做更大的系统”，而是：

1. 不要一步一步问
2. 让多 agent 真正能协作推进结果
3. 让系统从规则堆叠，升级成更稳定的操作系统

对这三个目标的回扣判断：

- `v0.6`：开始真正解决，状态为 `partial -> target solved`
- `v1.x / v2.x`：把协作与控制做稳定，状态为 `future required`
- `v3.0`：把系统从流程驱动升级为状态驱动，状态为 `future strategic target`

## Final Judgment

长期最正确的路线不是：

`现在直接上 v3.0 外形`

而是：

`先把 v3.0 赖以成立的状态、约束、调度、证据底座在 v0.6-v1.x 逐步做实`

一句话收口：

`v0.6 先做内核，v0.7 做产品化，v1.x 做统一工作台，v2.x 做成熟多 agent 与受控工作流，v3.0 再进入 State Graph AI OS。`
