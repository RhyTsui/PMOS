import type { TemplateTaskInput, TemplateTaskOutput } from './executor-registry';

/**
 * GI 日报 + 关键词定制执行器（mock-safe）
 *
 * 不调用真实 GI 系统 API，不编造真实资讯。
 * 返回 mock 的日报结构 + sourceRefs 占位，明确标注 mock-safe。
 * 真实 GI API 待对接后替换。
 */
export async function executeDailyDigestTask(input: TemplateTaskInput): Promise<TemplateTaskOutput> {
  const params = input.params || {};
  const keywords = Array.isArray(params.keywords) ? params.keywords : ['SLG', '小游戏'];
  const industryScope = typeof params.industry_scope === 'string' ? params.industry_scope : '游戏行业';

  // Mock-safe: 明确标注为演示数据，不编造真实资讯
  const mockKeyPoints = [
    `[mock-safe 演示] ${industryScope}动态：关键词 "${keywords.join('、')}" 相关的近期行业动向汇总（演示条目 1）`,
    `[mock-safe 演示] 关键词 "${keywords[0]}" 领域近期产品发布/版本更新动态（演示条目 2）`,
    `[mock-safe 演示] 关键词 "${keywords[1] || keywords[0]}" 领域市场投放趋势观察（演示条目 3）`,
    '[mock-safe 演示] 当前为占位数据，待真实 GI 系统 API 接入后替换为真实资讯',
  ];

  // Mock-safe 来源引用（明确标注为占位）
  const mockSources = [
    { title: '[mock] 行业来源示例 1', url: '#mock-source-1', source: 'GI 系统占位' },
    { title: '[mock] 行业来源示例 2', url: '#mock-source-2', source: 'GI 系统占位' },
    { title: '[mock] 行业来源示例 3', url: '#mock-source-3', source: 'GI 系统占位' },
  ];

  const mockMarkdown = [
    `# ${industryScope}日报`,
    `**关键词**: ${keywords.join('、')}`,
    `**生成时间**: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '> [mock-safe] 当前为演示数据，待真实 GI 系统 API 接入',
    '',
    '## 重点摘要',
    ...mockKeyPoints.map((p) => `- ${p}`),
    '',
    '## 来源',
    ...mockSources.map((s) => `- ${s.title}`),
  ].join('\n');

  return {
    status: 'completed',
    summary: `已生成${industryScope}日报，聚焦关键词 "${keywords.join('、')}"，整理 ${mockKeyPoints.length} 条要点。[mock-safe 演示数据]`,
    keyFindings: mockKeyPoints,
    templateData: {
      digestMarkdown: mockMarkdown,
      keyPoints: mockKeyPoints,
      sources: mockSources,
      mockSafe: true,
    },
    sourceRefs: mockSources.map((s, i) => ({
      type: 'gi_source',
      uri: s.url,
      title: s.title,
    })),
    evidenceRefs: [
      { type: 'template', id: 'gi_keyword_daily_digest', label: 'GI 日报模板' },
    ],
  };
}
