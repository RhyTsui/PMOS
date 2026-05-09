# Main Workflow

## PMOS 主工作流目标

1. 面向 `PMOS v1.0` 产品化交付，而不是停留在 workflow demo
2. 保持文件真源驱动，以 `docs/`、`workflows/`、`prompts/`、`config/` 作为定义层
3. 保持 `Execution + Requirement + Version + Observability + Governance` 五条闭环同时成立
4. 外部基础设施只保留接入边界，不把当前版本变成大规模基础设施迁移工程

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

- 核心定义基线 -> `docs/implementation/*.md`、`docs/tasks/*.md`
- Schema 与契约升级 -> `src/shared/*.ts`、`src/core/*.ts`
- Orchestrator 内核调度 -> `src/core/*.ts`
- Stage Execution / Capability 插槽 -> `src/core/*.ts`、`src/llm_router/*.ts`
- Memory / Context / Trace -> `src/core/*.ts`、`docs/memory/*`
- API / CLI / Frontend 操作面 -> `src/backend/*`、`src/cli/*`、`src/frontend/*`
- Review / Metrics / Telemetry -> `src/core/*.ts`、`docs/review/*.md`
- 测试回归与升级验收 -> `tests/unit/*`、`tests/integration/*`

## Structured schema mapping

1. 工作流真源由 `workflows/*.md` 与任务真源共同定义
2. `src/core/workflowEngine.ts` 负责把真源转换为统一 typed schema
3. API、CLI、前端必须消费同一套运行模型，不能各自维护重复流程语义
4. `subprojects/` 作为 PMOS 能力消费者，不参与顶层平台基线定义
