import { access, copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { AgentType, IntentType, RoleProfile, RolePerspective, RoleShortcutEntry } from '@/types';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';
import { DEFAULT_NEW_USER_ROLE_ID, isStandardRoleId, normalizeInternalRoleId, STANDARD_ROLE_IDS } from './zhitou-role-mapping';

const STORE_PATH = runtimeDataPath('role-profiles.json');
const BACKUP_PATH = `${STORE_PATH}.bak`;
const LEGACY_STORE_PATH = legacyDataPath('role-profiles.json');
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

const roleShortcutSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  intentType: z.string().optional(),
  placeholder: z.string().optional(),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});

const roleProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
  defaultPerspective: z.enum(['summary', 'analysis', 'operation']),
  allowedPerspectives: z.array(z.enum(['summary', 'analysis', 'operation'])),
  defaultAgent: z.string(),
  allowedIntentTypes: z.array(z.string()),
  scopeTags: z.array(z.string()),
  routePolicy: z.object({
    ambiguous: z.enum(['confirm', 'fallback', 'redirect', 'explain']),
    outOfScope: z.enum(['confirm', 'fallback', 'redirect', 'explain']),
    clarificationRounds: z.number().int().nonnegative(),
  }),
  rolePrompt: z.string(),
  resultTemplate: z.object({
    defaultBlocks: z.array(z.string()),
    blockOrder: z.array(z.string()),
  }),
  responseStyle: z.object({
    outputStyle: z.array(z.string()),
    analysisFocus: z.array(z.string()),
    riskBias: z.array(z.string()),
    explanationDepth: z.string(),
    decisionStyle: z.string(),
  }),
  shortcutEntries: z.array(roleShortcutSchema),
  updatedAt: z.string(),
});

const storeSchema = z.object({
  schema_version: z.literal(1),
  roles: z.array(roleProfileSchema),
});

interface RoleProfilesFile {
  schema_version: 1;
  roles: RoleProfile[];
}

let storeCache: RoleProfilesFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

function nowIso(): string {
  return new Date().toISOString();
}

function createTempPath(): string {
  return `${STORE_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
}

function normalizeShortcut(input: Partial<RoleShortcutEntry>): RoleShortcutEntry {
  return {
    id: String(input.id || `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    title: String(input.title || '快捷入口').trim(),
    description: String(input.description || '').trim(),
    intentType: input.intentType,
    placeholder: input.placeholder?.trim() || undefined,
    enabled: input.enabled !== false,
    sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 999,
  };
}

