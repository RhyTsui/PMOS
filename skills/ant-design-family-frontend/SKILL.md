---
name: ant-design-family-frontend
description: Apply the governed PMOS Ant Design family baseline when producing DESIGN.md, UI schema, implementation handoff, or final frontend pages. Use when frontend work should follow `Ant Design X` as host, `Ant Design` as foundational layer, A2UI/X Card rules, and the isolated `Ant Design Pro` adapter boundary.
---

# Ant Design Family Frontend

Use this skill when the target is PMOS frontend design or implementation under the Ant Design family baseline.

## Read Order

1. `docs/operations/ant-design-family-platform-baseline.md`
2. `docs/operations/pmaios-ant-design-family-frontend-design.md`
3. `docs/operations/ant-design-pro-isolated-adapter-layer.md`
4. `docs/operations/frontend-style-default.md`
5. `docs/templates/ui_schema_spec_template.md`

## Core Rule

Treat the PMOS frontend baseline as:

`Ant Design X host + Ant Design foundational layer + governed dynamic surface + automated delivery verification`

Do not collapse it into:

- generic Ant Design admin page
- generic AI demo shell
- raw HTML agent surface
- silent Ant Design Pro dependency

## Required Outputs

Depending on the task, make sure the output carries:

- route / layout shell / target roles
- requirement / functional / ui-schema links
- Ant Design X host decision
- Ant Design foundational component bindings
- Dynamic Surface or typed-surface decision
- `Pro` isolation decision when relevant
- loading / empty / error / permission states
- browser-verification expectations

## Pro Adapter Rule

If the request touches `Ant Design Pro` or `Pro Components`:

1. do not assume it is available in the root runtime
2. route the decision through `docs/operations/ant-design-pro-isolated-adapter-layer.md`
3. record whether the result is:
   - `reference only`
   - `isolated adapter layer`
   - `blocked by compatibility`

## Delivery Rule

Do not stop at a design explanation.

Push the output toward:

- usable `DESIGN.md`
- usable `ui-schema`
- usable `implementation-handoff`
- final-delivery page contract

## Reference

- `references/acceptance-checklist.md`
