import type {
  ComponentBinding,
  RegionType,
  SemanticRegion,
  SemanticResultContract,
} from '../semantic/semantic-result-contract';
import type { ActionContract } from '../semantic/action-contract';
import type { EvidenceRef } from '../semantic/evidence-contract';
import type { SourceRef } from '../semantic/source-contract';
import type { RuntimeDisplayProtocol } from '../runtime/runtime-display-protocol';

export interface ValidationResult<TNormalized = unknown> {
  valid: boolean;
  errors?: Array<{ code: string; message: string; path?: string }>;
  warnings?: Array<{ code: string; message: string; path?: string }>;
  normalizedData?: TNormalized;
}

export interface RendererCapabilities {
  supportsStreaming?: boolean;
  supportsVirtualization?: boolean;
  supportsLazyLoading?: boolean;
  supportsMobileDegradation?: boolean;
  requiresArtifactResolver?: boolean;
  requiresRuntimeResolver?: boolean;
}

export interface RendererPerformancePolicy {
  virtualized?: boolean;
  lazy?: boolean;
  streamingAware?: boolean;
  maxInlineItems?: number;
  artifactBacked?: boolean;
  mobileDegradable?: boolean;
}

export interface RendererContext {
  actionDispatcher: (action: ActionContract) => Promise<unknown> | unknown;
  evidenceResolver: (id: string) => EvidenceRef | undefined;
  sourceResolver: (id: string) => SourceRef | undefined;
  runtimeResolver: (id: string) => RuntimeDisplayProtocol | undefined;
  artifactResolver?: (id: string) => Promise<unknown> | unknown;
  permissionChecker?: (permissions?: string[]) => boolean;
  visibilityEvaluator?: (region: SemanticRegion) => boolean;
  telemetry?: {
    track: (eventName: string, payload?: Record<string, unknown>) => void;
  };
  featureFlags?: Record<string, boolean>;
  environment?: 'desktop' | 'mobile' | 'tablet' | 'server' | string;
}

export interface RegisteredRenderer<TData = unknown, TNormalized = unknown, TRendered = unknown> {
  binding: ComponentBinding;
  version: string;
  displayName: string;
  supportedRegionTypes?: RegionType[];
  capabilities?: RendererCapabilities;
  performance?: RendererPerformancePolicy;
  validate: (data: TData, region: SemanticRegion<TData>) => ValidationResult<TNormalized>;
  render: (region: SemanticRegion<TData>, context: RendererContext) => TRendered;
  fallback?: (region: SemanticRegion<TData>, context: RendererContext, reason: string) => TRendered;
}

export interface ComponentRegistry<TRendered = unknown> {
  register: (renderer: RegisteredRenderer<unknown, unknown, TRendered>) => void;
  unregister: (binding: ComponentBinding) => void;
  resolve: (binding: ComponentBinding) => RegisteredRenderer<unknown, unknown, TRendered> | undefined;
  renderRegion: (region: SemanticRegion, context: RendererContext) => TRendered;
  renderResult: (result: SemanticResultContract, context: RendererContext) => TRendered;
}
