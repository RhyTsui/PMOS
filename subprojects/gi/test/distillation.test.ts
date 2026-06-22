/**
 * 蒸馏服务单元测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import { RequirementProfileService } from '../src/services/profile/index.js';
import {
  getSystemPrompt,
  buildUserPrompt,
  parseDistillationOutput,
  type DistillationTaskType,
} from '../src/services/distillation/index.js';

describe('蒸馏服务', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM intelligence_briefs;
      DELETE FROM model_source_mentions;
      DELETE FROM model_claims;
      DELETE FROM model_answers;
      DELETE FROM model_query_tasks;
      DELETE FROM requirement_profiles;
    `);
  });

  describe('提示词模板', () => {
    it('每种任务类型都有系统提示词', () => {
      const taskTypes: DistillationTaskType[] = [
        'discover_sources',
        'discover_trend_hypothesis',
        'generate_verification_queries',
        'benchmark_estimation',
        'fact_check',
        'insight_synthesis',
      ];

      for (const taskType of taskTypes) {
        const systemPrompt = getSystemPrompt(taskType);
        expect(systemPrompt).toBeDefined();
        expect(systemPrompt.length).toBeGreaterThan(50);
      }
    });

    it('discover_sources 用户提示词包含专题和实体', () => {
      const userPrompt = buildUserPrompt('discover_sources', {
        topic: '小游戏买量',
        entities: ['腾讯', '微信小游戏'],
      });
      expect(userPrompt).toContain('小游戏买量');
      expect(userPrompt).toContain('腾讯');
      expect(userPrompt).toContain('微信小游戏');
    });

    it('fact_check 必须提供 claimToVerify', () => {
      expect(() => {
        buildUserPrompt('fact_check', { topic: '小游戏', claimToVerify: undefined });
      }).toThrow('claimToVerify');
    });
  });

  describe('输出解析', () => {
    it('解析 discover_sources 输出', () => {
      const text = `{
        "sources": [
          {
            "name": "GameLook",
            "type": "media",
            "reason": "行业权威媒体",
            "keywords": ["游戏", "行业"],
            "url": "https://gamelook.com.cn",
            "confidence": 0.9
          }
        ]
      }`;

      const result = parseDistillationOutput('discover_sources', text);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].name).toBe('GameLook');
      expect(result.sources[0].confidence).toBe(0.9);
    });

    it('解析 discover_trend_hypothesis 输出', () => {
      const text = `{
        "trends": [
          {
            "summary": "小游戏市场 Q3 进入饱和期",
            "signals": ["新增产品减少", "买量成本上升"],
            "verificationKeywords": ["小游戏饱和", "市场萎缩"],
            "priority": "high",
            "direction": "rising",
            "confidence": 0.75
          }
        ]
      }`;

      const result = parseDistillationOutput('discover_trend_hypothesis', text);
      expect(result.trends).toHaveLength(1);
      expect(result.trends[0].summary).toContain('饱和');
      expect(result.trends[0].priority).toBe('high');
    });

    it('从 markdown code block 解析 JSON', () => {
      const text = `
这是一些说明文字。

\`\`\`json
{
  "sources": [
    {"name": "测试源", "type": "media", "reason": "测试", "keywords": [], "confidence": 0.5}
  ]
}
\`\`\`

后续文字。
`;
      const result = parseDistillationOutput('discover_sources', text);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].name).toBe('测试源');
    });

    it('无法解析时抛出错误', () => {
      expect(() => {
        parseDistillationOutput('discover_sources', '这不是 JSON');
      }).toThrow('无法解析');
    });

    it('解析 benchmark_estimation 输出', () => {
      const text = `{
        "benchmarks": [
          {
            "metricName": "首日ROI",
            "valueRange": {"min": 0.08, "max": 0.15, "p50": 0.11},
            "unit": "%",
            "applicableConditions": ["买量场景"],
            "confidence": 0.72,
            "sourceType": "report"
          }
        ]
      }`;

      const result = parseDistillationOutput('benchmark_estimation', text);
      expect(result.benchmarks).toHaveLength(1);
      expect(result.benchmarks[0].metricName).toBe('首日ROI');
      expect(result.benchmarks[0].valueRange.p50).toBe(0.11);
    });
  });

  describe('完整蒸馏流程（使用 mock LLM）', () => {
    it('RequirementProfileService 创建画像', () => {
      const profileService = new RequirementProfileService();
      const profile = profileService.createProfile({
        name: '蒸馏测试画像',
        owner: 'tester',
        focusTopics: ['小游戏买量', '二游出海'],
        entities: {
          companies: ['腾讯', '三七'],
          products: ['微信小游戏'],
          platforms: ['巨量引擎'],
        },
        deliveryPolicy: {
          format: 'daily_brief',
          frequency: '每天',
        },
      });

      expect(profile.id).toBeDefined();
      expect(profile.focusTopics).toContain('小游戏买量');
      expect(profile.entities.companies).toContain('腾讯');
    });
  });
});
