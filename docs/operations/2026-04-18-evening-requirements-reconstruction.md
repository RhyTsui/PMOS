# 2026-04-18 晚间需求回溯清单

## 目的

本文件用于回溯 **2026-04-18 22:00 至 22:20（Asia/Shanghai）** 附近的一轮需求沟通，并整理当时形成的待办与产品方向。

说明：

- 当前仓库中 **未找到该轮沟通的完整原始聊天逐条记录**。
- 本文基于当晚落盘的文档、配置与代码变更进行回溯。
- 因此本文内容分为：
  - **直接证据**：可以从文件内容直接读取的需求或结论
  - **合理反推**：结合时间与变更聚类得到的高置信推断

## 时间窗口

- 回溯目标时间：`2026-04-18 22:00` 至 `2026-04-18 22:20`
- 关键落盘文件时间点：
  - `2026-04-18 22:00:13` `config/product-management/agent-blueprints.json`
  - `2026-04-18 22:13:01` `docs/templates/physical_world_profile_template.md`
  - `2026-04-18 22:13:51` 至 `22:13:52` 多份 AI Product Office 模板
  - `2026-04-18 22:20:26` `docs/operations/ai-product-office-roadmap.md`
  - `2026-04-18 22:20:26` `docs/templates/human_pm_invocation_guide.md`
  - `2026-04-18 22:20:26` `docs/templates/README.md`
  - `2026-04-18 22:20:26` `docs/operations/release-summary.md`
  - `2026-04-18 22:22:30` `src/server/index.ts`

## 关键证据文件

- `docs/operations/ai-product-office-roadmap.md`
- `docs/templates/human_pm_invocation_guide.md`
- `docs/templates/README.md`
- `docs/operations/module-roadmap.md`
- `config/product-management/agent-blueprints.json`
- `docs/memory/requirements/req-af775fe4-8fca-4ea2-afc2-b5727694d720.json`
- `docs/memory/requirements/req-15804301-c07d-4348-8aee-5a24acf0f544.json`

## 直接证据

### 1. 要把 PMAIOS 从 workflow runtime 升级为 AI Product Office

直接来源：

- `docs/operations/ai-product-office-roadmap.md`

可直接确认的目标：

- 人类主要提供现实世界信息与最终决策
- AI 默认承担数字化产品工作
- 系统应作为虚拟产品员工 / 产品办公室运行

### 2. AI 要主动追问缺失的现实世界信息，而不是被动等待指令

直接来源：

- `docs/operations/ai-product-office-roadmap.md`
- `docs/templates/human_pm_invocation_guide.md`

可直接确认的要求：

- 结构化用户请求
- 识别缺失约束
- 主动提问现实世界里无法安全推断的信息

### 3. 要建立一整套受治理的产品输出模板

直接来源：

- `docs/templates/README.md`

当晚新增或被纳入治理范围的输出类型包括：

- 日报
- 周报
- 季度 OKR
- 专题研究
- 需求评估反馈
- roadmap
- version planning
- 用户手册
- demo script
- 竞品情报
- 方案同步纪要
- 学习成长 memo
- 生态 / 开源扫描
- UI schema spec
- physical world profile

### 4. 要正式建立“虚拟产品负责人 + 多专业产品代理”的组织结构

直接来源：

- `config/product-management/agent-blueprints.json`

可直接确认的角色分层：

- Manager layer
  - Virtual Product Chief
  - Requirements PM
  - Version PM
  - Review PM
  - Workflow PM
  - Delivery PM
  - Retrospective PM
- Specialist layer
  - Industry Research PM
  - User Research PM
  - Competitive Analysis PM
  - Stakeholder PM
  - ROI PM
  - Strategy Radar PM
  - Roadmap PM
  - Documentation PM

### 5. 要明确 AI 与人的授权边界

直接来源：

- `docs/operations/ai-product-office-roadmap.md`
- `docs/templates/human_pm_invocation_guide.md`

可直接确认的边界：

- AI 默认负责草稿、研究、梳理、建议、生成文档与输出
- 人类默认负责最终业务决策、组织承诺、预算/人力等高风险事项

### 6. 估算方式要改为 AI-first，而不是沿用纯人工节奏

直接来源：

- `docs/operations/ai-product-office-roadmap.md`

明确要求的估算维度：

- `ai_first_effort`
- `coordination_load`
- `external_dependency`
- `confidence`

### 7. 要维护一份“现实世界组织画像”

直接来源：

- `docs/operations/ai-product-office-roadmap.md`
- `docs/templates/physical_world_profile_template.md`

直接结论：

- 系统要长期维护团队边界、决策权、协作对象、战略重点、AI 采用程度等现实画像

