# Project Memory

- 2026-04-21：重新以 `AI 埋点验收` 定义 `tracking-acceptance`。
- 当前已落下一期工作台前端骨架，位置：`frontend/`。
- 一期优先目标：先跑通输入 -> 文档 -> 规则 -> 校验 -> 确认 -> 沉淀的最小闭环。
- 2026-04-21：新增 `docs/svg/` 图板入口，将现有 Markdown 按主题汇总为多张 SVG，后续沟通优先更新 SVG。
- 2026-05-05：补齐子项目最小 PMAIOS 运行规格，新增 `docs/operations/startup-whoami.md`、`docs/memory/mcp-context/session-state.json`、`docs/sources/inbox/` 及 `docs/context/`、`docs/versions/`、`docs/decisions/`、`docs/tasks/` 占位目录。
- 2026-05-05：将恢复链路明确为 `session-state.json -> mcp-context events -> mcp-context tasks -> startup-whoami.md -> AGENTS.md`，后续 Codex / Claude 续跑按此顺序恢复。
- 2026-05-05：新增子项目根级 `AGENTS.md`，将 agent 入口合同纳入恢复链路，并与 `startup-whoami.md` 分工对齐。
- 2026-05-05：按全平台重收口方向补齐 AI 埋点平台实现真源包索引，并重写治理、覆盖检查、工程承接与测试文档，使文档主链统一为 `product -> design -> engineering -> review`。
- 2026-05-05：继续把实现真源补到可直接承接的层级，新增 4 份续跑产品真源：`标准底座平台化`、`历史导入与版本继承`、`查询方案与成熟看板`、`AI助手深挂载与结果回写`，并联动补充设计、工程、评审、治理文档。
- 2026-05-07：补齐本项目的常设需求池机制，新增 `AI埋点平台-需求池总表-v1.md`，并将 05-06 会议反馈正式转入项目级需求池；当前规则已明确：新增反馈必须先入需求池，再决定是否升级到主真源、迭代需求或任务单。
