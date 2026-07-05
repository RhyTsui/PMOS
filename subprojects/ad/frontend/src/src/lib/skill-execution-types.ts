/**
 * Skill Execution Types
 */

import type { UserScope } from '@/lib/user-scope';

export type SkillExecuteMode =
  | 'generate_sql_only'
  | 'execute_query'
  | 'continue_trace';

export interface SkillExecutionInput {
  skillId: string;
  question: string;
  executeMode: SkillExecuteMode;
  traceId?: string;
  userScope: UserScope;
  conversationId: string;
  skillContractVersion: string;
}

export interface SkillExecutionPolicyResult {
  allowed: boolean;
  reason?: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface SkillStepRiskAssessment {
  stepKey: string;
  toolName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  guardrails: string[];
}
