import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OutputGuardrailImpl } from '../src/lib/guardrails/output-guardrail';
import type { OutputGuardrailInput } from '../src/contracts/validation/guardrail-contract';

type JsonRecord = Record<string, unknown>;

interface AuditArgs {
  checkpoints: string[];
  caseIds: Set<string>;
  out: 'md' | 'json';
}

interface CaseAudit {
  checkpoint: string;
  caseId: string;
  scene: string;
  status: string;
  evidenceMode: string;
  sourceRefCount: number;
  evidenceRefCount: number;
  toolCallTraceCount: number;
  guardrailStatus: 'passed' | 'tripwire' | 'not_replayable';
  guardrailReason?: string;
  matrixTags: string[];
  findings: string[];
  gaps: string[];
}

interface AuditReport {
  generatedAt: string;
  checkpointCount: number;
  caseCount: number;
  passCount: number;
  tripwireCount: number;
  notReplayableCount: number;
  matrix: Record<string, { covered: boolean; caseIds: string[] }>;
  cases: CaseAudit[];
}

const MATRIX = [
  ['tool_success', '工具成功'],
  ['tool_failure', '工具失败'],
  ['empty_result', '空结果'],
  ['knowledge', '知识库'],
  ['public_web', '公开联网'],
  ['planner_inference', 'planner inference'],
  ['fallback', 'fallback'],
  ['invalid_date', 'invalid date'],
  ['permission_denied', '权限不足'],
  ['model_degraded', '模型降级'],
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseArgs(argv: string[]): AuditArgs {
  const checkpoints: string[] = [];
  const caseIds = new Set<string>();
  let out: 'md' | 'json' = 'md';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--checkpoint') {
      const value = argv[index + 1];
      if (!value) throw new Error('--checkpoint requires a path');
      checkpoints.push(path.resolve(value));
      index += 1;
    } else if (arg === '--case') {
      const value = argv[index + 1];
      if (!value) throw new Error('--case requires a caseId');
      caseIds.add(value);
      index += 1;
    } else if (arg === '--out') {
      const value = argv[index + 1];
      if (value !== 'md' && value !== 'json') throw new Error('--out must be md or json');
      out = value;
      index += 1;
    }
  }

  return { checkpoints, caseIds, out };
}

function findRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const starts = [
    process.cwd(),
    path.resolve(process.cwd(), '..', '..'),
    path.resolve(scriptDir, '..', '..', '..'),
  ];
  for (const start of starts) {
    let current = start;
    for (let depth = 0; depth < 8; depth += 1) {
      if (
        fs.existsSync(path.join(current, 'AGENTS.md'))
        && fs.existsSync(path.join(current, 'subproject.json'))
        && fs.existsSync(path.join(current, 'docs', 'review'))
      ) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.resolve(process.cwd(), '..', '..');
}

function defaultCheckpointPaths(repoRoot: string): string[] {
  const reviewDir = path.join(repoRoot, 'docs', 'review');
  if (!fs.existsSync(reviewDir)) return [];
  return fs.readdirSync(reviewDir)
    .filter(name => name.endsWith('.checkpoint.json'))
    .map(name => path.join(reviewDir, name))
    .sort();
}

function readJson(filePath: string): JsonRecord {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonRecord;
}

function getContractSnapshot(result: JsonRecord): JsonRecord | null {
  if (isRecord(result.response_contract_snapshot)) return result.response_contract_snapshot;
  if (isRecord(result.responseContractSnapshot)) return result.responseContractSnapshot;
  if (isRecord(result.response_contract)) return result.response_contract;
  if (isRecord(result.responseContract)) return result.responseContract;
  return null;
}

function getContractEvidence(result: JsonRecord): JsonRecord {
  return isRecord(result.contractEvidence) ? result.contractEvidence : {};
}

function getOutputGuardrailSnapshot(result: JsonRecord): JsonRecord | null {
  if (isRecord(result.output_guardrail_snapshot)) return result.output_guardrail_snapshot;
  if (isRecord(result.outputGuardrailSnapshot)) return result.outputGuardrailSnapshot;
  const metadata = isRecord(result.metadata) ? result.metadata : {};
  return isRecord(metadata.output_guardrail) ? metadata.output_guardrail : null;
}

function getEvidenceLedgerSnapshot(result: JsonRecord): JsonRecord | null {
  if (isRecord(result.evidence_ledger_snapshot)) return result.evidence_ledger_snapshot;
  if (isRecord(result.evidenceLedgerSnapshot)) return result.evidenceLedgerSnapshot;
  const metadata = isRecord(result.metadata) ? result.metadata : {};
  return isRecord(metadata.evidence_ledger) ? metadata.evidence_ledger : null;
}

function replayGuardrail(result: JsonRecord, contract: JsonRecord | null, ledger: JsonRecord | null): {
  status: CaseAudit['guardrailStatus'];
  reason?: string;
  findings: string[];
  gaps: string[];
} {
  if (!contract) {
    return {
      status: 'not_replayable',
      findings: [],
      gaps: ['needs_full_contract_snapshot'],
    };
  }

  const input: OutputGuardrailInput = {
    answer: readString(contract.answer_markdown) || readString(contract.answer) || readString(result.answer),
    status: readString(contract.status) || readString(result.contractStatus) || 'unknown',
    sourceRefs: readArray(contract.source_refs) as Array<{ source_type: string; [key: string]: unknown }>,
    evidenceRefs: readArray(contract.evidence_refs).filter((item): item is string => typeof item === 'string'),
    evidenceMode: readString(contract.evidence_mode) || undefined,
    workflowResult: isRecord(result.workflow_result) ? result.workflow_result : null,
    metadata: isRecord(result.metadata) ? result.metadata : {},
    plannerShadowPlan: isRecord(result.planner_shadow_plan) ? result.planner_shadow_plan : null,
    evidenceLedger: ledger || undefined,
  };
  const output = new OutputGuardrailImpl().check(input);
  return {
    status: output.tripwire_triggered ? 'tripwire' : 'passed',
    reason: output.tripwire_reason,
    findings: output.findings.map(finding => `${finding.severity}:${finding.code}`),
    gaps: [],
  };
}

function traceItems(contract: JsonRecord | null, evidence: JsonRecord): JsonRecord[] {
  const fromContract = contract ? readArray(contract.tool_call_trace).filter(isRecord) : [];
  const fromEvidence = readArray(evidence.toolCallTraceSummary).filter(isRecord);
  return [...fromContract, ...fromEvidence];
}

function processItems(result: JsonRecord, evidence: JsonRecord): JsonRecord[] {
  const fromResult = readArray(result.processEventSummary).filter(isRecord);
  const fromEvidence = readArray(evidence.processEventSummary).filter(isRecord);
  return [...fromResult, ...fromEvidence];
}

function hasStatus(items: JsonRecord[], statuses: string[]): boolean {
  return items.some(item => statuses.includes(String(item.status || '').toLowerCase()));
}

function hasKind(items: JsonRecord[], kinds: string[]): boolean {
  return items.some(item => {
    const text = [
      item.kind,
      item.type,
      item.source_type,
      item.toolName,
      item.tool_name,
      item.name,
    ].map(value => String(value || '').toLowerCase()).join(' ');
    return kinds.some(kind => text.includes(kind));
  });
}

function hasLedgerSource(ledger: JsonRecord | null, source: string): boolean {
  if (!ledger) return false;
  if (ledger.available === false) return false;
  const counts = isRecord(ledger.counts) ? ledger.counts : {};
  return Number(counts[source] || 0) > 0;
}

function classifyCase(params: {
  result: JsonRecord;
  contract: JsonRecord | null;
  evidence: JsonRecord;
  ledger: JsonRecord | null;
  guardrailStatus: CaseAudit['guardrailStatus'];
}): string[] {
  const tags = new Set<string>();
  const traces = traceItems(params.contract, params.evidence);
  const processes = processItems(params.result, params.evidence);
  const status = readString(params.contract?.status) || readString(params.result.contractStatus);
  const evidenceMode = readString(params.contract?.evidence_mode);
  const evidenceRefs = params.contract
    ? readArray(params.contract.evidence_refs)
    : readArray(params.evidence.evidenceRefs);
  const toolSuccess = hasStatus(traces, ['success', 'succeeded', 'confirmed_fact']);
  const toolFailure = hasStatus(traces, ['failed', 'error', 'blocked']);

  if ((evidenceMode === 'tool_grounded' || evidenceMode === 'mixed_grounded' || evidenceRefs.length > 0) && toolSuccess && params.guardrailStatus === 'passed') {
    tags.add('tool_success');
  }
  if (toolFailure || ['failed', 'degraded', 'blocked'].includes(status)) tags.add('tool_failure');
  if (hasStatus(traces, ['empty']) || processes.some(item => Number(item.rowCount ?? item.row_count) === 0)) tags.add('empty_result');
  if (evidenceMode === 'knowledge_grounded' || hasKind(traces, ['knowledge']) || hasLedgerSource(params.ledger, 'knowledge')) tags.add('knowledge');
  if (evidenceMode === 'source_grounded' || hasKind(traces, ['public_web', 'web_search', 'web_fetch']) || hasLedgerSource(params.ledger, 'public_web')) tags.add('public_web');
  if (hasLedgerSource(params.ledger, 'planner_inference')) tags.add('planner_inference');
  if (['insufficient_evidence', 'model_only', 'no_external_evidence_required'].includes(evidenceMode) || ['degraded', 'missing_input', 'not_configured'].includes(status)) tags.add('fallback');
  if (processes.some(item => String(item.type || item.eventType || '').toLowerCase().includes('date') && ['failed', 'blocked', 'missing_input', 'degraded'].includes(String(item.status || '').toLowerCase()))) tags.add('invalid_date');
  if (processes.some(item => String(item.outputSummary || item.summary || item.error || '').toLowerCase().includes('permission') || String(item.outputSummary || item.summary || item.error || '').includes('权限'))) tags.add('permission_denied');
  const answerOrigin = isRecord(params.contract?.answer_origin) ? params.contract.answer_origin : {};
  if (answerOrigin.source === 'model_unavailable' || answerOrigin.kind === 'model_degraded') tags.add('model_degraded');

  return Array.from(tags);
}

function auditResult(checkpoint: string, result: JsonRecord): CaseAudit {
  const contract = getContractSnapshot(result);
  const evidence = getContractEvidence(result);
  const ledger = getEvidenceLedgerSnapshot(result);
  const outputSnapshot = getOutputGuardrailSnapshot(result);
  const replay = replayGuardrail(result, contract, ledger);
  const status = readString(contract?.status) || readString(result.contractStatus) || readString(evidence.status) || 'unknown';
  const evidenceMode = readString(contract?.evidence_mode) || 'unknown';
  const sourceRefs = contract ? readArray(contract.source_refs) : [];
  const evidenceRefs = contract ? readArray(contract.evidence_refs) : readArray(evidence.evidenceRefs);
  const traces = traceItems(contract, evidence);
  const gaps = [...replay.gaps];

  if (!outputSnapshot) gaps.push('missing_output_guardrail_snapshot');
  if (!ledger || ledger.available === false) gaps.push('missing_evidence_ledger_snapshot');
  if (contract && !readString(contract.evidence_mode)) gaps.push('missing_evidence_mode');
  if (contract && status === 'success' && evidenceMode !== 'model_only' && evidenceMode !== 'no_external_evidence_required' && sourceRefs.length === 0 && evidenceRefs.length === 0) {
    gaps.push('success_without_contract_refs');
  }

  const audit: CaseAudit = {
    checkpoint,
    caseId: readString(result.caseId) || readString(result.caseKey) || 'unknown',
    scene: readString(result.scene),
    status,
    evidenceMode,
    sourceRefCount: sourceRefs.length || Number(evidence.sourceRefCount || 0),
    evidenceRefCount: evidenceRefs.length || Number(evidence.evidenceRefCount || 0),
    toolCallTraceCount: traces.length || Number(evidence.toolCallTraceCount || 0),
    guardrailStatus: replay.status,
    guardrailReason: replay.reason,
    matrixTags: [],
    findings: replay.findings,
    gaps: Array.from(new Set(gaps)),
  };
  audit.matrixTags = classifyCase({ result, contract, evidence, ledger, guardrailStatus: audit.guardrailStatus });
  return audit;
}

function auditCheckpoint(filePath: string, caseIds: Set<string>): CaseAudit[] {
  const checkpoint = readJson(filePath);
  const results = readArray(checkpoint.results).filter(isRecord);
  return results
    .filter(result => {
      if (caseIds.size === 0) return true;
      const ids = [result.caseId, result.caseKey].map(value => String(value || ''));
      return ids.some(id => caseIds.has(id));
    })
    .map(result => auditResult(path.basename(filePath), result));
}

function buildReport(cases: CaseAudit[], checkpointCount: number): AuditReport {
  const matrix: AuditReport['matrix'] = {};
  for (const [key] of MATRIX) {
    const caseIds = cases.filter(item => item.matrixTags.includes(key)).map(item => item.caseId);
    matrix[key] = { covered: caseIds.length > 0, caseIds };
  }
  return {
    generatedAt: new Date().toISOString(),
    checkpointCount,
    caseCount: cases.length,
    passCount: cases.filter(item => item.guardrailStatus === 'passed' && item.gaps.length === 0).length,
    tripwireCount: cases.filter(item => item.guardrailStatus === 'tripwire').length,
    notReplayableCount: cases.filter(item => item.guardrailStatus === 'not_replayable').length,
    matrix,
    cases,
  };
}

function renderMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('# Evidence Ledger Checkpoint Audit');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- checkpointCount: ${report.checkpointCount}`);
  lines.push(`- caseCount: ${report.caseCount}`);
  lines.push(`- passCount: ${report.passCount}`);
  lines.push(`- tripwireCount: ${report.tripwireCount}`);
  lines.push(`- notReplayableCount: ${report.notReplayableCount}`);
  lines.push('');
  lines.push('## Sampling Matrix');
  lines.push('');
  lines.push('| Category | Covered | Case IDs |');
  lines.push('| --- | --- | --- |');
  for (const [key, label] of MATRIX) {
    const item = report.matrix[key];
    lines.push(`| ${label} | ${item.covered ? 'yes' : 'no'} | ${item.caseIds.join(', ') || '-'} |`);
  }
  lines.push('');
  lines.push('## Case Details');
  lines.push('');
  lines.push('| Case | Status | Evidence Mode | Refs | Guardrail | Gaps |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const item of report.cases) {
    const refs = `source=${item.sourceRefCount}, evidence=${item.evidenceRefCount}, tool=${item.toolCallTraceCount}`;
    lines.push(`| ${item.caseId} | ${item.status} | ${item.evidenceMode} | ${refs} | ${item.guardrailStatus}${item.guardrailReason ? `:${item.guardrailReason}` : ''} | ${item.gaps.join(', ') || '-'} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Historical checkpoint rows without `response_contract_snapshot` are marked `needs_full_contract_snapshot` and are not counted as replay proof.');
  lines.push('- The audit uses contract fields and runtime summaries only; it does not classify samples by business keywords.');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = findRepoRoot();
  const args = parseArgs(process.argv.slice(2));
  const checkpointPaths = args.checkpoints.length ? args.checkpoints : defaultCheckpointPaths(repoRoot);
  if (checkpointPaths.length === 0) {
    throw new Error('No checkpoint files found. Use --checkpoint <path>.');
  }

  const cases = checkpointPaths.flatMap(filePath => auditCheckpoint(filePath, args.caseIds));
  const report = buildReport(cases, checkpointPaths.length);
  const reviewDir = path.join(repoRoot, 'docs', 'review');
  fs.mkdirSync(reviewDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const outputPath = path.join(reviewDir, `evidence-ledger-checkpoint-audit-${stamp}.${args.out}`);
  const body = args.out === 'json'
    ? `${JSON.stringify(report, null, 2)}\n`
    : renderMarkdown(report);
  fs.writeFileSync(outputPath, body, 'utf8');
  console.log(`Evidence Ledger checkpoint audit wrote ${path.relative(repoRoot, outputPath)}`);
  console.log(`cases=${report.caseCount} pass=${report.passCount} tripwire=${report.tripwireCount} notReplayable=${report.notReplayableCount}`);
}

main();
