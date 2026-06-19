import { describe, expect, it } from 'vitest';
import { getProviderAuthorityProfile } from '../src/lib/fact-need-reasoner';
import {
  buildSearchPlanForProvider,
  evaluateProviderEligibility,
  inferFactNeed,
} from '../src/lib/fact-need-reasoner';

describe('fact need provider arbitration', () => {
  it('allows public web for explicit public facts without relying on business keywords', () => {
    const factNeed = inferFactNeed({
      message: '请查公开资料里 ROI 是怎么定义的',
      context: { routeIntent: 'general' },
      publicSignals: {
        hasExternal: true,
        explicitSearch: true,
        hasStrongPublicSignal: false,
        hasRealtime: false,
        hasConfigQuestion: false,
        defaultGeneralLookupCandidate: false,
      },
    });
    const publicWeb = evaluateProviderEligibility(getProviderAuthorityProfile('public_web'), factNeed);
    const searchPlan = buildSearchPlanForProvider(publicWeb, factNeed, '请查公开资料里 ROI 是怎么定义的');

    expect(factNeed.fact_visibility).toBe('public');
    expect(publicWeb.eligible).toBe(true);
    expect(searchPlan.allowed).toBe(true);
    expect(searchPlan.role).toBe('primary_answer');
  });

  it('rejects public web as authority for internal business facts', () => {
    const factNeed = inferFactNeed({
      message: '今天这个项目消耗多少',
      context: { routeIntent: 'general', hasInternalBusinessSignal: true },
      publicSignals: {
        hasExternal: false,
        explicitSearch: false,
        hasStrongPublicSignal: false,
        hasRealtime: true,
        hasConfigQuestion: false,
        defaultGeneralLookupCandidate: false,
      },
    });
    const publicWeb = evaluateProviderEligibility(getProviderAuthorityProfile('public_web'), factNeed);
    const mcp = evaluateProviderEligibility(getProviderAuthorityProfile('mcp'), factNeed);
    const searchPlan = buildSearchPlanForProvider(publicWeb, factNeed, '今天这个项目消耗多少');

    expect(factNeed.authority_need).toBe('system_of_record');
    expect(publicWeb.eligible).toBe(false);
    expect(publicWeb.rejectedBy).toContain('fact_visibility');
    expect(searchPlan.allowed).toBe(false);
    expect(mcp.eligible).toBe(true);
  });

  it('prevents model-only from answering official or realtime facts as final authority', () => {
    const factNeed = inferFactNeed({
      message: '查官网公告里最新审核规则',
      context: { routeIntent: 'general' },
      publicSignals: {
        hasExternal: true,
        explicitSearch: true,
        hasStrongPublicSignal: true,
        hasRealtime: false,
        hasConfigQuestion: false,
        defaultGeneralLookupCandidate: false,
      },
    });
    const model = evaluateProviderEligibility(getProviderAuthorityProfile('model'), factNeed);
    const publicWeb = evaluateProviderEligibility(getProviderAuthorityProfile('public_web'), factNeed);

    expect(factNeed.authority_need).toBe('official_source');
    expect(model.eligible).toBe(false);
    expect(model.rejectedBy).toContain('authority_need');
    expect(publicWeb.eligible).toBe(true);
  });
});
