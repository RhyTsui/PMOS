import { describe, expect, it } from 'vitest';
import reportTrend from '../examples/golden/semantic-result.report-trend.json';
import insufficientTrend from '../examples/golden/semantic-result.insufficient-trend.json';
import runtimeToolCall from '../examples/golden/runtime-display.tool-call.json';
import sankey from '../examples/golden/data-visualization.sankey.json';
import trustInsight from '../examples/golden/ai-trust.insight-with-evidence.json';
import { validateSemanticResultContract } from '../validation/semantic-result-validator';
import { validateRuntimeDisplayProtocol } from '../validation/runtime-display-validator';
import { validateReportTrendData } from '../validation/report-trend-validator';
import { validateRendererData } from '../validation/renderer-data-validator';

function firstRegion(contract: any) {
  return contract.regions[0];
}

describe('AI Chat OS contract golden examples', () => {
  it('validates report trend semantic result', () => {
    const result = validateSemanticResultContract(reportTrend);
    expect(result.valid).toBe(true);
    const region = firstRegion(reportTrend);
    expect(validateReportTrendData(region.data, region).valid).toBe(true);
  });

  it('keeps insufficient trend degraded instead of drawing a trend chart', () => {
    const result = validateSemanticResultContract(insufficientTrend);
    expect(result.valid).toBe(true);
    const region = firstRegion(insufficientTrend);
    const trendValidation = validateReportTrendData(region.data, region);
    expect(region.state).toBe('degraded');
    expect(region.data.chartType).not.toBe('line');
    expect(trendValidation.warnings.some((issue) => issue.code === 'trend_requires_at_least_two_date_points')).toBe(true);
  });

  it('treats insufficient trend data as degraded even when state is not explicit', () => {
    const degradedFallback = JSON.parse(JSON.stringify(insufficientTrend));
    delete degradedFallback.regions[0].state;
    const result = validateSemanticResultContract(degradedFallback);
    expect(result.valid).toBe(true);
    const region = firstRegion(degradedFallback);
    const trendValidation = validateReportTrendData(region.data, region);
    expect(trendValidation.errors.length).toBe(0);
    expect(trendValidation.warnings.some((issue) => issue.code === 'trend_requires_at_least_two_date_points')).toBe(true);
  });

  it('does not force generic line charts through trend validation', () => {
    const result = validateRendererData('data-visualization', {
      chartType: 'line',
      dataset: [
        { date: '2026-05-28', value: 980 },
      ],
      chartSpec: {
        chartType: 'line',
        xField: 'date',
        series: [{
          metricKey: 'value',
          displayName: 'value',
          points: [
            { date: '2026-05-28', value: 980 },
          ],
        }],
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates runtime display protocol with tool calls', () => {
    const result = validateRuntimeDisplayProtocol(runtimeToolCall);
    expect(result.valid).toBe(true);
  });

  it('validates sankey semantic result', () => {
    const result = validateSemanticResultContract(sankey);
    expect(result.valid).toBe(true);
  });

  it('requires AI trust insight to include evidence and source', () => {
    const result = validateSemanticResultContract(trustInsight);
    expect(result.valid).toBe(true);
    const region = firstRegion(trustInsight);
    expect(region.evidenceRefs.length).toBeGreaterThan(0);
    expect(region.sourceRefs.length).toBeGreaterThan(0);
  });
});
