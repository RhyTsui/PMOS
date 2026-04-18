import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CapabilityDefinition,
  ChatMessage,
  ChatSession,
  ContextSnapshot,
  EvaluationDataset,
  EvaluationRun,
  ExecutionEvent,
  ExecutionObservability,
  ExecutionRun,
  MultimodalArtifact,
  Requirement,
  Subproject,
  VersionEntry,
} from '../shared/schemas';

const FRONTEND_PORT = '5174';
const BACKEND_PORT = '4312';

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

async function loadJsonFile<T>(filePath: string) {
  return fetchJson<T>(`/api/files/${filePath}`);
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
  input: { subprojectId?: string | null; datasetId: string; version: string; evaluator: string },
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

async function listVersions(subprojectId: string | null) {
  return fetchJson<{ items: VersionEntry[] }>(buildScopedUrl('/api/versions', subprojectId));
}

async function ingestChatRequirement(input: { sessionId: string; messageId?: string | null; subprojectId?: string | null }) {
  return fetchJson<Requirement>('/api/requirements/ingest-chat', {
    method: 'POST',
    body: JSON.stringify(input),
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
  if (!observability) {
    return (
      <section className="inspector-panel">
        <h3>Observability</h3>
        <div className="inspector-empty">閫夋嫨涓€鏉″甫 run 鐨勬秷鎭悗鍙煡鐪?timeline 鍜屾枃浠惰拷韪€</div>
      </section>
    );
  }

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
      <div className="trace-list">
        {observability.timeline.length === 0 ? (
          <div className="inspector-empty">鏆傛棤 timeline 浜嬩欢銆</div>
        ) : (
          observability.timeline.slice(0, 12).map((entry) => (
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

function CapabilityPanel({
  capabilities,
  datasets,
  evaluationRuns,
  requirements,
  filteredCapabilityIds,
  selectedCapabilityId,
  selectedEvaluationRunId,
  selectedRequirementIds,
  busy,
  registrationDraft,
  onRegistrationDraftChange,
  onCreateCapability,
  onSelectCapability,
  onToggleRequirement,
  onSelectEvaluationRun,
  onRefresh,
  onCreateDataset,
  onRunEvaluation,
  onPublish,
  onInvoke,
}: {
  capabilities: CapabilityDefinition[];
  datasets: EvaluationDataset[];
  evaluationRuns: EvaluationRun[];
  requirements: Requirement[];
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
  onRegistrationDraftChange: (field: string, value: string) => void;
  onCreateCapability: () => void;
  onSelectCapability: (capabilityId: string) => void;
  onToggleRequirement: (requirementId: string) => void;
  onSelectEvaluationRun: (runId: string) => void;
  onRefresh: () => void;
  onCreateDataset: () => void;
  onRunEvaluation: () => void;
  onPublish: () => void;
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
  busy,
  onSelectRequirement,
  onSelectVersion,
  onSelectCapability,
  onSelectRun,
  onRefresh,
  onIngestCurrentChat,
}: {
  requirements: Requirement[];
  versions: VersionEntry[];
  capabilities: CapabilityDefinition[];
  runs: ExecutionRun[];
  activeSessionId: string | null;
  activeMessageId: string | null;
  selectedRequirementId: string | null;
  selectedVersionId: string | null;
  busy: boolean;
  onSelectRequirement: (requirementId: string | null) => void;
  onSelectVersion: (versionId: string | null) => void;
  onSelectCapability: (capabilityId: string) => void;
  onSelectRun: (runId: string) => void;
  onRefresh: () => void;
  onIngestCurrentChat: () => void;
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
        <h3>Requirement Trace</h3>
        <div className="capability-inline-actions">
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
              {requirement.trace.linkedRunIds.length > 0 ? (
                <div className="trace-event__artifact">runs: {requirement.trace.linkedRunIds.join(', ')}</div>
              ) : null}
            </button>
          ))
        )}
      </div>
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
  const [runEvents, setRunEvents] = useState<ExecutionEvent[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>([]);
  const [evaluationDatasets, setEvaluationDatasets] = useState<EvaluationDataset[]>([]);
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [versionEntries, setVersionEntries] = useState<VersionEntry[]>([]);
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
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
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const selectedSubproject = useMemo(
    () => subprojects.find((subproject) => subproject.id === selectedSubprojectId) ?? null,
    [selectedSubprojectId, subprojects],
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
    setRunEvents([]);
    setActiveMessageId(null);
  }, []);

  const loadCapabilityData = useCallback(async (subprojectId: string | null) => {
    const [capabilityResult, datasetResult, runResult] = await Promise.all([
      listCapabilities(subprojectId),
      listEvaluationDatasets(subprojectId),
      listEvaluationRuns(subprojectId),
    ]);
    setCapabilities(capabilityResult.items);
    setEvaluationDatasets(datasetResult.items);
    setEvaluationRuns(runResult.items);
    setSelectedCapabilityId((current) => current ?? capabilityResult.items[0]?.id ?? null);
    setSelectedEvaluationRunId((current) => current ?? runResult.items[0]?.id ?? null);
  }, []);

  const loadTraceabilityData = useCallback(async (subprojectId: string | null) => {
    const [requirementResult, versionResult] = await Promise.all([listRequirements(subprojectId), listVersions(subprojectId)]);
    setRequirements(requirementResult.items);
    setVersionEntries(versionResult.items);
  }, []);

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
    if (!activeSessionId) {
      setMessages([]);
      setRuns([]);
      setSelectedRun(null);
      setSelectedContextSnapshot(null);
      setSelectedArtifact(null);
      setSelectedObservability(null);
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
      const [run, eventsResult, observability] = await Promise.all([
        loadRun(runId, selectedSubprojectId),
        listRunEvents(runId, selectedSubprojectId),
        loadRunObservability(runId, selectedSubprojectId),
      ]);
      setSelectedRun(run);
      setRunEvents(eventsResult.items);
      setSelectedObservability(observability);
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
      const [eventsResult, observability] = await Promise.all([
        listRunEvents(result.run.id, selectedSubprojectId),
        loadRunObservability(result.run.id, selectedSubprojectId),
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
  }, [activeSessionId, autoSpeak, draft, selectedSubprojectId, sending, speakText, speechOutputSupported, stopListening, stopSpeaking]);

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
        <RunTracePanel run={selectedRun} events={runEvents} />
        <ObservabilityPanel observability={selectedObservability} />
        <ArtifactPreview artifact={selectedArtifact} />
        <CapabilityPanel
          capabilities={capabilities}
          datasets={evaluationDatasets}
          evaluationRuns={evaluationRuns}
          requirements={requirements}
          filteredCapabilityIds={filteredCapabilityIds}
          selectedCapabilityId={selectedCapabilityId}
          selectedEvaluationRunId={selectedEvaluationRunId}
          selectedRequirementIds={selectedRequirementIds}
          busy={capabilityBusy}
          registrationDraft={capabilityDraft}
          onRegistrationDraftChange={handleRegistrationDraftChange}
          onCreateCapability={() => void handleCreateCapability()}
          onSelectCapability={setSelectedCapabilityId}
          onToggleRequirement={handleToggleRequirement}
          onSelectEvaluationRun={setSelectedEvaluationRunId}
          onRefresh={() => void loadCapabilityData(selectedSubprojectId)}
          onCreateDataset={() => void handleCreateCapabilityDataset()}
          onRunEvaluation={() => void handleRunCapabilityEvaluation()}
          onPublish={() => void handlePublishCapability()}
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
          busy={traceBusy}
          onSelectRequirement={handleSelectTraceRequirement}
          onSelectVersion={setSelectedTraceVersionId}
          onSelectCapability={handleSelectTraceCapability}
          onSelectRun={(runId) => void handleSelectTraceRun(runId)}
          onRefresh={() => void loadTraceabilityData(selectedSubprojectId)}
          onIngestCurrentChat={() => void handleIngestCurrentChat()}
        />
      </aside>
    </div>
  );
}



