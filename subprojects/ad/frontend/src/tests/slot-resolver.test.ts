import { describe, expect, it } from 'vitest';
import { getSlotSchema, resolveSlots } from '../src/lib/slot-resolver';

describe('slot resolver governance seed', () => {
  it('keeps slot alias rules serializable for future admin governance', () => {
    const schema = getSlotSchema('report_query');
    const serialized = JSON.parse(JSON.stringify(schema));

    expect(serialized.slots[0].aliasTerms).toEqual(expect.arrayContaining([
      'APPID|app_id|appid|项目|应用|project_id|projectId',
    ]));
    expect(serialized.slots[0].aliases).toBeUndefined();
  });

  it('resolves explicit report slots from configured alias terms', () => {
    const slotState = resolveSlots({
      intentType: 'report_query',
      message: 'APPID 123 昨天消耗按媒体拆分',
      businessContext: {
        evidenceRefs: [],
        updatedAt: new Date().toISOString(),
      },
    });

    expect(slotState.resolvedSlots.map((slot) => slot.slotKey)).toEqual(expect.arrayContaining([
      'app',
      'timeRange',
      'metrics',
      'dimensions',
    ]));
    expect(slotState.missingSlots).toEqual([]);
  });
});
