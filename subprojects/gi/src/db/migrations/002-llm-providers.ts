/**
 * 迁移 002：LLM 供应商配置表
 *
 * 支持后台动态配置大模型供应商，无需改 .env 重启。
 * 每条记录代表一个 LLM 供应商（如 Qwen / MiniMax / DeepSeek）。
 *
 * @see docs/WHITE_PAPER.md §8.5（LLM Task Library）
 */

export const up = `
-- ============================================================
-- LLM 供应商配置
-- ============================================================
CREATE TABLE IF NOT EXISTS llm_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,              -- 供应商名称：'Qwen', 'MiniMax', 'DeepSeek'
  provider_type TEXT NOT NULL
    CHECK(provider_type IN (
      'qwen', 'minimax', 'deepseek', 'openai', 'anthropic', 'custom'
    )),
  api_key TEXT NOT NULL,                  -- 加密存储的 API Key（生产环境应加密）
  base_url TEXT NOT NULL,                 -- API 端点
  models TEXT NOT NULL DEFAULT '[]',      -- JSON: 该供应商支持的模型列表
  default_model TEXT,                     -- 默认使用的模型
  enabled INTEGER NOT NULL DEFAULT 1,     -- 是否启用
  rate_limit_rpm INTEGER NOT NULL DEFAULT 30,    -- 每分钟请求数限制
  rate_limit_daily INTEGER NOT NULL DEFAULT 1000, -- 每日请求数限制
  priority INTEGER NOT NULL DEFAULT 100,  -- 优先级（数字越小优先级越高）
  cost_per_1m_input REAL DEFAULT 0,       -- 每百万输入 token 成本（USD）
  cost_per_1m_output REAL DEFAULT 0,      -- 每百万输出 token 成本（USD）
  config TEXT NOT NULL DEFAULT '{}',      -- JSON: 供应商特定配置（如 headers、timeout 等）
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'inactive', 'error')),
  last_error TEXT,                        -- 最近一次错误信息
  last_used_at TEXT,                      -- 最近一次使用时间
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_providers_type ON llm_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_enabled ON llm_providers(enabled);
CREATE INDEX IF NOT EXISTS idx_providers_priority ON llm_providers(priority);
`;
