import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(dirname, '..');
const gateScript = path.join('scripts', 'runtime-migration-gate.ts');
const npmBinary = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function fail(message: string): never {
  throw new Error(`[runtime-migration-gate-self-test] ${message}`);
}

function writeInventory(tempDir: string, options?: { approved?: boolean; noPending?: boolean }): string {
  const inventoryPath = path.join(tempDir, 'inventory.json');
  const committeeStatus = options?.noPending ? 'approved' : 'pending';
  const riskLevel = options?.noPending ? 'P2 可治理保留' : 'P1 必须迁移';
  const inventory = {
    runtime_migration_gate: {
      status: options?.approved ? 'approved' : 'blocked_until_expert_committee_approval',
    },
    source_scan_targets: [
      {
        file: 'frontend/src/src/lib/public-web-runtime.ts',
      },
    ],
    entries: [
      {
        risk_level: riskLevel,
        committee_status: committeeStatus,
      },
    ],
  };
  fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf8');
  return inventoryPath;
}

function runGate(inventoryPath: string, env: Record<string, string>): { status: number | null; output: string } {
  const command = process.platform === 'win32' ? 'cmd.exe' : npmBinary;
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', npmBinary, 'exec', 'tsx', gateScript]
    : ['exec', 'tsx', gateScript];
  const result = spawnSync(command, args, {
    cwd: frontendRoot,
    env: {
      ...process.env,
      RULE_DEBT_INVENTORY_PATH: inventoryPath,
      RULE_DEBT_RUNTIME_GATE_SELF_TEST: '1',
      ...env,
    },
    encoding: 'utf8',
  });
  return {
    status: result.status,
    output: `${result.error ? String(result.error) : ''}${result.stdout || ''}${result.stderr || ''}`,
  };
}

function expectInjectionRejectedWithoutSelfTestFlag(): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-gate-'));
  const inventoryPath = writeInventory(tempDir);
  const command = process.platform === 'win32' ? 'cmd.exe' : npmBinary;
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', npmBinary, 'exec', 'tsx', gateScript]
    : ['exec', 'tsx', gateScript];
  const result = spawnSync(command, args, {
    cwd: frontendRoot,
    env: {
      ...process.env,
      RULE_DEBT_INVENTORY_PATH: inventoryPath,
      RULE_DEBT_RUNTIME_GATE_TRACKED_FILES: 'docs/review/ai-chat-rule-debt-inventory-2026-06-13.md',
    },
    encoding: 'utf8',
  });
  const output = `${result.error ? String(result.error) : ''}${result.stdout || ''}${result.stderr || ''}`;
  if (result.status === 0 || !/file injection is allowed only/.test(output)) {
    fail(`file injection without self-test flag should be rejected. Output:\n${output}`);
  }
}

function expectPass(name: string, env: Record<string, string>, options?: { approved?: boolean; noPending?: boolean }): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-gate-'));
  const inventoryPath = writeInventory(tempDir, options);
  const result = runGate(inventoryPath, env);
  if (result.status !== 0) {
    fail(`${name} should pass. Output:\n${result.output}`);
  }
}

function expectFailure(
  name: string,
  env: Record<string, string>,
  expectedPattern: RegExp,
  options?: { approved?: boolean; noPending?: boolean },
): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-gate-'));
  const inventoryPath = writeInventory(tempDir, options);
  const result = runGate(inventoryPath, env);
  if (result.status === 0 || !expectedPattern.test(result.output)) {
    fail(`${name} should fail with expected message. Output:\n${result.output}`);
  }
}

expectFailure(
  'tracked source target runtime diff',
  { RULE_DEBT_RUNTIME_GATE_TRACKED_FILES: 'frontend/src/src/lib/public-web-runtime.ts' },
  /1 runtime file\(s\) changed/,
);

expectInjectionRejectedWithoutSelfTestFlag();

expectFailure(
  'staged runtime prefix diff',
  { RULE_DEBT_RUNTIME_GATE_STAGED_FILES: 'frontend/src/src/contracts/model-service/prompt-variable-contract.ts' },
  /prompt-variable-contract\.ts/,
);

expectFailure(
  'untracked runtime prefix diff',
  { RULE_DEBT_RUNTIME_GATE_UNTRACKED_FILES: 'frontend/src/src/lib/new-runtime-rule.ts' },
  /new-runtime-rule\.ts/,
);

expectPass(
  'governance-only docs diff',
  { RULE_DEBT_RUNTIME_GATE_TRACKED_FILES: 'docs/review/ai-chat-rule-debt-inventory-2026-06-13.md' },
);

expectFailure(
  'approved gate is rejected while p0p1 pending',
  { RULE_DEBT_RUNTIME_GATE_TRACKED_FILES: 'frontend/src/src/lib/public-web-runtime.ts' },
  /status must remain blocked while 1 P0\/P1 rule-debt entries are still pending/,
  { approved: true },
);

expectPass(
  'no pending p0p1 skips runtime diff',
  { RULE_DEBT_RUNTIME_GATE_TRACKED_FILES: 'frontend/src/src/lib/public-web-runtime.ts' },
  { noPending: true },
);

console.log('runtime migration gate self-test passed');
