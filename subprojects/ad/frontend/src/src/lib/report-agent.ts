import type { ReportDraft, ReportTemplate } from '@/types';

export interface ReportRequirementAnalysis {
  summary: string;
  suggestedTemplateId?: string;
  suggestedTemplateName?: string;
  suggestedDateText: string;
  recognizedMetrics: string[];
  unclearMetrics: string[];
  unimplementedMetrics: string[];
  nextActions: string[];
  intakeMode: 'chat' | 'image' | 'file' | 'manual';
  shouldGenerateDraft: boolean;
  shouldExportToXiaoshan: boolean;
  shouldCreateShareLink: boolean;
  shouldCreateScreenshot: boolean;
}

export interface ReportSessionResponse {
  assistantMessage: string;
  analysis: ReportRequirementAnalysis;
  draft?: ReportDraft;
  metricCatalog: string[];
  missingClarifications: string[];
  actionHints: string[];
  shareLink?: string;
  screenshotHint?: string;
}

const IMPLEMENTED_METRICS = [
  '总消耗',
  '现金消耗',
  '曝光',
  '点击',
  '转化',
  'ROI',
  'CPA',
  '预算',
  '预算进度',
];

const METRIC_RULES: Array<{ keyword: string; label: string; type: 'implemented' | 'unclear' | 'unimplemented' }> = [
  { keyword: '消耗', label: '总消耗', type: 'implemented' },
  { keyword: '现金消耗', label: '现金消耗', type: 'implemented' },
  { keyword: '曝光', label: '曝光', type: 'implemented' },
  { keyword: '点击', label: '点击', type: 'implemented' },
  { keyword: '转化', label: '转化', type: 'implemented' },
  { keyword: 'roi', label: 'ROI', type: 'implemented' },
  { keyword: 'cpa', label: 'CPA', type: 'implemented' },
  { keyword: '预算进度', label: '预算进度', type: 'implemented' },
  { keyword: '预算', label: '预算', type: 'implemented' },
  { keyword: '留存', label: '留存', type: 'unclear' },
  { keyword: '首日 roi 倒推', label: '首日 ROI 倒推', type: 'unclear' },
  { keyword: 'ltv', label: 'LTV', type: 'unimplemented' },
  { keyword: 'arppu', label: 'ARPPU', type: 'unimplemented' },
  { keyword: '首日付费率', label: '首日付费率', type: 'unimplemented' },
];

function detectIntakeMode(message: string, attachmentSummaries: string[]): ReportRequirementAnalysis['intakeMode'] {
  const text = `${message} ${attachmentSummaries.join(' ')}`.toLowerCase();
  if (attachmentSummaries.some(item => /\.(png|jpg|jpeg|webp)$/i.test(item)) || text.includes('截图')) return 'image';
  if (attachmentSummaries.length > 0 || text.includes('上传文件') || text.includes('excel')) return 'file';
  if (text.includes('手动配置') || text.includes('模板')) return 'manual';
  return 'chat';
}

