import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type RuleDebtEntry = {
  id?: unknown;
  file?: unknown;
  symbol?: unknown;
  line?: unknown;
  fragment_type?: unknown;
  debt_type?: unknown;
  current_value?: unknown;
  decision_authority?: unknown;
  risk_level?: unknown;
  architecture_layer?: unknown;
  recommended_treatment?: unknown;
  target_architecture?: unknown;
  review_requirement?: unknown;
  validation_required?: unknown;
  committee_status?: unknown;
  review_evidence?: unknown;
  disposition_evidence?: unknown;
};

type CommitteeRoleReview = {
  reviewer?: unknown;
  status?: unknown;
  notes?: unknown;
  evidence_refs?: unknown;
};

type ReviewEvidence = {
  review_id?: unknown;
  reviewed_at?: unknown;
  final_status?: unknown;
  final_approver?: unknown;
  self_check_ref?: unknown;
  meeting_record?: unknown;
  hermes_governance_ref?: unknown;
  human_final_approval_ref?: unknown;
  migration_plan_ref?: unknown;
  approved_runtime_scope?: unknown;
  roles?: unknown;
  conditions?: unknown;
  validation_evidence?: unknown;
};

type DispositionEvidence = {
  final_status?: unknown;
  owner?: unknown;
  reason?: unknown;
  decision_record?: unknown;
  runtime_migration_allowed?: unknown;
  next_review_at?: unknown;
};

type RuleDebtInventory = {
  document_id?: unknown;
  expert_review_docket?: unknown;
  migration_queue?: unknown;
  review_packets?: unknown;
  inventory_metrics?: Record<string, unknown>;
  source_scan_targets?: unknown;
  mojibake_scan_targets?: unknown;
  untracked_hotspot_allowlist?: unknown;
  guardrail_policies?: unknown;
  mandatory_validation_pack?: unknown;
  runtime_validation_status?: unknown;
  runtime_migration_gate?: {
    status?: unknown;
    reason?: unknown;
    diff_gate_command?: unknown;
    diff_gate_policy?: unknown;
    runtime_migration_allowed?: unknown;
  };
  review_status_policy?: Record<string, unknown>;
  required_inventory_symbols?: unknown;
  entries?: unknown;
};

type SourceScanTarget = {
  file?: unknown;
  lines?: unknown;
  if_count?: unknown;
  signal_or_fallback_count?: unknown;
  collection_match_count?: unknown;
  risk_symbol_declaration_count?: unknown;
};

