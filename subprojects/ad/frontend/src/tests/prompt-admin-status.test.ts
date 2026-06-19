import { describe, expect, it } from 'vitest';
import {
  getRuntimeConsumer,
  getAllRequiredPromptIds,
  buildPromptInventory,
  GHOST_TO_RUNTIME_MAP,
} from '../src/lib/prompt-runtime-consumer-registry';
import type { PromptConfig } from '../src/types';

function makePrompt(overrides: Partial<PromptConfig> & { id: string }): PromptConfig {
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

describe('Prompt Admin Status', () => {
  it('active_runtime prompts show correct effectiveStatus in inventory', () => {
    const prompts = [
      makePrompt({ id: 'route_prompt', status: 'active', enabled: true }),
    ];
    const inventory = buildPromptInventory(prompts);
    const row = inventory.find(r => r.promptId === 'route_prompt');
    expect(row?.effectiveStatus).toBe('active_runtime');
    expect(row?.runtimeConsumer).toBeDefined();
    expect(row?.required).toBe(true);
  });

  it('archived ghost prompts show correct effectiveStatus in inventory', () => {
    const prompts = [
      makePrompt({ id: 'core.system', status: 'active', enabled: true }),
    ];
    const inventory = buildPromptInventory(prompts);
    const row = inventory.find(r => r.promptId === 'core.system');
    expect(row?.effectiveStatus).toBe('archived_ghost');
    expect(row?.issue).toBeDefined();
  });

  it('hardcoded_to_managed prompts show correct effectiveStatus in inventory', () => {
    const prompts = [
      makePrompt({ id: 'report_continuation.classifier', status: 'active', enabled: true }),
    ];
    const inventory = buildPromptInventory(prompts);
    const row = inventory.find(r => r.promptId === 'report_continuation.classifier');
    expect(row?.effectiveStatus).toBe('hardcoded_to_managed');
    expect(row?.runtimeConsumer).toContain('reportContinuation');
    expect(row?.required).toBe(true);
  });

  it('draft prompts show planned_draft effectiveStatus', () => {
    const prompts = [
      makePrompt({ id: 'some-future-prompt', status: 'draft', enabled: false }),
    ];
    const inventory = buildPromptInventory(prompts);
    const row = inventory.find(r => r.promptId === 'some-future-prompt');
    expect(row?.effectiveStatus).toBe('planned_draft');
  });

  it('disabled prompts are not flagged as errors', () => {
    const prompts = [
      makePrompt({ id: 'core.system', status: 'archived', enabled: false }),
    ];
    const inventory = buildPromptInventory(prompts);
    const row = inventory.find(r => r.promptId === 'core.system');
    expect(row?.enabled).toBe(false);
    // archived + disabled ghost should not produce an issue
    expect(row?.issue).toBeUndefined();
  });

  it('ghost map deprecatedBy targets exist as consumers', () => {
    for (const [ghostId, info] of Object.entries(GHOST_TO_RUNTIME_MAP)) {
      const consumer = getRuntimeConsumer(info.deprecatedBy);
      expect(consumer, `deprecatedBy target "${info.deprecatedBy}" for ghost "${ghostId}" must exist`).toBeDefined();
    }
  });

  it('no required prompt is a ghost', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    for (const ghostId of Object.keys(GHOST_TO_RUNTIME_MAP)) {
      expect(requiredIds.has(ghostId)).toBe(false);
    }
  });
});
