import { z } from 'zod';

export const ArtifactKindSchema = z.enum(['document', 'json', 'code', 'config']);
export const StageStatusSchema = z.enum(['pending', 'active', 'completed', 'blocked']);
export const WorkflowRunStatusSchema = z.enum(['draft', 'running', 'completed', 'needs-rework', 'blocked']);
export const ReviewDecisionSchema = z.enum(['Pass', 'Conditional', 'Reject']);
export const TaskPrioritySchema = z.enum(['P0', 'P1', 'P2']);
export const WorkflowStageCapabilitySchema = z.enum(['system', 'text', 'review', 'multimodal']);
export const ProviderCapabilitySchema = z.enum([
  'text',
  'code',
  'review',
  'multimodal',
  'text-multimodal',
  'image-generation',
  'video-generation',
  'prototype-generation',
]);
export const ProviderExecutionStatusSchema = z.enum(['success', 'error']);

export const ArtifactSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stageId: z.string(),
  title: z.string(),
  path: z.string(),
  stage: z.string(),
  type: ArtifactKindSchema,
});

export const WorkflowStageOutputSchema = z.object({
  path: z.string(),
  kind: ArtifactKindSchema,
  required: z.boolean(),
});

export const WorkflowStageGateSchema = z.object({
  reviewRequired: z.boolean(),
  allowRework: z.boolean(),
});

export const WorkflowStageDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int().positive(),
  ownerRole: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  requiredOutputs: z.array(WorkflowStageOutputSchema),
  priority: TaskPrioritySchema,
  capability: WorkflowStageCapabilitySchema,
  dependsOn: z.array(z.string()),
  gate: WorkflowStageGateSchema,
});

export const WorkflowStageRunSchema = z.object({
  id: z.string(),
  label: z.string(),
  ownerRole: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  requiredOutputs: z.array(WorkflowStageOutputSchema),
  priority: TaskPrioritySchema,
  capability: WorkflowStageCapabilitySchema,
  dependsOn: z.array(z.string()),
  gate: WorkflowStageGateSchema,
  status: StageStatusSchema,
  outputPaths: z.array(z.string()),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  blockedReason: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  summary: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const WorkflowTaskSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stageId: z.string(),
  title: z.string(),
  description: z.string(),
  ownerRole: z.string(),
  priority: TaskPrioritySchema,
  dependsOn: z.array(z.string()),
  status: StageStatusSchema,
  acceptanceCriteria: z.array(z.string()),
  artifactPaths: z.array(z.string()),
  blockedReason: z.string().nullable(),
  summary: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const WorkflowRunMemorySchema = z.object({
  projectMemoryPath: z.string(),
  runStatePath: z.string(),
  eventLogPath: z.string(),
  projectRoot: z.string(),
  loadedAt: z.string(),
});

export const WorkflowReworkStateSchema = z.object({
  sourceStageId: z.string(),
  targetStageId: z.string(),
  reason: z.string(),
  triggeredAt: z.string(),
});

export const SubprojectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  defaultWorkflow: z.string(),
  rootPath: z.string(),
  memoryPath: z.string(),
  overrides: z
    .object({
      provider: z.string().optional(),
      providerConfigPath: z.string().optional(),
      workflow: z.string().optional(),
      mcpConfigPath: z.string().optional(),
      skillConfigPath: z.string().optional(),
    })
    .default({}),
});

export const ChatSessionStatusSchema = z.enum(['active', 'archived']);
export const ChatMessageRoleSchema = z.enum(['user', 'assistant', 'system', 'agent', 'service']);
export const ConversationOperatorRoleSchema = z.enum(['product-supervisor', 'project-pm', 'cross-project-pm']);
export const ConversationScopeTypeSchema = z.enum(['platform', 'subproject', 'multi-subproject']);
export const WorkspaceEntryTypeSchema = z.enum(['platform-root', 'subproject-root', 'unknown']);
export const ExecutionRunTypeSchema = z.enum(['assistant_turn', 'agent', 'workflow', 'service', 'workspace_sync']);
export const ExecutionRunStatusSchema = z.enum(['pending', 'running', 'completed', 'blocked', 'failed']);
export const ProductAgentStatusSchema = z.enum(['draft', 'ready', 'archived']);
export const ProductAgentSourceSchema = z.enum(['workspace', 'cli', 'api']);
export const ProductAgentRoleSchema = z.enum([
  'general',
  'product-management',
  'requirements',
  'versioning',
  'review',
  'workflow',
  'delivery',
  'retrospective',
  'industry-research',
  'user-research',
  'competitive-analysis',
  'stakeholder-analysis',
  'roi-analysis',
  'strategy',
  'roadmap-planning',
  'documentation',
  'experience-design',
]);
export const ProductAgentLevelSchema = z.enum(['supervisor', 'manager', 'specialist']);
export const ProductAgentScopeSchema = z.enum(['platform', 'shared', 'subproject']);
export const CapabilityLifecycleStatusSchema = z.enum(['draft', 'ready', 'published', 'deprecated']);
export const CapabilityVisibilitySchema = z.enum(['private', 'internal', 'public']);
export const CapabilityImplementationTypeSchema = z.enum(['product-agent', 'workflow']);
export const CapabilityVersionStatusSchema = z.enum(['draft', 'candidate', 'published', 'rolled-back']);
export const CapabilityInvocationStatusSchema = z.enum(['accepted', 'completed', 'failed']);
export const EvaluationRunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export const RequirementCategorySchema = z.enum(['feature', 'bug', 'architecture']);
export const RequirementStatusSchema = z.enum(['draft', 'active', 'done', 'archived']);
export const VersionEntityTypeSchema = z.enum(['capability', 'requirement', 'workflow', 'chat', 'product-output', 'document-normalization']);
export const ObservabilitySourceKindSchema = z.enum(['execution', 'workflow']);
export const ExecutionEventKindSchema = z.enum([
  'run_created',
  'run_completed',
  'message_received',
  'context_resolved',
  'provider_invoked',
  'provider_succeeded',
  'provider_failed',
  'agent_spawned',
  'workflow_started',
  'workflow_completed',
  'service_called',
  'message_emitted',
]);

