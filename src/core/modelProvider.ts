import type { ProviderCapability, ProviderExecutionResult } from '../shared/schemas.js';
import type { ResolvedProvider } from './providerRegistry.js';

export type ModelProviderRequest = {
  runId: string;
  stageId: string;
  capability: ProviderCapability;
  prompt: string;
  imageGeneration?: {
    profile: 'concept-review' | 'delivery-handoff';
    resolution: '1024x1024' | '1536x1024' | '1024x1536';
    quality: 'standard' | 'high';
    outputHint: string | null;
  };
};

export type ProviderEventRecord = {
  kind: 'provider_invoked' | 'provider_succeeded' | 'provider_failed';
  status: 'ok' | 'warning' | 'error';
  detail: string;
};

export type ProviderExecutionBundle = {
  result: ProviderExecutionResult;
  events: ProviderEventRecord[];
};

export interface ModelProvider {
  readonly provider: ResolvedProvider;
  execute(request: ModelProviderRequest): Promise<ProviderExecutionResult>;
}
