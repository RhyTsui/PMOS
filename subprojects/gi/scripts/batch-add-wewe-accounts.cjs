#!/usr/bin/env node
/**
 * 通过搜狗微信搜索批量添加公众号到 WeWe RSS
 * 流程：搜狗搜索 → 提取微信文章URL → 获取公众号信息 → 添加到 WeWe RSS
 */

const WEWE_URL = 'http://localhost:4000';
const AUTH_CODE = 'gi2026';
const SOGOU_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const WECHAT_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.44';

// 待添加的公众号列表
const ACCOUNTS = [
  '竞核',
  '手游那点事',
  '游戏开发者GAD',
  '罗斯基',
  '独立出海联合体',
  '米哈游',
  '腾讯游戏',
  '网易游戏',
  '莉莉丝游戏',
  '鹰角网络',
  '叠纸游戏',
  '库洛游戏',
  '伽马数据',
  'Sensor Tower',
  'data.ai',
  '游戏价值榜',
  '手游矩阵',
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchSogou(name) {
  const query = encodeURIComponent(name);
  const res = await fetch(`https://weixin.sogou.com/weixin?type=2&query=${query}&ie=utf8`, {
    headers: { 'User-Agent': SOGOU_UA },
    redirect: 'manual',
  });
  const html = await res.text();
  const linkMatch = html.match(/href="(\/link\?[^"]+)"/);
  if (!linkMatch) return null;
  return linkMatch[1].replace(/&amp;/g, '&');
}

async function getWechatUrl(sogouLink) {
  const res = await fetch(`https://weixin.sogou.com${sogouLink}`, {
    headers: { 'User-Agent': SOGOU_UA },
  });
  const html = await res.text();
  const parts = [...html.matchAll(/url\s*\+=\s*'([^']*)'/g)].map(m => m[1]);
  return parts.join('');
}

async function getAccountInfo(wechatUrl) {
  const res = await fetch(wechatUrl, {
    headers: { 'User-Agent': WECHAT_UA },
  });
  const html = await res.text();

  const bizMatch = html.match(/var biz = "([^"]+)"/);
  const nickMatch = html.match(/var nickname = htmlDecode\("([^"]+)"\)/);
  const coverMatch = html.match(/var (?:cdn_url_1_1|ori_head_img_url)\s*=\s*"(http[^"]+)"/);
  const userMatch = html.match(/var user_name = "([^"]+)"/);

  if (!bizMatch || !nickMatch) return null;

  const biz = bizMatch[1];
  // Decode base64 biz to get numeric ID
  const numericId = Buffer.from(biz, 'base64').toString('utf8');

  return {
    id: `MP_WXS_${numericId}`,
    name: nickMatch[1],
    cover: coverMatch ? coverMatch[1].replace('/132', '/0') : '',
    biz,
    user_name: userMatch ? userMatch[1] : '',
  };
}

async function addFeed(info) {
  const res = await fetch(`${WEWE_URL}/trpc/feed.add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: AUTH_CODE,
    },
    body: JSON.stringify({
      id: info.id,
      mpName: info.name,
      mpCover: info.cover,
      mpIntro: '',
      updateTime: Math.floor(Date.now() / 1000),
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result?.data;
}

async function processAccount(name) {
  try {
    // Step 1: Search Sogou
    const sogouLink = await searchSogou(name);
    if (!sogouLink) throw new Error('搜狗搜索无结果');

    // Step 2: Get WeChat article URL
    await sleep(1000);
    const wechatUrl = await getWechatUrl(sogouLink);
    if (!wechatUrl || !wechatUrl.includes('mp.weixin')) throw new Error('无法提取微信URL');

    // Step 3: Get account info
    await sleep(500);
    const info = await getAccountInfo(wechatUrl);
    if (!info) throw new Error('无法获取公众号信息');

    // Step 4: Add feed
    const feed = await addFeed(info);
    return { name, success: true, id: feed.id, actualName: feed.mpName };
  } catch (err) {
    return { name, success: false, error: err.message };
  }
}

async function main() {
  console.log(`开始批量添加 ${ACCOUNTS.length} 个公众号...\n`);
  const results = [];

  for (let i = 0; i < ACCOUNTS.length; i++) {
    const name = ACCOUNTS[i];
    process.stdout.write(`[${i + 1}/${ACCOUNTS.length}] ${name}... `);
    const result = await processAccount(name);
    results.push(result);

    if (result.success) {
      console.log(`✓ ${result.actualName} (${result.id})`);
    } else {
      console.log(`✗ ${result.error}`);
    }

    // Rate limiting
    if (i < ACCOUNTS.length - 1) await sleep(2000);
  }

  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${success.length}`);
  console.log(`失败: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n失败列表:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }
}

main().catch(console.error);
