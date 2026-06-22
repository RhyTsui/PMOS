/**
 * Demand Intake Structurer（P1）
 *
 * 将用户自然语言消息结构化为 intake draft。
 * 从 demand-intake-gate 内联逻辑提取为可复用函数。
 *
 * 输入：用户消息 + 业务上下文
 * 输出：结构化 intake draft（serviceType, slots, missingInputs, artifacts, riskWarnings, status）
 */

import type {
  DemandIntakeSlotValue,
  DemandIntakeArtifact,
  DemandIntakeMetadata,
  IntakeDraftStatus,
  ServiceIntakeType,
} from '@/contracts/demand/demand-intake-types';
import {
  DEMAND_INTAKE_SLOT_DEFS,
  getServiceIntakeDisplayName,
} from '@/contracts/demand/demand-intake-types';
import {
  hasAdvertisingDomainSignal,
  ADVERTISING_DOMAIN_SIGNAL_TERMS,
} from '@/lib/advertising-domain-pack';
import { detectSecuritySensitiveContent, type SecurityFinding } from '@/lib/demand-security-detector';

// ─── 输出类型 ────────────────────────────────────────────

export interface DemandIntakeDraft {
  /** 是否识别为需求 intake 候选 */
  serviceIntakeCandidate: boolean;
  /** 服务类型 */
  serviceType: ServiceIntakeType | null;
  /** 已识别槽位 */
  collectedSlots: Record<string, DemandIntakeSlotValue>;
  /** 缺失项 */
  missingInputs: string[];
  /** 产物（文档 URL 等） */
  artifacts: DemandIntakeArtifact[];
  /** 风险提示（安全检测、敏感项等） */
  riskWarnings: string[];
  /** 草稿状态 */
  intakeDraftStatus: IntakeDraftStatus;
  /** 安全检测结果 */
  securityFindings: SecurityFinding[];
}

// ─── 服务类型推断 ────────────────────────────────────────

/**
 * 从用户消息推断服务类型。
 * 使用域包配置中的 workflow 信号组，不硬编码业务关键词。
 * 排除 package/integration 意图（如"获取可用包"）。
 */
