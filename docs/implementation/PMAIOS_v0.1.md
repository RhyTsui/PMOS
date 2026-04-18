# AIOS 完整需求汇总

- 版本：v1.0
- 日期：2026-04-07
- 状态：汇总版
- 适用范围：`E:\AI\ai-os`

---

## 1. 总目标

AIOS 是一个**本地优先、文件驱动、可追踪、可审计、可扩展**的 AI 产品研发操作系统。

它不是一个单纯的聊天工具，也不是要在仓库里重造 Claude Code / OpenSpec / Superpowers，而是要把 AI 能力嵌入完整的软件研发流程中，形成从需求到交付、从执行到评审、从文档到运行时的一体化闭环。

核心目标：

1. 把产品设计和软件研发阶段化、文件化、可追踪化
2. 让 AI 能力嵌入研发流程，而不是停留在对话层
3. 用本地文件作为系统真源，避免对话成为唯一状态
4. 建立可回放、可审计、可评审的 workflow runtime
5. 提供前端 dashboard、后端 API、CLI 三个统一操作面
6. 支持 provider / MCP 可替换接入，而不是绑定单一模型厂商
7. 最终实现从行业分析到多模态交付的完整产品研发闭环

---

## 2. 产品定位

AIOS 应定位为：

> 一个本地优先、文件驱动、工作流化的 AI 产品研发操作系统。

它的核心竞争力不是“更会聊天”，而是：

- 能组织复杂研发流程
- 能沉淀长期项目知识
- 能生成标准化交付产物
- 能把 AI 行为纳入工程治理
- 能把工具调用、模型调用、评审流程、产物沉淀统一到一个可运行系统中

---

## 3. 总体设计原则

### 3.1 文件驱动优先
- 所有关键产物必须落盘
- `docs/`、`prompts/`、`workflows/`、`config/` 是长期真源
- Memory、Review、决策、任务、架构、PRD 都必须可追踪

### 3.2 工作流显式化
- 阶段必须清晰
- 每阶段必须有输入、输出、验收标准
- 支持推进、阻塞、返工、评审门禁

### 3.3 角色与能力解耦
- 角色负责视角和责任
- 能力模块负责执行逻辑
- 不把所有逻辑塞进单一 agent

### 3.4 模型与工具分层
- Provider 负责模型能力
- MCP 负责工具协议
- Workflow 负责业务流程编排
- Runtime 负责执行、产物、事件、状态

### 3.5 评审机制前置
- Review Committee 是正式质量门禁
- 不能只做“代码对不对”
- 必须覆盖产品、架构、技术、数据、风险

### 3.6 安全与治理
- 密钥只通过环境变量注入
- 不把 secret 写入仓库
- 高风险动作要有治理边界
- 所有关键执行应有事件记录

### 3.7 不重复造轮子
- Claude Code 是执行环境，不是仓库里被重造的对象
- OpenSpec / Superpowers 只保留兼容层与接入点，不在本仓库重复实现完整替代物

---

## 4. 关键用户场景

### 场景 A：从 0 到 1 初始化新产品
用户输入新产品方向，系统完成：
- 行业分析
- PRD
- 架构设计
- Task 拆解
- demo / 实现骨架
- review 输出
- 多模态交付说明

### 场景 B：已有项目持续迭代
用户已有产品结构，系统基于现有文件资产做：
- 增量分析
- 重构建议
- 需求迭代
- workflow 推进
- review gate

### 场景 C：多角色协作
- 产品
- 架构
- 前后端
- 数据
- 评审角色

共享同一套文件化资产和工作流。

### 场景 D：治理驱动交付
在开发与部署前，系统通过 Review Committee 做统一审查，形成结构化问题、影响、建议、结论与 gate 决策。

---

## 5. 完整工作流需求

AIOS 需要覆盖完整研发闭环，至少包含以下阶段：

1. 行业分析
2. PRD
3. 架构设计
4. Task 拆解
5. 开发实现 / 运行时生成
6. Review Committee
7. 多模态产物
8. 迭代优化

每个阶段都需要：
- 明确 label / ownerRole / description
- required outputs
- acceptance criteria
- 可推进状态
- 可阻塞状态
- 事件记录

---

## 6. 核心功能需求

### 6.1 行业分析
系统要能输出行业分析文档，至少包含：
- 行业最佳实践
- 竞品对标
- 模式分析
- 优缺点
- 可借鉴点
- 对本项目的设计启示

### 6.2 PRD 生成
系统要能输出结构化 PRD，至少包含：
- 产品目标
- 用户场景
- 核心功能
- 非功能需求
- MVP 范围
- 验收标准

### 6.3 架构设计
系统要能输出架构设计文档，至少包含：
- 分层架构
- Mermaid 图
- 模块划分
- 数据流与调用链
- OpenSpec / Superpowers 兼容策略
- Memory 架构
- 前端架构选择

### 6.4 Task 拆解
系统要能把需求与架构拆成阶段任务，至少明确：
- 任务名称
- 交付物
- 验收标准
- 依赖关系
- 阶段归属

