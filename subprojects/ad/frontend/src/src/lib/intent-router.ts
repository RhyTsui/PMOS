import type { AgentType, BusinessContextSnapshot, IntentType, MissingField, RoleProfile, SlotState, UserPreferenceProfile } from '@/types';
import { evaluateIntentRouteRules, matchesDebuggingRoute, matchesReportQueryRoute, normalizeIntentRouteRulesConfig, type IntentRouteRulesConfig } from './intent-route-rules';
import { missingSlotsToFields } from './slot-resolver';
import { hasAdvertisingDomainSignal } from './advertising-domain-pack';

export interface IntentRoutingContext {
  roleProfile?: RoleProfile | null;
  preferenceProfile?: UserPreferenceProfile | null;
  routeRules?: Partial<IntentRouteRulesConfig> | null;
  businessContext?: BusinessContextSnapshot | null;
  slotState?: SlotState | null;
}

export type RouteWorkflowLevel = 'light' | 'heavy';

export interface IntentRouteDecision {
  intent_type: IntentType;
  agent: AgentType;
  is_business_related: boolean;
  workflow_level: RouteWorkflowLevel;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  required_slots: string[];
  missing_fields: MissingField[];
  clarification_needed: boolean;
  suggested_actions: string[];
  tracking_target?: string;
  route_policy_id?: string;
  route_policy_version?: number;
  route_decision_scope?: string;
  route_execution_authority?: string;
  route_candidate_only?: boolean;
  candidate_source?: string;
  decision_scope?: string;
  deprecation_target?: string;
  arbitrated_route?: {
    status: 'pending_arbitration' | 'clarify_required' | 'not_applicable';
    selected_intent_type?: IntentType;
    selected_agent?: AgentType;
    capability_id?: string | null;
    arbitration_rule_id?: string;
    reason: string;
  };
  execution_decision?: 'candidate_only' | 'needs_arbitration' | 'needs_clarification' | 'no_executable_capability';
  fallback_reason?: string;}

const TRACKING_TARGETS: Record<Exclude<IntentType, 'general'>, string | undefined> = {
  help: undefined,
  report_query: '报表查询记录',
  demand: '需求表单录入',
  diagnosis: '排查记录',
  debugging: '联调记录',
  get_delivery_packages: '投放包交付',
  monitor: '监控任务告警',
  forecast: '预测记录',
};

const AGENT_MAP: Record<IntentType, AgentType> = {
  help: 'help',
  report_query: 'report',
  demand: 'demand',
  diagnosis: 'diagnosis',
  debugging: 'debugging',
  get_delivery_packages: 'delivery',
  monitor: 'monitoring',
  forecast: 'prediction',
  general: 'hub',
};

