import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';

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
  { key: 'input_guardrail_enabled', name: '输入安全校验', type: 'boolean', enabled: true, config: {}, description: '对用户输入进行 PII 检测和 prompt 注入检测' },
  { key: 'tool_guardrail_enabled', name: '工具调用校验', type: 'boolean', enabled: true, config: {}, description: '对工具输入输出进行参数合规和敏感信息过滤' },
  { key: 'output_guardrail_enabled', name: '输出安全校验', type: 'boolean', enabled: true, config: {}, description: '对最终答案进行证据断言、raw params 泄露等安全检查' },
  { key: 'planner_shadow_enabled', name: 'Planner 旁路观测', type: 'boolean', enabled: true, config: {}, description: '启用 Planner 旁路推理，用于对比路由决策' },
  { key: 'planner_shadow_timeout_ms', name: 'Planner 超时阈值', type: 'number', enabled: true, config: { value: 2000 }, description: 'Planner 旁路观测超时时间（毫秒）' },
  { key: 'trace_sampling_rate', name: 'Trace 采样率', type: 'number', enabled: true, config: { value: 1.0 }, description: 'Trace 记录采样率（0-1）' },
];

const SWITCHES_PATH = runtimeDataPath('feature-switches.json');

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
