/**
 * Intent → ServiceType 映射
 *
 * 提供类型安全的 IntentType 到 ServiceType 转换
 */

import type { IntentType } from '@/types';
import type { ServiceType } from './service-catalog-contract';

/**
 * IntentType 到 ServiceType 的映射表
 */
const INTENT_TO_SERVICE_TYPE: Partial<Record<IntentType, ServiceType>> = {
  report_query: 'data_query',
  diagnosis: 'data_issue_diagnosis',
  get_delivery_packages: 'package_fetch',
  debugging: 'integration_workflow',
  demand: 'requirement_draft',
  help: 'field_definition',
  forecast: 'data_query',
  monitor: 'automation_task',
  general: 'general_chat',
};

/**
 * 将 IntentType 安全地转换为 ServiceType
 *
 * @param intentType - 路由决策的意图类型
 * @returns 对应的 ServiceType，如果无法映射则返回 'general_chat'
 */
export function intentToServiceType(intentType: IntentType | string): ServiceType {
  return INTENT_TO_SERVICE_TYPE[intentType as IntentType] ?? 'general_chat';
}
