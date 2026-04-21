# 用户需求回查样板 2026-04-21

- version: v0.2
- date: 2026-04-22
- status: active sample
- purpose: 作为“产品需求完成后回到用户需求场景走查”的第一份真实样板

## 样板 1

### 基本信息

- 用户需求标题：不要总漏需求、漏计划
- 首次提出时间：2026-04-21
- 对应产品需求：
  - 需求晋升与防漏机制
  - 双层需求模型
  - dropped-requirement audit

### 原始用户需求

- 用户原话或等价表达：
  - 很多需求我说过，没有写进 plan，在一次又一次收敛过程中被放弃了
- 用户真实场景：
  - 多轮对话后，需求被写进候选草案或研究文档，但没有进入 canonical version plan / backlog
- 用户想解决的问题：
  - 让需求不再在收敛过程中蒸发

### 当前产品侧推进

- 已形成的机制 / 能力 / 文档：
  - `docs/operations/requirement-promotion-and-loss-prevention.md`
  - `docs/operations/pmaios-version-plan.md`
  - `docs/operations/v0.5-research-and-execution-backlog.md`
  - `docs/operations/v0.4-v0.5-execution-checklist.md`

### 回查

#### 1. 这次推进解决了什么

- 明确了重要需求必须进入 `plan / backlog / candidate / parked-rejected` 四选一
- 明确了大收敛后必须做 dropped-requirement audit
- 把之前停留在候选层的几项高风险内容正式晋升进主计划

#### 2. 还没解决什么

- 还没有把这套机制做成自动审计
- 还没有把“防漏结果”完全可视化到所有运行面

#### 3. 是否只是抽象层收敛，但场景未闭环

- 否，但仍是 `partial`
- 说明：机制和回填已经发生，不只是抽象；但日常执行和 UI 还未完全覆盖

### 结论

- 当前状态：`partial`
- 下一步建议：
  - 把 dropped-requirement audit 接入日常汇报和 Workspace

## 样板 2

### 基本信息

- 用户需求标题：不要只报完成了什么，要按长目标分母报进度
- 首次提出时间：2026-04-21
- 对应产品需求：
  - denominator-style progress protocol
  - async status template
  - current-version-progress denominator section
  - execution checklist runtime summary

### 原始用户需求

- 用户原话或等价表达：
  - 不要说我完成了什么，而是基于长一点目标清单说，我进度提升了多少
- 用户真实场景：
  - 长任务里如果只报“完成项”，分母不清晰，用户无法判断整体推进程度
- 用户想解决的问题：
  - 让进度汇报能够体现总盘子、分子变化和真实解决比例

### 当前产品侧推进

- 已形成的机制 / 能力 / 文档：
  - `docs/operations/requirement-change-control.md`
  - `docs/templates/project_async_status_update_template.md`
  - `docs/operations/current-version-progress.md`
  - `docs/operations/v0.4-v0.5-execution-checklist.md`
  - `/api/ops/execution-checklist-summary`
  - Workspace sidebar denominator summary

### 回查

#### 1. 这次推进解决了什么

- 建立了长目标分母的固定汇报结构
- `current-version-progress` 已开始记录真实的 `v0.4 / v0.5` 分母、solved、partial、carry-over
- Workspace 运行面已经能直接读取执行清单摘要，不再只看最近完成项

#### 2. 还没解决什么

- 还没有让所有日常汇报默认强制走分母协议
- 还没有把更多子项目状态一起并入同一套分母口径

#### 3. 是否只是抽象层收敛，但场景未闭环

- 否，但仍是 `partial`
- 说明：已经进入真实版本快照和 Workspace，不只是模板；但还没完全成为默认日常运行面

### 结论

- 当前状态：`partial`
- 下一步建议：
  - 把分母式进度协议接入更多运行态面板和默认进度回复