export const ChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  defaultSubprojectId: z.string().nullable(),
  operatorRole: ConversationOperatorRoleSchema.default('product-supervisor'),
  scopeType: ConversationScopeTypeSchema.default('platform'),
  primarySubprojectId: z.string().nullable().default(null),
  linkedSubprojectIds: z.array(z.string()).default([]),
  workspacePath: z.string().nullable().default(null),
  workspaceEntryType: WorkspaceEntryTypeSchema.default('unknown'),
  status: ChatSessionStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: ChatMessageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
  parentMessageId: z.string().nullable(),
  runId: z.string().nullable(),
  contextSnapshotId: z.string().nullable(),
  subprojectId: z.string().nullable(),
});

export const ContextSnapshotSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  subprojectId: z.string().nullable(),
  operatorRole: ConversationOperatorRoleSchema.default('product-supervisor'),
  scopeType: ConversationScopeTypeSchema.default('platform'),
  primarySubprojectId: z.string().nullable().default(null),
  linkedSubprojectIds: z.array(z.string()).default([]),
  inheritsFromSnapshotId: z.string().nullable(),
  messageIdsIncluded: z.array(z.string()),
  platformMemoryRefs: z.array(z.string()),
  subprojectMemoryRefs: z.array(z.string()),
  truthSourceRefs: z.array(z.string()),
  contextDocRefs: z.array(z.string()),
  artifactRefs: z.array(z.string()),
  workflowRunRefs: z.array(z.string()),
  workflowEventRefs: z.array(z.string()),
  contextSummary: z.string().nullable(),
  permissions: z.array(z.string()),
  createdAt: z.string(),
});

export const ExecutionRunSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  subprojectId: z.string().nullable(),
  runType: ExecutionRunTypeSchema,
  parentRunId: z.string().nullable(),
  inputMessageId: z.string().nullable(),
  outputMessageIds: z.array(z.string()),
  contextSnapshotId: z.string(),
  workflowRunId: z.string().nullable(),
  linkedWorkflowRunIds: z.array(z.string()),
  source: z.enum(['workspace', 'cli', 'api']).default('workspace'),
  status: ExecutionRunStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ExecutionEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  sessionId: z.string(),
  subprojectId: z.string().nullable(),
  kind: ExecutionEventKindSchema,
  status: z.enum(['ok', 'warning', 'error']),
  timestamp: z.string(),
  detail: z.string(),
  messageId: z.string().nullable(),
  artifactPath: z.string().nullable(),
  workflowRunId: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const ProductAgentSchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable(),
  name: z.string(),
  status: ProductAgentStatusSchema,
  source: ProductAgentSourceSchema,
  role: ProductAgentRoleSchema.default('general'),
  level: ProductAgentLevelSchema.default('manager'),
  scope: ProductAgentScopeSchema.default('platform'),
  summary: z.string(),
  problem: z.string(),
  targetUsers: z.array(z.string()),
  goals: z.array(z.string()),
  nonGoals: z.array(z.string()),
  constraints: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  relatedPaths: z.array(z.string()),
  governanceRefs: z.array(z.string()).default([]),
  managedAgentIds: z.array(z.string()).default([]),
  promptPath: z.string().nullable().default(null),
  templateId: z.string().nullable().default(null),
  contextSnapshotId: z.string().nullable(),
  chatSessionId: z.string().nullable(),
  generatedByRunId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CapabilityGateSnapshotSchema = z.object({
  testsPassed: z.boolean(),
  reviewPassed: z.boolean(),
  evaluationPassed: z.boolean(),
  publishable: z.boolean(),
  reasons: z.array(z.string()),
  evaluatedAt: z.string(),
});

