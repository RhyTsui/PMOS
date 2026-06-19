import type {
  BusinessContextSlotValue,
  BusinessContextSnapshot,
  BusinessContextSource,
  IntentType,
  MissingField,
  MissingSlot,
  ResolvedSlot,
  SlotState,
} from '@/types';

export type SlotKey =
  | 'project'
  | 'app'
  | 'media'
  | 'timeRange'
  | 'metrics'
  | 'dimensions'
  | 'reportSource'
  | 'compareSource'
  | 'sample'
  | 'threshold'
  | 'notification'
  | 'period'
  | 'outputFormat'
  | 'terminal';

export interface SlotSchemaEntry {
  slotKey: SlotKey;
  label: string;
  priority: 'required' | 'recommended' | 'optional';
  inherit: boolean;
  confirmOnChange?: boolean;
  suggestedQuestion: string;
  reason: string;
  aliasTerms?: string[];
}

export interface SlotSchema {
  intentType: IntentType;
  policyId: string;
  allowInheritance: boolean;
  slots: SlotSchemaEntry[];
}

type SlotContextKey = keyof Pick<
  BusinessContextSnapshot,
  'project' | 'app' | 'media' | 'timeRange' | 'metrics' | 'dimensions' | 'reportSource' | 'compareSource'
>;

const SLOT_CONTEXT_KEYS: Partial<Record<SlotKey, SlotContextKey>> = {
  project: 'project',
  app: 'app',
  media: 'media',
  timeRange: 'timeRange',
  metrics: 'metrics',
  dimensions: 'dimensions',
  reportSource: 'reportSource',
  compareSource: 'compareSource',
};

