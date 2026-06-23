/**
 * Demand Intake Structurer（P1）
 *
 * 将用户自然语言消息结构化为 intake draft。
 * 从 demand-intake-gate 内联逻辑提取为可复用函数。
 */

import type {
  DemandIntakeSlotValue,
  DemandIntakeArtifact,
  DemandIntakeMetadata,
  DemandCapabilityLookupResult,
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
import { normalizeCapabilityAppType, normalizeCapabilityMedia } from '@/lib/demand-capability-status';
import { detectSecuritySensitiveContent, type SecurityFinding } from '@/lib/demand-security-detector';

export interface DemandIntakeDraft {
  serviceIntakeCandidate: boolean;
  serviceType: ServiceIntakeType | null;
  media?: string;
  appType?: string;
  capabilityStatusResult?: DemandCapabilityLookupResult;
  collectedSlots: Record<string, DemandIntakeSlotValue>;
  missingInputs: string[];
  artifacts: DemandIntakeArtifact[];
  riskWarnings: string[];
  intakeDraftStatus: IntakeDraftStatus;
  securityFindings: SecurityFinding[];
}

export function deriveServiceIntakeType(message: string): ServiceIntakeType | null {
  const normalized = String(message || '').toLowerCase();

  const packageIntegrationExclusions = ['获取包', '可用包', '发起联调', '取包'];
  if (packageIntegrationExclusions.some(term => normalized.includes(term))) {
    return null;
  }

  if (hasAdvertisingDomainSignal(message, ['workflow'])) {
    if (/https?:\/\/[^\s"'<>]+/i.test(message)) {
      return 'monitoring_callback';
    }
    const integrationTerms = ['对接', '接入', '监测链接', '回传'];
    if (integrationTerms.some(term => normalized.includes(term))) {
      return 'monitoring_callback';
    }
  }

  const dataCollectionTerms = ['采集', '数据源', '数据接入', '报表定制'];
  if (dataCollectionTerms.some(term => normalized.includes(term))) {
    return 'data_collection';
  }

  return null;
}

function readStringCandidate(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (Array.isArray(value)) {
      const nested = readStringCandidate(...value);
      if (nested) return nested;
    }
  }
  return undefined;
}

function readBusinessContextRecord(businessContext: unknown): Record<string, any> {
  return businessContext && typeof businessContext === 'object'
    ? businessContext as Record<string, any>
    : {};
}

export function extractMediaFromContextOrMessage(message: string, businessContext: unknown): string | undefined {
  const bizCtx = readBusinessContextRecord(businessContext);
  const contextMedia = readStringCandidate(
    bizCtx.media?.value,
    bizCtx.media,
    bizCtx.mediaName,
    bizCtx.media_name,
    bizCtx.currentProject?.media,
    bizCtx.currentProject?.mediaName,
    bizCtx.currentProject?.media_name,
    bizCtx.currentProject?.channel,
    bizCtx.currentProject?.channel_name,
  );
  if (contextMedia) return normalizeCapabilityMedia(contextMedia);

  const mediaTerms = ADVERTISING_DOMAIN_SIGNAL_TERMS.media;
  const matched = mediaTerms.find((term: string) => message.includes(term));
  return matched ? normalizeCapabilityMedia(matched) : undefined;
}

export function extractAppTypeFromContextOrMessage(message: string, businessContext: unknown): string | undefined {
  const bizCtx = readBusinessContextRecord(businessContext);
  const contextAppType = readStringCandidate(
    bizCtx.appType,
    bizCtx.app_type,
    bizCtx.appTypes,
    bizCtx.app_types,
    bizCtx.platform,
    bizCtx.platform_name,
    bizCtx.currentProject?.appType,
    bizCtx.currentProject?.app_type,
    bizCtx.currentProject?.appTypes,
    bizCtx.currentProject?.app_types,
    bizCtx.currentProject?.platform,
    bizCtx.currentProject?.platform_name,
  );
  if (contextAppType) return normalizeCapabilityAppType(contextAppType);

  const normalized = String(message || '').toLowerCase();
  if (/(android|安卓)/i.test(normalized)) return normalizeCapabilityAppType('ANDROID');
  if (/(ios|iphone|ipad|苹果)/i.test(normalized)) return normalizeCapabilityAppType('IOS');
  if (/(harmony|鸿蒙)/i.test(normalized)) return normalizeCapabilityAppType('HARMONY');
  return undefined;
}

export function extractCollectedSlots(
  message: string,
  serviceType: ServiceIntakeType,
  businessContext: unknown,
): Record<string, DemandIntakeSlotValue> {
  const slots: Record<string, DemandIntakeSlotValue> = {};
  const slotDefs = DEMAND_INTAKE_SLOT_DEFS[serviceType];
  const bizCtx = readBusinessContextRecord(businessContext);

  const extractedMedia = extractMediaFromContextOrMessage(message, businessContext);
  const extractedAppType = extractAppTypeFromContextOrMessage(message, businessContext);

  for (const def of slotDefs) {
    if (def.slotId === 'project') {
      const projectName = readStringCandidate(
        bizCtx.project?.name,
        bizCtx.project?.value,
        bizCtx.projectName,
        bizCtx.project_name,
        bizCtx.appName,
        bizCtx.app_name,
        bizCtx.currentProject?.projectName,
        bizCtx.currentProject?.project_name,
        bizCtx.currentProject?.appName,
        bizCtx.currentProject?.app_name,
      );
      if (projectName) {
        slots[def.slotId] = { value: projectName, source: 'business_context' };
        continue;
      }
    }

    if (def.slotId === 'media' && extractedMedia) {
      slots[def.slotId] = { value: extractedMedia, source: 'business_context' };
      continue;
    }

    if (def.slotId === 'appType' && extractedAppType) {
      slots[def.slotId] = { value: extractedAppType, source: 'business_context' };
      continue;
    }

    if (def.slotId === 'document_url') {
      const urlMatch = message.match(/https?:\/\/[^\s"'<>]+/i);
      if (urlMatch) {
        slots[def.slotId] = { value: urlMatch[0], source: 'message' };
        continue;
      }
    }

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

export function computeMissingInputs(
  serviceType: ServiceIntakeType,
  collectedSlots: Record<string, DemandIntakeSlotValue>,
): string[] {
  const slotDefs = DEMAND_INTAKE_SLOT_DEFS[serviceType];
  return slotDefs
    .filter(def => def.required && !collectedSlots[def.slotId]?.value)
    .map(def => def.label);
}

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

export function generateRiskWarnings(
  securityFindings: SecurityFinding[],
  serviceType: ServiceIntakeType,
  collectedSlots: Record<string, DemandIntakeSlotValue>,
): string[] {
  const warnings: string[] = [];

  for (const finding of securityFindings) {
    warnings.push(finding.hint);
  }

  const slotDefs = DEMAND_INTAKE_SLOT_DEFS[serviceType];
  const secretSlots = slotDefs.filter(d => d.securityLevel === 'secret');

  if (secretSlots.length > 0 && securityFindings.length === 0) {
    for (const s of secretSlots) {
      if (s.secureCollectionHint) warnings.push(s.secureCollectionHint);
    }
  }

  return warnings;
}

export function structureDemandIntake(
  message: string,
  businessContext?: unknown,
): DemandIntakeDraft {
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

  const securityFindings = detectSecuritySensitiveContent(message);
  const collectedSlots = extractCollectedSlots(message, serviceType, businessContext);
  const missingInputs = computeMissingInputs(serviceType, collectedSlots);
  const artifacts = extractArtifacts(collectedSlots);
  const riskWarnings = generateRiskWarnings(securityFindings, serviceType, collectedSlots);
  const intakeDraftStatus: IntakeDraftStatus = missingInputs.length > 0
    ? 'collecting'
    : 'ready_for_confirmation';

  return {
    serviceIntakeCandidate: true,
    serviceType,
    media: collectedSlots.media?.value ? normalizeCapabilityMedia(collectedSlots.media.value) : undefined,
    appType: collectedSlots.appType?.value ? normalizeCapabilityAppType(collectedSlots.appType.value) : undefined,
    collectedSlots,
    missingInputs,
    artifacts,
    riskWarnings,
    intakeDraftStatus,
    securityFindings,
  };
}

export function toCaseFrameMetadata(draft: DemandIntakeDraft): DemandIntakeMetadata {
  return {
    serviceIntakeCandidate: draft.serviceIntakeCandidate,
    serviceType: draft.serviceType || undefined,
    media: draft.media,
    appType: draft.appType,
    capabilityStatusResult: draft.capabilityStatusResult,
    missingInputs: draft.missingInputs,
    intakeDraftStatus: draft.intakeDraftStatus,
    collectedSlots: draft.collectedSlots,
    artifacts: draft.artifacts,
  };
}

export { getServiceIntakeDisplayName };
