# PMAIOS 介绍

- version: v0.7
- date: 2026-05-08
- status: active
- owner: product office

## 1. PMAIOS 是什么

`PMAIOS` 是 `AI Product Management Operating System`。

它不是单纯的聊天壳，也不是“会生成几份文档”的提示词集合，而是一套把产品定义、设计执行、研发协同、评审治理、知识回填和版本闭环收成运行系统的控制平面。

当前平台定位已经明确为：

`platform control plane + multi-agent product workflow + hermes governance + governed outputs + proof-of-work`

## 2. v0.7 的主问题

v0.7 不是再补一个“最小可用流程”。

这一版要解决的是三个长期漂移：

1. 产品工作流只落到最小链路，没有真正进入完整交付链
2. `Hermes` 只有 policy report，没有成为研究、评审、整改、回写和闭环治理核心
3. 页面实现长期漂向默认 AI 审美，PMOS / 子项目没有稳定遵守既定组件与工作台规范

## 3. 当前正式主链

平台默认产品交付主链已经升级为：

`调研文档 -> 规划文档 -> 需求文档 -> 功能文档 -> 设计文档 -> 前端页面（简单版） -> 前端页面（UI/UX版） -> 数据表 -> 后端接口 -> 前后端联调与验收`

同时这条主链带 4 条硬约束：

1. `需求文档` 必须拆到 `requirement-to-function breakdown matrix`
2. `功能文档` 必须拆到 `function-to-api mapping`
3. `数据语义与接口语义必须前置暴露、后置定稿`
4. `评审先走 agent committee，再由 human final approval 做最终裁决`

## 4. Hermes 在 v0.7 的正式职责

`Hermes` 不再只是“写一份 policy report”。

当前正式职责是：

1. `Research`
   从 repo 真源和 Dataki 默认知识库检索系统现状，并形成 knowledge grounding
2. `Committee`
   把 research findings 注入多角色评审，让评审不止审结构，而是审业务语义、方案优解和开发任务可执行性
3. `Watch`
   记录 recurring findings、降噪、去重、跟踪跨 run 治理问题
4. `Promote`
   把共享问题升格为 requirement / rule / prompt / template / workflow writeback target
5. `Writeback`
   对受管 markdown 真源执行受控回写
6. `Closure`
   跟踪 writeback task、watch task、closure evidence，并回收到 committee / proof-of-work / operator actions

## 5. PMAIOS 首页应该是什么

PMAIOS 首页不是品牌介绍页，也不是抽象 AI dashboard。

首页必须先回答：

1. 当前 scope 是谁
2. 当前有哪些运行信号
3. 当前有哪些动作可以继续推进
4. 当前最新 governed outputs 在哪里
5. 哪些风险、阻塞、治理事项还没闭环

因此页面结构必须优先：

`scope + live state + actions + outputs + monitoring + asset access`

禁止再回到：

`hero + summary-card + explanation-first`

## 6. 当前能力收口

截至本次 v0.7 收口，平台已经具备：

1. 完整产品主链定义与 runtime stage contract
2. 多角色 review committee
3. `Hermes -> committee -> proof-of-work -> operator action` 闭环
4. Dataki 默认系统现状知识上下文接入
5. 受控 `Hermes` writeback 与 closure tracking
6. 前端工作台反模式禁令和自动审计脚本

## 7. 对原始用户诉求的回查

原始诉求不是“平台有更多机制”，而是：

- AI 能更懂系统现状
- 文档拆解能真正支撑前后端开发
- 评审不再形式化
- 页面不再是默认 Claude 风格

当前判断：

- `Hermes` 作为完整治理核心：`partial`
- 文档拆解与评审结构化能力：`solved`
- 页面默认 AI 风格漂移治理：`partial`
- PMOS 真源文档回正：`solved`

仍是 `partial` 的部分，不是方向错，而是还需要把更多子项目页面和外围历史资产一起清干净。