function normalizeRoleProfile(input: Partial<RoleProfile>): RoleProfile {
  const shortcutEntries = Array.isArray(input.shortcutEntries)
    ? input.shortcutEntries.map((item) => normalizeShortcut(item))
    : [];
  const perspectiveSet = new Set<RolePerspective>(['summary', 'analysis', 'operation']);
  const allowedPerspectives = Array.isArray(input.allowedPerspectives)
    ? input.allowedPerspectives.filter((item): item is RolePerspective => perspectiveSet.has(item as RolePerspective))
    : [input.defaultPerspective || 'summary'];
  const allowedIntentTypes = Array.isArray(input.allowedIntentTypes)
    ? input.allowedIntentTypes.filter(Boolean).map((item) => String(item)) as IntentType[]
    : [];
  const defaultPerspective = (input.defaultPerspective || allowedPerspectives[0] || 'summary') as RolePerspective;
  return {
    id: String(input.id || `role-${Date.now()}`),
    name: String(input.name || '未命名角色').trim(),
    description: String(input.description || '').trim(),
    enabled: input.enabled !== false,
    sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 999,
    defaultPerspective,
    allowedPerspectives: allowedPerspectives.length > 0 ? allowedPerspectives : [defaultPerspective],
    defaultAgent: (input.defaultAgent || 'hub') as AgentType,
    allowedIntentTypes,
    scopeTags: Array.isArray(input.scopeTags) ? input.scopeTags.map((item) => String(item).trim()).filter(Boolean) : [],
    routePolicy: {
      ambiguous: input.routePolicy?.ambiguous || 'confirm',
      outOfScope: input.routePolicy?.outOfScope || 'explain',
      clarificationRounds: Number.isFinite(input.routePolicy?.clarificationRounds)
        ? Number(input.routePolicy?.clarificationRounds)
        : 1,
    },
    rolePrompt: String(input.rolePrompt || '').trim(),
    resultTemplate: {
      defaultBlocks: Array.isArray(input.resultTemplate?.defaultBlocks)
        ? input.resultTemplate.defaultBlocks.map((item) => String(item).trim()).filter(Boolean)
        : ['结论', '证据', '下一步'],
      blockOrder: Array.isArray(input.resultTemplate?.blockOrder)
        ? input.resultTemplate.blockOrder.map((item) => String(item).trim()).filter(Boolean)
        : ['结论', '证据', '风险', '下一步'],
    },
    responseStyle: {
      outputStyle: Array.isArray(input.responseStyle?.outputStyle)
        ? input.responseStyle.outputStyle.map((item) => String(item).trim()).filter(Boolean)
        : [],
      analysisFocus: Array.isArray(input.responseStyle?.analysisFocus)
        ? input.responseStyle.analysisFocus.map((item) => String(item).trim()).filter(Boolean)
        : [],
      riskBias: Array.isArray(input.responseStyle?.riskBias)
        ? input.responseStyle.riskBias.map((item) => String(item).trim()).filter(Boolean)
        : [],
      explanationDepth: input.responseStyle?.explanationDepth || 'balanced',
      decisionStyle: input.responseStyle?.decisionStyle || 'balanced',
    },
    shortcutEntries: shortcutEntries.sort((a, b) => a.sortOrder - b.sortOrder),
    updatedAt: input.updatedAt || nowIso(),
  };
}

