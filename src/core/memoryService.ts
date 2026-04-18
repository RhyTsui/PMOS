import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FileStore } from './fileStore.js';
import type {
  CapabilityDefinition,
  CapabilityEvaluation,
  CapabilityInvocation,
  EvaluationDataset,
  EvaluationRun,
  Requirement,
  VersionEntry,
  ChatMessage,
  ChatSession,
  ContextSnapshot,
  ExecutionEvent,
  ExecutionRun,
  ProductAgent,
  WorkflowEvent,
  WorkflowRun,
} from '../shared/schemas.js';
import { ChatSessionSchema, ContextSnapshotSchema } from '../shared/schemas.js';
import {
  getCapabilityDirectoryPath,
  getCapabilityEvaluationDirectoryPath,
  getCapabilityEvaluationPath,
  getCapabilityInvocationLogPath,
  getCapabilityPath,
  getEvaluationDatasetDirectoryPath,
  getEvaluationDatasetPath,
  getEvaluationRunDirectoryPath,
  getEvaluationRunPath,
  getRequirementDirectoryPath,
  getRequirementPath,
  getVersionEntryDirectoryPath,
  getVersionEntryPath,
  getChatMessagesPath,
  getChatSessionPath,
  getContextDocumentRoots,
  getContextSnapshotPath,
  getEventLogPath,
  getExecutionEventLogPath,
  getExecutionRunStatePath,
  getProductAgentDirectoryPath,
  getProductAgentPath,
  getProjectMemoryPath,
  getRunStatePath,
  getTruthSourceDocumentPaths,
} from './projectPaths.js';

export type ContextDocument = {
  path: string;
  content: string;
};

type ChatSessionInput =
  Omit<
    ChatSession,
    'operatorRole' | 'scopeType' | 'primarySubprojectId' | 'linkedSubprojectIds' | 'workspacePath' | 'workspaceEntryType'
  >
  & Partial<
    Pick<
      ChatSession,
      'operatorRole' | 'scopeType' | 'primarySubprojectId' | 'linkedSubprojectIds' | 'workspacePath' | 'workspaceEntryType'
    >
  >;

type ContextSnapshotInput =
  Omit<ContextSnapshot, 'operatorRole' | 'scopeType' | 'primarySubprojectId' | 'linkedSubprojectIds'>
  & Partial<Pick<ContextSnapshot, 'operatorRole' | 'scopeType' | 'primarySubprojectId' | 'linkedSubprojectIds'>>;

export class MemoryService {
  constructor(private readonly store: FileStore) {}

  async loadProjectMemory(projectMemoryPath = getProjectMemoryPath()) {
    return this.store.read(projectMemoryPath);
  }

  async loadTruthSourceDocuments(subprojectId?: string | null): Promise<ContextDocument[]> {
    const documents = await Promise.all(
      getTruthSourceDocumentPaths(subprojectId).map(async (documentPath) => {
        if (!(await this.store.exists(documentPath))) {
          return null;
        }

        return {
          path: documentPath,
          content: await this.store.read(documentPath),
        } satisfies ContextDocument;
      }),
    );

    return documents.filter((document): document is ContextDocument => document !== null);
  }

  async loadContextDocuments(subprojectId?: string | null): Promise<ContextDocument[]> {
    const roots = getContextDocumentRoots(subprojectId);
    const results = await Promise.all(roots.map((root) => this.loadMarkdownDocumentsFromRoot(root)));
    return results.flat();
  }

  getChatSessionPath(sessionId: string, subprojectId?: string | null) {
    return getChatSessionPath(sessionId, subprojectId);
  }

  getChatMessagesPath(sessionId: string, subprojectId?: string | null) {
    return getChatMessagesPath(sessionId, subprojectId);
  }

  getContextSnapshotPath(snapshotId: string, subprojectId?: string | null) {
    return getContextSnapshotPath(snapshotId, subprojectId);
  }

  getExecutionRunStatePath(runId: string, subprojectId?: string | null) {
    return getExecutionRunStatePath(runId, subprojectId);
  }

  getExecutionEventLogPath(runId: string, subprojectId?: string | null) {
    return getExecutionEventLogPath(runId, subprojectId);
  }

  getProductAgentPath(agentId: string, subprojectId?: string | null) {
    return getProductAgentPath(agentId, subprojectId);
  }

