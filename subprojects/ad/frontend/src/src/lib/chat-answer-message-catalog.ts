export type ChatAnswerMessageCode =
  | 'public_web.need_detected'
  | 'public_web.need_not_detected'
  | 'public_web.classification_fallback'
  | 'public_web.not_configured'
  | 'public_web.internal_data_blocked'
  | 'public_web.no_results'
  | 'public_web.query_failed'
  | 'public_web.success'
  | 'chat_boundary.report_query_blocked'
  | 'chat_boundary.unsupported_report_context'
  | 'chat_boundary.unsupported_service_intent'
  | 'chat_boundary.unsupported_route_intent'
  | 'chat_boundary.selected_skill'
  | 'chat_boundary.unsupported'
  | 'capability_gap.title'
  | 'capability_gap.empty_main_message'
  | 'capability_gap.default_main_message'
  | 'capability_gap.missing_media'
  | 'capability_gap.missing_project'
  | 'capability_gap.missing_metric'
  | 'capability_gap.missing_date_range'
  | 'capability_gap.missing_granularity'
  | 'capability_gap.missing_dimension'
  | 'capability_gap.missing_presentation'
  | 'capability_gap.missing_tool_capability'
  | 'capability_gap.missing_default'
  | 'capability_gap.checked_capabilities.empty_name'
  | 'capability_gap.checked_capabilities.empty_description'
  | 'capability_gap.checked_capabilities.covered_description'
  | 'capability_gap.checked_capabilities.missing_description'
  | 'capability_gap.semantic_summary_description'
  | 'capability_gap.action.resolve_entity'
  | 'capability_gap.action.select_candidate'
  | 'capability_gap.action.check_project_context'
  | 'capability_gap.action.check_permission'
  | 'capability_gap.action.configure_capability';

export interface ChatAnswerMessageContext {
  topic?: string;
  label?: string;
  labels?: string;
  source_count?: number | string;
  policy?: 'llm' | 'heuristic';
  confidence?: number;
}

interface CatalogEntry {
  message: string;
}

function isWeatherRealtimeTopic(context: ChatAnswerMessageContext): boolean {
  const topic = String(context.topic || '').trim();
  return /天气|气温|降雨|下雨|预报|温度|空气质量/.test(topic);
}

