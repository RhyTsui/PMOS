# Ant Design Pro Isolated Adapter Layer

- version: v0.1
- date: 2026-05-11
- status: active
- scope: `Ant Design Pro / Pro Components` compatibility governance inside PMOS

## Purpose

This document prevents `Ant Design Pro` from leaking into the PMOS root runtime in a broken way.

PMOS must not fake compatibility by force-installing conflicting peer ranges.

Instead, `Pro` is governed through a separate isolated adapter layer.

## Current Compatibility Fact

Current known state:

- `@ant-design/x` requires `antd@6`
- `@ant-design/pro-components` still peers against `antd@5`

Therefore the PMOS root runtime must stay on:

`antd@6 + Ant Design X`

and must not directly add `@ant-design/pro-components` to the shared root dependency graph.

## Isolation Decision

PMOS now uses this split:

- root runtime:
  - `Ant Design X`
  - `Ant Design`
  - governed family packages already installed in root
- isolated adapter layer:
  - `Ant Design Pro`
  - `Pro Components`
  - compatibility study
  - pattern extraction
  - future migration track

## Allowed Usage Inside The Adapter Layer

`Pro` is allowed only for:

- enterprise pattern study
- layout/block comparison
- page-family reference extraction
- sandbox validation in an isolated package or disposable subproject
- migration notes
- component-equivalence mapping

## Forbidden Usage

Before compatibility converges, PMOS forbids:

- adding `@ant-design/pro-components` to the root `package.json`
- importing `Pro` components from root PMOS frontend code
- leaking `Pro`-specific CSS or runtime assumptions into the root app
- writing frontend specs that assume `Pro` is available in the root runtime
- using `--force` to pretend the root dependency graph is healthy

## Adapter Layer Output Contract

When a task touches `Pro`, the adapter layer must output all of:

- target page family
- why `Pro` is being evaluated
- which `Pro` patterns are being borrowed
- equivalent root-safe `Ant Design X / Ant Design` fallback
- compatibility risk
- rollback / removal path

## Recommended Isolation Shapes

Use one of these shapes, in order of preference:

1. standalone sandbox package with its own `package.json` and lockfile
2. disposable comparison subproject under `subprojects/`
3. design/reference-only artifact with no runtime dependency

Do not implement the adapter layer as a silent root import.

## Spec Rule

When `ui-schema`, `implementation-handoff`, or `delivery` artifacts mention `Pro`, they must explicitly say one of:

- `reference only`
- `isolated adapter layer`
- `blocked by compatibility`

They must not write `Pro` as the default page baseline.

## Exit Criteria

`Pro` can leave the isolated adapter layer only when all of these are true:

1. peer compatibility with the root `antd` major is healthy
2. build passes without forced installation
3. governed browser regression stays green
4. product specs are updated to show exactly where `Pro` is first-class and where it is still optional

## Testing Rule

Any adapter-layer experiment must prove:

- root runtime remains unaffected
- root build still passes
- root focused tests still pass
- any sandbox/package-specific test is clearly separated from root PMOS acceptance

## References

- `docs/operations/ant-design-family-platform-baseline.md`
- `docs/operations/pmaios-ant-design-family-frontend-design.md`