type GuardrailPolicies = {
  source_anchor_line_drift_max?: unknown;
  minimum_inventory_entries?: unknown;
  minimum_p0_or_p1_entries?: unknown;
  minimum_p0_entries?: unknown;
  minimum_mojibake_scan_targets?: unknown;
  untracked_hotspot_score_threshold?: unknown;
  minimum_untracked_hotspot_allowlist?: unknown;
  source_density_count_mode?: unknown;
  source_density_fields?: unknown;
  runtime_migration_gate_owner?: unknown;
  required_review_evidence_fields?: unknown;
  required_disposition_evidence_fields?: unknown;
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..', '..');
const inventoryPath = process.env.RULE_DEBT_INVENTORY_PATH
  ? path.resolve(process.env.RULE_DEBT_INVENTORY_PATH)
  : path.join(repoRoot, 'docs', 'review', 'ai-chat-rule-debt-inventory-2026-06-13.json');
const inventoryMarkdownPath = path.join(repoRoot, 'docs', 'review', 'ai-chat-rule-debt-inventory-2026-06-13.md');
const guardrailScriptPath = path.join(frontendRoot, 'scripts', 'rule-debt-inventory-guardrail.ts');

const allowedStatuses = new Set(['pending', 'approved', 'approved_with_conditions', 'rejected', 'defer']);
const approvalStatuses = new Set(['approved', 'approved_with_conditions']);
const roleReviewStatuses = new Set(['approved', 'approved_with_conditions', 'rejected', 'defer']);
const requiredCommitteeRoles = [
  'architecture',
  'chat_runtime',
  'business_domain',
  'data_model',
  'qa_eval',
  'security_governance',
  'product',
];
const allowedMigrationGateStatuses = new Set([
  'blocked_until_expert_committee_approval',
  'approved',
  'approved_with_conditions',
]);

const requiredEntryFields: Array<keyof RuleDebtEntry> = [
  'id',
  'file',
  'symbol',
  'line',
  'fragment_type',
  'debt_type',
  'current_value',
  'decision_authority',
  'risk_level',
  'architecture_layer',
  'recommended_treatment',
  'target_architecture',
  'review_requirement',
  'validation_required',
  'committee_status',
];

const sourceCache = new Map<string, string[]>();

function countPendingP0P1Entries(inventory: RuleDebtInventory): number {
  if (!Array.isArray(inventory.entries)) return 0;
  return inventory.entries.filter((entry) => {
    const item = entry as RuleDebtEntry;
    const riskLevel = asString(item.risk_level);
    const committeeStatus = asString(item.committee_status);
    return (riskLevel.startsWith('P0') || riskLevel.startsWith('P1'))
      && (committeeStatus === 'pending' || committeeStatus === '');
  }).length;
}

const maxEntryLineDrift = 80;
const minimumInventoryEntries = 40;
const minimumP0OrP1Entries = 36;
const minimumP0Entries = 6;
const minimumMojibakeScanTargets = 15;
const untrackedHotspotScoreThreshold = 25;
const minimumUntrackedHotspotAllowlist = 37;
const requiredReviewEvidenceFields = [
  'self_check_ref',
  'meeting_record',
  'hermes_governance_ref',
  'human_final_approval_ref',
  'migration_plan_ref',
  'approved_runtime_scope',
  'validation_evidence',
];
const requiredDispositionEvidenceFields = [
  'final_status',
  'owner',
  'reason',
  'decision_record',
  'runtime_migration_allowed',
  'next_review_at',
];
const validationCoveragePatterns = {
  nonHardcoded: /non-hardcoded|非硬编码|without original|no keyword|paraphrase|different wording|same intent/i,
  negative: /negative|负例|unsupported|rejected|conflict|disabled|ignored|no retry|no silent|no invented|not overwritten|stays general|ambiguous/i,
  mojibake: /mojibake|乱码|encoding|UTF-8/i,
  runtime: /\/api\/chat|real|equivalent runtime regression|equivalent regression|runtime|trace|ResponseContract|route decision|arbitration|source arbitration/i,
};
const requiredStrictRealChatEnv = [
  'XIAOQIAO_REAL_KB_HIT_QUERY',
  'XIAOQIAO_REAL_KB_NO_HIT_QUERY',
  'XIAOQIAO_REAL_KB_STALE_QUERY',
  'XIAOQIAO_REAL_WEB_OFFICIAL_QUERY',
  'XIAOQIAO_REAL_WEB_LOW_RELEVANCE_QUERY',
  'XIAOQIAO_REAL_WEB_MULTI_SOURCE_QUERY',
];
const allowedStrictRealChatBlockedStatuses = new Set([
  'blocked_missing_controlled_samples',
  'blocked_real_validation_failures',
  'passed',
]);
const fakeValidationEvidencePattern = /\b(mock|fake|stub|fixture|synthetic|dummy)\b|造假|模拟|伪造|桩/i;
const mojibakeTokens = [
  '\u951b',
  '\u9428',
  '\u6d93',
  '\u7edb',
  '\ufffd',
];
const mojibakeUnicodeLabelCodes = ['FFFD', '951B', '9428', '6D93', '7EDB'];
const mojibakePattern = new RegExp([
  ...mojibakeTokens,
  ...mojibakeUnicodeLabelCodes.map((code) => `U\\+${code}`),
].join('|'));

function fail(message: string): never {
  throw new Error(`[rule-debt-inventory] ${message}`);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isP0OrP1(riskLevel: unknown): boolean {
  const value = asString(riskLevel);
  return value.startsWith('P0') || value.startsWith('P1');
}

function isP0(riskLevel: unknown): boolean {
  return asString(riskLevel).startsWith('P0');
}

function isP3(riskLevel: unknown): boolean {
  return asString(riskLevel).startsWith('P3');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function countMatchingLines(text: string, pattern: RegExp): number {
  return text.split(/\r\n|\n|\r/).filter((line) => pattern.test(line)).length;
}

function walkTypeScriptFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkTypeScriptFiles(absolutePath, out);
    } else if (/\.(?:ts|tsx)$/.test(item.name)) {
      out.push(relativeRepoPath(absolutePath));
    }
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function metricNumber(metrics: Record<string, unknown> | SourceScanTarget | undefined, key: string): number {
  const value = metrics?.[key as keyof typeof metrics];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${key} must be a number`);
  }
  return value;
}

function loadInventory(): RuleDebtInventory {
  if (!fs.existsSync(inventoryPath)) {
    fail(`missing inventory file: ${path.relative(repoRoot, inventoryPath)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as RuleDebtInventory;
  } catch (error) {
    fail(`inventory JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sourceLinesFor(filePath: string): string[] {
  const cached = sourceCache.get(filePath);
  if (cached) return cached;

  const absolutePath = path.join(repoRoot, filePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing source file referenced by inventory: ${filePath}`);
  }
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r\n|\n|\r/);
  sourceCache.set(filePath, lines);
  return lines;
}

function validateEntrySourceAnchor(entry: RuleDebtEntry): void {
  const id = asString(entry.id);
  const file = asString(entry.file);
  const symbol = asString(entry.symbol);
  const expectedLine = typeof entry.line === 'number' ? entry.line : 0;
  const lines = sourceLinesFor(file);
  const symbolPattern = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);
  const matchingLines = lines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => symbolPattern.test(line));

  if (matchingLines.length === 0) {
    fail(`entry ${id} symbol "${symbol}" was not found in ${file}`);
  }

  const nearest = matchingLines.reduce((currentNearest, candidate) => {
    const currentDistance = Math.abs(currentNearest.lineNumber - expectedLine);
    const candidateDistance = Math.abs(candidate.lineNumber - expectedLine);
    return candidateDistance < currentDistance ? candidate : currentNearest;
  });
  const drift = Math.abs(nearest.lineNumber - expectedLine);
  if (drift > maxEntryLineDrift) {
    fail(
      `entry ${id} symbol "${symbol}" line anchor drifted in ${file}: `
      + `inventory line ${expectedLine}, nearest source line ${nearest.lineNumber}`,
    );
  }
}

function validateEntry(entry: RuleDebtEntry, index: number): void {
  for (const field of requiredEntryFields) {
    const value = entry[field];
    const missingString = typeof value === 'string' && value.trim() === '';
    if (value === undefined || value === null || missingString) {
      fail(`entry[${index}] is missing required field "${field}"`);
    }
  }

  if (typeof entry.line !== 'number' || !Number.isInteger(entry.line) || entry.line <= 0) {
    fail(`entry ${asString(entry.id)} has invalid line number`);
  }

  if (!Array.isArray(entry.validation_required) || entry.validation_required.length < 3) {
    fail(`entry ${asString(entry.id)} must list at least three validation requirements`);
  }

  const committeeStatus = asString(entry.committee_status);
  if (!allowedStatuses.has(committeeStatus)) {
    fail(`entry ${asString(entry.id)} has unsupported committee_status "${committeeStatus}"`);
  }

  if (isP0OrP1(entry.risk_level) && (committeeStatus === 'approved' || committeeStatus === 'approved_with_conditions')) {
    validateReviewEvidence(entry, committeeStatus);
  }
  if (isP0OrP1(entry.risk_level) && (committeeStatus === 'rejected' || committeeStatus === 'defer')) {
    validateDispositionEvidence(entry, committeeStatus);
  }

  // P3 historical artifacts don't have source anchors in code files
  if (!isP3(entry.risk_level)) {
    validateEntrySourceAnchor(entry);
  }
}

