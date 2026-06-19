/**
 * Output Guardrail — 答案输出防护
 *
 * 在答案输出前运行，检查：
 * 1. 现有 contract-safety 检查（mojibake, source_grounded, tool_grounded 等）
 * 2. 无证据业务断言（answer 声称"已查询/已返回 X"但无 tool_result）
 * 3. 工具结果被模型改写反（answer 与 tool_result 矛盾）✅ 已实现
 * 4. sourceRefs / evidenceRefs 缺失升级为 error
 * 5. raw params（appId / media_id / project_id）泄露到主消息
 * 6. shadow plan 伪装成真实执行
 * 7. 失败说成成功（status=success 但实际失败）
 *
 * 整合自：迭代计划 #87-92
 */

import type {
  GuardrailFinding,
  GuardrailResult,
  OutputGuardrail,
  OutputGuardrailInput,
} from '@/contracts/validation/guardrail-contract';
import { runContractSafety } from '@/lib/contract-safety';
import type { EvidenceMode, ResultStatus, SourceRef } from '@/types';
import type { WorkflowResult } from '@/types';

/**
 * 检测 answer 中声称"已使用工具/数据"但无对应证据的模式
 */
function checkUnsourcedBusinessAssertions(answer: string, sourceRefs: SourceRef[], evidenceRefs: string[]): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  const hasAnyEvidence = sourceRefs.length > 0 || evidenceRefs.length > 0;

  // 检查 answer 中是否有"已查询/已检索/已调用/已验证/已读取"等动作声明
  const claimsExternalAction = /(已查询|已检索|已调用|已验证|已读取|已获取|已从|已从系统)/.test(answer);

  if (claimsExternalAction && !hasAnyEvidence) {
    findings.push({
      code: 'unsourced_business_assertion',
      message: '回答声称使用了外部证据或工具，但无可追溯的 source_refs 或 evidence_refs。',
      severity: 'error',
      path: 'answer_markdown',
      detected_at: new Date().toISOString(),
    });
  }

  return findings;
}

/**
 * 检查 raw params 是否泄露到 answer 主消息
 */
function checkRawParamsLeakage(answer: string, metadata?: Record<string, unknown>): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];

  // 从 metadata 提取可能的 raw params 值
  const rawParamKeys = ['appId', 'app_id', 'media_id', 'mediaId', 'project_id', 'projectId'];
  const rawParamValues: string[] = [];

  if (metadata) {
    for (const key of rawParamKeys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.length >= 4) {
        rawParamValues.push(value);
      }
      if (typeof value === 'number') {
        rawParamValues.push(String(value));
      }
    }
  }

  // 检查 answer 中是否出现了这些 raw 值
  for (const value of rawParamValues) {
    if (answer.includes(value)) {
      findings.push({
        code: 'raw_params_leaked_to_answer',
        message: `回答中泄露了内部参数值（${value}）。内部 ID 不应直接展示给用户。`,
        severity: 'error',
        path: 'answer_markdown',
        detected_at: new Date().toISOString(),
      });
    }
  }

  return findings;
}

/**
 * 检查 shadow plan 是否被伪装成真实执行
 */
function checkShadowPlanDisguise(answer: string, plannerShadowPlan: Record<string, unknown> | null | undefined): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];

  // 如果有 shadow plan 且 answer 声称"已执行 X 工具"，可能是 shadow 被误当作真实执行
  if (plannerShadowPlan && typeof plannerShadowPlan === 'object') {
    const claimsToolExecution = /(已执行|已调用|已完成).{0,20}(工具|mcp|tool)/i.test(answer);
    const planSteps = Array.isArray(plannerShadowPlan.plan_steps) ? plannerShadowPlan.plan_steps : [];
    // shadow plan 中的 candidate_capabilities 不应被当作已执行
    if (claimsToolExecution && planSteps.length > 0) {
      findings.push({
        code: 'shadow_plan_disguised_as_execution',
        message: '回答声称已执行工具，但检测到 planner_shadow 候选存在。请确认工具是否真实执行。',
        severity: 'error',
        path: 'answer_markdown',
        detected_at: new Date().toISOString(),
      });
    }
  }

  return findings;
}

