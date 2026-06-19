import { mkdir, readFile, access, rename, writeFile, copyFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { MemoryEntry, RoleProfile, UserPreferenceProfile } from '@/types';
import { listRoleProfiles } from './role-profile-store';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';
import { listUserMemories } from './user-memory-store';
import {
  DEFAULT_NEW_USER_ROLE_ID,
  EXISTING_USER_MIGRATION_ROLE_ID,
  normalizeInternalRoleId,
} from './zhitou-role-mapping';

const STORE_PATH = runtimeDataPath('user-preferences.json');
const BACKUP_PATH = `${STORE_PATH}.bak`;
const TEMP_PATH = `${STORE_PATH}.tmp`;
const LEGACY_STORE_PATH = legacyDataPath('user-preferences.json');
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

const roleHistorySchema = z.object({
  role: z.string(),
  source: z.enum(['login', 'manual', 'inferred', 'system']),
  updatedAt: z.string(),
  reason: z.string().optional(),
});

const preferenceSchema = z.object({
  userId: z.string(),
  defaultRole: z.string(),
  activePreferences: z.array(z.string()),
  inferredPreferences: z.object({
    outputStyle: z.array(z.string()),
    analysisFocus: z.array(z.string()),
    riskBias: z.array(z.string()),
    explanationDepth: z.string(),
    decisionStyle: z.string(),
  }),
  confidence: z.record(z.string(), z.number()),
  updatedAt: z.string(),
  currentRole: z.string().optional(),
  roleHistory: z.array(roleHistorySchema).optional(),
});

const storeSchema = z.object({
  schema_version: z.literal(1),
  profiles: z.array(preferenceSchema),
});

interface PreferenceStoreFile {
  schema_version: 1;
  profiles: UserPreferenceProfile[];
}

let storeCache: PreferenceStoreFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function uniq(values: string[]): string[] {
  return [...new Set(values.map((item) => normalizeText(item)).filter(Boolean))];
}

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.map((item) => String(item)) : undefined;
}

function defaultConfidence(base = 0.6): Record<string, number> {
  return {
    defaultRole: base,
    outputStyle: base,
    analysisFocus: base,
    riskBias: base,
    explanationDepth: base,
    decisionStyle: base,
    activePreferences: Math.min(0.95, base + 0.15),
  };
}

function buildDefaultProfile(userId: string, roleId?: string): UserPreferenceProfile {
  const resolvedRole = normalizeInternalRoleId(roleId, DEFAULT_NEW_USER_ROLE_ID);
  return {
    userId,
    defaultRole: resolvedRole,
    activePreferences: [],
    inferredPreferences: {
      outputStyle: ['先结论后证据'],
      analysisFocus: ['项目进展'],
      riskBias: ['均衡'],
      explanationDepth: 'balanced',
      decisionStyle: 'balanced',
    },
    confidence: defaultConfidence(0.4),
    updatedAt: nowIso(),
    currentRole: resolvedRole,
    roleHistory: [
      {
        role: resolvedRole,
        source: 'system',
        updatedAt: nowIso(),
        reason: 'default seed',
      },
    ],
  };
}

function defaultRoleIdFromProfiles(availableRoles: RoleProfile[]): string {
  return availableRoles.some((role) => role.id === DEFAULT_NEW_USER_ROLE_ID)
    ? DEFAULT_NEW_USER_ROLE_ID
    : availableRoles[0]?.id || DEFAULT_NEW_USER_ROLE_ID;
}

