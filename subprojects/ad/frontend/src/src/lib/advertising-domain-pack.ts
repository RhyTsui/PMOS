import type { EntityResolutionConfigEntry } from './entity-resolution-config-store';
import type { IntentRouteRule } from './intent-route-rules';
import type {
  ReportQueryCapabilityConfig,
  ReportQuerySchemaAdapter,
  ReportQuerySemanticDefaults,
  ReportQueryToolSelectionRule,
} from './report-query-policy-store';

export interface DomainPackConfig {
  pack_id: string;
  enabled: boolean;
  version?: string;
  source?: 'built_in_seed' | 'runtime_config';
}

export interface DomainPackSignalTerm<T extends string = string> {
  key: T;
  terms: string[];
  source_key?: string;
}

export interface DomainPackDimensionSignal extends DomainPackSignalTerm {
  role: 'breakdown' | 'x_axis' | 'filter' | 'focus';
}

export interface DomainPackRequestSignals {
  metrics: DomainPackSignalTerm[];
  dimensions: DomainPackDimensionSignal[];
  views: DomainPackSignalTerm<Array<'summary' | 'trend' | 'table' | 'detail' | 'comparison' | 'diagnosis'>[number]>[];
  granularity: DomainPackSignalTerm<Array<'hour' | 'day' | 'week' | 'month'>[number]>[];
  reportActions: DomainPackSignalTerm[];
  routePhrases: DomainPackSignalTerm[];
  domainEntities: DomainPackSignalTerm[];
}

export const ADVERTISING_DOMAIN_PACK_ID = 'advertising';
export const ADVERTISING_DOMAIN_PACK_VERSION = '2026-06-01.advertising-v1';

export const DEFAULT_DOMAIN_PACKS: DomainPackConfig[] = [
  {
    pack_id: ADVERTISING_DOMAIN_PACK_ID,
    enabled: true,
    version: ADVERTISING_DOMAIN_PACK_VERSION,
    source: 'built_in_seed',
  },
];

export const ADVERTISING_DOMAIN_SIGNAL_TERMS = {
  media: ['巨量', '巨量引擎', '腾讯', '快手', '抖音', '广点通', '穿山甲', '今日头条', '头条', 'TapTap', 'taptap'],
  metric: ['ROI', 'ROAS', 'cost', 'spend', 'revenue', '激活', '消耗', '花费', '成本', '注册', '付费', '收入', '留存', 'ARPU', 'ARPPU', '转化'],
  businessObject: ['媒体', '渠道', '项目', '应用', 'app', 'campaign', 'account', '素材', '创意', '包体', '终端', 'android', 'ios', '自然量', '自然流量', 'organic'],
  workflow: ['投放', '归因', '联调', '广告包', '投放包', '媒体包', '渠道包', '回传', '监测链接'],
} as const;

export type AdvertisingDomainSignalGroup = keyof typeof ADVERTISING_DOMAIN_SIGNAL_TERMS;

export function hasAdvertisingDomainSignal(text: string, groups?: AdvertisingDomainSignalGroup[]): boolean {
  const normalized = String(text || '').toLowerCase();
  const selectedGroups = groups || (Object.keys(ADVERTISING_DOMAIN_SIGNAL_TERMS) as AdvertisingDomainSignalGroup[]);
  return selectedGroups.some(group => ADVERTISING_DOMAIN_SIGNAL_TERMS[group].some(term => normalized.includes(term.toLowerCase())));
}

export function normalizeDomainPacks(input?: DomainPackConfig[] | null): DomainPackConfig[] {
  const raw = Array.isArray(input) ? input : DEFAULT_DOMAIN_PACKS;
  const byId = new Map<string, DomainPackConfig>();
  for (const pack of DEFAULT_DOMAIN_PACKS) {
    byId.set(pack.pack_id, { ...pack });
  }
  for (const pack of raw) {
    const packId = String(pack?.pack_id || '').trim();
    if (!packId) continue;
    byId.set(packId, {
      pack_id: packId,
      enabled: pack?.enabled !== false,
      version: String(pack?.version || byId.get(packId)?.version || '').trim() || undefined,
      source: pack?.source || 'runtime_config',
    });
  }
  return Array.from(byId.values());
}

export function isDomainPackEnabled(packs?: DomainPackConfig[] | null, packId = ADVERTISING_DOMAIN_PACK_ID): boolean {
  return normalizeDomainPacks(packs).find(pack => pack.pack_id === packId)?.enabled !== false;
}

