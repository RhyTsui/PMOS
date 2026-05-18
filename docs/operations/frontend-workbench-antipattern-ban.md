# Frontend Workbench Anti-Pattern Ban

- status: active
- date: 2026-05-08
- owner: product office
- applies-to: `PMAIOS` platform runtime, PMOS surfaces, and all subproject workbench pages unless a stronger inherited product design system already governs the page

## Intent

This document closes a recurring implementation drift:

- generic `hero` first screens
- summary-card dashboards with low operator value
- explanation-first layouts that delay actual actions and outputs
- custom AI-style shells that ignore the approved component baseline

The rule is not aesthetic-only. These patterns weaken:

- execution clarity
- system-state visibility
- task-level actionability
- cross-project consistency
- AI implementation alignment

## Hard Bans

The following patterns are banned for `production` and `runtime` pages:

1. `hero` first-screen blocks as the primary page structure
2. generic `summary-card` four-grid dashboards as the main overview
3. introduction-first copy blocks that consume the top viewport before actions, outputs, or live state
4. custom glassmorphism / Claude-style assistant shells that bypass the approved component mapping
5. page structures built from generic `div/card` composition before mapping to the approved component system

## Required Structure

Default workbench pages must prefer:

`scope + live state + actions + outputs + monitoring + asset access`

instead of:

`introduction + generic highlights + optional details`

The first viewport must answer:

1. what scope is active
2. what is running or blocked
3. what the operator can do next
4. where the latest governed outputs are

## Component Alignment Rule

Before implementing a page, the author must state:

1. page shell mapping
2. navigation mapping
3. metrics / status mapping
4. list / table / detail mapping
5. action / composer / feedback mapping

If the page is a chat / agent workspace:

- default shell style: AI-native workspace
- default chat-region baseline: `Ant Design X`
- default dynamic UI baseline: `X Card` when agent output needs structured interactive rendering
- default streaming content baseline: `X Markdown`
- default data-flow baseline: `X SDK`
- shell, typography, density, and control surfaces: governed dark-first or neutral AI-native product spec

If the page is a data / advertising / enterprise system:

- prefer enterprise system tokens
- prefer explicit operations, filters, tables, traces, and evidence panels
- avoid marketing-site composition and decorative “AI platform” copy

## Audit Enforcement

The repository-level frontend audit must flag:

- `hero-panel`
- `hero hero-workbench`
- `summary-card`
- `management-card`
- `history-card`
- `result-card`
- `brand-card`
- `context-mini-card`
- `runtime-hero-panel`
- `artifact-hub-card`

New pages must not introduce these patterns.

## Review Contract

`Design Review`, `Frontend Review`, and `Hermes` writeback governance must treat these as concrete issues, not style preferences.

Severity guidance:

- top viewport built as hero narrative: `revise`
- overview built from generic summary cards without operator actions: `revise`
- implementation bypasses approved component system: `block`
- chat / agent page turns the full page into a generic Claude-style clone or collapses into a dashboard shell: `block`
- chat / agent page ignores the `RICH + Ant Design X + X SDK (+ X Markdown / X Card when needed)` baseline without a project-level override: `block`
- repeated recurrence across runs or subprojects: `promote` to shared default rule and writeback target

## References

- `docs/operations/frontend-style-default.md`
- `docs/operations/pmos-ai-native-workspace-design-language.md`
- `docs/operations/data-ad-enterprise-ui-spec.md`
- `docs/operations/uiux-stack-baseline.md`
