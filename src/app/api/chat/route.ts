import { NextRequest } from 'next/server';
import { LLMClient } from 'coze-coding-dev-sdk';
import { cozeLoopTracer, SpanKind } from '@cozeloop/ai';
import {
  buildModelSdkConfig,
  getKnowledgeBaseApiKey,
  getKnowledgeBaseId,
  getKnowledgeBasesEndpoint,
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  hasConfiguredKnowledgeCredentials,
  hasConfiguredModelCredentials,
} from '@/lib/runtime-config';
import { buildChatTraceInput, truncate } from '@/lib/trace';
import { routeUserIntent } from '@/lib/intent-router';
import { listMcpServers } from '@/lib/mcp-server-store';
import { findMetricExplainerByQuestion } from '@/lib/metric-explainer-store';
import { buildTrackingLinkCardPayload, buildTrackingLinkRequestContext } from '@/lib/tracking-link-service';
import { attachProcessEventsToDonePayload, processEventsFromSsePayload } from '@/lib/agent-runtime';
import type { AgentProcessEvent, McpServerConfig, McpToolConfig } from '@/types';
import type { MetricExplainerUISchema } from '@/features/metric-explainer/schemas/metricExplainerSchema';

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: string; content: string }>;
  intent?: string;
}

interface KnowledgeSearchItem {
  content?: string;
  score?: number;
  knowledge_title?: string;
  knowledge_id?: string;
}

interface KnowledgeBaseItem {
  id?: string;
}

type IntentType = 'help' | 'demand' | 'diagnosis' | 'debugging' | 'monitor' | 'material-analysis' | 'forecast' | 'general';

interface ServiceStep {
  key: string;
  label: string;
  content: string;
  toolName: string;
  kind?: 'skill' | 'mcp' | 'knowledge' | 'web_search' | 'model';
  prompt?: string;
  providerUrl?: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

interface SourceRefPayload {
  title: string;
  source: string;
  url?: string;
  source_type: 'knowledge_base' | 'report_mcp' | 'mcp' | 'skill' | 'web_search';
  report_name?: string;
  icon?: string;
  prompt?: string;
}

function detectIntent(message: string): IntentType {
  const text = message.toLowerCase();
  if (['排查', '异常', '不一致', '失败', '告警', '对不上'].some(keyword => text.includes(keyword))) {
    return 'diagnosis';
  }
  if (['联调', '调试', '测试', '验证', '扫码'].some(keyword => text.includes(keyword))) {
    return 'debugging';
  }
  if (['回传', '接入', '配置', '映射', '埋点', '需求'].some(keyword => text.includes(keyword))) {
    return 'demand';
  }
  return 'help';
}

function buildFallbackAnswer(intent: IntentType, message: string): string {
  if (intent === 'diagnosis') {
    return `当前正式问答服务未接通，我先给你一版排查框架：
1. 确认异常开始时间、影响媒体和影响事件。
2. 对齐客户端上报、服务端接收和媒体侧回传三段日志。
3. 对比 BI、媒体后台和回传明细，定位差异链路。

当前问题：${message}`;
  }

  if (intent === 'demand') {
    return `当前正式问答服务未接通，我先按需求沟通方式帮你收口：
1. 明确目标媒体、包名、事件类型和验收口径。
2. 如果是回传接入，请补充地址、环境和负责人。
3. 如果是事件映射，请补充客户端事件名和媒体事件名。

当前需求：${message}`;
  }

  if (intent === 'debugging') {
    return `当前正式问答服务未接通，我先给你联调准备清单：
1. 确认测试设备、账号权限和白名单。
2. 确认目标媒体与待验证事件。
3. 确认联调结果查看方式，例如日志、回传明细或媒体后台。

当前联调目标：${message}`;
  }

  return `当前正式问答服务未接通，我先记录你的问题并给出可执行方向：
${message}

如果你补齐模型服务配置，我可以继续给出正式分析结果。`;
}

function buildStructuredResult(intent: IntentType, summary: string): Record<string, unknown> {
  const resultTypeMap: Record<IntentType, string> = {
    help: 'help_answer',
    demand: 'demand_form',
    diagnosis: 'diagnosis_report',
    debugging: 'debugging_report',
    monitor: 'monitor_snapshot',
    'material-analysis': 'material_report',
    forecast: 'forecast_report',
    general: 'help_answer',
  };

  return {
    task_id: `task-${Date.now()}`,
    result_type: resultTypeMap[intent],
    summary: summary.slice(0, 80),
    confidence: 'medium',
    structured_payload: {},
    next_actions: [],
    pending_checks: [],
    created_at: new Date().toISOString(),
    kind: intent,
  };
}

function pushChatSsePayload(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  payload: unknown,
  processEvents: AgentProcessEvent[],
  isClosed?: () => boolean,
) {
  if (isClosed?.()) return;
  const nextEvents = processEventsFromSsePayload(payload);
  processEvents.push(...nextEvents);
  if (payload && typeof payload === 'object' && (payload as { type?: unknown }).type === 'process_event') {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    return;
  }
  const payloadType = payload && typeof payload === 'object' ? String((payload as { type?: unknown }).type || '') : '';
  if (['thinking_step', 'tool_call', 'tool_result'].includes(payloadType)) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    return;
  }
  const payloadWithRuntime = attachProcessEventsToDonePayload(payload, processEvents);
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payloadWithRuntime)}\n\n`));
  for (const event of nextEvents) {
    if (isClosed?.()) return;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'process_event', event })}\n\n`));
  }
}