export const ADVERTISING_REQUEST_SIGNALS: DomainPackRequestSignals = {
  metrics: [
    { key: 'cost', terms: ['消耗', '花费', '成本', 'cost', 'spend'], source_key: 'requestSignals.metrics.cost' },
    { key: 'd1_roi', terms: ['首日ROI', '首日 ROI', '首日回收', '首日广告回收', 'd1 roi', 'first day roi'], source_key: 'requestSignals.metrics.d1_roi' },
    { key: 'roi', terms: ['ROI', 'roi', '投产', '投入产出', '回收'], source_key: 'requestSignals.metrics.roi' },
    { key: 'roas', terms: ['ROAS', 'roas'], source_key: 'requestSignals.metrics.roas' },
    { key: 'activation', terms: ['激活', 'activation'], source_key: 'requestSignals.metrics.activation' },
    { key: 'register', terms: ['注册', 'register'], source_key: 'requestSignals.metrics.register' },
    { key: 'payment', terms: ['付费', '支付', 'payment'], source_key: 'requestSignals.metrics.payment' },
    { key: 'revenue', terms: ['收入', '流水', 'revenue'], source_key: 'requestSignals.metrics.revenue' },
    { key: 'retention_d1', terms: ['留存', '次留', 'retention'], source_key: 'requestSignals.metrics.retention_d1' },
    { key: 'arppu', terms: ['ARPPU', 'arppu'], source_key: 'requestSignals.metrics.arppu' },
  ],
  dimensions: [
    { key: 'material', role: 'breakdown', terms: ['素材', '创意', 'material', 'creative'], source_key: 'requestSignals.dimensions.material' },
    { key: 'media', role: 'filter', terms: ['媒体', '渠道', 'media', 'platform'], source_key: 'requestSignals.dimensions.media' },
    { key: 'account', role: 'filter', terms: ['账户', '账号', 'account'], source_key: 'requestSignals.dimensions.account' },
    { key: 'campaign', role: 'breakdown', terms: ['计划', '广告计划', 'campaign'], source_key: 'requestSignals.dimensions.campaign' },
    { key: 'date', role: 'x_axis', terms: ['日期', '时间', '每日', '每天', '按日', '趋势', 'date', 'day', 'daily'], source_key: 'requestSignals.dimensions.date' },
    { key: 'hour', role: 'x_axis', terms: ['小时', '分时', '实时', 'hour', 'hourly'], source_key: 'requestSignals.dimensions.hour' },
    { key: 'team', role: 'filter', terms: ['团队', 'team'], source_key: 'requestSignals.dimensions.team' },
    { key: 'app_package_type', role: 'filter', terms: ['应用类型', '包体类型', 'app package type', 'package type'], source_key: 'requestSignals.dimensions.app_package_type' },
    { key: 'package', role: 'filter', terms: ['包体', 'package', 'pkg'], source_key: 'requestSignals.dimensions.package' },
    { key: 'terminal_os', role: 'filter', terms: ['安卓', 'Android', '苹果', 'iOS', '终端系统', 'os'], source_key: 'requestSignals.dimensions.terminal_os' },
  ],
  views: [
    { key: 'comparison', terms: ['对比', '比较', 'comparison', 'compare'], source_key: 'requestSignals.views.comparison' },
    { key: 'table', terms: ['明细', '表格', '列表', 'table'], source_key: 'requestSignals.views.table' },
    { key: 'diagnosis', terms: ['诊断', '原因', '为什么', '异常', '问题'], source_key: 'requestSignals.views.diagnosis' },
    { key: 'trend', terms: ['趋势', '走势', '变化', '每日', '每天', '按日', '折线', '图表', 'trend', 'chart', 'line chart'], source_key: 'requestSignals.views.trend' },
  ],
  granularity: [
    { key: 'hour', terms: ['小时', '分时', '实时', 'hour', 'hourly'], source_key: 'requestSignals.granularity.hour' },
    { key: 'week', terms: ['周', '周报', 'weekly', 'week'], source_key: 'requestSignals.granularity.week' },
    { key: 'month', terms: ['月', '月报', 'monthly', 'month'], source_key: 'requestSignals.granularity.month' },
    { key: 'day', terms: ['日', '天', '日报', '每日', 'daily', 'day'], source_key: 'requestSignals.granularity.day' },
  ],
  reportActions: [
    { key: 'query', terms: ['查数', '查询', '查看', '看下', '统计', '取数', '数据', '多少'], source_key: 'requestSignals.reportActions.query' },
    { key: 'delivery', terms: ['报表', '生成', '导出', '订阅', '拼表', '下载'], source_key: 'requestSignals.reportActions.delivery' },
    { key: 'trend', terms: ['趋势', '走势', '对比', '排名', '环比', '同比'], source_key: 'requestSignals.reportActions.trend' },
  ],
  routePhrases: [
    { key: 'package_fetch', terms: ['投放包', '广告包', '可交付包', '可投放包', '包地址', '下载地址', '分包', 'package', 'pkg', 'apk', 'ipa', 'download'], source_key: 'requestSignals.routePhrases.package_fetch' },
    { key: 'integration_workflow', terms: ['联调', '联调状态', '联调步骤', '截图记录', '截图', '日志', 'integration', 'screenshot', 'step', 'record', 'log'], source_key: 'requestSignals.routePhrases.integration_workflow' },
    { key: 'diagnosis', terms: ['排查', '异常', '不一致', '差异', '失败', '报错', '为什么', '原因', 'gap', '质量', '下降', '下滑', '没数', '问题'], source_key: 'requestSignals.routePhrases.diagnosis' },
    { key: 'config_help', terms: ['需要哪些配置', '要哪些配置', '怎么配置', '如何配置', '配置说明', '接入条件', '支持条件', '需要准备'], source_key: 'requestSignals.routePhrases.config_help' },
    { key: 'config_operation', terms: ['检查配置', '配置检查', '执行配置', '修改配置', '发起配置检查'], source_key: 'requestSignals.routePhrases.config_operation' },
    { key: 'deliverable_writing', terms: ['帮我写', '写一份', '整理', '起草', '草拟', '生成文档', 'PRD', '需求草稿', '方案文档'], source_key: 'requestSignals.routePhrases.deliverable_writing' },
  ],
  domainEntities: [
    { key: 'media', terms: ['媒体', '平台', '巨量', '巨量引擎', '巨量广告', 'OceanEngine', 'Jiliang', '腾讯', '广点通', '快手', 'TapTap'], source_key: 'requestSignals.domainEntities.media' },
    { key: 'app', terms: ['应用', '项目', 'app', 'APPID', 'app_id', '包名'], source_key: 'requestSignals.domainEntities.app' },
    { key: 'package', terms: ['包体', '包名', 'package', 'pkg'], source_key: 'requestSignals.domainEntities.package' },
    { key: 'terminal_os', terms: ['安卓', 'Android', '苹果', 'iOS', '终端'], source_key: 'requestSignals.domainEntities.terminal_os' },
  ],
};

