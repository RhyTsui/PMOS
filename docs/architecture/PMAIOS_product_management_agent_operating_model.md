# PMAIOS Product Management Agent Operating Model

- version: v0.8
- date: 2026-05-11
- status: active
- owner: product office

## 1. Model Statement

`PMAIOS` now operates as:

`platform control plane + multi-role virtual workflow managers + Hermes governance + human final approval`

This model exists to prevent three recurring failures:

1. user requirement and product requirement drift apart mid-flight
2. docs, design, API, and frontend repeat each other but lose contract consistency
3. AI defaults to demo-style output instead of delivery-grade product output

## 2. Default Product Workflow

正式默认工作流如下：

`调研文档 -> 规划文档 -> 需求文档 -> 功能文档 -> 设计文档 -> 前端页面 -> 数据表 -> 后端接口 -> 前后端联调与验收`

Each stage has a distinct responsibility:

- `调研文档`
  Explain current system state, business background, problem boundary, and external constraints.
- `规划文档`
  Explain target, scope, priority, benefit, and milestone strategy.
- `需求文档`
  Explain requirement decomposition, acceptance criteria, and requirement-to-function mapping.
- `功能文档`
  Explain function units, state flows, and function-to-API mapping.
- `设计文档`
  Explain IA, page relationships, interaction, state design, and component constraints.
- `前端页面`
  默认直接产出最终交付页，而不是简单版、示意稿或静态确认稿。
- `数据表`
  Formalize schema; do not invent data semantics for the first time here.
- `后端接口`
  Formalize contracts; do not invent request/response semantics for the first time here.
- `前后端联调与验收`
  Close the loop on main flow, exceptions, permissions, data consistency, and requirement back-check.

## 3. Review Model

The formal review path is:

`stage output -> self-check -> multi-role review committee -> Hermes governance decision -> human final approval`

Core review slices:

- `Solution-Optimality Review`
- `Development Review`
- `Design Review`
- `Research Review`
- `Delivery Review`

## 4. Frontend Execution Rule

Frontend is not a free-form design surface.

Current hard rules:

1. complete component mapping before implementation
2. global frontend framework baseline defaults to `x.ant.design / Ant Design X`
3. foundational `Ant Design` components remain available through governed bindings inside that ecosystem
4. page implementation must first carry `route / layout shell / target roles / data refs / componentBindings`
5. enterprise shell, density, tokens, and state semantics remain governed
6. ban `hero + summary-card + explanation-first`
7. prioritize actions, outputs, monitoring, and asset access

## 5. Closure Standard

A capability is only considered complete when it is:

1. runnable in runtime
2. reviewable in committee / gate evidence
3. visible in proof-of-work
4. operable from operator actions
5. recorded in stable truth docs
6. back-checked to the original user problem as `solved`

## 6. Current Judgment

Current judgment for the operating model:

- `workflow mainline`: `solved`
- `multi-role review structure`: `solved`
- `Hermes full closure`: `partial`
- `knowledge grounding into review`: `solved`
- `frontend final-page governance`: `partial`
- `cross-project delivery closure`: `partial`
