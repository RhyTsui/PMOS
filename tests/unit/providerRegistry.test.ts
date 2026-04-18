import { afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { ProviderRegistry } from '../../src/core/providerRegistry';
import { SubprojectRegistry } from '../../src/core/subprojectRegistry';

const originalGoogleKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
const originalLegacyKey = process.env.AI_STUDIO_API_KEY;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
const originalAnthropicLegacyKey = process.env.ANTHROPIC_AUTH_TOKEN;

afterEach(() => {
  if (originalGoogleKey === undefined) {
    delete process.env.GOOGLE_AI_STUDIO_API_KEY;
  } else {
    process.env.GOOGLE_AI_STUDIO_API_KEY = originalGoogleKey;
  }

  if (originalLegacyKey === undefined) {
    delete process.env.AI_STUDIO_API_KEY;
  } else {
    process.env.AI_STUDIO_API_KEY = originalLegacyKey;
  }

  if (originalAnthropicKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  }

  if (originalAnthropicLegacyKey === undefined) {
    delete process.env.ANTHROPIC_AUTH_TOKEN;
  } else {
    process.env.ANTHROPIC_AUTH_TOKEN = originalAnthropicLegacyKey;
  }
});

describe('ProviderRegistry', () => {
  it('loads configured providers', async () => {
    const store = new FileStore(path.resolve(process.cwd()));
    const registry = new ProviderRegistry(store);
    const providers = await registry.listProviders();

    expect(providers.length).toBeGreaterThan(0);
    expect(providers[0]).toHaveProperty('name');
    expect(providers.some((provider) => provider.name === 'mock')).toBe(true);
  });

  it('marks ai-studio ready when canonical env key is present', async () => {
    process.env.GOOGLE_AI_STUDIO_API_KEY = 'test-google-key';
    delete process.env.AI_STUDIO_API_KEY;

    const store = new FileStore(path.resolve(process.cwd()));
    const registry = new ProviderRegistry(store);
    const provider = await registry.resolveProviderByName('ai-studio');

    expect(provider?.configured).toBe(true);
    expect(provider?.runtimeReady).toBe(true);
    expect(provider?.deprecatedEnvInUse).toBe(false);
    expect(provider?.activeEnvKey).toBe('GOOGLE_AI_STUDIO_API_KEY');
  });

  it('falls back to legacy env key with migration warning', async () => {
    delete process.env.GOOGLE_AI_STUDIO_API_KEY;
    process.env.AI_STUDIO_API_KEY = 'legacy-google-key';

    const store = new FileStore(path.resolve(process.cwd()));
    const registry = new ProviderRegistry(store);
    const provider = await registry.resolveProviderByName('ai-studio');

    expect(provider?.configured).toBe(true);
    expect(provider?.runtimeReady).toBe(true);
    expect(provider?.deprecatedEnvInUse).toBe(true);
    expect(provider?.activeEnvKey).toBe('AI_STUDIO_API_KEY');
  });

  it('falls back to anthropic legacy env key with migration warning', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_AUTH_TOKEN = 'legacy-anthropic-key';

    const store = new FileStore(path.resolve(process.cwd()));
    const registry = new ProviderRegistry(store);
    const provider = await registry.resolveProviderByName('anthropic');

    expect(provider?.configured).toBe(true);
    expect(provider?.runtimeReady).toBe(true);
    expect(provider?.deprecatedEnvInUse).toBe(true);
    expect(provider?.activeEnvKey).toBe('ANTHROPIC_AUTH_TOKEN');
  });

  it('loads provider config from subproject override path', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-provider-'));
    const store = new FileStore(root);
    const subprojectRegistry = new SubprojectRegistry(store);
    await store.write(
      'config/providers-alt.json',
      JSON.stringify(
        {
          defaultProvider: 'alt-mock',
          providers: [{ name: 'alt-mock', type: 'mock', envKey: 'ALT_MOCK_KEY', capabilities: ['text'] }],
        },
        null,
        2,
      ),
    );
    await subprojectRegistry.createSubproject({
      id: 'shop',
      name: 'Shop',
      overrides: { providerConfigPath: 'config/providers-alt.json' },
    });

    const registry = new ProviderRegistry(store);
    const providers = await registry.listProviders('shop');
    const defaultProvider = await registry.resolveDefaultProvider('shop');

    expect(providers).toHaveLength(1);
    expect(providers[0]?.name).toBe('alt-mock');
    expect(defaultProvider?.name).toBe('alt-mock');
  });
});
