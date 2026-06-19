import { describe, expect, it } from 'vitest';
import reportQueryMissingMetadata from '../../examples/report-query.missing-metadata.example';
import { buildDisclosureView } from '../builders/buildDisclosureView';
import { validateMessageDisclosureView } from '../validators';

describe('disclosure contract', () => {
  it('builds a disclosure view for tool-only input', () => {
    const view = buildDisclosureView(reportQueryMissingMetadata);
    expect(view.contractType).toBe('message-disclosure-view');
    expect(view.messageId).toBe(reportQueryMissingMetadata.message.message_id);
    expect(view.execution.toolCalls.length).toBeGreaterThan(0);
    expect(validateMessageDisclosureView(view).valid).toBe(true);
  });

  it('keeps source empty as an explicit empty state', () => {
    const view = buildDisclosureView(reportQueryMissingMetadata);
    expect(view.evidence.sources.length).toBe(0);
    expect(view.emptyStates.evidence).toContain('来源');
  });

  it('keeps field empty as an explicit empty state', () => {
    const view = buildDisclosureView(reportQueryMissingMetadata);
    expect(view.fields.items.length).toBe(0);
    expect(view.emptyStates.fields).toContain('字段');
  });

  it('handles partial result and failed tool retry inputs', () => {
    const view = buildDisclosureView({
      ...reportQueryMissingMetadata,
      message: {
        ...reportQueryMissingMetadata.message,
        metadata: {
          ...(reportQueryMissingMetadata.message.metadata || {}),
          process_events: [
            {
              id: 'evt-1',
              type: 'tool-call-failed',
              status: 'failed',
              timestamp: '2026-05-29T00:00:00.000Z',
              title: '工具失败',
              summary: '第一次调用失败',
              tool_call_id: 'tool-1',
            },
            {
              id: 'evt-2',
              type: 'retry-scheduled',
              status: 'retrying',
              timestamp: '2026-05-29T00:00:01.000Z',
              title: '安排重试',
              summary: '准备再次执行',
              tool_call_id: 'tool-1',
            },
          ],
        },
      },
      runtime: {
        contractType: 'runtime-display',
        version: '1.0.0',
        runtimeId: 'runtime-001',
        status: 'partially-succeeded',
        events: [],
      },
    });

    expect(view.execution.status).toBe('partially-succeeded');
    expect(view.qualityChecks.items.some((item) => item.status === 'fail' || item.status === 'pending')).toBe(true);
  });
});