function buildDefaultRoles(): RoleProfilesFile {
  const roles: RoleProfile[] = [
    normalizeRoleProfile({
      id: 'designer',
      name: '设计师',
      description: '关注创意、视频和素材表现，优先帮助判断素材方向和优化空间。',
      sortOrder: 10,
      defaultPerspective: 'analysis',
      allowedPerspectives: ['summary', 'analysis'],
      defaultAgent: 'report',
      allowedIntentTypes: ['report_query', 'forecast', 'help', 'general'],
      scopeTags: ['设计师', '设计师主管', '素材分析', '素材', '创意', '视频', '图片', '封面'],
      routePolicy: { ambiguous: 'confirm', outOfScope: 'redirect', clarificationRounds: 1 },
      rolePrompt: '你面向设计师工作场景回答。优先关注创意、视频和素材数据，先给结论，再给证据和可执行的素材优化建议。问题超出素材视角时，先说明可处理范围，再引导到当前项目可用的数据分析。',
      resultTemplate: { defaultBlocks: ['结论', '证据', '建议'], blockOrder: ['结论', '证据', '风险', '建议', '下一步'] },
      responseStyle: {
        outputStyle: ['结论优先', '证据优先'],
        analysisFocus: ['素材表现', '创意方向', '视频数据'],
        riskBias: ['均衡'],
        explanationDepth: 'balanced',
        decisionStyle: 'direct',
      },
      shortcutEntries: [
        { id: 'designer-material-trend', title: '看素材趋势', description: '查看素材表现和变化趋势', intentType: 'report_query', placeholder: '近30天素材消耗和ROI趋势怎么样', enabled: true, sortOrder: 10 },
        { id: 'designer-creative-review', title: '分析素材表现', description: '定位素材表现好的方向', intentType: 'report_query', placeholder: '这批视频素材表现怎么样', enabled: true, sortOrder: 20 },
      ],
    }),
    normalizeRoleProfile({
      id: 'optimizer',
      name: '优化师',
      description: '关注投放操作和全量数据分析，优先帮助定位消耗、ROI、异常和下一步动作。',
      sortOrder: 20,
      defaultPerspective: 'operation',
      allowedPerspectives: ['summary', 'analysis', 'operation'],
      defaultAgent: 'report',
      allowedIntentTypes: ['report_query', 'monitor', 'diagnosis', 'debugging', 'get_delivery_packages', 'demand', 'forecast', 'help', 'general'],
      scopeTags: ['投放', '投放主管', '优化师', '消耗', 'ROI', '转化', '异常', '操作', '全部数据'],
      routePolicy: { ambiguous: 'confirm', outOfScope: 'explain', clarificationRounds: 1 },
      rolePrompt: '你面向优化师工作场景回答。优先使用当前项目上下文和可用报表能力处理投放、消耗、ROI、转化、异常和操作建议。回答先给结论，再说明关键数据、口径风险和下一步动作。',
      resultTemplate: { defaultBlocks: ['结论', '数据', '风险', '下一步'], blockOrder: ['结论', '数据', '趋势', '风险', '下一步'] },
      responseStyle: {
        outputStyle: ['先结论后证据', '结果导向'],
        analysisFocus: ['投放数据', 'ROI与成本', '异常波动', '操作建议'],
        riskBias: ['保守'],
        explanationDepth: 'balanced',
        decisionStyle: 'direct',
      },
      shortcutEntries: [
        { id: 'optimizer-report-query', title: '查投放数据', description: '查询消耗、ROI和转化表现', intentType: 'report_query', placeholder: '近30天每日消耗和首日ROI趋势', enabled: true, sortOrder: 10 },
        { id: 'optimizer-anomaly-check', title: '查异常', description: '定位数据异常和风险点', intentType: 'diagnosis', placeholder: '帮我看下最近投放有没有异常', enabled: true, sortOrder: 20 },
      ],
    }),
    normalizeRoleProfile({
      id: 'observer',
      name: '观察员',
      description: '只读查看全量数据，优先提供结论、证据和风险提醒，不触发操作型建议。',
      sortOrder: 30,
      defaultPerspective: 'summary',
      allowedPerspectives: ['summary', 'analysis'],
      defaultAgent: 'report',
      allowedIntentTypes: ['report_query', 'monitor', 'diagnosis', 'forecast', 'help', 'general'],
      scopeTags: ['观察员', '只读', '查看', '全量数据', '风险'],
      routePolicy: { ambiguous: 'confirm', outOfScope: 'explain', clarificationRounds: 1 },
      rolePrompt: '你面向观察员工作场景回答。允许查看全量数据，但保持只读，不主动给出需要执行权限的操作指令。回答要突出结论、证据、风险和需要找谁确认。',
      resultTemplate: { defaultBlocks: ['结论', '证据', '风险'], blockOrder: ['结论', '证据', '趋势', '风险', '下一步'] },
      responseStyle: {
        outputStyle: ['结论优先', '证据优先'],
        analysisFocus: ['全量数据', '风险提醒', '趋势变化'],
        riskBias: ['保守'],
        explanationDepth: 'balanced',
        decisionStyle: 'confirm-first',
      },
      shortcutEntries: [
        { id: 'observer-overview', title: '看整体表现', description: '查看当前项目整体表现', intentType: 'report_query', placeholder: '近30天整体投放表现怎么样', enabled: true, sortOrder: 10 },
        { id: 'observer-risk', title: '看风险', description: '查看当前风险和异常变化', intentType: 'monitor', placeholder: '最近有哪些需要关注的风险', enabled: true, sortOrder: 20 },
      ],
    }),
  ];

  return { schema_version: 1, roles };
}

