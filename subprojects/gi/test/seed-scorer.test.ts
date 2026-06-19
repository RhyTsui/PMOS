/**
 * Seed 评分器单元测试
 */
import { describe, it, expect } from 'vitest';
import { SeedScorer } from '../src/services/seed/seed-scorer.js';
import type { EntitySeed, CollectionResult } from '../src/services/seed/index.js';

describe('SeedScorer', () => {
  const scorer = new SeedScorer();

  const mockSeed: EntitySeed = {
    id: 'test-1',
    seedType: 'entity',
    entityType: 'company',
    text: '米哈游',
    aliases: ['HoYoverse'],
    score: 60,
    status: 'active',
    discoveryCount: 10,
    failCount: 0,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  it('高产出应该提分', () => {
    const result: CollectionResult = {
      newEvidenceCount: 10,
      avgImpactScore: 80,
      noveltyRate: 0.8,
      requestCount: 5,
    };

    const newScore = scorer.calculateScore(mockSeed, result);
    expect(newScore).toBeGreaterThan(mockSeed.score);
  });

  it('零产出应该降分', () => {
    const result: CollectionResult = {
      newEvidenceCount: 0,
      avgImpactScore: 0,
      noveltyRate: 0,
      requestCount: 5,
    };

    const newScore = scorer.calculateScore(mockSeed, result);
    expect(newScore).toBeLessThan(mockSeed.score);
  });

  it('高质量证据应该提更多分', () => {
    const highQuality: CollectionResult = {
      newEvidenceCount: 5,
      avgImpactScore: 90,
      noveltyRate: 0.6,
      requestCount: 3,
    };

    const lowQuality: CollectionResult = {
      newEvidenceCount: 5,
      avgImpactScore: 20,
      noveltyRate: 0.6,
      requestCount: 3,
    };

    const highScore = scorer.calculateScore(mockSeed, highQuality);
    const lowScore = scorer.calculateScore(mockSeed, lowQuality);
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('评分应该在 0-100 范围内', () => {
    const extremeResult: CollectionResult = {
      newEvidenceCount: 100,
      avgImpactScore: 100,
      noveltyRate: 1.0,
      requestCount: 1,
    };

    const score = scorer.calculateScore(mockSeed, extremeResult);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