export const CapabilityVersionSchema = z.object({
  version: z.string(),
  status: CapabilityVersionStatusSchema,
  releaseNotes: z.string().nullable(),
  reviewSummary: z.string().nullable(),
  gate: CapabilityGateSnapshotSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()),
});

export const CapabilityDefinitionSchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  lifecycleStatus: CapabilityLifecycleStatusSchema,
  visibility: CapabilityVisibilitySchema,
  implementationType: CapabilityImplementationTypeSchema,
  implementationRef: z.string(),
  inputSchema: z.unknown(),
  outputSchema: z.unknown(),
  permissions: z.array(z.string()),
  tags: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  activeVersion: z.string().nullable(),
  versions: z.array(CapabilityVersionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()),
});

export const CapabilityEvaluationDimensionSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(1),
  summary: z.string(),
});

export const CapabilityEvaluationSchema = z.object({
  id: z.string(),
  capabilityId: z.string(),
  version: z.string(),
  subprojectId: z.string().nullable(),
  evaluator: z.string(),
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  summary: z.string(),
  dimensions: z.array(CapabilityEvaluationDimensionSchema),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
});

export const EvaluationDatasetCaseSchema = z.object({
  id: z.string(),
  input: z.unknown(),
  expected: z.unknown(),
  rubric: z.array(z.string()),
  metadata: z.record(z.unknown()),
});

export const EvaluationDatasetSchema = z.object({
  id: z.string(),
  capabilityId: z.string(),
  version: z.string(),
  subprojectId: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  cases: z.array(EvaluationDatasetCaseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()),
});

export const EvaluationCaseResultSchema = z.object({
  caseId: z.string(),
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  summary: z.string(),
  output: z.unknown().nullable(),
  metadata: z.record(z.unknown()),
});

export const EvaluationRunSchema = z.object({
  id: z.string(),
  datasetId: z.string(),
  capabilityId: z.string(),
  version: z.string(),
  subprojectId: z.string().nullable(),
  status: EvaluationRunStatusSchema,
  evaluator: z.string(),
  summary: z.string().nullable(),
  aggregatedScore: z.number().min(0).max(1).nullable(),
  passed: z.boolean().nullable(),
  caseResults: z.array(EvaluationCaseResultSchema),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const CapabilityInvocationSchema = z.object({
  id: z.string(),
  capabilityId: z.string(),
  version: z.string(),
  subprojectId: z.string().nullable(),
  status: CapabilityInvocationStatusSchema,
  invokedAt: z.string(),
  completedAt: z.string().nullable(),
  input: z.unknown(),
  output: z.unknown().nullable(),
  error: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const RequirementSchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  category: RequirementCategorySchema,
  status: RequirementStatusSchema,
  priority: TaskPrioritySchema,
  source: z.object({
    kind: z.enum(['chat', 'manual', 'document', 'product-output', 'capability', 'workflow', 'version', 'document-normalization']),
    sessionId: z.string().nullable(),
    messageId: z.string().nullable(),
    runId: z.string().nullable(),
    sourceRef: z
      .object({
        entityType: z.string().nullable().default(null),
        entityId: z.string().nullable().default(null),
        path: z.string().nullable().default(null),
        label: z.string().nullable().default(null),
      })
      .optional(),
  }),
  trace: z.object({
    relatedRequirementIds: z.array(z.string()),
    linkedVersionIds: z.array(z.string()),
    linkedRunIds: z.array(z.string()),
    artifactPaths: z.array(z.string()),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()),
});

export const VersionApprovalSchema = z.object({
  approved: z.boolean(),
  approver: z.string().nullable(),
  approvedAt: z.string().nullable(),
  summary: z.string().nullable(),
});

export const VersionEntrySchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable(),
  entityType: VersionEntityTypeSchema,
  entityId: z.string(),
  changeType: z.string(),
  summary: z.string(),
  previousVersion: z.string().nullable(),
  newVersion: z.string().nullable(),
  requirementIds: z.array(z.string()),
  runId: z.string().nullable(),
  artifactPaths: z.array(z.string()),
  triggeredBy: z.enum(['user', 'agent', 'system', 'webhook']),
  releaseNotes: z.string().nullable().default(null),
  diffSummary: z.string().nullable().default(null),
  rollbackOfVersionEntryId: z.string().nullable().default(null),
  approval: VersionApprovalSchema.nullable().default(null),
  createdAt: z.string(),
  metadata: z.record(z.unknown()),
});

export const ObservabilityTimelineEntrySchema = z.object({
  id: z.string(),
  sourceKind: ObservabilitySourceKindSchema,
  runId: z.string(),
  workflowRunId: z.string().nullable(),
  stageId: z.string().nullable(),
  kind: z.string(),
  status: z.enum(['ok', 'warning', 'error']),
  timestamp: z.string(),
  detail: z.string(),
  artifactPath: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const ObservabilitySummarySchema = z.object({
  executionEventCount: z.number().int().nonnegative(),
  workflowEventCount: z.number().int().nonnegative(),
  linkedWorkflowRunCount: z.number().int().nonnegative(),
  artifactPathCount: z.number().int().nonnegative(),
});

export const WorkflowRunSchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable(),
  projectName: z.string(),
  projectRoot: z.string(),
  selectedProvider: z.string().nullable().default(null),
  providerConfigPath: z.string().nullable().default(null),
  mcpConfigPath: z.string().nullable().default(null),
  name: z.string(),
  status: WorkflowRunStatusSchema,
  currentStageId: z.string().nullable(),
  stages: z.array(WorkflowStageRunSchema),
  tasks: z.array(WorkflowTaskSchema),
  generatedAt: z.string(),
  updatedAt: z.string(),
  memory: WorkflowRunMemorySchema,
  providerCount: z.number().int().nonnegative(),
  mcpServerCount: z.number().int().nonnegative(),
  reworkCount: z.number().int().nonnegative(),
  executionSummary: z.string().nullable(),
  lastReview: z.string().nullable(),
  activeCapability: WorkflowStageCapabilitySchema.nullable(),
  rework: WorkflowReworkStateSchema.nullable(),
  metadata: z.record(z.unknown()),
});

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  defaultLocale: z.string(),
  sourceMarkdownPath: z.string(),
  executionMarkdownPath: z.string(),
  stages: z.array(WorkflowStageDefinitionSchema),
});

