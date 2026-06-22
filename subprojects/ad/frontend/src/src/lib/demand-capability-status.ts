/**
 * Demand Capability Status（P1）
 *
 * 轻量级能力状态判断，用于监测回传对接等场景。
 * 返回三态：integrated / not_integrated / unknown。
 *
 * P1 实现：基于 runtime config / mock-safe adapter，默认 unknown。
 * 不做复杂后台管理。
 */

import type { ServiceIntakeType } from '@/contracts/demand/demand-intake-types';

// ─── 能力状态类型 ────────────────────────────────────────

export type IntegrationStatus = 'integrated' | 'not_integrated' | 'unknown';

export interface CapabilityStatusResult {
  status: IntegrationStatus;
  reason?: string;
  source: 'runtime_config' | 'capability_manifest' | 'default';
}

// ─── 能力状态注册表（P1 最小实现）──────────────────────

/**
 * P1: 静态注册表，可通过 runtime config 扩展。
 * 默认所有服务类型为 unknown。
 */
const DEFAULT_CAPABILITY_STATUS: Record<ServiceIntakeType, IntegrationStatus> = {
  monitoring_callback: 'unknown',
  data_collection: 'unknown',
};

// ─── 主函数 ────────────────────────────────────────────

/**
 * 获取服务类型的能力状态。
 *
 * P1 实现：
 * 1. 优先从 runtime config 读取（未来扩展）
 * 2. 其次从 capability manifest 读取（未来扩展）
 * 3. 默认返回 unknown
 *
 * @param serviceType 服务类型
 * @returns 能力状态结果
 */
export function getCapabilityStatus(serviceType: ServiceIntakeType): CapabilityStatusResult {
  // P1: 暂时使用默认状态，未来可从 runtime config / capability manifest 读取
  const status = DEFAULT_CAPABILITY_STATUS[serviceType] || 'unknown';

  return {
    status,
    source: 'default',
    reason: status === 'unknown'
      ? '能力状态未配置，需要补充信息确认。'
      : undefined,
  };
}

/**
 * 根据能力状态决定下一步动作。
 *
 * @param status 能力状态
 * @returns 建议的下一步动作
 */
export function getCapabilityStatusAction(status: IntegrationStatus): {
  action: 'help' | 'demand_intake' | 'collect_info';
  message: string;
} {
  switch (status) {
    case 'integrated':
      return {
        action: 'help',
        message: '能力已接好，可以进入使用帮助流程。',
      };
    case 'not_integrated':
      return {
        action: 'demand_intake',
        message: '能力未接好，进入需求收集流程。',
      };
    case 'unknown':
    default:
      return {
        action: 'collect_info',
        message: '能力状态未知，需要补充信息确认。',
      };
  }
}
