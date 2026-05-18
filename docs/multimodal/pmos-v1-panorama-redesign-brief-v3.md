# PMOS v1.0 全景图重画简报 v3

## 结论

- 不建议在当前图上继续修补。
- 建议按 `价值优先级 -> 运行机制 -> 自动化与质量保障` 重新组织语言并重画。
- 新图不再强调“产品工作流有哪些步骤”，而强调：
  - 如何自动化起跑
  - 如何持续协作
  - 如何受治理
  - 如何回写真源
  - 如何对外同步
  - 如何在长链路里恢复、重试、续跑

## 这轮图的主表达

PMOS 不是“AI 产品流程图”。

PMOS 是：

`产品操作系统`

核心表达改成：

`让产品从意图进入可自动推进、可质量治理、可持续交付的运行机制`

副表达建议：

- 从产品意图到受治理的持续交付
- 自动化起跑，不等于失控；持续执行，不等于无法审计

## 旧图的主要问题

1. 讲了太多常规流程，价值密度不够高。
2. 讲的是“模块总览”，不是“运行机制总览”。
3. 自动化表达不足，容易看成普通产品经理工作拆解。
4. 质量与治理只停留在抽象词，没有落到可感知机制。
5. 你补回来的 v0.7 高价值能力没有进入主视觉中心。

## 这 8 个能力点的当前状态

### 1. 上下文注入 / Kernel Context

- repo 现状：`partial`
- 判断依据：
  - 研究文档中明确提出 `PMAIOS Kernel Context`
  - 代码与系统里有 context resolve / startup recovery / Dataki grounding
  - 但没有被明确产品化成一个对外可见能力块
- 设计结论：
  - 需要放进中心核心附近
  - 文案名建议：`上下文注入`

### 2. 统一 Gate Runtime

- repo 现状：`partial -> near solved`
- 判断依据：
  - `v0.7 minimum loop` 已明确 gate 动作化
  - 有 `approve / rework / resume / run`
  - 有 gate attention、gate history、current attention
  - 但图上没把“规则拦截 / 放行 / 打回 / 升级”讲清
- 设计结论：
  - 原“关卡运行时”改为 `统一 Gate Runtime`
  - 必须加副文案

### 3. Task SSOT

- repo 现状：`solved at runtime layer`
- 判断依据：
  - `TaskSsotTaskSchema`
  - gate history / artifact links / sync envelopes / continuation
  - 前端有 Task SSOT continuation 展示
- 设计结论：
  - 这是核心价值之一，不该只是普通模块名
  - 要改成“任务 / 状态 / 证据 / 同步主存”

### 4. L0-L3 协作等级

- repo 现状：`partial`
- 判断依据：
  - `CollaborationLevelSchema = L0-L3`
  - Task SSOT 已带 `collaborationLevel`
  - 运行里已有默认值与少量使用
  - 但没有被产品化解释为“协作等级协议”
- 设计结论：
  - 必须出现在 Agent 协作运行层
  - 不能再只写“多 Agent 协作”

### 5. Pipeline Launcher

- repo 现状：`unsolved / concept only`
- 判断依据：
  - 研究文档明确提出
  - 现有系统有交付主链，但没有“命中成熟链路自动起跑”的正式能力表达
- 设计结论：
  - 作为高价值规划能力放进图里
  - 但用“成熟链路自动起跑”去表达，避免假装已经 fully shipped

### 6. 回写契约 / Asset Backwrite Contract

- repo 现状：`partial`
- 判断依据：
  - `v0.7 minimum loop` 已有 requirement backwrite
  - Hermes writeback、proof-of-work、backwriteTargets 已存在
  - 但没有被明确提升为“未回写真源不算完成”的硬契约
- 设计结论：
  - 新图里必须直接写出来
  - 这是 PMOS 区别于普通 AI 输出工具的重要边界

### 7. External Sync Outbox

- repo 现状：`partial -> near solved`
- 判断依据：
  - 有 `OutboxService`
  - 有 `TaskSsotSyncEnvelope`
  - 有 `/api/outbox/envelopes`
  - 有 receipt / retry / targetSystem
  - 有 Notion / Dataki / Figma 连接位
  - 但图上没有讲它是“统一异步出口层”