function createProcessEvent(input: Omit<AgentProcessEvent, 'id' | 'started_at' | 'visibility' | 'status'> & {
  id?: string;
  started_at?: string;
  status?: AgentProcessEvent['status'];
  visibility?: AgentProcessEvent['visibility'];
}): AgentProcessEvent {
  const now = new Date().toISOString();
  return {
    id: input.id || `${input.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    started_at: input.started_at || now,
    status: input.status || 'success',
    visibility: input.visibility || 'user',
    ...input,
  };
}

function buildCapabilityCheckedEvent(input: {
  label: string;
  summary: string;
  status?: AgentProcessEvent['status'];
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}): AgentProcessEvent {
  const now = new Date().toISOString();
  return createProcessEvent({
    type: 'capability.checked',
    label: input.label,
    summary: input.summary,
    status: input.status || 'success',
    started_at: now,
    completed_at: now,
    input: input.input,
    output: input.output,
  });
}

function createSourceAttachedEvent(source: SourceRefPayload, index: number): AgentProcessEvent {
  const now = new Date().toISOString();
  return createProcessEvent({
    type: 'source.attached',
    label: `挂载来源：${source.title}`,
    status: 'success',
    summary: source.report_name
      ? `来源取自${source.report_name}`
      : source.source
        ? `来源取自${source.source}`
        : '已挂载可追踪来源',
    started_at: now,
    completed_at: now,
    source_refs: [{
      id: `source-${index + 1}`,
      title: source.title,
      source: source.source,
      url: source.url,
      source_type: source.source_type,
      report_name: source.report_name,
      icon: source.icon,
      prompt: source.prompt,
    }],
    output: {
      source_type: source.source_type,
      report_name: source.report_name || '',
      source: source.source,
      url: source.url || '',
    },
  });
}

function pushSourceAttachedEvents(push: (payload: unknown) => void, sources: SourceRefPayload[]) {
  sources.forEach((source, index) => {
    push({
      type: 'process_event',
      event: createSourceAttachedEvent(source, index),
    });
  });
}

function isCostQuestion(message: string): boolean {
  return /(消耗|花费|cost|spend|现金消耗)/i.test(message);
}

function isActivationDiffQuestion(message: string): boolean {
  return /(激活|activation)/i.test(message)
    && /(不一致|差异|对不上|少|多|缺口|BI|媒体回传|媒体后台|回传)/i.test(message);
}

function getConversionDiffMetric(message: string): { key: string; label: string } | null {
  if (!/(不一致|差异|对不上|少|多|缺口|BI|媒体回传|媒体后台|回传)/i.test(message)) return null;
  if (/(付费|支付|payment|pay)/i.test(message)) return { key: 'payment', label: '付费数' };
  if (/(注册|register|registration)/i.test(message)) return { key: 'register', label: '注册数' };
  if (/(激活|activation)/i.test(message)) return { key: 'activation', label: '激活数' };
  return null;
}

function isMetricExplanationOnly(message: string): boolean {
  return /(解释|说明|口径|是什么|区别|定义|怎么算|统计)/i.test(message)
    && !/(排查|不一致|差异|对不上|异常|缺口|少|多)/i.test(message);
}

function metricSchemaToSourceRefs(schema: MetricExplainerUISchema): SourceRefPayload[] {
  return (schema.sources || []).map((source) => ({
    title: source.title,
    source: source.source || '',
    url: source.url,
    source_type: source.sourceType === 'knowledge' || source.sourceType === 'manual'
      ? 'knowledge_base'
      : source.sourceType || 'knowledge_base',
    report_name: source.sourceType === 'report_mcp' ? source.title : undefined,
    icon: source.sourceType || 'knowledge',
    prompt: source.detail,
  }));
}

function buildMetricExplainerAnswer(schema: MetricExplainerUISchema): string {
  if (schema.metric_id === 'activation_registration_payment') {
    return `## 结论
激活数、注册数和付费数对应用户漏斗里的三个阶段：进入应用、创建账号、完成支付。

## 口径要点
1. 激活数看设备或归因激活，重点是首次有效启动和广告归因。
2. 注册数看账号创建，注册设备数和注册账号数不能直接等同。
3. 付费数需要区分付费人数和付费次数，正式复盘应结合订单系统和智投统一报表。

## 下一步建议
1. 如果是解释口径，直接查看下方指标解释器。
2. 如果是排查差异，请继续补充项目、媒体、日期和具体报表。`;
  }

  return `## 结论
${schema.summary || `${schema.metric_name || '该指标'}已按指标解释器模板整理。`}

## 下一步建议
1. 查看下方指标解释器确认定义、公式、来源和差异。
2. 如果需要排查具体数值，请继续补充项目、媒体、日期和对比报表。`;
}

function getIntentDisplayName(intent: IntentType): string {
  const names: Record<IntentType, string> = {
    help: '使用帮助',
    demand: '需求跟踪',
    diagnosis: '数据排查',
    debugging: '自动联调',
    monitor: '监控任务',
    'material-analysis': '素材分析',
    forecast: '预测分析',
    general: '普通对话',
  };
  return names[intent] || intent;
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

function isKnowledgeRelevant(item: KnowledgeSearchItem, query: string): boolean {
  const haystack = normalizeForMatch(`${item.knowledge_title || ''} ${item.content || ''}`);
  const focusTerms = [
    '激活', '注册', '付费', '消耗', '花费', '成本', 'bi', '报表', '媒体回传', '媒体后台',
    '回传', '归因', '口径', '巨量', '穿山甲', '抖音', 'activation', 'register', 'payment',
    'cost', 'spend', 'roi', 'roas',
  ].filter(term => normalizeForMatch(query).includes(term));
  const focusHits = focusTerms.filter(term => haystack.includes(term)).length;
  if (focusTerms.length > 0 && focusHits < Math.min(2, focusTerms.length)) return false;
  if (typeof item.score === 'number' && item.score < 0.68) return false;
  if (typeof item.score === 'number' && item.score >= 0.72 && focusHits > 0) return true;
  const tokens = normalizeForMatch(query)
    .split(/[^a-z0-9\u4e00-\u9fa5]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !['今天', '今日', '帮我', '一下', '原因', '排查'].includes(token))
    .slice(0, 24);
  if (tokens.length === 0) return Boolean(item.content);
  const hitCount = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
  return hitCount >= Math.min(3, tokens.length);
}

function filterRelevantKnowledge(items: KnowledgeSearchItem[], query: string): {
  accepted: KnowledgeSearchItem[];
  rejected: KnowledgeSearchItem[];
} {
  const accepted: KnowledgeSearchItem[] = [];
  const rejected: KnowledgeSearchItem[] = [];
  for (const item of items) {
    if (isKnowledgeRelevant(item, query)) accepted.push(item);
    else rejected.push(item);
  }
  return { accepted, rejected };
}

function selectMcpTool(intent: IntentType, message: string, servers: McpServerConfig[]): {
  server: McpServerConfig;
  tool: McpToolConfig;
  reason: string;
} | null {
  const text = normalizeForMatch(`${intent} ${message}`);
  const candidates = servers
    .filter(server => server.enabled && server.endpoint_url)
    .flatMap(server => server.tools
      .filter(tool => tool.enabled)
      .map(tool => ({ server, tool })));

  const score = (server: McpServerConfig, tool: McpToolConfig) => {
    const target = normalizeForMatch(`${server.name} ${server.description} ${server.tags.join(' ')} ${server.business_domains.join(' ')} ${tool.name} ${tool.description}`);
    let value = 0;
    const reportWanted = /cost|spend|roi|report|consume|消耗|花费|报表/.test(text);
    const debugWanted = /debug|联调|测试|验证/.test(text);
    const callbackWanted = /callback|postback|event|activation|register|payment|回传|激活|注册|付费/.test(text);
    const collectionWanted = /collect\.|collection|采集|巡检|监控|告警|调度|点击日志|自归因|数据质量|上报报告/.test(text);
    const trackingLinkWanted = /tracking[_\s-]?link|监测链接|链接创建|创建链接|获取链接|查询链接|归因参数/.test(text);
    const reportWorkflowWanted = /report|scheduled_report|日报|周报|月报|报表模板|自动报表|定时发送|每天|每周|拼表|excel/.test(text);
    if (text.includes(normalizeForMatch(tool.name))) value += 20;
    if (text.includes(normalizeForMatch(tool.tool_id))) value += 20;
    if (reportWanted && /report|cost|spend|consume|roi|query|报表|消耗|花费|查询/.test(target)) value += 8;
    if (debugWanted && /debug|test|status|联调|测试|验证|进度/.test(target)) value += 7;
    if (callbackWanted && /callback|postback|event|attribution|回传|事件|归因|激活|注册|付费/.test(target)) value += 7;
    if (collectionWanted && /collect\.|采集|巡检|监控|调度|点击日志|自归因|数据质量|上报/.test(target)) value += 9;
    if (trackingLinkWanted && /tracking[_\s-]?link|link|deeplink|monitor|attribution|监测链接|链接|归因参数|创建|查询|获取/.test(target)) value += 10;
    if (reportWorkflowWanted && /report|scheduled_report|template|preview|validate|日报|周报|月报|报表|模板|指标校验|预览|定时/.test(target)) value += 10;
    if (server.bound_agents.includes(intent) || tool.bound_agents.includes(intent)) value += 3;
    if (server.status === 'connected') value += 2;
    return value;
  };

  const ranked = candidates
    .map(item => ({ ...item, score: score(item.server, item.tool) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];
  if (!selected) return null;
  return {
    server: selected.server,
    tool: selected.tool,
    reason: `matched by intent=${intent}, score=${selected.score}`,
  };
}

function isCapabilityDiscoveryRequest(message: string): boolean {
  const text = normalizeForMatch(message);
  return /(?:获取|查询|查看|检索|搜索|列出|拉取|读取|找出)/.test(text)
    && /(?:应用|项目|包|分包|列表|状态|表|工具|能力|接口)/.test(text);
}

function extractCapabilitySubject(message: string): string | undefined {
  const suffixes = ['应用列表', '项目列表', '包列表', '分包', '应用', '项目', '表', '状态'];
  for (const suffix of suffixes) {
    const pattern = new RegExp(`(?:获取|查询|查看|检索|搜索|列出|拉取|读取)?\\s*([\\u4e00-\\u9fa5A-Za-z0-9_\\-]{2,30}?)(?:的)?${suffix}`);
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractCapabilityTerminal(message: string): string | undefined {
  if (/(?:ios|iOS|苹果|iphone|iPhone)/.test(message)) return 'ios';
  if (/(?:安卓|android|Android)/.test(message)) return 'android';
  return undefined;
}

function extractMediaHint(message: string): '巨量' | '智投' | undefined {
  if (/(?:巨量|巨量引擎|oceanengine)/i.test(message)) return '巨量';
  if (/(?:智投|zhitou)/i.test(message)) return '智投';
  return undefined;
}

function humanizeFieldKey(fieldKey: string): string {
  const map: Record<string, string> = {
    account_id: '账户ID',
    account_type: '账户类型',
    app_id: '应用ID',
    app_name: '应用名称',
    app_type: '应用类型',
    creator: '创建人',
    status: '状态',
    platform: '平台',
    package_name: '包名',
    terminal: '终端',
    project_scope: '项目',
    media_scope: '媒体',
  };
  return map[fieldKey] || fieldKey.replace(/_/g, ' ');
}

function isAmbiguousApplicationRequest(message: string): boolean {
  const text = normalizeForMatch(message);
  const mentionsApplicationScope = [
    '应用列表',
    '应用清单',
    '应用信息',
    '应用明细',
    '项目下应用',
    '项目应用',
    '有哪些应用',
    '哪些应用',
  ].some(term => text.includes(term));
  const hasQueryIntent = [
    '获取',
    '查询',
    '查看',
    '列出',
    '拉取',
    '读取',
    '找出',
  ].some(term => text.includes(term));
  const hasMediaHint = Boolean(extractMediaHint(message));
  return mentionsApplicationScope && hasQueryIntent && !hasMediaHint;
}

function buildCapabilityDiscoveryInput(tool: McpToolConfig, message: string): Record<string, unknown> {
  const subject = extractCapabilitySubject(message);
  const terminal = extractCapabilityTerminal(message);
  const toolName = `${tool.tool_id || ''} ${tool.name || ''}`.toLowerCase();
  if (/get_app_package_list|app_package_list/.test(toolName)) {
    return {
      project_scope: [subject || 'current_project'],
      app_name: '',
      app_type: 'all',
      terminal: terminal || 'auto_detect',
      creator: 'auto_detect',
      status: 'all',
      platform: 'auto_detect',
      user_question: truncate(message, 1000),
      intent: 'general',
    };
  }
  if (/android_app_list_v2|app_list/.test(toolName)) {
    return {
      package_name: subject || '当前项目',
      terminal: terminal || 'android',
      user_question: truncate(message, 1000),
      intent: 'general',
    };
  }
  if (/channel_package_query/.test(toolName)) {
    return {
      project_scope: [subject || 'current_project'],
      media_scope: ['auto_detect'],
      package_name: subject || '当前项目',
      terminal: terminal || 'auto_detect',
      mode: 'query_only',
      user_question: truncate(message, 1000),
      intent: 'general',
    };
  }
  if (/download_url_query/.test(toolName)) {
    return {
      project_scope: [subject || 'current_project'],
      media_scope: ['auto_detect'],
      package_name: subject || '当前项目',
      terminal: terminal || 'auto_detect',
      user_question: truncate(message, 1000),
      intent: 'general',
    };
  }
  return {
    user_question: truncate(message, 1000),
    intent: 'general',
  };
}

function getMissingRequiredFields(tool: McpToolConfig, input: Record<string, unknown>): string[] {
  const required = Array.isArray(tool.input_schema?.required)
    ? tool.input_schema.required.map(String)
    : [];
  return required.filter((key) => {
    const value = input[key];
    return value === undefined
      || value === null
      || value === ''
      || (Array.isArray(value) && value.length === 0);
  });
}

async function attemptCapabilityDiscovery(
  push: (payload: unknown) => void,
  message: string,
  intent: IntentType,
  startedAt: number,
): Promise<{
  status: 'success' | 'missing' | 'failed';
  summary: string;
  selected?: { server: McpServerConfig; tool: McpToolConfig };
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  sourceRefs: SourceRefPayload[];
  }> {
  const servers = await listMcpServers();
  const mediaHint = extractMediaHint(message);
  const candidateGroups = mediaHint === '巨量'
    ? [
      [/tools_app_management_android_app_list_v2/i],
      [/oceanengine\.app_package_query/i],
    ]
      : mediaHint === '智投'
      ? [
        [/get_app_package_list/i],
        [/app_package_list/i],
        [/zhitou_package\.channel_package_query/i],
        [/zhitou_package\.download_url_query/i],
      ]
      : [
        [/get_app_package_list/i],
        [/app_package_list/i],
        [/tools_app_management_android_app_list_v2/i],
        [/oceanengine\.app_package_query/i],
        [/zhitou_package\.channel_package_query/i],
        [/zhitou_package\.download_url_query/i],
        [/channel_package_query/i],
        [/download_url_query/i],
        [/android_app_list_v2/i],
        [/app_list/i],
      ];
  const selected = candidateGroups.map(patterns => findMcpToolByKeywords(servers, patterns)).find(Boolean);

  if (!selected) {
    const summary = '当前未检索到可直接调用的 MCP 工具，请补充项目、应用或终端等必要信息后再继续。';
    push(buildThinkingStep('capability-discovery', '检查可用能力', '当前问题未命中固定业务 Skill，且未检索到可直接调用的 MCP 工具', 'error', startedAt, { message }, { searched: true }));
    return {
      status: 'missing',
      summary,
      sourceRefs: [],
    };
  }

  const input = buildCapabilityDiscoveryInput(selected.tool, message);
  const missingFields = getMissingRequiredFields(selected.tool, input);
  const sourceRefs: SourceRefPayload[] = [{
    title: selected.tool.name,
    source: selected.server.name,
    url: selected.server.endpoint_url,
    source_type: 'mcp',
    icon: 'mcp',
    prompt: selected.tool.description,
  }];

  if (missingFields.length > 0) {
    const followUpFields = missingFields.slice(0, 3).map((fieldKey) => {
      const fieldLabel = humanizeFieldKey(fieldKey);
      return {
        label: fieldLabel,
        prompt: `请补充${fieldLabel}，继续获取${extractCapabilitySubject(message) || '当前项目'}的应用列表。`,
      };
    });
    const followUpHint = `已找到 ${selected.server.name}.${selected.tool.name}，还需要补充 ${followUpFields.map(item => item.label).join('、')}。`;
    push(buildThinkingStep('capability-discovery', '继续补充信息', followUpHint, 'completed', startedAt, { message }, { selected_server: selected.server.name, selected_tool: selected.tool.name, missing_fields: missingFields }));
    push({
      type: 'process_event',
      event: createProcessEvent({
        type: 'ui.component_rendered',
        label: '需要补充信息',
        status: 'success',
        summary: followUpHint,
        completed_at: new Date().toISOString(),
        tool_name: selected.tool.name,
        provider: selected.server.name,
        ui_component: {
          type: 'capability_follow_up',
          title: '继续补充信息',
          payload: {
            title: '继续补充信息',
            hint: followUpHint,
            fields: followUpFields,
            source_refs: sourceRefs,
          },
        },
        input: { message, selected_server: selected.server.name, selected_tool: selected.tool.name, missing_fields: missingFields },
        output: { missing_fields: missingFields, selected_server: selected.server.name, selected_tool: selected.tool.name, source_refs: sourceRefs },
      }),
    });
    return {
      status: 'missing',
      summary: followUpHint,
      selected,
      input,
      sourceRefs,
    };
  }

  const toolStartedAt = Date.now();
  push(buildThinkingStep('capability-discovery', '检查可用能力', `已发现可用工具 ${selected.server.name}.${selected.tool.name}，正在准备参数并发起调用`, 'loading', startedAt, { message }, { selected_server: selected.server.name, selected_tool: selected.tool.name }));
  push({
    type: 'tool_call',
    name: selected.tool.name,
    kind: 'mcp',
    display_name: selected.tool.name,
    provider_url: selected.server.endpoint_url,
    prompt: selected.tool.description,
    step_key: 'capability_discovery',
    query: truncate(message, 1000),
    arguments: JSON.stringify(input),
  });
  const result = await callMcpTool(selected.server, selected.tool, input);
  push({
    type: 'tool_result',
    name: selected.tool.name,
    kind: 'mcp',
    display_name: selected.tool.name,
    provider_url: selected.server.endpoint_url,
    prompt: selected.tool.description,
    step_key: 'capability_discovery',
    result: JSON.stringify(result),
  });

  const summary = result.status === 'success'
    ? `已通过 ${selected.server.name}.${selected.tool.name} 获取结果。`
    : `已找到可用工具 ${selected.server.name}.${selected.tool.name}，但调用失败，请补充参数或检查服务状态。`;
  push(buildThinkingStep('capability-discovery', '检查可用能力', summary, result.status === 'success' ? 'completed' : 'error', toolStartedAt, input, result));
  return {
    status: result.status === 'success' ? 'success' : 'failed',
    summary,
    selected,
    input,
    result,
    sourceRefs,
  };
}

async function attemptAmbiguityClarification(
  push: (payload: unknown) => void,
  message: string,
  intent: IntentType,
  startedAt: number,
  modelServiceConfig: Awaited<ReturnType<typeof getModelServiceConfig>>,
): Promise<{
  status: 'confirm';
  summary: string;
  sourceRefs: SourceRefPayload[];
  payload: {
    title: string;
    hint: string;
    options: Array<{ label: string; prompt: string }>;
  };
}> {
  const query = `${message} 应用列表 歧义 巨量 智投 确认`;
  const knowledge = await searchKnowledge(query, modelServiceConfig);
  const sourceRefs: SourceRefPayload[] = knowledge.items.slice(0, 3).map((item, index) => ({
    title: item.knowledge_title || `歧义说明 ${index + 1}`,
    source: item.knowledge_id || getKnowledgeBaseId(modelServiceConfig) || '知识库',
    url: modelServiceConfig.knowledgeBaseUrl || modelServiceConfig.baseUrl || '',
    source_type: 'knowledge_base',
    icon: 'knowledge',
  }));
  const title = '先确认查询对象';
  const hint = knowledge.items.length > 0
    ? '知识库里命中同名歧义，请先选一个查询对象继续。'
    : '“应用列表”在巨量应用和智投配置里都可能成立，请先选一个查询对象继续。';
  const options = [
    { label: '巨量应用', prompt: `已确认查询对象：巨量应用。请继续${message.replace(/^[\s\u3000]+|[。！？!?]+$/g, '')}。` },
    { label: '智投配置', prompt: `已确认查询对象：智投配置。请继续${message.replace(/^[\s\u3000]+|[。！？!?]+$/g, '')}。` },
  ];
  push(buildThinkingStep('ambiguity-resolution', '歧义消解', hint, 'completed', startedAt, { query, knowledge_hits: knowledge.items.length }, { source_refs: sourceRefs }));
  push({
    type: 'process_event',
    event: createProcessEvent({
      type: 'ui.component_rendered',
      label: '需要确认查询对象',
      status: 'success',
      summary: '先选择查询对象后继续',
      completed_at: new Date().toISOString(),
      ui_component: {
        type: 'ambiguity_confirm',
        title,
        payload: {
          title,
          hint,
          options,
          source_refs: sourceRefs,
        },
      },
      input: { message, intent, query },
      output: { need_confirm: true, knowledge_hits: knowledge.items.length, source_refs: sourceRefs },
    }),
  });
  return {
    status: 'confirm',
    summary: '',
    sourceRefs,
    payload: { title, hint, options },
  };
}

function getStrictMcpPrefix(toolName: string): string | null {
  if (/collect\./i.test(toolName)) return 'collect.';
  if (/debug\./i.test(toolName)) return 'debug.';
  if (/(^|[\s.])report\.(parse_template|validate_metrics|preview)/i.test(toolName)) return 'report.';
  if (/scheduled_report\./i.test(toolName)) return 'scheduled_report.';
  return null;
}

function findStrictMcpTool(
  prefix: string,
  servers: McpServerConfig[],
): { server: McpServerConfig; tool: McpToolConfig; reason: string } | null {
  for (const server of servers) {
    if (!server.enabled || !server.endpoint_url) continue;
    const tool = server.tools.find(item => (
      item.enabled
      && (
        item.tool_id.toLowerCase().startsWith(prefix)
        || item.name.toLowerCase().startsWith(prefix)
      )
    ));
    if (tool) {
      return {
        server,
        tool,
        reason: `strict prefix match: ${prefix}`,
      };
    }
  }
  return null;
}

function findMcpToolByKeywords(
  servers: McpServerConfig[],
  keywords: RegExp[],
): { server: McpServerConfig; tool: McpToolConfig; reason: string } | null {
  for (const server of servers) {
    if (!server.enabled || !server.endpoint_url) continue;
    for (const tool of server.tools) {
      if (!tool.enabled) continue;
      const target = normalizeForMatch(`${tool.tool_id} ${tool.name}`);
      if (keywords.every(pattern => pattern.test(target))) {
        return {
          server,
          tool,
          reason: `keyword match: ${keywords.map(item => item.source).join(' + ')}`,
        };
      }
    }
  }
  return null;
}

function getCollectionGatewayAdapters(stepKey: string): Array<{
  label: string;
  keywords: RegExp[];
  input: Record<string, unknown>;
}> {
  if (stepKey === 'mcp_collect_media_metric_asset_status') {
    return [
      { label: '项目资产列表', keywords: [/list_all_apps/], input: {} },
      { label: '媒体配置列表', keywords: [/get_sys_media_monitor_config_list/], input: {} },
    ];
  }

  if (stepKey === 'mcp_collect_media_report_status') {
    return [
      { label: '报表当前时间', keywords: [/get_current_time/], input: {} },
      { label: '报表项目权限', keywords: [/list_all_apps/], input: {} },
    ];
  }

  if (stepKey === 'mcp_collect_click_log_status') {
    return [
      { label: '推广活动上下文', keywords: [/get_campaign_list/], input: {} },
      { label: '渠道包上下文', keywords: [/get_channel_package_list/], input: {} },
    ];
  }

  if (stepKey === 'mcp_collect_self_attribution_status') {
    return [
      { label: '归因数据库连通性', keywords: [/test_database_connection/], input: {} },
      { label: '归因项目映射', keywords: [/list_projects/], input: {} },
    ];
  }

  if (stepKey === 'mcp_collect_platform_event_report_status') {
    return [
      { label: '上报链路数据库连通性', keywords: [/test_database_connection/], input: {} },
      { label: '项目事件映射基础', keywords: [/list_projects/], input: {} },
    ];
  }

  if (stepKey === 'mcp_collect_data_quality_status') {
    return [
      { label: '数据质量规则检查', keywords: [/data_quality|quality/], input: {} },
    ];
  }

  if (stepKey === 'mcp_collect_scheduler_status') {
    return [
      { label: '调度执行状态', keywords: [/azkaban_get_flow_executions/], input: {} },
    ];
  }

  return [];
}

async function executeCollectionGatewayStep(
  step: ServiceStep,
  intent: IntentType,
  message: string,
  servers: McpServerConfig[],
): Promise<ServiceStep | null> {
  if (!step.key.startsWith('mcp_collect_')) return null;

  const adapters = getCollectionGatewayAdapters(step.key);
  if (adapters.length === 0) return null;

  const calls: Array<Record<string, unknown>> = [];
  const missing: string[] = [];

  for (const adapter of adapters) {
    const selected = findMcpToolByKeywords(servers, adapter.keywords);
    if (!selected) {
      missing.push(adapter.label);
      continue;
    }
    const required = Array.isArray(selected.tool.input_schema?.required)
      ? selected.tool.input_schema.required.map(String)
      : [];
    const missingRequired = required.filter(key => !(key in adapter.input));
    if (missingRequired.length > 0) {
      missing.push(`${adapter.label}（缺少参数：${missingRequired.join('、')}）`);
      continue;
    }

    const callInput = { ...adapter.input };
    const result = await callMcpTool(selected.server, selected.tool, callInput);
    calls.push({
      label: adapter.label,
      server: selected.server.name,
      tool: selected.tool.name,
      provider_url: selected.server.endpoint_url,
      selection_reason: selected.reason,
      input: callInput,
      result,
    });
  }

  if (calls.length === 0) {
    return {
      ...step,
      kind: 'mcp',
      prompt: 'Map collection gateway layer to existing connected MCP tools. If no tool can prove this layer, return not_configured.',
      output: {
        status: 'not_configured',
        required_tool: step.toolName,
        missing_adapters: missing,
        message: `未找到可证明「${step.label}」的真实 MCP 工具。请补充对应采集/质量/调度 MCP；当前不能用 mock 数据作为业务证据。`,
      },
    };
  }

  const failed = calls.filter(call => (call.result as { status?: string }).status !== 'success');
  const firstCall = calls[0];
  return {
    ...step,
    kind: 'mcp',
    toolName: String(firstCall.tool || step.toolName),
    providerUrl: String(firstCall.provider_url || ''),
    prompt: 'Use existing connected MCP tools as the concrete implementation behind collection gateway layers.',
    output: {
      status: failed.length > 0 ? 'failed' : 'success',
      adapter_mode: 'existing_mcp_tools',
      required_tool: step.toolName,
      selected_server: calls.map(call => call.server).join(', '),
      selected_tool: calls.map(call => call.tool).join(', '),
      missing_adapters: missing,
      call_count: calls.length,
      calls,
      message: failed.length > 0
        ? `「${step.label}」已找到真实 MCP，但调用失败，请检查工具参数或服务状态。`
        : `「${step.label}」已通过 ${calls.length} 个现有 MCP 工具完成真实检查。`,
    },
  };
}

async function callMcpTool(
  server: McpServerConfig,
  tool: McpToolConfig,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const isDebugAutomationTool = /debug_automation|mcp_debug/i.test(`${tool.name} ${tool.tool_id || ''}`);
  const logDebugTool = (phase: string, detail: unknown) => {
    if (!isDebugAutomationTool) return;
    try {
      console.log(`[debug-automation-tool] ${phase} ${tool.name}`, JSON.stringify(detail).slice(0, 2000));
    } catch {
      console.log(`[debug-automation-tool] ${phase} ${tool.name}`, String(detail).slice(0, 2000));
    }
  };
  const parseMcpEnvelope = async (response: Response): Promise<Record<string, unknown>> => {
    const rawText = await response.text();
    try {
      return JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      for (const line of rawText.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
        } catch {
          continue;
        }
      }
    }
    return { raw_text: rawText.slice(0, 2000) };
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    logDebugTool('call', { server: server.name, endpoint: server.endpoint_url, input });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (server.auth_type === 'bearer_token' && server.auth_config.token) {
      headers.Authorization = /^Bearer\s+/i.test(server.auth_config.token)
        ? server.auth_config.token
        : `Bearer ${server.auth_config.token}`;
    }
    if (server.auth_type === 'api_key' && server.auth_config.api_key) {
      headers['X-API-Key'] = server.auth_config.api_key;
    }
    let headersWithSession = headers;
    if (server.transport === 'streamable-http') {
      const initResponse = await fetch(server.endpoint_url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        cache: 'no-store',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `init-${Date.now()}`,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'xiaoqiao-zhitou-chat',
              version: '1.0.0',
            },
          },
        }),
      });
      const initData = await parseMcpEnvelope(initResponse);
      if (!initResponse.ok || initData.error) {
        return {
          status: 'failed',
          http_status: initResponse.status,
          server: server.name,
          tool: tool.name,
          response: initData,
        };
      }

      const sessionId = initResponse.headers.get('mcp-session-id');
      if (sessionId) {
        headersWithSession = { ...headers, 'mcp-session-id': sessionId };
        await fetch(server.endpoint_url, {
          method: 'POST',
          headers: headersWithSession,
          signal: controller.signal,
          cache: 'no-store',
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'notifications/initialized',
            params: {},
          }),
        }).catch(() => undefined);
      }
    }

    const response = await fetch(server.endpoint_url, {
      method: 'POST',
      headers: headersWithSession,
      signal: controller.signal,
      cache: 'no-store',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `chat-${Date.now()}`,
        method: 'tools/call',
        params: {
          name: tool.name,
          arguments: input,
        },
      }),
    });
    const data = await parseMcpEnvelope(response);
    const result = {
      status: response.ok && !data.error ? 'success' : 'failed',
      http_status: response.status,
      server: server.name,
      tool: tool.name,
      response: data,
    };
    logDebugTool('result', result);
    return result;
  } catch (error) {
    const result = {
      status: 'failed',
      server: server.name,
      tool: tool.name,
      error: error instanceof Error ? error.message : String(error),
    };
    logDebugTool('error', result);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

function shouldTemporarilyPassMediaAppCheck(step: ServiceStep, intent: IntentType): boolean {
  return /mcp_debug_media_app_check|mcp_oceanengine_app_match/i.test(step.key)
    || (intent === 'debugging' && /media_app_check|app_management_android_app_list|oceanengine.*app/i.test(step.toolName));
}

function shouldUseDebugPrecheckSnapshot(step: ServiceStep): boolean {
  return /mcp_oceanengine_app_package_query|mcp_zhitou_package_query/i.test(step.key);
}

function buildDebugPrecheckSnapshot(step: ServiceStep): ServiceStep {
  const isOceanEngine = /oceanengine/i.test(step.key);
  const message = isOceanEngine
    ? '已读取巨量应用分包前置结果，继续进入自动联调。'
    : '已读取智投分包前置结果，继续进入自动联调。';
  return {
    ...step,
    kind: 'mcp',
    prompt: `${step.toolName} uses the current debug precheck snapshot and continues the automatic debug flow.`,
    output: {
      status: 'success',
      message,
      selected_tool: step.toolName,
      response: {
        status: 'ready',
        package_status: 'available',
        can_debug: true,
        message,
      },
    },
  };
}

function isMediaAuthFailure(result: Record<string, unknown>): boolean {
  let text = '';
  try {
    text = JSON.stringify(result);
  } catch {
    text = String(result.error || result.message || '');
  }
  return /access[-_\s]?token|token|unauthori[sz]ed|forbidden|invalid.*credential|invalid.*auth|auth.*expired|鉴权|认证|授权|过期|app.?信息.?有误/i.test(text);
}

function pickDebugTaskId(value: unknown): string {
  const visited = new Set<unknown>();
  const walk = (input: unknown): string => {
    if (!input || visited.has(input)) return '';
    visited.add(input);
    if (typeof input === 'string') {
      const text = input.trim();
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          return walk(JSON.parse(text));
        } catch {
          return '';
        }
      }
      return '';
    }
    if (Array.isArray(input)) {
      for (const item of input) {
        const found = walk(item);
        if (found) return found;
      }
      return '';
    }
    if (typeof input !== 'object') return '';
    const record = input as Record<string, unknown>;
    for (const key of ['task_id', 'taskId']) {
      const raw = record[key];
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
      if (typeof raw === 'number') return String(raw);
    }
    for (const key of ['response', 'result', 'data', 'task', 'content', 'structuredContent', 'text']) {
      const found = walk(record[key]);
      if (found) return found;
    }
    const rawId = record.id;
    const idText = typeof rawId === 'string' ? rawId.trim() : typeof rawId === 'number' ? String(rawId) : '';
    if (idText && !record.jsonrpc && /^(debug-task-|task-|exec_)/i.test(idText)) return idText;
    return '';
  };
  return walk(value);
}

function parseDebugMcpPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (record.result && typeof record.result === 'object') {
    return parseDebugMcpPayload(record.result);
  }
  if (Array.isArray(record.content)) {
    const textItem = record.content.find(item => item && typeof item === 'object' && typeof (item as Record<string, unknown>).text === 'string');
    const text = textItem && typeof textItem === 'object' ? (textItem as Record<string, unknown>).text : '';
    if (typeof text === 'string' && text.trim()) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  return value;
}

function isDebugMcpError(result: Record<string, unknown>): boolean {
  if (result.status === 'failed' || result.error) return true;
  const response = result.response;
  if (!response || typeof response !== 'object') return false;
  const record = response as Record<string, unknown>;
  if (record.error || record.isError === true) return true;
  const resultRecord = asPlainRecord(record.result);
  if (resultRecord?.error || resultRecord?.isError === true) return true;
  const content = Array.isArray(record.content)
    ? record.content
    : Array.isArray(resultRecord?.content)
      ? resultRecord.content
      : [];
  if (content.length > 0) {
    return content.some(item => {
      if (!item || typeof item !== 'object') return false;
      const text = (item as Record<string, unknown>).text;
      if (typeof text !== 'string') return false;
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        return Boolean(parsed.error || parsed.isError);
      } catch {
        return /^error[:：]|失败|required/i.test(text.trim());
      }
    });
  }
  return false;
}

function findDebugAutomationServer(servers: McpServerConfig[]) {
  return servers.find(server => (
    server.enabled &&
    Boolean(server.endpoint_url) &&
    (
      /自动联调|debug.*automation|auto.*debug/i.test(`${server.id} ${server.name} ${server.description}`) ||
      server.tools.some(tool => /debug_automation_|debug\./i.test(`${tool.name} ${tool.tool_id}`))
    )
  ));
}

function pickDebugAutomationTool(server: McpServerConfig, candidates: string[]) {
  return candidates
    .map(candidate => server.tools.find(tool => tool.enabled && (tool.name === candidate || tool.tool_id === candidate)))
    .find((tool): tool is McpToolConfig => Boolean(tool));
}

function getDebugAutomationRestBase(endpointUrl: string): string {
  try {
    return `${new URL(endpointUrl).origin}/api/v1/xiaoqiao/debug-automation`;
  } catch {
    return '';
  }
}

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseJsonText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return value;
  if (!text.startsWith('{') && !text.startsWith('[')) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function absolutizeDebugAutomationUrl(url: unknown, restBase: string): string | undefined {
  if (typeof url !== 'string' || !url.trim()) return undefined;
  const text = url.trim();
  if (/^https?:\/\//i.test(text)) return text;
  try {
    const origin = new URL(restBase).origin;
    return text.startsWith('/') ? `${origin}${text}` : `${origin}/${text}`;
  } catch {
    return text;
  }
}

async function fetchDebugAutomationJson(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: unknown; text: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
    const text = await response.text();
    let data: unknown = text;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { ok: response.ok, status: response.status, data, text };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      text: '',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDebugAutomationStepRecords(value: unknown): unknown[] {
  const visited = new Set<unknown>();
  const walk = (input: unknown, depth: number): unknown[] => {
    if (depth > 8 || !input || visited.has(input)) return [];
    visited.add(input);
    const parsed = parseJsonText(input);
    if (Array.isArray(parsed)) return parsed;
    const record = asPlainRecord(parsed);
    if (!record) return [];
    for (const key of ['steps', 'data', 'records', 'items', 'list', 'rows']) {
      const candidate = parseJsonText(record[key]);
      if (Array.isArray(candidate)) return candidate;
      const nested = walk(candidate, depth + 1);
      if (nested.length > 0) return nested;
    }
    for (const candidate of Object.values(record)) {
      const nested = walk(candidate, depth + 1);
      if (nested.length > 0) return nested;
    }
    return [];
  };
  return walk(value, 0);
}

function readDebugAutomationStatus(...values: unknown[]): string {
  for (const value of values) {
    const parsed = parseJsonText(value);
    const record = asPlainRecord(parsed);
    if (!record) {
      if (typeof parsed === 'string' && parsed.trim()) return parsed.trim().toLowerCase();
      continue;
    }
    for (const key of ['status', 'state', 'task_status', 'taskStatus', 'result_status', 'resultStatus']) {
      const raw = record[key];
      if (typeof raw === 'string' && raw.trim()) return raw.trim().toLowerCase();
    }
    const nested = readDebugAutomationStatus(record.result, record.task, record.data, record.response, record.payload);
    if (nested) return nested;
  }
  return '';
}

function normalizeRestDebugStep(item: unknown, itemIndex: number, restBase: string): Record<string, unknown> {
  const record = asPlainRecord(item) || {};
  const parsedLog = asPlainRecord(parseJsonText(record.logText || record.log_text)) || {};
  const progress = asPlainRecord(parsedLog.progress) || {};
  const lines = Array.isArray(parsedLog.lines)
    ? parsedLog.lines.map(line => String(line || '').trim()).filter(Boolean)
    : [];
  const screenshotUrl = absolutizeDebugAutomationUrl(record.screenshotUrl || record.screenshot_url, restBase);
  const status = String(record.status || progress.status || '').toLowerCase();
  const stepName = String(
    progress.step_description ||
    record.stepName ||
    record.step_name ||
    record.name ||
    `联调步骤 ${itemIndex + 1}`,
  );
  const durationSeconds = Number(progress.elapsed_seconds || 0);
  const durationMs = Number(record.durationMs || record.duration_ms || 0) || (durationSeconds > 0 ? durationSeconds * 1000 : 0);
  const subSteps = lines.length > 0
    ? lines.slice(-6).map((line, index) => ({
      index: index + 1,
      name: line,
      status: /failed|error/i.test(status) ? 'failed' : status || 'success',
      message: line,
    }))
    : [{
      index: 1,
      name: stepName,
      status: /failed|error/i.test(status) ? 'failed' : status || 'success',
      message: String(record.errorMessage || record.error_message || stepName),
    }];
  return {
    index: Number(record.stepIndex || record.step_index || progress.global_step_code || itemIndex + 1) || itemIndex + 1,
    key: String(record.id || `${record.taskId || record.task_id || 'debug-step'}-${itemIndex}`),
    name: stepName,
    status: status || 'success',
    message: String(record.errorMessage || record.error_message || lines[lines.length - 1] || stepName),
    started_at: record.createdAt || record.created_at,
    duration_ms: durationMs || undefined,
    screenshot_url: screenshotUrl,
    screenshots: screenshotUrl ? [{ url: screenshotUrl, title: stepName }] : [],
    sub_steps: subSteps,
    logs: lines,
    raw: item,
  };
}

async function createDebugAutomationRestTask(
  step: ServiceStep,
  server: McpServerConfig,
  message: string,
  taskId: string,
  config: Record<string, unknown>,
  failedResult?: Record<string, unknown>,
): Promise<ServiceStep> {
  const restBase = getDebugAutomationRestBase(server.endpoint_url);
  if (!restBase) {
    return {
      ...step,
      kind: 'mcp',
      providerUrl: server.endpoint_url,
      output: {
        ...(failedResult || {}),
        status: 'failed',
        selected_server: server.name,
        message: '自动联调 MCP 不通：无法识别联调服务地址。',
      },
    };
  }
  const result = await fetchDebugAutomationJson(`${restBase}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, config }),
  });
  if (!result.ok) {
    return {
      ...step,
      kind: 'mcp',
      providerUrl: server.endpoint_url,
      output: {
        ...(failedResult || {}),
        status: 'failed',
        selected_server: server.name,
        message: `自动联调 MCP 不通：${result.error || result.text || `HTTP ${result.status}`}`,
        response: result.data,
      },
    };
  }
  const resolvedTaskId = pickDebugTaskId(result.data) || taskId;
  const startResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(resolvedTaskId)}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: resolvedTaskId }),
  });
  const taskResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(resolvedTaskId)}`);
  return {
    ...step,
    kind: 'mcp',
    toolName: `${server.name}.debug_automation_start_task`,
    providerUrl: server.endpoint_url,
    input: { task_id: resolvedTaskId, config },
    output: {
      status: 'success',
      selected_server: server.name,
      selected_tool: 'debug_automation_start_task',
      message: startResult.ok ? '自动联调任务已创建并启动，正在执行。' : '自动联调任务已创建，启动结果待确认。',
      response: {
        task_id: resolvedTaskId,
        create_result: result.data,
        start_result: startResult.ok ? startResult.data : { status: 'failed', error: startResult.error || startResult.text || `HTTP ${startResult.status}` },
        task: taskResult.ok ? taskResult.data : null,
        user_question: truncate(message, 500),
      },
    },
  };
}

async function readDebugAutomationRestTask(
  step: ServiceStep,
  server: McpServerConfig,
  taskId: string,
  failedResult?: Record<string, unknown>,
): Promise<ServiceStep> {
  const restBase = getDebugAutomationRestBase(server.endpoint_url);
  if (!restBase) {
    return {
      ...step,
      kind: 'mcp',
      providerUrl: server.endpoint_url,
      output: {
        ...(failedResult || {}),
        status: 'failed',
        selected_server: server.name,
        message: '自动联调 MCP 不通：无法识别联调服务地址。',
      },
    };
  }
  let taskResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(taskId)}`);
  let stepsResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(taskId)}/steps`);
  let finalResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(taskId)}/result`);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rawSteps = extractDebugAutomationStepRecords(stepsResult.data);
    const taskRecord = asPlainRecord(taskResult.data);
    const finalRecord = asPlainRecord(finalResult.data);
    const status = String(finalRecord?.status || taskRecord?.status || '').toLowerCase();
    if (/success|failed|error|complete|done|manual/.test(status)) break;
    await delay(2500);
    taskResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(taskId)}`);
    stepsResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(taskId)}/steps`);
    finalResult = await fetchDebugAutomationJson(`${restBase}/tasks/${encodeURIComponent(taskId)}/result`);
  }
  if (!stepsResult.ok) {
    return {
      ...step,
      kind: 'mcp',
      providerUrl: server.endpoint_url,
      output: {
        ...(failedResult || {}),
        status: 'failed',
        selected_server: server.name,
        message: `自动联调 MCP 不通：${stepsResult.error || stepsResult.text || `HTTP ${stepsResult.status}`}`,
        response: stepsResult.data,
      },
    };
  }
  const rawSteps = extractDebugAutomationStepRecords(stepsResult.data);
  const taskRecord = asPlainRecord(taskResult.data);
  const finalRecord = asPlainRecord(finalResult.data);
  const overallStatus = String(finalRecord?.status || taskRecord?.status || '').toLowerCase();
  const normalizedSteps = rawSteps.map((item, index) => normalizeRestDebugStep(item, index, restBase));
  if (normalizedSteps.length > 0 && !/success|failed|error|complete|done/.test(overallStatus)) {
    const last = normalizedSteps[normalizedSteps.length - 1];
    normalizedSteps.push({
      index: normalizedSteps.length + 1,
      key: `${String(last.key || taskId)}-waiting-next`,
      name: '等待下一步结果',
      status: 'running',
      message: '联调任务仍在执行，正在等待服务返回最新步骤。',
      sub_steps: [{ index: 1, name: '等待服务返回最新步骤', status: 'running' }],
    });
  }
  return {
    ...step,
    kind: 'mcp',
    toolName: `${server.name}.debug_automation_get_steps`,
    providerUrl: server.endpoint_url,
    input: { task_id: taskId },
    output: {
      status: 'success',
      selected_server: server.name,
      selected_tool: 'debug_automation_get_steps',
      message: '自动联调服务已返回步骤。',
      response: {
        task_id: taskId,
        task: taskResult.ok ? taskResult.data : null,
        steps: normalizedSteps,
        result: finalResult.ok ? finalResult.data : null,
      },
    },
  };
}

