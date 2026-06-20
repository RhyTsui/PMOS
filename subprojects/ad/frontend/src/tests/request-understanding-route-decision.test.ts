import { describe, expect, it } from 'vitest';
import type { RequestSemanticFrame } from '../src/contracts/request-understanding/semantic-frame-contract';
import { deriveRequestRouteDecision, deriveUserRequirement } from '../src/lib/request-understanding';

describe('request-understanding route decision', () => {
  it('marks report query route as execution-required', () => {
    const decision = deriveRequestRouteDecision('Query ROI trend for the last 30 days on Android');

    expect(decision.intent_type).toBe('report_query');
    expect(decision.requiresExecution).toBe(true);
    expect(decision.workflow_level).toBe('light');
  });

  it('keeps general chat without execution requirement', () => {
    const decision = deriveRequestRouteDecision('How is the weather today?');

    expect(decision.intent_type).toBe('general');
    expect(decision.requiresExecution).toBe(false);
  });

  it('uses client report intent only when governed report signals agree', () => {
    const decision = deriveRequestRouteDecision('2026-03-25 广告小时报表中，按自定义时段查看激活数', {
      clientIntent: 'report_query',
    });

    expect(decision.intent_type).toBe('report_query');
    expect(decision.requiresExecution).toBe(true);
    expect(decision.reason).toContain('客户端候选');
  });

  it('does not let client report intent hijack unrelated public questions', () => {
    const decision = deriveRequestRouteDecision('How is the weather today?', {
      clientIntent: 'report_query',
    });

    expect(decision.intent_type).toBe('general');
    expect(decision.requiresExecution).toBe(false);
  });

  it('keeps structured report service intent when semantic frame service intent is non-data', () => {
    const semanticFrame: RequestSemanticFrame = {
      speechAct: 'request_operation',
      semanticTask: 'retrieve_report_data',
      executionMode: 'data_execution',
      serviceIntent: 'system_operation',
      evidenceNeed: ['data_mcp'],
      riskLevel: 'L1',
      requiredSlots: [],
      missingSlots: [],
      confidence: 'medium',
      frameSource: 'semantic_frame',
      frameVersion: 'test',
    };
    const requirement = deriveUserRequirement('最近 14 天的投放日报效果综合评估', null, semanticFrame);

    expect(requirement.task).toBe('report_query');
    expect(['data_query', 'report_delivery']).toContain(requirement.serviceIntent);
    expect(requirement.serviceIntent).not.toBe('system_operation');
  });

  it('does not route open factual questions to internal business paths without governed business signals', () => {
    const decision = deriveRequestRouteDecision('今年世界杯在哪举行？');

    expect(decision.intent_type).toBe('general');
    expect(decision.requiresExecution).toBe(false);
    expect(decision.is_business_related).toBe(false);
  });

  it('does not route public factual questions to help by generic question words alone', () => {
    const decision = deriveRequestRouteDecision('某地本周公共活动在哪里举行？');

    expect(decision.intent_type).toBe('general');
    expect(decision.requiresExecution).toBe(false);
    expect(decision.is_business_related).toBe(false);
  });

  it('does not let ambient project context turn public factual questions into business help', () => {
    const decision = deriveRequestRouteDecision('南京本周日天气如何', {
      businessContext: {
        project: { value: '示例项目', source: 'project_context', confidence: 'high' },
        evidenceRefs: [],
        updatedAt: '2026-06-15T00:00:00.000Z',
      },
    });

    expect(decision.intent_type).toBe('general');
    expect(decision.requiresExecution).toBe(false);
    expect(decision.is_business_related).toBe(false);
  });

  it('uses governed route rules as fallback candidates over local keyword fallback', () => {
    const decision = deriveRequestRouteDecision('配置检查', {
      routeRules: {
        rules: [
          {
            id: 'config-check-help',
            name: '配置说明规则',
            description: '后台配置规则作为受治理候选参与本地兜底。',
            intent_type: 'help',
            agent: 'help',
            workflow_level: 'light',
            confidence: 'high',
            priority: 100,
            status: 'active',
            enabled: true,
            rollout_percent: 100,
            match_mode: 'contains',
            include_terms: ['配置检查'],
            exclude_terms: [],
            required_tool_keywords: [],
            reason_template: '后台配置规则候选。',
            updated_at: '2026-06-12T00:00:00.000Z',
          },
        ],
      },
    });

    expect(decision.intent_type).toBe('help');
    expect(decision.reason).toContain('规则候选');
    expect(decision.reason).toContain('后台配置规则候选');
  });

  it('uses high-confidence planner candidate before local keyword fallback', () => {
    const decision = deriveRequestRouteDecision('list一下可用模块', {
      llmIntentSignal: {
        intent_type: 'debugging',
        confidence: 0.86,
        reason: '用户要求检查配置状态，需要进入系统操作链路。',
        serviceIntent: 'system_operation',
        requiresExecution: true,
      },
    });

    expect(decision.intent_type).toBe('debugging');
    expect(decision.requiresExecution).toBe(true);
    expect(decision.reason).toContain('Planner 候选');
  });

  it('uses governed default route seed for configuration operations', () => {
    const decision = deriveRequestRouteDecision('配置检查');

    expect(decision.intent_type).toBe('debugging');
    expect(decision.reason).toContain('命中配置检查操作规则');
    expect(decision.reason).toContain('规则候选');
  });

  it('uses governed route seeds for monitoring and generic help fallbacks', () => {
    const monitorDecision = deriveRequestRouteDecision('回传延迟告警怎么设置');
    const helpDecision = deriveRequestRouteDecision('字段口径怎么计算');

    expect(monitorDecision.intent_type).toBe('monitor');
    expect(monitorDecision.reason).toContain('命中监控告警规则');
    expect(monitorDecision.reason).toContain('规则候选');
    expect(helpDecision.intent_type).toBe('help');
    expect(helpDecision.reason).toContain('命中说明帮助规则');
    expect(helpDecision.reason).toContain('规则候选');
  });

  it('keeps high-confidence planner candidates above governed route rule candidates', () => {
    const decision = deriveRequestRouteDecision('配置检查', {
      llmIntentSignal: {
        intent_type: 'debugging',
        confidence: 0.9,
        reason: '模型候选进入配置检查。',
        requiresExecution: true,
      },
      routeRules: {
        rules: [
          {
            id: 'config-check-help',
            name: '配置说明规则',
            description: '后台配置规则作为受治理候选参与仲裁。',
            intent_type: 'help',
            agent: 'help',
            workflow_level: 'light',
            confidence: 'high',
            priority: 100,
            status: 'active',
            enabled: true,
            rollout_percent: 100,
            match_mode: 'contains',
            include_terms: ['配置检查'],
            exclude_terms: [],
            required_tool_keywords: [],
            reason_template: '后台配置规则候选。',
            updated_at: '2026-06-12T00:00:00.000Z',
          },
        ],
      },
    });

    expect(decision.intent_type).toBe('debugging');
    expect(decision.reason).toContain('Planner 候选');
    expect(decision.requiresExecution).toBe(true);
  });
});
