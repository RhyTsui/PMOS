import { describe, expect, it } from 'vitest';
import { serviceIntentFromRoute } from '../src/lib/route-decision-observation';

describe('route decision observation governance', () => {
  it('does not infer service intent from business keywords in observation layer', () => {
    expect(serviceIntentFromRoute('report_query', true)).toBe('data_query');
    expect(serviceIntentFromRoute('debugging', false)).toBe('system_operation');
    expect(serviceIntentFromRoute('get_delivery_packages', false)).toBe('package_fetch');
  });
});
