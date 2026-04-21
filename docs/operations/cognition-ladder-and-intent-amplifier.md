# Cognition Ladder And Intent Amplifier

- version: v0.1
- date: 2026-04-21
- status: draft
- scope: v0.5 candidate cognition mechanism

## Purpose

This document defines how PMAIOS should avoid staying trapped inside the surface wording of a user idea.

The system should:

- identify intent behind the current expression
- strengthen the idea before execution
- expand upward, downward, outward, and deeper when useful
- help the user grow a living cognition map over time

## Core Principle

Do not optimize around the user's current sentence.

Optimize around:

- the likely purpose behind it
- the broader system goal it serves
- the best available route under current context

## Three Linked Mechanisms

### 1. Intent Recognition

Before reacting to an idea, identify:

- what the user is trying to achieve
- what frustration or risk the user is actually pointing at
- what larger goal this idea serves
- whether the idea is local, structural, or strategic

### 2. Intent Amplifier

Once intent is recognized, expand it through four directions:

- upward expansion
- downward execution
- lateral connection
- deep research

### 3. Cognition Map Thread

During ongoing conversation, continuously extract:

- concepts
- principles
- methods
- frameworks
- constraints
- risks
- candidate research topics

These should not remain buried inside chat turns.

## Upward Expansion

Upward expansion helps convert a local point into a higher-order frame.

Examples:

- feature -> product capability
- product capability -> strategy
- strategy -> business model
- business model -> ecosystem role
- ecosystem role -> organizational method

## Downward Execution

Downward execution should not stop at "what can be done today".

It should also support product-delivery decomposition:

- research
- planning
- design
- Figma
- frontend demo
- backend architecture
- backend demo
- full-stack demo
- deployable version

## Lateral Connection

Lateral connection should ask:

- what other subprojects does this affect
- what existing capabilities can be reused
- what open-source or external tools already solve part of this
- what adjacent methods or patterns are relevant

## Deep Research

Not every topic deserves a deep research document.

But large, recurring, or strategic topics should often produce one.

A deep research document is useful when:

- the topic will recur
- the topic affects multiple projects
- physical-world constraints matter
- the user may later inject more context
- the topic has multiple possible routes and requires stronger comparison

## Cognition Asset Types

The cognition thread should at least support these asset types:

1. concept
2. principle
3. method
4. framework
5. problem definition
6. judgment standard
7. collaboration rule
8. priority preference
9. boundary or constraint
10. risk / anti-pattern
11. candidate topic
12. deep research topic
13. open question
14. physical-world clue
15. productizable capability
16. platform-rule candidate

## Visibility Levels

Not every extracted cognition asset should interrupt the user.

Use three levels:

### L1. Archive Only

Low-cost extraction stored for future graphing.

### L2. Human Visible

Show as part of a real-time cognition surface because it likely helps the user think better now.

### L3. Promote To Truth

Upgrade into:

- platform rule
- method card
- deep research topic
- project board update
- version candidate

## Default Output Structure For Important Ideas

For important ideas, the system should be able to output:

1. detected intent
2. what is correct in the current idea
3. what is incomplete or risky
4. upward expansion
5. downward execution ladder
6. lateral connections
7. deep research candidate
8. recommended next action

## Human Value

The target is not "better notes".

The target is:

- a living cognition map
- higher-quality follow-up ideas from the user
- stronger combination of AI reasoning and physical-world feedback

## Suggested First Implementation Order

1. define extraction schema
2. define asset types and promotion rules
3. define real-time human-visible surface
4. define graph-ingestion path
5. link promoted cognition assets to boards, docs, and version flow
6. add a daily conversation digestion pass that summarizes the day's dialogue into rule / method / skill / deep-research candidates

## Related Template

- `docs/templates/cognition_asset_template.md`
- `docs/operations/daily-conversation-digestion-and-methodology-distillation.md`
