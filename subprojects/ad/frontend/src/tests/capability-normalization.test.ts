import { describe, expect, it } from 'vitest';
import { normalizeMcpToolToCapability } from '../src/contracts/mcp/tool-capability-normalization';
import type { McpServerConfig, McpToolConfig } from '../src/types';

function server(tool: McpToolConfig): McpServerConfig {
  return {
    id: 'mcp_zt_report',
    name: 'ZT Report',
    description: 'advertising report server',
    category: 'data',
    endpoint_url: 'https://report.example.local/mcp',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: {},
    status: 'connected',
    enabled: true,
    business_domains: ['advertising'],
    bound_agents: ['ad-assistant'],
    tags: ['report'],
    tools: [tool],
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function reportTool(name: string, description: string, properties: Record<string, unknown>): McpToolConfig {
  return {
    tool_id: name,
    name,
    description,
    input_schema: {
      type: 'object',
      required: ['appId', 'startDate', 'endDate', 'timeType'],
      properties,
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}

describe('report capability semantic normalization', () => {
  it('normalizes date range inputs, day granularity, date output and filters for day reports', () => {
    const tool = reportTool('get_zt_ad_day_report', 'daily ad day report with cost and activation data', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string', enum: ['DAY', 'WEEK', 'MONTH'] },
      mediaId: { type: 'array', items: { type: 'string' } },
      appPackageType: { type: 'array', items: { type: 'string' } },
      cost_amount: { type: 'number', description: 'cost amount' },
    });
    const capability = normalizeMcpToolToCapability(server(tool), tool);
    const surface = capability.semanticSurface;

    expect(surface?.timeRangeInputs).toEqual(expect.arrayContaining(['startDate', 'endDate']));
    expect(surface?.supportedGranularities.map(item => item.key)).toContain('day');
    expect(surface?.supportedOutputDimensions.map(item => item.key)).toContain('date');
    expect(surface?.supportedFilterDimensions.map(item => item.key)).toEqual(expect.arrayContaining(['media', 'app_package_type']));
    expect(surface?.supportedMetrics.find(item => item.key === 'cost')?.supportLevel).toBe('supported');
    expect(capability.supports.metrics).toContain('cost');
    expect(capability.supports.metrics).not.toEqual(expect.arrayContaining(['roi', 'register', 'payment', 'arppu']));
  });

  it('tracks d1 roi as a metric variant instead of broad M_ALL support', () => {
    const tool = reportTool('get_zt_ad_roi_report', 'ROI report supports first day ROI and cost trend', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string', enum: ['DAY'] },
      mediaId: { type: 'string' },
      appPackageType: { type: 'string' },
      dataType: { type: 'string', enum: ['D1', 'D7'] },
      first_day_roi: { type: 'number' },
      cost_amount: { type: 'number' },
    });
    const capability = normalizeMcpToolToCapability(server(tool), tool);
    const d1Roi = capability.semanticSurface?.supportedMetrics.find(item => item.key === 'd1_roi');

    expect(d1Roi?.supportLevel).toBe('supported');
    expect(d1Roi?.variant).toBe('d1');
    expect(capability.supports.metrics).toEqual(expect.arrayContaining(['d1_roi', 'cost']));
    expect(capability.supports.granularity).toContain('day');
  });
});
