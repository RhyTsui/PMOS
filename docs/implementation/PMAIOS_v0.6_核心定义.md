# PMAIOS v0.6 核心定义与验收基线

- 日期：2026-04-17
- 状态：Current Baseline

## 1. 一句话定义

**PMAIOS v0.6 = 面向平台与子项目协同的闭环产品操作系统内核**

不是单纯 workflow demo，也不是未来完整平台幻想图。

当前版本只收敛已经进入仓库主干的闭环能力：

- Execution
- Requirement
- Version
- Observability
- Product Management Governance

## 2. 版本定位

### v0.3 的本质

- 建立 workflow / orchestrator / trace / review 的骨架
- 解决“能不能跑”的问题

### v0.6 的本质

- 在骨架之上形成 `需求 -> 执行 -> 评审 -> 版本 -> 观测 -> 回流` 闭环
- 解决“能不能稳定治理和持续迭代”的问题

### 当前不做

- 不强行引入完整 LangGraph 重写
- 不强行引入外部控制平面
- 不把 Dify / n8n / Hermes / Meta Layer 直接纳入当前执行真源
- 不把所有子项目一起重构

## 3. 当前系统边界

### 平台层

- workflow definition
- orchestrator runtime
- memory / trace / chat context
- requirement pool
- version registry
- observability
- product management agent hierarchy
- document taxonomy / inbox governance

### 子项目层

- 继承平台规则
- 使用平台能力
- 维护项目自己的 memory / requirements / versions / review / code

### 人与 Agent 的关系

- 真实产品主管：给原则、边界、最终裁决
- 产品管理 Agent：虚拟产品主管，负责治理与收敛
- 虚拟产品经理群：负责需求、版本、评审、流程、协同、复盘

## 4. v0.6 必须成立的五个闭环

### 4.1 Execution 闭环

- workflow 可初始化
- stage 可推进
- gate 可阻塞
- rework 可恢复

### 4.2 Requirement 闭环

- chat / 输入源中的需求可被识别
- 需求可进入 requirement pool
- 需求与项目、版本、运行实例可关联

### 4.3 Version 闭环

- 关键变化可登记为 version entry
- 版本记录可回看与追踪
- 版本基线与候选分析明确分离

### 4.4 Observability 闭环

- execution run 可见
- workflow event 可见
- artifact path 可见
- review / metrics 可追踪

### 4.5 Governance 闭环

- 输入源与决策文档分层
- 唯一人工输入入口明确
- 对话规则可沉淀为全局规则
- 产品管理 Agent 可实例化成角色体系

## 5. 当前生效真源

- `workflows/main.md`
- `workflows/execution.md`
- `docs/tasks/PMAIOS_v0.6_升级任务清单.md`
- `docs/architecture/PMAIOS_product_management_agent_operating_model.md`
- `docs/decisions/adr-0003-document-taxonomy.md`
- `docs/decisions/adr-0004-v0.6-baseline-adoption.md`

## 6. 当前验收标准

### A. 工作流内核

- `WorkflowEngine` 返回统一 typed definition
- `OrchestratorRuntime` 支持 init / advance / run-until-blocked / rework

### B. 闭环对象

- `Requirement`、`VersionEntry`、`ExecutionObservability` schema 可用
- chat -> requirement 沉淀链路存在
- version / capability / review 之间可建立 trace

### C. 管理能力

- `ProductAgent` 支持角色、层级、范围、治理引用、管理链
- 产品管理蓝图可 bootstrap 成 agent 体系

### D. 输入治理

- `docs/sources/inbox/` 是唯一人工输入入口
- `docs/incoming/` 不再作为新入口

## 7. 后续演进方向

`v0.6` 之后，才继续考虑：

- 更强的 DAG / graph execution
- 更严格的 policy isolation
- 更多外部 capability integration
- 真正的平台化多用户能力

但这些不属于当前生效基线。
