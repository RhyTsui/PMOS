# Frontend Default Style

- status: active
- date: 2026-05-13
- applies-to: all PMOS platform work and subprojects unless an existing product design system already overrides it

## Default Visual Direction

Current default frontend direction is:

`AI Native Workspace`

This means:

- the page should read as an AI-native conversational workspace, not an admin dashboard
- the home page should still be a single primary chat rather than a dashboard-first surface
- workflow, evidence, decision, action, and execution state should be clearer than decorative composition
- explanatory copy, pitch copy, and confirmation copy should stay out of production page bodies
- visual quality should feel modern, layered, and professional even when the page is dark-first

## Required Characteristics

1. Function first
Every visible block must provide one of:
- action
- monitoring
- statistics
- live output
- artifact access
- evidence trace

2. No intro-heavy UI
Do not spend prime screen space on:
- platform introductions
- explanatory banners
- decorative copy

3. Output visibility
The page should surface:
- latest outputs
- requirement / task / workflow status
- source and evidence references when applicable
- execution traces when available

Homepage-specific rule:
- keep those modules hidden by default
- open them on demand instead of exposing all panels at once

4. Cross-project consistency
All new PMOS governed UIs should prefer this style baseline unless:
- the project already has a strong inherited design language
- a business-side brand requirement explicitly overrides it

5. Token-first specification
UI-facing documents are incomplete if they do not explicitly define at least:
- font family and size hierarchy
- radius system
- spacing system
- border / shadow rules
- component height / density rules
- empty / loading / error / permission states

6. Product-type default
For all new PMOS frontend work, default to:
- benchmark chat shell
- `x.ant.design / Ant Design X` as the global frontend framework baseline
- governed component bindings that may still use foundational `Ant Design` components when needed
- `RICH` as the AI-native interaction paradigm
- `X SDK`
- `X Markdown`
- `X Card` when structured dynamic UI is needed
- UISchema-first page contracts before React implementation
- unified chat capability as the default interaction entry
- `chat + agent-controlled frontend` as the default page behavior model
- visible home-shell naming should prefer `PMChat`

Homepage interaction default:
- main conversation is the homepage itself
- context, evidence, decision, approval, and runtime modules use drawer / side-sheet / inline expansion exposure
- agent actions should be able to drive those expansions
- `Suggestion` should be the default lightweight trigger surface for capability demos and common actions
- `ThoughtChain` / `Sources` should remain collapsed by default and only appear after a real user question
- typed result surfaces such as `CodeHighlighter`, `Mermaid`, `FileCard`, and `Folder` should render inside the active assistant reply instead of below the chat as a fixed playground

Subproject interaction default:

- homepage defaults to chat-first unless strong task constraints require otherwise
- task details, evidence, review, and actions should be surfaced through agent-controlled expansion rather than static panel grids

## Avoid By Default

- Ant Design Pro admin-shell look
- oversized hero sections
- abstract dashboards without executable value
- hidden outputs that require deep drilling just to confirm latest progress
- landing pages and feature-showcase shells for governed PMOS work
- flat card walls without workflow semantics
- equal-weight homepage panels competing with the main conversation

## Execution Note

When designing PMOS pages, prefer:

`context -> evidence -> decision -> action -> tracking`

instead of:

`introduction -> generic panels -> optional details`

For the unified home page, prefer:

`chat -> contextual expansion -> decision -> action -> trace`

instead of:

`control panel -> dashboard panels -> conversation as one module`

## Final Delivery Rule

Frontend output is complete only when it is a final delivery page, not a demo, visual confirmation draft, or explanation shell.

The default implementation package must carry:

- route / entry
- layout shell
- target roles
- linked requirement refs
- linked functional spec refs
- linked ui schema refs
- source refs / evidence refs when applicable
- component bindings
- loading / empty / error / permission states
- critical action list
- browser verification evidence

If any item is missing, the page should be treated as incomplete and blocked from delivery.

## PMOS UI Guardrail

For PMOS-wide governed pages:

- do not start from free-form visual composition
- define `screenType`, `layout`, `regions`, source/evidence refs, and decision/approval semantics first
- treat the page as a workflow surface, not a marketing surface
- ensure risky actions have explicit review / audit semantics

## Implementation Baseline

Unless a subproject already has a stronger inherited system, the default product stack is:

`React + x.ant.design / Ant Design X`

Supporting rules:

- `Ant Design X / X Markdown / X SDK / X Card` are the global frontend baseline
- foundational `Ant Design` components can still be used through governed bindings
- local product tokens still own typography, spacing, radius, density, and shell consistency

Compatibility rule:

- `Ant Design Pro / Pro Components` are not part of the root PMOS runtime baseline
- if a task touches `Pro`, it must use the isolated adapter rule in `docs/operations/ant-design-pro-isolated-adapter-layer.md`
- do not use `Pro` templates to generate workbench demos
- do not frame the home page as an admin workbench or dashboard shell

Standard rapid-call building blocks should prefer the Ant Design X ecosystem, including:

- Playground-like chat shell
- X Card / dynamic card surfaces
- governed conversation and action regions

Preferred RICH stage mapping:

- wake-up: `Welcome`, `Prompts`
- expression: `Sender`, `Attachment`, `Suggestion`
- confirmation: `Think`, `ThoughtChain`
- feedback: `Actions`, `FileCard`, `Sources`, `CodeHighlighter`, `Mermaid`, `Folder`

The implementation default is not to expose all of them at once.
It is to let the main chat progressively reveal them inside an AI-native workspace shell.

Reference:

- `https://x.ant.design/`
- `docs/operations/uiux-stack-baseline.md`
- `docs/operations/ui-pmos-copilot-contract.md`
- `docs/operations/pmos-ai-native-workspace-design-language.md`
- `docs/operations/frontend-workbench-antipattern-ban.md`
