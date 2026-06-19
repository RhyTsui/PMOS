const { test, expect } = require('@playwright/test');

const baseURL = process.env.AD_CHAT_BASE_URL || 'http://127.0.0.1:8002';

test.describe('上下文与记忆 v0.4', () => {
  test('短追问会继承上一轮业务问题', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/xiaoqiao/context/resolve`, {
      data: {
        message: '昨天呢',
        history: [
          { role: 'user', content: '指间山海今天的消耗多少' },
          { role: 'assistant', content: '今天消耗为 658.95。' },
        ],
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.reason).toBe('date_follow_up');
    expect(body.resumedFrom).toContain('指间山海今天的消耗');
    expect(body.effectiveMessage).toContain('上下文续接');
  });

  test('阻塞追问不会被当作全新关键词', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/xiaoqiao/context/resolve`, {
      data: {
        message: '为什么不能投',
        history: [
          { role: 'user', content: '获取当前项目下通过检测的可交付包' },
          { role: 'assistant', content: '当前有 1 个包缺少上报验收。' },
        ],
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.reason).toBe('blocker_follow_up');
    expect(body.effectiveMessage).toContain('获取当前项目下通过检测的可交付包');
  });

  test('记忆创建后会返回同步状态', async ({ request }) => {
    test.setTimeout(70000);
    const response = await request.post(`${baseURL}/api/xiaoqiao/memory`, {
      data: {
        content: `v0.4 自动化验收记忆 ${Date.now()}`,
        memory_type: 'context',
        source: 'user_input',
        keywords: ['v0.4验收', 'Dataki记忆'],
        business_domain: '上下文记忆',
        importance: 4,
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.sync_target).toBe('dataki');
    expect(['synced', 'failed', 'skipped']).toContain(body.sync_result.status);

    await request.delete(`${baseURL}/api/xiaoqiao/memory/${body.id}`);
  });

  test('记忆同步状态接口可查询', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/xiaoqiao/memory/sync/status`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(typeof body.total).toBe('number');
    expect(body.counts).toBeTruthy();
  });
});
