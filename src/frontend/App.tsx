import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CapabilityDefinition,
  ChatMessage,
  ChatSession,
  CommitteeReport,
  ContextSnapshot,
  DAGChangeEvent,
  DAGGraph,
  DAGRun,
  EvaluationDataset,
  EvaluationRun,
  ExecutionEvent,
  ExecutionObservability,
  ExecutionRun,
  FinalStateValidationReport,
  ProofOfWorkBundle,
  HermesPolicyReport,
  MultimodalArtifact,
  MultiPmGroupSession,
  ProductChiefMultiAgentReview,
  ProductChiefOutput,
  ProductChiefReport,
  ProductAgent,
  ProviderRoutingSnapshot,
  Requirement,
  RetrievalGovernance,
  SchedulerRun,
  Subproject,
  TaskSsotState,
  TaskSsotSyncEnvelope,
  UISchemaContract,
  V07RuntimeGovernanceSnapshot,
  VersionEntry,
  WorkflowMetrics,
  WorkflowRun,
} from '../shared/schemas';
import { ReviewPanel } from './components/ReviewPanel';
import { V07RuntimeGovernancePanel } from './components/V07RuntimeGovernancePanel';

const FRONTEND_PORT = '5174';
const BACKEND_PORT = '4312';

type RetrievalSearchItem = {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, string | number | boolean>;
};

type RetrievalGate = {
  passed: boolean;
  resultCount: number;
  indexedChunkCount: number;
  truthSourceResultCount: number;
  reasons: string[];
};

type RetrievalSearchResponse = {
  items: RetrievalSearchItem[];
  gate: RetrievalGate;
};

type ProductChiefImageBatch = {
  version: 1;
  outputId: string;
  subprojectId: string | null;
  generatedAt: string;
  versionTag: string;
  batchFolder: string;
  generatedImageGeneratedAt: string;
  pageCount: number;
  warningCount: number;
  items: Array<{
    pageNumber: number;
    pageName: string;
    pageKey: string;
    variantId: string;
    variantLabel: string;
    designLanguage: string;
    styleDirection: string;
    informationDensity: 'low' | 'medium' | 'high';
    prompt: string;
    assetPath: string;
  }>;
  warnings: string[];
  manifestPath: string;
};

type MultiPmGroupSessionsResponse = {
  items: MultiPmGroupSession[];
};

type TaskSsotStateResponse = TaskSsotState & {
  total: number;
  active: number;
  blocked: number;
  completed: number;
};

type SchedulerRunsResponse = {
  items: SchedulerRun[];
  total: number;
  running: number;
  paused: number;
  blocked: number;
  completed: number;
};

type OutboxResponse = {
  items: TaskSsotSyncEnvelope[];
};

type V10TrackStatus = 'landed' | 'partial' | 'missing';

type V10AcceptanceTrackItem = {
  id: string;
  title: string;
  status: V10TrackStatus;
  detail: string;
  userBackcheck: 'solved' | 'partial' | 'unsolved';
};

type WorkflowChainStageItem = {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'queued';
  detail: string;
};

const V10_WORKFLOW_CHAIN = [
  { id: 'research-document', label: '调研' },
  { id: 'planning-document', label: '规划' },
  { id: 'requirements-document', label: '需求' },
  { id: 'functional-specification', label: '功能' },
  { id: 'design-document', label: '设计' },
  { id: 'frontend-page', label: '前端页面' },
  { id: 'database-schema', label: '数据表' },
  { id: 'backend-api', label: '后端接口' },
  { id: 'frontend-backend-integration', label: '联调与验收' },
] as const;

const SPECIALIST_REVIEW_BASELINE = [
  'Solution-Optimality Review',
  'Development Review',
  'Design Review',
  'Research Review',
  'Delivery Review',
  'Hermes Governance',
] as const;

function getTrackTone(status: V10TrackStatus) {
  if (status === 'landed') {
    return 'trace-event trace-event--ok';
  }
  if (status === 'partial') {
    return 'trace-event trace-event--warn';
  }
  return 'trace-event trace-event--error';
}

function getWorkflowStageTone(status: WorkflowChainStageItem['status']) {
  if (status === 'completed') {
    return 'trace-event trace-event--ok runtime-feature-card runtime-feature-card--pipeline';
  }
  if (status === 'active') {
    return 'trace-event trace-event--warn runtime-feature-card runtime-feature-card--pipeline';
  }
  return 'trace-event runtime-feature-card runtime-feature-card--pipeline';
}

async function loadProofOfWorkBundle(subprojectId: string | null) {
  return fetchJson<ProofOfWorkBundle>(buildScopedUrl('/api/proof-of-work/bundle', subprojectId));
}

async function closeHermesLoop(runId: string, subprojectId: string | null) {
  return fetchJson<{ closedWritebackTaskCount: number; closedWatchTaskCount: number }>(
    buildScopedUrl(`/api/runs/${runId}/hermes/close-loop`, subprojectId),
    {
      method: 'POST',
      body: JSON.stringify({ subprojectId }),
    },
  );
}

async function executeHermesWriteback(runId: string, subprojectId: string | null) {
  return fetchJson<{
    executedWritebackTargetCount: number;
    skippedWritebackTargetCount: number;
    closedWritebackTaskCount: number;
    closedWatchTaskCount: number;
  }>(
    buildScopedUrl(`/api/runs/${runId}/hermes/execute-writeback`, subprojectId),
    {
      method: 'POST',
      body: JSON.stringify({ subprojectId }),
    },
  );
}

function resolveOperatorEntryActions(input: {
  entries: NonNullable<TaskSsotState['tasks'][number]['continuation']['currentAttention']>['operatorEntries'];
  schedulerRuns: SchedulerRunsResponse | null;
  schedulerBusy: boolean;
  workflowBusy: boolean;
  onRefresh: () => void;
  onTickDue: () => void;
  onTickRun: (workflowRunId: string) => void;
  onScheduleResumeCurrent: (workflowRunId: string) => void;
  onScheduleResumeRework: (workflowRunId: string) => void;
  onApproveGate: () => void;
  onSendToRework: () => void;
  onExecuteHermesWriteback: (workflowRunId: string) => void;
  onCloseHermesLoop: (workflowRunId: string) => void;
}) {
  return input.entries.map((entry) => {
    const key = `${entry.targetTaskId}-${entry.actionId}`;
    if (entry.actionId === 'refresh-proof') {
      return { key, label: entry.label, onClick: input.onRefresh, disabled: input.workflowBusy || input.schedulerBusy };
    }
    if (entry.actionId === 'tick-due') {
      return { key, label: entry.label, onClick: input.onTickDue, disabled: input.schedulerBusy };
    }
    if (entry.actionId === 'approve-gate') {
      return { key, label: entry.label, onClick: input.onApproveGate, disabled: input.workflowBusy };
    }
    if (entry.actionId === 'send-to-rework') {
      return { key, label: entry.label, onClick: input.onSendToRework, disabled: input.workflowBusy };
    }
    if (entry.actionId === 'close-hermes-loop') {
      if (!entry.targetWorkflowRunId) {
        return { key, label: entry.label, onClick: () => undefined, disabled: true };
      }
      return {
        key,
        label: entry.label,
        onClick: () => input.onCloseHermesLoop(entry.targetWorkflowRunId as string),
        disabled: input.workflowBusy || input.schedulerBusy,
      };
    }
    if (entry.actionId === 'execute-hermes-writeback') {
      if (!entry.targetWorkflowRunId) {
        return { key, label: entry.label, onClick: () => undefined, disabled: true };
      }
      return {
        key,
        label: entry.label,
        onClick: () => input.onExecuteHermesWriteback(entry.targetWorkflowRunId as string),
        disabled: input.workflowBusy || input.schedulerBusy,
      };
    }
    const linkedWorkflowRunId = entry.targetWorkflowRunId;
    const linkedSchedulerRun =
      linkedWorkflowRunId && input.schedulerRuns
        ? input.schedulerRuns.items.find((item) => item.workflowRunId === linkedWorkflowRunId) ?? null
        : null;
    if (!linkedSchedulerRun) {
      return { key, label: entry.label, onClick: () => undefined, disabled: true };
    }
    if (entry.actionId === 'tick-run') {
      return {
        key,
        label: entry.label,
        onClick: () => input.onTickRun(linkedSchedulerRun.workflowRunId),
        disabled: input.schedulerBusy,
      };
    }
    if (entry.actionId === 'resume-current-stage') {
      return {
        key,
        label: entry.label,
        onClick: () => input.onScheduleResumeCurrent(linkedSchedulerRun.workflowRunId),
        disabled: input.schedulerBusy,
      };
    }
    return {
      key,
      label: entry.label,
      onClick: () => input.onScheduleResumeRework(linkedSchedulerRun.workflowRunId),
      disabled: input.schedulerBusy,
    };
  });
}

function findLinkedTaskForWorkflowRun(state: TaskSsotStateResponse | null, workflowRunId: string) {
  if (!state) {
    return null;
  }
  return state.tasks.find((task) => task.sourceType === 'workflow-run-task' && task.sourceRef === workflowRunId) ?? null;
}

function isProjectScopedDesignOutput(type: string | null | undefined) {
  return type === 'concept-design-pack' || type === 'design-image2-prompt-pack';
}

function getGovernedOutputLabel(type: string | null | undefined) {
  switch (type) {
    case 'plan-prd':
      return 'Planning PRD';
    case 'functional-spec-pack':
      return '功能说明包';
    case 'concept-design-pack':
      return '概念设计包（image2 概念板）';
    case 'html-direction-pack':
      return '交付级 HTML 页面';
    case 'delivery-design-pack':
      return '交付设计包（Figma / JSON schema / 页面结构 DSL）';
    case 'implementation-handoff':
      return '开发交接包';
    case 'product-definition-baseline':
      return '产品定义基线';
    case 'requirement-baseline':
      return '需求基线';
    case 'original-demand-review':
      return '原始需求回查';
    case 'ui-schema-spec':
      return '结构化页面规范';
    default:
      return type ?? '未知产出';
  }
}

function getGovernedOutputLayer(type: string | null | undefined) {
  switch (type) {
    case 'product-definition-baseline':
    case 'requirement-baseline':
    case 'original-demand-review':
    case 'plan-prd':
    case 'functional-spec-pack':
      return 'definition';
    case 'concept-design-pack':
    case 'html-direction-pack':
    case 'delivery-design-pack':
    case 'ui-schema-spec':
      return 'design';
    case 'implementation-handoff':
    case 'version-plan':
    case 'roadmap':
    case 'demo-script':
    case 'user-manual':
      return 'delivery';
    default:
      return 'delivery';
  }
}

function getGovernedOutputLayerLabel(layer: 'definition' | 'design' | 'delivery') {
  switch (layer) {
    case 'definition':
      return '定义层';
    case 'design':
      return '设计层';
    case 'delivery':
      return '交付层';
  }
}

function buildGovernedOutputHint(input: {
  type: string;
  layer: 'definition' | 'design' | 'delivery';
  dependsOn: string[];
  unlocks: string[];
}) {
  const parts = [
    `层级: ${getGovernedOutputLayerLabel(input.layer)}`,
    `依赖: ${input.dependsOn.length > 0 ? input.dependsOn.map((type) => getGovernedOutputLabel(type)).join(' / ') : '无'}`,
    `解锁: ${input.unlocks.length > 0 ? input.unlocks.map((type) => getGovernedOutputLabel(type)).join(' / ') : '无直接下游'}`,
  ];
  return parts.join('\n');
}

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  0: BrowserSpeechRecognitionAlternative;
  isFinal?: boolean;
  length: number;
}

interface BrowserSpeechRecognitionEvent extends Event {
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type ChatRespondResult = {
  session: ChatSession;
  run: ExecutionRun;
  contextSnapshot: ContextSnapshot;
  assistantMessage: ChatMessage;
};

type PortfolioEntry = {
  subprojectId: string | null;
  label: string;
  runCount: number;
  currentRun: WorkflowRun | null;
  metrics: WorkflowMetrics | null;
};

type EvaluationHistory = {
  filters: {
    capabilityId: string | null;
    version: string | null;
    requirementId: string | null;
    versionEntryId: string | null;
  };
  summary: {
    runCount: number;
    capabilityCount: number;
    requirementCount: number;
    versionEntryCount: number;
  };
  items: Array<{
    run: EvaluationRun;
    dataset: EvaluationDataset | null;
    capability: CapabilityDefinition | null;
    requirementIds: string[];
    versionEntryIds: string[];
    artifactPaths: string[];
  }>;
};

type ProductAgentBlueprintSummary = {
  id: string;
  name: string;
  role: string;
  level: string;
  scope: string;
  manages?: string[];
};

type ProductSkillSummary = {
  id: string;
  name: string;
  category: string;
  description: string;
  ownerRole: string;
  promptPath: string;
  stageIds: string[];
  outputs: string[];
};

type ProductSkillSurface = {
  items: ProductSkillSummary[];
  summary: {
    total: number;
    product: number;
    design: number;
    documentation: number;
  };
  byMainline: {
    product: ProductSkillSummary[];
    design: ProductSkillSummary[];
    documentation: ProductSkillSummary[];
  };
  designTooling: {
    packageName: string;
    command: string;
    status: string;
    statusPath: string;
    localGuidePath: string;
  };
};

type CodexLocalSkill = {
  id: string;
  path: string;
  hasSkillMd: boolean;
  scope: 'system' | 'runtime' | 'user';
};

type CodexLocalPlugin = {
  id: string;
  enabled: boolean;
  source: 'config' | 'cache' | 'config+cache';
  cachePath: string | null;
};

type CodexLocalStateSnapshot = {
  codexHome: string;
  configPath: string;
  skillsPath: string;
  pluginsPath: string;
  configExists: boolean;
  localSkills: CodexLocalSkill[];
  runtimeVisibleSkills: Array<{
    id: string;
    name: string;
    scope: 'personal' | 'system';
    description: string;
  }>;
  governedRuntimeCapabilities: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    targetRegistry: string;
  }>;
  governedLocalRuntimeCore: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    targetRegistry: string;
  }>;
  localPlugins: CodexLocalPlugin[];
  governedPlugins: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    runtimeVisibleSkillId: string | null;
  }>;
  enabledPluginIds: string[];
  pmaiosExternalSkills: Array<{
    id: string;
    name: string;
    promptPath: string;
    command: string | null;
    deploymentStatus: string;
  }>;
  pmaiosReadiness: {
    total: number;
    enabled: number;
    integrated: number;
    autoTriggerable: number;
    byStatus: Record<string, number>;
  };
  diff: {
    localOnlySkills: string[];
    pmaiosOnlyExternalSkills: string[];
    localVisibleAndRegisteredSkills: string[];
    runtimeVisibleOnlySkills: string[];
    enabledPluginsNotTrackedByPmaios: string[];
  };
};

type ExternalConnectorStatus = {
  notion: {
    configured: boolean;
    connected: boolean | null;
    missing: string[];
    targetMode: 'database' | 'page' | 'unconfigured';
  };
  figma: {
    configured: boolean;
    connected: boolean | null;
    missing: string[];
  };
  webFetch: {
    configured: boolean;
    outputRoot: string;
  };
  dingtalk: {
    configured: boolean;
    importMode: 'manual-export-or-paste';
    inboxPath: string;
    localCandidateRoots: string[];
  };
  dataki: {
    configured: boolean;
    connected: boolean | null;
    missing: string[];
    baseUrl: string | null;
    userId: string | null;
    agentId: string | null;
    defaultKnowledgeBaseId: string | null;
    defaultKnowledgeBaseIds: string[];
  };
};

type DatakiKnowledgeBaseSummary = {
  id: string;
  name: string;
  description: string;
  type: string;
  knowledgeCount: number;
  chunkCount: number;
  processingCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

type DatakiKnowledgeFileSummary = {
  id: string;
  title: string;
  fileType: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DatakiKnowledgeSearchItem = {
  id: string;
  content: string;
  knowledgeId: string;
  knowledgeTitle: string;
  knowledgeFilename: string | null;
  knowledgeSource: string | null;
  chunkType: string | null;
  score: number | null;
};

type CollaborationModeName = 'default' | 'plan' | 'deep' | 'do';

type CollaborationModeState = {
  currentMode: CollaborationModeName;
  currentTaskId: string | null;
  lastUpdated: string;
  lastUpdatedBy: string;
};

type CollaborationModeEntry = {
  id: string;
  mode: CollaborationModeName;
  label: string;
  toolIdentity: string;
  timestamp: string;
};

type SharedTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

type SharedTask = {
  id: string;
  label: string;
  status: SharedTaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  notes: string | null;
};

type SharedCheckpoint = {
  id: string;
  label: string;
  taskId: string | null;
  contextSnapshot: string;
  timestamp: string;
};

type SharedEventKind = 'task_started' | 'task_completed' | 'task_blocked' | 'checkpoint' | 'decision' | 'note' | 'mode_changed';

type SharedEvent = {
  id: string;
  toolIdentity: string;
  kind: SharedEventKind;
  taskId: string | null;
  content: string;
  timestamp: string;
};

type ExecutionChecklistVersionSummary = {
  id: string;
  label: string;
  totalTrackedItems: number;
  solved: number;
  partial: number;
  carryOver: number;
  missingPlacement: number;
};

type ExecutionChecklistBackcheck = {
  id: string;
  label: string;
  status: 'solved' | 'partial' | 'unsolved';
  detail: string;
};

type ExecutionChecklistSummary = {
  versions: ExecutionChecklistVersionSummary[];
  userBackchecks: ExecutionChecklistBackcheck[];
};

type DailyDigestEntry = {
  id: string;
  label: string;
  path: string;
  url: string;
};

type ProjectEntryAsset = {
  name: 'project-board.svg' | 'roadmap-board.svg' | 'decision-board.svg' | 'change-log.md';
  path: string;
  url: string;
};

type ProjectLinkedSourceKind = 'repo-entry' | 'governance' | 'ai-facing';

type ProjectLinkedSource = {
  name: string;
  kind: ProjectLinkedSourceKind;
  path: string;
  url: string;
};

type ProjectEntrySummary = {
  subprojectId: string;
  expectedAssetCount: number;
  assetCount: number;
  assets: ProjectEntryAsset[];
  missingAssets: ProjectEntryAsset['name'][];
  linkedSourceCount: number;
  linkedSources: ProjectLinkedSource[];
};

type RuleExecutionItem = {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'pending';
  detail: string;
};

const SUBPROJECT_WORKFLOW_ADOPTION: Record<string, 'adopted' | 'partial' | 'not_adopted' | 'unknown'> = {
  'knowledge-base': 'partial',
  ad: 'partial',
  chokonu: 'partial',
  'tracking-acceptance': 'adopted',
  server: 'partial',
  'data-service': 'not_adopted',
  'ad-intelligence': 'unknown',
  mcp: 'unknown',
};

const RULE_EVIDENCE_PATHS = {
  inbox: 'docs/sources/inbox/',
  workflow: 'docs/operations/product-workflow-total-design.md',
  adoption: 'docs/operations/subproject-product-workflow-adoption-checklist.md',
  version: 'docs/operations/version-governance.md',
};

type WebFetchArtifact = {
  id: string;
  url: string;
  title: string;
  sourcePath: string;
  fetchedAt: string;
  charCount: number;
};

type FigmaInspection = {
  fileKey: string;
  name: string;
  role: string | null;
  lastModified: string | null;
  thumbnailUrl: string | null;
  nodeCount: number;
};

type DingTalkMeetingImportResult = {
  imported: {
    id: string;
    sourcePath: string;
    title: string;
    importedAt: string;
    charCount: number;
  };
  normalizationRun: {
    id: string;
    status: string;
    requirementIds: string[];
    versionEntryIds: string[];
  };
};

function buildScopedUrl(path: string, subprojectId: string | null) {
  if (!subprojectId) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}subprojectId=${encodeURIComponent(subprojectId)}`;
}

function buildFileApiUrl(filePath: string) {
  return `/api/files/${filePath.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? `request failed: ${response.status}`);
  }

  return data as T;
}

async function listSubprojects() {
  return fetchJson<Subproject[]>('/api/subprojects');
}

function RuleExecutionStatusPanel({
  selectedSubproject,
  sessionsCount,
  messagesCount,
  workflowRun,
}: {
  selectedSubproject: Subproject | null;
  sessionsCount: number;
  messagesCount: number;
  workflowRun: WorkflowRun | null;
}) {
  const adoptionState = selectedSubproject?.id ? SUBPROJECT_WORKFLOW_ADOPTION[selectedSubproject.id] ?? 'unknown' : 'partial';
  const workflowAdoptionLabel =
    adoptionState === 'adopted'
      ? '已接入'
      : adoptionState === 'partial'
        ? '已部分接入'
        : adoptionState === 'not_adopted'
          ? '未接入'
          : '待确认';
  const workflowAdoptionStatus: RuleExecutionItem['status'] =
    adoptionState === 'adopted'
      ? 'ok'
      : adoptionState === 'partial'
        ? 'ok'
        : adoptionState === 'not_adopted'
          ? 'warning'
          : 'pending';

  const items: RuleExecutionItem[] = [
    {
      id: 'input',
      label: '唯一输入源 inbox',
      status: 'ok',
      detail: '已固化为平台规则，原始材料需先进入 docs/sources/inbox。',
    },
    {
      id: 'chain',
      label: '产品主链执行',
      status: workflowRun ? 'ok' : 'pending',
      detail: workflowRun ? `当前 workflow 状态：${workflowRun.status}` : '当前 scope 暂无 workflow run 证据。',
    },
    {
      id: 'sync',
      label: '主动同步与文档优先',
      status: sessionsCount > 0 || messagesCount > 0 ? 'ok' : 'pending',
      detail: sessionsCount > 0 ? `当前已有 ${sessionsCount} 个会话、${messagesCount} 条消息，可作为同步入口。` : '当前还没有会话同步记录。',
    },
    {
      id: 'subproject',
      label: '子项目工作流接入',
      status: workflowAdoptionStatus,
      detail: `${selectedSubproject?.name ?? '平台总控'}：${workflowAdoptionLabel}`,
    },
  ];

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>规则执行看板</h2>
      </div>
      <div className="trace-list">
        {items.map((item) => (
          <article key={item.id} className={`trace-event trace-event--${item.status}`}>
            <div className="trace-event__kind">{item.label}</div>
            <div className="trace-event__detail">{item.detail}</div>
          </article>
        ))}
      </div>
      <div className="inspector-path-list">
        <code className="inspector-path-chip">{RULE_EVIDENCE_PATHS.inbox}</code>
        <code className="inspector-path-chip">{RULE_EVIDENCE_PATHS.workflow}</code>
        <code className="inspector-path-chip">{RULE_EVIDENCE_PATHS.adoption}</code>
      </div>
    </section>
  );
}