function hit(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function isCapabilitySupportQuestion(text: string): boolean {
  return /(支不支持|是否支持|能不能|可不可以|支持哪些|支持吗|可以监测|能监测|support)/i.test(text);
}

function isDeliverableWritingRequest(text: string): boolean {
  const normalized = text.replace(/\s+/g, '');
  const hasWritingAction = /(帮我写|帮忙写|写一个|写份|整理|输出|起稿|草拟|生成|产出|撰写|draft|write)/i.test(normalized);
  const hasDeliverable = /(需求|方案|草稿|PRD|prd|文档|说明文档|配置方案文档|排查需求|需求草稿?)/i.test(normalized);
  return hasWritingAction && hasDeliverable;
}

function isConfigurationHelpQuestion(text: string): boolean {
  return /(需要哪些配置|要哪些配置|怎么配置|如何配置|配置说明|配置项是什么|配置项有哪些|接入条件|支持条件|要准备什么|需要准备什么|准备哪些|需要哪些材料?|怎么用|如何使用|使用方法|API\s*(怎么用|如何用|用法)|接口\s*(怎么用|如何用|用法))/i.test(text);
}

function isConfigurationOperationQuestion(text: string): boolean {
  return /(检查.*配置.*(问题|是否|有没有)|配置.*(是否有问题或有没有问题)|执行.*配置|修改.*配置|发起.*配置检查|配置检查)/i.test(text);
}

function isFieldExplanationQuestion(text: string): boolean {
  return /(字段|口径|指标|规则|说明|解释|什么意思|怎么理解).*(?:是什么|什么意思|怎么理解|怎么计算|怎么定义|含义|口径)|(?:是什么|什么意思|怎么理解).*(?:字段|口径|指标|规则)/i.test(text);
}

function hasStrongReportIntent(text: string): boolean {
  const normalized = text.replace(/\s+/g, '');
  const hasMetric = hasAdvertisingDomainSignal(normalized, ['metric']);
  const hasQueryAction = /(查数|查询|看下|看看|查看|统计|取数|明细|报表|日报|周报|月报|小时报|生成|导出|订阅|拼表|拉取|下载|分析)/i.test(normalized);
  const hasTrendOrCompare = /(趋势|走势|对比|比较|排名|环比|同比|变化)/i.test(normalized);
  const hasBusinessObject = hasAdvertisingDomainSignal(normalized, ['businessObject', 'media']);
  const hasValueQuestion = /(多少|几|是多少|值是多少|有多少)/i.test(normalized);
  const hasTime = /(今天|今日|昨天|昨日|上周|本周|本月|近\d{1,3}天|最近\d{1,3}天|过去\d{1,3}天|日期|时间|小时|\d{4}-\d{1,2}-\d{1,2}|\d{8}|day|daily|hour|hourly)/i.test(normalized);
  const hasFileWorkflow = /(上传.*(excel|表|模板)|excel.*(模板|表?)|按模板|模板取数|拼表)/i.test(normalized);
  return Boolean(
    hasFileWorkflow
    || (hasQueryAction && (hasMetric || hasTime || hasBusinessObject))
    || (hasTrendOrCompare && (hasMetric || hasBusinessObject || hasTime))
    || (hasValueQuestion && hasMetric && (hasTime || hasBusinessObject))
    || (hasTime && hasMetric && hasBusinessObject)
  );
}

function buildDiagnosisMissingFields(text: string): MissingField[] {
  const isCostMetric = hasAny(text, [/消耗|花费|成本|cost|spend/i]);
  const checks: Array<{ field: MissingField; present: boolean }> = [
    {
      present: hasAny(text, [/巨量|穿山甲|抖音|快手|广点通|腾讯|小米|UC|头条|网易|媒体|媒体ID|media[_\s-]?id|媒体编号/i]),
      field: {
        field_key: 'media',
        field_label: '媒体平台',
        field_group: '排查对象',
        priority: 'required',
        why_required: '需要先确定对比的是哪个媒体平台，才能匹配对应回传口径和归因规则。',
        suggested_question: '请补充涉及的媒体平台，例如巨量、快手、广点通。',
        source: 'intent_router',
      },
    },
    {
      present: isCostMetric || hasAny(text, [/应用|app|包名|游戏|产品|项目|APPID|app_id|appid|bundle/i]),
      field: {
        field_key: 'app',
        field_label: '应用或包名',
        field_group: '排查对象',
        priority: 'required',
        why_required: '同一媒体下不同应用的回传配置、事件映射和归因窗口可能不同。',
        suggested_question: '请补充应用名称、app_id 或包名。',
        source: 'intent_router',
      },
    },
    {
      present: hasAny(text, [/今天|昨日|昨天|近|过去|本周|上周|日期|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}月\d{1,2}日|小时|分钟/]),
      field: {
        field_key: 'time_range',
        field_label: '异常时间',
        field_group: '排查范围',
        priority: 'required',
        why_required: '排查需要固定时间范围，否则无法对齐 BI、媒体后台和回传日志。',
        suggested_question: '请补充异常开始时间和需要排查的时间范围。',
        source: 'intent_router',
      },
    },
    {
      present: hasAny(text, [/媒体后台|媒体原始|原始账单|智投报表|智投平台|BI|报表聚合|聚合数据|数据源|对比源?/i]),
      field: {
        field_key: 'compare_source',
        field_label: '对比数据源',
        field_group: '排查口径',
        priority: 'required',
        why_required: '需要确认用户用于对比预期值的数据源，是媒体后台原始数据、智投报表还是 BI，否则无法判断采集、调度或权限链路。',
        suggested_question: '请说明预期值来自哪里：媒体后台原始账单、智投平台报表，还是 BI/其他报表？',
        source: 'intent_router',
      },
    },
    {
      present: hasAny(text, [/激活|注册|付费|消耗|点击|展示|转化|ROI|ROAS|回传率|指标|BI/i]),
      field: {
        field_key: 'metric',
        field_label: '异常指标',
        field_group: '排查口径',
        priority: 'required',
        why_required: '需要明确异常指标，才能判断是统计口径、归因窗口还是链路失败。',
        suggested_question: '请说明哪个指标异常，例如激活、注册、付费、消耗或回传率。',
        source: 'intent_router',
      },
    },
    {
      present: isCostMetric || hasAny(text, [/日志|trace|request|失败样例|截图|报错|error|code|样例|明细/i]),
      field: {
        field_key: 'sample',
        field_label: '失败样例',
        field_group: '证据材料',
        priority: 'recommended',
        why_required: '失败样例能帮助快速定位是参数、签名、权限、延迟还是去重问题。',
        suggested_question: '如果有失败日志、trace_id、截图或一条回传明细，请一起发给我。',
        source: 'intent_router',
      },
    },
  ];

  let missing = checks.filter((item) => !item.present).map((item) => item.field);
  if (/巨量|穿山甲|抖音|快手|广点通|腾讯|小米|UC|头条|网易|媒体ID|媒体平台/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'media');
  }
  if (/今天|昨日|昨天|本周|上周|日期|时间|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}月\d{1,2}日?/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'time_range');
  }
  if (/激活|注册|付费|消耗|点击|展示|转化|ROI|ROAS|BI|指标/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'metric');
  }
  if (/媒体后台|媒体原始|原始账单|智投报表|智投平台|BI|报表|对比数据源?/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'compare_source');
  }
  if (/APPID|app_id|appid|应用|包名|游戏|项目|产品/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'app');
  }
  return missing;
}

