# Requirement Change Control

## Purpose

这个流程用于防止 PMAIOS 把新需求混进当前版本，却不更新计划。

它适用于所有新的产品、工程、工具、文档和环境类需求。

## Change Types

| Type | Meaning | Default Handling |
| --- | --- | --- |
| `scope-add` | 新能力或新特性 | 新增 requirement，判断优先级，并决定进当前版还是下一版。 |
| `scope-change` | 改变已接受行为或验收标准 | 在实施前先更新 requirement 和 version plan。 |
| `defect` | 当前已接受能力损坏 | 如果阻塞验证则立即修；同轮补齐记录。 |
| `environment` | 本机、Docker、包、CI、凭证问题 | 尽早记录影响和所需 owner 动作。 |
| `documentation` | 计划、runbook、状态、模板更新 | 文档先于或伴随实现更新。 |

## Required Fields

每个变更至少记录：

- request summary
- requirement layer:
  - `user-requirement`
  - `product-requirement`
- source
- priority: `P0`, `P1`, or `P2`
- target version
- acceptance criteria
- affected files or systems
- verification plan
- status

## Priority Rules

- `P0`：阻塞本地运行、验证、当前版本验收或核心产品闭环
- `P1`：显著提升当前版本可追踪性、操作者工作流或受治理产品输出
- `P2`：加固、外部集成、环境扩展或未来版本杠杆

## Current Version Handling

当前版本：`v0.4`。

新工作只有在以下条件之一成立时才能进入 `v0.4`：

- 它是 `v0.4` 验收所必需
- 它修复了验证阻塞
- 它澄清了版本跟踪或日常汇报
- 它被计划明确接受为当前版本变更

否则应归入未来版本候选。

## Operating Rule

当出现新需求时：

1. 先识别这句话是 `user requirement`、`product requirement`，还是两者都有。
2. 更新 `docs/operations/current-version-progress.md`。
3. 如果版本范围变化，更新 `docs/operations/pmaios-version-plan.md`。
4. 如果开始实施，尽量在运行态系统里创建或更新 requirement/version trace。
5. 完成后记录验证证据。
6. 如果这个需求是“通过收敛解决的”，必须显式回查原始用户需求是否真的解决，而不是默认新抽象就够了。
7. 如果这次工作完成的是产品需求，必须用用户语言回给用户，并走查原始用户场景，再决定是否闭环。

## Progress Tracking Rule

进度同步不应默认只报：

- “我完成了什么”

而应默认报：

- 当前长目标清单的分母
- 本轮真正推进了多少项或子项
- 哪些已经 solved / promoted / parked / still missing

推荐结构：

- target denominator: total tracked items
- solved numerator: fully solved items
- promoted numerator: items formally promoted into plan/backlog
- parked numerator: items intentionally deferred with reason
- missing numerator: items identified but not yet properly placed

这条规则尤其适用于用户问这些问题时：

- plan progress
- today progress
- what remains
- whether something has been solved by the latest convergence

## Closure Rule

一个产品需求不会因为以下任一项发生就自动算 fully closed：

- 定义了一个机制
- 加了一条计划项
- 写了一份文档

只有满足以下条件才算闭环：

1. 产品侧需求已经实现或清晰推进
2. 结果已用用户语言回复给用户
3. 原始用户场景已被走查
4. 结论被标记为 `solved / partial / unsolved`

## Research And Architecture Re-entry Rules

当变更引入以下内容时，必须先回到 Research Analysis，再进入 solution design：

- 开源 base 的选择或替换
- 新竞争路线比较
- 新的平台级能力假设
- 共享模块 ownership 不明确

当变更影响以下内容时，必须先回到 Architecture Confirmation，再进入 PRD 或 prototype：

- platform vs subproject scope
- permissions、prompt、knowledge、MCP、evaluation、gateway、release capability 的 ownership
- 一级菜单或主要模块职责

触发任一条时，必须用 decision change template 记录，并在 gate clear 之前阻断后续产品定义工作。
