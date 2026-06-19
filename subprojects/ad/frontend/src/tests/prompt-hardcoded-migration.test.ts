import { describe, expect, it } from 'vitest';
import { MANAGED_RUNTIME_PROMPT_SEEDS } from '../src/lib/managed-prompt-seeds';
import { getRuntimeConsumer } from '../src/lib/prompt-runtime-consumer-registry';

const HARDCODED_TO_MANAGED_IDS = [
  'report_continuation.classifier',
  'public_web.need_classifier',
  'public_web.query_rewriter',
  'search.evidence_summary',
  'planner_shadow.plan',
];

describe('Hardcoded Prompt Migration', () => {
  it('all hardcoded_to_managed seeds exist in MANAGED_RUNTIME_PROMPT_SEEDS', () => {
    const seedIds = new Set(MANAGED_RUNTIME_PROMPT_SEEDS.map(s => s.config.id));
    for (const id of HARDCODED_TO_MANAGED_IDS) {
      expect(seedIds.has(id), `seed "${id}" should exist in MANAGED_RUNTIME_PROMPT_SEEDS`).toBe(true);
    }
  });

  it('all hardcoded_to_managed seeds have non-empty content', () => {
    for (const id of HARDCODED_TO_MANAGED_IDS) {
      const seed = MANAGED_RUNTIME_PROMPT_SEEDS.find(s => s.config.id === id);
      expect(seed, `seed "${id}" should exist`).toBeDefined();
      expect(seed!.content.length, `seed "${id}" content should not be empty`).toBeGreaterThan(0);
    }
  });

  it('all hardcoded_to_managed seeds have status=active and enabled=true', () => {
    for (const id of HARDCODED_TO_MANAGED_IDS) {
      const seed = MANAGED_RUNTIME_PROMPT_SEEDS.find(s => s.config.id === id);
      expect(seed).toBeDefined();
      expect(seed!.config.status).toBe('active');
      expect(seed!.config.enabled).toBe(true);
    }
  });

  it('all hardcoded_to_managed seeds have runtime consumer entries', () => {
    for (const id of HARDCODED_TO_MANAGED_IDS) {
      const consumer = getRuntimeConsumer(id);
      expect(consumer, `consumer for "${id}" should exist`).toBeDefined();
      expect(consumer?.category).toBe('hardcoded_to_managed');
    }
  });

  it('all hardcoded_to_managed seeds have seed_revision set', () => {
    for (const id of HARDCODED_TO_MANAGED_IDS) {
      const seed = MANAGED_RUNTIME_PROMPT_SEEDS.find(s => s.config.id === id);
      expect(seed).toBeDefined();
      expect(seed!.seed_revision, `seed "${id}" should have seed_revision`).toBeTruthy();
    }
  });

  it('seed content is valid UTF-8 (no replacement characters)', () => {
    const replacementChar = String.fromCharCode(0xfffd);
    for (const id of HARDCODED_TO_MANAGED_IDS) {
      const seed = MANAGED_RUNTIME_PROMPT_SEEDS.find(s => s.config.id === id);
      expect(seed).toBeDefined();
      expect(seed!.content.includes(replacementChar), `seed "${id}" should not contain U+FFFD`).toBe(false);
    }
  });
});
