/**
 * Planner → Tool Contract Matching
 *
 * Stage 4 (task 4.4) 落地：校验 PlannerPlanContract 中的 candidate_capabilities
 * 与真实 MCP/Tool 的 CapabilitySelectionCandidate 之间的契约匹配。
 *
 * 匹配维度：
 * 1. toolPurpose / capabilityPurpose
 * 2. supportedServiceIntents
 * 3. requiredInputs / resolverDependencies
 * 4. permission（capability permission vs 用户 scope）
 * 5. outputContract
 * 6. errorTaxonomy
 *
 * 输出：每个 candidate 的匹配状态，以及无法匹配的 gap 列表。
 */

import type { CapabilitySelectionCandidate, CapabilityManifest } from '@/contracts/capability/capability-manifest';
import type { PlannerPlanContract } from '@/contracts/planner/planner-plan-contract';

// ─── 匹配结果类型 ────────────────────────────────────────────

export type MatchStatus =
  | 'matched'
  | 'missing_capability_ref'
  | 'purpose_mismatch'
  | 'service_intent_unsupported'
  | 'required_input_missing'
  | 'permission_blocked'
  | 'output_contract_mismatch'
  | 'error_taxonomy_gap';

export interface ContractMatchFinding {
  /** 检查维度。 */
  dimension:
    | 'capability_ref'
    | 'tool_purpose'
    | 'service_intent'
    | 'required_inputs'
    | 'permission'
    | 'output_contract'
    | 'error_taxonomy';
  /** 检查结果。 */
  status: 'pass' | 'fail' | 'warn';
  /** 详细说明。 */
  message: string;
}

export interface CandidateMatchResult {
  /** 候选在 plan.candidate_capabilities 中的索引。 */
  candidateIndex: number;
  /** 候选的 capabilityRef（如有）。 */
  capabilityRef: string | null;
  /** 匹配到的真实工具（null 表示未找到匹配工具）。 */
  matchedTool: CapabilitySelectionCandidate | null;
  /** 匹配到的工具 manifest（便于访问）。 */
  matchedManifest: CapabilityManifest | null;
  /** 整体匹配状态。 */
  status: MatchStatus;
  /** 详细检查发现。 */
  findings: ContractMatchFinding[];
  /** 缺失的 required inputs。 */
  missingInputs: string[];
  /** 缺失的 error taxonomy 类别。 */
  errorTaxonomyGaps: string[];
}

export interface ToolContractMatchReport {
  /** 整体匹配状态。 */
  overallStatus: 'all_matched' | 'partial_match' | 'no_match';
  /** 每个候选的匹配结果。 */
  candidates: CandidateMatchResult[];
  /** 整体 gap 汇总。 */
  summaryGaps: {
    missingCapabilityRefs: number;
    purposeMismatch: number;
    serviceIntentUnsupported: number;
    permissionBlocked: number;
    requiredInputMissing: number;
    outputContractMismatch: number;
    errorTaxonomyGap: number;
  };
}

// ─── 核心匹配逻辑 ────────────────────────────────────────────

/**
 * 根据 plan 的 candidate_capabilities 与真实工具清单做契约匹配。
 *
 * @param plan - PlannerPlanContract，包含 candidate_capabilities 和 required_inputs。
 * @param availableTools - 真实可用的 MCP/Tool 工具清单。
 * @param userPermissions - 用户当前 scope 拥有的权限标识列表。
 */
