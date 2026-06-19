import { callMcpTool } from '@/lib/mcp-discovery';
import { listSkillContracts } from '@/lib/skill-contract-store';
import { findNormalizationCapabilityCandidates } from '@/lib/report-capability-manifest';
import type { ActionContract } from '@/contracts/semantic/action-contract';
import type { CompiledContextPackage, IntentType, McpServerConfig, McpToolConfig, BusinessContextSnapshot, AiNextAction, AgentProcessEvent, SkillContract } from '@/types';
import type { EvidenceRef } from '@/contracts/semantic/evidence-contract';
import type { SourceRef } from '@/contracts/semantic/source-contract';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import { createProcessEvent } from './chat-route-primitives';
export {
  executeCallbackAttributionDiagnosisSkill,
  type CallbackDiagnosisExecutionResult,
  type CallbackDiagnosisWorkflowTraceItem,
} from './callback-attribution-diagnosis-orchestration';
import type { CallbackDiagnosisWorkflowTraceItem } from './callback-attribution-diagnosis-orchestration';

type AndroidDiagnosisWorkflowTraceItem = CallbackDiagnosisWorkflowTraceItem & Record<string, unknown>;

function buildAndroidDiagnosisRuntimeDisplay(args: Record<string, unknown>) {
  return args;
}

function buildAndroidDiagnosisSemanticResult(args: {
  resultId?: string;
  title?: string;
  summary?: string;
  workflowTrace?: AndroidDiagnosisWorkflowTraceItem[];
  evidenceRefs?: EvidenceRef[];
  sourceRefs?: SourceRef[];
  actions?: ActionContract[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}): SemanticResultContract<Record<string, unknown>> {
  return {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: args.resultId || `android-diagnosis-${Date.now()}`,
    screenType: 'workflow-result',
    title: args.title || '归因回传问题排查',
    description: args.summary,
    createdAt: new Date().toISOString(),
    producer: { kind: 'workflow', name: 'callback-attribution-diagnosis' },
    regions: [
      {
        id: 'workflow-trace',
        type: 'workflow',
        componentBinding: 'workflow-trace',
        title: '排查过程',
        state: 'ready',
        data: { workflowTrace: args.workflowTrace || [] },
      },
    ],
    evidenceRefs: args.evidenceRefs || [],
    sourceRefs: args.sourceRefs || [],
    actions: args.actions || [],
    metadata: args.metadata,
  };
}

export interface SkillSelectionCandidate {
  skill: SkillContract;
  score: number;
  matchedTriggers: string[];
  reasons: string[];
}

export interface SkillSelectionResult {
  selected?: SkillSelectionCandidate;
  candidates: SkillSelectionCandidate[];
}

export interface AndroidDiagnosisExecutionResult {
  status: 'blocked' | 'partial' | 'success' | 'failed';
  branch: 'SDK' | 'API' | 'NOTHING' | 'CONFIG_ANOMALY' | 'UNKNOWN';
  branchStatus: string;
  summary: string;
  conclusion: string[];
  missingFields: string[];
  workflowTrace: AndroidDiagnosisWorkflowTraceItem[];
  semanticResult?: SemanticResultContract<Record<string, unknown>>;
  runtimeDisplay?: ReturnType<typeof buildAndroidDiagnosisRuntimeDisplay>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSlotText(slot: BusinessContextSnapshot[keyof BusinessContextSnapshot] | undefined): string {
  if (!slot || !isRecord(slot) || !('value' in slot)) return '';
  const value = slot.value;
  return Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim();
}

function textMatchScore(text: string, terms: string[]): { score: number; matched: string[] } {
  const normalized = text.toLowerCase();
  const matched = terms.filter(term => normalized.includes(term.toLowerCase()));
  return { score: matched.length, matched };
}

function isDataQueryLikeMessage(message: string, intentType?: IntentType | string): boolean {
  void message;
  return String(intentType || '') === 'report_query';
}

function readDeepString(value: unknown, keys: string[]): string {
  if (!isRecord(value)) return '';
  for (const key of keys) {
    const direct = value[key];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
  }
  const nestedKeys = ['selected_app', 'selected_media', 'selected', 'app', 'media', 'candidate', 'first_candidate'];
  for (const nestedKey of nestedKeys) {
    const nested = value[nestedKey];
    if (!isRecord(nested)) continue;
    for (const key of keys) {
      const direct = nested[key];
      if (typeof direct === 'string' && direct.trim()) return direct.trim();
    }
  }
  const candidates = value.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      if (!isRecord(candidate)) continue;
      for (const key of keys) {
        const direct = candidate[key];
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
      }
    }
  }
  return '';
}

