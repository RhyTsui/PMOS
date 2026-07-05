/**
 * Skill Readiness Store — DB-first persistence for SkillReadinessProbeResult.
 * Follows the same pattern as skill-contract-store.ts and feature-switch-store.ts:
 *   DB (config_entries, domain='skill_readiness') → JSON fallback → empty.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SkillReadinessProbeResult } from '@/contracts/skills/skill-readiness-types';
import { runtimeDataPath } from './runtime-data-path';
import { buildDbWriteError } from './db-error';

const SKILL_READINESS_PATH = runtimeDataPath('skill-readiness.json');
const DOMAIN = 'skill_readiness';

interface SkillReadinessFile {
  results: SkillReadinessProbeResult[];
}

// ─── Persistence ────────────────────────────────────────────

async function readSkillReadinessFile(): Promise<SkillReadinessFile> {
  // DB-first
  try {
    const { listConfigs } = await import('./db/repositories/config-repository');
    const rows = await listConfigs({ domain: DOMAIN, status: 'active' });
    if (rows.length > 0) {
      return { results: rows.map(r => r.value as SkillReadinessProbeResult) };
    }
  } catch { /* fall through to JSON */ }

  // JSON fallback
  try {
    const raw = await readFile(SKILL_READINESS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SkillReadinessFile>;
    if (Array.isArray(parsed.results)) return { results: parsed.results };
  } catch { /* use empty */ }

  return { results: [] };
}

async function writeSkillReadinessFile(file: SkillReadinessFile): Promise<void> {
  let dbWriteError: unknown;
  try {
    const { upsertConfig } = await import('./db/repositories/config-repository');
    for (const item of file.results) {
      try {
        await upsertConfig({
          domain: DOMAIN,
          configKey: item.skillId,
          value: item as unknown as Record<string, unknown>,
          changedBy: 'system',
          source: 'manual',
        });
      } catch (err) {
        console.error(`[skill-readiness] DB upsert failed for "${item.skillId}"`, (err as Error)?.message);
        dbWriteError = err;
      }
    }
  } catch (err) {
    console.error('[skill-readiness] DB write failed, falling back to JSON', (err as Error)?.message);
    dbWriteError = err;
  }
  if (dbWriteError) {
    throw buildDbWriteError(DOMAIN, dbWriteError);
  }
  return;

  // Dead code: JSON file fallback write (documentation only)
  await mkdir(path.dirname(SKILL_READINESS_PATH), { recursive: true });
  await writeFile(SKILL_READINESS_PATH, JSON.stringify(file, null, 2), 'utf8');
}

// ─── Public API ─────────────────────────────────────────────

export async function loadReadinessResults(): Promise<SkillReadinessProbeResult[]> {
  const file = await readSkillReadinessFile();
  return file.results;
}

export async function saveReadinessResults(results: SkillReadinessProbeResult[]): Promise<void> {
  const file: SkillReadinessFile = { results };
  await writeSkillReadinessFile(file);
}
