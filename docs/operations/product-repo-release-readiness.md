# Product Repo Release Readiness

- version: v0.1
- date: 2026-05-21
- status: active

## Purpose

This document defines the non-page release boundary for PMOS v1.0.

It separates:

1. PMOS product repo content
2. business subproject content
3. local executor state
4. external cloud knowledge surfaces

## Product Repo Boundary

Keep in the PMOS product repo:

- `src/` platform runtime, CLI, backend, frontend shell, and shared schemas
- `docs/operations/` product, runtime, deployment, and governance truth sources
- `docs/memory/` runtime state needed for handoff when explicitly safe to share
- `cloud-mirror/` compact latest-state mirrors
- `config/` sample-safe provider and MCP registry shapes
- tests that validate platform behavior

Do not publish as product-core by default:

- business subproject implementation details under `subprojects/*`
- generated inbox assets that contain private customer or meeting content
- local `.env`, credentials, tokens, browser profiles, or absolute machine-specific state
- executor-local hidden memories under `~/.codex`

## Release Checklist

Before a product repo release:

1. regenerate `cloud-mirror/runtime-status.*`
2. run `npm run validate`
3. run `npm test`
4. review `git status --short` and exclude unrelated business subproject dirt
5. confirm document governance audit has no blocking active truth-source issue
6. generate `docs/release/product-repo-readiness-package.json` and `.md` with `npm run cli -- release readiness-package`
7. confirm release notes explain runtime baseline, product version, known partial tracks, and parked page work
8. push only after product-core files and generated mirrors are intentional

## GitHub Sharing Shape

Minimum shareable package:

- README / local runbook
- install and config sample
- current version progress
- v1.0 gap list and acceptance standard
- cloud sync layer contract
- runtime status mirror
- validation commands and known test caveats

## Current Known Caveats

- Root `npm test` is now scoped by `vitest.config.ts` to platform tests and excludes nested `subprojects/**` suites.
- Current verified platform gates for this slice:
  - `npm run validate`
  - `npm run build:backend`
  - `npm test`
- PMOS page / unified-entry rebuild is explicitly parked and should not block this non-page release slice.

## Acceptance

This track moves from `partial` to `partial-strong` when:

1. the product repo boundary is documented
2. release commands and caveats are explicit
3. cloud latest-state mirrors are part of the release package

It is `solved` only after a clean product-repo export, GitHub release path, and repeatable install/config/start flow are verified outside this working tree.

## Generated Package

Current generated package files:

- `docs/release/product-repo-readiness-package.json`
- `docs/release/product-repo-readiness-package.md`
