import { describe, expect, it } from 'vitest';
import { compactReportResult, compactSemanticResult } from '../src/lib/semantic-result-compaction';
import { validateSemanticResultContract } from '../src/contracts/validation/semantic-result-validator';

function buildTrendSemanticResult(rowCount = 200) {
  const dataset = Array.from({ length: rowCount }, (_, index) => {
    const day = String((index % 28) + 1).padStart(2, '0');
    const date = `2026-05-${day}`;
    return {
      date,
      media: `media-${index % 5}`,
      activation: index + 1,
      ltv_td14_amount: (index + 1) * 2,
      click_start_total_pay_amount: (index + 1) * 3,
      parent_attr_campaign_id: `campaign-${index % 9}`,
      click_pay_td4_amount: (index + 1) * 4,
    };
  });

  return {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: 'report-trend-large',
    screenType: 'report-result',
    title: 'Trend Result',
    createdAt: '2026-06-02T00:00:00.000Z',
    producer: { kind: 'backend' as const, name: 'report-query-service', version: '1.0.0' },
    regions: [
      {
        id: 'trend-data-view',
        type: 'data-view' as const,
        componentBinding: 'data-visualization' as const,
        title: 'Trend Result',
        state: 'ready' as const,
        sourceRefs: ['src-report-001'],
        evidenceRefs: ['ev-report-001'],
        data: {
          viewType: 'trend',
          requestedView: 'trend',
          chartType: 'dual-axis-line',
          dateRange: {
            start: '2026-05-04',
            end: '2026-06-02',
            timezone: 'Asia/Shanghai',
          },
          granularity: 'day',
          dataCoverage: {
            status: 'complete',
            availablePoints: rowCount,
            requiredPoints: 2,
          },
          metricName: 'activation',
          dimensions: ['date', 'media'],
          dataset,
          series: [
            {
              name: 'activation',
              metricKey: 'activation',
              displayName: 'activation',
              formatter: 'number-2',
              yAxisId: 'left' as const,
              points: dataset.map((point) => ({
                date: point.date,
                value: point.activation,
                series: 'activation',
              })),
            },
          ],
        },
      },
    ],
    evidenceRefs: [
      {
        id: 'ev-report-001',
        type: 'query-result' as const,
        title: 'Report query result',
        summary: 'Report query result generated',
        sourceRefIds: ['src-report-001'],
      },
    ],
    sourceRefs: [
      {
        id: 'src-report-001',
        type: 'report' as const,
        title: 'report-query-service',
        retrievedAt: '2026-06-02T00:00:00.000Z',
      },
    ],
  };
}

describe('semantic-result compaction', () => {
  it('preserves trend visualization data while compacting raw report result', () => {
    const semanticResult = buildTrendSemanticResult(200);
    const reportResult = {
      status: 'success',
      rows: Array.from({ length: 200 }, (_, index) => ({
        date: `2026-05-${String((index % 28) + 1).padStart(2, '0')}`,
        activation: index + 1,
        media: `media-${index % 5}`,
      })),
      columns: ['date', 'media', 'activation'],
      semantic_result: semanticResult,
    };

    const compacted = compactReportResult(reportResult);

    expect(compacted).not.toBeNull();
    expect(Array.isArray(compacted?.rows)).toBe(true);
    expect((compacted?.rows as Array<unknown>).length).toBe(30);

    const compactedSemantic = compacted?.semantic_result as Record<string, unknown> | null;
    expect(compactedSemantic).toBeTruthy();
    const regions = Array.isArray(compactedSemantic?.regions) ? (compactedSemantic.regions as Array<Record<string, unknown>>) : [];
    const region = regions[0];
    const regionData = region?.data as { dataset?: unknown[] } | undefined;
    expect(region?.componentBinding).toBe('data-visualization');
    expect(Array.isArray(regionData?.dataset)).toBe(true);
    expect(regionData?.dataset).toHaveLength(200);
    expect(validateSemanticResultContract(compactedSemantic).valid).toBe(true);
  });

  it('keeps standalone semantic result renderable', () => {
    const compacted = compactSemanticResult(buildTrendSemanticResult(200));
    expect(compacted).not.toBeNull();
    expect(validateSemanticResultContract(compacted).valid).toBe(true);
    const regions = Array.isArray(compacted?.regions) ? (compacted.regions as Array<Record<string, unknown>>) : [];
    const regionData = regions[0]?.data as { series?: Array<{ points?: unknown[] }> } | undefined;
    expect(regionData?.series?.[0]?.points).toHaveLength(200);
  });

  it('preserves requested detail metric and dimensions while truncating wide rows', () => {
    const wideRow = {
      ...Object.fromEntries(Array.from({ length: 330 }, (_, index) => [`extra_${index}`, index])),
      dt: '2026-06-05',
      media_id: '巨量广告',
      cost_amount: 3338.59,
    };
    const compacted = compactReportResult({
      status: 'success',
      requested_view: 'detail',
      rows: [wideRow],
      columns: Object.keys(wideRow),
      metrics: ['cost'],
      dimensions: ['date', 'media'],
      display_fields: [
        { key: 'dt', displayName: '日期', role: 'dimension' },
        { key: 'media_id', displayName: '媒体', role: 'dimension' },
        { key: 'cost_amount', displayName: '消耗', role: 'metric', formatter: 'currency-2', unit: '元' },
      ],
    });

    const compactedRows = compacted?.rows as Array<Record<string, unknown>>;
    expect(compactedRows[0].dt).toBe('2026-06-05');
    expect(compactedRows[0].media_id).toBe('巨量广告');
    expect(compactedRows[0].cost_amount).toBe(3338.59);
    expect(compactedRows[0].__truncated_keys).toBeGreaterThan(0);
  });
});
