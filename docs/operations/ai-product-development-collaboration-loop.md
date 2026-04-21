# AI Product-Development Collaboration Loop

- version: v0.1
- date: 2026-04-21
- status: draft
- scope: v0.5 candidate implementation blueprint

## Purpose

This document defines the target collaboration loop in which product, development, and testing all operate through governed AI-generated artifacts instead of fragmented handoff by chat, memory, or ad hoc documents.

The goal is not simply "use AI in each role", but to create a traceable, versioned loop:

`product AI -> aicoding implementation -> AI testing validation -> release -> AI regression`

## Target Loop

### 1. Product AI Layer

Product-side AI should generate and maintain:

- demo validation artifacts
- demo presentation artifacts
- post-demo requirement documents
- current-system change notes
- related SVG boards
- version-scoped requirement package

These outputs should be separated into:

- human-facing package
- AI-facing package

But they must remain strongly linked.

### 2. Development Reimplementation Layer

Development should not directly treat the product demo as the production system.

Instead:

- product AI outputs define intent, interaction, boundary, and acceptance
- `aicoding` reimplements the system in a governed full-stack engineering form
- implementation remains versioned and testable

### 3. AI Testing Validation Layer

AI testing should validate before release:

- whether the implementation matches requirement intent
- whether key flows still work
- whether change impact introduced regression risk
- whether the demo and implementation still align where alignment matters

### 4. Post-Release Regression Layer

After release, the AI testing platform should own continuous regression evaluation:

- smoke
- key scenario replay
- acceptance flow checks
- change-impact regression
- baseline drift alerts

## Standard Artifact Packages

### A. Product Output Package

Minimum required artifacts:

- `project-board.svg`
- `roadmap-board.svg`
- `decision-board.svg`
- requirement package
- demo validation note
- current-system change note
- version requirement doc

Optional artifacts:

- `user-flow-board.svg`
- `acceptance-board.svg`
- research note
- deep research doc

### B. Implementation Package

Minimum required artifacts:

- engineering repo or implementation branch
- architecture note
- API contract note
- change summary
- deployment assumptions

### C. Testing Package

Minimum required artifacts:

- validation scenario set
- AI testing execution result
- regression baseline reference
- pass/fail summary
- linked defects or mismatches

### D. Version Package

Minimum required artifacts:

- version goal
- version scope
- version diff
- version approval status
- trace links to product, implementation, and testing packages

## Strong-Link Model

Every artifact package should remain linked.

Examples:

- requirement item -> impacts -> demo board
- requirement item -> impacts -> implementation package
- implementation change -> validated by -> testing package
- release version -> regressed by -> AI testing platform run
- demo package -> reimplemented as -> implementation package

## Automation Targets

### 1. Requirement Change Propagation

When a requirement changes, the system should identify affected:

- demo assets
- requirement docs
- SVG boards
- implementation contracts
- version records
- testing scenarios

The target is not full blind auto-regeneration by default.

The target is:

- automatic impact detection
- automatic dirty marking
- guided regeneration and sync

### 2. Product-To-Engineering Contract Generation

The system should help convert product outputs into an implementation-ready contract:

- domain boundary
- page/route/view structure
- API candidates
- data assumptions
- acceptance scenarios

### 3. Testing Asset Regeneration

When version or requirement changes occur, the system should update:

- scenario list
- regression pack
- acceptance focus
- changed-flow validation scope

## Separation Rules

### Demo Vs Formal Implementation

The product demo is:

- validation-oriented
- explanation-oriented
- decision-support-oriented

The formal implementation is:

- maintainable
- versioned
- testable
- deployable

Hard rule:

Do not silently let the demo slide into the formal implementation without a governed reimplementation step.

### Human-Facing Vs AI-Facing

Human-facing artifacts optimize for:

- readability
- explanation
- approval
- sharing

AI-facing artifacts optimize for:

- structure
- traceability
- regeneration
- graph ingestion

Hard rule:

Separate them, but do not let them become separate truths.

## What Must Be Improved To Make This Real

### 1. Artifact Contract Standardization

Product, engineering, testing, and version packages need stable contract templates.

### 2. Change Impact Automation

Requirement changes must automatically mark affected downstream artifacts.

### 3. Testing Integration Point Shift

Testing should move earlier into the loop, not only after release.

### 4. Version-Centric Governance

Every major product/engineering/testing cycle should resolve into version trace.

### 5. Board And Document Sync

SVG boards, requirement docs, change notes, and version docs must stay mutually aligned.

## Suggested First Implementation Order

1. define artifact package templates
2. define change-impact mapping
3. define product-to-aicoding contract
4. define AI testing input contract
5. connect regression outputs back into version trace
