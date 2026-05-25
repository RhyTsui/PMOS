import { z } from 'zod';

export const ArtifactKindSchema = z.enum(['document', 'json', 'code', 'config']);
export const StageStatusSchema = z.enum(['pending', 'active', 'completed', 'blocked']);
export const WorkflowRunStatusSchema = z.enum(['draft', 'running', 'completed', 'needs-rework', 'blocked']);
export const ReviewDecisionSchema = z.enum(['Pass', 'Conditional', 'Reject']);
export const TaskPrioritySchema = z.enum(['P0', 'P1', 'P2']);
export const WorkflowStageCapabilitySchema = z.enum(['system', 'text', 'review', 'multimodal']);
export const TaskSsotStatusSchema = z.enum(['draft', 'active', 'blocked', 'in_review', 'ready_for_delivery', 'completed', 'failed']);
export const TaskSsotStageStatusSchema = z.enum(['pending', 'active', 'completed', 'blocked']);
export const CollaborationLevelSchema = z.enum(['L0', 'L1', 'L2', 'L3']);
export const GateCheckStatusSchema = z.enum(['pass', 'warn', 'block']);
export const TaskSsotArtifactRoleSchema = z.enum(['upstream-truth', 'working-output', 'review-evidence', 'final-delivery']);
export const TaskSsotAssignmentTypeSchema = z.enum(['owner', 'support', 'reviewer']);
export const TaskSsotSyncStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'dropped']);
export const PlanArchiveSourceSchema = z.enum(['codex-plan', 'workflow-planning', 'mcp-context-plan', 'manual']);
export const PlanArchiveStatusSchema = z.enum(['active', 'superseded']);
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

export const TaskSsotStageSchema = z.object({
  taskId: z.string(),
  stageId: z.string(),
  status: TaskSsotStageStatusSchema,
  ownerAgentId: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  blockedReason: z.string().nullable(),
});

export const TaskSsotGateCheckSchema = z.object({
  taskId: z.string(),
  gateId: z.string(),
  status: GateCheckStatusSchema,
  reason: z.string(),
  evidencePaths: z.array(z.string()).default([]),
  checkedAt: z.string(),
});

export const TaskSsotGateEventSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  gateId: z.string(),
  stageId: z.string().nullable().default(null),
  action: z.string(),
  fromStatus: z.string().nullable().default(null),
  toStatus: z.string().nullable().default(null),
  actorRole: z.string(),
  artifactRefs: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  sourceEventId: z.string().nullable().default(null),
  recordedAt: z.string(),
  summary: z.string(),
});

export const TaskSsotArtifactLinkSchema = z.object({
  taskId: z.string(),
  artifactType: z.string(),
  artifactId: z.string(),
  artifactPath: z.string(),
  roleInTask: TaskSsotArtifactRoleSchema,
});

export const TaskSsotAgentAssignmentSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  role: z.string(),
  assignmentType: TaskSsotAssignmentTypeSchema,
  status: z.enum(['active', 'completed']).default('active'),
});

export const TaskSsotSyncEnvelopeSchema = z.object({
  syncId: z.string(),
  taskId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  targetSystem: z.string(),
  targetCategory: z.enum(['knowledge', 'delivery', 'design', 'repo', 'ops', 'custom']).default('custom'),
  topicKey: z.string().nullable().default(null),
  action: z.string(),
  payloadRef: z.string(),
  status: TaskSsotSyncStatusSchema,
  retryCount: z.number().int().nonnegative(),
  maxRetries: z.number().int().nonnegative(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  receiptRef: z.string().nullable(),
  error: z.string().nullable(),
});

export const PlanArchiveRecordSchema = z.object({
  id: z.string(),
  planThreadId: z.string(),
  version: z.number().int().positive(),
  status: PlanArchiveStatusSchema,
  title: z.string(),
  summary: z.string().nullable().default(null),
  source: PlanArchiveSourceSchema,
  subprojectId: z.string().nullable().default(null),
  taskId: z.string().nullable().default(null),
  triggerRef: z.string().nullable().default(null),
  path: z.string(),
  supersedes: z.string().nullable().default(null),
  latestPath: z.string(),
  contentHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PlanArchiveIndexSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  subprojectId: z.string().nullable().default(null),
  records: z.array(PlanArchiveRecordSchema),
});

export const TaskSsotBlockerTypeSchema = z.enum(['permission', 'dependency', 'risk', 'information', 'manual', 'unknown']);

export const TaskOperatorEntrySchema = z.object({
  actionId: z.enum([
    'refresh-proof',
    'execute-hermes-writeback',
    'close-hermes-loop',
    'tick-due',
    'tick-run',
    'resume-current-stage',
    'resume-rework-stage',
    'approve-gate',
    'send-to-rework',
  ]),
  label: z.string(),
  targetTaskId: z.string(),
  targetWorkflowRunId: z.string().nullable().default(null),
  targetStageId: z.string().nullable().default(null),
});

export const TaskCurrentAttentionSchema = z.object({
  taskId: z.string(),
  workflowRunId: z.string().nullable().default(null),
  stageId: z.string().nullable().default(null),
  mainlineLabel: z.string().nullable().default(null),
  gateId: z.string().nullable().default(null),
  status: z.enum(['pass', 'warn', 'block']).nullable().default(null),
  reason: z.string().nullable().default(null),
  actorRole: z.string().nullable().default(null),
  nextSafeStep: z.string().nullable().default(null),
  resumeAnchor: z.string().nullable().default(null),
  suggestedActions: z.array(z.string()).default([]),
  operatorEntries: z.array(TaskOperatorEntrySchema).default([]),
});

export const TaskSsotContinuationSchema = z.object({
  mainlineLabel: z.string(),
  nextSafeStep: z.string().nullable().default(null),
  parkedLines: z.array(z.string()).default([]),
  blockerType: TaskSsotBlockerTypeSchema.nullable().default(null),
  resumeAnchor: z.string().nullable().default(null),
  lastMeaningfulAdvanceAt: z.string().nullable().default(null),
  currentAttention: TaskCurrentAttentionSchema.nullable().default(null),
});

export const TaskSsotTaskSchema = z.object({
  taskId: z.string(),
  sourceType: z.string(),
  sourceRef: z.string(),
  originalDemandRefs: z.array(z.string()).default([]),
  subprojectId: z.string().nullable().default(null),
  title: z.string(),
  summary: z.string().nullable(),
  collaborationLevel: CollaborationLevelSchema,
  status: TaskSsotStatusSchema,
  currentStage: z.string(),
  currentOwnerAgentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stages: z.array(TaskSsotStageSchema).default([]),
  gateChecks: z.array(TaskSsotGateCheckSchema).default([]),
  gateHistory: z.array(TaskSsotGateEventSchema).default([]),
  artifactLinks: z.array(TaskSsotArtifactLinkSchema).default([]),
  agentAssignments: z.array(TaskSsotAgentAssignmentSchema).default([]),
  syncEnvelopes: z.array(TaskSsotSyncEnvelopeSchema).default([]),
  continuation: TaskSsotContinuationSchema,
});

export const TaskSsotStateSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  source: z.literal('mcp-context-bootstrap'),
  tasks: z.array(TaskSsotTaskSchema),
  continuation: z.object({
    activeMainlineTaskId: z.string().nullable().default(null),
    activeMainlineLabel: z.string().nullable().default(null),
    parkedTaskIds: z.array(z.string()).default([]),
    blockedTaskIds: z.array(z.string()).default([]),
    resumeAnchor: z.string().nullable().default(null),
    activeMainlineAttention: TaskCurrentAttentionSchema.nullable().default(null),
  }),
});

