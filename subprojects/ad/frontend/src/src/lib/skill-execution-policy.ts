/**
 * Skill Execution Policy — 风险等级门控。
 */

import type { SkillContract } from '@/types';
import type { UserScope } from '@/lib/user-scope';
import type { SkillExecutionInput, SkillExecuteMode, SkillExecutionPolicyResult, SkillStepRiskAssessment } from '@/lib/skill-execution-types';

function baseRiskLevel(mode: SkillExecuteMode): SkillExecutionPolicyResult['riskLevel'] {
  switch (mode) {
    case 'generate_sql_only': return 'low';
    case 'execute_query':     return 'medium';
    case 'continue_trace':    return 'medium';
  }
}

function guardrailRisk(contract: SkillContract): SkillExecutionPolicyResult['riskLevel'] {
  const g = (contract.risk_guardrails || []).join(' ');
  if (g.includes('写操作') || g.includes('modify')) return 'high';
  if (g.includes('禁止')) return 'medium';
  return 'low';
}

export function evaluateSkillExecutionPolicy(
  input: SkillExecutionInput,
  contract: SkillContract,
  _userScope: UserScope | null,
): SkillExecutionPolicyResult {
  const risk = [baseRiskLevel(input.executeMode), guardrailRisk(contract)]
    .sort((a, b) => ({ none: 0, low: 1, medium: 2, high: 3, critical: 4 } as Record<string, number>)[b] - ({ none: 0, low: 1, medium: 2, high: 3, critical: 4 } as Record<string, number>)[a])[0];
  return { allowed: risk !== 'critical', reason: risk === 'critical' ? `风险等级过高(${risk})` : undefined, riskLevel: risk };
}

export function assessStepRisk(stepKey: string, toolName: string, contract: SkillContract): SkillStepRiskAssessment {
  const g = (contract.risk_guardrails || []).join(' ');
  const write = g.includes('写操作') || g.includes('modify');
  return { stepKey, toolName, riskLevel: write ? 'high' : 'medium', reason: write ? '写操作' : '标准调用', guardrails: (contract.risk_guardrails || []).filter(r => r.includes(toolName) || r.includes(stepKey)) };
}
