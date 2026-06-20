import { describe, expect, it } from 'vitest';
import { shouldEnterReportExecution } from '../src/lib/report-execution-gate';
import { deriveRequestRouteDecision, deriveUserRequirement } from '../src/lib/request-understanding';
import { deriveRequestSemanticFrame } from '../src/lib/semantic-frame-resolver';
import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';

function mockReportCapability(): CapabilityManifest {
  return {
    capabilityId: 'test-report-capability',
    displayName: '报表查询能力',
    provider: 'mcp',
    capabilityType: 'data.report',
    capabilityPurpose: 'report_execution',
    dataDomain: 'advertising',
    supportedServiceIntents: ['data_query', 'report_delivery'],
    toolPurpose: 'data_fetch',
    supports: {
      metrics: ['cost', 'roi', 'activation'],
      dimensions: ['media', 'app', 'material'],
      identifierTypes: ['media_id', 'app_id'],
      granularity: ['day', 'hour'],
      views: ['summary', 'trend', 'table'],
    },
    source: { serverId: 'test-server', toolName: 'get_zt_ad_day_report' },
  } as CapabilityManifest;
}

// Helper function to run the full gate pipeline with semantic frame
function runGate(message: string, options: { capabilityReportMatch?: boolean; reportRouteMatch?: boolean } = {}) {
  const semanticFrame = deriveRequestSemanticFrame({ message });
  // Pass semanticFrame to route decision so it can be the semantic truth source
  const route = deriveRequestRouteDecision(message, {
    semanticFrame,
  });
  const requirement = deriveUserRequirement(message);
  return shouldEnterReportExecution({
    route,
    userRequirement: requirement,
    semanticFrame,
    selectedCapability: mockReportCapability(),
    capabilityReportMatch: options.capabilityReportMatch ?? true,
    reportRouteMatch: options.reportRouteMatch ?? false,
  });
}

describe('report execution gate', () => {
  describe('field definition requests should NOT enter report execution', () => {
    it('素材报表的未知是什么 → blocked by execution_mode', () => {
      const result = runGate('素材报表的未知是什么');
      expect(result.shouldEnter).toBe(false);
      // Should be blocked by execution_mode:read_only_lookup
      expect(result.blockedBy.some(b => b.includes('execution_mode') || b.includes('route_intent'))).toBe(true);
    });

    it('未知是什么意思 → blocked', () => {
      const result = runGate('未知是什么意思');
      expect(result.shouldEnter).toBe(false);
    });
  });

  describe('diagnostic requests should NOT enter report execution', () => {
    it('为什么素材显示未知 → blocked', () => {
      const result = runGate('为什么素材显示未知');
      expect(result.shouldEnter).toBe(false);
    });
  });

  describe('normal report queries SHOULD enter report execution', () => {
    it('今天素材报表的数据 → should enter', () => {
      const result = runGate('今天素材报表的数据', { reportRouteMatch: true });
      // Debug output
      console.log('今天素材报表的数据 gate result:', {
        shouldEnter: result.shouldEnter,
        blockedBy: result.blockedBy,
        reasons: result.reasons,
        policy: result.policy,
      });
      expect(result.shouldEnter).toBe(true);
    });

    it('查日报 → should enter', () => {
      const result = runGate('查日报', { reportRouteMatch: true });
      // Debug output
      console.log('查日报 gate result:', {
        shouldEnter: result.shouldEnter,
        blockedBy: result.blockedBy,
        reasons: result.reasons,
        policy: result.policy,
      });
      expect(result.shouldEnter).toBe(true);
    });

    it('enters when Request Understanding contract confirms report_query even without route-rule match', () => {
      const route = deriveRequestRouteDecision('2026-03-25 广告小时报表中，按自定义时段查看激活数', {
        clientIntent: 'report_query',
      });
      const requirement = deriveUserRequirement('2026-03-25 广告小时报表中，按自定义时段查看激活数');
      const semanticFrame = deriveRequestSemanticFrame({ message: '2026-03-25 广告小时报表中，按自定义时段查看激活数' });

      const result = shouldEnterReportExecution({
        route,
        userRequirement: requirement,
        semanticFrame,
        selectedCapability: mockReportCapability(),
        capabilityReportMatch: false,
        reportRouteMatch: false,
      });

      expect(route.intent_type).toBe('report_query');
      expect(route.requiresExecution).toBe(true);
      expect(requirement.task).toBe('report_query');
      expect(result.shouldEnter).toBe(true);
      expect(result.reasons).toContain('route_evidence_override:strong_report_contract');
    });
  });

  describe('capabilityReportMatch alone should NOT trigger execution', () => {
    it('capabilityReportMatch=true + help intent → blocked', () => {
      const result = runGate('如何配置监测链接', { reportRouteMatch: false });
      expect(result.shouldEnter).toBe(false);
      expect(result.reasons).toContain('capability_report_match:candidate_evidence_only');
    });
  });

  describe('non-report intents should NOT be hijacked by report capability', () => {
    it('投放包地址 → blocked (package_fetch)', () => {
      const result = runGate('投放包地址是什么', { reportRouteMatch: false });
      expect(result.shouldEnter).toBe(false);
    });

    it('回传异常排查 → blocked (diagnosis)', () => {
      const result = runGate('回传异常排查', { reportRouteMatch: false });
      expect(result.shouldEnter).toBe(false);
    });
  });

  describe('gate output structure', () => {
    it('includes policy info with executionMode in result', () => {
      const result = runGate('素材报表的未知是什么');
      expect(result.policy).toBeDefined();
      expect(result.policy.serviceIntent).toBe('field_definition');
      expect(result.policy.executionMode).toBe('read_only_lookup');
      expect(result.policy.capabilityPurpose).toBe('report_execution');
    });

    it('records capabilityReportMatch as candidate evidence', () => {
      const result = runGate('如何配置监测链接', { reportRouteMatch: false });
      expect(result.reasons).toContain('capability_report_match:candidate_evidence_only');
    });
  });
});
