import { test, expect } from '@playwright/test';

test('字段解释问题不应触发报表执行', async ({ page }) => {
  // 1. 打开应用
  await page.goto('http://localhost:3000');

  // 2. 等待用户扫码登录
  console.log('\n=== 请在浏览器中扫码登录 ===');
  console.log('等待登录完成...');

  // 等待登录成功（检测聊天输入框出现）
  await page.waitForSelector('textarea, [data-testid="chat-input"]', {
    timeout: 120000, // 2 分钟超时
    state: 'visible'
  });
  console.log('✓ 登录成功');

  // 3. 监听网络请求，记录 MCP 工具调用
  const mcpCalls: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/mcp/') || url.includes('list_all_apps') || url.includes('get_zt_ad_day_report')) {
      mcpCalls.push(url);
      console.log(`[MCP 请求] ${url}`);
    }
  });

  // 4. 发送测试消息
  const testMessage = '素材报表的未知是什么';
  console.log(`\n发送测试消息: "${testMessage}"`);

  const input = await page.locator('textarea, [data-testid="chat-input"]').first();
  await input.fill(testMessage);
  await input.press('Enter');

  // 5. 等待 AI 响应完成
  console.log('等待 AI 响应...');
  await page.waitForTimeout(5000); // 先等 5 秒

  // 等待响应完成（检测"处理完成"状态）
  await page.waitForFunction(() => {
    const statusElements = document.querySelectorAll('[data-testid*="status"], .status-indicator');
    return Array.from(statusElements).some(el =>
      el.textContent?.includes('完成') || el.textContent?.includes('completed')
    );
  }, { timeout: 30000 });

  // 6. 获取响应内容
  const responseElements = await page.locator('[data-testid="message"], .message-content, .chat-message').all();
  const lastResponse = responseElements[responseElements.length - 1];
  const responseText = await lastResponse.textContent();

  console.log('\n=== AI 响应 ===');
  console.log(responseText);

  // 7. 验证结果
  console.log('\n=== 验证结果 ===');

  // 检查是否调用了报表工具
  const hasReportToolCall = mcpCalls.some(url =>
    url.includes('list_all_apps') || url.includes('get_zt_ad_day_report')
  );

  console.log(`MCP 工具调用数: ${mcpCalls.length}`);
  console.log(`是否调用报表工具: ${hasReportToolCall ? '❌ 是' : '✓ 否'}`);

  // 检查响应内容
  const hasTableData = responseText?.includes('素材名称') ||
                       responseText?.includes('report_data') ||
                       responseText?.includes('查询结果');

  const hasExplanation = responseText?.includes('未知') &&
                         (responseText?.includes('字段') ||
                          responseText?.includes('表示') ||
                          responseText?.includes('含义'));

  console.log(`是否返回报表数据: ${hasTableData ? '❌ 是' : '✓ 否'}`);
  console.log(`是否返回字段解释: ${hasExplanation ? '✓ 是' : '❌ 否'}`);

  // 8. 断言
  expect(hasReportToolCall).toBe(false);
  expect(hasTableData).toBe(false);
  expect(hasExplanation).toBe(true);

  console.log('\n✓ 测试通过：字段解释问题未触发报表执行');
});
