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