export const WorkflowEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stageId: z.string(),
  kind: z.enum([
    'run_initialized',
    'stage_started',
    'stage_completed',
    'stage_blocked',
    'stage_resumed',
    'artifact_written',
    'review_recorded',
    'provider_invoked',
    'provider_succeeded',
    'provider_failed',
  ]),
  status: z.enum(['ok', 'warning', 'error']),
  timestamp: z.string(),
  detail: z.string(),
  artifactPath: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const ExecutionObservabilitySchema = z.object({
  executionRun: ExecutionRunSchema,
  linkedWorkflowRuns: z.array(WorkflowRunSchema),
  timeline: z.array(ObservabilityTimelineEntrySchema),
  artifactPaths: z.array(z.string()),
  summary: ObservabilitySummarySchema,
});

export const WorkflowStageMetricSchema = z.object({
  stageId: z.string(),
  label: z.string(),
  status: StageStatusSchema,
  outputCount: z.number().int().nonnegative(),
  requiredOutputCount: z.number().int().nonnegative(),
  attemptCount: z.number().int().nonnegative(),
});

export const WorkflowMetricsSchema = z.object({
  runId: z.string(),
  generatedAt: z.string(),
  totalStages: z.number().int().nonnegative(),
  completedStages: z.number().int().nonnegative(),
  artifactCount: z.number().int().nonnegative(),
  reviewIssueCount: z.number().int().nonnegative(),
  passCount: z.number().int().nonnegative(),
  conditionalCount: z.number().int().nonnegative(),
  blockedStages: z.number().int().nonnegative(),
  reworkCount: z.number().int().nonnegative(),
  completionRate: z.number(),
  stageMetrics: z.array(WorkflowStageMetricSchema),
});

export const ReviewIssueSchema = z.object({
  title: z.string(),
  description: z.string(),
  impact: z.string(),
  recommendation: z.string(),
  expectedAnswer: z.string(),
  decision: ReviewDecisionSchema,
});

export const CommitteeRoleSchema = z.object({
  role: z.string(),
  issues: z.array(ReviewIssueSchema),
  summary: z.string(),
});

export const ReviewGateSchema = z.object({
  decision: z.enum(['pass', 'conditional', 'reject']),
  blocked: z.boolean(),
  issueCount: z.number().int().nonnegative(),
  blockingStageId: z.string().nullable(),
});

export const CommitteeReportSchema = z.object({
  overallConclusion: z.string(),
  nextStage: z.boolean(),
  reworkRequired: z.boolean(),
  gate: ReviewGateSchema,
  roles: z.array(CommitteeRoleSchema),
  summary: z.string().nullable(),
  recommendedReworkStageId: z.string().nullable(),
});

export const ProviderDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  envKey: z.string(),
  envKeys: z.array(z.string()).default([]),
  legacyEnvKeys: z.array(z.string()).default([]),
  capabilities: z.array(ProviderCapabilitySchema),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  priority: z.number().int().default(0),
  authMode: z.enum(['api-key', 'browser']).default('api-key'),
  scope: z.enum(['runtime', 'codex-only']).default('runtime'),
  keySelection: z.enum(['first', 'random']).default('first'),
  comment: z.string().optional(),
});

export const ProviderConfigSchema = z.object({
  defaultProvider: z.string(),
  providers: z.array(ProviderDefinitionSchema),
});

