/**
 * Report Execution Gate
 *
 * 统一执行门控函数，基于 Semantic Frame + Capability Contract + Policy 决策。
 *
 * 进入 report execution 必须全部条件满足：
 * 1. route.intent_type === 'report_query'
 * 2. route.requiresExecution === true
 * 3. semanticFrame.executionMode 属于执行类（data_execution / diagnostic_evidence / workflow_execution）
 * 4. serviceIntent execution policy category 属于 execution / evidence_execution
 * 5. selected capability 的 purpose 在 policy.allowedPurposes 中（如有 selected）
 *
 * 关键原则：
 * - semantic frame 只表达理解结果，不授权执行
 * - capabilityReportMatch 只作为候选证据，不独立触发执行
 * - read_only_lookup 模式不能进入 report_execution
 */

import type { RequestRouteDecision } from './request-understanding';
import type { UserRequirementContract } from '@/contracts/request-understanding/user-requirement-contract';
import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';
import type { RequestSemanticFrame, ExecutionMode } from '@/contracts/request-understanding/semantic-frame-contract';
import {
  getServiceIntentExecutionPolicy,
  inferCapabilityPurpose,
  type CapabilityPurpose,
} from './service-intent-execution-policy';

// ─── Types ─────────────────────────────────────────────────

export interface ReportExecutionGateInput {
  route: RequestRouteDecision;
  userRequirement: UserRequirementContract;
  semanticFrame?: RequestSemanticFrame | null;
  selectedCapability?: CapabilityManifest | { capability: CapabilityManifest } | null;
  capabilityReportMatch: boolean;
  reportRouteMatch: boolean;
}

export interface ReportExecutionGateResult {
  shouldEnter: boolean;
  reasons: string[];
  blockedBy: string[];
  policy: {
    serviceIntent: string;
    category: string;
    executionMode?: ExecutionMode;
    requiresToolExecution: boolean;
    capabilityPurpose?: CapabilityPurpose;
  };
}

// ─── Execution Mode Check ──────────────────────────────────

/**
 * 检查 executionMode 是否允许 report execution
 * - data_execution: 允许（查报表）
 * - diagnostic_evidence: 允许（诊断证据）
 * - workflow_execution: 允许（工作流）
 * - read_only_lookup: 阻止（只读查询字典/知识库）
 * - none: 阻止（纯回答）
 * - mutation: 阻止（状态变更，不是报表执行）
 */
function isExecutionModeAllowedForReport(mode: ExecutionMode): boolean {
  return mode === 'data_execution' ||
         mode === 'diagnostic_evidence' ||
         mode === 'workflow_execution';
}

// ─── Capability Normalizer ─────────────────────────────────

/**
 * Normalize capability input - handle both manifest and candidate wrapper
 */
function normalizeCapability(
  input: CapabilityManifest | { capability: CapabilityManifest } | null | undefined,
): CapabilityManifest | null {
  if (!input) return null;
  // If it's a wrapper with capability property, extract it
  if ('capability' in input && input.capability) {
    return input.capability;
  }
  // Otherwise it's the manifest itself
  return input as CapabilityManifest;
}

// ─── Gate Function ─────────────────────────────────────────

export function shouldEnterReportExecution(
  input: ReportExecutionGateInput,
): ReportExecutionGateResult {
  const reasons: string[] = [];
  const blockedBy: string[] = [];

  // PRIORITY: Use semanticFrame.serviceIntent if available, as it's derived from
  // the semantic task analysis, not keyword matching
  // Fall back to userRequirement.serviceIntent, then route.tracking_target
  //
  // Exception: when reportRouteMatch is true AND the route is report_query with
  // requiresExecution, the route-level evidence (multi-signal) is more reliable
  // than the speech-act-based semantic frame. In this case, use 'data_query'
  // directly (mapped from route.intent_type === 'report_query') so that a
  // misclassified semantic frame or a generic userRequirement doesn't block
  // a legitimate data query.
  const routeIsStrongReport = input.reportRouteMatch
    && input.route.intent_type === 'report_query'
    && input.route.requiresExecution;
  const serviceIntent = routeIsStrongReport
    ? 'data_query'
    : (input.semanticFrame?.serviceIntent ||
       input.userRequirement.serviceIntent ||
       input.route.tracking_target ||
       'general_chat');
  const policy = getServiceIntentExecutionPolicy(serviceIntent);

  // Normalize capability input (handle both manifest and candidate wrapper)
  const selectedCapability = normalizeCapability(input.selectedCapability);

  // Get execution mode from semantic frame
  const executionMode = input.semanticFrame?.executionMode;

  // Gate 1: route intent must be report_query
  if (input.route.intent_type !== 'report_query') {
    blockedBy.push(`route_intent:${input.route.intent_type}`);
  } else {
    reasons.push('route_intent:report_query');
  }

  // Gate 2: execution must be authorized by route decision
  if (!input.route.requiresExecution) {
    blockedBy.push('requires_execution:false');
  } else {
    reasons.push('requires_execution:true');
  }

  // Gate 3: semantic frame execution mode must allow report execution
  // This is the KEY gate that prevents field_definition from entering report execution
  //
  // When the route has strong report evidence (reportRouteMatch + report_query +
  // requiresExecution), trust the route over the semantic frame. The semantic
  // frame's speech-act heuristic is incomplete and can misclassify valid data
  // queries (e.g. messages using "搜索" or containing metric names without
  // action verbs like "查").
  if (routeIsStrongReport) {
    reasons.push('route_evidence_override:report_route_match');
  } else if (executionMode) {
    if (!isExecutionModeAllowedForReport(executionMode)) {
      blockedBy.push(`execution_mode:${executionMode}`);
    } else {
      reasons.push(`execution_mode:${executionMode}:allowed`);
    }
  } else {
    // If no semantic frame, rely on policy check below
    reasons.push('execution_mode:not_provided_fallback_to_policy');
  }

  // Gate 4: service intent policy category must allow execution
  if (policy.category !== 'execution' && policy.category !== 'evidence_execution') {
    blockedBy.push(`service_intent_policy:${policy.category}`);
  } else {
    reasons.push(`service_intent_policy:${policy.category}`);
  }

  // Gate 5: capability purpose alignment (if selected)
  if (selectedCapability) {
    const purpose = selectedCapability.capabilityPurpose
      || inferCapabilityPurpose({
        capabilityType: selectedCapability.capabilityType,
        toolPurpose: selectedCapability.toolPurpose,
      });

    if (!policy.allowedPurposes.includes(purpose) && policy.blockedPurposes.includes(purpose)) {
      blockedBy.push(`capability_purpose:${purpose}`);
    } else {
      reasons.push(`capability_purpose:${purpose}:allowed`);
    }
  }

  // capabilityReportMatch: candidate evidence only, does NOT affect gate
  if (input.capabilityReportMatch) {
    reasons.push('capability_report_match:candidate_evidence_only');
  }

  // reportRouteMatch: candidate evidence only
  if (input.reportRouteMatch) {
    reasons.push('report_route_match:candidate_evidence_only');
  }

  return {
    shouldEnter: blockedBy.length === 0,
    reasons,
    blockedBy,
    policy: {
      serviceIntent,
      category: policy.category,
      executionMode,
      requiresToolExecution: policy.requiresToolExecution,
      capabilityPurpose: selectedCapability?.capabilityPurpose
        || (selectedCapability ? inferCapabilityPurpose({
          capabilityType: selectedCapability.capabilityType,
          toolPurpose: selectedCapability.toolPurpose,
        }) : undefined),
    },
  };
}