const SLOT_SCHEMAS: Partial<Record<IntentType, SlotSchema>> = {
  report_query: {
    intentType: 'report_query',
    policyId: 'report-query-v1',
    allowInheritance: true,
    slots: [
      { slotKey: 'app', label: '项目或应用', priority: 'required', inherit: true, suggestedQuestion: '请选择项目或补充 APPID。', reason: '问数需要明确项目范围。', aliasTerms: ['APPID|app_id|appid|项目|应用|project_id|projectId'] },
      { slotKey: 'timeRange', label: '时间范围', priority: 'required', inherit: true, suggestedQuestion: '请补充要查看的日期或时间范围。', reason: '问数需要明确统计时间。', aliasTerms: ['今天|今日|昨天|昨日|近\\d+天|过去\\d+天|本周|上周|日期|时间|\\d{4}-\\d{1,2}-\\d{1,2}'] },
      { slotKey: 'metrics', label: '指标', priority: 'required', inherit: true, suggestedQuestion: '请补充要查看的指标。', reason: '问数需要明确指标口径。', aliasTerms: ['消耗|花费|成本|激活|注册|付费|ROI|ROAS|留存|流水|指标|cost|spend|activation|register|payment|retention|revenue'] },
      { slotKey: 'dimensions', label: '维度', priority: 'optional', inherit: true, suggestedQuestion: '可以补充按媒体、账号、计划或终端拆分。', reason: '维度用于细化结果。', aliasTerms: ['媒体|渠道|账户|账号|计划|终端|维度|拆分|dimension'] },
    ],
  },
  diagnosis: {
    intentType: 'diagnosis',
    policyId: 'diagnosis-v1',
    allowInheritance: true,
    slots: [
      { slotKey: 'media', label: '媒体平台', priority: 'required', inherit: true, suggestedQuestion: '请补充涉及的媒体平台。', reason: '排查需要明确对比媒体。', aliasTerms: ['巨量|穿山甲|抖音|快手|广点通|腾讯|媒体|media'] },
      { slotKey: 'app', label: '项目或应用', priority: 'required', inherit: true, suggestedQuestion: '请补充 APPID、应用名称或项目名称。', reason: '排查需要定位具体应用。', aliasTerms: ['APPID|app_id|appid|应用|项目|包名|project'] },
      { slotKey: 'timeRange', label: '排查时间', priority: 'required', inherit: true, suggestedQuestion: '请补充异常发生日期或时间范围。', reason: '排查需要固定时间窗口。', aliasTerms: ['今天|今日|昨天|昨日|近\\d+天|过去\\d+天|日期|时间|\\d{4}-\\d{1,2}-\\d{1,2}'] },
      { slotKey: 'metrics', label: '异常指标', priority: 'required', inherit: true, suggestedQuestion: '请补充异常指标。', reason: '排查需要明确问题口径。', aliasTerms: ['激活|注册|付费|消耗|成本|点击|展示|ROI|ROAS|指标|metric'] },
      { slotKey: 'compareSource', label: '对比数据源', priority: 'required', inherit: true, suggestedQuestion: '请说明对比的是媒体后台、智投报表还是 BI。', reason: '排查需要明确对比来源。', aliasTerms: ['BI|媒体后台|媒体原始|智投报表|智投平台|数据源|对比源|report_source|compare_source'] },
      { slotKey: 'sample', label: '样例或截图', priority: 'recommended', inherit: false, suggestedQuestion: '如果有截图、明细或 trace_id，可以一起补充。', reason: '样例能提升定位效率。', aliasTerms: ['截图|样例|明细|trace|日志|error|报错'] },
    ],
  },
  debugging: {
    intentType: 'debugging',
    policyId: 'debugging-v1',
    allowInheritance: true,
    slots: [
      { slotKey: 'app', label: '项目或应用', priority: 'required', inherit: true, suggestedQuestion: '请补充项目或应用。', reason: '联调需要确定应用。', aliasTerms: ['APPID|应用|项目|app'] },
      { slotKey: 'media', label: '媒体平台', priority: 'required', inherit: true, suggestedQuestion: '请补充媒体平台。', reason: '联调需要确定媒体。', aliasTerms: ['巨量|快手|广点通|腾讯|媒体|media'] },
      { slotKey: 'terminal', label: '终端', priority: 'required', inherit: true, suggestedQuestion: '请补充 Android 或 iOS。', reason: '联调需要确定终端。', aliasTerms: ['Android|安卓|iOS|苹果|终端'] },
    ],
  },
  monitor: {
    intentType: 'monitor',
    policyId: 'monitor-v1',
    allowInheritance: true,
    slots: [
      { slotKey: 'project', label: '项目范围', priority: 'required', inherit: true, suggestedQuestion: '请选择项目范围。', reason: '监控需要明确覆盖范围。', aliasTerms: ['项目|应用|APPID|project'] },
      { slotKey: 'metrics', label: '监控指标', priority: 'required', inherit: true, suggestedQuestion: '请补充要监控的指标。', reason: '监控需要明确指标。', aliasTerms: ['指标|延迟|回传|消耗|注册|付费|metric'] },
      { slotKey: 'threshold', label: '阈值', priority: 'required', inherit: false, suggestedQuestion: '请补充触发提醒的阈值。', reason: '监控需要明确触发条件。', aliasTerms: ['阈值|超过|低于|高于|\\d+\\s*(分钟|%|元|次)'] },
      { slotKey: 'notification', label: '通知方式', priority: 'recommended', inherit: false, suggestedQuestion: '可以补充提醒到哪里。', reason: '通知方式决定告警触达。', aliasTerms: ['小闪|群|通知|提醒|邮件|飞书|企业微信'] },
    ],
  },
  help: {
    intentType: 'help',
    policyId: 'help-v1',
    allowInheritance: false,
    slots: [],
  },
  demand: {
    intentType: 'demand',
    policyId: 'demand-v1',
    allowInheritance: true,
    slots: [
      { slotKey: 'media', label: '媒体平台', priority: 'required', inherit: true, suggestedQuestion: '请补充媒体平台。', reason: '需求处理需要明确媒体。', aliasTerms: ['媒体|巨量|快手|广点通|腾讯'] },
      { slotKey: 'app', label: '项目或应用', priority: 'recommended', inherit: true, suggestedQuestion: '可以补充项目或应用。', reason: '项目范围有助于沉淀需求。', aliasTerms: ['项目|应用|APPID|app'] },
    ],
  },
  get_delivery_packages: {
    intentType: 'get_delivery_packages',
    policyId: 'delivery-v1',
    allowInheritance: true,
    slots: [
      { slotKey: 'app', label: '项目或应用', priority: 'required', inherit: true, suggestedQuestion: '请补充项目或应用。', reason: '验收流程需要确定包体所属项目。', aliasTerms: ['项目|应用|APPID|包|package'] },
    ],
  },
  forecast: {
    intentType: 'forecast',
    policyId: 'forecast-v1',
    allowInheritance: true,
    slots: [
      { slotKey: 'app', label: '项目或应用', priority: 'required', inherit: true, suggestedQuestion: '请补充预测对象。', reason: '预测需要明确对象。', aliasTerms: ['项目|应用|APPID|app'] },
      { slotKey: 'timeRange', label: '预测时间', priority: 'required', inherit: true, suggestedQuestion: '请补充预测时间范围。', reason: '预测需要明确时间范围。', aliasTerms: ['今天|明天|未来|近\\d+天|日期|时间'] },
      { slotKey: 'metrics', label: '预测指标', priority: 'required', inherit: true, suggestedQuestion: '请补充预测指标。', reason: '预测需要明确指标。', aliasTerms: ['ROI|LTV|回收|消耗|流水|指标'] },
    ],
  },
  general: {
    intentType: 'general',
    policyId: 'general-v1',
    allowInheritance: false,
    slots: [],
  },
};