export const ProviderSummarySchema = z.object({
  name: z.string(),
  type: z.string(),
  configured: z.boolean(),
  runtimeReady: z.boolean(),
  deprecatedEnvInUse: z.boolean(),
  capabilities: z.array(ProviderCapabilitySchema),
  model: z.string().nullable().default(null),
  priority: z.number().int().default(0),
  authMode: z.enum(['api-key', 'browser']).default('api-key'),
  scope: z.enum(['runtime', 'codex-only']).default('runtime'),
});

export const ProviderRoutingEntrySchema = z.object({
  name: z.string(),
  type: z.string(),
  configured: z.boolean(),
  runtimeReady: z.boolean(),
  deprecatedEnvInUse: z.boolean(),
  activeEnvKey: z.string().nullable(),
  capabilities: z.array(ProviderCapabilitySchema),
  model: z.string().nullable().default(null),
  baseUrl: z.string().nullable().default(null),
  priority: z.number().int().default(0),
  authMode: z.enum(['api-key', 'browser']).default('api-key'),
  scope: z.enum(['runtime', 'codex-only']).default('runtime'),
  routedCapability: ProviderCapabilitySchema,
  order: z.number().int().nonnegative(),
  score: z.number().int(),
  coolingDown: z.boolean().default(false),
  cooldownUntil: z.string().nullable().default(null),
});

export const ProviderRoutingSnapshotSchema = z.object({
  capability: ProviderCapabilitySchema,
  preferredProvider: z.string().nullable().default(null),
  defaultProvider: z.string(),
  providers: z.array(ProviderRoutingEntrySchema),
});

export const ProviderExecutionAssetSchema = z.object({
  kind: z.enum(['text', 'image', 'video', 'prototype']),
  mimeType: z.string().nullable(),
  text: z.string().nullable(),
  uri: z.string().nullable(),
});

export const ProviderExecutionResultSchema = z.object({
  providerName: z.string(),
  providerType: z.string(),
  capability: ProviderCapabilitySchema,
  model: z.string(),
  status: ProviderExecutionStatusSchema,
  operationId: z.string().nullable(),
  outputText: z.string().nullable(),
  assets: z.array(ProviderExecutionAssetSchema),
  warning: z.string().nullable(),
  error: z.string().nullable(),
});

export const MultimodalArtifactBlockSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  description: z.string(),
  children: z.array(z.string()),
});

export const MultimodalArtifactSchema = z.object({
  type: z.enum(['ui-structure', 'architecture-outline']),
  title: z.string(),
  summary: z.string(),
  format: z.literal('structured-json'),
  blocks: z.array(MultimodalArtifactBlockSchema),
});

