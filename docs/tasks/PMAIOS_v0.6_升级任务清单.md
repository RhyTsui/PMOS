# PMAIOS v0.6 升级任务清单

- 日期：2026-04-17
- 状态：Current Execution Backlog
- 目标：把当前仓库从 `v0.3 workflow kernel` 收敛为 `v0.6 closed-loop release system`

## 1. 本轮版本目标

本轮只收敛已经在仓库里有基础的五个闭环：

1. Execution
2. Requirement
3. Version
4. Observability
5. Product Management Governance

## 2. 任务分组

### T1. 升级当前执行真源到 v0.6

- 更新 workflow 文档、核心定义、任务清单、ADR
- 统一当前版本口径
- 把分析输入源与当前执行基线分开

验收：

- 当前版本真源不再依赖 `v0.3` 任务清单
- `v0.6` 文档可单独说明当前执行口径

### T2. 强化 Requirement System

- 保持 chat -> requirement ingestion 稳定
- 补强 requirement pool 的模板、字段、来源追溯
- 把输入源中的显式需求和项目需求更稳地映射到 requirement pool

验收：

- requirement 可从聊天与文档输入稳定进入需求池
- requirement 与 session / message / version / run 可追踪

### T3. 强化 Version System

- 统一版本记录模板
- 区分版本候选分析与当前生效基线
- 让 capability / requirement / workflow / chat 的版本登记可统一查询

验收：

- version entry 可被按项目与平台层查询
- 版本主线和输入分析不再混淆

### T4. 强化 Observability System

- execution run、workflow run、events、artifacts、review、metrics 的链路继续补齐
- 让平台态、子项目态、跨项目态更容易查看

验收：

- 至少可从一次对话追溯到 run、snapshot、event、artifact
- review / metrics / timeline 数据可统一展示

### T5. 产品管理治理层落地

- 产品管理 Agent 蓝图与角色体系继续接线
- prompt / template / workflow / docs 形成岗位级 contract
- 明确真实产品主管、项目产品经理、跨项目场景的作用域规则

验收：

- 平台层可 bootstrap 出虚拟产品主管体系
- 目录入口、角色、作用域、关联项目规则有统一说明

### T6. 子项目目录收敛

- 为现有 `subprojects/*` 建立差距表
- 先补 README / subproject.json / docs/memory
- 再按标准逐步收敛目录职责

验收：

- 每个项目至少能被平台识别、说明、挂接
- 新项目接入不再继续走野生目录

## 3. 当前明确不做

- 全量迁移到 LangGraph Control Plane
- 完整 Hermes Policy Layer 落地
- Dify / n8n 深度接入
- Meta Layer 自动演化
- 所有子项目一次性重构

## 4. 当前阶段顺序

### Phase A｜真源收敛

1. T1 执行真源升级
2. T5 产品管理治理层落地

### Phase B｜闭环补齐

3. T2 Requirement System
4. T3 Version System
5. T4 Observability System

### Phase C｜项目接入

6. T6 子项目目录收敛

## 5. 完成定义

当满足以下条件时，可认为当前仓库已进入 `v0.6`：

- 当前真源明确采用 `v0.6` 基线
- requirement / version / observability / governance 四类闭环都可运行
- 平台层和子项目层作用域边界清晰
- 新材料、规则、需求、版本分析都有明确落位规则
