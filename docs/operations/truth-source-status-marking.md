# Truth-Source Status Marking

- version: v0.1
- date: 2026-04-30
- status: active
- owner: product office

## Purpose

This document defines how PMAIOS marks truth-source status without relying on deletion as the primary mechanism.

The goal is:

1. keep exactly one current active path for a topic
2. preserve historical reasoning when useful
3. reduce retrieval pollution from obsolete or invalid documents
4. avoid accidental reuse of old product truth

## Core Rule

`single source of truth` does not mean every older file must be physically deleted.

It means:

- only one current path should be treated as active truth for the same decision scope
- older or narrower files must be explicitly downgraded
- default retrieval and operator judgment should prefer active truth

## Allowed Status Markers

### `active`

Use when:

- this file is current governed truth
- default retrieval should prefer it
- execution or planning may rely on it

### `superseded`

Use when:

- the file was once authoritative
- a newer file replaced it
- the history still matters

Required note:

- `superseded by`
- `date`
- `reason`

### `reference-only`

Use when:

- the file still has useful examples or planning context
- but it must not be treated as current decision truth

Typical examples:

- older backlog drafts
- comparative scans
- exploratory roadmaps

### `archived`

Use when:

- the file is kept for history only
- it should not appear in the default active operating chain

### `invalid`

Use when:

- the content is materially wrong or misleading
- keeping it active would create execution risk

Use sparingly.

## Default Handling Strategy

Preferred order:

1. mark
2. downgrade
3. archive
4. delete only when the artifact has no historical or diagnostic value

## Retrieval Rule

Default retrieval and operator judgment should prefer:

1. `active`
2. `reference-only`
3. `superseded`
4. `archived`

`invalid` should not be used as planning or execution input.

## v0.6 Usage

For `v0.6` truth sources:

- kernel architecture, gate system, task ssot, continuation runtime, Hermes global mapping:
  - `active`
- priority backlog after runtime implementation is complete:
  - `reference-only`

This allows PMAIOS to keep planning history without confusing it with current runtime truth.
