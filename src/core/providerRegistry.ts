import { FileStore } from './fileStore.js';
import { SubprojectRegistry } from './subprojectRegistry.js';
import {
  ProviderConfigSchema,
  type ProviderCapability,
  type ProviderConfig,
  type ProviderDefinition,
  type ProviderSummary,
} from '../shared/schemas.js';

export type ResolvedProvider = ProviderDefinition & {
  configured: boolean;
  runtimeReady: boolean;
  deprecatedEnvInUse: boolean;
  activeEnvKey: string | null;
  apiKey: string | null;
};

export class ProviderRegistry {
  constructor(
    private readonly store: FileStore,
    private readonly subprojectRegistry = new SubprojectRegistry(store),
  ) {}

  async loadConfig(subprojectId?: string | null): Promise<ProviderConfig> {
    const overridePath = await this.resolveProviderConfigPath(subprojectId);
    const json = await this.store.readJson<unknown>(overridePath ?? 'config/providers.json');
    return ProviderConfigSchema.parse(json);
  }

  async listResolvedProviders(subprojectId?: string | null): Promise<ResolvedProvider[]> {
    const config = await this.loadConfig(subprojectId);
    return config.providers.map((provider) => this.resolveProvider(provider));
  }

  async listProviders(subprojectId?: string | null): Promise<ProviderSummary[]> {
    const providers = await this.listResolvedProviders(subprojectId);
    return providers.map((provider) => ({
      name: provider.name,
      type: provider.type,
      configured: provider.configured,
      runtimeReady: provider.runtimeReady,
      deprecatedEnvInUse: provider.deprecatedEnvInUse,
      capabilities: provider.capabilities,
    }));
  }

  async resolveDefaultProvider(subprojectId?: string | null) {
    const config = await this.loadConfig(subprojectId);
    const providers = await this.listResolvedProviders(subprojectId);
    return providers.find((provider) => provider.name === config.defaultProvider) ?? providers[0];
  }

  async resolveProviderByName(name: string, subprojectId?: string | null) {
    const providers = await this.listResolvedProviders(subprojectId);
    return providers.find((provider) => provider.name === name) ?? null;
  }

  async listProvidersForCapability(capability: ProviderCapability, subprojectId?: string | null) {
    const providers = await this.listResolvedProviders(subprojectId);
    return providers.filter((provider) => provider.capabilities.includes(capability));
  }

  private resolveProvider(provider: ProviderDefinition): ResolvedProvider {
    if (provider.type === 'mock') {
      return {
        ...provider,
        configured: true,
        runtimeReady: true,
        deprecatedEnvInUse: false,
        activeEnvKey: null,
        apiKey: null,
      };
    }

    const primaryValue = process.env[provider.envKey]?.trim() ?? '';
    const legacyEnvKey = provider.legacyEnvKeys.find((envKey) => Boolean(process.env[envKey]?.trim())) ?? null;
    const legacyValue = legacyEnvKey ? process.env[legacyEnvKey]?.trim() ?? '' : '';
    const apiKey = primaryValue || legacyValue || null;

    return {
      ...provider,
      configured: Boolean(apiKey),
      runtimeReady: Boolean(apiKey),
      deprecatedEnvInUse: !primaryValue && Boolean(legacyEnvKey),
      activeEnvKey: primaryValue ? provider.envKey : legacyEnvKey,
      apiKey,
    };
  }

  private async resolveProviderConfigPath(subprojectId?: string | null) {
    if (!subprojectId) {
      return null;
    }

    const subproject = await this.subprojectRegistry.loadSubproject(subprojectId);
    return subproject.overrides.providerConfigPath ?? null;
  }
}
