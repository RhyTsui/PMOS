# PMAIOS v0.6 Kernel Architecture

- version: v0.2
- date: 2026-04-30
- status: active
- owner: product office

## Purpose

This document defines the `v0.6` kernel architecture for PMAIOS.

`v0.5` solved the governance baseline of the product workflow.
`v0.6` must turn that baseline into a runtime kernel for autonomous multi-agent collaboration and output closure.

The target is not:

- more prompts
- more pages
- more output types

The target is:

`make collaboration, review, state progression, and asset backwrite run as default operating logic`

## Version Judgment

### v0.5 solved

- governed Product Chief outputs
- requirement / version / review trace
- design-to-frontend truth-source backfill
- original-demand review
- production-page content boundary
- product-method baseline

### v0.6 must solve

- autonomous agent orchestration
- gate-based collaboration control
- task-state source of truth
- continuous output progression without manual step-by-step prompting
- external-sync-safe operating model
- scheduler-backed long-chain execution

## Kernel Definition

`PMAIOS Kernel` is the runtime layer that decides:

1. what the current work unit is
2. which gate checks are required
3. which agent owns the next action
4. whether the task can continue automatically
5. what artifacts must be written back before the task is considered complete

It must sit below:

- Product Chief
- specialist agents
- governed outputs
- frontend workspace
- external connectors

and above:

- storage
- workflow services
- provider routing
- execution runtime

## Kernel Layers

### 1. Intent Layer

Responsible for:

- parsing the user request
- mapping it to a work unit
- classifying risk and scope
- deciding whether the path is `L0 / L1 / L2 / L3`

Main outputs:

- normalized task intent
- collaboration level
- required gates
- required truth sources

### 2. Task SSOT Layer

Responsible for:

- storing task identity and state
- tracking stage progression
- linking original demand, product requirement, outputs, review records, and versions
- acting as the authoritative task state instead of chat memory

Main outputs:

- task record
- stage record
- agent ownership
- evidence links
- sync state

### 3. Gate Runtime Layer

Responsible for:

- checking whether the next action is allowed
- blocking skip-step execution
- forcing role routing
- forcing pipeline launch
- forcing asset backwrite

This is the decision-control layer of the kernel.

### 4. Collaboration Runtime Layer

Responsible for:

- dispatching work to Product Chief or specialists
- controlling handoff between roles
- determining when multi-agent review is mandatory
- aggregating intermediate outputs

Main outputs:

- assigned owner agent
- handoff contract
- review participants
- convergence result

### 5. Output Progression Layer

Responsible for:

- advancing from brief to final package
- backfilling missing upstream outputs automatically
- keeping output generation continuous unless a real gate blocks it

Examples:

- brief -> analysis -> product-definition -> requirements -> design prompt pack -> schema -> handoff
- brief -> analysis -> original-demand-review -> implementation handoff

### 6. Asset Backwrite Layer

Responsible for:

- writing reports, outputs, reviews, and method assets back to repository truth
- ensuring company-level or platform-level conclusions are persisted
- marking work incomplete if the required asset was not written back

### 7. External Sync Outbox Layer

Responsible for:

- staging external writes after local truth is committed
- retrying failed writes
- preserving receipts and sync evidence
- preventing mirrors from overwriting local truth

### 8. Autonomous Scheduler Layer

Responsible for:

- running long-chain work without repeated user nudges
- handling retries and cooldowns
- enforcing quotas and concurrency boundaries
- resuming suspended chains safely

## Core Runtime Objects

`v0.6` should standardize at least these objects:

1. `Task`
   the top-level work unit
2. `TaskStage`
   the current stage in the chain
3. `GateCheck`
   a decision record for a gate
4. `AgentAssignment`
   owner and collaborating agents
5. `HandoffContract`
   what the next role receives and must produce
6. `Artifact`
   report, spec, review, schema, or handoff asset
7. `SyncEnvelope`
   a queued external write
8. `SchedulerRun`
   a resumable autonomous execution record

## Collaboration Levels

### L0 Direct Execution

Use when:

- low risk
- single role
- no missing truth sources
- no cross-role dispute

Default owner:

- Product Chief or a single specialist

### L1 Role Routing

Use when:

- a specialized domain is clearly hit
- the current actor should not proceed alone

Default action:

- route to specialist agent

### L2 Contract Collaboration

Use when:

- multiple roles are required in sequence
- design / engineering / review must align through a contract

Default action:

- create handoff contract and continue

### L3 Multi-Agent Review

Use when:

- architecture boundary
- release risk
- system-wide governance impact
- high-blast-radius change

Default action:

- require deterministic multi-agent review before completion

## Completion Rule

A task is not complete because:

- the assistant answered
- a design was generated
- a frontend draft exists

A task is complete only when:

1. required gates passed
2. required truth sources exist
3. required downstream outputs were generated
4. required review records exist
5. required repository assets were written back
6. required external sync, if any, reached an acceptable state

## Product Meaning

This architecture changes PMAIOS from:

`a governed AI Product Office`

into:

`a kernelized product-delivery operating system`

That is the real `v0.6` jump.

## Next Documents

This kernel architecture depends on:

1. `docs/operations/pmaios-gate-system.md`
2. `docs/operations/pmaios-task-ssot-and-outbox.md`

Implementation should not begin without those two documents aligned.

## v0.6 Addendum: Continuation And Global Optimization

`v0.6` 现在还需要明确补两层平台能力：

### 9. Project Continuation Layer

Responsible for:

- keeping each active project attached to a visible mainline
- preserving next safe step across turns
- parking side lines without losing them
- preventing summaries or side questions from silently ending the mainline

Main outputs:

- active mainline
- next safe step
- parked lines
- blocker state
- resume anchor

### 10. Hermes Global Optimization Layer

Responsible for:

- latest-information integration
- candidate comparison
- keep / replace / park / promote judgment
- promoting default changes into governed truth sources
- watching whether current defaults have become stale

Main outputs:

- optimization brief
- comparison result
- promoted default decision
- stale-default watch item

### Additional Core Runtime Objects

`v0.6` 应额外补齐：

9. `MainlineAnchor`
   the currently active project-continuation anchor
10. `HermesDecision`
   a structured keep / replace / park / promote judgment

### Architectural Meaning

这意味着 `v0.6` 不再只解决：

- autonomous agent orchestration
- output closure

它还要开始解决：

- project continuation
- global optimization

as default operating logic.

### 11. Official External Baseline Mapping

`v0.6` should not absorb outside agent-system ideas casually.

For OpenAI-originated agent/runtime/eval material, PMAIOS should use a governed mapping rule:

- `Agents SDK` -> kernel / handoff / trace baseline
- `Agent evals` + `Evals API` -> final-state validation and Hermes baseline
- `Symphony` -> scheduler-run / isolated work-run / proof-of-work baseline
- `Swarm` -> conceptual reference only, not production baseline

Reference:

- `docs/operations/openai-official-content-to-pmaios-mapping.md`