/**
 * 检查"失败说成成功"
 */
function checkFailureDisguisedAsSuccess(status: ResultStatus | string, answer: string, workflowResult: WorkflowResult | null | undefined): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];

  // status 是 success 但 workflow_result 实际 failed
  if (status === 'success' && workflowResult) {
    const wfStatus = String(workflowResult.status || '').toLowerCase();
    if (wfStatus === 'failed' || wfStatus === 'error') {
      findings.push({
        code: 'failure_disguised_as_success',
        message: '响应 status 为 success，但 workflow_result.status 为 failed。',
        severity: 'error',
        path: 'response_contract.status',
        detected_at: new Date().toISOString(),
      });
    }
  }

  return findings;
}

/**
 * 检查 sourceRefs/evidenceRefs 缺失（升级为 error）
 */
function checkEvidenceRefsMissing(
  status: ResultStatus | string,
  sourceRefs: SourceRef[],
  evidenceRefs: string[],
  evidenceMode?: string,
): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];

  // 如果状态是 success 但完全没有证据，且 evidence_mode 要求证据
  // degraded/not_configured/blocked 状态不要求证据（fallback/模板回答）
  if (
    status === 'success'
    && !sourceRefs.length
    && !evidenceRefs.length
    && evidenceMode
    && evidenceMode !== 'model_only'
    && evidenceMode !== 'no_external_evidence_required'
  ) {
    findings.push({
      code: 'success_without_any_evidence',
      message: `成功回答但无可追溯证据（evidence_mode=${evidenceMode}）。`,
      severity: 'error',
      path: 'response_contract',
      detected_at: new Date().toISOString(),
    });
  }

  return findings;
}

/**
 * 检查工具结果是否被模型改写反（answer 与 tool_result 矛盾）
 */
function checkToolResultReversal(
  answer: string,
  workflowResult: WorkflowResult | null | undefined,
  evidenceLedger?: Record<string, unknown>,
): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];

  if (!workflowResult && !evidenceLedger) {
    return findings;
  }

  // 从 workflow_result 提取工具执行结果
  const toolResults: Array<{ tool: string; status: string; data?: unknown }> = [];

  if (workflowResult?.tool_calls && Array.isArray(workflowResult.tool_calls)) {
    for (const call of workflowResult.tool_calls) {
      if (call && typeof call === 'object') {
        toolResults.push({
          tool: String(call.tool_name || call.tool || 'unknown'),
          status: String(call.status || 'unknown'),
          data: call.result || call.data,
        });
      }
    }
  }

  // 从 evidence_ledger 提取 tool_result 类型的证据
  if (evidenceLedger && Array.isArray(evidenceLedger.entries)) {
    for (const entry of evidenceLedger.entries) {
      if (entry && typeof entry === 'object' && entry.source === 'tool_result') {
        toolResults.push({
          tool: String(entry.sourceId || entry.tool || 'unknown'),
          status: String(entry.confidence || entry.status || 'unknown'),
          data: entry.content,
        });
      }
    }
  }

  // 检查每个工具结果的矛盾
  for (const result of toolResults) {
    // 1. 工具成功但 answer 声称失败
    if (result.status === 'success' || result.status === 'confirmed_fact') {
      const claimsFailure = /(失败|错误|无法|未能|没有成功|未找到|不存在).{0,30}(工具|查询|检索|调用)/i.test(answer);
      if (claimsFailure) {
        findings.push({
          code: 'tool_result_reversed_to_failure',
          message: `工具 ${result.tool} 实际执行成功，但回答声称失败或未能完成。`,
          severity: 'error',
          path: 'answer_markdown',
          detected_at: new Date().toISOString(),
        });
      }
    }

    // 2. 工具返回空数据但 answer 声称有数据
    if (result.data === null || result.data === undefined ||
        (typeof result.data === 'object' && Object.keys(result.data as object).length === 0) ||
        (Array.isArray(result.data) && result.data.length === 0)) {
      const claimsDataFound = /(已查询到|已获取|已返回|找到|存在|有).{0,30}(数据|结果|记录|信息)/i.test(answer);
      if (claimsDataFound) {
        findings.push({
          code: 'tool_result_reversed_to_data_found',
          message: `工具 ${result.tool} 实际返回空数据，但回答声称找到了数据。`,
          severity: 'error',
          path: 'answer_markdown',
          detected_at: new Date().toISOString(),
        });
      }
    }

    // 3. 工具失败但 answer 声称成功
    if (result.status === 'failed' || result.status === 'error' || result.status === 'unverified') {
      const claimsSuccess = /(已成功|已完成|已执行|查询到|获取到|返回了).{0,30}(结果|数据|信息)/i.test(answer);
      if (claimsSuccess) {
        findings.push({
          code: 'tool_result_reversed_to_success',
          message: `工具 ${result.tool} 实际执行失败，但回答声称成功完成。`,
          severity: 'error',
          path: 'answer_markdown',
          detected_at: new Date().toISOString(),
        });
      }
    }
  }

  return findings;
}

