/**
 * 数据库连接管理
 *
 * 使用 better-sqlite3 同步 API，简单高效
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/gi.db');

let db: Database.Database | null = null;

/**
 * 获取数据库实例（单例）
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);

    // 启用 WAL 模式（并发读写性能更好）
    db.pragma('journal_mode = WAL');
    // 启用外键约束
    db.pragma('foreign_keys = ON');

    console.log(`[DB] 数据库已连接: ${DB_PATH}`);
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] 数据库已关闭');
  }
}

/**
 * 初始化数据库（创建表结构）
 */
export function initializeDatabase(): void {
  const db = getDatabase();

  // 执行建表 SQL
  db.exec(SCHEMA_SQL);

  console.log('[DB] 数据库表结构初始化完成');
}

// 完整建表 SQL
const SCHEMA_SQL = `
-- 情报源
CREATE TABLE IF NOT EXISTS intel_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('media','community','official','social','wechat_mp','forum','api')),
  access_method TEXT NOT NULL CHECK(access_method IN ('rss','api','static_crawl','dynamic','search')),
  base_url TEXT NOT NULL,
  feed_url TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  schedule TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  priority TEXT NOT NULL DEFAULT 'P1' CHECK(priority IN ('P0','P1','P2','P3')),
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 种子
CREATE TABLE IF NOT EXISTS seeds (
  id TEXT PRIMARY KEY,
  seed_type TEXT NOT NULL CHECK(seed_type IN ('entity','event','topic','source')),
  text TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','dormant','degraded','retired')),
  -- 实体种子特有
  entity_type TEXT CHECK(entity_type IN ('game','company','person','brand','ip')),
  aliases TEXT DEFAULT '[]',
  category TEXT,
  market TEXT,
  -- 事件种子特有
  event_type TEXT,
  keywords TEXT DEFAULT '[]',
  -- 话题种子特有
  topic_tag TEXT,
  related_entities TEXT DEFAULT '[]',
  trend_direction TEXT CHECK(trend_direction IN ('rising','stable','declining')),
  -- 源种子特有
  discovery_url TEXT,
  discovery_method TEXT,
  verified INTEGER DEFAULT 0,
  -- 通用字段
  discovery_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  last_effective_at TEXT,
  fail_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_seeds_type_status ON seeds(seed_type, status);
CREATE INDEX IF NOT EXISTS idx_seeds_score ON seeds(score DESC);

-- 原始证据
CREATE TABLE IF NOT EXISTS raw_evidence (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES intel_sources(id),
  seed_ids TEXT NOT NULL DEFAULT '[]',
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  summary TEXT,
  author TEXT,
  published_at TEXT,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  images TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'collected',
  error_message TEXT,
  UNIQUE(url)
);

CREATE INDEX IF NOT EXISTS idx_evidence_url ON raw_evidence(url);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON raw_evidence(hash);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON raw_evidence(status);
CREATE INDEX IF NOT EXISTS idx_evidence_collected_at ON raw_evidence(collected_at DESC);

-- 结构化事件（LLM 抽取结果）
CREATE TABLE IF NOT EXISTS structured_events (
  id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL REFERENCES raw_evidence(id),
  source_id TEXT NOT NULL REFERENCES intel_sources(id),
  event_title TEXT NOT NULL,
  key_facts TEXT NOT NULL DEFAULT '[]',
  action_advice TEXT NOT NULL DEFAULT '[]',
  event_type TEXT NOT NULL,
  sentiment TEXT NOT NULL DEFAULT '{}',
  impact_score REAL NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'P2',
  audience_tags TEXT NOT NULL DEFAULT '[]',
  entities TEXT NOT NULL DEFAULT '[]',
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
  model TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_type ON structured_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_score ON structured_events(impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_evidence ON structured_events(evidence_id);

-- 证据事件（去重合并后）
CREATE TABLE IF NOT EXISTS evidence_events (
  id TEXT PRIMARY KEY,
  event_title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  key_facts TEXT NOT NULL DEFAULT '[]',
  action_advice TEXT NOT NULL DEFAULT '[]',
  sentiment TEXT NOT NULL DEFAULT '{}',
  evidence_ids TEXT NOT NULL DEFAULT '[]',
  structured_event_ids TEXT NOT NULL DEFAULT '[]',
  source_count INTEGER NOT NULL DEFAULT 1,
  source_ids TEXT NOT NULL DEFAULT '[]',
  impact_score REAL NOT NULL DEFAULT 0,
  confidence_score REAL NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'P2',
  audience_tags TEXT NOT NULL DEFAULT '[]',
  entities TEXT NOT NULL DEFAULT '[]',
  related_seed_ids TEXT NOT NULL DEFAULT '[]',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  dedup_hash TEXT NOT NULL,
  merge_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_dedup ON evidence_events(dedup_hash);
CREATE INDEX IF NOT EXISTS idx_events_type_score ON evidence_events(event_type, impact_score DESC);

-- 信号
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  evidence_event_id TEXT NOT NULL REFERENCES evidence_events(id),
  source_id TEXT NOT NULL REFERENCES intel_sources(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  event_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  impact_score REAL NOT NULL,
  audience_tags TEXT NOT NULL DEFAULT '[]',
  topic_tags TEXT NOT NULL DEFAULT '[]',
  entity_tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new',
  read_by_roles TEXT NOT NULL DEFAULT '[]',
  dispatched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_priority ON signals(priority, impact_score DESC);

-- 趋势簇
CREATE TABLE IF NOT EXISTS trend_clusters (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  topic_tag TEXT NOT NULL,
  signal_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  entity_count INTEGER NOT NULL DEFAULT 0,
  growth_rate REAL NOT NULL DEFAULT 0,
  trend_direction TEXT NOT NULL DEFAULT 'stable',
  signal_ids TEXT NOT NULL DEFAULT '[]',
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trends_direction ON trend_clusters(trend_direction);
CREATE INDEX IF NOT EXISTS idx_trends_window ON trend_clusters(window_end DESC);

-- 源健康状态
CREATE TABLE IF NOT EXISTS source_health (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE REFERENCES intel_sources(id),
  last_collected_at TEXT,
  last_success_at TEXT,
  last_error_at TEXT,
  last_error TEXT,
  total_collections INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  evidence_produced INTEGER NOT NULL DEFAULT 0,
  avg_response_time REAL NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  health_score REAL NOT NULL DEFAULT 50,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 采集任务
CREATE TABLE IF NOT EXISTS collection_jobs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES intel_sources(id),
  seed_ids TEXT NOT NULL DEFAULT '[]',
  trigger TEXT NOT NULL DEFAULT 'scheduled',
  collector_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  evidence_count INTEGER NOT NULL DEFAULT 0,
  new_evidence_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3
);

CREATE INDEX IF NOT EXISTS idx_jobs_source ON collection_jobs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON collection_jobs(status);

-- 去重记录
CREATE TABLE IF NOT EXISTS dedup_records (
  id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL REFERENCES raw_evidence(id),
  url_normalized TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  title_hash TEXT NOT NULL,
  dedup_group_id TEXT REFERENCES evidence_events(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(url_normalized)
);

CREATE INDEX IF NOT EXISTS idx_dedup_content ON dedup_records(content_hash);
CREATE INDEX IF NOT EXISTS idx_dedup_title ON dedup_records(title_hash);
`;