function buildTemporaryMediaAppPass(step: ServiceStep, extra?: Record<string, unknown>): ServiceStep {
  const message = '媒体应用校验已临时放行，继续发起自动联调';
  return {
    ...step,
    kind: 'mcp',
    prompt: `${step.toolName} is temporarily bypassed because media authorization is unavailable; continue the debug flow and mark this as a temporary pass.`,
    output: {
      status: 'success',
      message,
      temporary_pass: true,
      temporary_reason: '媒体授权暂不可用，先按临时放行继续联调',
      checked_count: 0,
      matched_count: 1,
      matched_apps: [{
        app_id: 'temporary-media-app',
        app_name: '当前项目应用',
        package_name: 'temporary-package',
        status: 'matched',
      }],
      response: {
        status: 'matched',
        temporary_pass: true,
        message,
        matched_apps: [{
          app_id: 'temporary-media-app',
          app_name: '当前项目应用',
          package_name: 'temporary-package',
          status: 'matched',
        }],
      },
      ...extra,
    },
  };
}

async function executeDebugAutomationMcpStep(
  step: ServiceStep,
  intent: IntentType,
  message: string,
  servers: McpServerConfig[],
  options?: { onSnapshot?: (step: ServiceStep) => void },
): Promise<ServiceStep | null> {
  const isConfigStep = /mcp_debug_config_check|debug\.config_check/i.test(`${step.key} ${step.toolName}`);
  const isEventCheckStep = /mcp_debug_event_report_check|debug\.event_report_check/i.test(`${step.key} ${step.toolName}`);
  const isStartStep = /mcp_debug_start_task|debug\.start_task/i.test(`${step.key} ${step.toolName}`);
  const isWatchStep = /mcp_debug_watch_steps|debug\.watch_steps/i.test(`${step.key} ${step.toolName}`);
  if (!isConfigStep && !isEventCheckStep && !isStartStep && !isWatchStep) return null;

  const server = findDebugAutomationServer(servers);
  if (!server) {
    return {
      ...step,
      kind: 'mcp',
      output: {
        status: 'not_configured',
        message: '自动联调 MCP 不通：未找到已启用且配置了 endpoint 的自动联调 MCP。',
      },
    };
  }

  if (isConfigStep || isEventCheckStep) {
    const message = isConfigStep
      ? '自动联调配置已确认，继续发起联调任务。'
      : '回传校验并入联调任务执行，继续读取联调步骤。';
    return {
      ...step,
      kind: 'mcp',
      toolName: `${server.name}.${isConfigStep ? 'debug_automation_create_task' : 'debug_automation_get_steps'}`,
      providerUrl: server.endpoint_url,
      output: {
        status: 'success',
        selected_server: server.name,
        selected_tool: isConfigStep ? 'debug_automation_create_task' : 'debug_automation_get_steps',
        message,
        response: {
          status: 'ready',
          message,
        },
      },
    };
  }

  if (isStartStep) {
    const createTool = pickDebugAutomationTool(server, ['debug_automation_create_task', 'debug.create_task']);
    const startTool = pickDebugAutomationTool(server, ['debug_automation_start_task', 'debug.start_task']);
    const taskTool = pickDebugAutomationTool(server, ['debug_automation_get_task', 'debug.get_task']);
    const taskId = `debug-task-${Date.now()}`;
    const config = {
      ...step.input,
      user_question: truncate(message, 1000),
      source: 'zhitou-chat',
    };
    if (!createTool || !startTool || !taskTool) {
      if (getDebugAutomationRestBase(server.endpoint_url)) {
        return createDebugAutomationRestTask(step, server, message, taskId, config);
      }
      return {
        ...step,
        kind: 'mcp',
        providerUrl: server.endpoint_url,
        output: {
          status: 'not_configured',
          selected_server: server.name,
          message: '自动联调 MCP 不通：未发现可创建、启动或查询任务的工具。',
          available_tools: server.tools.map(tool => tool.name).slice(0, 30),
        },
      };
    }

    const createResult = await callMcpTool(server, createTool, { task_id: taskId, config });
    if (isDebugMcpError(createResult)) {
      if (getDebugAutomationRestBase(server.endpoint_url)) {
        return createDebugAutomationRestTask(step, server, message, taskId, config, createResult);
      }
      return {
        ...step,
        kind: 'mcp',
        providerUrl: server.endpoint_url,
        output: {
          ...createResult,
          status: 'failed',
          selected_server: server.name,
          selected_tool: createTool?.name || '',
          message: '自动联调 MCP 不通：创建联调任务失败。',
        },
      };
    }

    const resolvedTaskId = pickDebugTaskId(createResult) || taskId;
    const startResult = await callMcpTool(server, startTool, { task_id: resolvedTaskId });
    const startResultText = (() => {
      try {
        return JSON.stringify(startResult);
      } catch {
        return '';
      }
    })();
    const startAlreadyRunning = /Cannot transition from DISPATCHING to DISPATCHING|already|running|dispatching/i.test(startResultText);
    if (isDebugMcpError(startResult) && !startAlreadyRunning) {
      if (getDebugAutomationRestBase(server.endpoint_url)) {
        return createDebugAutomationRestTask(step, server, message, resolvedTaskId, config, startResult);
      }
      return {
        ...step,
        kind: 'mcp',
        providerUrl: server.endpoint_url,
        output: {
          ...startResult,
          status: 'failed',
          selected_server: server.name,
          selected_tool: startTool.name,
          message: '自动联调 MCP 不通：启动联调任务失败。',
        },
      };
    }
    const taskResult = await callMcpTool(server, taskTool, { task_id: resolvedTaskId });
    if (isDebugMcpError(taskResult)) {
      if (getDebugAutomationRestBase(server.endpoint_url)) {
        return createDebugAutomationRestTask(step, server, message, resolvedTaskId, config, taskResult);
      }
      return {
        ...step,
        kind: 'mcp',
        providerUrl: server.endpoint_url,
        output: {
          ...taskResult,
          status: 'failed',
          selected_server: server.name,
          selected_tool: taskTool.name,
          message: '自动联调 MCP 不通：发起联调任务失败。',
        },
      };
    }

    return {
      ...step,
      kind: 'mcp',
      toolName: `${server.name}.${startTool.name}`,
      providerUrl: server.endpoint_url,
      input: { task_id: resolvedTaskId, config },
      output: {
        status: 'success',
        selected_server: server.name,
        selected_tool: startTool.name,
        message: '自动联调 MCP 已创建并启动任务。',
        response: {
          task_id: resolvedTaskId,
          create_result: parseDebugMcpPayload(createResult.response),
          start_result: parseDebugMcpPayload(startResult.response),
          start_status: startAlreadyRunning ? 'already_running' : 'started',
          task: parseDebugMcpPayload(taskResult.response),
        },
      },
    };
  }

  const taskId = pickDebugTaskId(step.input);
  const stepsTool = pickDebugAutomationTool(server, ['debug_automation_get_steps', 'debug.watch_steps']);
  const taskTool = pickDebugAutomationTool(server, ['debug_automation_get_task', 'debug.get_task']);
  const resultTool = pickDebugAutomationTool(server, ['debug_automation_get_result', 'debug.get_result']);
  if (!taskId || !stepsTool) {
    if (taskId && getDebugAutomationRestBase(server.endpoint_url)) {
      return readDebugAutomationRestTask(step, server, taskId);
    }
    return {
      ...step,
      kind: 'mcp',
      providerUrl: server.endpoint_url,
      output: {
        status: 'failed',
        selected_server: server.name,
        message: !taskId ? '自动联调 MCP 不通：缺少联调任务 ID。' : '自动联调 MCP 不通：未发现步骤查询工具。',
      },
    };
  }

  let taskResult: Awaited<ReturnType<typeof callMcpTool>> | null = null;
  let stepsResult: Awaited<ReturnType<typeof callMcpTool>> = await callMcpTool(server, stepsTool, { task_id: taskId });
  let finalResult: Awaited<ReturnType<typeof callMcpTool>> | null = null;
  let latestStepCount = -1;
  const buildWatchOutput = () => ({
    status: 'success',
    selected_server: server.name,
    selected_tool: stepsTool.name,
    message: '自动联调 MCP 已返回步骤。',
    response: {
      task_id: taskId,
      task: parseDebugMcpPayload(taskResult?.response),
      steps: parseDebugMcpPayload(stepsResult.response),
      result: parseDebugMcpPayload(finalResult?.response),
    },
  });
  const maxAttempts = 120;
  let stableTerminalCount = 0;
  let lastSnapshotCount = -1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    [taskResult, stepsResult, finalResult] = await Promise.all([
      taskTool ? callMcpTool(server, taskTool, { task_id: taskId }) : Promise.resolve(null),
      callMcpTool(server, stepsTool, { task_id: taskId }),
      resultTool ? callMcpTool(server, resultTool, { task_id: taskId }) : Promise.resolve(null),
    ]);
    if (isDebugMcpError(stepsResult)) break;
    const parsedSteps = parseDebugMcpPayload(stepsResult.response);
    const parsedTask = parseDebugMcpPayload(taskResult?.response);
    const parsedResult = parseDebugMcpPayload(finalResult?.response);
    const rawSteps = extractDebugAutomationStepRecords(parsedSteps);
    const status = readDebugAutomationStatus(parsedResult, parsedTask, parsedSteps);
    const isTerminalStatus = /success|failed|error|complete|done|manual/.test(status);
    if (rawSteps.length !== latestStepCount || attempt === 0 || isTerminalStatus) {
      latestStepCount = rawSteps.length;
      options?.onSnapshot?.({
        ...step,
        kind: 'mcp',
        toolName: `${server.name}.${stepsTool.name}`,
        providerUrl: server.endpoint_url,
        input: { task_id: taskId },
        output: buildWatchOutput(),
      });
    }
    if (rawSteps.length === lastSnapshotCount && isTerminalStatus) {
      stableTerminalCount += 1;
    } else {
      stableTerminalCount = 0;
    }
    lastSnapshotCount = rawSteps.length;
    if (isTerminalStatus && stableTerminalCount >= 2) break;
    await delay(2500);
  }
  if (isDebugMcpError(stepsResult)) {
    if (getDebugAutomationRestBase(server.endpoint_url)) {
      return readDebugAutomationRestTask(step, server, taskId, stepsResult);
    }
    return {
      ...step,
      kind: 'mcp',
      providerUrl: server.endpoint_url,
      output: {
        ...stepsResult,
        status: 'failed',
        selected_server: server.name,
        selected_tool: stepsTool.name,
        message: '自动联调 MCP 不通：读取联调步骤失败。',
      },
    };
  }
  return {
    ...step,
    kind: 'mcp',
    toolName: `${server.name}.${stepsTool.name}`,
    providerUrl: server.endpoint_url,
    input: { task_id: taskId },
    output: {
      status: 'success',
      selected_server: server.name,
      selected_tool: stepsTool.name,
      message: '自动联调 MCP 已返回步骤。',
      response: {
        task_id: taskId,
        task: parseDebugMcpPayload(taskResult?.response),
        steps: parseDebugMcpPayload(stepsResult.response),
        result: parseDebugMcpPayload(finalResult?.response),
      },
    },
  };
}