function ArtifactHubPanel({
  counts,
  latest,
  onOpenRequirements,
  onOpenVersions,
  onOpenCapabilities,
  onOpenDatasets,
  onOpenProductOutputs,
}: {
  counts: {
    requirements: number;
    versions: number;
    capabilities: number;
    datasets: number;
    productOutputs: number;
  };
  latest: {
    requirement: string;
    version: string;
    capability: string;
    dataset: string;
    productOutput: string;
  };
  onOpenRequirements: () => void;
  onOpenVersions: () => void;
  onOpenCapabilities: () => void;
  onOpenDatasets: () => void;
  onOpenProductOutputs: () => void;
}) {
  const items = [
    { id: 'requirements', label: '需求池', count: counts.requirements, latestLabel: latest.requirement, onClick: onOpenRequirements },
    { id: 'versions', label: '版本库', count: counts.versions, latestLabel: latest.version, onClick: onOpenVersions },
    { id: 'capabilities', label: 'Capability', count: counts.capabilities, latestLabel: latest.capability, onClick: onOpenCapabilities },
    { id: 'datasets', label: '评测集', count: counts.datasets, latestLabel: latest.dataset, onClick: onOpenDatasets },
    { id: 'outputs', label: 'PM产出', count: counts.productOutputs, latestLabel: latest.productOutput, onClick: onOpenProductOutputs },
  ];

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>产出物</h2>
      </div>
      <div className="artifact-hub-list">
        {items.map((item) => (
          <button key={item.id} type="button" className="action-tile" onClick={item.onClick}>
            <span className="action-tile__label">{item.label}</span>
            <strong>{item.count}</strong>
            <span className="action-tile__latest">{item.latestLabel}</span>
            <span className="action-tile__hint">点击查看</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecentOutputTimelinePanel({
  outputs,
  requirements,
  versions,
}: {
  outputs: ProductChiefOutput[];
  requirements: Requirement[];
  versions: VersionEntry[];
}) {
  const items = [
    ...outputs.map((output) => ({
      id: `output-${output.id}`,
      kind: 'PM产出',
      title: output.title,
      detail: output.summary,
      time: output.generatedAt,
      meta: output.type,
      status: output.status === 'ready-for-review' ? 'warning' : 'ok',
    })),
    ...requirements.map((requirement) => ({
      id: `requirement-${requirement.id}`,
      kind: '需求',
      title: requirement.title,
      detail: requirement.description,
      time: requirement.updatedAt,
      meta: `${requirement.category} / ${requirement.priority} / ${requirement.status}`,
      status: requirement.status === 'done' ? 'ok' : 'pending',
    })),
    ...versions.map((version) => ({
      id: `version-${version.id}`,
      kind: '版本',
      title: version.summary,
      detail: version.releaseNotes ?? version.diffSummary ?? `${version.entityType} / ${version.entityId}`,
      time: version.createdAt,
      meta: `${version.changeType} / ${version.newVersion ?? '-'}`,
      status: version.approval?.approved === false ? 'warning' : 'ok',
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>最近产出时间线</h3>
      </div>
      <div className="trace-list">
        {items.length === 0 ? (
          <div className="inspector-empty">当前还没有可展示的产出。</div>
        ) : (
          items.map((item) => (
            <article key={item.id} className={`trace-event trace-event--${item.status}`}>
              <div className="trace-event__kind">{item.kind}</div>
              <div className="trace-event__detail">{item.title}</div>
              <div className="trace-event__artifact">{item.detail}</div>
              <div className="trace-event__meta">
                {item.meta} / {new Date(item.time).toLocaleString('zh-CN')}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ModeRuntimePanel({
  modeState,
  modeHistory,
  busy,
  onSwitchMode,
}: {
  modeState: CollaborationModeState | null;
  modeHistory: CollaborationModeEntry[];
  busy: boolean;
  onSwitchMode: (mode: CollaborationModeName) => void;
}) {
  const status: RuleExecutionItem['status'] =
    modeState?.currentMode === 'do' ? 'ok' : modeState?.currentMode === 'deep' ? 'warning' : 'pending';

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>协作模式</h2>
      </div>
      {!modeState ? (
        <div className="inspector-empty">当前还没有 mcp-context mode 状态。</div>
      ) : (
        <>
          <article className={`trace-event trace-event--${status}`}>
            <div className="trace-event__kind">当前模式</div>
            <div className="trace-event__detail">{modeState.currentMode}</div>
            <div className="trace-event__meta">
              task: {modeState.currentTaskId ?? '-'} / by: {modeState.lastUpdatedBy}
            </div>
          </article>
          <div className="artifact-hub-list">
            {(['default', 'plan', 'deep', 'do'] as CollaborationModeName[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className="action-tile"
                onClick={() => onSwitchMode(mode)}
                disabled={busy || modeState.currentMode === mode}
              >
                <span className="action-tile__label">{mode}</span>
                <strong>{modeState.currentMode === mode ? '当前' : '切换'}</strong>
                <span className="action-tile__hint">{busy ? '处理中' : '更新共享模式'}</span>
              </button>
            ))}
          </div>
          <div className="trace-list">
            {modeHistory.slice(0, 3).map((entry) => (
              <article key={entry.id} className="trace-event trace-event--ok">
                <div className="trace-event__kind">{entry.mode}</div>
                <div className="trace-event__detail">{entry.label}</div>
                <div className="trace-event__meta">
                  {entry.toolIdentity} / {new Date(entry.timestamp).toLocaleString('zh-CN')}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SharedContextPanel({
  tasks,
  checkpoints,
  events,
}: {
  tasks: SharedTask[];
  checkpoints: SharedCheckpoint[];
  events: SharedEvent[];
}) {
  const activeTasks = tasks.filter((task) => task.status === 'in_progress').slice(0, 4);
  const recentCheckpoints = checkpoints.slice(0, 3);
  const recentEvents = events.slice(0, 6);

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>共享上下文</h2>
      </div>
      <div className="trace-list">
        {activeTasks.length === 0 ? (
          <div className="inspector-empty">当前没有 in-progress 共享任务。</div>
        ) : (
          activeTasks.map((task) => (
            <article key={task.id} className={`trace-event trace-event--${task.status === 'blocked' ? 'warning' : 'ok'}`}>
              <div className="trace-event__kind">{task.status}</div>
              <div className="trace-event__detail">{task.label}</div>
              <div className="trace-event__meta">{task.id}</div>
            </article>
          ))
        )}
      </div>
      <div className="trace-list">
        {recentCheckpoints.map((checkpoint) => (
          <article key={checkpoint.id} className="trace-event trace-event--ok">
            <div className="trace-event__kind">checkpoint</div>
            <div className="trace-event__detail">{checkpoint.label}</div>
            <div className="trace-event__meta">
              {checkpoint.taskId ?? '-'} / {new Date(checkpoint.timestamp).toLocaleString('zh-CN')}
            </div>
          </article>
        ))}
      </div>
      <div className="trace-list">
        {recentEvents.map((event) => (
          <article key={event.id} className="trace-event trace-event--ok">
            <div className="trace-event__kind">{event.kind}</div>
            <div className="trace-event__detail">{event.content}</div>
            <div className="trace-event__meta">
              {event.toolIdentity} / {event.taskId ?? '-'} / {new Date(event.timestamp).toLocaleString('zh-CN')}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskContinuationPanel({
  state,
  workflowBusy,
  schedulerBusy,
  schedulerRuns,
  onRefreshWorkflow,
  onRunUntilBlocked,
  onResumeWorkflow,
  onApproveReviewGate,
  onSendToRework,
  onExecuteHermesWriteback,
  onCloseHermesLoop,
}: {
  state: TaskSsotStateResponse | null;
  workflowBusy: boolean;
  schedulerBusy: boolean;
  schedulerRuns: SchedulerRunsResponse | null;
  onRefreshWorkflow: () => void;
  onRunUntilBlocked: () => void;
  onResumeWorkflow: () => void;
  onApproveReviewGate: () => void;
  onSendToRework: () => void;
  onExecuteHermesWriteback: (workflowRunId: string) => void;
  onCloseHermesLoop: (workflowRunId: string) => void;
}) {
  if (!state) {
    return (
      <section className="sidebar-section">
        <div className="section-header">
          <h2>项目续跑</h2>
        </div>
        <div className="inspector-empty">当前还没有 Task SSOT continuation 状态。</div>
      </section>
    );
  }

  const activeMainlineTask = state.continuation.activeMainlineTaskId
    ? state.tasks.find((task) => task.taskId === state.continuation.activeMainlineTaskId) ?? null
    : null;
  const parkedTasks = state.tasks.filter((task) => state.continuation.parkedTaskIds.includes(task.taskId)).slice(0, 3);
  const blockedTasks = state.tasks.filter((task) => state.continuation.blockedTaskIds.includes(task.taskId)).slice(0, 3);
  const gateChecks = state.tasks.flatMap((task) => task.gateChecks.map((gate) => ({ taskTitle: task.title, gate })));
  const gatePassCount = gateChecks.filter((item) => item.gate.status === 'pass').length;
  const gateWarnCount = gateChecks.filter((item) => item.gate.status === 'warn').length;
  const gateBlockCount = gateChecks.filter((item) => item.gate.status === 'block').length;
  const attentionTasks = state.tasks
    .filter((task) => task.continuation.currentAttention && task.continuation.currentAttention.status !== 'pass')
    .slice(0, 4);
  const activeMainlineAttention = state.continuation.activeMainlineAttention ?? activeMainlineTask?.continuation.currentAttention ?? null;
  const activeMainlineActions = activeMainlineAttention
    ? resolveOperatorEntryActions({
        entries: activeMainlineAttention.operatorEntries,
        schedulerRuns,
        schedulerBusy,
        workflowBusy,
        onRefresh: onRefreshWorkflow,
        onTickDue: onRunUntilBlocked,
        onTickRun: onRunUntilBlocked,
        onScheduleResumeCurrent: onResumeWorkflow,
        onScheduleResumeRework: onResumeWorkflow,
        onApproveGate: onApproveReviewGate,
        onSendToRework,
        onExecuteHermesWriteback,
        onCloseHermesLoop,
      })
    : [];

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>项目续跑</h2>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRefreshWorkflow} disabled={workflowBusy}>
            Refresh
          </button>
          <button type="button" className="secondary-button" onClick={onRunUntilBlocked} disabled={workflowBusy}>
            Run
          </button>
        </div>
      </div>
      <div className="trace-list">
        <article className={`trace-event trace-event--${activeMainlineTask ? 'ok' : 'warning'}`}>
          <div className="trace-event__kind">active mainline</div>
          <div className="trace-event__detail">{activeMainlineTask?.continuation.mainlineLabel ?? '当前还没有激活主线'}</div>
          <div className="trace-event__meta">
            {activeMainlineTask?.taskId ?? '-'} / next: {activeMainlineTask?.continuation.nextSafeStep ?? '-'}
          </div>
          {activeMainlineAttention ? (
            <div className="trace-event__artifact">
              attention: {activeMainlineAttention.gateId ?? '-'} / {activeMainlineAttention.status ?? '-'}
            </div>
          ) : null}
          {activeMainlineTask?.continuation.resumeAnchor ? (
            <div className="trace-event__artifact">{activeMainlineTask.continuation.resumeAnchor}</div>
          ) : null}
          {activeMainlineActions.length > 0 ? (
            <div className="capability-inline-actions" style={{ marginTop: 8 }}>
              {activeMainlineActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="secondary-button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </article>
        <article className="trace-event trace-event--ok">
          <div className="trace-event__kind">summary</div>
          <div className="trace-event__detail">
            total {state.total} / active {state.active} / blocked {state.blocked} / completed {state.completed}
          </div>
          <div className="trace-event__meta">
            parked {state.continuation.parkedTaskIds.length} / blocked {state.continuation.blockedTaskIds.length}
          </div>
        </article>
        <article className={`trace-event trace-event--${gateBlockCount > 0 ? 'warning' : 'ok'}`}>
          <div className="trace-event__kind">gate runtime</div>
          <div className="trace-event__detail">
            pass {gatePassCount} / warn {gateWarnCount} / block {gateBlockCount}
          </div>
          <div className="trace-event__meta">当前最小实现：project truth / review convergence / asset backwrite</div>
        </article>
      </div>
      <div className="trace-list">
        {parkedTasks.length === 0 ? (
          <div className="inspector-empty">当前没有 parked side lines。</div>
        ) : (
          parkedTasks.map((task) => (
            <article key={task.taskId} className="trace-event trace-event--ok">
              <div className="trace-event__kind">parked</div>
              <div className="trace-event__detail">{task.continuation.mainlineLabel}</div>
              <div className="trace-event__meta">{task.continuation.nextSafeStep ?? 'waiting for mainline return'}</div>
            </article>
          ))
        )}
      </div>
      <div className="trace-list">
        {blockedTasks.map((task) => (
          <article key={task.taskId} className="trace-event trace-event--warning">
            <div className="trace-event__kind">blocked / {task.continuation.blockerType ?? 'unknown'}</div>
            <div className="trace-event__detail">{task.continuation.mainlineLabel}</div>
            <div className="trace-event__meta">{task.continuation.nextSafeStep ?? task.summary ?? '-'}</div>
          </article>
        ))}
      </div>
      <div className="trace-list">
        {attentionTasks.length === 0 ? (
          <div className="inspector-empty">当前最小 gate runtime 没有 warn / block 项。</div>
        ) : (
          attentionTasks.map((task) => {
            const attention = task.continuation.currentAttention;
            if (!attention) {
              return null;
            }
            const actions = resolveOperatorEntryActions({
              entries: attention.operatorEntries,
              schedulerRuns,
              schedulerBusy,
              workflowBusy,
              onRefresh: onRefreshWorkflow,
              onTickDue: onRunUntilBlocked,
              onTickRun: onRunUntilBlocked,
              onScheduleResumeCurrent: onResumeWorkflow,
              onScheduleResumeRework: onResumeWorkflow,
              onApproveGate: onApproveReviewGate,
              onSendToRework,
              onExecuteHermesWriteback,
              onCloseHermesLoop,
            });
            return (
              <article key={`${task.taskId}-${attention.gateId ?? 'attention'}`} className={`trace-event trace-event--${attention.status === 'block' ? 'warning' : 'pending'}`}>
                <div className="trace-event__kind">
                  {attention.status} / {attention.gateId ?? '-'}
                </div>
                <div className="trace-event__detail">{task.continuation.mainlineLabel}</div>
                <div className="trace-event__meta">{attention.reason ?? task.summary ?? '-'}</div>
                <div className="trace-event__artifact">
                  next: {attention.nextSafeStep ?? '-'} / stage: {attention.stageId ?? '-'}
                </div>
                {actions.length > 0 ? (
                  <div className="capability-inline-actions">
                    {actions.map((action) => (
                      <button type="button" className="secondary-button" key={action.key} onClick={action.onClick} disabled={action.disabled}>
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function SchedulerRunPanel({
  data,
  taskSsotState,
  busy,
  onRefresh,
  onTickDue,
  onTickRun,
  onScheduleResumeCurrent,
  onScheduleResumeRework,
  onExecuteHermesWriteback,
  onCloseHermesLoop,
}: {
  data: SchedulerRunsResponse | null;
  taskSsotState: TaskSsotStateResponse | null;
  busy: boolean;
  onRefresh: () => void;
  onTickDue: () => void;
  onTickRun: (workflowRunId: string) => void;
  onScheduleResumeCurrent: (workflowRunId: string) => void;
  onScheduleResumeRework: (workflowRunId: string) => void;
  onExecuteHermesWriteback: (workflowRunId: string) => void;
  onCloseHermesLoop: (workflowRunId: string) => void;
}) {
  if (!data) {
    return (
      <section className="sidebar-section">
        <div className="section-header">
          <h2>调度运行</h2>
        </div>
        <div className="inspector-empty">当前还没有 SchedulerRun 视图。</div>
      </section>
    );
  }

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>调度运行</h2>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
          <button type="button" className="secondary-button" onClick={onTickDue} disabled={busy}>
            Tick Due
          </button>
        </div>
      </div>
      <div className="trace-list">
        <article className={`trace-event trace-event--${data.blocked > 0 ? 'warning' : 'ok'}`}>
          <div className="trace-event__kind">scheduler summary</div>
          <div className="trace-event__detail">
            total {data.total} / running {data.running} / paused {data.paused} / blocked {data.blocked} / completed {data.completed}
          </div>
          <div className="trace-event__meta">
            due now {data.items.filter((run) => run.dueNow).length} / 最小实现：schedule / tick / auto resume / retry / next run / blocked reason
          </div>
        </article>
      </div>
      <div className="trace-list">
        {data.items.length === 0 ? (
          <div className="inspector-empty">当前还没有 workflow-derived scheduler run。</div>
        ) : (
          data.items.slice(0, 4).map((run) => {
            const linkedTask = findLinkedTaskForWorkflowRun(taskSsotState, run.workflowRunId);
            const linkedAttention = linkedTask?.continuation.currentAttention ?? null;
            const linkedActions = linkedAttention
              ? resolveOperatorEntryActions({
                  entries: linkedAttention.operatorEntries,
                  schedulerRuns: data,
                  schedulerBusy: busy,
                  workflowBusy: busy,
                  onRefresh,
                  onTickDue,
                  onTickRun,
                  onScheduleResumeCurrent,
                  onScheduleResumeRework,
                  onApproveGate: () => undefined,
                  onSendToRework: () => undefined,
                  onExecuteHermesWriteback,
                  onCloseHermesLoop,
                }).filter((action) => action.label !== 'Approve Gate' && action.label !== 'Send To Rework')
              : [];

            return (
              <article key={run.id} className={`trace-event trace-event--${run.status === 'blocked' ? 'warning' : run.status === 'paused' ? 'pending' : 'ok'}`}>
                <div className="trace-event__kind">{run.status}</div>
                <div className="trace-event__detail">
                  {run.projectName} / stage {run.currentStageId ?? '-'}
                </div>
                <div className="trace-event__meta">
                  retry {run.retryCount} / next {run.nextRunAt ? new Date(run.nextRunAt).toLocaleString('zh-CN') : '-'}
                </div>
                <div className="trace-event__artifact">
                  mode {run.schedulerMode} / auto recovery {run.autoRecoveryEligible ? 'eligible' : 'manual'}
                </div>
                {run.plannedAction ? (
                  <div className="trace-event__artifact">
                    plan {run.plannedAction} / due {run.dueNow ? 'now' : 'waiting'}
                  </div>
                ) : null}
                {linkedTask ? (
                  <div className="trace-event__artifact">
                    task {linkedTask.continuation.mainlineLabel} / attention {linkedAttention?.gateId ?? '-'} / {linkedAttention?.status ?? '-'}
                  </div>
                ) : null}
                {run.operatorActionHint ? <div className="trace-event__artifact">{run.operatorActionHint}</div> : null}
                {run.schedulerReason ? <div className="trace-event__artifact">{run.schedulerReason}</div> : null}
                {run.blockedReason ? <div className="trace-event__artifact">{run.blockedReason}</div> : null}
                <div className="capability-inline-actions">
                  <button type="button" className="secondary-button" onClick={() => onTickRun(run.workflowRunId)} disabled={busy}>
                    Tick
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onScheduleResumeCurrent(run.workflowRunId)}
                    disabled={busy || run.status === 'completed'}
                  >
                    Resume Current
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onScheduleResumeRework(run.workflowRunId)}
                    disabled={busy || run.status === 'completed'}
                  >
                    Resume Rework
                  </button>
                  {linkedActions.map((action) => (
                    <button type="button" className="secondary-button" key={action.key} onClick={action.onClick} disabled={action.disabled}>
                      {action.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function FinalStateValidationPanel({
  report,
  browserRunBusy,
  browserRunResult,
  onRunBrowserVerification,
}: {
  report: FinalStateValidationReport | null;
  browserRunBusy: boolean;
  browserRunResult: LiveBrowserVerificationRun | null;
  onRunBrowserVerification: (() => void) | null;
}) {
  if (!report) {
    return (
      <section className="sidebar-section">
        <div className="section-header">
          <h2>最终态校验</h2>
        </div>
        <div className="inspector-empty">当前还没有 final-state validation 结果。</div>
      </section>
    );
  }

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>最终态校验</h2>
        {onRunBrowserVerification ? (
          <button type="button" className="secondary-button" onClick={onRunBrowserVerification} disabled={browserRunBusy}>
            {browserRunBusy ? '运行中...' : '运行浏览器验证'}
          </button>
        ) : null}
      </div>
      <div className="trace-list">
        <article className={`trace-event trace-event--${report.status === 'ready' ? 'ok' : 'warning'}`}>
          <div className="trace-event__kind">{report.status}</div>
          <div className="trace-event__detail">{report.summary}</div>
          <div className="trace-event__meta">任务：{report.taskId}</div>
        </article>
        {report.checks.map((check) => (
          <article key={check.id} className={`trace-event trace-event--${check.status === 'pass' ? 'ok' : 'warning'}`}>
            <div className="trace-event__kind">{check.label}</div>
            <div className="trace-event__detail">{check.status}</div>
            <div className="trace-event__meta">{check.detail}</div>
          </article>
        ))}
        {report.browserVerification ? (
          <article className={`trace-event trace-event--${report.browserVerification.status === 'pass' ? 'ok' : 'warning'}`}>
            <div className="trace-event__kind">浏览器级验证</div>
            <div className="trace-event__detail">{report.browserVerification.status}</div>
            <div className="trace-event__meta">{report.browserVerification.summary}</div>
          </article>
        ) : null}
        {report.browserVerification?.checks.map((check) => (
          <article key={`browser-${check.id}`} className={`trace-event trace-event--${check.status === 'pass' ? 'ok' : 'warning'}`}>
            <div className="trace-event__kind">{check.label}</div>
            <div className="trace-event__detail">{check.status}</div>
            <div className="trace-event__meta">{check.detail}</div>
          </article>
        ))}
        {browserRunResult ? (
          <article className={`trace-event trace-event--${browserRunResult.report.status === 'ok' ? 'ok' : 'warning'}`}>
            <div className="trace-event__kind">Playwright 实跑</div>
            <div className="trace-event__detail">
              {browserRunResult.report.status} / {browserRunResult.report.title || 'untitled'}
            </div>
            <div className="trace-event__meta">{browserRunResult.report.target}</div>
            <div className="trace-event__artifact">report: {browserRunResult.outputPath}</div>
            <div className="trace-event__artifact">screenshot: {browserRunResult.report.screenshotPath}</div>
            {browserRunResult.report.navigationError ? (
              <div className="trace-event__artifact">error: {browserRunResult.report.navigationError}</div>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function OutboxPanel({ items }: { items: TaskSsotSyncEnvelope[] }) {
  const pending = items.filter((item) => item.status === 'pending').length;
  const failed = items.filter((item) => item.status === 'failed').length;
  const completed = items.filter((item) => item.status === 'completed').length;
  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>外部同步</h2>
      </div>
      <div className="trace-list">
        <article className={`trace-event trace-event--${failed > 0 ? 'warning' : 'ok'}`}>
          <div className="trace-event__kind">同步信封</div>
          <div className="trace-event__detail">
            total {items.length} / pending {pending} / failed {failed} / completed {completed}
          </div>
          <div className="trace-event__meta">先写本地真源，再排外部同步。</div>
        </article>
        {items.slice(0, 4).map((item) => (
          <article key={item.syncId} className={`trace-event trace-event--${item.status === 'failed' || item.status === 'dropped' ? 'warning' : 'ok'}`}>
            <div className="trace-event__kind">{item.status}</div>
            <div className="trace-event__detail">
              {item.targetSystem} / {item.action}
            </div>
            <div className="trace-event__meta">
              task {item.taskId} / retry {item.retryCount}/{item.maxRetries}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProofOfWorkPanel({
  bundle,
  schedulerRuns,
  schedulerBusy,
  workflowBusy,
  onRefresh,
  onTickDue,
  onTickRun,
  onScheduleResumeCurrent,
  onScheduleResumeRework,
  onApproveGate,
  onSendToRework,
  onExecuteHermesWriteback,
  onCloseHermesLoop,
}: {
  bundle: ProofOfWorkBundle | null;
  schedulerRuns: SchedulerRunsResponse | null;
  schedulerBusy: boolean;
  workflowBusy: boolean;
  onRefresh: () => void;
  onTickDue: () => void;
  onTickRun: (workflowRunId: string) => void;
  onScheduleResumeCurrent: (workflowRunId: string) => void;
  onScheduleResumeRework: (workflowRunId: string) => void;
  onApproveGate: () => void;
  onSendToRework: () => void;
  onExecuteHermesWriteback: (workflowRunId: string) => void;
  onCloseHermesLoop: (workflowRunId: string) => void;
}) {
  if (!bundle) {
    return (
      <section className="sidebar-section">
        <div className="section-header">
          <h2>交付证据包</h2>
        </div>
        <div className="inspector-empty">当前还没有交付证据包。</div>
      </section>
    );
  }

  const attentionActions = resolveOperatorEntryActions({
    entries: bundle.gateHistory.currentAttention.operatorEntries,
    schedulerRuns,
    schedulerBusy,
    workflowBusy,
    onRefresh,
    onTickDue,
    onTickRun,
    onScheduleResumeCurrent,
    onScheduleResumeRework,
    onApproveGate,
    onSendToRework,
    onExecuteHermesWriteback,
    onCloseHermesLoop,
  });

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>交付证据包</h2>
      </div>
      <div className="trace-list">
        <article className={`trace-event trace-event--${bundle.status === 'ready' ? 'ok' : 'warning'}`}>
          <div className="trace-event__kind">{bundle.status}</div>
          <div className="trace-event__detail">{bundle.summary}</div>
          <div className="trace-event__meta">
            task {bundle.taskId} / run {bundle.workflowRunId ?? '-'}
          </div>
        </article>
        <article className={`trace-event trace-event--${bundle.gateSummary.block > 0 ? 'warning' : 'ok'}`}>
          <div className="trace-event__kind">关卡摘要</div>
          <div className="trace-event__detail">
            pass {bundle.gateSummary.pass} / warn {bundle.gateSummary.warn} / block {bundle.gateSummary.block}
          </div>
          <div className="trace-event__meta">{bundle.finalState.summary}</div>
        </article>
        <article className={`trace-event trace-event--${bundle.gateHistory.blockedGates.length > 0 ? 'warning' : 'ok'}`}>
          <div className="trace-event__kind">关卡历史</div>
          <div className="trace-event__detail">
            total {bundle.gateHistory.total} / blocked gates {bundle.gateHistory.blockedGates.length}
          </div>
          <div className="trace-event__meta">
            最近 gate 动作和当前阻塞 gate 已并入 proof-of-work。
          </div>
        </article>
        {bundle.gateHistory.latestDecisionEvent ? (
          <article
            className={`trace-event trace-event--${bundle.gateHistory.latestDecisionEvent.toStatus === 'block' ? 'warning' : 'ok'}`}
          >
            <div className="trace-event__kind">最新判定</div>
            <div className="trace-event__detail">
              {bundle.gateHistory.latestDecisionEvent.gateId} / {bundle.gateHistory.latestDecisionEvent.toStatus}
            </div>
            <div className="trace-event__meta">{bundle.gateHistory.latestDecisionEvent.summary}</div>
            <div className="trace-event__artifact">
              actor: {bundle.gateHistory.latestDecisionEvent.actorRole} / recorded: {bundle.gateHistory.latestDecisionEvent.recordedAt}
            </div>
          </article>
        ) : null}
        {bundle.gateHistory.currentAttention.gateId ? (
          <article
            className={`trace-event trace-event--${bundle.gateHistory.currentAttention.status === 'block' ? 'warning' : bundle.gateHistory.currentAttention.status === 'warn' ? 'warning' : 'ok'}`}
          >
            <div className="trace-event__kind">当前关注点</div>
            <div className="trace-event__detail">
              {bundle.gateHistory.currentAttention.gateId} / {bundle.gateHistory.currentAttention.status ?? '-'}
            </div>
            <div className="trace-event__meta">{bundle.gateHistory.currentAttention.reason ?? '-'}</div>
            <div className="trace-event__artifact">
              actor: {bundle.gateHistory.currentAttention.actorRole ?? '-'} / next: {bundle.gateHistory.currentAttention.nextSafeStep ?? '-'}
            </div>
            <div className="trace-event__artifact">
              任务：{bundle.gateHistory.currentAttention.mainlineLabel ?? bundle.gateHistory.currentAttention.taskId} / 阶段：{bundle.gateHistory.currentAttention.stageId ?? '-'}
            </div>
            {bundle.gateHistory.currentAttention.resumeAnchor ? (
              <div className="trace-event__artifact">{bundle.gateHistory.currentAttention.resumeAnchor}</div>
            ) : null}
            {bundle.gateHistory.currentAttention.suggestedActions.map((action) => (
              <div key={`${bundle.gateHistory.currentAttention.gateId}-${action}`} className="trace-event__artifact">
                action: {action}
              </div>
            ))}
            {attentionActions.length > 0 ? (
              <div className="capability-inline-actions" style={{ marginTop: 8 }}>
                {attentionActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="secondary-button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ) : null}
        <article className={`trace-event trace-event--${bundle.review.decision === 'reject' ? 'warning' : 'ok'}`}>
          <div className="trace-event__kind">review / {bundle.review.decision}</div>
          <div className="trace-event__detail">{bundle.review.summary}</div>
          <div className="trace-event__meta">
            outbox total {bundle.outbox.total} / pending {bundle.outbox.pending} / failed {bundle.outbox.failed} / completed {bundle.outbox.completed}
          </div>
        </article>
        <article
          className={`trace-event trace-event--${
            bundle.acceptancePackage.verdict === 'accepted'
              ? 'ok'
              : bundle.acceptancePackage.verdict === 'conditional'
                ? 'pending'
                : 'warning'
          }`}
        >
          <div className="trace-event__kind">acceptance package / {bundle.acceptancePackage.verdict}</div>
          <div className="trace-event__detail">{bundle.acceptancePackage.summary}</div>
          <div className="trace-event__meta">
            handoff {bundle.acceptancePackage.handoff.mainlineLabel ?? '-'} / {bundle.acceptancePackage.handoff.currentStage ?? '-'}
          </div>
          {bundle.acceptancePackage.handoff.resumeAnchor ? (
            <div className="trace-event__artifact">{bundle.acceptancePackage.handoff.resumeAnchor}</div>
          ) : null}
          {bundle.acceptancePackage.handoff.nextSafeStep ? (
            <div className="trace-event__artifact">next: {bundle.acceptancePackage.handoff.nextSafeStep}</div>
          ) : null}
          {bundle.acceptancePackage.missingEvidence.map((item) => (
            <div key={`missing-${item}`} className="trace-event__artifact">
              missing: {item}
            </div>
          ))}
        </article>
        <article className={`trace-event trace-event--${bundle.ownership.approvalStatus === 'rejected' ? 'warning' : 'ok'}`}>
          <div className="trace-event__kind">责任归属</div>
          <div className="trace-event__detail">
            owner {bundle.ownership.ownerAgentId ?? '-'} / reviewers {bundle.ownership.reviewerAgentIds.length > 0 ? bundle.ownership.reviewerAgentIds.join(', ') : '-'}
          </div>
          <div className="trace-event__meta">
            approval {bundle.ownership.approvalStatus} / approver {bundle.ownership.approver ?? '-'}
          </div>
        </article>
      </div>
      <div className="trace-list">
        {bundle.acceptancePackage.requiredEvidence.map((evidence) => (
          <article
            key={evidence.id}
            className={`trace-event trace-event--${evidence.status === 'pass' ? 'ok' : evidence.status === 'warn' ? 'pending' : 'warning'}`}
          >
            <div className="trace-event__kind">acceptance evidence / {evidence.label}</div>
            <div className="trace-event__detail">{evidence.status}</div>
            <div className="trace-event__meta">{evidence.detail}</div>
            {evidence.evidencePaths.slice(0, 2).map((evidencePath) => (
              <div key={`${evidence.id}-${evidencePath}`} className="trace-event__artifact">
                {evidencePath}
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="trace-list">
        {bundle.artifactPaths.slice(0, 6).map((artifactPath) => (
          <article key={artifactPath} className="trace-event trace-event--ok">
            <div className="trace-event__kind">artifact</div>
            <div className="trace-event__artifact">
              <a href={buildFileApiUrl(artifactPath)} target="_blank" rel="noreferrer">
                open artifact
              </a>
              {' / '}
              {artifactPath}
            </div>
          </article>
        ))}
      </div>
      {bundle.gateHistory.recentEvents.length > 0 ? (
        <div className="trace-list">
          {bundle.gateHistory.recentEvents.map((event) => (
            <article
              key={event.id}
              className={`trace-event trace-event--${event.toStatus === 'block' ? 'warning' : 'ok'}`}
            >
              <div className="trace-event__kind">{event.gateId}</div>
              <div className="trace-event__detail">
                {event.action}
                {event.stageId ? ` / ${event.stageId}` : ''}
              </div>
              <div className="trace-event__meta">
                {event.summary}
                {' / '}
                {event.fromStatus ?? '-'} -&gt; {event.toStatus ?? '-'}
              </div>
              <div className="trace-event__artifact">
                actor: {event.actorRole} / recorded: {event.recordedAt}
              </div>
              {event.artifactRefs.slice(0, 2).map((artifactRef) => (
                <div key={`${event.id}-artifact-${artifactRef}`} className="trace-event__artifact">
                  artifact: {artifactRef}
                </div>
              ))}
              {event.evidenceRefs.slice(0, 2).map((evidenceRef) => (
                <div key={`${event.id}-evidence-${evidenceRef}`} className="trace-event__artifact">
                  evidence: {evidenceRef}
                </div>
              ))}
            </article>
          ))}
        </div>
      ) : null}
      {bundle.gateHistory.blockedGates.length > 0 ? (
        <div className="trace-list">
          {bundle.gateHistory.blockedGates.map((gate) => (
            <article key={`${gate.taskId}-${gate.gateId}`} className="trace-event trace-event--warning">
              <div className="trace-event__kind">阻塞关卡</div>
              <div className="trace-event__detail">{gate.gateId}</div>
              <div className="trace-event__meta">{gate.reason}</div>
            </article>
          ))}
        </div>
      ) : null}
      {bundle.outbox.receiptRefs.length > 0 ? (
        <div className="trace-list">
          {bundle.outbox.receiptRefs.slice(0, 4).map((receiptRef) => (
            <article key={receiptRef} className="trace-event trace-event--ok">
              <div className="trace-event__kind">receipt</div>
              <div className="trace-event__artifact">{receiptRef}</div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ExecutionChecklistPanel({ summary }: { summary: ExecutionChecklistSummary | null }) {
  if (!summary) {
    return (
      <section className="sidebar-section">
        <div className="section-header">
          <h2>版本进度</h2>
        </div>
        <div className="inspector-empty">当前还没有执行清单摘要。</div>
      </section>
    );
  }

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>版本进度</h2>
      </div>
      <div className="trace-list">
        {summary.versions.map((version) => (
          <article key={version.id} className="trace-event trace-event--ok">
            <div className="trace-event__kind">{version.label}</div>
            <div className="trace-event__detail">
              分母 {version.totalTrackedItems} / 已解 {version.solved} / 部分 {version.partial}
            </div>
            <div className="trace-event__meta">
              carry-over {version.carryOver} / 未落位 {version.missingPlacement}
            </div>
          </article>
        ))}
      </div>
      <div className="trace-list">
        {summary.userBackchecks.map((item) => (
          <article
            key={item.id}
            className={`trace-event trace-event--${item.status === 'solved' ? 'ok' : item.status === 'partial' ? 'warning' : 'pending'}`}
          >
            <div className="trace-event__kind">用户回查</div>
            <div className="trace-event__detail">
              {item.label} / {item.status}
            </div>
            <div className="trace-event__meta">{item.detail}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DailyDigestPanel({ items }: { items: DailyDigestEntry[] }) {
  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>每日蒸馏</h2>
      </div>
      <div className="trace-list">
        {items.length === 0 ? (
          <div className="inspector-empty">当前还没有每日蒸馏文件。</div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="trace-event trace-event--ok">
              <div className="trace-event__kind">digest</div>
              <div className="trace-event__detail">
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              </div>
              <div className="trace-event__meta">{item.path}</div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ProjectEntryPanel({ items }: { items: ProjectEntrySummary[] }) {
  const kindLabelMap: Record<ProjectLinkedSourceKind, string> = {
    'repo-entry': '项目入口',
    governance: '治理依据',
    'ai-facing': 'AI 依据',
  };
  const rolloutAssets: ProjectEntryAsset['name'][] = [
    'project-board.svg',
    'roadmap-board.svg',
    'decision-board.svg',
    'change-log.md',
  ];
  const fullyCoveredProjects = items.filter((item) => item.missingAssets.length === 0).length;
  const rolloutCounts = rolloutAssets.map((assetName) => ({
    name: assetName,
    present: items.filter((item) => item.assets.some((asset) => asset.name === assetName)).length,
  }));

  return (
    <section className="sidebar-section">
      <div className="section-header">
        <h2>项目入口</h2>
      </div>
      <div className="trace-event trace-event--ok" style={{ marginBottom: 10 }}>
        <div className="trace-event__kind">coverage</div>
        <div className="trace-event__detail">
          已补齐标准入口的项目：{fullyCoveredProjects}/{items.length}
        </div>
        <div className="trace-event__meta">标准集：project-board / roadmap-board / decision-board / change-log</div>
      </div>
      <div className="trace-list" style={{ marginBottom: 10 }}>
        {rolloutCounts.map((item) => (
          <article key={item.name} className="trace-event trace-event--ok">
            <div className="trace-event__kind">{item.name}</div>
            <div className="trace-event__detail">
              {item.present}/{items.length || 0}
            </div>
          </article>
        ))}
      </div>
      <div className="trace-list">
        {items.length === 0 ? (
          <div className="inspector-empty">当前还没有发现标准项目入口资产。</div>
        ) : (
          items.map((item) => (
            <article key={item.subprojectId} className="trace-event trace-event--ok">
              <div className="trace-event__kind">{item.subprojectId}</div>
              <div className="trace-event__detail">
                已发现 {item.assetCount}/{item.expectedAssetCount} 个入口资产，{item.linkedSourceCount} 个回钻入口
              </div>
              <div className="inspector-path-list">
                {item.assets.map((asset) => (
                  <a
                    key={`${item.subprojectId}-${asset.name}`}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inspector-path-chip"
                  >
                    {asset.name}
                  </a>
                ))}
              </div>
              {item.linkedSources.length > 0 ? (
                <div className="inspector-path-list" style={{ marginTop: 8 }}>
                  {item.linkedSources.map((source) => (
                    <a
                      key={`${item.subprojectId}-${source.path}`}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inspector-path-chip"
                      title={source.path}
                    >
                      {kindLabelMap[source.kind]} / {source.name}
                    </a>
                  ))}
                </div>
              ) : null}
              {item.missingAssets.length > 0 ? (
                <div className="trace-event__meta">缺失：{item.missingAssets.join(' / ')}</div>
              ) : (
                <div className="trace-event__meta">标准入口已补齐</div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function MonitoringOverviewPanel({
  run,
  metrics,
  review,
  observability,
}: {
  run: WorkflowRun | null;
  metrics: WorkflowMetrics | null;
  review: CommitteeReport | null;
  observability: ExecutionObservability | null;
}) {
  const activeStage = run?.stages.find((stage) => stage.id === run.currentStageId) ?? null;
  const cards = [
    {
      id: 'run',
      label: '运行状态',
      value: run?.status ?? '无运行',
      detail: activeStage?.label ?? run?.currentStageId ?? '暂无 active stage',
    },
    {
      id: 'completion',
      label: '阶段完成',
      value: metrics ? `${metrics.completedStages}/${metrics.totalStages}` : '0/0',
      detail: metrics ? `${Math.round(metrics.completionRate * 100)}% 完成率` : '暂无 workflow metrics',
    },
    {
      id: 'review',
      label: '评审门禁',
      value: review?.gate.decision ?? '未评审',
      detail: review ? `${review.gate.issueCount} 个问题 / blocked=${String(review.gate.blocked)}` : '暂无 review gate',
    },
    {
      id: 'trace',
      label: '执行追踪',
      value: observability ? `${observability.timeline.length}` : '0',
      detail: observability
        ? `${observability.summary.executionEventCount} execution / ${observability.summary.workflowEventCount} workflow`
        : '暂无 observability',
    },
  ];

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>运行总览</h3>
      </div>
      <div className="workspace-summary-grid workspace-summary-grid--compact">
        {cards.map((card) => (
          <article key={card.id} className="metric-tile">
            <span className="metric-tile__label">{card.label}</span>
            <strong>{card.value}</strong>
            <span>{card.detail}</span>
          </article>
        ))}
      </div>
      {run?.executionSummary ? (
        <article className="trace-event trace-event--ok">
          <div className="trace-event__kind">execution summary</div>
          <div className="trace-event__detail">{run.executionSummary}</div>
          <div className="trace-event__meta">{run.updatedAt ? new Date(run.updatedAt).toLocaleString('zh-CN') : '-'}</div>
        </article>
      ) : null}
    </section>
  );
}

async function listPortfolio() {
  return fetchJson<PortfolioEntry[]>('/api/portfolio');
}

async function listChats(subprojectId: string | null) {
  return fetchJson<{ items: ChatSession[] }>(buildScopedUrl('/api/chats', subprojectId));
}

async function createChat(input: { title?: string; subprojectId?: string | null }) {
  return fetchJson<ChatSession>('/api/chats', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function listMessages(sessionId: string, subprojectId: string | null) {
  return fetchJson<{ items: ChatMessage[] }>(buildScopedUrl(`/api/chats/${sessionId}/messages`, subprojectId));
}

async function createMessage(
  sessionId: string,
  input: { content: string; subprojectId?: string | null; parentMessageId?: string | null },
) {
  return fetchJson<ChatMessage>(`/api/chats/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function respondToChat(sessionId: string, input: { subprojectId?: string | null; messageId?: string | null }) {
  return fetchJson<ChatRespondResult>(`/api/chats/${sessionId}/respond`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function listRuns(sessionId: string, subprojectId: string | null) {
  return fetchJson<{ items: ExecutionRun[] }>(buildScopedUrl(`/api/chats/${sessionId}/runs`, subprojectId));
}

async function loadContextSnapshot(snapshotId: string, subprojectId: string | null) {
  return fetchJson<ContextSnapshot>(buildScopedUrl(`/api/chat-snapshots/${snapshotId}`, subprojectId));
}

async function loadRun(runId: string, subprojectId: string | null) {
  return fetchJson<ExecutionRun>(buildScopedUrl(`/api/chat-runs/${runId}`, subprojectId));
}

async function listRunEvents(runId: string, subprojectId: string | null) {
  return fetchJson<{ items: ExecutionEvent[] }>(buildScopedUrl(`/api/chat-runs/${runId}/events`, subprojectId));
}

async function loadRunObservability(runId: string, subprojectId: string | null) {
  return fetchJson<ExecutionObservability>(buildScopedUrl(`/api/chat-runs/${runId}/observability`, subprojectId));
}

async function loadRunReview(runId: string, subprojectId: string | null) {
  return fetchJson<CommitteeReport>(buildScopedUrl(`/api/runs/${runId}/review`, subprojectId));
}

async function loadJsonFile<T>(filePath: string) {
  return fetchJson<T>(`/api/files/${filePath}`);
}

async function listProductAgents(subprojectId: string | null) {
  return fetchJson<{ items: ProductAgent[] }>(buildScopedUrl('/api/product-agents', subprojectId));
}

async function listProductAgentBlueprints() {
  return fetchJson<{ items: ProductAgentBlueprintSummary[] }>('/api/product-agent-blueprints');
}

async function loadProductSkills(subprojectId: string | null) {
  return fetchJson<ProductSkillSurface>(buildScopedUrl('/api/skills', subprojectId));
}

async function loadCodexLocalState(subprojectId: string | null) {
  return fetchJson<CodexLocalStateSnapshot>(buildScopedUrl('/api/codex/local-state', subprojectId));
}

async function loadConnectorStatus(subprojectId: string | null) {
  return fetchJson<ExternalConnectorStatus>(buildScopedUrl('/api/connectors/status', subprojectId));
}

async function fetchWebConnector(input: { subprojectId?: string | null; url: string }) {
  return fetchJson<WebFetchArtifact>('/api/connectors/web-fetch', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function inspectFigmaConnector(input: { fileKey: string }) {
  return fetchJson<FigmaInspection>('/api/connectors/figma/files/inspect', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function importDingTalkMeetingConnector(input: { subprojectId?: string | null; title?: string; content: string }) {
  return fetchJson<DingTalkMeetingImportResult>('/api/connectors/dingtalk/meeting-notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function listDatakiKnowledgeBases(input: { subprojectId?: string | null; baseUrl?: string; apiKey?: string; userId?: string; agentId?: string }) {
  return fetchJson<{ items: DatakiKnowledgeBaseSummary[] }>('/api/connectors/dataki/knowledge-bases/list', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function listDatakiKnowledgeFiles(input: {
  knowledgeBaseId: string;
  subprojectId?: string | null;
  baseUrl?: string;
  apiKey?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  return fetchJson<{ items: DatakiKnowledgeFileSummary[] }>(`/api/connectors/dataki/knowledge-bases/${encodeURIComponent(input.knowledgeBaseId)}/knowledge/list`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function searchDatakiKnowledge(input: {
  query: string;
  knowledgeBaseId?: string;
  knowledgeBaseIds?: string[];
  subprojectId?: string | null;
  baseUrl?: string;
  apiKey?: string;
}) {
  return fetchJson<{ items: DatakiKnowledgeSearchItem[] }>('/api/connectors/dataki/knowledge-search', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function bootstrapProductAgentHierarchy(subprojectId: string | null) {
  return fetchJson<{ items: ProductAgent[] }>('/api/product-agent-blueprints/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ subprojectId }),
  });
}

async function listProductChiefReports(subprojectId: string | null) {
  return fetchJson<{ items: ProductChiefReport[] }>(buildScopedUrl('/api/product-chief/reports', subprojectId));
}

async function listProductChiefOutputs(subprojectId: string | null) {
  return fetchJson<{ items: ProductChiefOutput[] }>(buildScopedUrl('/api/product-chief/outputs', subprojectId));
}

async function listProductChiefImageBatches(subprojectId: string | null) {
  return fetchJson<{ items: ProductChiefImageBatch[] }>(buildScopedUrl('/api/product-chief/image-batches', subprojectId));
}

async function listProductChiefMultiAgentReviews(subprojectId: string | null) {
  return fetchJson<{ items: ProductChiefMultiAgentReview[] }>(buildScopedUrl('/api/product-chief/multi-agent-reviews', subprojectId));
}

async function listMultiPmGroupSessions(subprojectId: string | null) {
  return fetchJson<MultiPmGroupSessionsResponse>(buildScopedUrl('/api/product-chief/group-sessions', subprojectId));
}

async function analyzeProductChief(input: { subprojectId?: string | null; brief: string }) {
  return fetchJson<ProductChiefReport>('/api/product-chief/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function generateProductChiefOutput(reportId: string, input: { subprojectId?: string | null; type?: string | null }) {
  return fetchJson<ProductChiefOutput>(`/api/product-chief/reports/${reportId}/outputs`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function listCapabilities(subprojectId: string | null) {
  return fetchJson<{ items: CapabilityDefinition[] }>(buildScopedUrl('/api/capabilities', subprojectId));
}

async function listEvaluationDatasets(subprojectId: string | null) {
  return fetchJson<{ items: EvaluationDataset[] }>(buildScopedUrl('/api/evaluation-datasets', subprojectId));
}

async function listEvaluationRuns(subprojectId: string | null) {
  return fetchJson<{ items: EvaluationRun[] }>(buildScopedUrl('/api/evaluation-runs', subprojectId));
}

async function loadEvaluationHistory(
  subprojectId: string | null,
  filters: { capabilityId?: string | null; version?: string | null; requirementId?: string | null; versionEntryId?: string | null } = {},
) {
  const params = new URLSearchParams();
  if (subprojectId) {
    params.set('subprojectId', subprojectId);
  }
  if (filters.capabilityId) {
    params.set('capabilityId', filters.capabilityId);
  }
  if (filters.version) {
    params.set('version', filters.version);
  }
  if (filters.requirementId) {
    params.set('requirementId', filters.requirementId);
  }
  if (filters.versionEntryId) {
    params.set('versionEntryId', filters.versionEntryId);
  }
  const query = params.toString();
  return fetchJson<EvaluationHistory>(`/api/evaluation-history${query ? `?${query}` : ''}`);
}

async function createCapability(input: {
  subprojectId?: string | null;
  id?: string;
  name: string;
  description: string;
  implementationType: 'product-agent' | 'workflow';
  implementationRef: string;
  version?: string;
  visibility?: 'private' | 'internal' | 'public';
  permissions?: string[];
  tags?: string[];
  acceptanceCriteria?: string[];
  requirementIds?: string[];
  runId?: string | null;
}) {
  return fetchJson<CapabilityDefinition>('/api/capabilities', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function createCapabilityDataset(
  capabilityId: string,
  input: {
    subprojectId?: string | null;
    version: string;
    name: string;
    description: string;
    cases: Array<{ id: string; input: unknown; expected: unknown; rubric: string[] }>;
  },
) {
  return fetchJson<EvaluationDataset>(`/api/capabilities/${capabilityId}/evaluation-datasets`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function runCapabilityEvaluation(
  capabilityId: string,
  input: { subprojectId?: string | null; datasetId: string; version: string; evaluator: string; requirementIds?: string[] },
) {
  return fetchJson<{ capability: CapabilityDefinition; dataset: EvaluationDataset; run: EvaluationRun }>(
    `/api/capabilities/${capabilityId}/evaluation-runs`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

async function publishCapability(
  capabilityId: string,
  input: {
    subprojectId?: string | null;
    version: string;
    testsPassed?: boolean;
    reviewPassed?: boolean;
    releaseNotes?: string | null;
    reviewSummary?: string | null;
    requirementIds?: string[];
    runId?: string | null;
  },
) {
  return fetchJson<CapabilityDefinition>(`/api/capabilities/${capabilityId}/publish`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function invokeCapability(
  capabilityId: string,
  input: {
    subprojectId?: string | null;
    version?: string | null;
    payload?: Record<string, unknown>;
    requirementIds?: string[];
    runId?: string | null;
  },
) {
  return fetchJson<{ status: string; output: unknown }>(`/api/capabilities/${capabilityId}/invoke`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function listRequirements(subprojectId: string | null) {
  return fetchJson<{ items: Requirement[] }>(buildScopedUrl('/api/requirements', subprojectId));
}

async function listProviderRouting(subprojectId: string | null) {
  return fetchJson<{ items: ProviderRoutingSnapshot[] }>(buildScopedUrl('/api/providers/routing', subprojectId));
}

async function setPrimaryProvider(providerName: string, subprojectId: string | null) {
  return fetchJson<{ providerName: string }>('/api/providers/primary', {
    method: 'POST',
    body: JSON.stringify({
      providerName,
      subprojectId,
    }),
  });
}

async function adjustProviderPriority(providerName: string, delta: number, subprojectId: string | null) {
  return fetchJson<{ name: string; priority: number }>(`/api/providers/${encodeURIComponent(providerName)}/priority`, {
    method: 'POST',
    body: JSON.stringify({
      delta,
      subprojectId,
    }),
  });
}

async function listVersions(subprojectId: string | null) {
  return fetchJson<{ items: VersionEntry[] }>(buildScopedUrl('/api/versions', subprojectId));
}

async function loadMcpContextMode() {
  return fetchJson<CollaborationModeState>('/api/mcp-context/mode');
}

async function loadMcpContextModeHistory() {
  return fetchJson<{ items: CollaborationModeEntry[] }>('/api/mcp-context/mode-history');
}

async function loadMcpContextTasks() {
  return fetchJson<{ tasks: SharedTask[]; total: number }>('/api/mcp-context/tasks?status=in_progress');
}

async function loadMcpContextCheckpoints() {
  return fetchJson<{ items: SharedCheckpoint[] }>('/api/mcp-context/checkpoints');
}

async function loadMcpContextEvents() {
  return fetchJson<{ items: SharedEvent[] }>('/api/mcp-context/events?count=12');
}

async function loadTaskSsotState(subprojectId: string | null) {
  return fetchJson<TaskSsotStateResponse>(buildScopedUrl('/api/task-ssot/state', subprojectId));
}

async function loadSchedulerRuns(subprojectId: string | null) {
  return fetchJson<SchedulerRunsResponse>(buildScopedUrl('/api/scheduler/runs', subprojectId));
}

async function tickDueSchedulerRuns(subprojectId: string | null) {
  return fetchJson<{ items: SchedulerRun[]; total: number }>(buildScopedUrl('/api/scheduler/runs/tick-due', subprojectId), {
    method: 'POST',
    body: JSON.stringify({ subprojectId }),
  });
}

async function tickSchedulerRun(workflowRunId: string, subprojectId: string | null) {
  return fetchJson<SchedulerRun>(buildScopedUrl(`/api/scheduler/runs/${workflowRunId}/tick`, subprojectId), {
    method: 'POST',
    body: JSON.stringify({ subprojectId }),
  });
}

async function scheduleSchedulerRun(
  workflowRunId: string,
  input: {
    subprojectId: string | null;
    action: 'advance' | 'resume-current-stage' | 'resume-rework-stage';
    cooldownUntil?: string | null;
    reason?: string | null;
  },
) {
  return fetchJson<SchedulerRun>(buildScopedUrl(`/api/scheduler/runs/${workflowRunId}/schedule`, input.subprojectId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function loadOutboxEnvelopes(subprojectId: string | null) {
  return fetchJson<OutboxResponse>(buildScopedUrl('/api/outbox/envelopes', subprojectId));
}

async function loadFinalStateValidation(taskId: string, subprojectId: string | null) {
  return fetchJson<FinalStateValidationReport>(buildScopedUrl(`/api/task-ssot/tasks/${taskId}/final-state-validation`, subprojectId));
}

type LiveBrowserVerificationRun = {
  taskId: string;
  outputPath: string;
  stdout: string | null;
  stderr: string | null;
  report: {
    kind: string;
    target: string;
    startedAt: string;
    finishedAt: string;
    status: string;
    navigationError: string | null;
    title: string;
    screenshotPath: string;
    metrics: Record<string, number>;
    evidence: {
      visibleTextSample: string;
    };
  };
};

async function runTaskFrontendBrowserVerification(taskId: string, subprojectId: string | null) {
  return fetchJson<LiveBrowserVerificationRun>(
    buildScopedUrl(`/api/task-ssot/tasks/${taskId}/frontend-browser-verification/run`, subprojectId),
    {
      method: 'POST',
      body: JSON.stringify({ subprojectId }),
    },
  );
}

async function loadExecutionChecklistSummary() {
  return fetchJson<ExecutionChecklistSummary>('/api/ops/execution-checklist-summary');
}

async function loadDailyDigests() {
  return fetchJson<{ items: DailyDigestEntry[] }>('/api/ops/daily-digests');
}

async function loadProjectEntries() {
  return fetchJson<{ items: ProjectEntrySummary[] }>('/api/human-reading/project-entries');
}

async function setMcpContextMode(mode: CollaborationModeName) {
  return fetchJson<CollaborationModeState>('/api/mcp-context/mode', {
    method: 'POST',
    body: JSON.stringify({
      mode,
      toolIdentity: 'other',
      label: `workspace switch to ${mode}`,
    }),
  });
}

async function createRequirement(input: {
  subprojectId?: string | null;
  title: string;
  description: string;
  category?: 'feature' | 'bug' | 'architecture';
  priority?: 'P0' | 'P1' | 'P2';
}) {
  return fetchJson<Requirement>('/api/requirements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function updateRequirement(
  requirementId: string,
  input: {
    subprojectId?: string | null;
    status?: 'draft' | 'active' | 'done' | 'archived';
    priority?: 'P0' | 'P1' | 'P2';
  },
) {
  return fetchJson<Requirement>(`/api/requirements/${requirementId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

async function batchUpdateRequirements(input: {
  requirementIds: string[];
  subprojectId?: string | null;
  status?: 'draft' | 'active' | 'done' | 'archived';
  priority?: 'P0' | 'P1' | 'P2';
}) {
  return fetchJson<{ items: Requirement[] }>('/api/requirements/batch', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function ingestChatRequirement(input: { sessionId: string; messageId?: string | null; subprojectId?: string | null }) {
  return fetchJson<Requirement>('/api/requirements/ingest-chat', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function loadWorkflowRun(subprojectId: string | null) {
  return fetchJson<WorkflowRun>(buildScopedUrl('/api/workflow', subprojectId));
}

async function loadWorkflowMetrics(subprojectId: string | null) {
  return fetchJson<WorkflowMetrics>(buildScopedUrl('/api/workflow-metrics', subprojectId));
}

async function loadWorkflowReview(subprojectId: string | null) {
  return fetchJson<CommitteeReport>(buildScopedUrl('/api/review', subprojectId));
}

async function loadHermesPolicy(runId: string, subprojectId: string | null) {
  return fetchJson<HermesPolicyReport>(buildScopedUrl(`/api/runs/${runId}/hermes-policy`, subprojectId));
}

async function loadV07RuntimeGovernance(subprojectId: string | null) {
  return fetchJson<V07RuntimeGovernanceSnapshot>(buildScopedUrl('/api/v0.7/runtime-governance', subprojectId));
}

async function promoteRepeatCorrectionCandidate(candidateId: string, subprojectId: string | null) {
  return fetchJson<Requirement>(`/api/v0.7/runtime-governance/repeat-corrections/${encodeURIComponent(candidateId)}/promote`, {
    method: 'POST',
    body: JSON.stringify({ subprojectId }),
  });
}

async function advanceWorkflowRun(runId: string, subprojectId: string | null) {
  return fetchJson<WorkflowRun>(buildScopedUrl(`/api/runs/${runId}/advance`, subprojectId), {
    method: 'POST',
    body: JSON.stringify({ subprojectId }),
  });
}

async function runWorkflowUntilBlocked(runId: string, subprojectId: string | null) {
  return fetchJson<WorkflowRun>(buildScopedUrl(`/api/runs/${runId}/run-until-blocked`, subprojectId), {
    method: 'POST',
    body: JSON.stringify({ subprojectId }),
  });
}

async function resumeWorkflowRun(runId: string, input: { subprojectId?: string | null; targetStageId?: string | null; reason?: string }) {
  return fetchJson<WorkflowRun>(`/api/runs/${runId}/resume`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function applyWorkflowGate(
  runId: string,
  input: {
    subprojectId?: string | null;
    decision: 'approve' | 'rework';
    summary: string;
    targetStageId?: string | null;
  },
) {
  return fetchJson<WorkflowRun>(`/api/runs/${runId}/manual-gate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function rollbackCapability(
  capabilityId: string,
  input: {
    subprojectId?: string | null;
    version: string;
    requirementIds?: string[];
    runId?: string | null;
    summary?: string | null;
  },
) {
  return fetchJson<CapabilityDefinition>(`/api/capabilities/${capabilityId}/rollback`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function loadDagGraph(subprojectId: string | null) {
  return fetchJson<DAGGraph>(buildScopedUrl('/api/dag/graph', subprojectId));
}

async function listDagRuns(subprojectId: string | null) {
  return fetchJson<{ items: DAGRun[] }>(buildScopedUrl('/api/dag/runs', subprojectId));
}

async function listDagChanges(subprojectId: string | null) {
  return fetchJson<{ items: DAGChangeEvent[] }>(buildScopedUrl('/api/dag/changes', subprojectId));
}

async function registerDagChange(input: {
  subprojectId?: string | null;
  runId: string;
  nodeId: string;
  changeType: 'requirement' | 'design' | 'ui' | 'backend' | 'doc' | 'dependency';
  previousVersion?: string | null;
  newVersion?: string | null;
  triggeredBy?: 'user' | 'agent' | 'system' | 'webhook';
}) {
  return fetchJson<{ graph: DAGGraph; dagRun: DAGRun; event: DAGChangeEvent }>('/api/dag/changes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function rerunDagRun(
  dagRunId: string,
  input: {
    subprojectId?: string | null;
    workflowRunId?: string | null;
    reason?: string | null;
    runUntilBlocked?: boolean;
  },
) {
  return fetchJson<{ graph: DAGGraph; dagRun: DAGRun; workflowRun: WorkflowRun; rerunStageIds: string[] }>(
    `/api/dag/runs/${dagRunId}/rerun`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

async function loadRetrievalGovernance(subprojectId: string | null) {
  return fetchJson<RetrievalGovernance>(buildScopedUrl('/api/retrieval/governance', subprojectId));
}

async function updateRetrievalGovernance(input: Partial<RetrievalGovernance> & { subprojectId?: string | null }) {
  return fetchJson<RetrievalGovernance>('/api/retrieval/governance', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

async function indexRetrievalGovernance(subprojectId: string | null) {
  return fetchJson<RetrievalGovernance>('/api/retrieval/governance/index', {
    method: 'POST',
    body: JSON.stringify({ subprojectId }),
  });
}

async function searchRetrievalGovernance(subprojectId: string | null, query: string) {
  return fetchJson<RetrievalSearchResponse>('/api/retrieval/governance/search', {
    method: 'POST',
    body: JSON.stringify({ subprojectId, query }),
  });
}

function ContextInspector({
  snapshot,
  fallbackSnapshotId,
}: {
  snapshot: ContextSnapshot | null;
  fallbackSnapshotId: string | null;
}) {
  const truthSources = snapshot?.truthSourceRefs ?? [];
  const contextDocs = snapshot?.contextDocRefs ?? [];
  const workflowRuns = snapshot?.workflowRunRefs ?? [];
  const workflowEvents = snapshot?.workflowEventRefs ?? [];

  if (!snapshot && !fallbackSnapshotId) {
    return (
      <section className="inspector-panel">
        <h3>Context</h3>
        <div className="inspector-empty">还没有上下文快照。</div>
      </section>
    );
  }

  return (
    <section className="inspector-panel">
      <h3>Context</h3>
      <div className="inspector-field">
        <span>Snapshot ID</span>
        <strong>{snapshot?.id ?? fallbackSnapshotId}</strong>
      </div>
      <div className="inspector-field">
        <span>Subproject</span>
        <strong>{snapshot?.subprojectId ?? 'platform'}</strong>
      </div>
      <div className="inspector-field">
        <span>Inherited From</span>
        <strong>{snapshot?.inheritsFromSnapshotId ?? '-'}</strong>
      </div>
      <div className="inspector-field">
        <span>Permissions</span>
        <strong>{snapshot?.permissions.join(', ') ?? '-'}</strong>
      </div>
      <div className="inspector-field">
        <span>Context Summary</span>
        <strong>{snapshot?.contextSummary ?? '-'}</strong>
      </div>
      <div className="inspector-field">
        <span>Messages</span>
        <strong>{snapshot?.messageIdsIncluded.length ?? 0}</strong>
      </div>
      <div className="inspector-field">
        <span>Platform Memory</span>
        <strong>{snapshot?.platformMemoryRefs.length ?? 0}</strong>
      </div>
      <div className="inspector-field">
        <span>Subproject Memory</span>
        <strong>{snapshot?.subprojectMemoryRefs.length ?? 0}</strong>
      </div>
      <div className="inspector-field">
        <span>Truth Source</span>
        <strong>{truthSources.length}</strong>
      </div>
      {truthSources.length > 0 ? (
        <div className="inspector-path-list">
          {truthSources.map((path) => (
            <code key={path} className="inspector-path-chip">{path}</code>
          ))}
        </div>
      ) : null}
      <div className="inspector-field">
        <span>Context Docs</span>
        <strong>{contextDocs.length}</strong>
      </div>
      {contextDocs.length > 0 ? (
        <div className="inspector-path-list">
          {contextDocs.map((path) => (
            <code key={path} className="inspector-path-chip">{path}</code>
          ))}
        </div>
      ) : null}
      <div className="inspector-field">
        <span>Artifacts</span>
        <strong>{snapshot?.artifactRefs.length ?? 0}</strong>
      </div>
      <div className="inspector-field">
        <span>Workflow Runs</span>
        <strong>{workflowRuns.length}</strong>
      </div>
      {workflowRuns.length > 0 ? (
        <div className="inspector-path-list">
          {workflowRuns.map((runId) => (
            <code key={runId} className="inspector-path-chip">{runId}</code>
          ))}
        </div>
      ) : null}
      <div className="inspector-field">
        <span>Workflow Events</span>
        <strong>{workflowEvents.length}</strong>
      </div>
      {workflowEvents.length > 0 ? (
        <div className="inspector-path-list">
          {workflowEvents.map((eventRef) => (
            <code key={eventRef} className="inspector-path-chip">{eventRef}</code>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RunTracePanel({ run, events }: { run: ExecutionRun | null; events: ExecutionEvent[] }) {
  if (!run) {
    return (
      <section className="inspector-panel">
        <h3>Run Trace</h3>
        <div className="inspector-empty">选择一条带 run 的消息后可查看执行链路。</div>
      </section>
    );
  }

  const resolvedProviderEvent = [...events].reverse().find((event) => {
    if (event.kind !== 'provider_succeeded' && event.kind !== 'provider_failed') {
      return false;
    }

    return event.metadata?.finalResolution === true && typeof event.metadata?.providerName === 'string';
  });
  const resolvedProviderLabel = resolvedProviderEvent
    ? `${String(resolvedProviderEvent.metadata.providerName)} / ${String(resolvedProviderEvent.metadata.model ?? 'unknown-model')}`
    : '-';
  const resolvedProviderMode = resolvedProviderEvent
    ? String(resolvedProviderEvent.metadata.usedFallbackReply ? 'fallback reply' : 'direct provider reply')
    : null;

  return (
    <section className="inspector-panel">
      <h3>Run Trace</h3>
      <div className="inspector-field">
        <span>Run ID</span>
        <strong>{run.id}</strong>
      </div>
      <div className="inspector-field">
        <span>Type</span>
        <strong>{run.runType}</strong>
      </div>
      <div className="inspector-field">
        <span>Status</span>
        <strong>{run.status}</strong>
      </div>
      <div className="inspector-field">
        <span>Source</span>
        <strong>{run.source}</strong>
      </div>
      <div className="inspector-field">
        <span>Input Message</span>
        <strong>{run.inputMessageId ?? '-'}</strong>
      </div>
      <div className="inspector-field">
        <span>Outputs</span>
        <strong>{run.outputMessageIds.length}</strong>
      </div>
      <div className="inspector-field">
        <span>Context Snapshot</span>
        <strong>{run.contextSnapshotId}</strong>
      </div>
      <div className="inspector-field">
        <span>Workflow Run</span>
        <strong>{run.workflowRunId ?? '-'}</strong>
      </div>
      <div className="inspector-field">
        <span>Linked Workflow Runs</span>
        <strong>{run.linkedWorkflowRunIds.length}</strong>
      </div>
      <div className="inspector-field">
        <span>Resolved Model</span>
        <strong>{resolvedProviderLabel}</strong>
      </div>
      {resolvedProviderMode ? (
        <div className="inspector-field">
          <span>Resolution Mode</span>
          <strong>{resolvedProviderMode}</strong>
        </div>
      ) : null}
      {run.linkedWorkflowRunIds.length > 0 ? (
        <div className="inspector-path-list">
          {run.linkedWorkflowRunIds.map((runId) => (
            <code key={runId} className="inspector-path-chip">{runId}</code>
          ))}
        </div>
      ) : null}
      <div className="trace-list">
        {events.length === 0 ? (
          <div className="inspector-empty">暂无事件。</div>
        ) : (
          events.map((event) => (
            <article key={event.id} className={`trace-event trace-event--${event.status}`}>
              <div className="trace-event__kind">{event.kind}</div>
              <div className="trace-event__detail">{event.detail}</div>
              {event.artifactPath ? <div className="trace-event__artifact">artifact: {event.artifactPath}</div> : null}
              {event.workflowRunId ? <div className="trace-event__artifact">workflow run: {event.workflowRunId}</div> : null}
              {Object.keys(event.metadata ?? {}).length > 0 ? (
                <div className="trace-event__artifact">metadata: {JSON.stringify(event.metadata)}</div>
              ) : null}
              <div className="trace-event__meta">{new Date(event.timestamp).toLocaleString('zh-CN')}</div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ArtifactPreview({ artifact }: { artifact: MultimodalArtifact | null }) {
  if (!artifact) {
    return (
      <section className="inspector-panel">
        <h3>Artifact Preview</h3>
        <div className="inspector-empty">选择包含产物的 run 后可查看结构化结果。</div>
      </section>
    );
  }

  return (
    <section className="inspector-panel">
      <h3>Artifact Preview</h3>
      <div className="inspector-field">
        <span>Type</span>
        <strong>{artifact.type}</strong>
      </div>
      <div className="inspector-field">
        <span>Title</span>
        <strong>{artifact.title}</strong>
      </div>
      <div className="inspector-field">
        <span>Summary</span>
        <strong>{artifact.summary}</strong>
      </div>
      <div className="trace-list">
        {artifact.blocks.map((block) => (
          <article key={block.id} className="trace-event">
            <div className="trace-event__kind">{block.label}</div>
            <div className="trace-event__detail">{block.description}</div>
            <div className="trace-event__meta">{block.type} 路 children: {block.children.join(', ') || '-'}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ObservabilityPanel({ observability }: { observability: ExecutionObservability | null }) {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'execution' | 'workflow'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'warning' | 'error'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  if (!observability) {
    return (
      <section className="inspector-panel">
        <h3>Observability</h3>
        <div className="inspector-empty">选择一条带 run 的消息后可查看 timeline 和文件追踪。</div>
      </section>
    );
  }

  const stageOptions = [...new Set(observability.timeline.map((entry) => entry.stageId).filter((value): value is string => Boolean(value)))];
  const filteredTimeline = observability.timeline.filter((entry) => {
    if (sourceFilter !== 'all' && entry.sourceKind !== sourceFilter) {
      return false;
    }
    if (statusFilter !== 'all' && entry.status !== statusFilter) {
      return false;
    }
    if (stageFilter !== 'all' && entry.stageId !== stageFilter) {
      return false;
    }
    if (searchText.trim()) {
      const haystack = `${entry.kind} ${entry.detail} ${entry.artifactPath ?? ''} ${entry.stageId ?? ''}`.toLowerCase();
      return haystack.includes(searchText.trim().toLowerCase());
    }
    return true;
  });

  return (
    <section className="inspector-panel">
      <h3>Observability</h3>
      <div className="inspector-field">
        <span>Execution Events</span>
        <strong>{observability.summary.executionEventCount}</strong>
      </div>
      <div className="inspector-field">
        <span>Workflow Events</span>
        <strong>{observability.summary.workflowEventCount}</strong>
      </div>
      <div className="inspector-field">
        <span>Linked Workflow Runs</span>
        <strong>{observability.summary.linkedWorkflowRunCount}</strong>
      </div>
      <div className="inspector-field">
        <span>Tracked Paths</span>
        <strong>{observability.summary.artifactPathCount}</strong>
      </div>
      <div className="capability-form">
        <div className="capability-form-grid">
          <label className="sidebar-label">
            Source
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'all' | 'execution' | 'workflow')}>
              <option value="all">all</option>
              <option value="execution">execution</option>
              <option value="workflow">workflow</option>
            </select>
          </label>
          <label className="sidebar-label">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'ok' | 'warning' | 'error')}>
              <option value="all">all</option>
              <option value="ok">ok</option>
              <option value="warning">warning</option>
              <option value="error">error</option>
            </select>
          </label>
        </div>
        <div className="capability-form-grid">
          <label className="sidebar-label">
            Stage
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="all">all</option>
              {stageOptions.map((stageId) => (
                <option key={stageId} value={stageId}>
                  {stageId}
                </option>
              ))}
            </select>
          </label>
          <label className="sidebar-label">
            Search
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="kind, detail, artifact" />
          </label>
        </div>
      </div>
      <div className="trace-list">
        {filteredTimeline.length === 0 ? (
          <div className="inspector-empty">暂无 timeline 事件。</div>
        ) : (
          filteredTimeline.slice(0, 12).map((entry) => (
            <article key={`${entry.sourceKind}-${entry.id}`} className={`trace-event trace-event--${entry.status}`}>
              <div className="trace-event__kind">{entry.sourceKind} / {entry.kind}</div>
              <div className="trace-event__detail">{entry.detail}</div>
              <div className="trace-event__meta">
                {entry.workflowRunId ?? entry.runId}
                {entry.stageId ? ` / ${entry.stageId}` : ''}
              </div>
              {entry.artifactPath ? <div className="trace-event__artifact">artifact: {entry.artifactPath}</div> : null}
            </article>
          ))
        )}
      </div>
      {observability.artifactPaths.length > 0 ? (
        <>
          <div className="inspector-field">
            <span>Artifact Paths</span>
            <strong>{observability.artifactPaths.length}</strong>
          </div>
          <div className="inspector-path-list">
            {observability.artifactPaths.slice(0, 16).map((artifactPath) => (
              <code key={artifactPath} className="inspector-path-chip">{artifactPath}</code>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ProviderRoutingPanel({
  snapshots,
  scopeLabel,
  busy,
  onRefresh,
  onSetPrimary,
  onAdjustPriority,
}: {
  snapshots: ProviderRoutingSnapshot[];
  scopeLabel: string;
  busy: boolean;
  onRefresh: () => void;
  onSetPrimary: (providerName: string) => void;
  onAdjustPriority: (providerName: string, delta: number) => void;
}) {
  const textSnapshot = snapshots.find((snapshot) => snapshot.capability === 'text') ?? null;
  const reviewSnapshot = snapshots.find((snapshot) => snapshot.capability === 'review') ?? null;
  const multimodalSnapshot = snapshots.find((snapshot) => snapshot.capability === 'text-multimodal') ?? null;
  const primaryText = textSnapshot?.providers[0] ?? null;
  const backupText = textSnapshot?.providers[1] ?? null;

  if (snapshots.length === 0) {
    return (
      <section className="inspector-panel">
        <h3>模型路由</h3>
        <div className="inspector-empty">Provider routing has not been loaded yet.</div>
      </section>
    );
  }

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>模型路由</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
      </div>
      <div className="provider-routing-summary">
        <div className="provider-routing-summary__card">
          <span>当前主文本模型</span>
          <strong>{primaryText ? `${primaryText.name} / ${primaryText.model ?? 'default-model'}` : '-'}</strong>
        </div>
        <div className="provider-routing-summary__card">
          <span>当前备用文本模型</span>
          <strong>{backupText ? `${backupText.name} / ${backupText.model ?? 'default-model'}` : '-'}</strong>
        </div>
        <div className="provider-routing-summary__card">
          <span>当前优先模型</span>
          <strong>{textSnapshot?.preferredProvider ?? textSnapshot?.defaultProvider ?? '-'}</strong>
        </div>
      </div>
      <div className="trace-event__meta">这里展示的是配置层路由候选，不等于最近一次回复实际使用的模型。</div>
      <div className="inspector-field">
        <span>范围</span>
        <strong>{scopeLabel}</strong>
      </div>
      <div className="trace-list">
        {[textSnapshot, reviewSnapshot, multimodalSnapshot]
          .filter((snapshot): snapshot is ProviderRoutingSnapshot => snapshot !== null)
          .map((snapshot) => (
            <article key={snapshot.capability} className="trace-event">
              <div className="trace-event__kind">{snapshot.capability}</div>
              <div className="trace-event__detail">
                default: {snapshot.defaultProvider}
                {snapshot.preferredProvider ? ` / preferred: ${snapshot.preferredProvider}` : ''}
              </div>
              {snapshot.providers.length === 0 ? (
                <div className="trace-event__meta">当前能力还没有可用模型。</div>
              ) : (
                <div className="provider-routing-list">
                  {snapshot.providers.map((provider) => (
                    <div
                      key={`${snapshot.capability}-${provider.name}-${provider.routedCapability}`}
                      className={`provider-route-chip${provider.coolingDown ? ' provider-route-chip--cooling' : ''}`}
                    >
                      <div className="provider-route-chip__title">
                        <strong>#{provider.order + 1} {provider.name}</strong>
                        <span>{provider.model ?? '默认模型'}</span>
                      </div>
                      <div className="provider-route-chip__meta">
                        路由能力 {provider.routedCapability} / 优先级 {provider.priority} / 分数 {provider.score}
                      </div>
                      <div className="provider-route-chip__meta">
                        就绪：{provider.runtimeReady ? '是' : '否'} / 已配置：{provider.configured ? '是' : '否'}
                      </div>
                      <div className="provider-route-chip__actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onSetPrimary(provider.name)}
                          disabled={busy}
                        >
                          设为主模型
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onAdjustPriority(provider.name, 10)}
                          disabled={busy}
                        >
                          优先级 +
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onAdjustPriority(provider.name, -10)}
                          disabled={busy}
                        >
                          优先级 -
                        </button>
                      </div>
                      {provider.coolingDown ? (
                        <div className="provider-route-chip__cooldown">
                          冷却至 {provider.cooldownUntil ? new Date(provider.cooldownUntil).toLocaleString('zh-CN') : '-'}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
      </div>
    </section>
  );
}

function WorkflowOpsPanel({
  run,
  metrics,
  review,
  busy,
  onRefresh,
  onAdvance,
  onRunUntilBlocked,
  onResume,
  onApproveGate,
  onSendToRework,
}: {
  run: WorkflowRun | null;
  metrics: WorkflowMetrics | null;
  review: CommitteeReport | null;
  busy: boolean;
  onRefresh: () => void;
  onAdvance: () => void;
  onRunUntilBlocked: () => void;
  onResume: () => void;
  onApproveGate: () => void;
  onSendToRework: () => void;
}) {
  const activeStage = run?.stages.find((stage) => stage.id === run.currentStageId) ?? null;

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>流程操作</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            刷新
          </button>
        </div>
      </div>
      {!run ? (
        <div className="inspector-empty">当前范围还没有可用的 workflow run。</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>运行 ID</span>
            <strong>{run.id}</strong>
          </div>
          <div className="inspector-field">
            <span>状态</span>
            <strong>{run.status}</strong>
          </div>
          <div className="inspector-field">
            <span>当前阶段</span>
            <strong>{activeStage?.label ?? run.currentStageId ?? '-'}</strong>
          </div>
          <div className="inspector-field">
            <span>模型 / MCP</span>
            <strong>{run.providerCount} / {run.mcpServerCount}</strong>
          </div>
          <div className="inspector-field">
            <span>产出 / 返工</span>
            <strong>{metrics?.artifactCount ?? 0} / {run.reworkCount}</strong>
          </div>
          <div className="inspector-field">
            <span>评审门</span>
            <strong>{review?.gate.decision ?? '-'}</strong>
          </div>
          <div className="capability-actions">
            <button type="button" className="secondary-button" onClick={onAdvance} disabled={busy || run.status !== 'running'}>
              推进一步
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onRunUntilBlocked}
              disabled={busy || run.status !== 'running'}
            >
              运行到阻塞
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onResume}
              disabled={busy || (run.status !== 'blocked' && run.status !== 'needs-rework')}
            >
              恢复
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onApproveGate}
              disabled={busy || !review || !review.gate.blocked}
            >
              通过评审门
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onSendToRework}
              disabled={busy || !review || !review.reworkRequired}
            >
              打回返工
            </button>
          </div>
          {metrics ? (
            <div className="trace-list">
              <article className="trace-event">
                <div className="trace-event__kind">Metrics</div>
                <div className="trace-event__detail">
                  已完成：{metrics.completedStages}/{metrics.totalStages} / 阻塞：{metrics.blockedStages}
                </div>
                <div className="trace-event__meta">
                  评审问题：{metrics.reviewIssueCount} / 完成度：{(metrics.completionRate * 100).toFixed(0)}%
                </div>
              </article>
            </div>
          ) : null}
          <div className="trace-list">
            {run.stages.map((stage) => (
              <article key={stage.id} className={`trace-event trace-event--${stage.status === 'blocked' ? 'warning' : 'ok'}`}>
                <div className="trace-event__kind">{stage.label}</div>
                <div className="trace-event__detail">{stage.status}</div>
                <div className="trace-event__meta">
                  产出：{stage.outputPaths.length}/{stage.requiredOutputs.length} / 尝试：{stage.attemptCount}
                </div>
                {stage.blockedReason ? <div className="trace-event__artifact">{stage.blockedReason}</div> : null}
                {stage.summary ? <div className="trace-event__artifact">{stage.summary}</div> : null}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HermesPolicyPanel({
  report,
  busy,
  onRefresh,
}: {
  report: HermesPolicyReport | null;
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>Hermes 治理</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          刷新
        </button>
      </div>
      {!report ? (
        <div className="inspector-empty">当前 workflow run 还没有 Hermes 治理报告。</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>状态 / 模式</span>
            <strong>
              {report.status} / {report.mode}
            </strong>
          </div>
          <div className="inspector-field">
            <span>护栏</span>
            <strong>不改路由 / 不改计划 / 不写 DAG / 不直接阻塞</strong>
          </div>
          <div className="trace-list">
            {report.checks.map((check) => (
              <article key={check.id} className={`trace-event trace-event--${check.status === 'pass' ? 'ok' : 'warning'}`}>
                <div className="trace-event__kind">{check.label}</div>
                <div className="trace-event__detail">{check.status}</div>
                <div className="trace-event__meta">{check.detail}</div>
              </article>
            ))}
          </div>
          {report.enhancements.length > 0 ? (
            <div className="trace-list">
              {report.enhancements.map((enhancement) => (
                <article key={enhancement.id} className="trace-event trace-event--warning">
                  <div className="trace-event__kind">
                    {enhancement.priority} / {enhancement.stageId ?? 'workflow'}
                  </div>
                  <div className="trace-event__detail">{enhancement.summary}</div>
                  <div className="trace-event__meta">{enhancement.rationale}</div>
                </article>
              ))}
            </div>
          ) : null}
          {report.comparisons.length > 0 ? (
            <div className="trace-list">
              {report.comparisons.map((comparison) => (
                <article
                  key={comparison.id}
                  className={`trace-event trace-event--${
                    comparison.decision === 'promote' || comparison.decision === 'keep'
                      ? 'ok'
                      : comparison.decision === 'park'
                        ? 'pending'
                        : 'warning'
                  }`}
                >
                  <div className="trace-event__kind">
                    compare / {comparison.domain} / {comparison.decision}
                  </div>
                  <div className="trace-event__detail">{comparison.summary}</div>
                  <div className="trace-event__meta">current baseline: {comparison.currentLabel}</div>
                  {comparison.candidates
                    .filter((candidate) => candidate.classification !== 'current')
                    .map((candidate) => (
                      <div key={`${comparison.id}-${candidate.label}`} className="trace-event__artifact">
                        {candidate.classification}: {candidate.label}
                      </div>
                    ))}
                  {comparison.promoteTargetPath ? (
                    <div className="trace-event__artifact">promote target: {comparison.promoteTargetPath}</div>
                  ) : null}
                  {comparison.nextStep ? (
                    <div className="trace-event__artifact">next: {comparison.nextStep}</div>
                  ) : null}
                  {comparison.evidencePaths.slice(0, 3).map((evidencePath) => (
                    <div key={`${comparison.id}-${evidencePath}`} className="trace-event__artifact">
                      evidence: {evidencePath}
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ) : null}
          {report.promotions.length > 0 ? (
            <div className="trace-list">
              {report.promotions.map((promotion) => (
                <article
                  key={promotion.id}
                  className={`trace-event trace-event--${
                    promotion.action === 'promote' || promotion.action === 'keep'
                      ? 'ok'
                      : promotion.action === 'park'
                        ? 'pending'
                        : 'warning'
                  }`}
                >
                  <div className="trace-event__kind">
                    promote / {promotion.action}
                  </div>
                  <div className="trace-event__detail">{promotion.summary}</div>
                  <div className="trace-event__meta">{promotion.rationale}</div>
                  {promotion.targetPath ? (
                    <div className="trace-event__artifact">{promotion.targetPath}</div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
          {report.researchFindings.length > 0 ? (
            <div className="trace-list">
              {report.researchFindings.map((finding) => (
                <article
                  key={finding.id}
                  className={`trace-event trace-event--${finding.status === 'promoted' ? 'ok' : finding.status === 'parked' ? 'pending' : 'warning'}`}
                >
                  <div className="trace-event__kind">research / {finding.topic} / {finding.status}</div>
                  <div className="trace-event__detail">{finding.summary}</div>
                  <div className="trace-event__meta">{finding.suggestedAction}</div>
                  {finding.query ? (
                    <div className="trace-event__artifact">query: {finding.query}</div>
                  ) : null}
                  {finding.resultCount > 0 ? (
                    <div className="trace-event__artifact">result count: {finding.resultCount}</div>
                  ) : null}
                  {finding.excerpts.slice(0, 2).map((excerpt, index) => (
                    <div key={`${finding.id}-excerpt-${index}`} className="trace-event__artifact">
                      {excerpt.knowledgeTitle}: {excerpt.snippet}
                    </div>
                  ))}
                  {finding.evidencePaths.slice(0, 3).map((evidencePath) => (
                    <div key={`${finding.id}-${evidencePath}`} className="trace-event__artifact">
                      evidence: {evidencePath}
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ) : null}
          {report.autoPromotions.length > 0 ? (
            <div className="trace-list">
              {report.autoPromotions.map((promotion) => (
                <article
                  key={promotion.id}
                  className={`trace-event trace-event--${promotion.status === 'created' || promotion.status === 'existing' ? 'ok' : 'pending'}`}
                >
                  <div className="trace-event__kind">auto promotion / {promotion.status}</div>
                  <div className="trace-event__detail">{promotion.summary}</div>
                  <div className="trace-event__meta">
                    compare {promotion.comparisonId}
                    {promotion.requirementId ? ` / requirement ${promotion.requirementId}` : ''}
                  </div>
                  {promotion.targetPath ? (
                    <div className="trace-event__artifact">target: {promotion.targetPath}</div>
                  ) : null}
                  {promotion.writebackTargets.map((target) => (
                    <div key={`${promotion.id}-${target.targetPath}`} className="trace-event__artifact">
                      writeback: {target.targetPath} / {target.status}
                      {target.taskRequirementId ? ` / task ${target.taskRequirementId}` : ''}
                    </div>
                  ))}
                  {promotion.artifactPaths.slice(0, 3).map((artifactPath) => (
                    <div key={`${promotion.id}-${artifactPath}`} className="trace-event__artifact">
                      artifact: {artifactPath}
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ) : null}
          {report.watchFindings.length > 0 ? (
            <div className="trace-list">
              {report.watchFindings.map((finding) => (
                <article
                  key={finding.id}
                  className={`trace-event trace-event--${finding.status === 'resolved' ? 'ok' : finding.status === 'parked' ? 'pending' : 'warning'}`}
                >
                  <div className="trace-event__kind">watch / {finding.title} / {finding.status}</div>
                  <div className="trace-event__detail">{finding.summary}</div>
                  <div className="trace-event__meta">{finding.detail}</div>
                  <div className="trace-event__artifact">
                    recurrence: {finding.recurrenceCount} / stable runs: {finding.stableRunCount}
                  </div>
                  {finding.firstSeenAt || finding.lastSeenAt ? (
                    <div className="trace-event__artifact">
                      seen: {finding.firstSeenAt ?? '-'} {'->'} {finding.lastSeenAt ?? '-'}
                    </div>
                  ) : null}
                  {finding.noiseSuppressed && finding.noiseReason ? (
                    <div className="trace-event__artifact">noise: {finding.noiseReason}</div>
                  ) : null}
                  {finding.carriedFromReportId ? (
                    <div className="trace-event__artifact">carried from: {finding.carriedFromReportId}</div>
                  ) : null}
                  {finding.taskRequirementId ? (
                    <div className="trace-event__artifact">task: {finding.taskRequirementId}</div>
                  ) : null}
                  {finding.trackedRequirementIds.slice(0, 3).map((requirementId) => (
                    <div key={`${finding.id}-${requirementId}`} className="trace-event__artifact">
                      tracked: {requirementId}
                    </div>
                  ))}
                  {finding.evidencePaths.slice(0, 3).map((evidencePath) => (
                    <div key={`${finding.id}-${evidencePath}`} className="trace-event__artifact">
                      evidence: {evidencePath}
                    </div>
                  ))}
                  {finding.closureEvidencePaths.slice(0, 3).map((evidencePath) => (
                    <div key={`${finding.id}-closure-${evidencePath}`} className="trace-event__artifact">
                      closure: {evidencePath}
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function PortfolioPanel({
  entries,
  busy,
  onRefresh,
  onSelectScope,
}: {
  entries: PortfolioEntry[];
  busy: boolean;
  onRefresh: () => void;
  onSelectScope: (subprojectId: string | null) => void;
}) {
  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>项目视图</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            刷新
          </button>
        </div>
      </div>
      <div className="trace-list">
        {entries.length === 0 ? (
          <div className="inspector-empty">当前还没有项目视图数据。</div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.subprojectId ?? 'platform'}
              type="button"
              className="trace-event trace-event-button"
              onClick={() => onSelectScope(entry.subprojectId)}
            >
              <div className="trace-event__kind">{entry.label}</div>
              <div className="trace-event__detail">
                运行：{entry.runCount} / 当前：{entry.currentRun?.status ?? 'none'}
              </div>
              <div className="trace-event__meta">
                阶段：{entry.currentRun?.currentStageId ?? '-'} / 完成度：
                {entry.metrics ? `${(entry.metrics.completionRate * 100).toFixed(0)}%` : '-'}
              </div>
              <div className="trace-event__artifact">范围：{entry.subprojectId ?? 'platform'}</div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function ProductAgentPanel({
  agents,
  blueprints,
  busy,
  onRefresh,
  onBootstrap,
}: {
  agents: ProductAgent[];
  blueprints: ProductAgentBlueprintSummary[];
  busy: boolean;
  onRefresh: () => void;
  onBootstrap: () => void;
}) {
  const coveredBlueprintIds = new Set(agents.map((agent) => agent.templateId).filter((value): value is string => Boolean(value)));
  const missingBlueprints = blueprints.filter((blueprint) => !coveredBlueprintIds.has(blueprint.id));

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>产品 Agent</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onBootstrap} disabled={busy}>
            补齐默认 Agent
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            刷新
          </button>
        </div>
      </div>
      <div className="inspector-field">
        <span>蓝图 / Agent</span>
        <strong>{blueprints.length} / {agents.length}</strong>
      </div>
      <div className="inspector-field">
        <span>缺失蓝图</span>
        <strong>{missingBlueprints.length}</strong>
      </div>
      {missingBlueprints.length > 0 ? (
        <div className="inspector-path-list">
          {missingBlueprints.slice(0, 8).map((blueprint) => (
            <code key={blueprint.id} className="inspector-path-chip">{blueprint.name}</code>
          ))}
        </div>
      ) : null}
      <div className="trace-list">
        {agents.length === 0 ? (
          <div className="inspector-empty">当前范围还没有产品 Agent。</div>
        ) : (
          agents.slice(0, 10).map((agent) => (
            <article key={agent.id} className="trace-event">
              <div className="trace-event__kind">{agent.name}</div>
              <div className="trace-event__detail">
                {agent.level} / {agent.role} / {agent.scope}
              </div>
              <div className="trace-event__meta">
                管理下级：{agent.managedAgentIds.length} / 状态：{agent.status}
              </div>
              <div className="trace-event__artifact">{agent.summary}</div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ProductSkillPanel({
  surface,
  codexLocalState,
  busy,
  onRefresh,
}: {
  surface: ProductSkillSurface | null;
  codexLocalState: CodexLocalStateSnapshot | null;
  busy: boolean;
  onRefresh: () => void;
}) {
  const groups: Array<{ key: keyof ProductSkillSurface['byMainline']; label: string }> = [
    { key: 'product', label: 'Product Skill' },
    { key: 'design', label: 'Design Skill' },
    { key: 'documentation', label: 'Documentation Output' },
  ];

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>产品技能</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          刷新
        </button>
      </div>
      {!surface ? (
        <div className="inspector-empty">当前还没有加载技能注册表。</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>总量 / 产品 / 设计 / 文档</span>
            <strong>
              {surface.summary.total} / {surface.summary.product} / {surface.summary.design} / {surface.summary.documentation}
            </strong>
          </div>
          <div className="inspector-field">
            <span>设计工具链</span>
            <strong>
              {surface.designTooling.command} / {surface.designTooling.status}
            </strong>
          </div>
          <div className="inspector-field">
            <span>Codex 本地同步</span>
            <strong>
              {codexLocalState
                ? `${codexLocalState.diff.localVisibleAndRegisteredSkills.length} 已同步 / ${codexLocalState.diff.localOnlySkills.length} 本地待注册 / ${codexLocalState.diff.runtimeVisibleOnlySkills.length} 运行时待治理 / ${codexLocalState.diff.enabledPluginsNotTrackedByPmaios.length} 待治理插件`
                : '未加载'}
            </strong>
          </div>
          {codexLocalState ? (
            <div className="trace-list">
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">已同步到 PMAIOS 的本地技能</div>
                <div className="trace-event__detail">
                  {codexLocalState.diff.localVisibleAndRegisteredSkills.join(' / ') || 'None'}
                </div>
                <div className="trace-event__meta">
                  local skills: {codexLocalState.localSkills.length} / plugins: {codexLocalState.localPlugins.length}
                </div>
              </article>
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">标准同步动作</div>
                <div className="trace-event__detail">
                  <code>npm run cli -- codex-state sync</code>
                </div>
                <div className="trace-event__meta">
                  这一个命令会重写同步快照，并返回当前是 aligned 还是 drift-detected。
                </div>
              </article>
              <article className={`trace-event trace-event--${codexLocalState.diff.localOnlySkills.length ? 'warning' : 'ok'}`}>
                <div className="trace-event__kind">本地存在但 PMAIOS 未注册</div>
                <div className="trace-event__detail">
                  {codexLocalState.diff.localOnlySkills.join(' / ') || 'None'}
                </div>
                <div className="trace-event__meta">
                  这些 skill 当前只在本地 Codex 可见，还没有进入 PMAIOS registry。
                </div>
              </article>
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">已治理的本地 runtime core</div>
                <div className="trace-event__detail">
                  {codexLocalState.governedLocalRuntimeCore.map((item) => item.name).join(' / ') || 'None'}
                </div>
                <div className="trace-event__meta">
                  {codexLocalState.governedLocalRuntimeCore
                    .map((item) => `${item.id} -> ${item.targetRegistry}`)
                    .join(' / ') || 'No governed local runtime core yet'}
                </div>
              </article>
              <article className={`trace-event trace-event--${codexLocalState.diff.enabledPluginsNotTrackedByPmaios.length ? 'warning' : 'ok'}`}>
                <div className="trace-event__kind">已启用但未治理的插件</div>
                <div className="trace-event__detail">
                  {codexLocalState.diff.enabledPluginsNotTrackedByPmaios.join(' / ') || 'None'}
                </div>
                <div className="trace-event__meta">
                  当前主要从 <code>config.toml</code> 读取启用态，后续再补 plugin registry。
                </div>
              </article>
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">已治理 plugin/tool</div>
                <div className="trace-event__detail">
                  {codexLocalState.governedPlugins.map((item) => item.name).join(' / ') || 'None'}
                </div>
                <div className="trace-event__meta">
                  {codexLocalState.governedPlugins
                    .map((item) => `${item.id} -> ${item.runtimeVisibleSkillId ?? '-'}`)
                    .join(' / ') || 'No governed plugin yet'}
                </div>
              </article>
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">已分类的运行时内置能力</div>
                <div className="trace-event__detail">
                  {codexLocalState.governedRuntimeCapabilities.map((item) => item.name).join(' / ') || 'None'}
                </div>
                <div className="trace-event__meta">
                  {codexLocalState.governedRuntimeCapabilities
                    .map((item) => `${item.id} -> ${item.targetRegistry}`)
                    .join(' / ') || 'No governed runtime capability yet'}
                </div>
              </article>
              <article className={`trace-event trace-event--${codexLocalState.diff.runtimeVisibleOnlySkills.length ? 'warning' : 'ok'}`}>
                <div className="trace-event__kind">Codex 运行时可见但 PMAIOS 未治理</div>
                <div className="trace-event__detail">
                  {codexLocalState.diff.runtimeVisibleOnlySkills.join(' / ') || 'None'}
                </div>
                <div className="trace-event__meta">
                  这层口径来自当前 Codex UI 可见技能快照，不等于本地目录层。
                </div>
              </article>
            </div>
          ) : null}
          <div className="trace-list">
            {groups.map((group) => {
              const skills = surface.byMainline[group.key];
              return (
                <article key={group.key} className="trace-event trace-event--ok">
                  <div className="trace-event__kind">{group.label}</div>
                  <div className="trace-event__detail">
                    {skills.slice(0, 4).map((skill) => skill.name).join(' / ') || 'No skill mapped yet'}
                  </div>
                  <div className="trace-event__meta">
                    count: {skills.length} / prompts: {skills.slice(0, 3).map((skill) => skill.promptPath).join(', ') || '-'}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function ExternalConnectorsPanel({
  selectedSubprojectId,
  status,
  latestWebFetch,
  latestFigmaInspection,
  latestDingTalkImport,
  latestDatakiKnowledgeBases,
  latestDatakiKnowledgeFiles,
  latestDatakiSearch,
  busy,
  onRefresh,
  onWebFetch,
  onInspectFigma,
  onImportDingTalk,
  onListDatakiKnowledgeBases,
  onListDatakiKnowledgeFiles,
  onSearchDatakiKnowledge,
}: {
  selectedSubprojectId: string | null;
  status: ExternalConnectorStatus | null;
  latestWebFetch: WebFetchArtifact | null;
  latestFigmaInspection: FigmaInspection | null;
  latestDingTalkImport: DingTalkMeetingImportResult | null;
  latestDatakiKnowledgeBases: DatakiKnowledgeBaseSummary[];
  latestDatakiKnowledgeFiles: DatakiKnowledgeFileSummary[];
  latestDatakiSearch: DatakiKnowledgeSearchItem[];
  busy: boolean;
  onRefresh: () => void;
  onWebFetch: (url: string) => void;
  onInspectFigma: (fileKey: string) => void;
  onImportDingTalk: (title: string, content: string) => void;
  onListDatakiKnowledgeBases: (input: { subprojectId?: string | null; baseUrl: string; apiKey: string; userId: string; agentId: string }) => void;
  onListDatakiKnowledgeFiles: (input: { subprojectId?: string | null; knowledgeBaseId: string; baseUrl: string; apiKey: string; keyword: string }) => void;
  onSearchDatakiKnowledge: (input: { subprojectId?: string | null; query: string; knowledgeBaseId: string; baseUrl: string; apiKey: string }) => void;
}) {
  const [webUrl, setWebUrl] = useState('');
  const [figmaFileKey, setFigmaFileKey] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingContent, setMeetingContent] = useState('');
  const [datakiBaseUrl, setDatakiBaseUrl] = useState('');
  const [datakiApiKey, setDatakiApiKey] = useState('');
  const [datakiUserId, setDatakiUserId] = useState('');
  const [datakiAgentId, setDatakiAgentId] = useState('');
  const [datakiSelectedKbId, setDatakiSelectedKbId] = useState('');
  const [datakiSearchQuery, setDatakiSearchQuery] = useState('');
  const [datakiFileKeyword, setDatakiFileKeyword] = useState('');

  useEffect(() => {
    if (status?.dataki.baseUrl && !datakiBaseUrl.trim()) {
      setDatakiBaseUrl(status.dataki.baseUrl);
    }
  }, [datakiBaseUrl, status?.dataki.baseUrl]);

  useEffect(() => {
    if (status?.dataki.userId && !datakiUserId.trim()) {
      setDatakiUserId(status.dataki.userId);
    }
  }, [datakiUserId, status?.dataki.userId]);

  useEffect(() => {
    if (status?.dataki.agentId && !datakiAgentId.trim()) {
      setDatakiAgentId(status.dataki.agentId);
    }
  }, [datakiAgentId, status?.dataki.agentId]);

  useEffect(() => {
    if (status?.dataki.defaultKnowledgeBaseId && !datakiSelectedKbId.trim()) {
      setDatakiSelectedKbId(status.dataki.defaultKnowledgeBaseId);
    }
  }, [datakiSelectedKbId, status?.dataki.defaultKnowledgeBaseId]);

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>外部连接器</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          刷新
        </button>
      </div>
      {!status ? (
        <div className="inspector-empty">当前还没有加载连接器状态。</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Notion / Figma / Web / DingTalk / Dataki</span>
            <strong>
              {status.notion.configured ? 'ready' : 'missing'} / {status.figma.configured ? 'ready' : 'missing'} / ready / manual import / {status.dataki.configured ? 'ready' : 'missing'}
            </strong>
          </div>
          <div className="trace-list">
            <article className={`trace-event trace-event--${status.notion.configured ? 'ok' : 'warning'}`}>
              <div className="trace-event__kind">Notion</div>
              <div className="trace-event__detail">configured: {String(status.notion.configured)} / connected: {String(status.notion.connected)} / target: {status.notion.targetMode}</div>
              <div className="trace-event__meta">missing: {status.notion.missing.join(', ') || '-'}</div>
            </article>
            <article className={`trace-event trace-event--${status.figma.configured ? 'ok' : 'warning'}`}>
              <div className="trace-event__kind">Figma</div>
              <div className="trace-event__detail">configured: {String(status.figma.configured)}</div>
              <div className="trace-event__meta">inspect by file key; token is read from local env only</div>
            </article>
            <article className="trace-event trace-event--ok">
              <div className="trace-event__kind">DingTalk meeting notes</div>
              <div className="trace-event__detail">import mode: {status.dingtalk.importMode}</div>
              <div className="trace-event__meta">inbox: {status.dingtalk.inboxPath}</div>
            </article>
            <article className={`trace-event trace-event--${status.dataki.configured ? 'ok' : 'warning'}`}>
              <div className="trace-event__kind">Dataki / WeKnora KB</div>
              <div className="trace-event__detail">configured: {String(status.dataki.configured)} / connected: {String(status.dataki.connected)}</div>
              <div className="trace-event__meta">
                base: {status.dataki.baseUrl ?? '-'} / user: {status.dataki.userId ?? '-'} / default kb: {status.dataki.defaultKnowledgeBaseId ?? '-'}
              </div>
              <div className="trace-event__meta">missing: {status.dataki.missing.join(', ') || '-'}</div>
            </article>
          </div>

          <div className="capability-form">
            <label>
              Web page URL
              <input value={webUrl} onChange={(event) => setWebUrl(event.target.value)} placeholder="https://example.com/article" />
            </label>
            <button type="button" className="secondary-button" onClick={() => onWebFetch(webUrl)} disabled={busy || !webUrl.trim()}>
              Fetch To Inbox
            </button>
            {latestWebFetch ? (
              <div className="trace-event trace-event--ok">
                <div className="trace-event__kind">Latest web fetch</div>
                <div className="trace-event__detail">{latestWebFetch.title}</div>
                <div className="trace-event__meta">{latestWebFetch.sourcePath}</div>
              </div>
            ) : null}
          </div>

          <div className="capability-form">
            <label>
              Figma file key
              <input value={figmaFileKey} onChange={(event) => setFigmaFileKey(event.target.value)} placeholder="file key from Figma URL" />
            </label>
            <button type="button" className="secondary-button" onClick={() => onInspectFigma(figmaFileKey)} disabled={busy || !figmaFileKey.trim()}>
              Inspect Figma
            </button>
            {latestFigmaInspection ? (
              <div className="trace-event trace-event--ok">
                <div className="trace-event__kind">Latest Figma inspect</div>
                <div className="trace-event__detail">{latestFigmaInspection.name}</div>
                <div className="trace-event__meta">
                  nodes: {latestFigmaInspection.nodeCount} / modified: {latestFigmaInspection.lastModified ?? '-'}
                </div>
              </div>
            ) : null}
          </div>

          <div className="capability-form">
            <label>
              DingTalk meeting title
              <input value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} placeholder="meeting title" />
            </label>
            <label>
              DingTalk transcript / minutes
              <textarea value={meetingContent} onChange={(event) => setMeetingContent(event.target.value)} rows={4} />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onImportDingTalk(meetingTitle, meetingContent)}
              disabled={busy || !meetingContent.trim()}
            >
              Import And Normalize
            </button>
            {latestDingTalkImport ? (
              <div className="trace-event trace-event--ok">
                <div className="trace-event__kind">Latest DingTalk import</div>
                <div className="trace-event__detail">{latestDingTalkImport.imported.title}</div>
                <div className="trace-event__meta">
                  {latestDingTalkImport.imported.sourcePath} / requirements: {latestDingTalkImport.normalizationRun.requirementIds.length}
                </div>
              </div>
            ) : null}
          </div>

          <div className="capability-form">
            <label>
              Dataki base URL
              <input value={datakiBaseUrl} onChange={(event) => setDatakiBaseUrl(event.target.value)} placeholder="http://dataki.dobest.com/api/v1" />
            </label>
            <label>
              Dataki API key
              <input value={datakiApiKey} onChange={(event) => setDatakiApiKey(event.target.value)} placeholder="X-API-Key" type="password" />
            </label>
            <label>
              User ID
              <input value={datakiUserId} onChange={(event) => setDatakiUserId(event.target.value)} placeholder="user id" />
            </label>
            <label>
              Optional agent ID
              <input value={datakiAgentId} onChange={(event) => setDatakiAgentId(event.target.value)} placeholder="agent id" />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onListDatakiKnowledgeBases({ subprojectId: selectedSubprojectId, baseUrl: datakiBaseUrl, apiKey: datakiApiKey, userId: datakiUserId, agentId: datakiAgentId })}
              disabled={busy || !datakiBaseUrl.trim() || !datakiApiKey.trim()}
            >
              List Dataki KBs
            </button>
            {latestDatakiKnowledgeBases.length > 0 ? (
              <div className="trace-list">
                {latestDatakiKnowledgeBases.slice(0, 5).map((item) => (
                  <article
                    key={item.id}
                    className={`trace-event trace-event--${datakiSelectedKbId === item.id ? 'ok' : 'neutral'}`}
                    onClick={() => setDatakiSelectedKbId(item.id)}
                  >
                    <div className="trace-event__kind">{item.name}</div>
                    <div className="trace-event__detail">{item.type} / files: {item.knowledgeCount} / chunks: {item.chunkCount}</div>
                    <div className="trace-event__meta">{item.id}</div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <div className="capability-form">
            <label>
              Selected KB id
              <input value={datakiSelectedKbId} onChange={(event) => setDatakiSelectedKbId(event.target.value)} placeholder="knowledge base id" />
            </label>
            <label>
              File keyword
              <input value={datakiFileKeyword} onChange={(event) => setDatakiFileKeyword(event.target.value)} placeholder="optional file keyword" />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                onListDatakiKnowledgeFiles({
                  subprojectId: selectedSubprojectId,
                  knowledgeBaseId: datakiSelectedKbId,
                  baseUrl: datakiBaseUrl,
                  apiKey: datakiApiKey,
                  keyword: datakiFileKeyword,
                })
              }
              disabled={busy || !datakiBaseUrl.trim() || !datakiApiKey.trim() || !datakiSelectedKbId.trim()}
            >
              List KB Files
            </button>
            {latestDatakiKnowledgeFiles.length > 0 ? (
              <div className="trace-list">
                {latestDatakiKnowledgeFiles.slice(0, 5).map((item) => (
                  <article key={item.id} className="trace-event trace-event--neutral">
                    <div className="trace-event__kind">{item.title}</div>
                    <div className="trace-event__detail">{item.fileType ?? 'unknown'} / {item.status ?? 'unknown'}</div>
                    <div className="trace-event__meta">{item.id}</div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <div className="capability-form">
            <label>
              Dataki search query
              <input value={datakiSearchQuery} onChange={(event) => setDatakiSearchQuery(event.target.value)} placeholder="search query" />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                onSearchDatakiKnowledge({
                  subprojectId: selectedSubprojectId,
                  query: datakiSearchQuery,
                  knowledgeBaseId: datakiSelectedKbId,
                  baseUrl: datakiBaseUrl,
                  apiKey: datakiApiKey,
                })
              }
              disabled={busy || !datakiBaseUrl.trim() || !datakiApiKey.trim() || !datakiSearchQuery.trim()}
            >
              Search Dataki KB
            </button>
            {latestDatakiSearch.length > 0 ? (
              <div className="trace-list">
                {latestDatakiSearch.slice(0, 5).map((item) => (
                  <article key={item.id} className="trace-event trace-event--ok">
                    <div className="trace-event__kind">{item.knowledgeTitle || item.knowledgeFilename || item.id}</div>
                    <div className="trace-event__detail">score: {item.score ?? '-'} / {item.chunkType ?? 'chunk'}</div>
                    <div className="trace-event__meta">{item.content.slice(0, 220)}</div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function ProductChiefPanel({
  reports,
  outputs,
  latestUiSchemaContract,
  imageBatches,
  reviews,
  groupSessions,
  busy,
  selectedSubprojectId,
  onAnalyze,
  onGenerateOutput,
  onGenerateAllOutputs,
  onRefresh,
}: {
  reports: ProductChiefReport[];
  outputs: ProductChiefOutput[];
  latestUiSchemaContract: UISchemaContract | null;
  imageBatches: ProductChiefImageBatch[];
  reviews: ProductChiefMultiAgentReview[];
  groupSessions: MultiPmGroupSession[];
  busy: boolean;
  selectedSubprojectId: string | null;
  onAnalyze: (brief: string) => void;
  onGenerateOutput: (reportId: string, type: string) => void;
  onGenerateAllOutputs: (report: ProductChiefReport) => void;
  onRefresh: () => void;
}) {
  const [brief, setBrief] = useState('Generate project PM product outputs for the current PMAIOS demo project');
  const [compareFilter, setCompareFilter] = useState<'changed-only' | 'all'>('changed-only');
  const [compareReasonFilter, setCompareReasonFilter] = useState<'all' | 'mixed' | 'prompt-changed' | 'warning-up' | 'warning-down'>('all');
  const latest = reports[0] ?? null;
  const nextOutput = latest?.requiredGovernedOutputs[0] ?? null;
  const usableOutputCount = outputs.filter((output) => output.multiAgentReviewStatus !== 'blocked').length;
  const generatedOutputTypes = new Set(outputs.map((output) => output.type));
  const pendingOutputs = latest?.requiredGovernedOutputs.filter((output) => !generatedOutputTypes.has(output.type)) ?? [];
  const nextOutputRequiresSubproject = isProjectScopedDesignOutput(nextOutput?.type);
  const pendingImage2Output = pendingOutputs.some((output) => isProjectScopedDesignOutput(output.type));
  const image2BlockedByProjectScope = !selectedSubprojectId && pendingImage2Output;
  const groupedRequiredOutputs = useMemo(() => {
    const groups: Record<'definition' | 'design' | 'delivery', Array<{
      type: string;
      title: string;
      done: boolean;
      layer: 'definition' | 'design' | 'delivery';
      dependsOn: string[];
      unlocks: string[];
    }>> = {
      definition: [],
      design: [],
      delivery: [],
    };
    const allOutputs = latest?.requiredGovernedOutputs ?? [];
    for (const output of allOutputs) {
      const layer = getGovernedOutputLayer(output.type);
      groups[layer].push({
        type: output.type,
        title: output.title,
        done: generatedOutputTypes.has(output.type),
        layer,
        dependsOn: output.dependsOn ?? [],
        unlocks: allOutputs.filter((candidate) => (candidate.dependsOn ?? []).includes(output.type)).map((candidate) => candidate.type),
      });
    }
    return groups;
  }, [generatedOutputTypes, latest]);
  const currentLayerStatus = useMemo(() => {
    const order: Array<'definition' | 'design' | 'delivery'> = ['definition', 'design', 'delivery'];
    for (const layer of order) {
      const items = groupedRequiredOutputs[layer];
      if (items.length === 0) {
        continue;
      }
      const pending = items.filter((item) => !item.done);
      if (pending.length > 0) {
        const suggestedType =
          nextOutput && getGovernedOutputLayer(nextOutput.type) === layer
            ? nextOutput.type
            : pending[0]?.type ?? null;
        return {
          layer,
          label: getGovernedOutputLayerLabel(layer),
          status: 'blocked' as const,
          summary: `当前主要堵点在${getGovernedOutputLayerLabel(layer)}，还有 ${pending.length} 个待生成项。`,
          pendingLabels: pending.map((item) => getGovernedOutputLabel(item.type)),
          suggestedType,
          suggestedLabel: getGovernedOutputLabel(suggestedType),
        };
      }
    }
    return {
      layer: 'delivery' as const,
      label: getGovernedOutputLayerLabel('delivery'),
      status: 'ready' as const,
      summary: '定义层、设计层、交付层当前都没有待生成项。',
      pendingLabels: [] as string[],
      suggestedType: null,
      suggestedLabel: null,
    };
  }, [groupedRequiredOutputs, nextOutput]);
  const suggestedNextOutputRequiresSubproject = isProjectScopedDesignOutput(currentLayerStatus.suggestedType);
  const canGenerateOutputType = useCallback(
    (type: string) => !busy && !(!selectedSubprojectId && isProjectScopedDesignOutput(type)),
    [busy, selectedSubprojectId],
  );
  const pageComparisonEntries = useMemo(() => {
    const grouped = new Map<string, {
      pageKey: string;
      pageName: string;
      variantLabel: string;
      summary: {
        latestVersionTag: string | null;
        previousVersionTag: string | null;
        latestGeneratedAt: string | null;
        previousGeneratedAt: string | null;
        warningDelta: number | null;
        promptChanged: boolean | null;
        changeReason: 'mixed' | 'prompt-changed' | 'warning-up' | 'warning-down' | 'unchanged';
      };
      items: Array<{
        batchFolder: string;
        versionTag: string;
        generatedAt: string;
        warningCount: number;
        manifestPath: string;
        assetPath: string;
        prompt: string;
        variantLabel: string;
        designLanguage: string;
        styleDirection: string;
        informationDensity: 'low' | 'medium' | 'high';
      }>;
    }>();

    for (const batch of imageBatches) {
      for (const item of batch.items) {
        if (!item?.pageKey || !item.assetPath) {
          continue;
        }
        const existing = grouped.get(item.pageKey) ?? {
          pageKey: item.pageKey,
          pageName: item.pageName || item.pageKey,
          variantLabel: item.variantLabel || 'default',
          summary: {
            latestVersionTag: null,
            previousVersionTag: null,
            latestGeneratedAt: null,
            previousGeneratedAt: null,
            warningDelta: null,
            promptChanged: null,
            changeReason: 'unchanged',
          },
          items: [],
        };
        existing.items.push({
          batchFolder: batch.batchFolder,
          versionTag: batch.versionTag,
          generatedAt: batch.generatedImageGeneratedAt,
          warningCount: batch.warningCount,
          manifestPath: batch.manifestPath,
          assetPath: item.assetPath,
          prompt: item.prompt,
          variantLabel: item.variantLabel || 'default',
          designLanguage: item.designLanguage || '-',
          styleDirection: item.styleDirection || '-',
          informationDensity: item.informationDensity || 'medium',
        });
        grouped.set(item.pageKey, existing);
      }
    }

    return [...grouped.values()]
      .map((entry) => {
        const items = entry.items
          .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))
          .slice(0, 3);
        const latestItem = items[0] ?? null;
        const previousItem = items[1] ?? null;
        const warningDelta = latestItem && previousItem ? latestItem.warningCount - previousItem.warningCount : null;
        const promptChanged = latestItem && previousItem ? latestItem.prompt.trim() !== previousItem.prompt.trim() : null;
        const changeReason =
          promptChanged === true && typeof warningDelta === 'number' && warningDelta !== 0
            ? 'mixed'
            : promptChanged === true
              ? 'prompt-changed'
              : typeof warningDelta === 'number' && warningDelta > 0
                ? 'warning-up'
                : typeof warningDelta === 'number' && warningDelta < 0
                  ? 'warning-down'
                  : 'unchanged';
        return {
          ...entry,
          items,
          summary: {
            latestVersionTag: latestItem?.versionTag ?? null,
            previousVersionTag: previousItem?.versionTag ?? null,
            latestGeneratedAt: latestItem?.generatedAt ?? null,
            previousGeneratedAt: previousItem?.generatedAt ?? null,
            warningDelta,
            promptChanged,
            changeReason,
          },
        };
      })
      .filter((entry) => entry.items.length > 1)
      .sort((left, right) => {
        const leftTime = Date.parse(left.items[0]?.generatedAt ?? '');
        const rightTime = Date.parse(right.items[0]?.generatedAt ?? '');
        return rightTime - leftTime;
      });
  }, [imageBatches]);
  const changedPageComparisonEntries = useMemo(
    () =>
      pageComparisonEntries.filter(
        (entry) => entry.summary.promptChanged === true || (typeof entry.summary.warningDelta === 'number' && entry.summary.warningDelta !== 0),
      ),
    [pageComparisonEntries],
  );
  const reasonFilteredPageComparisonEntries = useMemo(() => {
    const baseEntries = compareFilter === 'changed-only' ? changedPageComparisonEntries : pageComparisonEntries;
    if (compareReasonFilter === 'all') {
      return baseEntries;
    }
    return baseEntries.filter((entry) => entry.summary.changeReason === compareReasonFilter);
  }, [changedPageComparisonEntries, compareFilter, compareReasonFilter, pageComparisonEntries]);
  const visiblePageComparisonEntries = reasonFilteredPageComparisonEntries.slice(0, 3);

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>Project PM Outputs</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
          <button type="button" className="primary-button" onClick={() => onAnalyze(brief)} disabled={busy || !brief.trim()}>
            Analyze
          </button>
        </div>
      </div>
      <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={3} />
      {!latest ? (
        <div className="inspector-empty">No project PM output plan yet.</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Questions / Agents / Usable Outputs</span>
            <strong>
              {latest.missingQuestions.length} / {latest.engagedSpecialists.length} / {usableOutputCount}
            </strong>
          </div>
          <div className="inspector-field">
            <span>Pending Outputs</span>
            <strong>{pendingOutputs.length}</strong>
          </div>
          {image2BlockedByProjectScope ? (
            <div className="trace-event trace-event--warning">
              <div className="trace-event__kind">image2 project scope required</div>
              <div className="trace-event__detail">
                Select a target subproject before generating outputs that include `concept-design-pack` or `design-image2-prompt-pack`.
              </div>
              <div className="trace-event__meta">
                Generated images must be written into a project directory, so platform-root generation is blocked.
              </div>
            </div>
          ) : null}
          <div className="trace-event trace-event--warning">
            <div className="trace-event__kind">frontend consistency rule</div>
            <div className="trace-event__detail">
              会话里新增或修正的需求必须回写到 `functional-spec-pack` / `ui-schema-spec` / handoff；设计图本身不是最终实现契约。
            </div>
            <div className="trace-event__meta">
              前端实现应以需求真源、设计文档和 UI schema 为主，图片只做视觉校对，不应靠看图猜交互。
            </div>
          </div>
          <div className="inspector-field">
            <span>Multi-Agent Reviews</span>
            <strong>{reviews.length}</strong>
          </div>
          <div className="inspector-field">
            <span>Multi-PM Group Sessions</span>
            <strong>{groupSessions.length}</strong>
          </div>
          <div className="inspector-field">
            <span>Image Batches</span>
            <strong>{imageBatches.length}</strong>
          </div>
          <div className="trace-list">
            {groupSessions.length === 0 ? (
              <div className="inspector-empty">当前还没有交付驱动的多 PM 群会话。</div>
            ) : (
              groupSessions.slice(0, 2).map((session) => (
                <article key={session.id} className="trace-event trace-event--ok">
                  <div className="trace-event__kind">{session.status}</div>
                  <div className="trace-event__detail">{session.deliveryTarget}</div>
                  <div className="trace-event__meta">goal: {session.sessionGoal}</div>
                  <div className="trace-event__meta">gap: {session.currentGap}</div>
                  <div className="trace-event__meta">
                    chair: {session.chair.agentName} / task: {session.taskId ?? '-'} / next: {session.nextSafeStep ?? '-'}
                  </div>
                  <div className="trace-event__artifact">
                    participants: {[session.chair, ...session.participants].map((item) => `${item.agentName}(${item.role})`).join(' / ')}
                  </div>
                  <div className="trace-list">
                    {session.messages.slice(0, 4).map((message) => (
                      <article key={message.messageId} className="trace-event">
                        <div className="trace-event__kind">{message.speakerRole}</div>
                        <div className="trace-event__detail">{message.speakerName}: {message.summary}</div>
                        <div className="trace-event__meta">
                          replyTo: {message.replyToMessageId ?? 'root'} / {message.intent} / {message.stance}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="trace-event__meta">
                    backwrite: {session.backwriteTargets.map((item) => `${item.targetType} -> ${item.targetPath}`).join(' | ')}
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="inspector-field">
            <span>Changed Compare Pages</span>
            <strong>{changedPageComparisonEntries.length}</strong>
          </div>
          <div className="trace-event trace-event--ok">
            <div className="trace-event__kind">two-step PRD and design chain</div>
            <div className="trace-event__detail">
              plan-prd → functional-spec-pack → delivery-html → schema-delivery → delivery-design-pack (Figma / JSON schema / page-structure DSL) → implementation-handoff
            </div>
            <div className="trace-event__meta">
              UI design stage = HTML first; image2 stays only for optional architecture / flow / explainer boards
            </div>
          </div>
          <div className={`trace-event ${currentLayerStatus.status === 'blocked' ? 'trace-event--warning' : 'trace-event--ok'}`}>
            <div className="trace-event__kind">current gated layer</div>
            <div className="trace-event__detail">{currentLayerStatus.summary}</div>
            <div className="trace-event__meta">current layer: {currentLayerStatus.label}</div>
            {currentLayerStatus.pendingLabels.length > 0 ? (
              <div className="trace-event__meta">pending: {currentLayerStatus.pendingLabels.join(' / ')}</div>
            ) : null}
            {currentLayerStatus.suggestedLabel ? (
              <div className="trace-event__meta">suggested next output: {currentLayerStatus.suggestedLabel}</div>
            ) : null}
            {currentLayerStatus.suggestedType && latest ? (
              <div className="capability-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onGenerateOutput(latest.id, currentLayerStatus.suggestedType)}
                  disabled={busy || (!selectedSubprojectId && suggestedNextOutputRequiresSubproject)}
                >
                  Generate Suggested Next Output
                </button>
              </div>
            ) : null}
          </div>
          <div className="trace-list">
            {(['definition', 'design', 'delivery'] as const).map((layer) => (
              <article key={layer} className="trace-event trace-event--ok">
                <div className="trace-event__kind">{getGovernedOutputLayerLabel(layer)}</div>
                {groupedRequiredOutputs[layer].length > 0 ? (
                  <div className="trace-event__output-grid">
                    {groupedRequiredOutputs[layer].map((output) =>
                      output.done ? (
                        <div
                          key={output.type}
                          className="trace-event__output-chip trace-event__output-chip--done"
                          title={buildGovernedOutputHint({
                            type: output.type,
                            layer: output.layer,
                            dependsOn: output.dependsOn,
                            unlocks: output.unlocks,
                          })}
                        >
                          ✓ {getGovernedOutputLabel(output.type)}
                        </div>
                      ) : (
                        <button
                          key={output.type}
                          type="button"
                          className="trace-event__output-chip trace-event__output-chip--pending"
                          onClick={() => latest ? onGenerateOutput(latest.id, output.type) : undefined}
                          disabled={!latest || !canGenerateOutputType(output.type)}
                          title={buildGovernedOutputHint({
                            type: output.type,
                            layer: output.layer,
                            dependsOn: output.dependsOn,
                            unlocks: output.unlocks,
                          })}
                        >
                          ○ {getGovernedOutputLabel(output.type)}
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="trace-event__detail">No governed outputs in this layer.</div>
                )}
              </article>
            ))}
          </div>
          {latest ? (
            <div className="capability-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => onGenerateAllOutputs(latest)}
                disabled={busy || pendingOutputs.length === 0 || image2BlockedByProjectScope}
              >
                Generate Full Package
              </button>
              {nextOutput ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onGenerateOutput(latest.id, nextOutput.type)}
                disabled={busy || (!selectedSubprojectId && nextOutputRequiresSubproject)}
              >
                Generate {getGovernedOutputLabel(nextOutput.type)}
              </button>
              ) : null}
            </div>
          ) : null}
          {pageComparisonEntries.length > 0 ? (
            <>
              <div className="capability-actions">
                <button
                  type="button"
                  className={compareFilter === 'changed-only' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setCompareFilter('changed-only')}
                  disabled={busy}
                >
                  Show Changed Compare Pages
                </button>
                <button
                  type="button"
                  className={compareFilter === 'all' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setCompareFilter('all')}
                  disabled={busy}
                >
                  Show All Compare Pages
                </button>
              </div>
              <div className="capability-actions">
                <button
                  type="button"
                  className={compareReasonFilter === 'all' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setCompareReasonFilter('all')}
                  disabled={busy}
                >
                  All Reasons
                </button>
                <button
                  type="button"
                  className={compareReasonFilter === 'mixed' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setCompareReasonFilter('mixed')}
                  disabled={busy}
                >
                  Mixed
                </button>
                <button
                  type="button"
                  className={compareReasonFilter === 'prompt-changed' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setCompareReasonFilter('prompt-changed')}
                  disabled={busy}
                >
                  Prompt Changed
                </button>
                <button
                  type="button"
                  className={compareReasonFilter === 'warning-up' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setCompareReasonFilter('warning-up')}
                  disabled={busy}
                >
                  Warning Up
                </button>
                <button
                  type="button"
                  className={compareReasonFilter === 'warning-down' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setCompareReasonFilter('warning-down')}
                  disabled={busy}
                >
                  Warning Down
                </button>
              </div>
            </>
          ) : null}
          <div className="trace-list">
            {latest.missingQuestions.slice(0, 4).map((question) => (
              <article key={question.id} className="trace-event trace-event--warning">
                <div className="trace-event__kind">{question.topic}</div>
                <div className="trace-event__detail">{question.question}</div>
                <div className="trace-event__meta">{question.reason}</div>
              </article>
            ))}
            {latest.learningGuidance.slice(0, 2).map((guidance) => (
              <article key={guidance.id} className="trace-event trace-event--ok">
                <div className="trace-event__kind">{guidance.title}</div>
                <div className="trace-event__detail">{guidance.recommendation}</div>
                <div className="trace-event__meta">{guidance.whyNow}</div>
              </article>
            ))}
            {imageBatches.slice(0, 3).map((batch) => (
              <article key={batch.manifestPath} className="trace-event trace-event--ok">
                <div className="trace-event__kind">image batch</div>
                <div className="trace-event__detail">{batch.batchFolder}</div>
                <div className="trace-event__meta">
                  version: {batch.versionTag} / pages: {batch.pageCount} / warnings: {batch.warningCount}
                </div>
                <div className="trace-event__meta">generated at: {batch.generatedImageGeneratedAt}</div>
                <div className="trace-event__artifact">
                  <a href={buildFileApiUrl(batch.manifestPath)} target="_blank" rel="noreferrer">
                    open batch manifest
                  </a>
                  {' / '}
                  {batch.manifestPath}
                </div>
              </article>
            ))}
            {visiblePageComparisonEntries.map((entry) => (
              <article key={entry.pageKey} className="trace-event trace-event--ok">
                <div className="trace-event__kind">cross-batch page compare</div>
                <div className="trace-event__detail">{entry.pageName} / {entry.variantLabel}</div>
                <div className="trace-event__meta">
                  page key: {entry.pageKey} / recent batches: {entry.items.length}
                </div>
                <div className="trace-event__compare-summary">
                  <span className={`trace-event__compare-tag trace-event__compare-tag--${entry.summary.changeReason}`}>
                    {entry.summary.changeReason}
                  </span>
                  <span>
                    latest vs previous: {entry.summary.latestVersionTag ?? 'unknown'} / {entry.summary.previousVersionTag ?? 'unknown'}
                  </span>
                  {typeof entry.summary.warningDelta === 'number' ? (
                    <span>
                      warning delta: {entry.summary.warningDelta > 0 ? `+${entry.summary.warningDelta}` : entry.summary.warningDelta}
                    </span>
                  ) : null}
                  {typeof entry.summary.promptChanged === 'boolean' ? (
                    <span>prompt: {entry.summary.promptChanged ? 'changed' : 'same'}</span>
                  ) : null}
                </div>
                {entry.summary.latestGeneratedAt && entry.summary.previousGeneratedAt ? (
                  <div className="trace-event__meta">
                    compare window: {entry.summary.latestGeneratedAt} {'->'} {entry.summary.previousGeneratedAt}
                  </div>
                ) : null}
                <div className="trace-event__gallery">
                  {entry.items.map((item) => (
                    <details key={`${entry.pageKey}-${item.batchFolder}`} className="trace-event__thumbnail-card">
                      <summary className="trace-event__thumbnail-link" title={`${entry.pageName} / ${item.batchFolder}`}>
                        <img
                          src={buildFileApiUrl(item.assetPath)}
                          alt={`${entry.pageName} / ${item.batchFolder}`}
                          className="trace-event__thumbnail"
                        />
                        <span className="trace-event__thumbnail-label">{item.versionTag} / {item.variantLabel}</span>
                        <span className="trace-event__thumbnail-meta">
                          {item.batchFolder.length > 52 ? `${item.batchFolder.slice(0, 52)}...` : item.batchFolder}
                        </span>
                      </summary>
                      <div className="trace-event__thumbnail-detail">
                        <div className="trace-event__thumbnail-actions">
                          <a href={buildFileApiUrl(item.assetPath)} target="_blank" rel="noreferrer">
                            open image
                          </a>
                          <a href={buildFileApiUrl(item.manifestPath)} target="_blank" rel="noreferrer">
                            open batch manifest
                          </a>
                        </div>
                        <div className="trace-event__thumbnail-path">generated at: {item.generatedAt}</div>
                        <div className="trace-event__thumbnail-path">warnings: {item.warningCount}</div>
                        <div className="trace-event__thumbnail-path">{item.assetPath}</div>
                        <div className="trace-event__meta">
                          language: {item.designLanguage} / style: {item.styleDirection} / density: {item.informationDensity}
                        </div>
                        {item.prompt.trim() ? (
                          <pre className="trace-event__thumbnail-prompt">{item.prompt}</pre>
                        ) : null}
                      </div>
                    </details>
                  ))}
                </div>
              </article>
            ))}
            {pageComparisonEntries.length > 0 && visiblePageComparisonEntries.length === 0 ? (
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">cross-batch page compare</div>
                <div className="trace-event__detail">No compare pages match the current compare filter and reason filter.</div>
                <div className="trace-event__meta">Switch compare mode or reason filter to inspect other same-page histories.</div>
              </article>
            ) : null}
            {latestUiSchemaContract ? (
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">UI schema contract</div>
                <div className="trace-event__detail">
                  pages {latestUiSchemaContract.pageContracts.length} / linked requirements {latestUiSchemaContract.linkedRequirementIds.length}
                </div>
                <div className="trace-event__meta">
                  linked outputs: {latestUiSchemaContract.linkedOutputTypes.map((type) => getGovernedOutputLabel(type)).join(' / ')}
                </div>
                <div className="trace-event__artifact">
                  brief: {latestUiSchemaContract.sourceBrief.length > 140 ? `${latestUiSchemaContract.sourceBrief.slice(0, 140)}...` : latestUiSchemaContract.sourceBrief}
                </div>
                {latestUiSchemaContract.pageContracts.slice(0, 2).map((page) => (
                  <div key={page.pageId} className="trace-event__artifact">
                    {page.pageName} / blocks {page.blocks.length} / states {page.states.length} / actions {page.actions.length}
                  </div>
                ))}
                {latestUiSchemaContract.implementationRules.slice(0, 2).map((rule, index) => (
                  <div key={`ui-schema-rule-${index + 1}`} className="trace-event__artifact">
                    rule: {rule}
                  </div>
                ))}
              </article>
            ) : null}
            {outputs.slice(0, 2).map((output) => (
              <article key={output.id} className="trace-event trace-event--ok">
                <div className="trace-event__kind">{getGovernedOutputLabel(output.type)}</div>
                <div className="trace-event__detail">{output.title}</div>
                <div className="trace-event__meta">type: {output.type}</div>
                <div className="trace-event__meta">
                  review: {output.multiAgentReviewStatus ?? 'pending'}
                </div>
                <div className="trace-event__artifact">
                  <a href={buildFileApiUrl(output.artifactPath)} target="_blank" rel="noreferrer">
                    open output doc
                  </a>
                  {' / '}
                  {output.artifactPath}
                </div>
                {typeof output.metadata.generatedUiSchemaPath === 'string' ? (
                  <div className="trace-event__artifact">
                    <a href={buildFileApiUrl(output.metadata.generatedUiSchemaPath)} target="_blank" rel="noreferrer">
                      open ui schema
                    </a>
                    {' / '}
                    {output.metadata.generatedUiSchemaPath}
                  </div>
                ) : null}
                {typeof output.metadata.generatedUiSchemaPageCount === 'number' ? (
                  <div className="trace-event__meta">ui schema pages: {output.metadata.generatedUiSchemaPageCount}</div>
                ) : null}
                {typeof output.metadata.designChangeSetPath === 'string' ? (
                  <div className="trace-event__artifact">
                    <a href={buildFileApiUrl(output.metadata.designChangeSetPath)} target="_blank" rel="noreferrer">
                      open design change set
                    </a>
                    {' / '}
                    {output.metadata.designChangeSetPath}
                  </div>
                ) : null}
                {typeof output.metadata.designDiffAuditPath === 'string' ? (
                  <div className="trace-event__artifact">
                    <a href={buildFileApiUrl(output.metadata.designDiffAuditPath)} target="_blank" rel="noreferrer">
                      open design diff audit
                    </a>
                    {' / '}
                    {output.metadata.designDiffAuditPath}
                  </div>
                ) : null}
                {typeof output.metadata.requestedChangeCount === 'number' ? (
                  <div className="trace-event__meta">
                    requested changes: {output.metadata.requestedChangeCount} / applied: {typeof output.metadata.appliedChangeCount === 'number' ? output.metadata.appliedChangeCount : 0} / missed:{' '}
                    {typeof output.metadata.missedChangeCount === 'number' ? output.metadata.missedChangeCount : 0} / unintended:{' '}
                    {typeof output.metadata.unintendedChangeCount === 'number' ? output.metadata.unintendedChangeCount : 0}
                  </div>
                ) : null}
                {Array.isArray(output.metadata.generatedHtmlCandidates) && output.metadata.generatedHtmlCandidates.length > 0 ? (
                  <div className="trace-event__artifact">
                    <div>html design directions:</div>
                    <div className="trace-event__gallery">
                      {output.metadata.generatedHtmlCandidates.map((candidate, index) =>
                        candidate && typeof candidate === 'object' && typeof candidate.assetPath === 'string' ? (
                          <article key={candidate.assetPath} className="trace-event__thumbnail-card">
                            <div className="trace-event__thumbnail-detail">
                              <div className="trace-event__thumbnail-label">
                                {typeof candidate.styleLabel === 'string' ? candidate.styleLabel : `Direction ${index + 1}`}
                                {candidate.recommended === true ? ' / recommended' : ''}
                              </div>
                              {typeof candidate.direction === 'string' ? (
                                <div className="trace-event__thumbnail-meta">{candidate.direction}</div>
                              ) : null}
                              <div className="trace-event__thumbnail-actions">
                                <a href={buildFileApiUrl(candidate.assetPath)} target="_blank" rel="noreferrer">
                                  open html direction
                                </a>
                              </div>
                              <div className="trace-event__thumbnail-path">{candidate.assetPath}</div>
                            </div>
                          </article>
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : null}
                {output.metadata.designChangeSet && typeof output.metadata.designChangeSet === 'object' && Array.isArray((output.metadata.designChangeSet as { items?: unknown[] }).items) ? (
                  <details className="trace-event__thumbnail-card">
                    <summary className="trace-event__thumbnail-link">design change set summary</summary>
                    <div className="trace-event__thumbnail-detail">
                      {((output.metadata.designChangeSet as { items: Array<Record<string, unknown>> }).items).map((item, index) => (
                        <div key={typeof item.changeId === 'string' ? item.changeId : `change-${index}`} className="trace-event__thumbnail-path">
                          {typeof item.changeId === 'string' ? item.changeId : `change-${index + 1}`} / {typeof item.targetPageName === 'string' ? item.targetPageName : typeof item.targetPageKey === 'string' ? item.targetPageKey : 'global'} /{' '}
                          {typeof item.status === 'string' ? item.status : 'requested'} / {typeof item.request === 'string' ? item.request : ''}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                {typeof output.metadata.generatedImageVersionTag === 'string' ? (
                  <div className="trace-event__meta">image version: {output.metadata.generatedImageVersionTag}</div>
                ) : null}
                {typeof output.metadata.generatedImageGeneratedAt === 'string' ? (
                  <div className="trace-event__meta">image generated at: {output.metadata.generatedImageGeneratedAt}</div>
                ) : null}
                {typeof output.metadata.generatedImageBatchFolder === 'string' ? (
                  <div className="trace-event__artifact">image batch: {output.metadata.generatedImageBatchFolder}</div>
                ) : null}
                {typeof output.metadata.generatedImageWarningCount === 'number' ? (
                  <div className="trace-event__meta">image warnings: {output.metadata.generatedImageWarningCount}</div>
                ) : null}
                {typeof output.metadata.generatedImageManifestPath === 'string' ? (
                  <div className="trace-event__artifact">
                    <a href={buildFileApiUrl(output.metadata.generatedImageManifestPath)} target="_blank" rel="noreferrer">
                      open batch manifest
                    </a>
                    {' / '}
                    {output.metadata.generatedImageManifestPath}
                  </div>
                ) : null}
                {Array.isArray(output.metadata.generatedImagePaths) && typeof output.metadata.generatedImagePaths[0] === 'string' ? (
                  <div className="trace-event__artifact">
                    <a href={buildFileApiUrl(output.metadata.generatedImagePaths[0])} target="_blank" rel="noreferrer">
                      open first image
                    </a>
                    {' / '}
                    {output.metadata.generatedImagePaths[0]}
                  </div>
                ) : null}
                {Array.isArray(output.metadata.generatedImageItems) && output.metadata.generatedImageItems.length > 0 ? (
                  <div className="trace-event__artifact">
                    <div>batch gallery:</div>
                    <div className="trace-event__gallery">
                      {output.metadata.generatedImageItems.map((item, index) =>
                        item && typeof item === 'object' && typeof item.assetPath === 'string' ? (
                          <details key={item.assetPath} className="trace-event__thumbnail-card">
                            <summary className="trace-event__thumbnail-link" title={typeof item.pageName === 'string' ? item.pageName : `open image ${index + 1}`}>
                              <img
                                src={buildFileApiUrl(item.assetPath)}
                                alt={typeof item.pageName === 'string' ? item.pageName : `${output.title} image ${index + 1}`}
                                className="trace-event__thumbnail"
                              />
                              <span className="trace-event__thumbnail-label">
                                {typeof item.pageNumber === 'number'
                                  ? `Page ${item.pageNumber} / ${typeof item.pageName === 'string' ? item.pageName : `image ${index + 1}`} / ${typeof item.variantLabel === 'string' ? item.variantLabel : 'default'}`
                                  : typeof item.pageName === 'string'
                                    ? item.pageName
                                    : `image ${index + 1}`}
                              </span>
                              {typeof item.prompt === 'string' && item.prompt.trim() ? (
                                <span className="trace-event__thumbnail-meta">
                                  {item.prompt.length > 88 ? `${item.prompt.slice(0, 88)}...` : item.prompt}
                                </span>
                              ) : null}
                            </summary>
                            <div className="trace-event__thumbnail-detail">
                              <div className="trace-event__thumbnail-actions">
                                <a href={buildFileApiUrl(item.assetPath)} target="_blank" rel="noreferrer">
                                  open image
                                </a>
                                <a href={buildFileApiUrl(output.artifactPath)} target="_blank" rel="noreferrer">
                                  open output doc
                                </a>
                                {typeof output.metadata.generatedImageManifestPath === 'string' ? (
                                  <a href={buildFileApiUrl(output.metadata.generatedImageManifestPath)} target="_blank" rel="noreferrer">
                                    open batch manifest
                                  </a>
                                ) : null}
                              </div>
                              {typeof item.pageKey === 'string' && item.pageKey.trim() ? (
                                <div className="trace-event__thumbnail-path">page key: {item.pageKey}</div>
                              ) : null}
                              <div className="trace-event__thumbnail-path">{item.assetPath}</div>
                              <div className="trace-event__meta">
                                language: {typeof item.designLanguage === 'string' ? item.designLanguage : '-'} / style:{' '}
                                {typeof item.styleDirection === 'string' ? item.styleDirection : '-'} / density:{' '}
                                {typeof item.informationDensity === 'string' ? item.informationDensity : '-'}
                              </div>
                              {typeof item.prompt === 'string' && item.prompt.trim() ? (
                                <pre className="trace-event__thumbnail-prompt">{item.prompt}</pre>
                              ) : null}
                            </div>
                          </details>
                        ) : null,
                      )}
                    </div>
                    <div className="trace-event__meta">open output doc to inspect the full page-by-page prompt pack source.</div>
                  </div>
                ) : Array.isArray(output.metadata.generatedImagePaths) && output.metadata.generatedImagePaths.length > 0 ? (
                  <div className="trace-event__artifact">
                    <div>batch gallery:</div>
                    <div className="trace-event__gallery">
                      {output.metadata.generatedImagePaths.map((imagePath, index) =>
                        typeof imagePath === 'string' ? (
                          <a
                            key={imagePath}
                            href={buildFileApiUrl(imagePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="trace-event__thumbnail-link"
                            title={`open image ${index + 1}`}
                          >
                            <img
                              src={buildFileApiUrl(imagePath)}
                              alt={`${output.title} image ${index + 1}`}
                              className="trace-event__thumbnail"
                            />
                            <span className="trace-event__thumbnail-label">image {index + 1}</span>
                          </a>
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : null}
                {output.multiAgentReviewArtifactPath ? (
                  <div className="trace-event__artifact">
                    <a href={buildFileApiUrl(output.multiAgentReviewArtifactPath)} target="_blank" rel="noreferrer">
                      open review artifact
                    </a>
                    {' / '}
                    {output.multiAgentReviewArtifactPath}
                  </div>
                ) : null}
              </article>
            ))}
            {reviews.slice(0, 2).map((review) => (
              <article
                key={review.id}
                className={`trace-event trace-event--${review.status === 'pass' ? 'ok' : review.status === 'blocked' ? 'error' : 'warning'}`}
              >
                <div className="trace-event__kind">multi-agent review / {review.status}</div>
                <div className="trace-event__detail">{review.consensus}</div>
                <div className="trace-event__meta">
                  participants: {review.participantTaskIds.length} / artifact: {review.artifactPath}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DagPanel({
  graph,
  runs,
  changes,
  busy,
  activeNodeId,
  onRefresh,
  onRegisterChange,
  onRerunDirty,
}: {
  graph: DAGGraph | null;
  runs: DAGRun[];
  changes: DAGChangeEvent[];
  busy: boolean;
  activeNodeId: string | null;
  onRefresh: () => void;
  onRegisterChange: () => void;
  onRerunDirty: () => void;
}) {
  const dirtyCount = graph?.nodes.filter((node) => node.state === 'dirty').length ?? 0;
  const latestDirtyRun = runs.find((run) => run.dirtyNodes.length > 0);

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>DAG Impact</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRerunDirty} disabled={busy || !latestDirtyRun}>
            Rerun Dirty
          </button>
          <button type="button" className="secondary-button" onClick={onRegisterChange} disabled={busy || !activeNodeId}>
            Mark Active Dirty
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>
      {!graph ? (
        <div className="inspector-empty">No DAG graph available for the current scope.</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Graph</span>
            <strong>{graph.id}</strong>
          </div>
          <div className="inspector-field">
            <span>Nodes / Dirty / Runs</span>
            <strong>{graph.nodes.length} / {dirtyCount} / {runs.length}</strong>
          </div>
          <div className="inspector-field">
            <span>Recent Changes</span>
            <strong>{changes.length}</strong>
          </div>
          <div className="inspector-field">
            <span>Latest Dirty Run</span>
            <strong>{latestDirtyRun ? `${latestDirtyRun.id} / ${latestDirtyRun.status}` : '-'}</strong>
          </div>
          <div className="trace-list">
            {graph.nodes.slice(0, 8).map((node) => (
              <article key={node.id} className={`trace-event trace-event--${node.state === 'dirty' ? 'warning' : 'ok'}`}>
                <div className="trace-event__kind">{node.label}</div>
                <div className="trace-event__detail">
                  {node.id} / {node.state} / {node.priority}
                </div>
                <div className="trace-event__meta">depends on: {node.dependencies.join(', ') || '-'}</div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RetrievalGovernancePanel({
  settings,
  searchResult,
  busy,
  onRefresh,
  onSetMode,
  onIndex,
  onSearch,
}: {
  settings: RetrievalGovernance | null;
  searchResult: RetrievalSearchResponse | null;
  busy: boolean;
  onRefresh: () => void;
  onSetMode: (mode: RetrievalGovernance['mode']) => void;
  onIndex: () => void;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState('workflow metrics');

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>Retrieval Governance</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onIndex} disabled={busy || !settings?.indexingEnabled}>
            Index
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>
      {!settings ? (
        <div className="inspector-empty">No retrieval governance settings available.</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Mode</span>
            <strong>{settings.mode}</strong>
          </div>
          <div className="inspector-field">
            <span>Collection</span>
            <strong>{settings.collectionName}</strong>
          </div>
          <div className="inspector-field">
            <span>Last Index</span>
            <strong>{settings.lastIndexedAt ?? '-'}</strong>
          </div>
          <div className="inspector-field">
            <span>Chunks / TopK</span>
            <strong>{settings.lastIndexedChunkCount} / {settings.topK}</strong>
          </div>
          <div className="inspector-field">
            <span>Quality Gate</span>
            <strong>
              min chunks {settings.qualityGate.minChunkCount} / score {settings.qualityGate.minScore}
            </strong>
          </div>
          <div className="capability-actions">
            <button type="button" className="secondary-button" onClick={() => onSetMode('local-only')} disabled={busy}>
              Local Only
            </button>
            <button type="button" className="secondary-button" onClick={() => onSetMode('prefer-remote')} disabled={busy}>
              Prefer Remote
            </button>
            <button type="button" className="secondary-button" onClick={() => onSetMode('remote-required')} disabled={busy}>
              Remote Required
            </button>
          </div>
          <div className="form-grid">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search governed context" />
            <button type="button" className="primary-button" onClick={() => onSearch(query)} disabled={busy || !query.trim()}>
              Search
            </button>
          </div>
          {searchResult ? (
            <div className="trace-list">
              <article className={`trace-event trace-event--${searchResult.gate.passed ? 'ok' : 'warning'}`}>
                <div className="trace-event__kind">Gate {searchResult.gate.passed ? 'passed' : 'blocked'}</div>
                <div className="trace-event__detail">
                  results {searchResult.gate.resultCount} / chunks {searchResult.gate.indexedChunkCount} / truth{' '}
                  {searchResult.gate.truthSourceResultCount}
                </div>
                <div className="trace-event__meta">{searchResult.gate.reasons.join('; ') || 'quality gate passed'}</div>
              </article>
              {searchResult.items.slice(0, 3).map((item) => (
                <article key={item.id} className="trace-event trace-event--ok">
                  <div className="trace-event__kind">{String(item.metadata.path ?? item.id)}</div>
                  <div className="trace-event__detail">score {item.score.toFixed(2)}</div>
                  <div className="trace-event__meta">{item.content.slice(0, 160)}</div>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function CapabilityPanel({
  capabilities,
  datasets,
  evaluationRuns,
  evaluationHistory,
  requirements,
  versionEntries,
  filteredCapabilityIds,
  selectedCapabilityId,
  selectedEvaluationRunId,
  selectedRequirementIds,
  busy,
  registrationDraft,
  publishDraft,
  onRegistrationDraftChange,
  onPublishDraftChange,
  onCreateCapability,
  onSelectCapability,
  onToggleRequirement,
  onSelectEvaluationRun,
  onRefresh,
  onCreateDataset,
  onRunEvaluation,
  onPublish,
  onRollbackVersion,
  onInvoke,
}: {
  capabilities: CapabilityDefinition[];
  datasets: EvaluationDataset[];
  evaluationRuns: EvaluationRun[];
  evaluationHistory: EvaluationHistory | null;
  requirements: Requirement[];
  versionEntries: VersionEntry[];
  filteredCapabilityIds: string[];
  selectedCapabilityId: string | null;
  selectedEvaluationRunId: string | null;
  selectedRequirementIds: string[];
  busy: boolean;
  registrationDraft: {
    name: string;
    description: string;
    implementationType: 'product-agent' | 'workflow';
    implementationRef: string;
    version: string;
    visibility: 'private' | 'internal' | 'public';
    permissions: string;
    tags: string;
    acceptanceCriteria: string;
  };
  publishDraft: {
    releaseNotes: string;
    reviewSummary: string;
  };
  onRegistrationDraftChange: (field: string, value: string) => void;
  onPublishDraftChange: (field: 'releaseNotes' | 'reviewSummary', value: string) => void;
  onCreateCapability: () => void;
  onSelectCapability: (capabilityId: string) => void;
  onToggleRequirement: (requirementId: string) => void;
  onSelectEvaluationRun: (runId: string) => void;
  onRefresh: () => void;
  onCreateDataset: () => void;
  onRunEvaluation: () => void;
  onPublish: () => void;
  onRollbackVersion: (version: string) => void;
  onInvoke: () => void;
}) {
  const visibleCapabilities =
    filteredCapabilityIds.length > 0 ? capabilities.filter((item) => filteredCapabilityIds.includes(item.id)) : capabilities;
  const selectedCapability = visibleCapabilities.find((item) => item.id === selectedCapabilityId) ?? visibleCapabilities[0] ?? null;
  const selectedVersion = selectedCapability?.activeVersion ?? selectedCapability?.versions[0]?.version ?? null;
  const capabilityDatasets = selectedCapability
    ? datasets.filter((dataset) => dataset.capabilityId === selectedCapability.id && dataset.version === selectedVersion)
    : [];
  const capabilityRuns = selectedCapability
    ? evaluationRuns.filter((run) => run.capabilityId === selectedCapability.id && run.version === selectedVersion).slice(0, 4)
    : [];
  const activeVersion = selectedCapability?.versions.find((version) => version.version === selectedVersion) ?? selectedCapability?.versions[0] ?? null;
  const selectedEvaluationRun =
    capabilityRuns.find((run) => run.id === selectedEvaluationRunId) ?? capabilityRuns[0] ?? null;
  const capabilityHistoryItems = selectedCapability
    ? (evaluationHistory?.items ?? []).filter((item) => item.run.capabilityId === selectedCapability.id)
    : [];

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>Capability Ops</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onCreateCapability} disabled={busy}>
            Register
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>
      <div className="capability-form">
        <label className="sidebar-label">
          Name
          <input
            value={registrationDraft.name}
            onChange={(event) => onRegistrationDraftChange('name', event.target.value)}
            placeholder="Launch Agent Capability"
          />
        </label>
        <label className="sidebar-label">
          Description
          <textarea
            value={registrationDraft.description}
            onChange={(event) => onRegistrationDraftChange('description', event.target.value)}
            rows={3}
            placeholder="What this capability is for"
          />
        </label>
        <label className="sidebar-label">
          Type
          <select
            value={registrationDraft.implementationType}
            onChange={(event) => onRegistrationDraftChange('implementationType', event.target.value)}
          >
            <option value="workflow">workflow</option>
            <option value="product-agent">product-agent</option>
          </select>
        </label>
        <label className="sidebar-label">
          Implementation Ref
          <input
            value={registrationDraft.implementationRef}
            onChange={(event) => onRegistrationDraftChange('implementationRef', event.target.value)}
            placeholder={registrationDraft.implementationType === 'workflow' ? 'pmaios-main' : 'product-agent-xxx'}
          />
        </label>
        <div className="capability-form-grid">
          <label className="sidebar-label">
            Version
            <input value={registrationDraft.version} onChange={(event) => onRegistrationDraftChange('version', event.target.value)} />
          </label>
          <label className="sidebar-label">
            Visibility
            <select value={registrationDraft.visibility} onChange={(event) => onRegistrationDraftChange('visibility', event.target.value)}>
              <option value="internal">internal</option>
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
          </label>
        </div>
        <label className="sidebar-label">
          Permissions
          <input
            value={registrationDraft.permissions}
            onChange={(event) => onRegistrationDraftChange('permissions', event.target.value)}
            placeholder="capability:invoke, workflow:run"
          />
        </label>
        <label className="sidebar-label">
          Tags
          <input
            value={registrationDraft.tags}
            onChange={(event) => onRegistrationDraftChange('tags', event.target.value)}
            placeholder="launch, release"
          />
        </label>
        <label className="sidebar-label">
          Acceptance
          <input
            value={registrationDraft.acceptanceCriteria}
            onChange={(event) => onRegistrationDraftChange('acceptanceCriteria', event.target.value)}
            placeholder="can be published, can be invoked"
          />
        </label>
      </div>
      {visibleCapabilities.length === 0 ? (
        <div className="inspector-empty">还没有 capability。先通过 API 注册 capability，面板会自动显示。</div>
      ) : (
        <>
          <div className="capability-list">
            {visibleCapabilities.map((capability) => {
              const version = capability.activeVersion ?? capability.versions[0]?.version ?? '-';
              const gate = capability.versions.find((item) => item.version === version)?.gate;
              return (
                <button
                  key={capability.id}
                  type="button"
                  className={capability.id === selectedCapability?.id ? 'session-card session-card--active' : 'session-card'}
                  onClick={() => onSelectCapability(capability.id)}
                >
                  <strong>{capability.name}</strong>
                  <span>{capability.implementationType}</span>
                  <span>{capability.lifecycleStatus} / v{version}</span>
                  <span>{gate?.publishable ? 'gate: pass' : `gate: ${gate?.reasons.join(', ') ?? 'pending'}`}</span>
                </button>
              );
            })}
          </div>
          {selectedCapability ? (
            <>
              <div className="inspector-field">
                <span>Capability ID</span>
                <strong>{selectedCapability.id}</strong>
              </div>
              <div className="inspector-field">
                <span>Description</span>
                <strong>{selectedCapability.description}</strong>
              </div>
              <div className="inspector-field">
                <span>Permissions</span>
                <strong>{selectedCapability.permissions.join(', ') || '-'}</strong>
              </div>
              <div className="inspector-field">
                <span>Gate</span>
                <strong>{activeVersion?.gate.publishable ? 'Publishable' : activeVersion?.gate.reasons.join(', ') || 'Pending'}</strong>
              </div>
              <div className="inspector-field">
                <span>Linked Requirements</span>
                <strong>{selectedRequirementIds.length}</strong>
              </div>
              <div className="capability-form">
                <label className="sidebar-label">
                  Release Notes
                  <textarea
                    value={publishDraft.releaseNotes}
                    onChange={(event) => onPublishDraftChange('releaseNotes', event.target.value)}
                    rows={3}
                    placeholder="What changed in this version"
                  />
                </label>
                <label className="sidebar-label">
                  Review Summary
                  <input
                    value={publishDraft.reviewSummary}
                    onChange={(event) => onPublishDraftChange('reviewSummary', event.target.value)}
                    placeholder="Gate / release summary"
                  />
                </label>
              </div>
              <div className="capability-requirement-list">
                {requirements.length === 0 ? (
                  <div className="inspector-empty">暂无 requirement 可绑定。</div>
                ) : (
                  requirements.slice(0, 8).map((requirement) => (
                    <button
                      key={requirement.id}
                      type="button"
                      className={
                        selectedRequirementIds.includes(requirement.id)
                          ? 'session-card session-card--active'
                          : 'session-card'
                      }
                      onClick={() => onToggleRequirement(requirement.id)}
                    >
                      <strong>{requirement.title}</strong>
                      <span>{requirement.category} / {requirement.priority}</span>
                      <span>{requirement.id}</span>
                    </button>
                  ))
                )}
              </div>
              <div className="capability-actions">
                <button type="button" className="secondary-button" onClick={onCreateDataset} disabled={busy}>
                  Create Dataset
                </button>
                <button type="button" className="secondary-button" onClick={onRunEvaluation} disabled={busy || capabilityDatasets.length === 0}>
                  Run Eval
                </button>
                <button type="button" className="secondary-button" onClick={onPublish} disabled={busy}>
                  Publish
                </button>
                <button type="button" className="primary-button" onClick={onInvoke} disabled={busy || !selectedCapability.activeVersion}>
                  Invoke
                </button>
              </div>
              <div className="inspector-field">
                <span>Version History</span>
                <strong>{selectedCapability.versions.length}</strong>
              </div>
              <div className="trace-list">
                {selectedCapability.versions.map((version) => (
                  <article key={version.version} className={`trace-event trace-event--${version.gate.publishable ? 'ok' : 'warning'}`}>
                    <div className="trace-event__kind">{version.version}</div>
                    <div className="trace-event__detail">
                      {version.status} / publishable: {version.gate.publishable ? 'yes' : 'no'}
                    </div>
                    <div className="trace-event__meta">
                      tests: {String(version.gate.testsPassed)} / review: {String(version.gate.reviewPassed)} / eval: {String(version.gate.evaluationPassed)}
                    </div>
                    {version.releaseNotes ? <div className="trace-event__artifact">{version.releaseNotes}</div> : null}
                    {version.reviewSummary ? <div className="trace-event__artifact">{version.reviewSummary}</div> : null}
                    {version.version !== selectedCapability.activeVersion && version.gate.publishable ? (
                      <div className="provider-route-chip__actions">
                        <button type="button" className="secondary-button" onClick={() => onRollbackVersion(version.version)} disabled={busy}>
                          Rollback Here
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="inspector-field">
                <span>Datasets</span>
                <strong>{capabilityDatasets.length}</strong>
              </div>
              <div className="trace-list">
                {capabilityDatasets.slice(0, 3).map((dataset) => (
                  <article key={dataset.id} className="trace-event">
                    <div className="trace-event__kind">{dataset.name}</div>
                    <div className="trace-event__detail">{dataset.description}</div>
                    <div className="trace-event__meta">{dataset.cases.length} cases</div>
                  </article>
                ))}
              </div>
              <div className="inspector-field">
                <span>Recent Eval Runs</span>
                <strong>{capabilityRuns.length}</strong>
              </div>
              <div className="trace-list">
                {capabilityRuns.length === 0 ? (
                  <div className="inspector-empty">暂无 evaluation run。</div>
                ) : (
                  capabilityRuns.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      className={
                        selectedEvaluationRun?.id === run.id
                          ? `trace-event trace-event-button trace-event--${run.passed === false ? 'warning' : 'ok'} trace-event--active`
                          : `trace-event trace-event-button trace-event--${run.passed === false ? 'warning' : 'ok'}`
                      }
                      onClick={() => onSelectEvaluationRun(run.id)}
                    >
                      <div className="trace-event__kind">{run.evaluator}</div>
                      <div className="trace-event__detail">{run.summary ?? run.status}</div>
                      <div className="trace-event__meta">
                        score: {run.aggregatedScore ?? '-'} / passed: {String(run.passed ?? false)}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="inspector-field">
                <span>Selected Eval Run</span>
                <strong>{selectedEvaluationRun?.id ?? '-'}</strong>
              </div>
              {selectedEvaluationRun ? (
                <div className="trace-list">
                  {selectedEvaluationRun.caseResults.map((result) => (
                    <article
                      key={result.caseId}
                      className={`trace-event trace-event--${result.passed ? 'ok' : 'warning'}`}
                    >
                      <div className="trace-event__kind">{result.caseId}</div>
                      <div className="trace-event__detail">
                        passed: {String(result.passed)} / score: {result.score}
                      </div>
                      <div className="trace-event__meta">{result.summary}</div>
                      {result.output !== null ? (
                        <pre className="trace-event__output">{JSON.stringify(result.output, null, 2)}</pre>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
              <div className="inspector-field">
                <span>Evaluation Drill-down</span>
                <strong>
                  {capabilityHistoryItems.length} runs / {evaluationHistory?.summary.requirementCount ?? 0} req links /{' '}
                  {evaluationHistory?.summary.versionEntryCount ?? 0} version links
                </strong>
              </div>
              <div className="trace-list">
                {capabilityHistoryItems.length === 0 ? (
                  <div className="inspector-empty">No linked evaluation history found for this capability.</div>
                ) : (
                  capabilityHistoryItems.slice(0, 5).map((item) => (
                    <article key={item.run.id} className={`trace-event trace-event--${item.run.passed === false ? 'warning' : 'ok'}`}>
                      <div className="trace-event__kind">{item.capability?.name ?? item.run.capabilityId}</div>
                      <div className="trace-event__detail">
                        {item.run.version} / {item.dataset?.name ?? item.run.datasetId} / score {item.run.aggregatedScore ?? '-'}
                      </div>
                      <div className="trace-event__meta">
                        requirements:{' '}
                        {item.requirementIds
                          .map((id) => requirements.find((requirement) => requirement.id === id)?.title ?? id)
                          .slice(0, 3)
                          .join(' | ') || '-'}
                      </div>
                      <div className="trace-event__artifact">
                        versions:{' '}
                        {item.versionEntryIds
                          .map((id) => versionEntries.find((entry) => entry.id === id)?.summary ?? id)
                          .slice(0, 3)
                          .join(' | ') || '-'}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function RequirementVersionPanel({
  requirements,
  versions,
  capabilities,
  runs,
  activeSessionId,
  activeMessageId,
  selectedRequirementId,
  selectedVersionId,
  selectedBatchRequirementIds,
  busy,
  onSelectRequirement,
  onSelectVersion,
  onToggleBatchRequirement,
  onUpdateRequirementStatus,
  onBatchUpdateRequirementStatus,
  onSelectCapability,
  onSelectRun,
  onRefresh,
  onIngestCurrentChat,
  onCreateManualRequirement,
  onRollbackVersion,
  requirementPoolWorkbookPath,
}: {
  requirements: Requirement[];
  versions: VersionEntry[];
  capabilities: CapabilityDefinition[];
  runs: ExecutionRun[];
  activeSessionId: string | null;
  activeMessageId: string | null;
  selectedRequirementId: string | null;
  selectedVersionId: string | null;
  selectedBatchRequirementIds: string[];
  busy: boolean;
  onSelectRequirement: (requirementId: string | null) => void;
  onSelectVersion: (versionId: string | null) => void;
  onToggleBatchRequirement: (requirementId: string) => void;
  onUpdateRequirementStatus: (requirementId: string, status: Requirement['status']) => void;
  onBatchUpdateRequirementStatus: (status: Requirement['status']) => void;
  onSelectCapability: (capabilityId: string) => void;
  onSelectRun: (runId: string) => void;
  onRefresh: () => void;
  onIngestCurrentChat: () => void;
  onCreateManualRequirement: () => void;
  onRollbackVersion: (entry: VersionEntry) => void;
  requirementPoolWorkbookPath: string;
}) {
  const selectedRequirement = requirements.find((requirement) => requirement.id === selectedRequirementId) ?? null;
  const relatedVersions = selectedRequirement
    ? versions.filter((entry) => selectedRequirement.trace.linkedVersionIds.includes(entry.id))
    : versions.slice(0, 6);
  const selectedVersion = relatedVersions.find((entry) => entry.id === selectedVersionId) ?? relatedVersions[0] ?? null;
  const relatedCapabilityIds = [...new Set(relatedVersions.filter((entry) => entry.entityType === 'capability').map((entry) => entry.entityId))];
  const relatedCapabilities = capabilities.filter((capability) => relatedCapabilityIds.includes(capability.id));
  const relatedRunIds = [
    ...new Set(
      [
        ...(selectedRequirement?.trace.linkedRunIds ?? []),
        ...relatedVersions.map((entry) => entry.runId).filter((runId): runId is string => Boolean(runId)),
      ],
    ),
  ];
  const relatedRuns = runs.filter((run) => relatedRunIds.includes(run.id));
  const [poolFilter, setPoolFilter] = useState<'all' | 'platform' | 'subproject'>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<'all' | string>('all');
  const [sourceKindFilter, setSourceKindFilter] = useState<'all' | Requirement['source']['kind']>('all');
  const lifecycleOptions = [...new Set(requirements.map((requirement) => readRequirementLifecycle(requirement)).filter(Boolean))];
  const sourceKindOptions = [...new Set(requirements.map((requirement) => requirement.source.kind).filter(Boolean))];
  const filteredRequirements = requirements.filter((requirement) => {
    const poolScope = readRequirementPoolScope(requirement);
    const lifecycle = readRequirementLifecycle(requirement);
    if (poolFilter !== 'all' && poolScope !== poolFilter) {
      return false;
    }
    if (lifecycleFilter !== 'all' && lifecycle !== lifecycleFilter) {
      return false;
    }
    if (sourceKindFilter !== 'all' && requirement.source.kind !== sourceKindFilter) {
      return false;
    }
    return true;
  });
  const requirementLifecycleSummary = lifecycleOptions.map((lifecycle) => ({
    lifecycle,
    count: requirements.filter((requirement) => readRequirementLifecycle(requirement) === lifecycle).length,
  }));
  const groupedRequirements = lifecycleOptions
    .map((lifecycle) => ({
      lifecycle,
      items: filteredRequirements.filter((requirement) => readRequirementLifecycle(requirement) === lifecycle),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>Requirement + Version Desk</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onCreateManualRequirement} disabled={busy}>
            New Manual Req
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onIngestCurrentChat}
            disabled={busy || !activeSessionId}
          >
            Ingest Current Chat
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>
      <div className="inspector-field">
        <span>Current Session</span>
        <strong>{activeSessionId ?? '-'}</strong>
      </div>
      <div className="inspector-field">
        <span>Active Message</span>
        <strong>{activeMessageId ?? '-'}</strong>
      </div>
      <div className="inspector-field">
        <span>Requirements</span>
        <strong>{requirements.length}</strong>
      </div>
      <div className="inspector-field">
        <span>Visible After Filter</span>
        <strong>{filteredRequirements.length}</strong>
      </div>
      <div className="inspector-field">
        <span>Batch Selection</span>
        <strong>{selectedBatchRequirementIds.length}</strong>
      </div>
      <article className="trace-event trace-event--ok" style={{ marginBottom: 10 }}>
        <div className="trace-event__kind">excel pool</div>
        <div className="trace-event__detail">
          <a href={buildFileApiUrl(requirementPoolWorkbookPath)} target="_blank" rel="noreferrer">
            open workbook
          </a>
        </div>
        <div className="trace-event__meta">{requirementPoolWorkbookPath}</div>
      </article>
      <div className="capability-form">
        <div className="capability-form-grid">
          <label className="sidebar-label">
            Pool
            <select value={poolFilter} onChange={(event) => setPoolFilter(event.target.value as 'all' | 'platform' | 'subproject')}>
              <option value="all">all</option>
              <option value="platform">platform</option>
              <option value="subproject">subproject</option>
            </select>
          </label>
          <label className="sidebar-label">
            Lifecycle
            <select value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value)}>
              <option value="all">all</option>
              {lifecycleOptions.map((lifecycle) => (
                <option key={lifecycle} value={lifecycle}>
                  {lifecycle}
                </option>
              ))}
            </select>
          </label>
          <label className="sidebar-label">
            Source
            <select value={sourceKindFilter} onChange={(event) => setSourceKindFilter(event.target.value as 'all' | Requirement['source']['kind'])}>
              <option value="all">all</option>
              {sourceKindOptions.map((sourceKind) => (
                <option key={sourceKind} value={sourceKind}>
                  {sourceKind}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="trace-list" style={{ marginBottom: 10 }}>
        {requirementLifecycleSummary.map((item) => (
          <article key={item.lifecycle} className="trace-event trace-event--ok">
            <div className="trace-event__kind">lifecycle</div>
            <div className="trace-event__detail">{item.lifecycle}</div>
            <div className="trace-event__meta">{item.count} requirements</div>
          </article>
        ))}
      </div>
      <div className="trace-list">
        {filteredRequirements.length === 0 ? (
          <div className="inspector-empty">暂无 requirement。</div>
        ) : (
          groupedRequirements.map((group) => (
            <div key={group.lifecycle} style={{ display: 'contents' }}>
              <article className="trace-event trace-event--ok">
                <div className="trace-event__kind">group</div>
                <div className="trace-event__detail">{group.lifecycle}</div>
                <div className="trace-event__meta">{group.items.length} visible requirements</div>
              </article>
              {group.items.slice(0, 6).map((requirement) => (
                <button
                  key={requirement.id}
                  type="button"
                  className={
                    requirement.id === selectedRequirement?.id
                      ? 'trace-event trace-event-button trace-event--active'
                      : 'trace-event trace-event-button'
                  }
                  onClick={() => {
                    onSelectRequirement(requirement.id === selectedRequirement?.id ? null : requirement.id);
                    onSelectVersion(null);
                  }}
                >
                  <div className="trace-event__kind">{requirement.category}</div>
                  <div className="trace-event__detail">{requirement.title}</div>
                  <div className="trace-event__meta">
                    {requirement.priority} / {requirement.status} / source: {requirement.source.kind}
                  </div>
                  <div className="trace-event__meta">
                    pool: {readRequirementPoolScope(requirement)} / lifecycle: {readRequirementLifecycle(requirement)}
                  </div>
                  <div className="trace-event__meta">
                    versions: {requirement.trace.linkedVersionIds.length} / runs: {requirement.trace.linkedRunIds.length} / related:{' '}
                    {requirement.trace.relatedRequirementIds.length}
                  </div>
                  <div className="trace-event__meta">
                    batch: {selectedBatchRequirementIds.includes(requirement.id) ? 'selected' : 'not selected'}
                  </div>
                  {requirement.trace.linkedRunIds.length > 0 ? (
                    <div className="trace-event__artifact">runs: {requirement.trace.linkedRunIds.join(', ')}</div>
                  ) : null}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
      {selectedRequirement ? (
        <div className="capability-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onToggleBatchRequirement(selectedRequirement.id)}
            disabled={busy}
          >
            {selectedBatchRequirementIds.includes(selectedRequirement.id) ? 'Remove From Batch' : 'Add To Batch'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onUpdateRequirementStatus(selectedRequirement.id, 'active')}
            disabled={busy || selectedRequirement.status === 'active'}
          >
            Mark Active
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onUpdateRequirementStatus(selectedRequirement.id, 'done')}
            disabled={busy || selectedRequirement.status === 'done'}
          >
            Mark Done
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onUpdateRequirementStatus(selectedRequirement.id, 'archived')}
            disabled={busy || selectedRequirement.status === 'archived'}
          >
            Archive
          </button>
        </div>
      ) : null}
      {selectedBatchRequirementIds.length > 0 ? (
        <div className="capability-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onBatchUpdateRequirementStatus('active')}
            disabled={busy}
          >
            Batch Activate
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onBatchUpdateRequirementStatus('done')}
            disabled={busy}
          >
            Batch Done
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onBatchUpdateRequirementStatus('archived')}
            disabled={busy}
          >
            Batch Archive
          </button>
        </div>
      ) : null}
      <div className="inspector-field">
        <span>Version Entries</span>
        <strong>{versions.length}</strong>
      </div>
      <div className="trace-list">
        {relatedVersions.length === 0 ? (
          <div className="inspector-empty">暂无 version entry。</div>
        ) : (
          relatedVersions.slice(0, 6).map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={
                entry.id === selectedVersion?.id
                  ? 'trace-event trace-event-button trace-event--active'
                  : 'trace-event trace-event-button'
              }
              onClick={() => onSelectVersion(entry.id === selectedVersion?.id ? null : entry.id)}
            >
              <div className="trace-event__kind">{entry.changeType}</div>
              <div className="trace-event__detail">{entry.summary}</div>
              <div className="trace-event__meta">
                {entry.entityType} / {entry.entityId}
              </div>
              <div className="trace-event__meta">
                requirements: {entry.requirementIds.length} / run: {entry.runId ?? '-'}
              </div>
              <div className="trace-event__meta">
                {entry.previousVersion ?? '-'} 鈫?{entry.newVersion ?? '-'}
              </div>
            </button>
          ))
        )}
      </div>
      {selectedVersion ? (
        <>
          <div className="inspector-field">
            <span>Version Approval</span>
            <strong>
              {selectedVersion.approval
                ? `${selectedVersion.approval.approved ? 'approved' : 'rejected'} / ${selectedVersion.approval.approver ?? 'unknown'}`
                : '-'}
            </strong>
          </div>
          <div className="inspector-field">
            <span>Diff Summary</span>
            <strong>{selectedVersion.diffSummary ?? '-'}</strong>
          </div>
          <div className="inspector-field">
            <span>Release Notes</span>
            <strong>{selectedVersion.releaseNotes ?? '-'}</strong>
          </div>
          {selectedVersion.entityType === 'capability' && selectedVersion.newVersion ? (
            <div className="capability-actions">
              <button type="button" className="secondary-button" onClick={() => onRollbackVersion(selectedVersion)} disabled={busy}>
                Rollback To {selectedVersion.newVersion}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {selectedRequirement ? (
        <>
          <div className="inspector-field">
            <span>Related Capabilities</span>
            <strong>{relatedCapabilities.length}</strong>
          </div>
          <div className="trace-list">
            {relatedCapabilities.length === 0 ? (
              <div className="inspector-empty">当前 requirement 暂无 capability 变更。</div>
            ) : (
              relatedCapabilities.map((capability) => (
                <button
                  key={capability.id}
                  type="button"
                  className="trace-event trace-event-button"
                  onClick={() => onSelectCapability(capability.id)}
                >
                  <div className="trace-event__kind">{capability.implementationType}</div>
                  <div className="trace-event__detail">{capability.name}</div>
                  <div className="trace-event__meta">{capability.id}</div>
                </button>
              ))
            )}
          </div>
          <div className="inspector-field">
            <span>Related Execution Runs</span>
            <strong>{relatedRuns.length}</strong>
          </div>
          <div className="trace-list">
            {relatedRuns.length === 0 ? (
              <div className="inspector-empty">当前 requirement 还没有可直接打开的 execution run。</div>
            ) : (
              relatedRuns.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className="trace-event trace-event-button"
                  onClick={() => onSelectRun(run.id)}
                >
                  <div className="trace-event__kind">{run.runType}</div>
                  <div className="trace-event__detail">{run.id}</div>
                  <div className="trace-event__meta">{run.status}</div>
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function readRequirementPoolScope(requirement: Requirement) {
  return typeof requirement.metadata.poolScope === 'string' ? requirement.metadata.poolScope : 'unknown';
}

function readRequirementLifecycle(requirement: Requirement) {
  return typeof requirement.metadata.lifecycle === 'string' ? requirement.metadata.lifecycle : 'unknown';
}

export default function App() {
  const [inspectorView, setInspectorView] = useState<'outputs' | 'monitoring' | 'assets'>('outputs');
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [contextSnapshots, setContextSnapshots] = useState<ContextSnapshot[]>([]);
  const [selectedRun, setSelectedRun] = useState<ExecutionRun | null>(null);
  const [selectedContextSnapshot, setSelectedContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<MultimodalArtifact | null>(null);
  const [selectedObservability, setSelectedObservability] = useState<ExecutionObservability | null>(null);
  const [selectedReview, setSelectedReview] = useState<CommitteeReport | null>(null);
  const [runEvents, setRunEvents] = useState<ExecutionEvent[]>([]);
  const [providerRouting, setProviderRouting] = useState<ProviderRoutingSnapshot[]>([]);
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>([]);
  const [productAgents, setProductAgents] = useState<ProductAgent[]>([]);
  const [productAgentBlueprints, setProductAgentBlueprints] = useState<ProductAgentBlueprintSummary[]>([]);
  const [productSkillSurface, setProductSkillSurface] = useState<ProductSkillSurface | null>(null);
  const [codexLocalState, setCodexLocalState] = useState<CodexLocalStateSnapshot | null>(null);
  const [externalConnectorStatus, setExternalConnectorStatus] = useState<ExternalConnectorStatus | null>(null);
  const [latestWebFetch, setLatestWebFetch] = useState<WebFetchArtifact | null>(null);
  const [latestFigmaInspection, setLatestFigmaInspection] = useState<FigmaInspection | null>(null);
  const [latestDingTalkImport, setLatestDingTalkImport] = useState<DingTalkMeetingImportResult | null>(null);
  const [latestDatakiKnowledgeBases, setLatestDatakiKnowledgeBases] = useState<DatakiKnowledgeBaseSummary[]>([]);
  const [latestDatakiKnowledgeFiles, setLatestDatakiKnowledgeFiles] = useState<DatakiKnowledgeFileSummary[]>([]);
  const [latestDatakiSearch, setLatestDatakiSearch] = useState<DatakiKnowledgeSearchItem[]>([]);
  const [productChiefReports, setProductChiefReports] = useState<ProductChiefReport[]>([]);
  const [productChiefOutputs, setProductChiefOutputs] = useState<ProductChiefOutput[]>([]);
  const [latestUiSchemaContract, setLatestUiSchemaContract] = useState<UISchemaContract | null>(null);
  const [productChiefImageBatches, setProductChiefImageBatches] = useState<ProductChiefImageBatch[]>([]);
  const [productChiefReviews, setProductChiefReviews] = useState<ProductChiefMultiAgentReview[]>([]);
  const [multiPmGroupSessions, setMultiPmGroupSessions] = useState<MultiPmGroupSession[]>([]);
  const [dagGraph, setDagGraph] = useState<DAGGraph | null>(null);
  const [dagRuns, setDagRuns] = useState<DAGRun[]>([]);
  const [dagChanges, setDagChanges] = useState<DAGChangeEvent[]>([]);
  const [retrievalGovernance, setRetrievalGovernance] = useState<RetrievalGovernance | null>(null);
  const [retrievalSearchResult, setRetrievalSearchResult] = useState<RetrievalSearchResponse | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>([]);
  const [evaluationDatasets, setEvaluationDatasets] = useState<EvaluationDataset[]>([]);
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([]);
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistory | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [versionEntries, setVersionEntries] = useState<VersionEntry[]>([]);
  const [mcpModeState, setMcpModeState] = useState<CollaborationModeState | null>(null);
  const [mcpModeHistory, setMcpModeHistory] = useState<CollaborationModeEntry[]>([]);
  const [mcpTasks, setMcpTasks] = useState<SharedTask[]>([]);
  const [mcpCheckpoints, setMcpCheckpoints] = useState<SharedCheckpoint[]>([]);
  const [mcpEvents, setMcpEvents] = useState<SharedEvent[]>([]);
  const [taskSsotState, setTaskSsotState] = useState<TaskSsotStateResponse | null>(null);
  const [schedulerRuns, setSchedulerRuns] = useState<SchedulerRunsResponse | null>(null);
  const [finalStateValidation, setFinalStateValidation] = useState<FinalStateValidationReport | null>(null);
  const [liveBrowserVerificationRun, setLiveBrowserVerificationRun] = useState<LiveBrowserVerificationRun | null>(null);
  const [browserVerificationBusy, setBrowserVerificationBusy] = useState(false);
  const [outboxEnvelopes, setOutboxEnvelopes] = useState<TaskSsotSyncEnvelope[]>([]);
  const [proofOfWorkBundle, setProofOfWorkBundle] = useState<ProofOfWorkBundle | null>(null);
  const [executionChecklistSummary, setExecutionChecklistSummary] = useState<ExecutionChecklistSummary | null>(null);
  const [dailyDigests, setDailyDigests] = useState<DailyDigestEntry[]>([]);
  const [projectEntries, setProjectEntries] = useState<ProjectEntrySummary[]>([]);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics | null>(null);
  const [workflowReview, setWorkflowReview] = useState<CommitteeReport | null>(null);
  const [hermesPolicy, setHermesPolicy] = useState<HermesPolicyReport | null>(null);
  const [v07RuntimeGovernance, setV07RuntimeGovernance] = useState<V07RuntimeGovernanceSnapshot | null>(null);
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
  const [selectedBatchRequirementIds, setSelectedBatchRequirementIds] = useState<string[]>([]);
  const [selectedTraceRequirementId, setSelectedTraceRequirementId] = useState<string | null>(null);
  const [selectedTraceVersionId, setSelectedTraceVersionId] = useState<string | null>(null);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  const [selectedEvaluationRunId, setSelectedEvaluationRunId] = useState<string | null>(null);
  const [capabilityDraft, setCapabilityDraft] = useState({
    name: '',
    description: '',
    implementationType: 'workflow' as 'product-agent' | 'workflow',
    implementationRef: 'pmaios-main',
    version: '0.1.0',
    visibility: 'internal' as 'private' | 'internal' | 'public',
    permissions: '',
    tags: '',
    acceptanceCriteria: '',
  });
  const [publishDraft, setPublishDraft] = useState({
    releaseNotes: '',
    reviewSummary: '',
  });
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechOutputSupported, setSpeechOutputSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [capabilityBusy, setCapabilityBusy] = useState(false);
  const [traceBusy, setTraceBusy] = useState(false);
  const [providerRoutingBusy, setProviderRoutingBusy] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [schedulerBusy, setSchedulerBusy] = useState(false);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [productAgentBusy, setProductAgentBusy] = useState(false);
  const [externalConnectorBusy, setExternalConnectorBusy] = useState(false);
  const [productChiefBusy, setProductChiefBusy] = useState(false);
  const [dagBusy, setDagBusy] = useState(false);
  const [retrievalBusy, setRetrievalBusy] = useState(false);
  const [hermesBusy, setHermesBusy] = useState(false);
  const [v07RuntimeBusy, setV07RuntimeBusy] = useState(false);
  const [mcpContextBusy, setMcpContextBusy] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const productOutputsSectionRef = useRef<HTMLDivElement | null>(null);
  const capabilitySectionRef = useRef<HTMLDivElement | null>(null);
  const requirementSectionRef = useRef<HTMLDivElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const selectedSubproject = useMemo(
    () => subprojects.find((subproject) => subproject.id === selectedSubprojectId) ?? null,
    [selectedSubprojectId, subprojects],
  );
  const providerRoutingScopeLabel = useMemo(
    () => (selectedSubproject ? `${selectedSubproject.name} preferred provider` : 'platform default provider'),
    [selectedSubproject],
  );
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant') ?? null,
    [messages],
  );
  const playableMessage = useMemo(() => {
    const activeMessage = messages.find((message) => message.id === activeMessageId) ?? null;
    if (activeMessage?.role === 'assistant') {
      return activeMessage;
    }
    return latestAssistantMessage;
  }, [activeMessageId, latestAssistantMessage, messages]);
  const selectedCapability = useMemo(
    () => capabilities.find((capability) => capability.id === selectedCapabilityId) ?? capabilities[0] ?? null,
    [capabilities, selectedCapabilityId],
  );
  const latestRequirementTitle = useMemo(() => requirements[0]?.title ?? '暂无需求', [requirements]);
  const latestVersionSummary = useMemo(() => versionEntries[0]?.summary ?? '暂无版本', [versionEntries]);
  const latestCapabilityName = useMemo(() => capabilities[0]?.name ?? '暂无 capability', [capabilities]);
  const latestDatasetName = useMemo(() => evaluationDatasets[0]?.name ?? '暂无评测集', [evaluationDatasets]);
  const latestProductOutputTitle = useMemo(() => productChiefOutputs[0]?.title ?? '暂无 PM 产出', [productChiefOutputs]);
  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  useEffect(() => {
    const activeVersion = selectedCapability?.versions.find((version) => version.version === selectedCapability.activeVersion) ?? selectedCapability?.versions[0] ?? null;
    setPublishDraft({
      releaseNotes: activeVersion?.releaseNotes ?? '',
      reviewSummary: activeVersion?.reviewSummary ?? '',
    });
  }, [selectedCapability]);
  const filteredCapabilityIds = useMemo(() => {
    if (!selectedTraceRequirementId) {
      return [];
    }
    const requirement = requirements.find((item) => item.id === selectedTraceRequirementId);
    if (!requirement) {
      return [];
    }

    return [
      ...new Set(
        versionEntries
          .filter((entry) => requirement.trace.linkedVersionIds.includes(entry.id) && entry.entityType === 'capability')
          .map((entry) => entry.entityId),
      ),
    ];
  }, [requirements, selectedTraceRequirementId, versionEntries]);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setVoiceStatus('Speech output is not supported in this browser.');
        return;
      }
      if (!text.trim()) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1;
      utterance.onstart = () => {
        setIsSpeaking(true);
        setVoiceStatus('姝ｅ湪鎾姤鍥炲...');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setVoiceStatus('Playback completed.');
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setVoiceStatus('Speech playback failed.');
      };
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceStatus('Speech input is not supported in this browser.');
      return;
    }

    stopSpeaking();
    recognitionRef.current?.stop();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('姝ｅ湪鍚綘璇磋瘽...');
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join('')
        .trim();
      if (!transcript) {
        return;
      }
      setDraft(transcript);
      setVoiceStatus('Speech recognized. Ready to send.');
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setVoiceStatus('Microphone permission was denied.');
        return;
      }
      if (event.error === 'no-speech') {
        setVoiceStatus('No speech detected. Try again.');
        return;
      }
      setVoiceStatus(`Speech recognition failed: ${event.error}`);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [stopSpeaking]);

  const loadSessionData = useCallback(async (sessionId: string, subprojectId: string | null) => {
    const [messagesResult, runsResult] = await Promise.all([listMessages(sessionId, subprojectId), listRuns(sessionId, subprojectId)]);
    setMessages(messagesResult.items);
    setRuns(runsResult.items);
    setSelectedRun(null);
    setSelectedContextSnapshot(null);
    setSelectedArtifact(null);
    setSelectedObservability(null);
    setSelectedReview(null);
    setRunEvents([]);
    setActiveMessageId(null);
  }, []);

  const loadCapabilityData = useCallback(async (subprojectId: string | null) => {
    const [capabilityResult, datasetResult, runResult, historyResult] = await Promise.all([
      listCapabilities(subprojectId),
      listEvaluationDatasets(subprojectId),
      listEvaluationRuns(subprojectId),
      loadEvaluationHistory(subprojectId),
    ]);
    setCapabilities(capabilityResult.items);
    setEvaluationDatasets(datasetResult.items);
    setEvaluationRuns(runResult.items);
    setEvaluationHistory(historyResult);
    setSelectedCapabilityId((current) => current ?? capabilityResult.items[0]?.id ?? null);
    setSelectedEvaluationRunId((current) => current ?? runResult.items[0]?.id ?? null);
  }, []);

  const loadTraceabilityData = useCallback(async (subprojectId: string | null) => {
    const [requirementResult, versionResult] = await Promise.all([listRequirements(subprojectId), listVersions(subprojectId)]);
    setRequirements(requirementResult.items);
    setVersionEntries(versionResult.items);
  }, []);

  const loadMcpModeData = useCallback(async () => {
    const [modeState, modeHistoryResult] = await Promise.all([loadMcpContextMode(), loadMcpContextModeHistory()]);
    setMcpModeState(modeState);
    setMcpModeHistory(modeHistoryResult.items);
  }, []);

  const loadSharedContextData = useCallback(async () => {
    const [taskResult, checkpointResult, eventResult, checklistSummary, dailyDigestResult, projectEntryResult, taskSsotStateResult, schedulerRunsResult, outboxResult] = await Promise.all([
      loadMcpContextTasks(),
      loadMcpContextCheckpoints(),
      loadMcpContextEvents(),
      loadExecutionChecklistSummary(),
      loadDailyDigests(),
      loadProjectEntries(),
      loadTaskSsotState(selectedSubprojectId),
      loadSchedulerRuns(selectedSubprojectId),
      loadOutboxEnvelopes(selectedSubprojectId),
    ]);
    const validationResult = taskSsotStateResult.continuation.activeMainlineTaskId
      ? await loadFinalStateValidation(taskSsotStateResult.continuation.activeMainlineTaskId, selectedSubprojectId)
      : null;
    let proofOfWorkResult: ProofOfWorkBundle | null = null;
    try {
      proofOfWorkResult = await loadProofOfWorkBundle(selectedSubprojectId);
    } catch {
      proofOfWorkResult = null;
    }
    setMcpTasks(taskResult.tasks);
    setMcpCheckpoints(checkpointResult.items);
    setMcpEvents(eventResult.items);
    setExecutionChecklistSummary(checklistSummary);
    setDailyDigests(dailyDigestResult.items);
    setProjectEntries(projectEntryResult.items);
    setTaskSsotState(taskSsotStateResult);
    setSchedulerRuns(schedulerRunsResult);
    setOutboxEnvelopes(outboxResult.items);
    setFinalStateValidation(validationResult);
    setProofOfWorkBundle(proofOfWorkResult);
  }, [selectedSubprojectId]);


  const loadWorkflowSurface = useCallback(async (subprojectId: string | null) => {
    const [run, metrics, review] = await Promise.all([
      loadWorkflowRun(subprojectId),
      loadWorkflowMetrics(subprojectId),
      loadWorkflowReview(subprojectId),
    ]);
    const hermes = await loadHermesPolicy(run.id, subprojectId);
    setWorkflowRun(run);
    setWorkflowMetrics(metrics);
    setWorkflowReview(review);
    setHermesPolicy(hermes);
  }, []);

  const loadV07RuntimeGovernanceData = useCallback(async (subprojectId: string | null) => {
    setV07RuntimeGovernance(await loadV07RuntimeGovernance(subprojectId));
  }, []);

  const loadProviderRoutingData = useCallback(async (subprojectId: string | null) => {
    const routingResult = await listProviderRouting(subprojectId);
    setProviderRouting(routingResult.items);
  }, []);

  const loadPortfolioData = useCallback(async () => {
    const portfolio = await listPortfolio();
    setPortfolioEntries(portfolio);
  }, []);

  const refreshSchedulerSurface = useCallback(async () => {
    await Promise.all([
      loadSharedContextData(),
      loadWorkflowSurface(selectedSubprojectId),
      loadPortfolioData(),
    ]);
  }, [loadPortfolioData, loadSharedContextData, loadWorkflowSurface, selectedSubprojectId]);

  const handleRunFrontendBrowserVerification = useCallback(async () => {
    const activeTaskId = taskSsotState?.continuation.activeMainlineTaskId ?? finalStateValidation?.taskId ?? null;
    if (!activeTaskId) {
      return;
    }
    setBrowserVerificationBusy(true);
    try {
      const result = await runTaskFrontendBrowserVerification(activeTaskId, selectedSubprojectId);
      setLiveBrowserVerificationRun(result);
      const validationResult = await loadFinalStateValidation(activeTaskId, selectedSubprojectId);
      setFinalStateValidation(validationResult);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Run frontend browser verification failed: ${cause.message}` : 'Run frontend browser verification failed.');
    } finally {
      setBrowserVerificationBusy(false);
    }
  }, [finalStateValidation?.taskId, selectedSubprojectId, taskSsotState?.continuation.activeMainlineTaskId]);

  const loadProductAgentData = useCallback(async (subprojectId: string | null) => {
    const [agentResult, blueprintResult, skillSurface, localState] = await Promise.all([
      listProductAgents(subprojectId),
      listProductAgentBlueprints(),
      loadProductSkills(subprojectId),
      loadCodexLocalState(subprojectId),
    ]);
    setProductAgents(agentResult.items);
    setProductAgentBlueprints(blueprintResult.items);
    setProductSkillSurface(skillSurface);
    setCodexLocalState(localState);
  }, []);

  const loadProductChiefData = useCallback(async (subprojectId: string | null) => {
    const [reports, outputs, imageBatches, reviews, groupSessions] = await Promise.all([
      listProductChiefReports(subprojectId),
      listProductChiefOutputs(subprojectId),
      listProductChiefImageBatches(subprojectId),
      listProductChiefMultiAgentReviews(subprojectId),
      listMultiPmGroupSessions(subprojectId),
    ]);
    setProductChiefReports(reports.items);
    setProductChiefOutputs(outputs.items);
    setProductChiefImageBatches(imageBatches.items);
    setProductChiefReviews(reviews.items);
    setMultiPmGroupSessions(groupSessions.items);
    const latestUiSchemaPath = outputs.items.find(
      (output) => typeof output.metadata.generatedUiSchemaPath === 'string' && output.metadata.generatedUiSchemaPath.trim(),
    )?.metadata.generatedUiSchemaPath;
    if (typeof latestUiSchemaPath === 'string' && latestUiSchemaPath.trim()) {
      setLatestUiSchemaContract(await loadJsonFile<UISchemaContract>(latestUiSchemaPath));
    } else {
      setLatestUiSchemaContract(null);
    }
  }, []);

  const loadExternalConnectorData = useCallback(async (subprojectId: string | null) => {
    setExternalConnectorStatus(await loadConnectorStatus(subprojectId));
  }, []);

  const loadDagData = useCallback(async (subprojectId: string | null) => {
    const [graph, runResult, changeResult] = await Promise.all([
      loadDagGraph(subprojectId),
      listDagRuns(subprojectId),
      listDagChanges(subprojectId),
    ]);
    setDagGraph(graph);
    setDagRuns(runResult.items);
    setDagChanges(changeResult.items);
  }, []);

  const loadRetrievalData = useCallback(async (subprojectId: string | null) => {
    setRetrievalGovernance(await loadRetrievalGovernance(subprojectId));
  }, []);

  const handleProviderRoutingRefresh = useCallback(async () => {
    setProviderRoutingBusy(true);
    try {
      await loadProviderRoutingData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Provider routing refresh failed: ${cause.message}` : 'Provider routing refresh failed.');
    } finally {
      setProviderRoutingBusy(false);
    }
  }, [loadProviderRoutingData, selectedSubprojectId]);

  const handleSetPrimaryProvider = useCallback(async (providerName: string) => {
    setProviderRoutingBusy(true);
    try {
      await setPrimaryProvider(providerName, selectedSubprojectId);
      await loadProviderRoutingData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Set primary provider failed: ${cause.message}` : 'Set primary provider failed.');
    } finally {
      setProviderRoutingBusy(false);
    }
  }, [loadProviderRoutingData, selectedSubprojectId]);

  const handleAdjustProviderPriority = useCallback(async (providerName: string, delta: number) => {
    setProviderRoutingBusy(true);
    try {
      await adjustProviderPriority(providerName, delta, selectedSubprojectId);
      await loadProviderRoutingData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Adjust provider priority failed: ${cause.message}` : 'Adjust provider priority failed.');
    } finally {
      setProviderRoutingBusy(false);
    }
  }, [loadProviderRoutingData, selectedSubprojectId]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [subprojectItems, chatResult, modeState, modeHistoryResult, taskResult, checkpointResult, eventResult, checklistSummary, dailyDigestResult, projectEntryResult, taskSsotStateResult, schedulerRunsResult, outboxResult] = await Promise.all([
        listSubprojects(),
        listChats(selectedSubprojectId),
        loadMcpContextMode(),
        loadMcpContextModeHistory(),
        loadMcpContextTasks(),
        loadMcpContextCheckpoints(),
        loadMcpContextEvents(),
        loadExecutionChecklistSummary(),
        loadDailyDigests(),
        loadProjectEntries(),
        loadTaskSsotState(selectedSubprojectId),
        loadSchedulerRuns(selectedSubprojectId),
        loadOutboxEnvelopes(selectedSubprojectId),
      ]);
      const validationResult = taskSsotStateResult.continuation.activeMainlineTaskId
        ? await loadFinalStateValidation(taskSsotStateResult.continuation.activeMainlineTaskId, selectedSubprojectId)
        : null;
      let proofOfWorkResult: ProofOfWorkBundle | null = null;
      try {
        proofOfWorkResult = await loadProofOfWorkBundle(selectedSubprojectId);
      } catch {
        proofOfWorkResult = null;
      }
      setSubprojects(subprojectItems);
      setMcpModeState(modeState);
      setMcpModeHistory(modeHistoryResult.items);
      setMcpTasks(taskResult.tasks);
      setMcpCheckpoints(checkpointResult.items);
      setMcpEvents(eventResult.items);
      setExecutionChecklistSummary(checklistSummary);
      setDailyDigests(dailyDigestResult.items);
      setProjectEntries(projectEntryResult.items);
      setTaskSsotState(taskSsotStateResult);
      setSchedulerRuns(schedulerRunsResult);
      setOutboxEnvelopes(outboxResult.items);
      setFinalStateValidation(validationResult);
      setProofOfWorkBundle(proofOfWorkResult);

      if (chatResult.items.length > 0) {
        setSessions(chatResult.items);
        setActiveSessionId(chatResult.items[0]?.id ?? null);
      } else {
        const created = await createChat({ subprojectId: selectedSubprojectId });
        setSessions([created]);
        setActiveSessionId(created.id);
      }

      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Chat workspace load failed: ${cause.message}` : 'Chat workspace load failed.');
    } finally {
      setLoading(false);
    }
  }, [selectedSubprojectId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setVoiceSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    setSpeechOutputSupported(Boolean(window.speechSynthesis));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    void (async () => {
      try {
        await loadCapabilityData(selectedSubprojectId);
      } catch (cause) {
        setError(cause instanceof Error ? `Capability data load failed: ${cause.message}` : 'Capability data load failed.');
      }
    })();
  }, [loadCapabilityData, selectedSubprojectId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadTraceabilityData(selectedSubprojectId);
      } catch (cause) {
        setError(cause instanceof Error ? `Traceability data load failed: ${cause.message}` : 'Traceability data load failed.');
      }
    })();
  }, [loadTraceabilityData, selectedSubprojectId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadMcpModeData();
      } catch (cause) {
        setError(cause instanceof Error ? `mcp-context mode load failed: ${cause.message}` : 'mcp-context mode load failed.');
      }
    })();
  }, [loadMcpModeData]);

  useEffect(() => {
    void (async () => {
      try {
        await loadSharedContextData();
      } catch (cause) {
        setError(cause instanceof Error ? `shared context load failed: ${cause.message}` : 'shared context load failed.');
      }
    })();
  }, [loadSharedContextData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadMcpModeData();
      void loadSharedContextData();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [loadMcpModeData, loadSharedContextData]);

  useEffect(() => {
    void (async () => {
      try {
        await loadProviderRoutingData(selectedSubprojectId);
      } catch (cause) {
        setError(cause instanceof Error ? `Provider routing load failed: ${cause.message}` : 'Provider routing load failed.');
      }
    })();
  }, [loadProviderRoutingData, selectedSubprojectId]);

  useEffect(() => {
    setSelectedBatchRequirementIds([]);
    void (async () => {
      try {
        await loadWorkflowSurface(selectedSubprojectId);
      } catch (cause) {
        setError(cause instanceof Error ? `Workflow surface load failed: ${cause.message}` : 'Workflow surface load failed.');
      }
    })();
  }, [loadWorkflowSurface, selectedSubprojectId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadPortfolioData();
      } catch (cause) {
        setError(cause instanceof Error ? `Portfolio load failed: ${cause.message}` : 'Portfolio load failed.');
      }
    })();
  }, [loadPortfolioData, selectedSubprojectId]);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([
          loadProductAgentData(selectedSubprojectId),
          loadProductChiefData(selectedSubprojectId),
          loadExternalConnectorData(selectedSubprojectId),
        ]);
      } catch (cause) {
        setError(cause instanceof Error ? `Product office load failed: ${cause.message}` : 'Product office load failed.');
      }
    })();
  }, [loadExternalConnectorData, loadProductAgentData, loadProductChiefData, selectedSubprojectId]);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadDagData(selectedSubprojectId), loadRetrievalData(selectedSubprojectId)]);
      } catch (cause) {
        setError(cause instanceof Error ? `DAG/retrieval load failed: ${cause.message}` : 'DAG/retrieval load failed.');
      }
    })();
  }, [loadDagData, loadRetrievalData, selectedSubprojectId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadV07RuntimeGovernanceData(selectedSubprojectId);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `v0.7 runtime governance load failed: ${cause.message}`
            : 'v0.7 runtime governance load failed.',
        );
      }
    })();
  }, [loadV07RuntimeGovernanceData, selectedSubprojectId]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      setRuns([]);
      setSelectedRun(null);
      setSelectedContextSnapshot(null);
      setSelectedArtifact(null);
      setSelectedObservability(null);
      setSelectedReview(null);
      setRunEvents([]);
      setActiveMessageId(null);
      return;
    }

    void (async () => {
      try {
        await loadSessionData(activeSessionId, selectedSubprojectId);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Session data load failed: ${cause.message}` : 'Session data load failed.');
      }
    })();
  }, [activeSessionId, loadSessionData, selectedSubprojectId]);

  const handleCreateSession = useCallback(async () => {
    try {
      const session = await createChat({ subprojectId: selectedSubprojectId });
      setSessions((current) => [session, ...current]);
      setActiveSessionId(session.id);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Create session failed: ${cause.message}` : 'Create session failed.');
    }
  }, [selectedSubprojectId]);

  const loadRunInspector = useCallback(
    async (runId: string) => {
      const [run, eventsResult, observability, review] = await Promise.all([
        loadRun(runId, selectedSubprojectId),
        listRunEvents(runId, selectedSubprojectId),
        loadRunObservability(runId, selectedSubprojectId),
        loadRunReview(runId, selectedSubprojectId).catch(() => null),
      ]);
      setSelectedRun(run);
      setRunEvents(eventsResult.items);
      setSelectedObservability(observability);
      setSelectedReview(review);
      const snapshotId = run.contextSnapshotId;
      const cachedSnapshot = snapshotId ? contextSnapshots.find((snapshot) => snapshot.id === snapshotId) ?? null : null;
      const loadedSnapshot = snapshotId
        ? await loadContextSnapshot(snapshotId, selectedSubprojectId).catch(() => cachedSnapshot)
        : null;
      if (loadedSnapshot) {
        setContextSnapshots((current) => [loadedSnapshot, ...current.filter((snapshot) => snapshot.id !== loadedSnapshot.id)]);
      }
      setSelectedContextSnapshot(loadedSnapshot ?? cachedSnapshot);
      const artifactEvent = eventsResult.items.find((event) => event.artifactPath);
      if (artifactEvent?.artifactPath) {
        setSelectedArtifact(await loadJsonFile<MultimodalArtifact>(artifactEvent.artifactPath));
      } else {
        setSelectedArtifact(null);
      }
    },
    [contextSnapshots, selectedSubprojectId],
  );

  const handleSelectMessage = useCallback(
    async (message: ChatMessage) => {
      setActiveMessageId(message.id);
      if (!message.runId) {
        setSelectedRun(null);
        setSelectedContextSnapshot(null);
        setSelectedArtifact(null);
        setSelectedObservability(null);
        setSelectedReview(null);
        setRunEvents([]);
        return;
      }

      try {
        await loadRunInspector(message.runId);
        setError(null);
      } catch (cause) {
        setSelectedRun(null);
        setSelectedContextSnapshot(null);
        setSelectedArtifact(null);
        setSelectedObservability(null);
        setSelectedReview(null);
        setRunEvents([]);
        setError(cause instanceof Error ? `Run inspector load failed: ${cause.message}` : 'Run inspector load failed.');
      }
    },
    [loadRunInspector],
  );

  const handleSubmit = useCallback(async () => {
    if (!activeSessionId || !draft.trim() || sending) {
      return;
    }

    setSending(true);
    stopListening();
    stopSpeaking();
    try {
      const userMessage = await createMessage(activeSessionId, {
        content: draft,
        subprojectId: selectedSubprojectId,
      });
      setMessages((current) => [...current, userMessage]);
      setDraft('');
      setActiveMessageId(userMessage.id);
      setVoiceStatus('消息已发送，正在等待回复...');

      const result = await respondToChat(activeSessionId, {
        subprojectId: selectedSubprojectId,
        messageId: userMessage.id,
      });
      const [eventsResult, observability, review] = await Promise.all([
        listRunEvents(result.run.id, selectedSubprojectId),
        loadRunObservability(result.run.id, selectedSubprojectId),
        loadRunReview(result.run.id, selectedSubprojectId).catch(() => null),
        loadProviderRoutingData(selectedSubprojectId),
      ]);
      const artifactEvent = eventsResult.items.find((event) => event.artifactPath);
      const artifact = artifactEvent?.artifactPath
        ? await loadJsonFile<MultimodalArtifact>(artifactEvent.artifactPath)
        : null;

      setMessages((current) => [...current, result.assistantMessage]);
      setRuns((current) => [result.run, ...current.filter((run) => run.id !== result.run.id)]);
      setContextSnapshots((current) => [
        result.contextSnapshot,
        ...current.filter((snapshot) => snapshot.id !== result.contextSnapshot.id),
      ]);
      setSelectedRun(result.run);
      setSelectedContextSnapshot(result.contextSnapshot);
      setSelectedArtifact(artifact);
      setSelectedObservability(observability);
      setSelectedReview(review);
      setRunEvents(eventsResult.items);
      setActiveMessageId(result.assistantMessage.id);
      setSessions((current) =>
        current.map((session) => (session.id === result.session.id ? result.session : session)),
      );
      setError(null);
      setVoiceStatus('Reply received.');
      if (autoSpeak && speechOutputSupported) {
        speakText(result.assistantMessage.content);
      }
    } catch (cause) {
      setError(cause instanceof Error ? `Send failed: ${cause.message}` : 'Send failed.');
      setVoiceStatus('Send failed. Try again.');
    } finally {
      setSending(false);
    }
  }, [activeSessionId, autoSpeak, draft, loadProviderRoutingData, selectedSubprojectId, sending, speakText, speechOutputSupported, stopListening, stopSpeaking]);

  const handleCreateCapabilityDataset = useCallback(async () => {
    if (!selectedCapability) {
      return;
    }
    const version = selectedCapability.activeVersion ?? selectedCapability.versions[0]?.version;
    if (!version) {
      return;
    }

    setCapabilityBusy(true);
    try {
      await createCapabilityDataset(selectedCapability.id, {
        subprojectId: selectedSubprojectId,
        version,
        name: `${selectedCapability.name} Default Dataset`,
        description: 'Default UI-created dataset for gate verification.',
        cases: [
          {
            id: 'default-shape',
            input: { mode: 'init-only' },
            expected: { requiredKeys: selectedCapability.implementationType === 'workflow' ? ['type', 'run', 'payload'] : ['type', 'agent', 'payload'] },
            rubric: ['must expose wrapper contract'],
          },
        ],
      });
      await loadCapabilityData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Create dataset failed: ${cause.message}` : 'Create dataset failed.');
    } finally {
      setCapabilityBusy(false);
    }
  }, [loadCapabilityData, selectedCapability, selectedSubprojectId]);

  const handleRunCapabilityEvaluation = useCallback(async () => {
    if (!selectedCapability) {
      return;
    }
    const version = selectedCapability.activeVersion ?? selectedCapability.versions[0]?.version;
    const dataset = evaluationDatasets.find((item) => item.capabilityId === selectedCapability.id && item.version === version);
    if (!version || !dataset) {
      return;
    }

    setCapabilityBusy(true);
    try {
      const result = await runCapabilityEvaluation(selectedCapability.id, {
        subprojectId: selectedSubprojectId,
        datasetId: dataset.id,
        version,
        evaluator: 'frontend-operator',
      });
      setCapabilities((current) => current.map((item) => (item.id === result.capability.id ? result.capability : item)));
      setSelectedEvaluationRunId(result.run.id);
      await loadCapabilityData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Run evaluation failed: ${cause.message}` : 'Run evaluation failed.');
    } finally {
      setCapabilityBusy(false);
    }
  }, [evaluationDatasets, loadCapabilityData, selectedCapability, selectedSubprojectId]);

  const handlePublishCapability = useCallback(async () => {
    if (!selectedCapability) {
      return;
    }
    const version = selectedCapability.activeVersion ?? selectedCapability.versions[0]?.version;
    if (!version) {
      return;
    }

    setCapabilityBusy(true);
    try {
      const updated = await publishCapability(selectedCapability.id, {
        subprojectId: selectedSubprojectId,
        version,
        testsPassed: true,
        reviewPassed: true,
        releaseNotes: publishDraft.releaseNotes.trim() || null,
        reviewSummary: publishDraft.reviewSummary.trim() || null,
        requirementIds: selectedRequirementIds,
        runId: selectedRun?.id ?? null,
      });
      setCapabilities((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await loadCapabilityData(selectedSubprojectId);
      await loadTraceabilityData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Publish capability failed: ${cause.message}` : 'Publish capability failed.');
    } finally {
      setCapabilityBusy(false);
    }
  }, [
    loadCapabilityData,
    loadTraceabilityData,
    publishDraft.releaseNotes,
    publishDraft.reviewSummary,
    selectedCapability,
    selectedRequirementIds,
    selectedRun?.id,
    selectedSubprojectId,
  ]);

  const handleRollbackCapabilityVersion = useCallback(async (version: string) => {
    if (!selectedCapability) {
      return;
    }

    setCapabilityBusy(true);
    try {
      const updated = await rollbackCapability(selectedCapability.id, {
        subprojectId: selectedSubprojectId,
        version,
        requirementIds: selectedRequirementIds,
        runId: selectedRun?.id ?? null,
        summary: `Rollback capability ${selectedCapability.name} to ${version}`,
      });
      setCapabilities((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await Promise.all([loadCapabilityData(selectedSubprojectId), loadTraceabilityData(selectedSubprojectId)]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Rollback capability failed: ${cause.message}` : 'Rollback capability failed.');
    } finally {
      setCapabilityBusy(false);
    }
  }, [loadCapabilityData, loadTraceabilityData, selectedCapability, selectedRequirementIds, selectedRun?.id, selectedSubprojectId]);

  const handleInvokeCapability = useCallback(async () => {
    if (!selectedCapability) {
      return;
    }

    setCapabilityBusy(true);
    try {
      const result = await invokeCapability(selectedCapability.id, {
        subprojectId: selectedSubprojectId,
        version: selectedCapability.activeVersion,
        payload: { mode: 'init-only', source: 'frontend-panel' },
        requirementIds: selectedRequirementIds,
        runId: selectedRun?.id ?? null,
      });
      setVoiceStatus(`Capability invoke status: ${result.status}`);
      await loadTraceabilityData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Invoke capability failed: ${cause.message}` : 'Invoke capability failed.');
    } finally {
      setCapabilityBusy(false);
    }
  }, [loadTraceabilityData, selectedCapability, selectedRequirementIds, selectedRun?.id, selectedSubprojectId]);

  const handleRegistrationDraftChange = useCallback((field: string, value: string) => {
    setCapabilityDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === 'implementationType' && value === 'workflow' && !next.implementationRef) {
        next.implementationRef = 'pmaios-main';
      }
      return next;
    });
  }, []);

  const handlePublishDraftChange = useCallback((field: 'releaseNotes' | 'reviewSummary', value: string) => {
    setPublishDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleToggleRequirement = useCallback((requirementId: string) => {
    setSelectedRequirementIds((current) =>
      current.includes(requirementId) ? current.filter((id) => id !== requirementId) : [...current, requirementId],
    );
  }, []);

  const handleSelectTraceRequirement = useCallback((requirementId: string | null) => {
    setSelectedTraceRequirementId(requirementId);
    setSelectedTraceVersionId(null);
    if (requirementId) {
      setSelectedRequirementIds([requirementId]);
    }
  }, []);

  const handleSelectTraceCapability = useCallback((capabilityId: string) => {
    setSelectedCapabilityId(capabilityId);
  }, []);

  const handleSelectTraceRun = useCallback(
    async (runId: string) => {
      try {
        await loadRunInspector(runId);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Run inspector load failed: ${cause.message}` : 'Run inspector load failed.');
      }
    },
    [loadRunInspector],
  );
  const handleCreateCapability = useCallback(async () => {
    if (!capabilityDraft.name.trim() || !capabilityDraft.description.trim() || !capabilityDraft.implementationRef.trim()) {
      setError('Capability name, description, and implementation ref are required.');
      return;
    }

    setCapabilityBusy(true);
    try {
      const created = await createCapability({
        subprojectId: selectedSubprojectId,
        name: capabilityDraft.name.trim(),
        description: capabilityDraft.description.trim(),
        implementationType: capabilityDraft.implementationType,
        implementationRef: capabilityDraft.implementationRef.trim(),
        version: capabilityDraft.version.trim(),
        visibility: capabilityDraft.visibility,
        permissions: capabilityDraft.permissions.split(',').map((item) => item.trim()).filter(Boolean),
        tags: capabilityDraft.tags.split(',').map((item) => item.trim()).filter(Boolean),
        acceptanceCriteria: capabilityDraft.acceptanceCriteria.split(',').map((item) => item.trim()).filter(Boolean),
        requirementIds: selectedRequirementIds,
        runId: selectedRun?.id ?? null,
      });
      await loadCapabilityData(selectedSubprojectId);
      await loadTraceabilityData(selectedSubprojectId);
      setSelectedCapabilityId(created.id);
      setCapabilityDraft({
        name: '',
        description: '',
        implementationType: 'workflow',
        implementationRef: 'pmaios-main',
        version: '0.1.0',
        visibility: 'internal',
        permissions: '',
        tags: '',
        acceptanceCriteria: '',
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Register capability failed: ${cause.message}` : 'Register capability failed.');
    } finally {
      setCapabilityBusy(false);
    }
  }, [capabilityDraft, loadCapabilityData, loadTraceabilityData, selectedRequirementIds, selectedRun?.id, selectedSubprojectId]);

  const handleIngestCurrentChat = useCallback(async () => {
    if (!activeSessionId) {
      return;
    }

    setTraceBusy(true);
    try {
      await ingestChatRequirement({
        sessionId: activeSessionId,
        messageId: activeMessageId,
        subprojectId: selectedSubprojectId,
      });
      await loadTraceabilityData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Ingest requirement failed: ${cause.message}` : 'Ingest requirement failed.');
    } finally {
      setTraceBusy(false);
    }
  }, [activeMessageId, activeSessionId, loadTraceabilityData, selectedSubprojectId]);

  const handleCreateManualRequirement = useCallback(async () => {
    const reference = activeMessageId ?? activeSessionId ?? 'workspace';

    setTraceBusy(true);
    try {
      await createRequirement({
        subprojectId: selectedSubprojectId,
        title: `Manual requirement from ${reference}`,
        description: 'Created from the web console to track work that did not originate from chat ingestion.',
        category: 'feature',
        priority: 'P1',
      });
      await loadTraceabilityData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Create requirement failed: ${cause.message}` : 'Create requirement failed.');
    } finally {
      setTraceBusy(false);
    }
  }, [activeMessageId, activeSessionId, loadTraceabilityData, selectedSubprojectId]);

  const handleToggleBatchRequirement = useCallback((requirementId: string) => {
    setSelectedBatchRequirementIds((current) =>
      current.includes(requirementId) ? current.filter((id) => id !== requirementId) : [...current, requirementId],
    );
  }, []);

  const handleUpdateRequirementStatus = useCallback(
    async (requirementId: string, status: Requirement['status']) => {
      setTraceBusy(true);
      try {
        await updateRequirement(requirementId, {
          subprojectId: selectedSubprojectId,
          status,
        });
        await loadTraceabilityData(selectedSubprojectId);
        setSelectedTraceRequirementId(requirementId);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Requirement update failed: ${cause.message}` : 'Requirement update failed.');
      } finally {
        setTraceBusy(false);
      }
    },
    [loadTraceabilityData, selectedSubprojectId],
  );

  const handleBatchRequirementStatus = useCallback(
    async (status: Requirement['status']) => {
      if (selectedBatchRequirementIds.length === 0) {
        return;
      }

      setTraceBusy(true);
      try {
        await batchUpdateRequirements({
          requirementIds: selectedBatchRequirementIds,
          subprojectId: selectedSubprojectId,
          status,
        });
        await loadTraceabilityData(selectedSubprojectId);
        setSelectedBatchRequirementIds([]);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Requirement batch update failed: ${cause.message}` : 'Requirement batch update failed.');
      } finally {
        setTraceBusy(false);
      }
    },
    [loadTraceabilityData, selectedBatchRequirementIds, selectedSubprojectId],
  );

  const handleRollbackVersion = useCallback(
    async (entry: VersionEntry) => {
      if (entry.entityType !== 'capability' || !entry.newVersion) {
        return;
      }

      setTraceBusy(true);
      try {
        await rollbackCapability(entry.entityId, {
          subprojectId: selectedSubprojectId,
          version: entry.newVersion,
          requirementIds:
            selectedBatchRequirementIds.length > 0
              ? selectedBatchRequirementIds
              : selectedTraceRequirementId
                ? [selectedTraceRequirementId]
                : [],
          runId: workflowRun?.id ?? null,
          summary: `Rollback requested from version desk to ${entry.newVersion}`,
        });
        await Promise.all([loadCapabilityData(selectedSubprojectId), loadTraceabilityData(selectedSubprojectId)]);
        setSelectedCapabilityId(entry.entityId);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Rollback failed: ${cause.message}` : 'Rollback failed.');
      } finally {
        setTraceBusy(false);
      }
    },
    [
      loadCapabilityData,
      loadTraceabilityData,
      selectedBatchRequirementIds,
      selectedSubprojectId,
      selectedTraceRequirementId,
      workflowRun?.id,
    ],
  );

  const handleWorkflowRefresh = useCallback(async () => {
    setWorkflowBusy(true);
    try {
      await loadWorkflowSurface(selectedSubprojectId);
      await loadPortfolioData();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Workflow refresh failed: ${cause.message}` : 'Workflow refresh failed.');
    } finally {
      setWorkflowBusy(false);
    }
  }, [loadPortfolioData, loadWorkflowSurface, selectedSubprojectId]);

  const handleWorkflowAdvance = useCallback(async () => {
    if (!workflowRun) {
      return;
    }

    setWorkflowBusy(true);
    try {
      await advanceWorkflowRun(workflowRun.id, selectedSubprojectId);
      await Promise.all([loadWorkflowSurface(selectedSubprojectId), loadPortfolioData()]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Workflow advance failed: ${cause.message}` : 'Workflow advance failed.');
    } finally {
      setWorkflowBusy(false);
    }
  }, [loadPortfolioData, loadWorkflowSurface, selectedSubprojectId, workflowRun]);

  const handleWorkflowRunUntilBlocked = useCallback(async () => {
    if (!workflowRun) {
      return;
    }

    setWorkflowBusy(true);
    try {
      await runWorkflowUntilBlocked(workflowRun.id, selectedSubprojectId);
      await Promise.all([loadWorkflowSurface(selectedSubprojectId), loadPortfolioData()]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Workflow run-until-blocked failed: ${cause.message}` : 'Workflow run-until-blocked failed.');
    } finally {
      setWorkflowBusy(false);
    }
  }, [loadPortfolioData, loadWorkflowSurface, selectedSubprojectId, workflowRun]);

  const handleWorkflowResume = useCallback(async () => {
    if (!workflowRun) {
      return;
    }

    setWorkflowBusy(true);
    try {
      await resumeWorkflowRun(workflowRun.id, {
        subprojectId: selectedSubprojectId,
        targetStageId: workflowReview?.recommendedReworkStageId ?? workflowRun.currentStageId,
        reason: 'web console operator resume',
      });
      await Promise.all([loadWorkflowSurface(selectedSubprojectId), loadPortfolioData()]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Workflow resume failed: ${cause.message}` : 'Workflow resume failed.');
    } finally {
      setWorkflowBusy(false);
    }
  }, [loadPortfolioData, loadWorkflowSurface, selectedSubprojectId, workflowReview?.recommendedReworkStageId, workflowRun]);

  const handleRefreshScheduler = useCallback(async () => {
    setSchedulerBusy(true);
    try {
      await refreshSchedulerSurface();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Scheduler refresh failed: ${cause.message}` : 'Scheduler refresh failed.');
    } finally {
      setSchedulerBusy(false);
    }
  }, [refreshSchedulerSurface]);

  const handleTickDueSchedulerRuns = useCallback(async () => {
    setSchedulerBusy(true);
    try {
      await tickDueSchedulerRuns(selectedSubprojectId);
      await refreshSchedulerSurface();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Scheduler tick-due failed: ${cause.message}` : 'Scheduler tick-due failed.');
    } finally {
      setSchedulerBusy(false);
    }
  }, [refreshSchedulerSurface, selectedSubprojectId]);

  const handleTickSchedulerRun = useCallback(
    async (workflowRunId: string) => {
      setSchedulerBusy(true);
      try {
        await tickSchedulerRun(workflowRunId, selectedSubprojectId);
        await refreshSchedulerSurface();
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Scheduler tick failed: ${cause.message}` : 'Scheduler tick failed.');
      } finally {
        setSchedulerBusy(false);
      }
    },
    [refreshSchedulerSurface, selectedSubprojectId],
  );

  const handleScheduleResumeCurrent = useCallback(
    async (workflowRunId: string) => {
      setSchedulerBusy(true);
      try {
        await scheduleSchedulerRun(workflowRunId, {
          subprojectId: selectedSubprojectId,
          action: 'resume-current-stage',
          cooldownUntil: new Date().toISOString(),
          reason: 'workspace scheduler resume current-stage',
        });
        await refreshSchedulerSurface();
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Schedule current-stage resume failed: ${cause.message}` : 'Schedule current-stage resume failed.');
      } finally {
        setSchedulerBusy(false);
      }
    },
    [refreshSchedulerSurface, selectedSubprojectId],
  );

  const handleScheduleResumeRework = useCallback(
    async (workflowRunId: string) => {
      setSchedulerBusy(true);
      try {
        await scheduleSchedulerRun(workflowRunId, {
          subprojectId: selectedSubprojectId,
          action: 'resume-rework-stage',
          cooldownUntil: new Date().toISOString(),
          reason: 'workspace scheduler resume rework-stage',
        });
        await refreshSchedulerSurface();
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Schedule rework resume failed: ${cause.message}` : 'Schedule rework resume failed.');
      } finally {
        setSchedulerBusy(false);
      }
    },
    [refreshSchedulerSurface, selectedSubprojectId],
  );

  const handleWorkflowApproveGate = useCallback(async () => {
    if (!workflowRun) {
      return;
    }

    setWorkflowBusy(true);
    try {
      await applyWorkflowGate(workflowRun.id, {
        subprojectId: selectedSubprojectId,
        decision: 'approve',
        summary: 'Manual approve from workflow ops desk.',
      });
      await Promise.all([loadWorkflowSurface(selectedSubprojectId), loadPortfolioData()]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Workflow gate approve failed: ${cause.message}` : 'Workflow gate approve failed.');
    } finally {
      setWorkflowBusy(false);
    }
  }, [loadPortfolioData, loadWorkflowSurface, selectedSubprojectId, workflowRun]);

  const handleWorkflowSendToRework = useCallback(async () => {
    if (!workflowRun) {
      return;
    }

    setWorkflowBusy(true);
    try {
      await applyWorkflowGate(workflowRun.id, {
        subprojectId: selectedSubprojectId,
        decision: 'rework',
        summary: 'Manual rework from workflow ops desk.',
        targetStageId: workflowReview?.recommendedReworkStageId ?? workflowRun.currentStageId,
      });
      await Promise.all([loadWorkflowSurface(selectedSubprojectId), loadPortfolioData()]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Workflow rework failed: ${cause.message}` : 'Workflow rework failed.');
    } finally {
      setWorkflowBusy(false);
    }
  }, [loadPortfolioData, loadWorkflowSurface, selectedSubprojectId, workflowReview?.recommendedReworkStageId, workflowRun]);

  const handleCloseHermesLoop = useCallback(
    async (workflowRunId: string) => {
      setWorkflowBusy(true);
      try {
        await closeHermesLoop(workflowRunId, selectedSubprojectId);
        await Promise.all([
          loadWorkflowSurface(selectedSubprojectId),
          refreshSchedulerSurface(),
          loadPortfolioData(),
        ]);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Hermes close-loop failed: ${cause.message}` : 'Hermes close-loop failed.');
      } finally {
        setWorkflowBusy(false);
      }
    },
    [loadPortfolioData, loadWorkflowSurface, refreshSchedulerSurface, selectedSubprojectId],
  );

  const handleExecuteHermesWriteback = useCallback(
    async (workflowRunId: string) => {
      setWorkflowBusy(true);
      try {
        await executeHermesWriteback(workflowRunId, selectedSubprojectId);
        await Promise.all([
          loadWorkflowSurface(selectedSubprojectId),
          refreshSchedulerSurface(),
          loadPortfolioData(),
        ]);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? `Hermes writeback execution failed: ${cause.message}` : 'Hermes writeback execution failed.');
      } finally {
        setWorkflowBusy(false);
      }
    },
    [loadPortfolioData, loadWorkflowSurface, refreshSchedulerSurface, selectedSubprojectId],
  );

  const handlePortfolioRefresh = useCallback(async () => {
    setPortfolioBusy(true);
    try {
      await loadPortfolioData();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Portfolio refresh failed: ${cause.message}` : 'Portfolio refresh failed.');
    } finally {
      setPortfolioBusy(false);
    }
  }, [loadPortfolioData]);

  const handleProductAgentRefresh = useCallback(async () => {
    setProductAgentBusy(true);
    try {
      await loadProductAgentData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Product agent refresh failed: ${cause.message}` : 'Product agent refresh failed.');
    } finally {
      setProductAgentBusy(false);
    }
  }, [loadProductAgentData, selectedSubprojectId]);

  const handleProductAgentBootstrap = useCallback(async () => {
    setProductAgentBusy(true);
    try {
      await bootstrapProductAgentHierarchy(selectedSubprojectId);
      await loadProductAgentData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Product agent bootstrap failed: ${cause.message}` : 'Product agent bootstrap failed.');
    } finally {
      setProductAgentBusy(false);
    }
  }, [loadProductAgentData, selectedSubprojectId]);

  const handleExternalConnectorRefresh = useCallback(async () => {
    setExternalConnectorBusy(true);
    try {
      await loadExternalConnectorData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Connector refresh failed: ${cause.message}` : 'Connector refresh failed.');
    } finally {
      setExternalConnectorBusy(false);
    }
  }, [loadExternalConnectorData, selectedSubprojectId]);

  const handleWebFetch = useCallback(async (url: string) => {
    if (!url.trim()) {
      return;
    }
    setExternalConnectorBusy(true);
    try {
      setLatestWebFetch(await fetchWebConnector({ subprojectId: selectedSubprojectId, url }));
      await loadExternalConnectorData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Web fetch failed: ${cause.message}` : 'Web fetch failed.');
    } finally {
      setExternalConnectorBusy(false);
    }
  }, [loadExternalConnectorData, selectedSubprojectId]);

  const handleInspectFigma = useCallback(async (fileKey: string) => {
    if (!fileKey.trim()) {
      return;
    }
    setExternalConnectorBusy(true);
    try {
      setLatestFigmaInspection(await inspectFigmaConnector({ fileKey }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Figma inspect failed: ${cause.message}` : 'Figma inspect failed.');
    } finally {
      setExternalConnectorBusy(false);
    }
  }, []);

  const handleImportDingTalk = useCallback(async (title: string, content: string) => {
    if (!content.trim()) {
      return;
    }
    setExternalConnectorBusy(true);
    try {
      setLatestDingTalkImport(await importDingTalkMeetingConnector({ subprojectId: selectedSubprojectId, title, content }));
      await Promise.all([loadTraceabilityData(selectedSubprojectId), loadExternalConnectorData(selectedSubprojectId)]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `DingTalk meeting import failed: ${cause.message}` : 'DingTalk meeting import failed.');
    } finally {
      setExternalConnectorBusy(false);
    }
  }, [loadExternalConnectorData, loadTraceabilityData, selectedSubprojectId]);

  const handleListDatakiKnowledgeBases = useCallback(async (input: { subprojectId?: string | null; baseUrl: string; apiKey: string; userId: string; agentId: string }) => {
    setExternalConnectorBusy(true);
    try {
      const result = await listDatakiKnowledgeBases(input);
      setLatestDatakiKnowledgeBases(result.items);
      setLatestDatakiKnowledgeFiles([]);
      setLatestDatakiSearch([]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Dataki knowledge base list failed: ${cause.message}` : 'Dataki knowledge base list failed.');
    } finally {
      setExternalConnectorBusy(false);
    }
  }, []);

  const handleListDatakiKnowledgeFiles = useCallback(async (input: {
    subprojectId?: string | null;
    knowledgeBaseId: string;
    baseUrl: string;
    apiKey: string;
    keyword: string;
  }) => {
    setExternalConnectorBusy(true);
    try {
      const result = await listDatakiKnowledgeFiles(input);
      setLatestDatakiKnowledgeFiles(result.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Dataki knowledge file list failed: ${cause.message}` : 'Dataki knowledge file list failed.');
    } finally {
      setExternalConnectorBusy(false);
    }
  }, []);

  const handleSearchDatakiKnowledge = useCallback(async (input: {
    subprojectId?: string | null;
    query: string;
    knowledgeBaseId: string;
    baseUrl: string;
    apiKey: string;
  }) => {
    setExternalConnectorBusy(true);
    try {
      const result = await searchDatakiKnowledge(input);
      setLatestDatakiSearch(result.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Dataki knowledge search failed: ${cause.message}` : 'Dataki knowledge search failed.');
    } finally {
      setExternalConnectorBusy(false);
    }
  }, []);

  const handleProductChiefRefresh = useCallback(async () => {
    setProductChiefBusy(true);
    try {
      await loadProductChiefData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Product Chief refresh failed: ${cause.message}` : 'Product Chief refresh failed.');
    } finally {
      setProductChiefBusy(false);
    }
  }, [loadProductChiefData, selectedSubprojectId]);

  const handleProductChiefAnalyze = useCallback(async (brief: string) => {
    if (!brief.trim()) {
      return;
    }

    setProductChiefBusy(true);
    try {
      await analyzeProductChief({ subprojectId: selectedSubprojectId, brief });
      await Promise.all([loadProductChiefData(selectedSubprojectId), loadProductAgentData(selectedSubprojectId)]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Product Chief analysis failed: ${cause.message}` : 'Product Chief analysis failed.');
    } finally {
      setProductChiefBusy(false);
    }
  }, [loadProductAgentData, loadProductChiefData, selectedSubprojectId]);

  const handleProductChiefGenerateOutput = useCallback(async (reportId: string, type: string) => {
    if (!selectedSubprojectId && isProjectScopedDesignOutput(type)) {
      setError('Product Chief output failed: Select a target subproject before generating concept-design-pack or design-image2-prompt-pack.');
      return;
    }
    setProductChiefBusy(true);
    try {
      await generateProductChiefOutput(reportId, { subprojectId: selectedSubprojectId, type });
      await loadProductChiefData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Product Chief output failed: ${cause.message}` : 'Product Chief output failed.');
    } finally {
      setProductChiefBusy(false);
    }
  }, [loadProductChiefData, selectedSubprojectId]);

  const handleProductChiefGenerateAllOutputs = useCallback(async (report: ProductChiefReport) => {
    const generatedOutputTypes = new Set(productChiefOutputs.map((output) => output.type));
    const pendingOutputs = report.requiredGovernedOutputs.filter((output) => !generatedOutputTypes.has(output.type));
    if (pendingOutputs.length === 0) {
      return;
    }
    if (!selectedSubprojectId && pendingOutputs.some((output) => isProjectScopedDesignOutput(output.type))) {
      setError('Product Chief full package failed: Select a target subproject before generating outputs that include concept-design-pack or design-image2-prompt-pack.');
      return;
    }

    setProductChiefBusy(true);
    try {
      for (const output of pendingOutputs) {
        await generateProductChiefOutput(report.id, {
          subprojectId: selectedSubprojectId,
          type: output.type,
        });
      }
      await loadProductChiefData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Product Chief full package failed: ${cause.message}` : 'Product Chief full package failed.');
    } finally {
      setProductChiefBusy(false);
    }
  }, [loadProductChiefData, productChiefOutputs, selectedSubprojectId]);

  const handleDagRefresh = useCallback(async () => {
    setDagBusy(true);
    try {
      await loadDagData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `DAG refresh failed: ${cause.message}` : 'DAG refresh failed.');
    } finally {
      setDagBusy(false);
    }
  }, [loadDagData, selectedSubprojectId]);

  const handleDagRegisterChange = useCallback(async () => {
    const nodeId = workflowRun?.currentStageId ?? dagGraph?.nodes[0]?.id ?? null;
    if (!nodeId) {
      return;
    }

    setDagBusy(true);
    try {
      await registerDagChange({
        subprojectId: selectedSubprojectId,
        runId: workflowRun?.id ?? 'frontend-dag-change',
        nodeId,
        changeType: 'requirement',
        triggeredBy: 'user',
      });
      await loadDagData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `DAG change failed: ${cause.message}` : 'DAG change failed.');
    } finally {
      setDagBusy(false);
    }
  }, [dagGraph?.nodes, loadDagData, selectedSubprojectId, workflowRun?.currentStageId, workflowRun?.id]);

  const handleDagRerunDirty = useCallback(async () => {
    const latestDirtyRun = dagRuns.find((run) => run.dirtyNodes.length > 0);
    if (!latestDirtyRun) {
      return;
    }

    setDagBusy(true);
    try {
      const result = await rerunDagRun(latestDirtyRun.id, {
        subprojectId: selectedSubprojectId,
        workflowRunId:
          typeof latestDirtyRun.metadata.workflowRunId === 'string' ? latestDirtyRun.metadata.workflowRunId : workflowRun?.id ?? null,
        reason: 'frontend DAG dirty-node rerun',
        runUntilBlocked: true,
      });
      setWorkflowRun(result.workflowRun);
      await loadDagData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `DAG rerun failed: ${cause.message}` : 'DAG rerun failed.');
    } finally {
      setDagBusy(false);
    }
  }, [dagRuns, loadDagData, selectedSubprojectId, workflowRun?.id]);

  const handleRetrievalRefresh = useCallback(async () => {
    setRetrievalBusy(true);
    try {
      await loadRetrievalData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Retrieval refresh failed: ${cause.message}` : 'Retrieval refresh failed.');
    } finally {
      setRetrievalBusy(false);
    }
  }, [loadRetrievalData, selectedSubprojectId]);

  const handleRetrievalSetMode = useCallback(async (mode: RetrievalGovernance['mode']) => {
    setRetrievalBusy(true);
    try {
      setRetrievalGovernance(await updateRetrievalGovernance({ subprojectId: selectedSubprojectId, mode }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Retrieval mode update failed: ${cause.message}` : 'Retrieval mode update failed.');
    } finally {
      setRetrievalBusy(false);
    }
  }, [selectedSubprojectId]);

  const handleRetrievalIndex = useCallback(async () => {
    setRetrievalBusy(true);
    try {
      setRetrievalGovernance(await indexRetrievalGovernance(selectedSubprojectId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Retrieval index failed: ${cause.message}` : 'Retrieval index failed.');
    } finally {
      setRetrievalBusy(false);
    }
  }, [selectedSubprojectId]);

  const handleRetrievalSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      return;
    }

    setRetrievalBusy(true);
    try {
      setRetrievalSearchResult(await searchRetrievalGovernance(selectedSubprojectId, query.trim()));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Retrieval search failed: ${cause.message}` : 'Retrieval search failed.');
    } finally {
      setRetrievalBusy(false);
    }
  }, [selectedSubprojectId]);

  const handleHermesRefresh = useCallback(async () => {
    if (!workflowRun) {
      return;
    }

    setHermesBusy(true);
    try {
      setHermesPolicy(await loadHermesPolicy(workflowRun.id, selectedSubprojectId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Hermes policy refresh failed: ${cause.message}` : 'Hermes policy refresh failed.');
    } finally {
      setHermesBusy(false);
    }
  }, [selectedSubprojectId, workflowRun]);

  const handleRefreshV07RuntimeGovernance = useCallback(async () => {
    setV07RuntimeBusy(true);
    try {
      await loadV07RuntimeGovernanceData(selectedSubprojectId);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `v0.7 runtime governance refresh failed: ${cause.message}`
          : 'v0.7 runtime governance refresh failed.',
      );
    } finally {
      setV07RuntimeBusy(false);
    }
  }, [loadV07RuntimeGovernanceData, selectedSubprojectId]);

  const handlePromoteRepeatCorrection = useCallback(
    async (candidateId: string) => {
      setV07RuntimeBusy(true);
      try {
        await promoteRepeatCorrectionCandidate(candidateId, selectedSubprojectId);
        await Promise.all([
          loadV07RuntimeGovernanceData(selectedSubprojectId),
          loadTraceabilityData(selectedSubprojectId),
        ]);
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `repeat correction promote failed: ${cause.message}`
            : 'repeat correction promote failed.',
        );
      } finally {
        setV07RuntimeBusy(false);
      }
    },
    [loadTraceabilityData, loadV07RuntimeGovernanceData, selectedSubprojectId],
  );

  const handleSwitchMode = useCallback(async (mode: CollaborationModeName) => {
    setMcpContextBusy(true);
    try {
      const nextModeState = await setMcpContextMode(mode);
      setMcpModeState(nextModeState);
      await loadSharedContextData();
      await loadMcpModeData();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? `mcp-context mode switch failed: ${cause.message}` : 'mcp-context mode switch failed.');
    } finally {
      setMcpContextBusy(false);
    }
  }, [loadMcpModeData, loadSharedContextData]);

  const activeScopeLabel = selectedSubproject?.name ?? 'PMAIOS Platform';
  const activeScopeDescription =
    selectedSubproject?.description ?? '平台级运行总控，承接 workflow、trace、agent、artifact 与版本闭环。';
  const activeScopeId = selectedSubprojectId ?? 'platform-root';
  const workflowProgressLabel = workflowMetrics
    ? `${workflowMetrics.completedStages}/${workflowMetrics.totalStages} stages complete`
    : 'workflow metrics unavailable';
  const outputTotal = productChiefOutputs.length + requirements.length + versionEntries.length;
  const runtimeHeroCards = [
    {
      label: 'Active Scope',
      value: activeScopeLabel,
      detail: activeScopeId,
    },
    {
      label: 'Conversation State',
      value: activeSession?.title ?? 'No session',
      detail: sending ? 'assistant is responding' : 'ready for next prompt',
    },
    {
      label: 'Workflow Signals',
      value: workflowRun?.status ?? 'no active workflow',
      detail: workflowProgressLabel,
    },
    {
      label: '实时产出',
      value: String(outputTotal),
      detail: `${productChiefOutputs.length} PM产出 / ${requirements.length} 需求 / ${versionEntries.length} 版本`,
    },
  ];
  const orchestrationCards = [
    {
      title: 'Chief / Review Layer',
      status: productChiefReports.length ? 'active' : 'standby',
      detail: `${productChiefReports.length} reports / ${productChiefReviews.length} reviews`,
      summary: '负责汇总判断、评审意见和最终收敛。',
    },
    {
      title: 'Product Agent Layer',
      status: productAgents.length ? 'active' : 'standby',
      detail: `${productAgents.length} agents / ${productAgentBlueprints.length} blueprints`,
      summary: '负责分工执行、子任务推进与多 agent 协作链路。',
    },
    {
      title: 'Execution / Trace Layer',
      status: workflowRun?.status ?? 'idle',
      detail: `${mcpTasks.length} tasks / ${mcpEvents.length} events / ${mcpCheckpoints.length} checkpoints`,
      summary: '把 workflow、trace、共享上下文和版本收口到同一运行面。',
    },
  ];
  const modalityCards = [
    {
      title: 'Conversation',
      value: `${messages.length} messages`,
      detail: '对话、语音输入与运行态上下文。',
    },
    {
      title: 'Knowledge / Retrieval',
      value: retrievalGovernance ? retrievalGovernance.mode : 'unconfigured',
      detail: '知识检索、索引治理与证据回流。',
    },
    {
      title: 'External Connectors',
      value: externalConnectorStatus
        ? `${Number(externalConnectorStatus.notion.configured) + Number(externalConnectorStatus.figma.configured) + Number(externalConnectorStatus.webFetch.configured) + Number(externalConnectorStatus.dataki.configured)} configured`
        : 'pending',
      detail: 'Notion / Figma / Web / DingTalk / Dataki 接入位。',
    },
    {
      title: 'Artifacts',
      value: `${outputTotal} assets`,
      detail: '需求、版本、PM 产出和能力资产沉淀。',
    },
  ];
  const wikiCards = [
    {
      label: 'Human Wiki',
      title: '人读工作层',
      detail: '面向团队成员的业务入口、工作区、状态卡片与模块导航。',
      items: [activeScopeLabel, activeSession?.title ?? '暂无会话', latestProductOutputTitle],
    },
    {
      label: 'AI Archive',
      title: 'AI 归档层',
      detail: '面向系统的 trace、checkpoint、task、version 与 capability 归档。',
      items: [latestRequirementTitle, latestVersionSummary, latestCapabilityName],
    },
  ];
  const skillCards = [
    {
      title: 'Product Skills',
      status: productSkillSurface ? `${productSkillSurface.summary.total} registered` : 'pending',
      items: productSkillSurface
        ? [
            `${productSkillSurface.summary.product} product`,
            `${productSkillSurface.summary.design} design`,
            `${productSkillSurface.summary.documentation} documentation`,
          ]
        : ['waiting skill surface', 'waiting registry sync', 'waiting categorization'],
    },
    {
      title: 'Runtime Skills',
      status: codexLocalState ? `${codexLocalState.diff.localVisibleAndRegisteredSkills.length} synced` : 'pending',
      items: codexLocalState
        ? [
            `${codexLocalState.localSkills.length} local skills`,
            `${codexLocalState.governedRuntimeCapabilities.length} governed builtin`,
            `${codexLocalState.localPlugins.length} plugins`,
          ]
        : ['waiting local sync', 'waiting plugin scan', 'waiting builtin mapping'],
    },
    {
      title: 'Business Modules',
      status: `${subprojects.length} modules`,
      items: subprojects.slice(0, 3).map((item) => item.name).concat(subprojects.length > 3 ? ['...'] : []),
    },
  ];
  const designPipelineCards = [
    {
      stage: 'Design Review',
      owner: 'gpt-5.4',
      detail: '读取截图、草图、需求与上下文，输出结构化改造建议与问题清单。',
      evidence: `${messages.length} messages / ${mcpEvents.length} events`,
    },
    {
      stage: 'Image Direction',
      owner: 'gpt-image-1.5',
      detail: '生成首页方向稿、全景图、模块插画与透明视觉资产。',
      evidence: `${outputTotal} governed assets`,
    },
    {
      stage: 'Revision Loop',
      owner: 'Responses API',
      detail: '把图片、文字指令与上一轮结论保留在同一上下文里，连续压稿。',
      evidence: workflowRun ? `workflow: ${workflowRun.status}` : 'workflow: pending',
    },
    {
      stage: 'Frontend Landing',
      owner: 'Codex',
      detail: '把确定后的视觉与结构直接落到 src/frontend，形成真实页面。',
      evidence: `${subprojects.length} modules / ${productAgents.length} agents`,
    },
  ];
  const moduleEntryCards = [
    { title: '运行监控', detail: '对话、工作流与调度执行面', onClick: () => setInspectorView('monitoring') },
    { title: '需求与版本', detail: '需求、版本、回滚与交付产出面', onClick: () => setInspectorView('outputs') },
    { title: '能力与资产', detail: '能力、评测、知识与外部连接器', onClick: () => setInspectorView('assets') },
  ];

  if (loading) {
    return <div className="app-loading">正在加载 PMAIOS 页面...</div>;
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <div className="workspace-topbar__copy">
          <p className="eyebrow">PMAIOS</p>
          <h1 className="workspace-topbar__title">产品经理 Agent 统一入口</h1>
          <p className="workspace-topbar__summary">
            这里是 PMAIOS 平台本体。首页优先展示范围、状态、动作、证据、交付位置和业务模块入口，不再使用聊天客户端或 AI 演示页式首屏。
          </p>
        </div>
        <div className="workspace-topbar__meta">
          <span className="workspace-chip">范围：{selectedSubprojectId ?? 'platform'}</span>
          <span className="workspace-chip">会话：{sessions.length}</span>
          <span className="workspace-chip">运行：{runs.length}</span>
          <span className="workspace-chip">消息：{messages.length}</span>
        </div>
      </header>

      <section className="runtime-command-deck">
        <div className="runtime-command-deck__intro">
          <p className="eyebrow">统一入口</p>
          <h2>PMAIOS 平台总控</h2>
          <p className="runtime-command-deck__lead">
            先暴露当前范围、运行状态、下一步动作和产出入口，整页保持企业产品风格，不再走介绍型首屏。
          </p>
          <div className="sidebar-highlight runtime-command-deck__highlight">
            <strong>{activeScopeLabel}</strong>
            <span>{activeScopeDescription}</span>
          </div>
        </div>
        <div className="runtime-command-deck__rail">
          {runtimeHeroCards.map((card) => (
            <article key={card.label} className="metric-tile metric-tile--command">
              <span className="metric-tile__label">{card.label}</span>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="runtime-overview-grid">
        <section className="runtime-overview-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">多 Agent 编排</p>
              <h2>多 Agent 协作</h2>
            </div>
          </div>
          <div className="runtime-card-grid runtime-card-grid--triple">
            {orchestrationCards.map((card) => (
              <article key={card.title} className="trace-event trace-event--ok runtime-feature-card">
                <div className="trace-event__kind">{card.status}</div>
                <div className="trace-event__detail">{card.title}</div>
                <div className="trace-event__meta">{card.detail}</div>
                <div className="trace-event__artifact">{card.summary}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="runtime-overview-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">多模态输入</p>
              <h2>多模态输入面</h2>
            </div>
          </div>
          <div className="runtime-card-grid runtime-card-grid--quad">
            {modalityCards.map((card) => (
              <article key={card.title} className="metric-tile runtime-mini-card">
                <span className="metric-tile__label">{card.title}</span>
                <strong>{card.value}</strong>
                <span>{card.detail}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="runtime-overview-panel runtime-overview-panel--split">
          <div className="runtime-split">
            <div>
              <p className="eyebrow">双层 wiki</p>
              <h2>双层 wiki</h2>
              <div className="runtime-card-grid runtime-card-grid--double">
                {wikiCards.map((card) => (
                  <article key={card.label} className="trace-event trace-event--ok runtime-feature-card">
                    <div className="trace-event__kind">{card.label}</div>
                    <div className="trace-event__detail">{card.title}</div>
                    <div className="trace-event__artifact">{card.detail}</div>
                    <div className="trace-event__meta">{card.items.join(' / ')}</div>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Agent 技能</p>
              <h2>技能矩阵</h2>
              <div className="runtime-card-grid runtime-card-grid--triple">
                {skillCards.map((card) => (
                  <article key={card.title} className="trace-event trace-event--ok runtime-feature-card">
                    <div className="trace-event__kind">{card.status}</div>
                    <div className="trace-event__detail">{card.title}</div>
                    <div className="trace-event__meta">{card.items.join(' / ') || 'None'}</div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="runtime-overview-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">设计执行链</p>
              <h2>设计执行链</h2>
            </div>
          </div>
          <div className="runtime-card-grid runtime-card-grid--quad">
            {designPipelineCards.map((card) => (
              <article key={card.stage} className="trace-event trace-event--ok runtime-feature-card runtime-feature-card--pipeline">
                <div className="trace-event__kind">{card.owner}</div>
                <div className="trace-event__detail">{card.stage}</div>
                <div className="trace-event__artifact">{card.detail}</div>
                <div className="trace-event__meta">{card.evidence}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="runtime-overview-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">模块入口</p>
              <h2>平台入口</h2>
            </div>
          </div>
          <div className="artifact-hub-list">
            {moduleEntryCards.map((entry) => (
              <button key={entry.title} type="button" className="action-tile" onClick={entry.onClick}>
                <span className="action-tile__label">{entry.title}</span>
                <strong>{entry.detail}</strong>
                <span className="action-tile__hint">Open</span>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="platform-runtime-grid">
        <section className="platform-runtime-main">
          <section className="platform-command-board">
            <div className="platform-command-board__header">
              <div className="platform-command-board__scope">
                <p className="eyebrow">当前范围</p>
                <h2>PMAIOS 控制台入口</h2>
                <p className="platform-command-board__summary">
                  统一入口先回答范围、阻塞、动作、证据和当前交付位置；对话只是执行区能力，不再定义首页身份。
                </p>
                <div className="sidebar-highlight">
                  <strong>{activeScopeLabel}</strong>
                  <span>{activeScopeDescription}</span>
                </div>
              </div>
              <div className="platform-command-board__picker inspector-panel">
                <label className="sidebar-label" htmlFor="subproject-select">
                  项目范围
                </label>
                <select
                  id="subproject-select"
                  value={selectedSubprojectId ?? ''}
                  onChange={(event) => setSelectedSubprojectId(event.target.value || null)}
                >
                  <option value="">PMAIOS 平台</option>
                  {subprojects.map((subproject) => (
                    <option key={subproject.id} value={subproject.id}>
                      {subproject.name} ({subproject.id})
                    </option>
                  ))}
                </select>
                <div className="context-pill">{selectedSubproject?.description ?? '平台范围'}</div>
                <div className="platform-command-board__chips">
                  <span className="workspace-chip">会话：{sessions.length}</span>
                  <span className="workspace-chip">运行：{runs.length}</span>
                  <span className="workspace-chip">消息：{messages.length}</span>
                </div>
              </div>
            </div>

            <div className="platform-command-board__grid">
              <RuleExecutionStatusPanel
                selectedSubproject={selectedSubproject}
                sessionsCount={sessions.length}
                messagesCount={messages.length}
                workflowRun={workflowRun}
              />

              <TaskContinuationPanel
                state={taskSsotState}
                workflowBusy={workflowBusy}
                schedulerBusy={schedulerBusy}
                schedulerRuns={schedulerRuns}
                onRefreshWorkflow={handleWorkflowRefresh}
                onRunUntilBlocked={handleWorkflowRunUntilBlocked}
                onResumeWorkflow={handleWorkflowResume}
                onApproveReviewGate={handleWorkflowApproveGate}
                onSendToRework={handleWorkflowSendToRework}
                onExecuteHermesWriteback={handleExecuteHermesWriteback}
                onCloseHermesLoop={handleCloseHermesLoop}
              />

              <SchedulerRunPanel
                data={schedulerRuns}
                taskSsotState={taskSsotState}
                busy={schedulerBusy}
                onRefresh={handleRefreshScheduler}
                onTickDue={handleTickDueSchedulerRuns}
                onTickRun={handleTickSchedulerRun}
                onScheduleResumeCurrent={handleScheduleResumeCurrent}
                onScheduleResumeRework={handleScheduleResumeRework}
                onExecuteHermesWriteback={handleExecuteHermesWriteback}
                onCloseHermesLoop={handleCloseHermesLoop}
              />

              <ProofOfWorkPanel
                bundle={proofOfWorkBundle}
                schedulerRuns={schedulerRuns}
                schedulerBusy={schedulerBusy}
                workflowBusy={workflowBusy}
                onRefresh={handleWorkflowRefresh}
                onTickDue={handleTickDueSchedulerRuns}
                onTickRun={handleTickSchedulerRun}
                onScheduleResumeCurrent={handleScheduleResumeCurrent}
                onScheduleResumeRework={handleScheduleResumeRework}
                onApproveGate={handleWorkflowApproveGate}
                onSendToRework={handleWorkflowSendToRework}
                onExecuteHermesWriteback={handleExecuteHermesWriteback}
                onCloseHermesLoop={handleCloseHermesLoop}
              />

              <FinalStateValidationPanel
                report={finalStateValidation}
                browserRunBusy={browserVerificationBusy}
                browserRunResult={liveBrowserVerificationRun}
                onRunBrowserVerification={finalStateValidation ? handleRunFrontendBrowserVerification : null}
              />
              <OutboxPanel items={outboxEnvelopes} />
            </div>
          </section>

          <section className="platform-delivery-grid">
            <section className="execution-deck runtime-workbench-shell">
              <header className="execution-deck__header">
                <div>
                  <p className="eyebrow">执行区</p>
                  <h2>{activeSession?.title ?? '运行执行区 / 对话、工作流与回流'}</h2>
                  <p className="execution-deck__summary">
                    这里承接对话、workflow 推进、语音交互和产出回流，但它只是统一入口中的执行区，不再代表整个首页身份。
                  </p>
                </div>
                <div className="execution-deck__meta">
                  <span>{activeSession?.defaultSubprojectId ?? selectedSubprojectId ?? 'platform'}</span>
                  <span>{runs.length} 个运行</span>
                  <span>{messages.length} 条消息</span>
                </div>
              </header>

              <section className="workspace-summary-grid">
                {runtimeHeroCards.map((card) => (
                  <article key={card.label} className="metric-tile">
                    <span className="metric-tile__label">{card.label}</span>
                    <strong>{card.value}</strong>
                    <span>{card.detail}</span>
                  </article>
                ))}
              </section>

              {error ? <section className="chat-error">{error}</section> : null}

              <section className="workbench-grid">
                <section className="workbench-panel workbench-panel--sessions">
                  <div className="section-header">
                    <div>
                      <p className="eyebrow">会话层</p>
                      <h3>会话编排</h3>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => void handleCreateSession()}>
                      新建会话
                    </button>
                  </div>
                  <div className="session-list">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        className={session.id === activeSessionId ? 'session-card session-card--active' : 'session-card'}
                        onClick={() => setActiveSessionId(session.id)}
                      >
                        <strong>{session.title}</strong>
                        <span>{session.defaultSubprojectId ?? 'platform'}</span>
                        <time>{new Date(session.updatedAt).toLocaleString('zh-CN')}</time>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="workbench-panel workbench-panel--transcript">
                  <div className="section-header">
                    <div>
                      <p className="eyebrow">对话轨迹</p>
                      <h3>对话与回流</h3>
                    </div>
                  </div>
                  <section className="chat-transcript">
                    {messages.length === 0 ? (
                      <div className="chat-empty">还没有消息，先发一句。</div>
                    ) : (
                      messages.map((message) => (
                        <button
                          key={message.id}
                          type="button"
                          className={
                            message.id === activeMessageId
                              ? `chat-message chat-message--${message.role} chat-message--active`
                              : `chat-message chat-message--${message.role}`
                          }
                          onClick={() => void handleSelectMessage(message)}
                        >
                          <div className="chat-message__meta">
                            <span>{message.role}</span>
                            <span>{new Date(message.createdAt).toLocaleString('zh-CN')}</span>
                          </div>
                          <div className="chat-message__content">{message.content}</div>
                          <div className="chat-message__footer">
                            <span>run: {message.runId ?? '-'}</span>
                            <span>snapshot: {message.contextSnapshotId ?? '-'}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </section>
                </section>
              </section>

              <section className="chat-composer">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a question or use voice input..."
                  rows={4}
                />
                <div className="chat-composer__status">
                  {voiceStatus || 'Type directly or talk to the workspace.'}
                </div>
                <div className="chat-composer__actions">
                  <button
                    type="button"
                    className={isListening ? 'voice-button voice-button--active' : 'voice-button'}
                    onClick={() => (isListening ? stopListening() : startListening())}
                    disabled={!voiceSupported || sending}
                  >
                    {isListening ? 'Stop Listening' : 'Voice Input'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setAutoSpeak((current) => !current)}
                    disabled={!speechOutputSupported}
                  >
                    {autoSpeak ? 'Disable Auto Speak' : 'Enable Auto Speak'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => (isSpeaking ? stopSpeaking() : playableMessage ? speakText(playableMessage.content) : null)}
                    disabled={!speechOutputSupported || (!isSpeaking && !playableMessage)}
                  >
                    {isSpeaking ? 'Stop Playback' : 'Play Reply'}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleSubmit()}
                    disabled={!draft.trim() || sending || !activeSessionId}
                  >
                    {sending ? '发送中...' : '发送'}
                  </button>
                </div>
              </section>
            </section>

            <aside className="evidence-rail">
        <section className="inspector-tabs">
          <button
            type="button"
            className={inspectorView === 'outputs' ? 'inspector-tab inspector-tab--active' : 'inspector-tab'}
            onClick={() => setInspectorView('outputs')}
          >
            实时产出
          </button>
          <button
            type="button"
            className={inspectorView === 'monitoring' ? 'inspector-tab inspector-tab--active' : 'inspector-tab'}
            onClick={() => setInspectorView('monitoring')}
          >
            执行监控
          </button>
          <button
            type="button"
            className={inspectorView === 'assets' ? 'inspector-tab inspector-tab--active' : 'inspector-tab'}
            onClick={() => setInspectorView('assets')}
          >
            资产库
          </button>
        </section>

        {inspectorView === 'outputs' ? (
          <>
            <RecentOutputTimelinePanel
              outputs={productChiefOutputs}
              requirements={requirements}
              versions={versionEntries}
            />
            <div ref={productOutputsSectionRef}>
              <ProductChiefPanel
                reports={productChiefReports}
                outputs={productChiefOutputs}
                latestUiSchemaContract={latestUiSchemaContract}
                imageBatches={productChiefImageBatches}
                reviews={productChiefReviews}
                groupSessions={multiPmGroupSessions}
                busy={productChiefBusy}
                selectedSubprojectId={selectedSubprojectId}
                onRefresh={() => void handleProductChiefRefresh()}
                onAnalyze={(brief) => void handleProductChiefAnalyze(brief)}
                onGenerateOutput={(reportId, type) => void handleProductChiefGenerateOutput(reportId, type)}
                onGenerateAllOutputs={(report) => void handleProductChiefGenerateAllOutputs(report)}
              />
            </div>
            <div ref={requirementSectionRef}>
              <RequirementVersionPanel
                requirements={requirements}
                versions={versionEntries}
                capabilities={capabilities}
                runs={runs}
                activeSessionId={activeSessionId}
                activeMessageId={activeMessageId}
                selectedRequirementId={selectedTraceRequirementId}
                selectedVersionId={selectedTraceVersionId}
                selectedBatchRequirementIds={selectedBatchRequirementIds}
                busy={traceBusy}
                onSelectRequirement={handleSelectTraceRequirement}
                onSelectVersion={setSelectedTraceVersionId}
                onToggleBatchRequirement={handleToggleBatchRequirement}
                onUpdateRequirementStatus={(requirementId, status) => void handleUpdateRequirementStatus(requirementId, status)}
                onBatchUpdateRequirementStatus={(status) => void handleBatchRequirementStatus(status)}
                onSelectCapability={handleSelectTraceCapability}
                onSelectRun={(runId) => void handleSelectTraceRun(runId)}
                onRefresh={() => void loadTraceabilityData(selectedSubprojectId)}
                onIngestCurrentChat={() => void handleIngestCurrentChat()}
                onCreateManualRequirement={() => void handleCreateManualRequirement()}
                onRollbackVersion={(entry) => void handleRollbackVersion(entry)}
                requirementPoolWorkbookPath={
                  selectedSubprojectId
                    ? `subprojects/${selectedSubprojectId}/docs/operations/requirement-pool.xlsx`
                    : 'docs/operations/requirement-pool.xlsx'
                }
              />
            </div>
          </>
        ) : null}

        {inspectorView === 'monitoring' ? (
          <>
            <MonitoringOverviewPanel
              run={workflowRun}
              metrics={workflowMetrics}
              review={workflowReview}
              observability={selectedObservability}
            />
            <ContextInspector snapshot={selectedContextSnapshot} fallbackSnapshotId={selectedRun?.contextSnapshotId ?? null} />
            <RunTracePanel run={selectedRun} events={runEvents} />
            <ReviewPanel report={selectedReview} />
            <ObservabilityPanel observability={selectedObservability} />
            <WorkflowOpsPanel
              run={workflowRun}
              metrics={workflowMetrics}
              review={workflowReview}
              busy={workflowBusy}
              onRefresh={() => void handleWorkflowRefresh()}
              onAdvance={() => void handleWorkflowAdvance()}
              onRunUntilBlocked={() => void handleWorkflowRunUntilBlocked()}
              onResume={() => void handleWorkflowResume()}
              onApproveGate={() => void handleWorkflowApproveGate()}
              onSendToRework={() => void handleWorkflowSendToRework()}
            />
            <HermesPolicyPanel report={hermesPolicy} busy={hermesBusy} onRefresh={() => void handleHermesRefresh()} />
            <V07RuntimeGovernancePanel
              snapshot={v07RuntimeGovernance}
              busy={v07RuntimeBusy}
              onRefresh={() => void handleRefreshV07RuntimeGovernance()}
              onPromote={(candidateId) => void handlePromoteRepeatCorrection(candidateId)}
            />
            <DagPanel
              graph={dagGraph}
              runs={dagRuns}
              changes={dagChanges}
              busy={dagBusy}
              activeNodeId={workflowRun?.currentStageId ?? null}
              onRefresh={() => void handleDagRefresh()}
              onRegisterChange={() => void handleDagRegisterChange()}
              onRerunDirty={() => void handleDagRerunDirty()}
            />
            <ArtifactPreview artifact={selectedArtifact} />
          </>
        ) : null}

        {inspectorView === 'assets' ? (
          <>
            <div ref={capabilitySectionRef}>
              <CapabilityPanel
                capabilities={capabilities}
                datasets={evaluationDatasets}
                evaluationRuns={evaluationRuns}
                evaluationHistory={evaluationHistory}
                requirements={requirements}
                versionEntries={versionEntries}
                filteredCapabilityIds={filteredCapabilityIds}
                selectedCapabilityId={selectedCapabilityId}
                selectedEvaluationRunId={selectedEvaluationRunId}
                selectedRequirementIds={selectedRequirementIds}
                busy={capabilityBusy}
                registrationDraft={capabilityDraft}
                publishDraft={publishDraft}
                onRegistrationDraftChange={handleRegistrationDraftChange}
                onPublishDraftChange={handlePublishDraftChange}
                onCreateCapability={() => void handleCreateCapability()}
                onSelectCapability={setSelectedCapabilityId}
                onToggleRequirement={handleToggleRequirement}
                onSelectEvaluationRun={setSelectedEvaluationRunId}
                onRefresh={() => void loadCapabilityData(selectedSubprojectId)}
                onCreateDataset={() => void handleCreateCapabilityDataset()}
                onRunEvaluation={() => void handleRunCapabilityEvaluation()}
                onPublish={() => void handlePublishCapability()}
                onRollbackVersion={(version) => void handleRollbackCapabilityVersion(version)}
                onInvoke={() => void handleInvokeCapability()}
              />
            </div>
            <ProductSkillPanel
              surface={productSkillSurface}
              codexLocalState={codexLocalState}
              busy={productAgentBusy}
              onRefresh={() => void loadProductAgentData(selectedSubprojectId)}
            />
            <ExternalConnectorsPanel
              selectedSubprojectId={selectedSubprojectId}
              status={externalConnectorStatus}
              latestWebFetch={latestWebFetch}
              latestFigmaInspection={latestFigmaInspection}
              latestDingTalkImport={latestDingTalkImport}
              latestDatakiKnowledgeBases={latestDatakiKnowledgeBases}
              latestDatakiKnowledgeFiles={latestDatakiKnowledgeFiles}
              latestDatakiSearch={latestDatakiSearch}
              busy={externalConnectorBusy}
              onRefresh={() => void handleExternalConnectorRefresh()}
              onWebFetch={(url) => void handleWebFetch(url)}
              onInspectFigma={(fileKey) => void handleInspectFigma(fileKey)}
              onImportDingTalk={(title, content) => void handleImportDingTalk(title, content)}
              onListDatakiKnowledgeBases={(input) => void handleListDatakiKnowledgeBases(input)}
              onListDatakiKnowledgeFiles={(input) => void handleListDatakiKnowledgeFiles(input)}
              onSearchDatakiKnowledge={(input) => void handleSearchDatakiKnowledge(input)}
            />
            <RetrievalGovernancePanel
              settings={retrievalGovernance}
              searchResult={retrievalSearchResult}
              busy={retrievalBusy}
              onRefresh={() => void handleRetrievalRefresh()}
              onSetMode={(mode) => void handleRetrievalSetMode(mode)}
              onIndex={() => void handleRetrievalIndex()}
              onSearch={(query) => void handleRetrievalSearch(query)}
            />
          </>
        ) : null}
            </aside>
          </section>
        </section>

        <aside className="platform-runtime-side">
          <ModeRuntimePanel
            modeState={mcpModeState}
            modeHistory={mcpModeHistory}
            busy={mcpContextBusy}
            onSwitchMode={handleSwitchMode}
          />

          <ExecutionChecklistPanel summary={executionChecklistSummary} />

          <ArtifactHubPanel
            counts={{
              requirements: requirements.length,
              versions: versionEntries.length,
              capabilities: capabilities.length,
              datasets: evaluationDatasets.length,
              productOutputs: productChiefOutputs.length,
            }}
            latest={{
              requirement: latestRequirementTitle,
              version: latestVersionSummary,
              capability: latestCapabilityName,
              dataset: latestDatasetName,
              productOutput: latestProductOutputTitle,
            }}
            onOpenRequirements={() => {
              setInspectorView('outputs');
              setTimeout(() => scrollToSection(requirementSectionRef), 0);
            }}
            onOpenVersions={() => {
              setInspectorView('outputs');
              setTimeout(() => scrollToSection(requirementSectionRef), 0);
            }}
            onOpenCapabilities={() => {
              setInspectorView('assets');
              setTimeout(() => scrollToSection(capabilitySectionRef), 0);
            }}
            onOpenDatasets={() => {
              setInspectorView('assets');
              setTimeout(() => scrollToSection(capabilitySectionRef), 0);
            }}
            onOpenProductOutputs={() => {
              setInspectorView('outputs');
              setTimeout(() => scrollToSection(productOutputsSectionRef), 0);
            }}
          />

          <DailyDigestPanel items={dailyDigests} />
          <ProjectEntryPanel items={projectEntries} />
          <SharedContextPanel tasks={mcpTasks} checkpoints={mcpCheckpoints} events={mcpEvents} />
        </aside>
      </section>
    </div>
  );
}



