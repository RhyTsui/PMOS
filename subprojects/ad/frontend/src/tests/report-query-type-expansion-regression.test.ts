import { describe, expect, it } from 'vitest';
import { inferRequestedQuestionTypes } from '../src/lib/report-query-orchestrator';
import type { SemanticResultContract } from '../src/contracts/semantic/semantic-result-contract';

/**
 * 回归测试：类型扩展正交性 + 表格列去重
 *
 * 背景：
 * - inferRequestedQuestionTypes 曾为 ROI 查询额外添加 'daily' 扩展，
 *   导致系统多选了一个不该调用的账户报表工具。
 * - semanticResultToVizSpec 在 data.dimensions 包含 'date' 时，
 *   ['date', ...dimensions] 产生重复 date 列。
 *
 * 原则：
 * - 类型扩展只添加与 primary 正交的补充需求，不添加通用域。
 * - 表格列构建不产生重复键。
 * - 测试使用通用数据结构，不含固定输入样例。
 */

// ─── Type Expansion Orthogonality ───────────────────────

describe('inferRequestedQuestionTypes orthogonality', () => {
  it('does not add daily as an expansion type for roi-primary queries', () => {
    const expanded = inferRequestedQuestionTypes('近七天首日ROI趋势', 'roi');
    expect(expanded).not.toContain('daily');
  });

  it('does not add daily as an expansion type for retention-primary queries', () => {
    const expanded = inferRequestedQuestionTypes('近7日留存和消耗趋势', 'retention');
    expect(expanded).not.toContain('daily');
  });

  it('still adds orthogonal types (retention, hour) when their keywords match', () => {
    const withRetention = inferRequestedQuestionTypes('近7日ROI和次日留存', 'roi');
    expect(withRetention).toContain('retention');

    const withHour = inferRequestedQuestionTypes('今天每小时的消耗', 'daily');
    expect(withHour).toContain('hour');
  });

  it('returns only primary when no supplementary keywords match', () => {
    const expanded = inferRequestedQuestionTypes('昨天的数据', 'daily');
    expect(expanded).toEqual(['daily']);
  });

  it('does not produce duplicate types in the output', () => {
    const expanded = inferRequestedQuestionTypes('ROI趋势和留存', 'roi');
    const unique = new Set(expanded);
    expect(unique.size).toBe(expanded.length);
  });
});

// ─── Table Column Dedup ─────────────────────────────────

describe('semanticResultToVizSpec table column dedup', () => {
  it('does not produce duplicate date column when dimensions already contain date', async () => {
    const { semanticResultToVizSpec } = await import('../src/lib/report-result-visualization');

    const semanticResult: SemanticResultContract = {
      contractType: 'semantic-result',
      version: '1.0.0',
      resultId: 'test-dedup',
      screenType: 'report-result',
      title: 'test',
      createdAt: new Date().toISOString(),
      producer: { kind: 'backend', name: 'test' },
      regions: [{
        id: 'test-region',
        type: 'data-view',
        componentBinding: 'data-visualization',
        title: 'test',
        state: 'degraded',
        data: {
          viewType: 'table',
          requestedView: 'table',
          chartType: 'table',
          dimensions: ['date'],
          dataset: [
            { date: '2026-06-16', roi: 1.5 },
            { date: '2026-06-17', roi: 2.1 },
          ],
        },
      }],
    };

    const viz = semanticResultToVizSpec(semanticResult);
    expect(viz).not.toBeNull();
    expect(viz!.kind).toBe('table');
    if (viz!.kind === 'table') {
      const dateCount = viz!.columns.filter(c => c === 'date').length;
      expect(dateCount).toBe(1);
      expect(viz!.columns).toContain('roi');
    }
  });

  it('handles dimensions without date correctly', async () => {
    const { semanticResultToVizSpec } = await import('../src/lib/report-result-visualization');

    const semanticResult: SemanticResultContract = {
      contractType: 'semantic-result',
      version: '1.0.0',
      resultId: 'test-no-date',
      screenType: 'report-result',
      title: 'test',
      createdAt: new Date().toISOString(),
      producer: { kind: 'backend', name: 'test' },
      regions: [{
        id: 'test-region',
        type: 'data-view',
        componentBinding: 'data-visualization',
        title: 'test',
        state: 'degraded',
        data: {
          viewType: 'table',
          requestedView: 'table',
          chartType: 'table',
          dimensions: ['media'],
          dataset: [
            { date: '2026-06-16', media: '巨量', cost: 100 },
            { date: '2026-06-17', media: '腾讯', cost: 200 },
          ],
        },
      }],
    };

    const viz = semanticResultToVizSpec(semanticResult);
    expect(viz).not.toBeNull();
    if (viz!.kind === 'table') {
      expect(viz!.columns).toContain('date');
      expect(viz!.columns).toContain('media');
      const dateCount = viz!.columns.filter(c => c === 'date').length;
      expect(dateCount).toBe(1);
    }
  });

  it('falls back to dataset keys when dimensions is empty', async () => {
    const { semanticResultToVizSpec } = await import('../src/lib/report-result-visualization');

    const semanticResult: SemanticResultContract = {
      contractType: 'semantic-result',
      version: '1.0.0',
      resultId: 'test-fallback',
      screenType: 'report-result',
      title: 'test',
      createdAt: new Date().toISOString(),
      producer: { kind: 'backend', name: 'test' },
      regions: [{
        id: 'test-region',
        type: 'data-view',
        componentBinding: 'data-visualization',
        title: 'test',
        state: 'degraded',
        data: {
          viewType: 'table',
          requestedView: 'table',
          chartType: 'table',
          dimensions: [],
          dataset: [
            { date: '2026-06-16', cost: 100, roi: 1.5 },
          ],
        },
      }],
    };

    const viz = semanticResultToVizSpec(semanticResult);
    expect(viz).not.toBeNull();
    if (viz!.kind === 'table') {
      expect(viz!.columns).toContain('date');
      expect(viz!.columns).toContain('cost');
      expect(viz!.columns).toContain('roi');
    }
  });
});
