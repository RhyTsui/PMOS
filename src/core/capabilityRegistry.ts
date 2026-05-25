import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { ProductAgentService } from './productAgentService.js';
import { WorkflowEngine } from './workflowEngine.js';
import { OrchestratorRuntime } from './orchestratorRuntime.js';
import { ProviderRegistry } from './providerRegistry.js';
import { McpRegistry } from './mcpRegistry.js';
import { ReviewCommittee } from './reviewCommittee.js';
import { SpecialistActivationService } from './specialistActivationService.js';
import { SubprojectRegistry } from './subprojectRegistry.js';
import { EvaluationRunner } from './evaluationRunner.js';
import { VersionRegistry } from './versionRegistry.js';
import { getCapabilityEvaluationPath, getEvaluationRunPath } from './projectPaths.js';
import type {
  CapabilityDefinition,
  CapabilityEvaluation,
  CapabilityEvaluationDimension,
  CapabilityGateSnapshot,
  CapabilityInvocation,
  CapabilityVersion,
  EvaluationDataset,
  EvaluationRun,
  VersionEntry,
} from '../shared/schemas.js';

export type EvaluationHistoryItem = {
  run: EvaluationRun;
  dataset: EvaluationDataset | null;
  capability: CapabilityDefinition | null;
  requirementIds: string[];
  versionEntryIds: string[];
  artifactPaths: string[];
};

export type EvaluationHistory = {
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
  items: EvaluationHistoryItem[];
};

