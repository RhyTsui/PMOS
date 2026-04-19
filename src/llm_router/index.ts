import type { ProviderCapability, ProviderExecutionResult, ProviderRoutingSnapshot } from '../shared/schemas.js';
import { FileStore } from '../core/fileStore.js';
import type { ModelProvider, ModelProviderRequest, ProviderExecutionBundle, ProviderEventRecord } from '../core/modelProvider.js';
import { ProviderRegistry, type ResolvedProvider } from '../core/providerRegistry.js';
import { AiStudioProviderAdapter } from './providers/aiStudioProviderAdapter.js';
import { AnthropicProviderAdapter } from './providers/anthropicProviderAdapter.js';
import { MockProvider } from './providers/mockProvider.js';
import { OpenAICompatibleProviderAdapter } from './providers/openAICompatibleProviderAdapter.js';

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
  private static readonly providerCooldowns = new Map<string, number>();

  constructor(
    private readonly store: FileStore,
    private readonly registry = new ProviderRegistry(store),
  ) {}

  static resetCooldowns() {
    this.providerCooldowns.clear();
  }

  async execute(request: ModelProviderRequest, scope: LlmRouterScope = {}): Promise<ProviderExecutionBundle> {
    const candidates = await this.resolveCandidates(request.capability, scope);
    if (candidates.length === 0) {
      return this.buildUnavailableBundle(request.capability, null, `No provider supports capability ${request.capability}.`);
    }

    const events: ProviderEventRecord[] = [];
    let lastResult: ProviderExecutionResult | null = null;

    for (const [index, candidate] of candidates.entries()) {
      const { provider, capability } = candidate;
      const cooldownUntil = this.getActiveCooldownUntil(provider.name);
      if (cooldownUntil && index < candidates.length - 1) {
        events.push({
          kind: 'provider_failed',
          status: 'warning',
          detail: `Provider ${provider.name} is cooling down until ${new Date(cooldownUntil).toISOString()}, so LLM Router is skipping to the next provider.`,
        });
        continue;
      }

      events.push({
        kind: 'provider_invoked',
        status: 'ok',
        detail: `LLM Router is trying provider ${provider.name} with capability ${capability} for ${request.capability}.`,
      });

      if (!provider.runtimeReady) {
        const detail = `Provider ${provider.name} is not ready; configure ${provider.envKey}.`;
        events.push({
          kind: 'provider_failed',
          status: 'error',
          detail: this.buildProviderFailureDetail(detail, provider.name, index < candidates.length - 1),
        });
        lastResult = this.buildErrorResult(request.capability, provider, detail);
        continue;
      }

      const runtime = this.createRuntime(provider, capability, request.capability, scope.allowCrossCapabilityFallback ?? false);
      if (!runtime) {
        const detail = `Provider ${provider.name} (${provider.type}) has no runtime for ${request.capability}.`;
        events.push({
          kind: 'provider_failed',
          status: 'error',
          detail: this.buildProviderFailureDetail(detail, provider.name, index < candidates.length - 1),
        });
        lastResult = this.buildErrorResult(request.capability, provider, detail);
        continue;
      }

      const result = await runtime.execute(request);
      if (result.status === 'success' && (result.outputText || result.assets.length > 0)) {
        this.clearCooldown(provider.name);
        const withFallbackWarning = index > 0
          ? {
              ...result,
              warning: [result.warning, `LLM Router automatically fell back to ${provider.name}.`].filter(Boolean).join(' '),
            }
          : result;
        events.push({
          kind: 'provider_succeeded',
          status: 'ok',
          detail: index > 0
            ? `Provider ${provider.name} completed ${request.capability} after fallback.`
            : `Provider ${provider.name} completed ${request.capability}.`,
        });
        return {
          result: withFallbackWarning,
          events,
        };
      }

      const detail = result.error ?? `Provider ${provider.name} failed for ${request.capability}.`;
      if (this.isQuotaOrRateLimitError(detail)) {
        this.markCooldown(provider.name);
      }
      events.push({
        kind: 'provider_failed',
        status: 'error',
        detail: this.buildProviderFailureDetail(detail, provider.name, index < candidates.length - 1),
      });
      lastResult = {
        ...result,
        status: 'error',
        error: detail,
      };
    }

    return {
      result: lastResult ?? this.buildErrorResult(request.capability, null, `All providers failed for ${request.capability}.`),
      events,
    };
  }

  async describeRouting(capability: ProviderCapability, scope: LlmRouterScope = {}): Promise<ProviderRoutingSnapshot> {
    const subprojectId = scope.subprojectId ?? null;
    const config = await this.registry.loadConfig(subprojectId);
    const candidates = await this.resolveCandidates(capability, scope);

    return {
      capability,
      preferredProvider: scope.preferredProvider ?? null,
      defaultProvider: config.defaultProvider,
      providers: candidates.map((candidate, index) => {
        const cooldownUntil = this.getActiveCooldownUntil(candidate.provider.name);
        return {
          name: candidate.provider.name,
          type: candidate.provider.type,
          configured: candidate.provider.configured,
          runtimeReady: candidate.provider.runtimeReady,
          deprecatedEnvInUse: candidate.provider.deprecatedEnvInUse,
          activeEnvKey: candidate.provider.activeEnvKey,
          capabilities: candidate.provider.capabilities,
          model: candidate.provider.model ?? null,
          baseUrl: candidate.provider.baseUrl ?? null,
          priority: candidate.provider.priority,
          routedCapability: candidate.capability,
          order: index,
          score: this.getProviderScore(candidate.provider, scope.preferredProvider ?? null, config.defaultProvider),
          coolingDown: Boolean(cooldownUntil),
          cooldownUntil: cooldownUntil ? new Date(cooldownUntil).toISOString() : null,
        };
      }),
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
    let score = provider.priority;
    if (this.getActiveCooldownUntil(provider.name)) {
      score -= 1000;
    }
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

    if (provider.type === 'openai-compatible' && routedCapability === requestedCapability) {
      return new OpenAICompatibleProviderAdapter(provider);
    }

    if (provider.type === 'mock' && routedCapability === requestedCapability) {
      return new MockProvider(provider);
    }

    if (provider.type === 'mock' && routedCapability === 'text' && requestedCapability !== 'text' && allowCrossCapabilityFallback) {
      return new MockProvider(provider);
    }

    return null;
  }

  private buildProviderFailureDetail(detail: string, providerName: string, hasFallbackCandidate: boolean) {
    if (!hasFallbackCandidate) {
      return detail;
    }

    if (this.isQuotaOrRateLimitError(detail)) {
      return `${detail} LLM Router detected a quota or rate-limit issue and will try the next provider after ${providerName}.`;
    }

    return `${detail} LLM Router will continue to the next provider after ${providerName}.`;
  }

  private isQuotaOrRateLimitError(detail: string) {
    return /(429|quota|rate[\s-]?limit|too many requests|resource[\s-]?exhausted|exhausted|额度|限流)/iu.test(detail);
  }

  private getActiveCooldownUntil(providerName: string) {
    const cooldownUntil = LlmRouter.providerCooldowns.get(providerName) ?? null;
    if (!cooldownUntil) {
      return null;
    }

    if (cooldownUntil <= Date.now()) {
      LlmRouter.providerCooldowns.delete(providerName);
      return null;
    }

    return cooldownUntil;
  }

  private markCooldown(providerName: string) {
    LlmRouter.providerCooldowns.set(providerName, Date.now() + this.getCooldownMs());
  }

  private clearCooldown(providerName: string) {
    LlmRouter.providerCooldowns.delete(providerName);
  }

  private getCooldownMs() {
    const configured = Number(process.env.LLM_ROUTER_QUOTA_COOLDOWN_MS ?? '');
    return Number.isFinite(configured) && configured > 0 ? configured : 10 * 60 * 1000;
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
      model: provider?.model ?? 'unavailable',
      status: 'error',
      operationId: null,
      outputText: null,
      assets: [],
      warning: provider?.deprecatedEnvInUse ? `Legacy env key detected for ${provider.name}.` : null,
      error: detail,
    };
  }
}
