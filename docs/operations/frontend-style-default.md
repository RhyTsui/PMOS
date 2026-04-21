# Frontend Default Style

- status: active
- date: 2026-04-20
- applies-to: all subprojects unless an existing product design system already overrides it

## Default Visual Direction

Current default frontend direction is:

`Google AI Studio inspired workspace style`

This means:

- light or soft-neutral workspace surfaces by default
- product-workbench feeling instead of dark control-room styling
- concise, operational first-screen layout
- cards, tabs, summaries, timelines, and output previews should be directly useful
- avoid Claude-style narrative or overly decorative panel design

## Required Characteristics

1. Function first
Every visible block must provide one of:
- action
- monitoring
- statistics
- live output
- asset access

2. No intro-heavy UI
Do not spend prime screen space on:
- platform introductions
- explanatory banners
- decorative copy

3. Output visibility
The page should surface:
- latest outputs
- requirement pool
- version entries
- workflow state
- execution traces when available

4. Cross-project consistency
All new subproject UIs should prefer this style baseline unless:
- the project already has a strong inherited design language
- a business-side brand requirement explicitly overrides it

## Avoid By Default

- Claude-style dark assistant console look
- oversized hero sections
- abstract dashboards without executable value
- hidden outputs that require deep drilling just to confirm latest progress

## Execution Note

When redesigning Web UI or subproject pages, prefer:

`overview -> outputs -> monitoring -> assets -> action`

instead of:

`introduction -> generic panels -> optional details`