  getCapabilityPath(capabilityId: string, subprojectId?: string | null) {
    return getCapabilityPath(capabilityId, subprojectId);
  }

  getCapabilityEvaluationPath(evaluationId: string, subprojectId?: string | null) {
    return getCapabilityEvaluationPath(evaluationId, subprojectId);
  }

  getCapabilityInvocationLogPath(capabilityId: string, subprojectId?: string | null) {
    return getCapabilityInvocationLogPath(capabilityId, subprojectId);
  }

  getEvaluationDatasetPath(datasetId: string, subprojectId?: string | null) {
    return getEvaluationDatasetPath(datasetId, subprojectId);
  }

  getEvaluationRunPath(runId: string, subprojectId?: string | null) {
    return getEvaluationRunPath(runId, subprojectId);
  }

  getRequirementPath(requirementId: string, subprojectId?: string | null) {
    return getRequirementPath(requirementId, subprojectId);
  }

  getVersionEntryPath(versionId: string, subprojectId?: string | null) {
    return getVersionEntryPath(versionId, subprojectId);
  }

  async saveProductAgent(agent: ProductAgent) {
    await this.store.writeJson(this.getProductAgentPath(agent.id, agent.subprojectId), agent);
  }

  async loadProductAgent(agentId: string, subprojectId?: string | null) {
    const target = await this.resolveProductAgentPath(agentId, subprojectId);
    return this.store.readJson<ProductAgent>(target);
  }

