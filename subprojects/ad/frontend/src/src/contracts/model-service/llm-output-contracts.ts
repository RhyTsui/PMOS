import { createHash } from 'node:crypto';
import { z } from 'zod';

const forbiddenKeys = new Set([
  'finalArgs',
  'final_arguments',
  'toolArguments',
  'tool_arguments',
  'mediaId',
  'media_id',
  'appId',
  'app_id',
  'projectId',
  'project_id',
  'promotionSource',
  'promotion_source_external',
]);

export const QueryUnderstandingContractSchema = z.object({
  intent: z.string().optional(),
  metrics: z.array(z.string()).default([]),
  dimensions: z.array(z.string()).default([]),
  dateRange: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    rawText: z.string().optional(),
  }).optional(),
  terminalOsCandidates: z.array(z.string()).default([]),
  promotionSourceSemantic: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.array(z.string()).default([]),
}).strict();

export const RequestUnderstandingContractSchema = z.object({
  user_goal: z.string(),
  intent_type: z.enum(['ask', 'analyze', 'execute', 'report', 'diagnose', 'create', 'approve', 'chat', 'clarify']),
  domain_signals: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  context_refs: z.array(z.string()).default([]),
  missing_info: z.array(z.string()).default([]),
  risk_flags: z.array(z.string()).default([]),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict();

export const TaskPlanContractSchema = z.object({
  planner_source: z.enum(['model', 'intentorch', 'rules']),
  task_type: z.enum(['chat', 'knowledge_lookup', 'public_lookup', 'business_tool', 'report', 'diagnose', 'clarify']),
  candidate_paths: z.array(z.object({
    path_id: z.string(),
    sources: z.array(z.enum(['mcp', 'api', 'knowledge', 'public_web', 'file', 'model'])).default([]),
    required_evidence: z.array(z.string()).default([]),
    required_inputs: z.array(z.string()).default([]),
    risk_flags: z.array(z.string()).default([]),
    confidence: z.enum(['high', 'medium', 'low']),
  }).strict()).default([]),
  recommended_path_id: z.string().optional(),
  clarification: z.object({
    required: z.boolean(),
    question: z.string().optional(),
  }).optional(),
}).strict();

export const AnswerCompositionContractSchema = z.object({
  answerMarkdown: z.string(),
  sourceRefs: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  confidence: z.enum(['high', 'medium', 'low', 'unknown']).default('unknown'),
  disclaimers: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
}).strict();

export const DetectedEntityContractSchema = z.object({
  entities: z.array(z.object({
    entityType: z.enum(['media', 'app', 'project', 'terminal_os', 'promotion_source', 'metric', 'date_range', 'unknown']),
    rawText: z.string(),
    normalizedCandidate: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    source: z.enum(['model_candidate']).default('model_candidate'),
  }).strict().superRefine((entity, context) => {
    if (
      ['media', 'app', 'project'].includes(entity.entityType)
      && typeof entity.normalizedCandidate === 'string'
      && /^\d+$/.test(entity.normalizedCandidate.trim())
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['normalizedCandidate'],
        message: 'model entity candidates must not contain final numeric IDs',
      });
    }
  })).default([]),
}).strict();

export const AmbiguityDecisionContractSchema = z.object({
  hasAmbiguity: z.boolean(),
  reason: z.string().optional(),
  suggestedQuestion: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
}).strict();

export const GroundedInterpretationContractSchema = z.object({
  summary: z.string(),
  evidenceRefs: z.array(z.string()).default([]),
  sourceRefs: z.array(z.string()).default([]),
  caveats: z.array(z.string()).default([]),
}).strict();

export const EvidenceGroundedDiagnosisContractSchema = z.object({
  diagnosis: z.string(),
  evidenceRefs: z.array(z.string()).default([]),
  riskLevel: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  nextActions: z.array(z.string()).default([]),
}).strict();

export const GroundedAnswerContractSchema = z.object({
  answerMarkdown: z.string(),
  evidenceRefs: z.array(z.string()).default([]),
  sourceRefs: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
}).strict();

export const FailureExplanationContractSchema = z.object({
  reason: z.string(),
  risk: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  userMessage: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([]),
  sourceRefs: z.array(z.string()).default([]),
}).strict();

export const DraftTextContractSchema = z.object({
  draftText: z.string(),
}).strict();

