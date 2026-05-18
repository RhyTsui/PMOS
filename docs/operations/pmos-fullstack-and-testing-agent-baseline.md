# PMOS Engineering Agent Baseline

- status: active
- date: 2026-05-12
- scope: PMOS platform and governed subprojects

## Purpose

This document promotes implementation and testing into first-class PMOS agent lanes.

PMOS should not stop at:

- Product Chief
- design / UI schema

It also needs governed default roles for:

- real implementation
- strict acceptance

## Best-Practice Signals

Industry practice is converging around a few stable ideas:

- architecture decisions should be reviewed before implementation starts, especially for high-cost or hard-to-reverse choices
- code review should stay scoped to change sets, with explicit reviewer ownership and clear approval rules
- historical code review should not brute-force the whole repo; it should target hotspots, low-health areas, and high-churn modules
- automated acceptance should block delivery, but should not replace architecture review or code review

Reference anchors:

- Google Engineering Practices: reviewer guidance
  - https://google.github.io/eng-practices/review/reviewer/
- GitHub pull request reviews
  - https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-a-pull-request/about-pull-request-reviews
- GitHub Copilot code review limits and responsible use
  - https://docs.github.com/en/copilot/responsible-use/code-review
- GitLab merge request approvals / CODEOWNERS
  - https://docs.gitlab.com/user/project/merge_requests/approvals/
  - https://docs.gitlab.com/user/project/codeowners/
- Sonar Clean as You Code
  - https://docs.sonarsource.com/sonarqube-server/latest/user-guide/clean-as-you-code/

## New Default Agent Lanes

### 1. Architecture Lane

Role:

- `Architecture Designer Agent`

Responsibility:

- review one-way-door decisions before coding starts
- force explicit boundaries, dependencies, and integration contracts
- produce architecture notes / ADR-ready conclusions for implementation handoff
- decide whether work can stay repo-local or must introduce platform/runtime seams

### 2. Fullstack Builder Lane

Role:

- `Fullstack Builder Agent`

Responsibility:

- turn governed outputs into runnable code
- scaffold frontend mother-repos
- create CRUD feature packages
- wire api-client / service-config / mock seams
- prepare real backend hookup
- close delivery scripts and CI gates

### 3. Incremental Code Review Lane

Role:

- `Code Review Agent`

Responsibility:

- review only the scoped implementation change set
- check correctness, regressions, complexity, test coverage, and requirement traceability
- verify builder output matches architecture and handoff contracts
- produce fix-required vs optional findings before testing acceptance

### 4. Historical Code Review Lane

Role:

- `Historical Code Review Agent`

Responsibility:

- audit old code outside the current change set
- prioritize hotspots, high churn, fragile modules, and low health legacy seams
- separate long-term technical debt from current delivery blockers
- generate remediation queues instead of blocking every delivery on full legacy cleanup

Review mode:

- not PR review
- not line-by-line whole-repo reading
- hotspot-first and risk-first review
- should emit remediation queue candidates that can be routed into roadmap / debt backlog work

### 5. Testing Acceptance Lane

Role:

- `Testing Acceptance Agent`

Responsibility:

- run strict automated checks
- block incomplete delivery
- validate browser/runtime behavior
- enforce anti-demo and acceptance rules
- provide real pass/fail evidence before user review

## Why This Exists

Earlier PMOS mainline was stronger on:

- product governance
- design governance

But weaker on turning those truths into repeatable architecture, implementation, review, and acceptance.

This baseline closes that gap.

## Workflow Position

These lanes sit after upstream truth is ready:

`product / requirement / design -> architecture -> fullstack builder -> code review -> testing acceptance -> user review`

## Callable Skills

The active repo-callable skills for this chain now are:

- `pmos-architecture-designer`
- `pmos-fullstack-builder`
- `pmos-code-review`
- `pmos-historical-code-review`
- `pmos-testing-acceptance`

## Governed Output Templates

The engineering lanes should not stay at the role or skill layer only. They also need explicit governed output entry points:

- `architecture-decision-record`
  - template: `docs/templates/architecture_decision_record_template.md`
  - owner skill: `pmos-architecture-designer`
- `code-review-brief`
  - template: `docs/templates/code_review_brief_template.md`
  - owner skill: `pmos-code-review`
- `historical-code-review-brief`
  - template: `docs/templates/historical_code_review_brief_template.md`
  - owner skill: `pmos-historical-code-review`

`architecture-decision-record` and `code-review-brief` are direct upstream dependencies for `implementation-handoff`.

`historical-code-review-brief` is a governed follow-up output for hotspot and legacy-risk tracking. It should not be confused with the blocking current-diff review lane.

When Product Chief generates this output, PMOS should also create a remediation-tracking requirement so historical findings enter roadmap / backlog governance instead of staying buried inside the review artifact.

## Rule

Do not treat architecture, implementation, review, or testing as implicit side effects of Product Chief or design work.

They must be explicit governed lanes with:

- their own role identity
- their own skills
- their own output contract

## Code Review Split Rule

PMOS should keep two different review tracks:

1. incremental code review
   - for the current delivery diff
   - blocks merge / acceptance when critical findings exist

2. historical code review
   - for old code, hotspots, design debt, and structural drift
   - feeds roadmap / debt backlog / architecture remediation
   - does not replace current diff review