export const SchedulerRunStatusSchema = z.enum(['running', 'paused', 'blocked', 'completed']);
export const SchedulerRunModeSchema = z.enum([
  'idle',
  'scheduled',
  'auto-rework',
  'auto-retry',
  'manual-attention',
  'completed',
]);

export const SchedulerRunSchema = z.object({
  id: z.string(),
  workflowRunId: z.string(),
  subprojectId: z.string().nullable(),
  projectName: z.string(),
  status: SchedulerRunStatusSchema,
  schedulerMode: SchedulerRunModeSchema,
  currentStageId: z.string().nullable(),
  retryCount: z.number().int().nonnegative(),
  plannedAction: z.enum(['advance', 'resume-current-stage', 'resume-rework-stage']).nullable().default(null),
  dueNow: z.boolean().default(false),
  cooldownUntil: z.string().nullable().default(null),
  nextRunAt: z.string().nullable().default(null),
  blockedReason: z.string().nullable().default(null),
  schedulerReason: z.string().nullable().default(null),
  autoRecoveryEligible: z.boolean().default(false),
  operatorActionHint: z.string().nullable().default(null),
  resumeAnchor: z.string().nullable().default(null),
  recoveryPolicy: z.enum(['manual-only', 'auto-retry', 'auto-rework', 'scheduled']).default('manual-only'),
  budgetPolicy: z.enum(['session-budgeted', 'manual-only']).default('session-budgeted'),
  sessionBudget: z.number().int().nonnegative().default(0),
  consumedBudget: z.number().int().nonnegative().default(0),
  remainingBudget: z.number().int().nonnegative().default(0),
  budgetExhausted: z.boolean().default(false),
  updatedAt: z.string(),
  generatedAt: z.string(),
  source: z.literal('workflow-run-derived'),
});

export const ContextInjectionBundleSchema = z.object({
  taskId: z.string(),
  workflowRunId: z.string().nullable().default(null),
  subprojectId: z.string().nullable().default(null),
  generatedAt: z.string(),
  collaborationLevel: CollaborationLevelSchema,
  projectLabel: z.string(),
  currentStage: z.string().nullable().default(null),
  activeGateIds: z.array(z.string()).default([]),
  blockedGateIds: z.array(z.string()).default([]),
  truthRefs: z.array(z.string()).default([]),
  artifactRefs: z.array(z.string()).default([]),
  reviewEvidenceRefs: z.array(z.string()).default([]),
  syncTargets: z.array(z.string()).default([]),
  resumeAnchor: z.string().nullable().default(null),
  nextSafeStep: z.string().nullable().default(null),
  redlines: z.array(z.string()).default([]),
});

export const PipelineLauncherPlanSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['ready', 'needs-input', 'blocked']),
  sourceTaskId: z.string().nullable().default(null),
  sourceStageId: z.string().nullable().default(null),
  trigger: z.string(),
  targetStages: z.array(z.string()).default([]),
  missingInputs: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  nextAction: z.string().nullable().default(null),
});

export const FinalStateValidationCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['pass', 'warn', 'block']),
  detail: z.string(),
});

export const FrontendBrowserVerificationCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['pass', 'warn', 'block']),
  detail: z.string(),
  evidencePaths: z.array(z.string()).default([]),
});

export const FrontendBrowserVerificationReportSchema = z.object({
  taskId: z.string(),
  workflowRunId: z.string().nullable().default(null),
  stageId: z.string().nullable().default(null),
  artifactPath: z.string().nullable().default(null),
  applicable: z.boolean(),
  status: z.enum(['pass', 'warn', 'block', 'not-applicable']),
  generatedAt: z.string(),
  checks: z.array(FrontendBrowserVerificationCheckSchema).default([]),
  summary: z.string(),
});