function hasMultipleCandidates(result: Record<string, unknown>): boolean {
  return Array.isArray(result.candidates) && result.candidates.length > 1;
}

function normalizeResult(result: unknown): Record<string, unknown> {
  return isRecord(result) ? result : {};
}

function findToolServer(servers: McpServerConfig[], toolName: string): { server: McpServerConfig; tool: McpToolConfig } | null {
  for (const server of servers) {
    if (server.enabled === false) continue;
    const tool = server.tools.find(item => item.enabled !== false && item.name === toolName);
    if (tool) return { server, tool };
  }
  return null;
}

async function callSkillTool(args: {
  servers: McpServerConfig[];
  toolName: string;
  input: Record<string, unknown>;
}): Promise<{
  status: 'success' | 'failed';
  serverName: string;
  toolName: string;
  result: Record<string, unknown>;
  message: string;
  input: Record<string, unknown>;
}> {
  const located = findToolServer(args.servers, args.toolName);
  if (!located) {
    return {
      status: 'failed',
      serverName: 'unavailable',
      toolName: args.toolName,
      result: {},
      message: `tool not found: ${args.toolName}`,
      input: args.input,
    };
  }
  const response = await callMcpTool({
    endpoint_url: located.server.endpoint_url,
    transport: located.server.transport,
    auth_type: located.server.auth_type,
    auth_config: located.server.auth_config,
  }, args.toolName, args.input);
  return {
    status: response.ok ? 'success' : 'failed',
    serverName: located.server.name,
    toolName: args.toolName,
    result: normalizeResult(response.result),
    message: response.ok ? 'tool ok' : response.msg,
    input: args.input,
  };
}

function buildActionContracts(branch: string, missingFields: string[]): ActionContract[] {
  if (missingFields.length > 0) {
    return [{
      id: 'clarify-missing-fields',
      label: '补充缺失信息',
      type: 'continue-analysis',
      intent: 'secondary',
      target: { kind: 'workflow', value: 'clarify_missing_fields' },
      metadata: { action: 'clarify_missing_fields', risk_level: 'low', auto_executable: false },
    }];
  }
  if (branch === 'CONFIG_ANOMALY') {
    return [
      {
        id: 'open-callback-rule-config',
        label: '查看回传配置',
        type: 'open-artifact',
        intent: 'primary',
        target: { kind: 'workflow', value: 'open_callback_rule_config' },
        metadata: { action: 'open_callback_rule_config', risk_level: 'low', auto_executable: true },
      },
      {
        id: 'continue-diagnosis',
        label: '继续排查',
        type: 'continue-analysis',
        intent: 'secondary',
        target: { kind: 'workflow', value: 'continue_diagnosis' },
        metadata: { action: 'continue_diagnosis', risk_level: 'low', auto_executable: false },
      },
    ];
  }
  if (branch === 'NOTHING') {
    return [{
      id: 'open-callback-rule-config-no-callback',
      label: '查看不回传配置',
      type: 'open-artifact',
      intent: 'primary',
      target: { kind: 'workflow', value: 'open_callback_rule_config' },
      metadata: { action: 'open_callback_rule_config', risk_level: 'low', auto_executable: true },
    }];
  }
  return [
    {
      id: 'open-execution-detail',
      label: '查看执行详情',
      type: 'open-artifact',
      intent: 'primary',
      target: { kind: 'workflow', value: 'open_execution_detail' },
      metadata: { action: 'open_execution_detail', risk_level: 'low', auto_executable: true },
    },
    {
      id: 'continue-diagnosis-default',
      label: '继续追问',
      type: 'continue-analysis',
      intent: 'secondary',
      target: { kind: 'workflow', value: 'continue_diagnosis' },
      metadata: { action: 'continue_diagnosis', risk_level: 'low', auto_executable: false },
    },
  ];
}