function validateDispositionEvidence(entry: RuleDebtEntry, committeeStatus: string): void {
  const entryId = asString(entry.id);
  if (!isRecord(entry.disposition_evidence)) {
    fail(`entry ${entryId} is ${committeeStatus} but has no structured disposition_evidence`);
  }

  const evidence = entry.disposition_evidence as DispositionEvidence;
  if (asString(evidence.final_status) !== committeeStatus) {
    fail(`entry ${entryId} disposition_evidence.final_status must equal committee_status`);
  }
  if (!asString(evidence.owner)) fail(`entry ${entryId} disposition_evidence is missing owner`);
  if (!asString(evidence.reason)) fail(`entry ${entryId} disposition_evidence is missing reason`);
  if (!asString(evidence.decision_record)) fail(`entry ${entryId} disposition_evidence is missing decision_record`);
  if (evidence.runtime_migration_allowed !== false) {
    fail(`entry ${entryId} disposition_evidence.runtime_migration_allowed must be false`);
  }
  if (committeeStatus === 'defer' && !asString(evidence.next_review_at)) {
    fail(`entry ${entryId} disposition_evidence.next_review_at is required for defer`);
  }
}

function validationText(values: unknown[]): string {
  return values.map((value) => (typeof value === 'string' ? value : '')).join(' | ');
}

function validateValidationCoverage(entryId: string, values: unknown[], context: string): void {
  const text = validationText(values);
  for (const [category, pattern] of Object.entries(validationCoveragePatterns)) {
    if (!pattern.test(text)) {
      fail(`${context} for entry ${entryId} is missing ${category} validation coverage`);
    }
  }
}

function validateApprovedRuntimeScope(entryId: string, rawScope: unknown): void {
  if (!Array.isArray(rawScope) || rawScope.length === 0) {
    fail(`entry ${entryId} review_evidence.approved_runtime_scope must include at least one runtime scope`);
  }
  rawScope.forEach((scope, index) => {
    const value = asString(scope);
    if (!value) {
      fail(`entry ${entryId} review_evidence.approved_runtime_scope[${index}] must be a non-empty string`);
    }
    if (!/frontend\/src\/src\/|\.ts:|\.tsx:|#/.test(value)) {
      fail(`entry ${entryId} review_evidence.approved_runtime_scope[${index}] must reference a concrete file or symbol`);
    }
  });
}

function validateRoleReview(entryId: string, role: string, rawReview: unknown, finalStatus: string): void {
  if (!isRecord(rawReview)) {
    fail(`entry ${entryId} approved review_evidence.roles.${role} must be an object`);
  }
  const review = rawReview as CommitteeRoleReview;
  const reviewer = asString(review.reviewer);
  const status = asString(review.status);
  const notes = asString(review.notes);

  if (!reviewer) fail(`entry ${entryId} role ${role} is missing reviewer`);
  if (!roleReviewStatuses.has(status)) fail(`entry ${entryId} role ${role} has invalid status "${status}"`);
  if (!notes) fail(`entry ${entryId} role ${role} is missing notes`);
  if (!Array.isArray(review.evidence_refs) || review.evidence_refs.length === 0) {
    fail(`entry ${entryId} role ${role} must include evidence_refs`);
  }
  if (status === 'rejected' || status === 'defer') {
    fail(`entry ${entryId} cannot be ${finalStatus} while role ${role} is ${status}`);
  }
  if (finalStatus === 'approved' && status !== 'approved') {
    fail(`entry ${entryId} final approved requires role ${role} to be approved`);
  }
}

function validateReviewEvidence(entry: RuleDebtEntry, committeeStatus: string): void {
  const entryId = asString(entry.id);
  if (!isRecord(entry.review_evidence)) {
    fail(`entry ${entryId} is ${committeeStatus} but has no structured review_evidence`);
  }

  const evidence = entry.review_evidence as ReviewEvidence;
  const finalStatus = asString(evidence.final_status);
  if (finalStatus !== committeeStatus) {
    fail(`entry ${entryId} review_evidence.final_status must equal committee_status`);
  }
  if (!approvalStatuses.has(finalStatus)) {
    fail(`entry ${entryId} review_evidence.final_status must be an approval status`);
  }
  if (!asString(evidence.review_id)) fail(`entry ${entryId} review_evidence is missing review_id`);
  if (!asString(evidence.reviewed_at)) fail(`entry ${entryId} review_evidence is missing reviewed_at`);
  if (!asString(evidence.final_approver)) fail(`entry ${entryId} review_evidence is missing final_approver`);
  if (!asString(evidence.self_check_ref)) fail(`entry ${entryId} review_evidence is missing self_check_ref`);
  if (!asString(evidence.meeting_record)) fail(`entry ${entryId} review_evidence is missing meeting_record`);
  if (!asString(evidence.hermes_governance_ref)) fail(`entry ${entryId} review_evidence is missing hermes_governance_ref`);
  if (!asString(evidence.human_final_approval_ref)) fail(`entry ${entryId} review_evidence is missing human_final_approval_ref`);
  if (!asString(evidence.migration_plan_ref)) fail(`entry ${entryId} review_evidence is missing migration_plan_ref`);
  validateApprovedRuntimeScope(entryId, evidence.approved_runtime_scope);
  if (!isRecord(evidence.roles)) fail(`entry ${entryId} review_evidence.roles must be an object`);
  if (!Array.isArray(evidence.validation_evidence) || evidence.validation_evidence.length < 3) {
    fail(`entry ${entryId} review_evidence.validation_evidence must include at least three references`);
  }
  if (validationText(evidence.validation_evidence).match(fakeValidationEvidencePattern)) {
    fail(`entry ${entryId} review_evidence.validation_evidence must not rely on mock/fake/stub/fixture/synthetic evidence`);
  }
  validateValidationCoverage(entryId, evidence.validation_evidence, 'review_evidence.validation_evidence');
  if (committeeStatus === 'approved_with_conditions' && (!Array.isArray(evidence.conditions) || evidence.conditions.length === 0)) {
    fail(`entry ${entryId} approved_with_conditions requires conditions`);
  }
  if (committeeStatus === 'approved' && Array.isArray(evidence.conditions) && evidence.conditions.length > 0) {
    fail(`entry ${entryId} approved must not carry unresolved conditions`);
  }

  for (const role of requiredCommitteeRoles) {
    validateRoleReview(entryId, role, evidence.roles[role], committeeStatus);
  }
}

