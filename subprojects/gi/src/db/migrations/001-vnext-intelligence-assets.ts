/**
 * 迁移 001：VNext 情报资产底座
 *
 * 新增 8 张表，对应白皮书 §10.2 / 设计文档 §6：
 *   1. requirement_profiles     — 情报需求画像（Requirement Profile）
 *   2. model_query_tasks        — 模型情报任务
 *   3. model_answers            — 模型回答
 *   4. model_claims             — 模型观点（进入核验流程）
 *   5. model_source_mentions    — 模型推荐信源（驱动 Source Discovery）
 *   6. evidence_ledger          — 证据账本（多态关联）
 *   7. benchmark_parameters     — 行业基准参数
 *   8. intelligence_briefs      — 情报简报版本
 *
 * 本迁移不修改现有表结构。intel_sources 表的 source_type CHECK 约束扩展
 * 将在后续迁移（需要实际插入新类型时）单独处理。
 *
 * @see docs/WHITE_PAPER.md §10.2
 * @see docs/design/02-数据模型设计.md 第六节
 * @see docs/design/04-API接口设计.md 第十二～十五节
 */

export const up = `
-- ============================================================
-- 1. 情报需求画像 RequirementProfile
-- ============================================================
CREATE TABLE IF NOT EXISTS requirement_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '游戏',
  purpose TEXT NOT NULL DEFAULT '[]',
  focus_topics TEXT NOT NULL DEFAULT '[]',
  entities TEXT NOT NULL DEFAULT '{}',
  source_policy TEXT NOT NULL DEFAULT '{}',
  verification_policy TEXT NOT NULL DEFAULT '{}',
  delivery_policy TEXT NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT '{}',
  time_window TEXT NOT NULL DEFAULT '最近7天',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','paused','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_owner
  ON requirement_profiles(owner);
CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON requirement_profiles(status);

-- ============================================================
-- 2. 模型情报任务 ModelQueryTask
-- ============================================================
CREATE TABLE IF NOT EXISTS model_query_tasks (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES requirement_profiles(id),
  task_type TEXT NOT NULL
    CHECK(task_type IN (
      'discover_sources',
      'discover_trend_hypothesis',
      'generate_verification_queries',
      'benchmark_estimation',
      'fact_check',
      'insight_synthesis'
    )),
  prompt_template_id TEXT NOT NULL,
  prompt_variables TEXT NOT NULL DEFAULT '{}',
  models TEXT NOT NULL DEFAULT '[]',
  schedule TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','running','completed','failed','cancelled')),
  last_run_at TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_profile
  ON model_query_tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON model_query_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run
  ON model_query_tasks(next_run_at);

-- ============================================================
-- 3. 模型回答 ModelAnswer
-- ============================================================
CREATE TABLE IF NOT EXISTS model_answers (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES model_query_tasks(id),
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  answer_json TEXT,
  token_input INTEGER NOT NULL DEFAULT 0,
  token_output INTEGER NOT NULL DEFAULT 0,
  token_total INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success'
    CHECK(status IN ('success','failed','timeout','rate_limited')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_answers_task
  ON model_answers(task_id);
CREATE INDEX IF NOT EXISTS idx_answers_model
  ON model_answers(model_provider, model_name);
CREATE INDEX IF NOT EXISTS idx_answers_created
  ON model_answers(created_at DESC);

-- ============================================================
-- 4. 模型观点 ModelClaim
-- ============================================================
CREATE TABLE IF NOT EXISTS model_claims (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES model_answers(id),
  claim_type TEXT NOT NULL
    CHECK(claim_type IN (
      'fact',
      'prediction',
      'opinion',
      'trend',
      'benchmark',
      'source_recommendation'
    )),
  summary TEXT NOT NULL,
  entities TEXT NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL DEFAULT 0,
  freshness TEXT NOT NULL DEFAULT 'recent'
    CHECK(freshness IN ('breaking','recent','dated','stale')),
  verification_required INTEGER NOT NULL DEFAULT 1,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK(verification_status IN (
      'unverified','verified','conflicted','low_confidence','rejected','expired'
    )),
  verified_at TEXT,
  verified_evidence_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_claims_answer
  ON model_claims(answer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status
  ON model_claims(verification_status);
CREATE INDEX IF NOT EXISTS idx_claims_type
  ON model_claims(claim_type);

-- ============================================================
-- 5. 模型信源提及 ModelSourceMention
-- ============================================================
CREATE TABLE IF NOT EXISTS model_source_mentions (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES model_answers(id),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'unknown',
  reason TEXT NOT NULL DEFAULT '',
  recommended_use TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL DEFAULT 0,
  matched_source_id TEXT REFERENCES intel_sources(id),
  discovery_status TEXT NOT NULL DEFAULT 'new'
    CHECK(discovery_status IN ('new','candidate','trial','accepted','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mentions_answer
  ON model_source_mentions(answer_id);
CREATE INDEX IF NOT EXISTS idx_mentions_status
  ON model_source_mentions(discovery_status);
CREATE INDEX IF NOT EXISTS idx_mentions_matched
  ON model_source_mentions(matched_source_id);

-- ============================================================
-- 6. 证据账本 EvidenceLedger
--    多态关联：一条证据可服务于事件/观点/基准/简报/趋势
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_ledger (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL
    CHECK(target_type IN (
      'structured_event',
      'model_claim',
      'benchmark',
      'intelligence_brief',
      'trend_cluster'
    )),
  target_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL
    CHECK(evidence_type IN (
      'raw_article',
      'raw_image_ocr',
      'raw_rss',
      'model_answer',
      'model_claim',
      'cross_verified',
      'benchmark_source',
      'human_feedback'
    )),
  source_id TEXT REFERENCES intel_sources(id),
  raw_evidence_id TEXT REFERENCES raw_evidence(id),
  structured_event_id TEXT REFERENCES structured_events(id),
  model_answer_id TEXT REFERENCES model_answers(id),
  model_claim_id TEXT REFERENCES model_claims(id),

  url TEXT,
  title TEXT NOT NULL,
  snippet TEXT,
  published_at TEXT,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),

  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK(verification_status IN (
      'unverified','verified','conflicted','low_confidence','rejected','expired'
    )),
  confidence REAL NOT NULL DEFAULT 0,
  conflict_notes TEXT,
  verified_by TEXT DEFAULT '[]',
  verified_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_target
  ON evidence_ledger(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status
  ON evidence_ledger(verification_status);
CREATE INDEX IF NOT EXISTS idx_ledger_source
  ON evidence_ledger(source_id);
CREATE INDEX IF NOT EXISTS idx_ledger_collected
  ON evidence_ledger(collected_at DESC);

-- ============================================================
-- 7. 行业基准参数 BenchmarkParameter
-- ============================================================
CREATE TABLE IF NOT EXISTS benchmark_parameters (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL DEFAULT '游戏',
  segment TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL,
  value_range TEXT,
  time_window TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK(source_type IN (
      'article','report','ranking','database','internal','model','expert'
    )),
  evidence_ids TEXT NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL DEFAULT 0,
  applicable_conditions TEXT NOT NULL DEFAULT '[]',
  expired_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_segment
  ON benchmark_parameters(segment);
CREATE INDEX IF NOT EXISTS idx_benchmarks_metric
  ON benchmark_parameters(metric_name);
CREATE INDEX IF NOT EXISTS idx_benchmarks_expired
  ON benchmark_parameters(expired_at);

-- ============================================================
-- 8. 情报简报版本 IntelligenceBrief
-- ============================================================
CREATE TABLE IF NOT EXISTS intelligence_briefs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES requirement_profiles(id),
  brief_type TEXT NOT NULL
    CHECK(brief_type IN ('daily','topic','alert','custom')),
  title TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '[]',
  evidence_ids TEXT NOT NULL DEFAULT '[]',
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','published','archived','superseded')),
  feedback_score REAL,
  feedback_notes TEXT,
  superseded_by TEXT REFERENCES intelligence_briefs(id)
);

CREATE INDEX IF NOT EXISTS idx_briefs_profile
  ON intelligence_briefs(profile_id);
CREATE INDEX IF NOT EXISTS idx_briefs_type
  ON intelligence_briefs(brief_type);
CREATE INDEX IF NOT EXISTS idx_briefs_generated
  ON intelligence_briefs(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefs_status
  ON intelligence_briefs(status);
`;