function mergeDefaultRoles(store: RoleProfilesFile): RoleProfilesFile {
  const defaults = buildDefaultRoles().roles;
  const byId = new Map(defaults.map((role) => [role.id, role]));
  for (const role of store.roles) {
    const normalizedId = normalizeInternalRoleId(role.id, DEFAULT_NEW_USER_ROLE_ID);
    if (!isStandardRoleId(role.id) || normalizedId !== role.id) continue;
    byId.set(role.id, normalizeRoleProfile(role));
  }
  return {
    schema_version: 1,
    roles: STANDARD_ROLE_IDS
      .map((roleId) => byId.get(roleId))
      .filter((role): role is RoleProfile => Boolean(role))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

async function readStore(): Promise<RoleProfilesFile> {
  if (storeCache) return structuredClone(storeCache);

  for (const candidate of [STORE_PATH, BACKUP_PATH, LEGACY_STORE_PATH]) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = storeSchema.parse(JSON.parse(raw)) as RoleProfilesFile;
      storeCache = mergeDefaultRoles(parsed);
      return structuredClone(storeCache);
    } catch {
      // try next candidate
    }
  }

  storeCache = buildDefaultRoles();
  return structuredClone(storeCache);
}

async function writeStore(store: RoleProfilesFile): Promise<void> {
  storeCache = structuredClone(store);
  if (!SHOULD_PERSIST_STORE) return;

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tempPath = createTempPath();
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  try {
    await access(STORE_PATH);
    await rename(STORE_PATH, BACKUP_PATH);
  } catch {
    // no previous file
  }
  try {
    await rename(tempPath, STORE_PATH);
  } catch (error) {
    try {
      await copyFile(BACKUP_PATH, STORE_PATH);
    } catch {
      // ignore
    }
    try {
      await unlink(tempPath);
    } catch {
      // ignore
    }
    throw error;
  }
}

async function updateStore(mutator: (store: RoleProfilesFile) => void | Promise<void>): Promise<RoleProfilesFile> {
  const next = await readStore();
  await mutator(next);
  writeChain = writeChain.then(() => writeStore(next));
  await writeChain;
  return structuredClone(next);
}

export async function listRoleProfiles(): Promise<RoleProfile[]> {
  const store = mergeDefaultRoles(await readStore());
  await writeStore(store);
  return structuredClone(store.roles);
}

export async function getRoleProfile(id: string): Promise<RoleProfile | undefined> {
  const store = mergeDefaultRoles(await readStore());
  const roleId = normalizeInternalRoleId(id, DEFAULT_NEW_USER_ROLE_ID);
  return store.roles.find((role) => role.id === roleId);
}

export async function createRoleProfile(input: Partial<RoleProfile>): Promise<RoleProfile> {
  const role = normalizeRoleProfile({ ...input, id: input.id || '', updatedAt: nowIso() });
  if (!isStandardRoleId(role.id)) {
    throw new Error('role_profile_create_disabled');
  }
  return updateRoleProfile(role.id, role) as Promise<RoleProfile>;
}

export async function updateRoleProfile(id: string, patch: Partial<RoleProfile>): Promise<RoleProfile | undefined> {
  if (!isStandardRoleId(id)) return undefined;
  const store = mergeDefaultRoles(await readStore());
  const current = store.roles.find((item) => item.id === id);
  if (!current) return undefined;
  const next = normalizeRoleProfile({
    ...current,
    ...patch,
    id: current.id,
    updatedAt: nowIso(),
  });
  store.roles = store.roles.map((item) => (item.id === id ? next : item)).sort((a, b) => a.sortOrder - b.sortOrder);
  await writeStore(store);
  return next;
}

export async function deleteRoleProfile(_id: string): Promise<boolean> {
  return false;
}

export function getDefaultRoleProfile(roleId?: string): RoleProfile | undefined {
  const defaults = buildDefaultRoles().roles;
  if (!roleId) return defaults.find((item) => item.id === DEFAULT_NEW_USER_ROLE_ID) || defaults[0];
  const normalizedRoleId = normalizeInternalRoleId(roleId, DEFAULT_NEW_USER_ROLE_ID);
  return defaults.find((item) => item.id === normalizedRoleId);
}
