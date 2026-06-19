import type { ActionContract } from '../semantic/action-contract';

export type AIChatOSTelemetryEventName =
  | 'action_invoked'
  | 'action_succeeded'
  | 'action_failed'
  | 'action_confirmed'
  | 'action_cancelled'
  | 'renderer_error'
  | 'renderer_fallback_used'
  | 'contract_validation_failed'
  | 'runtime_latency_recorded'
  | 'runtime_error_shown'
  | 'prompt_contract_generated'
  | 'audit_trail_recorded';

export interface BaseTelemetryEvent {
  eventName: AIChatOSTelemetryEventName;
  timestamp: string;
  conversationId?: string;
  messageId?: string;
  resultId?: string;
  regionId?: string;
  runtimeId?: string;
  userId?: string;
  sessionId?: string;
  contractVersion?: string;
  promptVersion?: string;
  toolVersion?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionTrackingEvent extends BaseTelemetryEvent {
  eventName:
    | 'action_invoked'
    | 'action_succeeded'
    | 'action_failed'
    | 'action_confirmed'
    | 'action_cancelled';
  actionId: string;
  actionType: string;
  actionIntent: string;
  sourceRefs?: string[];
  evidenceRefs?: string[];
  confirmed?: boolean;
  permissionState?: 'allowed' | 'denied' | 'unknown';
  errorCode?: string;
  errorMessage?: string;
}

export interface RendererErrorTelemetryEvent extends BaseTelemetryEvent {
  eventName: 'renderer_error' | 'renderer_fallback_used';
  binding: string;
  rendererVersion?: string;
  errorName?: string;
  errorMessage?: string;
  errorStackHash?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface ContractValidationTelemetryEvent extends BaseTelemetryEvent {
  eventName: 'contract_validation_failed';
  contractType: 'semantic-result' | 'runtime-display' | 'action' | 'evidence' | 'source' | 'renderer-data';
  issueCode: string;
  issuePath?: string;
  issueMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface RuntimeLatencyTelemetryEvent extends BaseTelemetryEvent {
  eventName: 'runtime_latency_recorded';
  status: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  agentCount?: number;
  toolCallCount?: number;
  retryCount?: number;
  approvalWaitMs?: number;
  slowestToolCall?: string;
}

export interface AuditTrailEvent extends BaseTelemetryEvent {
  eventName: 'audit_trail_recorded';
  auditId: string;
  actionId: string;
  actionType: string;
  actionIntent: string;
  actorId?: string;
  actorRole?: string;
  decision?: 'approved' | 'rejected' | 'executed' | 'cancelled';
  riskLevel?: string;
  evidenceRefs?: string[];
  sourceRefs?: string[];
}

export type AIChatOSTelemetryEvent =
  | ActionTrackingEvent
  | RendererErrorTelemetryEvent
  | ContractValidationTelemetryEvent
  | RuntimeLatencyTelemetryEvent
  | AuditTrailEvent
  | BaseTelemetryEvent;

export interface ActionTelemetryContext {
  conversationId?: string;
  messageId?: string;
  resultId?: string;
  regionId?: string;
  runtimeId?: string;
  userId?: string;
  sessionId?: string;
  contractVersion?: string;
}

export function createActionTrackingEvent(
  eventName: ActionTrackingEvent['eventName'],
  action: ActionContract,
  context: ActionTelemetryContext = {},
): ActionTrackingEvent {
  return {
    eventName,
    timestamp: new Date().toISOString(),
    ...context,
    actionId: action.id,
    actionType: action.type,
    actionIntent: action.intent,
    sourceRefs: action.sourceRefs,
    evidenceRefs: action.evidenceRefs,
    confirmed: action.confirm?.required ? eventName === 'action_confirmed' : undefined,
    metadata: action.telemetry,
  };
}

export function createAuditTrailEvent(
  action: ActionContract,
  context: ActionTelemetryContext & { auditId: string; actorId?: string; actorRole?: string; decision?: AuditTrailEvent['decision'] } ,
): AuditTrailEvent {
  return {
    eventName: 'audit_trail_recorded',
    timestamp: new Date().toISOString(),
    ...context,
    actionId: action.id,
    actionType: action.type,
    actionIntent: action.intent,
    riskLevel: action.confirm?.riskLevel,
    evidenceRefs: action.evidenceRefs,
    sourceRefs: action.sourceRefs,
  };
}
