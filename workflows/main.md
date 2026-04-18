# Main Workflow

## PMAIOS v0.6 workflow 目标

- 面向 PMAIOS 闭环发布系统升级，而不是停留在 workflow demo
- 保持文件真源驱动：`docs/`、`workflows/`、`prompts/`、`config/` 为定义层
- 本轮聚焦 `Execution + Requirement + Version + Observability + Governance` 五个闭环
- 外部基础设施本轮只保留接入边界，不做全量迁移

## Stages

1. 核心定义基线
2. Schema 与契约升级
3. Orchestrator 内核调度
4. Stage Execution / Capability 插槽
5. Memory / Context / Trace
6. API / CLI / Frontend 操作面
7. Review / Metrics / Telemetry
8. 测试回归与升级验收

## Required outputs per stage

- 核心定义基线 → `docs/implementation/*.md`、`docs/tasks/*.md`
- Schema 与契约升级 → `src/shared/*.ts`、`src/core/*.ts`
- Orchestrator 内核调度 → `src/core/*.ts`
- Stage Execution / Capability 插槽 → `src/core/*.ts`、`src/llm_router/*.ts`
- Memory / Context / Trace → `src/core/*.ts`、`docs/memory/*`
- API / CLI / Frontend 操作面 → `src/backend/*`、`src/cli/*`、`src/frontend/*`
- Review / Metrics / Telemetry → `src/core/*.ts`、`docs/review/*.md`
- 测试回归与升级验收 → `tests/unit/*`、`tests/integration/*`

## Structured schema mapping

- 工作流真源由 `workflows/*.md` 与 `docs/tasks/PMAIOS_v0.6_升级任务清单.md` 共同定义
- `src/core/workflowEngine.ts` 负责把真源转换为统一 typed schema
- API、CLI、前端必须消费同一套运行模型，不在各自侧重复定义流程语义
- `subprojects/` 仅作为 PMAIOS 能力消费者，不参与顶层平台基线定义