### 6.5 开发实现
系统要支持：
- 前后端骨架
- runtime 执行链路
- artifact 落盘
- workflow 状态推进
- 本地可运行 dashboard
- API 和 CLI 查询能力

### 6.6 Review Committee
Review 必须是结构化输出，至少覆盖：
- roles
- issues
- impact
- recommendation
- expected answer
- decision
- 总体结论
- 下一阶段判断
- 返工判断

### 6.7 多模态产物
系统必须支持多模态交付，而不只是纯文本：
- Markdown 文档
- Mermaid 架构图
- UI 结构说明
- 可执行代码
- 视频脚本 / 分镜说明
- 设计工具对接说明

### 6.8 Memory 与知识积累
系统要支持：
- 长期项目记忆
- 运行记录
- 可扩展知识库候选
- 显式 memory 分层，而不是仅依赖聊天记录

### 6.9 外部能力接入
系统要支持：
- MCP 工具接入
- Provider abstraction
- Claude Code 执行环境适配
- AI Studio 接入
- OpenSpec / Superpowers 兼容策略

---

## 7. 架构与分层要求

目标分层：

```text
Frontend Dashboard / Claude Commands
  -> Workflow Layer
  -> Capability Layer
  -> Runtime Layer
  -> File Artifacts / MCP / Model Providers
```

### Interface Layer
- `src/frontend/`
- `.claude/commands/`
- 提供 dashboard 与命令入口

### Workflow Layer
- `workflows/*.md`
- `src/core/workflowEngine.ts`
- 负责阶段编排、状态推进与运行聚合

### Capability Layer
至少包含：
- 行业分析
- PRD
- 架构
- Task
- Review Committee
- Memory
- 多模态产物

### Runtime Layer
至少包含：
- 文件装载
- workflow 执行
- provider registry
- provider runtime / router
- mcp registry
- memory service
- review committee
- orchestrator runtime

### Data / File Layer
业务真源主要留在：
- `docs/`
- `prompts/`
- `workflows/`
- `config/`

---

## 8. 前后端与 CLI 需求

### 8.1 Backend API
后端至少需要支持：
- workflow 状态查询
- run 详情
- artifacts 列表
- review 输出
- metrics
- events
- providers 状态
- mcp 状态

后端是本地 API 层，不负责存储 secret。

### 8.2 Frontend Dashboard
前端至少需要展示：
- 当前 run
- workflow viewer
- task queue
- review panel
- artifact list
- provider 状态
- MCP 服务状态
- metrics
- 最近事件

并且前端要作为本地工作流观察与执行界面，而不只是静态页面。

### 8.3 CLI
CLI 至少需要支持：
- `run init`
- `run advance`
- `run until-blocked`
- `run status`
- `run events`
- `run artifacts`
- `run metrics`
- `review show`
- `memory show`
- `provider list`
- `provider check`

CLI 输出要与 runtime 状态一致。

---

## 9. Provider 体系完整需求

### 9.1 基本原则
- Provider 配置层与 Provider Runtime 层分离
- ProviderRegistry 负责配置读取与 readiness 判定
- Provider Runtime / Router 负责真实能力执行
- 不把 provider 停留在静态占位

### 9.2 当前重点目标
Google AI Studio 必须从占位 provider 升级为真实可调用 provider。

### 9.3 规范环境变量
- 规范变量名：`GOOGLE_AI_STUDIO_API_KEY`
- 兼容旧变量：`AI_STUDIO_API_KEY`
- 如果只命中旧变量：
  - 仍可运行
  - 但必须返回迁移告警 `deprecatedEnvInUse`

### 9.4 密钥约束
- 密钥只能通过环境变量提供
- 仓库内只能保存变量名，不能保存真实 secret
- 不得把 key 写入 JSON、Markdown、memory、git

### 9.5 Provider capability
至少需要规范这些能力：
- `text`
- `code`
- `review`
- `multimodal`
- `text-multimodal`
- `image-generation`
- `video-generation`
- `prototype-generation`

### 9.6 MVP provider runtime 目标
第一轮最小可运行目标：
- 优先接通 `ai-studio`
- 至少支持 `text-multimodal` 真执行
- 先不做复杂多厂商调度、熔断、重试、队列

---

## 10. 多模态阶段完整需求

### 10.1 目标
`multimodal` 阶段不能继续只是静态模板输出，必须走真实 provider 执行链路。

### 10.2 产物要求
至少同时输出：
1. `docs/multimodal/<runId>.md`
2. `docs/multimodal/<runId>.json`

### 10.3 Markdown 产物
面向人类阅读，至少说明：
- runId
- stageId
- provider
- capability
- model
- status
- 执行摘要
- 告警
- 错误
- 资源引用

### 10.4 JSON manifest 产物
面向系统读取，至少记录：
- providerName
- providerType
- capability
- model
- status
- operationId
- outputText
- assets
- warning
- error

