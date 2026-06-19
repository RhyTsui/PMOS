import { describe, expect, it } from 'vitest';
import {
  RUNTIME_CONSUMER_REGISTRY,
  GHOST_TO_RUNTIME_MAP,
  getAllRequiredPromptIds,
  getRuntimeConsumer,
  isGhostPrompt,
  buildPromptInventory,
} from '../src/lib/prompt-runtime-consumer-registry';
import type { PromptConfig } from '../src/types';

function makePromptConfig(overrides: Partial<PromptConfig> & { id: string }): PromptConfig {
  return {
    name: 'test',
    scope: 'test',
    expectation: 'test',
    status: 'active',
    current_version: 1,
    binding: {},
    updated_at: '2026-06-16T00:00:00.000Z',
    enabled: true,
    ...overrides,
  };
}

describe('Prompt Runtime Inventory', () => {
  it('all required prompts have a runtime consumer', () => {
    const requiredIds = getAllRequiredPromptIds();
    expect(requiredIds.length).toBeGreaterThan(0);
    for (const id of requiredIds) {
      const consumer = getRuntimeConsumer(id);
      expect(consumer, `required prompt "${id}" should have a runtime consumer`).toBeDefined();
    }
  });

  it('registry has no duplicate promptId entries', () => {
    const ids = RUNTIME_CONSUMER_REGISTRY.map(e => e.promptId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all active_runtime entries have mainPath set and consumer info', () => {
    for (const entry of RUNTIME_CONSUMER_REGISTRY) {
      if (entry.category === 'active_runtime') {
        expect(typeof entry.mainPath, `${entry.promptId} should have mainPath boolean`).toBe('boolean');
        expect(entry.consumerFile, `${entry.promptId} should have consumerFile`).toBeTruthy();
      }
    }
  });

  it('archived_ghost prompts are NOT in required list', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    for (const ghostId of Object.keys(GHOST_TO_RUNTIME_MAP)) {
      expect(requiredIds.has(ghostId), `ghost "${ghostId}" should NOT be required`).toBe(false);
    }
  });

  it('isGhostPrompt returns true for known ghosts', () => {
    expect(isGhostPrompt('core.system')).toBe(true);
    expect(isGhostPrompt('chat.card')).toBe(true);
    expect(isGhostPrompt('route.intent')).toBe(true);
  });

  it('isGhostPrompt returns false for active_runtime prompts', () => {
    expect(isGhostPrompt('route_prompt')).toBe(false);
    expect(isGhostPrompt('model-use-case.chat_answer')).toBe(false);
    expect(isGhostPrompt('conversation-title-generate')).toBe(false);
  });

  it('P1-#1: business-flow domain prompts are active_runtime, not ghosts', () => {
    expect(isGhostPrompt('help.answer')).toBe(false);
    expect(isGhostPrompt('diagnosis.answer')).toBe(false);
    expect(isGhostPrompt('demand.answer')).toBe(false);
    expect(isGhostPrompt('debugging.answer')).toBe(false);
    expect(isGhostPrompt('delivery.answer')).toBe(false);
  });

  it('buildPromptInventory marks active_runtime prompts correctly', () => {
    const prompts = [
      makePromptConfig({ id: 'route_prompt', status: 'active', enabled: true }),
    ];
    const inventory = buildPromptInventory(prompts);
    const row = inventory.find(r => r.promptId === 'route_prompt');
    expect(row).toBeDefined();
    expect(row?.effectiveStatus).toBe('active_runtime');
    expect(row?.runtimeConsumer).toBeDefined();
    expect(row?.issue).toBeUndefined();
  });

  it('buildPromptInventory marks ghost prompts as archived_ghost', () => {
    const prompts = [
      makePromptConfig({ id: 'core.system', status: 'active', enabled: true }),
    ];
    const inventory = buildPromptInventory(prompts);
    const row = inventory.find(r => r.promptId === 'core.system');
    expect(row).toBeDefined();
    expect(row?.effectiveStatus).toBe('archived_ghost');
    expect(row?.issue).toContain('ghost');
  });

  it('GHOST_TO_RUNTIME_MAP deprecatedBy targets are valid runtime consumers', () => {
    for (const [, info] of Object.entries(GHOST_TO_RUNTIME_MAP)) {
      const consumer = getRuntimeConsumer(info.deprecatedBy);
      expect(consumer, `deprecatedBy target "${info.deprecatedBy}" should be a valid consumer`).toBeDefined();
    }
  });

  it('hardcoded_to_managed prompts are in required list', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    const hardcodedIds = RUNTIME_CONSUMER_REGISTRY
      .filter(e => e.category === 'hardcoded_to_managed')
      .map(e => e.promptId);
    for (const id of hardcodedIds) {
      expect(requiredIds.has(id), `hardcoded_to_managed "${id}" should be required`).toBe(true);
    }
  });
});
