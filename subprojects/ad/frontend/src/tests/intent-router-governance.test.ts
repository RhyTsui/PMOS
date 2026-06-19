import { describe, expect, it } from 'vitest';

import { routeUserIntent } from '../src/lib/intent-router';

const mojibakePattern = new RegExp(
  [
    '\\u5a13\\u544a\\u57d9',
    '\\u704f',
    '\\u9397\\u517c\\u5e34',
    '\\u6dc7\\u6fdb\\u7577',
    '\\u690b\\u5e9c\\u6adb',
    '\\ufffd',
  ].join('|'),
);

describe('intent router governance', () => {
  it('does not leak historical mojibake through client-side route hints', () => {
    const decisions = [
      routeUserIntent('游戏回传少了，帮我看一下'),
      routeUserIntent('投放包验收流程在哪里看'),
      routeUserIntent('日报拼接和定时发送怎么处理'),
    ];

    const serialized = JSON.stringify(decisions);
    expect(serialized).not.toMatch(mojibakePattern);
  });

  it('uses normalized Chinese preference hints instead of mojibake risk terms', () => {
    const decision = routeUserIntent('先聊一下当前情况', {
      preferenceProfile: {
        inferredPreferences: {
          riskBias: ['保守'],
        },
      },
    } as any);

    expect(decision.suggested_actions).toContain('先确认项目和范围');
    expect(JSON.stringify(decision)).not.toMatch(mojibakePattern);
  });
});
