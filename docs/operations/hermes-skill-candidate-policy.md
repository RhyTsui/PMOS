# Hermes Skill Candidate Policy

- version: v0.1
- date: 2026-04-21
- status: active

## Purpose

This document records the current rule for externally installed Codex skills that should be visible to PMAIOS product work.

The current rule is:

- install them into the local Codex skills directory
- register them in PMAIOS `skills/registry.json`
- allow Product Chief and skill discovery to recommend them
- do **not** make them globally forced defaults
- Hermes should treat them as candidate skills and decide whether they are worth proposing in context

## Current Installed External Skills

### 1. `follow-builders`

- source repo: `zarazhangrui/follow-builders`
- installed path: `~/.codex/skills/follow-builders`
- main use:
  - AI builder tracking
  - podcast / blog / X digest generation
  - product intelligence and industry signal collection

Recommended PMAIOS usage:

- industry research
- trend scanning
- daily / weekly intelligence inputs
- candidate backlog discovery for PMAIOS and active subprojects

### 2. `fireworks-tech-graph`

- source repo: `yizhiyanhua-ai/fireworks-tech-graph`
- installed path: `~/.codex/skills/fireworks-tech-graph`
- main use:
  - architecture diagram generation
  - data flow / sequence / flowchart output
  - SVG + PNG technical visuals

Recommended PMAIOS usage:

- architecture confirmation docs
- first-version planning docs
- workflow and action-chain diagrams
- visual planning artifacts for subprojects

## Decision Rule

These skills are not mandatory in every flow.

Current decision principle:

1. `follow-builders`
Use when the work needs fresh industry inputs, builder patterns, or signal collection.

2. `fireworks-tech-graph`
Use when the work requires architecture diagrams, workflow diagrams, data-flow diagrams, or other technical visuals.

3. If a task does not benefit from these skills, Hermes should not push them just because they exist.

## Current Runtime Reality

Current PMAIOS runtime still has this guardrail:

- Hermes is `enhance-only`
- Hermes cannot directly route or hard-force workflow execution

So the practical effect today is:

- the skills are installed locally
- the skills are visible through `skills/registry.json`
- Product Chief / skill discovery can recommend them
- Hermes can reference them as candidate enhancements in policy and planning guidance

Future `v0.5` work may strengthen Hermes so it can make stronger orchestration decisions, but this file does not assume that work is already complete.

## Operational Note

To use newly installed Codex skills in future Codex sessions, restart Codex after installation.
