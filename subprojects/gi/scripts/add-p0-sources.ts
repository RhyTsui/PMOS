/**
 * 添加已验证可用的 P0 游戏行业 RSS 源
 */
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';

// 已验证可用的 P0 源
const AVAILABLE_P0_SOURCES = [
  {
    name: '游戏茶馆',
    shortName: 'YXC',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://youxichaguan.com',
    feedUrl: 'https://youxichaguan.com/feed',
    priority: 'P0',
    tags: ['游戏行业', '行业资讯'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '游戏陀螺',
    shortName: 'YXL',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://youxituoluo.com',
    feedUrl: 'https://youxituoluo.com/feed',
    priority: 'P0',
    tags: ['游戏行业', '数据分析'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '触乐',
    shortName: 'CL',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://www.chuapp.com',
    feedUrl: 'https://www.chuapp.com/feed',
    priority: 'P0',
    tags: ['游戏行业', '游戏评测'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: 'Steam-热门',
    shortName: 'STEAM',
    sourceType: 'official',
    accessMethod: 'rss',
    baseUrl: 'https://store.steampowered.com',
    feedUrl: 'https://store.steampowered.com/feeds/news/',
    priority: 'P0',
    tags: ['游戏平台', 'PC游戏'],
    schedule: { cron: '*/15 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
  {
    name: '少数派',
    shortName: 'SSP',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://sspai.com',
    feedUrl: 'https://sspai.com/feed',
    priority: 'P1',
    tags: ['科技媒体', '游戏相关'],
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  },
];

async function addAvailableP0Sources() {
  console.log('=== 添加已验证可用的 P0 游戏行业 RSS 源 ===\n');

  initializeDatabase();
  const repo = new IntelSourceRepository();

  let added = 0;
  let skipped = 0;

  for (const sourceConfig of AVAILABLE_P0_SOURCES) {
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
    }
  }

  console.log('\n=== 统计 ===');
  console.log(`添加: ${added}`);
  console.log(`跳过: ${skipped}`);
  console.log(`总计: ${AVAILABLE_P0_SOURCES.length}`);

  closeDatabase();
}

addAvailableP0Sources().catch(console.error);
