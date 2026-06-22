/**
 * 蒸馏任务提示词模板
 *
 * 6 类蒸馏任务对应白皮书 §7.2 的模型情报中心。
 * 每个模板使用变量替换，支持不同专题和配置。
 *
 * @see docs/WHITE_PAPER.md §7.2 / §8.5
 */

export type DistillationTaskType =
  | 'discover_sources'
  | 'discover_trend_hypothesis'
  | 'generate_verification_queries'
  | 'benchmark_estimation'
  | 'fact_check'
  | 'insight_synthesis';

export interface PromptTemplateContext {
  /** 专题名称（如 "小游戏买量"、"二游出海"） */
  topic: string;
  /** 时间窗口（如 "最近7天"、"2026-Q2"） */
  timeWindow?: string;
  /** 关注实体（公司、产品等） */
  entities?: string[];
  /** 待核验的观点（用于 fact_check / generate_verification_queries） */
  claimToVerify?: string;
  /** 已有证据（用于 insight_synthesis） */
  existingEvidence?: Array<{ title: string; summary: string }>;
  /** 目标角色（老板 / 发行 / 运营 / 产品 等） */
  audienceRole?: string;
}

/**
 * 获取指定任务类型的系统提示词
 */
export function getSystemPrompt(taskType: DistillationTaskType): string {
  switch (taskType) {
    case 'discover_sources':
      return DISCOVER_SOURCES_SYSTEM;
    case 'discover_trend_hypothesis':
      return DISCOVER_TREND_SYSTEM;
    case 'generate_verification_queries':
      return GENERATE_QUERIES_SYSTEM;
    case 'benchmark_estimation':
      return BENCHMARK_SYSTEM;
    case 'fact_check':
      return FACT_CHECK_SYSTEM;
    case 'insight_synthesis':
      return INSIGHT_SYNTHESIS_SYSTEM;
    default:
      throw new Error(`未知任务类型: ${taskType}`);
  }
}

/**
 * 构建用户提示词（变量替换）
 */
export function buildUserPrompt(
  taskType: DistillationTaskType,
  context: PromptTemplateContext,
): string {
  switch (taskType) {
    case 'discover_sources':
      return buildDiscoverSourcesPrompt(context);
    case 'discover_trend_hypothesis':
      return buildDiscoverTrendPrompt(context);
    case 'generate_verification_queries':
      return buildGenerateQueriesPrompt(context);
    case 'benchmark_estimation':
      return buildBenchmarkPrompt(context);
    case 'fact_check':
      return buildFactCheckPrompt(context);
    case 'insight_synthesis':
      return buildInsightSynthesisPrompt(context);
    default:
      throw new Error(`未知任务类型: ${taskType}`);
  }
}

// ===== 系统提示词 =====

const DISCOVER_SOURCES_SYSTEM = `你是游戏行业资深研究员，专注于发现高质量情报源。
你的任务是推荐值得长期监控的信息源，包括：网站、公众号、数据库、榜单、社区、KOL、公司官网等。
推荐标准：
1. 信息质量高（原创、权威、及时）
2. 与专题高度相关
3. 可持续获取（有 RSS/API/稳定更新）
4. 能覆盖不同角度（政策、产品、市场、技术等）

请以 JSON 格式返回结果。`;

const DISCOVER_TREND_SYSTEM = `你是游戏行业趋势分析师。
你的任务是基于当前行业动态，识别正在形成或即将形成的趋势。
要求：
1. 趋势必须有依据（基于可观察的信号）
2. 不要直接给事实结论，输出待核验的假设
3. 每个趋势给出核验关键词和优先级
4. 区分"正在升温"和"即将出现"的趋势

请以 JSON 格式返回结果。`;

const GENERATE_QUERIES_SYSTEM = `你是信息检索专家。
你的任务是根据给定的观点/假设，生成用于搜索和爬虫回源核验的关键词组合。
要求：
1. 覆盖同义词、相关词、上下位词
2. 包含时间限定词（最近、本月、Q2 等）
3. 包含来源限定词（官方、报告、数据等）
4. 给出优先级和预期命中率

请以 JSON 格式返回结果。`;

const BENCHMARK_SYSTEM = `你是游戏行业数据分析师。
你的任务是基于公开信息和行业经验，估算特定领域的基准参数。
要求：
1. 给出参数范围（最小值、最大值、中位数）
2. 明确适用场景和前提条件
3. 标注置信度（0-1）
4. 说明数据来源类型（公开报告/内部数据/模型推理）

请以 JSON 格式返回结果。`;

const FACT_CHECK_SYSTEM = `你是事实核查专家。
你的任务是评估给定观点/声明的可信度，并给出核验建议。
要求：
1. 分析声明的具体内容
2. 评估与已知事实的一致性
3. 识别潜在的信息缺口
4. 给出具体的核验步骤
5. 输出置信度评分（0-1）

请以 JSON 格式返回结果。`;

const INSIGHT_SYNTHESIS_SYSTEM = `你是情报分析师。
你的任务是基于已有的多条证据，综合提炼出可操作的行业洞察。
要求：
1. 跨证据归纳共性
2. 识别证据间的关联
3. 提炼对特定角色的行动建议
4. 标注置信度和证据强度

请以 JSON 格式返回结果。`;

// ===== 用户提示词构建 =====

