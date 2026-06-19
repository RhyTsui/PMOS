import type { ActionContract } from '../semantic/action-contract';
import type { EvidenceRef, ConfidencePolicy, DataFreshness, RedactionPolicy } from '../semantic/evidence-contract';
import type { RuntimeDisplayProtocol, RuntimeEvent, RuntimeStatus, ToolCallState, WorkflowStepState } from '../runtime/runtime-display-protocol';
import type { SourceRef } from '../semantic/source-contract';
import type { SemanticResultContract } from '../semantic/semantic-result-contract';
import type { Message, WorkflowResult } from '@/types';

export const MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE = 'message-disclosure-view' as const;
export const MESSAGE_DISCLOSURE_VIEW_VERSION = '1.0.0' as const;

export type DisclosureStatus = 'ready' | 'partial' | 'empty' | 'blocked' | 'failed' | 'degraded';

export type DisclosureQualityStatus = 'pass' | 'warn' | 'fail' | 'info' | 'pending';

export type DisclosureRawStatus = 'available' | 'redacted' | 'blocked' | 'empty';

export interface DisclosureOverviewMetric {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface DisclosureOverview {
  title: string;
  summary: string;
  status: DisclosureStatus;
  badges: string[];
  highlights: string[];
  metrics: DisclosureOverviewMetric[];
}

export interface DisclosureExecutionStep {
  id: string;
  title: string;
  status: RuntimeStatus | 'idle';
  kind?: 'tool' | 'workflow' | 'agent' | 'runtime' | 'analysis' | 'reasoning' | 'custom';
  summary?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  toolName?: string;
  toolDisplayName?: string;
  inputSummary?: string;
  outputSummary?: string;
  input?: unknown;
  output?: unknown;
  evidenceRefs?: string[];
  sourceRefs?: string[];
  runtimeRefs?: string[];
  error?: {
    code?: string;
    message?: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    recoverable?: boolean;
    retryable?: boolean;
  };
  retry?: {
    attempt?: number;
    maxAttempts?: number;
    nextRetryAt?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface DisclosureExecution {
  runtimeId?: string;
  executionId?: string;
  status: RuntimeStatus | 'idle';
  summary: string;
  toolCalls: DisclosureToolCallItem[];
  steps: DisclosureExecutionStep[];
  events: Array<Pick<RuntimeEvent, 'id' | 'type' | 'status' | 'timestamp' | 'title' | 'summary' | 'toolCallId' | 'workflowId' | 'stepId'>>;
  workflowSteps: WorkflowStepState[];
  runtimeStatusLabel?: string;
}

export interface DisclosureSourceItem {
  id: string;
  title: string;
  type: SourceRef['type'] | string;
  summary?: string;
  detail?: string;
  url?: string;
  retrievedAt?: string;
  freshness?: DataFreshness;
  reliability?: SourceRef['reliability'];
  locator?: SourceRef['locator'];
  citationPolicy?: SourceRef['citationPolicy'];
  redaction?: RedactionPolicy;
  confidence?: ConfidencePolicy;
  metadata?: Record<string, unknown>;
}

export interface DisclosureEvidenceItem {
  id: string;
  title: string;
  type?: EvidenceRef['type'];
  summary?: string;
  sourceRefIds?: string[];
  confidence?: ConfidencePolicy;
  freshness?: DataFreshness;
  redaction?: RedactionPolicy;
  verification?: EvidenceRef['verification'];
  metadata?: Record<string, unknown>;
}

export interface DisclosureEvidence {
  sources: DisclosureSourceItem[];
  evidenceRefs: DisclosureEvidenceItem[];
  summary: string;
}

export interface DisclosureFieldCatalogItem {
  key: string;
  label: string;
  description?: string;
  type?: string;
  unit?: string;
  format?: string;
  category?: string;
  value?: unknown;
  displayValue?: string;
  status?: 'present' | 'missing' | 'partial' | 'unknown';
  required?: boolean;
  derived?: boolean;
  sourcePath?: string;
  examples?: string[];
  metadata?: Record<string, unknown>;
}

export interface DisclosureFields {
  items: DisclosureFieldCatalogItem[];
  summary: string;
}

export interface DisclosureQualityCheckItem {
  id: string;
  label: string;
  status: DisclosureQualityStatus;
  summary: string;
  detail?: string;
  evidenceRefs?: string[];
  sourceRefs?: string[];
  runtimeRefs?: string[];
  actionHint?: string;
  metadata?: Record<string, unknown>;
}

export interface DisclosureQualityChecks {
  items: DisclosureQualityCheckItem[];
  summary: string;
}

export interface DisclosureRawInfoItem {
  id: string;
  label: string;
  kind: 'json' | 'text' | 'code' | 'link' | 'table';
  summary?: string;
  displayValue: string;
  rawValue?: unknown;
  redacted: boolean;
  collapsed: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface DisclosureRawInfo {
  status: DisclosureRawStatus;
  note: string;
  items: DisclosureRawInfoItem[];
}

export interface DisclosureToolPayload {
  summary?: string;
  normalized?: unknown;
  displayValue?: string;
  rawRef?: string;
  redaction?: RedactionPolicy;
  rowCount?: number;
  error?: {
    code?: string;
    message?: string;
    recoverable?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface DisclosureToolCallItem {
  id: string;
  name: string;
  displayName?: string;
  kind?: string;
  status?: string;
  arguments?: string;
  result?: string;
  providerUrl?: string;
  prompt?: string;
  stepKey?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  request?: DisclosureToolPayload;
  response?: DisclosureToolPayload;
  schemaRef?: {
    input?: string;
    output?: string;
  };
  quality?: {
    status?: DisclosureQualityStatus;
    summary?: string;
    detail?: string;
  };
}

export interface DisclosurePermissionState {
  canViewOverview: boolean;
  canViewExecution: boolean;
  canViewEvidence: boolean;
  canViewFields: boolean;
  canViewQualityChecks: boolean;
  canViewRaw: boolean;
  canViewActions: boolean;
  canViewFull: boolean;
  deniedReason?: string;
  redactionLevel: 'none' | 'partial' | 'full';
}

export interface DisclosureEmptyStates {
  overview: string;
  execution: string;
  evidence: string;
  fields: string;
  qualityChecks: string;
  rawInfo: string;
}

export interface MessageDisclosureView {
  contractType: typeof MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE;
  version: typeof MESSAGE_DISCLOSURE_VIEW_VERSION;
  disclosureId: string;
  messageId: string;
  conversationId?: string;
  title?: string;
  overview: DisclosureOverview;
  execution: DisclosureExecution;
  evidence: DisclosureEvidence;
  fields: DisclosureFields;
  qualityChecks: DisclosureQualityChecks;
  rawInfo: DisclosureRawInfo;
  permissions: DisclosurePermissionState;
  emptyStates: DisclosureEmptyStates;
  actions?: ActionContract[];
  sourceRefs?: SourceRef[];
  evidenceRefs?: EvidenceRef[];
  runtimeRefs?: RuntimeDisplayProtocol['runtimeId'][];
  metadata?: Record<string, unknown>;
}

export interface DisclosureProjectionSeed {
  overview?: Partial<DisclosureOverview>;
  execution?: Partial<DisclosureExecution>;
  evidence?: Partial<DisclosureEvidence>;
  fields?: Partial<DisclosureFields>;
  qualityChecks?: Partial<DisclosureQualityChecks>;
  rawInfo?: Partial<DisclosureRawInfo>;
  permissions?: Partial<DisclosurePermissionState>;
  emptyStates?: Partial<DisclosureEmptyStates>;
  actions?: ActionContract[];
  sourceRefs?: SourceRef[];
  evidenceRefs?: EvidenceRef[];
  runtimeRefs?: RuntimeDisplayProtocol['runtimeId'][];
  metadata?: Record<string, unknown>;
}

export interface DisclosureBuildInput {
  message: Message;
  semanticResult?: SemanticResultContract | WorkflowResult | Record<string, unknown> | null;
  runtime?: RuntimeDisplayProtocol | Record<string, unknown> | null;
  fieldCatalog?: DisclosureFieldCatalogItem[] | null;
  seed?: DisclosureProjectionSeed | null;
  permissions?: Partial<DisclosurePermissionState> | null;
  now?: string;
}
