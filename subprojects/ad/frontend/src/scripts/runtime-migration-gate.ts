import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type InventoryEntry = {
  risk_level?: unknown;
  committee_status?: unknown;
};

type SourceScanTarget = {
  file?: unknown;
};

type RuleDebtInventory = {
  runtime_migration_gate?: {
    status?: unknown;
  };
  source_scan_targets?: unknown;
  entries?: unknown;
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..', '..');
const inventoryPath = process.env.RULE_DEBT_INVENTORY_PATH
  ? path.resolve(process.env.RULE_DEBT_INVENTORY_PATH)
  : path.join(repoRoot, 'docs', 'review', 'ai-chat-rule-debt-inventory-2026-06-13.json');

const runtimePrefixes = [
  'frontend/src/src/app/api/chat/',
  'frontend/src/src/app/api/xiaoqiao/web-search/',
  'frontend/src/src/contracts/',
  'frontend/src/src/lib/',
];

function fail(message: string): never {
  console.error(`runtime migration gate failed: ${message}`);
  process.exit(1);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeGitPath(file: string): string {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

function gitChangedFiles(args: string[]): string[] {
  try {
    const output = execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split(/\r?\n/)
      .map((line) => normalizeGitPath(line.trim()))
      .filter(Boolean);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    fail(`unable to inspect git diff (${args.join(' ')}): ${reason}`);
  }
}

function envFileList(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(/\r?\n|,/)
    .map((line) => normalizeGitPath(line.trim()))
    .filter(Boolean);
}

function collectChangedFiles(): Set<string> {
  const injectedFiles = [
    ...envFileList('RULE_DEBT_RUNTIME_GATE_TRACKED_FILES'),
    ...envFileList('RULE_DEBT_RUNTIME_GATE_STAGED_FILES'),
    ...envFileList('RULE_DEBT_RUNTIME_GATE_UNTRACKED_FILES'),
  ];
  if (injectedFiles.length > 0) {
    if (process.env.RULE_DEBT_RUNTIME_GATE_SELF_TEST !== '1') {
      fail('RULE_DEBT_RUNTIME_GATE_* file injection is allowed only when RULE_DEBT_RUNTIME_GATE_SELF_TEST=1');
    }
    return new Set(injectedFiles);
  }

  return new Set([
    ...gitChangedFiles(['diff', '--name-only', '--']),
    ...gitChangedFiles(['diff', '--cached', '--name-only', '--']),
    ...gitChangedFiles(['ls-files', '--others', '--exclude-standard', '--']),
  ]);
}

function loadInventory(): RuleDebtInventory {
  if (!fs.existsSync(inventoryPath)) {
    fail(`inventory file not found: ${inventoryPath}`);
  }
  return JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as RuleDebtInventory;
}

function sourceScanTargetFiles(inventory: RuleDebtInventory): Set<string> {
  if (!Array.isArray(inventory.source_scan_targets)) {
    fail('inventory.source_scan_targets must be an array');
  }
  return new Set(
    inventory.source_scan_targets
      .map((target) => normalizeGitPath(asString((target as SourceScanTarget).file)))
      .filter(Boolean),
  );
}

function countPendingP0P1(inventory: RuleDebtInventory): number {
  if (!Array.isArray(inventory.entries)) {
    fail('inventory.entries must be an array');
  }
  return inventory.entries.filter((entry) => {
    const item = entry as InventoryEntry;
    const riskLevel = asString(item.risk_level);
    const committeeStatus = asString(item.committee_status);
    return (riskLevel.startsWith('P0') || riskLevel.startsWith('P1')) && (committeeStatus === 'pending' || committeeStatus === '');
  }).length;
}

function isRuntimePath(file: string, sourceTargets: Set<string>): boolean {
  if (sourceTargets.has(file)) return true;
  return runtimePrefixes.some((prefix) => file.startsWith(prefix));
}

function main(): void {
  const inventory = loadInventory();
  const gateStatus = asString(inventory.runtime_migration_gate?.status);
  const pendingP0P1Count = countPendingP0P1(inventory);

  if (pendingP0P1Count === 0) {
    console.log('runtime migration gate passed: no blocked P0/P1 migration gate is active');
    return;
  }
  if (gateStatus !== 'blocked_until_expert_committee_approval') {
    fail(`runtime_migration_gate.status must remain blocked while ${pendingP0P1Count} P0/P1 rule-debt entries are still pending`);
  }

  const sourceTargets = sourceScanTargetFiles(inventory);
  const changedFiles = collectChangedFiles();
  const runtimeDiffs = [...changedFiles]
    .filter((file) => isRuntimePath(file, sourceTargets))
    .sort((left, right) => left.localeCompare(right));

  if (runtimeDiffs.length > 0) {
    const shown = runtimeDiffs.slice(0, 30).map((file) => `  - ${file}`).join('\n');
    const suffix = runtimeDiffs.length > 30 ? `\n  ... ${runtimeDiffs.length - 30} more` : '';
    fail(
      [
        `${runtimeDiffs.length} runtime file(s) changed while ${pendingP0P1Count} P0/P1 rule-debt entries are still pending expert committee approval.`,
        'Do not migrate runtime until review_evidence approves the specific scope.',
        shown + suffix,
      ].join('\n'),
    );
  }

  console.log(`runtime migration gate passed: no runtime diffs while ${pendingP0P1Count} P0/P1 entries remain pending`);
}

main();