export const FinalStateValidationReportSchema = z.object({
  taskId: z.string(),
  status: z.enum(['ready', 'rework', 'blocked']),
  generatedAt: z.string(),
  checks: z.array(FinalStateValidationCheckSchema),
  browserVerification: FrontendBrowserVerificationReportSchema.nullable().default(null),
  summary: z.string(),
});

export const AutoAcceptanceRunReportSchema = z.object({
  taskId: z.string(),
  automated: z.boolean(),
  userVisible: z.boolean(),
  generatedAt: z.string(),
  browserRun: z.object({
    outputPath: z.string(),
    stdout: z.string().nullable(),
    stderr: z.string().nullable(),
    report: z.object({
      kind: z.string(),
      target: z.string(),
      startedAt: z.string(),
      finishedAt: z.string(),
      status: z.string(),
      navigationError: z.string().nullable(),
      title: z.string(),
      screenshotPath: z.string(),
      metrics: z.record(z.number()),
      evidence: z.object({
        visibleTextSample: z.string(),
      }),
    }),
  }).nullable().default(null),
  finalState: FinalStateValidationReportSchema,
  summary: z.string(),
});

export const ProofOfWorkBundleSchema = z.object({
  taskId: z.string(),
  workflowRunId: z.string().nullable(),
  subprojectId: z.string().nullable(),
  generatedAt: z.string(),
  status: z.enum(['ready', 'rework', 'blocked']),
  summary: z.string(),
  finalState: FinalStateValidationReportSchema,
  gateSummary: z.object({
    pass: z.number().int().nonnegative(),
    warn: z.number().int().nonnegative(),
    block: z.number().int().nonnegative(),
  }),
  gateHistory: z.object({
    total: z.number().int().nonnegative(),
    recentEvents: z.array(TaskSsotGateEventSchema).default([]),
    latestDecisionEvent: TaskSsotGateEventSchema.nullable().default(null),
    blockedGates: z.array(TaskSsotGateCheckSchema).default([]),
    currentAttention: TaskCurrentAttentionSchema,
  }),
  ownership: z.object({
    ownerAgentId: z.string().nullable(),
    reviewerAgentIds: z.array(z.string()).default([]),
    approvalStatus: z.enum(['approved', 'conditional', 'rejected', 'pending']),
    approver: z.string().nullable(),
  }),
  artifactPaths: z.array(z.string()).default([]),
  review: z.object({
    decision: z.enum(['pass', 'conditional', 'reject', 'not-run']),
    summary: z.string(),
    hermesDecision: z.enum(['keep', 'revise', 'block', 'promote']).nullable().default(null),
    hermesSummary: z.string().nullable().default(null),
    hermesActions: z.array(
      z.object({
        action: z.enum(['keep', 'revise', 'block', 'promote']),
        target: z.string(),
        reason: z.string(),
      }),
    ).default([]),
  }),
  acceptancePackage: z.object({
    verdict: z.enum(['accepted', 'conditional', 'blocked']),
    summary: z.string(),
    missingEvidence: z.array(z.string()).default([]),
    requiredEvidence: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        status: z.enum(['pass', 'warn', 'block']),
        detail: z.string(),
        evidencePaths: z.array(z.string()).default([]),
      }),
    ).default([]),
    handoff: z.object({
      mainlineLabel: z.string().nullable().default(null),
      currentStage: z.string().nullable().default(null),
      resumeAnchor: z.string().nullable().default(null),
      nextSafeStep: z.string().nullable().default(null),
    }),
  }),
  outbox: z.object({
    total: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    receiptRefs: z.array(z.string()).default([]),
  }),
  contextBundle: ContextInjectionBundleSchema,
  pipelineLauncher: z.array(PipelineLauncherPlanSchema).default([]),
});

export const DesignChangeItemStatusSchema = z.enum(['requested', 'applied', 'missed']);
export const DesignChangeSetModeSchema = z.enum(['rewrite', 'patch']);
export const DesignChangeSetSourceSchema = z.enum(['brief', 'conversation', 'review', 'manual']);

export const DesignProtectedRegionSchema = z.object({
  pageKey: z.string().nullable().default(null),
  pageName: z.string().nullable().default(null),
  regionId: z.string(),
  rule: z.string(),
});

export const DesignChangeItemSchema = z.object({
  changeId: z.string(),
  targetPageKey: z.string().nullable().default(null),
  targetPageName: z.string().nullable().default(null),
  targetRegion: z.string().nullable().default(null),
  request: z.string(),
  mustChange: z.boolean().default(true),
  status: DesignChangeItemStatusSchema.default('requested'),
  evidence: z.string().nullable().default(null),
});

export const DesignChangeSetSchema = z.object({
  version: z.literal(1),
  outputId: z.string(),
  reportId: z.string(),
  subprojectId: z.string().nullable(),
  generatedAt: z.string(),
  mode: DesignChangeSetModeSchema,
  source: DesignChangeSetSourceSchema,
  summary: z.string(),
  items: z.array(DesignChangeItemSchema).default([]),
  protectedRegions: z.array(DesignProtectedRegionSchema).default([]),
  globalMustNotChange: z.array(z.string()).default([]),
});

export const DesignUnintendedChangeSchema = z.object({
  pageKey: z.string().nullable().default(null),
  regionId: z.string().nullable().default(null),
  detail: z.string(),
});