function isPresent(value?: BusinessContextSlotValue): value is BusinessContextSlotValue {
  if (!value) return false;
  if (Array.isArray(value.value)) return value.value.length > 0;
  return Boolean(String(value.value || '').trim());
}

function matchesAliasTerm(message: string, aliasTerm: string): boolean {
  try {
    return new RegExp(aliasTerm, 'i').test(message);
  } catch {
    return message.toLowerCase().includes(aliasTerm.toLowerCase());
  }
}

function explicitSlotFromMessage(message: string, slot: SlotSchemaEntry): BusinessContextSlotValue | null {
  if (!slot.aliasTerms?.some((term) => matchesAliasTerm(message, term))) return null;
  return {
    value: slot.label,
    source: 'current_message',
    confidence: 'medium',
  };
}

function getContextSlot(context: BusinessContextSnapshot, slotKey: SlotKey): BusinessContextSlotValue | undefined {
  const key = SLOT_CONTEXT_KEYS[slotKey];
  return key ? context[key] : undefined;
}

function toResolvedSlot(slot: SlotSchemaEntry, value: BusinessContextSlotValue, inherited: boolean): ResolvedSlot {
  return {
    slotKey: slot.slotKey,
    label: slot.label,
    value: value.value,
    source: value.source,
    confidence: value.confidence,
    inherited,
  };
}

function toMissingSlot(slot: SlotSchemaEntry): MissingSlot {
  return {
    slotKey: slot.slotKey,
    label: slot.label,
    priority: slot.priority,
    suggestedQuestion: slot.suggestedQuestion,
    reason: slot.reason,
  };
}

export function getSlotSchema(intentType?: IntentType): SlotSchema {
  return SLOT_SCHEMAS[intentType || 'general'] || SLOT_SCHEMAS.general!;
}

export function resolveSlots(params: {
  intentType?: IntentType;
  message: string;
  businessContext: BusinessContextSnapshot;
}): SlotState {
  const schema = getSlotSchema(params.intentType);
  const resolvedSlots: ResolvedSlot[] = [];
  const missingSlots: MissingSlot[] = [];

  for (const slot of schema.slots) {
    const explicit = explicitSlotFromMessage(params.message, slot);
    const inherited = schema.allowInheritance && slot.inherit ? getContextSlot(params.businessContext, slot.slotKey) : undefined;
    if (explicit) {
      resolvedSlots.push(toResolvedSlot(slot, explicit, false));
      continue;
    }
    if (isPresent(inherited)) {
      resolvedSlots.push(toResolvedSlot(slot, inherited, true));
      continue;
    }
    if (slot.priority !== 'optional') {
      missingSlots.push(toMissingSlot(slot));
    }
  }

  const requiredSlots = schema.slots.filter((slot) => slot.priority === 'required').map((slot) => slot.slotKey);
  const missingRequired = missingSlots.some((slot) => slot.priority === 'required');
  const confidence = missingRequired ? 'medium' : resolvedSlots.length > 0 ? 'high' : 'low';

  return {
    intentType: schema.intentType,
    requiredSlots,
    resolvedSlots,
    missingSlots,
    confidence,
    followUpAllowed: schema.allowInheritance,
    policyId: schema.policyId,
  };
}

export function missingSlotsToFields(slots: MissingSlot[]): MissingField[] {
  return slots.map((slot) => ({
    field_key: slot.slotKey,
    field_label: slot.label,
    priority: slot.priority,
    why_required: slot.reason,
    suggested_question: slot.suggestedQuestion,
    source: 'slot_resolver',
  }));
}

export function createSlotValue(
  value: string | string[] | undefined,
  source: BusinessContextSource,
  confidence: BusinessContextSlotValue['confidence'] = 'high',
): BusinessContextSlotValue | undefined {
  if (Array.isArray(value)) {
    const next = value.filter(Boolean);
    return next.length ? { value: next, source, confidence, updatedAt: new Date().toISOString() } : undefined;
  }
  const text = String(value || '').trim();
  return text ? { value: text, source, confidence, updatedAt: new Date().toISOString() } : undefined;
}