function scanSourceFile(filePath: string): {
  lines: number;
  if_count: number;
  signal_or_fallback_count: number;
  collection_match_count: number;
  risk_symbol_declaration_count: number;
} {
  const absolutePath = path.join(repoRoot, filePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing high-risk source file: ${filePath}`);
  }
  const source = fs.readFileSync(absolutePath, 'utf8');
  return {
    lines: source.split(/\r\n|\n|\r/).length,
    if_count: countMatchingLines(source, /\bif\s*\(/),
    signal_or_fallback_count: countMatchingLines(source, /signal|Signal|fallback|Fallback/),
    collection_match_count: countMatchingLines(source, /\.(?:includes|some|filter)\s*\(/),
    risk_symbol_declaration_count: countMatchingLines(
      source,
      /\b(?:function|const|let|var|type|interface|enum)\s+\w*(?:Signal|Signals|Fallback|RouteRule|RouteRules|Hardcoded|Heuristic|Need|Policy|Preflight|Dictionary|Capability|Intent)\w*/,
    ),
  };
}

function scoreHotspotFile(filePath: string): {
  if_count: number;
  signal_or_fallback_count: number;
  collection_match_count: number;
  risk_symbol_declaration_count: number;
  score: number;
} {
  const absolutePath = path.join(repoRoot, filePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`hotspot scan target does not exist: ${filePath}`);
  }
  const source = fs.readFileSync(absolutePath, 'utf8');
  const ifCount = countMatchingLines(source, /\bif\s*\(/);
  const signalOrFallbackCount = countMatchingLines(source, /signal|Signal|fallback|Fallback/);
  const collectionMatchCount = countMatchingLines(source, /\.(?:includes|some|filter)\s*\(/);
  const riskSymbolDeclarationCount = countMatchingLines(
    source,
    /\b(?:function|const|let|var|type|interface|enum)\s+\w*(?:Signal|Signals|Fallback|RouteRule|RouteRules|Hardcoded|Heuristic|Need|Policy|Preflight|Dictionary|Capability|Intent)\w*/,
  );
  return {
    if_count: ifCount,
    signal_or_fallback_count: signalOrFallbackCount,
    collection_match_count: collectionMatchCount,
    risk_symbol_declaration_count: riskSymbolDeclarationCount,
    score: ifCount + signalOrFallbackCount + collectionMatchCount + riskSymbolDeclarationCount,
  };
}

function relativeRepoPath(absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/');
}

function validateTextHealth(filePath: string): void {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`mojibake scan target does not exist: ${filePath}`);
  }
  const text = fs.readFileSync(absolutePath, 'utf8');
  const lines = text.split(/\r\n|\n|\r/);
  const badLineIndex = lines.findIndex((line) => mojibakePattern.test(line));
  if (badLineIndex >= 0) {
    fail(`mojibake scan failed for ${filePath}:${badLineIndex + 1}`);
  }
}

function validateMojibakeScanTargets(inventory: RuleDebtInventory): void {
  if (!Array.isArray(inventory.mojibake_scan_targets) || inventory.mojibake_scan_targets.length < minimumMojibakeScanTargets) {
    fail(`mojibake_scan_targets must include at least ${minimumMojibakeScanTargets} governance and high-risk source files`);
  }

  const targets = new Set<string>();
  for (const target of inventory.mojibake_scan_targets) {
    const file = asString(target);
    if (!file) fail('mojibake_scan_targets must contain only non-empty strings');
    targets.add(file);
  }

  targets.add(relativeRepoPath(inventoryPath));
  targets.add(relativeRepoPath(inventoryMarkdownPath));
  targets.add(relativeRepoPath(guardrailScriptPath));

  if (Array.isArray(inventory.source_scan_targets)) {
    for (const target of inventory.source_scan_targets) {
      if (isRecord(target)) {
        targets.add(asString(target.file));
      }
    }
  }

  for (const file of targets) {
    validateTextHealth(file);
  }
}

function validateUntrackedHotspotAllowlist(inventory: RuleDebtInventory): void {
  if (!Array.isArray(inventory.untracked_hotspot_allowlist) || inventory.untracked_hotspot_allowlist.length < minimumUntrackedHotspotAllowlist) {
    fail(`untracked_hotspot_allowlist must include at least ${minimumUntrackedHotspotAllowlist} current hotspot candidates`);
  }

  const sourceTargets = new Set<string>();
  if (Array.isArray(inventory.source_scan_targets)) {
    for (const target of inventory.source_scan_targets) {
      if (isRecord(target)) sourceTargets.add(asString(target.file));
    }
  }

  const allowedHotspots = new Set<string>();
  for (const target of inventory.untracked_hotspot_allowlist) {
    if (!isRecord(target)) fail('untracked_hotspot_allowlist entries must be objects');
    const file = asString(target.file);
    if (!file) fail('untracked_hotspot_allowlist entries must include file');
    const recordedScore = metricNumber(target, 'score');
    const actual = scoreHotspotFile(file);
    if (actual.score > recordedScore) {
      fail(`untracked hotspot score expanded for ${file}: expected at most ${recordedScore}, actual ${actual.score}`);
    }
    allowedHotspots.add(file);
  }

  const candidateFiles = [
    ...walkTypeScriptFiles(path.join(repoRoot, 'frontend', 'src', 'src', 'lib')),
    ...walkTypeScriptFiles(path.join(repoRoot, 'frontend', 'src', 'src', 'app', 'api')),
  ];

  for (const file of candidateFiles) {
    if (sourceTargets.has(file) || allowedHotspots.has(file)) continue;
    const actual = scoreHotspotFile(file);
    if (actual.score >= untrackedHotspotScoreThreshold) {
      fail(`new untracked rule hotspot detected: ${file} scored ${actual.score}`);
    }
  }
}

function validateSourceScanTarget(target: SourceScanTarget, index: number): void {
  const file = asString(target.file);
  if (!file) fail(`source_scan_targets[${index}] is missing file`);
  const actual = scanSourceFile(file);

  for (const [key, value] of Object.entries(actual)) {
    const expected = metricNumber(target, key);
    if (key === 'lines') {
      continue;
    }
    if (value > expected) {
      fail(`source_scan_targets[${index}].${key} expanded for ${file}: expected at most ${expected}, actual ${value}`);
    }
  }
}

function validateSourceScanTargets(inventory: RuleDebtInventory): void {
  if (!Array.isArray(inventory.source_scan_targets) || inventory.source_scan_targets.length < 9) {
    fail('source_scan_targets must include the high-risk source file baseline list');
  }

  inventory.source_scan_targets.forEach((rawTarget, index) => {
    if (!rawTarget || typeof rawTarget !== 'object' || Array.isArray(rawTarget)) {
      fail(`source_scan_targets[${index}] must be an object`);
    }
    validateSourceScanTarget(rawTarget as SourceScanTarget, index);
  });

  const reportTarget = inventory.source_scan_targets.find((rawTarget) => (
    Boolean(rawTarget)
    && typeof rawTarget === 'object'
    && !Array.isArray(rawTarget)
    && asString((rawTarget as SourceScanTarget).file) === 'frontend/src/src/lib/report-query-orchestrator.ts'
  )) as SourceScanTarget | undefined;
  if (!reportTarget) fail('source_scan_targets must include report-query-orchestrator.ts');

  const legacyMetrics = inventory.inventory_metrics;
  const legacyMap = {
    report_query_orchestrator_lines: metricNumber(reportTarget, 'lines'),
    report_query_orchestrator_if_count: metricNumber(reportTarget, 'if_count'),
    report_query_orchestrator_signal_or_fallback_count: metricNumber(reportTarget, 'signal_or_fallback_count'),
    report_query_orchestrator_collection_match_count: metricNumber(reportTarget, 'collection_match_count'),
  };
  for (const [key, value] of Object.entries(legacyMap)) {
    const expected = metricNumber(legacyMetrics, key);
    if (expected !== value) {
      fail(`inventory_metrics.${key} must match source_scan_targets report ceiling`);
    }
  }
}

function validateGuardrailPolicies(inventory: RuleDebtInventory): void {
  if (!isRecord(inventory.guardrail_policies)) {
    fail('missing guardrail_policies');
  }

  const policies = inventory.guardrail_policies as GuardrailPolicies;
  if (policies.source_anchor_line_drift_max !== maxEntryLineDrift) {
    fail(`guardrail_policies.source_anchor_line_drift_max must be ${maxEntryLineDrift}`);
  }
  if (policies.minimum_inventory_entries !== minimumInventoryEntries) {
    fail(`guardrail_policies.minimum_inventory_entries must be ${minimumInventoryEntries}`);
  }
  if (policies.minimum_p0_or_p1_entries !== minimumP0OrP1Entries) {
    fail(`guardrail_policies.minimum_p0_or_p1_entries must be ${minimumP0OrP1Entries}`);
  }
  if (policies.minimum_p0_entries !== minimumP0Entries) {
    fail(`guardrail_policies.minimum_p0_entries must be ${minimumP0Entries}`);
  }
  if (policies.minimum_mojibake_scan_targets !== minimumMojibakeScanTargets) {
    fail(`guardrail_policies.minimum_mojibake_scan_targets must be ${minimumMojibakeScanTargets}`);
  }
  if (policies.untracked_hotspot_score_threshold !== untrackedHotspotScoreThreshold) {
    fail(`guardrail_policies.untracked_hotspot_score_threshold must be ${untrackedHotspotScoreThreshold}`);
  }
  if (policies.minimum_untracked_hotspot_allowlist !== minimumUntrackedHotspotAllowlist) {
    fail(`guardrail_policies.minimum_untracked_hotspot_allowlist must be ${minimumUntrackedHotspotAllowlist}`);
  }
  if (policies.source_density_count_mode !== 'upper_bound') {
    fail('guardrail_policies.source_density_count_mode must be "upper_bound"');
  }
  if (policies.runtime_migration_gate_owner !== 'expert_committee') {
    fail('guardrail_policies.runtime_migration_gate_owner must be "expert_committee"');
  }
  const densityFields = policies.source_density_fields;
  if (
    !Array.isArray(densityFields)
    || !['if_count', 'signal_or_fallback_count', 'collection_match_count', 'risk_symbol_declaration_count'].every((field) => densityFields.includes(field))
  ) {
    fail('guardrail_policies.source_density_fields must include if_count, signal_or_fallback_count, collection_match_count, and risk_symbol_declaration_count');
  }
  const reviewEvidenceFields = policies.required_review_evidence_fields;
  if (
    !Array.isArray(reviewEvidenceFields)
    || !requiredReviewEvidenceFields.every((field) => reviewEvidenceFields.includes(field))
  ) {
    fail(`guardrail_policies.required_review_evidence_fields must include ${requiredReviewEvidenceFields.join(', ')}`);
  }
  const dispositionEvidenceFields = policies.required_disposition_evidence_fields;
  if (
    !Array.isArray(dispositionEvidenceFields)
    || !requiredDispositionEvidenceFields.every((field) => dispositionEvidenceFields.includes(field))
  ) {
    fail(`guardrail_policies.required_disposition_evidence_fields must include ${requiredDispositionEvidenceFields.join(', ')}`);
  }
}

function validateRuntimeValidationStatus(inventory: RuleDebtInventory): void {
  if (!isRecord(inventory.runtime_validation_status)) {
    fail('missing runtime_validation_status');
  }
  const status = inventory.runtime_validation_status;
  if (!asString(status.last_checked_at)) {
    fail('runtime_validation_status.last_checked_at is required');
  }

  const staticGuardrail = status.static_guardrail;
  const staticGuardrailStatus = isRecord(staticGuardrail) ? asString(staticGuardrail.status) : '';
  const allowedStaticGuardrailStatuses = new Set(['passed', 'blocked_source_density_expansion']);
  if (
    !isRecord(staticGuardrail)
    || asString(staticGuardrail.command) !== 'npm run check:rule-debt-inventory'
    || !allowedStaticGuardrailStatuses.has(staticGuardrailStatus)
  ) {
    fail('runtime_validation_status.static_guardrail must record npm run check:rule-debt-inventory as passed or blocked_source_density_expansion');
  }
  if (staticGuardrailStatus === 'blocked_source_density_expansion' && staticGuardrail.runtime_migration_allowed !== false) {
    fail('runtime_validation_status.static_guardrail.runtime_migration_allowed must be false when source density expansion is blocked');
  }

  const projectValidation = status.project_validation;
  const projectValidationStatus = isRecord(projectValidation) ? asString(projectValidation.status) : '';
  const allowedProjectValidationStatuses = new Set(['passed', 'blocked_unapproved_runtime_diff']);
  if (
    !isRecord(projectValidation)
    || asString(projectValidation.command) !== 'npm run validate:ad-ui'
    || !allowedProjectValidationStatuses.has(projectValidationStatus)
  ) {
    fail('runtime_validation_status.project_validation must record npm run validate:ad-ui as passed or blocked_unapproved_runtime_diff');
  }
  if (projectValidationStatus === 'blocked_unapproved_runtime_diff' && projectValidation.runtime_migration_allowed !== false) {
    fail('runtime_validation_status.project_validation.runtime_migration_allowed must be false when runtime diffs are blocked');
  }

  const configProbe = status.real_provider_config_probe;
  if (
    !isRecord(configProbe)
    || asString(configProbe.command) !== 'npm run test:real-provider-config-probe'
    || asString(configProbe.status) !== 'passed'
    || configProbe.uses_mock !== false
  ) {
    fail('runtime_validation_status.real_provider_config_probe must be passed with uses_mock=false');
  }

  const mcpConnectivity = status.real_mcp_connectivity;
  if (
    !isRecord(mcpConnectivity)
    || asString(mcpConnectivity.command) !== 'npm run test:real-mcp-connectivity'
    || asString(mcpConnectivity.status) !== 'passed'
    || mcpConnectivity.uses_mock !== false
  ) {
    fail('runtime_validation_status.real_mcp_connectivity must be passed with uses_mock=false');
  }

  const strictChat = status.strict_real_chat_e2e;
  if (!isRecord(strictChat)) {
    fail('runtime_validation_status.strict_real_chat_e2e is required');
  }
  if (asString(strictChat.command) !== 'npm run test:real-provider-chat-e2e') {
    fail('runtime_validation_status.strict_real_chat_e2e.command must be npm run test:real-provider-chat-e2e');
  }
  const strictStatus = asString(strictChat.status);
  if (!allowedStrictRealChatBlockedStatuses.has(strictStatus)) {
    fail('runtime_validation_status.strict_real_chat_e2e must remain blocked until real samples pass');
  }
  if (strictChat.uses_mock !== false) {
    fail('runtime_validation_status.strict_real_chat_e2e.uses_mock must be false');
  }
  if (strictStatus !== 'passed' && strictChat.runtime_migration_allowed !== false) {
    fail('runtime_validation_status.strict_real_chat_e2e.runtime_migration_allowed must be false when not passed');
  }
  if (strictStatus === 'blocked_missing_controlled_samples') {
    const missingEnv = strictChat.missing_required_env;
    if (!Array.isArray(missingEnv)) {
      fail('runtime_validation_status.strict_real_chat_e2e.missing_required_env must be an array');
    }
    for (const envName of requiredStrictRealChatEnv) {
      if (!missingEnv.includes(envName)) {
        fail(`runtime_validation_status.strict_real_chat_e2e missing required env marker ${envName}`);
      }
    }
  }
  if (strictStatus === 'blocked_real_validation_failures') {
    const failureCases = strictChat.failure_cases;
    if (!Array.isArray(failureCases) || failureCases.length === 0) {
      fail('runtime_validation_status.strict_real_chat_e2e.failure_cases must record real validation failures');
    }
  }
  if (strictStatus === 'passed') {
    if (strictChat.runtime_migration_allowed !== false && strictChat.runtime_migration_allowed !== true) {
      fail('runtime_validation_status.strict_real_chat_e2e.runtime_migration_allowed must be boolean');
    }
  }
}

function validateRuntimeDiffGateMetadata(inventory: RuleDebtInventory): void {
  const gate = inventory.runtime_migration_gate;
  if (!isRecord(gate)) {
    fail('missing runtime_migration_gate');
  }
  if (asString(gate.diff_gate_command) !== 'npm run check:runtime-migration-gate') {
    fail('runtime_migration_gate.diff_gate_command must be npm run check:runtime-migration-gate');
  }
  if (asString(gate.diff_gate_policy) !== 'block runtime diffs while P0/P1 entries remain pending expert committee approval') {
    fail('runtime_migration_gate.diff_gate_policy must record the unapproved runtime diff blocking policy');
  }

  const gateStatus = asString(gate.status);
  const p0p1Pending = countPendingP0P1Entries(inventory);

  if (gateStatus === 'approved' || gateStatus === 'approved_with_conditions') {
    if (p0p1Pending > 0) {
      fail(`runtime_migration_gate cannot be "${gateStatus}" while ${p0p1Pending} P0/P1 entries remain pending`);
    }
    const status = inventory.runtime_validation_status as Record<string, unknown> | undefined;
    const staticGuardrail = status?.static_guardrail as Record<string, unknown> | undefined;
    const projectValidation = status?.project_validation as Record<string, unknown> | undefined;
    const e2e = status?.browser_real_chat_e2e as Record<string, unknown> | undefined;
    const staticStatus = isRecord(staticGuardrail) ? asString(staticGuardrail.status) : '';
    const projectStatus = isRecord(projectValidation) ? asString(projectValidation.status) : '';
    const e2eStatus = isRecord(e2e) ? asString(e2e.status) : '';
    if (staticStatus !== 'passed') {
      fail('runtime_migration_gate cannot be approved while static_guardrail is not passed');
    }
    if (projectStatus !== 'passed') {
      fail('runtime_migration_gate cannot be approved while project_validation is not passed');
    }
    if (e2eStatus !== 'passed') {
      fail('runtime_migration_gate cannot be approved while browser_real_chat_e2e is not passed');
    }
    return;
  }

  if (gate.runtime_migration_allowed !== false) {
    fail('runtime_migration_gate.runtime_migration_allowed must be false when gate is blocked');
  }
}

function validateMandatoryValidationPack(inventory: RuleDebtInventory): unknown[] {
  if (!Array.isArray(inventory.mandatory_validation_pack) || inventory.mandatory_validation_pack.length < 4) {
    fail('mandatory_validation_pack must include at least four validation requirements');
  }
  validateValidationCoverage('GLOBAL', inventory.mandatory_validation_pack, 'mandatory_validation_pack');
  return inventory.mandatory_validation_pack;
}

function validateRequiredInventorySymbols(inventory: RuleDebtInventory): Set<string> {
  if (!Array.isArray(inventory.required_inventory_symbols) || inventory.required_inventory_symbols.length < minimumInventoryEntries) {
    fail(`required_inventory_symbols must include at least ${minimumInventoryEntries} symbols`);
  }

  const requiredSymbols = new Set<string>();
  for (const rawSymbol of inventory.required_inventory_symbols) {
    const symbol = asString(rawSymbol);
    if (!symbol) fail('required_inventory_symbols must contain only non-empty strings');
    if (requiredSymbols.has(symbol)) fail(`duplicate required inventory symbol "${symbol}"`);
    requiredSymbols.add(symbol);
  }
  return requiredSymbols;
}

function validateExpertReviewDocket(inventory: RuleDebtInventory): void {
  const docketPath = asString(inventory.expert_review_docket);
  if (!docketPath) fail('missing expert_review_docket');

  const absoluteDocketPath = path.join(repoRoot, docketPath);
  if (!fs.existsSync(absoluteDocketPath)) {
    fail(`expert_review_docket does not exist: ${docketPath}`);
  }

  const docket = fs.readFileSync(absoluteDocketPath, 'utf8');
  const p0p1Pending = countPendingP0P1Entries(inventory);
  if (p0p1Pending > 0) {
    if (!/status:\s*`pending_review`/.test(docket)) {
      fail('expert_review_docket must remain pending_review while P0/P1 entries are still pending');
    }
    if (!/runtime migration:\s*`blocked`/.test(docket)) {
      fail('expert_review_docket must keep runtime migration blocked while entries are pending');
    }
  }

  if (!Array.isArray(inventory.entries)) return;
  const p0Entries = inventory.entries
    .filter((entry) => isRecord(entry) && isP0((entry as RuleDebtEntry).risk_level))
    .map((entry) => asString((entry as RuleDebtEntry).id))
    .filter(Boolean);
  for (const id of p0Entries) {
    if (!docket.includes(`\`${id}\``)) {
      fail(`expert_review_docket is missing P0 entry ${id}`);
    }
  }
}

