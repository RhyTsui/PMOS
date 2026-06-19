import { createHash } from 'node:crypto';
import type { PromptConfig } from '@/types';
import type { PromptResolution } from './prompt-store';

export type PromptRuntimePolicy = {
  hideInternalDetailsInMain: boolean;
  hideProjectIdentifiers: boolean;
  evidenceInDetails: boolean;
  visualPreference: 'table' | 'chart' | 'auto';
  emptyValueDisplay: string;
  allowAutoExecuteLowRiskActions: boolean;
};

export type RuntimePromptSlot =
  | 'route_prompt'
  | 'response_prompt'
  | 'evidence_prompt'
  | 'card_prompt'
  | 'followup_prompt'
  | 'tool_explain_prompt'
  | 'report_query_route_prompt'
  | 'report_query_answer_prompt'
  | 'report_query_visual_prompt'
  | 'report_query_evidence_prompt';

export type PromptConfigMetadata = Record<RuntimePromptSlot, {
  id: string;
  version: number;
  name: string;
  source: PromptResolution['source'];
  activePromptId: string;
  activePromptVersion: string;
  seedFallbackUsed: boolean;
  fallback: boolean;
  cache_hit: boolean;
  cacheHit: boolean;
  match_strategy: string;
  content_hash: string;
  contentHash: string;
  content_length: number;
  conflicts: PromptResolution['conflicts'];
  conflictWarnings: string[];
} | undefined>;

export type RuntimePromptMap = Record<RuntimePromptSlot, PromptResolution>;

export function hashPromptContent(content: string): string {
  return createHash('sha256').update(content || '', 'utf8').digest('hex');
}

export function buildPromptConfigMetadata(prompts: RuntimePromptMap): PromptConfigMetadata {
  return Object.fromEntries(
    Object.entries(prompts).map(([slot, resolution]) => {
      const prompt = resolution.prompt as PromptConfig | undefined;
      if (!prompt) return [slot, undefined];
      return [slot, {
        id: prompt.id,
        version: prompt.current_version,
        name: prompt.name,
        source: resolution.source,
        activePromptId: prompt.id,
        activePromptVersion: String(prompt.current_version),
        seedFallbackUsed: resolution.fallback,
        fallback: resolution.fallback,
        cache_hit: resolution.cache_hit,
        cacheHit: resolution.cache_hit,
        match_strategy: resolution.match_strategy,
        content_hash: hashPromptContent(resolution.content),
        contentHash: hashPromptContent(resolution.content),
        content_length: resolution.content.length,
        conflicts: resolution.conflicts,
        conflictWarnings: resolution.conflicts.map(conflict => `${conflict.reason}:${conflict.prompt_ids.join(',')}`),
      }];
    }),
  ) as PromptConfigMetadata;
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => text.includes(pattern));
}

function extractEmptyValueDisplay(text: string): string {
  const match = /空值(?:统一)?显示为\s*([^\s。；;]+)/.exec(text);
  return match?.[1] || '--';
}

export function buildPromptRuntimePolicy(prompts: RuntimePromptMap): PromptRuntimePolicy {
  const combined = Object.values(prompts).map(item => item.content || '').join('\n');
  const visual = prompts.report_query_visual_prompt.content || '';
  const followup = prompts.followup_prompt.content || '';

  return {
    hideInternalDetailsInMain: includesAny(combined, ['禁止展示', '不要展示', '不暴露', '不默认展开']),
    hideProjectIdentifiers: includesAny(combined, ['项目 ID', 'APPID', 'appId', 'projectId']),
    evidenceInDetails: includesAny(combined, ['执行详情', 'evidence_bundle', 'execution_context', '右侧']),
    visualPreference: visual.includes('全局优先表格') || visual.includes('始终优先表格')
      ? 'table'
      : visual.includes('优先图表')
        ? 'chart'
        : 'auto',
    emptyValueDisplay: extractEmptyValueDisplay(visual),
    allowAutoExecuteLowRiskActions: includesAny(followup, ['低风险', 'auto_executable=true', '可以自动执行']),
  };
}