  async listProductAgents(subprojectId?: string | null) {
    const relativeDir = getProductAgentDirectoryPath(subprojectId);
    const dirPath = this.store.resolve(relativeDir);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const agents = await Promise.all(
        entries
          .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
          .map(async (entry) => this.store.readJson<ProductAgent>(path.posix.join(relativeDir, entry.name))),
      );
      return agents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return [];
    }
  }

  async saveCapability(capability: CapabilityDefinition) {
    await this.store.writeJson(this.getCapabilityPath(capability.id, capability.subprojectId), capability);
  }

  async loadCapability(capabilityId: string, subprojectId?: string | null) {
    const target = await this.resolveCapabilityPath(capabilityId, subprojectId);
    return this.store.readJson<CapabilityDefinition>(target);
  }

  async listCapabilities(subprojectId?: string | null) {
    const relativeDir = getCapabilityDirectoryPath(subprojectId);
    return this.listJsonDirectory<CapabilityDefinition>(relativeDir, (a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveCapabilityEvaluation(evaluation: CapabilityEvaluation) {
    await this.store.writeJson(this.getCapabilityEvaluationPath(evaluation.id, evaluation.subprojectId), evaluation);
  }

  async listCapabilityEvaluations(subprojectId?: string | null) {
    const relativeDir = getCapabilityEvaluationDirectoryPath(subprojectId);
    return this.listJsonDirectory<CapabilityEvaluation>(relativeDir, (a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async appendCapabilityInvocation(capabilityId: string, invocation: CapabilityInvocation, subprojectId?: string | null) {
    const target = this.getCapabilityInvocationLogPath(capabilityId, subprojectId ?? invocation.subprojectId);
    const existing = (await this.store.exists(target)) ? `${await this.store.read(target)}\n` : '';
    await this.store.write(target, `${existing}${JSON.stringify(invocation)}`);
  }

  async loadCapabilityInvocations(capabilityId: string, subprojectId?: string | null): Promise<CapabilityInvocation[]> {
    const target = await this.resolveCapabilityInvocationLogPath(capabilityId, subprojectId);
    if (!(await this.store.exists(target))) {
      return [];
    }

    const raw = await this.store.read(target);
    return raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CapabilityInvocation);
  }

  async saveEvaluationDataset(dataset: EvaluationDataset) {
    await this.store.writeJson(this.getEvaluationDatasetPath(dataset.id, dataset.subprojectId), dataset);
  }

  async loadEvaluationDataset(datasetId: string, subprojectId?: string | null) {
    const target = await this.resolveEvaluationDatasetPath(datasetId, subprojectId);
    return this.store.readJson<EvaluationDataset>(target);
  }

  async listEvaluationDatasets(subprojectId?: string | null) {
    const relativeDir = getEvaluationDatasetDirectoryPath(subprojectId);
    return this.listJsonDirectory<EvaluationDataset>(relativeDir, (a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveEvaluationRun(run: EvaluationRun) {
    await this.store.writeJson(this.getEvaluationRunPath(run.id, run.subprojectId), run);
  }

  async loadEvaluationRun(runId: string, subprojectId?: string | null) {
    const target = await this.resolveEvaluationRunPath(runId, subprojectId);
    return this.store.readJson<EvaluationRun>(target);
  }

  async listEvaluationRuns(subprojectId?: string | null) {
    const relativeDir = getEvaluationRunDirectoryPath(subprojectId);
    return this.listJsonDirectory<EvaluationRun>(relativeDir, (a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async saveRequirement(requirement: Requirement) {
    await this.store.writeJson(this.getRequirementPath(requirement.id, requirement.subprojectId), requirement);
  }

  async loadRequirement(requirementId: string, subprojectId?: string | null) {
    const target = await this.resolveRequirementPath(requirementId, subprojectId);
    return this.store.readJson<Requirement>(target);
  }

  async listRequirements(subprojectId?: string | null) {
    const relativeDir = getRequirementDirectoryPath(subprojectId);
    return this.listJsonDirectory<Requirement>(relativeDir, (a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveVersionEntry(entry: VersionEntry) {
    await this.store.writeJson(this.getVersionEntryPath(entry.id, entry.subprojectId), entry);
  }

  async loadVersionEntry(versionId: string, subprojectId?: string | null) {
    const target = await this.resolveVersionEntryPath(versionId, subprojectId);
    return this.store.readJson<VersionEntry>(target);
  }

  async listVersionEntries(subprojectId?: string | null) {
    const relativeDir = getVersionEntryDirectoryPath(subprojectId);
    return this.listJsonDirectory<VersionEntry>(relativeDir, (a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getRunStatePath(runId: string, subprojectId?: string | null) {
    return getRunStatePath(runId, subprojectId);
  }

  getEventLogPath(runId: string, subprojectId?: string | null) {
    return getEventLogPath(runId, subprojectId);
  }

  async saveChatSession(session: ChatSessionInput) {
    const normalized = ChatSessionSchema.parse(session);
    await this.store.writeJson(this.getChatSessionPath(normalized.id, normalized.defaultSubprojectId), normalized);
  }

  async loadChatSession(sessionId: string, subprojectId?: string | null) {
    const target = await this.resolveChatSessionPath(sessionId, subprojectId);
    return this.store.readJson<ChatSession>(target);
  }

  async listChatSessionIds(subprojectId?: string | null) {
    const relativeDir = path.posix.dirname(this.getChatSessionPath('__sample__', subprojectId));
    const dirPath = this.store.resolve(relativeDir);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name.replace(/\.json$/u, ''));
    } catch {
      return [];
    }
  }

  async appendChatMessage(sessionId: string, message: ChatMessage, subprojectId?: string | null) {
    const target = this.getChatMessagesPath(sessionId, subprojectId ?? message.subprojectId);
    const existing = (await this.store.exists(target)) ? `${await this.store.read(target)}\n` : '';
    await this.store.write(target, `${existing}${JSON.stringify(message)}`);
  }

  async loadChatMessages(sessionId: string, subprojectId?: string | null): Promise<ChatMessage[]> {
    const target = await this.resolveChatMessagesPath(sessionId, subprojectId);
    if (!(await this.store.exists(target))) {
      return [];
    }

    const raw = await this.store.read(target);
    return raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ChatMessage);
  }

  async saveContextSnapshot(snapshot: ContextSnapshotInput) {
    const normalized = ContextSnapshotSchema.parse(snapshot);
    await this.store.writeJson(this.getContextSnapshotPath(normalized.id, normalized.subprojectId), normalized);
  }

  async loadContextSnapshot(snapshotId: string, subprojectId?: string | null) {
    const target = await this.resolveContextSnapshotPath(snapshotId, subprojectId);
    return this.store.readJson<ContextSnapshot>(target);
  }

  async saveExecutionRun(run: ExecutionRun) {
    await this.store.writeJson(this.getExecutionRunStatePath(run.id, run.subprojectId), run);
  }

  async loadExecutionRun(runId: string, subprojectId?: string | null) {
    const target = await this.resolveExecutionRunStatePath(runId, subprojectId);
    return this.store.readJson<ExecutionRun>(target);
  }

  async listExecutionRunIds(subprojectId?: string | null) {
    const relativeDir = path.posix.dirname(this.getExecutionRunStatePath('__sample__', subprojectId));
    const dirPath = this.store.resolve(relativeDir);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name.replace(/\.json$/u, ''));
    } catch {
      return [];
    }
  }

  async appendExecutionEvent(runId: string, event: ExecutionEvent, subprojectId?: string | null) {
    const target = await this.resolveExecutionEventLogPath(runId, subprojectId, event.runId);
    const existing = (await this.store.exists(target)) ? `${await this.store.read(target)}\n` : '';
    await this.store.write(target, `${existing}${JSON.stringify(event)}`);
  }

  async loadExecutionEvents(runId: string, subprojectId?: string | null): Promise<ExecutionEvent[]> {
    const target = await this.resolveExecutionEventLogPath(runId, subprojectId);
    if (!(await this.store.exists(target))) {
      return [];
    }

    const raw = await this.store.read(target);
    return raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ExecutionEvent);
  }

  async loadRunSnapshot(runId: string, subprojectId?: string | null) {
    const target = await this.resolveRunStatePath(runId, subprojectId);
    return this.store.readJson<WorkflowRun>(target);
  }

  async saveRunSnapshot(runId: string, snapshot: WorkflowRun) {
    await this.store.writeJson(snapshot.memory.runStatePath, snapshot);
  }

  async listRunIds(subprojectId?: string | null) {
    const relativeDir = path.posix.dirname(this.getRunStatePath('__sample__', subprojectId));
    const dirPath = this.store.resolve(relativeDir);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name.replace(/\.json$/u, ''));
    } catch {
      return [];
    }
  }

  async appendEvent(runId: string, event: WorkflowEvent, subprojectId?: string | null) {
    const target = await this.resolveEventLogPath(runId, subprojectId, event.runId);
    const existing = (await this.store.exists(target)) ? `${await this.store.read(target)}\n` : '';
    await this.store.write(target, `${existing}${JSON.stringify(event)}`);
  }

  async loadEvents(runId: string, subprojectId?: string | null): Promise<WorkflowEvent[]> {
    const target = await this.resolveEventLogPath(runId, subprojectId);
    if (!(await this.store.exists(target))) {
      return [];
    }

    const raw = await this.store.read(target);
    return raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as WorkflowEvent);
  }

  private async resolveChatSessionPath(sessionId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getChatSessionPath(sessionId, subprojectId);
    }

    const direct = this.getChatSessionPath(sessionId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getChatSessionPath(sessionId, candidateSubprojectId), direct);
  }

  private async resolveChatMessagesPath(sessionId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getChatMessagesPath(sessionId, subprojectId);
    }

    const direct = this.getChatMessagesPath(sessionId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getChatMessagesPath(sessionId, candidateSubprojectId), direct);
  }

  private async resolveContextSnapshotPath(snapshotId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getContextSnapshotPath(snapshotId, subprojectId);
    }

    const direct = this.getContextSnapshotPath(snapshotId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getContextSnapshotPath(snapshotId, candidateSubprojectId), direct);
  }

  private async resolveExecutionRunStatePath(runId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getExecutionRunStatePath(runId, subprojectId);
    }

    const direct = this.getExecutionRunStatePath(runId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getExecutionRunStatePath(runId, candidateSubprojectId), direct);
  }

  private async resolveExecutionEventLogPath(runId: string, subprojectId?: string | null, fallbackRunId?: string) {
    if (subprojectId !== undefined) {
      return this.getExecutionEventLogPath(runId, subprojectId);
    }

    try {
      const snapshot = await this.loadExecutionRun(fallbackRunId ?? runId);
      return this.getExecutionEventLogPath(runId, snapshot.subprojectId);
    } catch {
      return this.getExecutionEventLogPath(runId);
    }
  }

  private async resolveProductAgentPath(agentId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getProductAgentPath(agentId, subprojectId);
    }

    const direct = this.getProductAgentPath(agentId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getProductAgentPath(agentId, candidateSubprojectId), direct);
  }

  private async resolveCapabilityPath(capabilityId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getCapabilityPath(capabilityId, subprojectId);
    }

    const direct = this.getCapabilityPath(capabilityId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getCapabilityPath(capabilityId, candidateSubprojectId), direct);
  }

  private async resolveCapabilityInvocationLogPath(capabilityId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getCapabilityInvocationLogPath(capabilityId, subprojectId);
    }

    const direct = this.getCapabilityInvocationLogPath(capabilityId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath(
      (candidateSubprojectId) => this.getCapabilityInvocationLogPath(capabilityId, candidateSubprojectId),
      direct,
    );
  }

  private async resolveEvaluationDatasetPath(datasetId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getEvaluationDatasetPath(datasetId, subprojectId);
    }

    const direct = this.getEvaluationDatasetPath(datasetId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getEvaluationDatasetPath(datasetId, candidateSubprojectId), direct);
  }

  private async resolveEvaluationRunPath(runId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getEvaluationRunPath(runId, subprojectId);
    }

    const direct = this.getEvaluationRunPath(runId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getEvaluationRunPath(runId, candidateSubprojectId), direct);
  }

  private async resolveRequirementPath(requirementId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getRequirementPath(requirementId, subprojectId);
    }

    const direct = this.getRequirementPath(requirementId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getRequirementPath(requirementId, candidateSubprojectId), direct);
  }

  private async resolveVersionEntryPath(versionId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getVersionEntryPath(versionId, subprojectId);
    }

    const direct = this.getVersionEntryPath(versionId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getVersionEntryPath(versionId, candidateSubprojectId), direct);
  }

  private async resolveSubprojectScopedPath(
    buildPath: (subprojectId: string) => string,
    fallbackPath: string,
  ) {
    const subprojectsDir = this.store.resolve('subprojects');
    try {
      const entries = await fs.readdir(subprojectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const candidate = buildPath(entry.name);
        if (await this.store.exists(candidate)) {
          return candidate;
        }
      }
    } catch {
      return fallbackPath;
    }

    return fallbackPath;
  }

  private async resolveRunStatePath(runId: string, subprojectId?: string | null) {
    if (subprojectId !== undefined) {
      return this.getRunStatePath(runId, subprojectId);
    }

    const direct = this.getRunStatePath(runId);
    if (await this.store.exists(direct)) {
      return direct;
    }

    return this.resolveSubprojectScopedPath((candidateSubprojectId) => this.getRunStatePath(runId, candidateSubprojectId), direct);
  }

  private async resolveEventLogPath(runId: string, subprojectId?: string | null, fallbackRunId?: string) {
    if (subprojectId !== undefined) {
      return this.getEventLogPath(runId, subprojectId);
    }

    try {
      const snapshot = await this.loadRunSnapshot(fallbackRunId ?? runId);
      return snapshot.memory.eventLogPath;
    } catch {
      return this.getEventLogPath(runId);
    }
  }

  private async loadMarkdownDocumentsFromRoot(root: string): Promise<ContextDocument[]> {
    const absoluteRoot = this.store.resolve(root);

    try {
      const stats = await fs.stat(absoluteRoot);
      if (!stats.isDirectory()) {
        return [];
      }
    } catch {
      return [];
    }

    return this.walkMarkdownTree(absoluteRoot, root);
  }

  private async listJsonDirectory<T>(relativeDir: string, sort?: (a: T, b: T) => number): Promise<T[]> {
    const dirPath = this.store.resolve(relativeDir);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = await Promise.all(
        entries
          .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
          .map(async (entry) => this.store.readJson<T>(path.posix.join(relativeDir, entry.name))),
      );

      return sort ? items.sort(sort) : items;
    } catch {
      return [];
    }
  }

  private async walkMarkdownTree(absoluteDir: string, relativeDir: string): Promise<ContextDocument[]> {
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    const documents: ContextDocument[] = [];

    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = path.posix.join(relativeDir, entry.name.replace(/\\/g, '/'));
      if (entry.isDirectory()) {
        documents.push(...(await this.walkMarkdownTree(absolutePath, relativePath)));
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      documents.push({
        path: relativePath,
        content: await this.store.read(relativePath),
      });
    }

    return documents.sort((left, right) => left.path.localeCompare(right.path));
  }
}
