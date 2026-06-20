/**
 * Prompt Builder 单元测试
 */
import { describe, it, expect } from 'vitest';
import { buildExtractionPrompt, buildSeedExpansionPrompt } from '../src/services/extraction/prompt-builder.js';
import type { RawEvidence, IntelSource } from '../src/models/types.js';

describe('PromptBuilder', () => {
  const mockSource: IntelSource = {
    id: 'src-1',
    name: 'GameLook',
    shortName: 'GL',
    sourceType: 'media',
    accessMethod: 'rss',
    baseUrl: 'https://gamelook.com.cn',
    config: {},
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
    enabled: true,
    priority: 'P0',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockEvidence: RawEvidence = {
    id: 'ev-1',
    sourceId: 'src-1',
    seedIds: ['seed-1'],
    url: 'https://gamelook.com.cn/article/123',
    title: '米哈游《原神》4.0 版本定档 8 月 16 日上线',
    content: '米哈游今日宣布，《原神》4.0 版本将于 8 月 16 日正式上线。新版本将带来全新的沙漠地图「千壑沙地」，以及新角色林尼和琳妮特。这是《原神》自 2020 年上线以来最大的版本更新之一。',
    collectedAt: new Date().toISOString(),
    images: [],
    metadata: { collectorType: 'rss' },
    hash: 'abc123',
    status: 'collected',
  };

  it('应该生成包含所有必要信息的 Prompt', () => {
    const prompt = buildExtractionPrompt(mockEvidence, mockSource);

    expect(prompt).toContain('游戏行业情报分析师');
    expect(prompt).toContain(mockEvidence.title);
    expect(prompt).toContain(mockSource.name);
    expect(prompt).toContain('角色-关注矩阵');
    expect(prompt).toContain('JSON');
  });

  it('应该包含事件类型列表', () => {
    const prompt = buildExtractionPrompt(mockEvidence, mockSource);

    expect(prompt).toContain('上线');
    expect(prompt).toContain('版号');
    expect(prompt).toContain('融资');
  });

  it('应该包含所有 7 个角色', () => {
    const prompt = buildExtractionPrompt(mockEvidence, mockSource);

    expect(prompt).toContain('组织');
    expect(prompt).toContain('战略');
    expect(prompt).toContain('发行');
    expect(prompt).toContain('运营');
    expect(prompt).toContain('广告投放');
    expect(prompt).toContain('数据部');
    expect(prompt).toContain('产品');
  });

  it('种子扩展 Prompt 应该包含种子信息', () => {
    const prompt = buildSeedExpansionPrompt('米哈游', 'entity', 85, 50);

    expect(prompt).toContain('米哈游');
    expect(prompt).toContain('entity');
    expect(prompt).toContain('85');
    expect(prompt).toContain('50');
    expect(prompt).toContain('JSON');
  });
});
