import { describe, expect, it } from 'vitest';
import {
  getAllRequiredPromptIds,
  getRuntimeConsumer,
  GHOST_TO_RUNTIME_MAP,
} from '../src/lib/prompt-runtime-consumer-registry';

describe('Prompt Health Check', () => {
  it('all required prompt IDs have a runtime consumer in the registry', () => {
    const requiredIds = getAllRequiredPromptIds();
    for (const id of requiredIds) {
      const consumer = getRuntimeConsumer(id);
      expect(consumer, `health check: required "${id}" must have consumer`).toBeDefined();
      expect(consumer?.consumerFile, `consumer file for "${id}"`).toBeTruthy();
      expect(consumer?.useCase, `useCase for "${id}"`).toBeTruthy();
    }
  });

  it('ghost prompts are NOT in the required list', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    const ghostIds = Object.keys(GHOST_TO_RUNTIME_MAP);
    for (const ghostId of ghostIds) {
      expect(requiredIds.has(ghostId), `ghost "${ghostId}" must NOT be in required list`).toBe(false);
    }
  });

  it('every ghost has a valid deprecatedBy target', () => {
    for (const [ghostId, info] of Object.entries(GHOST_TO_RUNTIME_MAP)) {
      expect(info.deprecatedBy, `ghost "${ghostId}" must have deprecatedBy`).toBeTruthy();
      expect(info.archiveReason, `ghost "${ghostId}" must have archiveReason`).toBeTruthy();
      const consumer = getRuntimeConsumer(info.deprecatedBy);
      expect(consumer, `deprecatedBy "${info.deprecatedBy}" for "${ghostId}" must exist`).toBeDefined();
    }
  });

  it('required prompts count is reasonable (not zero, not too many)', () => {
    const requiredIds = getAllRequiredPromptIds();
    expect(requiredIds.length).toBeGreaterThanOrEqual(20);
    expect(requiredIds.length).toBeLessThanOrEqual(50);
  });

  it('required list includes main chat route prompts', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    expect(requiredIds.has('route_prompt')).toBe(true);
    expect(requiredIds.has('response_prompt')).toBe(true);
    expect(requiredIds.has('card_prompt')).toBe(true);
    expect(requiredIds.has('evidence_prompt')).toBe(true);
  });

  it('required list includes hardcoded_to_managed prompts', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    expect(requiredIds.has('report_continuation.classifier')).toBe(true);
    expect(requiredIds.has('public_web.need_classifier')).toBe(true);
    expect(requiredIds.has('public_web.query_rewriter')).toBe(true);
    expect(requiredIds.has('search.evidence_summary')).toBe(true);
    expect(requiredIds.has('planner_shadow.plan')).toBe(true);
  });

  it('required list does NOT include old PRODUCTION_PROMPT_SEEDS IDs (except P1-#1 activated business-flow)', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    const productionIds = [
      'core.system', 'core.visibility_policy', 'core.output_contract',
      'route.intent', 'route.report_query', 'route.debugging_guard',
      'chat.answer', 'chat.actions', 'chat.degrade', 'chat.card', 'chat.evidence',
      'report_query.policy', 'report_query.orchestrator', 'report_query.answer',
      'report_query.visual', 'report_query.actions', 'report_query.evidence',
      'report_query.degrade',
      // P1-#1: help/diagnosis/demand/debugging/delivery.answer 已激活为 active_runtime，不再属于 ghost
      'clarification.question',
    ];
    for (const id of productionIds) {
      expect(requiredIds.has(id), `production ID "${id}" should NOT be required`).toBe(false);
    }
  });

  it('P1-#1: activated business-flow domain prompts ARE in required list', () => {
    const requiredIds = new Set(getAllRequiredPromptIds());
    expect(requiredIds.has('help.answer')).toBe(true);
    expect(requiredIds.has('diagnosis.answer')).toBe(true);
    expect(requiredIds.has('demand.answer')).toBe(true);
    expect(requiredIds.has('debugging.answer')).toBe(true);
    expect(requiredIds.has('delivery.answer')).toBe(true);
  });
});
