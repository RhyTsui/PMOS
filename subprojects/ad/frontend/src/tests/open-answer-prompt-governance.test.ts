import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('open answer prompt governance', () => {
  it('does not encode sample question branches in the chat route strategy', () => {
    const routeSource = readFileSync(resolve(process.cwd(), 'src/app/api/chat/route.ts'), 'utf8');

    expect(routeSource).not.toContain('如果用户问助手能做什么');
    expect(routeSource).not.toContain('如果用户要求一句话');
    expect(routeSource).not.toContain('你好，请用一句话说明你现在可以帮我做什么');
  });
});
