/**
 * Demand Intake Types & Configuration
 *
 * 服务分诊类型、槽位定义、CaseFrame metadata 扩展。
 * 配置驱动，业务信号来自域包配置，不硬编码。
 */

// ─── 服务分诊类型 ─────────────────────────────────────

export type ServiceIntakeType = 'data_collection' | 'monitoring_callback';

// ─── 槽位定义 ─────────────────────────────────────────

export type SecurityLevel = 'public' | 'internal' | 'secret';

export interface DemandIntakeSlotDef {
  slotId: string;
  label: string;
  required: boolean;
  securityLevel: SecurityLevel;
  /** secret 级别槽位的引导话术 */
  secureCollectionHint?: string;
}

/**
 * 各服务类型的槽位定义（配置驱动）。
 * 业务信号来自 Domain Pack / Entity Dictionary，
 * 不在此处硬编码关键词。
 */
export const DEMAND_INTAKE_SLOT_DEFS: Record<ServiceIntakeType, DemandIntakeSlotDef[]> = {
  monitoring_callback: [
    { slotId: 'project', label: '项目/游戏', required: true, securityLevel: 'public' },
    { slotId: 'media', label: '媒体平台', required: true, securityLevel: 'public' },
    { slotId: 'integration_type', label: '对接类型（监测/回传/监测+回传）', required: true, securityLevel: 'public' },
    { slotId: 'document_url', label: '对接文档', required: true, securityLevel: 'public' },
    { slotId: 'auth_method', label: '授权方式或授权文档', required: true, securityLevel: 'internal' },
    { slotId: 'event_list', label: '回传事件清单', required: true, securityLevel: 'public' },
    {
      slotId: 'test_account',
      label: '测试账号',
      required: true,
      securityLevel: 'secret',
      secureCollectionHint: '请通过安全授权流程提交测试账号，不要在对话中发送明文。',
    },
    { slotId: 'test_account_has_data', label: '测试账号是否有数据', required: true, securityLevel: 'public' },
    { slotId: 'target_launch_date', label: '期望上线时间', required: false, securityLevel: 'public' },
    { slotId: 'contact', label: '联系人', required: false, securityLevel: 'public' },
  ],
  data_collection: [
    { slotId: 'project', label: '项目/游戏', required: true, securityLevel: 'public' },
    { slotId: 'media', label: '媒体平台', required: true, securityLevel: 'public' },
    { slotId: 'data_source', label: '数据源', required: true, securityLevel: 'public' },
    { slotId: 'timeline', label: '期望上线时间', required: false, securityLevel: 'public' },
    { slotId: 'contact', label: '联系人', required: false, securityLevel: 'public' },
  ],
};

// ─── 能力状态 ─────────────────────────────────────────

export type IntegrationStatus = 'integrated' | 'not_integrated' | 'unknown';

// ─── CaseFrame Metadata 扩展 ─────────────────────────

export interface DemandIntakeSlotValue {
  value?: string;
  source?: 'message' | 'document' | 'business_context' | 'user_claim' | 'system';
  confirmed?: boolean;
}

export interface DemandIntakeArtifact {
  type: 'document_url' | 'document_content' | 'screenshot' | 'config';
  url?: string;
  title?: string;
  contentHash?: string;
  storedAt: string;
}

export type IntakeDraftStatus = 'collecting' | 'ready_for_confirmation' | 'confirmed' | 'submitted';

export interface DemandIntakeMetadata {
  serviceIntakeCandidate: boolean;
  serviceType?: ServiceIntakeType;
  integrationStatus?: IntegrationStatus;
  businessDocumentUrl?: string;
  missingInputs: string[];
  intakeDraftStatus: IntakeDraftStatus;
  collectedSlots: Record<string, DemandIntakeSlotValue>;
  artifacts: DemandIntakeArtifact[];
}

// ─── 服务类型显示名（来自配置，非硬编码） ─────────────

export function getServiceIntakeDisplayName(serviceType: ServiceIntakeType): string {
  const map: Record<ServiceIntakeType, string> = {
    monitoring_callback: '监测回传对接',
    data_collection: '采集数据需求',
  };
  return map[serviceType] || serviceType;
}
