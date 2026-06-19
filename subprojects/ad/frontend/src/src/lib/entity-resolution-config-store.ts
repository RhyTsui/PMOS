import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_DOMAIN_PACKS,
  buildAdvertisingEntityResolutionSeed,
  normalizeDomainPacks,
  type DomainPackConfig,
} from './advertising-domain-pack';
import { runtimeDataPath } from './runtime-data-path';
import type { EntityType } from '@/contracts/request-understanding/entity-resolution';

export type EntityResolutionConfigSource = 'built_in_seed' | 'domain_pack_seed' | 'runtime_config';

export interface EntityResolutionConfigEntry {
  id: string;
  entity_type: EntityType;
  canonical: string;
  aliases: string[];
  priority: number;
  enabled: boolean;
  source: EntityResolutionConfigSource;
  source_pack?: string;
  notes?: string;
  updated_at?: string;
}

export interface EntityResolutionConfig {
  schema_version: 1;
  enabled: boolean;
  packs: DomainPackConfig[];
  entries: EntityResolutionConfigEntry[];
  updated_at: string;
}

const STORE_PATH = runtimeDataPath('entity-resolution-config.json');

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeAliasList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => normalizeText(item)).filter(Boolean)));
}

function normalizeEntry(
  input: Partial<EntityResolutionConfigEntry>,
  fallback?: Partial<EntityResolutionConfigEntry>,
  index = 0,
): EntityResolutionConfigEntry {
  const entityType = (input.entity_type || fallback?.entity_type || 'media') as EntityType;
  const baseCanonical = normalizeText(input.canonical || fallback?.canonical);
  const baseAliases = normalizeAliasList(input.aliases || fallback?.aliases);
  return {
    id: normalizeText(input.id || fallback?.id || `${entityType}-${baseCanonical || `entry-${index}`}`),
    entity_type: entityType,
    canonical: baseCanonical,
    aliases: baseAliases,
    priority: Number.isFinite(input.priority) ? Number(input.priority) : Number.isFinite(fallback?.priority) ? Number(fallback?.priority) : 50,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback?.enabled !== false,
    source: (input.source || fallback?.source || 'runtime_config') as EntityResolutionConfigSource,
    source_pack: normalizeText(input.source_pack || fallback?.source_pack) || undefined,
    notes: normalizeText(input.notes || fallback?.notes) || undefined,
    updated_at: normalizeText(input.updated_at || fallback?.updated_at) || undefined,
  };
}

