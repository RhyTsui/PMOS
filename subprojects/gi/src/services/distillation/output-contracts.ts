/**
 * 蒸馏任务输出契约
 *
 * 定义每种任务类型的 LLM 输出结构。
 * 用于从 LLM 返回的文本中解析出结构化数据。
 */
import type { DistillationTaskType } from './prompt-templates.js';

// ===== 输出类型定义 =====

export interface DiscoveredSource {
  name: string;
  type: string;
  reason: string;
  keywords: string[];
  url?: string;
  confidence: number;
}

export interface DiscoveredTrend {
  summary: string;
  signals: string[];
  verificationKeywords: string[];
  priority: 'high' | 'medium' | 'low';
  direction: 'rising' | 'emerging' | 'declining';
  confidence: number;
}

export interface VerificationQuery {
  keywords: string[];
  strategy: string;
  expectedHitRate: 'high' | 'medium' | 'low';
  sourcePreference: 'official' | 'media' | 'community' | 'any';
}

export interface BenchmarkEstimate {
  metricName: string;
  valueRange: {
    min: number;
    max: number;
    p50?: number;
  };
  unit?: string;
  applicableConditions: string[];
  confidence: number;
  sourceType: 'report' | 'database' | 'model' | 'expert';
}

export interface FactCheckResult {
  claim: string;
  analysis: string;
  consistencyWithKnownFacts: 'high' | 'medium' | 'low';
  informationGaps: string[];
  verificationSteps: string[];
  confidence: number;
  verdict: 'verified' | 'unverified' | 'conflicted' | 'low_confidence';
}

export interface SynthesizedInsight {
  summary: string;
  supportingEvidence: number[];
  confidence: number;
  evidenceStrength: 'strong' | 'moderate' | 'weak';
}

export interface ActionAdvice {
  role: string;
  advice: string;
  urgency: 'immediate' | 'watch' | 'info';
}

// ===== 输出结果类型 =====

export interface DiscoverSourcesOutput {
  sources: DiscoveredSource[];
}

export interface DiscoverTrendOutput {
  trends: DiscoveredTrend[];
}

export interface GenerateQueriesOutput {
  queries: VerificationQuery[];
}

export interface BenchmarkOutput {
  benchmarks: BenchmarkEstimate[];
}

export interface FactCheckOutput {
  factCheck: FactCheckResult;
}

export interface InsightSynthesisOutput {
  insights: SynthesizedInsight[];
  actionAdvice: ActionAdvice[];
}

// ===== 类型映射 =====

export type DistillationOutput =
  | DiscoverSourcesOutput
  | DiscoverTrendOutput
  | GenerateQueriesOutput
  | BenchmarkOutput
  | FactCheckOutput
  | InsightSynthesisOutput;

export type DistillationOutputMap = {
  discover_sources: DiscoverSourcesOutput;
  discover_trend_hypothesis: DiscoverTrendOutput;
  generate_verification_queries: GenerateQueriesOutput;
  benchmark_estimation: BenchmarkOutput;
  fact_check: FactCheckOutput;
  insight_synthesis: InsightSynthesisOutput;
};

// ===== 解析工具 =====

/**
 * 从 LLM 返回的文本中解析 JSON
 */
export function parseDistillationOutput<T extends DistillationTaskType>(
  taskType: T,
  text: string,
): DistillationOutputMap[T] {
  // 尝试直接解析
  try {
    const parsed = JSON.parse(text.trim());
    return validateOutput(taskType, parsed) as DistillationOutputMap[T];
  } catch {
    // 尝试从 markdown code block 提取
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        return validateOutput(taskType, parsed) as DistillationOutputMap[T];
      } catch {
        // fall through
      }
    }

    // 尝试找到第一个 { 和最后一个 } 之间的内容
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
        return validateOutput(taskType, parsed) as DistillationOutputMap[T];
      } catch {
        // fall through
      }
    }

    throw new Error(`无法解析任务 ${taskType} 的 LLM 输出为 JSON: ${text.slice(0, 200)}`);
  }
}

/**
 * 验证输出结构是否符合契约
 */
function validateOutput(taskType: DistillationTaskType, data: unknown): DistillationOutput {
  if (!data || typeof data !== 'object') {
    throw new Error('输出必须是对象');
  }

  const obj = data as Record<string, unknown>;

  switch (taskType) {
    case 'discover_sources':
      return validateDiscoverSources(obj);
    case 'discover_trend_hypothesis':
      return validateDiscoverTrend(obj);
    case 'generate_verification_queries':
      return validateGenerateQueries(obj);
    case 'benchmark_estimation':
      return validateBenchmark(obj);
    case 'fact_check':
      return validateFactCheck(obj);
    case 'insight_synthesis':
      return validateInsightSynthesis(obj);
    default:
      throw new Error(`未知任务类型: ${taskType}`);
  }
}

