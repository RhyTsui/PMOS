import { describe, expect, it } from 'vitest';

import { routeUserIntent } from '../src/lib/intent-router';

const mojibakePattern = new RegExp([
  '\\u5a13\\u544a\\u57d9',
  '\\u704f',
  '\\u9397\\u517c\\u5e34',
  '\\u6dc7\\u6fdb\\u7577',
  '\\u690b\\u5e9c\\u6adb',
  '\\ufffd',
].join('|'));

describe('intent router governance', () => {
  it('does not leak historical mojibake through client-side route hints', () => {
    const decisions = [
      routeUserIntent('游戏回传少了，帮我看一下'),
      routeUserIntent('投放包验收流程在哪里看'),
      routeUserIntent('日报拼接和定时发送怎么处理'),
    ];

    expect(JSON.stringify(decisions)).not.toMatch(mojibakePattern);
  });

  it('uses normalized Chinese preference hints instead of mojibake risk terms', () => {
    const decision = routeUserIntent('先聊一下当前情况', {
      preferenceProfile: { inferredPreferences: { riskBias: ['保守'] } },
    } as any);

    expect(decision.suggested_actions).toContain('先确认项目和范围');
    expect(JSON.stringify(decision)).not.toMatch(mojibakePattern);
  });

  it('keeps legacy routing as a candidate for explicit hourly report metric requests', () => {
    const decision = routeUserIntent('2026-03-25 广告小时报表中，按自定义时段查看激活数');

    expect(decision.intent_type).toBe('report_query');
    expect(decision.agent).toBe('report');
    expect(decision.confidence).toBe('medium');
    expect(decision.route_candidate_only).toBe(true);
    expect(decision.candidate_source).toBe('governed_intent_route_rules');
    expect(decision.route_decision_scope).toBe('candidate_only');
    expect(decision.route_execution_authority).toBe('requires_arbitration');
    expect(decision.execution_decision).toBe('needs_arbitration');
    expect(decision.arbitrated_route?.status).toBe('pending_arbitration');
  });

  it('marks no-hit routes as non-executable candidate signals', () => {
    const decision = routeUserIntent('先聊一下今天的安排');

    expect(decision.intent_type).toBe('general');
    expect(decision.route_candidate_only).toBe(true);
    expect(decision.route_decision_scope).toBe('candidate_only');
    expect(decision.execution_decision).toBe('no_executable_capability');
    expect(decision.fallback_reason).toBe('no_matching_executable_capability');
    expect(decision.arbitrated_route?.status).toBe('clarify_required');
  });
  it('uses governed route rules before legacy adapter heuristics', () => {
    const decision = routeUserIntent('请处理 Alpha 能力场景', {
      routeRules: {
        rules: [{
          id: 'alpha-capability-candidate',
          name: 'Alpha 能力候选',
          description: '测试治理配置候选优先级。',
          intent_type: 'demand',
          agent: 'demand',
          workflow_level: 'light',
          confidence: 'high',
          priority: 90,
          status: 'active',
          enabled: true,
          rollout_percent: 100,
          match_mode: 'contains',
          include_terms: ['Alpha 能力场景'],
          exclude_terms: [],
          required_tool_keywords: [],
          reason_template: '命中测试治理配置候选。',
          updated_at: '2026-06-23T00:00:00.000Z',
        }],
      },
    } as any);

    expect(decision.intent_type).toBe('demand');
    expect(decision.candidate_source).toBe('governed_intent_route_rules');
    expect(decision.route_candidate_only).toBe(true);
    expect(decision.route_decision_scope).toBe('candidate_only');
    expect(decision.execution_decision).toBe('needs_arbitration');
    expect(decision.fallback_reason).toBe('route_rule_candidate_requires_arbitration');
    expect(decision.arbitrated_route?.arbitration_rule_id).toBe('intent-route:alpha-capability-candidate');
  });
});
