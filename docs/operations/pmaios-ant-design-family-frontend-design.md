# PMAIOS Ant Design Family Frontend Design

- version: v0.1
- date: 2026-05-11
- status: active
- scope: PMOS default frontend framework, component governance, Codex execution baseline

## Purpose

This document turns the official `Ant Design` and `Ant Design X` material into PMOS execution rules.

It is not a loose design note.

It is the governed truth for:

- frontend default framework
- component family selection
- AI interaction pattern
- dynamic surface protocol
- implementation handoff defaults
- automated acceptance expectations

## Official Facts We Keep

### Ant Design

PMOS keeps these official facts from `ant.design`:

- `antd` is the official React implementation of the Ant Design system
- it is positioned as enterprise-class web UI
- it provides React components, TypeScript support, internationalization, theme customization, SSR, and Electron support
- its design values are `Natural`, `Certain`, `Meaningful`, and `Growing`

### Ant Design X

PMOS keeps these official facts from `x.ant.design`:

- `@ant-design/x` is a React UI library for AI-driven interfaces
- its interaction paradigm is `RICH`
  - `Role`
  - `Intention`
  - `Conversation`
  - `Hybrid UI`
- `@ant-design/x-sdk` is the default conversation/runtime data-flow helper
- `@ant-design/x-card` is the A2UI-based structured dynamic-surface renderer
- `A2UI` is declarative JSON-driven UI, not agent-generated raw HTML

## PMOS Interpretation

PMOS fixes the family mapping as:

- `Ant Design X`
  - default frontend host and AI interaction baseline
- `Ant Design`
  - foundational enterprise component layer inside the same governed ecosystem
- `X SDK`
  - default conversation and AI-runtime data-flow helper
- `X Card / A2UI`
  - governed dynamic-surface protocol for agent-generated structured UI
- `@ant-design/charts`
  - default chart baseline
- `@ant-design/icons`
  - default icon baseline
- `antd-style`
  - default style/token helper
- `antd-mobile`
  - default mobile target baseline
- `antd-mini`
  - default mini-program target baseline

## Product Rule

PMOS frontend must not default to:

- flat admin shell
- generic AI demo shell
- pure chat page with no structured work surface
- terminal wrapper
- explanation-first showcase page

PMOS frontend must default to:

- copilot-first entry
- agent-routed flow
- dynamic work surface
- runtime-owned state
- proof-backed delivery

## RICH To PMOS Mapping

| RICH | PMOS meaning | governed implementation |
| --- | --- | --- |
| `Role` | current operator role + current active agent | target roles, agent route, specialist visibility |
| `Intention` | user goal and route decision | `Sender`, prompts, route result, next safe step |
| `Conversation` | user stays in copilot flow | `Bubble`, `Conversations`, `Welcome`, `Prompts`, `Attachments` |
| `Hybrid UI` | structured UI appears only when needed | typed surfaces first, A2UI/X Card second |

## Default Stack

Unless a stronger inherited system already exists, PMOS frontend defaults to:

`React + antd@6 + @ant-design/x + @ant-design/x-sdk + @ant-design/x-card + repo-owned tokens`

Supporting packages:

- `@ant-design/icons`
- `@ant-design/colors`
- `antd-style`
- `@ant-design/charts`
- `antd-mobile`
- `antd-mini`

## Component Selection Rule

### Use Ant Design X First When

- the page is copilot-first
- the page contains conversation, prompts, route trace, runtime trace, or proof feedback
- the page needs agent/human hybrid interaction
- the page needs structured dynamic surface

Typical components:

- `Welcome`
- `Prompts`
- `Sender`
- `Attachments`
- `Bubble`
- `Conversations`
- `ThoughtChain`
- `Actions`
- `FileCard`
- `Sources`
- `CodeHighlighter`
- `Folder`
- `XProvider`

### Use Ant Design When

- the page needs enterprise shell, layout, form, table, state feedback, modal, drawer, or dense operator widgets
- the business block is not conversation-native
- the governed binding prefers stable foundational widgets

Typical components:

- `Layout`
- `Card`
- `Flex`
- `Splitter`
- `Form`
- `Input`
- `Select`
- `Table`
- `Descriptions`
- `Tabs`
- `Drawer`
- `Modal`
- `Alert`
- `Tag`
- `Badge`
- `Progress`

## Dynamic Surface Rule

PMOS supports two levels.

### Level 1: typed React surface

Default and required first:

- `PageSpecSurface`
- `CodexJobSurface`
- `VerificationSurface`
- `ProofSurface`
- `RuntimeInspectorSurface`

### Level 2: A2UI / X Card surface

Allowed only when:

- the surface is driven by structured JSON messages
- the catalog is whitelisted
- the runtime owns action handling
- no raw HTML is executed

PMOS prohibition:

- no `dangerouslySetInnerHTML`
- no agent-generated raw HTML/JS/CSS execution
- no unregistered components

## Ant Design Pro Rule

`Ant Design Pro / Pro Components` are not the PMOS root runtime baseline.

Reason:

- current `@ant-design/x` requires `antd@6`
- current `@ant-design/pro-components` still peers against `antd@5`

Therefore:

- root PMOS runtime must not directly import `@ant-design/pro-components`
- any `Pro` evaluation or pattern reuse must go through the isolated adapter layer
- see `docs/operations/ant-design-pro-isolated-adapter-layer.md`

## Delivery Contract

Every final frontend delivery page must carry:

- route / entry
- layout shell
- target roles
- linked requirement refs
- linked functional spec refs
- linked ui schema refs
- data refs
- component bindings
- loading / empty / error / permission states
- critical actions
- automated browser verification evidence

## Codex Execution Order

When Codex implements frontend work under this baseline, it should:

1. recover requirement / functional / ui-schema truth
2. confirm the page family and target roles
3. choose `Ant Design X` host + `Ant Design` foundational bindings
4. check whether `Pro` is requested and, if so, route it through the isolated adapter layer
5. implement typed surfaces before A2UI
6. run automated browser verification before user review

## Acceptance Rule

A frontend task is not complete only because the page renders.

It passes only when:

- the page is final-delivery grade, not demo grade
- the page follows the governed Ant Design family bindings
- any `Pro` use is explicitly isolated
- browser verification passes
- final-state validation passes

## References

- `https://ant.design/docs/react/introduce/`
- `https://ant.design/docs/spec/values/`
- `https://x.ant.design/components/introduce/`
- `https://x.ant.design/x-sdks/introduce/`
- `https://x.ant.design/x-cards/introduce/`
- `docs/operations/ant-design-family-platform-baseline.md`
- `docs/operations/ant-design-pro-isolated-adapter-layer.md`
