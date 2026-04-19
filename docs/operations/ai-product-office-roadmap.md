# AI Product Office Roadmap

## Purpose

This document defines the target operating model for turning PMAIOS from a workflow runtime into an AI Product Office. The goal is simple: the human provides physical-world information and final decisions, while the AI system does the digital work by default.

## Target Outcome

PMAIOS should operate as a virtual product employee and product office that can:

- ask for missing real-world information instead of waiting passively for prompts
- route work to specialist product agents
- generate governed product outputs by default
- keep long-cycle industry, competitor, and strategic intelligence current
- recommend learning methods, mental models, and capability upgrades for the human product lead
- scan the market for adjacent open-source projects, reusable patterns, and external operating models
- express product intent as schema-driven UI and reusable business blocks when appropriate
- connect outputs to requirements, versions, review gates, and execution traces

## Product Output System

The AI Product Office must be able to generate and maintain these output types:

- daily intelligence report
- weekly product brief
- quarterly OKR draft
- special research report
- requirement evaluation feedback
- product roadmap
- version planning document
- user manual
- demo script
- competitive intelligence report
- solution analysis sync note
- learning and cognition upgrade memo
- ecosystem and open-source landscape scan
- UI schema spec

## Human / AI Boundary

### AI owns by default

- document first drafts
- research synthesis
- backlog framing
- roadmap and version proposal drafts
- review issue framing
- demo and manual drafts
- strategic watchlist maintenance
- missing-information questioning
- learning suggestions and cognitive method recommendations
- external pattern scouting and reuse recommendations
- schema-first UI and reusable component guidance

### Human owns by default

- final business decision
- organizational commitment
- real-world negotiation
- resource escalation
- offline interviews and meeting execution
- acceptance or rejection of major strategic changes

## Authorization Model

Authorization does not mean replacing the human. It means deciding what the AI may do without waiting for explicit approval.

### Safe default AI authority

- create and update governed documents in the repository
- propose requirements, versions, roadmaps, and reviews
- restructure and normalize historical documentation
- prepare meeting questions, interview guides, and follow-up lists
- mark work as suggested, draft, blocked, or ready-for-review

### Human approval required

- commit to external dates
- promise cross-team or cross-department delivery
- allocate real headcount or budget
- close major strategic disputes
- publish externally facing commitments without review

## Estimation Model

Do not estimate using historical non-AI human pace by default.

Use three dimensions instead:

1. Solution complexity
2. Coordination complexity
3. External dependency load

Each major work item should carry:

- `ai_first_effort`: low / medium / high
- `coordination_load`: low / medium / high
- `external_dependency`: none / partial / critical
- `confidence`: low / medium / high

This allows estimates to improve over time as the team adopts AI coding and AI-assisted product work.

## Organization Profile To Maintain

The AI Product Office must keep a living profile of:

- role boundary and decision rights
- team composition
- partner teams
- department context
- delivery model
- AI adoption level
- preferred document cadence
- preferred escalation style
- current strategic priorities

Use `docs/templates/physical_world_profile_template.md` as the canonical structure.

## Learning And Cognitive Upgrade Loop

The AI Product Office must improve the human operator, not only execute tasks.

For recurring work, the system should:

- identify repeated decision blind spots or missing methods
- recommend frameworks, checklists, and learning paths that improve judgment
- explain why each recommendation matters to current work instead of giving abstract advice
- capture the recommendation in a governed memo when the topic is strategic or recurring

Use `docs/templates/learning_growth_memo_template.md` when the recommendation should persist beyond chat.

## External Pattern And Open-Source Scouting

The AI Product Office must assume that adjacent teams and markets likely already explored similar ideas.

Before proposing a novel strategic mechanism, it should:

- look for open-source projects, public frameworks, and reusable product patterns
- compare them with PMAIOS goals and constraints
- classify each finding as `adopt`, `adapt`, `watch`, `reject`, or `build`
- explain what can be imported directly and what still requires custom work

Use `docs/templates/ecosystem_landscape_scan_template.md` for governed scouting outputs.

## Schema As UI

For workflow-heavy internal products, PMAIOS should not start with pixel descriptions by default.

It should prefer:

- schema-driven page generation
- reusable domain blocks and composite components
- explicit interaction contracts and state models
- consistent design tokens and business semantics

The goal is not to copy a generic UI generator. The goal is to outperform generic tools by combining schema-first generation with company-specific business blocks, interaction rules, and product context.

Use `docs/templates/ui_schema_spec_template.md` when the request should become a governed UI or block specification.

## Product Agent Structure

### Manager layer

- Virtual Product Chief
- Requirements PM
- Version PM
- Review PM
- Workflow PM
- Delivery PM
- Retrospective PM

### Specialist layer

- Industry Research PM
- User Research PM
- Competitive Analysis PM
- Stakeholder PM
- ROI PM
- Strategy Radar PM
- Roadmap PM
- Documentation PM
- Experience Design PM

## Priority Backlog

### P0

- make the Virtual Product Chief ask for missing physical-world information proactively
- make specialist product agents part of the active operating model instead of registry-only metadata
- make capability publish depend on real review state, not front-end booleans
- normalize historical documentation into current taxonomy
- make learning suggestions and cognitive upgrade guidance part of the standard product-chief output
- make external pattern and open-source scouting a required step for strategic proposals
- add schema-driven UI and reusable business-block planning into the product loop

### P1

- add daily intelligence and weekly brief generation
- add roadmap and version planning generation
- add demo script and user manual generation
- add strategic radar for new agent patterns, frameworks, and skill ecosystems
- add learning memos and reusable decision frameworks for the human operator
- add governed ecosystem scans for adjacent open-source and market patterns
- add UI schema generation and business-block guidance for internal product surfaces

### P2

- connect meeting transcript ingestion and requirement extraction
- connect external knowledge and internal system data
- add governed evaluation for external skills, plugins, and frameworks before adoption

## Execution Rule

When the user provides new physical-world information, PMAIOS should:

1. update the organization or context profile if needed
2. decide which specialist agents must be engaged
3. decide whether learning guidance, external pattern scouting, or schema-driven UI work is required
4. generate or update the governed outputs
5. surface missing questions, risks, next actions, and recommended mental models

The system should not wait for the user to remember the correct artifact type first.