function buildDiscoverSourcesPrompt(ctx: PromptTemplateContext): string {
  const entities = ctx.entities?.length
    ? `\n关注实体：${ctx.entities.join('、')}`
    : '';
  return `请围绕专题「${ctx.topic}」${ctx.timeWindow ? `（时间窗口：${ctx.timeWindow}）` : ''}，推荐值得长期监控的信息源。${entities}

要求：
1. 至少推荐 5-10 个不同角度的信息源
2. 每个源给出：名称、类型、推荐理由、监控关键词、URL（如有）
3. 优先推荐有 RSS/API 的源
4. 包含国内和国际源

请严格以 JSON 格式返回：
{
  "sources": [
    {
      "name": "源名称",
      "type": "media|wechat_mp|community|database|ranking|kol|official|other",
      "reason": "推荐理由",
      "keywords": ["关键词1", "关键词2"],
      "url": "https://...",
      "confidence": 0.8
    }
  ]
}`;
}

function buildDiscoverTrendPrompt(ctx: PromptTemplateContext): string {
  const entities = ctx.entities?.length
    ? `\n关注实体：${ctx.entities.join('、')}`
    : '';
  return `请分析专题「${ctx.topic}」${ctx.timeWindow ? `（${ctx.timeWindow}）` : ''}当前可能出现的趋势变化。${entities}

要求：
1. 识别 3-5 个正在形成或即将形成的趋势
2. 每个趋势给出：
   - 趋势描述（一句话）
   - 支撑信号（基于什么观察）
   - 核验关键词
   - 优先级（high/medium/low）
   - 趋势类型（rising/emerging/declining）

请严格以 JSON 格式返回：
{
  "trends": [
    {
      "summary": "趋势描述",
      "signals": ["信号1", "信号2"],
      "verificationKeywords": ["关键词1", "关键词2"],
      "priority": "high|medium|low",
      "direction": "rising|emerging|declining",
      "confidence": 0.7
    }
  ]
}`;
}

function buildGenerateQueriesPrompt(ctx: PromptTemplateContext): string {
  if (!ctx.claimToVerify) {
    throw new Error('fact_check 任务必须提供 claimToVerify');
  }
  return `请针对以下观点，生成用于搜索和爬虫核验的关键词组合：

观点：「${ctx.claimToVerify}」
专题：${ctx.topic}

要求：
1. 生成 5-10 组不同角度的搜索关键词
2. 每组给出：关键词组合、搜索策略、预期命中率
3. 覆盖直接证据和间接证据
4. 包含官方源和媒体报道

请严格以 JSON 格式返回：
{
  "queries": [
    {
      "keywords": ["关键词1", "关键词2"],
      "strategy": "搜索策略描述",
      "expectedHitRate": "high|medium|low",
      "sourcePreference": "official|media|community|any"
    }
  ]
}`;
}

function buildBenchmarkPrompt(ctx: PromptTemplateContext): string {
  return `请估算专题「${ctx.topic}」${ctx.timeWindow ? `（${ctx.timeWindow}）` : ''}的行业基准参数。

要求：
1. 识别 3-5 个关键业务指标
2. 每个指标给出：
   - 指标名称
   - 取值范围（min, max, p50）
   - 适用场景
   - 置信度（0-1）
   - 数据来源类型

请严格以 JSON 格式返回：
{
  "benchmarks": [
    {
      "metricName": "指标名称",
      "valueRange": {
        "min": 0.1,
        "max": 0.5,
        "p50": 0.3
      },
      "unit": "单位（如 %、元、天）",
      "applicableConditions": ["场景1", "场景2"],
      "confidence": 0.7,
      "sourceType": "report|database|model|expert"
    }
  ]
}`;
}

function buildFactCheckPrompt(ctx: PromptTemplateContext): string {
  if (!ctx.claimToVerify) {
    throw new Error('fact_check 任务必须提供 claimToVerify');
  }
  return `请评估以下观点的可信度：

观点：「${ctx.claimToVerify}」
专题：${ctx.topic}

要求：
1. 分析观点的具体内容
2. 评估与已知事实的一致性
3. 识别潜在的信息缺口
4. 给出核验步骤建议
5. 输出置信度评分（0-1）

请严格以 JSON 格式返回：
{
  "claim": "被核验的观点",
  "analysis": "分析说明",
  "consistencyWithKnownFacts": "high|medium|low",
  "informationGaps": ["缺口1", "缺口2"],
  "verificationSteps": ["步骤1", "步骤2"],
  "confidence": 0.6,
  "verdict": "verified|unverified|conflicted|low_confidence"
}`;
}

function buildInsightSynthesisPrompt(ctx: PromptTemplateContext): string {
  const evidenceList = ctx.existingEvidence?.length
    ? ctx.existingEvidence.map((e, i) => `${i + 1}. ${e.title}: ${e.summary}`).join('\n')
    : '（无现有证据）';

  return `请基于以下证据，综合提炼出可操作的行业洞察：

专题：${ctx.topic}
目标角色：${ctx.audienceRole || '老板'}

现有证据：
${evidenceList}

要求：
1. 跨证据归纳共性（3-5 条）
2. 识别证据间的关联
3. 提炼对目标角色的行动建议
4. 标注每条洞察的置信度和证据强度

请严格以 JSON 格式返回：
{
  "insights": [
    {
      "summary": "洞察描述",
      "supportingEvidence": [1, 2],
      "confidence": 0.8,
      "evidenceStrength": "strong|moderate|weak"
    }
  ],
  "actionAdvice": [
    {
      "role": "${ctx.audienceRole || '老板'}",
      "advice": "行动建议",
      "urgency": "immediate|watch|info"
    }
  ]
}`;
}