export const MultimodalExecutionResultSchema = z.object({
  providerName: z.string(),
  providerType: z.string(),
  model: z.string(),
  requestedCapability: ProviderCapabilitySchema,
  artifactPath: z.string(),
  artifact: MultimodalArtifactSchema,
  summaryText: z.string(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>;
export type ConversationOperatorRole = z.infer<typeof ConversationOperatorRoleSchema>;
export type ConversationScopeType = z.infer<typeof ConversationScopeTypeSchema>;
export type WorkspaceEntryType = z.infer<typeof WorkspaceEntryTypeSchema>;
export type ExecutionRun = z.infer<typeof ExecutionRunSchema>;
export type ExecutionEventKind = z.infer<typeof ExecutionEventKindSchema>;
export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;
export type ProductAgent = z.infer<typeof ProductAgentSchema>;
export type ProductAgentRole = z.infer<typeof ProductAgentRoleSchema>;
export type ProductAgentLevel = z.infer<typeof ProductAgentLevelSchema>;
export type ProductAgentScope = z.infer<typeof ProductAgentScopeSchema>;
export type CapabilityGateSnapshot = z.infer<typeof CapabilityGateSnapshotSchema>;
export type CapabilityVersion = z.infer<typeof CapabilityVersionSchema>;
export type CapabilityDefinition = z.infer<typeof CapabilityDefinitionSchema>;
export type CapabilityEvaluationDimension = z.infer<typeof CapabilityEvaluationDimensionSchema>;
export type CapabilityEvaluation = z.infer<typeof CapabilityEvaluationSchema>;
export type EvaluationDatasetCase = z.infer<typeof EvaluationDatasetCaseSchema>;
export type EvaluationDataset = z.infer<typeof EvaluationDatasetSchema>;
export type EvaluationCaseResult = z.infer<typeof EvaluationCaseResultSchema>;
export type EvaluationRun = z.infer<typeof EvaluationRunSchema>;
export type CapabilityInvocation = z.infer<typeof CapabilityInvocationSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type VersionApproval = z.infer<typeof VersionApprovalSchema>;
export type VersionEntry = z.infer<typeof VersionEntrySchema>;
export type ObservabilitySourceKind = z.infer<typeof ObservabilitySourceKindSchema>;
export type ObservabilityTimelineEntry = z.infer<typeof ObservabilityTimelineEntrySchema>;
export type ObservabilitySummary = z.infer<typeof ObservabilitySummarySchema>;
export type ExecutionObservability = z.infer<typeof ExecutionObservabilitySchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type WorkflowStageOutput = z.infer<typeof WorkflowStageOutputSchema>;
export type WorkflowStageGate = z.infer<typeof WorkflowStageGateSchema>;
export type WorkflowStageDefinition = z.infer<typeof WorkflowStageDefinitionSchema>;
export type WorkflowStageRun = z.infer<typeof WorkflowStageRunSchema>;
export type WorkflowTask = z.infer<typeof WorkflowTaskSchema>;
export type Subproject = z.infer<typeof SubprojectSchema>;
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
export type WorkflowMetrics = z.infer<typeof WorkflowMetricsSchema>;
export type CommitteeReport = z.infer<typeof CommitteeReportSchema>;
export type ReviewGate = z.infer<typeof ReviewGateSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type WorkflowStageCapability = z.infer<typeof WorkflowStageCapabilitySchema>;
export type ProviderCapability = z.infer<typeof ProviderCapabilitySchema>;
export type ProviderDefinition = z.infer<typeof ProviderDefinitionSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProviderSummary = z.infer<typeof ProviderSummarySchema>;
export type ProviderRoutingEntry = z.infer<typeof ProviderRoutingEntrySchema>;
export type ProviderRoutingSnapshot = z.infer<typeof ProviderRoutingSnapshotSchema>;
export type ProviderExecutionAsset = z.infer<typeof ProviderExecutionAssetSchema>;
export type ProviderExecutionResult = z.infer<typeof ProviderExecutionResultSchema>;
export type MultimodalArtifactBlock = z.infer<typeof MultimodalArtifactBlockSchema>;
export type MultimodalArtifact = z.infer<typeof MultimodalArtifactSchema>;
export type MultimodalExecutionResult = z.infer<typeof MultimodalExecutionResultSchema>;

// ============================================================
// v0.4 DAG Schema（Product Compiler OS 核心）
// ============================================================

// 节点状态
export const DAGNodeStateSchema = z.enum(['clean', 'dirty', 'stale', 'frozen']);
export type DAGNodeState = z.infer<typeof DAGNodeStateSchema>;

// 执行模式
export const DAGExecutionModeSchema = z.enum(['auto', 'lazy', 'manual']);
export type DAGExecutionMode = z.infer<typeof DAGExecutionModeSchema>;

// 单个 DAG 节点定义
export const DAGNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  version: z.string().default('v1'),
  state: DAGNodeStateSchema.default('clean'),
  executionMode: DAGExecutionModeSchema.default('lazy'),
  // 依赖的其他节点（上游）
  dependencies: z.array(z.string()).default([]),
  // 输出的产物路径
  outputs: z.array(z.string()).default([]),
  // 关联的 workflow stage（可选，用于兼容）
  stageId: z.string().nullable().default(null),
  // 优先级
  priority: TaskPrioritySchema.default('P1'),
  // 执行约束
  constraints: z.array(z.string()).default([]),
  // 元数据
  metadata: z.record(z.unknown()).default({}),
});
export type DAGNode = z.infer<typeof DAGNodeSchema>;

// DAG 边定义（显式依赖关系）
export const DAGEdgeSchema = z.object({
  id: z.string(),
  sourceId: z.string(), // 上游节点
  targetId: z.string(), // 下游节点
  dependencyType: z.enum(['strong', 'weak', 'optional']).default('strong'),
  description: z.string().optional(),
});
export type DAGEdge = z.infer<typeof DAGEdgeSchema>;

// DAG 图定义
export const DAGGraphSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  nodes: z.array(DAGNodeSchema),
  edges: z.array(DAGEdgeSchema).default([]),
  executionMode: DAGExecutionModeSchema.default('lazy'),
  metadata: z.record(z.unknown()).default({}),
});
export type DAGGraph = z.infer<typeof DAGGraphSchema>;

// 节点执行结果
export const DAGNodeRunSchema = z.object({
  nodeId: z.string(),
  runId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'blocked', 'failed']),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  outputPaths: z.array(z.string()).default([]),
  error: z.string().nullable(),
  result: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
});
export type DAGNodeRun = z.infer<typeof DAGNodeRunSchema>;

// DAG 执行运行实例
export const DAGRunSchema = z.object({
  id: z.string(),
  graphId: z.string(),
  graphVersion: z.string(),
  status: z.enum(['initialized', 'running', 'completed', 'blocked', 'failed']),
  executionMode: DAGExecutionModeSchema,
  // 当前待执行的 dirty 节点
  dirtyNodes: z.array(z.string()).default([]),
  // 已完成的节点
  completedNodes: z.array(z.string()).default([]),
  // 执行中的节点
  runningNodes: z.array(z.string()).default([]),
  // 变更历史
  changeLog: z.array(z.object({
    nodeId: z.string(),
    previousState: DAGNodeStateSchema,
    newState: DAGNodeStateSchema,
    triggeredBy: z.string(),
    timestamp: z.string(),
  })).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type DAGRun = z.infer<typeof DAGRunSchema>;

// 变更传播事件
export const DAGChangeEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  nodeId: z.string(),
  changeType: z.enum(['requirement', 'design', 'ui', 'backend', 'doc', 'dependency']),
  previousVersion: z.string().nullable(),
  newVersion: z.string().nullable(),
  timestamp: z.string(),
  affectedNodes: z.array(z.string()).default([]),
  triggeredBy: z.enum(['user', 'agent', 'system', 'webhook']).default('user'),
});
export type DAGChangeEvent = z.infer<typeof DAGChangeEventSchema>;