export const DesignDiffAuditSchema = z.object({
  version: z.literal(1),
  outputId: z.string(),
  generatedAt: z.string(),
  mode: DesignChangeSetModeSchema,
  appliedChangeIds: z.array(z.string()).default([]),
  missedChangeIds: z.array(z.string()).default([]),
  unintendedChanges: z.array(DesignUnintendedChangeSchema).default([]),
  summary: z.string(),
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
      dataki: z
        .object({
          agentId: z.string().optional(),
          knowledgeBaseId: z.string().optional(),
          knowledgeBaseIds: z.array(z.string()).default([]),
        })
        .optional(),
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
    kind: z.enum([
      'chat',
      'manual',
      'document',
      'product-output',
      'capability',
      'workflow',
      'version',
      'document-normalization',
      'meeting-note',
      'runtime-gate-event',
      'acceptance-review',
      'auto-capture',
    ]),
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

export const CommitteeActivationTraceSchema = z.object({
  role: z.string(),
  required: z.boolean(),
  activated: z.boolean(),
  source: z.string(),
  status: z.enum(['active', 'missing', 'assumed']),
});

export const ReviewGateSchema = z.object({
  decision: z.enum(['pass', 'conditional', 'reject']),
  blocked: z.boolean(),
  issueCount: z.number().int().nonnegative(),
  blockingStageId: z.string().nullable(),
});

export const HermesCommitteeActionSchema = z.object({
  action: z.enum(['keep', 'revise', 'block', 'promote']),
  target: z.string(),
  reason: z.string(),
});

export const HermesCommitteeSummarySchema = z.object({
  overallDecision: z.enum(['keep', 'revise', 'block', 'promote']),
  summary: z.string(),
  actions: z.array(HermesCommitteeActionSchema),
  knowledgeGrounding: z.object({
    configured: z.boolean(),
    query: z.string().nullable().default(null),
    resultCount: z.number().int().nonnegative().default(0),
    summary: z.string().nullable().default(null),
  }).default({
    configured: false,
    query: null,
    resultCount: 0,
    summary: null,
  }),
  writebackClosure: z.object({
    totalTargets: z.number().int().nonnegative().default(0),
    completedTargets: z.number().int().nonnegative().default(0),
    openTargets: z.number().int().nonnegative().default(0),
    activeTaskCount: z.number().int().nonnegative().default(0),
    summary: z.string().nullable().default(null),
  }).default({
    totalTargets: 0,
    completedTargets: 0,
    openTargets: 0,
    activeTaskCount: 0,
    summary: null,
  }),
  watchClosure: z.object({
    activeFindings: z.number().int().nonnegative().default(0),
    resolvedFindings: z.number().int().nonnegative().default(0),
    recurringFindings: z.number().int().nonnegative().default(0),
    suppressedFindings: z.number().int().nonnegative().default(0),
    openTaskCount: z.number().int().nonnegative().default(0),
    closureEvidenceCount: z.number().int().nonnegative().default(0),
    summary: z.string().nullable().default(null),
  }).default({
    activeFindings: 0,
    resolvedFindings: 0,
    recurringFindings: 0,
    suppressedFindings: 0,
    openTaskCount: 0,
    closureEvidenceCount: 0,
    summary: null,
  }),
});

export const CommitteeReportSchema = z.object({
  overallConclusion: z.string(),
  nextStage: z.boolean(),
  reworkRequired: z.boolean(),
  gate: ReviewGateSchema,
  roles: z.array(CommitteeRoleSchema),
  activationTrace: z.array(CommitteeActivationTraceSchema).optional(),
  hermes: HermesCommitteeSummarySchema,
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
export type TaskSsotStatus = z.infer<typeof TaskSsotStatusSchema>;
export type TaskSsotStageStatus = z.infer<typeof TaskSsotStageStatusSchema>;
export type CollaborationLevel = z.infer<typeof CollaborationLevelSchema>;
export type GateCheckStatus = z.infer<typeof GateCheckStatusSchema>;
export type TaskSsotArtifactRole = z.infer<typeof TaskSsotArtifactRoleSchema>;
export type TaskSsotAssignmentType = z.infer<typeof TaskSsotAssignmentTypeSchema>;
export type TaskSsotSyncStatus = z.infer<typeof TaskSsotSyncStatusSchema>;
export type TaskSsotStage = z.infer<typeof TaskSsotStageSchema>;
export type TaskSsotGateCheck = z.infer<typeof TaskSsotGateCheckSchema>;
export type TaskSsotGateEvent = z.infer<typeof TaskSsotGateEventSchema>;
export type TaskSsotArtifactLink = z.infer<typeof TaskSsotArtifactLinkSchema>;
export type TaskSsotAgentAssignment = z.infer<typeof TaskSsotAgentAssignmentSchema>;
export type TaskSsotSyncEnvelope = z.infer<typeof TaskSsotSyncEnvelopeSchema>;
export type PlanArchiveSource = z.infer<typeof PlanArchiveSourceSchema>;
export type PlanArchiveStatus = z.infer<typeof PlanArchiveStatusSchema>;
export type PlanArchiveRecord = z.infer<typeof PlanArchiveRecordSchema>;
export type PlanArchiveIndex = z.infer<typeof PlanArchiveIndexSchema>;
export type TaskSsotTask = z.infer<typeof TaskSsotTaskSchema>;
export type TaskSsotState = z.infer<typeof TaskSsotStateSchema>;
export type SchedulerRunStatus = z.infer<typeof SchedulerRunStatusSchema>;
export type SchedulerRunMode = z.infer<typeof SchedulerRunModeSchema>;
export type SchedulerRun = z.infer<typeof SchedulerRunSchema>;
export type ContextInjectionBundle = z.infer<typeof ContextInjectionBundleSchema>;
export type PipelineLauncherPlan = z.infer<typeof PipelineLauncherPlanSchema>;
export type FinalStateValidationCheck = z.infer<typeof FinalStateValidationCheckSchema>;
export type FrontendBrowserVerificationCheck = z.infer<typeof FrontendBrowserVerificationCheckSchema>;
export type FrontendBrowserVerificationReport = z.infer<typeof FrontendBrowserVerificationReportSchema>;
export type FinalStateValidationReport = z.infer<typeof FinalStateValidationReportSchema>;
export type AutoAcceptanceRunReport = z.infer<typeof AutoAcceptanceRunReportSchema>;
export type ProofOfWorkBundle = z.infer<typeof ProofOfWorkBundleSchema>;
export type DesignChangeItemStatus = z.infer<typeof DesignChangeItemStatusSchema>;
export type DesignChangeSetMode = z.infer<typeof DesignChangeSetModeSchema>;
export type DesignChangeSetSource = z.infer<typeof DesignChangeSetSourceSchema>;
export type DesignProtectedRegion = z.infer<typeof DesignProtectedRegionSchema>;
export type DesignChangeItem = z.infer<typeof DesignChangeItemSchema>;
export type DesignChangeSet = z.infer<typeof DesignChangeSetSchema>;
export type DesignUnintendedChange = z.infer<typeof DesignUnintendedChangeSchema>;
export type DesignDiffAudit = z.infer<typeof DesignDiffAuditSchema>;
export type Subproject = z.infer<typeof SubprojectSchema>;
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
export type WorkflowMetrics = z.infer<typeof WorkflowMetricsSchema>;
export type CommitteeReport = z.infer<typeof CommitteeReportSchema>;
export type ReviewGate = z.infer<typeof ReviewGateSchema>;
export type CommitteeActivationTrace = z.infer<typeof CommitteeActivationTraceSchema>;
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

export const HermesComparisonCandidateSchema = z.object({
  label: z.string(),
  classification: z.enum(['current', 'candidate', 'fallback']),
  rationale: z.string(),
});

export const HermesComparisonSchema = z.object({
  id: z.string(),
  domain: z.string(),
  currentLabel: z.string(),
  candidates: z.array(HermesComparisonCandidateSchema),
  decision: z.enum(['keep', 'replace', 'promote', 'park', 'reject']),
  summary: z.string(),
  evidencePaths: z.array(z.string()).default([]),
  nextStep: z.string().nullable().default(null),
  promoteTargetPath: z.string().nullable().default(null),
});

export const HermesPromotionSchema = z.object({
  id: z.string(),
  targetPath: z.string().nullable().default(null),
  action: z.enum(['promote', 'keep', 'replace', 'park', 'reject']),
  summary: z.string(),
  rationale: z.string(),
});

export const HermesResearchFindingSchema = z.object({
  id: z.string(),
  topic: z.string(),
  status: z.enum(['active', 'promoted', 'parked']),
  summary: z.string(),
  suggestedAction: z.string(),
  query: z.string().nullable().default(null),
  resultCount: z.number().int().nonnegative().default(0),
  excerpts: z.array(
    z.object({
      knowledgeTitle: z.string(),
      snippet: z.string(),
      score: z.number().nullable().default(null),
    }),
  ).default([]),
  evidencePaths: z.array(z.string()).default([]),
});

export const HermesAutoPromotionSchema = z.object({
  id: z.string(),
  comparisonId: z.string(),
  status: z.enum(['created', 'existing', 'skipped']),
  summary: z.string(),
  requirementId: z.string().nullable().default(null),
  targetPath: z.string().nullable().default(null),
  artifactPaths: z.array(z.string()).default([]),
  writebackTargets: z.array(
    z.object({
      targetPath: z.string(),
      targetKind: z.enum(['workflow', 'prompt', 'template', 'operations-doc', 'memory-doc']),
      status: z.enum(['planned', 'recorded', 'active', 'completed']),
      reason: z.string(),
      taskRequirementId: z.string().nullable().default(null),
      closureEvidencePaths: z.array(z.string()).default([]),
    }),
  ).default([]),
});

export const HermesWatchFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['active', 'resolved', 'parked']),
  summary: z.string(),
  detail: z.string(),
  evidencePaths: z.array(z.string()).default([]),
  carriedFromReportId: z.string().nullable().default(null),
  firstSeenAt: z.string().nullable().default(null),
  lastSeenAt: z.string().nullable().default(null),
  recurrenceCount: z.number().int().min(1).default(1),
  stableRunCount: z.number().int().min(1).default(1),
  noiseSuppressed: z.boolean().default(false),
  noiseReason: z.string().nullable().default(null),
  taskRequirementId: z.string().nullable().default(null),
  trackedRequirementIds: z.array(z.string()).default([]),
  closureEvidencePaths: z.array(z.string()).default([]),
  nextActionType: z.enum(['rectify', 'watch', 'none']).default('none'),
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
  comparisons: z.array(HermesComparisonSchema).default([]),
  promotions: z.array(HermesPromotionSchema).default([]),
  researchFindings: z.array(HermesResearchFindingSchema).default([]),
  autoPromotions: z.array(HermesAutoPromotionSchema).default([]),
  watchFindings: z.array(HermesWatchFindingSchema).default([]),
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
export type HermesComparisonCandidate = z.infer<typeof HermesComparisonCandidateSchema>;
export type HermesComparison = z.infer<typeof HermesComparisonSchema>;
export type HermesPromotion = z.infer<typeof HermesPromotionSchema>;
export type HermesResearchFinding = z.infer<typeof HermesResearchFindingSchema>;
export type HermesAutoPromotion = z.infer<typeof HermesAutoPromotionSchema>;
export type HermesWatchFinding = z.infer<typeof HermesWatchFindingSchema>;
export type HermesPolicyReport = z.infer<typeof HermesPolicyReportSchema>;

export const V07StageAgentPhaseSchema = z.object({
  stageId: z.enum(['requirements', 'prototype', 'interaction', 'ui', 'frontend']),
  label: z.string(),
  defaultMode: z.string(),
  status: z.enum(['pass', 'warn', 'missing']),
  summary: z.string(),
  requiredBehaviors: z.array(z.string()).default([]),
  evidencePaths: z.array(z.string()).default([]),
});

export const V07UiSpecActivationSnapshotSchema = z.object({
  status: z.enum(['pass', 'warn', 'missing']),
  summary: z.string(),
  activeSpecPaths: z.array(z.string()).default([]),
  loadedSignals: z.array(z.string()).default([]),
  missingSignals: z.array(z.string()).default([]),
  effectiveRules: z.array(z.string()).default([]),
});

export const V07RepeatCorrectionCandidateSchema = z.object({
  candidateId: z.string(),
  label: z.string(),
  scope: z.enum(['project', 'platform']),
  status: z.enum(['candidate', 'promoted']),
  signalCount: z.number().int().nonnegative(),
  summary: z.string(),
  evidencePaths: z.array(z.string()).default([]),
  promotedRequirementId: z.string().nullable().default(null),
});

export const V07SkillEffectivenessCheckSchema = z.object({
  skillId: z.string(),
  name: z.string(),
  integration: z.enum(['workflow', 'product-chief', 'cli', 'external-tool', 'repo-skill', 'manual']),
  status: z.enum(['pass', 'warn', 'missing']),
  summary: z.string(),
  evidencePaths: z.array(z.string()).default([]),
  missingSignals: z.array(z.string()).default([]),
});

export const V07DesignToolEffectivenessCheckSchema = z.object({
  toolId: z.string(),
  label: z.string(),
  integration: z.enum(['external-tool', 'repo-skill', 'manual']),
  status: z.enum(['pass', 'warn', 'missing']),
  summary: z.string(),
  evidencePaths: z.array(z.string()).default([]),
  missingSignals: z.array(z.string()).default([]),
});

export const V07ComponentReuseMemoryCheckSchema = z.object({
  candidateId: z.string(),
  label: z.string(),
  status: z.enum(['pass', 'warn', 'missing']),
  summary: z.string(),
  promotedRequirementId: z.string().nullable().default(null),
  reusableComponentSignals: z.array(z.string()).default([]),
  evidencePaths: z.array(z.string()).default([]),
  missingSignals: z.array(z.string()).default([]),
});

export const V07DatakiKnowledgeContextSchema = z.object({
  configured: z.boolean(),
  sourceScope: z.enum(['platform', 'subproject', 'missing']),
  summary: z.string(),
  baseUrl: z.string().nullable().default(null),
  userId: z.string().nullable().default(null),
  agentId: z.string().nullable().default(null),
  defaultKnowledgeBaseId: z.string().nullable().default(null),
  defaultKnowledgeBaseIds: z.array(z.string()).default([]),
  evidencePaths: z.array(z.string()).default([]),
  missingSignals: z.array(z.string()).default([]),
});

export const V07RuntimeGovernanceSnapshotSchema = z.object({
  version: z.literal(1),
  subprojectId: z.string().nullable().default(null),
  generatedAt: z.string(),
  stageAgents: z.array(V07StageAgentPhaseSchema).default([]),
  uiSpecActivation: V07UiSpecActivationSnapshotSchema,
  repeatCorrectionCandidates: z.array(V07RepeatCorrectionCandidateSchema).default([]),
  skillEffectivenessChecks: z.array(V07SkillEffectivenessCheckSchema).default([]),
  designToolEffectivenessChecks: z.array(V07DesignToolEffectivenessCheckSchema).default([]),
  componentReuseMemoryChecks: z.array(V07ComponentReuseMemoryCheckSchema).default([]),
  datakiKnowledgeContext: V07DatakiKnowledgeContextSchema,
  backcheck: z.object({
    stageAgentOrchestration: z.enum(['solved', 'partial', 'unsolved']),
    uiSpecActivationGate: z.enum(['solved', 'partial', 'unsolved']),
    repeatCorrectionMemory: z.enum(['solved', 'partial', 'unsolved']),
    skillEffectivenessCheck: z.enum(['solved', 'partial', 'unsolved']),
    designToolEffectivenessCheck: z.enum(['solved', 'partial', 'unsolved']),
    componentReuseMemory: z.enum(['solved', 'partial', 'unsolved']),
    knowledgeSourceContext: z.enum(['solved', 'partial', 'unsolved']),
  }),
});
export type V07StageAgentPhase = z.infer<typeof V07StageAgentPhaseSchema>;
export type V07UiSpecActivationSnapshot = z.infer<typeof V07UiSpecActivationSnapshotSchema>;
export type V07RepeatCorrectionCandidate = z.infer<typeof V07RepeatCorrectionCandidateSchema>;
export type V07SkillEffectivenessCheck = z.infer<typeof V07SkillEffectivenessCheckSchema>;
export type V07DesignToolEffectivenessCheck = z.infer<typeof V07DesignToolEffectivenessCheckSchema>;
export type V07ComponentReuseMemoryCheck = z.infer<typeof V07ComponentReuseMemoryCheckSchema>;
export type V07DatakiKnowledgeContext = z.infer<typeof V07DatakiKnowledgeContextSchema>;
export type V07RuntimeGovernanceSnapshot = z.infer<typeof V07RuntimeGovernanceSnapshotSchema>;

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
    dependsOn: z.array(z.string()).default([]),
    autoBackfillOnSkip: z.boolean().default(false),
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

export const MultiPmGroupSessionStatusSchema = z.enum(['active', 'converged', 'needs-human-decision', 'blocked']);
export const MultiPmGroupSessionParticipantSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  role: ProductAgentRoleSchema,
  responsibility: z.string(),
});
export const MultiPmGroupSessionMessageSchema = z.object({
  messageId: z.string(),
  speakerId: z.string(),
  speakerName: z.string(),
  speakerRole: ProductAgentRoleSchema,
  replyToMessageId: z.string().nullable().default(null),
  deliveryTargetRef: z.string(),
  stance: z.enum(['support', 'concern', 'blocker', 'clarify', 'proposal', 'decision']),
  intent: z.enum(['extend', 'challenge', 'correct', 'converge', 'request-evidence', 'backwrite']),
  summary: z.string(),
});
export const MultiPmGroupSessionConflictSchema = z.object({
  conflictId: z.string(),
  deliveryTargetRef: z.string(),
  topic: z.string(),
  positionA: z.string(),
  positionB: z.string(),
  whyConflicting: z.string(),
  resolutionOwner: z.string(),
  status: z.enum(['resolved', 'needs-human-decision', 'blocked', 'parked']),
});
export const MultiPmGroupSessionBackwriteTargetSchema = z.object({
  targetType: z.enum(['requirements', 'design', 'version', 'delivery', 'implementation-handoff']),
  targetPath: z.string(),
  changeSummary: z.string(),
  sourceMessageIds: z.array(z.string()).default([]),
});
export const MultiPmGroupSessionSchema = z.object({
  id: z.string(),
  subprojectId: z.string().nullable().default(null),
  reportId: z.string().nullable().default(null),
  sourceReviewIds: z.array(z.string()).default([]),
  taskId: z.string().nullable().default(null),
  mode: z.literal('delivery-driven-autonomous-dialogue'),
  status: MultiPmGroupSessionStatusSchema,
  sessionGoal: z.string(),
  deliveryTarget: z.string(),
  currentGap: z.string(),
  chair: MultiPmGroupSessionParticipantSchema,
  participants: z.array(MultiPmGroupSessionParticipantSchema).default([]),
  messages: z.array(MultiPmGroupSessionMessageSchema).default([]),
  conflicts: z.array(MultiPmGroupSessionConflictSchema).default([]),
  backwriteTargets: z.array(MultiPmGroupSessionBackwriteTargetSchema).default([]),
  nextSafeStep: z.string().nullable().default(null),
  generatedAt: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type MultiPmGroupSessionStatus = z.infer<typeof MultiPmGroupSessionStatusSchema>;
export type MultiPmGroupSessionParticipant = z.infer<typeof MultiPmGroupSessionParticipantSchema>;
export type MultiPmGroupSessionMessage = z.infer<typeof MultiPmGroupSessionMessageSchema>;
export type MultiPmGroupSessionConflict = z.infer<typeof MultiPmGroupSessionConflictSchema>;
export type MultiPmGroupSessionBackwriteTarget = z.infer<typeof MultiPmGroupSessionBackwriteTargetSchema>;
export type MultiPmGroupSession = z.infer<typeof MultiPmGroupSessionSchema>;

export const ImplementationLaneSchema = z.enum([
  'repo-coding',
  'pmos-fullstack-builder',
  'hybrid',
]);
export type ImplementationLane = z.infer<typeof ImplementationLaneSchema>;

export const AcceptanceLaneSchema = z.enum([
  'pmos-testing-acceptance',
]);
export type AcceptanceLane = z.infer<typeof AcceptanceLaneSchema>;

export const ReviewLaneSchema = z.enum([
  'pmos-code-review',
]);
export type ReviewLane = z.infer<typeof ReviewLaneSchema>;

export const HistoricalReviewLaneSchema = z.enum([
  'pmos-historical-code-review',
]);
export type HistoricalReviewLane = z.infer<typeof HistoricalReviewLaneSchema>;

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
  implementationLane: ImplementationLaneSchema.nullable().default(null),
  reviewLane: ReviewLaneSchema.nullable().default(null),
  historicalReviewLane: HistoricalReviewLaneSchema.nullable().default(null),
  acceptanceLane: AcceptanceLaneSchema.nullable().default(null),
  templatePath: z.string().nullable(),
  summary: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type ProductChiefOutput = z.infer<typeof ProductChiefOutputSchema>;

export const UISchemaViewStateSchema = z.object({
  stateId: z.string(),
  label: z.string(),
  kind: z.enum(['default', 'loading', 'empty', 'error', 'permission', 'detail', 'selection', 'modal', 'drawer', 'success']),
  trigger: z.string(),
});

export const UISchemaActionSchema = z.object({
  actionId: z.string(),
  label: z.string(),
  kind: z.enum(['navigate', 'open-panel', 'open-detail', 'submit', 'filter', 'sort', 'select', 'bulk-action', 'export', 'custom']),
  sourceBlockId: z.string().nullable().default(null),
  target: z.string().nullable().default(null),
  resultStateId: z.string().nullable().default(null),
});

export const UISchemaDataRefSchema = z.object({
  refId: z.string(),
  label: z.string(),
  kind: z.enum(['entity', 'view-model', 'list', 'metric', 'filter', 'form', 'selection', 'detail']),
  fields: z.array(z.string()).default([]),
});

export const UISchemaComponentBindingSchema = z.object({
  blockId: z.string(),
  library: z.enum(['ant-design', 'ant-design-x', 'custom']),
  componentName: z.string(),
  rationale: z.string().nullable().default(null),
  usageNotes: z.array(z.string()).default([]),
});

export const UISchemaBlockSchema = z.object({
  blockId: z.string(),
  label: z.string(),
  type: z.string(),
  purpose: z.string(),
  required: z.boolean().default(true),
  sourceRequirementIds: z.array(z.string()).default([]),
  sourceOutputTypes: z.array(z.string()).default([]),
  stateIds: z.array(z.string()).default([]),
  actionIds: z.array(z.string()).default([]),
  dataRefIds: z.array(z.string()).default([]),
});

export const UISchemaPageContractSchema = z.object({
  pageId: z.string(),
  pageName: z.string(),
  pagePurpose: z.string(),
  route: z.string(),
  classification: z.enum(['production', 'promo', 'confirmation', 'demo']),
  layoutShell: z.string(),
  targetRoles: z.array(z.string()).default([]),
  blocks: z.array(UISchemaBlockSchema).default([]),
  states: z.array(UISchemaViewStateSchema).default([]),
  actions: z.array(UISchemaActionSchema).default([]),
  dataRefs: z.array(UISchemaDataRefSchema).default([]),
  componentBindings: z.array(UISchemaComponentBindingSchema).default([]),
});

export const UISchemaDesignSystemBaselineSchema = z.object({
  primaryPageLibrary: z.enum(['ant-design-x', 'custom']).default('ant-design-x'),
  conversationRegionLibrary: z.enum(['ant-design-x', 'custom']).default('ant-design-x'),
  rules: z.array(z.string()).default([]),
});

export const UISchemaContractSchema = z.object({
  version: z.literal(1),
  reportId: z.string(),
  outputId: z.string(),
  subprojectId: z.string().nullable().default(null),
  generatedAt: z.string(),
  sourceBrief: z.string(),
  linkedRequirementIds: z.array(z.string()).default([]),
  linkedOutputTypes: z.array(z.string()).default([]),
  designSystemBaseline: UISchemaDesignSystemBaselineSchema,
  pageContracts: z.array(UISchemaPageContractSchema).default([]),
  implementationRules: z.array(z.string()).default([]),
});
export type UISchemaViewState = z.infer<typeof UISchemaViewStateSchema>;
export type UISchemaAction = z.infer<typeof UISchemaActionSchema>;
export type UISchemaDataRef = z.infer<typeof UISchemaDataRefSchema>;
export type UISchemaComponentBinding = z.infer<typeof UISchemaComponentBindingSchema>;
export type UISchemaBlock = z.infer<typeof UISchemaBlockSchema>;
export type UISchemaPageContract = z.infer<typeof UISchemaPageContractSchema>;
export type UISchemaDesignSystemBaseline = z.infer<typeof UISchemaDesignSystemBaselineSchema>;
export type UISchemaContract = z.infer<typeof UISchemaContractSchema>;

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
  backgroundContextPath: z.string().nullable().default(null),
  projectContextPaths: z.array(z.string()).default([]),
  notionPageId: z.string().nullable().default(null),
  notionPageUrl: z.string().nullable().default(null),
  requirementId: z.string(),
  versionEntryId: z.string(),
  extractedRequirementIds: z.array(z.string()).default([]),
  documentType: z.string(),
  suggestedTarget: z.string(),
  extractedSignals: z.array(z.string()).default([]),
  projectHints: z.array(z.string()).default([]),
  sourceFingerprint: z.string().nullable().default(null),
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

export const DocumentTruthSourceStatusSchema = z.enum(['draft', 'active', 'superseded', 'archived', 'deleted']);

export const DocumentTruthSourceEntrySchema = z.object({
  id: z.string(),
  topicKey: z.string(),
  subprojectId: z.string().nullable(),
  title: z.string(),
  path: z.string(),
  status: DocumentTruthSourceStatusSchema,
  tags: z.array(z.string()).default([]),
  supersedes: z.array(z.string()).default([]),
  successorPath: z.string().nullable().default(null),
  note: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DocumentTruthSourceRegistrySchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  subprojectId: z.string().nullable(),
  entries: z.array(DocumentTruthSourceEntrySchema),
});

export const DocumentGovernanceAuditIssueSchema = z.object({
  code: z.enum([
    'duplicate-active-topic',
    'superseded-without-successor',
    'successor-not-registered',
    'entry-file-missing',
  ]),
  severity: z.enum(['warn', 'block']),
  topicKey: z.string(),
  path: z.string().nullable().default(null),
  relatedPaths: z.array(z.string()).default([]),
  message: z.string(),
});

export const DocumentGovernanceAuditSchema = z.object({
  generatedAt: z.string(),
  subprojectId: z.string().nullable(),
  entryCount: z.number().int().nonnegative(),
  activeTopicCount: z.number().int().nonnegative(),
  issueCount: z.number().int().nonnegative(),
  issues: z.array(DocumentGovernanceAuditIssueSchema),
  summary: z.string(),
});

export type DocumentNormalizationSource = z.infer<typeof DocumentNormalizationSourceSchema>;
export type DocumentNormalizationRun = z.infer<typeof DocumentNormalizationRunSchema>;
export type DocumentTruthSourceStatus = z.infer<typeof DocumentTruthSourceStatusSchema>;
export type DocumentTruthSourceEntry = z.infer<typeof DocumentTruthSourceEntrySchema>;
export type DocumentTruthSourceRegistry = z.infer<typeof DocumentTruthSourceRegistrySchema>;
export type DocumentGovernanceAuditIssue = z.infer<typeof DocumentGovernanceAuditIssueSchema>;
export type DocumentGovernanceAudit = z.infer<typeof DocumentGovernanceAuditSchema>;
