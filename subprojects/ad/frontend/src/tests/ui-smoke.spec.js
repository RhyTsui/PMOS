const { test, expect } = require('@playwright/test');

test('首页输入与播报入口可交互', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://127.0.0.1:5000/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('小乔智投').first()).toBeVisible({ timeout: 15000 });

  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill('帮我检查新的输入框和播报入口是否正常。');

  await expect(page.getByRole('button', { name: '发送' })).toBeEnabled();
  await page.getByRole('button', { name: /自动播报/ }).click();

  await page.screenshot({
    path: 'E:/AI/ai-os/subprojects/ad/imported/projects/home-voice-ui-check.png',
    fullPage: true,
  });

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});

test('自动报表页可输入并显示中文文案', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('http://127.0.0.1:5000/reports', { waitUntil: 'commit', timeout: 15000 });
  await expect(page.getByRole('heading', { name: '自动报表服务' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('报表需求对话')).toBeVisible();

  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill('请按昨天的经营总览模板生成一版复核草稿。');
  await expect(textarea).toHaveValue('请按昨天的经营总览模板生成一版复核草稿。');

  await page.screenshot({
    path: 'E:/AI/ai-os/subprojects/ad/imported/projects/reports-ui-check.png',
    fullPage: true,
  });

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});

test('配置管理页能正常打开', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('http://127.0.0.1:5000/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText('配置');

  await page.screenshot({
    path: 'E:/AI/ai-os/subprojects/ad/imported/projects/admin-ui-check.png',
    fullPage: true,
  });

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});
