# AI 埋点验收项目

面向买点 / 埋点验收场景的一期 AI 工作流项目，当前聚焦文档基线、规则生成、验收执行与协作提效。

## 运行基线

当前子项目已经补齐最小 PMAIOS 运行规格，恢复或切换工具时先按以下顺序读取：

1. `docs/memory/mcp-context/session-state.json`
2. `npm run cli -- mcp-context events 20`
3. `npm run cli -- mcp-context tasks --status in_progress`
4. `docs/operations/startup-whoami.md`
5. `AGENTS.md`

这条链路用于 Codex / Claude 共享恢复，不应只依赖会话记忆。

## 项目定位

本项目当前不是做一个大而全的数据平台，而是先围绕买点 / 埋点验收场景中最卡效率的环节，建立一条：

`AI 主提效 + 人工做确认 + 系统承接闭环`

的工作流。

一期重点解决的问题包括：

- 验收责任与归属链条不清
- 买点验收流程缺少统一主链路
- 文档和规范不统一、不结构化
- 验收标准和规则体系不稳定
- 数据查询与验收路径低效
- 自动校验与人工确认没有形成闭环
- 多角色协作成本高
- 当前文档和规则体系不支持后续 AI 研发方式

## 当前主入口

- `AGENTS.md`
  - 子项目 agent 入口合同、目录纪律、协作约束
- `docs/operations/startup-whoami.md`
  - 子项目启动身份、恢复顺序、当前优先级、权威文档入口
- `docs/product/AI埋点平台-实现真源包索引-v1.md`
  - AI 埋点平台面向产品、前端、后端、测试的统一实现入口
- `docs/product/AI埋点平台-05-06会议反馈转需求池-v1.md`
  - 当前项目的正式需求池入口，用于承接会议反馈、用户纠偏和后续产品判断
- `docs/product/AI埋点平台-需求池总表-v1.md`
  - 当前项目的常设需求池总表，用于持续维护 accepted / candidate / parked / rejected 条目
- `docs/overview/`
  - 项目背景、立项说明、一期 AI 方案
- `docs/svg/`
  - SVG-first 图板主入口，后续优先看图板
- `docs/analysis/`
  - 业务问题清单、优先级与边界切割
- `docs/requirements/`
  - 一期范围与需求池
- `docs/product/`
  - PRD 前言与产品结构草图
- `docs/memory/`
  - 项目记忆、共享状态与阶段结论
- `docs/context/`
  - 运行上下文与后续补充入口
- `docs/decisions/`
  - 子项目级决策沉淀入口
- `docs/tasks/`
  - 子项目级任务拆解入口
- `docs/versions/`
  - 子项目级版本沉淀入口
- `frontend/`
  - 一期工作台前端原型

## 输入规则

原始输入材料统一进入：

- `docs/sources/inbox/`

项目目录中只放整理后的正式材料，不直接把原始输入作为主文档使用。

已整理材料继续放在 `docs/sources/converted/` 与 `docs/sources/index/`，不要把它们当作新的原始输入入口。

## 一期方案原则

- AI 优先承担结构化和重复劳动
- 人工保留确认、判断和拍板职责
- 系统承接流程、状态、权限和结果沉淀
- 一期先做提效和底座，不先做大而全平台
- 一期不先吞复杂研发正确性问题

## 一句话结论

本项目一期要解决的，不是所有数据接入和研发正确性问题，而是先把买点验收场景中最卡效率的责任、流程、文档、规则、查询和协作问题收住，并把这些能力改造成 AI-friendly 的底座。
