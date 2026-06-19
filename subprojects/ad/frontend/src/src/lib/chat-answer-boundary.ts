import type { IntentType } from '@/types';

export type ChatAnswerBoundaryMode =
  | 'post_tool_polish_allowed'
  | 'blocked_by_report_query'
  | 'blocked_by_executable_tool'
  | 'blocked_by_selected_skill'
  | 'blocked_by_service_intent'
  | 'blocked_by_route_intent'
  | 'allowed_by_service_intent'
  | 'blocked_by_unsupported_intent';

export interface ChatAnswerBoundaryPolicy {
  allowedServiceIntents: string[];
  blockedServiceIntents: string[];
  blockedRouteIntents: string[];
  supportPostToolPolish: boolean;
}

export const DEFAULT_CHAT_ANSWER_BOUNDARY_POLICY: ChatAnswerBoundaryPolicy = {
  allowedServiceIntents: ['general', 'general_chat', 'help_qa', 'light_requirement'],
  blockedServiceIntents: ['data_query', 'report_delivery', 'package_fetch', 'integration_workflow', 'issue_diagnosis', 'system_operation'],
  blockedRouteIntents: ['report_query', 'diagnosis', 'debugging', 'get_delivery_packages', 'monitor', 'forecast'],
  supportPostToolPolish: true,
};

export const CHAT_ANSWER_BOUNDARY_POLICY: ChatAnswerBoundaryPolicy = {
  ...DEFAULT_CHAT_ANSWER_BOUNDARY_POLICY,
  allowedServiceIntents: [...DEFAULT_CHAT_ANSWER_BOUNDARY_POLICY.allowedServiceIntents],
  blockedServiceIntents: [...DEFAULT_CHAT_ANSWER_BOUNDARY_POLICY.blockedServiceIntents],
  blockedRouteIntents: [...DEFAULT_CHAT_ANSWER_BOUNDARY_POLICY.blockedRouteIntents],
};

export interface ChatAnswerBoundaryInput {
  serviceIntent?: string;
  routeIntent?: IntentType | string;
  isReportQuery: boolean;
  hasSelectedSkill?: boolean;
  hasExecutableTool?: boolean;
  phase?: 'pre_tool' | 'post_tool_polish' | 'fallback';
}

export interface ChatAnswerBoundaryDecision {
  allowed: boolean;
  reason: string;
  mode: ChatAnswerBoundaryMode;
  policyCode: string;
}

export function buildChatAnswerBoundaryPolicy(overrides: Partial<ChatAnswerBoundaryPolicy> = {}): ChatAnswerBoundaryPolicy {
  return {
    ...CHAT_ANSWER_BOUNDARY_POLICY,
    allowedServiceIntents: [
      ...new Set([...CHAT_ANSWER_BOUNDARY_POLICY.allowedServiceIntents, ...(overrides.allowedServiceIntents || [])]),
    ],
    blockedServiceIntents: [
      ...new Set([...CHAT_ANSWER_BOUNDARY_POLICY.blockedServiceIntents, ...(overrides.blockedServiceIntents || [])]),
    ],
    blockedRouteIntents: [
      ...new Set([...CHAT_ANSWER_BOUNDARY_POLICY.blockedRouteIntents, ...(overrides.blockedRouteIntents || [])]),
    ],
    supportPostToolPolish: overrides.supportPostToolPolish ?? CHAT_ANSWER_BOUNDARY_POLICY.supportPostToolPolish,
  };
}

function toSet(values: string[]): Set<string> {
  return new Set(values);
}

export function evaluateChatAnswerBoundary(
  input: ChatAnswerBoundaryInput,
  policy: ChatAnswerBoundaryPolicy = CHAT_ANSWER_BOUNDARY_POLICY,
): ChatAnswerBoundaryDecision {
  const allowedServiceIntents = toSet(policy.allowedServiceIntents || []);
  const blockedServiceIntents = toSet(policy.blockedServiceIntents || []);
  const blockedRouteIntents = toSet(policy.blockedRouteIntents || []);

  if (input.isReportQuery) {
    return {
      allowed: false,
      mode: 'blocked_by_report_query',
      policyCode: 'report_query',
      reason: 'blocked:report_query',
    };
  }
  if (input.hasExecutableTool) {
    const allowed = input.phase === 'post_tool_polish' && policy.supportPostToolPolish;
    return {
      allowed,
      mode: allowed ? 'post_tool_polish_allowed' : 'blocked_by_executable_tool',
      policyCode: 'executable_tool',
      reason: allowed ? 'allowed:post_tool_polish' : 'blocked:executable_tool',
    };
  }
  if (input.hasSelectedSkill) {
    return {
      allowed: false,
      mode: 'blocked_by_selected_skill',
      policyCode: 'selected_skill',
      reason: 'blocked:selected_skill',
    };
  }
  if (input.serviceIntent && blockedServiceIntents.has(input.serviceIntent)) {
    return {
      allowed: false,
      mode: 'blocked_by_service_intent',
      policyCode: input.serviceIntent,
      reason: `blocked:service_intent:${input.serviceIntent}`,
    };
  }
  if (input.routeIntent && blockedRouteIntents.has(input.routeIntent)) {
    return {
      allowed: false,
      mode: 'blocked_by_route_intent',
      policyCode: input.routeIntent,
      reason: `blocked:route_intent:${input.routeIntent}`,
    };
  }
  if (input.serviceIntent && allowedServiceIntents.has(input.serviceIntent)) {
    return {
      allowed: true,
      mode: 'allowed_by_service_intent',
      policyCode: input.serviceIntent,
      reason: `allowed:service_intent:${input.serviceIntent}`,
    };
  }
  return {
    allowed: false,
    mode: 'blocked_by_unsupported_intent',
    policyCode: 'unsupported_intent',
    reason: 'blocked:unsupported_intent',
  };
}
