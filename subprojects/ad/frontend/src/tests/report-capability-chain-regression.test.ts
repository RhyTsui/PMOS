import { describe, expect, it } from 'vitest';
import type { CapabilityManifest } from '../src/contracts/capability/capability-manifest';
import { buildSemanticMessageContract } from '../src/contracts/result-assembly/semantic-result-assembly';
import { composeMessagePresentationRegions } from '../src/contracts/presentation/message-contract-field-bindings';
import { selectCapabilityForRequirement } from '../src/lib/capability-orchestration';
import { buildCapabilityGapSemanticResult } from '../src/lib/capability-gap-result';
import { deriveRequestRouteDecision, deriveUserRequirement, normalizeUserQuestionText } from '../src/lib/request-understanding';
import { mapProcessEventToRuntimeStep } from '../src/lib/runtime-event-display';
import type { AgentProcessEvent } from '../src/types';

function reportCapability(overrides: Partial<CapabilityManifest['supports']> = {}): CapabilityManifest {
  return {
    capabilityId: 'mcp.report.daily',
    provider: 'mcp',
    capabilityType: 'data.report',
    dataDomain: 'advertising',
    supports: {
      metrics: ['activation', ...(overrides.metrics || [])],
      dimensions: ['date', ...(overrides.dimensions || [])],
      identifierTypes: ['media_id', ...(overrides.identifierTypes || [])],
      granularity: ['day', ...(overrides.granularity || [])],
      views: ['summary', 'table', ...(overrides.views || [])],
    },
    source: {
      sourceType: 'mcp',
      toolName: 'report.daily_query',
      serverId: 'report-server',
    },
  };
}

