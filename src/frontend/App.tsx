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
  HermesPolicyReport,
  MultimodalArtifact,
  ProductChiefMultiAgentReview,
  ProductChiefOutput,
  ProductChiefReport,
  ProductAgent,
  ProviderRoutingSnapshot,
  Requirement,
  RetrievalGovernance,
  Subproject,
  VersionEntry,
  WorkflowMetrics,
  WorkflowRun,
} from '../shared/schemas';
import { ReviewPanel } from './components/ReviewPanel';

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

type ExternalConnectorStatus = {
  notion: {
    configured: boolean;
    connected: boolean | null;
    missing: string[];
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

async function listProductChiefMultiAgentReviews(subprojectId: string | null) {
  return fetchJson<{ items: ProductChiefMultiAgentReview[] }>(buildScopedUrl('/api/product-chief/multi-agent-reviews', subprojectId));
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
        <div className="inspector-empty">杩樻病鏈変笂涓嬫枃蹇収銆</div>
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
        <div className="inspector-empty">閫夋嫨涓€鏉″甫 run 鐨勬秷鎭悗鍙煡鐪嬫墽琛岄摼璺€</div>
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
          <div className="inspector-empty">鏆傛棤浜嬩欢銆</div>
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
        <div className="inspector-empty">閫夋嫨鍖呭惈浜х墿鐨?run 鍚庡彲鏌ョ湅缁撴瀯鍖栫粨鏋溿€</div>
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
        <div className="inspector-empty">閫夋嫨涓€鏉″甫 run 鐨勬秷鎭悗鍙煡鐪?timeline 鍜屾枃浠惰拷韪€</div>
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
          <div className="inspector-empty">鏆傛棤 timeline 浜嬩欢銆</div>
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
        <h3>Provider Routing</h3>
        <div className="inspector-empty">Provider routing has not been loaded yet.</div>
      </section>
    );
  }

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>Provider Routing</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
      </div>
      <div className="provider-routing-summary">
        <div className="provider-routing-summary__card">
          <span>Configured Primary Text</span>
          <strong>{primaryText ? `${primaryText.name} / ${primaryText.model ?? 'default-model'}` : '-'}</strong>
        </div>
        <div className="provider-routing-summary__card">
          <span>Configured Backup Text</span>
          <strong>{backupText ? `${backupText.name} / ${backupText.model ?? 'default-model'}` : '-'}</strong>
        </div>
        <div className="provider-routing-summary__card">
          <span>Configured Preferred Provider</span>
          <strong>{textSnapshot?.preferredProvider ?? textSnapshot?.defaultProvider ?? '-'}</strong>
        </div>
      </div>
      <div className="trace-event__meta">This panel shows routing candidates from config, not the exact model used by the latest reply.</div>
      <div className="inspector-field">
        <span>Scope</span>
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
                <div className="trace-event__meta">No providers available for this capability.</div>
              ) : (
                <div className="provider-routing-list">
                  {snapshot.providers.map((provider) => (
                    <div
                      key={`${snapshot.capability}-${provider.name}-${provider.routedCapability}`}
                      className={`provider-route-chip${provider.coolingDown ? ' provider-route-chip--cooling' : ''}`}
                    >
                      <div className="provider-route-chip__title">
                        <strong>#{provider.order + 1} {provider.name}</strong>
                        <span>{provider.model ?? 'default-model'}</span>
                      </div>
                      <div className="provider-route-chip__meta">
                        routed as {provider.routedCapability} / priority {provider.priority} / score {provider.score}
                      </div>
                      <div className="provider-route-chip__meta">
                        ready: {provider.runtimeReady ? 'yes' : 'no'} / configured: {provider.configured ? 'yes' : 'no'}
                      </div>
                      <div className="provider-route-chip__actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onSetPrimary(provider.name)}
                          disabled={busy}
                        >
                          Set Primary
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onAdjustPriority(provider.name, 10)}
                          disabled={busy}
                        >
                          Priority +
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onAdjustPriority(provider.name, -10)}
                          disabled={busy}
                        >
                          Priority -
                        </button>
                      </div>
                      {provider.coolingDown ? (
                        <div className="provider-route-chip__cooldown">
                          cooling until {provider.cooldownUntil ? new Date(provider.cooldownUntil).toLocaleString('zh-CN') : '-'}
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
        <h3>Workflow Ops</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>
      {!run ? (
        <div className="inspector-empty">No workflow run is available for the current scope.</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Run ID</span>
            <strong>{run.id}</strong>
          </div>
          <div className="inspector-field">
            <span>Status</span>
            <strong>{run.status}</strong>
          </div>
          <div className="inspector-field">
            <span>Active Stage</span>
            <strong>{activeStage?.label ?? run.currentStageId ?? '-'}</strong>
          </div>
          <div className="inspector-field">
            <span>Provider / MCP</span>
            <strong>{run.providerCount} / {run.mcpServerCount}</strong>
          </div>
          <div className="inspector-field">
            <span>Artifacts / Rework</span>
            <strong>{metrics?.artifactCount ?? 0} / {run.reworkCount}</strong>
          </div>
          <div className="inspector-field">
            <span>Review Gate</span>
            <strong>{review?.gate.decision ?? '-'}</strong>
          </div>
          <div className="capability-actions">
            <button type="button" className="secondary-button" onClick={onAdvance} disabled={busy || run.status !== 'running'}>
              Advance
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onRunUntilBlocked}
              disabled={busy || run.status !== 'running'}
            >
              Run Until Blocked
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onResume}
              disabled={busy || (run.status !== 'blocked' && run.status !== 'needs-rework')}
            >
              Resume
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onApproveGate}
              disabled={busy || !review || !review.gate.blocked}
            >
              Approve Gate
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onSendToRework}
              disabled={busy || !review || !review.reworkRequired}
            >
              Send To Rework
            </button>
          </div>
          {metrics ? (
            <div className="trace-list">
              <article className="trace-event">
                <div className="trace-event__kind">Metrics</div>
                <div className="trace-event__detail">
                  completed: {metrics.completedStages}/{metrics.totalStages} / blocked: {metrics.blockedStages}
                </div>
                <div className="trace-event__meta">
                  review issues: {metrics.reviewIssueCount} / completion: {(metrics.completionRate * 100).toFixed(0)}%
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
                  outputs: {stage.outputPaths.length}/{stage.requiredOutputs.length} / attempts: {stage.attemptCount}
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
        <h3>Hermes Policy</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
      </div>
      {!report ? (
        <div className="inspector-empty">No Hermes policy report for the current workflow run.</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Status / Mode</span>
            <strong>
              {report.status} / {report.mode}
            </strong>
          </div>
          <div className="inspector-field">
            <span>Guardrails</span>
            <strong>no route / no plan / no DAG writes / no blocking</strong>
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
        <h3>Portfolio</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>
      <div className="trace-list">
        {entries.length === 0 ? (
          <div className="inspector-empty">No portfolio entries available.</div>
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
                runs: {entry.runCount} / current: {entry.currentRun?.status ?? 'none'}
              </div>
              <div className="trace-event__meta">
                stage: {entry.currentRun?.currentStageId ?? '-'} / completion:{' '}
                {entry.metrics ? `${(entry.metrics.completionRate * 100).toFixed(0)}%` : '-'}
              </div>
              <div className="trace-event__artifact">scope: {entry.subprojectId ?? 'platform'}</div>
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
        <h3>Product Agents</h3>
        <div className="capability-inline-actions">
          <button type="button" className="secondary-button" onClick={onBootstrap} disabled={busy}>
            Bootstrap
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>
      <div className="inspector-field">
        <span>Blueprints / Agents</span>
        <strong>{blueprints.length} / {agents.length}</strong>
      </div>
      <div className="inspector-field">
        <span>Missing Blueprints</span>
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
          <div className="inspector-empty">No product agents available for the current scope.</div>
        ) : (
          agents.slice(0, 10).map((agent) => (
            <article key={agent.id} className="trace-event">
              <div className="trace-event__kind">{agent.name}</div>
              <div className="trace-event__detail">
                {agent.level} / {agent.role} / {agent.scope}
              </div>
              <div className="trace-event__meta">
                managed agents: {agent.managedAgentIds.length} / status: {agent.status}
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
  busy,
  onRefresh,
}: {
  surface: ProductSkillSurface | null;
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
        <h3>Product Skills</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
      </div>
      {!surface ? (
        <div className="inspector-empty">No skill registry loaded.</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Total / Product / Design / Docs</span>
            <strong>
              {surface.summary.total} / {surface.summary.product} / {surface.summary.design} / {surface.summary.documentation}
            </strong>
          </div>
          <div className="inspector-field">
            <span>Design Tooling</span>
            <strong>
              {surface.designTooling.command} / {surface.designTooling.status}
            </strong>
          </div>
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
  status,
  latestWebFetch,
  latestFigmaInspection,
  latestDingTalkImport,
  busy,
  onRefresh,
  onWebFetch,
  onInspectFigma,
  onImportDingTalk,
}: {
  status: ExternalConnectorStatus | null;
  latestWebFetch: WebFetchArtifact | null;
  latestFigmaInspection: FigmaInspection | null;
  latestDingTalkImport: DingTalkMeetingImportResult | null;
  busy: boolean;
  onRefresh: () => void;
  onWebFetch: (url: string) => void;
  onInspectFigma: (fileKey: string) => void;
  onImportDingTalk: (title: string, content: string) => void;
}) {
  const [webUrl, setWebUrl] = useState('');
  const [figmaFileKey, setFigmaFileKey] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingContent, setMeetingContent] = useState('');

  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>External Connectors</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
      </div>
      {!status ? (
        <div className="inspector-empty">No connector status loaded.</div>
      ) : (
        <>
          <div className="inspector-field">
            <span>Notion / Figma / Web / DingTalk</span>
            <strong>
              {status.notion.configured ? 'ready' : 'missing'} / {status.figma.configured ? 'ready' : 'missing'} / ready / manual import
            </strong>
          </div>
          <div className="trace-list">
            <article className={`trace-event trace-event--${status.notion.configured ? 'ok' : 'warning'}`}>
              <div className="trace-event__kind">Notion</div>
              <div className="trace-event__detail">configured: {String(status.notion.configured)} / connected: {String(status.notion.connected)}</div>
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
        </>
      )}
    </section>
  );
}

function ProductChiefPanel({
  reports,
  outputs,
  reviews,
  busy,
  onAnalyze,
  onGenerateOutput,
  onRefresh,
}: {
  reports: ProductChiefReport[];
  outputs: ProductChiefOutput[];
  reviews: ProductChiefMultiAgentReview[];
  busy: boolean;
  onAnalyze: (brief: string) => void;
  onGenerateOutput: (reportId: string, type: string) => void;
  onRefresh: () => void;
}) {
  const [brief, setBrief] = useState('Generate project PM product outputs for the current PMAIOS demo project');
  const latest = reports[0] ?? null;
  const nextOutput = latest?.requiredGovernedOutputs[0] ?? null;
  const usableOutputCount = outputs.filter((output) => output.multiAgentReviewStatus !== 'blocked').length;

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
            <span>Multi-Agent Reviews</span>
            <strong>{reviews.length}</strong>
          </div>
          {nextOutput ? (
            <div className="capability-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onGenerateOutput(latest.id, nextOutput.type)}
                disabled={busy}
              >
                Generate {nextOutput.type}
              </button>
            </div>
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
            {outputs.slice(0, 2).map((output) => (
              <article key={output.id} className="trace-event trace-event--ok">
                <div className="trace-event__kind">{output.type}</div>
                <div className="trace-event__detail">{output.title}</div>
                <div className="trace-event__meta">
                  {output.artifactPath} / review: {output.multiAgentReviewStatus ?? 'pending'}
                </div>
                {output.multiAgentReviewArtifactPath ? (
                  <div className="trace-event__artifact">{output.multiAgentReviewArtifactPath}</div>
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
        <div className="inspector-empty">杩樻病鏈?capability銆傚厛閫氳繃 API 娉ㄥ唽 capability锛岄潰鏉夸細鑷姩鏄剧ず銆</div>
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
                  <div className="inspector-empty">鏆傛棤 requirement 鍙粦瀹氥€</div>
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
                  <div className="inspector-empty">鏆傛棤 evaluation run銆</div>
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
        <span>Batch Selection</span>
        <strong>{selectedBatchRequirementIds.length}</strong>
      </div>
      <div className="trace-list">
        {requirements.length === 0 ? (
          <div className="inspector-empty">鏆傛棤 requirement銆</div>
        ) : (
          requirements.slice(0, 5).map((requirement) => (
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
                versions: {requirement.trace.linkedVersionIds.length} / runs: {requirement.trace.linkedRunIds.length} / related: {requirement.trace.relatedRequirementIds.length}
              </div>
              <div className="trace-event__meta">
                batch: {selectedBatchRequirementIds.includes(requirement.id) ? 'selected' : 'not selected'}
              </div>
              {requirement.trace.linkedRunIds.length > 0 ? (
                <div className="trace-event__artifact">runs: {requirement.trace.linkedRunIds.join(', ')}</div>
              ) : null}
            </button>
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
          <div className="inspector-empty">鏆傛棤 version entry銆</div>
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
              <div className="inspector-empty">褰撳墠 requirement 鏆傛棤 capability 鍙樻洿銆</div>
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
              <div className="inspector-empty">褰撳墠 requirement 杩樻病鏈夊彲鐩存帴鎵撳紑鐨?execution run銆</div>
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

export default function App() {
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
  const [externalConnectorStatus, setExternalConnectorStatus] = useState<ExternalConnectorStatus | null>(null);
  const [latestWebFetch, setLatestWebFetch] = useState<WebFetchArtifact | null>(null);
  const [latestFigmaInspection, setLatestFigmaInspection] = useState<FigmaInspection | null>(null);
  const [latestDingTalkImport, setLatestDingTalkImport] = useState<DingTalkMeetingImportResult | null>(null);
  const [productChiefReports, setProductChiefReports] = useState<ProductChiefReport[]>([]);
  const [productChiefOutputs, setProductChiefOutputs] = useState<ProductChiefOutput[]>([]);
  const [productChiefReviews, setProductChiefReviews] = useState<ProductChiefMultiAgentReview[]>([]);
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
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics | null>(null);
  const [workflowReview, setWorkflowReview] = useState<CommitteeReport | null>(null);
  const [hermesPolicy, setHermesPolicy] = useState<HermesPolicyReport | null>(null);
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
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [productAgentBusy, setProductAgentBusy] = useState(false);
  const [externalConnectorBusy, setExternalConnectorBusy] = useState(false);
  const [productChiefBusy, setProductChiefBusy] = useState(false);
  const [dagBusy, setDagBusy] = useState(false);
  const [retrievalBusy, setRetrievalBusy] = useState(false);
  const [hermesBusy, setHermesBusy] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

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

  const loadProviderRoutingData = useCallback(async (subprojectId: string | null) => {
    const routingResult = await listProviderRouting(subprojectId);
    setProviderRouting(routingResult.items);
  }, []);

  const loadPortfolioData = useCallback(async () => {
    const portfolio = await listPortfolio();
    setPortfolioEntries(portfolio);
  }, []);

  const loadProductAgentData = useCallback(async (subprojectId: string | null) => {
    const [agentResult, blueprintResult, skillSurface] = await Promise.all([
      listProductAgents(subprojectId),
      listProductAgentBlueprints(),
      loadProductSkills(subprojectId),
    ]);
    setProductAgents(agentResult.items);
    setProductAgentBlueprints(blueprintResult.items);
    setProductSkillSurface(skillSurface);
  }, []);

  const loadProductChiefData = useCallback(async (subprojectId: string | null) => {
    const [reports, outputs, reviews] = await Promise.all([
      listProductChiefReports(subprojectId),
      listProductChiefOutputs(subprojectId),
      listProductChiefMultiAgentReviews(subprojectId),
    ]);
    setProductChiefReports(reports.items);
    setProductChiefOutputs(outputs.items);
    setProductChiefReviews(reviews.items);
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
      const [subprojectItems, chatResult] = await Promise.all([listSubprojects(), listChats(selectedSubprojectId)]);
      setSubprojects(subprojectItems);

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
      setVoiceStatus('娑堟伅宸插彂閫侊紝姝ｅ湪绛夊緟鍥炲...');

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

  if (loading) {
    return <div className="app-loading">Loading chat workspace...</div>;
  }

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <div className="sidebar-section">
          <p className="eyebrow">PMAIOS v0.2</p>
          <h1>Chat Workspace</h1>
          <p className="sidebar-copy">Unified entry point for platform chat, scoped context, and run trace inspection.</p>
        </div>

        <div className="sidebar-section">
          <label className="sidebar-label" htmlFor="subproject-select">
            Project Scope
          </label>
          <select
            id="subproject-select"
            value={selectedSubprojectId ?? ''}
            onChange={(event) => setSelectedSubprojectId(event.target.value || null)}
          >
            <option value="">PMAIOS Platform</option>
            {subprojects.map((subproject) => (
              <option key={subproject.id} value={subproject.id}>
                {subproject.name} ({subproject.id})
              </option>
            ))}
          </select>
          <div className="context-pill">{selectedSubproject?.description ?? 'platform scope'}</div>
        </div>

        <div className="sidebar-section sidebar-section--grow">
          <div className="section-header">
            <h2>Chats</h2>
            <button type="button" className="secondary-button" onClick={() => void handleCreateSession()}>
              New Chat
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
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Current Session</p>
            <h2>{activeSession?.title ?? 'Chat'}</h2>
          </div>
          <div className="chat-header__meta">
            <span>{activeSession?.defaultSubprojectId ?? selectedSubprojectId ?? 'platform'}</span>
            <span>{runs.length} runs</span>
            <span>{messages.length} messages</span>
          </div>
        </header>

        <section className="chat-runtime-banner">
          <strong>PMAIOS v0.2</strong>
          <span>Frontend: http://localhost:{FRONTEND_PORT}</span>
          <span>Backend: http://localhost:{BACKEND_PORT}</span>
        </section>

        <section className="chat-runtime-banner chat-runtime-banner--voice">
          <strong>Voice Mode</strong>
          <span>{voiceSupported ? 'Speech input available' : 'Speech input unavailable'}</span>
          <span>{speechOutputSupported ? 'Speech output available' : 'Speech output unavailable'}</span>
          <span>{autoSpeak ? 'Auto speak on' : 'Auto speak off'}</span>
        </section>

        {error ? <section className="chat-error">{error}</section> : null}

        <section className="chat-transcript">
          {messages.length === 0 ? (
            <div className="chat-empty">杩樻病鏈夋秷鎭紝鍏堝彂涓€鍙ャ€</div>
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
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </section>
      </main>

      <aside className="chat-inspector">
        <ContextInspector snapshot={selectedContextSnapshot} fallbackSnapshotId={selectedRun?.contextSnapshotId ?? null} />
        <ProviderRoutingPanel
          snapshots={providerRouting}
          scopeLabel={providerRoutingScopeLabel}
          busy={providerRoutingBusy}
          onRefresh={() => void handleProviderRoutingRefresh()}
          onSetPrimary={(providerName) => void handleSetPrimaryProvider(providerName)}
          onAdjustPriority={(providerName, delta) => void handleAdjustProviderPriority(providerName, delta)}
        />
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
        <PortfolioPanel
          entries={portfolioEntries}
          busy={portfolioBusy}
          onRefresh={() => void handlePortfolioRefresh()}
          onSelectScope={setSelectedSubprojectId}
        />
        <ProductAgentPanel
          agents={productAgents}
          blueprints={productAgentBlueprints}
          busy={productAgentBusy}
          onRefresh={() => void handleProductAgentRefresh()}
          onBootstrap={() => void handleProductAgentBootstrap()}
        />
        <ProductSkillPanel
          surface={productSkillSurface}
          busy={productAgentBusy}
          onRefresh={() => void handleProductAgentRefresh()}
        />
        <ExternalConnectorsPanel
          status={externalConnectorStatus}
          latestWebFetch={latestWebFetch}
          latestFigmaInspection={latestFigmaInspection}
          latestDingTalkImport={latestDingTalkImport}
          busy={externalConnectorBusy}
          onRefresh={() => void handleExternalConnectorRefresh()}
          onWebFetch={(url) => void handleWebFetch(url)}
          onInspectFigma={(fileKey) => void handleInspectFigma(fileKey)}
          onImportDingTalk={(title, content) => void handleImportDingTalk(title, content)}
        />
        <ProductChiefPanel
          reports={productChiefReports}
          outputs={productChiefOutputs}
          reviews={productChiefReviews}
          busy={productChiefBusy}
          onRefresh={() => void handleProductChiefRefresh()}
          onAnalyze={(brief) => void handleProductChiefAnalyze(brief)}
          onGenerateOutput={(reportId, type) => void handleProductChiefGenerateOutput(reportId, type)}
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
        <RetrievalGovernancePanel
          settings={retrievalGovernance}
          searchResult={retrievalSearchResult}
          busy={retrievalBusy}
          onRefresh={() => void handleRetrievalRefresh()}
          onSetMode={(mode) => void handleRetrievalSetMode(mode)}
          onIndex={() => void handleRetrievalIndex()}
          onSearch={(query) => void handleRetrievalSearch(query)}
        />
        <ArtifactPreview artifact={selectedArtifact} />
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
        />
      </aside>
    </div>
  );
}



