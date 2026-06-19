import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';
import {
  evaluateIntentRouteRules,
  normalizeIntentRouteRulesConfig,
  type IntentRouteRule,
  type IntentRouteRulesConfig,
} from './intent-route-rules';

const STORE_PATH = runtimeDataPath('intent-route-rules.json');

export function loadIntentRouteRulesSync(): IntentRouteRulesConfig {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, 'utf8');
      return normalizeIntentRouteRulesConfig(JSON.parse(raw) as Partial<IntentRouteRulesConfig>);
    }
  } catch {
    // Fall through to defaults.
  }
  return normalizeIntentRouteRulesConfig();
}

export function matchesDebuggingRoute(message: string): boolean {
  const config = loadIntentRouteRulesSync();
  return evaluateIntentRouteRules({ message, rules: config.rules })
    .some((candidate) => candidate.rule.intent_type === 'debugging');
}

export async function saveIntentRouteRulesConfig(
  patch: Partial<IntentRouteRulesConfig> & { note?: string },
): Promise<IntentRouteRulesConfig> {
  const before = loadIntentRouteRulesSync();
  const nextVersion = before.current_version + 1;
  const now = new Date().toISOString();
  const next = normalizeIntentRouteRulesConfig({
    ...before,
    ...patch,
    current_version: nextVersion,
    active_version: nextVersion,
    updated_at: now,
    versions: [
      ...before.versions,
      {
        version: nextVersion,
        note: patch.note || 'update rules',
        created_at: now,
        rules: Array.isArray(patch.rules) ? patch.rules : before.rules,
      },
    ],
  });
  await writeConfig(next);
  return next;
}

export async function updateIntentRouteRules(
  rules: IntentRouteRule[],
  note = 'update rules',
): Promise<IntentRouteRulesConfig> {
  return saveIntentRouteRulesConfig({ rules, note });
}

export async function rollbackIntentRouteRules(version: number): Promise<IntentRouteRulesConfig | null> {
  const before = loadIntentRouteRulesSync();
  const target = before.versions.find((item) => item.version === version);
  if (!target) return null;
  return saveIntentRouteRulesConfig({
    rules: target.rules,
    note: `rollback to v${version}`,
  });
}

async function writeConfig(config: IntentRouteRulesConfig): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
