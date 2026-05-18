import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';

export interface AdminFeatureSwitch {
  key: string;
  name: string;
  type: 'boolean' | 'number';
  enabled: boolean;
  config: Record<string, unknown>;
  description: string;
}

const DEFAULT_SWITCHES: AdminFeatureSwitch[] = [
  { key: 'auto_debug_full', name: '全自动联调开关', type: 'boolean', enabled: true, config: {}, description: '开启后联调任务自动执行，无需人工确认' },
  { key: 'auto_debug_takeover', name: '人工接管开关', type: 'boolean', enabled: true, config: {}, description: '允许在联调失败时由人工接管' },
  { key: 'evidence_auto_collect', name: '证据自动采集', type: 'boolean', enabled: true, config: {}, description: '自动采集排查所需日志和数据' },
  { key: 'demand_form_auto_fill', name: '需求单自动填充', type: 'boolean', enabled: false, config: {}, description: '从历史记录自动填充需求单字段' },
  { key: 'clarification_max_rounds', name: '追问轮数上限', type: 'number', enabled: true, config: { value: 3 }, description: '单次任务最多追问轮数' },
  { key: 'risk_alert_threshold', name: '风险告警阈值', type: 'number', enabled: true, config: { value: 0.7 }, description: '置信度低于此值时触发告警' },
];

const SWITCHES_PATH = runtimeDataPath('feature-switches.json');
const LEGACY_SWITCHES_PATH = legacyDataPath('feature-switches.json');

interface SwitchesFile {
  switches: AdminFeatureSwitch[];
}

function normalizeSwitch(input: Partial<AdminFeatureSwitch>): AdminFeatureSwitch {
  return {
    key: input.key || `switch-${Date.now()}`,
    name: input.name || input.key || '未命名开关',
    type: input.type || 'boolean',
    enabled: Boolean(input.enabled),
    config: input.config || {},
    description: input.description || '',
  };
}

async function readSwitchesFile(): Promise<SwitchesFile> {
  for (const filePath of [SWITCHES_PATH, LEGACY_SWITCHES_PATH]) {
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<SwitchesFile>;
      if (Array.isArray(parsed.switches)) {
        return { switches: parsed.switches.map(normalizeSwitch) };
      }
    } catch {
      // Try next location.
    }
  }
  return { switches: DEFAULT_SWITCHES.map(normalizeSwitch) };
}

async function writeSwitchesFile(file: SwitchesFile): Promise<void> {
  await mkdir(path.dirname(SWITCHES_PATH), { recursive: true });
  await writeFile(SWITCHES_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function listFeatureSwitches(): Promise<AdminFeatureSwitch[]> {
  const file = await readSwitchesFile();
  const byKey = new Map(DEFAULT_SWITCHES.map(item => [item.key, item]));
  for (const item of file.switches) byKey.set(item.key, normalizeSwitch(item));
  const merged = [...byKey.values()];
  await writeSwitchesFile({ switches: merged });
  return merged;
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
