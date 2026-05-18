# Ant Design Family Platform Baseline

- version: v0.1
- date: 2026-05-11
- status: active
- scope: PMOS global design system, frontend implementation baseline, component-family governance

## Purpose

This document defines how the full Ant Design family is used inside PMOS.

The goal is not to casually reference the Ant Design ecosystem in prompts only.

The goal is to make it the governed source for:

- component-library choice
- design-language choice
- frontend implementation basis
- visualization basis
- mobile and mini-program target baselines
- icons, colors, motion, and styling conventions

## Official Source Entry

- GitHub org: `https://github.com/ant-design`
- AI interface solution: `https://x.ant.design/`

## PMOS Baseline Decision

PMOS now treats the Ant Design family as the default component and design-system ecosystem.

Current PMOS default:

- frontend host framework: `x.ant.design / Ant Design X`
- foundational component layer: `Ant Design`
- icon system: `@ant-design/icons`
- styling solution: `antd-style`
- color system: `@ant-design/colors`
- chart system: `@ant-design/charts`
- mobile target baseline: `antd-mobile`
- mini-program target baseline: `antd-mini`

## Installed Root Runtime Packages

The root PMOS runtime now carries these packages:

- `antd`
- `@ant-design/x`
- `@ant-design/icons`
- `antd-style`
- `@ant-design/colors`
- `@ant-design/charts`
- `antd-mobile`
- `antd-mini`

These are the currently installed and test-backed packages in the PMOS root workspace.

## Family Mapping

### 1. Core Web Runtime

- `x.ant.design / Ant Design X`
  - default frontend host and AI interface baseline
- `Ant Design`
  - foundational enterprise components used through governed bindings
- `antd-style`
  - styling and token-oriented implementation helper

### 2. Enterprise Solution Layer

- `Ant Design Pro`
- `Pro Components`

Use case:

- enterprise templates
- management-console patterns
- advanced business blocks

Current PMOS status:

- `compatibility-governed`
- not installed into the root runtime yet

Reason:

- current `@ant-design/x` requires `antd@6`
- current `@ant-design/pro-components` still peers against `antd@5`
- forcing both into the same root runtime would create a knowingly broken dependency graph

Therefore PMOS treats `Pro` as:

- reference architecture
- pattern source
- future compatibility track
- isolated adapter layer only

not as a forced root dependency until the peer range converges.

Adapter-layer rule:

- see `docs/operations/ant-design-pro-isolated-adapter-layer.md`
- any `Pro` usage must stay outside the root runtime until compatibility converges

### 3. Mobile and Mini Targets

- `antd-mobile`
  - default React mobile component baseline when PMOS output targets mobile web/app surfaces
- `antd-mini`
  - default mini-program component baseline when PMOS output targets mini-program delivery

### 4. Data Visualization

- `@ant-design/charts`
  - default chart layer for PMOS analytics, dashboards, and runtime telemetry surfaces

### 5. Design Resources

- `@ant-design/icons`
  - official icon library
- `@ant-design/colors`
  - official palette system
- `Ant Motion`
  - motion-spec reference and animation-language source

### 6. Tooling and Style

- `antd-style`
  - default style-system helper
- `ant-design-icons-cli`
  - reference tooling track for future icon-governance automation

## Runtime Rule

PMOS frontend work should now assume:

1. the page host is `x.ant.design / Ant Design X`
2. foundational business widgets may still bind to `Ant Design` components
3. charts should prefer `@ant-design/charts`
4. icons should prefer `@ant-design/icons`
5. colors should inherit from `@ant-design/colors`
6. styles and tokens should remain compatible with `antd-style`

## Delivery Rule

When Product Chief, UI schema, handoff, or frontend implementation artifacts describe the component baseline, they should default to:

`Ant Design family ecosystem`

and then narrow down by surface:

- `Ant Design X` as host
- `Ant Design` for foundational widgets when appropriate
- `Charts` for visualization
- `Mobile` for mobile targets
- `Mini` for mini-program targets

## Compatibility Governance

Current known compatibility gap:

- `@ant-design/x` wants `antd@6`
- `@ant-design/pro-components` is still on `antd@5` peer range

PMOS rule:

- do not use `--force` to fake a healthy root runtime
- record the incompatibility explicitly
- keep `Pro` as a governed compatibility track until peer ranges align

## Testing Rule

A baseline switch is not considered landed unless all of the following pass:

- root build
- focused runtime/unit regression
- real browser regression against a real PMOS page

## Current Landing Status

- root runtime packages installed
- PMOS frontend entry now runs under `ConfigProvider + AntdApp`
- existing PMOS browser regression chain remains green
- `Pro` compatibility track remains explicitly blocked, not silently ignored
