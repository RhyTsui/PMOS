# PMAIOS Gate System

- version: v0.3
- date: 2026-05-06
- status: active
- owner: product office

## Purpose

This document defines the unified gate system for `PMAIOS v0.6`.

The goal is to stop relying on scattered prompt instructions and service-specific checks.

Instead, PMAIOS should have a common gate runtime that decides:

- what must be checked before work continues
- what must be blocked
- what must be routed
- what must be written back

## Why Gates Are Needed

Without a unified gate system, PMAIOS still drifts in five ways:

1. repeated capability reinvention
2. skip-step delivery without upstream truth
3. wrong role doing the work
4. mature pipelines not being used consistently
5. outputs getting generated without repository-grade closure

Gates convert these from “should” into “must”.

## Gate Design Principles

Each gate must be:

1. explicit
2. observable
3. tied to a task record
4. able to pass / warn / block
5. connected to a concrete next action

Each gate check must record:

- gate id
- task id
- status
- reason
- evidence paths
- required next action

## Gate Status

- `pass`: work may continue
- `warn`: work may continue, but risk must be recorded
- `block`: work must not continue until the gate is resolved

## Gate Set

### Gate 1: Capability Discovery Gate

Question:

`Is this request already covered by an existing capability, skill, workflow, or governed output path?`

Block when:

- the system is about to create a new mechanism without checking existing capability paths

Pass condition:

- skill / capability / workflow search completed
- reuse / adapt / build decision recorded

Typical next action:

- reuse existing capability
- route to a known workflow
- explicitly justify new build

### Gate 2: Project Truth Gate

Question:

`Do the required upstream truth sources exist before design, schema, implementation, or release work continues?`

Block when:

- `product-definition-baseline` missing
- `requirement-baseline` missing
- `original-demand-review` missing where required

Pass condition:

- required truth-source outputs exist
- or auto-backfill has produced them

Typical next action:

- auto-backfill missing governed outputs

### Gate 3: Role Routing Gate

Question:

`Is the current actor the right role to continue, or must the task be routed to a specialist?`

Block when:

- current actor is crossing a specialist boundary without routing

Pass condition:

- correct specialist selected
- handoff recorded

Typical next action:

- route to research / design / review / delivery / architecture specialist

### Gate 4: Pipeline Gate

Question:

`Has the task hit a mature pipeline that must be used instead of ad hoc execution?`

Block when:

- request clearly belongs to a standard pipeline
- but work is proceeding as isolated one-off output generation

Pass condition:

- the task is attached to the correct pipeline chain

Typical next action:

- launch the appropriate pipeline

### Gate 5: Original Demand Review Gate

Question:

`Has the current solution been reviewed against the earliest imported demand and important user corrections, not only the converged requirement list?`

Block when:

- final design / schema / implementation output has no original-demand backcheck

Pass condition:

- `original-demand-review` exists
- major preserved / weakened / dropped items recorded

Typical next action:

- generate original-demand-review

### Gate 6: Production Content Gate

Question:

`Is this production UI output free from explanatory, pitch-style, and requirement-confirmation body copy?`

Block when:

- a `production` page includes explanatory content that belongs in docs / handoff / demo

Pass condition:

- page mode declared
- production-page content boundary respected

Typical next action:

- move explanatory content to docs / handoff
- keep production pages task-oriented

### Gate 7: Review Convergence Gate

Question:

`Has the required review level been reached for the risk level of this task?`

Block when:

- a high-risk output has not gone through the required review path

Pass condition:

- L0/L1 outputs have appropriate review evidence
- L3 outputs have deterministic multi-agent review evidence

Typical next action:

- trigger review committee or multi-agent review

### Gate 8: Asset Backwrite Gate

Question:

`Has this task written back the required organization or platform assets to repository truth?`

Block when:

- the result exists only in chat or transient runtime state

Pass condition:

- required reports / docs / outputs / reviews are persisted

Typical next action:

- write asset to governed repository path

### Gate 9: External Sync Safety Gate

Question:

`If the task changes an external system, has the change been staged safely through the sync envelope / outbox path?`

Block when:

- external writes bypass local truth and sync queue

Pass condition:

- local truth committed first
- external sync queued

Typical next action:

- enqueue sync instead of direct external mutation

### Gate 10: Design Confirmed Gate

Question:

`Has the current design-layer object been explicitly confirmed, and are the required upstream confirmation layers still valid?`

Block when:

- the current design-layer object has no formal confirmation record
- the current confirmation status is not `confirmed`
- an upstream required layer is still `pending`, `rework-required`, or `rejected`
- a superseded confirmation record is still being used to unlock downstream work

Pass condition:

- a valid `design-confirmation-record` exists
- the current layer is `confirmed`
- the prerequisite confirmation chain is still valid
- the confirmation record names the correct unblock target

Typical next action:

- create or update the confirmation record
- route the artifact to the required confirmer
- correct downstream status if an upstream confirmation was withdrawn or superseded

## Gate-to-Level Mapping

### L0

Required minimum:

- Gate 1
- Gate 2
- Gate 8

### L1

Required minimum:

- Gate 1
- Gate 2
- Gate 3
- Gate 8

### L2

Required minimum:

- Gate 1
- Gate 2
- Gate 3
- Gate 4
- Gate 5
- Gate 8

### L3

Required minimum:

- Gate 1
- Gate 2
- Gate 3
- Gate 4
- Gate 5
- Gate 7
- Gate 8
- Gate 9 when external writes exist
- Gate 10 when design-layer delivery, static HTML confirmation, or implementation handoff is involved

## Existing PMAIOS Rules To Absorb

These current rules should be folded into the gate runtime:

1. skip-step auto-backfill
2. original-demand review
3. production page content boundary
4. page mode declaration
5. design prompt pack before final image output
6. requirement-to-test trace
7. confirmation-chain governance and explicit confirmation status tracking

## Non-Goal

The gate system is not:

- a long static checklist
- a documentation-only appendix
- a human-only review memo

It is a runtime control layer.

## Acceptance Standard

The gate system is considered real only when:

1. Product Chief outputs record gate decisions
2. blocked tasks stop automatically
3. auto-backfill is triggered from gate failure, not only ad hoc logic
4. review evidence is linked to gate pass
5. the workspace can show gate state for a task
