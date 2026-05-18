# PMAIOS v0.6 优先 Backlog

- version: v0.2
- date: 2026-04-30
- status: reference-only
- owner: product office

## Purpose

这份文档把 `docs/operations/pmaios-v0.6-to-v3.0-roadmap.md` 中已经识别出的“可前置项”，压缩成当前可执行的 `v0.6` 优先 backlog。

目标不是列出所有想做的事，而是明确：

1. 哪些是 `v0.6` 最该先做的
2. 哪些做了以后能直接支撑 `v0.7 / v1.x / v2.x / v3.0`
3. 哪些不应该提前混入当前版本

## Scope Rule

这份 backlog 只收：

- `v0.6` 内核化阶段必须做
- 或者虽然面向长期，但现在做不会返工的底座项

这份 backlog 不收：

- 为了“像 v3.0”而硬加的外形复杂度
- 还没有稳定状态基础就强上 graph 的实现
- 与当前主线无关的宿主壳扩张

## Priority Principle

优先级判断按下面顺序：

1. 没它就无法形成真正自主协作闭环
2. 没它就无法形成可恢复、可审计、可回写的运行时
3. 现在做能直接复用到更长期版本
4. 现在不做，后面会导致大量逻辑分散与返工

## Top 10 Backlog

## 1. Task SSOT 落库与读取接口

### Why

没有统一任务状态主存，就没有真正的“脱离聊天记忆的协作系统”。

### Must Deliver

1. `Task`
2. `TaskStage`
3. `GateCheck`
4. `ArtifactLink`
5. `AgentAssignment`

### Acceptance

1. 任务可从状态记录恢复
2. 当前 stage / owner / gate / artifact 可直接读取
3. workspace 能显示基础任务状态

### Pull-Forward Value

这是后续 `v1.x / v2.x / v3.0` 的共同底座。

## 2. Gate Runtime 最小实现

### Why

没有统一 gate，当前很多规则仍然只是 prompt 约束，不是运行时约束。

### Must Deliver

1. `Capability Discovery Gate`
2. `Project Truth Gate`
3. `Role Routing Gate`
4. `Asset Backwrite Gate`

### Acceptance

1. gate 有 pass / warn / block
2. blocked task 不能继续假装完成
3. gate 结果可记录到任务状态

### Pull-Forward Value

未来 graph runtime 仍然要复用 gate。

## 3. SchedulerRun 最小模型

### Why

没有 scheduler，长链任务仍然会退回“等人再点一下”。

### Must Deliver

1. run identity
2. pause / resume
3. retry count
4. cooldown / next run time
5. blocked reason

### Acceptance

1. 长链任务可中断恢复
2. 失败可重试
3. workspace 可见 run 状态

### Pull-Forward Value

这是未来 graph scheduler 的前身。

## 4. AgentAssignment 与 HandoffContract 标准化

### Why

没有协作运行时对象，多 agent 仍然只是逻辑上的“会路由”。

### Must Deliver

1. owner agent
2. support agent
3. reviewer agent
4. handoff input
5. expected output
6. completion condition

### Acceptance

1. specialist 协作不再只靠隐式上下文
2. handoff 有明确 contract
3. review 与 owner 分工可追踪

### Pull-Forward Value

这是 `v2.0` 多 agent 系统的最小运行时形态。

## 5. ArtifactLink / Evidence 统一挂接

### Why

现在产物很多，但若没有统一 artifact link，任务状态与仓库真源仍容易断开。

### Must Deliver

1. upstream truth
2. working output
3. review evidence
4. final delivery

### Acceptance

1. 任务状态能回链到真实文档
2. review 和产出不会只停留在聊天

### Pull-Forward Value

这是以后 final-state validation 的证据底座。

## 6. Workspace 的 task / stage / gate / artifact 面板

### Why

没有可操作观测面，kernel 只能停留在后端逻辑和文档层。

### Must Deliver

1. task list
2. stage state
3. gate state
4. owner / reviewer
5. artifact links
6. blocked reason

### Acceptance

1. 人可以看懂当前任务为什么停住
2. 人可以判断是该 resume、rework 还是补前置真源

