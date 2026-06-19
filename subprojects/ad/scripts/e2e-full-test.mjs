import { chromium } from 'playwright';

async function waitForLogin(page: any) {
  console.log('等待扫码登录...');
  // 等待登录成功（URL 变化或出现特定元素）
  await page.waitForFunction(
    () => {
      const url = window.location.href;
      return !url.includes('/login') && (
        document.querySelector('[class*="chat"]') ||
        document.querySelector('[class*="input"]') ||
        document.querySelector('textarea')
      );
    },
    { timeout: 120000 }
  );
  console.log('✓ 登录成功');
}

async function waitForResponse(page: any, timeout = 60000) {
  console.log('等待 AI 响应...');

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    // 检查是否有响应内容
    const hasResponse = await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="bubble"]');
      if (messages.length === 0) return false;

      const lastMessage = messages[messages.length - 1];
      const content = lastMessage.textContent || '';

      // 检查是否有实际内容（不是正在加载）
      return content.length > 10 &&
             !content.includes('思考中') &&
             !content.includes('查询中');
    });

    if (hasResponse) {
      console.log('✓ 收到响应');
      return true;
    }

    await page.waitForTimeout(1000);
  }

  console.log('⚠ 响应超时');
  return false;
}

async function selectProjectIfPrompted(page: any) {
  // 检查是否有项目选择提示
  const hasProjectPrompt = await page.evaluate(() => {
    const text = document.body.textContent || '';
    return text.includes('选择项目') ||
           text.includes('确认项目') ||
           text.includes('请选择') ||
           text.includes('项目列表');
  });

  if (hasProjectPrompt) {
    console.log('检测到项目选择提示，尝试选择...');

    // 尝试点击第一个项目选项
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], [class*="option"]'));
      const projectButton = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.match(/^\d+/) || // 数字开头的项目ID
               text.includes('项目') ||
               text.includes('app');
      });

      if (projectButton) {
        (projectButton as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('✓ 已选择项目');
      await page.waitForTimeout(2000);
    }
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // 1. 打开登录页
    console.log('\n=== 步骤 1: 打开登录页 ===');
    await page.goto('http://10.236.14.27:8002/login');
    await page.screenshot({ path: 'e2e-01-login.png', fullPage: true });
    console.log('✓ 截图: e2e-01-login.png');

    // 2. 等待用户扫码登录
    console.log('\n=== 步骤 2: 等待扫码登录 ===');
    await waitForLogin(page);
    await page.waitForTimeout(2000); // 等待页面完全加载
    await page.screenshot({ path: 'e2e-02-logged-in.png', fullPage: true });
    console.log('✓ 截图: e2e-02-logged-in.png');

    // 3. 输入查询
    console.log('\n=== 步骤 3: 输入查询 ===');
    const query = '巨量近7天的消耗';
    console.log(`查询: ${query}`);

    // 找到输入框
    const input = await page.$('textarea, [contenteditable="true"], input[type="text"]');
    if (!input) {
      throw new Error('找不到输入框');
    }

    await input.fill(query);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e-03-query-entered.png', fullPage: true });
    console.log('✓ 截图: e2e-03-query-entered.png');

    // 4. 发送查询
    console.log('\n=== 步骤 4: 发送查询 ===');
    await input.press('Enter');
    await page.waitForTimeout(3000); // 等待初始响应
    await page.screenshot({ path: 'e2e-04-query-sent.png', fullPage: true });
    console.log('✓ 截图: e2e-04-query-sent.png');

    // 5. 等待响应
    console.log('\n=== 步骤 5: 等待响应 ===');
    await waitForResponse(page, 60000);
    await page.screenshot({ path: 'e2e-05-response.png', fullPage: true });
    console.log('✓ 截图: e2e-05-response.png');

    // 6. 如果需要，选择项目
    console.log('\n=== 步骤 6: 检查项目选择 ===');
    await selectProjectIfPrompted(page);
    await page.waitForTimeout(3000);

    // 7. 等待最终结果
    console.log('\n=== 步骤 7: 等待最终结果 ===');
    await waitForResponse(page, 30000);
    await page.screenshot({ path: 'e2e-06-final.png', fullPage: true });
    console.log('✓ 截图: e2e-06-final.png');

    // 8. 提取结果
    console.log('\n=== 步骤 8: 提取结果 ===');
    const result = await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"], [class*="bubble"]');
      const lastMessage = messages[messages.length - 1];

      // 检查是否有数据表格
      const hasTable = document.querySelector('table, [class*="table"]') !== null;

      // 检查是否有图表
      const hasChart = document.querySelector('[class*="chart"], canvas, svg') !== null;

      // 检查是否有错误
      const hasError = document.body.textContent?.includes('错误') ||
                      document.body.textContent?.includes('失败') ||
                      document.body.textContent?.includes('无法');

      return {
        content: lastMessage?.textContent || '',
        hasTable,
        hasChart,
        hasError,
        messageCount: messages.length,
      };
    });

    console.log('\n=== 测试结果 ===');
    console.log('响应内容:', result.content.slice(0, 500));
    console.log('是否有表格:', result.hasTable ? '✓' : '✗');
    console.log('是否有图表:', result.hasChart ? '✓' : '✗');
    console.log('是否有错误:', result.hasError ? '⚠' : '✓');
    console.log('消息数量:', result.messageCount);

    // 9. 判断测试是否通过
    console.log('\n=== 测试结论 ===');
    if (result.hasError) {
      console.log('❌ 测试失败: 出现错误');
    } else if (result.hasTable || result.hasChart) {
      console.log('✅ 测试通过: 成功获取数据');
    } else if (result.content.includes('还需要') || result.content.includes('请')) {
      console.log('⚠️ 测试部分通过: 需要更多信息');
    } else {
      console.log('❓ 测试结果不确定');
    }

  } catch (error) {
    console.error('测试失败:', error);
    await page.screenshot({ path: 'e2e-error.png', fullPage: true });
  } finally {
    console.log('\n按 Enter 关闭浏览器...');
    process.stdin.once('data', async () => {
      await browser.close();
      process.exit(0);
    });

    // 等待 5 秒后自动关闭
    setTimeout(async () => {
      await browser.close();
      process.exit(0);
    }, 5000);
  }
}

main().catch(console.error);
