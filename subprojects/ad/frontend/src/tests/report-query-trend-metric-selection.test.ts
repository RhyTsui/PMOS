import { describe, expect, it } from 'vitest';
import { selectTrendMetricColumns } from '../src/lib/trend-metric-selection';

describe('trend metric selection', () => {
  it('keeps only the user-requested metric when MCP returns many numeric columns', () => {
    const columns = [
      'date',
      'media',
      'activation',
      'ltv_td14_amount',
      'click_start_total_pay_amount',
      'parent_attr_campaign_id',
      'click_pay_td4_amount',
    ];
    const rows = [
      {
        date: '2026-05-04',
        media: 'bilibili',
        activation: 12,
        ltv_td14_amount: 24,
        click_start_total_pay_amount: 36,
        parent_attr_campaign_id: 'campaign-1',
        click_pay_td4_amount: 48,
      },
    ];

    expect(selectTrendMetricColumns({
      metrics: ['activation'],
      columns,
      rows,
    })).toEqual(['activation']);
  });

  it('falls back to a single numeric column when the user metric is not found', () => {
    const columns = ['date', 'media', 'activation'];
    const rows = [{ date: '2026-05-04', media: 'bilibili', activation: 12 }];

    expect(selectTrendMetricColumns({
      metrics: ['non_existing_metric'],
      columns,
      rows,
    })).toEqual(['activation']);
  });
});