// 影响分析结果
export const ImpactAnalysisResultSchema = z.object({
  sourceNodeId: z.string(),
  impactedNodes: z.array(z.object({
    nodeId: z.string(),
    impactType: z.enum(['direct', 'indirect', 'transitive']),
    propagationPath: z.array(z.string()),
  })),
  dirtyNodes: z.array(z.string()),
  requiresFullRerun: z.boolean(),
});
export type ImpactAnalysisResult = z.infer<typeof ImpactAnalysisResultSchema>;

export const RetrievalModeSchema = z.enum(['local-only', 'prefer-remote', 'remote-required']);
export const RetrievalGovernanceSchema = z.object({
  subprojectId: z.string().nullable(),
  mode: RetrievalModeSchema,
  remoteUrl: z.string().nullable(),
  collectionName: z.string(),
  topK: z.number().int().positive(),
  indexingEnabled: z.boolean(),
  qualityGate: z.object({
    minChunkCount: z.number().int().nonnegative(),
    minScore: z.number().min(0).max(1),
    requireTruthSources: z.boolean(),
  }),
  lastIndexedAt: z.string().nullable(),
  lastIndexedChunkCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});
export type RetrievalGovernance = z.infer<typeof RetrievalGovernanceSchema>;

export const HermesPolicyCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['pass', 'warn', 'fail']),
  detail: z.string(),
  evidencePaths: z.array(z.string()).default([]),
});

export const HermesPolicyEnhancementSchema = z.object({
  id: z.string(),
  stageId: z.string().nullable(),
  priority: TaskPrioritySchema,
  summary: z.string(),
  rationale: z.string(),
});

export const HermesPolicyReportSchema = z.object({
  id: z.string(),
  runId: z.string(),
  subprojectId: z.string().nullable(),
  generatedAt: z.string(),
  mode: z.literal('enhance-only'),
  status: z.enum(['pass', 'warn', 'fail']),
  checks: z.array(HermesPolicyCheckSchema),
  enhancements: z.array(HermesPolicyEnhancementSchema),
  guardrails: z.object({
    canRoute: z.literal(false),
    canPlan: z.literal(false),
    canModifyDag: z.literal(false),
    canBlockWorkflow: z.literal(false),
  }),
  metadata: z.record(z.unknown()).default({}),
});
export type HermesPolicyCheck = z.infer<typeof HermesPolicyCheckSchema>;
export type HermesPolicyEnhancement = z.infer<typeof HermesPolicyEnhancementSchema>;
export type HermesPolicyReport = z.infer<typeof HermesPolicyReportSchema>;

export const ProductChiefQuestionSchema = z.object({
  id: z.string(),
  topic: z.string(),
  question: z.string(),
  reason: z.string(),
  requiredFor: z.array(z.string()).default([]),
});

export const ProductChiefSpecialistEngagementSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  role: ProductAgentRoleSchema,
  level: ProductAgentLevelSchema,
  reason: z.string(),
});

export const ProductChiefSkillRecommendationSchema = z.object({
  skillId: z.string(),
  name: z.string(),
  category: z.string(),
  ownerRole: z.string(),
  promptPath: z.string(),
  score: z.number(),
  reasons: z.array(z.string()).default([]),
  deploymentStatus: z.enum(['integrated', 'installed', 'configured', 'manual', 'unavailable']).default('manual'),
  tool: z.string().nullable().default(null),
});

export const ProductChiefReportSchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable(),
  brief: z.string(),
  generatedAt: z.string(),
  status: z.enum(['draft', 'ready-for-review']),
  missingQuestions: z.array(ProductChiefQuestionSchema),
  engagedSpecialists: z.array(ProductChiefSpecialistEngagementSchema),
  recommendedSkills: z.array(ProductChiefSkillRecommendationSchema).default([]),
  learningGuidance: z.array(z.object({
    id: z.string(),
    title: z.string(),
    recommendation: z.string(),
    whyNow: z.string(),
    templatePath: z.string().nullable(),
  })),
  requiredGovernedOutputs: z.array(z.object({
    type: z.string(),
    title: z.string(),
    templatePath: z.string().nullable(),
    priority: TaskPrioritySchema,
    reason: z.string(),
  })),
  nextActions: z.array(z.string()).default([]),
  evidencePaths: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type ProductChiefQuestion = z.infer<typeof ProductChiefQuestionSchema>;
