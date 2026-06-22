import type { AutomationExecutionLevel } from './operation-safety-policy';

/**
 * 任务风险策略
 *
 * 定义 L0-L5 风险分级策略，用于任务创建和执行时的安全校验。
 */

export type TaskRiskLevel = AutomationExecutionLevel;

export interface TaskRiskPolicy {
  level: TaskRiskLevel;
  /** 用户可读风险说明 */
  description: string;
  /** 是否可自动创建 */
  canAutoCreate: boolean;
  /** 是否需要二次确认 */
  requiresConfirmation: boolean;
  /** 是否禁止自动执行 */
  forbidAutoExecute: boolean;
  /** 确认文案 */
  confirmationMessage?: string;
}

export const TASK_RISK_POLICIES: Record<TaskRiskLevel, TaskRiskPolicy> = {
  L0: {
    level: 'L0',
    description: '公开/低风险摘要，可直接创建',
    canAutoCreate: true,
    requiresConfirmation: false,
    forbidAutoExecute: false,
  },
  L1: {
    level: 'L1',
    description: '读取普通业务数据，创建时确认范围',
    canAutoCreate: true,
    requiresConfirmation: false,
    forbidAutoExecute: false,
  },
  L2: {
    level: 'L2',
    description: '读取敏感明细，需要权限校验',
    canAutoCreate: true,
    requiresConfirmation: false,
    forbidAutoExecute: false,
  },
  L3: {
    level: 'L3',
    description: '生成文件/报告，需说明数据范围',
    canAutoCreate: true,
    requiresConfirmation: false,
    forbidAutoExecute: false,
  },
  L4: {
    level: 'L4',
    description: '触发业务工作流，需二次确认',
    canAutoCreate: true,
    requiresConfirmation: true,
    forbidAutoExecute: false,
    confirmationMessage: '该任务将触发业务工作流，请确认后执行。',
  },
  L5: {
    level: 'L5',
    description: '修改投放/预算/配置，禁止自动执行',
    canAutoCreate: false,
    requiresConfirmation: true,
    forbidAutoExecute: true,
    confirmationMessage: '该任务涉及高风险操作，我可以定期检查并给出建议，但真正修改预算、计划或配置前必须由你确认。',
  },
};

/**
 * 获取风险策略
 */
export function getTaskRiskPolicy(level: TaskRiskLevel): TaskRiskPolicy {
  return TASK_RISK_POLICIES[level] || TASK_RISK_POLICIES.L0;
}

/**
 * 检查任务是否可自动执行
 */
export function canTaskAutoExecute(level: TaskRiskLevel): boolean {
  return !getTaskRiskPolicy(level).forbidAutoExecute;
}

/**
 * 检查任务是否需要二次确认
 */
export function requiresTaskConfirmation(level: TaskRiskLevel): boolean {
  return getTaskRiskPolicy(level).requiresConfirmation;
}