export function analyzeReportRequirement(
  message: string,
  templates: ReportTemplate[],
  attachmentSummaries: string[] = [],
): ReportRequirementAnalysis {
  const text = message.trim();
  const lower = text.toLowerCase();
  const recognizedMetrics = new Set<string>();
  const unclearMetrics = new Set<string>();
  const unimplementedMetrics = new Set<string>();

  for (const rule of METRIC_RULES) {
    if (!lower.includes(rule.keyword.toLowerCase())) continue;
    if (rule.type === 'implemented') recognizedMetrics.add(rule.label);
    if (rule.type === 'unclear') unclearMetrics.add(rule.label);
    if (rule.type === 'unimplemented') unimplementedMetrics.add(rule.label);
  }

  const suggestedTemplate = templates.find(template => {
    const name = template.name.toLowerCase();
    if ((lower.includes('预算') || lower.includes('现金')) && name.includes('预算')) return true;
    if (lower.includes('渠道') || lower.includes('媒体')) return name.includes('渠道');
    if (lower.includes('经营') || lower.includes('总览')) return name.includes('经营');
    return false;
  }) || templates[0];

  const suggestedDateText = lower.includes('近7天') || lower.includes('7天')
    ? '近 7 天'
    : lower.includes('今天')
      ? '今天'
      : lower.includes('昨天')
        ? '昨天'
        : lower.includes('本周')
          ? '本周'
          : '待确认';

  const shouldGenerateDraft = /(生成|出一版|做一版).*(报表|草稿)/.test(lower) || lower.includes('开始查询');
  const shouldExportToXiaoshan = lower.includes('导出') && lower.includes('小闪');
  const shouldCreateShareLink = lower.includes('共享') || lower.includes('分享');
  const shouldCreateScreenshot = lower.includes('截图') || lower.includes('快照');

  const nextActions: string[] = [];
  if (recognizedMetrics.size > 0) nextActions.push('按已实现指标生成查询计划');
  if (unclearMetrics.size > 0) nextActions.push('先确认指标口径');
  if (unimplementedMetrics.size > 0) nextActions.push('引导提交指标配置需求');
  if (!nextActions.length) nextActions.push('继续确认报表对象、时间范围和核心指标');

  return {
    summary: text,
    suggestedTemplateId: suggestedTemplate?.id,
    suggestedTemplateName: suggestedTemplate?.name,
    suggestedDateText,
    recognizedMetrics: [...recognizedMetrics],
    unclearMetrics: [...unclearMetrics],
    unimplementedMetrics: [...unimplementedMetrics],
    nextActions,
    intakeMode: detectIntakeMode(text, attachmentSummaries),
    shouldGenerateDraft,
    shouldExportToXiaoshan,
    shouldCreateShareLink,
    shouldCreateScreenshot,
  };
}

export function buildReportAssistantReply(
  analysis: ReportRequirementAnalysis,
  options?: {
    draft?: ReportDraft;
    shareLink?: string;
    screenshotHint?: string;
  },
): string {
  const lines: string[] = [
    `我先把这次自动报表需求整理出来：${analysis.summary}`,
    '',
    `建议模板：${analysis.suggestedTemplateName || '待确认'}`,
    `建议时间范围：${analysis.suggestedDateText}`,
    `已识别指标：${analysis.recognizedMetrics.length ? analysis.recognizedMetrics.join('、') : '待确认'}`,
  ];

  if (analysis.intakeMode === 'image') {
    lines.push('我会把截图里的报表口径、维度和字段先转成可确认清单，再决定是否直接查数。');
  }
  if (analysis.intakeMode === 'file') {
    lines.push('我会把上传文件里的报表结构先抽成模板草稿，再映射可用指标。');
  }
  if (analysis.unclearMetrics.length) {
    lines.push(`待确认指标：${analysis.unclearMetrics.join('、')}`);
    lines.push('这些指标口径不够清晰，我先给你可用指标清单，请确认后再查数。');
  }
  if (analysis.unimplementedMetrics.length) {
    lines.push(`未实现指标：${analysis.unimplementedMetrics.join('、')}`);
    lines.push('这部分不会编造数据，会引导转成指标配置需求。');
  }
  if (options?.draft) {
    lines.push('');
    lines.push(`报表草稿已生成：${options.draft.templateName} / ${options.draft.reportDate}`);
    lines.push('你现在可以继续让我优化解读、生成共享链接、生成截图，或者标记导出到小闪。');
  }
  if (options?.shareLink) {
    lines.push(`共享链接：${options.shareLink}`);
  }
  if (options?.screenshotHint) {
    lines.push(`截图说明：${options.screenshotHint}`);
  }
  lines.push('');
  lines.push(`下一步：${analysis.nextActions.join('；')}`);
  return lines.join('\n');
}

export function getImplementedMetricCatalog(): string[] {
  return IMPLEMENTED_METRICS;
}