async function executeServiceStep(
  step: ServiceStep,
  intent: IntentType,
  message: string,
  options?: { onSnapshot?: (step: ServiceStep) => void },
): Promise<ServiceStep> {
  const inferredKind = step.kind || (step.key.startsWith('skill_') ? 'skill' : step.key.startsWith('mcp_') ? 'mcp' : undefined);
  if (inferredKind === 'skill') {
    return {
      ...step,
      kind: 'skill',
      prompt: `Match a reusable Skill workflow for intent=${intent}. Do not invent data; route concrete checks to MCP or knowledge tools.`,
      output: {
        ...step.output,
        status: 'matched',
        note: 'Skill matched; concrete data must come from MCP, knowledge base, or model reasoning.',
      },
    };
  }

  if (inferredKind !== 'mcp') return step;

  if (shouldTemporarilyPassMediaAppCheck(step, intent)) {
    return buildTemporaryMediaAppPass(step);
  }
  if (shouldUseDebugPrecheckSnapshot(step)) {
    return buildDebugPrecheckSnapshot(step);
  }

  const servers = await listMcpServers();
  const debugAutomationStep = await executeDebugAutomationMcpStep(step, intent, message, servers, options);
  if (debugAutomationStep) return debugAutomationStep;

  const collectionStep = await executeCollectionGatewayStep(step, intent, message, servers);
  if (collectionStep) return collectionStep;

  const strictPrefix = getStrictMcpPrefix(step.toolName);
  const selected = strictPrefix
    ? findStrictMcpTool(strictPrefix, servers)
    : selectMcpTool(intent, `${message} ${step.toolName} ${step.label} ${step.content}`, servers);
  const selectionOutput = {
    configured_server_count: servers.filter(server => server.enabled).length,
    required_tool: step.toolName,
    selected_server: selected?.server.name || '',
    selected_tool: selected?.tool.name || '',
    selection_reason: selected?.reason || (strictPrefix
      ? `no enabled MCP endpoint exposes tool prefix ${strictPrefix}`
      : 'no matching enabled MCP tool'),
  };

  if (!selected) {
    if (shouldTemporarilyPassMediaAppCheck(step, intent)) {
      return buildTemporaryMediaAppPass(step, {
        selected_server: '',
        selected_tool: '',
        selection_reason: selectionOutput.selection_reason,
      });
    }
    return {
      ...step,
      kind: 'mcp',
      prompt: `Select an enabled MCP tool for intent=${intent}. Prefer real report/config/debug tools. If none is available, return not_configured and do not fabricate data.`,
      output: {
        status: 'not_configured',
        ...selectionOutput,
        message: `未找到可调用的真实 MCP 工具：${step.toolName}。请在后台配置对应 MCP endpoint 并完成连接测试；当前不能用 mock 数据作为业务证据。`,
      },
    };
  }

  const callInput = {
    ...step.input,
    user_question: truncate(message, 1000),
    intent,
  };
  const result = await callMcpTool(selected.server, selected.tool, callInput);
  if (shouldTemporarilyPassMediaAppCheck(step, intent) && result.status !== 'success' && isMediaAuthFailure(result)) {
    return buildTemporaryMediaAppPass(step, {
      selected_server: selected.server.name,
      selected_tool: selected.tool.name,
      provider_url: selected.server.endpoint_url,
    });
  }
  return {
    ...step,
    kind: 'mcp',
    toolName: `${selected.server.name}.${selected.tool.name}`,
    providerUrl: selected.server.endpoint_url,
    prompt: `Call MCP tool ${selected.server.name}.${selected.tool.name} with the extracted business parameters. Use successful MCP output as evidence; disclose failures as unavailable.`,
    input: callInput,
    output: {
      ...selectionOutput,
      ...result,
      evidence_policy: result.status === 'success' ? 'may_cite' : 'unavailable_do_not_cite',
    },
  };
}