function mergeEntries(entries: EntityResolutionConfigEntry[]): EntityResolutionConfigEntry[] {
  const merged = new Map<string, EntityResolutionConfigEntry>();
  const sourceRank: Record<EntityResolutionConfigSource, number> = {
    built_in_seed: 1,
    domain_pack_seed: 2,
    runtime_config: 3,
  };
  for (const entry of entries) {
    const key = `${entry.entity_type}::${entry.canonical.toLowerCase()}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...entry, aliases: Array.from(new Set([entry.canonical, ...entry.aliases].filter(Boolean))) });
      continue;
    }
    const preferredSource = sourceRank[entry.source] >= sourceRank[current.source] ? entry : current;
    merged.set(key, {
      ...current,
      aliases: Array.from(new Set([current.canonical, ...current.aliases, ...entry.aliases].filter(Boolean))),
      priority: Math.max(current.priority, entry.priority),
      enabled: current.enabled || entry.enabled,
      source: preferredSource.source,
      source_pack: preferredSource.source_pack || current.source_pack || entry.source_pack,
      notes: preferredSource.notes || current.notes || entry.notes,
      updated_at: entry.updated_at || current.updated_at,
    });
  }
  return Array.from(merged.values()).sort((a, b) => b.priority - a.priority || a.canonical.localeCompare(b.canonical));
}

function buildSeedEntries(packs?: DomainPackConfig[] | null): EntityResolutionConfigEntry[] {
  return mergeEntries(buildAdvertisingEntityResolutionSeed(packs).map((entry, index) => normalizeEntry(entry, undefined, index)));
}

const DEFAULT_CONFIG: EntityResolutionConfig = {
  schema_version: 1,
  enabled: true,
  packs: DEFAULT_DOMAIN_PACKS,
  entries: buildSeedEntries(DEFAULT_DOMAIN_PACKS),
  updated_at: new Date().toISOString(),
};

export function normalizeEntityResolutionConfig(input?: Partial<EntityResolutionConfig>): EntityResolutionConfig {
  const packs = normalizeDomainPacks(input?.packs);
  const rawEntries = Array.isArray(input?.entries) ? input.entries : [];
  const seedEntries = buildSeedEntries(packs);
  const entries = rawEntries.length
    ? mergeEntries([
      ...seedEntries,
      ...rawEntries.map((entry, index) => normalizeEntry(entry, undefined, index)),
    ])
    : seedEntries;
  return {
    schema_version: 1,
    enabled: input?.enabled !== false,
    packs,
    entries,
    updated_at: normalizeText(input?.updated_at) || new Date().toISOString(),
  };
}

export function loadEntityResolutionConfigSync(): EntityResolutionConfig {
  try {
    if (existsSync(STORE_PATH)) {
      const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as Partial<EntityResolutionConfig>;
      return normalizeEntityResolutionConfig(parsed);
    }
  } catch {
    // Fall back to the built-in seed.
  }
  return DEFAULT_CONFIG;
}

export async function saveEntityResolutionConfig(
  patch: Partial<EntityResolutionConfig>,
): Promise<EntityResolutionConfig> {
  const next = normalizeEntityResolutionConfig({
    ...loadEntityResolutionConfigSync(),
    ...patch,
    updated_at: new Date().toISOString(),
  });
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export function getEntityResolutionAliasRecord(
  entityType: EntityType,
  config = loadEntityResolutionConfigSync(),
): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  for (const entry of config.entries) {
    if (!entry.enabled || entry.entity_type !== entityType) continue;
    record[entry.canonical] = Array.from(new Set([entry.canonical, ...entry.aliases].filter(Boolean)));
  }
  return record;
}

export function mergeAliasRecords(
  base: Record<string, string[]>,
  extra: Record<string, string[]>,
): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(base || {})) {
    output[key] = Array.from(new Set([key, ...(values || [])].filter(Boolean)));
  }
  for (const [key, values] of Object.entries(extra || {})) {
    output[key] = Array.from(new Set([...(output[key] || [key]), key, ...(values || [])].filter(Boolean)));
  }
  return output;
}

export function getEntityResolutionAliasMaps(config = loadEntityResolutionConfigSync()) {
  return {
    media_aliases: getEntityResolutionAliasRecord('media', config),
    terminal_aliases: mergeAliasRecords(
      getEntityResolutionAliasRecord('terminal', config),
      getEntityResolutionAliasRecord('terminal_os', config),
    ),
    team_aliases: getEntityResolutionAliasRecord('team', config),
    app_package_type_aliases: getEntityResolutionAliasRecord('app_package_type', config),
    account_aliases: getEntityResolutionAliasRecord('account', config),
    package_aliases: getEntityResolutionAliasRecord('package', config),
    optimizer_aliases: {},
  };
}

export function findEntityResolutionCandidates(
  message: string,
  entityType: EntityType,
  config = loadEntityResolutionConfigSync(),
): EntityResolutionConfigEntry[] {
  const text = String(message || '').toLowerCase();
  return config.entries
    .filter(entry => entry.enabled && entry.entity_type === entityType)
    .map((entry) => {
      const aliases = Array.from(new Set([entry.canonical, ...entry.aliases].map(item => item.toLowerCase()).filter(Boolean)));
      const hits = aliases.filter(alias => text.includes(alias));
      return hits.length ? { entry, score: entry.priority + (hits.length * 10) + Math.max(...hits.map(hit => hit.length)) } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .map(item => item.entry);
}
