# PMOS v0.1 到 v1.0 版本功能点清单

- status: draft for整理
- date: 2026-05-09
- purpose: 先把各版本的主要功能点拉平列出，便于后续你再做精修、归类和对外改写

## 使用说明

- 这份文档优先追求 `按版本快速看清做过什么`
- 不追求每个点都写成完整产品文案
- `v0.1` 到 `v0.3` 有一部分是根据仓库真源反推的阶段能力，尤其 `v0.1` 边界是推断值
- 当前平台主叙事已经切到 `v1.0`，其中 `v0.7` 被视为 landed runtime baseline

## v0.1

- 早期 workflow / runtime 原型种子
- 基础工作流文件与阶段化思路
- 早期 review / workflow 证据沉淀
- AI OS / PMOS 架构雏形
- 后续版本的原型能力起点

## v0.2

- 本地 runtime baseline
- backend / frontend / CLI 三个主入口成形
- 本地 API / Web console 可运行
- lint / test / build 基线打通
- backend 在生产模式下可直接托管前端产物
- Chroma 本地安全 fallback
- 本地 runbook 与 release-facing 文档
- 本地可交付的最小运行闭环

## v0.3

- AI Product Office 基础层收敛
- 产品经理工作模型与 human / AI 边界定义
- 产品输出模板体系
- product-agent blueprint hierarchy
- Physical-world profile 概念与真源
- Product Chief 路线开始成形
- roadmap / module roadmap / version planning 模板收敛
- 面向产品分析与治理的基础框架从“想法”收成“正式真源”

## v0.4

- Controlled workflow kernel
- Workflow Ops 面板与阶段推进动作
- requirements 系统
- version 系统
- review gate
- observability timeline 过滤与可视化
- DAG graph / impact baseline
- dirty-node rerun 接入 workflow runtime
- Product Chief runtime
- governed outputs
- 文档归一化与 traceability
- retrieval governance
- Hermes 主线接入
- capability gate hardening
- Chroma / knowledge 路径继续接到主运行链

## v0.5

- 治理基线正式建立
- 连续执行与 `{do}` 快速执行路线
- 思考与同步并行规则
- 分母式进度追踪
- user requirement / product requirement 双层回绑
- requirement loss prevention
- requirement change control
- cognition ladder
- intent amplifier
- sidecar deep research 机制
- AI 产研协同闭环
- human reading surface
- AI 阅读层 / 人阅读层分层
- 项目入口 contract
- SVG-first artifact policy
- 每日对话蒸馏与方法论沉淀
- 文档 wiki 分层入口
- image2 设计交付链开始固定
- 设计 / schema / frontend / implementation handoff 链条开始收束

## v0.6

- 第一个 kernelized runtime release
- Task SSOT
- 项目 continuation runtime
- gate runtime 最小闭环
- SchedulerRun
- Hermes Global minimum loop
- final-state validation
- outbox minimum shell
- task / stage / gate / artifact / assignment / sync-envelope 统一结构
- active mainline / next safe step / parked side lines / blocker / resume anchor
- project-truth-gate / review-convergence-gate / asset-backwrite-gate
- workflow-run 派生的调度视图
- ready / rework / blocked 判定
- sync envelope queue 与 receipt handling
- 设计输出链硬拆分：
  - concept-design-pack
  - html-direction-pack
  - delivery-design-pack

## v0.7

- Autonomous Continuation + Governed Productization Runtime baseline
- SchedulerRun 自动调度 minimum loop
- Gate Runtime 动作化
- Requirement backwrite guardrails
- Design landing guardrails
- UI Schema productization
- typed `UISchemaContract`
- pageContracts / blocks / states / actions / dataRefs / implementationRules
- Hermes compare / promote minimum loop
- proof-of-work bundle
- specialist review runtime 开始成形
- stage-agent orchestration
- UI spec activation gate
- repeat-correction memory
- built-in delivery chain 固定为：
  - 调研
  - 规划
  - 需求
  - 功能
  - 设计 / 前端页面
  - 数据表
  - 后端接口
  - 联调与验收
- frontend anti-drift baseline
- frontend browser verification 接入 proof / task lifecycle
- Playwright 真实浏览器验证进入平台主链
- ad 子项目作为 rollout sample 接入新交付链
- 文档治理真源注册与 audit baseline

## v1.0

- 从 runtime baseline 进入 product version
- 目标切到 `可部署、可协作、可交付`
- 产品经理 Agent 身份与统一入口
- 多角色工作承接与差异化输出
- requirement -> function -> API -> task 深拆链
- specialist review committee + Hermes governance 闭环
- 交付级前端页面生产
- 文档生命周期治理
- Dataki / system-state grounding
- deployment / operation / release / GitHub sharing readiness
- 云端知识同步层
- PMOS vs codex 规格边界
- 独立 `PMOS product repo`
- GitHub / Notion 云端分层
- `latest-state` 镜像层
- 配置 sample / example 化
- 其他设备可部署路径
- second-machine verification
- GitHub release readiness / cutover / release steps
- operator guide / first-run / api-overview / changelog
- 对外产品介绍、README、版本真源、gap list、acceptance standard
- `v0.7` 被正式收束为 `v1.0` 的 landed runtime baseline

## 一句话版本演进

- `v0.1`：原型种子
- `v0.2`：本地可运行 baseline
- `v0.3`：产品办公室与产品治理概念收敛
- `v0.4`：workflow kernel、traceability、review、DAG、Product Chief 接主链
- `v0.5`：治理规则、人机协同、阅读层、深研与防漏机制收口
- `v0.6`：Task SSOT / Gate / Scheduler / Hermes / Outbox 最小运行时成形
- `v0.7`：自治续跑、交付链、UI schema、proof、browser verification 成为 runtime baseline
- `v1.0`：把 runtime baseline 推成可部署、可发布、可协作的产品版本

## 主要参考真源

- `docs/operations/pmaios-version-plan.md`
- `docs/operations/version-governance.md`
- `docs/operations/version-plan-v0.2-to-v0.6.md`
- `docs/operations/v0.4-v0.5-transition-2026-04-21.md`
- `docs/operations/pmaios-v0.5-checklist.md`
- `docs/operations/v0.5-implementation-index.md`
- `docs/operations/v0.6-closeout-summary.md`
- `docs/operations/v0.7-minimum-loop-summary.md`
- `docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md`
- `docs/operations/current-version-progress.md`
- `docs/operations/pmaios-v1.0-direction.md`
- `docs/operations/v1.0-product-version-program.md`