const catalog: Record<string, CatalogEntry> = {
  'chat_boundary.unsupported_report_context': {
    message: '当前问题可能包含数据查询、指标、配置类内容，请先给我你要看的具体范围。',
  },
  'chat_boundary.unsupported_service_intent': {
    message: '我还不能直接完成这类请求，请补充目标、范围或要使用的数据来源，我会按可用能力继续处理。',
  },
  'chat_boundary.unsupported_route_intent': {
    message: '我还不能直接给出可靠结论，请补充更多上下文或可验证来源后再继续。',
  },
  'chat_boundary.selected_skill': {
    message: '当前问题匹配到可执行技能，建议优先在结果里查看技能产出。',
  },
  'chat_boundary.unsupported': {
    message: '我还不能直接完成这次请求，请补充更具体的目标、范围或判断依据。',
  },
  'chat_boundary.report_query_blocked': {
    message: '当前问题偏向报表查询，建议先选择要分析的数据范围，我再帮你完成结果展示。',
  },
  'capability_gap.title': {
    message: '当前还不能直接完成这次查询。',
  },
  'capability_gap.empty_main_message': {
    message: '当前还不能直接完成这次查询。',
  },
  'capability_gap.default_main_message': {
    message: '我还没拿到{{label}}，先补充这项后我再继续。',
  },
  'capability_gap.missing_media': {
    message: '请先补充要查询的媒体平台，再继续。',
  },
  'capability_gap.missing_project': {
    message: '请先选择或确认项目范围后再继续。',
  },
  'capability_gap.missing_metric': {
    message: '请先补充要查看的指标，再继续。',
  },
  'capability_gap.missing_date_range': {
    message: '请先补充时间范围，再继续。',
  },
  'capability_gap.missing_granularity': {
    message: '暂不支持当前粒度，请切换为可用粒度后再继续。',
  },
  'capability_gap.missing_dimension': {
    message: '我还没拿到{{label}}，请补充对应条件后再继续。',
  },
  'capability_gap.missing_presentation': {
    message: '当前展示方式不兼容，请切换为可读性更高的结果视图。',
  },
  'capability_gap.missing_tool_capability': {
    message: '当前数据能力不足，请补充更多条件或切换查询范围后再尝试。',
  },
  'capability_gap.missing_default': {
    message: '我还未拿到{{label}}，请补充后再继续。',
  },
  'capability_gap.checked_capabilities.empty_name': {
    message: '可用数据能力',
  },
  'capability_gap.checked_capabilities.empty_description': {
    message: '未发现可用于本次查询的数据能力。',
  },
  'capability_gap.checked_capabilities.covered_description': {
    message: '数据查询条件已覆盖。',
  },
  'capability_gap.checked_capabilities.missing_description': {
    message: '仍缺少：{{labels}}',
  },
  'capability_gap.semantic_summary_description': {
    message: '已整理可见的能力缺口和下一步建议。',
  },
  'capability_gap.action.resolve_entity': {
    message: '补齐查询实体',
  },
  'capability_gap.action.select_candidate': {
    message: '切换查询候选',
  },
  'capability_gap.action.check_project_context': {
    message: '确认项目上下文',
  },
  'capability_gap.action.check_permission': {
    message: '提交权限说明',
  },
  'capability_gap.action.configure_capability': {
    message: '调整能力配置',
  },
  'public_web.need_detected': {
    message: '已检测到明显公共网页检索意图。',
  },
  'public_web.need_not_detected': {
    message: '当前问题未命中公共网页检索条件。',
  },
  'public_web.classification_fallback': {
    message: '公共网页意图识别异常，已回退为默认流程。',
  },
  'public_web.not_configured': {
    message: '当前没有取得可验证的公开来源结果，因此不能把它当作已确认结论。',
  },
  'public_web.internal_data_blocked': {
    message: '当前链路未经过外部检索控制，已降级处理。',
  },
  'public_web.no_results': {
    message: '我没有检索到足够可靠的公开来源，因此不能把它当作已证实结论。\n\n建议补充更具体的名称、入口路径、官方页面或上下文；如果你已经有官方链接，可以继续发给我，我会按可验证来源重新判断。',
  },
  'public_web.query_failed': {
    message: '公共网页检索失败，请稍后重试。',
  },
  'public_web.success': {
    message: '已为你拿到相关内容。',
  },
};

function replaceTemplateValue(text: string, key: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return text;
  return text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
}

export function resolveChatAnswerMessage(code: string, context: ChatAnswerMessageContext = {}): string {
  const raw = catalog[code] || {
    message: '消息模板不可识别，请稍后再试。',
  };
  if (code === 'public_web.not_configured' && isWeatherRealtimeTopic(context)) {
    return '天气是公开可查的信息，但这类问题需要可靠的实时天气来源。当前实时来源没有返回可验证结果，所以我不能编造南京下周日天气；在取得可靠来源前，不足以确认该城市和日期的天气。';
  }
  let message = raw.message;
  message = replaceTemplateValue(message, 'topic', context.topic);
  message = replaceTemplateValue(message, 'label', context.label);
  message = replaceTemplateValue(message, 'labels', context.labels);
  message = replaceTemplateValue(message, 'source_count', context.source_count);
  message = replaceTemplateValue(message, 'policy', context.policy);
  message = replaceTemplateValue(message, 'confidence', context.confidence);
  return message;
}

export function resolveChatBoundaryMessage(code: string, context: ChatAnswerMessageContext = {}): string {
  const normalizedCode = code.includes('.') ? code : `chat_boundary.${code}`;
  return resolveChatAnswerMessage(normalizedCode, context);
}

export function resolveCapabilityGapMessage(code: string, context: Record<string, unknown> = {}): string {
  const normalizedCode = code.includes('.') ? code : `capability_gap.${code}`;
  const nextContext = context as Record<string, unknown>;
  return resolveChatAnswerMessage(normalizedCode, {
    ...nextContext,
    topic: typeof nextContext.label === 'string' ? nextContext.label : undefined,
    label: typeof nextContext.label === 'string' ? nextContext.label : undefined,
    labels: typeof nextContext.labels === 'string' ? nextContext.labels : undefined,
  } as ChatAnswerMessageContext);
}

export function resolveBoundaryActionLabel(actionType: string): string {
  return resolveChatAnswerMessage(`capability_gap.action.${actionType}`, {
    topic: 'next_action',
  });
}
