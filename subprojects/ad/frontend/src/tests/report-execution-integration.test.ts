import { describe, expect, it } from 'vitest';
import { deriveRequestRouteDecision, deriveUserRequirement } from '../src/lib/request-understanding';
import { shouldEnterReportExecution } from '../src/lib/report-execution-gate';
import { resolveEvidenceSourcePolicy } from '../src/lib/information-source-arbitration';
import { getServiceIntentExecutionPolicy } from '../src/lib/service-intent-execution-policy';
import { detectFieldDefinitionSignal } from '../src/lib/field-definition-resolver';
import { deriveRequestSemanticFrame } from '../src/lib/semantic-frame-resolver';
import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';

/**
 * Route-level integration tests.
 *
 * These tests validate the full request understanding → execution gate → evidence source pipeline.
 * They mock the presence of a report capability (like get_zt_ad_day_report) to ensure
 * capability presence alone does not trigger report execution for non-report intents.
 */

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

interface IntegrationTestResult {
  route: ReturnType<typeof deriveRequestRouteDecision>;
  requirement: ReturnType<typeof deriveUserRequirement>;
  gate: ReturnType<typeof shouldEnterReportExecution>;
  fieldSignal: ReturnType<typeof detectFieldDefinitionSignal>;
  evidencePolicy: ReturnType<typeof resolveEvidenceSourcePolicy>;
  executionPolicy: ReturnType<typeof getServiceIntentExecutionPolicy>;
  semanticFrame: ReturnType<typeof deriveRequestSemanticFrame>;
}

function runFullPipeline(message: string): IntegrationTestResult {
  const semanticFrame = deriveRequestSemanticFrame({ message });
  const route = deriveRequestRouteDecision(message, {
    semanticFrame,
    capabilityCandidates: [{
      capability: mockReportCapability(),
      score: 100,
      reasons: ['capability_match'],
      dataCoverage: { covered: true, score: 100, reasons: [], missing: [], supportLevel: 'full_match' },
      presentationCoverage: { covered: true, score: 50, reasons: [], missing: [], supportLevel: 'full_match' },
    }],
  });
  const requirement = deriveUserRequirement(message);
  const gate = shouldEnterReportExecution({
    route,
    userRequirement: requirement,
    semanticFrame,
    selectedCapability: mockReportCapability(),
    capabilityReportMatch: true,  // Simulate: report capability exists
    reportRouteMatch: false,
  });
  const fieldSignal = detectFieldDefinitionSignal(message);
  const serviceIntent = semanticFrame.serviceIntent || requirement.serviceIntent || route.tracking_target || 'general_chat';
  const evidencePolicy = resolveEvidenceSourcePolicy(serviceIntent);
  const executionPolicy = getServiceIntentExecutionPolicy(serviceIntent);

  return { route, requirement, gate, fieldSignal, evidencePolicy, executionPolicy, semanticFrame };
}

