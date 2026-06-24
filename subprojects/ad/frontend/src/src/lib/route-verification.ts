/**
 * 路由自修正验证环
 *
 * 验证 selectedService 与能力清单的匹配，仅在只读服务允许降级。
 * 非只读服务（写操作、联调、任务创建等）不降级，仅记录 warning。
 */

import { isValidServiceType, getServiceDefinition } from '@/contracts/service-catalog';
import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';

export interface RouteVerificationInput {
  selectedService?: string;
  capabilityManifest?: CapabilityManifest[];
}

export interface RouteVerificationResult {
  /** 是否发生降级 */
  downgraded: boolean;
  /** 原始服务类型 */
  originalService?: string;
  /** 降级后服务类型 */
  downgradedService?: string;
  /** 降级原因（写入 trace） */
  downgradeReason?: string;
  /** 警告信息（非只读服务不匹配时） */
  warning?: string;
}

/**
 * 检查服务是否只读
 */
function isServiceReadOnly(serviceType: string): boolean {
  if (!isValidServiceType(serviceType)) return true; // 未知服务默认允许降级
  const definition = getServiceDefinition(serviceType);
  return Boolean(definition.readOnly);
}

/**
 * 验证路由选择，必要时执行降级
 */
export function validateRouteSelection(input: RouteVerificationInput): RouteVerificationResult {
  const { selectedService, capabilityManifest } = input;

  if (!selectedService) {
    return { downgraded: false };
  }

  // 无能力清单时不做验证
  if (!capabilityManifest || capabilityManifest.length === 0) {
    return { downgraded: false, originalService: selectedService };
  }

  const isReadOnly = isServiceReadOnly(selectedService);

  // 非只读服务不匹配时，不降级，仅记录警告
  if (!isReadOnly) {
    const hasCapability = capabilityManifest.some((cap) => {
      const intents = (cap as unknown as Record<string, unknown>).supportedServiceIntents as string[] | undefined;
      return intents?.includes(selectedService) ?? false;
    });
    if (!hasCapability) {
      return {
        downgraded: false,
        originalService: selectedService,
        warning: `服务 ${selectedService} 无匹配能力，但因为是写操作不允许降级`,
      };
    }
    return { downgraded: false, originalService: selectedService };
  }

  // 只读服务降级逻辑：无匹配能力时降级到 general_chat
  const readOnlyFallbacks: Record<string, string> = {
    data_query: 'general_chat',
    public_web_search: 'general_chat',
    realtime_public_info: 'general_chat',
    knowledge_answer: 'general_chat',
  };

  const hasCapability = capabilityManifest.some((cap) => {
    const intents = (cap as unknown as Record<string, unknown>).supportedServiceIntents as string[] | undefined;
    return intents?.includes(selectedService) ?? false;
  });

  if (!hasCapability && readOnlyFallbacks[selectedService]) {
    const downgradedService = readOnlyFallbacks[selectedService];
    return {
      downgraded: true,
      originalService: selectedService,
      downgradedService,
      downgradeReason: `只读服务 ${selectedService} 无匹配能力，降级到 ${downgradedService}`,
    };
  }

  return { downgraded: false, originalService: selectedService };
}