function buildDiagnosisNextActions(branch: string, missingFields: string[]): AiNextAction[] {
  if (missingFields.length > 0) {
    return [{ label: '补充缺失信息', type: 'follow_up', intent: 'diagnosis', action: 'clarify_missing_fields', risk_level: 'low', auto_executable: false }];
  }
  if (branch === 'CONFIG_ANOMALY') {
    return [
      { label: '查看回传配置', type: 'open_panel', intent: 'diagnosis', action: 'open_callback_rule_config', risk_level: 'low', auto_executable: true },
      { label: '继续排查', type: 'follow_up', intent: 'diagnosis', action: 'continue_diagnosis', risk_level: 'low', auto_executable: false },
    ];
  }
  if (branch === 'NOTHING') {
    return [{ label: '查看不回传配置', type: 'open_panel', intent: 'diagnosis', action: 'open_callback_rule_config', risk_level: 'low', auto_executable: true }];
  }
  return [
    { label: '查看执行详情', type: 'open_panel', intent: 'diagnosis', action: 'open_execution_detail', risk_level: 'low', auto_executable: true },
    { label: '继续追问', type: 'follow_up', intent: 'diagnosis', action: 'continue_diagnosis', risk_level: 'low', auto_executable: false },
  ];
}

function branchConclusion(branch: string): string[] {
  if (branch === 'NOTHING') return ['Current config is no-callback.'];
  if (branch === 'SDK') return ['SDK branch matched. Continue checking integration and callback trace.'];
  if (branch === 'API') return ['API branch matched. Continue checking API callback result.'];
  if (branch === 'CONFIG_ANOMALY') return ['Callback configuration is anomalous.'];
  return ['Branch is not fully identified.'];
}

function branchFromRuleResult(result: Record<string, unknown>): { branch: AndroidDiagnosisExecutionResult['branch']; branchStatus: string } {
  const callbackMode = readDeepString(result, ['callbackMode', 'callback_mode']).toUpperCase();
  const callbackModeDetail = readDeepString(result, ['callbackModeDetail', 'callback_mode_detail']).toUpperCase();
  const normalized = callbackModeDetail || callbackMode;
  if (normalized.includes('NOTHING')) return { branch: 'NOTHING', branchStatus: 'NO_CALLBACK' };
  if (normalized.includes('API')) return { branch: 'API', branchStatus: 'API_CALLBACK' };
  if (normalized.includes('SDK') || normalized.includes('ALL_RULE')) return { branch: 'SDK', branchStatus: 'SDK_CALLBACK' };
  if (normalized.includes('ANOMALY') || normalized.includes('MISSING')) return { branch: 'CONFIG_ANOMALY', branchStatus: 'CONFIG_ANOMALY' };
  return { branch: 'UNKNOWN', branchStatus: normalized || 'UNKNOWN' };
}

function buildTraceItem(args: {
  key: string;
  label: string;
  status: AndroidDiagnosisWorkflowTraceItem['status'];
  summary: string;
  toolName?: string;
  serverName?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}): AndroidDiagnosisWorkflowTraceItem {
  return {
    key: args.key,
    label: args.label,
    status: args.status,
    summary: args.summary,
    toolName: args.toolName,
    serverName: args.serverName,
    input: args.input,
    output: args.output,
    evidenceRefs: [],
    sourceRefs: args.toolName ? [`${args.serverName || 'unknown'}.${args.toolName}`] : [],
  };
}

function buildToolCallRecord(call: { toolName: string; serverName: string; status: string; input: Record<string, unknown>; result: Record<string, unknown> }, stepKey: string) {
  return {
    name: call.toolName,
    kind: 'mcp',
    status: call.status,
    arguments: JSON.stringify(call.input),
    result: JSON.stringify(call.result),
    display_name: call.toolName,
    provider_url: call.serverName,
    step_key: stepKey,
  };
}