export const RecommendationContractSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    prompt: z.string(),
    reason: z.string().optional(),
    category: z.enum(['help', 'demand', 'diagnosis', 'debugging']),
  }).strict()).max(3),
}).strict();

export const TitleTextContractSchema = z.object({
  titleText: z.string(),
}).strict();

export type QueryUnderstandingContract = z.infer<typeof QueryUnderstandingContractSchema>;
export type RequestUnderstandingContract = z.infer<typeof RequestUnderstandingContractSchema>;
export type TaskPlanContract = z.infer<typeof TaskPlanContractSchema>;
export type AnswerCompositionContract = z.infer<typeof AnswerCompositionContractSchema>;
export type DetectedEntityContract = z.infer<typeof DetectedEntityContractSchema>;
export type AmbiguityDecisionContract = z.infer<typeof AmbiguityDecisionContractSchema>;
export type GroundedInterpretationContract = z.infer<typeof GroundedInterpretationContractSchema>;
export type EvidenceGroundedDiagnosisContract = z.infer<typeof EvidenceGroundedDiagnosisContractSchema>;
export type GroundedAnswerContract = z.infer<typeof GroundedAnswerContractSchema>;
export type FailureExplanationContract = z.infer<typeof FailureExplanationContractSchema>;
export type DraftTextContract = z.infer<typeof DraftTextContractSchema>;
export type RecommendationContract = z.infer<typeof RecommendationContractSchema>;
export type TitleTextContract = z.infer<typeof TitleTextContractSchema>;

export type ModelOutputContractName =
  | 'RequestUnderstandingContract'
  | 'TaskPlanContract'
  | 'AnswerCompositionContract'
  | 'QueryUnderstandingContract'
  | 'DetectedEntityContract'
  | 'AmbiguityDecisionContract'
  | 'GroundedInterpretationContract'
  | 'EvidenceGroundedDiagnosisContract'
  | 'GroundedAnswerContract'
  | 'FailureExplanationContract'
  | 'DraftTextContract'
  | 'RecommendationContract'
  | 'TitleTextContract';

const contractSchemas: Record<ModelOutputContractName, z.ZodType> = {
  RequestUnderstandingContract: RequestUnderstandingContractSchema,
  TaskPlanContract: TaskPlanContractSchema,
  AnswerCompositionContract: AnswerCompositionContractSchema,
  QueryUnderstandingContract: QueryUnderstandingContractSchema,
  DetectedEntityContract: DetectedEntityContractSchema,
  AmbiguityDecisionContract: AmbiguityDecisionContractSchema,
  GroundedInterpretationContract: GroundedInterpretationContractSchema,
  EvidenceGroundedDiagnosisContract: EvidenceGroundedDiagnosisContractSchema,
  GroundedAnswerContract: GroundedAnswerContractSchema,
  FailureExplanationContract: FailureExplanationContractSchema,
  DraftTextContract: DraftTextContractSchema,
  RecommendationContract: RecommendationContractSchema,
  TitleTextContract: TitleTextContractSchema,
};

function walkForbiddenKeys(value: unknown, path: string[] = []): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => walkForbiddenKeys(item, [...path, String(index)]));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const currentPath = [...path, key];
    const own = forbiddenKeys.has(key) ? [currentPath.join('.')] : [];
    return [...own, ...walkForbiddenKeys(nested, currentPath)];
  });
}

export function hashModelValue(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value ?? null)).digest('hex').slice(0, 16);
}

export function validateModelOutputContract(contractName: string, output: unknown): {
  validationStatus: 'passed' | 'failed';
  validationError?: string;
  blockedByPolicy: boolean;
  droppedFields: string[];
  dropReason?: string;
} {
  const droppedFields = walkForbiddenKeys(output);
  if (droppedFields.length) {
    return {
      validationStatus: 'failed',
      validationError: `blocked forbidden model output fields: ${droppedFields.join(', ')}`,
      blockedByPolicy: true,
      droppedFields,
      dropReason: 'forbidden_model_authority',
    };
  }
  const schema = contractSchemas[contractName as ModelOutputContractName];
  if (!schema) return { validationStatus: 'passed', blockedByPolicy: false, droppedFields: [] };
  const parsed = schema.safeParse(output);
  if (parsed.success) return { validationStatus: 'passed', blockedByPolicy: false, droppedFields: [] };
  return {
    validationStatus: 'failed',
    validationError: parsed.error.issues.map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; '),
    blockedByPolicy: false,
    droppedFields: [],
  };
}