function validateDiscoverSources(obj: Record<string, unknown>): DiscoverSourcesOutput {
  const sources = obj.sources;
  if (!Array.isArray(sources)) {
    throw new Error('discover_sources 输出必须包含 sources 数组');
  }
  return {
    sources: sources.map((s: any) => ({
      name: String(s.name || ''),
      type: String(s.type || 'other'),
      reason: String(s.reason || ''),
      keywords: Array.isArray(s.keywords) ? s.keywords.map(String) : [],
      url: s.url ? String(s.url) : undefined,
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.5,
    })),
  };
}

function validateDiscoverTrend(obj: Record<string, unknown>): DiscoverTrendOutput {
  const trends = obj.trends;
  if (!Array.isArray(trends)) {
    throw new Error('discover_trend_hypothesis 输出必须包含 trends 数组');
  }
  return {
    trends: trends.map((t: any) => ({
      summary: String(t.summary || ''),
      signals: Array.isArray(t.signals) ? t.signals.map(String) : [],
      verificationKeywords: Array.isArray(t.verificationKeywords) ? t.verificationKeywords.map(String) : [],
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
      direction: ['rising', 'emerging', 'declining'].includes(t.direction) ? t.direction : 'rising',
      confidence: typeof t.confidence === 'number' ? t.confidence : 0.5,
    })),
  };
}

function validateGenerateQueries(obj: Record<string, unknown>): GenerateQueriesOutput {
  const queries = obj.queries;
  if (!Array.isArray(queries)) {
    throw new Error('generate_verification_queries 输出必须包含 queries 数组');
  }
  return {
    queries: queries.map((q: any) => ({
      keywords: Array.isArray(q.keywords) ? q.keywords.map(String) : [],
      strategy: String(q.strategy || ''),
      expectedHitRate: ['high', 'medium', 'low'].includes(q.expectedHitRate) ? q.expectedHitRate : 'medium',
      sourcePreference: ['official', 'media', 'community', 'any'].includes(q.sourcePreference) ? q.sourcePreference : 'any',
    })),
  };
}

function validateBenchmark(obj: Record<string, unknown>): BenchmarkOutput {
  const benchmarks = obj.benchmarks;
  if (!Array.isArray(benchmarks)) {
    throw new Error('benchmark_estimation 输出必须包含 benchmarks 数组');
  }
  return {
    benchmarks: benchmarks.map((b: any) => ({
      metricName: String(b.metricName || ''),
      valueRange: {
        min: Number(b.valueRange?.min ?? 0),
        max: Number(b.valueRange?.max ?? 0),
        p50: b.valueRange?.p50 !== undefined ? Number(b.valueRange.p50) : undefined,
      },
      unit: b.unit ? String(b.unit) : undefined,
      applicableConditions: Array.isArray(b.applicableConditions) ? b.applicableConditions.map(String) : [],
      confidence: typeof b.confidence === 'number' ? b.confidence : 0.5,
      sourceType: ['report', 'database', 'model', 'expert'].includes(b.sourceType) ? b.sourceType : 'model',
    })),
  };
}

function validateFactCheck(obj: Record<string, unknown>): FactCheckOutput {
  const fc = obj as any;
  return {
    factCheck: {
      claim: String(fc.claim || ''),
      analysis: String(fc.analysis || ''),
      consistencyWithKnownFacts: ['high', 'medium', 'low'].includes(fc.consistencyWithKnownFacts)
        ? fc.consistencyWithKnownFacts
        : 'medium',
      informationGaps: Array.isArray(fc.informationGaps) ? fc.informationGaps.map(String) : [],
      verificationSteps: Array.isArray(fc.verificationSteps) ? fc.verificationSteps.map(String) : [],
      confidence: typeof fc.confidence === 'number' ? fc.confidence : 0.5,
      verdict: ['verified', 'unverified', 'conflicted', 'low_confidence'].includes(fc.verdict)
        ? fc.verdict
        : 'unverified',
    },
  };
}

function validateInsightSynthesis(obj: Record<string, unknown>): InsightSynthesisOutput {
  const insights = obj.insights;
  const actionAdvice = obj.actionAdvice;
  if (!Array.isArray(insights)) {
    throw new Error('insight_synthesis 输出必须包含 insights 数组');
  }
  return {
    insights: insights.map((i: any) => ({
      summary: String(i.summary || ''),
      supportingEvidence: Array.isArray(i.supportingEvidence) ? i.supportingEvidence.map(Number) : [],
      confidence: typeof i.confidence === 'number' ? i.confidence : 0.5,
      evidenceStrength: ['strong', 'moderate', 'weak'].includes(i.evidenceStrength) ? i.evidenceStrength : 'moderate',
    })),
    actionAdvice: Array.isArray(actionAdvice)
      ? actionAdvice.map((a: any) => ({
          role: String(a.role || ''),
          advice: String(a.advice || ''),
          urgency: ['immediate', 'watch', 'info'].includes(a.urgency) ? a.urgency : 'info',
        }))
      : [],
  };
}
