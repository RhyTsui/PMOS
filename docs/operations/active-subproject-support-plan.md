# Active Subproject Support Plan

- version: v0.4
- date: 2026-04-20
- status: active snapshot

## Purpose

This document summarizes the current visible progress of active subprojects and identifies where top-level product support should intervene next.

## Support Priority

1. `ad`
2. `knowledge-base`
3. `chokonu`
4. `mcp`
5. `data-service`
6. `server`

## knowledge-base

### Current Visible Progress

- Project-level workflow is the most complete among current subprojects.
- Research-first gate has been documented.
- PM submission contract has been documented.
- `WeKnora` adaptation research already has a usable first conclusion.

### Current Gaps

- competitor and open-source comparison is not finished
- internal capability inventory is not finished
- chief decision issue list is not finished

### Top-Level Support Needed

- keep enforcing research-first and architecture-first gates
- review the remaining research package once submitted
- use this project as the workflow rollout sample

## ad

### Current Visible Progress

- Business and demo direction has recent written updates.
- There is a visible month-end demo reset and narrowed scope.
- Long-term PRD and planning documents already exist.
- Project execution workflow now exists.
- PM task sheet now exists.

### Current Gaps

- raw input still needs explicit alignment to the platform `inbox` rule
- product artifacts are still fragmented across long-term and short-term documents

### Top-Level Support Needed

- push the project PM to submit against the new workflow and task sheet
- constrain month-end demo work to a governed product chain instead of ad hoc document drift

## chokonu

### Current Visible Progress

- The former `tracking-acceptance` project is now being normalized as `连弩-AI测试平台 / ChoKoNu`.
- The new canonical path is `subprojects/chokonu/`.
- Active README, metadata, workflow docs, planning docs, and review docs now point to `chokonu`.
- Historical `tracking-acceptance` material has been downgraded to background and legacy status.

### Current Gaps

- first-version platform scope is not yet fully converged
- several older analysis and product docs still need convergence against the new total-planning baseline
- delivery-brief outputs still need continued use in real downstream review

### Top-Level Support Needed

- continue converging active outputs to the ChoKoNu framing
- stop new work from landing under the old `tracking-acceptance` path
- drive the first real review cycle on the new planning, workflow, and version-review package

## mcp

### Current Visible Progress

- There is active shared-context work around MCP iteration planning and demand merge.

### Current Gaps

- this implementation round did not inspect project documents in detail
- workflow adoption status is not yet fully classified

### Top-Level Support Needed

- inspect MCP project docs next
- determine whether it needs full product-workflow adoption or a lighter planning loop

## data-service

### Current Visible Progress

- Project exists and is registered.

### Current Gaps

- no real product workflow artifacts
- no governed project product documents beyond a minimal docs README

### Top-Level Support Needed

- decide whether it remains an independent subproject or is absorbed as upstream support for `chokonu`
- if it remains active, add baseline workflow and PM contract

## server

### Current Visible Progress

- Mature product and version documents exist.
- Requirement and version thinking is already visible.

### Current Gaps

- not aligned to the common platform workflow
- no PM task sheet
- no sync contract

### Top-Level Support Needed

- decide whether `server` should receive full workflow adoption or remain under a lighter governance model

## Immediate Next Support Moves

1. push `ad` to submit its first governed demo execution package
2. keep `knowledge-base` moving by reviewing the remaining research package
3. drive the first real review cycle on `chokonu` active docs
