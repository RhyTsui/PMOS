import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('XIAOQIAO_PERSIST_DEV_STORE', 'false');

describe('user preference role policy', () => {
  it('does not infer user role from business keywords in memories', async () => {
    const { ensureUserPreferenceProfile } = await import('../src/lib/user-preference-store');

    const profile = await ensureUserPreferenceProfile(`role-policy-${Date.now()}`, {
      memories: [
        {
          id: 'memory-material-topic',
          user_id: 'role-policy-user',
          memory_type: 'preference',
          source: 'user_input',
          content: '最近经常分析素材、创意、封面和视频表现。',
          keywords: ['素材', '创意'],
          importance: 3,
          access_count: 0,
          archived: false,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ],
    });

    expect(profile.currentRole).toBe('optimizer');
    expect(profile.defaultRole).toBe('optimizer');
    expect(profile.roleHistory?.at(-1)?.source).toBe('system');
  });
});
