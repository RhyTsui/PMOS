import { describe, expect, it } from 'vitest';
import type { CapabilityStatusResult, LookupZhitouConfigCapabilityInput } from '../src/lib/demand-capability-status';
import { resolveDemandCapabilityStatus } from '../src/lib/demand-capability-status';
import { deriveServiceIntakeType } from '../src/lib/demand-intake-structurer';

function lookup(status: CapabilityStatusResult['status']) {
  return async (input: LookupZhitouConfigCapabilityInput): Promise<CapabilityStatusResult> => ({
    status,
    requestMode: status === 'integrated' ? 'usage_help' : status === 'not_integrated' ? 'collect_inputs' : 'unknown',
    source: 'zhitou_config_report',
    media: String(input.media || ''),
    appType: String(input.appType || ''),
    matchedConfig: status === 'integrated' ? { media: input.media, appType: input.appType } : undefined,
    reason: status === 'integrated' ? 'matched zhitou config' : 'no zhitou config',
    nextAction: status === 'integrated' ? 'usage_help' : 'collect_inputs',
  });
}

describe('demand capability status resolver', () => {
  it('routes integrated media and appType usage questions to usage help', async () => {
    const result = await resolveDemandCapabilityStatus({
      media: '巨量',
      appType: 'android',
      serviceType: 'monitoring_callback',
      message: '巨量 Android 回传怎么用，如何配置',
      lookup: lookup('integrated'),
    });

    expect(result?.status).toBe('integrated');
    expect(result?.requestMode).toBe('usage_help');
    expect(result?.nextAction).toBe('usage_help');
    expect(result?.source).toBe('zhitou_config_report');
  });

  it('routes missing zhitou config to demand collection', async () => {
    const result = await resolveDemandCapabilityStatus({
      media: '巨量',
      appType: 'IOS',
      serviceType: 'data_collection',
      message: '巨量 iOS 要采集数据',
      lookup: lookup('not_integrated'),
    });

    expect(result?.status).toBe('not_integrated');
    expect(result?.requestMode).toBe('collect_inputs');
    expect(result?.nextAction).toBe('collect_inputs');
  });

  it('routes integrated change wording to change request collection', async () => {
    const result = await resolveDemandCapabilityStatus({
      media: '巨量',
      appType: 'ANDROID',
      serviceType: 'monitoring_callback',
      message: '更新回传事件，补充付费事件',
      lookup: lookup('integrated'),
    });

    expect(result?.status).toBe('integrated');
    expect(result?.requestMode).toBe('change_request');
    expect(result?.nextAction).toBe('change_request');
  });

  it('asks media first when media is missing', async () => {
    const result = await resolveDemandCapabilityStatus({
      media: '',
      appType: 'ANDROID',
      serviceType: 'monitoring_callback',
      message: 'Android 回传怎么配置',
      lookup: lookup('integrated'),
    });

    expect(result?.status).toBe('unknown');
    expect(result?.nextAction).toBe('ask_missing_media');
  });

  it('asks appType when appType is missing', async () => {
    const result = await resolveDemandCapabilityStatus({
      media: '巨量',
      appType: '',
      serviceType: 'monitoring_callback',
      message: '巨量回传怎么配置',
      lookup: lookup('integrated'),
    });

    expect(result?.status).toBe('unknown');
    expect(result?.nextAction).toBe('ask_missing_app_type');
  });

  it('keeps report, package, and integration workflow questions out of demand intake', () => {
    expect(deriveServiceIntakeType('今天媒体报表消耗是多少')).toBeNull();
    expect(deriveServiceIntakeType('获取巨量可用包')).toBeNull();
    expect(deriveServiceIntakeType('发起巨量 Android 联调')).toBeNull();
  });
});