export function buildAdvertisingRequestSignals(packs?: DomainPackConfig[] | null): DomainPackRequestSignals {
  return isDomainPackEnabled(packs)
    ? ADVERTISING_REQUEST_SIGNALS
    : { metrics: [], dimensions: [], views: [], granularity: [], reportActions: [], routePhrases: [], domainEntities: [] };
}

export function matchDomainSignalTerms(text: string, signals: DomainPackSignalTerm[]): Array<{ key: string; terms: string[]; source_key?: string }> {
  const normalized = String(text || '').toLowerCase();
  return signals
    .map(signal => ({
      key: signal.key,
      source_key: signal.source_key,
      terms: signal.terms.filter(term => term && normalized.includes(term.toLowerCase())),
    }))
    .filter(item => item.terms.length > 0);
}

export const ADVERTISING_ENTITY_RESOLUTION_ENTRIES: Array<Partial<EntityResolutionConfigEntry>> = [
  {
    id: 'advertising-media-oceanengine',
    entity_type: 'media',
    canonical: '巨量',
    aliases: ['巨量', '巨量引擎', '巨量广告', '抖音', '今日头条', '头条', '穿山甲', 'oceanengine'],
    priority: 95,
    enabled: true,
    source: 'domain_pack_seed',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
    notes: '广告域媒体实体别名，可由实体归一化配置覆盖或禁用。',
  },
  {
    id: 'advertising-media-jiliang-canonical',
    entity_type: 'media',
    canonical: '巨量广告',
    aliases: ['巨量广告', '巨量', '巨量引擎', 'Jiliang', 'jiliang', 'OceanEngine', 'oceanengine', '抖音', '今日头条', '头条', '穿山甲'],
    priority: 100,
    enabled: true,
    source: 'domain_pack_seed',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
    notes: '广告域媒体别名归一配置；通用 resolver 不维护媒体事实。',
  },
  {
    id: 'advertising-media-tencent',
    entity_type: 'media',
    canonical: '腾讯',
    aliases: ['腾讯', '腾讯广告', '广点通', 'gdt', 'tencent'],
    priority: 90,
    enabled: true,
    source: 'domain_pack_seed',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-media-kuaishou',
    entity_type: 'media',
    canonical: '快手',
    aliases: ['快手', '快手广告', 'kuaishou'],
    priority: 90,
    enabled: true,
    source: 'domain_pack_seed',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-media-taptap',
    entity_type: 'media',
    canonical: 'TapTap',
    aliases: ['TapTap', 'TapTap广告', 'tap', 'taptap'],
    priority: 90,
    enabled: true,
    source: 'domain_pack_seed',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-terminal-android',
    entity_type: 'terminal_os',
    canonical: 'Android',
    aliases: ['安卓', 'Android', 'android'],
    priority: 85,
    enabled: true,
    source: 'domain_pack_seed',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-terminal-ios',
    entity_type: 'terminal_os',
    canonical: 'iOS',
    aliases: ['iOS', 'ios', '苹果'],
    priority: 85,
    enabled: true,
    source: 'domain_pack_seed',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
];

export const ADVERTISING_INTENT_ROUTE_RULES: IntentRouteRule[] = [
  {
    id: 'advertising-report-query',
    name: '广告数据查询',
    description: '用于广告消耗、ROI、留存、素材等报表查询和趋势分析。',
    intent_type: 'report_query',
    agent: 'report',
    workflow_level: 'light',
    confidence: 'high',
    priority: 100,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['查数', '报表', '数据', '趋势', '对比', '消耗', '花费', '成本', 'ROI', 'ROAS', '留存', '每日', '近30天', '近7天'],
    exclude_terms: ['联调', '扫码联调', '回传验证', '什么意思', '怎么理解', '怎么计算', '含义', '口径', '解释'],
    required_tool_keywords: ['report', 'get_zt_ad_day_report', 'get_zt_ad_roi_report', 'query_report', 'roi', 'daily'],
    reason_template: '命中广告域查数规则，进入报表查询链路。',
    updated_at: '2026-06-01T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-debugging',
    name: '广告联调',
    description: '用于明确的联调、扫码、回传验证和调试请求。',
    intent_type: 'debugging',
    agent: 'debugging',
    workflow_level: 'heavy',
    confidence: 'high',
    priority: 80,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['联调', '自动联调', '扫码联调', '回传验证', '调试', '测试'],
    exclude_terms: ['消耗', 'ROI', '报表', '查数', '趋势', '每日'],
    required_tool_keywords: ['debug', 'postback', 'callback', 'automation'],
    reason_template: '命中广告域联调规则，进入联调处理链路。',
    updated_at: '2026-06-01T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-delivery-packages',
    name: '投放包交付',
    description: '用于查询可投放包、下载地址、包验收和交付阻塞项。',
    intent_type: 'get_delivery_packages',
    agent: 'delivery',
    workflow_level: 'heavy',
    confidence: 'high',
    priority: 75,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['投放包', '广告包', '可交付包', '包地址', '下载地址', '分包'],
    exclude_terms: [],
    required_tool_keywords: ['package', 'download', 'channel'],
    reason_template: '命中投放包交付规则，进入交付链路。',
    updated_at: '2026-06-01T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-config-operation',
    name: '配置检查操作',
    description: '用于检查、执行或修改配置类系统操作请求。',
    intent_type: 'debugging',
    agent: 'debugging',
    workflow_level: 'heavy',
    confidence: 'high',
    priority: 82,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['检查配置', '配置检查', '执行配置', '修改配置', '发起配置检查'],
    exclude_terms: ['配置说明', '怎么配置', '如何配置', '需要哪些配置'],
    required_tool_keywords: ['debug', 'config', 'check', 'automation'],
    reason_template: '命中配置检查操作规则，进入系统操作链路。',
    updated_at: '2026-06-12T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-config-help',
    name: '配置说明帮助',
    description: '用于配置说明、接入条件和准备事项咨询。',
    intent_type: 'help',
    agent: 'help',
    workflow_level: 'light',
    confidence: 'high',
    priority: 74,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['需要哪些配置', '要哪些配置', '怎么配置', '如何配置', '配置说明', '接入条件', '支持条件', '需要准备'],
    exclude_terms: ['检查配置', '配置检查', '执行配置', '修改配置'],
    required_tool_keywords: [],
    reason_template: '命中配置说明规则，进入帮助链路。',
    updated_at: '2026-06-12T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-deliverable-writing',
    name: '交付物撰写',
    description: '用于需求、方案、PRD、说明文档等交付物撰写请求。',
    intent_type: 'demand',
    agent: 'demand',
    workflow_level: 'light',
    confidence: 'high',
    priority: 72,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['帮我写', '写一份', '整理', '起草', '草拟', '生成文档', 'PRD', '需求草稿', '方案文档'],
    exclude_terms: [],
    required_tool_keywords: [],
    reason_template: '命中交付物撰写规则，进入轻量需求撰写链路。',
    updated_at: '2026-06-12T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-forecast',
    name: '预测预估',
    description: '用于预测、预估、LTV、回本和投产相关推演请求。',
    intent_type: 'forecast',
    agent: 'prediction',
    workflow_level: 'light',
    confidence: 'medium',
    priority: 66,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['预测', '预估', '预判', 'forecast', 'ltv', '回本'],
    exclude_terms: ['查数', '报表', '查询', '趋势'],
    required_tool_keywords: [],
    reason_template: '命中预测预估规则，进入预测链路。',
    updated_at: '2026-06-12T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-monitoring',
    name: '监控告警',
    description: '用于监控、告警、阈值和回传延迟类请求。',
    intent_type: 'monitor',
    agent: 'monitoring',
    workflow_level: 'heavy',
    confidence: 'high',
    priority: 70,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['监控', '告警', '报警', '阈值', '回传延迟', '延迟告警'],
    exclude_terms: ['报表', '查数', '查询'],
    required_tool_keywords: [],
    reason_template: '命中监控告警规则，进入监控链路。',
    updated_at: '2026-06-12T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-diagnosis-detail',
    name: '问题排查补充',
    description: '用于异常、差异、质量问题、回传少、漏发等排查请求。',
    intent_type: 'diagnosis',
    agent: 'diagnosis',
    workflow_level: 'heavy',
    confidence: 'high',
    priority: 71,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['排查', '异常', '失败', '差异', '不一致', '为什么', 'gap', '质量问题', '回传少', '漏发'],
    exclude_terms: ['怎么配置', '配置说明', '需要哪些配置', '写一份', '生成文档'],
    required_tool_keywords: [],
    reason_template: '命中问题排查规则，进入问题排查链路。',
    updated_at: '2026-06-12T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
  {
    id: 'advertising-help-lookup',
    name: '说明帮助',
    description: '用于字段口径、规则、路径、能力支持范围等说明类问题。',
    intent_type: 'help',
    agent: 'help',
    workflow_level: 'light',
    confidence: 'medium',
    priority: 58,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['口径', '规则', '路径', '能力', '字段', '含义', '配置说明', '接入条件', '支持条件', '支不支持', '是否支持', '支持哪些', '支持吗'],
    exclude_terms: ['查数', '查询数据', '取数', '趋势', '异常', '排查', '失败', '联调', '配置检查'],
    required_tool_keywords: [],
    reason_template: '命中说明帮助规则，进入帮助链路。',
    updated_at: '2026-06-12T00:00:00.000Z',
    source_pack: ADVERTISING_DOMAIN_PACK_ID,
  },
];

export const ADVERTISING_REPORT_TOOL_SELECTION_RULES: ReportQueryToolSelectionRule[] = [
  {
    id: 'roi-trend',
    question_type: 'roi',
    priority: 90,
    include_terms: ['ROI', 'roi', 'ROAS', 'roas', '首日', '回收', '回收率', '投入产出', '区间ROI', '累计ROI', '趋势', '对比图', '投产比', '回本', '回本率', 'd1_roi'],
    exclude_terms: ['小时', '分时', '实时', '当前小时'],
    tool_keywords: ['get_zt_ad_roi_report', 'roi'],
    default_metrics: ['cost', 'roi'],
    default_dimensions: ['date'],
    description: 'ROI、首日 ROI、回收和趋势对比优先走 ROI 报表。',
  },
  {
    id: 'retention',
    question_type: 'retention',
    priority: 80,
    include_terms: ['留存', '次留', '留存率', '注册留存', '设备留存', '付费留存', '7日留存', '3日留存', '30日留存', 'ARPPU', 'retention', 'LTV', '次日留存', '1日留存', 'D1留存', 'd1留存', '新增留存', '活跃留存'],
    exclude_terms: ['小时', '分时', '实时'],
    tool_keywords: ['get_zt_ad_retention_report', 'retention'],
    default_metrics: ['retention_d1', 'arppu'],
    default_dimensions: ['date'],
    description: '留存和 ARPPU 查询走留存报表。',
  },
  {
    id: 'daily-report',
    question_type: 'daily',
    priority: 75,
    include_terms: ['报表', '数据', '趋势', '表现', 'daily', 'day_report'],
    exclude_terms: ['小时', '分时', '实时'],
    tool_keywords: ['get_zt_ad_day_report', 'daily', 'day_report'],
    default_metrics: ['cost', 'activation', 'roi'],
    default_dimensions: ['date'],
    description: '素材或创意分析缺少专用工具时回落到日报细分。',
  },
  {
    id: 'hour',
    question_type: 'hour',
    priority: 70,
    include_terms: ['小时', '分时', '实时', '截至当前', '当前小时', '小时报表', '分时数据', '每小时', 'hour', 'hourly'],
    exclude_terms: [],
    tool_keywords: ['get_zt_hour_report', 'hour'],
    default_metrics: ['cost'],
    default_dimensions: ['hour'],
    description: '只有明确小时或实时诉求才选择小时报表。',
  },
  {
    id: 'daily',
    question_type: 'daily',
    priority: 60,
    include_terms: ['日报', '报表', '查数', '数据', '消耗', '花费', '成本', '激活', '注册', '付费', '趋势', '每日', '按日', '看下', '查一下', '多少钱', '花了多少', '新增', '下载', '安装'],
    exclude_terms: ['小时', '分时', '实时', '当前小时'],
    tool_keywords: ['get_zt_ad_day_report', 'daily', 'day_report'],
    default_metrics: ['cost', 'activation', 'register', 'payment', 'roi'],
    default_dimensions: ['date'],
    description: '综合报表查询，适用于大盘和常见经营指标分析。',
  },
];

export const ADVERTISING_REPORT_SCHEMA_ADAPTERS: ReportQuerySchemaAdapter[] = [
  {
    id: 'default-ad-report-fields',
    question_type: 'default',
    tool_keywords: ['get_zt_ad_day_report', 'get_zt_ad_roi_report', 'get_zt_ad_retention_report'],
    required_defaults: {
      timeType: 'DAY',
      dataType: 'total',
    },
    promotion_source: {
      argument_key: 'promotionSource',
      internal_values: ['AD', 'ORGANIC'],
      default_internal: 'AD',
      media_default_internal: 'AD',
      source_terms: {
        ORGANIC: ['自然量', '自然流量', '自然', 'organic'],
        AD: ['广告', '投放', '推广'],
      },
      external_values: {
        AD: ['AD'],
        ORGANIC: ['ORGANIC', 'ORGANIC,AD'],
      },
    },
    modeled_argument_keys: ['promotionSource', 'mediaId', 'mediaIds', 'media_id', 'osTypes', 'osType', 'terminalOs', 'appId', 'projectId', 'project_id', 'startDate', 'start_date', 'endDate', 'end_date', 'timeType', 'dataType'],
  },
  {
    id: 'roi-fields',
    question_type: 'roi',
    tool_keywords: ['get_zt_ad_roi_report', 'roi'],
    required_defaults: {
      dataType: 'total',
      timeType: 'DAY',
    },
    promotion_source: {
      argument_key: 'promotionSource',
      internal_values: ['AD', 'ORGANIC'],
      default_internal: 'AD',
      media_default_internal: 'AD',
      source_terms: {
        ORGANIC: ['自然量', '自然流量', '自然', 'organic'],
        AD: ['广告', '投放', '推广'],
      },
      external_values: {
        AD: ['AD'],
        ORGANIC: ['ORGANIC', 'ORGANIC,AD'],
      },
    },
  },
  {
    id: 'retention-fields',
    question_type: 'retention',
    tool_keywords: ['get_zt_ad_retention_report', 'retention'],
    required_defaults: {
      retentionType: 'REG_RETENTION',
      timeType: 'DAY',
    },
    promotion_source: {
      argument_key: 'promotionSource',
      internal_values: ['AD', 'ORGANIC'],
      default_internal: 'AD',
      media_default_internal: 'AD',
      source_terms: {
        ORGANIC: ['自然量', '自然流量', '自然', 'organic'],
        AD: ['广告', '投放', '推广'],
      },
      external_values: {
        AD: ['AD'],
        ORGANIC: ['ORGANIC', 'ORGANIC,AD'],
      },
    },
  },
  {
    id: 'hour-fields',
    question_type: 'hour',
    tool_keywords: ['get_zt_hour_report', 'hour'],
    required_defaults: {
      timeType: 'HOURLY',
      baseTimeType: 'EVENT_TIME',
    },
  },
];

export const ADVERTISING_REPORT_CAPABILITIES: ReportQueryCapabilityConfig[] = [
  {
    id: 'business-report',
    capability_type: 'business_report',
    required: true,
    tool_keywords: ['report', 'query_report', 'get_ads_report', 'get_zt_ad_day_report', 'get_zt_ad_roi_report', 'get_zt_ad_retention_report', 'get_zt_hour_report', '报表', '查数'],
    description: '查询广告报表数据。',
    missing_message: '当前没有可用的数据查询能力，暂时不能直接取数。',
  },
  {
    id: 'media-dictionary',
    capability_type: 'media_dictionary',
    label: '媒体平台',
    entity_type: 'media',
    identifier_key: 'media_id',
    alias_record: 'media_aliases',
    target_keys: ['mediaId', 'mediaIds', 'media_id'],
    slot_mappings: [{ entity_type: 'media', identifier_key: 'media_id', target_keys: ['mediaId', 'mediaIds', 'media_id'], summary_key: 'mediaId', required: true }],
    summary_key: 'mediaId',
    source_key: 'mediaId',
    step_key: 'media_dictionary',
    id_keys: ['mediaId', 'media_id', 'id', 'value', 'code'],
    name_keys: ['mediaName', 'media_name', 'name', 'label', 'text'],
    required: true,
    tool_keywords: ['get_dict_zt_all_media', 'media_dictionary', 'media_dict', 'all_media', '媒体字典', '媒体列表'],
    description: '把用户说的媒体平台匹配成报表可识别的媒体编号。',
    missing_message: '当前缺少媒体平台匹配能力，无法确认本次要查询的媒体编号。',
  },
  {
    id: 'terminal-dictionary',
    capability_type: 'terminal_dictionary',
    label: '终端系统',
    entity_type: 'terminal_os',
    identifier_key: 'os_type',
    alias_record: 'terminal_aliases',
    target_keys: ['osTypes', 'osType'],
    slot_mappings: [{ entity_type: 'terminal_os', identifier_key: 'os_type', target_keys: ['osTypes', 'osType', 'terminalOs'], summary_key: 'osTypes', required: true }],
    summary_key: 'osTypes',
    source_key: 'osTypes',
    step_key: 'os_dictionary',
    id_keys: ['osType', 'os_type', 'id', 'value', 'code'],
    name_keys: ['osName', 'os_name', 'name', 'label', 'text'],
    required: true,
    tool_keywords: ['get_dict_zt_rpt_os_type_v2', 'get_dict_zt_rpt_os_type', 'os_type', 'terminal_dictionary', '终端字典', '终端列表'],
    description: '把用户说的安卓、iOS 等终端匹配成报表可识别的终端范围。',
    missing_message: '当前缺少终端匹配能力，无法确认本次要查询的终端范围。',
  },
  {
    id: 'team-dictionary',
    capability_type: 'team_dictionary',
    label: '团队',
    entity_type: 'team',
    identifier_key: 'team_id',
    alias_record: 'team_aliases',
    target_keys: ['teamIds', 'team_id', 'teamIdsList'],
    slot_mappings: [{ entity_type: 'team', identifier_key: 'team_id', target_keys: ['teamIds', 'team_id', 'teamIdsList'], summary_key: 'teamIds', required: true }],
    summary_key: 'teamIds',
    source_key: 'teamIds',
    step_key: 'team_dictionary',
    id_keys: ['teamId', 'team_id', 'id', 'value', 'code'],
    name_keys: ['teamName', 'team_name', 'name', 'label', 'text'],
    required: true,
    tool_keywords: ['get_dict_zt_label_team', 'get_dict_zt_asset_team', 'team_dictionary', 'team', '团队字典', '团队列表'],
    description: '把用户说的投放团队匹配成报表可识别的团队编号。',
    missing_message: '当前缺少团队匹配能力，无法确认本次要查询的团队范围。',
  },
  {
    id: 'app-package-type-dictionary',
    capability_type: 'app_package_type_dictionary',
    label: '应用类型',
    entity_type: 'app_package_type',
    identifier_key: 'app_package_type',
    alias_record: 'app_package_type_aliases',
    target_keys: ['appPackageType', 'appPackageTypes', 'app_package_type'],
    slot_mappings: [{ entity_type: 'app_package_type', identifier_key: 'app_package_type', target_keys: ['appPackageType', 'appPackageTypes', 'app_package_type'], summary_key: 'appPackageType', value_format: 'string', required: true }],
    summary_key: 'appPackageType',
    source_key: 'appPackageType',
    step_key: 'app_package_type_dictionary',
    id_keys: ['appPackageType', 'app_package_type', 'packageType', 'id', 'value', 'code'],
    name_keys: ['appPackageTypeName', 'packageTypeName', 'typeName', 'name', 'label', 'text'],
    value_format: 'string',
    required: true,
    tool_keywords: ['get_dict_zt_app_package_type', 'app_package_type', 'package_type', '应用类型字典', '应用类型列表'],
    description: '把用户说的应用类型匹配成报表可识别的 appPackageType。',
    missing_message: '当前缺少应用类型匹配能力，无法确认应用类型范围。',
  },
  {
    id: 'account-dictionary',
    capability_type: 'account_dictionary',
    label: '账户',
    entity_type: 'account',
    identifier_key: 'account_id',
    alias_record: 'account_aliases',
    target_keys: ['accountId', 'accountIds', 'account_id'],
    slot_mappings: [{ entity_type: 'account', identifier_key: 'account_id', target_keys: ['accountId', 'accountIds', 'account_id'], summary_key: 'accountId', required: true }],
    summary_key: 'accountId',
    source_key: 'accountId',
    step_key: 'account_dictionary',
    id_keys: ['accountId', 'account_id', 'id', 'value', 'code'],
    name_keys: ['accountName', 'account_name', 'name', 'label', 'text'],
    required: true,
    tool_keywords: ['get_dict_zt_account', 'account_dictionary', 'account', '账户字典', '账户列表'],
    description: '把用户说的投放账户匹配成报表可识别的 accountId。',
    missing_message: '当前缺少账户匹配能力，无法确认本次要查询的投放账户。',
  },
  {
    id: 'package-dictionary',
    capability_type: 'package_dictionary',
    label: '包体',
    entity_type: 'package',
    identifier_key: 'app_package_id',
    alias_record: 'package_aliases',
    target_keys: ['pkgId', 'pkgIds', 'packageId', 'package_id'],
    slot_mappings: [{ entity_type: 'package', identifier_key: 'app_package_id', target_keys: ['pkgId', 'pkgIds', 'packageId', 'package_id'], summary_key: 'pkgId', required: true }],
    summary_key: 'pkgId',
    source_key: 'pkgId',
    step_key: 'package_dictionary',
    id_keys: ['pkgId', 'pkg_id', 'packageId', 'package_id', 'id', 'value', 'code'],
    name_keys: ['pkgName', 'pkg_name', 'packageName', 'package_name', 'name', 'label', 'text'],
    required: true,
    tool_keywords: ['get_dict_zt_rpt_package', 'package_dictionary', 'pkg', 'package', '包体字典', '包体列表'],
    description: '把用户说的包体或包名匹配成报表可识别的 pkgId。',
    missing_message: '当前缺少包体匹配能力，无法确认本次要查询的包体范围。',
  },
  {
    id: 'optimizer-dictionary',
    capability_type: 'optimizer_dictionary',
    label: '优化师',
    entity_type: 'account',
    identifier_key: 'account_id',
    alias_record: 'optimizer_aliases',
    target_keys: ['optimizerIds', 'optimizerId', 'optimizer_id', 'userId'],
    slot_mappings: [{ entity_type: 'account', identifier_key: 'account_id', target_keys: ['optimizerIds', 'optimizerId', 'optimizer_id', 'userId'], summary_key: 'optimizerIds', required: true }],
    summary_key: 'optimizerIds',
    source_key: 'optimizerIds',
    step_key: 'optimizer_dictionary',
    id_keys: ['optimizerId', 'optimizer_id', 'userId', 'user_id', 'id', 'value', 'code'],
    name_keys: ['optimizerName', 'optimizer_name', 'userName', 'user_name', 'name', 'label', 'text'],
    required: true,
    tool_keywords: ['get_dict_zt_optimizer', 'optimizer_dictionary', 'optimizer', '优化师字典', '优化师列表'],
    description: '把用户说的优化师匹配成报表可识别的 optimizerIds。',
    missing_message: '当前缺少优化师匹配能力，无法确认本次要查询的优化师范围。',
  },
  {
    id: 'project-lookup',
    capability_type: 'project_lookup',
    required: false,
    tool_keywords: ['list_all_apps', 'android_app_list_v2', 'app_list', '应用列表', '项目列表'],
    description: '按项目名或应用名补齐查询范围。',
    missing_message: '当前没有可用的项目匹配能力，只能使用当前会话已选项目。',
  },
  {
    id: 'knowledge-fallback',
    capability_type: 'knowledge_fallback',
    required: false,
    tool_keywords: ['knowledge.search', 'search_knowledge', 'knowledge_search', '知识库'],
    description: '当数据工具缺失或不可用时，解释缺口、口径和下一步处理方式。',
    missing_message: '知识库暂未配置，无法进一步检索能力缺口说明。',
  },
];

export function buildAdvertisingReportPromptAppendix(): string {
  return [
    '报表工具参数附录：',
    '- 报表问数时，优先依据工具描述和 input_schema 决定可用参数，不要把维度名误当成必须补的单个实体 ID。',
    '- 日报、广告报表、素材报表、小时报表都属于报表链路，遇到“不同团队 / 各媒体 / 各应用类型 / 各终端 / 各素材”时，优先按维度分组，而不是默认追问 team_id、media_id 或 app_package_type 的单个候选。',
    '- 当工具 schema 已经声明参数时，优先沿用工具参数名与默认值：timeType、baseTimeType、media_id、app_package_type、promotion_source、metric_definition_type、viewCriteria、dh、dataType。',
    '- 如果工具描述或参数定义里已经给出可直接推断的值，就直接写入提示词上下文，不要再让模型二次猜测。',
    '- 只有在用户明确指定要选某一个团队、媒体、应用类型、终端或素材实体时，才补具体实体归一参数。',
    '',
    '常见参数语义：',
    '- timeType: 报表时间粒度，日报通常为 DAY，小时报表通常为 HOURLY。',
    '- baseTimeType: 小时报表的基础时间类型，通常由工具 schema 决定，常见为 EVENT_TIME。',
    '- media_id: 媒体平台标识，来自媒体字典或媒体筛选能力。',
    '- app_package_type: 应用类型，常见值如 ANDROID，来自应用类型字典或工具枚举。',
    '- promotion_source: 投放来源内部语义，常见为 AD 或 ORGANIC，按工具 adapter 或默认值推断。',
    '- metric_definition_type: 指标口径类型，若工具支持 COMMON、RESERVE_COMPOSITE 等枚举，则应按工具定义选择。',
    '- viewCriteria: 视图/展示维度约束，优先由工具 schema、描述和默认维度共同决定。',
    '- dh: 日/小时相关的时间标识或分组字段，若工具 schema 中存在此类字段，直接以 schema 为准。',
  ].join('\n');
}

export const ADVERTISING_REPORT_SEMANTIC_DEFAULTS: ReportQuerySemanticDefaults = {
  promotion_source: 'AD',
  roi_data_type: 'total',
  day_time_type: 'DAY',
  week_time_type: 'NATURAL_WEEK',
  month_time_type: 'NATURAL_MONTH',
  hour_time_type: 'HOURLY',
  base_time_type: 'EVENT_TIME',
  media_aliases: {
    巨量: ['巨量', '巨量引擎', '巨量广告', '抖音', '今日头条', '穿山甲', 'oceanengine'],
    腾讯: ['腾讯', '腾讯广告', '广点通', 'gdt', 'tencent'],
    快手: ['快手', '快手广告', 'kuaishou'],
  },
  terminal_aliases: {
    terminal: ['终端', 'terminal'],
    android: ['安卓', 'Android', 'android'],
    ios: ['iOS', 'ios', '苹果'],
  },
  team_aliases: {
    team: ['团队', 'team'],
  },
  app_package_type_aliases: {
    app_package_type: ['应用类型'],
  },
  account_aliases: {
    account: ['账户', '账号', 'account'],
  },
  package_aliases: {},
  optimizer_aliases: {
    optimizer: ['优化师', 'optimizer'],
  },
};

export function buildAdvertisingEntityResolutionSeed(packs?: DomainPackConfig[] | null): Array<Partial<EntityResolutionConfigEntry>> {
  return isDomainPackEnabled(packs) ? ADVERTISING_ENTITY_RESOLUTION_ENTRIES : [];
}

export function buildAdvertisingIntentRouteSeed(packs?: DomainPackConfig[] | null): IntentRouteRule[] {
  return isDomainPackEnabled(packs) ? ADVERTISING_INTENT_ROUTE_RULES : [];
}

export function buildAdvertisingReportPolicySeed(packs?: DomainPackConfig[] | null): {
  tool_selection_rules: ReportQueryToolSelectionRule[];
  schema_adapters: ReportQuerySchemaAdapter[];
  capabilities: ReportQueryCapabilityConfig[];
  semantic_defaults: ReportQuerySemanticDefaults;
} {
  return {
    tool_selection_rules: isDomainPackEnabled(packs) ? ADVERTISING_REPORT_TOOL_SELECTION_RULES : [],
    schema_adapters: isDomainPackEnabled(packs) ? ADVERTISING_REPORT_SCHEMA_ADAPTERS : [],
    capabilities: isDomainPackEnabled(packs) ? ADVERTISING_REPORT_CAPABILITIES : [],
    semantic_defaults: isDomainPackEnabled(packs)
      ? ADVERTISING_REPORT_SEMANTIC_DEFAULTS
      : {
        promotion_source: '',
        roi_data_type: 'total',
        day_time_type: 'DAY',
        week_time_type: 'NATURAL_WEEK',
        month_time_type: 'NATURAL_MONTH',
        hour_time_type: 'HOURLY',
        base_time_type: 'EVENT_TIME',
        media_aliases: {},
        terminal_aliases: {},
        team_aliases: {},
        app_package_type_aliases: {},
        account_aliases: {},
        package_aliases: {},
        optimizer_aliases: {},
      },
  };
}
