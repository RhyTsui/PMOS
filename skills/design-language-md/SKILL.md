---
name: design-language-md
description: Generate or update a project-level DESIGN.md as the design-language source of truth for PMAIOS. Use when a project needs its visual language, interaction language, component semantics, design anti-patterns, or page-family rules written into a stable repo artifact before html-direction, ui-schema, static HTML, or implementation handoff continues.
---

# Design Language MD

Write or update `DESIGN.md` as a project-level design-language source of truth.

## Workflow

1. Read the active product truth, confirmed design artifacts, and any project-specific design rules first.
2. Separate design-language truth from confirmation status.
3. Write or update `DESIGN.md` only for reusable design-language constraints, not for one-off draft commentary.
4. Keep the file aligned with the current component system preference and design anti-patterns.
5. Record missing inputs explicitly instead of guessing.

## Required Inputs

- requirement or functional truth for the target project
- confirmed or current design artifacts when they exist
- component-system preference such as `YokaUI`
- design constraints and anti-patterns

## Output Rules

- Place the project-level `DESIGN.md` near other project truth artifacts.
- Include at least:
  - design intent
  - page family
  - visual language
  - interaction language
  - component semantics
  - anti-patterns
  - confirmation notes
- Do not treat `DESIGN.md` as a final delivery artifact.
- Do not mark design as confirmed only because `DESIGN.md` exists.

## When Inputs Conflict

1. Prefer governed product truth over chat memory.
2. Prefer confirmed artifacts over drafts.
3. If visual/UI confirmation and static HTML conflict, record the conflict and keep `DESIGN.md` at the stable language layer.
4. If a key rule is unknown, write it as missing rather than inventing a style.

## Reference

Read `references/design-md-template.md` when you need the recommended PMAIOS section structure.
