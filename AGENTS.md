# PMAIOS Shared Tool Context

Codex must treat this repository as the current default executor workspace. Historical multi-executor artifacts may still exist in archive, migration, and compatibility records.

## Shared State Write Rule

`docs/memory/mcp-context/session-state.json` is a single shared state file.

Do not run `mcp-context` write commands in parallel when they mutate shared state, including:

- `task-start`
- `task-complete`
- `task-note`
- `checkpoint`
- `mode-set`
- `repair`

Run those writes sequentially, or a later write may overwrite an earlier one and make task / checkpoint state drift.

## Default Language Rule

Unless the user explicitly asks otherwise, the default working language for this repository is Chinese.

Apply this rule to:

- dialogue with the user
- normal explanations and summaries
- SVG copy and human-facing documentation

English is still allowed for:

- proper nouns
- file paths and file names
- code identifiers
- unavoidable technical terms

Do not start in English by default after startup, tool switch, or context recovery.

## Idea Refinement Rule

Do not translate a raw user idea directly into implementation by default.

Before turning an idea into execution, first strengthen it through:

- domain-driven refinement
- industry best-practice scan
- relevance and impact evaluation
- boundary and dependency clarification

Then sync back:

- the refined problem statement
- the candidate implementation direction
- the priority and tradeoff judgment

If the user does not correct that direction, continue on that basis.
If the user corrects it, update the execution path promptly.

## Dual-Requirement Rule

Treat important work as having at least two linked layers:

- user requirement
- product requirement

Do not stop at the product-requirement layer.

When a product-side mechanism, document, or capability is added, also:

- map it back to the original user requirement
- check whether the user-demand scenario is actually solved
- classify the result as `solved`, `partial`, or `unsolved`

Do not assume “the product plan exists” means “the user problem is closed”.

## Denominator Progress Rule

Default progress sync should not only report what was finished.

For long-running work, prefer reporting against a longer target denominator:

- total tracked items
- solved items
- promoted-to-plan items
- parked/rejected items with reason
- still-missing-placement items

If a convergence or abstraction happened, explicitly back-check whether it solved the original requirement instead of only reporting the new abstraction.

## Progress-Report Rule

A progress report is not a pause point by default.

Unless there is a real blocker, risk fork, or permission gate that prevents safe continuation:

- keep working while syncing
- do not turn a stage update into a work stop
- do not wait for the user after every summary if the next safe step is already known

## No-False-Finish Rule

Do not slip into wrap-up mode just because a message sounds like a milestone summary.

Unless the user explicitly pauses, stops, or redirects:

- do not treat an interim summary as end-of-work
- do not write like the task is complete if there are still obvious next steps
- after a summary, continue directly into the next known safe step

## `{do}` Fast-Route Rule

When the user explicitly enters `{do}` mode, treat it as a fast-execution route instead of the default conservative route.

Under `{do}`:

- continue execution by default
- keep sync short
- park side topics unless critical
- stop only on real blockers, high-risk forks, hard permission gates, or clear drift
- ad hoc introductions or brief stakeholder questions should be handled as short side responses, not as automatic task pauses

Root causes to guard against under `{do}`:

- treating a direct question as a full-turn completion event
- slipping into `final`-style wrap-up language after a cheap side response
- silently dropping mode continuity when the main target has not changed

Therefore, under `{do}`:

- a cheap side question does not replace the current main task
- after answering it briefly, resume the active main line in the same turn
- do not use completion-style phrasing unless the requested scope is actually complete

When starting a concrete `{do}` task, make these fields explicit as early as possible:

- accepted target
- current highest-priority line
- parked side lines
- known blockers
- next safe step

Reference:

- `docs/operations/do-mode-execution-protocol.md`
- `docs/operations/do-mode-task-start-contract.md`

Before starting or resuming substantive work:

1. Read `docs/memory/mcp-context/session-state.json` when it exists.
2. Read recent events with `npm run cli -- mcp-context events 20`.
3. Read active tasks with `npm run cli -- mcp-context tasks --status in_progress`.
4. Read `docs/operations/startup-whoami.md` to recover current operating identity, platform rules, and active product workflow context.

During work:

- Record task starts with `npm run cli -- mcp-context task-start "<label>" --tool codex`.
- Record important decisions with `npm run cli -- mcp-context checkpoint "<label>" --tool codex`.
- Mark completed shared tasks with `npm run cli -- mcp-context task-complete <taskId> --tool codex`.

If switching between Codex sessions or reconciling historical executor context, use the shared `mcp-context` commands as the handoff source of truth. Do not rely only on hidden conversation context.

## PMOS UI Guardrail Supplement

When the task involves PMOS frontend, page layout, UISchema, component selection, AI copilot workbench, requirement / PRD / task / approval surfaces, or Ant Design X implementation, apply these rules in addition to the repository-wide defaults.

### Product Identity

PMOS UI is not:

- a landing page
- a marketing site
- a poster wall
- a feature grid
- a generic AI SaaS demo
- a Claude-style flat card wall
- an Ant Design Pro dashboard pasted in as-is

The default target shape is:

- workflow-driven command center
- context + evidence + decision + action surface
- AI copilot interaction embedded into real operator work
- approval and audit aware delivery page

### UI Authoring Rule

AI may not freely design PMOS pages from taste alone.

The required order is:

1. read `docs/operations/frontend-style-default.md`
2. read `docs/operations/uiux-stack-baseline.md`
3. read `docs/operations/product-workflow-total-design.md`
4. read `docs/operations/ui-pmos-copilot-contract.md`
5. read `docs/templates/ui_schema_spec_template.md`
6. read `src/ui-schema/registry.ts`
7. determine the target `screenType`
8. create or update UISchema first
9. implement React only after the UISchema contract is explicit

Current-stage rule:

- all new governed business pages must define UISchema first
- React implementation must declare its `screenType`, component bindings, evidence/source references, and decision/approval contract
- the repository may converge to a schema renderer later, but that is not assumed complete today

### Forbidden UI Patterns

Do not create or preserve:

- hero section
- poster card
- feature grid
- landing section
- marketing CTA
- pricing card
- showcase section
- glassmorphism
- large decorative gradients
- fake dashboard
- standalone demo app

### Required Layout Pattern

Desktop pages should default to a governed workbench structure:

- `contextRail`
- `main`
- `evidencePanel`
- `approvalPanel` or equivalent decision surface when risky actions exist

Mobile pages should default to a stacked decision flow:

- context summary
- current AI conclusion
- key evidence / source reference
- recommended action
- approve / reject / continue

### PMOS-Semantic Rule

Any governed recommendation or decision block must carry:

- `summary`
- `recommendedActions`
- `evidenceRefs` or `sourceRefs`
- `riskLevel` when the action can affect project scope or execution state

Any risky action must carry:

- `label`
- `riskLevel`
- `approvalPolicy` or `requiresApproval`
- `auditRequired`

### Validation Rule

Before closing a governed UI task, run:

- `npm run ui:schema:check`
- `npm run ui:lint`
- `npm run validate` when available

## 小乔智投工程实施协作规范补充：反局部收敛与未上线能力闭环

本仓库 `subprojects/ad`（小乔智投）当前处于**未上线、待能力闭环**阶段。Codex 在执行涉及该子项目的任务时，必须遵守以下反局部收敛约束。

### 核心约束

1. **禁止自主忽略用户诉求**：用户显式列出的每一项问题都必须进入任务清单。禁止标注"本轮先不处理"但没有用户确认，禁止只处理模型认为最关键的一项。
2. **禁止只完成局部**：系统性治理必须覆盖设计文档 → 运行链路 → 数据契约 → 代码实现 → trace → UI 展示 → 单测 → 浏览器 E2E → 回滚策略。
3. **禁止修了但没生效**：每个改动都必须证明进入真实链路——被 import、被运行时调用、未被 feature flag 挡住、有 trace 证明生效、有 E2E 证明用户可见结果变化。
4. **禁止靠隐藏警告伪装修复**：不允许隐藏 warning、删除 UI 展示但不修链路、跳过 preflight/resolver、强行 fallback、把 missing_input 改成 success。

### 工作方式

- 每轮开始前必须输出完整任务清单（用户列多少项就列多少项）
- 复杂问题必须先输出链路图或数据流
- 涉及架构/主链/数据契约/能力发现/LLM 调用点/mcp-agent/FastMCP/UI/trace 的任务，必须同步更新文档
- 每轮完成后必须提供：单测结果、关键链路 dump、浏览器 E2E、traceId、未修问题清单、下一步阻塞清单

### 问数主链红线

| 区域 | 允许 | 禁止 |
|------|------|------|
| QueryContract | Canonical QueryContract 是唯一结构化输入，parsedFilters 是 filter clause 唯一真源 | 下游不得重新从 raw message 抽实体/能力/工具/参数 |
| 能力发现 | 只消费 QueryContract / ToolContract / Registry | 不允许重新解析 raw message，不允许并行映射 |
| Entity/Enum 分流 | identifierFields 与 enumFilterFields 必须分离 | enumFilterField 不得走 ID resolver |
| mcp-agent | QueryContract Review、Capability Candidate Provider、Multi-tool Plan Candidate、Parameter Assist、Failure Replan | 不允许直接 selectedTool / final_tool_arguments / 执行工具 / 绕过 Decision Merge |
| FastMCP | tools/list → Internal ToolContract、tool call result → Internal ToolResult | 不允许自建独立注册中心、做意图识别、绕过 Unified Registry / Preflight |

### 验收策略

当前阶段以"上线能力闭环"为目标验收。E2E 不通过不允许宣称完成。不允许收敛用户已提出的问题、业务目标、链路闭环、E2E 验收、文档更新、trace 可观测性。

详细完整规范见：`docs/sources/inbox/小乔智投工程实施协作规范补充.docx`