export function deriveServiceIntakeType(message: string): ServiceIntakeType | null {
  const normalized = String(message || '').toLowerCase();

  // 排除 package/integration 意图（强信号：获取包、可用包、发起联调）
  const packageIntegrationExclusions = ['获取包', '可用包', '发起联调', '取包'];
  if (packageIntegrationExclusions.some(term => normalized.includes(term))) {
    return null;
  }

  // 监测回传对接：workflow 信号组
  if (hasAdvertisingDomainSignal(message, ['workflow'])) {
    // 检查是否有对接文档 URL（强信号）
    if (/https?:\/\/[^\s"'<>]+/i.test(message)) {
      return 'monitoring_callback';
    }
    // 检查是否有对接相关词汇（排除联调单独出现的情况）
    const integrationTerms = ['对接', '接入', '监测链接', '回传'];
    if (integrationTerms.some(term => normalized.includes(term))) {
      return 'monitoring_callback';
    }
    // 如果只有"联调"但没有"对接"等词，且没有文档 URL，不视为 demand intake
  }

  // 数据采集需求：data_source 信号
  const dataCollectionTerms = ['采集', '数据源', '数据接入', '报表定制'];
  if (dataCollectionTerms.some(term => normalized.includes(term))) {
    return 'data_collection';
  }

  return null;
}

// ─── 槽位提取 ────────────────────────────────────────────

/**
 * 从消息和业务上下文提取已填充槽位。
 * 槽位来源：message / business_context / domain_signals
 */
export function extractCollectedSlots(
  message: string,
  serviceType: ServiceIntakeType,
  businessContext: unknown,
): Record<string, DemandIntakeSlotValue> {
  const slots: Record<string, DemandIntakeSlotValue> = {};
  const slotDefs = DEMAND_INTAKE_SLOT_DEFS[serviceType];
  const bizCtx = (businessContext || {}) as Record<string, any>;

  for (const def of slotDefs) {
    // 从业务上下文提取 project
    if (def.slotId === 'project') {
      const projectName = bizCtx.project?.name || bizCtx.project?.value;
      if (projectName) {
        slots[def.slotId] = { value: String(projectName), source: 'business_context' };
        continue;
      }
    }

    // 从业务上下文提取 media
    if (def.slotId === 'media') {
      const ctxMedia = bizCtx.media?.value || bizCtx.media;
      if (ctxMedia && typeof ctxMedia === 'string') {
        slots[def.slotId] = { value: ctxMedia, source: 'business_context' };
        continue;
      }
    }

    // 从域信号提取媒体
    if (def.slotId === 'media' && !slots[def.slotId]) {
      const mediaTerms = ADVERTISING_DOMAIN_SIGNAL_TERMS.media;
      const matched = mediaTerms.find((term: string) => message.includes(term));
      if (matched) {
        slots[def.slotId] = { value: matched, source: 'message' };
        continue;
      }
    }

    // 从消息提取 URL（对接文档）
    if (def.slotId === 'document_url') {
      const urlMatch = message.match(/https?:\/\/[^\s"'<>]+/i);
      if (urlMatch) {
        slots[def.slotId] = { value: urlMatch[0], source: 'message' };
        continue;
      }
    }

    // 从消息提取对接类型
    if (def.slotId === 'integration_type') {
      const normalized = message.toLowerCase();
      if (normalized.includes('监测') && normalized.includes('回传')) {
        slots[def.slotId] = { value: '监测+回传', source: 'message' };
      } else if (normalized.includes('监测')) {
        slots[def.slotId] = { value: '监测', source: 'message' };
      } else if (normalized.includes('回传')) {
        slots[def.slotId] = { value: '回传', source: 'message' };
      }
      continue;
    }

    // 从消息提取数据源（data_collection）
    if (def.slotId === 'data_source') {
      const dataSourceTerms = ['后端接口', '数据库', 'Excel', 'API', '文件'];
      const matched = dataSourceTerms.find(term => message.toLowerCase().includes(term.toLowerCase()));
      if (matched) {
        slots[def.slotId] = { value: matched, source: 'message' };
      }
      continue;
    }
  }

  return slots;
}

// ─── 缺失项计算 ──────────────────────────────────────────

/**
 * 计算缺失的必填槽位。
 */
export function computeMissingInputs(
  serviceType: ServiceIntakeType,
  collectedSlots: Record<string, DemandIntakeSlotValue>,
): string[] {
  const slotDefs = DEMAND_INTAKE_SLOT_DEFS[serviceType];
  return slotDefs
    .filter(def => def.required && !collectedSlots[def.slotId]?.value)
    .map(def => def.label);
}

// ─── 产物提取 ────────────────────────────────────────────

/**
 * 从槽位中提取产物（文档 URL 等）。
 */
export function extractArtifacts(collectedSlots: Record<string, DemandIntakeSlotValue>): DemandIntakeArtifact[] {
  const artifacts: DemandIntakeArtifact[] = [];

  if (collectedSlots['document_url']?.value) {
    artifacts.push({
      type: 'document_url',
      url: collectedSlots['document_url'].value,
      storedAt: new Date().toISOString(),
    });
  }

  return artifacts;
}

// ─── 风险提示生成 ────────────────────────────────────────

/**
 * 生成风险提示（安全检测、敏感项等）。
 */
export function generateRiskWarnings(
  securityFindings: SecurityFinding[],
  serviceType: ServiceIntakeType,
  collectedSlots: Record<string, DemandIntakeSlotValue>,
): string[] {
  const warnings: string[] = [];

  // 安全检测结果
  for (const finding of securityFindings) {
    warnings.push(finding.hint);
  }

  // secret 级别槽位的通用安全提示
  const slotDefs = DEMAND_INTAKE_SLOT_DEFS[serviceType];
  const secretSlots = slotDefs.filter(d => d.securityLevel === 'secret');

  if (secretSlots.length > 0 && securityFindings.length === 0) {
    for (const s of secretSlots) {
      if (s.secureCollectionHint) {
        warnings.push(s.secureCollectionHint);
      }
    }
  }

  return warnings;
}

// ─── 主函数 ──────────────────────────────────────────────

/**
 * 将用户消息结构化为 intake draft。
 *
 * @param message 用户消息
 * @param businessContext 业务上下文（项目、媒体等）
 * @returns 结构化 intake draft
 */
export function structureDemandIntake(
  message: string,
  businessContext?: unknown,
): DemandIntakeDraft {
  // 推断服务类型
  const serviceType = deriveServiceIntakeType(message);

  if (!serviceType) {
    return {
      serviceIntakeCandidate: false,
      serviceType: null,
      collectedSlots: {},
      missingInputs: [],
      artifacts: [],
      riskWarnings: [],
      intakeDraftStatus: 'collecting',
      securityFindings: [],
    };
  }

  // 安全检测
  const securityFindings = detectSecuritySensitiveContent(message);

  // 提取已填充槽位
  const collectedSlots = extractCollectedSlots(message, serviceType, businessContext);

  // 计算缺失项
  const missingInputs = computeMissingInputs(serviceType, collectedSlots);

  // 提取产物
  const artifacts = extractArtifacts(collectedSlots);

  // 生成风险提示
  const riskWarnings = generateRiskWarnings(securityFindings, serviceType, collectedSlots);

  // 确定草稿状态
  const intakeDraftStatus: IntakeDraftStatus = missingInputs.length > 0
    ? 'collecting'
    : 'ready_for_confirmation';

  return {
    serviceIntakeCandidate: true,
    serviceType,
    collectedSlots,
    missingInputs,
    artifacts,
    riskWarnings,
    intakeDraftStatus,
    securityFindings,
  };
}

/**
 * 将 intake draft 转换为 CaseFrame metadata。
 */
export function toCaseFrameMetadata(draft: DemandIntakeDraft): DemandIntakeMetadata {
  return {
    serviceIntakeCandidate: draft.serviceIntakeCandidate,
    serviceType: draft.serviceType || undefined,
    missingInputs: draft.missingInputs,
    intakeDraftStatus: draft.intakeDraftStatus,
    collectedSlots: draft.collectedSlots,
    artifacts: draft.artifacts,
  };
}

/**
 * 获取服务类型的显示名称。
 */
export { getServiceIntakeDisplayName };
