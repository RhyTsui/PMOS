/**
 * 迁移 003：补充 llm_providers 表的 model_base_url 列
 *
 * 支持公司中转代理模式：记录实际模型提供商 URL（用于文档/调试）。
 */

export const up = `
ALTER TABLE llm_providers ADD COLUMN model_base_url TEXT;
`;
