# Tracking Acceptance Agent Context

本文件是 `tracking-acceptance` 子项目的 agent 入口合同。

它补充根仓 `AGENTS.md` 的全局规则，负责说明本子项目的：

- 项目定位
- 权威目录
- 启动恢复顺序
- 原始输入入口
- 协作与共享状态写规则
- 当前优先级和非目标

根仓规则继续生效：

- `../../AGENTS.md`

如果根仓规则与本文件冲突，以“全局规则 + 子项目补充”方式解释；
本文件只定义本子项目特有约束，不覆盖根仓的共享协作基线。

## 项目定位

`tracking-acceptance` 是面向买点 / 埋点验收场景的一期 AI 工作流子项目。

当前目标不是扩成大而全平台，而是先把以下主链路收住：

`输入 -> 文档 -> 规则 -> 校验 -> 确认 -> 沉淀`

当前已有：

- 较多业务分析、需求、设计、评审文档
- `frontend/` 前端原型

当前仍需持续维护的底座：

- 子项目级恢复与协作真源
- 原始输入与整理材料的目录纪律
- Codex / Claude 共享 handoff 链路

## 启动恢复顺序

进入本子项目开始实质工作前，按下面顺序恢复：

1. `docs/memory/mcp-context/session-state.json`
2. `npm run cli -- mcp-context events 20`
3. `npm run cli -- mcp-context tasks --status in_progress`
4. `docs/operations/startup-whoami.md`
5. `AGENTS.md`

不要只靠隐藏会话记忆恢复上下文。

## 权威入口

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
- `docs/review/`
- `frontend/`

## 目录纪律

原始输入统一入口：

- `docs/sources/inbox/`

整理后材料入口：

- `docs/sources/converted/`
- `docs/sources/index/`

运行与治理补充入口：

- `docs/context/`
- `docs/decisions/`
- `docs/tasks/`
- `docs/versions/`

不要把新的原始外部材料直接塞进分析、产品、设计或评审目录。

## 协作规则

共享状态文件：

- `docs/memory/mcp-context/session-state.json`

涉及共享状态的 `mcp-context` 写命令必须串行执行，不要并行写入，尤其是：

- `task-start`
- `task-complete`
- `task-note`
- `checkpoint`
- `mode-set`
- `repair`

工作期间按仓库共享约定记录：

- 开始任务：`task-start`
- 关键阶段：`checkpoint`
- 完成任务：`task-complete`

Codex / Claude 切换时，不要只依赖聊天上下文，必须以 `mcp-context` 和本文件链路恢复。

## 当前优先级

当前最高优先级线：

`先按实现真源包收住 AI 埋点平台业务文档主链，再继续推进前端、后端和测试承接。`

因此默认执行判断是：

- 优先维护 `product -> design -> engineering -> review` 主链
- 再处理新增业务输入和实现承接
- 不把“文档很多”误判成“实现真源已经收口”

## 当前非目标

这轮默认不做：

- 全量历史文档重分类
- 全量迁移到新目录结构
- 扩大到完整 tests / prompts / skills / infra 治理
- 变更业务 API 或实现逻辑

## 与 Startup Whoami 的分工

- `docs/operations/startup-whoami.md`
  - 更偏运行恢复卡，强调身份、恢复顺序、当前优先级
- `AGENTS.md`
  - 更偏 agent 入口合同，强调目录纪律、协作约束、项目级工作口径

两者都应保留，且内容需要保持一致，不允许长期漂移。