- 设计结论：
  - 这是部署与协作层的高价值能力
  - 需要从“云端知识同步”升级成 `External Sync Outbox`

### 8. Autonomous Scheduler

- repo 现状：`partial`
- 判断依据：
  - 有 `scheduleRun / tickRun / tickDueRuns`
  - 有 cooldown、resume-current-stage、resume-rework-stage
  - 有 auto-rework、auto-retry
  - 有 blocked / needs-rework 恢复逻辑
  - 但配额没有正式表达，长链续跑价值也没有被图上讲透
- 设计结论：
  - 需要把“调度运行时”升级成带副文案的价值模块
  - 明确 `重试 / 恢复 / 长链续跑`

## 新图优先级重排

### P0：必须成为主视觉中心的机制

1. 状态引擎
2. Task SSOT
3. 统一 Gate Runtime
4. Autonomous Scheduler
5. 回写契约
6. External Sync Outbox

### P1：必须成为差异化亮点的机制

1. 上下文注入
2. L0-L3 协作等级
3. Pipeline Launcher
4. 企业知识 grounding

### P2：可以保留但降权的内容

1. 常规产品阶段名
2. 普通设计/研发/部署动作罗列
3. 泛泛的“协作”“智能化”“自动化”口号

## 新版结构建议

### 1. 标题区

- 主标题：`PMOS v1.0`
- 副标题：`产品操作系统`
- 描述：`让产品从意图进入可自动推进、可质量治理、可持续交付的运行机制`

### 2. 中央核心区

中心不再只是“状态引擎 + 四节点”，而是：

- 状态引擎
- 上下文注入
- Task SSOT
- Autonomous Scheduler
- 统一 Gate Runtime

其中：

- `Task SSOT`
  - 副文案：`任务 / 状态 / 证据 / 同步主存`
- `统一 Gate Runtime`
  - 副文案：`规则拦截 / 放行 / 打回 / 升级`
- `Autonomous Scheduler`
  - 副文案：`重试 / 恢复 / 长链续跑`
- `上下文注入`
  - 副文案：`系统现状 / 历史决策 / 当前目标进入同一运行上下文`

### 3. 左右能力层改名建议

- `01 战略认知层`
- `02 工作流治理层`
- `03 Agent 协作运行层`
- `04 自动化交付运行层`
- `05 知识沉淀层`
- `06 外部同步与协作层`

说明：

- 不再用“AI 产品操作系统”反复占文案空间
- 不再用“自治智能体运行层”这种偏虚名字
- 知识与同步出口要拆开表达，不再混成一层

### 4. 新增强表达模块

- `L0-L3 协作等级`
  - 位置：`03 Agent 协作运行层`
  - 作用：显示这不是松散多 Agent，而是有层级协议的协作运行

- `Pipeline Launcher`
  - 位置：`04 自动化交付运行层`
  - 文案：`命中成熟链路自动起跑`

- `回写契约`
  - 位置：`02 工作流治理层` 或 `05 知识沉淀层`
  - 文案：`未回写真源不算完成`

- `External Sync Outbox`
  - 位置：`06 外部同步与协作层`
  - 文案：`Notion / GitHub / Dataki / Figma 异步出口`

## 图面语言策略

- 少写常识，多写机制
- 少写步骤，多写约束
- 少写“做什么”，多写“如何保证做对”
- 少写泛模块名，多写“系统自动推进与质量控制能力”

## 新图建议保留的流程表达

底部仍可保留一条短交付闭环，但只作为辅助，不作为主叙事：

- 洞察
- 规划
- 需求
- 设计
- 开发
- 验证
- 交付
- 回写
- 同步
- 续跑

要求：

- 文案简短
- 不占主视觉
- 重点让位给自动化与治理机制

## 最终设计判断

用户需求层：

- 希望图更高级、少废话、体现真正高价值能力
- 当前判定：`partial`

产品需求层：

- 应把 PMOS 从“能力总览图”升级成“运行机制总览图”
- 当前判定：`明确成立`

执行建议：

- 直接重画
- 不在旧图上 patch
- 新版优先讲：
  - 自动起跑
  - 协作等级
  - 调度恢复
  - 统一 gate
  - 回写契约
  - 外部同步出口