### Pull-Forward Value

这是 `v0.7 / v1.x` 工作台的直接前置项。

## 7. Final-State Validation 型 Review

### Why

review 不能只看“是否生成了文档”，而要看“任务状态是否真的可交付”。

### Must Deliver

1. completeness
2. consistency
3. downstream readiness
4. backwrite completeness

### Acceptance

1. review 可判定 ready / blocked / rework
2. review 结果能回写 Task SSOT

### Pull-Forward Value

这是 `v3.0` final state validator 的前置形态。

## 8. Outbox 最小壳层

### Why

外部同步如果继续直接写，会破坏本地真源优先原则。

### Must Deliver

1. `SyncEnvelope`
2. pending / processing / completed / failed / dropped
3. retry count
4. receipt ref

### Acceptance

1. 先写本地真源，再排外部同步
2. 失败同步可见
3. 后续可接更多外部系统

### Pull-Forward Value

这是未来组织级联动能力的底层出口。

## 9. State Snapshot 与 Evolution Log

### Why

如果现在不开始记录状态演进，后面很难平滑过渡到 state-driven 模型。

### Must Deliver

1. task snapshot
2. stage transition log
3. gate history
4. retry / recovery history
5. review history

### Acceptance

1. 可以回放任务如何走到当前状态
2. 可以看见失败与修复路径

### Pull-Forward Value

这是 `v3.0` state evolution memory 的前置地基。

## 10. 现有链路迁入统一 Kernel

### Why

如果继续边做新功能边绕开 kernel，内核永远只是概念层。

### Must Deliver

优先挑选至少一条真实主链迁入：

1. brief -> analysis -> product-definition -> requirements -> handoff
2. brief -> analysis -> original-demand-review -> implementation handoff

### Acceptance

1. 至少一条主链完整走 Task SSOT + Gate + Scheduler + ArtifactLink
2. 不再依赖临时散逻辑串起来

### Pull-Forward Value

这是验证 `v0.6` 不是概念升级，而是运行时升级的关键。

## Suggested Execution Order

建议顺序如下：

1. `Task SSOT`
2. `Gate Runtime`
3. `SchedulerRun`
4. `AgentAssignment / HandoffContract`
5. `ArtifactLink / Evidence`
6. `Workspace visibility`
7. `Final-State Validation`
8. `Outbox`
9. `State Snapshot / Evolution Log`
10. `Migrate one real chain into kernel`

## v0.6 Addendum: Cross-Cutting Platform Items

除了 Top 10 之外，`v0.6` 还要明确补两条平台横切能力：

### A. Hermes Global 最小落地

不是只做设计寻优，而是至少先覆盖：

1. UI/UX baseline
2. model / provider choice
3. workflow / runtime defaults

最小验收：

- 有 latest-information integration 入口
- 有 keep / replace / park 判断
- 有 promote 到 truth-source 的动作

### B. Project Continuation Runtime 最小落地

不是只靠对话体验，而是至少先补：

1. active mainline
2. next safe step
3. parked side lines
4. blocker reason
5. resume anchor

最小验收：

- 项目不会因 summary 或 side question 自动掉线
- workspace 能解释项目为什么没继续推进

## Not In v0.6

下面这些方向应明确标为“不是当前版本的首要 backlog”：

1. 完整 `State Graph Engine`
2. 全量 graph route 替换现有流程
3. 全局 schema lock
4. 自动演化 memory 优化器
5. 重宿主壳优先迁移

## User-Requirement Backcheck

用户要求的不是“先做一个看上去更大的路线图”，而是：

1. 把长期方向压回现在可做的事
2. 看哪些现在就能提前做
3. 避免错误地把未来复杂度提前灌进当前版本

对这三个要求的回扣判断：

- 长期路线收口为当前 backlog：`solved`
- 可前置项已明确：`solved`
- 不该过早做的项已明确：`solved`

## Final Judgment

`v0.6` 最重要的不是“像 v3.0”，而是：

`把未来 v3.0 一定会依赖的底座，在当前版本做成真正可运行的最小系统。`
