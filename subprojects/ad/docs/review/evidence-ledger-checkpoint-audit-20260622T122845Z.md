# Evidence Ledger Checkpoint Audit

- generatedAt: 2026-06-22T12:28:45.184Z
- checkpointCount: 25
- caseCount: 99
- passCount: 0
- tripwireCount: 0
- notReplayableCount: 99

## Sampling Matrix

| Category | Covered | Case IDs |
| --- | --- | --- |
| 工具成功 | no | - |
| 工具失败 | yes | MIG-050, MIG-051, MIG-052, MIG-053, MIG-054, MIG-055, MIG-057, MIG-058, MIG-050, MIG-051, MIG-052, MIG-053, MIG-054, MIG-055, MIG-057, MIG-050, MIG-051, MIG-003, MIG-004, MIG-009, MIG-012, MIG-003, MIG-001, MIG-003, MIG-003, MIG-004, MIG-002, MIG-003, MIG-004, MIG-005, MIG-006, MIG-008 |
| 空结果 | yes | MIG-004, MIG-009, MIG-012, MIG-004 |
| 知识库 | yes | MIG-005, MIG-013, MIG-014, MIG-013 |
| 公开联网 | no | - |
| planner inference | no | - |
| fallback | yes | MIG-050, MIG-051, MIG-052, MIG-053, MIG-054, MIG-055, MIG-056, MIG-057, MIG-058, MIG-059, MIG-060, MIG-050, MIG-051, MIG-052, MIG-053, MIG-054, MIG-055, MIG-056, MIG-057, MIG-058, MIG-059, MIG-060, MIG-051, MIG-052, MIG-053, MIG-054, MIG-055, MIG-050, MIG-051, MIG-051, MIG-051, MIG-003, MIG-005, MIG-008, MIG-013, MIG-014, MIG-008, MIG-008, MIG-008, MIG-013 |
| invalid date | no | - |
| 权限不足 | no | - |
| 模型降级 | no | - |

## Case Details

| Case | Status | Evidence Mode | Refs | Guardrail | Gaps |
| --- | --- | --- | --- | --- | --- |
| MIG-050 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-052 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-053 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-054 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-055 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-056 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-050 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-052 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-053 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-054 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-055 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-056 | missing_input | unknown | source=0, evidence=0, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-057 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-058 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-059 | missing_input | unknown | source=0, evidence=0, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-060 | missing_input | unknown | source=0, evidence=0, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-050 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-052 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-053 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-054 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-055 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-056 | missing_input | unknown | source=0, evidence=0, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-057 | degraded | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-058 | not_configured | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-059 | missing_input | unknown | source=2, evidence=0, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-060 | missing_input | unknown | source=2, evidence=1, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-050 | failed | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | not_configured | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-052 | missing_input | unknown | source=1, evidence=1, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-053 | missing_input | unknown | source=1, evidence=1, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-054 | missing_input | unknown | source=2, evidence=1, tool=3 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-055 | missing_input | unknown | source=2, evidence=1, tool=3 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-050 | missing_input | unknown | source=1, evidence=1, tool=1 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | not_configured | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | missing_input | unknown | source=2, evidence=1, tool=3 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | missing_input | unknown | source=5, evidence=1, tool=9 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | success | unknown | source=3, evidence=3, tool=6 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | success | unknown | source=3, evidence=3, tool=6 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-051 | failed | unknown | source=3, evidence=3, tool=6 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-000 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-002 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-003 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-004 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-005 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-006 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-007 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-008 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-009 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-010 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-011 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-012 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-013 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-014 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | success | unknown | source=1, evidence=2, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-003 | degraded | unknown | source=1, evidence=1, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | success | unknown | source=1, evidence=2, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-004 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-002 | success | unknown | source=2, evidence=3, tool=4 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-004 | success | unknown | source=3, evidence=3, tool=10 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-005 | missing_input | unknown | source=4, evidence=1, tool=7 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-006 | success | unknown | source=3, evidence=3, tool=6 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-007 | success | unknown | source=3, evidence=1, tool=3 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-008 | not_configured | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-009 | success | unknown | source=3, evidence=3, tool=10 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-010 | success | unknown | source=2, evidence=1, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-011 | success | unknown | source=2, evidence=1, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-012 | success | unknown | source=5, evidence=3, tool=12 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-013 | missing_input | unknown | source=5, evidence=1, tool=9 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-014 | missing_input | unknown | source=4, evidence=1, tool=7 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-008 | not_configured | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-008 | not_configured | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | success | unknown | source=1, evidence=2, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-003 | failed | unknown | source=1, evidence=1, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-008 | not_configured | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | failed | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-002 | success | unknown | source=2, evidence=3, tool=4 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-003 | failed | unknown | source=1, evidence=1, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | success | unknown | source=1, evidence=2, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | success | unknown | source=1, evidence=2, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-002 | success | unknown | source=2, evidence=3, tool=4 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-003 | failed | unknown | source=1, evidence=1, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-004 | success | unknown | source=3, evidence=3, tool=10 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-011 | success | unknown | source=2, evidence=1, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-013 | missing_input | unknown | source=5, evidence=1, tool=9 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-000 | success | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-001 | success | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-002 | blocked | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-003 | blocked | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-004 | blocked | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-005 | blocked | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-006 | blocked | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-007 | success | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-008 | blocked | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-009 | success | unknown | source=1, evidence=2, tool=2 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |
| MIG-010 | unknown | unknown | source=0, evidence=0, tool=0 | not_replayable | needs_full_contract_snapshot, missing_output_guardrail_snapshot, missing_evidence_ledger_snapshot |

## Notes

- Historical checkpoint rows without `response_contract_snapshot` are marked `needs_full_contract_snapshot` and are not counted as replay proof.
- The audit uses contract fields and runtime summaries only; it does not classify samples by business keywords.
