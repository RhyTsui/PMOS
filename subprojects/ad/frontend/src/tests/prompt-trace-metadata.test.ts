import { describe, expect, it } from 'vitest';
import {
  RUNTIME_CONSUMER_REGISTRY,
  getRuntimeConsumer,
  getAllRequiredPromptIds,
} from '../src/lib/prompt-runtime-consumer-registry';

describe('Prompt Trace Metadata', () => {
  it('every runtime consumer has required fields for trace', () => {
    for (const entry of RUNTIME_CONSUMER_REGISTRY) {
      expect(entry.promptId, 'promptId must be set').toBeTruthy();
      expect(entry.consumer, `${entry.promptId}: consumer must be set`).toBeTruthy();
      expect(entry.consumerFile, `${entry.promptId}: consumerFile must be set`).toBeTruthy();
      expect(entry.useCase, `${entry.promptId}: useCase must be set`).toBeTruthy();
      expect(typeof entry.mainPath, `${entry.promptId}: mainPath must be boolean`).toBe('boolean');
      expect(entry.category, `${entry.promptId}: category must be set`).toBeTruthy();
    }
  });

  it('active_runtime consumers are traceable via promptId', () => {
    const activeEntries = RUNTIME_CONSUMER_REGISTRY.filter(e => e.category === 'active_runtime');
    expect(activeEntries.length).toBeGreaterThan(0);
    for (const entry of activeEntries) {
      const lookup = getRuntimeConsumer(entry.promptId);
      expect(lookup).toBeDefined();
      expect(lookup?.consumer).toBe(entry.consumer);
      expect(lookup?.useCase).toBe(entry.useCase);
    }
  });

  it('all required prompts can be resolved to a consumer', () => {
    const requiredIds = getAllRequiredPromptIds();
    for (const id of requiredIds) {
      const consumer = getRuntimeConsumer(id);
      expect(consumer, `required prompt "${id}" must have a resolvable consumer`).toBeDefined();
    }
  });

  it('consumer categories are valid', () => {
    const validCategories = new Set(['active_runtime', 'active_alias', 'hardcoded_to_managed']);
    for (const entry of RUNTIME_CONSUMER_REGISTRY) {
      expect(validCategories.has(entry.category), `${entry.promptId}: invalid category "${entry.category}"`).toBe(true);
    }
  });

  it('main chat route prompts have correct consumer file paths', () => {
    const mainChatIds = [
      'route_prompt', 'response_prompt', 'evidence_prompt',
      'card_prompt', 'followup_prompt', 'tool_explain_prompt',
    ];
    for (const id of mainChatIds) {
      const consumer = getRuntimeConsumer(id);
      expect(consumer).toBeDefined();
      expect(consumer?.consumerFile).toContain('chat/route.ts');
    }
  });

  it('model use case prompts have correct consumer file paths', () => {
    const modelUseCaseIds = RUNTIME_CONSUMER_REGISTRY
      .filter(e => e.promptId.startsWith('model-use-case.'))
      .map(e => e.promptId);
    expect(modelUseCaseIds.length).toBeGreaterThan(10);
    for (const id of modelUseCaseIds) {
      const consumer = getRuntimeConsumer(id);
      expect(consumer).toBeDefined();
      expect(consumer?.consumerFile).toContain('model-use-case-runtime.ts');
    }
  });
});
