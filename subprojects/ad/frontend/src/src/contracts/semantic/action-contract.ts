export type ActionType =
  | 'navigate'
  | 'open-url'
  | 'open-source'
  | 'open-evidence'
  | 'open-artifact'
  | 'query'
  | 'drill-down'
  | 'filter'
  | 'sort'
  | 'export'
  | 'copy'
  | 'share'
  | 'continue-analysis'
  | 'regenerate'
  | 'retry'
  | 'run-workflow'
  | 'approve'
  | 'reject'
  | 'request-access'
  | 'create-task'
  | 'submit-feedback'
  | 'dismiss'
  | 'custom';

export type ActionIntent =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'destructive'
  | 'risky'
  | 'system'
  | 'background';

export type ActionTargetKind =
  | 'route'
  | 'url'
  | 'semantic-query'
  | 'artifact'
  | 'source'
  | 'evidence'
  | 'runtime'
  | 'workflow'
  | 'api'
  | 'clipboard'
  | 'local-state';

export interface ActionTarget {
  kind: ActionTargetKind;
  value: string;
  params?: Record<string, unknown>;
}

export interface ActionConfirm {
  required: boolean;
  title?: string;
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  requireTextInput?: boolean;
  confirmText?: string;
  consequences?: string[];
}

export interface ActionFeedbackPolicy {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  showInlineStatus?: boolean;
  optimistic?: boolean;
  retryable?: boolean;
  resultHandling?:
    | 'ignore'
    | 'refresh-region'
    | 'append-message'
    | 'replace-result'
    | 'open-panel';
}

export interface ActionAuditPolicy {
  required?: boolean;
  eventName?: string;
  riskCategory?: string;
}

export interface ActionContract<TPayload = Record<string, unknown>> {
  id: string;
  type: ActionType;
  intent: ActionIntent;
  label: string;
  description?: string;
  icon?: string;
  target?: ActionTarget;
  payload?: TPayload;
  confirm?: ActionConfirm;
  feedbackPolicy?: ActionFeedbackPolicy;
  permission?: {
    requiredPermissions?: string[];
    deniedBehavior?: 'hide' | 'redact' | 'disable' | 'request-access';
  };
  visibility?: {
    defaultVisible?: boolean;
    audiences?: Array<'user' | 'admin' | 'operator' | 'developer' | 'auditor'>;
    roles?: string[];
  };
  evidenceRefs?: string[];
  sourceRefs?: string[];
  runtimeRefs?: string[];
  disabledReason?: string;
  audit?: ActionAuditPolicy;
  telemetry?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
