import { describe, expect, it } from 'vitest';
import { resolveChatAnswerMessage } from '../src/lib/chat-answer-message-catalog';

describe('chat answer message catalog', () => {
  it('keeps public web no-results fallback generic and evidence-scoped', () => {
    const text = resolveChatAnswerMessage('public_web.no_results', {
      topic: '公开文档',
    });

    expect(text).toContain('公开来源');
    expect(text).toContain('官方链接');
    expect(text).not.toContain('具体作品');
    expect(text).not.toContain('角色');
    expect(text).not.toContain('截图');
  });

  it('explains weather realtime source limits without inventing a city result', () => {
    const text = resolveChatAnswerMessage('public_web.not_configured', {
      topic: '下周日南京天气',
    });

    expect(text).toContain('天气');
    expect(text).toContain('实时');
    expect(text).toContain('不足以确认');
    expect(text).not.toContain('北京');
    expect(text).not.toContain('weather.example.test');
  });
});
