export type OperationSafetyLevel =
  | 'read_only'
  | 'low_risk_write'
  | 'medium_risk_operation'
  | 'high_risk_operation'
  | 'blocked_operation';

export type AutomationExecutionLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface OperationSafetyPolicy {
  safetyLevel: OperationSafetyLevel;
  /**
   * VNext 自动化分级：
   * L0 信息查询，L1 分析解释，L2 建议方案，L3 人工确认后半自动，
   * L4 低风险自动执行，L5 成熟场景自动闭环。
   */
  automationLevel?: AutomationExecutionLevel;
  requiresApproval: boolean;
  approvalReason?: string;
  blockedReason?: string;
  requiresAudit?: boolean;
  requiresRollbackPlan?: boolean;
}

export function safetyLevelForAutomationLevel(level: AutomationExecutionLevel): OperationSafetyPolicy {
  switch (level) {
    case 'L0':
    case 'L1':
    case 'L2':
      return { safetyLevel: 'read_only', automationLevel: level, requiresApproval: false, requiresAudit: false };
    case 'L3':
      return { safetyLevel: 'medium_risk_operation', automationLevel: level, requiresApproval: true, requiresAudit: true };
    case 'L4':
      return {
        safetyLevel: 'low_risk_write',
        automationLevel: level,
        requiresApproval: false,
        requiresAudit: true,
        requiresRollbackPlan: true,
      };
    case 'L5':
      return {
        safetyLevel: 'high_risk_operation',
        automationLevel: level,
        requiresApproval: true,
        requiresAudit: true,
        requiresRollbackPlan: true,
        approvalReason: '高成熟自动闭环仍必须具备审批、审计与回滚策略。',
      };
    default:
      return {
        safetyLevel: 'blocked_operation',
        automationLevel: level,
        requiresApproval: true,
        requiresAudit: true,
        blockedReason: '未知自动化等级。',
      };
  }
}