### 10.5 失败语义
- provider 调用失败时不能伪装为 completed
- 必须写出失败 manifest
- 当前阶段或 run 应进入 `blocked`
- dashboard / CLI / event log 必须可见失败原因

---

## 11. Runtime 与事件系统需求

系统必须记录结构化 workflow 事件，至少包括：
- `run_initialized`
- `stage_started`
- `stage_completed`
- `stage_blocked`
- `artifact_written`
- `review_recorded`
- `provider_invoked`
- `provider_succeeded`
- `provider_failed`

要求：
- 事件可按 run 查询
- provider 事件进入统一 event log
- UI / CLI 可直接读取展示
- blocked 原因必须能从事件或 stage 状态中追踪

---

## 12. Provider 状态可见性要求

### Backend
`/api/providers` 至少返回：
- `name`
- `type`
- `configured`
- `runtimeReady`
- `deprecatedEnvInUse`
- `capabilities`

必要时还可返回：
- `activeEnvKey`

### CLI
`provider list` / `provider check` 至少展示：
- provider 名称
- type
- capabilities
- configured
- runtime-ready
- 旧变量迁移告警

### Frontend
Provider 面板至少展示：
- 名称
- 类型
- capabilities
- 已配置 / 未配置
- runtime-ready / not ready
- 是否命中旧变量告警

Workflow 视图还应能展示多模态阶段的 provider 执行状态与阻塞信息。

---

## 13. Memory 体系要求

Memory 需要显式分层：
- 短期运行记忆：run snapshot、event log、阶段状态
- 长期项目记忆：共识、约束、长期决策
- 知识库候选：后续可扩展，但首版以文件为主

要求：
- 不把聊天记录当作唯一 memory
- 文件化长期保存
- 可被 workflow / CLI / UI 读取

---

## 14. 非功能需求

必须满足：
- 文件驱动
- 本地可运行
- 可扩展
- 可审计
- 配置与密钥分离
- 支持阶段化返工
- 支持前端可视化展示
- 支持 provider / MCP 替换
- 不依赖远端平台作为唯一真源

---

## 15. 环境与运行隔离要求

AIOS 需要与其他并行运行的业务项目区分，不能抢占已有项目的开发端口或混用运行时。

当前要求：
- AIOS 前端与其他业务前端分离
- AIOS 后端与其他业务后端分离
- 避免因为端口冲突导致前后端串线
- 避免前端连到旧后端或别的项目后端

这属于运行环境隔离要求，不只是配置细节。

---

## 16. 测试与交付要求

至少补齐三层验证：

### 16.1 ProviderRegistry
要验证：
- `ai-studio` 在 provider 列表中存在
- 未设置 env 时 `configured=false`
- 设置 `GOOGLE_AI_STUDIO_API_KEY` 后 `configured=true`
- 仅设置 `AI_STUDIO_API_KEY` 时仍能运行，但标记迁移告警

### 16.2 Runtime / Workflow
要验证：
- workflow 定义阶段完整
- `multimodal` required outputs 包含 `.md` 与 `.json`
- provider 成功时写入 manifest
- provider 失败时 stage / run 进入 `blocked`
- event log 中出现 provider 相关事件

### 16.3 CLI
要验证：
- `provider list`
- `provider check`
- `run events`
- `memory show`
- provider 状态与 runtime 数据一致

### 16.4 基础质量门槛
要求具备：
- 单元测试
- lint / 类型检查
- build 可通过
- 最小部署结构（CI / Docker / infra）作为后续交付目标

---

## 17. MVP 边界与最终基线

### 17.1 MVP 必须包含
- 行业分析文档
- PRD
- 架构文档
- Task 文档
- Workflow 定义
- Prompts
- 前后端最小运行系统
- Review Committee 模板与聚合输出
- Memory 文件结构
- Provider / MCP 接入抽象层
- 多模态阶段的 provider-backed 最小可运行能力

### 17.2 最终验收基线
最终不能停留在 demo-only 状态，必须持续向“完整需求”靠拢。

最终评估标准：
- 不是只看页面是否能打开
- 不是只看是否有文档
- 而是看系统是否真正形成：
  - 文件真源
  - workflow runtime
  - provider runtime
  - review gate
  - 前后端观测面
  - CLI 操作面
  - 可阻塞、可追踪、可审计的真实闭环

---

## 18. 交付清单总览

完整交付面应覆盖：
- `docs/industry_analysis/*`
- `docs/prd/*`
- `docs/architecture/*`
- `docs/tasks/*`
- `docs/review/*`
- `docs/memory/*`
- `docs/multimodal/*`
- `prompts/*`
- `workflows/*`
- `config/*`
- `src/core/*`
- `src/backend/*`
- `src/frontend/*`
- `src/cli/*`
- `tests/unit/*`

---

## 19. 一句话验收标准

AIOS 最终必须成为一个**本地优先、文件驱动、工作流化、带评审门禁、带真实 provider 执行链路、可通过前端/后端/CLI 统一观测和操作的 AI 产品研发操作系统**。
