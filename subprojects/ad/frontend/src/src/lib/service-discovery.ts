/**
 * Service Discovery — 服务发现
 *
 * 根据用户诉求和业务上下文，从 Service Catalog 中发现可能的服务列表，
 * 检查每个服务的输入是否满足，按置信度排序后输出。
 *
 * 与 Service Catalog 的关系：
 * - Service Catalog 定义系统能提供的所有服务
 * - Service Discovery 根据当前上下文筛选和排序候选服务
 *
 * 与 Service Proposal 的关系：
 * - Service Discovery 输出 possibleServices（数据层）
 * - Service Proposal 是三段式展示结构（展示层）
 */

import {
  BUILTIN_SERVICE_DEFINITIONS,
  SERVICE_TYPE_FAMILY,
  type ServiceDefinition,
  type ServiceType,
} from '@/contracts/service-catalog';
import { SERVICE_DISCOVERY_HINTS, type ServiceDiscoveryHint } from '@/contracts/service-catalog/service-catalog-contract';
import type { RequestSemanticFrame } from '@/contracts/request-understanding/semantic-frame-contract';
import type { UserRequirementContract } from '@/contracts/request-understanding/user-requirement-contract';
import { fromLegacyServiceIntent } from '@/contracts/service-catalog';

// ─── Discovery Input ───────────────────────────────────

export interface ServiceDiscoveryInput {
  /** 用户消息 */
  message: string;
  /** semanticFrame */
  semanticFrame?: RequestSemanticFrame;
  /** userRequirement */
  userRequirement?: UserRequirementContract;
  /** 路由决策的服务意图（旧版） */
  routeServiceIntent?: string;
  /** 业务上下文 */
  businessContext?: {
    project?: { id?: string; name?: string };
    app?: { id?: string; name?: string };
    media?: string;
    timeRange?: string;
  };
  /** 已确认的事实（来自 CaseFrame.knownFacts 或工具执行结果） */
  knownFacts?: Array<{ content: string; source: string }>;
}

// ─── Discovery Output ──────────────────────────────────

export interface DiscoveredService {
  /** 服务类型 */
  type: ServiceType;
  /** 显示名称 */
  displayName: string;
  /** 为什么推荐这个服务 */
  reason: string;
  /** 是否可以立即执行 */
  canStartNow: boolean;
  /** 缺失的输入 */
  missingInputs: string[];
  /** 置信度 */
  confidence: number;
  /** 所属服务族 */
  family: string;
}

export interface ServiceDiscoveryResult {
  /** 候选服务列表（按置信度排序） */
  possibleServices: DiscoveredService[];
  /** 推荐的首选服务 */
  recommendedService?: ServiceType;
  /** 发现耗时（ms） */
  latencyMs: number;
}

// ─── Service Discovery ─────────────────────────────────

/**
 * 发现可能的服务列表。
 */
export function discoverServices(input: ServiceDiscoveryInput): ServiceDiscoveryResult {
  const startTime = Date.now();
  const candidates: DiscoveredService[] = [];

  const message = input.message.toLowerCase();
  const context = input.businessContext || {};
  const knownFacts = input.knownFacts || [];

  // 1. Service Catalog hint 匹配发现候选服务。
  for (const [serviceType, hints] of Object.entries(SERVICE_DISCOVERY_HINTS) as Array<[ServiceType, ServiceDiscoveryHint[]]>) {
    const matchedHint = hints.find((hint: ServiceDiscoveryHint) => hint.terms.some((term: string) => message.includes(term.toLowerCase())));
    if (matchedHint) {
      const def = BUILTIN_SERVICE_DEFINITIONS[serviceType];
      if (!def) continue;

      const missingInputs = checkMissingInputs(def, input);
      const canStartNow = missingInputs.length === 0;

      candidates.push({
        type: serviceType,
        displayName: def.displayName,
        reason: `Service Catalog hint (${matchedHint.source})，置信度 ${matchedHint.weight}`,
        canStartNow,
        missingInputs,
        confidence: matchedHint.weight,
        family: def.family,
      });
    }
  }

  // 2. 路由决策映射（旧版 ServiceIntent → 新版 ServiceType）
  if (input.routeServiceIntent) {
    const mappedType = fromLegacyServiceIntent(input.routeServiceIntent);
    if (mappedType && !candidates.some(c => c.type === mappedType)) {
      const def = BUILTIN_SERVICE_DEFINITIONS[mappedType];
      if (def) {
        const missingInputs = checkMissingInputs(def, input);
        candidates.push({
          type: mappedType,
          displayName: def.displayName,
          reason: '路由决策推荐',
          canStartNow: missingInputs.length === 0,
          missingInputs,
          confidence: 0.8,
          family: def.family,
        });
      }
    }
  }

  // 3. 去重 + 按置信度排序
  const uniqueCandidates = deduplicateCandidates(candidates);
  uniqueCandidates.sort((a, b) => b.confidence - a.confidence);

  // 4. 限制候选数量（最多 5 个）
  const topCandidates = uniqueCandidates.slice(0, 5);

  return {
    possibleServices: topCandidates,
    recommendedService: topCandidates[0]?.type,
    latencyMs: Date.now() - startTime,
  };
}

// ─── Input Check ───────────────────────────────────────

/**
 * 检查服务的输入是否满足。
 * 返回缺失的输入字段列表。
 */
function checkMissingInputs(
  def: ServiceDefinition,
  input: ServiceDiscoveryInput,
): string[] {
  const missing: string[] = [];
  const context = input.businessContext || {};

  for (const field of def.input.required) {
    if (!isInputSatisfied(field, def, input, context)) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * 检查单个输入字段是否满足。
 */
function isInputSatisfied(
  field: string,
  def: ServiceDefinition,
  input: ServiceDiscoveryInput,
  context: NonNullable<ServiceDiscoveryInput['businessContext']>,
): boolean {
  // 从业务上下文检查
  switch (field) {
    case 'project_id':
      return Boolean(context.project?.id);
    case 'app_id':
      return Boolean(context.app?.id);
    case 'files':
      return false; // 需要用户上传
    case 'message':
    case 'question':
      return Boolean(input.message);
    case 'issue_description':
      return Boolean(input.message);
    case 'requirement_description':
    case 'feature_description':
      return Boolean(input.message);
    case 'field_name':
      return Boolean(input.semanticFrame?.fieldDefinition?.targetTerm);
    case 'task_type':
    case 'task_config':
      return false; // 需要用户明确配置
    default:
      // 从 userRequirement 检查
      if (input.userRequirement) {
        const req = input.userRequirement as any;
        if (req[field]) return true;
      }
      return false;
  }
}

// ─── Deduplication ─────────────────────────────────────

/**
 * 去重候选服务（同一服务类型只保留置信度最高的）。
 */
function deduplicateCandidates(candidates: DiscoveredService[]): DiscoveredService[] {
  const map = new Map<ServiceType, DiscoveredService>();
  for (const c of candidates) {
    const existing = map.get(c.type);
    if (!existing || c.confidence > existing.confidence) {
      map.set(c.type, c);
    }
  }
  return Array.from(map.values());
}

// ─── Helper: Get Service Family ────────────────────────

export function getServiceFamily(type: ServiceType): string {
  return SERVICE_TYPE_FAMILY[type] || 'chat';
}