export class OutputGuardrailImpl implements OutputGuardrail {
  readonly name = 'output-guardrail-full';

  check(input: OutputGuardrailInput): GuardrailResult {
    const startedAt = Date.now();
    const findings: GuardrailFinding[] = [];

    // 1. 现有 contract-safety 检查（转换格式）
    const safety = runContractSafety({
      status: input.status as ResultStatus,
      answer: input.answer,
      sourceRefs: input.sourceRefs as unknown as SourceRef[],
      evidenceRefs: input.evidenceRefs,
      evidenceMode: input.evidenceMode as EvidenceMode | undefined,
      workflowResult: input.workflowResult as WorkflowResult | null | undefined,
      metadata: input.metadata,
    });

    // 将 ContractSafetyIssue 转换为 GuardrailFinding
    for (const issue of safety.safety.issues) {
      findings.push({
        code: issue.code,
        message: issue.message,
        severity: issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info',
        path: issue.path,
        detected_at: new Date().toISOString(),
      });
    }

    // 2. 无证据业务断言
    findings.push(...checkUnsourcedBusinessAssertions(input.answer, input.sourceRefs as unknown as SourceRef[], input.evidenceRefs));

    // 3. 工具结果改写反（Item 89）
    findings.push(...checkToolResultReversal(
      input.answer,
      input.workflowResult as WorkflowResult | null | undefined,
      input.evidenceLedger as Record<string, unknown> | undefined,
    ));

    // 4. raw params 泄露
    findings.push(...checkRawParamsLeakage(input.answer, input.metadata));

    // 5. shadow plan 伪装
    findings.push(...checkShadowPlanDisguise(input.answer, input.plannerShadowPlan));

    // 6. 失败说成成功
    findings.push(...checkFailureDisguisedAsSuccess(input.status, input.answer, input.workflowResult as WorkflowResult | null | undefined));

    // 7. sourceRefs/evidenceRefs 缺失
    findings.push(...checkEvidenceRefsMissing(input.status, input.sourceRefs as unknown as SourceRef[], input.evidenceRefs, input.evidenceMode));

    const tripwire = findings.some((f) => f.severity === 'error');
    return {
      layer: 'output',
      tripwire_triggered: tripwire,
      findings,
      tripwire_reason: tripwire ? findings.find((f) => f.severity === 'error')?.code : undefined,
      duration_ms: Date.now() - startedAt,
      checked_at: new Date().toISOString(),
    };
  }
}
