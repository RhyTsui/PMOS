import type { ProviderExecutionResult } from '../../shared/schemas.js';
import { AiStudioProvider } from '../../core/aiStudioProvider.js';
import type { ModelProvider, ModelProviderRequest } from '../../core/modelProvider.js';
import type { ResolvedProvider } from '../../core/providerRegistry.js';

export class AiStudioProviderAdapter implements ModelProvider {
  readonly provider: ResolvedProvider;
  private readonly runtime: AiStudioProvider;

  constructor(provider: ResolvedProvider) {
    this.provider = provider;
    this.runtime = new AiStudioProvider(provider);
  }

  execute(request: ModelProviderRequest): Promise<ProviderExecutionResult> {
    return this.runtime.execute(request);
  }
}
