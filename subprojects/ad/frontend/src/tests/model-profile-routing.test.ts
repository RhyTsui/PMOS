import { describe, expect, it } from 'vitest';
import { buildEffectiveModelRoute, hasConfiguredModelCredentials, type ModelServiceConfig } from '../src/lib/runtime-config';

const baseConfig: ModelServiceConfig = {
  enabled: true,
  provider: 'coze_openai_compatible',
  providerLabel: 'Default Provider',
  apiKey: 'default-key',
  baseUrl: 'https://default.example.com',
  modelBaseUrl: 'https://default.example.com/v1',
  modelName: 'default-model',
  modelProfiles: [
    {
      id: 'default-profile',
      name: 'Default Model',
      provider: 'coze_openai_compatible',
      providerLabel: 'Default Provider',
      apiKey: 'default-key',
      baseUrl: 'https://default.example.com',
      modelBaseUrl: 'https://default.example.com/v1',
      modelName: 'default-model',
      enabled: true,
    },
    {
      id: 'commercial-profile',
      name: 'Commercial Model',
      provider: 'custom_openai_compatible',
      providerLabel: 'Commercial Provider',
      apiKey: 'commercial-key',
      baseUrl: 'https://commercial.example.com',
      modelBaseUrl: 'https://commercial.example.com/v1',
      modelName: 'commercial-model',
      enabled: true,
    },
    {
      id: 'disabled-profile',
      name: 'Disabled Model',
      provider: 'custom_openai_compatible',
      providerLabel: 'Disabled Provider',
      apiKey: 'disabled-key',
      baseUrl: 'https://disabled.example.com',
      modelBaseUrl: 'https://disabled.example.com/v1',
      modelName: 'disabled-model',
      enabled: false,
    },
  ],
  defaultModelProfileId: 'default-profile',
  knowledgeBaseUrl: '',
  knowledgeBaseApiKey: '',
  knowledgeBaseDataset: '',
  controlledGlossaryKnowledgeBaseId: '',
  datakiBaseUrl: 'https://dataki.example.com',
  datakiAdminEmail: '',
  datakiAdminPassword: '',
  notes: '',
  updatedAt: '2026-06-07T00:00:00.000Z',
  routes: {},
};

const allowExternalModelPolicy = {
  dataClass: 'internal' as const,
  requireDesensitization: true,
  allowExternalModel: true,
  auditRequired: true,
};

describe('model profile routing', () => {
  it('uses only the configured default profile when a use case has no override', () => {
    const route = buildEffectiveModelRoute({
      ...baseConfig,
      routes: {
        chat_answer: {
          useCase: 'chat_answer',
          enabled: true,
          routeMode: 'direct_external',
          dataPolicy: allowExternalModelPolicy,
        },
      },
    }, 'chat_answer');

    expect(route.modelProfileId).toBe('default-profile');
    expect(route.modelProfileName).toBe('Default Model');
    expect(route.modelName).toBe('default-model');
    expect(route.provider).toBe('coze_openai_compatible');
    expect(hasConfiguredModelCredentials(baseConfig, route)).toBe(true);
  });

  it('switches a use case to the selected backend model profile', () => {
    const route = buildEffectiveModelRoute({
      ...baseConfig,
      routes: {
        chat_answer: {
          useCase: 'chat_answer',
          enabled: true,
          routeMode: 'direct_external',
          modelProfileId: 'commercial-profile',
          dataPolicy: allowExternalModelPolicy,
        },
      },
    }, 'chat_answer');

    expect(route.modelProfileId).toBe('commercial-profile');
    expect(route.modelProfileName).toBe('Commercial Model');
    expect(route.modelName).toBe('commercial-model');
    expect(route.provider).toBe('custom_openai_compatible');
    expect(hasConfiguredModelCredentials(baseConfig, route)).toBe(true);
  });

  it('disables real calls when the selected profile is disabled', () => {
    const route = buildEffectiveModelRoute({
      ...baseConfig,
      routes: {
        chat_answer: {
          useCase: 'chat_answer',
          enabled: true,
          routeMode: 'direct_external',
          modelProfileId: 'disabled-profile',
          dataPolicy: allowExternalModelPolicy,
        },
      },
    }, 'chat_answer');

    expect(route.enabled).toBe(false);
    expect(route.isRealLLMCall).toBe(false);
    expect(route.warnings.join('\n')).toContain('disabled');
    expect(hasConfiguredModelCredentials(baseConfig, route)).toBe(false);
  });

  it('blocks a selected profile when external model use is not allowed', () => {
    const route = buildEffectiveModelRoute({
      ...baseConfig,
      routes: {
        chat_answer: {
          useCase: 'chat_answer',
          enabled: true,
          routeMode: 'direct_external',
          modelProfileId: 'commercial-profile',
          dataPolicy: { ...allowExternalModelPolicy, allowExternalModel: false },
        },
      },
    }, 'chat_answer');

    expect(route.modelProfileId).toBe('commercial-profile');
    expect(route.enabled).toBe(false);
    expect(route.policyBlocked).toBe(true);
    expect(route.policyBlockReason).toBe('direct_external_blocked_by_data_policy');
    expect(route.isRealLLMCall).toBe(false);
  });

  it('falls back to an enabled profile when the default profile is disabled', () => {
    const configWithDisabledDefault: ModelServiceConfig = {
      ...baseConfig,
      defaultModelProfileId: 'disabled-profile',
    };
    const route = buildEffectiveModelRoute(configWithDisabledDefault, 'chat_answer');

    // 应该降级到第一个启用的 profile (default-profile)
    expect(route.modelProfileId).toBe('default-profile');
    expect(route.modelProfileName).toBe('Default Model');
    expect(route.enabled).toBe(true);
    expect(route.isRealLLMCall).toBe(true);
    expect(route.warnings.join('\n')).toContain('falling back');
    expect(hasConfiguredModelCredentials(configWithDisabledDefault, route)).toBe(true);
  });

  it('disables route when the default profile is disabled and no other enabled profile exists', () => {
    const configAllDisabled: ModelServiceConfig = {
      ...baseConfig,
      modelProfiles: [
        {
          id: 'only-profile',
          name: 'Only Profile',
          provider: 'coze_openai_compatible',
          providerLabel: 'Default Provider',
          apiKey: 'key',
          baseUrl: 'https://example.com',
          modelBaseUrl: 'https://example.com/v1',
          modelName: 'model',
          enabled: false,
        },
      ],
      defaultModelProfileId: 'only-profile',
    };
    const route = buildEffectiveModelRoute(configAllDisabled, 'chat_answer');

    expect(route.modelProfileId).toBe('only-profile');
    expect(route.enabled).toBe(false);
    expect(route.isRealLLMCall).toBe(false);
    expect(route.warnings.join('\n')).toContain('disabled');
  });
});
