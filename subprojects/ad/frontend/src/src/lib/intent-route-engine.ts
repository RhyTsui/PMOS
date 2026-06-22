import type { AgentType, CompiledContextPackage, IntentType, McpServerConfig, RoleProfile, UserPreferenceProfile } from '@/types';
import { deriveRequestRouteDecision, type RequestRouteDecision as IntentRouteDecision } from './request-understanding';
import {
  evaluateIntentRouteRules,
  type IntentRuleCandidate,
  type IntentRouteRulesConfig,
} from './intent-route-rules';

export interface LlmRouteVerdict {
  intent_type: IntentType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface CompositeRouteDecision extends IntentRouteDecision {
  route_trace: {
    strategy: 'rules_llm_tools_role_score';
    selected_intent: IntentType;
    selected_agent: AgentType;
    selected_score: number;
    candidates: Array<{
      rule_id: string;
      policy_id: string;
      policy_version: number;
      rule_name: string;
      intent_type: IntentType;
      score: number;
      matched_terms: string[];
      excluded_terms: string[];
      tool_available: boolean;
      tool_matches: string[];
      rollout_percent: number;
      decision_scope: string;
      execution_authority: string;
      reasons: string[];
    }>;
    llm_verdict?: LlmRouteVerdict;
    tool_availability: {
      enabled_server_count: number;
      enabled_tool_count: number;
      report_tool_count: number;
      debugging_tool_count: number;
    };
    role_context: {
      role_id?: string;
      role_name?: string;
      allowed_intents: IntentType[];
      default_agent?: AgentType;
    };
    explanations: string[];
  };
}

export function resolveCompositeIntentRoute(params: {
  message: string;
  rulesConfig: IntentRouteRulesConfig;
  servers: McpServerConfig[];
  roleProfile?: RoleProfile | null;
  preferenceProfile?: UserPreferenceProfile | null;
  compiledContext?: CompiledContextPackage | null;
  llmVerdict?: LlmRouteVerdict | null;
  userKey?: string;
}): CompositeRouteDecision {
  const toolNames = params.servers.flatMap((server) => (
    server.enabled
      ? (server.tools || []).filter((tool) => tool.enabled).map((tool) => `${server.name}.${tool.name}.${tool.description || ''}`)
      : []
  ));
  const candidates = evaluateIntentRouteRules({
    message: params.message,
    rules: params.rulesConfig.rules,
    toolNames,
    userKey: params.userKey,
  });
  const fallback = deriveRequestRouteDecision(params.message, {
    roleProfile: params.roleProfile,
    preferenceProfile: params.preferenceProfile,
    businessContext: params.compiledContext?.businessContext || undefined,
    slotState: params.compiledContext?.slotState || undefined,
  });
  const scored = scoreCandidates({
    candidates,
    fallback,
    llmVerdict: params.llmVerdict || undefined,
    roleProfile: params.roleProfile || undefined,
    compiledContext: params.compiledContext || undefined,
  });
  const selected = scored[0];
  const selectedIntent = selected?.intent_type || fallback.intent_type;
  const baseDecision = selected
    ? deriveRequestRouteDecision(params.message, {
      roleProfile: params.roleProfile,
      preferenceProfile: params.preferenceProfile,
      businessContext: params.compiledContext?.businessContext || undefined,
      slotState: params.compiledContext?.slotState || undefined,
    })
    : fallback;
  const intentDecision: IntentRouteDecision = {
    ...baseDecision,
    intent_type: selectedIntent,
    agent: selected?.agent || baseDecision.agent,
    workflow_level: selected?.workflow_level || baseDecision.workflow_level,
    confidence: selected?.confidence || baseDecision.confidence,
    reason: selected?.reason || baseDecision.reason,
    is_business_related: selectedIntent !== 'general' || baseDecision.is_business_related,
    route_policy_id: selected?.policy_id || baseDecision.route_policy_id,
    route_policy_version: selected?.policy_version || baseDecision.route_policy_version,
    route_decision_scope: selected?.decision_scope || baseDecision.route_decision_scope,
    route_execution_authority: selected?.execution_authority || baseDecision.route_execution_authority,
    route_candidate_only: selected?.execution_authority ? selected.execution_authority !== 'execution_authorized' : baseDecision.route_candidate_only,
    candidate_source: selected ? 'route_rule_arbitration' : baseDecision.candidate_source || 'request_understanding_fallback',
    decision_scope: selected?.decision_scope || baseDecision.decision_scope || 'candidate_only',
    deprecation_target: baseDecision.deprecation_target,
    execution_decision: selected?.execution_authority === 'execution_authorized' ? 'needs_arbitration' : selectedIntent === 'general' ? 'no_executable_capability' : 'needs_arbitration',
    fallback_reason: selected ? undefined : baseDecision.fallback_reason || 'request_understanding_fallback_candidate',
    arbitrated_route: {
      status: selectedIntent === 'general' && !selected ? 'clarify_required' : 'pending_arbitration',
      selected_intent_type: selectedIntent,
      selected_agent: selected?.agent || baseDecision.agent,
      capability_id: null,
      arbitration_rule_id: selected?.policy_id || baseDecision.route_policy_id || 'request-understanding-fallback',
      reason: selected?.reason || baseDecision.reason,
    },
  };

  return {
    ...intentDecision,
    route_trace: {
      strategy: 'rules_llm_tools_role_score',
      selected_intent: intentDecision.intent_type,
      selected_agent: intentDecision.agent,
      selected_score: selected?.score || 0,
      candidates: candidates.map(candidate => ({
        rule_id: candidate.rule.id,
        policy_id: candidate.policy_id,
        policy_version: candidate.policy_version,
        rule_name: candidate.rule.name,
        intent_type: candidate.rule.intent_type,
        score: candidate.score,
        matched_terms: candidate.matched_terms,
        excluded_terms: candidate.excluded_terms,
        tool_available: candidate.tool_available,
        tool_matches: candidate.tool_matches,
        rollout_percent: candidate.rule.rollout_percent,
        decision_scope: candidate.decision_scope,
        execution_authority: candidate.execution_authority,
        reasons: candidate.reasons,
      })),
      llm_verdict: params.llmVerdict || undefined,
      tool_availability: summarizeTools(params.servers),
      role_context: {
        role_id: params.roleProfile?.id,
        role_name: params.roleProfile?.name,
        allowed_intents: params.roleProfile?.allowedIntentTypes || [],
        default_agent: params.roleProfile?.defaultAgent,
      },
      explanations: buildExplanations(selected, params.llmVerdict || undefined, params.roleProfile || undefined),
    },
  };
}

function scoreCandidates(params: {
  candidates: IntentRuleCandidate[];
  fallback: IntentRouteDecision;
  llmVerdict?: LlmRouteVerdict;
  roleProfile?: RoleProfile;
  compiledContext?: CompiledContextPackage;
}) {
  const rows = params.candidates.map((candidate) => {
    let score = candidate.score;
    if (params.llmVerdict?.intent_type === candidate.rule.intent_type) {
      score += params.llmVerdict.confidence === 'high' ? 35 : params.llmVerdict.confidence === 'medium' ? 20 : 8;
    }
    if (params.roleProfile?.allowedIntentTypes?.includes(candidate.rule.intent_type)) {
      score += 12;
    }
    if (params.roleProfile?.allowedIntentTypes?.length && !params.roleProfile.allowedIntentTypes.includes(candidate.rule.intent_type)) {
      score -= 20;
    }
    if (params.compiledContext?.routeHints.intentType === candidate.rule.intent_type) {
      score += 10;
    }
    return {
      intent_type: candidate.rule.intent_type,
      agent: candidate.rule.agent,
      workflow_level: candidate.rule.workflow_level,
      confidence: candidate.rule.confidence,
      reason: candidate.rule.reason_template,
      score,
      policy_id: candidate.policy_id,
      policy_version: candidate.policy_version,
      decision_scope: candidate.decision_scope,
      execution_authority: candidate.execution_authority,
    };
  });

  if (params.llmVerdict && !rows.some((row) => row.intent_type === params.llmVerdict!.intent_type)) {
    rows.push({
      intent_type: params.llmVerdict.intent_type,
      agent: agentForIntent(params.llmVerdict.intent_type),
      workflow_level: params.fallback.workflow_level,
      confidence: params.llmVerdict.confidence,
      reason: params.llmVerdict.reason,
      score: params.llmVerdict.confidence === 'high' ? 70 : params.llmVerdict.confidence === 'medium' ? 45 : 25,
      policy_id: `llm-route:${params.llmVerdict.intent_type}`,
      policy_version: 1,
      decision_scope: 'candidate',
      execution_authority: 'requires_arbitration',
    });
  }

  rows.push({
    intent_type: params.fallback.intent_type,
    agent: params.fallback.agent,
    workflow_level: params.fallback.workflow_level,
    confidence: params.fallback.confidence,
    reason: params.fallback.reason,
    score: params.fallback.confidence === 'high' ? 60 : params.fallback.confidence === 'medium' ? 40 : 10,
    policy_id: params.fallback.route_policy_id || `runtime-fallback:${params.fallback.intent_type}`,
    policy_version: params.fallback.route_policy_version || 1,
    decision_scope: params.fallback.route_decision_scope === 'candidate' || params.fallback.route_decision_scope === 'execution_gate'
      ? params.fallback.route_decision_scope
      : 'fallback',
    execution_authority: params.fallback.route_execution_authority === 'candidate_only' || params.fallback.route_execution_authority === 'execution_authorized'
      ? params.fallback.route_execution_authority
      : 'requires_arbitration',
  });

  return rows.sort((a, b) => b.score - a.score);
}

function summarizeTools(servers: McpServerConfig[]) {
  const enabledServers = servers.filter((server) => server.enabled);
  const enabledTools = enabledServers.flatMap((server) => (server.tools || []).filter((tool) => tool.enabled));
  const reportToolCount = enabledTools.filter((tool) => /report|roi|daily|hour|get_ads|query_report/i.test(`${tool.name} ${tool.description || ''}`)).length;
  const debuggingToolCount = enabledTools.filter((tool) => /debug|callback|postback|automation|trace/i.test(`${tool.name} ${tool.description || ''}`)).length;
  return {
    enabled_server_count: enabledServers.length,
    enabled_tool_count: enabledTools.length,
    report_tool_count: reportToolCount,
    debugging_tool_count: debuggingToolCount,
  };
}

function buildExplanations(
  selected: ReturnType<typeof scoreCandidates>[number] | undefined,
  llmVerdict: LlmRouteVerdict | undefined,
  roleProfile: RoleProfile | undefined,
): string[] {
  return [
    selected ? `最终选择 ${selected.intent_type}，综合分 ${selected.score}。` : '未命中配置规则，使用兜底路由。',
    llmVerdict ? `模型判别为 ${llmVerdict.intent_type}，置信度 ${llmVerdict.confidence}。` : '模型判别未执行或不可用。',
    roleProfile ? `角色 ${roleProfile.name} 参与加权。` : '未加载角色上下文。',
  ];
}

function agentForIntent(intent: IntentType): AgentType {
  const map: Record<IntentType, AgentType> = {
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
  return map[intent] || 'hub';
}