function inferPreferenceSignals(memories: MemoryEntry[]): UserPreferenceProfile['inferredPreferences'] {
  const text = memories.map((item) => item.content).join('\n').toLowerCase();
  const outputStyle: string[] = [];
  if (/先给结论|结论优先|先结论/.test(text)) outputStyle.push('先结论后证据');
  if (/证据优先|证据|数据驱动/.test(text)) outputStyle.push('证据优先');
  if (/简洁|少说|短一点/.test(text)) outputStyle.push('简洁回答');
  if (/详细|展开|讲清楚|完整/.test(text)) outputStyle.push('详细说明');

  const analysisFocus: string[] = [];
  if (/roi|回本|成本|预算/.test(text)) analysisFocus.push('ROI与成本');
  if (/异常|报错|失败|联调|排查/.test(text)) analysisFocus.push('异常与阻塞');
  if (/项目|进展|推进|目标/.test(text)) analysisFocus.push('项目进展');
  if (/素材|创意|封面|视频|图片/.test(text)) analysisFocus.push('素材表现');

  const riskBias: string[] = [];
  if (/不要猜|谨慎|保守|风险|证据/.test(text)) riskBias.push('保守');
  if (/尽快|直接|快速/.test(text)) riskBias.push('直接');
  if (riskBias.length === 0) riskBias.push('均衡');

  let explanationDepth = 'balanced';
  if (/简洁|少说|短/.test(text)) explanationDepth = 'brief';
  if (/详细|展开|完整/.test(text)) explanationDepth = 'detailed';

  let decisionStyle = 'balanced';
  if (/先确认|先问|追问/.test(text)) decisionStyle = 'confirm-first';
  if (/直接|马上|立刻/.test(text)) decisionStyle = 'direct';

  return {
    outputStyle: uniq(outputStyle.length > 0 ? outputStyle : ['先结论后证据']),
    analysisFocus: uniq(analysisFocus.length > 0 ? analysisFocus : ['项目进展']),
    riskBias: uniq(riskBias),
    explanationDepth,
    decisionStyle,
  };
}

function summarizePreferenceMemories(memories: MemoryEntry[]): string[] {
  return uniq(
    memories
      .filter((item) => item.memory_type === 'preference' || item.memory_type === 'instruction' || item.memory_type === 'experience')
      .slice(0, 5)
      .map((item) => item.content)
      .filter(Boolean),
  ).slice(0, 5);
}

function buildConfidence(memories: MemoryEntry[], inferred: UserPreferenceProfile['inferredPreferences']): Record<string, number> {
  const preferenceCount = memories.filter((item) => item.memory_type === 'preference').length;
  const experienceCount = memories.filter((item) => item.memory_type === 'experience').length;
  const base = Math.min(0.92, 0.42 + preferenceCount * 0.08 + experienceCount * 0.04);
  return {
    defaultRole: Math.min(0.9, base + 0.08),
    outputStyle: inferred.outputStyle.length > 1 ? Math.min(0.9, base + 0.1) : base,
    analysisFocus: inferred.analysisFocus.length > 1 ? Math.min(0.9, base + 0.08) : base,
    riskBias: inferred.riskBias.length > 1 ? Math.min(0.9, base + 0.06) : base,
    explanationDepth: base,
    decisionStyle: base,
    activePreferences: Math.min(0.95, base + 0.12),
  };
}

async function readStore(): Promise<PreferenceStoreFile> {
  if (storeCache) return structuredClone(storeCache);

  for (const candidate of [STORE_PATH, BACKUP_PATH, LEGACY_STORE_PATH]) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = storeSchema.parse(JSON.parse(raw)) as PreferenceStoreFile;
      storeCache = parsed;
      return structuredClone(parsed);
    } catch {
      // try next candidate
    }
  }

  storeCache = {
    schema_version: 1,
    profiles: [],
  };
  return structuredClone(storeCache);
}

