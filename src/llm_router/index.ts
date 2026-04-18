import type { ProviderCapability, ProviderExecutionResult } from '../shared/schemas.js';
import { FileStore } from '../core/fileStore.js';
import type { ModelProvider, ModelProviderRequest, ProviderExecutionBundle, ProviderEventRecord } from '../core/modelProvider.js';
import { ProviderRegistry, type ResolvedProvider } from '../core/providerRegistry.js';
import { AiStudioProviderAdapter } from './providers/aiStudioProviderAdapter.js';
import { AnthropicProviderAdapter } from './providers/anthropicProviderAdapter.js';
import { MockProvider } from './providers/mockProvider.js';

type LlmRouterScope = {
  subprojectId?: string | null;
  preferredProvider?: string | null;
  allowCrossCapabilityFallback?: boolean;
};

type RoutedCandidate = {
  provider: ResolvedProvider;
  capability: ProviderCapability;
};

export class LlmRouter {
  constructor(
    private readonly store: FileStore,
    private readonly registry = new ProviderRegistry(store),
  ) {}

  async execute(request: ModelProviderRequest, scope: LlmRouterScope = {}): Promise<ProviderExecutionBundle> {
    const candidates = await this.resolveCandidates(request.capability, scope);
    if (candidates.length === 0) {
      return this.buildUnavailableBundle(request.capability, null, `没有 provider 声明支持能力 ${request.capability}。`);
    }

    const events: ProviderEventRecord[] = [];
    let lastResult: ProviderExecutionResult | null = null;

    for (const [index, candidate] of candidates.entries()) {
      const { provider, capability } = candidate;
      events.push({
        kind: 'provider_invoked',
        status: 'ok',
        detail: `LLM Router 尝试 provider ${provider.name} 以 ${capability} 执行 ${request.capability}。`,
      });

      if (!provider.runtimeReady) {
        const detail = `Provider ${provider.name} 未就绪，请配置环境变量 ${provider.envKey}。`;
        events.push({
          kind: 'provider_failed',
          status: 'error',
          detail,
        });
        lastResult = this.buildErrorResult(request.capability, provider, detail);
        continue;
      }

      const runtime = this.createRuntime(provider, capability, request.capability, scope.allowCrossCapabilityFallback ?? false);
      if (!runtime) {
        const detail = `Provider ${provider.name} (${provider.type}) 暂无运行时实现。`;
        events.push({
          kind: 'provider_failed',
          status: 'error',
          detail,
        });
        lastResult = this.buildErrorResult(request.capability, provider, detail);
        continue;
      }

      const result = await runtime.execute(request);
      if (result.status === 'success' && (result.outputText || result.assets.length > 0)) {
        const withFallbackWarning = index > 0
          ? {
              ...result,
              warning: [result.warning, `LLM Router 已自动回退到 ${provider.name}。`].filter(Boolean).join(' '),
            }
          : result;
        events.push({
          kind: 'provider_succeeded',
          status: 'ok',
          detail: index > 0
            ? `Provider ${provider.name} 已完成 ${request.capability}，前序 provider 已自动 fallback。`
            : `Provider ${provider.name} 已完成 ${request.capability}。`,
        });
        return {
          result: withFallbackWarning,
          events,
        };
      }

      const detail = result.error ?? `Provider ${provider.name} 执行 ${request.capability} 失败。`;
      events.push({
        kind: 'provider_failed',
        status: 'error',
        detail,
      });
      lastResult = {
        ...result,
        status: 'error',
        error: detail,
      };
    }

    return {
      result: lastResult ?? this.buildErrorResult(request.capability, null, `所有 provider 均未能完成 ${request.capability}。`),
      events,
    };
  }

  private async resolveCandidates(capability: ProviderCapability, scope: LlmRouterScope) {
    const subprojectId = scope.subprojectId ?? null;
    const config = await this.registry.loadConfig(subprojectId);
    const providers = await this.registry.listResolvedProviders(subprojectId);
    const groups = this.getCapabilityGroups(capability, scope.allowCrossCapabilityFallback ?? false);
    const seen = new Set<string>();
    const candidates: RoutedCandidate[] = [];

    for (const groupCapability of groups) {
      const groupProviders = providers.filter((provider) => provider.capabilities.includes(groupCapability));
      const ranked = this.rankProviders(groupProviders, scope.preferredProvider ?? null, config.defaultProvider);
      for (const provider of ranked) {
        const key = `${provider.name}:${groupCapability}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        candidates.push({
          provider,
          capability: groupCapability,
        });
      }
    }

    return candidates;
  }

  private getCapabilityGroups(capability: ProviderCapability, allowCrossCapabilityFallback: boolean): ProviderCapability[] {
    if (!allowCrossCapabilityFallback) {
      return [capability];
    }

    switch (capability) {
      case 'text-multimodal':
        return ['text-multimodal', 'text'];
      case 'multimodal':
        return ['multimodal', 'text-multimodal', 'text'];
      default:
        return [capability];
    }
  }

  private rankProviders(providers: ResolvedProvider[], preferredProvider: string | null, defaultProvider: string) {
    return [...providers].sort((left, right) => {
      const scoreDelta = this.getProviderScore(right, preferredProvider, defaultProvider)
        - this.getProviderScore(left, preferredProvider, defaultProvider);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.name.localeCompare(right.name);
    });
  }

  private getProviderScore(provider: ResolvedProvider, preferredProvider: string | null, defaultProvider: string) {
    let score = 0;
    if (preferredProvider && provider.name === preferredProvider) {
      score += 100;
    }
    if (provider.name === defaultProvider) {
      score += 20;
    }
    if (provider.runtimeReady) {
      score += 10;
    }
    if (provider.type !== 'mock') {
      score += 5;
    }
    return score;
  }

  private createRuntime(
    provider: ResolvedProvider,
    routedCapability: ProviderCapability,
    requestedCapability: ProviderCapability,
    allowCrossCapabilityFallback: boolean,
  ): ModelProvider | null {
    if (provider.type === 'anthropic' && routedCapability === requestedCapability) {
      return new AnthropicProviderAdapter(provider);
    }

    if (provider.type === 'ai-studio' && routedCapability === requestedCapability) {
      return new AiStudioProviderAdapter(provider);
    }

    if (provider.type === 'mock' && routedCapability === requestedCapability) {
      return new MockProvider(provider);
    }

    if (provider.type === 'mock' && routedCapability === 'text' && requestedCapability !== 'text' && allowCrossCapabilityFallback) {
      return new MockProvider(provider);
    }

    return null;
  }

  private buildUnavailableBundle(
    capability: ProviderCapability,
    provider: ResolvedProvider | null,
    detail: string,
  ): ProviderExecutionBundle {
    return {
      result: this.buildErrorResult(capability, provider, detail),
      events: [
        {
          kind: 'provider_failed',
          status: 'error',
          detail,
        },
      ],
    };
  }

  private buildErrorResult(capability: ProviderCapability, provider: ResolvedProvider | null, detail: string): ProviderExecutionResult {
    return {
      providerName: provider?.name ?? 'unresolved',
      providerType: provider?.type ?? 'unresolved',
      capability,
      model: 'unavailable',
      status: 'error',
      operationId: null,
      outputText: null,
      assets: [],
      warning: provider?.deprecatedEnvInUse ? `检测到旧环境变量 ${provider.legacyEnvKeys[0] ?? 'unknown'}` : null,
      error: detail,
    };
  }
}
