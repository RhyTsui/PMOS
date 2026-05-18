# UIUX Stack Baseline

- version: v0.2
- date: 2026-05-12
- status: active
- scope: Product Chief design outputs, frontend implementation baseline, design governance

## Purpose

This document fixes a recurring quality gap:

- design outputs drift into model-native taste
- frontend pages collapse into demo shells
- UI/UX judgment is not refreshed against current ecosystem changes

PMOS should not rely on a vague one-time UI skill as its quality source.

PMOS now uses:

- a fixed default stack
- a latest-information refresh rule
- a Hermes optimization loop
- an explicit split between benchmark-chat shell and governed secondary surfaces
- the Ant Design family as the governed component/design ecosystem baseline

## Default Implementation Stack

Unless a subproject already has a stronger inherited design system, the default implementation-oriented stack is:

`React + x.ant.design (Ant Design X ecosystem) + repo-owned design tokens`

Interpretation:

- `React`
  - default rendering framework baseline
  - can be hosted by `Vite`, `Next.js`, `Umi`, or other React-capable shells
- `Ant Design X`
  - default frontend framework and AI interface solution baseline from `https://x.ant.design/`
  - provides the governed host framework for both enterprise workbench and AI interface surfaces
- `Ant Design`
  - foundational component layer that can still be used inside the Ant Design X ecosystem when a governed binding calls for it
- `X Markdown`
  - streaming markdown rendering and rich-content output layer
- `X SDK`
  - AI conversation data-flow and provider integration layer
- `X Card`
  - structured dynamic UI protocol / rendering layer when agent output needs governed interactive surfaces
- `repo-owned design tokens`
  - final visual identity must come from local tokens and product rules, not raw library defaults

## Design Reference Priority

When Product Chief or downstream design generation needs quality references, prefer this order:

1. `Carbon Design System`
   - enterprise-product, dense-table, form, and operator-surface reference
2. `Apple Human Interface Guidelines`
   - hierarchy, clarity, whitespace, restraint
3. `Material Design 3`
   - component behavior, state feedback, interaction consistency
4. `Ant Design Values`
   - enterprise product-method principles and design judgment

These references are for behavior and quality, not for blind visual copying.

## Preferred Output Characteristics

- one dominant screen purpose
- clear action hierarchy
- visible operator actions
- explicit loading / empty / error / success states
- modern software-product feel
- token-driven consistency
- component structure that looks actually implementable

## Minimum UI Spec Sections

Any governed UI spec, design-delivery note, or UI schema pack should explicitly define:

- typography:
  - font family
  - size hierarchy
  - weight hierarchy
  - line-height rules
- spacing:
  - page padding
  - section gap
  - card padding
  - form/control gap
- radius:
  - card radius
  - input radius
  - button radius
  - modal radius
- border and shadow:
  - border width / color rules
  - shadow levels
- component sizing:
  - button height
  - input height
  - table row height
  - modal width strategy
- state semantics:
  - loading
  - empty
  - error
  - permission
  - hover / active / disabled

If these sections are absent, the document should be treated as a partial design reference, not a complete UI spec.

## Prohibited Drift

- newspaper / magazine / editorial-board default styling
- explanation-first boards that hide the actual UI
- framework-default look leaking straight into delivery
- mixed component systems without a token owner
- landing page / hero / feature-showcase composition
- flat card walls that hide workflow structure

## Latest Information Integration Rule

This baseline must not freeze on old assumptions.

PMOS should periodically refresh against latest official information for:

- framework status
- component ecosystem maturity
- design system updates
- accessibility and interaction guidance
- current best-practice implementation patterns

Preferred source type:

- official docs
- official repositories
- official design-system sites

## Hermes Optimization Rule

`Hermes` should be treated as the optimizer for this baseline, not as a separate disconnected experiment.

Hermes responsibilities on this topic:

- scan for newer official changes
- compare current stack with alternative candidates
- record keep / replace / park judgments
- identify when a stack element is still default-worthy or should be downgraded
- prevent stale defaults from surviving only because they were chosen earlier

## Product Chief Rule

For `concept-design-pack`:

- generate multiple direction candidates first
- those candidates should read as if they could be implemented with:
  - `React`
  - `x.ant.design / Ant Design X`
  - foundational `Ant Design`
- generated boards should expose:
  - page hierarchy
  - component blocks
  - operator actions
  - state surfaces

For `delivery-design-pack`:

- bind final delivery to `Figma`, `jsonschema`, and page-structure DSL when applicable
- use concept boards only as upstream references

## Component Strategy

### Default

Use the `Ant Design X ecosystem` as the global default when:

- the product is a new PMOS page
- the product is an AI workspace, agent surface, or conversation-first flow
- the product is a normal enterprise workbench page that still needs a governed modern frontend host

Default layering:

1. `RICH` for interaction paradigm
2. `Ant Design X ecosystem` for frontend host and AI interface framework
3. `Ant Design` as the foundational component layer inside that ecosystem when needed
4. `X SDK` for conversation data flow
5. `X Markdown` for streamed content
6. `X Card` for agent-driven dynamic UI
7. `ant-design-family-frontend` for implementation assistance
8. `Ant Design Pro` stays behind an isolated adapter boundary

## Chat-First Interpretation

The reason PMOS prefers `Ant Design X ecosystem` is not just component availability.

It matches the PMOS default design paradigm:

- unified chat capability
- agent-controlled frontend behavior
- dynamic surface expansion
- structured cards as secondary carriers

Recommended standard component direction:

- Playground-like shell as the chat host
- X Card as the dynamic structured surface
- Ant Design base components as the dense enterprise control layer behind that shell

### Fallback

Do not silently fall back to generic `Claude-style AI shell`, `hero + summary-card`, or ad hoc `div/card` composition.
Those are not acceptable PMOS v1.0 baselines.

## PMOS Guardrail Addendum

For PMOS UI work:

- benchmark-chat semantics are more important than visual novelty
- UI should center workflow, context, evidence, decision, approval, and tracking
- do not generate landing page / hero / feature-showcase output
- do not generate flat card walls that hide workflow structure
