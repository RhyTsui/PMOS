export type ProjectContext = {
  subprojectId: string | null;
  projectName: string;
  projectDescription: string | null;
  projectRoot: string;
  projectMemoryPath: string;
  selectedProvider: string | null;
  providerConfigPath: string | null;
  mcpConfigPath: string | null;
};

const PLATFORM_TRUTH_SOURCE_PATHS = [
  'workflows/main.md',
  'workflows/execution.md',
  'docs/implementation/PMAIOS愿景.md',
  'docs/tasks/PMAIOS_v0.6_升级任务清单.md',
  'docs/implementation/PMAIOS_v0.6_核心定义.md',
  'docs/decisions/adr-0003-document-taxonomy.md',
  'docs/decisions/adr-0004-v0.6-baseline-adoption.md',
  'docs/memory/global-rules.md',
] as const;

const CONTEXT_DIRECTORY_SEGMENTS = [
  'docs/context/user',
  'docs/context/weekly',
  'docs/context/project',
] as const;

function joinRelativePath(...segments: Array<string | null | undefined>) {
  return segments
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => segment.replace(/^\/+|\/+$/gu, ''))
    .filter(Boolean)
    .join('/');
}

export function getProjectRoot(subprojectId?: string | null) {
  return subprojectId ? joinRelativePath('subprojects', subprojectId) : '';
}

export function prefixProjectPath(projectRoot: string, relativePath: string) {
  return joinRelativePath(projectRoot, relativePath) || relativePath;
}

export function getSubprojectManifestPath(subprojectId: string) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'subproject.json');
}

export function getProjectMemoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/project-memory.md');
}

export function getGlobalRulesPath() {
  return 'docs/memory/global-rules.md';
}

export function getInputInboxPath() {
  return 'docs/sources/inbox';
}

export function getProductAgentBlueprintRegistryPath() {
  return 'config/product-management/agent-blueprints.json';
}

export function getTruthSourceDocumentPaths(subprojectId?: string | null) {
  const projectRoot = getProjectRoot(subprojectId);
  const candidates = [
    ...PLATFORM_TRUTH_SOURCE_PATHS,
    ...PLATFORM_TRUTH_SOURCE_PATHS.map((relativePath) => prefixProjectPath(projectRoot, relativePath)),
  ];

  return [...new Set(candidates)];
}

export function getContextDocumentRoots(subprojectId?: string | null) {
  const projectRoot = getProjectRoot(subprojectId);
  const candidates = [
    ...CONTEXT_DIRECTORY_SEGMENTS,
    ...CONTEXT_DIRECTORY_SEGMENTS.map((relativePath) => prefixProjectPath(projectRoot, relativePath)),
  ];

  return [...new Set(candidates)];
}

export function getRunStatePath(runId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/runs/${runId}.json`);
}

export function getEventLogPath(runId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/events/${runId}.jsonl`);
}

export function getChatSessionPath(sessionId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/chats/sessions/${sessionId}.json`);
}

export function getChatMessagesPath(sessionId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/chats/messages/${sessionId}.jsonl`);
}

export function getContextSnapshotPath(snapshotId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/chats/context-snapshots/${snapshotId}.json`);
}

export function getExecutionRunStatePath(runId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/chats/runs/${runId}.json`);
}

export function getExecutionEventLogPath(runId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/chats/events/${runId}.jsonl`);
}

export function getProductAgentPath(agentId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/product-agents/${agentId}.json`);
}

export function getProductAgentDirectoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/product-agents');
}

export function getCapabilityDirectoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/capabilities');
}

export function getCapabilityPath(capabilityId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/capabilities/${capabilityId}.json`);
}

export function getCapabilityEvaluationDirectoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/capability-evaluations');
}

export function getCapabilityEvaluationPath(evaluationId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/capability-evaluations/${evaluationId}.json`);
}

export function getCapabilityInvocationLogPath(capabilityId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/capability-invocations/${capabilityId}.jsonl`);
}

export function getEvaluationDatasetDirectoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/eval-datasets');
}

export function getEvaluationDatasetPath(datasetId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/eval-datasets/${datasetId}.json`);
}

export function getEvaluationRunDirectoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/eval-runs');
}

export function getEvaluationRunPath(runId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/eval-runs/${runId}.json`);
}

export function getRequirementDirectoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/requirements');
}

export function getRequirementPath(requirementId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/requirements/${requirementId}.json`);
}

export function getVersionEntryDirectoryPath(subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), 'docs/memory/versions');
}

export function getVersionEntryPath(versionId: string, subprojectId?: string | null) {
  return prefixProjectPath(getProjectRoot(subprojectId), `docs/memory/versions/${versionId}.json`);
}

export function createPlatformProjectContext(): ProjectContext {
  return {
    subprojectId: null,
    projectName: 'PMAIOS Platform',
    projectDescription: 'PMAIOS mother platform runtime context',
    projectRoot: '',
    projectMemoryPath: getProjectMemoryPath(null),
    selectedProvider: null,
    providerConfigPath: null,
    mcpConfigPath: null,
  };
}