describe('report capability chain regression', () => {
  it('keeps data execution when presentation view needs fallback', () => {
    const requirement = deriveUserRequirement('近30天巨量激活趋势');
    const decision = selectCapabilityForRequirement(requirement, [reportCapability()]);

    expect(decision.selected?.capabilityId).toBe('mcp.report.daily');
    expect(decision.dataCoverage.covered).toBe(true);
    expect(decision.presentationCoverage.covered).toBe(false);
    expect(decision.executionDecision).toBe('executable_with_presentation_fallback');
    expect(decision.fallbackReason).toBeUndefined();
    expect(decision.warnings.join('\n')).toContain('展示方式已降级');
    expect(JSON.stringify(decision)).not.toContain('no_full_coverage');
  });

  it('treats media as a filter and does not require media in output dimensions', () => {
    const requirement = deriveUserRequirement('近30天巨量每天激活数');
    const decision = selectCapabilityForRequirement(requirement, [reportCapability()]);

    expect(requirement.dimensions).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'media', role: 'filter' }),
      expect.objectContaining({ key: 'date', role: 'x_axis' }),
    ]));
    expect(requirement.filters.media?.length).toBeGreaterThan(0);
    expect(requirement.dataRequirement.requiredDimensions).toContain('date');
    expect(requirement.dataRequirement.requiredDimensions).not.toContain('media');
    expect(decision.dataCoverage.covered).toBe(true);
    expect(decision.dataCoverage.missing).not.toContain('dimension:media');
  });

  it('normalizes numbered report questions into the same trend requirement', () => {
    const cases = [
      '5.近30天的巨量的每天的激活数趋势',
      '近30天巨量激活趋势',
      '巨量最近30天每天激活数',
      '看一下巨量近30天按天激活',
      '最近30天巨量激活数折线图',
    ];

    expect(normalizeUserQuestionText(cases[0])).toBe('近30天的巨量的每天的激活数趋势');
    for (const input of cases) {
      const requirement = deriveUserRequirement(input);
      expect(requirement.task).toBe('report_query');
      expect(requirement.requestedView).toBe('trend');
      expect(requirement.dateRange.value).toMatch(/^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/);
      expect(requirement.metrics).toContain('activation');
      expect(requirement.granularity).toBe('day');
      expect(requirement.dimensions).toEqual(expect.arrayContaining([
        expect.objectContaining({ key: 'media', role: 'filter' }),
        expect.objectContaining({ key: 'date', role: 'x_axis' }),
      ]));
    }
  });

  it('treats ranked metric questions as report queries', () => {
    const requirement = deriveUserRequirement('指间山海 - 国内激活数最多的三个媒体');

    expect(requirement.task).toBe('report_query');
    expect(requirement.serviceIntent).toBe('data_query');
    expect(requirement.metrics).toContain('activation');
    expect(requirement.dimensions).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'media', role: 'breakdown' }),
    ]));
    expect(requirement.dataRequirement.requiredDimensions).toContain('media');
    expect(requirement.filters.media).toBeUndefined();
  });

  it('keeps concrete media values as filters but treats split dimensions as output dimensions', () => {
    const concreteFilter = deriveUserRequirement('近30天巨量每天激活数');
    const splitByDimensions = deriveUserRequirement('上周投放效果按媒体、应用类型拆分，包含 ROI 和留存');

    expect(concreteFilter.dimensions).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'media', role: 'filter' }),
      expect.objectContaining({ key: 'date', role: 'x_axis' }),
    ]));
    expect(concreteFilter.filters.media).toContain('巨量广告');
    expect(concreteFilter.dataRequirement.requiredDimensions).not.toContain('media');

    expect(splitByDimensions.task).toBe('report_query');
    expect(splitByDimensions.dimensions).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'media', role: 'breakdown' }),
      expect.objectContaining({ key: 'app_package_type', role: 'breakdown' }),
    ]));
    expect(splitByDimensions.dataRequirement.requiredDimensions).toEqual(expect.arrayContaining(['media', 'app_package_type']));
    expect(splitByDimensions.filters.media).toBeUndefined();
    expect(splitByDimensions.filters.app_package_type).toBeUndefined();
  });

  it('parses compact YYYYMMDD report dates as explicit single-day ranges', () => {
    const activation = deriveUserRequirement('20260521 激活数是多少');
    const roi = deriveUserRequirement('20250325 哪个媒体的首日 ROI 最高');

    expect(activation.task).toBe('report_query');
    expect(activation.dateRange).toEqual({ type: 'absolute', value: '2026-05-21~2026-05-21' });
    expect(activation.metrics).toContain('activation');

    expect(roi.task).toBe('report_query');
    expect(roi.dateRange).toEqual({ type: 'absolute', value: '2025-03-25~2025-03-25' });
    expect(roi.metrics).toContain('d1_roi');
    expect(roi.dimensions).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'media', role: 'breakdown' }),
    ]));
  });

  it('does not allow planner candidates to downgrade structured report requests to open answers', () => {
    const route = deriveRequestRouteDecision('2026 年 3 月 ROI 月报按应用类型查看累计 ROI', {
      llmIntentSignal: {
        intent_type: 'help',
        confidence: 0.92,
        reason: '模型误判为说明类请求',
        requiresExecution: false,
      },
    });

    expect(route.intent_type).toBe('report_query');
    expect(route.requiresExecution).toBe(true);
  });

  it('routes explicit hourly metric report requests to the report chain', () => {
    const route = deriveRequestRouteDecision('2026-03-25 广告小时报表中，按自定义时段查看激活数');
    const requirement = deriveUserRequirement('2026-03-25 广告小时报表中，按自定义时段查看激活数');

    expect(route.intent_type).toBe('report_query');
    expect(route.requiresExecution).toBe(true);
    expect(requirement.task).toBe('report_query');
    expect(requirement.metrics).toContain('activation');
  });

  it('builds capability gap as business summary consumed by the main presentation path', () => {
    const requirement = deriveUserRequirement('近30天巨量每天激活数');
    const unsupportedCapability = reportCapability();
    unsupportedCapability.supports.identifierTypes = [];
    unsupportedCapability.supports.dimensions = [];
    const decision = selectCapabilityForRequirement(requirement, [unsupportedCapability]);
    const gap = buildCapabilityGapSemanticResult({ requirement, decision });
    const messageContract = buildSemanticMessageContract({
      type: 'report_query',
      answerMarkdown: '能力缺口见结构化摘要。',
      businessSummary: gap.businessSummary,
      semanticResult: gap.semanticResult,
    });
    const presentation = composeMessagePresentationRegions({
      messageContract,
      semanticRegions: gap.semanticResult.regions,
    });

    expect(gap.businessSummary.capability_gap?.type).toBe('capability_gap');
    expect(presentation.fieldStatuses.business_summary.consumed).toBe(true);
    expect(presentation.regions.some(region => region.componentBinding === 'decision-card')).toBe(true);
  });

  it('maps capability internal enums to user-facing runtime copy', () => {
    const event: AgentProcessEvent = {
      id: 'event-1',
      type: 'capability.checked',
      label: '检查可用能力',
      status: 'success',
      visibility: 'user',
      started_at: new Date().toISOString(),
      output: {
        execution_decision: 'no_executable_capability',
        fallback_reason: 'no_full_coverage',
      },
    };
    const step = mapProcessEventToRuntimeStep(event);

    expect(step.summary).toContain('检查可用能力：已完成');
    expect(step.summary).toContain('结果：未找到完全覆盖本次需求的能力');
    expect(step.summary).not.toContain('no_full_coverage');
    expect(step.summary).not.toContain('succeeded');
  });
});
