import { callMcpTool } from '@/lib/mcp-discovery';
import type { CompiledContextPackage, McpServerConfig, AiNextAction, AgentProcessEvent } from '@/types';
import type { EvidenceRef } from '@/contracts/semantic/evidence-contract';
import type { SourceRef } from '@/contracts/semantic/source-contract';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import { createProcessEvent } from './chat-route-primitives';

export type CallbackDiagnosisPlatform = 'ANDROID' | 'IOS' | 'HARMONY' | 'WEIXIN' | 'DOUYIN' | 'KUAISHOU' | 'BILIBILI' | 'ALIPAY' | 'PC' | 'WEB' | 'OTHER';

export type CallbackDiagnosisBranch =
  | 'ANDROID_SDK'
  | 'ANDROID_API'
  | 'ANDROID_NOTHING'
  | 'IOS_HARMONY_ACTIVATION'
  | 'IOS_HARMONY_API'
  | 'IOS_HARMONY_NO_CALLBACK'
  | 'CONFIG_ANOMALY'
  | 'UNKNOWN';

export interface CallbackDiagnosisWorkflowTraceItem {
  key: string;
  label: string;
  status: 'waiting' | 'running' | 'partial' | 'success' | 'error' | 'skipped';
  summary: string;
  toolName?: string;
  serverName?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CallbackDiagnosisExecutionResult {
  status: 'blocked' | 'partial' | 'success' | 'failed';
  platform: CallbackDiagnosisPlatform;
  branch: CallbackDiagnosisBranch;
  branchStatus: string;
  summary: string;
  conclusion: string[];
  missingFields: string[];
  workflowTrace: CallbackDiagnosisWorkflowTraceItem[];
  semanticResult?: SemanticResultContract<Record<string, unknown>>;
  runtimeDisplay?: unknown;
  evidenceRefs: EvidenceRef[];
  sourceRefs: SourceRef[];
  nextActions: AiNextAction[];
  toolCalls: Array<{
    name: string;
    kind?: string;
    status: string;
    arguments?: string;
    result?: string;
    display_name?: string;
    provider_url?: string;
    step_key?: string;
  }>;
  events: AgentProcessEvent[];
  warnings: string[];
}

interface SkillToolCallResult {
  toolName: string;
  serverName: string;
  status: 'success' | 'error' | 'unavailable';
  message: string;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

async function callSkillTool(args: {
  servers: McpServerConfig[];
  toolName: string;
  input: Record<string, unknown>;
}): Promise<SkillToolCallResult> {
  const server = args.servers.find(s =>
    s.enabled && s.status === 'connected' && s.tools?.some(t => t.tool_id === args.toolName || t.name === args.toolName)
  );
  if (!server) {
    return {
      toolName: args.toolName,
      serverName: 'unknown',
      status: 'unavailable',
      message: `Tool ${args.toolName} not found in any connected MCP server`,
      input: args.input,
    };
  }
  try {
    const result = await callMcpTool({
      endpoint_url: server.endpoint_url,
      transport: server.transport,
      auth_type: server.auth_type,
      auth_config: server.auth_config,
    }, args.toolName, args.input);
    return {
      toolName: args.toolName,
      serverName: server.name,
      status: 'success',
      message: `Tool ${args.toolName} executed successfully`,
      input: args.input,
      result: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    return {
      toolName: args.toolName,
      serverName: server.name,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      input: args.input,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function readSlotText(slot: unknown): string {
  if (!slot || typeof slot !== 'object') return '';
  const record = slot as Record<string, unknown>;
  if ('value' in record) {
    const value = record.value;
    return Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim();
  }
  return '';
}

function readDeepString(value: unknown, keys: string[]): string {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = record[key];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
  }
  return '';
}

function hasMultipleCandidates(result: Record<string, unknown>): boolean {
  const candidates = result?.candidates;
  return Array.isArray(candidates) && candidates.length > 1;
}

function detectPlatform(message: string, context?: CompiledContextPackage): CallbackDiagnosisPlatform {
  const text = message.toLowerCase();
  if (/ios|iphone|ipad|苹果|iOS/i.test(text)) return 'IOS';
  if (/harmony|鸿蒙/i.test(text)) return 'HARMONY';
  if (/weixin|wechat|微信|小游戏/i.test(text)) return 'WEIXIN';
  if (/douyin|tiktok|抖音/i.test(text)) return 'DOUYIN';
  if (/kuaishou|快手/i.test(text)) return 'KUAISHOU';
  if (/bilibili|B站/i.test(text)) return 'BILIBILI';
  if (/alipay|支付宝/i.test(text)) return 'ALIPAY';
  if (/android|安卓/i.test(text)) return 'ANDROID';
  return 'ANDROID'; // 默认
}

function detectEventType(message: string): string {
  const text = message.toLowerCase();
  if (/register|注册/i.test(text)) return 'REGISTER';
  if (/key.?action|关键行为/i.test(text)) return 'KEY_ACTION';
  if (/retention|留存|次留/i.test(text)) return 'DEVICE_RETENTION';
  if (/pay|payment|付费|充值|PAY/i.test(text)) return 'PAY';
  if (/activation|激活/i.test(text)) return 'ACTIVATION';
  return 'PAY'; // 默认
}

export async function executeCallbackAttributionDiagnosisSkill(args: {
  message: string;
  compiledContext: CompiledContextPackage;
  routeReason?: string;
  servers: McpServerConfig[];
}): Promise<CallbackDiagnosisExecutionResult> {
  const missingFields: string[] = [];
  const toolCalls: CallbackDiagnosisExecutionResult['toolCalls'] = [];
  const events: AgentProcessEvent[] = [];
  const workflowTrace: CallbackDiagnosisWorkflowTraceItem[] = [];
  const evidenceRefs: EvidenceRef[] = [];
  const sourceRefs: SourceRef[] = [];
  const warnings: string[] = [];

  // Step 1: 提取参数
  const appQuery = readSlotText(args.compiledContext.businessContext?.app) ||
    String(args.compiledContext.project?.currentProject?.appName || args.compiledContext.project?.currentProject?.appId || '').trim() ||
    /(?:app_id|appId|应用ID|项目ID)[:：=\s]*([A-Za-z0-9_-]+)/i.exec(args.message)?.[1] || '';
  const mediaQuery = readSlotText(args.compiledContext.businessContext?.media) || '';
  const timeRange = readSlotText(args.compiledContext.businessContext?.timeRange);
  const timeMatch = timeRange.match(/^(\d{4}-\d{1,2}-\d{1,2})~(\d{4}-\d{1,2}-\d{1,2})$/) ||
    /(\d{4}-\d{1,2}-\d{1,2})(?:至|到|~)(\d{4}-\d{1,2}-\d{1,2})/.exec(args.message);
  const dateStart = timeMatch?.[1] || '';
  const dateEnd = timeMatch?.[2] || '';
  const eventType = detectEventType(args.message);
  const platform = detectPlatform(args.message, args.compiledContext);

  if (!appQuery) missingFields.push('app_query');
  if (!dateStart) missingFields.push('date_start');
  if (!dateEnd) missingFields.push('date_end');
  if (!eventType) missingFields.push('event_type');

  // Step 2: 参数校验
  if (missingFields.length > 0) {
    return {
      status: 'blocked',
      platform,
      branch: 'UNKNOWN',
      branchStatus: 'WAITING_FOR_USER',
      summary: `Need more fields: ${missingFields.join(', ')}`,
      conclusion: ['Fill required fields before continuing.'],
      missingFields,
      workflowTrace,
      evidenceRefs,
      sourceRefs,
      nextActions: [],
      toolCalls,
      events,
      warnings,
    };
  }

  // Step 3: 解析应用
  const appCall = await callSkillTool({
    servers: args.servers,
    toolName: 'diag.fetch_app_context',
    input: { app_query: appQuery, app_package_type: platform, problem_desc: args.message }
  });
  toolCalls.push({ name: appCall.toolName, status: appCall.status, arguments: JSON.stringify(appCall.input), result: JSON.stringify(appCall.result) });
  workflowTrace.push({
    key: 'resolve_app_context',
    label: '解析应用信息',
    status: appCall.status === 'success' ? 'partial' : 'error',
    summary: appCall.message,
    toolName: appCall.toolName,
    serverName: appCall.serverName,
    input: appCall.input,
    output: appCall.result,
  });
  events.push(createProcessEvent({
    type: appCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
    label: 'resolve_app_context',
    status: appCall.status === 'success' ? 'success' : 'error',
    summary: appCall.message,
    intent_type: 'diagnosis',
    agent: 'diagnosis',
    tool_name: appCall.toolName,
    input: appCall.input,
    output: appCall.result,
  }));

  const resolvedAppId = readDeepString(appCall.result, ['app_id', 'id']) || appQuery;
  if (!resolvedAppId || appCall.status !== 'success' || hasMultipleCandidates(appCall.result || {})) {
    return {
      status: 'blocked',
      platform,
      branch: 'UNKNOWN',
      branchStatus: 'NEED_APP_SELECTION',
      summary: resolvedAppId ? 'App candidates found, please choose one.' : 'Unable to uniquely resolve app.',
      conclusion: ['Please confirm the app first.'],
      missingFields: ['app_selection'],
      workflowTrace,
      evidenceRefs,
      sourceRefs,
      nextActions: [],
      toolCalls,
      events,
      warnings,
    };
  }

  // Step 4: 解析媒体
  let resolvedMediaId = '';
  if (mediaQuery) {
    const mediaCall = await callSkillTool({
      servers: args.servers,
      toolName: 'diag.fetch_media_context',
      input: { app_id: resolvedAppId, media_query: mediaQuery, app_package_type: platform, problem_desc: args.message }
    });
    toolCalls.push({ name: mediaCall.toolName, status: mediaCall.status, arguments: JSON.stringify(mediaCall.input), result: JSON.stringify(mediaCall.result) });
    workflowTrace.push({
      key: 'resolve_media_context',
      label: '解析媒体信息',
      status: mediaCall.status === 'success' ? 'partial' : 'error',
      summary: mediaCall.message,
      toolName: mediaCall.toolName,
      serverName: mediaCall.serverName,
      input: mediaCall.input,
      output: mediaCall.result,
    });
    events.push(createProcessEvent({
      type: mediaCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
      label: 'resolve_media_context',
      status: mediaCall.status === 'success' ? 'success' : 'error',
      summary: mediaCall.message,
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      tool_name: mediaCall.toolName,
      input: mediaCall.input,
      output: mediaCall.result,
    }));
    resolvedMediaId = readDeepString(mediaCall.result, ['media_id', 'id']) || '';
  }

  // Step 5: 平台分支判断
  let branch: CallbackDiagnosisBranch = 'UNKNOWN';
  let branchStatus = 'UNKNOWN';
  let branchProbe: Record<string, unknown> = {};

  if (platform === 'ANDROID') {
    const ruleCall = await callSkillTool({
      servers: args.servers,
      toolName: 'diag.check_callback_rule_match',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId || undefined, app_package_type: platform, event_type: eventType, date_start: dateStart, date_end: dateEnd, problem_desc: args.message }
    });
    toolCalls.push({ name: ruleCall.toolName, status: ruleCall.status, arguments: JSON.stringify(ruleCall.input), result: JSON.stringify(ruleCall.result) });
    workflowTrace.push({
      key: 'check_callback_rule_match',
      label: '检查回传规则匹配',
      status: ruleCall.status === 'success' ? 'partial' : 'error',
      summary: ruleCall.message,
      toolName: ruleCall.toolName,
      serverName: ruleCall.serverName,
      input: ruleCall.input,
      output: ruleCall.result,
    });
    events.push(createProcessEvent({
      type: ruleCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
      label: 'check_callback_rule_match',
      status: ruleCall.status === 'success' ? 'success' : 'error',
      summary: ruleCall.message,
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      tool_name: ruleCall.toolName,
      input: ruleCall.input,
      output: ruleCall.result,
    }));

    branchProbe = ruleCall.result || {};
    const callbackMode = readDeepString(ruleCall.result, ['callbackMode', 'callback_mode']).toUpperCase();
    const callbackModeDetail = readDeepString(ruleCall.result, ['callbackModeDetail', 'callback_mode_detail']).toUpperCase();

    if (callbackMode === 'SDK') {
      branch = callbackModeDetail === 'NO_RULE' ? 'ANDROID_SDK' : 'ANDROID_SDK';
      branchStatus = `SDK ${callbackModeDetail || 'ALL_RULE'}`;
    } else if (callbackMode === 'API') {
      branch = 'ANDROID_API';
      branchStatus = 'API';
    } else if (callbackMode === 'NOTHING') {
      branch = 'ANDROID_NOTHING';
      branchStatus = 'NOTHING - 停止排查';
    } else {
      branch = 'CONFIG_ANOMALY';
      branchStatus = `配置异常: ${callbackMode || '未知'}`;
    }
  } else if (platform === 'IOS' || platform === 'HARMONY') {
    const branchCall = await callSkillTool({
      servers: args.servers,
      toolName: 'diag.resolve_callback_diagnosis_branch',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId || undefined, app_package_type: platform, event_type: eventType, date_start: dateStart, date_end: dateEnd }
    });
    toolCalls.push({ name: branchCall.toolName, status: branchCall.status, arguments: JSON.stringify(branchCall.input), result: JSON.stringify(branchCall.result) });
    workflowTrace.push({
      key: 'resolve_callback_diagnosis_branch',
      label: '解析iOS/鸿蒙诊断分支',
      status: branchCall.status === 'success' ? 'partial' : 'error',
      summary: branchCall.message,
      toolName: branchCall.toolName,
      serverName: branchCall.serverName,
      input: branchCall.input,
      output: branchCall.result,
    });
    events.push(createProcessEvent({
      type: branchCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
      label: 'resolve_callback_diagnosis_branch',
      status: branchCall.status === 'success' ? 'success' : 'error',
      summary: branchCall.message,
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      tool_name: branchCall.toolName,
      input: branchCall.input,
      output: branchCall.result,
    }));

    branchProbe = branchCall.result || {};
    const branchKey = readDeepString(branchCall.result, ['branch_key', 'branchKey']).toUpperCase();

    if (branchKey.includes('ACTIVATION') || branchKey.includes('SDK_VIRTUAL') || branchKey.includes('SDK_RULE')) {
      branch = 'IOS_HARMONY_ACTIVATION';
      branchStatus = `iOS/鸿蒙激活分支: ${branchKey}`;
    } else if (branchKey.includes('API') || branchKey.includes('FEEDBACK')) {
      branch = 'IOS_HARMONY_API';
      branchStatus = `iOS/鸿蒙API分支: ${branchKey}`;
    } else if (branchKey.includes('NO_CALLBACK')) {
      branch = 'IOS_HARMONY_NO_CALLBACK';
      branchStatus = '无需回推';
    } else if (branchKey.includes('CONFIG')) {
      branch = 'CONFIG_ANOMALY';
      branchStatus = `配置异常: ${branchKey}`;
    } else {
      branch = 'UNKNOWN';
      branchStatus = `未知分支: ${branchKey || '无'}`;
    }
  } else {
    // 微信/抖音等小游戏平台，默认走API
    branch = 'ANDROID_API';
    branchStatus = `${platform} API回传`;
  }

  // Step 6: 通用闭环检查
  const coreSteps = [
    { key: 'check_base_event_ingestion', toolName: 'diag.check_base_event_ingestion', label: '检查基础事件入库' },
    { key: 'check_attr_preprocess_result', toolName: 'diag.check_attr_preprocess_result', label: '检查归因预处理结果' },
    { key: 'query_callback_media_event_summary', toolName: 'diag.query_callback_media_event_summary', label: '查询媒体事件汇总' },
  ];

  for (const step of coreSteps) {
    const call = await callSkillTool({
      servers: args.servers,
      toolName: step.toolName,
      input: {
        app_id: resolvedAppId,
        media_id: resolvedMediaId || undefined,
        date_start: dateStart,
        date_end: dateEnd,
        event_type: eventType,
        app_package_type: platform,
        problem_desc: args.message,
      }
    });
    toolCalls.push({ name: call.toolName, status: call.status, arguments: JSON.stringify(call.input), result: JSON.stringify(call.result) });
    workflowTrace.push({
      key: step.key,
      label: step.label,
      status: call.status === 'success' ? 'partial' : 'error',
      summary: call.message,
      toolName: call.toolName,
      serverName: call.serverName,
      input: call.input,
      output: call.result,
    });
    events.push(createProcessEvent({
      type: call.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
      label: step.key,
      status: call.status === 'success' ? 'success' : 'error',
      summary: call.message,
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      tool_name: call.toolName,
      input: call.input,
      output: call.result,
    }));
    if (!call.result || Object.keys(call.result).length === 0) {
      warnings.push(`${call.toolName} returned empty result`);
    }
  }

  // Step 7: 根据分支执行特定工具
  if (branch === 'ANDROID_SDK') {
    const deliveryCall = await callSkillTool({
      servers: args.servers,
      toolName: 'diag.check_callback_delivery_trace',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId || undefined, event_type: eventType, date_start: dateStart, date_end: dateEnd }
    });
    toolCalls.push({ name: deliveryCall.toolName, status: deliveryCall.status, arguments: JSON.stringify(deliveryCall.input), result: JSON.stringify(deliveryCall.result) });
    workflowTrace.push({
      key: 'check_callback_delivery_trace',
      label: '检查SDK回传链路',
      status: deliveryCall.status === 'success' ? 'partial' : 'error',
      summary: deliveryCall.message,
      toolName: deliveryCall.toolName,
      serverName: deliveryCall.serverName,
      input: deliveryCall.input,
      output: deliveryCall.result,
    });
    events.push(createProcessEvent({
      type: deliveryCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
      label: 'check_callback_delivery_trace',
      status: deliveryCall.status === 'success' ? 'success' : 'error',
      summary: deliveryCall.message,
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      tool_name: deliveryCall.toolName,
      input: deliveryCall.input,
      output: deliveryCall.result,
    }));
  } else if (branch === 'ANDROID_API') {
    const apiCall = await callSkillTool({
      servers: args.servers,
      toolName: 'diag.check_api_callback_result',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId || undefined, event_type: eventType, date_start: dateStart, date_end: dateEnd }
    });
    toolCalls.push({ name: apiCall.toolName, status: apiCall.status, arguments: JSON.stringify(apiCall.input), result: JSON.stringify(apiCall.result) });
    workflowTrace.push({
      key: 'check_api_callback_result',
      label: '检查API回传结果',
      status: apiCall.status === 'success' ? 'partial' : 'error',
      summary: apiCall.message,
      toolName: apiCall.toolName,
      serverName: apiCall.serverName,
      input: apiCall.input,
      output: apiCall.result,
    });
    events.push(createProcessEvent({
      type: apiCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
      label: 'check_api_callback_result',
      status: apiCall.status === 'success' ? 'success' : 'error',
      summary: apiCall.message,
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      tool_name: apiCall.toolName,
      input: apiCall.input,
      output: apiCall.result,
    }));
  } else if (branch === 'IOS_HARMONY_ACTIVATION') {
    const iosCall = await callSkillTool({
      servers: args.servers,
      toolName: 'diag.check_ios_activation_callback_closure',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId || undefined, event_type: eventType, date_start: dateStart, date_end: dateEnd }
    });
    toolCalls.push({ name: iosCall.toolName, status: iosCall.status, arguments: JSON.stringify(iosCall.input), result: JSON.stringify(iosCall.result) });
    workflowTrace.push({
      key: 'check_ios_activation_callback_closure',
      label: '检查iOS激活闭环',
      status: iosCall.status === 'success' ? 'partial' : 'error',
      summary: iosCall.message,
      toolName: iosCall.toolName,
      serverName: iosCall.serverName,
      input: iosCall.input,
      output: iosCall.result,
    });
    events.push(createProcessEvent({
      type: iosCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error',
      label: 'check_ios_activation_callback_closure',
      status: iosCall.status === 'success' ? 'success' : 'error',
      summary: iosCall.message,
      intent_type: 'diagnosis',
      agent: 'diagnosis',
      tool_name: iosCall.toolName,
      input: iosCall.input,
      output: iosCall.result,
    }));
  }

  // Step 8: 构建结论
  const conclusion = [
    `平台：${platform}`,
    `分支：${branch} - ${branchStatus}`,
    `应用：${resolvedAppId}`,
    resolvedMediaId ? `媒体：${resolvedMediaId}` : '',
    `事件：${eventType}`,
    `时间：${dateStart} ~ ${dateEnd}`,
  ].filter(Boolean);

  const status = branch === 'UNKNOWN' ? 'failed' : branch === 'CONFIG_ANOMALY' ? 'partial' : 'success';

  return {
    status,
    platform,
    branch,
    branchStatus,
    summary: `Callback attribution diagnosis completed. Branch: ${branch} - ${branchStatus}`,
    conclusion,
    missingFields: [],
    workflowTrace,
    evidenceRefs,
    sourceRefs,
    nextActions: [],
    toolCalls,
    events,
    warnings,
  };
}
