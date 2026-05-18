# PRD And Design Two-Step Governance

- version: v0.1
- date: 2026-04-28
- status: active
- scope: Product Chief governed outputs, product definition, design delivery

## Purpose

This document fixes a recurring failure mode:

- PRD outputs stop at "slightly more detailed planning"
- design outputs stop at "slightly more concrete concept images"

The root cause is that large planning inputs were being converted directly into single-layer PRD or design outputs.

PMAIOS now uses a mandatory two-step split for both PRD and design.

## Hard Rule

Do not generate delivery-ready PRD or delivery-ready design directly from large planning text.

The required chain is:

`product-definition / requirement-baseline / original-demand-review -> plan-prd -> functional-spec-pack -> html-direction-pack -> ui-schema-spec -> delivery-design-pack(figma / jsonschema / page-structure-dsl) -> implementation-handoff`

Optional concept-board side branch:

`plan-prd -> concept-design-pack(image2 boards for architecture / flows / explainers only)`

## Output Layers

### 1. `plan-prd`

Purpose:

- converge objective
- define scope and boundary
- define module map
- define phased decomposition
- expose unresolved questions before feature-level specification

It is allowed to stay at planning layer.

It is not allowed to pretend that feature trigger, state, field, and exception definitions are already complete.

### 2. `functional-spec-pack`

Purpose:

- decompose planning PRD into feature-level implementation-facing specs

Minimum required content:

- feature unit list
- trigger / entry
- preconditions
- main flow
- branch flow
- exception handling
- state transition
- key fields / entities
- permission / role difference
- events / logs / metrics
- acceptance cases
- out-of-scope notes

Hard rule:

If these elements cannot be stated, the artifact is not a functional spec.

### 3. `concept-design-pack`

Purpose:

- use image2 only for concept boards such as architecture, flows, explainers, panoramas, and page-structure overviews
- expose structural assumptions and communication views, not final UI delivery
- support thinking, not final delivery
- act as a design explainer board rather than a final development design
- unless explicitly asked to create a comparison board, generate separate images instead of packing multiple UI directions into one compressed image
- when language / style / density are not locked, default to multiple image variants with different design language, style direction, and low/medium/high information density for real product choice
- when interaction states such as drawers, modals, detail panels, or clicked expansions would visually compress the default page, separate them from the default page or clearly detach them with framing instead of flattening both into one plane

Input source:

- `plan-prd`

Hard rule:

`concept-design-pack` cannot be used as final development handoff design, and should not be the default stage for real UI screen design.

Recommended form:

- numbered design callouts
- visual explanation of layout and hierarchy decisions
- explicit context panels or responsive shape examples when helpful
- summary strip explaining key design judgments

### 4. `html-direction-pack`

Purpose:

- start the actual UI design stage directly in HTML
- compare layout language, component hierarchy, and interaction surfaces without image redraw drift
- provide a patchable, diffable direction layer before schema and delivery binding

Input source:

- `functional-spec-pack`
- `plan-prd`

Hard rule:

Once the work enters UI design, PMAIOS should prefer `html-direction-pack` instead of generating screen images first.

### 5. `delivery-design-pack`

Purpose:

- complete delivery-facing UI definition for downstream development
- bind functional spec to figma-ready screens, jsonschema, and page-structure DSL
- remove dependence on concept images when entering real implementation

Input source:

- `functional-spec-pack`
- `html-direction-pack`
- `ui-schema-spec`

Hard rule:

`delivery-design-pack` must not be generated from planning text alone, and must not treat image2 as the final UI delivery source.

## Design Format Rule

`image2` is not the universal design-delivery format.

This rule is complemented by `docs/operations/html-first-document-output-policy.md`: HTML-first means runtime-facing surfaces should be rendered from governed schema / PMOS DSL / registered components, not that AI may freely generate arbitrary production HTML.

Use `image2` only for:

- product architecture boards
- user / agent flow diagrams
- concept-level UI exploration
- report / explainer boards
- page structure / panorama overviews

Do not use `image2` as the final source of truth for actual UI handoff.

Actual UI delivery should prefer:

- `Figma`
- `jsonschema`
- `page-structure DSL`
- implementation-facing handoff artifacts

SVG remains valid for:

- planning boards
- architecture boards
- workflow boards
- decision / confirmation boards

So screen-design staging should use:

- `html-direction-pack`
- `ui-schema-spec`
- `delivery-design-pack (figma / jsonschema / page-structure-dsl)`

Interpretation:

- image2 = explainer / concept / structure visualization only
- UI design stage = HTML first
- final pass = structured delivery artifacts, not another image-only handoff

## Specificity Gates

### `plan-prd` gate

Must include:

