# PMAIOS v0.3 升级任务清单

- 范围策略：骨架先行
- 目标：一次确认后，一次性完成 PMAIOS 从 v0.2 骨架到 v0.3 核心内核版本的升级
- 原则：文档、workflow、prompts、config 仍为真源；不把 MCP/业务子项目混入 PMAIOS 顶层定义；本轮只保留外部基础设施接入位，不做全量迁移

---

## P0｜必须优先完成

### T1. 重写 v0.3 核心定义与验收基线
**目标**
- 统一 PMAIOS v0.3 的 OS 级目标、边界、非目标、验收标准
- 让后续代码改造都能映射回同一份基线

**关键文件**
- `docs/implementation/PMAIOS_v0.3_技术选型.md`
- `docs/tasks/ai-os-v2-task-breakdown.md`
- `workflows/main.md`
- `workflows/execution.md`

**验收**
- 文档层明确本轮真实落地能力与仅保留接入位的能力
- workflow 语义与升级目标一致

### T2. 升级核心 schema，补齐 v0.3 内核契约
**目标**
- 让 workflow / task / review / provider / execution / memory 的数据模型支撑 v0.3

**关键文件**
- `src/shared/schemas.ts`
- `src/core/projectPaths.ts`
- `src/core/memoryService.ts`

**验收**
- schema 可表达优先级、依赖、gate、返工、执行摘要、扩展元数据
- API、CLI、前端消费同一套 schema

### T3. 升级 orchestrator runtime
**目标**
- 把 `orchestratorRuntime` 从阶段推进器升级为带 gate / 返工 / 依赖 / 执行上下文的内核调度器

**关键文件**
- `src/core/orchestratorRuntime.ts`
- `src/core/workflowEngine.ts`
- `src/core/stageRunners.ts`
- `src/core/reviewCommittee.ts`

**验收**
- review gate、blocked、needs-rework、下一阶段激活都可追踪
- 调度逻辑结构清晰，不再只是写产物

### T4. 重构 stage execution 体系
**目标**
- 建立 v0.3 的 capability / tool / skill 插槽

**关键文件**
- `src/core/stageRunners.ts`
- `src/core/providerRouter.ts`
- `src/llm_router/index.ts`
- `src/core/modelProvider.ts`
- `src/core/skillRegistry.ts`

**验收**
- text / review / multimodal 至少三类能力路径统一
- 为未来 LangGraph / Tool Registry 预留 adapter 边界

---

## P1｜本轮主闭环必须完成

### T5. 重构 memory / context / execution trace
**目标**
- 把 memory 升级成 OS 级统一执行上下文层

**关键文件**
- `src/core/memoryService.ts`
- `src/core/chatService.ts`
- `src/core/projectPaths.ts`
- `src/shared/schemas.ts`

**验收**
- 任一 run 都能看到输入、上下文、事件、产物、结果
- platform 与 subproject 作用域边界清楚

### T6. 重构 backend API
**目标**
- 形成稳定的 v0.3 观测与操作面

**关键文件**
- `src/backend/server.ts`
- `src/shared/schemas.ts`

**验收**
- workflow / portfolio / runs / artifacts / review / metrics / chats / context 接口分组清晰
- 返回结构和错误语义统一

### T7. 重构前端控制台
**目标**
- 从聊天壳子升级为 Workflow Viewer + Run Console

**关键文件**
- `src/frontend/App.tsx`
- `src/frontend/*`

**验收**
- 强化 run trace、context、review、artifact、metrics 展示
- platform / subproject 切换体验清晰

### T8. 升级 CLI
**目标**
- 让 CLI 成为 v0.3 的第一操作入口

**关键文件**
- `src/cli/aios.ts`
- `src/core/orchestratorRuntime.ts`
- `src/core/workflowEngine.ts`

**验收**
- CLI 可独立完成初始化、推进、查看、诊断主流程
- 输出适合直接用于开发调试和验收检查

---

## P2｜建议本轮一起完成的收口项

### T9. 升级 provider / capability 抽象
**目标**
- 明确未来外部组件接入位，但不做全量外部基础设施迁移

**关键文件**
- `src/core/providerRegistry.ts`
- `src/core/providerRouter.ts`
- `src/llm_router/index.ts`
- `config/providers.json`

**验收**
- capability 分层、adapter 边界、fallback 规则清晰
- 后续可接 LangGraph / FastAPI / 外部 tool execution

### T10. 强化 review / metrics / telemetry
**目标**
- 让 v0.3 的可阻塞、可追踪、可审计真正可见

**关键文件**
- `src/core/reviewCommittee.ts`
- `src/core/workflowEngine.ts`
- `src/core/orchestratorRuntime.ts`
- `src/shared/schemas.ts`

**验收**
- 能看出为什么通过、为什么阻塞、为什么返工
- metrics 能辅助判断升级是否成功

### T11. 补齐 v0.3 测试网
**目标**
- 保护一次性升级的回归风险

**关键文件**
- `tests/unit/workflowEngine.test.ts`
- `tests/unit/*`
- 如需要：`tests/integration/*`

**验收**
- build / lint / test 全通过
- 核心主链路具备自动校验

---

## 开发计划

### Phase A｜定义先行
1. T1 核心定义与 v0.3 基线
2. T2 schema 升级

### Phase B｜内核升级
3. T3 orchestrator runtime 升级
4. T4 stage execution / capability / tool 插槽升级
5. T5 memory / context / trace 升级

### Phase C｜操作面与观测面升级
6. T6 backend API 升级
7. T7 frontend 控制台升级
8. T8 CLI 升级

### Phase D｜收口与验证
9. T9 provider / capability 抽象升级
10. T10 review / metrics / telemetry 升级
11. T11 测试补齐与回归验证

---

## 本轮明确不做
- 全量迁移到 FastAPI
- 全量迁移到 Next.js
- 真接 Postgres / Redis / Vector DB
- 真接 LangGraph 并整体替换现有执行链路
- 把所有子项目一起升级

这些内容本轮只保留：**接入边界、适配点、后续迁移位**。