async function writeStore(store: PreferenceStoreFile): Promise<void> {
  storeCache = structuredClone(store);
  if (!SHOULD_PERSIST_STORE) return;

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(TEMP_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  try {
    await access(STORE_PATH);
    await rename(STORE_PATH, BACKUP_PATH);
  } catch {
    // no previous file
  }
  try {
    await rename(TEMP_PATH, STORE_PATH);
  } catch (error) {
    try {
      await copyFile(BACKUP_PATH, STORE_PATH);
    } catch {
      // ignore
    }
    try {
      await unlink(TEMP_PATH);
    } catch {
      // ignore
    }
    throw error;
  }
}

async function updateStore(mutator: (store: PreferenceStoreFile) => void | Promise<void>): Promise<PreferenceStoreFile> {
  const next = await readStore();
  await mutator(next);
  writeChain = writeChain.then(() => writeStore(next));
  await writeChain;
  return structuredClone(next);
}

async function buildProfileFromSignals(userId: string, memories: MemoryEntry[] = []): Promise<UserPreferenceProfile> {
  const roleProfiles = await listRoleProfiles();
  const defaultRole = defaultRoleIdFromProfiles(roleProfiles);
  const inferredPreferences = inferPreferenceSignals(memories);
  const activePreferences = summarizePreferenceMemories(memories);
  return {
    userId,
    defaultRole,
    activePreferences,
    inferredPreferences,
    confidence: buildConfidence(memories, inferredPreferences),
    updatedAt: nowIso(),
    currentRole: defaultRole,
    roleHistory: [
      {
        role: defaultRole,
        source: 'system',
        updatedAt: nowIso(),
        reason: 'default_role_policy',
      },
    ],
  };
}

function sortProfiles(profiles: UserPreferenceProfile[]): UserPreferenceProfile[] {
  return [...profiles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function normalizeProfileRoleIds(profile: UserPreferenceProfile): UserPreferenceProfile {
  const defaultRole = normalizeInternalRoleId(profile.defaultRole, EXISTING_USER_MIGRATION_ROLE_ID);
  const currentRole = normalizeInternalRoleId(profile.currentRole || profile.defaultRole, defaultRole);
  if (defaultRole === profile.defaultRole && currentRole === (profile.currentRole || profile.defaultRole)) {
    return profile;
  }
  return {
    ...profile,
    defaultRole,
    currentRole,
    updatedAt: nowIso(),
    roleHistory: [
      ...(profile.roleHistory || []),
      { role: currentRole, source: 'system', updatedAt: nowIso(), reason: 'role_profile_migration' },
    ],
  };
}

export async function listUserPreferenceProfiles(): Promise<UserPreferenceProfile[]> {
  const store = await readStore();
  const normalizedProfiles = store.profiles.map((profile) => normalizeProfileRoleIds(profile));
  if (normalizedProfiles.some((profile, index) => profile !== store.profiles[index])) {
    await updateStore((nextStore) => {
      nextStore.profiles = sortProfiles(normalizedProfiles);
    });
  }
  return sortProfiles(normalizedProfiles);
}

export async function getUserPreferenceProfile(userId: string): Promise<UserPreferenceProfile | undefined> {
  const store = await readStore();
  const profile = store.profiles.find((item) => item.userId === userId);
  if (!profile) return undefined;
  const normalized = normalizeProfileRoleIds(profile);
  if (normalized !== profile) {
    await updateStore((nextStore) => {
      nextStore.profiles = sortProfiles(nextStore.profiles.map((item) => (item.userId === userId ? normalized : item)));
    });
  }
  return normalized;
}

export async function ensureUserPreferenceProfile(userId: string, options: { memories?: MemoryEntry[]; roleId?: string } = {}): Promise<UserPreferenceProfile> {
  const store = await readStore();
  const existing = store.profiles.find((profile) => profile.userId === userId);
  if (existing) {
    const nextRole = options.roleId
      ? normalizeInternalRoleId(options.roleId, DEFAULT_NEW_USER_ROLE_ID)
      : normalizeInternalRoleId(existing.currentRole || existing.defaultRole, EXISTING_USER_MIGRATION_ROLE_ID);
    const normalized = {
      ...existing,
      defaultRole: nextRole,
      currentRole: nextRole,
      roleHistory: existing.roleHistory || [],
      updatedAt: existing.updatedAt || nowIso(),
    };
    if (options.roleId && nextRole !== (existing.currentRole || existing.defaultRole)) {
      normalized.roleHistory = [
        ...normalized.roleHistory,
        { role: nextRole, source: 'login' as const, updatedAt: nowIso(), reason: 'zhitou_role_mapping' },
      ];
      normalized.updatedAt = nowIso();
    } else if (normalized.defaultRole !== existing.defaultRole || normalized.currentRole !== existing.currentRole) {
      normalized.roleHistory = [
        ...normalized.roleHistory,
        { role: nextRole, source: 'system' as const, updatedAt: nowIso(), reason: 'role_profile_migration' },
      ];
      normalized.updatedAt = nowIso();
    }
    if (normalized.defaultRole !== existing.defaultRole || normalized.currentRole !== existing.currentRole || normalized.roleHistory !== existing.roleHistory) {
      await updateStore((nextStore) => {
        nextStore.profiles = sortProfiles(nextStore.profiles.map((item) => (item.userId === userId ? normalized : item)));
      });
    }
    return normalized;
  }
  let memories = options.memories && options.memories.length > 0 ? options.memories : await listUserMemories({ user_id: userId });
  if (memories.length === 0) {
    memories = await listUserMemories();
  }
  const profile = await buildProfileFromSignals(userId, memories);
  if (options.roleId) {
    const mappedRoleId = normalizeInternalRoleId(options.roleId, DEFAULT_NEW_USER_ROLE_ID);
    profile.defaultRole = mappedRoleId;
    profile.currentRole = mappedRoleId;
    profile.roleHistory = [
      ...(profile.roleHistory || []),
      { role: mappedRoleId, source: 'login', updatedAt: nowIso(), reason: 'zhitou_role_mapping' },
    ];
  }
  await updateStore((next) => {
    next.profiles = sortProfiles([
      ...next.profiles.filter((item) => item.userId !== userId),
      profile,
    ]);
  });
  return profile;
}

export async function updateUserPreferenceProfile(
  userId: string,
  patch: Partial<UserPreferenceProfile> & { inferredPreferences?: Partial<UserPreferenceProfile['inferredPreferences']> },
): Promise<UserPreferenceProfile | undefined> {
  const store = await readStore();
  const current = store.profiles.find((profile) => profile.userId === userId);
  if (!current) return undefined;
  const defaultRole = normalizeInternalRoleId(
    patch.defaultRole || current.defaultRole,
    DEFAULT_NEW_USER_ROLE_ID,
  );
  const currentRole = normalizeInternalRoleId(
    patch.currentRole || current.currentRole || defaultRole,
    defaultRole,
  );
  const updatedProfile: UserPreferenceProfile = {
    ...current,
    ...patch,
    userId: current.userId,
    defaultRole,
    currentRole,
    activePreferences: patch.activePreferences ? uniq(patch.activePreferences) : current.activePreferences,
    inferredPreferences: {
      outputStyle: patch.inferredPreferences?.outputStyle || current.inferredPreferences.outputStyle,
      analysisFocus: patch.inferredPreferences?.analysisFocus || current.inferredPreferences.analysisFocus,
      riskBias: patch.inferredPreferences?.riskBias || current.inferredPreferences.riskBias,
      explanationDepth: patch.inferredPreferences?.explanationDepth || current.inferredPreferences.explanationDepth,
      decisionStyle: patch.inferredPreferences?.decisionStyle || current.inferredPreferences.decisionStyle,
    },
    confidence: {
      ...current.confidence,
      ...(patch.confidence || {}),
    },
    updatedAt: nowIso(),
    roleHistory: patch.roleHistory ? patch.roleHistory : current.roleHistory,
  };
  await updateStore((next) => {
    next.profiles = sortProfiles(next.profiles.map((item) => (item.userId === userId ? updatedProfile : item)));
  });
  return updatedProfile;
}

export async function rebuildUserPreferenceProfile(userId: string): Promise<UserPreferenceProfile> {
  const memories = await listUserMemories({ user_id: userId });
  const profile = await buildProfileFromSignals(userId, memories.length > 0 ? memories : await listUserMemories());
  await updateStore((store) => {
    store.profiles = sortProfiles([
      ...store.profiles.filter((item) => item.userId !== userId),
      profile,
    ]);
  });
  return profile;
}

export async function getOrCreateUserPreferenceProfile(userId: string, roleId?: string): Promise<UserPreferenceProfile> {
  return ensureUserPreferenceProfile(userId, { roleId });
}

export function summarizePreferenceProfile(profile: UserPreferenceProfile | null | undefined): {
  userId: string;
  defaultRole: string;
  currentRole: string;
  activePreferences: string[];
  outputStyle: string[];
  analysisFocus: string[];
  riskBias: string[];
  explanationDepth: string;
  decisionStyle: string;
  confidence: number;
  updatedAt: string;
} | null {
  if (!profile) return null;
  const confidenceValues = Object.values(profile.confidence || {});
  const confidence = confidenceValues.length > 0
    ? Number((confidenceValues.reduce((sum, item) => sum + item, 0) / confidenceValues.length).toFixed(2))
    : 0;
  return {
    userId: profile.userId,
    defaultRole: profile.defaultRole,
    currentRole: profile.currentRole || profile.defaultRole,
    activePreferences: profile.activePreferences.slice(0, 5),
    outputStyle: profile.inferredPreferences.outputStyle,
    analysisFocus: profile.inferredPreferences.analysisFocus,
    riskBias: profile.inferredPreferences.riskBias,
    explanationDepth: profile.inferredPreferences.explanationDepth,
    decisionStyle: profile.inferredPreferences.decisionStyle,
    confidence,
    updatedAt: profile.updatedAt,
  };
}