### 8. AI 不只执行，还要承担学习/认知升级建议

直接来源：

- `docs/operations/ai-product-office-roadmap.md`

直接要求：

- 识别重复性认知盲点
- 推荐框架、方法、学习路径
- 在必要时沉淀成长 memo

### 9. 战略提案前必须扫描开源与外部模式

直接来源：

- `docs/operations/ai-product-office-roadmap.md`

直接要求：

- 在自研前先找开源项目、公共框架、可复用产品模式
- 对发现分类为 `adopt / adapt / watch / reject / build`

### 10. 内部产品界面优先走 schema-driven UI / reusable business blocks

直接来源：

- `docs/operations/ai-product-office-roadmap.md`

直接要求：

- 优先显式 schema
- 优先可复用业务块
- 优先交互契约与状态模型

### 11. 当前模块级推进顺序已被明确

直接来源：

- `docs/operations/module-roadmap.md`

P0 顺序：

1. orchestrator
2. requirement system
3. observability / review / metrics
4. version system

### 12. “用在线服务”是明确进入需求池的诉求

直接来源：

- `docs/memory/requirements/req-af775fe4-8fca-4ea2-afc2-b5727694d720.json`
- `docs/memory/requirements/req-15804301-c07d-4348-8aee-5a24acf0f544.json`

直接结论：

- 该需求已被记录为 draft requirement
- 标题与描述均为：`用在线服务`

## 合理反推

以下内容不是逐字聊天原文，而是基于 22:00 左右的成体系落盘结果进行的高置信推断。

### A. 当晚沟通的核心方向，不是单点修 bug，而是一次产品 operating model 升级

依据：

- 新增的不只是一个需求文件，而是一整套 roadmap、guide、template、agent blueprint
- 这类变更更符合“你提出一组产品方法论与运行方式需求”，而不是零散技术修复

### B. 你当晚提出的需求，很可能包括“让 AI 作为产品办公室工作”

依据：

- `ai-product-office-roadmap.md` 的内容高度成体系
- 包含目标、边界、授权、估算、画像、学习机制、开源扫描、schema as UI
- 这更像一次集中需求输入后的结构化产物

### C. 你当晚很可能要求“把已有产品代理从注册态推进到可治理、可观察、可审计”

依据：

- `agent-blueprints.json` 当晚被修改
- `module-roadmap.md` 中明确写了 `Product-agent governance`
- 内容强调从“registered/generated”走向“governed/observable/auditable”

### D. 你当晚很可能要求“产物必须模板化、受治理、可追溯”

依据：

- `docs/templates/README.md` 与多份模板在同一时间窗口创建
- 这些模板类型与 roadmap 中的输出系统一一对应

## 回溯后的待办清单

结合直接证据与合理反推，当前应按下面顺序理解这轮需求的待办。

### P0

1. 启用在线模型 / 在线 provider，替换当前 mock 或本地回退路径
2. 把 PMAIOS 升级成 AI Product Office operating model
3. 把 Virtual Product Chief 与各类 Specialist PM 纳入真实运行与治理链路
4. 先闭环四个核心模块：
   - orchestrator
   - requirement system
   - observability / review / metrics
   - version system

### P1

1. 让 AI 默认按模板生成受治理的产品文档
2. 建立现实世界组织画像并持续维护
3. 把学习建议、认知升级、外部模式扫描纳入标准输出
4. 把 schema-driven UI / business blocks 作为内部产品设计默认路径

### P2

1. 把 meeting transcript / 外部知识 / 系统数据接入产品办公室工作流
2. 做外部技能、插件、框架的受治理评估与引入

## 当前缺口

以下信息当前仍然缺失：

- 2026-04-18 晚间那轮沟通的完整逐条聊天原文
- 你当晚提出需求时的优先级原话
- 是否还有未落盘的补充要求

## 建议的后续动作

1. 以本文作为“晚间需求回溯基线”
2. 从 `用在线服务` 开始，确认当前在线 provider / model 的真实配置状态
3. 按 `module-roadmap.md` 的 P0 顺序推进四个闭环
4. 后续若找到原始聊天全文，再把本文从“回溯稿”升级成“最终纪要”

## 结论

即使缺少原始聊天全文，基于 **2026-04-18 22:00 至 22:20** 的集中落盘结果，已经可以高置信确认：

- 你当晚不只是提了一个“在线服务”需求
- 你更可能提出了一轮关于 **AI Product Office 化、产品代理治理化、模板治理化、AI-first 工作方式** 的成体系需求
- 当前仓库里这些文件就是那轮需求的主要落地产物
