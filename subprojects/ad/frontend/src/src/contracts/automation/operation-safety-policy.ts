export type OperationSafetyLevel =
  | 'read_only'
  | 'low_risk_write'
  | 'medium_risk_operation'
  | 'high_risk_operation'
  | 'blocked_operation';

export interface OperationSafetyPolicy {
  safetyLevel: OperationSafetyLevel;
  requiresApproval: boolean;
  approvalReason?: string;
  blockedReason?: string;
}
