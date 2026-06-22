/**
 * Expand intel_sources and seeds to 1000+ rows each.
 *
 * The generated rows are deterministic and idempotent. Most source rows are
 * search-monitor sources: they represent configured collection queries rather
 * than hand-verified RSS feeds, so they are inserted with P2/P3 priorities.
 */
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';

type SourceType = 'media' | 'community' | 'official' | 'social' | 'wechat_mp' | 'forum' | 'api';
type AccessMethod = 'rss' | 'api' | 'static_crawl' | 'dynamic' | 'search';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type SeedType = 'entity' | 'event' | 'topic' | 'source';

interface SourceInput {
  name: string;
  shortName: string;
  sourceType: SourceType;
  accessMethod: AccessMethod;
  baseUrl: string;
  feedUrl?: string;
  config: Record<string, unknown>;
  schedule: { cron: string; retryOnFail: boolean; maxRetries: number; backoffMinutes: number };
  enabled: boolean;
  priority: Priority;
  tags: string[];
}

interface SeedInput {
  seedType: SeedType;
  text: string;
  score: number;
  tags: string[];
  entityType?: 'game' | 'company' | 'person' | 'brand' | 'ip';
  aliases?: string[];
  category?: string;
  market?: string;
  eventType?: string;
  keywords?: string[];
  topicTag?: string;
  relatedEntities?: string[];
  sourceType?: SourceType;
  discoveryUrl?: string;
  discoveryMethod?: string;
  verified?: boolean;
}

const regions = ['国内', '全球', '日本', '韩国', '东南亚', '欧美', '港澳台', '印度', '拉美', '中东'];
const platforms = ['App Store', 'Google Play', 'Steam', 'TapTap', 'B站', '抖音', '快手', '微博', 'Reddit', 'YouTube'];
const genres = ['二次元', 'SLG', '开放世界', '小游戏', '女性向', '射击', 'MOBA', 'RPG', '卡牌', '休闲', '模拟经营', '体育竞速'];
const signals = ['新游上线', '测试招募', '版号获批', '买量投放', '榜单异动', '用户舆情', '版本更新', '出海发行', '商业化调整', '融资并购'];
const companyKinds = ['游戏工作室', '互动娱乐', '数字娱乐', '发行公司', '研发团队', '游戏平台'];
const mediaKinds = ['行业媒体', '社区论坛', '官方公告', '数据榜单', '社媒热榜', '开发者社区'];
const knownSources = [
  ['GameLook', 'https://www.gamelook.com.cn', 'media', 'static_crawl', 'P0'],
  ['游戏葡萄', 'https://youxiputao.com', 'media', 'static_crawl', 'P0'],
  ['游戏陀螺', 'https://www.youxituoluo.com', 'media', 'static_crawl', 'P0'],
  ['触乐', 'https://www.chuapp.com', 'media', 'static_crawl', 'P0'],
  ['游研社', 'https://www.yystv.cn', 'media', 'static_crawl', 'P1'],
  ['机核', 'https://www.gcores.com', 'community', 'static_crawl', 'P1'],
  ['TapTap', 'https://www.taptap.cn', 'community', 'dynamic', 'P0'],
  ['Steam News', 'https://store.steampowered.com/news', 'official', 'static_crawl', 'P1'],
  ['IGN', 'https://www.ign.com', 'media', 'static_crawl', 'P1'],
  ['GamesIndustry.biz', 'https://www.gamesindustry.biz', 'media', 'static_crawl', 'P0'],
  ['Game Developer', 'https://www.gamedeveloper.com', 'media', 'static_crawl', 'P0'],
  ['Sensor Tower', 'https://sensortower.com', 'api', 'api', 'P0'],
  ['data.ai', 'https://www.data.ai', 'api', 'api', 'P0'],
  ['伽马数据', 'https://www.cgigc.com.cn', 'api', 'static_crawl', 'P0'],
  ['国家新闻出版署', 'https://www.nppa.gov.cn', 'official', 'static_crawl', 'P0'],
] as const;