function validateMigrationQueue(inventory: RuleDebtInventory): void {
  const queuePath = asString(inventory.migration_queue);
  if (!queuePath) fail('missing migration_queue');

  const absoluteQueuePath = path.join(repoRoot, queuePath);
  if (!fs.existsSync(absoluteQueuePath)) {
    fail(`migration_queue does not exist: ${queuePath}`);
  }

  const queue = fs.readFileSync(absoluteQueuePath, 'utf8');
  const p0p1Pending = countPendingP0P1Entries(inventory);
  if (p0p1Pending > 0) {
    if (!/status:\s*`blocked_pending_expert_review`/.test(queue)) {
      fail('migration_queue must remain blocked_pending_expert_review while P0/P1 entries are pending');
    }
    if (!/runtime migration:\s*`blocked`/.test(queue)) {
      fail('migration_queue must keep runtime migration blocked while entries are pending');
    }
  }

  if (!Array.isArray(inventory.entries)) return;
  const gatedEntries = inventory.entries
    .filter((entry) => isRecord(entry) && isP0OrP1((entry as RuleDebtEntry).risk_level))
    .map((entry) => asString((entry as RuleDebtEntry).id))
    .filter(Boolean);
  for (const id of gatedEntries) {
    if (!queue.includes(`\`${id}\``)) {
      fail(`migration_queue is missing P0/P1 entry ${id}`);
    }
  }
}

