import { describe, expect, it } from 'vitest';
import { normalizeMcpBusinessError } from '../src/lib/mcp-tool-output-adapter';

describe('MCP business error normalization', () => {
  it('treats transport-success payload business failure flags as business_failed', () => {
    const normalized = normalizeMcpBusinessError({
      jsonrpc: '2.0',
      result: {
        success: false,
        status: 'business_failed',
        message: 'Project is not supported by this report tool.',
        data: [],
      },
    });

    expect(normalized?.business_status).toBe('failed');
    expect(normalized?.tool_execution_status).toBe('business_failed');
    expect(normalized?.business_outcome).toBe('capability_not_available');
    expect(normalized?.canRetryWithSameTool).toBe(false);
  });

  it('does not mark code 0 tool output as business failure', () => {
    const normalized = normalizeMcpBusinessError({
      code: 0,
      message: 'success',
      rows: [{ cost: 1 }],
    });

    expect(normalized).toBeUndefined();
  });

  it('treats content text code 400 invalid promotionSource as invalid argument business failure', () => {
    const normalized = normalizeMcpBusinessError({
      jsonrpc: '2.0',
      isError: false,
      content: [{
        type: 'text',
        text: "code=400 字段 promotionSource 的值 '10001' 无效，允许的值为: [AD, ORGANIC,AD]",
      }],
    });

    expect(normalized?.business_status).toBe('failed');
    expect(normalized?.error_code).toBe('business_failed_invalid_argument');
    expect(normalized?.business_outcome).toBe('execution_failed');
    expect(normalized?.canRetryWithSameTool).toBe(false);
    expect(normalized?.suggestedAction).toBe('fix_argument_mapping');
    expect(normalized?.internalReason).toContain('promotionSource');
  });

  it('does not treat successful report text with 4xx metric values as business failure', () => {
    const normalized = normalizeMcpBusinessError({
      jsonrpc: '2.0',
      isError: false,
      content: [{
        type: 'text',
        text: JSON.stringify({
          code: 200,
          msg: 'OK',
          data: {
            tableContent: [{
              dt: '2026-06-05',
              media_id: '巨量广告',
              composite_reg_cnt: 445,
              rebate_cost_amount: 45669.28,
            }],
          },
        }),
      }],
    });

    expect(normalized).toBeUndefined();
  });

  it('normalizes policy_blocked MCP payload as permission_or_scope', () => {
    const normalized = normalizeMcpBusinessError({
      policy_blocked: true,
      security_blocked: false,
      blocking_reason: 'tool_policy_denied',
      error: 'tool is blocked by policy',
    });

    expect(normalized?.business_status).toBe('failed');
    expect(normalized?.error_code).toBe('permission_or_scope');
    expect(normalized?.business_outcome).toBe('execution_failed');
    expect(normalized?.canRetryWithSameTool).toBe(false);
    expect(normalized?.suggestedAction).toBe('check_permission_or_scope');
    expect(normalized?.internalReason).toBe('policy_blocked');
  });

  it('normalizes security_blocked MCP payload as permission_or_scope', () => {
    const normalized = normalizeMcpBusinessError({
      policy_blocked: false,
      security_blocked: true,
      blocking_reason: 'signature invalid',
      msg: 'tool call blocked by security policy',
    });

    expect(normalized?.business_status).toBe('failed');
    expect(normalized?.error_code).toBe('permission_or_scope');
    expect(normalized?.business_outcome).toBe('execution_failed');
    expect(normalized?.canRetryWithSameTool).toBe(false);
    expect(normalized?.suggestedAction).toBe('check_permission_or_scope');
    expect(normalized?.internalReason).toBe('security_blocked');
  });
});
