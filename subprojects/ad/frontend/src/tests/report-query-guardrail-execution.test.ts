import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpServerConfig, McpToolConfig } from '../src/types';
import { executeReportQueryStep } from '../src/lib/report-query-orchestrator';

const callMcpTool = vi.fn();

vi.mock('@/lib/mcp-discovery', () => ({
  callMcpTool: (...args: unknown[]) => callMcpTool(...args),
}));

function reportTool(name = 'get_zt_ad_roi_report'): McpToolConfig {
  return {
    tool_id: name,
    name,
    description: 'ROI report with media and time filters',
    input_schema: {
      type: 'object',
      required: ['appId'],
      properties: {
        appId: { type: 'string' },
      },
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}

function reportServer(): McpServerConfig {
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
    tools: [reportTool()],
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

beforeEach(() => {
  callMcpTool.mockReset();
});

describe('report query guardrail execution', () => {
  it('marks security-blocked MCP failure as business_failed and keeps execution contract', async () => {
    callMcpTool.mockResolvedValueOnce({
      ok: false,
      msg: 'HTTP 403: permission denied',
      latency_ms: 10,
      security_blocked: true,
      policy_blocked: false,
      execution_contract: {
        request_id: 'req-403',
        requires_execution: true,
        execution_confidence: 'high',
        route_intent: 'report_query',
        route_reason: 'security_guardrail',
        expected_capability_id: 'mcp_zt_report:get_zt_ad_roi_report',
        expected_tool_name: 'get_zt_ad_roi_report',
      },
      blocking_reason: 'signature_invalid',
    });

    const result = await executeReportQueryStep({
      servers: [reportServer()],
      message: '近7天ROI趋势',
      baseInput: { appId: '100001' },
    });

    const businessStep = result.tool_chain.find(item => item.key === 'business_report');
    const businessStepResult = businessStep?.result as Record<string, unknown> | undefined;
    const callResult = result.call_result;

    expect(result.status).toBe('business_failed');
    expect(callResult?.status).toBe('business_failed');
    expect(callResult?.security_blocked).toBe(true);
    expect(callResult?.policy_blocked).toBe(false);
    expect(callResult?.canRetryWithSameTool).toBe(false);
    expect(callResult?.error_code).toBe('permission_or_scope');
    expect(callResult?.retry).toBe(false);
    expect(callResult?.execution_contract).toMatchObject({ request_id: 'req-403' });
    expect(callResult?.blocking_reason).toBe('signature_invalid');
    expect(result.tool_execution_status).toBe('business_failed');
    expect((businessStepResult?.execution_contract as Record<string, unknown>)?.request_id).toBe('req-403');
    expect((businessStepResult?.security_blocked as boolean)).toBe(true);
  });

  it('keeps policy_blocked MCP failure as failed execution with explicit retry=false', async () => {
    callMcpTool.mockResolvedValueOnce({
      ok: false,
      msg: 'tool get_zt_ad_roi_report is blocked by policy',
      latency_ms: 8,
      security_blocked: false,
      policy_blocked: true,
      retry: false,
      blocking_reason: 'tool_policy_denied',
      execution_contract: {
        request_id: 'req-policy',
        requires_execution: true,
        execution_confidence: 'high',
        route_intent: 'report_query',
        route_reason: 'policy_guardrail',
        expected_capability_id: 'mcp_zt_report:get_zt_ad_roi_report',
        expected_tool_name: 'get_zt_ad_roi_report',
      },
    });

    const result = await executeReportQueryStep({
      servers: [reportServer()],
      message: '近7天ROI趋势',
      baseInput: { appId: '100001' },
    });

    const businessStep = result.tool_chain.find(item => item.key === 'business_report');
    const businessStepResult = businessStep?.result as Record<string, unknown> | undefined;
    const callResult = result.call_result;

    expect(result.status).toBe('failed');
    expect(callResult?.status).toBe('failed');
    expect(callResult?.policy_blocked).toBe(true);
    expect(callResult?.security_blocked).toBe(false);
    expect(callResult?.canRetryWithSameTool).toBeUndefined();
    expect(callResult?.retry).toBe(false);
    expect(result.tool_execution_status).toBe('called_failed');
    expect(callResult?.execution_contract).toMatchObject({ request_id: 'req-policy' });
    expect(callResult?.blocking_reason).toBe('tool_policy_denied');
    expect((businessStepResult?.policy_blocked as boolean)).toBe(true);
    expect((businessStepResult?.retry as boolean | undefined)).toBe(false);
  });
});
