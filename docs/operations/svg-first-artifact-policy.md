# SVG-First Artifact Policy

- version: v0.1
- date: 2026-04-21
- status: active
- scope: all planning, research, architecture, confirmation, and decision artifacts unless a stricter downstream delivery format overrides it

## Purpose

This policy makes visual artifacts the default human-facing output for PMAIOS planning and research work.
It also sets the default delivery contract for AI product managers across the platform.

From now on:

- do not treat Markdown as the primary artifact for research or solution convergence
- use SVG as the primary human-facing artifact
- keep Markdown as a detailed appendix or machine-readable companion when needed
- prefer clickable SVG navigation for project-level planning, confirmation, and status review
- require AI product managers to default to SVG boards for chief-facing outputs unless a stricter downstream format overrides that default

## Default Rule

For the following artifact types, the primary artifact should be an SVG:

1. research summary
2. competitor / open-source landscape
3. architecture confirmation
4. first-version planning
5. action-chain / workflow design
6. decision board
7. chief confirmation questions
8. project status overview
9. AI product manager first-draft review packages

Markdown is still allowed, but only as:

- appendix
- detailed notes
- source extraction companion
- AI-readable structured backup
- downstream execution contract when another format is explicitly required

It is no longer the preferred first thing shown to the chief.

## AI Product Manager Default

All AI product managers should assume the following delivery default:

- chief-facing output enters through SVG first
- Markdown is secondary unless the task explicitly demands a text-first downstream format
- if both SVG and Markdown exist, the SVG should be the visual overview and first review surface

Recommended first artifacts:

- `project-board.svg`
- `research-map.svg`
- `planning-board.svg`
- `decision-board.svg`
- `workflow-board.svg`

## Output Convention

Each active subproject should keep its current visual source-of-truth SVGs in the subproject root or a root-level visual folder that is directly visible.

Recommended convention:

- `subprojects/<id>/project-board.svg`
- `subprojects/<id>/research-map.svg`
- `subprojects/<id>/planning-board.svg`
- `subprojects/<id>/decision-board.svg`
- `subprojects/<id>/workflow-board.svg`

Optional companion notes:

- `subprojects/<id>/docs/.../*.md`

If there is only one master visual entry point, use:

- `subprojects/<id>/project-board.svg`

and link outward from it.

## Navigation Rule

SVG artifacts should be navigable whenever practical.

Preferred navigation patterns:

1. section-to-section jump inside the same SVG
2. link from one SVG board to another SVG board
3. link from an SVG node to a governed Markdown appendix
4. link from an SVG node to a key project document

Typical navigation targets:

- research board
- planning board
- requirement list
- review input
- chief confirmation list
- latest governed outputs

## Diagram Skill Rule

Default visual generation skill:

- `fireworks-tech-graph`

Use it by default for:

- architecture diagrams
- flowcharts
- sequence diagrams
- action chains
- system maps
- comparison maps

If another visual method is used instead, that should be because:

- the target format requires it, or
- the existing project design system already provides a stronger visual path

## Confirmation Rule

When asking the chief to confirm planning, boundaries, or decisions:

- prefer a `decision-board.svg` or `planning-board.svg`
- keep the visual board concise
- put the long reasoning in Markdown appendix only when needed

This means confirmation should usually happen against:

- boxes
- clusters
- flows
- decision nodes
- risk markers

not against a long prose document.

## Minimal Required Content

Every SVG-first planning or research artifact should contain:

1. title
2. version / date
3. scope
4. current status
5. visual structure
6. pending confirmations
7. links or anchors to the next governed artifacts

AI PM boards should also aim to include:

8. current decisions
9. visible next-step navigation

## Delivery Layer Exception

This policy does not replace downstream formats that developers, bosses, or external users explicitly require.

Examples:

- version review docs for development
- Word-compatible human review docs
- concise requirement lists
- HTML runtime pages for dashboards, review / approval surfaces, workflow views, trace views, reports, and delivery-quality UI direction comparison

In those cases:

- the SVG remains the visual overview when visual reasoning or chief confirmation is needed
- the downstream doc or runtime page remains the execution / review contract
- HTML-first surfaces must be generated from schema, PMOS DSL, or registered components rather than arbitrary agent-written production HTML

## Implementation Note

Current PMAIOS default:

- SVG is the default chief-facing artifact
- Markdown is the detailed support layer
- `fireworks-tech-graph` is the default diagram skill
- platform and subproject PM outputs should enter review through SVG whenever practical

This policy should be treated as active until replaced by a stricter visual artifact standard.
