import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';
import { buildDbWriteError } from './db-error';

const DOMAIN = 'feature_switch';

export interface AdminFeatureSwitch {
  key: string;
  name: string;
  type: 'boolean' | 'number';
  enabled: boolean;
  config: Record<string, unknown>;
  description: string;
  scope: 'global' | 'role' | 'environment' | 'runtime';
  runtimeBinding: string;
  riskLevel: 'low' | 'medium' | 'high';
  owner: string;
  updatedAt: string;
  configVersion: string;
  checksum: string;
}

const DEFAULT_SWITCHES: Array<Partial<AdminFeatureSwitch>> = [
  { key: 'auto_debug_full', name: '全自动联调开关', type: 'boolean', enabled: true, config: {}, description: '开启后联调任务自动执行，无需人工确认' },
  { key: 'auto_debug_takeover', name: '人工接管开关', type: 'boolean', enabled: true, config: {}, description: '允许在联调失败时由人工接管' },
  { key: 'evidence_auto_collect', name: '证据自动采集', type: 'boolean', enabled: true, config: {}, description: '自动采集排查所需日志和数据' },
  { key: 'demand_form_auto_fill', name: '需求单自动填充', type: 'boolean', enabled: false, config: {}, description: '从历史记录自动填充需求单字段' },
  { key: 'clarification_max_rounds', name: '追问轮数上限', type: 'number', enabled: true, config: { value: 3 }, description: '单次任务最多追问轮数' },
  { key: 'risk_alert_threshold', name: '风险告警阈值', type: 'number', enabled: true, config: { value: 0.7 }, description: '置信度低于此值时触发告警' },
  { key: 'input_guardrail_enabled', name: '输入安全校验', type: 'boolean', enabled: true, config: {}, description: '对用户输入进行 PII 检测和 prompt 注入检测' },
  { key: 'tool_guardrail_enabled', name: '工具调用校验', type: 'boolean', enabled: true, config: {}, description: '对工具输入输出进行参数合规和敏感信息过滤' },
  { key: 'output_guardrail_enabled', name: '输出安全校验', type: 'boolean', enabled: true, config: {}, description: '对最终答案进行证据断言、raw params 泄露等安全检查' },
  { key: 'trace_sampling_rate', name: 'Trace 采样率', type: 'number', enabled: true, config: { value: 1.0 }, description: 'Trace 记录采样率（0-1）' },
  { key: 'enableQueryContractLlmGeneration', name: 'LLM 契约生成', type: 'boolean', enabled: false, config: {}, description: '启用 query_contract_generation LLM 生成 QueryContractCandidate。默认关闭，灰度验证后逐步开启。', scope: 'runtime', riskLevel: 'medium', owner: 'report-query-pipeline' },
  { key: 'attachment_query_mode', name: '附件问数模式', type: 'number', enabled: true, config: { value: 1 }, description: '控制附件模板/截图解析结果对问数链路的影响程度。0=shadow(仅观测) 1=assist(补空槽，默认) 2=active(可驱动执行，未实现)', scope: 'runtime', riskLevel: 'medium', owner: 'attachment-query-pipeline' },
];

const SWITCHES_PATH = runtimeDataPath('feature-switches.json');

interface SwitchesFile {
  switches: AdminFeatureSwitch[];
}

function normalizeSwitch(input: Partial<AdminFeatureSwitch>): AdminFeatureSwitch {
  const key = input.key || 'switch-' + Date.now();
  return {
    key,
    name: input.name || input.key || '未命名开关',
    type: input.type || 'boolean',
    enabled: Boolean(input.enabled),
    config: input.config || {},
    description: input.description || '',
    scope: input.scope || 'runtime',
    runtimeBinding: input.runtimeBinding || 'feature_flags.' + key,
    riskLevel: input.riskLevel === 'low' || input.riskLevel === 'high' ? input.riskLevel : 'medium',
    owner: input.owner || 'admin-control-plane',
    updatedAt: input.updatedAt || new Date().toISOString(),
    configVersion: input.configVersion || 'feature-switch/v1',
    checksum: input.checksum || key + ':feature-switch/v1',
  };
}

async function readSwitchesFile(): Promise<SwitchesFile> {
  // B1: DB-first read path
  try {
    const { listConfigs } = await import('./db/repositories/config-repository');
    const rows = await listConfigs({ domain: DOMAIN, status: 'active' });
    if (rows.length > 0) {
      return { switches: rows.map(r => normalizeSwitch(r.value as Partial<AdminFeatureSwitch>)) };
    }
  } catch { /* fall through to JSON */ }

  try {
    const raw = await readFile(SWITCHES_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SwitchesFile>;
    if (Array.isArray(parsed.switches)) {
      return { switches: parsed.switches.map(normalizeSwitch) };
    }
  } catch {
    // use defaults
  }
  return { switches: DEFAULT_SWITCHES.map(normalizeSwitch) };
}

async function writeSwitchesFile(file: SwitchesFile): Promise<void> {
  // B1: DB write (primary) - each switch as a config_entries row
  let dbWriteError: unknown;
  try {
    const { upsertConfig } = await import('./db/repositories/config-repository');
    for (const s of file.switches) {
      try {
        await upsertConfig({ domain: DOMAIN, configKey: s.key, value: s, changedBy: 'system', source: 'manual' });
      } catch (err) {
        console.error(`[feature-switch] DB upsert failed for "${s.key}"`, (err as Error)?.message);
        dbWriteError = err;
      }
    }
  } catch (err) {
    console.error('[feature-switch] DB write failed, falling back to JSON', (err as Error)?.message);
    dbWriteError = err;
  }
  if (dbWriteError) {
    throw buildDbWriteError('feature_switch', dbWriteError);
  }
  return;

  await mkdir(path.dirname(SWITCHES_PATH), { recursive: true });
  await writeFile(SWITCHES_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function listFeatureSwitches(): Promise<AdminFeatureSwitch[]> {
  const file = await readSwitchesFile();
  const byKey = new Map(DEFAULT_SWITCHES.map(item => {
    const normalized = normalizeSwitch(item);
    return [normalized.key, normalized] as const;
  }));
  for (const item of file.switches) byKey.set(item.key, normalizeSwitch(item));
  const merged = [...byKey.values()];

  // 仅在新增默认项时才写回（避免每次读取都触发 DB 写入）
  const storedKeys = new Set(file.switches.map((s) => s.key));
  const hasNewDefaults = DEFAULT_SWITCHES.some((ds) => !storedKeys.has(normalizeSwitch(ds).key));
  if (hasNewDefaults) {
    await writeSwitchesFile({ switches: merged });
  }

  return merged;
}

/** v4: 读取 query_contract_generation 功能开关(默认 false) */
export async function isQueryContractLlmGenerationEnabled(): Promise<boolean> {
  try {
    const switches = await listFeatureSwitches();
    const sw = switches.find(s => s.key === 'enableQueryContractLlmGeneration');
    return sw?.enabled ?? false;
  } catch {
    return false;
  }
}

export async function updateFeatureSwitch(key: string, patch: Partial<AdminFeatureSwitch>): Promise<AdminFeatureSwitch | undefined> {
  const switches = await listFeatureSwitches();
  let updated: AdminFeatureSwitch | undefined;
  const next = switches.map((item) => {
    if (item.key !== key) return item;
    updated = normalizeSwitch({ ...item, ...patch, key });
    return updated;
  });
  if (!updated) return undefined;
  await writeSwitchesFile({ switches: next });
  return updated;
}
