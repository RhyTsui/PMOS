/**
 * 测试 RSS 源可用性
 */
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
});

// 要测试的 RSS 源
const RSS_FEEDS = [
  { name: 'GameLook', url: 'https://www.gamelook.com.cn/feed' },
  { name: '游戏葡萄', url: 'https://youxiputao.com/feed' },
  { name: '游戏茶馆', url: 'https://youxichaguan.com/feed' },
  { name: '游戏陀螺', url: 'https://youxituoluo.com/feed' },
  { name: '手游那点事', url: 'https://youximingtang.com/feed' },
  { name: '游研社', url: 'https://www.yystudio.com/feed' },
  { name: '竞核', url: 'https://www.coresgames.com/feed' },
  { name: '游戏新知', url: 'https://youxixinzhi.com/feed' },
  { name: '36氪-游戏', url: 'https://36kr.com/feed/games' },
  { name: '触乐', url: 'https://www.chuapp.com/feed' },
  { name: 'TapTap-热门', url: 'https://www.taptap.cn/top/hot/feed' },
  { name: 'Steam-热门', url: 'https://store.steampowered.com/feeds/news/' },
  { name: '少数派', url: 'https://sspai.com/feed' }, // 已验证可用
];

async function testFeed(feed: { name: string; url: string }) {
  try {
    const result = await parser.parseURL(feed.url);
    const itemCount = result.items?.length || 0;
    console.log(`✅ ${feed.name.padEnd(15)} | ${itemCount.toString().padStart(3)} 条 | ${feed.url}`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    console.log(`❌ ${feed.name.padEnd(15)} | 失败 | ${msg}`);
    return false;
  }
}

async function main() {
  console.log('=== 测试 RSS 源可用性 ===\n');

  const results: Array<{ name: string; url: string; success: boolean }> = [];

  for (const feed of RSS_FEEDS) {
    const success = await testFeed(feed);
    results.push({ ...feed, success });
    // 添加延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n=== 统计 ===');
  const successCount = results.filter(r => r.success).length;
  console.log(`可用: ${successCount}/${results.length}`);

  console.log('\n=== 可用源列表 ===');
  results.filter(r => r.success).forEach(r => {
    console.log(`- ${r.name}: ${r.url}`);
  });
}

main().catch(console.error);