function buildReadableDiagnosisMissingFields(text: string): MissingField[] {
  const hasMedia = /巨量|穿山甲|抖音|快手|广点通|腾讯|小米|UC|头条|网易|TikTok|Google|Meta|Applovin|媒体ID|媒体平台|media[_\s-]?id|\b10007\b/i.test(text);
  const hasApp = /APPID|app_id|appid|应用|包名|游戏|项目|产品|bundle|\b10100011\b/i.test(text);
  const hasTime = /今天|今日|昨日|昨天|前天|近\d+天|过去\d+天|本周|上周|日期|时间|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}月\d{1,2}日?/i.test(text);
  const hasMetric = /激活|注册|付费|消耗|花费|成本|点击|展示|转化|ROI|ROAS|回传率|指标|activation|register|payment|cost|spend/i.test(text);
  const hasCompareSource = /BI|媒体后台|媒体原始|媒体回传|巨量回传|智投报表|智投平台|报表聚合|聚合数据|数据源|对比源?/i.test(text);
  const isCostMetric = /消耗|花费|成本|cost|spend/i.test(text);
  const hasMediaContext = /\b(?:media|media_id|mediaId)\s*=/i.test(text);
  const hasAppContext = /\b(?:app|app_id|appId|project|project_id|projectId)\s*=/i.test(text);
  const hasTimeContext = /\b(?:time_range|date_range|start_date|end_date)\s*=/i.test(text);
  const hasMetricContext = /\b(?:metric|metrics|metric_keys)\s*=/i.test(text);
  const hasCompareSourceContext = /\b(?:compare_source|report_source|data_source|tool_name|server_name)\s*=/i.test(text);

  const missing: MissingField[] = [];
  if (!hasMedia && !hasMediaContext) {
    missing.push({
      field_key: 'media',
      field_label: '媒体平台',
      field_group: '排查对象',
      priority: 'required',
      why_required: '需要先确定对比的是哪个媒体平台，才能选择对应报表和口径。',
      suggested_question: '请选择或输入媒体平台，例如巨量、快手、广点通。',
      source: 'intent_router',
    });
  }
  if (!hasApp && !hasAppContext && !isCostMetric) {
    missing.push({
      field_key: 'app',
      field_label: '应用或项目',
      field_group: '排查对象',
      priority: 'required',
      why_required: '激活、注册、付费等转化指标必须定位到具体应用或项目后才能查数。',
      suggested_question: '请补充 APPID、应用名称、项目名称或包名。',
      source: 'intent_router',
    });
  }
  if (!hasTime && !hasTimeContext) {
    missing.push({
      field_key: 'time_range',
      field_label: '排查日期',
      field_group: '排查范围',
      priority: 'required',
      why_required: '需要固定日期或时间范围，才能对齐 BI、媒体回传和报表调度。',
      suggested_question: '请选择或输入需要排查的日期或时间范围。',
      source: 'intent_router',
    });
  }
  if (!hasMetric && !hasMetricContext) {
    missing.push({
      field_key: 'metric',
      field_label: '异常指标',
      field_group: '排查口径',
      priority: 'required',
      why_required: '需要明确异常指标，才能选择消耗、激活、注册或付费对应的排查链路。',
      suggested_question: '请选择异常指标，例如激活、注册、付费或消耗。',
      source: 'intent_router',
    });
  }
  if (!hasCompareSource && !hasCompareSourceContext) {
    missing.push({
      field_key: 'compare_source',
      field_label: '对比数据源',
      field_group: '排查口径',
      priority: 'required',
      why_required: '需要确认用户拿来对比的是媒体后台、媒体回传、智投报表还是 BI。',
      suggested_question: '请选择对比数据源，例如媒体回传、媒体后台、智投报表或 BI。',
      source: 'intent_router',
    });
  }
  missing.push({
    field_key: 'sample',
    field_label: '样例或截图',
    field_group: '证据材料',
    priority: 'recommended',
    why_required: '样例、截图或明细能帮助确认差异发生在查数、口径还是链路环节。',
    suggested_question: '如有截图、明细或 trace_id，可以一起补充。',
    source: 'intent_router',
  });

  return missing;
}

