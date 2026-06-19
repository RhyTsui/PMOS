import { describe, expect, it } from 'vitest';
import { createEmptyUserRequirement } from '../src/contracts/request-understanding/user-requirement-contract';
import { mergeRequirementWeakSignal } from '../src/lib/request-understanding-merge';

describe('request understanding weak signal merge', () => {
  it('fills empty slots and mirrors dataRequirement without breaking the contract shape', () => {
    const requirement = createEmptyUserRequirement();

    const audit = mergeRequirementWeakSignal(requirement, {
      metrics: ['cost', 'cost'],
      dimensions: [{ key: 'date', role: 'x_axis' }],
      dateRange: { type: 'absolute', start: '2026-06-01', end: '2026-06-12' },
      task: 'report_query',
    }, 'request_understanding');

    expect(requirement.metrics).toEqual(['cost']);
    expect(requirement.dataRequirement.requiredMetrics).toEqual(['cost']);
    expect(requirement.dimensions).toEqual([{ key: 'date', role: 'x_axis' }]);
    expect(requirement.dataRequirement.requiredDimensions).toEqual(['date']);
    expect(requirement.dateRange).toEqual({ type: 'absolute', value: '2026-06-01~2026-06-12' });
    expect(requirement.task).toBe('report_query');
    expect(requirement.taskAuthority).toBe('heuristic_candidate');
    expect(requirement.taskSource).toBe('request_understanding');
    expect(audit.applied.map(item => item.field)).toEqual(['metrics', 'dimensions', 'dateRange', 'task']);
    expect(audit.rejected).toEqual([]);
  });

  it('does not overwrite explicit signals from the current user turn', () => {
    const requirement = createEmptyUserRequirement();
    requirement.metrics = ['revenue'];
    requirement.dimensions = [{ key: 'media', role: 'breakdown' }];
    requirement.dateRange = { type: 'relative', value: 'last_7_days' };
    requirement.task = 'report_query';

    const audit = mergeRequirementWeakSignal(requirement, {
      metrics: ['cost'],
      dimensions: ['date'],
      dateRange: { type: 'absolute', value: '2026-06-12' },
      task: 'help',
    }, 'multi_turn_state');

    expect(requirement.metrics).toEqual(['revenue']);
    expect(requirement.dimensions).toEqual([{ key: 'media', role: 'breakdown' }]);
    expect(requirement.dateRange).toEqual({ type: 'relative', value: 'last_7_days' });
    expect(requirement.task).toBe('report_query');
    expect(audit.applied).toEqual([]);
    expect(audit.rejected).toEqual([
      { field: 'metrics', source: 'multi_turn_state', reason: 'target_already_explicit' },
      { field: 'dimensions', source: 'multi_turn_state', reason: 'target_already_explicit' },
      { field: 'dateRange', source: 'multi_turn_state', reason: 'target_already_explicit' },
      { field: 'task', source: 'multi_turn_state', reason: 'target_already_explicit' },
    ]);
  });

  it('rejects unsupported inherited entities and invalid shapes', () => {
    const requirement = createEmptyUserRequirement();

    const audit = mergeRequirementWeakSignal(requirement, {
      metrics: [{ name: 'cost' }],
      dateRange: { type: 'absolute' },
      task: 'unsafe_task',
      entities: [{ entityType: 'app', rawText: 'demo' }],
    }, 'multi_turn_state');

    expect(requirement).toEqual(createEmptyUserRequirement());
    expect(audit.applied).toEqual([]);
    expect(audit.rejected).toEqual([
      { field: 'metrics', source: 'multi_turn_state', reason: 'invalid_shape' },
      { field: 'dateRange', source: 'multi_turn_state', reason: 'invalid_shape' },
      { field: 'task', source: 'multi_turn_state', reason: 'invalid_shape' },
      { field: 'entities', source: 'multi_turn_state', reason: 'unsupported_field' },
    ]);
  });
});
