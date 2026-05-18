---
name: pmos-historical-code-review
description: Use this skill whenever PMOS work needs historical code review on legacy hotspots, fragile old modules, repeated drift, or long-term remediation queues without confusing that work with incremental diff review.
---

# PMOS Historical Code Review Skill

## Goal

Make historical code review a governed follow-up lane instead of letting legacy risk vanish after current-scope delivery closes.

## Scope

Use this skill when the task includes:

- hotspot-first review of old code outside the current diff
- fragile legacy seams discovered during implementation or review
- repeated failures or historical drift across iterations
- long-term remediation queue generation
- architecture debt or low-health module assessment

## Non-goals

Do not use this skill for:

- current diff incremental code review
- blocking every delivery on whole-repo cleanup
- replacing testing acceptance

## Required Reading

1. `AGENTS.md`
2. `docs/operations/startup-whoami.md`
3. `docs/operations/product-workflow-total-design.md`
4. `docs/operations/pmos-fullstack-and-testing-agent-baseline.md`
5. relevant architecture record, incremental review brief, and implementation handoff
6. the legacy hotspot code actually under discussion

## Workflow

1. Clarify why historical review was triggered:
   - hotspot
   - repeated fragility
   - low-health legacy seam
   - architecture drift
2. Review old code with hotspot-first scope, not brute-force whole-repo reading.
3. Separate findings into:
   - immediate delivery risk
   - non-blocking historical debt
   - remediation queue candidates
4. Convert persistent historical issues into explicit follow-up work instead of mixing them into current diff review.
5. Escalate only when historical risk creates a real current delivery blocker.

## Review Rule

Historical code review is a debt-governance lane, not a replacement for incremental review.

It should answer:

- what legacy hotspot was audited
- what historical risk still exists
- what must be turned into remediation work
- whether any old-code issue has become an immediate blocker now

## Output Contract

Every historical review should make explicit:

- audited hotspot scope
- old-code findings
- immediate delivery risks
- non-blocking debt items
- remediation queue candidates
- roadmap / backlog follow-up recommendation

## Output Classification

At close-out, report:

1. what old scope was reviewed
2. what is immediately risky now
3. what belongs in remediation backlog
4. what architecture or ownership follow-up is needed
5. whether the current delivery remains unblocked
