import { describe, expect, it } from 'vitest';
import { buildOpenAnswerUnavailableFallback } from '../src/lib/open-answer-fallback';

describe('open answer unavailable fallback', () => {
  it('builds a context-aware degraded answer without claiming external retrieval', () => {
    const text = buildOpenAnswerUnavailableFallback({
      context: {
        capabilityOverview: {
          dynamic_signals: [
            { key: 'open_answer_composition', label: '开放式回答、写作、总结、解释和需求整理', available: true },
            { key: 'knowledge_context', label: '内部知识库和资料检索上下文', available: true },
          ],
        },
        capabilities: {
          manifest: [
            { name: 'web_search.query' },
            { name: 'debug.config_check' },
            { name: 'internal.raw_tool' },
            { name: '不会展示的第四项' },
          ],
        },
        knowledge: { hitCount: 2 },
        project: { currentProject: { appName: '三国杀移动版' } },
        preference: { roleName: '投放优化' },
        memory: { count: 1 },
        history: { recentQuestions: [{ title: '素材趋势' }] },
      },
    });

    expect(text).toContain('开放式回答');
    expect(text).toContain('内部知识库');
    expect(text).toContain('拆解问题');
    expect(text).not.toContain('当前回答生成暂不可用');
    expect(text).not.toContain('web_search.query');
    expect(text).not.toContain('debug.config_check');
    expect(text).not.toContain('internal.raw_tool');
    expect(text).not.toContain('我已收到你的问题');
    expect(text).not.toContain('plannerContext');
    expect(text).not.toContain('answerStrategy');
    expect(text).not.toMatch(/已查询|已检索|已联网|已调用|已验证/);
  });

  it('keeps requirement fallback scoped to demand drafting without fixed sample answers', () => {
    const text = buildOpenAnswerUnavailableFallback({
      serviceIntent: 'light_requirement',
      context: null,
    });

    expect(text).toContain('需求边界');
    expect(text).not.toContain('你好，请用一句话说明');
    expect(text).not.toContain('我已收到你的需求');
  });

  it('uses grounded public web evidence instead of capability fallback when sources are available', () => {
    const text = buildOpenAnswerUnavailableFallback({
      context: {
        publicWeb: {
          candidate: {
            status: 'success',
            source_count: 1,
          },
          answer_candidate: '公开来源显示：周末活动在主会场举行。',
        },
      },
    });

    expect(text).toBe('公开来源显示：周末活动在主会场举行。');
    expect(text).not.toContain('我可以先');
  });

  it('uses grounded knowledge hits instead of generic capability fallback when model composition is unavailable', () => {
    const text = buildOpenAnswerUnavailableFallback({
      context: {
        knowledge: {
          status: 'searched',
          hitCount: 2,
          hits: [
            {
              title: '监测回传配置说明',
              content: '文档说明了回传参数、事件口径和联调检查入口。',
              source: 'kb-doc-1',
            },
            {
              title: '回传排查手册',
              content: '排查时需要核对回传地址、事件编码和媒体侧返回状态。',
            },
          ],
        },
      },
    });

    expect(text).toContain('内部知识库');
    expect(text).toContain('监测回传配置说明');
    expect(text).toContain('回传参数');
    expect(text).not.toContain('我可以先');
  });

  it('does not fabricate public evidence when public web returned no reliable sources', () => {
    const text = buildOpenAnswerUnavailableFallback({
      context: {
        publicWeb: {
          candidate: {
            status: 'failed',
            source_count: 0,
          },
          answer_candidate: '不应被采纳的公开来源候选。',
        },
      },
    });

    expect(text).toContain('我可以先');
    expect(text).not.toContain('不应被采纳');
  });
});