export function intentToAgent(intent: IntentType): AgentType {
  return AGENT_MAP[intent] ?? 'hub';
}

export function isMediaOnboardingIntent(content: string) {
  return hit(content, [
    /新增.*媒体/,
    /新媒体?/,
    /媒体.*对接/,
    /对接.*媒体/,
    /接入.*媒体/,
    /监测链接/,
    /回传.*对接/,
    /对接文档/,
    /需求表单?/,
    /需求池/,
    /事件映射/,
  ]);
}

export function isLegacyMediaDebugIntent(content: string) {
  return hit(content, [
    /(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC|快手|广点通?).*(联调|测试|验证|共享)/,
    /(联调|测试|验证).*(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC|快手|广点通?)/,
    /wuyanlan@dobest\.com/i,
  ]);
}

export function isDeliveryPackagesIntent(content: string) {
  return hit(content, [
    /获取.*(?:广告包|投放包|可交付包|可投放包|包地址)/,
    /(?:广告包|投放包|可交付包|可投放包|包体检查|验收流程|包地址)/,
    /(?:分包|媒体包|渠道包|应用包?).*(?:交付|投放|检测|通过|可用|地址|列表)/,
    /(?:生成|创建).*(?:官方渠道分包|广告分包|媒体分包|渠道分包)/,
    /(?:包|分包).*(?:上报验收|审核状态|联调状态|回传状态?)/,
  ]);
}

