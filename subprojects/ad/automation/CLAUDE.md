# 广告自动化模块 — CLAUDE 配置

> **⚠️ 本目录为历史遗留资料（AIFS / Ads Flow Insight 原型阶段）。**
> 当前自动化能力已整合进主项目 Enterprise AI Chat OS 架构，不再独立于此目录开发。

## 当前自动化能力位置

| 能力 | 当前位置 |
|------|---------|
| 自动化任务契约 | `frontend/src/src/contracts/automation/` |
| 自动化调度器 | `frontend/src/src/lib/automation-scheduler.ts` |
| 自动化执行存储 | `frontend/src/src/lib/automation-execution-store.ts` |
| 自动化模板存储 | `frontend/src/src/lib/automation-template-store.ts` |
| 自动化草稿存储 | `frontend/src/src/lib/automation-draft-store.ts` |
| 自动联调工作台 | `frontend/src/src/components/agents/AutoDebugWorkbench.tsx` |
| 联调 API | `frontend/src/src/app/api/xiaoqiao/automation-executions/route.ts` |
| 联调 API | `frontend/src/src/app/api/xiaoqiao/automations/route.ts` |

## 本目录内容（仅供历史参考）

- `AIFS 广告数据链路可观测 AI 系统（PRD v2.0）.docx` — 早期可观测系统 PRD
- `广告行为分析系统 v1 产品 PRD.docx` — 早期行为分析 PRD
- `广告归因流程图.png` / `.extracted.txt` — 归因流程设计
- `需求文档.md` — 早期 Sankey 图需求（已废弃）

## 项目真源入口

请参考项目根目录：
- `CLAUDE.md` — 项目配置
- `ARCHITECTURE.md` — 架构概览
- `AGENTS.md` — 仓库级执行规则
- `docs/architecture/automation/` — 当前自动化协议规范