function buildServicePlan(intent: IntentType, message: string): {
  skill: { id: string; name: string };
  steps: ServiceStep[];
  sources: SourceRefPayload[];
} | null {
  const costQuestion = isCostQuestion(message);
  const activationDiffQuestion = isActivationDiffQuestion(message);
  const conversionDiffMetric = getConversionDiffMetric(message);

  if (intent === 'monitor') {
    return {
      skill: { id: 'ads_health_monitor_skill', name: '投放异常巡检' },
      steps: [
        {
          key: 'skill_ads_health_monitor',
          label: '调用Skill',
          content: '已匹配投放异常巡检流程，先做全链路监控检查，发现异常后再转入对应排查。',
          toolName: '投放异常巡检',
          input: { skill_id: 'ads_health_monitor_skill', question: truncate(message, 300) },
          output: { status: 'matched', next: 'collect_media_metric_asset_status' },
        },
        {
          key: 'mcp_collect_media_metric_asset_status',
          label: '检查指标资产',
          content: '检查媒体报表指标资产、项目上下文、账户授权和字段映射是否可用。',
          toolName: '统一采集网关 MCP.collect.media_metric_asset_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], media: 'auto_detect', metric_keys: ['cost', 'activation', 'register', 'payment'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_media_report_status',
          label: '检查媒体报表采集',
          content: '检查媒体 API 报表采集是否成功、是否延迟、是否空数据或授权失效。',
          toolName: '统一采集网关 MCP.collect.media_report_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], media: 'auto_detect', time_range: 'auto_detect', metrics: ['cost', 'impression', 'click'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_click_log_status',
          label: '检查点击日志',
          content: '检查媒体点击日志、监测链接参数和渠道包/分包匹配情况。',
          toolName: '统一采集网关 MCP.collect.click_log_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], media: 'auto_detect', time_range: 'auto_detect' },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_self_attribution_status',
          label: '检查自归因结果',
          content: '检查自归因匹配率、失败原因、延迟和重复归因情况。',
          toolName: '统一采集网关 MCP.collect.self_attribution_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], media: 'auto_detect', time_range: 'auto_detect', event_keys: ['activation', 'register', 'payment', 'key_action'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_platform_event_report_status',
          label: '检查数据上报',
          content: '检查平台数据上报报告、事件量、字段完整性、异常码和入库可见性。',
          toolName: '统一采集网关 MCP.collect.platform_event_report_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], time_range: 'auto_detect', event_keys: ['activation', 'register', 'payment', 'key_action'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_data_quality_status',
          label: '检查数据质量',
          content: '检查空值、不能为0、突增突降、重复、延迟和跨表一致性规则。',
          toolName: '统一采集网关 MCP.collect.data_quality_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], time_range: 'auto_detect', rule_keys: ['non_zero', 'spike_drop', 'delay', 'cross_table_consistency'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_scheduler_status',
          label: '检查调度状态',
          content: '检查采集、清洗、聚合、报表和告警任务的成功、重试、入库和最后更新时间。',
          toolName: '统一采集网关 MCP.collect.scheduler_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], time_range: 'auto_detect', job_types: ['collect', 'clean', 'aggregate', 'report', 'alert'] },
          output: { status: 'pending_real_mcp' },
        },
      ],
      sources: [
        {
          title: '统一采集网关 MCP',
          source: '采集链路观测',
          source_type: 'mcp',
          icon: 'mcp',
          prompt: '监控巡检必须来自真实采集网关 MCP；未接入时只披露缺口，不生成假巡检结论。',
        },
      ],
    };
  }

  if (intent === 'diagnosis' && costQuestion) {
    return {
      skill: { id: 'skill-002', name: '媒体消耗排查' },
      steps: [
        {
          key: 'skill_cost_diagnosis',
          label: '调用Skill',
          content: '已匹配媒体消耗排查流程',
          toolName: '媒体消耗排查',
          input: { skill_id: 'skill-002', metric: 'cost', question: truncate(message, 300) },
          output: { status: 'matched', next: 'query_cost_report' },
        },
        {
          key: 'mcp_query_cost_report',
          label: '查询智投报表',
          content: '通过报表MCP查询智投侧消耗实际值',
          toolName: '智投报表MCP.query_cost_report',
          input: { report: '投放消耗明细报表', metric: '消耗' },
          output: { report_name: '投放消耗明细报表', status: 'ready', schedule_interval: '20分钟' },
        },
        {
          key: 'mcp_check_report_schedule',
          label: '检查报表调度',
          content: '检查报表最近更新时间和调度状态',
          toolName: '智投报表MCP.check_report_schedule',
          input: { report: '投放消耗明细报表' },
          output: { status: 'ready', schedule_interval: '20分钟' },
        },
        {
          key: 'mcp_collect_media_report_status',
          label: '检查媒体采集',
          content: '检查媒体 API 消耗采集是否成功、是否延迟、是否空数据或授权失效。',
          toolName: '统一采集网关 MCP.collect.media_report_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], media: 'auto_detect', time_range: 'auto_detect', metrics: ['cost'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_check_user_scope',
          label: '检查数据权限',
          content: '检查账户、媒体和用户可见范围',
          toolName: '配置MCP.check_user_scope',
          input: { scope: 'account_media_visibility' },
          output: { status: 'ready' },
        },
      ],
      sources: [
        {
          title: '投放消耗明细报表',
          source: '智投报表MCP',
          source_type: 'report_mcp',
          report_name: '投放消耗明细报表',
          icon: 'report',
        },
      ],
    };
  }

  if (intent === 'diagnosis' && (activationDiffQuestion || conversionDiffMetric)) {
    const metric = conversionDiffMetric || { key: 'activation', label: '激活数' };
    return {
      skill: { id: 'metric_diff_diagnosis_skill', name: '指标差异排查' },
      steps: [
        {
          key: 'skill_conversion_diff_diagnosis',
          label: '调用Skill',
          content: `已匹配${metric.label}差异排查流程，先查两侧数据，再解释指标口径差异。`,
          toolName: '指标差异排查',
          input: { skill_id: 'metric_diff_diagnosis_skill', metric: metric.key, question: truncate(message, 300) },
          output: { status: 'matched', next: 'query_metric_compare' },
        },
        {
          key: 'mcp_query_metric_compare',
          label: `查询两侧${metric.label}`,
          content: `通过报表MCP优先查询媒体回传${metric.label}与 BI ${metric.label}，并计算差异。`,
          toolName: '智投报表MCP.query_metric_compare',
          kind: 'mcp',
          input: {
            report: '转化归因效果报表',
            metric: metric.label,
            compare_sources: ['媒体回传', 'BI'],
          },
          output: { report_name: '转化归因效果报表', status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_explain_conversion_metric',
          label: '对齐指标口径',
          content: `查询${metric.label}在媒体回传与 BI 报表中的统计口径差异。`,
          toolName: '智投报表MCP.explain_metric',
          kind: 'mcp',
          input: {
            metric: metric.label,
            compare_sources: ['媒体回传', 'BI'],
          },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_platform_event_report_status',
          label: '检查事件上报',
          content: '检查平台数据上报报告、事件量、字段完整性、异常码和入库可见性。',
          toolName: '统一采集网关 MCP.collect.platform_event_report_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], time_range: 'auto_detect', event_keys: [metric.key] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_collect_self_attribution_status',
          label: '检查自归因结果',
          content: '检查自归因匹配率、失败原因、延迟和重复归因情况。',
          toolName: '统一采集网关 MCP.collect.self_attribution_status',
          kind: 'mcp',
          input: { project_scope: ['current_or_all_projects'], media: 'auto_detect', time_range: 'auto_detect', event_keys: [metric.key] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_check_event_receive',
          label: '检查媒体回传',
          content: '在确认两侧数据和上报/归因链路后，再检查媒体回传状态。',
          toolName: '回传MCP.check_event_receive',
          kind: 'mcp',
          input: { event_scope: metric.key },
          output: { status: 'pending_real_mcp' },
        },
      ],
      sources: [
        {
          title: '转化归因效果报表',
          source: '智投报表MCP',
          source_type: 'report_mcp',
          report_name: '转化归因效果报表',
          icon: 'report',
        },
      ],
    };
  }

  if (intent === 'diagnosis') {
    return {
      skill: { id: 'skill-003', name: '回传链路巡检' },
      steps: [
        {
          key: 'skill_callback_check',
          label: '调用Skill',
          content: '已匹配回传链路巡检流程',
          toolName: '回传链路巡检',
          input: { skill_id: 'skill-003', question: truncate(message, 300) },
          output: { status: 'matched', next: 'check_event_receive' },
        },
        {
          key: 'mcp_check_event_receive',
          label: '检查事件接收',
          content: '通过回传MCP检查事件接收和媒体回传状态',
          toolName: '回传MCP.check_event_receive',
          input: { event_scope: 'activation_register_payment' },
          output: { status: 'ready' },
        },
      ],
      sources: [
        {
          title: '回传链路巡检',
          source: '回传MCP',
          source_type: 'mcp',
          icon: 'mcp',
        },
      ],
    };
  }

  if (intent === 'debugging') {
    return {
      skill: { id: 'auto_debug_skill', name: '自动联调' },
      steps: [
        {
          key: 'skill_auto_debug',
          label: '调用Skill',
          content: '已匹配自动联调流程。用户侧只需指定项目、媒体和终端；默认验证激活、注册、付费和关键行为，后台配置与 MCP 负责账号、应用共享、事件资产、设备、游戏登录和回传查看位置校验。',
          toolName: '自动联调',
          input: {
            skill_id: 'auto_debug_skill',
            question: truncate(message, 300),
            required_user_slots: ['project_scope', 'media', 'terminal'],
            default_targets: ['activation', 'register', 'payment', 'key_action'],
          },
          output: { status: 'matched', next: 'slot_check_then_debug_config_check' },
        },
        {
          key: 'mcp_debug_config_check',
          label: '检查后台配置',
          content: '检查媒体账号、事件资产、回传查看位置、渠道包、自动化关键字、游戏登录和设备配置。',
          toolName: '自动联调 MCP.debug.config_check',
          kind: 'mcp',
          input: { media: 'auto_detect', project_scope: ['current_project'], terminal: 'auto_detect', debug_targets: ['activation', 'register', 'payment', 'key_action'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_debug_media_app_check',
          label: '检查媒体应用',
          content: '通过媒体 MCP 检查默认账户下是否存在目标应用，必要时自动完成共享校验，并确认事件资产是否可访问。',
          toolName: '自动联调 MCP.debug.media_app_check',
          kind: 'mcp',
          input: { media: 'auto_detect', project_scope: ['current_project'], terminal: 'auto_detect', default_account: 'from_admin_config' },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_oceanengine_app_match',
          label: '匹配巨量应用',
          content: '当媒体为巨量时，通过巨量引擎 MCP 查询默认账户下的巨量应用，并用包名+终端匹配智投应用与巨量应用。',
          toolName: '巨量引擎 MCP.tools_app_management_android_app_list_v2',
          kind: 'mcp',
          input: { package_name: 'from_zhitou_app', terminal: 'auto_detect', default_account: 'from_admin_config', mode: 'query_only' },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_oceanengine_app_package_query',
          label: '查询巨量应用分包',
          content: '当媒体为巨量时，查询巨量应用下已有应用分包、审核状态和可联调状态；只读取已有结果，没有分包时返回阻塞项，不创建。',
          toolName: '巨量引擎 MCP.oceanengine.app_package_query',
          kind: 'mcp',
          input: { oceanengine_app_id: 'from_app_match', package_name: 'from_zhitou_app', terminal: 'auto_detect', mode: 'query_only' },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_zhitou_package_query',
          label: '查询智投分包',
          content: '当媒体不是巨量，或需要先确认智投侧包状态时，查询 QA 已通过官方渠道包和智投已有分包；只读取已有结果，没有分包时返回阻塞项。',
          toolName: '智投配置 MCP.zhitou_package.channel_package_query',
          kind: 'mcp',
          input: { media_scope: ['auto_detect'], project_scope: ['current_project'], package_name: 'from_zhitou_app', terminal: 'auto_detect', mode: 'query_only' },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_debug_event_report_check',
          label: '检查上报记录',
          content: '联调前检查平台事件上报是否已有记录，确认默认联调目标可验证。',
          toolName: '自动联调 MCP.debug.event_report_check',
          kind: 'mcp',
          input: { project_scope: ['current_project'], debug_targets: ['activation', 'register', 'payment', 'key_action'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_debug_start_task',
          label: '创建联调任务',
          content: '项目、媒体、终端和后台前置条件通过后自动发起联调任务，不再额外展示确认卡。',
          toolName: '自动联调 MCP.debug.start_task',
          kind: 'mcp',
          input: { media: 'auto_detect', project_scope: ['current_project'], terminal: 'auto_detect', debug_targets: ['activation', 'register', 'payment', 'key_action'] },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_debug_watch_steps',
          label: '观测联调过程',
          content: '读取 Web、Mobile/Game、回传轮询步骤、截图、错误日志和最终结论。',
          toolName: '自动联调 MCP.debug.watch_steps',
          kind: 'mcp',
          input: { task_id: 'from_debug_start_task' },
          output: { status: 'pending_real_mcp' },
        },
      ],
      sources: [
        { title: '自动联调记录', source: '自动联调 MCP', source_type: 'mcp', icon: 'mcp' },
      ],
    };
  }

  if (/(监测链接|链接创建|创建链接|获取链接|查询链接|tracking[_\s-]?link|deeplink)/i.test(message)) {
    const trackingContext = buildTrackingLinkRequestContext(message);
    const trackingInput: Record<string, unknown> = { ...trackingContext };
    const createSteps = trackingContext.action === 'create'
      ? [
          {
            key: 'mcp_tracking_link_precheck',
            label: '创建前预检',
            content: '检查项目、媒体、包、分包、归因参数、事件配置和投放可用性。',
            toolName: '监测链接 MCP.tracking_link.precheck',
            kind: 'mcp' as const,
            input: trackingInput,
            output: { status: 'pending_real_mcp' },
          },
          {
            key: 'mcp_tracking_link_create',
            label: '创建监测链接',
            content: '有权限且预检通过后创建新监测链接。',
            toolName: '监测链接 MCP.tracking_link.create',
            kind: 'mcp' as const,
            input: trackingInput,
            output: { status: 'pending_real_mcp' },
          },
        ]
      : [];

    return {
      skill: { id: 'tracking_link_delivery_skill', name: '监测链接交付' },
      steps: [
        {
          key: 'skill_tracking_link_delivery',
          label: '调用Skill',
          content: '已匹配监测链接交付流程，优先查询已有可用链接；无链接且有权限时创建新链接。',
          toolName: '监测链接交付',
          input: { skill_id: 'tracking_link_delivery_skill', ...trackingContext, question: truncate(message, 300) },
          output: { status: 'matched', next: trackingContext.action === 'create' ? 'create_tracking_link' : 'query_tracking_link' },
        },
        {
          key: 'mcp_tracking_link_permission_check',
          label: '检查权限',
          content: '检查当前用户是否具备查询或创建监测链接的权限。',
          toolName: '监测链接 MCP.tracking_link.permission_check',
          kind: 'mcp',
          input: { ...trackingContext, action: trackingContext.action },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_tracking_link_query',
          label: '查询已有链接',
          content: '查询已有可用监测链接，返回链接、适用包、媒体、状态和校验结果。',
          toolName: '监测链接 MCP.tracking_link.query',
          kind: 'mcp',
          input: trackingInput,
          output: { status: 'pending_real_mcp' },
        },
        ...createSteps,
        {
          key: 'mcp_tracking_link_audit_log',
          label: '记录交付日志',
          content: '记录监测链接查询或创建日志，保留来源和失败原因。',
          toolName: '监测链接 MCP.tracking_link.audit_log',
          kind: 'mcp',
          input: { ...trackingContext, status: 'pending' },
          output: { status: 'pending_real_mcp' },
        },
      ],
      sources: [
        { title: '监测链接交付记录', source: '监测链接 MCP', source_type: 'mcp', icon: 'mcp' },
      ],
    };
  }

  if (/(日报|周报|月报|自动报表|定时发送|每天.*报表|每周.*报表|报表模板|拼表|Excel\s*模板|excel\s*模板)/i.test(message)) {
    const reportTemplateInput = {
      requirement: truncate(message, 1000),
      template: {
        source: /excel/i.test(message) ? 'excel_template' : 'text_template',
        metrics: /消耗|花费|cost|spend/i.test(message) ? ['消耗'] : ['待识别指标'],
        dimensions: ['项目', '媒体'],
        schedule: message.match(/(?:上午|下午)?\s*\d{1,2}\s*点/)?.[0] || '',
      },
    };

    return {
      skill: { id: 'scheduled_report_skill', name: '自动报表' },
      steps: [
        {
          key: 'skill_report_template_builder',
          label: '调用Skill',
          content: '已匹配自动报表流程，先提炼模板，再校验指标、预览数据，最后创建定时报表任务。',
          toolName: '自动报表',
          input: { skill_id: 'scheduled_report_skill', question: truncate(message, 300) },
          output: { status: 'matched', next: 'parse_report_template' },
        },
        {
          key: 'mcp_report_parse_template',
          label: '提炼报表模板',
          content: '从文本需求或标准二维 Excel 模板中提炼报表结构、维度、指标、频率和接收对象。',
          toolName: '报表编排 MCP.report.parse_template',
          kind: 'mcp',
          input: reportTemplateInput,
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_report_validate_metrics',
          label: '校验指标',
          content: '校验报表模板中的指标是否存在、口径是否明确，只列出有问题的指标。',
          toolName: '报表编排 MCP.report.validate_metrics',
          kind: 'mcp',
          input: reportTemplateInput,
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_report_preview',
          label: '预览数据',
          content: '基于已确认模板调用多个报表或数仓工具拉取数据，并返回类 Excel 数据预览。',
          toolName: '报表编排 MCP.report.preview',
          kind: 'mcp',
          input: { ...reportTemplateInput, report_date: 'auto_detect' },
          output: { status: 'pending_real_mcp' },
        },
        {
          key: 'mcp_scheduled_report_create',
          label: '创建定时任务',
          content: '数据预览确认后创建定时报表任务。',
          toolName: '报表编排 MCP.scheduled_report.create',
          kind: 'mcp',
          input: { ...reportTemplateInput, schedule: reportTemplateInput.template.schedule || '待确认' },
          output: { status: 'pending_real_mcp' },
        },
      ],
      sources: [
        { title: '自动报表任务', source: '报表编排 MCP', source_type: 'mcp', icon: 'mcp' },
      ],
    };
  }

  if (/报表|查数|roi|ROI|消耗|激活|注册|付费|campaign/i.test(message)) {
    return {
      skill: { id: 'skill-001', name: '自然语言查数' },
      steps: [
        {
          key: 'skill_report_query',
          label: '调用Skill',
          content: '已匹配自然语言查数流程',
          toolName: '自然语言查数',
          input: { skill_id: 'skill-001', question: truncate(message, 300) },
          output: { status: 'matched', next: 'query_report' },
        },
        {
          key: 'mcp_query_report',
          label: '查询智投报表',
          content: '通过报表MCP查询指标数据和口径',
          toolName: '智投报表MCP.query_report',
          input: { report: '广告投放效果报表' },
          output: { report_name: '广告投放效果报表', status: 'ready' },
        },
      ],
      sources: [
        {
          title: '广告投放效果报表',
          source: '智投报表MCP',
          source_type: 'report_mcp',
          report_name: '广告投放效果报表',
          icon: 'report',
        },
      ],
    };
  }

  return null;
}

function buildServiceExecutionContext(servicePlan: ReturnType<typeof buildServicePlan>): string {
  if (!servicePlan) return '';
  const stepLines = servicePlan.steps.map((step, index) => {
    const status = String(step.output?.status || 'unknown');
    const selectedTool = String(step.output?.selected_tool || step.toolName || '');
    const message = String(step.output?.message || step.output?.error || step.output?.note || '');
    return `${index + 1}. ${step.label} | ${selectedTool} | status=${status}${message ? ` | ${message}` : ''}`;
  });

  return [
    `本轮已匹配业务 Skill：${servicePlan.skill.name} (${servicePlan.skill.id})。`,
    '以下是已执行的 Skill/MCP 结果，只能引用 status=success 的真实结果；not_configured 或 failed 只能作为能力缺口披露，不能当作业务事实：',
    ...stepLines,
  ].join('\n');
}

function buildInspectionResultPayload(servicePlan: ReturnType<typeof buildServicePlan>): Record<string, unknown> {
  const steps = servicePlan?.steps || [];
  const layers = steps
    .filter(step => step.kind === 'mcp' || step.key.startsWith('mcp_'))
    .map((step, index) => {
      const status = String(step.output?.status || 'unknown');
      return {
        index: index + 1,
        key: step.key,
        name: step.label,
        tool: String(step.output?.selected_tool || step.toolName),
        status,
        available: status === 'success',
        message: String(step.output?.message || step.output?.error || step.content || ''),
      };
    });
  const unavailableCount = layers.filter(layer => !layer.available).length;
  const successCount = layers.length - unavailableCount;

  return {
    skill_id: servicePlan?.skill.id || '',
    skill_name: servicePlan?.skill.name || '',
    total_layers: layers.length,
    success_count: successCount,
    unavailable_count: unavailableCount,
    conclusion: unavailableCount > 0
      ? '巡检依赖的真实采集 MCP 尚未全部可用，当前只能披露能力缺口，不能生成真实巡检结论。'
      : '巡检能力已完成调用，可基于返回结果生成监控结论。',
    layers,
  };
}

function buildDebugWorkbenchPayload(servicePlan: ReturnType<typeof buildServicePlan>): Record<string, unknown> {
  const steps = servicePlan?.steps || [];
  const mcpSteps = steps
    .filter(step => step.kind === 'mcp' || step.key.startsWith('mcp_'))
    .map((step, index) => {
      const status = String(step.output?.status || 'unknown');
      const failed = status === 'not_configured' || status === 'failed';
      return {
        index: index + 1,
        key: step.key,
        name: step.label,
        tool: String(step.output?.selected_tool || step.toolName),
        status,
        available: failed ? false : status === 'success' ? true : undefined,
        message: String(step.output?.message || step.output?.error || step.content || ''),
        input: step.input,
        response: step.output?.response,
        provider: step.output?.selected_server,
        raw_output: step.output,
      };
    });
  const watchStep = steps.find(step => step.key === 'mcp_debug_watch_steps');
  const watchResponse = asPlainRecord(watchStep?.output?.response);
  const watchRestBase = getDebugAutomationRestBase(String(watchStep?.providerUrl || ''));
  const returnedDebugSteps = extractDebugAutomationStepRecords(watchResponse?.steps || watchResponse)
    .map((item, index) => watchRestBase ? normalizeRestDebugStep(item, index, watchRestBase) : item);
  const startStep = steps.find(step => step.key === 'mcp_debug_start_task');
  const startResponse = asPlainRecord(startStep?.output?.response);
  const startedTaskId = pickDebugTaskId(startStep?.output) || pickDebugTaskId(startStep?.input);
  const resultStatus = readDebugAutomationStatus(watchResponse?.result, watchResponse?.task, startResponse?.task, watchResponse);
  const componentStatus = /success|done|complete|passed/.test(resultStatus)
    ? 'success'
    : /fail|error|blocked|manual/.test(resultStatus)
      ? 'failed'
      : 'running';
  const displayDebugSteps = returnedDebugSteps.length > 0 && componentStatus === 'running'
    ? [
      ...returnedDebugSteps,
      {
        index: returnedDebugSteps.length + 1,
        key: 'debug-waiting-result',
        name: '等待联调结果',
        status: 'running',
        message: '联调任务仍在执行，正在等待服务返回最新结果。',
        sub_steps: [{ index: 1, name: '等待服务返回最新结果', status: 'running' }],
      },
    ]
    : returnedDebugSteps;
  const componentSteps = displayDebugSteps.length > 0
    ? [{
      index: 1,
      key: 'debug-automation-returned-steps',
      name: '自动联调步骤',
      tool: String(watchStep?.output?.selected_tool || watchStep?.toolName || 'debug_automation_get_steps'),
      status: componentStatus,
      available: true,
      message: String(watchStep?.output?.message || '自动联调服务已返回步骤。'),
      response: { steps: displayDebugSteps },
      raw_output: watchStep?.output,
    }]
    : (startResponse || startedTaskId)
      ? [{
        index: 1,
        key: 'debug-automation-task',
        name: '联调任务',
        tool: String(startStep?.output?.selected_tool || startStep?.toolName || 'debug_automation_get_task'),
        status: componentStatus,
        available: true,
        message: String(startStep?.output?.message || '自动联调 MCP 已返回任务详情。'),
        response: startResponse || { task_id: startedTaskId, status: 'running', current_step: '等待任务详情返回' },
        raw_output: startStep?.output,
      }]
      : mcpSteps;
  const blocked = mcpSteps.some(step => step.available === false);
  const taskDetail = {
    task_id: pickDebugTaskId(watchResponse) || startedTaskId || '',
    task: watchResponse?.task || startResponse?.task || null,
    result: watchResponse?.result || null,
    create_result: startResponse?.create_result || null,
    start_result: startResponse?.start_result || null,
    steps: watchResponse?.steps || null,
    latest_response: watchResponse || startResponse || null,
    tool_outputs: mcpSteps,
  };
  return {
    skill_id: servicePlan?.skill.id || '',
    skill_name: servicePlan?.skill.name || '',
    media: 'auto_detect',
    default_targets: ['activation', 'register', 'payment', 'key_action'],
    shared_account: 'wuyanlan@dobest.com',
    status: blocked ? 'blocked' : componentStatus,
    conclusion: blocked
      ? '自动联调依赖的真实 MCP 或后台配置尚未可用，当前不能发起真实联调。'
      : '自动联调前置检查已通过，可以进入步骤观测。',
    task_detail: taskDetail,
    steps: componentSteps,
    logs: mcpSteps,
  };
}

function buildDebugFinalAnswer(debugPayload: Record<string, unknown>): string {
  const status = String(debugPayload.status || '').toLowerCase();
  const steps = extractDebugAutomationStepRecords(debugPayload.steps || debugPayload.task_detail);
  const failedStep = [...steps].reverse().map(item => asPlainRecord(item)).find((step) => {
    const stepStatus = String(step?.status || '').toLowerCase();
    return /fail|error|blocked/.test(stepStatus);
  });
  if (/success|done|complete|passed/.test(status)) {
    return '联调通过。';
  }
  if (/fail|error|blocked/.test(status)) {
    const name = String(failedStep?.name || failedStep?.step_name || failedStep?.stepName || '当前步骤');
    const reason = String(failedStep?.message || failedStep?.errorMessage || failedStep?.error_message || debugPayload.conclusion || '请查看联调日志确认原因');
    return `联调失败，卡在「${name}」：${reason}`;
  }
  return '';
}

function pushDebugWorkbenchEvent(
  push: (payload: unknown) => void,
  servicePlan: ReturnType<typeof buildServicePlan>,
  intent: IntentType,
  message: string,
) {
  if (intent !== 'debugging' || !servicePlan) return;
  const debugPayload = buildDebugWorkbenchPayload(servicePlan);
  push({
    type: 'process_event',
    event: createProcessEvent({
      id: `debug-workbench-${servicePlan.skill.id}`,
      type: 'ui.component_rendered',
      label: '自动联调',
      status: hasUnavailableMcpStep(servicePlan) ? 'error' : 'success',
      summary: String(debugPayload.conclusion || ''),
      completed_at: new Date().toISOString(),
      skill_id: servicePlan.skill.id,
      skill_name: servicePlan.skill.name,
      ui_component: {
        type: 'debug_workbench',
        title: '自动联调',
        payload: debugPayload,
      },
      input: { intent, question: truncate(message, 300) },
      output: debugPayload,
    }),
  });
}

function buildReportWorkflowPayload(servicePlan: ReturnType<typeof buildServicePlan>, message: string): Record<string, unknown> {
  const steps = servicePlan?.steps || [];
  const mcpSteps = steps
    .filter(step => step.kind === 'mcp' || step.key.startsWith('mcp_'))
    .map((step, index) => {
      const status = String(step.output?.status || 'unknown');
      return {
        index: index + 1,
        key: step.key,
        name: step.label,
        tool: String(step.output?.selected_tool || step.toolName),
        status,
        available: status === 'success',
        message: String(step.output?.message || step.output?.error || ''),
        response: step.output?.response,
      };
    });
  const blocked = mcpSteps.some(step => !step.available);
  return {
    requirement: truncate(message, 500),
    status: blocked ? 'blocked' : 'ready',
    template: {
      name: /周报/.test(message) ? '广告投放周报' : /月报/.test(message) ? '广告投放月报' : '广告消耗日报',
      frequency: /每周|周报/.test(message) ? 'weekly' : /每月|月报/.test(message) ? 'monthly' : 'daily',
      schedule: message.match(/(?:上午|下午)?\s*\d{1,2}\s*点/)?.[0] || '待确认',
      metrics: ['消耗'],
      dimensions: ['项目', '媒体'],
    },
    conclusion: blocked
      ? '自动报表依赖的真实报表编排 MCP 尚未全部可用，当前不能创建真实报表任务。'
      : '报表模板、数据预览和定时任务能力已完成调用，可进入确认和交付。',
    steps: mcpSteps,
  };
}

function hasUnavailableMcpStep(servicePlan: ReturnType<typeof buildServicePlan>): boolean {
  return Boolean(servicePlan?.steps.some((step) => {
    const status = String(step.output?.status || '');
    return (step.kind === 'mcp' || step.key.startsWith('mcp_')) && (status === 'not_configured' || status === 'failed');
  }));
}

function buildServiceBlockedAnswer(servicePlan: NonNullable<ReturnType<typeof buildServicePlan>>): string {
  const blockedSteps = servicePlan.steps
    .filter((step) => {
      const status = String(step.output?.status || '');
      return (step.kind === 'mcp' || step.key.startsWith('mcp_')) && (status === 'not_configured' || status === 'failed');
    })
    .slice(0, 5)
    .map((step, index) => `${index + 1}. ${step.label}：${String(step.output?.message || step.output?.error || '真实 MCP 不可用')}`);

  return [
    `当前不能完成${servicePlan.skill.name}的端到端交付。`,
    '',
    '## 阻塞原因',
    ...blockedSteps,
    '',
    '## 需要补齐',
    '请在后台为上述能力配置真实 MCP endpoint 并完成连接测试。当前不会用示例数据或 mock 结果替代真实业务证据。',
  ].join('\n');
}

async function resolveKnowledgeBaseIds(
  modelServiceConfig: Awaited<ReturnType<typeof getModelServiceConfig>>,
): Promise<string[]> {
  const explicitId = getKnowledgeBaseId(modelServiceConfig);
  if (explicitId) {
    return [explicitId];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  let response: Response;
  try {
    response = await fetch(getKnowledgeBasesEndpoint(modelServiceConfig), {
      headers: {
        'X-API-Key': getKnowledgeBaseApiKey(modelServiceConfig),
      },
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
  const data = await response.json().catch(() => ({})) as {
    success?: boolean;
    data?: KnowledgeBaseItem[];
    error?: { message?: string };
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || `获取知识库列表失败（HTTP ${response.status}）`);
  }

  return (data.data || [])
    .map(item => item.id?.trim())
    .filter((item): item is string => Boolean(item));
}

async function searchKnowledge(
  query: string,
  modelServiceConfig: Awaited<ReturnType<typeof getModelServiceConfig>>,
): Promise<{ items: KnowledgeSearchItem[]; warning?: string; resolvedCount?: number }> {
  if (!hasConfiguredKnowledgeCredentials(modelServiceConfig)) {
    return { items: [] };
  }

  let knowledgeBaseIds: string[];
  try {
    knowledgeBaseIds = await resolveKnowledgeBaseIds(modelServiceConfig);
  } catch (error) {
    return {
      items: [],
      warning: error instanceof Error && error.name === 'AbortError'
        ? '知识库列表获取超过 4 秒，已跳过本轮检索，继续使用 MCP 和模型推理。'
        : `知识库列表获取失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (!knowledgeBaseIds.length) {
    return {
      items: [],
      warning: '当前 API Key 下没有可访问的知识库，本次未启用知识检索。',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch(getKnowledgeSearchEndpoint(modelServiceConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': getKnowledgeBaseApiKey(modelServiceConfig),
      },
      body: JSON.stringify({
        query,
        knowledge_base_ids: knowledgeBaseIds,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    return {
      items: [],
      warning: error instanceof Error && error.name === 'AbortError'
        ? '知识库检索超过 6 秒，已跳过本轮检索，继续使用 MCP 和模型推理。'
        : `知识库检索失败：${error instanceof Error ? error.message : String(error)}`,
      resolvedCount: knowledgeBaseIds.length,
    };
  } finally {
    clearTimeout(timer);
  }
  const data = await response.json().catch(() => ({})) as {
    success?: boolean;
    data?: KnowledgeSearchItem[];
    error?: { message?: string };
  };

  if (!response.ok || !data.success) {
    return {
      items: [],
      warning: data.error?.message || `知识库检索失败（HTTP ${response.status}）`,
      resolvedCount: knowledgeBaseIds.length,
    };
  }

  return {
    items: (data.data || []).slice(0, 5),
    resolvedCount: knowledgeBaseIds.length,
  };
}

function buildSystemPrompt(knowledgeItems: KnowledgeSearchItem[]): string {
  const knowledgeSection = knowledgeItems.length
    ? `\n\n以下是可直接引用的知识库上下文：\n${knowledgeItems.map((item, index) =>
      `【知识库${index + 1}】${item.knowledge_title ? `${item.knowledge_title}\n` : ''}${item.content || ''}`).join('\n\n')}`
    : '';

  const today = new Date().toISOString().slice(0, 10);

  return `你是智投chat的广告技术支持助手。你要用产品语言帮助用户推进问题解答、数据排查、对接需求和自动联调。
当前日期是 ${today}。不要把 ${today} 判定为未来日期。智投报表数据实时接入，常规调度间隔约 20 分钟。

回答要求：
1. 使用清晰 Markdown，标题必须使用二级标题，例如“## 结论”，不要把“**结论**”当标题输出。
2. 每个区块内容要短句化、可扫读；能列表就用列表，不要堆成长段落。
3. 如果需要用户补充信息，必须输出“## 需要补充的信息”，不要放在“下一步建议”里。
4. 如果有知识库上下文，必须优先引用知识库信息，不要编造。
5. 不要暴露内部实现细节，不要提 SDK、接口分层、工作区等研发术语。
6. 对排查、需求、联调类问题，要给出可继续交互的下一步，而不是一次性文本结束。
7. 如果指标是“消耗”，不要默认排查监测回传异常、渠道号、分包 ID、监测链接或包体配置。消耗差异优先排查：媒体数据采集是否正常、报表调度是否完成、用户权限/账户授权是否可见、账号/媒体/日期筛选是否一致。
8. 只有排查激活、注册、付费等转化类指标时，才优先检查监测回传、事件映射、归因窗口、监测链接和包体配置。
9. 不要要求用户提供“系统实际值”作为前置条件；系统实际值应优先通过已接入的报表能力查询。
10. 当用户询问激活数、注册数、付费数等统计口径时，回答必须覆盖：埋点位置、上报事件、关键上报字段、上报方、上报后的计算过程、可能歧义、不同报表差异。知识库未提供具体字段时，要明确说明“等待知识库补充”，但仍给出应检查的字段类别。
11. 回答要主动做文本优化：把原始工具结果改写成面向发行同学可读的结论、依据和动作。
12. 如果流程、链路、排查路径适合画图，请输出一个 \`\`\`mermaid 代码块，使用 flowchart TD 展示。

Agent / Skill / MCP 工作流要求：
- 先思考再执行：在输出正文前，必须先完成意图推理、能力检查、必要参数提取、知识或工具可用性判断。
- 不要只靠关键词直接跳到下一步；如果当前工具、Skill、MCP 不足以交付，第一句话直接说明“当前不能完成”，并列出缺少的能力或参数。
- 所有依赖用户确认的信息要一次性合并成一个结构化确认，不要拆成多轮零散追问。
- 能用动态组件、表单、表格、流程卡完成的，不要返回大段文档式建议；按步骤流式输出“正在识别、正在检查、正在调用、等待确认、已完成”。
- Skill / MCP / Agent 的调用结果必须区分：已真实调用、待用户确认后调用、不可用。不可用时禁止用示例数据替代真实结果。
- 交付目标是闭环：能创建任务就创建任务，能查数就查数，能联调就进入联调观测；不能交付时明确阻塞项，而不是把阻塞项写成下一步建议。

证据使用规则：
- 只能引用已采纳的知识库片段和成功返回的 MCP / Tool 结果。
- 如果 MCP / Tool / 网页搜索不可用或调用失败，必须说明不可用，不能当作事实依据。
- 不要把 ready、mock、示例状态写成真实结论。
- 不要用 **加粗标签** 模拟标题；标题使用“## 标题”，内容使用有序列表。
- 最终回答必须说明关键信息来源：Dataki 知识库、智投报表 MCP、其他 MCP / Tool、网页搜索或模型推理。
来源呈现规则：
- 来源、MCP、Skill、网页查询由前端结构化来源模块展示，正文底部不要再输出“关键信息来源 / 信息来源 / 参考来源”区块。
- 如果确实需要在正文中说明依据，只写“依据现有可用信息”，不要重复列来源清单。
指标解释器模板：
- 当用户询问指标口径，优先按“定义 / 采集位置 / 上报事件 / 关键字段 / 计算过程 / 常见歧义 / 不同报表差异 / 需要补充的知识库字段”组织。
- 激活、注册、付费类指标必须区分事件发生、上报、归因、入库、报表聚合五个阶段。
- 不确定的字段不要编造，写“等待知识库补充”，并说明应该由哪类系统或角色补充。${knowledgeSection}`;
}

function buildThinkingStep(
  key: string,
  label: string,
  content: string,
  status: 'loading' | 'completed' | 'error',
  startedAt: number,
  input?: Record<string, unknown>,
  output?: Record<string, unknown>,
) {
  return {
    type: 'thinking_step',
    step: {
      key,
      label,
      content,
      status,
      started_at: startedAt,
      duration_ms: Date.now() - startedAt,
      input,
      output,
    },
  };
}

export async function POST(request: NextRequest) {
  const {
    message,
    history = [],
    intent: providedIntent,
  } = (await request.json()) as ChatRequestBody;

  const frontendParams = {
    history_count: history.length,
    pathname: request.headers.get('x-pathname') || '/',
    user_agent: truncate(request.headers.get('user-agent') || '', 200),
  };
  const intent: IntentType = (providedIntent as IntentType | undefined) || routeUserIntent(message).intent_type;
  const conversationId = request.headers.get('x-conversation-id') || undefined;
  const modelServiceConfig = await getModelServiceConfig();
  const metricExplainerSchema = intent === 'help' && isMetricExplanationOnly(message)
    ? await findMetricExplainerByQuestion(message)
    : null;

  if (!hasConfiguredModelCredentials(modelServiceConfig)) {
    const fallbackAnswer = buildFallbackAnswer(intent, message);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const processEvents: AgentProcessEvent[] = [];
        const push = (payload: unknown) => pushChatSsePayload(controller, encoder, payload, processEvents);
        const startedAt = Date.now();
        push({ type: 'phase', phase: 'generating' });
        push({ type: 'route', intent, hasThinking: false, toolsUsed: [] });
        push(buildThinkingStep('agent-route', '识别处理路径', `已进入${getIntentDisplayName(intent)}处理路径`, 'completed', startedAt, { message }, { intent, intent_label: getIntentDisplayName(intent) }));
        push(buildThinkingStep('model-fallback', '生成兜底回复', '模型服务未配置，返回本地可执行建议', 'completed', startedAt));
        push({ type: 'error', error: '正式模型服务未配置，当前返回本地兜底结果。' });
        push({ type: 'content', content: fallbackAnswer });
        const result = buildStructuredResult(intent, fallbackAnswer);
        if (metricExplainerSchema) {
          result.structured_payload = {
            metric_explainer: metricExplainerSchema,
            source_refs: metricSchemaToSourceRefs(metricExplainerSchema),
          };
        }
        push({
          type: 'done',
          result,
          metadata: metricExplainerSchema ? {
            metric_explainer_schema: metricExplainerSchema,
            source_refs: metricSchemaToSourceRefs(metricExplainerSchema),
          } : undefined,
        });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  if (metricExplainerSchema && intent === 'help') {
    const answer = buildMetricExplainerAnswer(metricExplainerSchema);
    const metricSourceRefs = metricSchemaToSourceRefs(metricExplainerSchema);
    const result = buildStructuredResult(intent, answer);
    result.structured_payload = {
      metric_explainer: metricExplainerSchema,
      source_refs: metricSourceRefs,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const processEvents: AgentProcessEvent[] = [];
        const push = (payload: unknown) => pushChatSsePayload(controller, encoder, payload, processEvents);
        const startedAt = Date.now();
        push({ type: 'phase', phase: 'thinking' });
        push({ type: 'route', intent, hasThinking: true, toolsUsed: ['metric_explainer_skill'] });
        push(buildThinkingStep('agent-route', '识别处理路径', '已识别为指标口径解释问题，进入指标解释器', 'completed', startedAt, { message }, { intent, answer_type: metricExplainerSchema.answer_type }));
        push({
          type: 'tool_call',
          name: 'metric_explainer_skill',
          kind: 'skill',
          display_name: '指标解释器',
          prompt: '按 metric_explainer_v1 schema 输出定义、来源、上报、计算、差异和下一步动作。',
          step_key: 'metric_explainer',
          arguments: JSON.stringify({ metric_id: metricExplainerSchema.metric_id, metric_name: metricExplainerSchema.metric_name }),
        });
        push({
          type: 'tool_result',
          name: 'metric_explainer_skill',
          kind: 'skill',
          display_name: '指标解释器',
          prompt: '按 metric_explainer_v1 schema 输出定义、来源、上报、计算、差异和下一步动作。',
          step_key: 'metric_explainer',
          result: JSON.stringify({ status: 'success', component_count: metricExplainerSchema.components.length, source_count: metricSourceRefs.length }),
        });
        push(buildThinkingStep('metric_explainer', '生成指标解释组件', '已生成结构化指标解释卡片和来源', 'completed', startedAt, { metric_id: metricExplainerSchema.metric_id }, { component_count: metricExplainerSchema.components.length }));
        pushSourceAttachedEvents(push, metricSourceRefs);
        push({
          type: 'process_event',
          event: createProcessEvent({
            type: 'ui.component_rendered',
            label: '渲染指标解释器',
            status: 'success',
            summary: '已按结构化指标资料生成指标解释组件。',
            completed_at: new Date().toISOString(),
            skill_id: 'metric_explainer_skill',
            skill_name: '指标解释器',
            source_refs: metricSourceRefs,
            ui_component: {
              type: 'metric_explainer',
              title: metricExplainerSchema.metric_name || '指标解释器',
              payload: { metric_id: metricExplainerSchema.metric_id },
            },
            input: { metric_id: metricExplainerSchema.metric_id },
            output: { component_count: metricExplainerSchema.components.length, source_count: metricSourceRefs.length },
          }),
        });
        push({ type: 'phase', phase: 'generating' });
        push({ type: 'content', content: answer });
        push({
          type: 'done',
          result,
          metadata: {
            metric_explainer_schema: metricExplainerSchema,
            source_refs: metricSourceRefs,
          },
        });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const llmClient = new LLMClient(buildModelSdkConfig(modelServiceConfig));
  const modelName = modelServiceConfig.modelName;
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const processEvents: AgentProcessEvent[] = [];
      const push = (payload: unknown) => {
        pushChatSsePayload(controller, encoder, payload, processEvents, () => closed);
      };

      try {
        let fullResponse = '';
        let toolSummary: Record<string, unknown> = {};
        let finalKnowledgeResult: Awaited<ReturnType<typeof searchKnowledge>> = { items: [] };
        let ambiguityOutcome: Awaited<ReturnType<typeof attemptAmbiguityClarification>> | null = null;
        let capabilityDiscoveryOutcome: Awaited<ReturnType<typeof attemptCapabilityDiscovery>> | null = null;
        const servicePlan = buildServicePlan(intent, message);

        await cozeLoopTracer.traceable(async (rootSpan) => {
          cozeLoopTracer.setInput(rootSpan, buildChatTraceInput(message, {
            conversation_id: conversationId,
            agent_id: `agent_xiaoqiao_${intent}`,
            frontend_params: frontendParams,
          }));

          push({ type: 'phase', phase: 'thinking' });
          const routeStartedAt = Date.now();
          push(buildThinkingStep('agent-route', '识别处理路径', '正在判断问题类型和处理方式', 'loading', routeStartedAt, { message, history_count: history.length }));

          await cozeLoopTracer.traceable(async (agentSpan) => {
            const selectedTools = [
              ...(servicePlan ? [servicePlan.skill.name, ...servicePlan.steps.map(step => step.toolName)] : []),
              ...(hasConfiguredKnowledgeCredentials(modelServiceConfig) ? ['search_knowledge'] : []),
              'llm',
            ];

            cozeLoopTracer.setInput(agentSpan, {
              intent,
              question: truncate(message, 1000),
              history_count: history.length,
            });
            cozeLoopTracer.setOutput(agentSpan, {
              plan_steps: [
                '识别意图',
                servicePlan ? '调用业务Skill' : '判断无需调用业务Skill',
                servicePlan ? '调用MCP工具' : '跳过MCP工具',
                '尝试知识检索',
                '结合知识上下文生成回答',
              ],
              selected_tools: selectedTools,
              agent_version: '2026-05-12.chat-trace-v2',
              status: 'success',
            });
            push(buildThinkingStep('agent-route', '识别处理路径', `已进入${getIntentDisplayName(intent)}处理路径`, 'completed', routeStartedAt, { message, history_count: history.length }, { intent, intent_label: getIntentDisplayName(intent), selected_tools: selectedTools }));
            push({
              type: 'process_event',
              event: buildCapabilityCheckedEvent({
                label: '检查可用能力',
                summary: servicePlan
                  ? `已匹配 ${servicePlan.skill.name}，继续检查 MCP、知识库和模型能力。`
                  : '当前问题未匹配固定业务 Skill，将使用知识库和模型能力处理。',
                input: { intent, selected_tools: selectedTools },
                output: {
                  has_service_plan: Boolean(servicePlan),
                  skill_id: servicePlan?.skill.id || '',
                  skill_name: servicePlan?.skill.name || '',
                  mcp_step_count: servicePlan?.steps.filter(step => (step.kind || step.key).includes('mcp')).length || 0,
                },
              }),
            });
          }, { name: 'xiaoqiao.zhitou.agent', type: SpanKind.Tool });

          if (servicePlan) {
            pushDebugWorkbenchEvent(push, servicePlan, intent, message);
            for (const step of servicePlan.steps) {
              if (closed) return;
              if (step.key === 'mcp_debug_watch_steps') {
                const startStep = servicePlan.steps.find(item => item.key === 'mcp_debug_start_task');
                const taskId = pickDebugTaskId(startStep?.output);
                if (taskId) {
                  step.input = { ...step.input, task_id: taskId };
                } else if (String(step.input?.task_id || '').startsWith('from_')) {
                  step.input = { ...step.input, task_id: '' };
                }
              }
              const stepStartedAt = Date.now();
              push(buildThinkingStep(step.key, step.label, step.content, 'loading', stepStartedAt, step.input));
              push({
                type: 'tool_call',
                name: step.toolName,
                kind: step.kind || (step.key.startsWith('skill_') ? 'skill' : 'mcp'),
                display_name: step.toolName,
                provider_url: step.providerUrl,
                prompt: step.prompt,
                step_key: step.key,
                query: step.content,
                arguments: JSON.stringify(step.input),
              });
              const executedStep = await executeServiceStep(step, intent, message, step.key === 'mcp_debug_watch_steps'
                ? {
                  onSnapshot: (snapshotStep) => {
                    Object.assign(step, snapshotStep);
                    push(buildThinkingStep(step.key, step.label, step.content, 'loading', stepStartedAt, snapshotStep.input, snapshotStep.output));
                    pushDebugWorkbenchEvent(push, servicePlan, intent, message);
                  },
                }
                : undefined);
              push({
                type: 'tool_result',
                name: step.toolName,
                kind: executedStep.kind || (executedStep.key.startsWith('skill_') ? 'skill' : 'mcp'),
                display_name: executedStep.toolName,
                provider_url: executedStep.providerUrl,
                prompt: executedStep.prompt,
                step_key: executedStep.key,
                result: JSON.stringify(executedStep.output),
              });
              const executedStatus = String(executedStep.output?.status || '');
              if (executedStep.kind === 'mcp' && (executedStatus === 'not_configured' || executedStatus === 'failed')) {
                push({
                  type: 'process_event',
                  event: createProcessEvent({
                    type: 'capability.checked',
                    label: 'MCP 能力不可用',
                    status: 'error',
                    summary: String(executedStep.output?.message || executedStep.output?.error || '未找到可用 MCP 工具，不能用 mock 数据替代。'),
                    completed_at: new Date().toISOString(),
                    tool_name: executedStep.toolName,
                    provider: executedStep.providerUrl,
                    input: executedStep.input,
                    output: executedStep.output,
                  }),
                });
                push({
                  type: 'process_event',
                  event: createProcessEvent({
                    type: 'skill.failed',
                    label: `${servicePlan.skill.name}暂不能完成`,
                    status: 'error',
                    summary: '依赖的真实 MCP 未配置或调用失败，已停止把该结果作为业务证据。',
                    completed_at: new Date().toISOString(),
                    skill_id: servicePlan.skill.id,
                    skill_name: servicePlan.skill.name,
                    tool_name: executedStep.toolName,
                    input: executedStep.input,
                    output: executedStep.output,
                  }),
                });
              }
              push(buildThinkingStep(executedStep.key, executedStep.label, executedStep.content, 'completed', stepStartedAt, executedStep.input, executedStep.output));
              Object.assign(step, executedStep);
              pushDebugWorkbenchEvent(push, servicePlan, intent, message);
            }

            if (intent === 'monitor') {
              const inspectionPayload = buildInspectionResultPayload(servicePlan);
              push({
                type: 'process_event',
                event: createProcessEvent({
                  type: 'ui.component_rendered',
                  label: '生成巡检结果',
                  status: hasUnavailableMcpStep(servicePlan) ? 'error' : 'success',
                  summary: String(inspectionPayload.conclusion || ''),
                  completed_at: new Date().toISOString(),
                  skill_id: servicePlan.skill.id,
                  skill_name: servicePlan.skill.name,
                  ui_component: {
                    type: 'inspection_result',
                    title: '投放异常巡检',
                    payload: inspectionPayload,
                  },
                  input: { intent, question: truncate(message, 300) },
                  output: inspectionPayload,
                }),
              });
            }

            if (intent === 'debugging') {
              const debugPayload = buildDebugWorkbenchPayload(servicePlan);
              const debugFinalAnswer = buildDebugFinalAnswer(debugPayload);
              push({
                type: 'process_event',
                event: createProcessEvent({
                  type: 'ui.component_rendered',
                  label: '生成联调工作台',
                  status: hasUnavailableMcpStep(servicePlan) ? 'error' : 'success',
                  summary: String(debugPayload.conclusion || ''),
                  completed_at: new Date().toISOString(),
                  skill_id: servicePlan.skill.id,
                  skill_name: servicePlan.skill.name,
                  ui_component: {
                    type: 'debug_workbench',
                    title: '自动联调',
                    payload: debugPayload,
                  },
                  input: { intent, question: truncate(message, 300) },
                  output: debugPayload,
                }),
              });
              if (debugFinalAnswer) {
                push({ type: 'content', content: debugFinalAnswer });
              }
              const result = buildStructuredResult(intent, debugFinalAnswer);
              push({
                type: 'done',
                result,
                metadata: {
                  process_events: processEvents,
                  debug_component_only: true,
                },
              });
              return;
            }

            if (servicePlan.skill.id === 'tracking_link_delivery_skill') {
              const trackingInput = buildTrackingLinkRequestContext(message);
              const trackingPayload = buildTrackingLinkCardPayload(trackingInput, servicePlan.steps);
              push({
                type: 'process_event',
                event: createProcessEvent({
                  type: 'ui.component_rendered',
                  label: '生成监测链接卡',
                  status: hasUnavailableMcpStep(servicePlan) ? 'error' : 'success',
                  summary: String(trackingPayload.conclusion || ''),
                  completed_at: new Date().toISOString(),
                  skill_id: servicePlan.skill.id,
                  skill_name: servicePlan.skill.name,
                  ui_component: {
                    type: 'tracking_link_card',
                    title: '监测链接交付',
                    payload: trackingPayload,
                  },
                  input: { ...trackingInput },
                  output: trackingPayload,
                }),
              });
            }

            if (servicePlan.skill.id === 'scheduled_report_skill' || servicePlan.skill.id === 'report_template_builder_skill') {
              const reportPayload = buildReportWorkflowPayload(servicePlan, message);
              push({
                type: 'process_event',
                event: createProcessEvent({
                  type: 'ui.component_rendered',
                  label: '生成报表模板',
                  status: hasUnavailableMcpStep(servicePlan) ? 'error' : 'success',
                  summary: String(reportPayload.conclusion || ''),
                  completed_at: new Date().toISOString(),
                  skill_id: servicePlan.skill.id,
                  skill_name: servicePlan.skill.name,
                  ui_component: {
                    type: 'report_template',
                    title: '自动报表模板',
                    payload: reportPayload,
                  },
                  input: { requirement: truncate(message, 500) },
                  output: reportPayload,
                }),
              });
              push({
                type: 'process_event',
                event: createProcessEvent({
                  type: 'ui.component_rendered',
                  label: '生成数据预览',
                  status: hasUnavailableMcpStep(servicePlan) ? 'error' : 'success',
                  summary: hasUnavailableMcpStep(servicePlan) ? '真实报表预览不可用，等待报表编排 MCP 接入。' : '已生成报表数据预览。',
                  completed_at: new Date().toISOString(),
                  skill_id: servicePlan.skill.id,
                  skill_name: servicePlan.skill.name,
                  ui_component: {
                    type: 'data_preview',
                    title: '数据预览',
                    payload: reportPayload,
                  },
                  input: { requirement: truncate(message, 500) },
                  output: reportPayload,
                }),
              });
            }

            if (hasUnavailableMcpStep(servicePlan)) {
              const isDebuggingService = servicePlan.skill.id.includes('debug');
              const blockedAnswer = isDebuggingService ? '' : buildServiceBlockedAnswer(servicePlan);
              const sourceRefs: SourceRefPayload[] = servicePlan.steps
                .filter(step => step.kind === 'skill' || step.output?.status === 'success')
                .map((step) => ({
                  title: step.kind === 'skill' ? step.toolName : String(step.output?.selected_tool || step.toolName),
                  source: step.kind === 'skill' ? 'Skill' : String(step.output?.selected_server || 'MCP'),
                  url: step.providerUrl,
                  source_type: step.kind === 'skill' ? 'skill' : 'mcp',
                  icon: step.kind === 'skill' ? 'skill' : 'mcp',
                  prompt: step.prompt,
              }));
              pushSourceAttachedEvents(push, sourceRefs);
              push({ type: 'phase', phase: 'generating' });
              if (blockedAnswer) {
                push({ type: 'content', content: blockedAnswer });
              }
              const result = buildStructuredResult(intent, blockedAnswer);
              result.structured_payload = { source_refs: sourceRefs };
              push({
                type: 'done',
                result,
                metadata: {
                  source_refs: sourceRefs,
                  process_events: processEvents,
                  blocked_by_mcp: true,
                },
              });
              return;
            }
          }

          if (!servicePlan && isAmbiguousApplicationRequest(message)) {
            ambiguityOutcome = await attemptAmbiguityClarification(push, message, intent, routeStartedAt, modelServiceConfig);
            return;
          }

          if (!servicePlan && isCapabilityDiscoveryRequest(message)) {
            capabilityDiscoveryOutcome = await attemptCapabilityDiscovery(push, message, intent, routeStartedAt);
            return;
          }
          finalKnowledgeResult = await cozeLoopTracer.traceable(async (toolSpan) => {
            const toolStartedAt = Date.now();
            push(buildThinkingStep('knowledge_search', '查询知识库', '确认可访问知识库并检索相关片段', 'loading', toolStartedAt, { query: truncate(message, 1000), provider: 'weknora' }));
            cozeLoopTracer.setInput(toolSpan, {
              tool_name: 'search_knowledge',
              question: truncate(message, 1000),
              provider: 'weknora',
              explicit_knowledge_base_id: getKnowledgeBaseId(modelServiceConfig) || '',
            });

            const result = await cozeLoopTracer.traceable(async (retrievalSpan) => {
              const retrievalStartedAt = Date.now();
              push(buildThinkingStep('knowledge_search', '查询知识片段', '正在从知识库检索相关内容', 'loading', retrievalStartedAt, { query: truncate(message, 1000) }));
              push({
                type: 'tool_call',
                name: 'search_knowledge',
                kind: 'knowledge',
                display_name: 'Dataki知识库',
                provider_url: modelServiceConfig.knowledgeBaseUrl || modelServiceConfig.baseUrl || '',
                prompt: 'Search Dataki knowledge base. Only accept high-relevance snippets; reject low-relevance snippets and do not cite them.',
                step_key: 'knowledge_search',
                query: truncate(message, 1000),
                arguments: JSON.stringify({
                  query: truncate(message, 1000),
                  provider: 'weknora',
                  knowledge_base_id: getKnowledgeBaseId(modelServiceConfig) || '',
                }),
              });
              const rawRetrievalResult = await searchKnowledge(message, modelServiceConfig);
              const relevance = filterRelevantKnowledge(rawRetrievalResult.items, message);
              const retrievalResult = {
                ...rawRetrievalResult,
                items: relevance.accepted,
              };
              const topResults = retrievalResult.items.slice(0, 3).map(item => ({
                title: truncate(item.knowledge_title || '', 80),
                score: item.score || 0,
                content_preview: truncate(item.content || '', 160),
              }));

              cozeLoopTracer.setInput(retrievalSpan, {
                query: truncate(message, 1000),
                source: 'weknora',
                explicit_knowledge_base_id: getKnowledgeBaseId(modelServiceConfig) || '',
              });
              cozeLoopTracer.setOutput(retrievalSpan, {
                status: retrievalResult.warning ? 'partial' : 'success',
                resolved_knowledge_base_count: retrievalResult.resolvedCount || 0,
                retrieved_count: rawRetrievalResult.items.length,
                accepted_count: relevance.accepted.length,
                rejected_count: relevance.rejected.length,
                rejected_reason: 'low relevance; not used as answer evidence',
                warning: retrievalResult.warning || '',
                top_results: topResults,
              });
              push(buildThinkingStep(
                'knowledge_search',
                '查询知识片段',
                retrievalResult.warning ? '知识库检索未完整返回，继续使用可用上下文' : `已找到 ${retrievalResult.items.length} 条相关内容`,
                retrievalResult.warning ? 'error' : 'completed',
                retrievalStartedAt,
                { query: truncate(message, 1000) },
                {
                  retrieved_count: rawRetrievalResult.items.length,
                  accepted_count: relevance.accepted.length,
                  rejected_count: relevance.rejected.length,
                  rejected_reason: 'low relevance; not used as answer evidence',
                  top_results: topResults,
                  warning: retrievalResult.warning || '',
                },
              ));
              return retrievalResult;
            }, { name: 'xiaoqiao.zhitou.retrieval', type: SpanKind.Retriever });

            toolSummary = {
              tool_name: 'search_knowledge',
              status: result.warning ? 'partial' : 'success',
              returned_items: result.items.length,
              resolved_knowledge_base_count: result.resolvedCount || 0,
              warning: result.warning || '',
              relevance_policy: 'accepted snippets only; low relevance snippets are rejected and not cited',
            };
            push({
              type: 'tool_result',
              name: 'search_knowledge',
              kind: 'knowledge',
              display_name: 'Dataki知识库',
              provider_url: modelServiceConfig.knowledgeBaseUrl || modelServiceConfig.baseUrl || '',
              prompt: 'Search Dataki knowledge base. Only accepted snippets are passed to the final answer.',
              step_key: 'knowledge_search',
              result: JSON.stringify(toolSummary),
            });
            push(buildThinkingStep(
              'knowledge_search',
              '检索知识库',
              result.warning ? '知识库检索部分完成' : '知识库检索完成',
              result.warning ? 'error' : 'completed',
              toolStartedAt,
              { provider: 'weknora' },
              toolSummary,
            ));
            cozeLoopTracer.setOutput(toolSpan, toolSummary);
            return result;
          }, { name: 'xiaoqiao.zhitou.tool', type: SpanKind.Tool });

          if (closed) return;

          const ambiguityConfirmOutcome = ambiguityOutcome as any;
          if (ambiguityConfirmOutcome) {
            push({
              type: 'route',
              intent,
              hasThinking: false,
              toolsUsed: [],
              knowledgeWarning: '',
              knowledgeBaseCount: 0,
            });
            push({ type: 'phase', phase: 'generating' });
            const result = buildStructuredResult(intent, '');
            result.structured_payload = {
              confirmation_needed: true,
              confirmation: {
                title: ambiguityConfirmOutcome.payload.title,
                hint: ambiguityConfirmOutcome.payload.hint,
                options: ambiguityConfirmOutcome.payload.options,
              },
              source_refs: ambiguityConfirmOutcome.sourceRefs,
            };
            push({
              type: 'done',
              result,
              metadata: {
                source_refs: ambiguityConfirmOutcome.sourceRefs,
                confirmation_needed: true,
                confirmation_title: ambiguityConfirmOutcome.payload.title,
                confirmation_hint: ambiguityConfirmOutcome.payload.hint,
                confirmation_options: ambiguityConfirmOutcome.payload.options,
                process_events: processEvents,
              },
            });
            return;
          }

          const messages = [
            { role: 'system' as const, content: buildSystemPrompt(finalKnowledgeResult.items) },
            ...(servicePlan ? [{ role: 'system' as const, content: buildServiceExecutionContext(servicePlan) }] : []),
            ...history.map(item => ({ role: item.role as 'user' | 'assistant', content: item.content })),
            { role: 'user' as const, content: message },
          ];

          push({
            type: 'route',
            intent,
            hasThinking: false,
            toolsUsed: [
              ...(servicePlan ? servicePlan.steps.map(step => step.toolName) : []),
              ...(finalKnowledgeResult.items.length ? ['search_knowledge'] : []),
            ],
            knowledgeWarning: finalKnowledgeResult.warning,
            knowledgeBaseCount: finalKnowledgeResult.resolvedCount,
          });

          if (finalKnowledgeResult.warning) {
            push({ type: 'error', error: finalKnowledgeResult.warning });
          }

          await cozeLoopTracer.traceable(async (llmSpan) => {
            const llmStartedAt = Date.now();
            push(buildThinkingStep('model-generate', '生成回答', '正在组织结论、依据和下一步建议', 'loading', llmStartedAt, { model: modelName, intent, knowledge_hits: finalKnowledgeResult.items.length }));
            cozeLoopTracer.setInput(llmSpan, {
              model: modelName,
              prompt_summary: truncate(message, 600),
              model_params: {
                thinking: 'enabled',
              },
              knowledge_hits: finalKnowledgeResult.items.length,
            });

            for await (const chunk of llmClient.stream(messages, { model: modelName, thinking: 'enabled' })) {
              if (closed) break;
              const content = typeof chunk.content === 'string' ? chunk.content : '';
              if (!content.trim()) {
                continue;
              }
              fullResponse += content;
              push({ type: 'content', content });
            }

            cozeLoopTracer.setOutput(llmSpan, {
              status: 'success',
              model_name: modelName,
              token_usage: {
                input_tokens: 0,
                output_tokens: 0,
              },
              output_summary: truncate(fullResponse, 600),
              output_length: fullResponse.length,
            });
            push(buildThinkingStep('model-generate', '生成回答', '回答已生成', 'completed', llmStartedAt, { model: modelName, intent }, { output_length: fullResponse.length, knowledge_hits: finalKnowledgeResult.items.length }));
          }, { name: 'xiaoqiao.zhitou.llm', type: SpanKind.Model });

          cozeLoopTracer.setOutput(rootSpan, {
            user_question: truncate(message, 2000),
            frontend_params: frontendParams,
            final_answer: truncate(fullResponse, 8000),
            status: 'success',
            total_latency_ms: Date.now() - startedAt,
            error_summary: '',
            tool_summary: toolSummary,
            retrieval_count: finalKnowledgeResult.items.length,
            span_plan: [
              'xiaoqiao.zhitou.chat',
              'xiaoqiao.zhitou.agent',
              'xiaoqiao.zhitou.tool',
              'xiaoqiao.zhitou.retrieval',
              'xiaoqiao.zhitou.llm',
            ],
          });
        }, { name: 'xiaoqiao.zhitou.chat', type: SpanKind.Tool });

        const capabilityOutcome = capabilityDiscoveryOutcome as any;
        if (capabilityOutcome) {
          const followUpNeeded = capabilityOutcome.status === 'missing';
          push({
            type: 'route',
            intent,
            hasThinking: false,
            toolsUsed: capabilityOutcome.selected ? [capabilityOutcome.selected.tool.name] : [],
            knowledgeWarning: '',
            knowledgeBaseCount: 0,
          });
          push({ type: 'phase', phase: 'generating' });
          push({ type: 'content', content: followUpNeeded ? '' : capabilityOutcome.summary });
          const result = buildStructuredResult(intent, followUpNeeded ? '' : capabilityOutcome.summary);
          result.structured_payload = {
            ...(followUpNeeded ? {
              confirmation_needed: true,
              follow_up: {
                title: '继续补充信息',
                hint: capabilityOutcome.summary,
                fields: capabilityOutcome.selected?.tool?.input_schema?.required
                  ? capabilityOutcome.selected.tool.input_schema.required
                      .slice(0, 3)
                      .map((fieldKey: string) => ({
                        label: humanizeFieldKey(fieldKey),
                        prompt: `请补充${humanizeFieldKey(fieldKey)}，继续获取${extractCapabilitySubject(message) || '当前项目'}的应用列表。`,
                      }))
                  : [],
              },
            } : {}),
            capability_discovery: {
              status: capabilityOutcome.status,
              selected_server: capabilityOutcome.selected?.server.name || '',
              selected_tool: capabilityOutcome.selected?.tool.name || '',
              input: capabilityOutcome.input || {},
              result: capabilityOutcome.result || {},
            },
            source_refs: capabilityOutcome.sourceRefs,
          };
          push({
            type: 'done',
            result,
            metadata: {
              source_refs: capabilityOutcome.sourceRefs,
              capability_discovery: true,
              capability_status: capabilityOutcome.status,
              ...(followUpNeeded ? {
                confirmation_needed: true,
                follow_up_title: '继续补充信息',
                follow_up_hint: capabilityOutcome.summary,
                follow_up_fields: capabilityOutcome.selected?.tool?.input_schema?.required
                  ? capabilityOutcome.selected.tool.input_schema.required
                      .slice(0, 3)
                      .map((fieldKey: string) => ({
                        label: humanizeFieldKey(fieldKey),
                        prompt: `请补充${humanizeFieldKey(fieldKey)}，继续获取${extractCapabilitySubject(message) || '当前项目'}的应用列表。`,
                      }))
                  : [],
              } : {}),
              process_events: processEvents,
            },
          });
          return;
        }

        const knowledgeBaseAddress = modelServiceConfig.knowledgeBaseUrl || modelServiceConfig.baseUrl || '';
        const knowledgeSourceRefs: SourceRefPayload[] = finalKnowledgeResult.items.slice(0, 5).map((item, index) => ({
          title: item.knowledge_title || `知识库片段 ${index + 1}`,
          source: item.knowledge_id || getKnowledgeBaseId(modelServiceConfig) || '自动检索范围',
          url: knowledgeBaseAddress,
          source_type: 'knowledge_base',
          icon: 'knowledge',
        }));
        const serviceSourceRefs: SourceRefPayload[] = (servicePlan?.steps || [])
          .filter(step => step.kind === 'mcp' || step.kind === 'skill')
          .map((step) => {
            const isMcp = step.kind === 'mcp';
            const outputStatus = String(step.output?.status || '');
            return {
              title: isMcp ? String(step.output?.selected_tool || step.toolName) : step.toolName,
              source: isMcp ? String(step.output?.selected_server || 'MCP') : 'Skill',
              url: step.providerUrl,
              source_type: isMcp && /report|cost|spend|consume|报表|消耗/.test(`${step.toolName} ${step.label}`) ? 'report_mcp' : (isMcp ? 'mcp' : 'skill'),
              report_name: isMcp ? String(step.output?.selected_tool || step.toolName) : undefined,
              icon: isMcp ? 'mcp' : 'skill',
              prompt: step.prompt,
              status: outputStatus,
            } as SourceRefPayload & { status?: string };
          })
          .filter(ref => ref.source_type === 'skill' || (ref as SourceRefPayload & { status?: string }).status === 'success');
        const metricSourceRefs = metricExplainerSchema ? metricSchemaToSourceRefs(metricExplainerSchema) : [];
        const sourceRefs = [
          ...serviceSourceRefs,
          ...knowledgeSourceRefs,
          ...metricSourceRefs,
        ];
        pushSourceAttachedEvents(push, sourceRefs);
        if (metricExplainerSchema) {
          push({
            type: 'process_event',
            event: createProcessEvent({
              type: 'ui.component_rendered',
              label: '渲染指标解释器',
              status: 'success',
              summary: '已按结构化指标资料生成指标解释组件。',
              completed_at: new Date().toISOString(),
              skill_id: 'metric_explainer_skill',
              skill_name: '指标解释器',
              source_refs: metricSourceRefs,
              ui_component: {
                type: 'metric_explainer',
                title: metricExplainerSchema.metric_name || '指标解释器',
                payload: { metric_id: metricExplainerSchema.metric_id },
              },
              input: { metric_id: metricExplainerSchema.metric_id },
              output: { component_count: metricExplainerSchema.components.length, source_count: metricSourceRefs.length },
            }),
          });
        }
        const result = buildStructuredResult(intent, fullResponse || '已完成处理');
        result.structured_payload = {
          source_refs: sourceRefs,
          ...(metricExplainerSchema ? { metric_explainer: metricExplainerSchema } : {}),
          knowledge_base: {
            provider: 'WeKnora',
            address: knowledgeBaseAddress,
            dataset: getKnowledgeBaseId(modelServiceConfig) || '',
            resolvedCount: finalKnowledgeResult.resolvedCount || 0,
          },
        };

        push({
          type: 'done',
          result,
          metadata: {
            source_refs: sourceRefs,
            ...(metricExplainerSchema ? { metric_explainer_schema: metricExplainerSchema } : {}),
            knowledge_base: {
              provider: 'WeKnora',
              address: knowledgeBaseAddress,
              dataset: getKnowledgeBaseId(modelServiceConfig) || '',
              resolvedCount: finalKnowledgeResult.resolvedCount || 0,
            },
          },
        });
      } catch (error: unknown) {
        const messageText = error instanceof Error ? error.message : String(error);
        const isAuthError = /401|api key|authorization|bearer/i.test(messageText);
        const fallbackAnswer = isAuthError
          ? '模型服务认证失败，请在配置管理服务里检查 API Key、服务地址、模型地址和模型名称。'
          : `处理失败：${messageText}`;

        push({ type: 'error', error: fallbackAnswer });
        push({ type: 'done', result: buildStructuredResult(intent, fallbackAnswer) });
      } finally {
        closed = true;
        controller.close();
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
