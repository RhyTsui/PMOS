import type { ActionContract } from './action-contract';
import type { EvidenceRef, ConfidencePolicy, DataFreshness } from './evidence-contract';
import type { SourceRef } from './source-contract';

export type ScreenType =
  | 'conversation-answer'
  | 'analysis-result'
  | 'report-result'
  | 'dashboard-result'
  | 'metric-explainer'
  | 'decision-review'
  | 'workflow-result'
  | 'asset-viewer'
  | 'error-result'
  | 'empty-result'
  | 'permission-blocked';

export type RegionType =
  | 'summary'
  | 'primary-result'
  | 'supporting-detail'
  | 'insight'
  | 'metric'
  | 'data-view'
  | 'evidence'
  | 'source'
  | 'action-bar'
  | 'runtime'
  | 'workflow'
  | 'asset'
  | 'form'
  | 'warning'
  | 'error'
  | 'metadata';

export type ComponentBinding =
  | 'markdown-result'
  | 'data-visualization'
  | 'ai-runtime'
  | 'workflow-trace'
  | 'asset-reference'
  | 'decision-card'
  | 'evidence-panel'
  | 'source-list'
  | 'action-bar'
  | 'disclosure-panel'
  | 'form-input'
  | 'feedback-panel'
  | 'permission-gate'
  | 'empty-state'
  | 'error-state';

export type RegionState =
  | 'ready'
  | 'loading'
  | 'streaming'
  | 'partial'
  | 'empty'
  | 'error'
  | 'blocked'
  | 'hidden'
  | 'degraded';

export interface RuntimeRef {
  id: string;
  kind: 'runtime' | 'event' | 'agent' | 'tool-call' | 'workflow' | 'workflow-step' | string;
}

export interface LayoutHints {
  priority?: number;
  placement?: 'main' | 'side' | 'header' | 'footer' | 'inline' | 'modal';
  width?: 'full' | 'half' | 'third' | 'auto';
  height?: 'auto' | 'compact' | 'medium' | 'expanded';
  minHeight?: number;
  maxHeight?: number;
  density?: 'compact' | 'comfortable' | 'spacious';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  sticky?: boolean;
  scrollMode?: 'normal' | 'virtualized' | 'paginated';
  responsiveBehavior?: 'stack' | 'collapse' | 'hide' | 'drawer';
  preferredVariant?: string;
}

export interface VisibilityPolicy {
  defaultVisible?: boolean;
  audiences?: Array<'user' | 'admin' | 'operator' | 'developer' | 'auditor'>;
  roles?: string[];
  conditions?: string[];
  redaction?: 'none' | 'partial' | 'full';
  collapsedFor?: Array<'user' | 'admin' | 'operator' | 'developer' | 'auditor'>;
  hiddenReason?: string;
}

export interface PermissionPolicy {
  requiredPermissions?: string[];
  deniedBehavior?: 'hide' | 'redact' | 'disable' | 'request-access';
  requestAccessActionId?: string;
  redactionPolicy?: string;
}

export interface FallbackPolicy {
  reason?:
    | 'unsupported-binding'
    | 'invalid-data'
    | 'permission-denied'
    | 'source-unavailable'
    | 'evidence-unavailable'
    | 'runtime-unavailable'
    | 'empty-data'
    | 'render-error';
  title?: string;
  message?: string;
  actionIds?: string[];
}

export interface ProducerInfo {
  kind: 'model' | 'agent' | 'tool' | 'workflow' | 'backend' | 'human' | 'system';
  name?: string;
  version?: string;
}

export interface SemanticRegion<TData = unknown> {
  id: string;
  type: RegionType;
  componentBinding: ComponentBinding;
  title?: string;
  description?: string;
  priority?: number;
  state?: RegionState;
  data: TData;
  actions?: ActionContract[];
  evidenceRefs?: string[];
  sourceRefs?: string[];
  runtimeRefs?: Array<string | RuntimeRef>;
  layoutHints?: LayoutHints;
  visibility?: VisibilityPolicy;
  permission?: PermissionPolicy;
  fallback?: FallbackPolicy;
  dependencies?: Array<{
    kind: 'region' | 'evidence' | 'source' | 'runtime' | 'artifact' | string;
    id: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface SemanticResultContract<TRegionData = unknown> {
  contractType: 'semantic-result';
  version: string;
  resultId: string;
  conversationId?: string;
  messageId?: string;
  screenType: ScreenType;
  title?: string;
  description?: string;
  createdAt: string;
  producer?: ProducerInfo;
  regions: Array<SemanticRegion<TRegionData>>;
  actions?: ActionContract[];
  evidenceRefs?: EvidenceRef[];
  sourceRefs?: SourceRef[];
  runtimeRefs?: RuntimeRef[];
  layoutHints?: LayoutHints;
  visibility?: VisibilityPolicy;
  permission?: PermissionPolicy;
  fallback?: FallbackPolicy;
  freshness?: DataFreshness;
  confidence?: ConfidencePolicy;
  metadata?: Record<string, unknown>;
}
