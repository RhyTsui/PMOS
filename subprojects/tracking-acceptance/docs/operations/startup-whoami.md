# Tracking Acceptance Startup Whoami

- version: v0.1
- date: 2026-05-05
- status: active
- purpose: 子项目级恢复、协作与续跑真源

## 这份文件是什么

这份文件是 `tracking-acceptance` 子项目的启动身份页。

当 Codex / Claude 重启、切换、失忆或接手时，先用它确认：

- 当前子项目在做什么
- 恢复顺序是什么
- 哪些文档是本子项目的权威入口
- 当前最高优先级是什么
- 哪些事情这轮不用重做

更细的 agent 入口约束见：

- `AGENTS.md`

## 子项目身份

`tracking-acceptance` 当前定位为：

- 面向买点 / 埋点验收场景的一期 AI 工作流子项目
- 当前重点是把输入、文档、规则、验收、确认、沉淀串成最小闭环
- 当前已有较多业务材料和前端原型，但运行治理骨架仍需按 PMAIOS 补齐并维护

默认工作流：

- `pmaios-main`

默认工作语言：

- 中文

## 启动恢复顺序

恢复或续跑前，按下面顺序读取：

1. `docs/memory/mcp-context/session-state.json`
2. `npm run cli -- mcp-context events 20`
3. `npm run cli -- mcp-context tasks --status in_progress`
4. 本文件
5. `AGENTS.md`

然后再按任务需要继续读取对应真源文档。

## 当前权威入口

优先从这些路径判断当前子项目真实状态：

- `README.md`
- `AGENTS.md`
- `docs/operations/startup-whoami.md`
- `docs/memory/project-memory.md`
- `docs/memory/mcp-context/session-state.json`
- `docs/overview/`
- `docs/analysis/`
- `docs/requirements/`
- `docs/product/`
- `docs/product/AI埋点平台-需求池总表-v1.md`
- `docs/review/`
- `frontend/`

原始输入统一入口：

- `docs/sources/inbox/`

整理后材料入口：

- `docs/sources/converted/`
- `docs/sources/index/`

## 当前优先级

当前最高优先级线是：

`先按实现真源包收住 AI 埋点平台业务文档主链，再继续推进前端、后端和测试承接。`

这意味着本阶段默认判断为：

- 优先维护 `product -> design -> engineering -> review` 主链
- 历史分析、研究、设计稿默认只做输入或参考
- 不把“文档很多”误判成“实现真源已经收口”

## 本轮最小合格范围

本轮最小运行规格至少包括：

- 子项目级 `startup-whoami`
- `docs/memory/mcp-context/` 共享恢复目录
- 可读的 `session-state.json`
- `docs/sources/inbox/` 原始输入入口
- `docs/context/`、`docs/versions/`、`docs/decisions/`、`docs/tasks/` 占位目录
- `README.md` 与 `docs/memory/project-memory.md` 和真实结构一致

## 当前非目标

这轮默认不做：

- 全量历史文档重分类
- 全量迁移到新的目录层级
- 补齐 `tests`、`prompts`、`skills`、`infra` 的完整治理规格
- 变更对外 API 或业务实现

## 协作规则

共享状态文件：

- `docs/memory/mcp-context/session-state.json`

涉及共享状态的 `mcp-context` 写命令必须串行执行，不要并行写入。

需要写共享状态时，按仓库规则使用：

- `task-start`
- `checkpoint`
- `task-complete`

## 恢复后下一步判断

恢复后先判断当前任务属于哪一类：

- 运行治理补齐
- 业务分析收敛
- 产品真源更新
- 前端原型实现

如果是新输入驱动的工作，先检查 `docs/sources/inbox/` 是否已有原始材料，再决定是否进入分析或产品层。

## 更新规则

如果子项目定位、恢复顺序、权威入口或当前优先级发生实质变化，应在同一工作周期内更新本文件。