const scheduleByPriority: Record<Priority, SourceInput['schedule']> = {
  P0: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
  P1: { cron: '0 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 10 },
  P2: { cron: '0 */2 * * *', retryOnFail: true, maxRetries: 2, backoffMinutes: 15 },
  P3: { cron: '0 */6 * * *', retryOnFail: true, maxRetries: 1, backoffMinutes: 30 },
};

const sourceTypeByMediaKind: Record<string, SourceType> = {
  行业媒体: 'media',
  社区论坛: 'community',
  官方公告: 'official',
  数据榜单: 'api',
  社媒热榜: 'social',
  开发者社区: 'forum',
};

function shortName(input: string, index: number): string {
  const ascii = input.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
  return `${ascii || 'SRC'}${String(index).padStart(4, '0')}`.slice(0, 16);
}

function priorityFor(index: number): Priority {
  if (index % 19 === 0) return 'P1';
  if (index % 7 === 0) return 'P2';
  return 'P3';
}

function buildSources(target: number): SourceInput[] {
  const sources: SourceInput[] = knownSources.map(([name, url, sourceType, accessMethod, priority], index) => ({
    name,
    shortName: shortName(name, index + 1),
    sourceType: sourceType as SourceType,
    accessMethod: accessMethod as AccessMethod,
    baseUrl: url,
    config: { curated: true },
    schedule: scheduleByPriority[priority as Priority],
    enabled: true,
    priority: priority as Priority,
    tags: ['game-intel', 'curated', priority],
  }));

  let index = sources.length;
  outer: for (const region of regions) {
    for (const platform of platforms) {
      for (const genre of genres) {
        for (const signal of signals) {
          for (const mediaKind of mediaKinds) {
            index += 1;
            const priority = priorityFor(index);
            const sourceType = sourceTypeByMediaKind[mediaKind] || 'api';
            const query = `${region} ${platform} ${genre} ${signal} 游戏`;
            const name = `搜索监控-${region}-${platform}-${genre}-${signal}-${mediaKind}`;
            sources.push({
              name,
              shortName: shortName(name, index),
              sourceType,
              accessMethod: 'search',
              baseUrl: 'https://www.bing.com/search',
              config: {
                query,
                engine: 'bing',
                locale: region,
                platform,
                genre,
                signal,
                mediaKind,
              },
              schedule: scheduleByPriority[priority],
              enabled: true,
              priority,
              tags: ['game-intel', 'auto-expanded', region, platform, genre, signal, mediaKind],
            });
            if (sources.length >= target) break outer;
          }
        }
      }
    }
  }

  return sources;
}

function buildSeeds(target: number, sourceNames: string[]): SeedInput[] {
  const seeds: SeedInput[] = [];

  const knownCompanies = ['腾讯游戏', '网易游戏', '米哈游', '莉莉丝', '三七互娱', '完美世界', '巨人网络', '心动网络', '鹰角网络', '叠纸游戏', '任天堂', '索尼 PlayStation', '微软 Xbox', 'Valve', 'Epic Games', 'EA', '育碧', '动视暴雪', '卡普空', 'Krafton'];
  for (const company of knownCompanies) {
    seeds.push({ seedType: 'entity', text: company, score: 70, entityType: 'company', aliases: [company], category: '游戏公司', market: '全球', tags: ['auto-expanded', 'company'] });
  }

  for (const region of regions) {
    for (const genre of genres) {
      for (const kind of companyKinds) {
        const text = `${region}${genre}${kind}`;
        seeds.push({ seedType: 'entity', text, score: 45, entityType: 'company', aliases: [text], category: kind, market: region, tags: ['auto-expanded', 'company', region, genre] });
      }
    }
  }

  for (const region of regions) {
    for (const genre of genres) {
      for (const platform of platforms) {
        const text = `${region}${genre}${platform}重点产品`;
        seeds.push({ seedType: 'entity', text, score: 50, entityType: 'game', aliases: [`${genre}${platform}`, text], category: genre, market: region, tags: ['auto-expanded', 'game', region, genre, platform] });
      }
    }
  }

  for (const region of regions) {
    for (const genre of genres) {
      seeds.push({ seedType: 'topic', text: `${region}${genre}品类趋势`, score: 55, topicTag: `${region}-${genre}`, relatedEntities: [genre], tags: ['auto-expanded', 'topic', region, genre] });
      seeds.push({ seedType: 'topic', text: `${region}${genre}商业化变化`, score: 55, topicTag: `${region}-${genre}-商业化`, relatedEntities: [genre], tags: ['auto-expanded', 'topic', '商业化'] });
    }
  }

  for (const region of regions) {
    for (const genre of genres) {
      for (const signal of signals) {
        seeds.push({ seedType: 'event', text: `${region}${genre}${signal}`, score: 60, eventType: normalizeEventType(signal), keywords: [region, genre, signal], tags: ['auto-expanded', 'event', region, genre, signal] });
      }
    }
  }

  for (const sourceName of sourceNames.slice(0, 350)) {
    seeds.push({ seedType: 'source', text: sourceName, score: 50, sourceType: 'api', aliases: [sourceName], category: '信源监控', market: '全球', discoveryMethod: 'auto-expanded', verified: false, tags: ['auto-expanded', 'source'] });
  }

  return seeds.slice(0, Math.max(target, 1000));
}

function normalizeEventType(signal: string): string {
  if (signal.includes('上线')) return '上线';
  if (signal.includes('测试')) return '测试';
  if (signal.includes('版号')) return '版号';
  if (signal.includes('买量')) return '买量';
  if (signal.includes('榜单')) return '榜单变化';
  if (signal.includes('舆情')) return '舆情';
  if (signal.includes('出海')) return '出海';
  if (signal.includes('版本')) return '版本更新';
  return '合作';
}

function main(): void {
  initializeDatabase();
  const db = getDatabase();

  const sourceCount = (db.prepare('SELECT count(*) as c FROM intel_sources').get() as { c: number }).c;
  const seedCount = (db.prepare('SELECT count(*) as c FROM seeds').get() as { c: number }).c;
  const sourceTarget = Math.max(1000, sourceCount + 1000);
  const seedTarget = Math.max(1000, seedCount + 1000);

  const existingSourceNames = new Set((db.prepare('SELECT name FROM intel_sources').all() as Array<{ name: string }>).map((r) => r.name));
  const existingSeedKeys = new Set((db.prepare('SELECT seed_type, text FROM seeds').all() as Array<{ seed_type: string; text: string }>).map((r) => `${r.seed_type}:${r.text}`));

  const sources = buildSources(sourceTarget);
  const seedInputs = buildSeeds(seedTarget, sources.map((s) => s.name));

  const insertSource = db.prepare(`
    INSERT INTO intel_sources (
      id, name, short_name, source_type, access_method, base_url, feed_url,
      config, schedule, enabled, priority, tags, created_at, updated_at
    ) VALUES (
      @id, @name, @short_name, @source_type, @access_method, @base_url, @feed_url,
      @config, @schedule, @enabled, @priority, @tags, datetime('now'), datetime('now')
    )
  `);

  const insertSeed = db.prepare(`
    INSERT INTO seeds (
      id, seed_type, text, score, status,
      entity_type, aliases, category, market,
      event_type, keywords,
      topic_tag, related_entities,
      discovery_url, discovery_method, verified,
      tags, discovery_count, fail_count, created_at, updated_at
    ) VALUES (
      @id, @seed_type, @text, @score, 'active',
      @entity_type, @aliases, @category, @market,
      @event_type, @keywords,
      @topic_tag, @related_entities,
      @discovery_url, @discovery_method, @verified,
      @tags, 0, 0, datetime('now'), datetime('now')
    )
  `);

  let insertedSources = 0;
  let insertedSeeds = 0;

  const insertAll = db.transaction(() => {
    for (const source of sources) {
      if (existingSourceNames.has(source.name)) continue;
      const result = insertSource.run({
        id: uuidv4(),
        name: source.name,
        short_name: source.shortName,
        source_type: source.sourceType,
        access_method: source.accessMethod,
        base_url: source.baseUrl,
        feed_url: source.feedUrl ?? null,
        config: JSON.stringify(source.config),
        schedule: JSON.stringify(source.schedule),
        enabled: source.enabled ? 1 : 0,
        priority: source.priority,
        tags: JSON.stringify(source.tags),
      });
      if (result.changes > 0) insertedSources += 1;
    }

    for (const seed of seedInputs) {
      const key = `${seed.seedType}:${seed.text}`;
      if (existingSeedKeys.has(key)) continue;
      const result = insertSeed.run({
        id: uuidv4(),
        seed_type: seed.seedType,
        text: seed.text,
        score: seed.score,
        entity_type: seed.seedType === 'source' ? seed.sourceType ?? 'api' : seed.entityType ?? null,
        aliases: JSON.stringify(seed.aliases ?? []),
        category: seed.category ?? null,
        market: seed.market ?? null,
        event_type: seed.eventType ?? null,
        keywords: JSON.stringify(seed.keywords ?? []),
        topic_tag: seed.topicTag ?? null,
        related_entities: JSON.stringify(seed.relatedEntities ?? []),
        discovery_url: seed.discoveryUrl ?? null,
        discovery_method: seed.discoveryMethod ?? null,
        verified: seed.verified ? 1 : 0,
        tags: JSON.stringify(seed.tags),
      });
      if (result.changes > 0) insertedSeeds += 1;
    }
  });

  insertAll();

  const finalSources = (db.prepare('SELECT count(*) as c FROM intel_sources').get() as { c: number }).c;
  const finalSeeds = (db.prepare('SELECT count(*) as c FROM seeds').get() as { c: number }).c;
  console.log(JSON.stringify({ insertedSources, insertedSeeds, finalSources, finalSeeds }, null, 2));

  console.log('sources by type');
  for (const row of db.prepare('SELECT source_type, access_method, count(*) as c FROM intel_sources GROUP BY source_type, access_method ORDER BY c DESC').all() as Array<{ source_type: string; access_method: string; c: number }>) {
    console.log(`${row.source_type}/${row.access_method}: ${row.c}`);
  }

  console.log('seeds by type');
  for (const row of db.prepare('SELECT seed_type, count(*) as c FROM seeds GROUP BY seed_type ORDER BY c DESC').all() as Array<{ seed_type: string; c: number }>) {
    console.log(`${row.seed_type}: ${row.c}`);
  }

  closeDatabase();
}

main();