function buildGovernedRouteRuleCandidate(text: string, routeRules?: Partial<IntentRouteRulesConfig> | null): IntentRouteDecision | null {
  const config = normalizeIntentRouteRulesConfig(routeRules || undefined);
  const [selected] = evaluateIntentRouteRules({ message: text, rules: config.rules });
  if (!selected) return null;
  return {
    intent_type: selected.rule.intent_type,
    agent: selected.rule.agent,
    is_business_related: selected.rule.intent_type !== 'general',
    workflow_level: selected.rule.workflow_level,
    confidence: selected.rule.confidence,
    reason: `命中治理配置候选规则：${selected.rule.reason_template}`,
    required_slots: [],
    missing_fields: [],
    clarification_needed: false,
    suggested_actions: ['进入能力仲裁', '确认证据需求', '继续补充上下文'],
    tracking_target: TRACKING_TARGETS[selected.rule.intent_type as Exclude<IntentType, 'general'>],
    route_policy_id: selected.policy_id,
    route_policy_version: selected.policy_version,
    route_decision_scope: selected.decision_scope,
    route_execution_authority: selected.execution_authority,
    route_candidate_only: true,
    candidate_source: 'governed_intent_route_rules',
    decision_scope: 'candidate_only',
    deprecation_target: 'Enterprise AI Chat OS Plan Arbitrator + Capability Discovery',
    execution_decision: 'needs_arbitration',
    fallback_reason: 'route_rule_candidate_requires_arbitration',
    arbitrated_route: {
      status: 'pending_arbitration',
      selected_intent_type: selected.rule.intent_type,
      selected_agent: selected.rule.agent,
      capability_id: null,
      arbitration_rule_id: selected.policy_id,
      reason: 'Route rule is a governed candidate; final execution requires arbitration.',
    },
  };
}
function routeUserIntentCore(content: string, routeRules?: Partial<IntentRouteRulesConfig> | null): IntentRouteDecision {
  const text = content.trim();
  const governedCandidate = buildGovernedRouteRuleCandidate(text, routeRules);
  if (governedCandidate) return governedCandidate;
  const lower = text.toLowerCase();

  if (isDeliverableWritingRequest(text)) {
    return {
      intent_type: 'demand',
      agent: 'demand',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'high',
      reason: '识别到需求、方案或文档撰写交付物，进入轻量需求撰写链路。',
      required_slots: [],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['生成草稿', '继续补充背景', '保存需求'],
      tracking_target: TRACKING_TARGETS.demand,
    };
  }

  if (isConfigurationHelpQuestion(text)) {
    return {
      intent_type: 'help',
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'high',
      reason: '识别到配置说明、接入条件或准备事项咨询，进入帮助链路。',
      required_slots: [],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['查看配置说明', '继续追问', '查看可用能力'],
    };
  }

  if (isConfigurationOperationQuestion(text)) {
    return {
      intent_type: 'debugging',
      agent: 'debugging',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到配置检查或配置执行诉求，进入系统操作链路。',
      required_slots: ['project'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['确认操作范围', '检查配置', '返回检查结果'],
      tracking_target: TRACKING_TARGETS.debugging,
    };
  }

  if (isCapabilitySupportQuestion(text)) {
    return {
      intent_type: 'help',
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'high',
      reason: '识别到能力支持范围咨询，进入帮助链路确认当前可支持内容。',
      required_slots: [],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['确认支持范围', '查看可用能力', '继续补充目标媒体或游戏类型'],
    };
  }

  if (isDeliveryPackagesIntent(text)) {
    return {
      intent_type: 'get_delivery_packages',
      agent: 'delivery',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到广告包、投放包或验证流程诉求，应进入投放包交付流程。',
      required_slots: ['project'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['查询可投放包', '检查阻塞项', '继续准备投放包'],
      tracking_target: TRACKING_TARGETS.get_delivery_packages,
    };
  }

  if (/(?:获取|查询|查看|检索|搜索|列出|拉取|读取|找出).*(?:应用列表|应用清单|应用信息|项目列表|包列表|分包|工具|能力)/.test(text)) {
    return {
      intent_type: 'help',
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'high',
      reason: '识别到业务对象查询诉求，先进入使用帮助并发现可用工具，不直接判定为联调。',
      required_slots: ['查询对象'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['确认查询对象', '查找可用工具', '返回查询结果'],
      tracking_target: undefined,
    };
  }

  if (isFieldExplanationQuestion(text)) {
    return {
      intent_type: 'help',
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'high',
      reason: '识别到字段、口径或指标解释诉求，优先进入帮助链路。',
      required_slots: [],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['查看解释', '继续补充上下文'],
      tracking_target: undefined,
    };
  }

  if (!isDeliverableWritingRequest(text) && !isConfigurationHelpQuestion(text) && /(排查|异常|失败|报错|为什么|原因|差异|少了|多了|不一致|缺口|下滑|下降|没数|问题)/i.test(text)) {
    return {
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到异常、原因或排查诉求，优先进入问题排查链路。',
      required_slots: ['project', 'media', 'time_range', 'metric'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['补充排查条件', '保存排查记录'],
      tracking_target: TRACKING_TARGETS.diagnosis,
    };
  }

  if (matchesReportQueryRoute(text, routeRules || undefined) || hasStrongReportIntent(text)) {
    return {
      intent_type: 'report_query',
      agent: 'report',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'high',
      reason: '识别到取数、报表指标或趋势对比诉求，优先进入自然语言问数链路。',
      required_slots: ['项目', '时间范围', '指标'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['查询报表数据', '展示趋势结果', '检查数据质量'],
      tracking_target: TRACKING_TARGETS.report_query,
    };
  }
  if (matchesDebuggingRoute(text, routeRules || undefined)) {
    return {
      intent_type: 'debugging',
      agent: 'debugging',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到联调、媒体或回传验证相关表达，进入自动联调处理路径。',
      required_slots: ['project', 'media', 'terminal'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['确认项目、媒体和终端后继续联调'],
      tracking_target: '联调记录',
    };
  }

  if (isMediaOnboardingIntent(text)) {
    return {
      intent_type: 'demand',
      agent: 'demand',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到媒体对接、监测链接、回传或需求表单关键词，应进入对接需求必经流程。',
      required_slots: ['媒体名称', '对接文档', '监测链接参数规则', '可回传事件', '验收方式'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['打开需求表单', '保存到待办', '补齐对接文档'],
      tracking_target: TRACKING_TARGETS.demand,
    };
  }

  if (isLegacyMediaDebugIntent(text) || matchesDebuggingRoute(text, routeRules || undefined)) {
    return {
      intent_type: 'debugging',
      agent: 'debugging',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到自动联调诉求，应检查项目、媒体、终端是否齐全；后台配置与巨量 MCP 负责账号、应用共享、事件资产和回传查看位置校验。',
      required_slots: ['项目', '媒体', '终端'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['缺少项目、媒体或终端时追问补齐', '信息齐全后自动发起联调', '打开联调记录'],
      tracking_target: TRACKING_TARGETS.debugging,
    };
  }

  if (hit(text, [/监控/, /告警/, /报警/, /提醒/, /阈值?/, /超过\s*\d+\s*分钟/, /回传延迟/, /延迟.*告警/, /callback.*delay/i, /postback.*delay/i])) {
    return {
      intent_type: 'monitor',
      agent: 'monitoring',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到监控、告警、阈值或回传延迟诉求，应进入监控任务创建流程；当监控触发异常后再自动进入排查流程。',
      required_slots: ['项目范围', '媒体平台', '监控指标', '告警阈值', '通知方式'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['确认监控条件', '创建监控任务', '触发异常后自动排查'],
      tracking_target: TRACKING_TARGETS.monitor,
    };
  }

  if (hit(lower, [/排查/, /异常/, /不一致?/, /差异/, /失败/, /报错/, /为什么?/, /gap/, /回传.*少/, /bi.*不一致?/, /quality_status=needs_review/, /quality_issues=/, /metric_risks=/, /anomaly_warnings=/])) {
    if (hit(text, [/(看看|看下|检查|巡检|有没有|是否有|有什么|哪些).*(投放|广告|项目).*(异常|问题|波动)/, /投放.*异常/, /广告.*异常/])) {
      return {
        intent_type: 'monitor',
        agent: 'monitoring',
        is_business_related: true,
        workflow_level: 'heavy',
        confidence: 'high',
        reason: '识别到泛投放异常巡检诉求，应先进入项目监控检查；只有巡检发现具体异常后再转入排查。',
        required_slots: ['项目范围', '时间范围'],
        missing_fields: [],
        clarification_needed: false,
        suggested_actions: ['执行项目全链路巡检', '汇总监控结果', '异常项自动转排查'],
        tracking_target: TRACKING_TARGETS.monitor,
      };
    }
    const missingFields = buildReadableDiagnosisMissingFields(text);
    return {
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到异常、差异、失败或排查诉求，应进入问题排查流程。',
      required_slots: ['媒体', '应用', '异常时间', '指标口径', '失败样例'],
      missing_fields: missingFields,
      clarification_needed: missingFields.some((item) => item.priority === 'required'),
      suggested_actions: missingFields.length > 0 ? ['补充排查条件', '保存排查记录'] : ['创建排查记录', '查看排查进展'],
      tracking_target: TRACKING_TARGETS.diagnosis,
    };
  }

  if (hit(lower, [/报表/, /日报/, /周报/, /拼接/, /定时任务/, /定时发送?/, /生成.*报告/])) {
    return {
      intent_type: 'help',
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      reason: '识别到报表或定时任务诉求，当前先进入通用助手并引导到报表任务。',
      required_slots: ['报表范围', '指标', '周期', '接收人'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['创建报表定时任务', '选择报表模板', '查看历史报表'],
      tracking_target: '报表定时任务',
    };
  }

  if (hit(lower, [/监控/, /告警/, /阈值?/, /波动/, /延迟/, /归因监控/, /回推/])) {
    return {
      intent_type: 'monitor',
      agent: 'monitoring',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      reason: '识别到监控、告警或阈值诉求，应进入监控任务处理。',
      required_slots: ['监控对象', '指标', '阈值', '通知方式'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['创建监控任务', '查看告警记录', '调整阈值'],
      tracking_target: TRACKING_TARGETS.monitor,
    };
  }

  const historicalTrafficTrend = hit(lower, [
    /(查看|查询|看下|历史|最近|近\s*\d+\s*天|今天|昨天).*(自然量|买量|安装数|苹果商店|app\s*store|趋势)/i,
    /(自然量|买量|安装数|苹果商店|app\s*store).*(查看|查询|看下|历史|最近|近\s*\d+\s*天|今天|昨天|趋势)/i,
  ]);

  if (historicalTrafficTrend) {
    return {
      intent_type: 'general',
      agent: 'hub',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      reason: '识别到历史流量数据查看诉求，应查询历史数据并分析已发生趋势，不进入预测测算。',
      required_slots: ['项目', '终端', '时间范围', '指标'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['查询历史趋势', '对齐买量和自然量', '查看数据来源'],
    };
  }

  if (hit(lower, [/预测/, /预估/, /roi/, /ltv/, /回本/, /测算/])) {
    return {
      intent_type: 'forecast',
      agent: 'prediction',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      reason: '识别到预测、ROI、LTV或回本测算诉求，应进入预测分析。',
      required_slots: ['预测对象', '时间范围', '指标', '假设条件'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['生成预测记录', '补充假设条件', '查看历史预测'],
      tracking_target: TRACKING_TARGETS.forecast,
    };
  }

  if (hit(lower, [/怎么/, /如何/, /是什么/, /在哪里?/, /说明/, /解释/, /口径/, /指标/, /规则/, /路径/, /支不支持/, /是否支持/, /能不能?/, /可不可以/, /支持哪些/, /支持吗/])) {
    return {
      intent_type: 'help',
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      reason: '识别到知识解答、指标解释或路径说明诉求。',
      required_slots: [],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['给出解答', '展示来源', '继续追问'],
    };
  }

  return {
    intent_type: 'general',
    agent: 'hub',
    is_business_related: false,
    workflow_level: 'light',
    confidence: 'low',
    reason: '未命中明确业务流程，保持普通对话。',
    required_slots: [],
    missing_fields: [],
    clarification_needed: false,
    suggested_actions: ['继续对话'],
  };
}

function isReportFollowupIntent(content: string): boolean {
  const normalized = content.replace(/\s+/g, '');
  return /(再查|再看|继续|接着|补充|跟进|上次|刚刚|这个|该报表|该结果|再生成|再次|再来|再说|重新查|重新生成|导出|下载|趋势|对比)/i.test(normalized);
}

function applyContextBias(
  content: string,
  decision: IntentRouteDecision,
  context?: IntentRoutingContext,
): IntentRouteDecision {
  if (!context) return decision;
  const roleProfile = context.roleProfile || null;
  const preferenceProfile = context.preferenceProfile || null;
  const businessContext = context.businessContext || null;
  const slotState = context.slotState || null;

  const next: IntentRouteDecision = {
    ...decision,
    suggested_actions: [...decision.suggested_actions],
    missing_fields: [...decision.missing_fields],
  };

  const hasBusinessContext = Boolean(
    businessContext?.latestResult
    || businessContext?.qualityCheck
    || businessContext?.timeRange
    || businessContext?.metrics
    || businessContext?.app
    || businessContext?.project,
  );
  const hasQualityIssue = businessContext?.qualityCheck?.status === 'needs_review'
    || Boolean(businessContext?.qualityCheck?.issues?.length);
  const wantsRefetch = /(换成|改成|再查|重新查|查一下|看一下|趋势|对比|近\s*\d+\s*天|昨天|今天|上周|本周|维度|导出)/i.test(content);
  const wantsDiagnosis = /(质量|问题|排查|异常|为什么|原因|差异|少了|多了|不一致|缺口)/i.test(content);
  const reportFollowupIntent = isReportFollowupIntent(content);

  if ((next.intent_type === 'general' || next.confidence !== 'high' || reportFollowupIntent) && hasBusinessContext) {
    if (hasQualityIssue && wantsDiagnosis && !wantsRefetch) {
      next.intent_type = 'diagnosis';
      next.agent = 'diagnosis';
      next.is_business_related = true;
      next.workflow_level = 'heavy';
      next.confidence = 'high';
      next.reason = '基于会话内上一轮数据检查结果，当前追问承接为数据排查。';
      next.required_slots = ['媒体', '应用', '异常时间', '指标口径', '对比数据源'];
      next.suggested_actions = ['创建排查记录', '继续定位问题'];
      next.tracking_target = TRACKING_TARGETS.diagnosis;
    } else if (reportFollowupIntent && (businessContext?.latestResult?.resultType === 'report_query' || businessContext?.reportSource || wantsRefetch)) {
      next.intent_type = 'report_query';
      next.agent = 'report';
      next.is_business_related = true;
      next.workflow_level = 'light';
      next.confidence = 'high';
      next.reason = '基于会话内上一轮问数结果，当前追问承接为继续问数。';
      next.required_slots = ['项目', '时间范围', '指标'];
      next.suggested_actions = ['查询报表数据', '展示趋势结果'];
      next.tracking_target = TRACKING_TARGETS.report_query;
    }
  }

  if (slotState?.intentType === next.intent_type) {
    const missingFields = missingSlotsToFields(slotState.missingSlots);
    next.missing_fields = missingFields;
    next.clarification_needed = missingFields.some((item) => item.priority === 'required');
  }

  if (!roleProfile && !preferenceProfile) return next;
  const preferredAgent = roleProfile?.defaultAgent || next.agent;

  if (next.confidence !== 'high' || next.intent_type === 'general') {
    next.agent = preferredAgent;
  }

  if (roleProfile?.shortcutEntries?.length && next.intent_type === 'general') {
    const shortcutActions = roleProfile.shortcutEntries
      .filter((item) => item.enabled)
      .slice(0, 2)
      .map((item) => item.title);
    next.suggested_actions = [...new Set([...shortcutActions, ...next.suggested_actions])];
  }

  if (preferenceProfile?.inferredPreferences?.riskBias?.some((item) => /保守|风险/.test(item)) && next.confidence === 'low') {
    next.suggested_actions = [...new Set(['先确认项目和范围', ...next.suggested_actions])];
  }

  return next;
}

export function routeUserIntent(content: string, context?: IntentRoutingContext): IntentRouteDecision {
  const decision = applyContextBias(content, routeUserIntentCore(content, context?.routeRules), context);
  const legacyConfidence = decision.confidence === 'high' && !context?.businessContext
    ? 'medium'
    : decision.confidence;
  const isNoHit = decision.intent_type === 'general' && !decision.is_business_related;
  const candidateSource = decision.candidate_source || 'legacy_intent_router';
  const reasonPrefix = candidateSource === 'governed_intent_route_rules' ? 'Governed route candidate' : 'Legacy adapter candidate';
  return {
    ...decision,
    confidence: legacyConfidence,
    reason: `${reasonPrefix}: ${decision.reason}`,
    required_slots: [],
    route_policy_id: decision.route_policy_id || `legacy-intent-router:${decision.intent_type}`,
    route_policy_version: decision.route_policy_version || 1,
    route_decision_scope: decision.route_decision_scope || 'candidate',
    route_execution_authority: decision.route_execution_authority || 'requires_arbitration',
    route_candidate_only: true,
    candidate_source: candidateSource,
    decision_scope: 'candidate_only',
    deprecation_target: decision.deprecation_target || 'Enterprise AI Chat OS Plan Arbitrator + Capability Discovery',
    execution_decision: decision.execution_decision || (isNoHit ? 'no_executable_capability' : decision.clarification_needed ? 'needs_clarification' : 'needs_arbitration'),
    fallback_reason: decision.fallback_reason || (isNoHit ? 'legacy_no_hit_candidate_only' : 'legacy_candidate_requires_arbitration'),
    arbitrated_route: decision.arbitrated_route || {
      status: isNoHit ? 'clarify_required' : 'pending_arbitration',
      selected_intent_type: isNoHit ? undefined : decision.intent_type,
      selected_agent: isNoHit ? undefined : decision.agent,
      capability_id: null,
      arbitration_rule_id: 'pending-plan-arbitrator',
      reason: isNoHit
        ? 'Legacy adapter did not find an executable capability; final answer must clarify or continue discovery.'
        : 'Legacy adapter only provides an intent candidate; final execution requires Plan Arbitrator and Capability Discovery.',
    },
  };
}