export function matchPlannerPlanToToolContracts(params: {
  plan: PlannerPlanContract;
  availableTools: CapabilitySelectionCandidate[];
  userPermissions: string[];
}): ToolContractMatchReport {
  const { plan, availableTools, userPermissions } = params;

  const candidateResults: CandidateMatchResult[] = plan.candidate_capabilities.map((candidate, index) => {
    const findings: ContractMatchFinding[] = [];
    const missingInputs: string[] = [];
    const errorTaxonomyGaps: string[] = [];

    // ─── 1. capabilityRef 检查 ──────────────────────────
    const capabilityRef = candidate.capability_id ?? null;
    if (!capabilityRef) {
      findings.push({
        dimension: 'capability_ref',
        status: 'fail',
        message: '候选未提供 capabilityRef 或 tool_name，无法定位真实工具。',
      });
      return {
        candidateIndex: index,
        capabilityRef: null,
        matchedTool: null,
        matchedManifest: null,
        status: 'missing_capability_ref' as MatchStatus,
        findings,
        missingInputs: [],
        errorTaxonomyGaps: [],
      };
    }

    findings.push({
      dimension: 'capability_ref',
      status: 'pass',
      message: `capabilityRef=${capabilityRef}`,
    });

    // ─── 查找匹配工具（通过 capabilityId 或 source.toolName） ──────
    const matchedTool = availableTools.find((tool) => {
      const manifest = tool.capability;
      return (
        manifest.capabilityId === capabilityRef ||
        manifest.source.toolName === capabilityRef ||
        (manifest.aliases ?? []).includes(capabilityRef)
      );
    });

    if (!matchedTool) {
      findings.push({
        dimension: 'tool_purpose',
        status: 'fail',
        message: `未在可用工具中找到 ${capabilityRef} 对应的工具。`,
      });
      return {
        candidateIndex: index,
        capabilityRef,
        matchedTool: null,
        matchedManifest: null,
        status: 'missing_capability_ref' as MatchStatus,
        findings,
        missingInputs: [],
        errorTaxonomyGaps: [],
      };
    }

    const manifest = matchedTool.capability;

    // ─── 2. capabilityPurpose 匹配 ──────
    const toolPurpose = manifest.capabilityPurpose ?? manifest.toolPurpose;
    findings.push({
      dimension: 'tool_purpose',
      status: 'pass',
      message: `capability purpose：${toolPurpose ?? 'unknown'}`,
    });

    // ─── 3. supportedServiceIntents 匹配 ──────────────
    const planServiceIntent = plan.service_intent;
    const toolSupportedIntents = manifest.supportedServiceIntents ?? [];
    if (planServiceIntent && toolSupportedIntents.length > 0) {
      if (!toolSupportedIntents.includes(planServiceIntent as typeof toolSupportedIntents[number])) {
        findings.push({
          dimension: 'service_intent',
          status: 'fail',
          message: `plan service_intent=${planServiceIntent} 不在工具支持的 ${toolSupportedIntents.join(',')} 中。`,
        });
      } else {
        findings.push({
          dimension: 'service_intent',
          status: 'pass',
          message: `service_intent=${planServiceIntent} 工具支持。`,
        });
      }
    } else {
      findings.push({
        dimension: 'service_intent',
        status: 'pass',
        message: 'service_intent 无约束或工具未声明 supportedServiceIntents。',
      });
    }

    // ─── 4. requiredInputs 检查 ──────────────────────
    const toolRequiredInputs = manifest.requiredInputs ?? [];
    const planProvidedInputs = new Set(plan.required_inputs.map((inp) => inp.name));
    for (const requiredInput of toolRequiredInputs) {
      if (!planProvidedInputs.has(requiredInput)) {
        missingInputs.push(requiredInput);
      }
    }
    if (missingInputs.length > 0) {
      findings.push({
        dimension: 'required_inputs',
        status: 'fail',
        message: `工具要求 ${toolRequiredInputs.join(',')}，plan 缺少：${missingInputs.join(',')}`,
      });
    } else {
      findings.push({
        dimension: 'required_inputs',
        status: 'pass',
        message: '工具 requiredInputs 全部由 plan 提供。',
      });
    }

    // ─── 5. riskLevel / permission 检查 ──────────────────
    // permission_blocked 的工具通常 riskLevel 为 high/critical；此处通过 riskLevel 近似判断
    const toolRiskLevel = manifest.riskLevel;
    const isHighRiskTool = toolRiskLevel === 'high' || toolRiskLevel === 'critical';
    if (isHighRiskTool && !userPermissions.includes('internal_service')) {
      findings.push({
        dimension: 'permission',
        status: 'fail',
        message: `工具 riskLevel=${toolRiskLevel}，需要 internal_service 权限，用户当前无此权限。`,
      });
    } else {
      findings.push({
        dimension: 'permission',
        status: 'pass',
        message: isHighRiskTool
          ? `riskLevel=${toolRiskLevel}，权限已通过。`
          : `工具 riskLevel=${toolRiskLevel ?? 'none'}，无需特殊权限。`,
      });
    }

    // ─── 6. outputContract 检查 ──────────────────────
    const planEvidenceMode = plan.evidence_mode;
    const planRequiresEvidence = planEvidenceMode !== 'model_only' && planEvidenceMode !== 'no_external_evidence_required';
    const toolOutputContract = manifest.outputContract;
    if (planRequiresEvidence && toolOutputContract) {
      if (toolOutputContract.contractType !== 'semantic_result') {
        findings.push({
          dimension: 'output_contract',
          status: 'warn',
          message: `plan evidence_mode=${planEvidenceMode}，但工具 outputContract 非 semantic_result 类型。`,
        });
      } else {
        findings.push({
          dimension: 'output_contract',
          status: 'pass',
          message: 'outputContract 与 plan evidence_mode 兼容。',
        });
      }
    } else {
      findings.push({
        dimension: 'output_contract',
        status: 'pass',
        message: 'outputContract 无额外约束。',
      });
    }

    // ─── 7. errorTaxonomy 检查 ──────────────────────
    const toolErrorTaxonomy = manifest.errorTaxonomy ?? [];
    const expectedErrorTypes = Array.from(new Set<string>(
      (plan.risk_level === 'medium' || plan.risk_level === 'high') ? ['business_failed'] : [],
    ));
    for (const errType of expectedErrorTypes) {
      if (toolErrorTaxonomy.length > 0 && !toolErrorTaxonomy.includes(errType as typeof toolErrorTaxonomy[number])) {
        errorTaxonomyGaps.push(errType);
      }
    }
    if (errorTaxonomyGaps.length > 0) {
      findings.push({
        dimension: 'error_taxonomy',
        status: 'warn',
        message: `plan 预期工具可处理 ${errorTaxonomyGaps.join(',')}，但工具 errorTaxonomy 未声明。`,
      });
    } else {
      findings.push({
        dimension: 'error_taxonomy',
        status: 'pass',
        message: 'errorTaxonomy 覆盖 plan 预期。',
      });
    }

    // ─── 综合状态判断 ──────────────────────────────────
    let status: MatchStatus = 'matched';
    const failDimension = findings.find((f) => f.status === 'fail')?.dimension;
    if (failDimension === 'service_intent') status = 'service_intent_unsupported';
    else if (failDimension === 'required_inputs') status = 'required_input_missing';
    else if (failDimension === 'permission') status = 'permission_blocked';
    else if (failDimension === 'output_contract') status = 'output_contract_mismatch';
    else if (failDimension === 'error_taxonomy') status = 'error_taxonomy_gap';
    else if (failDimension === 'tool_purpose') status = 'purpose_mismatch';

    return {
      candidateIndex: index,
      capabilityRef,
      matchedTool,
      matchedManifest: manifest,
      status,
      findings,
      missingInputs,
      errorTaxonomyGaps,
    };
  });

  // ─── 汇总 ──────────────────────────────────────────────
  const matchedCount = candidateResults.filter((c) => c.status === 'matched').length;
  const overallStatus: ToolContractMatchReport['overallStatus'] =
    matchedCount === candidateResults.length
      ? 'all_matched'
      : matchedCount > 0
        ? 'partial_match'
        : 'no_match';

  const summaryGaps = {
    missingCapabilityRefs: candidateResults.filter((c) => c.status === 'missing_capability_ref').length,
    purposeMismatch: candidateResults.filter((c) => c.status === 'purpose_mismatch').length,
    serviceIntentUnsupported: candidateResults.filter((c) => c.status === 'service_intent_unsupported').length,
    permissionBlocked: candidateResults.filter((c) => c.status === 'permission_blocked').length,
    requiredInputMissing: candidateResults.filter((c) => c.status === 'required_input_missing').length,
    outputContractMismatch: candidateResults.filter((c) => c.status === 'output_contract_mismatch').length,
    errorTaxonomyGap: candidateResults.filter((c) => c.status === 'error_taxonomy_gap').length,
  };

  return { overallStatus, candidates: candidateResults, summaryGaps };
}

/**
 * 将匹配报告序列化为 trace metadata 可附加的格式。
 */
export function serializeMatchReportForMetadata(report: ToolContractMatchReport): Record<string, unknown> {
  return {
    overall_status: report.overallStatus,
    matched_count: report.candidates.filter((c) => c.status === 'matched').length,
    total_count: report.candidates.length,
    summary_gaps: report.summaryGaps,
    candidates: report.candidates.map((c) => ({
      index: c.candidateIndex,
      capability_ref: c.capabilityRef,
      status: c.status,
      missing_inputs: c.missingInputs,
      finding_count: c.findings.length,
    })),
  };
}