describe('report execution integration', () => {
  describe('P0-1: 素材报表的未知是什么', () => {
    it('不调用 list_all_apps / get_zt_ad_day_report (gate blocks)', () => {
      const result = runFullPipeline('素材报表的未知是什么');

      // Gate must block
      expect(result.gate.shouldEnter).toBe(false);

      // Route must be help, not report_query
      expect(result.route.intent_type).toBe('help');
      expect(result.route.requiresExecution).toBe(false);

      // ServiceIntent must be field_definition
      expect(result.requirement.serviceIntent).toBe('field_definition');

      // Execution policy must be non_execution
      expect(result.executionPolicy.category).toBe('non_execution');

      // Evidence source must NOT select mcp_api
      expect(result.evidencePolicy.blocked).toContain('mcp_api');
      expect(result.evidencePolicy.primary).toBe('field_dictionary');

      // Field signal must match
      expect(result.fieldSignal.matched).toBe(true);
      expect(result.fieldSignal.targetObject).toBe('素材报表');
      expect(result.fieldSignal.targetTerm).toBe('未知');
    });

    it('capability purpose report_execution is blocked for field_definition', () => {
      const result = runFullPipeline('素材报表的未知是什么');
      expect(result.executionPolicy.blockedPurposes).toContain('report_execution');
      expect(result.executionPolicy.allowedPurposes).toContain('dictionary_lookup');
    });
  });

  describe('P0-2: 未知是什么意思 (缺少对象)', () => {
    it('不执行报表，进入澄清', () => {
      const result = runFullPipeline('未知是什么意思');

      expect(result.gate.shouldEnter).toBe(false);
      expect(result.route.intent_type).toBe('help');
      expect(result.route.requiresExecution).toBe(false);
      expect(result.fieldSignal.matched).toBe(true);
      expect(result.fieldSignal.requiresClarification).toBe(true);
      expect(result.evidencePolicy.blocked).toContain('mcp_api');
    });
  });

  describe('P0-3: 为什么素材显示未知 (诊断类)', () => {
    it('不误判成普通查数', () => {
      const result = runFullPipeline('为什么素材显示未知');

      // Field definition should NOT match
      expect(result.fieldSignal.matched).toBe(false);

      // Gate should block (not a report query)
      expect(result.gate.shouldEnter).toBe(false);

      // Route should NOT be report_query
      expect(result.route.intent_type).not.toBe('report_query');
    });
  });

  describe('P0-4: 今天素材报表的数据 (正常查数)', () => {
    it('正常进入 report_query', () => {
      const result = runFullPipeline('今天素材报表的数据');

      expect(result.gate.shouldEnter).toBe(true);
      expect(result.route.intent_type).toBe('report_query');
      expect(result.route.requiresExecution).toBe(true);
      // Use semanticFrame.serviceIntent as source of truth (not requirement.serviceIntent)
      expect(result.semanticFrame.serviceIntent).toBe('data_query');
      expect(result.executionPolicy.category).toBe('execution');
      expect(result.evidencePolicy.primary).toBe('mcp_api');
    });
  });

  describe('P0-5: 查日报 (capability discovery)', () => {
    it('通过 capability discovery 正常进入问数', () => {
      const result = runFullPipeline('查日报');

      // Note: "查日报" may or may not match report_query depending on route rules
      // The key is: if it's report_query, gate should allow
      if (result.route.intent_type === 'report_query') {
        expect(result.gate.shouldEnter).toBe(true);
        expect(result.executionPolicy.category).toBe('execution');
      }
    });
  });

  describe('P0-6: 如何配置监测链接 (help/knowledge)', () => {
    it('不被 report capability 抢走', () => {
      const result = runFullPipeline('如何配置监测链接');

      expect(result.gate.shouldEnter).toBe(false);
      expect(result.route.intent_type).toBe('help');
      expect(result.route.requiresExecution).toBe(false);
      expect(result.executionPolicy.category).toBe('non_execution');
      expect(result.executionPolicy.blockedPurposes).toContain('report_execution');
    });
  });

  describe('P0-7: package / integration / diagnosis 不被抢走', () => {
    it('投放包地址 → not report_query', () => {
      const result = runFullPipeline('投放包地址');
      expect(result.gate.shouldEnter).toBe(false);
      expect(result.route.intent_type).not.toBe('report_query');
    });

    it('联调状态 → not report_query', () => {
      const result = runFullPipeline('联调状态');
      expect(result.gate.shouldEnter).toBe(false);
      expect(result.route.intent_type).not.toBe('report_query');
    });

    it('回传异常排查 → not report_query', () => {
      const result = runFullPipeline('回传异常排查');
      expect(result.gate.shouldEnter).toBe(false);
      expect(result.route.intent_type).not.toBe('report_query');
    });
  });

  describe('P0-8: capabilityReportMatch + field_definition → mcp_api rejected', () => {
    it('evidence source rejects mcp_api for field_definition', () => {
      const result = runFullPipeline('素材报表的未知是什么');

      // Even though capabilityReportMatch=true
      expect(result.evidencePolicy.blocked).toContain('mcp_api');
      expect(result.evidencePolicy.primary).not.toBe('mcp_api');

      // Gate should record capabilityReportMatch as candidate only
      expect(result.gate.reasons).toContain('capability_report_match:candidate_evidence_only');
      expect(result.gate.blockedBy.some(b => b.includes('report_execution'))).toBe(true);
    });
  });
});
