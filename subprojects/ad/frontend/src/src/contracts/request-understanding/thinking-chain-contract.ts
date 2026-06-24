/**
 * Thinking Chain Contract — 四层思维链结构化输出
 *
 * 将现有 pipeline 产物投影为「识别层 → 判断层 → 推进层 → 表达层」四层结构。
 * 纯视图投影，不改变执行流、不引入新的执行阶段、不影响现有字段语义。
 *
 * 设计原则：
 * 1. 每层只返回结构化字段，不输出裸模型链路
 * 2. 所有字段均可从现有 PipelineRouteDecisionMetadata / ProgressiveServicePolicy 推导
 * 3. 供 trace 回放、管理员观测、前端披露面板消费
 */

import type {
  ReasoningPolicy,
  AmbiguityClass,
  RiskLevel,
  FollowUpMode,
} from './route-decision-contract';
import type { ServiceType } from '../service-catalog/service-catalog-contract';

// ─── 识别层（Identify）─────────────────────────────────────

export interface ServiceCandidateProjection {
  type: string;
  score: number;
  reason: string;
}

export interface UrlCueProjection {
  raw: string;
  normalized: string;
  domainIntent?: string;
}

export interface IdentifyLayer {
  serviceType: string;
  serviceCandidates: ServiceCandidateProjection[];
  selectedService: string;
  urlCues?: UrlCueProjection[];
}

// ─── 判断层（Judge）────────────────────────────────────────

export interface JudgeLayer {
  reasoningPolicy: ReasoningPolicy | string;
  ambiguityClass: AmbiguityClass | string;
  riskLevel: RiskLevel | string;
  executionMode: string;
  urlEvidenceGap?: boolean;
}

// ─── 推进层（Advance）───────────────────────────────────────

export interface AdvanceLayer {
  defaultScope: Record<string, unknown>;
  minimumViableQuery: Record<string, unknown>;
  secondHopStrategy?: string;
  confirmationGate?: string;
  urlHypotheses?: Array<{ keyword: string; source: string }>;
  /** 因果推理骨架（诊断域） */
  causalSkeleton?: {
    rootQuestion: string;
    overallConfidence: number;
    nodeCount: number;
  };
}

// ─── 表达层（Express）───────────────────────────────────────

export type AnswerMode =
  | 'business_summary'
  | 'business_summary_with_follow_up'
  | 'blocking_confirmation'
  | 'evidence_first_with_hypotheses'
  | 'failure_translation'
  | 'capability_gap_disclosure'
  | 'direct_answer';

export type DisclosureLevel =
  | 'user_readable'
  | 'side_panel_only'
  | 'admin_trace_only';

export interface ExpressLayer {
  answerMode: AnswerMode;
  disclosureLevel: DisclosureLevel;
  followUpMode: FollowUpMode | string;
  followUpQuestion?: string;
  suggestedActions?: string[];
}

// ─── 四层聚合 ──────────────────────────────────────────────

export interface ThinkingChainLayers {
  identify: IdentifyLayer;
  judge: JudgeLayer;
  advance: AdvanceLayer;
  express: ExpressLayer;
}