- goal
- scope
- boundary
- module map
- phased decomposition
- unresolved questions before functional spec

### `functional-spec-pack` gate

Must include:

- functional units
- trigger
- state transition
- key fields
- acceptance cases

If two or more are missing, it is still a planning document rather than a functional spec.

### `delivery-design-pack` gate

Must include:

- figma or equivalent delivery binding
- page-structure DSL / schema definition
- mapping to functional-spec units
- delivery-specific state coverage
- operator action visibility

If it only carries concept-level layout, HTML direction, or image prompts, it is still a concept design pack rather than a delivery design pack.

## Review Interpretation

When multi-agent review checks these outputs:

- `plan-prd` is allowed to be planning-level
- `functional-spec-pack` must be implementation-facing
- `concept-design-pack` is allowed to expose unresolved architecture / explainer questions
- `html-direction-pack` is the main stage for actual UI direction comparison
- `delivery-design-pack` must be judged by functional traceability, schema completeness, and implementation readiness

## Product Chief Routing

Product Chief should now prefer these governed outputs:

1. `plan-prd`
2. `functional-spec-pack`
3. `html-direction-pack`
4. `ui-schema-spec`
5. `delivery-design-pack`
6. `implementation-handoff`
7. `concept-design-pack` when concept boards are explicitly needed

This replaces the old single-hop assumption that one PRD or one design pack could serve both thinking and delivery.

## Conversation Backwrite Rule

Requirement-related content discovered or changed during chat must not stay only in dialogue.

It must be written back into governed product truth such as:

- `plan-prd`
- `functional-spec-pack`
- `ui-schema-spec`
- requirement baseline / source-of-truth documents

Hard rule:

If a conversation changes scope, interaction rule, page structure, state handling, or acceptance expectation, the downstream product and design artifacts are not considered aligned until the change is back-written into governed documents.

Interpretation:

- terminal dialogue is transient
- product truth is durable
- frontend implementation must follow durable truth rather than memory of a conversation

## Design Landing Rule

Design images are not the final implementation contract by themselves.

Every design output that will influence frontend work must also land as at least one structured artifact:

- design document
- `ui-schema-spec`
- page contract / page-structure DSL
- implementation-facing delivery pack

Hard rule:

Frontend implementation must not rely on "looking at the picture and guessing the interaction."

Required implementation-facing chain:

`conversation change -> requirement backwrite -> design update -> structured design landing -> frontend implementation -> visual backcheck`

Interpretation:

- pictures help alignment
- design docs and schema preserve exactness
- final frontend consistency depends on both visual reference and structured design truth

## Design Change Governance Rule

Multi-round design modification must not run as uncontrolled full-image redraw.

When a conversation asks to modify an existing design output, PMAIOS should treat it as:

`change set -> protected regions -> patch-mode generation -> diff audit -> acceptance`

Minimum required governance objects:

- `design-change-set`
- `design-diff-audit`
- protected regions / must-not-change rules

Hard rules:

- if the request lists 10 changes, the system must track 10 explicit change items
- if only 5 are evidenced, the result is partial rather than silently accepted
- if unrelated regions drift, the drift must be logged as unintended change
- patch-mode design updates should keep unlisted layout, hierarchy, and visual language unchanged

Interpretation:

- design update is a governed patch, not a vague redraw
- design review should check `applied / missed / unintended`
- unchanged regions are protected by default unless the request explicitly unlocks them

## Confirmation Chain Rule

For product, design, and implementation-facing artifacts, `generated`, `written`, `landed`, and `confirmed` are different states.

PMAIOS must not collapse them into one status.

Minimum governed confirmation chain:

`artifact generated -> artifact landed -> reviewer identified -> confirmation status recorded -> next-stage unlock`

Required confirmation dimensions:

- confirmation object
- confirmation layer
- confirmer / responsible role
- confirmation status
- unblock target

Typical layers:

- prototype confirmation
- interaction confirmation
- visual UI confirmation
- static HTML confirmation
- implementation handoff confirmation
- AI writeback human confirmation

Hard rules:

- an artifact being created does not mean it is confirmed
- a file being saved does not mean the previous confirmation dependency is satisfied
- if a higher layer is not confirmed, lower layers may exist as drafts but must not be described as accepted truth
- if confirmation status is corrected later, downstream status must be corrected with it
- any writeback affecting governed objects must define whether human confirmation is required before it becomes active

Interpretation:

- confirmation is a first-class governance object
- “waiting for confirmation” is a real state, not a wording detail
- PMAIOS should surface unconfirmed stages explicitly rather than letting them blend into progress language

Formal object and gate definition:

- `docs/operations/confirmation-chain-object-and-gate.md`
