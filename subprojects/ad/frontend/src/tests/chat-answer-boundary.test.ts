import { describe, expect, it } from 'vitest';
import { evaluateChatAnswerBoundary } from '../src/lib/chat-answer-boundary';

describe('chat answer boundary', () => {
  it('allows general non-report chat to use the shared LLM answer path', () => {
    const decision = evaluateChatAnswerBoundary({
      serviceIntent: 'general',
      routeIntent: 'general',
      isReportQuery: false,
      hasExecutableTool: false,
      hasSelectedSkill: false,
      phase: 'fallback',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('allowed:service_intent:general');
  });

  it('keeps report query blocked from generic chat answer composition', () => {
    const decision = evaluateChatAnswerBoundary({
      serviceIntent: 'data_query',
      routeIntent: 'report_query',
      isReportQuery: true,
      phase: 'fallback',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('blocked:report_query');
  });
});