export class CapabilityRegistry {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
    private readonly subprojectRegistry = new SubprojectRegistry(store),
    private readonly productAgentService = new ProductAgentService(store),
    private readonly workflowEngine = new WorkflowEngine(store, new MemoryService(store)),
    private readonly orchestratorRuntime = new OrchestratorRuntime(store, new MemoryService(store)),
    private readonly providerRegistry = new ProviderRegistry(store),
    private readonly mcpRegistry = new McpRegistry(store),
    private readonly reviewCommittee = new ReviewCommittee(),
    private readonly specialistActivationService = new SpecialistActivationService(),
    private readonly evaluationRunner = new EvaluationRunner(new MemoryService(store)),
    private readonly versionRegistry = new VersionRegistry(new MemoryService(store)),
  ) {}

  async listCapabilities(subprojectId?: string | null) {
    return this.memoryService.listCapabilities(subprojectId);
  }

  async loadCapability(capabilityId: string, subprojectId?: string | null) {
    return this.memoryService.loadCapability(capabilityId, subprojectId);
  }

  async listEvaluations(subprojectId?: string | null) {
    return this.memoryService.listCapabilityEvaluations(subprojectId);
  }

  async listEvaluationDatasets(subprojectId?: string | null) {
    return this.evaluationRunner.listDatasets(subprojectId);
  }

  async listEvaluationRuns(subprojectId?: string | null) {
    return this.evaluationRunner.listRuns(subprojectId);
  }

  async getEvaluationHistory(input?: {
    subprojectId?: string | null;
    capabilityId?: string | null;
    version?: string | null;
    requirementId?: string | null;
    versionEntryId?: string | null;
  }): Promise<EvaluationHistory> {
    const subprojectId = input?.subprojectId ?? null;
    const [runs, datasets, capabilities, requirements, versionEntries] = await Promise.all([
      this.evaluationRunner.listRuns(subprojectId),
      this.evaluationRunner.listDatasets(subprojectId),
      this.memoryService.listCapabilities(subprojectId),
      this.memoryService.listRequirements(subprojectId),
      this.memoryService.listVersionEntries(subprojectId),
    ]);
    const datasetById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
    const capabilityById = new Map(capabilities.map((capability) => [capability.id, capability]));
    const requirementIds = new Set(requirements.map((requirement) => requirement.id));
    const versionEntryById = new Map(versionEntries.map((entry) => [entry.id, entry]));

    const items = runs
      .map((run) => this.buildEvaluationHistoryItem(run, datasetById.get(run.datasetId) ?? null, capabilityById.get(run.capabilityId) ?? null, versionEntries))
      .filter((item) => this.matchesEvaluationHistoryFilters(item, input))
      .slice(0, 50);
    const linkedRequirementIds = new Set(items.flatMap((item) => item.requirementIds).filter((id) => requirementIds.has(id)));
    const linkedVersionEntryIds = new Set(items.flatMap((item) => item.versionEntryIds).filter((id) => versionEntryById.has(id)));

    return {
      filters: {
        capabilityId: input?.capabilityId?.trim() || null,
        version: input?.version?.trim() || null,
        requirementId: input?.requirementId?.trim() || null,
        versionEntryId: input?.versionEntryId?.trim() || null,
      },
      summary: {
        runCount: items.length,
        capabilityCount: new Set(items.map((item) => item.run.capabilityId)).size,
        requirementCount: linkedRequirementIds.size,
        versionEntryCount: linkedVersionEntryIds.size,
      },
      items,
    };
  }

  async listInvocations(capabilityId: string, subprojectId?: string | null) {
    return this.memoryService.loadCapabilityInvocations(capabilityId, subprojectId);
  }

  async registerCapability(input: {
    id?: string;
    name: string;
    description: string;
    subprojectId?: string | null;
    visibility?: CapabilityDefinition['visibility'];
    implementationType: CapabilityDefinition['implementationType'];
    implementationRef: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
    permissions?: string[];
    tags?: string[];
    acceptanceCriteria?: string[];
    requirementIds?: string[];
    runId?: string | null;
    version?: string;
    testsPassed?: boolean;
    reviewPassed?: boolean;
    releaseNotes?: string | null;
    reviewSummary?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const project = await this.subprojectRegistry.resolveProjectContext(input.subprojectId ?? null);
    const now = new Date().toISOString();
    const gate = this.buildGateSnapshot(
      {
        testsPassed: input.testsPassed ?? false,
        reviewPassed: input.reviewPassed ?? false,
        evaluationPassed: false,
      },
      now,
    );
    const initialVersion: CapabilityVersion = {
      version: input.version?.trim() || '0.1.0',
      status: gate.publishable ? 'candidate' : 'draft',
      releaseNotes: input.releaseNotes ?? null,
      reviewSummary: input.reviewSummary ?? null,
      gate,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };

    const capability: CapabilityDefinition = {
      id: input.id?.trim() || `cap-${randomUUID()}`,
      subprojectId: project.subprojectId,
      name: input.name.trim(),
      description: input.description.trim(),
      lifecycleStatus: gate.publishable ? 'ready' : 'draft',
      visibility: input.visibility ?? 'internal',
      implementationType: input.implementationType,
      implementationRef: input.implementationRef.trim(),
      inputSchema: input.inputSchema ?? {},
      outputSchema: input.outputSchema ?? {},
      permissions: this.cleanList(input.permissions),
      tags: this.cleanList(input.tags),
      acceptanceCriteria: this.cleanList(input.acceptanceCriteria),
      activeVersion: null,
      versions: [initialVersion],
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };

    await this.memoryService.saveCapability(capability);
    await this.versionRegistry.createEntry({
      subprojectId: capability.subprojectId,
      entityType: 'capability',
      entityId: capability.id,
      changeType: 'register',
      summary: `Registered capability ${capability.name}`,
      newVersion: initialVersion.version,
      requirementIds: input.requirementIds,
      runId: input.runId,
      triggeredBy: 'system',
      metadata: {
        implementationType: capability.implementationType,
      },
    });
    return capability;
  }

  async recordEvaluation(
    capabilityId: string,
    input: {
      version: string;
      evaluator: string;
      passed: boolean;
      score: number;
      summary: string;
      dimensions?: CapabilityEvaluationDimension[];
      metadata?: Record<string, unknown>;
      requirementIds?: string[];
      subprojectId?: string | null;
    },
  ) {
    const capability = await this.loadCapability(capabilityId, input.subprojectId);
    const now = new Date().toISOString();
    const evaluation: CapabilityEvaluation = {
      id: `cap-eval-${randomUUID()}`,
      capabilityId: capability.id,
      version: input.version,
      subprojectId: capability.subprojectId,
      evaluator: input.evaluator.trim(),
      passed: input.passed,
      score: input.score,
      summary: input.summary.trim(),
      dimensions: input.dimensions ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
    };

    await this.memoryService.saveCapabilityEvaluation(evaluation);
    await this.versionRegistry.createEntry({
      subprojectId: capability.subprojectId,
      entityType: 'capability',
      entityId: capability.id,
      changeType: 'evaluate',
      summary: `Recorded manual evaluation for ${capability.name}@${input.version}: ${evaluation.summary}`,
      previousVersion: input.version,
      newVersion: input.version,
      requirementIds: input.requirementIds,
      artifactPaths: [getCapabilityEvaluationPath(evaluation.id, capability.subprojectId)],
      triggeredBy: 'system',
      diffSummary: `score ${evaluation.score}; passed ${evaluation.passed}`,
      metadata: {
        evaluationId: evaluation.id,
        evaluator: evaluation.evaluator,
        evaluationMode: 'manual',
      },
    });
    const refreshed = await this.refreshCapabilityVersionGate(capability, input.version, {
      evaluationPassed: input.passed,
    });
    return { capability: refreshed, evaluation };
  }

  async createEvaluationDataset(
    capabilityId: string,
    input: {
      version: string;
      name: string;
      description: string;
      cases: Array<{
        id: string;
        input: unknown;
        expected: unknown;
        rubric?: string[];
        metadata?: Record<string, unknown>;
      }>;
      subprojectId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    const capability = await this.loadCapability(capabilityId, input.subprojectId);
    return this.evaluationRunner.createDataset({
      capability,
      version: input.version,
      name: input.name,
      description: input.description,
      cases: input.cases.map((item) => ({
        id: item.id,
        input: item.input,
        expected: item.expected,
        rubric: item.rubric ?? [],
        metadata: item.metadata ?? {},
      })),
      metadata: input.metadata,
    });
  }

  async runEvaluationDataset(
    capabilityId: string,
    input: {
      datasetId: string;
      version: string;
      evaluator: string;
      subprojectId?: string | null;
      requirementIds?: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const capability = await this.loadCapability(capabilityId, input.subprojectId);
    const dataset = await this.memoryService.loadEvaluationDataset(input.datasetId, capability.subprojectId);
    if (dataset.capabilityId !== capability.id) {
      throw new Error(`dataset ${input.datasetId} does not belong to capability ${capability.id}`);
    }

    const result = await this.evaluationRunner.runDataset({
      capability,
      version: input.version,
      dataset,
      evaluator: input.evaluator,
      executor: (payload) => this.executeCapability(capability, payload),
      metadata: {
        ...(input.metadata ?? {}),
        requirementIds: this.cleanList(input.requirementIds),
      },
    });
    await this.versionRegistry.createEntry({
      subprojectId: capability.subprojectId,
      entityType: 'capability',
      entityId: capability.id,
      changeType: 'evaluate',
      summary: `Ran dataset evaluation for ${capability.name}@${input.version}: ${result.run.summary ?? result.run.status}`,
      previousVersion: input.version,
      newVersion: input.version,
      requirementIds: input.requirementIds,
      artifactPaths: [
        getEvaluationRunPath(result.run.id, capability.subprojectId),
        getCapabilityEvaluationPath(result.evaluation.id, capability.subprojectId),
      ],
      triggeredBy: 'system',
      diffSummary: `score ${result.run.aggregatedScore ?? 0}; passed ${result.run.passed ?? false}; dataset ${dataset.id}`,
      metadata: {
        evaluationRunId: result.run.id,
        evaluationId: result.evaluation.id,
        datasetId: dataset.id,
        evaluator: input.evaluator,
        evaluationMode: 'dataset',
      },
    });
    const refreshed = await this.refreshCapabilityVersionGate(capability, input.version, {
      evaluationPassed: result.run.passed ?? false,
    });
    return {
      capability: refreshed,
      dataset,
      run: result.run,
      evaluation: result.evaluation,
    };
  }

  async publishCapabilityVersion(
    capabilityId: string,
    input: {
      version: string;
      releaseNotes?: string | null;
      reviewSummary?: string | null;
      testsPassed?: boolean;
      reviewPassed?: boolean;
      requirementIds?: string[];
      runId?: string | null;
      subprojectId?: string | null;
    },
  ) {
    const capability = await this.loadCapability(capabilityId, input.subprojectId);
    void input.testsPassed;
    void input.reviewPassed;
    const evidenceGate = await this.resolvePublishGateFromEvidence(capability, input.version, input.runId ?? null);
    const refreshed = await this.refreshCapabilityVersionGate(capability, input.version, {
      testsPassed: evidenceGate.testsPassed,
      reviewPassed: evidenceGate.reviewPassed,
      evaluationPassed: evidenceGate.evaluationPassed,
      releaseNotes: input.releaseNotes,
      reviewSummary: input.reviewSummary,
    });

    const target = refreshed.versions.find((version) => version.version === input.version);
    if (!target) {
      throw new Error(`capability version ${input.version} not found`);
    }
    if (!target.gate.publishable) {
      throw new Error(`capability ${capabilityId}@${input.version} failed publish gate: ${target.gate.reasons.join('; ')}`);
    }

    const now = new Date().toISOString();
    const updated: CapabilityDefinition = {
      ...refreshed,
      lifecycleStatus: 'published',
      activeVersion: input.version,
      updatedAt: now,
      versions: refreshed.versions.map((version) => {
        if (version.version === input.version) {
          return {
            ...version,
            status: 'published',
            releaseNotes: input.releaseNotes ?? version.releaseNotes,
            reviewSummary: input.reviewSummary ?? version.reviewSummary,
            updatedAt: now,
          };
        }

        if (version.status === 'published') {
          return {
            ...version,
            status: 'candidate',
            updatedAt: now,
          };
        }

        return version;
      }),
    };

    await this.memoryService.saveCapability(updated);
    await this.versionRegistry.createEntry({
      subprojectId: updated.subprojectId,
      entityType: 'capability',
      entityId: updated.id,
      changeType: 'publish',
      summary: `Published capability ${updated.name}@${input.version}`,
      previousVersion: capability.activeVersion,
      newVersion: input.version,
      requirementIds: input.requirementIds,
      runId: input.runId,
      triggeredBy: 'system',
      releaseNotes: input.releaseNotes ?? null,
      diffSummary: capability.activeVersion ? `publish ${capability.activeVersion} -> ${input.version}` : `publish ${input.version}`,
      approval: {
        approved: true,
        approver: 'review-gate',
        approvedAt: now,
        summary: input.reviewSummary ?? null,
      },
    });
    return updated;
  }

  async rollbackCapabilityVersion(
    capabilityId: string,
    input: {
      version: string;
      subprojectId?: string | null;
      requirementIds?: string[];
      runId?: string | null;
      summary?: string | null;
    },
  ) {
    const capability = await this.loadCapability(capabilityId, input.subprojectId);
    const target = capability.versions.find((version) => version.version === input.version);
    if (!target) {
      throw new Error(`capability version ${input.version} not found`);
    }
    if (!target.gate.publishable) {
      throw new Error(`capability version ${input.version} is not publishable and cannot be restored`);
    }

    const now = new Date().toISOString();
    const updated: CapabilityDefinition = {
      ...capability,
      lifecycleStatus: 'published',
      activeVersion: input.version,
      updatedAt: now,
      versions: capability.versions.map((version) => {
        if (version.version === input.version) {
          return {
            ...version,
            status: 'published',
            updatedAt: now,
          };
        }

        if (version.status === 'published') {
          return {
            ...version,
            status: 'rolled-back',
            updatedAt: now,
          };
        }

        return version;
      }),
    };

    await this.memoryService.saveCapability(updated);
    const previousEntry = (await this.versionRegistry.listEntries(updated.subprojectId))
      .filter((entry) => entry.entityType === 'capability' && entry.entityId === updated.id && entry.changeType === 'publish')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
    await this.versionRegistry.createEntry({
      subprojectId: updated.subprojectId,
      entityType: 'capability',
      entityId: updated.id,
      changeType: 'rollback',
      summary: input.summary?.trim() || `Rolled back capability ${updated.name} to ${input.version}`,
      previousVersion: capability.activeVersion,
      newVersion: input.version,
      requirementIds: input.requirementIds,
      runId: input.runId,
      triggeredBy: 'system',
      diffSummary: capability.activeVersion ? `rollback ${capability.activeVersion} -> ${input.version}` : `rollback -> ${input.version}`,
      rollbackOfVersionEntryId: previousEntry?.id ?? null,
      approval: {
        approved: true,
        approver: 'rollback-operator',
        approvedAt: now,
        summary: input.summary?.trim() || null,
      },
    });
    return updated;
  }

  async invokeCapability(
    capabilityId: string,
    input: {
      version?: string | null;
      subprojectId?: string | null;
      requirementIds?: string[];
      runId?: string | null;
      payload?: Record<string, unknown>;
    },
  ) {
    const capability = await this.loadCapability(capabilityId, input.subprojectId);
    const version = input.version ?? capability.activeVersion;
    if (!version) {
      throw new Error(`capability ${capabilityId} has no active version`);
    }

    const selectedVersion = capability.versions.find((entry) => entry.version === version);
    if (!selectedVersion) {
      throw new Error(`capability version ${version} not found`);
    }
    if (selectedVersion.status !== 'published') {
      throw new Error(`capability ${capabilityId}@${version} is not published`);
    }

    const accepted = this.buildInvocation(capability, version, input.payload ?? {}, 'accepted');
    await this.memoryService.appendCapabilityInvocation(capability.id, accepted, capability.subprojectId);

    try {
      const output = await this.executeCapability(capability, input.payload ?? {});
      const completed: CapabilityInvocation = {
        ...accepted,
        status: 'completed',
        completedAt: new Date().toISOString(),
        output,
        metadata: {
          ...accepted.metadata,
          completed: true,
        },
      };
      await this.memoryService.appendCapabilityInvocation(capability.id, completed, capability.subprojectId);
      await this.versionRegistry.createEntry({
        subprojectId: capability.subprojectId,
        entityType: 'capability',
        entityId: capability.id,
        changeType: 'invoke',
        summary: `Invoked capability ${capability.name}@${version}`,
        previousVersion: version,
        newVersion: version,
        requirementIds: input.requirementIds,
        runId: this.resolveInvocationRunId(input.runId, output),
        artifactPaths: this.collectInvocationArtifactPaths(output),
        triggeredBy: 'system',
        metadata: {
          invocationId: completed.id,
          status: completed.status,
        },
      });
      return completed;
    } catch (error) {
      const failed: CapabilityInvocation = {
        ...accepted,
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          ...accepted.metadata,
          completed: true,
        },
      };
      await this.memoryService.appendCapabilityInvocation(capability.id, failed, capability.subprojectId);
      throw error;
    }
  }

  private async refreshCapabilityVersionGate(
    capability: CapabilityDefinition,
    version: string,
    input: {
      testsPassed?: boolean;
      reviewPassed?: boolean;
      evaluationPassed?: boolean;
      releaseNotes?: string | null;
      reviewSummary?: string | null;
    },
  ) {
    const target = capability.versions.find((entry) => entry.version === version);
    if (!target) {
      throw new Error(`capability version ${version} not found`);
    }

    const latestEvaluation = await this.findLatestEvaluation(capability.id, version, capability.subprojectId);
    const now = new Date().toISOString();
    const gate = this.buildGateSnapshot(
      {
        testsPassed: input.testsPassed ?? target.gate.testsPassed,
        reviewPassed: input.reviewPassed ?? target.gate.reviewPassed,
        evaluationPassed: input.evaluationPassed ?? latestEvaluation?.passed ?? target.gate.evaluationPassed,
      },
      now,
    );

    const updated: CapabilityDefinition = {
      ...capability,
      lifecycleStatus: gate.publishable ? 'ready' : capability.lifecycleStatus === 'published' ? 'published' : 'draft',
      updatedAt: now,
      versions: capability.versions.map((entry) =>
        entry.version === version
          ? {
              ...entry,
              status: gate.publishable && entry.status === 'draft' ? 'candidate' : entry.status,
              releaseNotes: input.releaseNotes ?? entry.releaseNotes,
              reviewSummary: input.reviewSummary ?? entry.reviewSummary,
              gate,
              updatedAt: now,
            }
          : entry,
      ),
    };

    await this.memoryService.saveCapability(updated);
    return updated;
  }

  private async resolvePublishGateFromEvidence(capability: CapabilityDefinition, version: string, runId: string | null) {
    const latestEvaluation = await this.findLatestEvaluation(capability.id, version, capability.subprojectId);
    const reviewPassed = runId ? await this.resolveReviewPassedFromRun(runId, capability.subprojectId) : false;
    return {
      testsPassed: latestEvaluation?.passed ?? false,
      reviewPassed,
      evaluationPassed: latestEvaluation?.passed ?? false,
    };
  }

  private async resolveReviewPassedFromRun(runId: string, subprojectId?: string | null) {
    const run = await this.orchestratorRuntime.loadRun(runId, subprojectId);
    const events = await this.orchestratorRuntime.loadEvents(runId, subprojectId);
    const artifacts = await this.workflowEngine.hydrateArtifacts(run);
    const openSourceEvidence = this.reviewCommittee.inspectOpenSourceEvidence(artifacts);
    const hasCompletedReviewEvidence = run.stages.some(
      (stage) =>
        stage.status === 'completed' &&
        stage.outputPaths.some((artifactPath) => /review-evidence|review/iu.test(artifactPath)),
    );
    if (hasCompletedReviewEvidence && openSourceEvidence.present) {
      return true;
    }
    const activatedSpecialistRoles = this.specialistActivationService.resolveActivatedRoles({
      stageId: run.currentStageId,
      artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
      workflowSignals: events
        .filter((event) => event.stageId === run.currentStageId)
        .map((event) => ({
          activatedSpecialistRoles: Array.isArray(event.metadata.activatedSpecialistRoles)
            ? event.metadata.activatedSpecialistRoles.filter((item): item is string => typeof item === 'string')
            : [],
          taskAssignmentRoles: Array.isArray(event.metadata.taskAssignmentRoles)
            ? event.metadata.taskAssignmentRoles.filter((item): item is string => typeof item === 'string')
            : [],
        })),
    });
    const review = this.reviewCommittee.buildReportForRun({
      runId,
      artifactCount: artifacts.length,
      activeStageId: run.currentStageId,
      activatedSpecialistRoles: activatedSpecialistRoles.length > 0 ? activatedSpecialistRoles : undefined,
      openSourceEvaluationPresent: openSourceEvidence.present,
      openSourceEvidencePaths: openSourceEvidence.evidencePaths,
      artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
    });
    return !review.gate.blocked;
  }

  private async findLatestEvaluation(capabilityId: string, version: string, subprojectId?: string | null) {
    const latestRun = await this.evaluationRunner.findLatestRun(capabilityId, version, subprojectId);
    if (latestRun) {
      return {
        passed: latestRun.passed ?? false,
        score: latestRun.aggregatedScore ?? 0,
        summary: latestRun.summary ?? '',
        createdAt: latestRun.completedAt ?? latestRun.startedAt,
      } satisfies Pick<CapabilityEvaluation, 'passed' | 'score' | 'summary' | 'createdAt'>;
    }

    const evaluations = await this.memoryService.listCapabilityEvaluations(subprojectId);
    return evaluations
      .filter((evaluation) => evaluation.capabilityId === capabilityId && evaluation.version === version)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  private buildEvaluationHistoryItem(
    run: EvaluationRun,
    dataset: EvaluationDataset | null,
    capability: CapabilityDefinition | null,
    versionEntries: VersionEntry[],
  ): EvaluationHistoryItem {
    const runRequirementIds = this.extractStringArray(run.metadata.requirementIds);
    const datasetRequirementIds = dataset ? this.extractStringArray(dataset.metadata.requirementIds) : [];
    const capabilityVersionEntries = versionEntries.filter((entry) => {
      if (entry.entityType !== 'capability' || entry.entityId !== run.capabilityId) {
        return false;
      }
      if (entry.metadata.evaluationRunId === run.id || entry.metadata.datasetId === run.datasetId) {
        return true;
      }
      return entry.previousVersion === run.version || entry.newVersion === run.version;
    });
    const requirementIds = [
      ...runRequirementIds,
      ...datasetRequirementIds,
      ...capabilityVersionEntries.flatMap((entry) => entry.requirementIds),
    ];
    return {
      run,
      dataset,
      capability,
      requirementIds: [...new Set(requirementIds)],
      versionEntryIds: capabilityVersionEntries.map((entry) => entry.id),
      artifactPaths: [...new Set(capabilityVersionEntries.flatMap((entry) => entry.artifactPaths))],
    };
  }

  private matchesEvaluationHistoryFilters(
    item: EvaluationHistoryItem,
    input?: {
      capabilityId?: string | null;
      version?: string | null;
      requirementId?: string | null;
      versionEntryId?: string | null;
    },
  ) {
    const capabilityId = input?.capabilityId?.trim();
    const version = input?.version?.trim();
    const requirementId = input?.requirementId?.trim();
    const versionEntryId = input?.versionEntryId?.trim();
    if (capabilityId && item.run.capabilityId !== capabilityId) {
      return false;
    }
    if (version && item.run.version !== version) {
      return false;
    }
    if (requirementId && !item.requirementIds.includes(requirementId)) {
      return false;
    }
    if (versionEntryId && !item.versionEntryIds.includes(versionEntryId)) {
      return false;
    }
    return true;
  }

  private extractStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  }

  private buildGateSnapshot(
    state: { testsPassed: boolean; reviewPassed: boolean; evaluationPassed: boolean },
    evaluatedAt: string,
  ): CapabilityGateSnapshot {
    const reasons: string[] = [];
    if (!state.testsPassed) {
      reasons.push('tests not passed');
    }
    if (!state.reviewPassed) {
      reasons.push('review not passed');
    }
    if (!state.evaluationPassed) {
      reasons.push('evaluation not passed');
    }

    return {
      ...state,
      publishable: reasons.length === 0,
      reasons,
      evaluatedAt,
    };
  }

  private buildInvocation(
    capability: CapabilityDefinition,
    version: string,
    payload: Record<string, unknown>,
    status: CapabilityInvocation['status'],
  ): CapabilityInvocation {
    return {
      id: `cap-invoke-${randomUUID()}`,
      capabilityId: capability.id,
      version,
      subprojectId: capability.subprojectId,
      status,
      invokedAt: new Date().toISOString(),
      completedAt: null,
      input: payload,
      output: null,
      error: null,
      metadata: {
        implementationType: capability.implementationType,
        implementationRef: capability.implementationRef,
      },
    };
  }

  private async executeCapability(capability: CapabilityDefinition, payload: Record<string, unknown>) {
    if (capability.implementationType === 'product-agent') {
      const agent = await this.productAgentService.loadAgent(capability.implementationRef, capability.subprojectId);
      return {
        type: 'product-agent',
        agent,
        payload,
      };
    }

    const project = await this.subprojectRegistry.resolveProjectContext(capability.subprojectId);
    const definition = await this.workflowEngine.loadDefinition(project.projectRoot);
    const providers = await this.providerRegistry.listProviders(capability.subprojectId);
    const servers = await this.mcpRegistry.listServers(capability.subprojectId);
    const run = await this.orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    if (payload.mode === 'run-until-blocked') {
      let updated = run;
      while (updated.status === 'running' && updated.currentStageId && updated.currentStageId !== 'frontend-backend-integration') {
        updated = await this.orchestratorRuntime.advanceRun(updated.id);
      }

      if (updated.status === 'running' && updated.currentStageId === 'frontend-backend-integration') {
        const events = await this.orchestratorRuntime.loadEvents(updated.id, capability.subprojectId);
        const artifactCount = events.filter((event) => event.kind === 'artifact_written').length;
        const artifacts = await this.workflowEngine.hydrateArtifacts(updated);
        const openSourceEvidence = this.reviewCommittee.inspectOpenSourceEvidence(artifacts);
        const activatedSpecialistRoles = this.specialistActivationService.resolveActivatedRoles({
          stageId: updated.currentStageId,
          artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
          workflowSignals: events
            .filter((event) => event.stageId === updated.currentStageId)
            .map((event) => ({
              activatedSpecialistRoles: Array.isArray(event.metadata.activatedSpecialistRoles)
                ? event.metadata.activatedSpecialistRoles.filter((item): item is string => typeof item === 'string')
                : [],
              taskAssignmentRoles: Array.isArray(event.metadata.taskAssignmentRoles)
                ? event.metadata.taskAssignmentRoles.filter((item): item is string => typeof item === 'string')
                : [],
            })),
        });

        updated = await this.orchestratorRuntime.advanceRun(updated.id, {
          reviewReport: this.reviewCommittee.buildReportForRun({
            runId: updated.id,
            artifactCount,
            activeStageId: updated.currentStageId,
            activatedSpecialistRoles: activatedSpecialistRoles.length > 0 ? activatedSpecialistRoles : undefined,
            openSourceEvaluationPresent: openSourceEvidence.present,
            openSourceEvidencePaths: openSourceEvidence.evidencePaths,
            artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
          }),
        });
      }

      if (updated.status === 'running' && updated.currentStageId) {
        updated = await this.orchestratorRuntime.runUntilBlocked(updated.id);
      }

      return {
        type: 'workflow',
        run: updated,
        payload,
      };
    }

    return {
      type: 'workflow',
      run,
      payload,
    };
  }

  private cleanList(values?: string[]) {
    return (values ?? []).map((value) => value.trim()).filter(Boolean);
  }

  private resolveInvocationRunId(runId: string | null | undefined, output: unknown) {
    if (runId) {
      return runId;
    }

    if (output && typeof output === 'object') {
      const candidate = (output as { run?: { id?: unknown } }).run;
      if (candidate && typeof candidate === 'object' && typeof candidate.id === 'string') {
        return candidate.id;
      }
    }

    return null;
  }

  private collectInvocationArtifactPaths(output: unknown) {
    if (!output || typeof output !== 'object') {
      return [];
    }

    const run = (output as { run?: { stages?: Array<{ outputPaths?: unknown }>; tasks?: Array<{ artifactPaths?: unknown }> } }).run;
    if (!run || typeof run !== 'object') {
      return [];
    }

    const stagePaths = Array.isArray(run.stages)
      ? run.stages.flatMap((stage) => (Array.isArray(stage.outputPaths) ? stage.outputPaths.filter((value): value is string => typeof value === 'string') : []))
      : [];
    const taskPaths = Array.isArray(run.tasks)
      ? run.tasks.flatMap((task) =>
          Array.isArray(task.artifactPaths) ? task.artifactPaths.filter((value): value is string => typeof value === 'string') : [],
        )
      : [];

    return [...new Set([...stagePaths, ...taskPaths])];
  }
}
