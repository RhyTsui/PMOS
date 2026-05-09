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

  async saveConfig(config: ProviderConfig, subprojectId?: string | null) {
    const overridePath = await this.resolveProviderConfigPath(subprojectId);
    await this.store.writeJson(overridePath ?? 'config/providers.json', ProviderConfigSchema.parse(config));
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
      model: provider.model ?? null,
      priority: provider.priority,
      authMode: provider.authMode,
      scope: provider.scope,
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

  async setDefaultProvider(name: string, subprojectId?: string | null) {
    const config = await this.loadConfig(subprojectId);
    if (!config.providers.some((provider) => provider.name === name)) {
      throw new Error(`provider ${name} not found`);
    }

    const nextConfig: ProviderConfig = {
      ...config,
      defaultProvider: name,
    };
    await this.saveConfig(nextConfig, subprojectId);
    return nextConfig;
  }

  async updateProvider(
    name: string,
    updates: {
      priority?: number;
      model?: string | null;
      baseUrl?: string | null;
    },
    subprojectId?: string | null,
  ) {
    const config = await this.loadConfig(subprojectId);
    const index = config.providers.findIndex((provider) => provider.name === name);
    if (index < 0) {
      throw new Error(`provider ${name} not found`);
    }

    const provider = config.providers[index]!;
    const nextProvider = {
      ...provider,
      ...(updates.priority !== undefined ? { priority: Math.trunc(updates.priority) } : {}),
      ...(updates.model !== undefined ? { model: updates.model?.trim() || undefined } : {}),
      ...(updates.baseUrl !== undefined ? { baseUrl: updates.baseUrl?.trim() || undefined } : {}),
    };

    const nextConfig: ProviderConfig = {
      ...config,
      providers: config.providers.map((item, itemIndex) => (itemIndex === index ? nextProvider : item)),
    };
    await this.saveConfig(nextConfig, subprojectId);
    return this.resolveProvider(nextProvider);
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

    if (provider.authMode === 'browser') {
      return {
        ...provider,
        configured: provider.scope === 'codex-only',
        runtimeReady: false,
        deprecatedEnvInUse: false,
        activeEnvKey: null,
        apiKey: null,
      };
    }

    const envKeys = [...new Set([provider.envKey, ...provider.envKeys].map((envKey) => envKey.trim()).filter(Boolean))];
    const configuredKeys = envKeys
      .map((envKey) => ({
        envKey,
        value: process.env[envKey]?.trim() ?? '',
      }))
      .filter((entry) => Boolean(entry.value));
    const selected = configuredKeys.length > 0
      ? provider.keySelection === 'random'
        ? configuredKeys[Math.floor(Math.random() * configuredKeys.length)]
        : configuredKeys[0]
      : null;
    const primaryValue = selected?.value ?? '';
    const legacyEnvKey = provider.legacyEnvKeys.find((envKey) => Boolean(process.env[envKey]?.trim())) ?? null;
    const legacyValue = legacyEnvKey ? process.env[legacyEnvKey]?.trim() ?? '' : '';
    const apiKey = primaryValue || legacyValue || null;

    return {
      ...provider,
      configured: Boolean(apiKey),
      runtimeReady: Boolean(apiKey),
      deprecatedEnvInUse: !primaryValue && Boolean(legacyEnvKey),
      activeEnvKey: selected?.envKey ?? legacyEnvKey,
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
