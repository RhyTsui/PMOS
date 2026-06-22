#!/usr/bin/env node
/**
 * 批量添加公众号到 WeWe RSS
 *
 * 使用方法：
 * 1. 在微信里搜索公众号（如"游戏陀螺"），打开任意一篇文章
 * 2. 点右上角 ... → 复制链接
 * 3. 将链接粘贴到同目录下的 account-urls.txt，每行一个
 *    格式：公众号名称|文章链接
 *    示例：
 *      游戏陀螺|https://mp.weixin.qq.com/s/xxxxx
 *      竞核|https://mp.weixin.qq.com/s/yyyyy
 * 4. 运行：node scripts/add-wewe-accounts.mjs
 */

const fs = require('fs');
const path = require('path');

const WEWE_URL = process.env.WEWE_URL || 'http://localhost:4000';
const AUTH_CODE = process.env.WEWE_AUTH_CODE || 'gi2026';
const ACCOUNT_ID = process.env.WEWE_ACCOUNT_ID || '31206992';
const URLS_FILE = path.join(__dirname, 'account-urls.txt');

async function getMpInfo(wxsLink) {
  const res = await fetch(`${WEWE_URL}/trpc/platform.getMpInfo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: AUTH_CODE,
    },
    body: JSON.stringify({ wxsLink }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  const items = data.result?.data;
  if (!items || items.length === 0 || !items[0].name) {
    throw new Error('未找到公众号信息（链接可能不属于有效公众号）');
  }
  return items[0];
}

async function addFeed(mpInfo) {
  const res = await fetch(`${WEWE_URL}/trpc/feed.add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: AUTH_CODE,
    },
    body: JSON.stringify({
      id: mpInfo.id,
      mpName: mpInfo.name,
      mpCover: mpInfo.cover,
      mpIntro: mpInfo.intro,
      updateTime: mpInfo.updateTime,
    }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return data.result?.data;
}

async function main() {
  if (!fs.existsSync(URLS_FILE)) {
    console.log(`
=== 公众号批量添加工具 ===

请创建文件: ${URLS_FILE}
每行格式: 公众号名称|文章链接

示例:
游戏陀螺|https://mp.weixin.qq.com/s/xxxxx
竞核|https://mp.weixin.qq.com/s/yyyyy
手游那点事|https://mp.weixin.qq.com/s/zzzzz

提示：在微信里打开公众号任意一篇文章，点右上角 ... → 复制链接
`);
    return;
  }

  const lines = fs.readFileSync(URLS_FILE, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  console.log(`找到 ${lines.length} 条待添加记录\n`);

  const results = { success: [], failed: [] };

  for (const line of lines) {
    const [name, url] = line.split('|').map(s => s.trim());
    if (!name || !url) {
      results.failed.push({ name: name || '(格式错误)', error: '格式应为: 名称|链接' });
      continue;
    }

    process.stdout.write(`[${name}] 查询公众号信息... `);
    try {
      const mpInfo = await getMpInfo(url);
      if (mpInfo.name !== name) {
        process.stdout.write(`实际名称: ${mpInfo.name} `);
      }
      process.stdout.write('添加中... ');
      const feed = await addFeed(mpInfo);
      console.log(`✓ 成功 (ID: ${feed.id})`);
      results.success.push({ name, id: feed.id, mpName: mpInfo.name });
    } catch (err) {
      const msg = err.message;
      console.log(`✗ 失败: ${msg}`);
      results.failed.push({ name, error: msg });
    }

    // 避免请求过快
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${results.success.length}`);
  console.log(`失败: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\n失败列表:');
    for (const f of results.failed) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  // 成功后从文件中移除已添加的
  if (results.success.length > 0) {
    const successNames = new Set(results.success.map(r => r.name));
    const remaining = lines.filter(l => {
      const [n] = l.split('|').map(s => s.trim());
      return !successNames.has(n);
    });
    fs.writeFileSync(URLS_FILE, remaining.join('\n') + '\n');
    console.log(`\n已更新 ${URLS_FILE}（移除了成功的条目）`);
  }
}

main().catch(console.error);
