# 当前可先做待办清单

- version: v0.1
- date: 2026-05-06
- status: active
- purpose: 基于埋点验收项目实施情况与 PMAIOS v0.7 当前状态，给出“现在就能做”的优先待办清单

## 1. 结论先行

当前最值得先做的待办，不是继续平铺开新主题，而是沿两条主线收口：

1. 把 `tracking-acceptance` 这次实施中已经暴露出的模式，继续提炼成可复用平台对象和 gate。
2. 把 PMAIOS `v0.7 minimum loop` 从“已落地”推进到“更自治、更可治理、更可操作”。

## 2. 两条主线的分母

### A. 埋点项目提炼线

- 已完成提炼：`2`
  - 问题复盘与平台化回写
  - 外部设计 skill 二轮评估与吸收提案
- 仍待继续平台化：`6`

待继续平台化的 6 项：

1. 标准底座平台化
2. 历史导入与版本继承
3. 查询方案与成熟看板
4. AI 上下文包与回写任务对象
5. 确认对象 / 确认状态 / 放行 gate
6. `DESIGN.md` / design skill / 组件承接链

### B. PMAIOS v0.7 / 遗留线

- v0.7 已落地 track：`5/5`
- 仍待深产品化：`5/5`
- 历史 in-progress 遗留任务：很多，但其中大部分是旧阶段残留，不适合原样继续

当前 v0.7 真正仍待深做的 5 项：

1. SchedulerRun autonomy
2. Gate Runtime history-backed traceability
3. Hermes compare/promote 扩展
4. UI schema 深化
5. proof-of-work acceptance package 深化

## 3. 现在就能做的优先清单

### P0.1 先做：把埋点项目的确认链正式对象化

为什么先做：

- 这次埋点项目里最容易反复漂的是“已生成 / 已落盘 / 已确认”混说。
- 现在已经补了规则，但还没变成平台对象和 gate。
- 这项同时服务埋点项目和 PMAIOS v0.7 的设计/回写治理。

建议动作：

1. 补 `design-confirmation-record` 或更通用的 `confirmation-record` schema
2. 定义确认层级、状态、责任人、放行目标
3. 接到 `prd-and-design-two-step-governance` 和后续 UI schema / handoff 链

状态判断：

- 无外部阻塞
- 可以立即做

### P0.2 先做：把 `DESIGN.md` 变成 PMAIOS 平台正式对象

为什么先做：

- 这次外部 skill 二轮提案已经说明，`DESIGN.md` 是最容易低成本吸收的能力。
- 它能补“设计语言真源”这一层，但目前 PMAIOS 还没有正式对象定义。
- 这项能直接服务埋点项目后续设计、也能服务 v0.7 的 UI schema 与交付链。

建议动作：

1. 在平台文档中定义 `DESIGN.md` 的角色和字段结构
2. 明确它不是最终交付物，只是设计语言真源
3. 补一个 `design-language-md` skill 骨架

状态判断：

- 无外部阻塞
- 可以立即做

### P0.3 先做：把埋点项目的“标准底座 / 继承 / 查询 / AI回写”压成平台模板顺序

为什么先做：

- 这 4 项是埋点项目里已经识别出的最大剩余平台化缺口。
- 但不建议 4 条同时摊开，应该先压出统一顺序。

建议顺序：

1. 标准底座平台化
2. 历史导入与版本继承
3. 查询方案与成熟看板
4. AI 回写对象

建议动作：

1. 为这 4 项各补一份“平台模板目标说明”
2. 明确哪些是 schema，哪些是 product truth，哪些是 gate
3. 不急着上实现，先把平台承接关系收口

状态判断：

- 无外部阻塞
- 可以立即做

### P0.4 先做：v0.7 的 Gate Runtime traceability

为什么先做：

- 这是 v0.7 路线中优先级第二的项。
- 又和这次埋点项目里暴露出的“确认 / 回写 / 状态不可追”高度相关。
- 它比 Scheduler 全自治更容易直接沉淀制度收益。

建议动作：

1. 把 gate action 明确绑定 Task SSOT / history
2. 明确 `blocked / ready / rework / confirmed` 的写回对象
3. 把设计确认和 AI 回写确认视为 gate 事件的一类

状态判断：

- 无外部阻塞
- 可以立即做

## 4. 可以做，但优先级次一级

### P1.1 `design-prompt-refiner`

原因：

- 已有二轮提案
- 但在确认链和 `DESIGN.md` 正式对象没立住前，先做这个容易变成新 prompt 包

### P1.2 `design-to-component-handoff`

原因：

- 非常重要
- 但最好放在 `DESIGN.md` 和确认链之后做，否则承接对象还是会漂

### P1.3 v0.7 的 UI schema 深化

原因：

- 路线正确
- 但如果不先把确认对象和设计语言真源补稳，schema 会继续只管结构不管确认

### P1.4 proof-of-work acceptance package 深化

原因：

- 值得做
- 但它更适合在 gate traceability 和确认链补稳后接着做

## 5. 不建议现在优先做的项

### 不建议优先做的旧遗留

当前 `mcp-context tasks --status in_progress` 里有大量旧任务还挂着，例如：

- WeKnora / Dataki 一批历史任务
- 老版本 v0.5 / v0.6 时代的图、包、分析任务
- tracking-acceptance 的早期页面落页任务

这些任务很多已经被后续更高层真源覆盖，不能因为它们还显示 `in_progress` 就默认继续做。

默认处理建议：

1. 先不要按旧 label 直接续做
2. 先做一次“历史 in-progress 清洗分类”
3. 分成：
   - 真仍活跃
   - 已被覆盖
   - 仅需补 closure
   - 应降级 archived/reference-only

## 6. 我建议的实际执行顺序

如果现在只挑 4 件最该做的，顺序建议是：

1. 确认链对象化与 gate 化
2. `DESIGN.md` 平台对象定义 + `design-language-md` skill 骨架
3. 埋点项目四条剩余平台化项的模板顺序收口
4. v0.7 Gate Runtime traceability 深化

当前已完成进展：

1. 第 1 项已落地到 `docs/operations/confirmation-chain-object-and-gate.md`
2. 第 2 项已落地到 `docs/operations/design-language-object-and-skill.md` 与 `skills/design-language-md/`
3. 第 3 项已落地模板顺序定义到 `docs/operations/tracking-acceptance-platform-template-sequence-2026-05-06.md`
4. 第 4 项已落地深化定义到 `docs/operations/gate-runtime-traceability-deepening-2026-05-06.md`

## 7. 用户诉求回查

- 用户诉求：结合埋点项目实施情况做提炼
  - 当前状态：`partial`
  - 原因：复盘和二轮吸收提案已做，但还没转成完整平台对象与模板

- 用户诉求：处理原来的 PMOS / PMAIOS v0.7 以及遗留事项
  - 当前状态：`partial`
  - 原因：v0.7 优先顺序清楚，但历史 in-progress 仍未做一次系统清洗
