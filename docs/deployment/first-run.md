# PMOS First Run Guide

- version: v0.1
- date: 2026-05-09
- status: active

## 1. Purpose

This guide defines the minimum first-run path for the standalone `PMOS product repo`.

It is written for a new operator on a new machine who does not share the original development session context.

## 2. What You Need Before Starting

1. Node.js 22+
2. npm
3. Git
4. A local `.env` created from `.env.example`

Optional for external integrations:

1. Notion credentials
2. Provider API keys
3. Figma credentials

## 3. Initial Setup

1. Clone the `PMOS product repo`
2. Install dependencies
3. Copy `.env.example` to `.env`
4. Fill only the variables you actually need

Recommended initial rule:

1. Start with `mock` or the simplest available provider
2. Do not block first boot on every external connector being ready

## 4. Minimum Commands

Install:

```bash
npm install
```

Lint:

```bash
npm run lint
```

Test:

```bash
npm run test
```

Run development stack:

```bash
npm run dev
```

Run production-like local build:

```bash
npm run build
npm start
```

## 5. Minimum First-Run Checks

After startup, confirm:

1. frontend opens successfully
2. backend API responds successfully
3. active version truth docs are readable
4. at least one workflow surface can be loaded
5. review / proof / runtime panels do not hard-fail

## 6. Truth Docs To Read First

1. `docs/operations/platform-truth-source-index.md`
2. `docs/operations/current-version-progress.md`
3. `docs/operations/pmaios-v1.0-direction.md`
4. `docs/operations/v1.0-product-version-program.md`
5. `docs/operations/v1.0-acceptance-standard.md`

## 7. Cloud Knowledge Setup

After local boot is stable:

1. connect GitHub as the primary cloud knowledge source
2. connect Notion as the operator cockpit mirror
3. confirm `cloud-mirror` sample structure is understood
4. later replace sample mirror files with real generated mirror objects

## 8. What Not To Assume

1. Do not assume business subprojects are bundled into the product repo
2. Do not assume local chat history exists
3. Do not assume private codex configuration is available
4. Do not assume every external connector must be working on first boot

## 9. First-Run Success Criteria

The first run counts as successful when:

1. the app starts
2. the operator can read current platform truth
3. the operator can identify the current `v1.0` mainline
4. the repository can proceed without hidden local-only knowledge
