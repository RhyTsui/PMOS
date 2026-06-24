/**
 * GI 系统批量初始化脚本
 *
 * 分阶段执行：
 *   --phase sources   注册情报源（RSSHub + WeWe + 直连）
 *   --phase seeds     批量创建种子
 *   --phase profiles  创建画像
 *   --phase distill   批量蒸馏
 *   --phase all       全部执行
 *   --phase validate  验证源可用性
 *
 * 运行: npx tsx scripts/init-data.ts --phase sources
 */
import '../src/lib/load-env.js';
import { initializeDatabase, getDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { SeedRepository } from '../src/repositories/seed-repository.js';
import { RequirementProfileService } from '../src/services/profile/index.js';
import { RSSHubService } from '../src/services/rsshub/rsshub-service.js';
import { WeWeService } from '../src/services/wewe/wewe-service.js';
import type {
  IntelSource, SourceType, AccessMethod, Priority,
  SeedType, EventType,
} from '../src/models/types.js';

initializeDatabase();

const sourceRepo = new IntelSourceRepository();
const seedRepo = new SeedRepository();
const profileService = new RequirementProfileService();

// ===== 解析命令行 =====

const args = process.argv.slice(2);
let phase = 'all';
const phaseIdx = args.indexOf('--phase');
if (phaseIdx >= 0 && args[phaseIdx + 1]) {
  phase = args[phaseIdx + 1];
}

// ===== RSSHub 扩展路由 =====

const EXTRA_RSSHUB_ROUTES = [
  // TapTap 细分
  { path: '/taptap/topic/hot', name: 'TapTap-热门话题', sourceType: 'community' as SourceType, tags: ['TapTap', '社区', '热门'], priority: 'P0' as const },
  { path: '/taptap/review/hot', name: 'TapTap-热门评测', sourceType: 'community' as SourceType, tags: ['TapTap', '评测'], priority: 'P1' as const },
  { path: '/taptap/feed/hot', name: 'TapTap-热门动态', sourceType: 'community' as SourceType, tags: ['TapTap', '动态'], priority: 'P1' as const },
  // Steam
  { path: '/steam/news/cn', name: 'Steam-国区新闻', sourceType: 'official' as SourceType, tags: ['Steam', '新闻'], priority: 'P1' as const },
  // B站
  { path: '/bilibili/rank/0/3', name: 'B站-游戏区排行榜', sourceType: 'social' as SourceType, tags: ['B站', '游戏', '排行'], priority: 'P1' as const },
  { path: '/bilibili/hot-search', name: 'B站-热搜', sourceType: 'social' as SourceType, tags: ['B站', '热搜'], priority: 'P2' as const },
  // 游戏媒体
  { path: '/gamelook', name: 'GameLook-RSSHub', sourceType: 'media' as SourceType, tags: ['GameLook', '行业媒体'], priority: 'P0' as const },
  { path: '/youxituoluo', name: '游戏陀螺-RSSHub', sourceType: 'media' as SourceType, tags: ['游戏陀螺', '行业媒体'], priority: 'P0' as const },
  { path: '/youxiputao', name: '游戏葡萄-RSSHub', sourceType: 'media' as SourceType, tags: ['游戏葡萄', '行业媒体'], priority: 'P0' as const },
  // 机核
  { path: '/gcores/category/news', name: '机核-资讯', sourceType: 'media' as SourceType, tags: ['机核', '资讯'], priority: 'P1' as const },
  { path: '/gcores/category/article', name: '机核-文章', sourceType: 'media' as SourceType, tags: ['机核', '文章'], priority: 'P1' as const },
  // 游研社
  { path: '/yystv/category/recommend', name: '游研社-推荐', sourceType: 'media' as SourceType, tags: ['游研社', '推荐'], priority: 'P1' as const },
  // 触乐
  { path: '/chuapp/index/daily', name: '触乐-每日', sourceType: 'media' as SourceType, tags: ['触乐', '每日'], priority: 'P1' as const },
  // 36氪
  { path: '/36kr/motif/327685554177', name: '36氪-游戏', sourceType: 'media' as SourceType, tags: ['36氪', '游戏'], priority: 'P1' as const },
  // Epic
  { path: '/epicgames/freegames', name: 'Epic-免费游戏', sourceType: 'official' as SourceType, tags: ['Epic', '免费'], priority: 'P2' as const },
  // Nintendo
  { path: '/nintendo/eshop/jp', name: '任天堂-eShop日区', sourceType: 'official' as SourceType, tags: ['任天堂', 'eShop'], priority: 'P2' as const },
  { path: '/nintendo/eshop/us', name: '任天堂-eShop美区', sourceType: 'official' as SourceType, tags: ['任天堂', 'eShop'], priority: 'P2' as const },
  // PlayStation
  { path: '/psn/product/jp', name: 'PSN-日区', sourceType: 'official' as SourceType, tags: ['PlayStation', 'PSN'], priority: 'P2' as const },
  { path: '/psn/product/us', name: 'PSN-美区', sourceType: 'official' as SourceType, tags: ['PlayStation', 'PSN'], priority: 'P2' as const },
  // Xbox
  { path: '/xbox/games', name: 'Xbox-游戏', sourceType: 'official' as SourceType, tags: ['Xbox', '游戏'], priority: 'P2' as const },
  // 微博
  { path: '/weibo/search/hot', name: '微博-热搜', sourceType: 'social' as SourceType, tags: ['微博', '热搜'], priority: 'P2' as const },
];

// ===== 直连 RSS 源 =====

interface DirectSource {
  name: string;
  shortName: string;
  sourceType: SourceType;
  accessMethod: AccessMethod;
  baseUrl: string;
  feedUrl?: string;
  priority: Priority;
  tags: string[];
  cron: string;
}

const DIRECT_SOURCES: DirectSource[] = [
  // === 行业媒体 直连 RSS ===
  { name: 'GameLook', shortName: 'GL', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://www.gamelook.com.cn', feedUrl: 'https://www.gamelook.com.cn/feed', priority: 'P0', tags: ['行业', 'P0'], cron: '*/30 * * * *' },
  { name: '游戏葡萄', shortName: '葡萄', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://youxiputao.com', feedUrl: 'https://youxiputao.com/feed', priority: 'P0', tags: ['行业', '深度', 'P0'], cron: '*/30 * * * *' },
  { name: '游戏陀螺', shortName: '陀螺', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://youxituoluo.com', feedUrl: 'https://youxituoluo.com/feed', priority: 'P0', tags: ['行业', 'P0'], cron: '*/30 * * * *' },
  { name: '触乐', shortName: '触乐', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://www.chuapp.com', feedUrl: 'https://www.chuapp.com/feed', priority: 'P0', tags: ['深度报道', 'P0'], cron: '*/30 * * * *' },
  { name: '游研社', shortName: '游研', sourceType: 'community', accessMethod: 'rss', baseUrl: 'https://www.yystv.com', feedUrl: 'https://www.yystv.com/feed', priority: 'P1', tags: ['社区', 'P1'], cron: '*/30 * * * *' },
  { name: '游戏茶馆', shortName: '茶馆', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://youxichaguan.com', feedUrl: 'https://youxichaguan.com/feed', priority: 'P1', tags: ['行业', 'P1'], cron: '0 */6 * * *' },
  { name: '竞核', shortName: '竞核', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://www.cores.cn', feedUrl: 'https://www.cores.cn/feed', priority: 'P1', tags: ['行业研究', 'P1'], cron: '0 */6 * * *' },
  { name: '手游那点事', shortName: '手游那点事', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://shouyounadianshi.com', feedUrl: 'https://shouyounadianshi.com/feed', priority: 'P1', tags: ['手游', 'P1'], cron: '0 */6 * * *' },
  { name: '游戏干线', shortName: '干线', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://www.gameexpress.cn', feedUrl: 'https://www.gameexpress.cn/feed', priority: 'P1', tags: ['行业', 'P1'], cron: '0 */6 * * *' },
  { name: '罗斯基', shortName: '罗斯基', sourceType: 'media', accessMethod: 'rss', baseUrl: 'https://www.luosiji.com', feedUrl: 'https://www.luosiji.com/feed', priority: 'P2', tags: ['独立游戏', 'P2'], cron: '0 */12 * * *' },
  // === 公司官网 ===
  { name: '米哈游官网', shortName: '米哈游', sourceType: 'official', accessMethod: 'static_crawl', baseUrl: 'https://www.mihoyo.com', priority: 'P1', tags: ['公司', 'P1'], cron: '0 */6 * * *' },
  { name: '腾讯游戏官网', shortName: '腾讯游戏', sourceType: 'official', accessMethod: 'static_crawl', baseUrl: 'https://games.qq.com', priority: 'P1', tags: ['公司', '大厂', 'P1'], cron: '0 */6 * * *' },
  { name: '网易游戏官网', shortName: '网易游戏', sourceType: 'official', accessMethod: 'static_crawl', baseUrl: 'https://game.163.com', priority: 'P1', tags: ['公司', '大厂', 'P1'], cron: '0 */6 * * *' },
  // === 数据站 ===
  { name: '伽马数据', shortName: '伽马', sourceType: 'api', accessMethod: 'api', baseUrl: 'https://www.cngdata.com', priority: 'P1', tags: ['数据', 'P1'], cron: '0 */6 * * *' },
  { name: 'SensorTower', shortName: 'ST', sourceType: 'api', accessMethod: 'api', baseUrl: 'https://sensortower.com', priority: 'P1', tags: ['数据', '出海', 'P1'], cron: '0 */6 * * *' },
  { name: 'data.ai', shortName: 'data.ai', sourceType: 'api', accessMethod: 'api', baseUrl: 'https://www.data.ai', priority: 'P1', tags: ['数据', 'P1'], cron: '0 */6 * * *' },
];

// ===== WeWe 公众号（30分钟 cron）=====

const WEWE_URL = process.env.WEWE_BASE_URL || 'http://localhost:4000';

const WEWE_ACCOUNTS = [
  { id: 'gamelook', name: 'GameLook公众号', priority: 'P0' as const, tags: ['公众号', '行业媒体'] },
  { id: 'youxiputao', name: '游戏葡萄公众号', priority: 'P0' as const, tags: ['公众号', '行业媒体'] },
  { id: 'youxituoluo', name: '游戏陀螺公众号', priority: 'P0' as const, tags: ['公众号', '行业媒体'] },
  { id: 'chuapp', name: '触乐公众号', priority: 'P0' as const, tags: ['公众号', '深度报道'] },
  { id: 'yystv', name: '游研社公众号', priority: 'P1' as const, tags: ['公众号', '社区'] },
  { id: 'youxichaguan', name: '游戏茶馆公众号', priority: 'P1' as const, tags: ['公众号', '行业'] },
  { id: 'cores', name: '竞核公众号', priority: 'P1' as const, tags: ['公众号', '行业研究'] },
  { id: 'shouyounadianshi', name: '手游那点事公众号', priority: 'P1' as const, tags: ['公众号', '手游'] },
  { id: 'gcourses', name: '游戏开发者GAD', priority: 'P1' as const, tags: ['公众号', '开发者'] },
  { id: 'mihoyo', name: '米哈游公众号', priority: 'P1' as const, tags: ['公众号', '公司官方'] },
  { id: 'tencentgames', name: '腾讯游戏公众号', priority: 'P1' as const, tags: ['公众号', '公司官方'] },
  { id: 'neteasegames', name: '网易游戏公众号', priority: 'P1' as const, tags: ['公众号', '公司官方'] },
  { id: 'cngdata', name: '伽马数据公众号', priority: 'P1' as const, tags: ['公众号', '数据'] },
  { id: 'sensortower', name: 'SensorTower公众号', priority: 'P1' as const, tags: ['公众号', '数据'] },
  { id: 'dataai', name: 'data.ai公众号', priority: 'P1' as const, tags: ['公众号', '数据'] },
  { id: 'chuhai', name: '独立出海联合体', priority: 'P2' as const, tags: ['公众号', '出海'] },
  { id: 'shouzhuju', name: '手游矩阵公众号', priority: 'P2' as const, tags: ['公众号', '手游'] },
];

// ===== 辅助函数 =====

function safeCreateSource(def: {
  name: string;
  shortName: string;
  sourceType: SourceType;
  accessMethod: AccessMethod;
  baseUrl: string;
  feedUrl?: string;
  priority: Priority;
  tags: string[];
  cron: string;
}): boolean {
  // 去重：按 name 或 feedUrl
  const existing = sourceRepo.findAll();
  if (existing.some(s => s.name === def.name)) return false;
  if (def.feedUrl && existing.some(s => s.feedUrl === def.feedUrl)) return false;

  try {
    sourceRepo.create({
      name: def.name,
      shortName: def.shortName,
      sourceType: def.sourceType,
      accessMethod: def.accessMethod,
      baseUrl: def.baseUrl,
      feedUrl: def.feedUrl,
      enabled: true,
      priority: def.priority,
      tags: def.tags,
      config: {},
      schedule: { cron: def.cron, retryOnFail: true, maxRetries: 3 },
    } as any);
    return true;
  } catch {
    return false;
  }
}

// ===== 阶段执行 =====

async function phaseSources(): Promise<void> {
  console.log('\n========== 阶段 1：注册情报源 ==========\n');

  let ok = 0, skip = 0, fail = 0;

  // 1a. 直连 RSS 源
  console.log('📰 注册直连 RSS 源...');
  for (const def of DIRECT_SOURCES) {
    const result = safeCreateSource(def);
    if (result) { ok++; console.log(`  ✅ ${def.name}`); }
    else { skip++; }
  }

  // 1b. RSSHub 路由（通过本地 RSSHub 实例）
  console.log('\n🔌 注册 RSSHub 路由...');
  const rsshubService = new RSSHubService({ baseUrl: 'http://localhost:1200' });
  for (const route of EXTRA_RSSHUB_ROUTES) {
    const feedUrl = `http://localhost:1200${route.path}`;
    const result = safeCreateSource({
      name: route.name,
      shortName: route.name.substring(0, 10),
      sourceType: route.sourceType,
      accessMethod: 'rss',
      baseUrl: `http://localhost:1200${route.path.split('/').slice(0, 2).join('/')}`,
      feedUrl,
      priority: route.priority,
      tags: ['rsshub', ...route.tags],
      cron: route.priority === 'P0' ? '*/30 * * * *' : route.priority === 'P1' ? '0 */2 * * *' : '0 */6 * * *',
    });
    if (result) { ok++; console.log(`  ✅ ${route.name}`); }
    else { skip++; }
  }

  // 1c. WeWe 公众号
  console.log('\n💬 注册 WeWe 公众号（30分钟 cron）...');
  for (const acct of WEWE_ACCOUNTS) {
    const feedUrl = `${WEWE_URL}/feeds/${acct.id}.xml`;
    const result = safeCreateSource({
      name: acct.name,
      shortName: acct.name.substring(0, 10),
      sourceType: 'wechat_mp',
      accessMethod: 'rss',
      baseUrl: 'https://mp.weixin.qq.com',
      feedUrl,
      priority: acct.priority,
      tags: ['wewe', 'wechat', ...acct.tags],
      cron: '*/30 * * * *',
    });
    if (result) { ok++; console.log(`  ✅ ${acct.name}`); }
    else { skip++; }
  }

  // 总结
  const total = sourceRepo.findAll().length;
  const enabled = sourceRepo.findEnabled().length;
  console.log(`\n📊 情报源注册完成: 新增 ${ok}, 跳过 ${skip}, 总计 ${total} (启用 ${enabled})`);
}

async function phaseValidate(): Promise<void> {
  console.log('\n========== 阶段：验证源可用性 ==========\n');

  const sources = sourceRepo.findEnabled();
  let healthy = 0, unhealthy = 0;

  for (const source of sources) {
    const url = source.feedUrl || source.baseUrl;
    if (!url) { unhealthy++; continue; }

    try {
      const response = await fetch(url, {
        method: source.accessMethod === 'rss' ? 'GET' : 'HEAD',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'GI-HealthCheck/1.0' },
      });

      if (response.ok) {
        healthy++;
      } else {
        unhealthy++;
        console.log(`  ❌ ${source.name}: HTTP ${response.status}`);
        sourceRepo.update(source.id, { enabled: false });
      }
    } catch {
      unhealthy++;
      console.log(`  ❌ ${source.name}: 不可达`);
      sourceRepo.update(source.id, { enabled: false });
    }
  }

  console.log(`\n📊 验证完成: ${healthy} 可用, ${unhealthy} 不可用 (已自动禁用)`);
}

async function phaseSeeds(): Promise<void> {
  console.log('\n========== 阶段 2：批量创建种子 ==========\n');

  const { GAME_ENTITIES, COMPANY_ENTITIES, PLATFORM_ENTITIES, EVENT_SEEDS, TOPIC_SEEDS, SOURCE_SEEDS } = await import('./data/seed-data.js');

  let ok = 0, skip = 0;
  const db = getDatabase();

  // 实体种子 - 游戏
  console.log('🎮 创建游戏实体种子...');
  for (const def of GAME_ENTITIES) {
    try {
      const existing = db.prepare("SELECT id FROM seeds WHERE text = ? AND seed_type = 'entity'").get(def.text);
      if (existing) { skip++; continue; }
      db.prepare(`INSERT INTO seeds (id, seed_type, text, score, status, entity_type, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
        VALUES (?, 'entity', ?, ?, 'active', 'game', ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`)
        .run(crypto.randomUUID(), def.text, def.score, JSON.stringify(def.aliases), def.category, def.market, JSON.stringify(def.tags));
      ok++;
    } catch { skip++; }
  }

  // 实体种子 - 公司
  console.log('🏢 创建公司实体种子...');
  for (const def of COMPANY_ENTITIES) {
    try {
      const existing = db.prepare("SELECT id FROM seeds WHERE text = ? AND seed_type = 'entity'").get(def.text);
      if (existing) { skip++; continue; }
      db.prepare(`INSERT INTO seeds (id, seed_type, text, score, status, entity_type, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
        VALUES (?, 'entity', ?, ?, 'active', 'company', ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`)
        .run(crypto.randomUUID(), def.text, def.score, JSON.stringify(def.aliases), def.category, def.market, JSON.stringify(def.tags));
      ok++;
    } catch { skip++; }
  }

  // 实体种子 - 平台
  console.log('🖥️ 创建平台实体种子...');
  for (const def of PLATFORM_ENTITIES) {
    try {
      const existing = db.prepare("SELECT id FROM seeds WHERE text = ? AND seed_type = 'entity'").get(def.text);
      if (existing) { skip++; continue; }
      db.prepare(`INSERT INTO seeds (id, seed_type, text, score, status, entity_type, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
        VALUES (?, 'entity', ?, ?, 'active', 'platform', ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`)
        .run(crypto.randomUUID(), def.text, def.score, JSON.stringify(def.aliases), def.category, def.market, JSON.stringify(def.tags));
      ok++;
    } catch { skip++; }
  }

  // 事件种子
  console.log('📅 创建事件种子...');
  for (const def of EVENT_SEEDS) {
    try {
      const existing = db.prepare("SELECT id FROM seeds WHERE text = ? AND seed_type = 'event'").get(def.text);
      if (existing) { skip++; continue; }
      db.prepare(`INSERT INTO seeds (id, seed_type, text, score, status, event_type, keywords, tags, discovery_count, fail_count, created_at, updated_at)
        VALUES (?, 'event', ?, ?, 'active', ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`)
        .run(crypto.randomUUID(), def.text, def.score, def.eventType, JSON.stringify(def.keywords), JSON.stringify(def.tags));
      ok++;
    } catch { skip++; }
  }

  // 话题种子
  console.log('💡 创建话题种子...');
  for (const def of TOPIC_SEEDS) {
    try {
      const existing = db.prepare("SELECT id FROM seeds WHERE text = ? AND seed_type = 'topic'").get(def.text);
      if (existing) { skip++; continue; }
      db.prepare(`INSERT INTO seeds (id, seed_type, text, score, status, topic_tag, tags, category, discovery_count, fail_count, created_at, updated_at)
        VALUES (?, 'topic', ?, ?, 'active', ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`)
        .run(crypto.randomUUID(), def.text, def.score, def.topicTag, JSON.stringify(def.tags), def.category);
      ok++;
    } catch { skip++; }
  }

  // 源种子
  console.log('🔍 创建源种子...');
  for (const def of SOURCE_SEEDS) {
    try {
      const existing = db.prepare("SELECT id FROM seeds WHERE text = ? AND seed_type = 'source'").get(def.text);
      if (existing) { skip++; continue; }
      db.prepare(`INSERT INTO seeds (id, seed_type, text, score, status, entity_type, discovery_url, discovery_method, verified, tags, discovery_count, fail_count, created_at, updated_at)
        VALUES (?, 'source', ?, ?, 'active', ?, ?, ?, 0, ?, 0, 0, datetime('now'), datetime('now'))`)
        .run(crypto.randomUUID(), def.text, def.score, def.sourceType, def.discoveryUrl || null, def.discoveryMethod, JSON.stringify(def.tags));
      ok++;
    } catch { skip++; }
  }

  const totalSeeds = db.prepare('SELECT COUNT(*) as c FROM seeds').get() as any;
  console.log(`\n📊 种子创建完成: 新增 ${ok}, 跳过 ${skip}, 总计 ${totalSeeds.c}`);
}

async function phaseProfiles(): Promise<void> {
  console.log('\n========== 阶段 3：创建画像 ==========\n');

  const existing = profileService.listActive();
  if (existing.some(p => p.name === '游戏行业日报')) {
    console.log('  ⏭️ 游戏行业日报画像已存在');
  } else {
    try {
      const p = profileService.createProfile({
        name: '游戏行业日报',
        owner: 'xiaoqiao',
        purpose: ['daily_digest'],
        focusTopics: ['版号', '新游上线', '融资', '出海', 'AI应用', '买量', '小游戏', '广告投放'],
        entities: {
          companies: ['米哈游', '腾讯', '网易', '莉莉丝', '鹰角', '叠纸', '库洛', '三七互娱', '完美世界', '心动'],
          products: ['原神', '崩铁', '王者荣耀', '明日方舟', '鸣潮', '绝区零', '蛋仔派对'],
          platforms: ['TapTap', 'Steam', 'B站'],
        },
        deliveryPolicy: { format: 'daily_digest' as any, frequency: 'daily', channels: ['api', 'dataki'] },
      });
      console.log(`  ✅ 游戏行业日报画像: ${(p as any).id}`);
    } catch (e) {
      console.warn(`  ❌ ${(e as Error).message}`);
    }
  }

  if (existing.some(p => p.name === '广告投放情报')) {
    console.log('  ⏭️ 广告投放情报画像已存在');
  } else {
    try {
      const p = profileService.createProfile({
        name: '广告投放情报',
        owner: 'xiaoqiao',
        purpose: ['advertising'],
        focusTopics: ['买量', '广告素材创意', '巨量广告', '腾讯广告', '快手广告', '磁力引擎', '游戏买量', '广告投放'],
        entities: {
          companies: ['三七互娱', '莉莉丝', 'IGG', '沐瞳', '字节跳动', '腾讯'],
          products: [],
          platforms: ['巨量引擎', '腾讯广告', '快手磁力'],
        },
        deliveryPolicy: { format: 'daily_digest' as any, frequency: 'daily', channels: ['api'] },
      });
      console.log(`  ✅ 广告投放情报画像: ${(p as any).id}`);
    } catch (e) {
      console.warn(`  ❌ ${(e as Error).message}`);
    }
  }

  if (existing.some(p => p.name === '出海情报')) {
    console.log('  ⏭️ 出海情报画像已存在');
  } else {
    try {
      const p = profileService.createProfile({
        name: '出海情报',
        owner: 'xiaoqiao',
        purpose: ['overseas'],
        focusTopics: ['出海', '全球化', '日韩出海', '东南亚出海', '欧美出海'],
        entities: {
          companies: ['米哈游', '莉莉丝', 'IGG', '沐瞳', 'FunPlus', 'Yostar'],
          products: ['原神', '崩坏：星穹铁道', 'PUBG Mobile'],
          platforms: ['App Store', 'Google Play'],
        },
        deliveryPolicy: { format: 'daily_digest' as any, frequency: 'daily', channels: ['api'] },
      });
      console.log(`  ✅ 出海情报画像: ${(p as any).id}`);
    } catch (e) {
      console.warn(`  ❌ ${(e as Error).message}`);
    }
  }

  if (existing.some(p => p.name === '产品动态')) {
    console.log('  ⏭️ 产品动态画像已存在');
  } else {
    try {
      const p = profileService.createProfile({
        name: '产品动态',
        owner: 'xiaoqiao',
        purpose: ['product'],
        focusTopics: ['版本更新', '新游上线', '新游测试', '新游预约'],
        entities: {
          companies: ['米哈游', '腾讯', '网易', '鹰角', '叠纸', '库洛'],
          products: ['原神', '崩铁', '绝区零', '王者荣耀', '明日方舟', '鸣潮'],
          platforms: ['TapTap', 'Steam'],
        },
        deliveryPolicy: { format: 'daily_digest' as any, frequency: 'daily', channels: ['api'] },
      });
      console.log(`  ✅ 产品动态画像: ${(p as any).id}`);
    } catch (e) {
      console.warn(`  ❌ ${(e as Error).message}`);
    }
  }
}

async function phaseDistill(): Promise<void> {
  console.log('\n========== 阶段 4：批量蒸馏 ==========\n');
  console.log('（需先完成 P0/P1，蒸馏将使用话题种子列表）');
  console.log('（待实现：170 话题 × 6 任务类型 = 1020 次 LLM 调用）');
}

// ===== 主流程 =====

async function main(): Promise<void> {
  console.log('==========================================');
  console.log('  GI 系统批量初始化');
  console.log(`  阶段: ${phase}`);
  console.log('==========================================');

  switch (phase) {
    case 'sources':
      await phaseSources();
      break;
    case 'validate':
      await phaseValidate();
      break;
    case 'seeds':
      await phaseSeeds();
      break;
    case 'profiles':
      await phaseProfiles();
      break;
    case 'distill':
      await phaseDistill();
      break;
    case 'all':
      await phaseSources();
      await phaseValidate();
      await phaseProfiles();
      await phaseSeeds();
      await phaseDistill();
      break;
    default:
      console.error(`未知阶段: ${phase}`);
      console.log('可用阶段: sources, validate, seeds, profiles, distill, all');
      process.exit(1);
  }

  console.log('\n==========================================');
  console.log('  完成！');
  console.log('==========================================');
}

main().catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