function validateReviewPackets(inventory: RuleDebtInventory): void {
  if (!isRecord(inventory.review_packets)) {
    fail('missing review_packets');
  }
  const b5PacketPath = asString(inventory.review_packets['B5-public-source-arbitration']);
  if (!b5PacketPath) {
    fail('review_packets must include B5-public-source-arbitration');
  }
  const absolutePacketPath = path.join(repoRoot, b5PacketPath);
  if (!fs.existsSync(absolutePacketPath)) {
    fail(`B5 review packet does not exist: ${b5PacketPath}`);
  }

  const packet = fs.readFileSync(absolutePacketPath, 'utf8');
  if (!/status:\s*`pending_expert_review`/.test(packet)) {
    fail('B5 review packet must remain pending_expert_review');
  }
  if (!/runtime migration:\s*`blocked`/.test(packet)) {
    fail('B5 review packet must keep runtime migration blocked');
  }
  const requiredB5Entries = ['PWR-001', 'PWR-002', 'PWR-003', 'FNR-001', 'FNR-002', 'API-005', 'API-008', 'API-009', 'OAPC-002', 'RTC-001', 'RTC-002', 'WSR-001'];
  for (const id of requiredB5Entries) {
    if (!packet.includes(`\`${id}\``)) {
      fail(`B5 review packet is missing entry ${id}`);
    }
  }
}