export type ProductChiefSpecialistEngagement = z.infer<typeof ProductChiefSpecialistEngagementSchema>;
export type ProductChiefSkillRecommendation = z.infer<typeof ProductChiefSkillRecommendationSchema>;
export type ProductChiefReport = z.infer<typeof ProductChiefReportSchema>;

export const ProductChiefMultiAgentReviewStatusSchema = z.enum(['pass', 'needs-human-decision', 'blocked']);

export const ProductChiefMultiAgentReviewTurnSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  role: ProductAgentRoleSchema,
  position: z.enum(['support', 'concern', 'blocker']),
  summary: z.string(),
  evidenceTaskId: z.string().nullable(),
  artifactPath: z.string().nullable(),
});

export const ProductChiefMultiAgentReviewConflictSchema = z.object({
  topic: z.string(),
  positions: z.array(z.string()),
  resolution: z.string(),
  status: z.enum(['resolved', 'needs-human-decision']),
});

export const ProductChiefMultiAgentReviewStopConditionSchema = z.object({
  condition: z.string(),
  satisfied: z.boolean(),
  detail: z.string(),
});

export const ProductChiefMultiAgentReviewSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  outputId: z.string(),
  subprojectId: z.string().nullable(),
  mode: z.literal('deterministic-multi-agent-review'),
  status: ProductChiefMultiAgentReviewStatusSchema,
  startedAt: z.string(),
  completedAt: z.string(),
  participantTaskIds: z.array(z.string()).default([]),
  artifactPath: z.string(),
  consensus: z.string(),
  turns: z.array(ProductChiefMultiAgentReviewTurnSchema),
  conflicts: z.array(ProductChiefMultiAgentReviewConflictSchema),
  stopConditions: z.array(ProductChiefMultiAgentReviewStopConditionSchema),
  requirementIds: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type ProductChiefMultiAgentReviewStatus = z.infer<typeof ProductChiefMultiAgentReviewStatusSchema>;
export type ProductChiefMultiAgentReviewTurn = z.infer<typeof ProductChiefMultiAgentReviewTurnSchema>;
export type ProductChiefMultiAgentReviewConflict = z.infer<typeof ProductChiefMultiAgentReviewConflictSchema>;
export type ProductChiefMultiAgentReviewStopCondition = z.infer<typeof ProductChiefMultiAgentReviewStopConditionSchema>;
export type ProductChiefMultiAgentReview = z.infer<typeof ProductChiefMultiAgentReviewSchema>;

export const ProductChiefOutputSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  subprojectId: z.string().nullable(),
  type: z.string(),
  title: z.string(),
  status: z.enum(['generated', 'ready-for-review']),
  artifactPath: z.string(),
  generatedAt: z.string(),
  specialistAgentIds: z.array(z.string()).default([]),
  specialistTaskIds: z.array(z.string()).default([]),
  specialistTaskArtifactPaths: z.array(z.string()).default([]),
  multiAgentReviewId: z.string().nullable().default(null),
  multiAgentReviewStatus: ProductChiefMultiAgentReviewStatusSchema.nullable().default(null),
  multiAgentReviewArtifactPath: z.string().nullable().default(null),
  requirementIds: z.array(z.string()).default([]),
  versionEntryId: z.string().nullable().default(null),
  templatePath: z.string().nullable(),
  summary: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type ProductChiefOutput = z.infer<typeof ProductChiefOutputSchema>;

export const ProductChiefSpecialistTaskSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  outputId: z.string(),
  subprojectId: z.string().nullable(),
  agentId: z.string(),
  agentName: z.string(),
  role: ProductAgentRoleSchema,
  status: z.enum(['completed']),
  assignedAt: z.string(),
  completedAt: z.string(),
  artifactPath: z.string(),
  outputType: z.string(),
  outputTitle: z.string(),
  summary: z.string(),
  requirementIds: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type ProductChiefSpecialistTask = z.infer<typeof ProductChiefSpecialistTaskSchema>;

export const DocumentNormalizationSourceSchema = z.object({
  sourcePath: z.string(),
  artifactPath: z.string(),
  requirementId: z.string(),
  versionEntryId: z.string(),
  extractedRequirementIds: z.array(z.string()).default([]),
  documentType: z.string(),
  suggestedTarget: z.string(),
  extractedSignals: z.array(z.string()).default([]),
});

export const DocumentNormalizationRunSchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable(),
  status: z.enum(['completed', 'empty']),
  sourceRoot: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  normalizedSources: z.array(DocumentNormalizationSourceSchema),
  requirementIds: z.array(z.string()).default([]),
  versionEntryIds: z.array(z.string()).default([]),
  summary: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type DocumentNormalizationSource = z.infer<typeof DocumentNormalizationSourceSchema>;
export type DocumentNormalizationRun = z.infer<typeof DocumentNormalizationRunSchema>;
