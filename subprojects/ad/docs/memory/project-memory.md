# Project Memory

- projectId: ad
- projectName: 小乔智投 (XiaoQiao Ad OS)
- description: 广告支持与投放协同自动化工作台，采用 Enterprise AI Chat OS 分层架构
- stack: Next.js 16 + React 19 + TypeScript 5 + Ant Design 6 + Ant Design X + Tailwind CSS 4 + tsx/tsup
- currentScope: Enterprise AI Chat OS 协议收敛（P0/P1 实施中）— Fat MCP/Fat Skill + Thin Chat Runtime
- relatedProjects: PMAIOS v0.7 rollout, aiocoding
- architecture: Request Understanding → Planner → Capability Discovery → Execution → Result Assembly → Disclosure → Component Binding → Renderer
- keyDocs:
  - 总纲: docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md
  - 二级索引: docs/architecture/00_SPEC_INDEX.md
  - 主规格: MASTER_SPEC.md
  - 实施计划: NEXT_IMPLEMENTATION_PLAN.md
  - 仓库规则: AGENTS.md
  - 前端契约: frontend/src/src/contracts/
- legacy: Python + FastAPI 后端 (src/ad/) 为历史遗留原型，非主链路