function buildEvidenceAndSource(call: { toolName: string; serverName: string; result: Record<string, unknown> }, stepKey: string): { evidenceRef: EvidenceRef; sourceRef: SourceRef } {
  const sourceId = `${call.serverName}.${call.toolName}`;
  return {
    evidenceRef: {
      id: `android-diag-${stepKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'tool-output',
      title: `${call.toolName} result`,
      summary: 'Tool returned verifiable output',
      sourceRefIds: [sourceId],
      fields: { stepKey, result: call.result },
      verification: { status: 'unverified', verifiedBy: 'tool' },
      metadata: { stepKey, toolName: call.toolName },
    },
    sourceRef: {
      id: sourceId,
      type: 'tool',
      title: call.toolName,
      description: `${call.serverName} tool output`,
      locator: { kind: 'tool', value: call.toolName, params: call.result },
      retrievedAt: new Date().toISOString(),
      reliability: { level: 'verified', explanation: 'from configured MCP tool' },
      citationPolicy: { required: true, format: 'panel', clickable: false, quoteAllowed: false },
      metadata: { serverName: call.serverName, toolName: call.toolName },
    },
  };
}

export async function selectSkillCandidate(message: string, intentType?: IntentType | string, routeReason?: string): Promise<SkillSelectionResult> {
  const contracts = (await listSkillContracts()).filter(skill => skill.enabled !== false);
  const candidates = contracts.map((skill): SkillSelectionCandidate => {
    const metricExplainerSuppressed = skill.skill_id === 'metric_explainer_skill'
      && isDataQueryLikeMessage(message, intentType);
    const triggerResult = textMatchScore(message, skill.intent_triggers || []);
    const requiresDomainTrigger = skill.selection_policy?.requires_trigger_match_for_route_bonus === true;
    const routeBonus = intentType
      && ['diagnosis', 'debugging'].includes(String(intentType))
      && ['diagnosis', 'debugging'].includes(skill.category)
      && (!requiresDomainTrigger || triggerResult.score > 0)
      ? 2
      : 0;
    const score = metricExplainerSuppressed ? 0 : triggerResult.score + routeBonus;
    const reasons = [
      triggerResult.matched.length ? `matched triggers: ${triggerResult.matched.join(', ')}` : '',
      routeBonus ? `route match: ${String(intentType)}` : '',
      metricExplainerSuppressed ? 'suppressed: data query context' : '',
      routeReason ? `route reason: ${routeReason}` : '',
    ].filter(Boolean);
    return { skill, score, matchedTriggers: triggerResult.matched, reasons };
  }).filter(candidate => candidate.score > 0);
  const selected = candidates.sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name, 'zh-Hans-CN'))[0];
  return { selected, candidates };
}

export async function executeAndroidAttributionDiagnosisSkill(args: {
  message: string;
  compiledContext: CompiledContextPackage;
  routeReason?: string;
  servers: McpServerConfig[];
}): Promise<AndroidDiagnosisExecutionResult> {
  const missingFields: string[] = [];
  const toolCalls: AndroidDiagnosisExecutionResult['toolCalls'] = [];
  const events: AgentProcessEvent[] = [];
  const workflowTrace: AndroidDiagnosisWorkflowTraceItem[] = [];
  const evidenceRefs: EvidenceRef[] = [];
  const sourceRefs: SourceRef[] = [];
  const warnings: string[] = [];

  const appQuery = readSlotText(args.compiledContext.businessContext.app) || String(args.compiledContext.project.currentProject?.appName || args.compiledContext.project.currentProject?.appId || '').trim() || /(?:app_id|appId|应用ID|项目ID)[:：=\s]*([A-Za-z0-9_-]+)/i.exec(args.message)?.[1] || '';
  const mediaQuery = readSlotText(args.compiledContext.businessContext.media) || /巨量|腾讯|快手|穿山甲|广点通|今日头条|taptap/i.exec(args.message)?.[0] || '';
  const timeRange = readSlotText(args.compiledContext.businessContext.timeRange);
  const timeMatch = timeRange.match(/^(\d{4}-\d{1,2}-\d{1,2})~(\d{4}-\d{1,2}-\d{1,2})$/) || /(\d{4}-\d{1,2}-\d{1,2})(?:至|到|~)(\d{4}-\d{1,2}-\d{1,2})/.exec(args.message);
  const dateStart = timeMatch?.[1] || '';
  const dateEnd = timeMatch?.[2] || '';
  const eventType = /register/i.test(args.message) ? 'REGISTER' : /payment|pay|支付|付款/i.test(args.message) ? 'PAY' : 'PAY';
  const appPackageType = /ios/i.test(args.message) ? 'IOS' : /harmony/i.test(args.message) ? 'HARMONY' : 'ANDROID';

  if (!appQuery) missingFields.push('app_query');
  if (!dateStart) missingFields.push('date_start');
  if (!dateEnd) missingFields.push('date_end');
  if (!eventType) missingFields.push('event_type');

  if (missingFields.length > 0) {
    const summary = `Need more fields: ${missingFields.join(', ')}`;
    const semanticResult = buildAndroidDiagnosisSemanticResult({
      resultId: `android-diag-${Date.now()}`,
      title: 'Android attribution diagnosis',
      summary,
      branch: 'UNKNOWN',
      branchStatus: 'WAITING_FOR_USER',
      workflowTrace,
      conclusion: ['Fill required fields before continuing.'],
      actions: buildActionContracts('UNKNOWN', missingFields),
      metadata: { missingFields, routeReason: args.routeReason },
    });
    const runtimeDisplay = buildAndroidDiagnosisRuntimeDisplay({
      runtimeId: `android-diag-${Date.now()}`,
      status: 'waiting-for-user',
      workflowTrace,
      metadata: { missingFields },
    });
    return {
      status: 'blocked',
      branch: 'UNKNOWN',
      branchStatus: 'WAITING_FOR_USER',
      summary,
      conclusion: ['Fill required fields before continuing.'],
      missingFields,
      workflowTrace,
      semanticResult,
      runtimeDisplay,
      evidenceRefs,
      sourceRefs,
      nextActions: buildDiagnosisNextActions('UNKNOWN', missingFields),
      toolCalls,
      events,
      warnings,
    };
  }

  const appCall = await callSkillTool({ servers: args.servers, toolName: 'fetch_app_context', input: { app_query: appQuery, problem_desc: args.message } });
  toolCalls.push(buildToolCallRecord(appCall, 'resolve_app_context'));
  workflowTrace.push(buildTraceItem({ key: 'resolve_app_context', label: 'Resolve app', status: appCall.status === 'success' ? 'partial' : 'error', summary: appCall.message, toolName: appCall.toolName, serverName: appCall.serverName, input: appCall.input, output: appCall.result }));
  events.push(createProcessEvent({ type: appCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: 'resolve_app_context', status: appCall.status === 'success' ? 'success' : 'error', summary: appCall.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: appCall.toolName, input: appCall.input, output: appCall.result }));

  const resolvedAppId = readDeepString(appCall.result, ['app_id', 'id']) || appQuery;
  if (!resolvedAppId || appCall.status !== 'success' || hasMultipleCandidates(appCall.result)) {
    const summary = resolvedAppId ? 'App candidates found, please choose one.' : 'Unable to uniquely resolve app.';
    const semanticResult = buildAndroidDiagnosisSemanticResult({
      resultId: `android-diag-${Date.now()}`,
      title: 'Android attribution diagnosis',
      summary,
      branch: 'UNKNOWN',
      branchStatus: 'NEED_APP_SELECTION',
      workflowTrace,
      conclusion: ['Please confirm the app first.'],
      actions: buildActionContracts('UNKNOWN', ['app_selection']),
      metadata: { routeReason: args.routeReason, appCall: appCall.result },
    });
    const runtimeDisplay = buildAndroidDiagnosisRuntimeDisplay({ runtimeId: `android-diag-${Date.now()}`, status: 'waiting-for-user', workflowTrace, metadata: { appCall: appCall.result } });
    return {
      status: 'blocked',
      branch: 'UNKNOWN',
      branchStatus: 'NEED_APP_SELECTION',
      summary,
      conclusion: ['Please confirm the app first.'],
      missingFields: ['app_selection'],
      workflowTrace,
      semanticResult,
      runtimeDisplay,
      evidenceRefs,
      sourceRefs,
      nextActions: buildDiagnosisNextActions('UNKNOWN', ['app_selection']),
      toolCalls,
      events,
      warnings,
    };
  }

  let resolvedMediaId = '';
  const mediaNormalizationCandidates = findNormalizationCapabilityCandidates(args.servers, 'media', mediaQuery || args.message);
  const mediaNormalizationAttempts: Array<{ tool_name: string; server_name: string; status: string; result: Record<string, unknown>; message: string }> = [];
  for (const candidate of mediaNormalizationCandidates) {
    const mediaCall = await callSkillTool({ servers: args.servers, toolName: candidate.tool.name, input: { appId: resolvedAppId } });
    toolCalls.push(buildToolCallRecord(mediaCall, 'resolve_media_identifier'));
    workflowTrace.push(buildTraceItem({ key: 'resolve_media_identifier', label: `Resolve media id via ${candidate.tool.name}`, status: mediaCall.status === 'success' ? 'partial' : 'error', summary: mediaCall.message, toolName: mediaCall.toolName, serverName: mediaCall.serverName, input: mediaCall.input, output: mediaCall.result }));
    events.push(createProcessEvent({ type: mediaCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: 'resolve_media_identifier', status: mediaCall.status === 'success' ? 'success' : 'error', summary: mediaCall.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: mediaCall.toolName, input: mediaCall.input, output: mediaCall.result }));
    mediaNormalizationAttempts.push({ tool_name: mediaCall.toolName, server_name: mediaCall.serverName, status: mediaCall.status, result: mediaCall.result, message: mediaCall.message });
    const candidateMediaId = readDeepString(mediaCall.result, ['media_id', 'id']);
    if (mediaCall.status === 'success' && candidateMediaId && !hasMultipleCandidates(mediaCall.result)) {
      resolvedMediaId = candidateMediaId;
      break;
    }
  }

  if (!resolvedMediaId) {
    const summary = mediaQuery ? 'Need to choose a media candidate before continuing.' : 'Need media identifier before continuing.';
    const semanticResult = buildAndroidDiagnosisSemanticResult({
      resultId: `android-diag-${Date.now()}`,
      title: 'Android attribution diagnosis',
      summary,
      branch: 'UNKNOWN',
      branchStatus: 'NEED_MEDIA_SELECTION',
      workflowTrace,
      conclusion: ['Please confirm the media first.'],
      actions: buildActionContracts('UNKNOWN', ['media_selection']),
      metadata: { routeReason: args.routeReason, mediaNormalizationAttempts },
    });
    const runtimeDisplay = buildAndroidDiagnosisRuntimeDisplay({ runtimeId: `android-diag-${Date.now()}`, status: 'waiting-for-user', workflowTrace, metadata: { mediaNormalizationAttempts } });
    return {
      status: 'blocked',
      branch: 'UNKNOWN',
      branchStatus: 'NEED_MEDIA_SELECTION',
      summary,
      conclusion: ['Please confirm the media first.'],
      missingFields: ['media_selection'],
      workflowTrace,
      semanticResult,
      runtimeDisplay,
      evidenceRefs,
      sourceRefs,
      nextActions: buildDiagnosisNextActions('UNKNOWN', ['media_selection']),
      toolCalls,
      events,
      warnings,
    };
  }

  if (mediaQuery) {
    const mediaContextCall = await callSkillTool({ servers: args.servers, toolName: 'fetch_media_context', input: { app_id: resolvedAppId, media_id: resolvedMediaId, media_query: mediaQuery, app_package_type: appPackageType, problem_desc: args.message } });
    toolCalls.push(buildToolCallRecord(mediaContextCall, 'resolve_media_context'));
    workflowTrace.push(buildTraceItem({ key: 'resolve_media_context', label: 'Resolve media context', status: mediaContextCall.status === 'success' ? 'partial' : 'error', summary: mediaContextCall.message, toolName: mediaContextCall.toolName, serverName: mediaContextCall.serverName, input: mediaContextCall.input, output: mediaContextCall.result }));
    events.push(createProcessEvent({ type: mediaContextCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: 'resolve_media_context', status: mediaContextCall.status === 'success' ? 'success' : 'error', summary: mediaContextCall.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: mediaContextCall.toolName, input: mediaContextCall.input, output: mediaContextCall.result }));
  }

  const coreSteps = [
    { key: 'check_base_event_ingestion', toolName: 'check_base_event_ingestion', input: { app_id: resolvedAppId, date_start: dateStart, date_end: dateEnd, event_type: eventType, problem_desc: args.message } },
    { key: 'check_attr_preprocess_result', toolName: 'check_attr_preprocess_result', input: { app_id: resolvedAppId, date_start: dateStart, date_end: dateEnd, event_type: eventType, app_package_type: appPackageType, problem_desc: args.message } },
    { key: 'check_callback_rule_match', toolName: 'check_callback_rule_match', input: { app_id: resolvedAppId, media_id: resolvedMediaId, app_package_type: appPackageType, event_type: eventType, date_start: dateStart, date_end: dateEnd, problem_desc: args.message } },
  ];

  let branch: AndroidDiagnosisExecutionResult['branch'] = 'UNKNOWN';
  let branchStatus = 'UNKNOWN';
  let branchProbe: Record<string, unknown> = {};

  for (const step of coreSteps) {
    const call = await callSkillTool({ servers: args.servers, toolName: step.toolName, input: step.input });
    toolCalls.push(buildToolCallRecord(call, step.key));
    workflowTrace.push(buildTraceItem({ key: step.key, label: step.key, status: call.status === 'success' ? 'partial' : 'error', summary: call.message, toolName: call.toolName, serverName: call.serverName, input: call.input, output: call.result }));
    events.push(createProcessEvent({ type: call.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: step.key, status: call.status === 'success' ? 'success' : 'error', summary: call.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: call.toolName, input: call.input, output: call.result }));
    if (!Object.keys(call.result).length && call.status !== 'success') {
      warnings.push(`${call.toolName} unavailable or empty`);
    }
    if (step.key === 'check_callback_rule_match') {
      branchProbe = call.result;
      const info = branchFromRuleResult(call.result);
      branch = info.branch;
      branchStatus = info.branchStatus;
    }
  }

  if (branch === 'SDK') {
    const resolvedAppVersion = readDeepString(appCall.result, ['app_version', 'version']);
    const sdkCall = await callSkillTool({
      servers: args.servers,
      toolName: 'check_app_sdk_integration',
      input: { app_id: resolvedAppId, ...(resolvedAppVersion ? { app_version: resolvedAppVersion } : {}), problem_desc: 'SDK branch' },
    });
    toolCalls.push(buildToolCallRecord(sdkCall, 'check_app_sdk_integration'));
    workflowTrace.push(buildTraceItem({ key: 'check_app_sdk_integration', label: 'Check SDK integration', status: sdkCall.status === 'success' ? 'partial' : 'error', summary: sdkCall.message, toolName: sdkCall.toolName, serverName: sdkCall.serverName, input: sdkCall.input, output: sdkCall.result }));
    events.push(createProcessEvent({ type: sdkCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: 'check_app_sdk_integration', status: sdkCall.status === 'success' ? 'success' : 'error', summary: sdkCall.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: sdkCall.toolName, input: sdkCall.input, output: sdkCall.result }));

    const deliveryCall = await callSkillTool({
      servers: args.servers,
      toolName: 'check_callback_delivery_trace',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId, date_start: dateStart, date_end: dateEnd, event_type: eventType, app_package_type: appPackageType, problem_desc: args.message },
    });
    toolCalls.push(buildToolCallRecord(deliveryCall, 'check_callback_delivery_trace'));
    workflowTrace.push(buildTraceItem({ key: 'check_callback_delivery_trace', label: 'Check callback delivery trace', status: deliveryCall.status === 'success' ? 'partial' : 'error', summary: deliveryCall.message, toolName: deliveryCall.toolName, serverName: deliveryCall.serverName, input: deliveryCall.input, output: deliveryCall.result }));
    events.push(createProcessEvent({ type: deliveryCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: 'check_callback_delivery_trace', status: deliveryCall.status === 'success' ? 'success' : 'error', summary: deliveryCall.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: deliveryCall.toolName, input: deliveryCall.input, output: deliveryCall.result }));
  } else if (branch === 'API') {
    const apiCall = await callSkillTool({
      servers: args.servers,
      toolName: 'check_api_callback_result',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId, date_start: dateStart, date_end: dateEnd, event_type: eventType, app_package_type: appPackageType, problem_desc: args.message },
    });
    toolCalls.push(buildToolCallRecord(apiCall, 'check_api_callback_result'));
    workflowTrace.push(buildTraceItem({ key: 'check_api_callback_result', label: 'Check API callback result', status: apiCall.status === 'success' ? 'partial' : 'error', summary: apiCall.message, toolName: apiCall.toolName, serverName: apiCall.serverName, input: apiCall.input, output: apiCall.result }));
    events.push(createProcessEvent({ type: apiCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: 'check_api_callback_result', status: apiCall.status === 'success' ? 'success' : 'error', summary: apiCall.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: apiCall.toolName, input: apiCall.input, output: apiCall.result }));
  } else if (branch === 'CONFIG_ANOMALY') {
    const configCall = await callSkillTool({
      servers: args.servers,
      toolName: 'query_callback_rule_config',
      input: { app_id: resolvedAppId, media_id: resolvedMediaId, app_package_type: appPackageType, event_type: eventType, problem_desc: args.message },
    });
    toolCalls.push(buildToolCallRecord(configCall, 'query_callback_rule_config'));
    workflowTrace.push(buildTraceItem({ key: 'query_callback_rule_config', label: 'Query callback rule config', status: configCall.status === 'success' ? 'partial' : 'error', summary: configCall.message, toolName: configCall.toolName, serverName: configCall.serverName, input: configCall.input, output: configCall.result }));
    events.push(createProcessEvent({ type: configCall.status === 'success' ? 'mcp.tool_result' : 'mcp.tool_error', label: 'query_callback_rule_config', status: configCall.status === 'success' ? 'success' : 'error', summary: configCall.message, intent_type: 'diagnosis', agent: 'diagnosis', tool_name: configCall.toolName, input: configCall.input, output: configCall.result }));
  }

  const evidenceSourcePairs = toolCalls.map((call, index) => {
    const resultObject = JSON.parse(call.result || '{}') as Record<string, unknown>;
    const pair = buildEvidenceAndSource({ toolName: call.name, serverName: call.provider_url || 'unknown', result: resultObject }, call.step_key || `step-${index}`);
    return pair;
  });
  evidenceRefs.push(...evidenceSourcePairs.map(item => item.evidenceRef));
  sourceRefs.push(...evidenceSourcePairs.map(item => item.sourceRef));

  const branchConclusions = branchConclusion(branch);
  const summary = branchStatus || branchConclusions[0];
  const semanticResult = buildAndroidDiagnosisSemanticResult({
    resultId: `android-diag-${Date.now()}`,
    title: 'Android attribution diagnosis',
    summary,
    branch,
    branchStatus,
    workflowTrace,
    conclusion: branchConclusions,
    evidenceRefs,
    sourceRefs,
    actions: buildActionContracts(branch, missingFields),
    metadata: { routeReason: args.routeReason, branchProbe, warnings },
  });
  const runtimeDisplay = buildAndroidDiagnosisRuntimeDisplay({
    runtimeId: `android-diag-${Date.now()}`,
    status: branch === 'UNKNOWN' ? 'failed' : branch === 'CONFIG_ANOMALY' ? 'partially-succeeded' : 'succeeded',
    workflowTrace,
    metadata: { warnings, branch },
  });

  return {
    status: branch === 'UNKNOWN' ? 'failed' : branch === 'CONFIG_ANOMALY' ? 'partial' : 'success',
    branch,
    branchStatus,
    summary,
    conclusion: branchConclusions,
    missingFields,
    workflowTrace,
    semanticResult,
    runtimeDisplay,
    evidenceRefs,
    sourceRefs,
    nextActions: buildDiagnosisNextActions(branch, missingFields),
    toolCalls,
    events,
    warnings,
  };
}
