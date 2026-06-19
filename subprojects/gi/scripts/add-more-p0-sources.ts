/**
 * 添加更多 P0 游戏行业情报源
 * 根据 IMPLEMENTATION_PLAN.md，P0 源应包括：TapTap + GameLook + Steam + 版号 + 公众号
 */
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';

// 需要添加的 P0 源
const P0_SOURCES = [
  // === 游戏行业媒体 ===
  {
    name: '游戏葡萄',
    shortName: 'YXPT',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://youxiputao.com',
    feedUrl: 'https://youxiputao.com/feed',
    priority: 'P0',
    tags: ['游戏行业', '产品分析'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '竞核',
    shortName: 'JH',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://www.coresgames.com',
    feedUrl: 'https://www.coresgames.com/feed',
    priority: 'P0',
    tags: ['游戏行业', '深度分析'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '手游那点事',
    shortName: 'SYNDS',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://www.shouyounaxieshi.com',
    feedUrl: 'https://www.shouyounaxieshi.com/feed',
    priority: 'P0',
    tags: ['游戏行业', '手游分析'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '游戏干线',
    shortName: 'YXGX',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://www.youxiguanxian.com',
    feedUrl: 'https://www.youxiguanxian.com/feed',
    priority: 'P0',
    tags: ['游戏行业', '发行运营'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '36氪-游戏',
    shortName: '36KR-GAME',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://36kr.com',
    feedUrl: 'https://36kr.com/feed/game',
    priority: 'P0',
    tags: ['游戏行业', '投融资'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  // === 官方/权威源 ===
  {
    name: '游戏产业网',
    shortName: 'YXCY',
    sourceType: 'official',
    accessMethod: 'rss',
    baseUrl: 'http://www.gameindustry.cn',
    feedUrl: 'http://www.gameindustry.cn/feed',
    priority: 'P0',
    tags: ['官方', '产业报告'],
    schedule: { cron: '0 */2 * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '中国音数协-版号',
    shortName: 'BANHAO',
    sourceType: 'official',
    accessMethod: 'rss',
    baseUrl: 'https://www.cgpa.org.cn',
    feedUrl: 'https://www.cgpa.org.cn/feed',
    priority: 'P0',
    tags: ['版号', '政策'],
    schedule: { cron: '0 */4 * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  // === 平台源 ===
  {
    name: 'TapTap-热门',
    shortName: 'TAPTAP',
    sourceType: 'community',  // 改为 community
    accessMethod: 'rss',
    baseUrl: 'https://www.taptap.cn',
    feedUrl: 'https://www.taptap.cn/feed/hot',
    priority: 'P0',
    tags: ['游戏平台', '手游'],
    schedule: { cron: '*/15 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: 'Epic-免费游戏',
    shortName: 'EPIC',
    sourceType: 'official',  // 改为 official
    accessMethod: 'rss',
    baseUrl: 'https://store.epicgames.com',
    feedUrl: 'https://store.epicgames.com/feeds/news',
    priority: 'P0',
    tags: ['游戏平台', 'PC游戏'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  // === 国际源 ===
  {
    name: 'IGN',
    shortName: 'IGN',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://www.ign.com',
    feedUrl: 'https://feeds.feedburner.com/ign/all',
    priority: 'P0',
    tags: ['国际', '游戏评测'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: 'Kotaku',
    shortName: 'KOTAKU',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://kotaku.com',
    feedUrl: 'https://kotaku.com/rss',
    priority: 'P0',
    tags: ['国际', '游戏新闻'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: 'GamesIndustry.biz',
    shortName: 'GIB',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://www.gamesindustry.biz',
    feedUrl: 'https://www.gamesindustry.biz/feed',
    priority: 'P0',
    tags: ['国际', '行业动态'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
];

async function addP0Sources() {
  console.log('=== 添加更多 P0 游戏行业情报源 ===\n');

  initializeDatabase();
  const repo = new IntelSourceRepository();

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const sourceConfig of P0_SOURCES) {
    try {
      // 检查是否已存在
      const existing = repo.findByName(sourceConfig.name);
      if (existing) {
        console.log(`⏭️  ${sourceConfig.name} 已存在，跳过`);
        skipped++;
        continue;
      }

      // 创建新源
      repo.create({
        ...sourceConfig,
        enabled: true,
        config: {},
      } as any);

      console.log(`✅ 添加成功: ${sourceConfig.name}`);
      added++;
    } catch (error) {
      console.error(`❌ 添加失败: ${sourceConfig.name}`, error);
      failed++;
    }
  }

  console.log('\n=== 统计 ===');
  console.log(`添加: ${added}`);
  console.log(`跳过: ${skipped}`);
  console.log(`失败: ${failed}`);
  console.log(`总计: ${P0_SOURCES.length}`);

  // 显示当前所有 P0 源
  console.log('\n=== 当前所有 P0 源 ===');
  const allP0 = repo.findByPriority('P0');
  allP0.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (${s.shortName}) - ${s.accessMethod}`);
  });

  closeDatabase();
}

addP0Sources().catch(console.error);
