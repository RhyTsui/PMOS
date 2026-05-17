import type { AgentType, IntentType, MissingField } from '@/types';

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
}

const TRACKING_TARGETS: Record<Exclude<IntentType, 'general'>, string | undefined> = {
  help: undefined,
  demand: '需求表单录入',
  diagnosis: '排查记录',
  debugging: '联调记录',
  monitor: '监控任务告警',
  'material-analysis': undefined,
  forecast: '预测记录',
};

const AGENT_MAP: Record<IntentType, AgentType> = {
  help: 'help',
  demand: 'demand',
  diagnosis: 'diagnosis',
  debugging: 'debugging',
  monitor: 'monitoring',
  'material-analysis': 'material',
  forecast: 'prediction',
  general: 'hub',
};

function hit(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
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
      present: hasAny(text, [/媒体后台|媒体原始|原始账单|智投报表|智投平台|BI|报表聚合|聚合数据|数据源|对比源/i]),
      field: {
        field_key: 'compare_source',
        field_label: '对比数据源',
        field_group: '排查口径',
        priority: 'required',
        why_required: '需要确认用户拿预期值对比的是媒体后台原始数据、智投报表还是 BI，否则不能判断采集、调度或权限链路。',
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
        suggested_question: '如果有失败日志、trace_id、截图或一条回传明细，请一起发我。',
        source: 'intent_router',
      },
    },
  ];

  let missing = checks.filter((item) => !item.present).map((item) => item.field);
  if (/巨量|穿山甲|抖音|快手|广点通|腾讯|小米|UC|头条|网易|媒体ID|媒体平台/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'media');
  }
  if (/今天|昨日|昨天|本周|上周|日期|时间|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}月\d{1,2}日/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'time_range');
  }
  if (/激活|注册|付费|消耗|点击|展示|转化|ROI|ROAS|BI|指标/i.test(text)) {
    missing = missing.filter((field) => field.field_key !== 'metric');
  }
  if (/媒体后台|媒体原始|原始账单|智投报表|智投平台|BI|报表|对比数据源/i.test(text)) {
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
  const hasTime = /今天|今日|昨日|昨天|前天|近\d+天|过去\d+天|本周|上周|日期|时间|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}月\d{1,2}日/i.test(text);
  const hasMetric = /激活|注册|付费|消耗|花费|成本|点击|展示|转化|ROI|ROAS|回传率|指标|activation|register|payment|cost|spend/i.test(text);
  const hasCompareSource = /BI|媒体后台|媒体原始|媒体回传|巨量回传|智投报表|智投平台|报表聚合|聚合数据|数据源|对比源/i.test(text);
  const isCostMetric = /消耗|花费|成本|cost|spend/i.test(text);

  const missing: MissingField[] = [];
  if (!hasMedia) {
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
  if (!hasApp && !isCostMetric) {
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
  if (!hasTime) {
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
  if (!hasMetric) {
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
  if (!hasCompareSource) {
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
    /新媒体/,
    /媒体.*对接/,
    /对接.*媒体/,
    /接入.*媒体/,
    /监测链接/,
    /回传.*对接/,
    /对接文档/,
    /需求表单/,
    /需求池/,
    /事件映射/,
  ]);
}

export function isLegacyMediaDebugIntent(content: string) {
  return hit(content, [
    /(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC|快手|广点通).*(联调|测试|验证|共享)/,
    /(联调|测试|验证).*(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC|快手|广点通)/,
    /wuyanlan@dobest\.com/i,
  ]);
}

export function routeUserIntent(content: string): IntentRouteDecision {
  const text = content.trim();
  const lower = text.toLowerCase();

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

  if (isLegacyMediaDebugIntent(text) || hit(lower, [/自动联调/, /立即联调/, /开始联调/, /扫码联调/, /联调地址/, /联调文档/])) {
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

  if (hit(text, [/监控/, /告警/, /报警/, /提醒/, /阈值/, /超过\s*\d+\s*分钟/, /回传延迟/, /延迟.*告警/, /callback.*delay/i, /postback.*delay/i])) {
    return {
      intent_type: 'monitor',
      agent: 'monitoring',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'high',
      reason: '识别到监控、告警、阈值或回传延迟诉求，应进入监控任务创建流程；监控触发异常后再自动进入排查流程。',
      required_slots: ['项目范围', '媒体平台', '监控指标', '告警阈值', '通知方式'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['确认监控条件', '创建监控任务', '触发异常后自动排查'],
      tracking_target: TRACKING_TARGETS.monitor,
    };
  }

  if (hit(lower, [/排查/, /异常/, /不一致/, /差异/, /失败/, /报错/, /为什么/, /gap/, /回传.*少/, /bi.*不一致/])) {
    if (hit(text, [/(看看|看下|检查|巡检|有没有|是否有|有什么|哪些).*(投放|广告|项目).*(异常|问题|波动)/, /投放.*异常/, /广告.*异常/])) {
      return {
        intent_type: 'monitor',
        agent: 'monitoring',
        is_business_related: true,
        workflow_level: 'heavy',
        confidence: 'high',
        reason: '识别到宽泛投放异常巡检诉求，应先进入项目监控检查；只有巡检发现具体异常后再转入排查。',
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

  if (hit(lower, [/报表/, /日报/, /周报/, /拼接/, /定时任务/, /定时发送/, /生成.*报告/])) {
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

  if (hit(lower, [/监控/, /告警/, /阈值/, /波动/, /延迟/, /归因监控/, /回推/])) {
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

  if (hit(lower, [/预测/, /预估/, /roi/, /ltv/, /回本/, /测算/, /趋势/])) {
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

  if (hit(lower, [/素材/, /创意/, /图片分析/, /视频分析/, /落地页/, /封面/, /卖点/])) {
    return {
      intent_type: 'material-analysis',
      agent: 'material',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      reason: '识别到素材、图片、视频或落地页分析诉求，应进入素材分析。',
      required_slots: ['素材文件或链接', '分析目标', '投放平台'],
      missing_fields: [],
      clarification_needed: false,
      suggested_actions: ['上传素材', '生成分析结论', '保存分析记录'],
    };
  }

  if (hit(lower, [/怎么/, /如何/, /是什么/, /在哪里/, /说明/, /解释/, /口径/, /指标/, /规则/, /路径/])) {
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
