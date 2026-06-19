import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Inventory = {
  inventory_metrics?: Record<string, unknown>;
  required_inventory_symbols?: string[];
  entries?: Array<Record<string, unknown>>;
  source_scan_targets?: Array<Record<string, unknown>>;
  untracked_hotspot_allowlist?: Array<Record<string, unknown>>;
  mojibake_scan_targets?: string[];
  runtime_validation_status?: Record<string, unknown>;
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..', '..');
const inventoryPath = path.join(repoRoot, 'docs', 'review', 'ai-chat-rule-debt-inventory-2026-06-13.json');
const guardrailScript = path.join('scripts', 'rule-debt-inventory-guardrail.ts');
const npmBinary = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function fail(message: string): never {
  throw new Error(`[rule-debt-inventory-self-test] ${message}`);
}

function loadInventory(): Inventory {
  return JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as Inventory;
}

function runGuardrail(tempInventoryPath: string): string {
  const command = process.platform === 'win32' ? 'cmd.exe' : npmBinary;
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', npmBinary, 'exec', 'tsx', guardrailScript]
    : ['exec', 'tsx', guardrailScript];
  const result = spawnSync(command, args, {
    cwd: frontendRoot,
    env: {
      ...process.env,
      RULE_DEBT_INVENTORY_PATH: tempInventoryPath,
    },
    encoding: 'utf8',
  });
  return `${result.error ? String(result.error) : ''}${result.stdout || ''}${result.stderr || ''}`;
}

function countMatchingLines(text: string, pattern: RegExp): number {
  return text.split(/\r\n|\n|\r/).filter((line) => pattern.test(line)).length;
}

function scanSourceFile(filePath: string): Record<string, number> {
  const absolutePath = path.join(repoRoot, filePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const ifCount = countMatchingLines(source, /\bif\s*\(/);
  const signalOrFallbackCount = countMatchingLines(source, /signal|Signal|fallback|Fallback/);
  const collectionMatchCount = countMatchingLines(source, /\.(?:includes|some|filter)\s*\(/);
  const riskSymbolDeclarationCount = countMatchingLines(
    source,
    /\b(?:function|const|let|var|type|interface|enum)\s+\w*(?:Signal|Signals|Fallback|RouteRule|RouteRules|Hardcoded|Heuristic|Need|Policy|Preflight|Dictionary|Capability|Intent)\w*/,
  );
  return {
    lines: source.split(/\r\n|\n|\r/).length,
    if_count: ifCount,
    signal_or_fallback_count: signalOrFallbackCount,
    collection_match_count: collectionMatchCount,
    risk_symbol_declaration_count: riskSymbolDeclarationCount,
    score: ifCount + signalOrFallbackCount + collectionMatchCount + riskSymbolDeclarationCount,
  };
}

function nearestSymbolLine(filePath: string, symbol: string, preferredLine: number): number | undefined {
  const absolutePath = path.join(repoRoot, filePath);
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r\n|\n|\r/);
  const matches: number[] = [];
  lines.forEach((line, index) => {
    if (line.includes(symbol)) {
      matches.push(index + 1);
    }
  });
  if (matches.length === 0) return undefined;
  return matches.reduce((best, current) => (
    Math.abs(current - preferredLine) < Math.abs(best - preferredLine) ? current : best
  ));
}

function makeInventoryFixturePassCurrentSourceDensity(inventory: Inventory): void {
  if (!Array.isArray(inventory.source_scan_targets)) {
    fail('source_scan_targets fixture missing');
  }
  for (const target of inventory.source_scan_targets) {
    const file = typeof target.file === 'string' ? target.file : '';
    if (!file) fail('source_scan_targets fixture entry missing file');
    Object.assign(target, scanSourceFile(file));
  }
  const reportTarget = inventory.source_scan_targets.find(
    (target) => target.file === 'frontend/src/src/lib/report-query-orchestrator.ts',
  );
  if (reportTarget) {
    inventory.inventory_metrics = {
      ...(inventory.inventory_metrics || {}),
      report_query_orchestrator_lines: reportTarget.lines,
      report_query_orchestrator_if_count: reportTarget.if_count,
      report_query_orchestrator_signal_or_fallback_count: reportTarget.signal_or_fallback_count,
      report_query_orchestrator_collection_match_count: reportTarget.collection_match_count,
    };
  }
  if (Array.isArray(inventory.untracked_hotspot_allowlist)) {
    for (const target of inventory.untracked_hotspot_allowlist) {
      const file = typeof target.file === 'string' ? target.file : '';
      if (!file) fail('untracked_hotspot_allowlist fixture entry missing file');
      target.score = scanSourceFile(file).score;
    }
  }
  if (Array.isArray(inventory.entries)) {
    for (const entry of inventory.entries) {
      const file = typeof entry.file === 'string' ? entry.file : '';
      const symbol = typeof entry.symbol === 'string' ? entry.symbol : '';
      const line = typeof entry.line === 'number' ? entry.line : 1;
      if (!file || !symbol) continue;
      const nearestLine = nearestSymbolLine(file, symbol, line);
      if (nearestLine) {
        entry.line = nearestLine;
      }
    }
  }
}

function expectFailure(name: string, mutate: (inventory: Inventory, tempDir: string) => void, expectedPattern: RegExp): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rule-debt-guardrail-'));
  const tempInventoryPath = path.join(tempDir, 'inventory.json');
  const inventory = loadInventory();
  makeInventoryFixturePassCurrentSourceDensity(inventory);
  mutate(inventory, tempDir);
  fs.writeFileSync(tempInventoryPath, JSON.stringify(inventory, null, 2), 'utf8');

  const output = runGuardrail(tempInventoryPath);
  if (!expectedPattern.test(output)) {
    fail(`${name} did not fail with expected message. Output:\n${output}`);
  }
}

expectFailure('missing required symbol', (inventory) => {
  inventory.required_inventory_symbols = [
    ...(inventory.required_inventory_symbols || []),
    '__missing_required_symbol__',
  ];
}, /missing required inventory symbol|required_inventory_symbols must include/);

expectFailure('approved without review evidence', (inventory) => {
  const entry = inventory.entries?.find(item => item.id === 'RQO-003');
  if (!entry) fail('RQO-003 fixture entry missing');
  entry.committee_status = 'approved';
  delete entry.review_evidence;
}, /approved.*no structured review_evidence/);

expectFailure('hotspot score shrink bypass', (inventory) => {
  const hotspot = inventory.untracked_hotspot_allowlist?.find(item => item.file === 'frontend/src/src/lib/route-decision-observation.ts');
  if (!hotspot) fail('route-decision-observation hotspot fixture missing');
  hotspot.score = 1;
}, /untracked hotspot score expanded/);

expectFailure('mojibake health failure', (inventory, tempDir) => {
  const badFile = path.join(tempDir, 'bad-text.md');
  fs.writeFileSync(badFile, String.fromCharCode(0xfffd), 'utf8');
  inventory.mojibake_scan_targets = [
    ...(inventory.mojibake_scan_targets || []),
    path.relative(repoRoot, badFile).replace(/\\/g, '/'),
  ];
}, /mojibake scan failed/);

expectFailure('strict real chat e2e cannot be faked as passed', (inventory) => {
  const status = inventory.runtime_validation_status;
  if (!status || typeof status !== 'object') fail('runtime_validation_status fixture missing');
  const strictChat = status.strict_real_chat_e2e;
  if (!strictChat || typeof strictChat !== 'object' || Array.isArray(strictChat)) {
    fail('strict_real_chat_e2e fixture missing');
  }
  const strictChatRecord = strictChat as Record<string, unknown>;
  strictChatRecord.status = 'passed';
  strictChatRecord.runtime_migration_allowed = true;
}, /strict_real_chat_e2e must remain blocked until real samples pass/);

expectFailure('real provider config probe cannot use mock', (inventory) => {
  const status = inventory.runtime_validation_status;
  if (!status || typeof status !== 'object') fail('runtime_validation_status fixture missing');
  const configProbe = status.real_provider_config_probe;
  if (!configProbe || typeof configProbe !== 'object' || Array.isArray(configProbe)) {
    fail('real_provider_config_probe fixture missing');
  }
  const configProbeRecord = configProbe as Record<string, unknown>;
  configProbeRecord.uses_mock = true;
}, /real_provider_config_probe must be passed with uses_mock=false/);

console.log('rule debt inventory guardrail self-test passed');
