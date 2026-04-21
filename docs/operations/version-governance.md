# PMAIOS Version Governance

## Purpose

This document defines how PMAIOS versions are assigned from now on.

The rule is:

- User-proposed or planning-time version labels are input signals, not final release versions.
- Final PMAIOS versions are assigned by AI after checking actual development and verification results.
- A version is considered accepted only when its scope, dates, verification evidence, and remaining gaps are documented.
- New requests inserted into the active version must go through requirement change control before implementation.

## Current Canonical Version Line

| Version | Cycle | Status | Basis |
| --- | --- | --- | --- |
| `v0.1` | 2026-04-06 -> 2026-04-12, inferred | Archived | Early workflow/runtime prototype evidence exists in review and workflow files. Exact boundary is inferred because the early work was not versioned consistently. |
| `v0.2` | 2026-04-13 -> 2026-04-18 20:15, inferred from repository state and commit | Accepted | Local runtime baseline culminated in commit `14432a4` on 2026-04-18 20:15:29 +0800: local runtime, tests, build, release docs. |
| `v0.3` | 2026-04-18 20:15 -> 2026-04-18 22:20, inferred from roadmap/template timestamps | Accepted as planning/foundation consolidation | AI Product Office roadmap, module roadmap, templates, human/AI boundary, product-agent blueprint, and physical-world profile concepts were consolidated. |
| `v0.4` | 2026-04-18 22:00 -> current, active | In progress / release candidate | Actual implementation pass after the 2026-04-18 evening product direction: Product Chief runtime, governed outputs, traceability, DAG, retrieval governance, Hermes, Chroma, documentation normalization, and capability gate hardening. |

## Version Assignment Rules

1. Keep version numbers tied to accepted capability, not aspiration.
2. Do not label unfinished future scope as the current version.
3. Collapse ambiguous historical labels into the closest accepted baseline.
4. Use inferred dates when exact dates are unavailable, and explicitly mark them as inferred.
5. Preserve old planning labels only as historical references.
6. Use the active version plan as the operational source of truth.

## Current Version

Current active product version: `v0.4`.

Current package version policy:

- `package.json` may lag during development.
- It should be updated to `0.4.0` only when `v0.4` acceptance is complete.
- Until then, operational documents are authoritative for product capability state.

## Requirement Change Control

Any new request inserted into the current version must be recorded before implementation:

1. Create or update a requirement record.
2. Classify priority as `P0`, `P1`, or `P2`.
3. Decide whether it belongs to current `v0.4` or a future version.
4. Update `docs/operations/pmaios-version-plan.md`.
5. Update `docs/operations/current-version-progress.md`.
6. Implement only after the plan impact is visible.
7. Record verification evidence after implementation.

Emergency exception:

- If a defect blocks verification or local runtime, fix it immediately and backfill the requirement/version record in the same work session.

## Version Document Rules

All formal version documents that need development review must follow a written template.

Two artifacts are required:

1. `Detailed MD`
   - the authoritative AI-readable version document
   - must contain source mapping, fact/judgment/candidate/unknown separation, detailed requirement list, review focus, risks, and decisions needed
   - template:
     - `docs/templates/version_dev_review_detailed_template.md`

2. `Human DOCX`
   - the human-readable version review document
   - must be concise, review-oriented, and easier for product, engineering, and management to scan
   - its source structure should follow:
     - `docs/templates/version_human_doc_template.md`

Hard rules:

1. A version doc is not review-ready if it does not match the development review template.
2. The MD file is the source of truth for AI and repository traceability.
3. The DOCX file is the source of truth for human review circulation.
4. The human DOCX must be derived from the detailed MD, not written as an unrelated parallel draft.
5. If only one artifact exists, the version document is considered incomplete.
6. The requirement list inside version documents must use concise review-friendly statements rather than narrative prose.

## Daily Progress Rule

Every working day should maintain a current version progress snapshot.

The snapshot must include:

- current version
- version cycle dates
- status
- completed capability groups
- in-progress work
- open risks and blockers
- verification evidence
- next execution order
- new requirement changes since last snapshot

Canonical snapshot file:

- `docs/operations/current-version-progress.md`