function main(): void {
  const inventory = loadInventory();
  if (asString(inventory.document_id) !== 'ai-chat-rule-debt-inventory-2026-06-13') {
    fail('unexpected or missing document_id');
  }

  const gateStatus = asString(inventory.runtime_migration_gate?.status);
  if (!allowedMigrationGateStatuses.has(gateStatus)) {
    fail(`unsupported runtime_migration_gate.status "${gateStatus}"`);
  }

  if (gateStatus !== 'blocked_until_expert_committee_approval'
    && gateStatus !== 'approved'
    && gateStatus !== 'approved_with_conditions') {
    fail('runtime migration gate status must be blocked_until_expert_committee_approval, approved, or approved_with_conditions');
  }
  validateRuntimeDiffGateMetadata(inventory);

  if (!inventory.review_status_policy || typeof inventory.review_status_policy !== 'object') {
    fail('missing review_status_policy');
  }

  validateGuardrailPolicies(inventory);
  validateRuntimeValidationStatus(inventory);
  const mandatoryValidationPack = validateMandatoryValidationPack(inventory);
  const requiredSymbols = validateRequiredInventorySymbols(inventory);
  validateExpertReviewDocket(inventory);
  validateMigrationQueue(inventory);
  validateReviewPackets(inventory);
  validateSourceScanTargets(inventory);
  validateMojibakeScanTargets(inventory);
  validateUntrackedHotspotAllowlist(inventory);

  if (!Array.isArray(inventory.entries)) {
    fail('entries must be an array');
  }

  const ids = new Set<string>();
  const symbols = new Set<string>();

  inventory.entries.forEach((rawEntry, index) => {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      fail(`entry[${index}] must be an object`);
    }
    const entry = rawEntry as RuleDebtEntry;
    validateEntry(entry, index);
    validateValidationCoverage(
      asString(entry.id),
      [...(entry.validation_required as unknown[]), ...mandatoryValidationPack],
      'validation_required plus mandatory_validation_pack',
    );

    const id = asString(entry.id);
    if (ids.has(id)) fail(`duplicate entry id "${id}"`);
    ids.add(id);
    symbols.add(asString(entry.symbol));
  });

  for (const symbol of requiredSymbols) {
    if (!symbols.has(symbol)) {
      fail(`missing required inventory symbol "${symbol}"`);
    }
  }

  const p0OrP1 = inventory.entries.filter((entry) => isP0OrP1((entry as RuleDebtEntry).risk_level)).length;
  const p0 = inventory.entries.filter((entry) => isP0((entry as RuleDebtEntry).risk_level)).length;
  if (inventory.entries.length < minimumInventoryEntries) {
    fail(`inventory must keep at least ${minimumInventoryEntries} rule debt entries`);
  }
  if (p0OrP1 < minimumP0OrP1Entries) {
    fail(`inventory must keep at least ${minimumP0OrP1Entries} P0/P1 gated entries`);
  }
  if (p0 < minimumP0Entries) {
    fail(`inventory must keep at least ${minimumP0Entries} P0 blocking entries`);
  }
  const sourceBaselineCount = Array.isArray(inventory.source_scan_targets) ? inventory.source_scan_targets.length : 0;
  const hotspotAllowlistCount = Array.isArray(inventory.untracked_hotspot_allowlist) ? inventory.untracked_hotspot_allowlist.length : 0;
  console.log(
    `rule debt inventory guardrail passed: ${inventory.entries.length} entries anchored, `
    + `${p0OrP1} P0/P1 entries gated (${p0} P0), `
    + `${sourceBaselineCount} source baselines checked, ${hotspotAllowlistCount} hotspot candidates watched`,
  );
}

main();
