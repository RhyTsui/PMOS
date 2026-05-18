# PMAIOS Task SSOT And Outbox

- version: v0.2
- date: 2026-04-30
- status: active
- owner: product office

## Purpose

This document defines the missing state foundation for `PMAIOS v0.6`:

1. `Task SSOT`
2. `External Sync Outbox`

`v0.5` already has strong document truth.
`v0.6` needs task truth and sync truth.

## Problem Statement

Current PMAIOS tracks many useful artifacts:

- requirements
- versions
- outputs
- reviews
- checkpoints
- mcp-context tasks

But it still lacks a single authoritative task-state layer that can answer:

1. what is the current work unit
2. who owns it
3. which stage it is in
4. which gates have passed
5. which outputs exist
6. which reviews exist
7. whether external systems were updated safely

This is why autonomous closure is still partial.

## Task SSOT Definition

`Task SSOT` is the authoritative state model for a PMAIOS work unit.

It does not replace document truth.

It complements document truth by answering:

- state
- ownership
- progression
- gate status
- sync status

## Core Objects

### Task

Required fields:

- `taskId`
- `sourceType`
- `sourceRef`
- `originalDemandRefs`
- `subprojectId`
- `title`
- `summary`
- `collaborationLevel`
- `status`
- `currentStage`
- `currentOwnerAgentId`
- `createdAt`
- `updatedAt`

### TaskStage

Required fields:

- `taskId`
- `stageId`
- `status`
- `ownerAgentId`
- `startedAt`
- `completedAt`
- `blockedReason`

### GateCheck

Required fields:

- `taskId`
- `gateId`
- `status`
- `reason`
- `evidencePaths`
- `checkedAt`

### ArtifactLink

Required fields:

- `taskId`
- `artifactType`
- `artifactId`
- `artifactPath`
- `roleInTask`

Examples of `roleInTask`:

- `upstream-truth`
- `working-output`
- `review-evidence`
- `final-delivery`

### AgentAssignment

Required fields:

- `taskId`
- `agentId`
- `role`
- `assignmentType`
- `status`

Examples of `assignmentType`:

- `owner`
- `support`
- `reviewer`

### SyncEnvelope

Required fields:

- `syncId`
- `taskId`
- `entityType`
- `entityId`
- `targetSystem`
- `action`
- `payloadRef`
- `status`
- `retryCount`
- `maxRetries`
- `scheduledAt`
- `completedAt`
- `receiptRef`
- `error`

## Canonical States

### Task status

- `draft`
- `active`
- `blocked`
- `in_review`
- `ready_for_delivery`
- `completed`
- `failed`

### Sync status

- `pending`
- `processing`
- `completed`
- `failed`
- `dropped`

## Relationship To Existing PMAIOS Truth

### Documents remain authoritative for content

Use documents for:

- what the requirement says
- what the design says
- what the review says
- what the version says

### Task SSOT becomes authoritative for progression

Use Task SSOT for:

- what is currently in motion
- what can continue
- what is blocked
- what still has missing review
- what still owes backwrite or sync

## Outbox Principle

External systems must not become the source of truth.

The correct order is:

1. update local task and local governed artifact
2. create sync envelope
3. scheduler processes external write
4. receipt or failure is written back

This prevents:

- external mutation without repository trace
- mirror drift
- sync failure hiding
- accidental loss of authoritative local state

## Supported Future Targets

The outbox model should be target-agnostic.

Examples:

- Notion
- Figma
- issue trackers
- test platforms
- release systems
- documentation portals

## Retry And Recovery Rules

### Retry

Minimum fields:

- retry count
- max retries
- next scheduled time
- last error

### Recovery

A failed sync should support:

- retry same payload
- cancel and mark dropped
- rewrite payload and requeue

### Receipt

Whenever possible, persist:

- external id
- external url
- completion timestamp

## Minimal v0.6 Adoption Path

### Phase 1

Create Task SSOT records for Product Chief initiated work.

Must support:

- task identity
- stage status
- gate checks
- artifact links

### Phase 2

Attach autonomous output progression to Task SSOT.

Must support:

- current owner
- next stage resolution
- blocked / ready transitions

### Phase 3

Add sync envelope outbox for real external integrations.

Must support:

- queue
- retry
- receipt
- failure visibility

## Acceptance Standard

This foundation is real only when:

1. a task can be resumed from Task SSOT without relying on chat memory
2. the workspace can show stage and gate state from Task SSOT
3. external writes no longer bypass local truth
4. failed syncs are visible and retryable
5. autonomous execution can pause and resume against the same task record

## Design Judgment

Without Task SSOT and Outbox:

- `v0.6` remains an aspiration

With Task SSOT and Outbox:

- `v0.6` becomes a real operating-system upgrade
