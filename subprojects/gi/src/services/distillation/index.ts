export { DistillationService } from './distillation-service.js';
export type { DistillationJobConfig, DistillationResult } from './distillation-service.js';
export { CostTracker, getCostTracker } from './cost-tracker.js';
export type { CostRecord, DailyCostSummary } from './cost-tracker.js';
export {
  getSystemPrompt,
  buildUserPrompt,
  type DistillationTaskType,
  type PromptTemplateContext,
} from './prompt-templates.js';
export {
  parseDistillationOutput,
  type DiscoveredSource,
  type DiscoveredTrend,
  type VerificationQuery,
  type BenchmarkEstimate,
  type FactCheckResult,
  type SynthesizedInsight,
  type ActionAdvice,
} from './output-contracts.js';
