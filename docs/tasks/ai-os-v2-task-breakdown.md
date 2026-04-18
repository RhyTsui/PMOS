# PMAIOS v0.3 基线任务拆解

- 版本：v0.3
- 日期：2026-04-10
- 范围策略：骨架先行
- 说明：本文件用于替代旧的 v0.2/v2 演示型拆解，作为本轮代码升级基线。

---

## P0｜内核成立前必须完成

### Task 1
- 名称：重写 v0.3 核心定义与验收基线
- 交付物：`docs/implementation/PMAIOS_v0.3_技术选型.md`、`docs/tasks/PMAIOS_v0.3_升级任务清单.md`、`workflows/*.md`
- 验收：明确 OS 级目标、边界、非目标、阶段语义与本轮不做事项

### Task 2
- 名称：升级核心 schema
- 交付物：`src/shared/schemas.ts`、`src/core/projectPaths.ts`、`src/core/memoryService.ts`
- 验收：可表达优先级、依赖、gate、返工、执行摘要、扩展元数据

### Task 3
- 名称：升级 orchestrator runtime
- 交付物：`src/core/orchestratorRuntime.ts`、`src/core/workflowEngine.ts`、`src/core/reviewCommittee.ts`
- 验收：review gate、blocked、needs-rework、恢复推进都可追踪

### Task 4
- 名称：重构 stage execution / capability 插槽
- 交付物：`src/core/stageRunners.ts`、`src/core/providerRouter.ts`、`src/core/skillRegistry.ts`、`src/llm_router/*.ts`
- 验收：text / review / multimodal 至少三类能力路径统一

---

## P1｜主闭环必须完成

### Task 5
- 名称：重构 memory / context / execution trace
- 交付物：`src/core/memoryService.ts`、`src/core/chatService.ts`、`src/shared/schemas.ts`
- 验收：任一 run 都能看到输入、上下文、事件、产物、结果

### Task 6
- 名称：重构 backend API
- 交付物：`src/backend/server.ts`
- 验收：workflow / runs / artifacts / review / metrics / chats / context 分组清晰，返回结构统一

### Task 7
- 名称：重构前端控制台
- 交付物：`src/frontend/*`
- 验收：形成 Workflow Viewer + Run Console，强化 trace / context / review / artifact / metrics 展示

### Task 8
- 名称：升级 CLI
- 交付物：`src/cli/aios.ts`
- 验收：CLI 可独立完成初始化、推进、查看、诊断主流程

---

## P2｜本轮建议完成的收口项

### Task 9
- 名称：升级 provider / capability 抽象
- 交付物：`src/core/providerRegistry.ts`、`src/core/providerRouter.ts`、`src/llm_router/*.ts`、`config/providers.json`
- 验收：adapter 边界、capability 分层、fallback 规则清晰

### Task 10
- 名称：强化 review / metrics / telemetry
- 交付物：`src/core/reviewCommittee.ts`、`src/core/workflowEngine.ts`、`src/core/orchestratorRuntime.ts`
- 验收：可解释为什么通过、为什么阻塞、为什么返工

### Task 11
- 名称：补齐测试网与回归验证
- 交付物：`tests/unit/*`、`tests/integration/*`
- 验收：build / lint / test 全通过，核心主链路自动校验

---

## 本轮明确不做

- 全量迁移到 FastAPI
- 全量迁移到 Next.js
- 真接 Postgres / Redis / Vector DB
- 真接 LangGraph 并整体替换现有执行链路
- 把所有子项目一起升级

这些能力本轮只保留：**接入边界、适配点、后续迁移位**。
