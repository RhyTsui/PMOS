/**
 * Service Catalog — 服务目录
 *
 * 统一的服务类型定义，替代散落的 ServiceIntent / PlannerServiceIntent。
 */

export {
  // 常量
  SERVICE_FAMILIES,
  SERVICE_TYPES,
  SERVICE_TYPE_FAMILY,
  BUILTIN_SERVICE_DEFINITIONS,
  SERVICE_DISCOVERY_HINTS,
  // 类型
  type ServiceFamily,
  type ServiceType,
  type ServiceInputContract,
  type ServiceDefinition,
  type ServiceDiscoveryHint,
  type ServiceDeliverable,
  type ClarificationPolicy,
  // API
  getServiceDefinition,
  getServicesByFamily,
  isValidServiceType,
  fromLegacyServiceIntent,
  fromPlannerServiceIntent,
} from './service-catalog-contract';
