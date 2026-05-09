import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { LlmRouter } from '../llm_router/index.js';
import { MemoryService } from './memoryService.js';
import { ProductAgentService } from './productAgentService.js';
import {
  getProductChiefGeneratedAssetDirectoryPath,
  getProductChiefOutputArtifactPath,
  getProductChiefOutputVariantArtifactPath,
  getProductChiefOutputGeneratedAssetPath,
  getProductChiefOutputDirectoryPath,
  getProductChiefOutputPath,
  getProductChiefMultiAgentReviewArtifactPath,
  getProductChiefMultiAgentReviewDirectoryPath,
  getProductChiefMultiAgentReviewPath,
  getProductChiefReportDirectoryPath,
  getProductChiefReportPath,
  getProductChiefSpecialistTaskArtifactPath,
  getProductChiefSpecialistTaskDirectoryPath,
  getProductChiefSpecialistTaskPath,
} from './projectPaths.js';
import { RequirementService } from './requirementService.js';
import { VersionRegistry } from './versionRegistry.js';
import { HermesPolicyService } from './hermesPolicyService.js';
import { SkillRegistry } from './skillRegistry.js';
import { DocumentGovernanceService } from './documentGovernanceService.js';
import type {
  DesignChangeItem,
  DesignChangeSet,
  DesignDiffAudit,
  HermesPolicyReport,
  ProductChiefMultiAgentReview,
  ProductAgent,
  ProductChiefOutput,
  ProductChiefReport,
  ProductChiefSpecialistTask,
  ProviderExecutionAsset,
  Requirement,
  UISchemaContract,
  VersionEntry,
} from '../shared/schemas.js';

type ProductChiefInput = {
  brief: string;
  subprojectId?: string | null;
  contextPaths?: string[];
};

type ProductPlanningContext = {
  requirements: Requirement[];
  versionEntries: VersionEntry[];
  hermesReports: HermesPolicyReport[];
};

type GeneratedDesignImageItem = {
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
};

type GeneratedDesignHtmlCandidate = {
  styleId: string;
  styleLabel: string;
  direction: string;
  recommended: boolean;
  assetPath: string;
};

type DesignPageBlueprint = {
  pageNumber: number;
  pageName: string;
  pageGoal: string | null;
  targetScenario: string | null;
  informationHierarchy: string | null;
  keySections: string[];
  primaryActions: string[];
  visualDirection: string | null;
};

type DesignImageVariantProfile = {
  id: string;
  label: string;
  designLanguage: string;
  styleDirection: string;
  informationDensity: 'low' | 'medium' | 'high';
  promptSuffix: string;
};

type ParsedDesignImagePrompt = {
  pageNumber: number;
  pageName: string;
  prompt: string;
  fixedDesignLanguage: string | null;
  fixedStyleDirection: string | null;
  fixedInformationDensity: 'low' | 'medium' | 'high' | null;
  explicitCombinedCompare: boolean;
};

type DesignStyleProfile = {
  id: string;
  label: string;
  direction: string;
  lookSummary: string;
  bodyClass: string;
  palette: {
    background: string;
    panel: string;
    panelAlt: string;
    ink: string;
    muted: string;
    accent: string;
    accentSoft: string;
    line: string;
  };
  typeface: {
    display: string;
    body: string;
    mono: string;
  };
};

type GeneratedImageBatchManifest = {
  version: 1;
  outputId: string;
  subprojectId: string | null;
  generatedAt: string;
  versionTag: string;
  batchFolder: string;
  generatedImageGeneratedAt: string;
  pageCount: number;
  warningCount: number;
  items: GeneratedDesignImageItem[];
  warnings: string[];
};

type GeneratedImageBatchListItem = GeneratedImageBatchManifest & {
  manifestPath: string;
};

export class ProductChiefService {
  private readonly documentGovernanceService: DocumentGovernanceService;

  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
    private readonly productAgentService = new ProductAgentService(store),
    private readonly skillRegistry = new SkillRegistry(store),
    private readonly llmRouter = new LlmRouter(store),
  ) {
    this.documentGovernanceService = new DocumentGovernanceService(store);
  }

  async analyze(input: ProductChiefInput): Promise<ProductChiefReport> {
    const brief = input.brief.trim();
    if (!brief) {
      throw new Error('brief is required');
    }

    const agents = await this.ensureAgentHierarchy(input.subprojectId);
    const engagedSpecialists = this.selectSpecialists(agents, brief);
    const recommendedSkills = await this.findRecommendedSkills(brief, input.subprojectId);
    const evidencePaths = await this.resolveEvidencePaths(input.subprojectId, input.contextPaths);
    const now = new Date().toISOString();
    const report: ProductChiefReport = {
      id: `product-chief-${randomUUID()}`,
      subprojectId: input.subprojectId ?? null,
      brief,
      generatedAt: now,
      status: 'ready-for-review',
      missingQuestions: this.buildMissingQuestions(brief, evidencePaths),
      engagedSpecialists,
      recommendedSkills,
      learningGuidance: this.buildLearningGuidance(brief),
      requiredGovernedOutputs: this.buildRequiredOutputs(brief),
      nextActions: [
        'Answer or explicitly waive the missing physical-world questions.',
        'Assign engaged specialist agents to generate governed outputs.',
        'Run ecosystem/open-source scouting before approving strategic build work.',
        'Create UI schema/business-block specs before frontend implementation when the work changes operator surfaces.',
      ],
      evidencePaths,
      metadata: {
        agentCount: agents.length,
        engagedSpecialistCount: engagedSpecialists.length,
        recommendedSkillCount: recommendedSkills.length,
      },
    };

    await this.store.writeJson(getProductChiefReportPath(report.id, report.subprojectId), report);
    return report;
  }

  async listReports(subprojectId?: string | null) {
    const relativeDir = getProductChiefReportDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as ProductChiefReport[];
    }

    const files = await this.store.list(relativeDir);
    const reports = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<ProductChiefReport>(file)),
    );
    return reports.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  }

  async loadReport(reportId: string, subprojectId?: string | null) {
    return this.store.readJson<ProductChiefReport>(getProductChiefReportPath(reportId, subprojectId));
  }

  async listGeneratedImageBatches(subprojectId?: string | null): Promise<GeneratedImageBatchListItem[]> {
    const relativeDir = getProductChiefGeneratedAssetDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [];
    }

    const versionDirs = await this.store.list(relativeDir);
    const manifests: GeneratedImageBatchListItem[] = [];
    for (const versionDir of versionDirs) {
      const batchDirs = await this.store.list(versionDir);
      for (const batchDir of batchDirs) {
        const manifestPath = `${batchDir}/batch-manifest.json`;
        if (!(await this.store.exists(manifestPath))) {
          continue;
        }
        const manifest = await this.store.readJson<GeneratedImageBatchManifest>(manifestPath);
        manifests.push({
          ...manifest,
          manifestPath,
        });
      }
    }

    return manifests.sort((left, right) => {
      const leftTime = Date.parse(left.generatedImageGeneratedAt || left.generatedAt);
      const rightTime = Date.parse(right.generatedImageGeneratedAt || right.generatedAt);
      return rightTime - leftTime;
    });
  }

  async listOutputs(subprojectId?: string | null) {
    const relativeDir = getProductChiefOutputDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as ProductChiefOutput[];
    }

    const files = await this.store.list(relativeDir);
    const outputs = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<ProductChiefOutput>(file)),
    );
    return outputs.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  }

  async listSpecialistTasks(subprojectId?: string | null) {
    const relativeDir = getProductChiefSpecialistTaskDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as ProductChiefSpecialistTask[];
    }

    const files = await this.store.list(relativeDir);
    const tasks = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<ProductChiefSpecialistTask>(file)),
    );
    return tasks.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  async listMultiAgentReviews(subprojectId?: string | null) {
    const relativeDir = getProductChiefMultiAgentReviewDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as ProductChiefMultiAgentReview[];
    }

    const files = await this.store.list(relativeDir);
    const reviews = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<ProductChiefMultiAgentReview>(file)),
    );
    return reviews.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  async generateGovernedOutput(input: {
    reportId: string;
    type?: string | null;
    subprojectId?: string | null;
    requirementIds?: string[];
  }): Promise<ProductChiefOutput> {
    return this.generateGovernedOutputInternal(input, []);
  }

  private async generateGovernedOutputInternal(
    input: {
      reportId: string;
      type?: string | null;
      subprojectId?: string | null;
      requirementIds?: string[];
    },
    dependencyChain: string[],
  ): Promise<ProductChiefOutput> {
    const report = await this.loadReport(input.reportId, input.subprojectId);
    const requestedType = input.type?.trim() || report.requiredGovernedOutputs[0]?.type;
    if (!requestedType) {
      throw new Error(`report ${input.reportId} has no governed outputs to generate`);
    }
    if (dependencyChain.includes(requestedType)) {
      throw new Error(`cyclic governed output dependency detected: ${[...dependencyChain, requestedType].join(' -> ')}`);
    }

    const outputSpec = report.requiredGovernedOutputs.find((output) => output.type === requestedType);
    if (!outputSpec) {
      throw new Error(`governed output ${requestedType} is not required by report ${input.reportId}`);
    }
    this.assertProjectScopedImageGeneration(report.subprojectId, outputSpec.type);
    const autoBackfilledOutputs = await this.ensurePrerequisiteOutputs({
      report,
      outputSpec,
      requirementIds: input.requirementIds,
      dependencyChain,
    });

    const outputId = `product-output-${randomUUID()}`;
    const artifactPath = getProductChiefOutputArtifactPath(outputId, report.subprojectId);
    const outputRecordPath = getProductChiefOutputPath(outputId, report.subprojectId);
    const reportPath = getProductChiefReportPath(report.id, report.subprojectId);
    const specialistAgentIds = this.selectOutputSpecialists(report, outputSpec.type);
    const planningContext = await this.buildPlanningContext(report.subprojectId);
    const generatedArtifact = await this.generateOutputArtifact({
      report,
      outputId,
      outputSpec,
      specialistAgentIds,
      planningContext,
      autoBackfilledOutputs,
    });
    const now = new Date().toISOString();
    const requirementIds = await this.resolveOutputRequirementIds({
      report,
      outputId,
      outputType: outputSpec.type,
      outputTitle: outputSpec.title,
      outputPriority: outputSpec.priority,
      summary: generatedArtifact.summary ?? `${outputSpec.title} generated from Product Chief report ${report.id}.`,
      artifactPaths: [artifactPath, outputRecordPath, reportPath, ...generatedArtifact.extraArtifactPaths],
      requirementIds: input.requirementIds,
    });
    const specialistTasks = await this.runSpecialistTasks({
      report,
      outputId,
      outputType: outputSpec.type,
      outputTitle: outputSpec.title,
      specialistAgentIds,
      requirementIds,
    });
    const specialistTaskArtifactPaths = specialistTasks.map((task) => task.artifactPath);
    const specialistTaskRecordPaths = specialistTasks.map((task) => getProductChiefSpecialistTaskPath(task.id, task.subprojectId));
    const multiAgentReview = await this.runMultiAgentReview({
      report,
      outputId,
      outputType: outputSpec.type,
      outputTitle: outputSpec.title,
      outputArtifactPath: artifactPath,
      outputRecordPath,
      outputContent: generatedArtifact.content,
      specialistTasks,
      requirementIds,
    });
    const multiAgentReviewRecordPath = getProductChiefMultiAgentReviewPath(multiAgentReview.id, multiAgentReview.subprojectId);
    const traceArtifactPaths = [
      artifactPath,
      outputRecordPath,
      reportPath,
      ...generatedArtifact.extraArtifactPaths,
      ...specialistTaskArtifactPaths,
      ...specialistTaskRecordPaths,
      multiAgentReview.artifactPath,
      multiAgentReviewRecordPath,
    ];
    const versionEntry = await new VersionRegistry(this.memoryService).createEntry({
      subprojectId: report.subprojectId,
      entityType: 'product-output',
      entityId: outputId,
      changeType: 'generate',
      summary: `Generated governed Product Chief output: ${outputSpec.title}`,
      requirementIds,
      artifactPaths: traceArtifactPaths,
      triggeredBy: 'agent',
      diffSummary: `Generated ${outputSpec.type} from Product Chief report ${report.id}.`,
      approval: {
        approved: false,
        approver: null,
        approvedAt: null,
        summary: 'Generated output is ready for human/specialist review.',
      },
      metadata: {
        reportId: report.id,
        outputType: outputSpec.type,
        priority: outputSpec.priority,
        specialistAgentIds,
        specialistTaskIds: specialistTasks.map((task) => task.id),
        multiAgentReviewId: multiAgentReview.id,
        multiAgentReviewStatus: multiAgentReview.status,
      },
    });
    const output: ProductChiefOutput = {
      id: outputId,
      reportId: report.id,
      subprojectId: report.subprojectId,
      type: outputSpec.type,
      title: outputSpec.title,
      status: 'ready-for-review',
      artifactPath,
      generatedAt: now,
      specialistAgentIds,
      specialistTaskIds: specialistTasks.map((task) => task.id),
      specialistTaskArtifactPaths,
      multiAgentReviewId: multiAgentReview.id,
      multiAgentReviewStatus: multiAgentReview.status,
      multiAgentReviewArtifactPath: multiAgentReview.artifactPath,
      requirementIds,
      versionEntryId: versionEntry.id,
      templatePath: outputSpec.templatePath,
      summary: generatedArtifact.summary ?? `${outputSpec.title} generated from Product Chief report ${report.id}.`,
      metadata: {
        priority: outputSpec.priority,
        reason: outputSpec.reason,
        dependsOn: outputSpec.dependsOn,
        autoBackfillOnSkip: outputSpec.autoBackfillOnSkip,
        autoBackfilledOutputIds: autoBackfilledOutputs.map((output) => output.id),
        autoBackfilledOutputTypes: autoBackfilledOutputs.map((output) => output.type),
        outputRecordPath,
        recommendedSkillIds: report.recommendedSkills.map((skill) => skill.skillId),
        ...generatedArtifact.metadata,
      },
    };

    await this.store.write(artifactPath, generatedArtifact.content);
    await this.store.writeJson(outputRecordPath, output);
    await this.registerGeneratedTruthSource(output);
    return output;
  }

  private async registerGeneratedTruthSource(output: ProductChiefOutput) {
    const topicKey = this.resolveTruthSourceTopicKey(output);
    if (!topicKey) {
      return;
    }

    const existingEntries = await this.documentGovernanceService.listEntries(output.subprojectId);
    const activeEntries = existingEntries.filter((entry) => entry.topicKey === topicKey && entry.status === 'active' && entry.path !== output.artifactPath);

    for (const entry of activeEntries) {
      await this.documentGovernanceService.upsertEntry({
        id: entry.id,
        topicKey: entry.topicKey,
        subprojectId: entry.subprojectId,
        title: entry.title,
        path: entry.path,
        status: 'superseded',
        tags: entry.tags,
        supersedes: entry.supersedes,
        successorPath: output.artifactPath,
        note: `Superseded by ${output.id} on ${output.generatedAt}.`,
      });
    }

    await this.documentGovernanceService.upsertEntry({
      topicKey,
      subprojectId: output.subprojectId,
      title: output.title,
      path: output.artifactPath,
      status: 'active',
      tags: ['product-chief-output', output.type],
      supersedes: activeEntries.map((entry) => entry.path),
      note: `Registered from Product Chief generated output ${output.id}.`,
    });
  }

  private resolveTruthSourceTopicKey(output: ProductChiefOutput) {
    const scope = output.subprojectId ?? 'platform';
    switch (output.type) {
      case 'product-definition-baseline':
      case 'requirement-baseline':
      case 'original-demand-review':
      case 'plan-prd':
      case 'functional-spec-pack':
      case 'ui-schema-spec':
      case 'implementation-handoff':
      case 'version-plan':
      case 'roadmap':
      case 'weekly-product-brief':
      case 'user-manual':
        return `${scope}-${output.type}`;
      default:
        return null;
    }
  }

  private async ensurePrerequisiteOutputs(input: {
    report: ProductChiefReport;
    outputSpec: ProductChiefReport['requiredGovernedOutputs'][number];
    requirementIds?: string[];
    dependencyChain: string[];
  }) {
    const generatedOutputs = await this.listOutputs(input.report.subprojectId);
    const reportOutputs = generatedOutputs.filter((output) => output.reportId === input.report.id);
    const autoBackfilledOutputs: ProductChiefOutput[] = [];

    for (const dependencyType of input.outputSpec.dependsOn) {
      const existing = reportOutputs.find((output) => output.type === dependencyType) ?? null;
      if (existing) {
        continue;
      }

      if (!input.outputSpec.autoBackfillOnSkip) {
        throw new Error(`${input.outputSpec.type} requires ${dependencyType}, but no governed artifact exists yet.`);
      }

      const dependencyOutput = await this.generateGovernedOutputInternal(
        {
          reportId: input.report.id,
          type: dependencyType,
          subprojectId: input.report.subprojectId,
          requirementIds: input.requirementIds,
        },
        [...input.dependencyChain, input.outputSpec.type],
      );
      autoBackfilledOutputs.push(dependencyOutput);
      reportOutputs.push(dependencyOutput);
    }

    return autoBackfilledOutputs;
  }

  private async generateOutputArtifact(input: {
    report: ProductChiefReport;
    outputId: string;
    outputSpec: ProductChiefReport['requiredGovernedOutputs'][number];
    specialistAgentIds: string[];
    planningContext: ProductPlanningContext;
    autoBackfilledOutputs: ProductChiefOutput[];
  }) {
    const fallbackContent = this.buildOutputMarkdown(
      input.report,
      input.outputSpec,
      input.specialistAgentIds,
      input.planningContext,
      input.autoBackfilledOutputs,
    );
    const supportsDesignChangeGovernance = this.supportsDesignChangeGovernance(input.outputSpec.type);
    const draftDesignChangeSet = supportsDesignChangeGovernance
      ? this.buildDraftDesignChangeSet({
          report: input.report,
          outputId: input.outputId,
        })
      : null;

    if (input.outputSpec.type === 'html-direction-pack') {
      const htmlCandidates = await this.generateDesignHtmlCandidatePack({
        outputId: input.outputId,
        subprojectId: input.report.subprojectId,
        markdown: fallbackContent,
        report: input.report,
        outputSpec: input.outputSpec,
      });
      const pages = this.extractDesignPageBlueprints(fallbackContent);
      const designChangeSet = draftDesignChangeSet ? this.resolveDesignChangeSetTargets(draftDesignChangeSet, pages) : null;
      const designDiffAudit = designChangeSet
        ? this.buildDesignDiffAudit({
            outputId: input.outputId,
            mode: designChangeSet.mode,
            changeSet: designChangeSet,
            referenceText: fallbackContent,
          })
        : null;
      const changeArtifacts = designChangeSet
        ? await this.writeDesignGovernanceArtifacts({
            outputId: input.outputId,
            subprojectId: input.report.subprojectId,
            changeSet: designChangeSet,
            diffAudit: designDiffAudit!,
          })
        : null;
      const finalContent = this.appendDesignGovernanceSection(
        this.appendGeneratedHtmlCandidateSection(fallbackContent, htmlCandidates),
        designChangeSet,
        designDiffAudit,
      );

      return {
        content: finalContent,
        extraArtifactPaths: [
          ...htmlCandidates.artifactPaths,
          ...(changeArtifacts ? [changeArtifacts.changeSetPath, changeArtifacts.diffAuditPath] : []),
        ],
        metadata: {
          generatedHtmlCandidates: htmlCandidates.generated,
          generatedHtmlCandidatePaths: htmlCandidates.artifactPaths,
          generatedHtmlCandidateCount: htmlCandidates.generated.length,
          generatedHtmlDefaultStyleId: htmlCandidates.generated.find((candidate) => candidate.recommended)?.styleId ?? null,
          ...(changeArtifacts
            ? {
                designChangeSetPath: changeArtifacts.changeSetPath,
                designDiffAuditPath: changeArtifacts.diffAuditPath,
                designChangeSet,
                designDiffAudit,
                requestedChangeCount: designChangeSet?.items.length ?? 0,
                appliedChangeCount: designDiffAudit?.appliedChangeIds.length ?? 0,
                missedChangeCount: designDiffAudit?.missedChangeIds.length ?? 0,
                unintendedChangeCount: designDiffAudit?.unintendedChanges.length ?? 0,
              }
            : {}),
        } as Record<string, unknown>,
        summary: `${input.outputSpec.title} generated with ${htmlCandidates.generated.length} HTML design direction(s) from Product Chief report ${input.report.id}.`,
      };
    }

    if (input.outputSpec.type === 'ui-schema-spec') {
      const contract = this.buildUiSchemaContract({
        report: input.report,
        outputId: input.outputId,
        planningContext: input.planningContext,
      });
      const schemaArtifactPath = getProductChiefOutputVariantArtifactPath(input.outputId, 'ui-schema-contract.json', input.report.subprojectId);
      await this.store.writeJson(schemaArtifactPath, contract);
      const finalContent = this.appendGeneratedUiSchemaSection(fallbackContent, contract, schemaArtifactPath);

      return {
        content: finalContent,
        extraArtifactPaths: [schemaArtifactPath],
        metadata: {
          generatedUiSchemaPath: schemaArtifactPath,
          generatedUiSchemaPageCount: contract.pageContracts.length,
          generatedUiSchema: contract,
        } as Record<string, unknown>,
        summary: `${input.outputSpec.title} generated with ${contract.pageContracts.length} machine-readable page contract(s) from Product Chief report ${input.report.id}.`,
      };
    }

    if (!this.isImage2DesignOutput(input.outputSpec.type)) {
      return {
        content: fallbackContent,
        extraArtifactPaths: [] as string[],
        metadata: {} as Record<string, unknown>,
        summary: `${input.outputSpec.title} generated from Product Chief report ${input.report.id}.`,
      };
    }

    const promptPackContent = await this.generateDesignPromptPackMarkdown(input, fallbackContent, draftDesignChangeSet);
    const promptPages = this.extractDesignPageBlueprints(promptPackContent);
    const designChangeSet = draftDesignChangeSet ? this.resolveDesignChangeSetTargets(draftDesignChangeSet, promptPages) : null;
    const assetVersionTag = this.resolveGeneratedAssetVersionTag(input.planningContext.versionEntries);
    const assetBatchFolder = this.buildGeneratedAssetBatchFolder(assetVersionTag, input.outputId);
    const designImages = await this.generateDesignImagesFromPromptPack({
      outputId: input.outputId,
      outputType: input.outputSpec.type,
      subprojectId: input.report.subprojectId,
      markdown: promptPackContent,
      assetVersionTag,
      assetBatchFolder,
    });
    const designDiffAudit = designChangeSet
      ? this.buildDesignDiffAudit({
          outputId: input.outputId,
          mode: designChangeSet.mode,
          changeSet: designChangeSet,
          referenceText: promptPackContent,
        })
      : null;
    const changeArtifacts = designChangeSet
      ? await this.writeDesignGovernanceArtifacts({
          outputId: input.outputId,
          subprojectId: input.report.subprojectId,
          changeSet: designChangeSet,
          diffAudit: designDiffAudit!,
        })
      : null;
    const finalContent = this.appendDesignGovernanceSection(
      this.appendGeneratedImageSection(promptPackContent, designImages),
      designChangeSet,
      designDiffAudit,
    );

    return {
      content: finalContent,
      extraArtifactPaths: [
        designImages.manifestPath,
        ...designImages.artifactPaths,
        ...(changeArtifacts ? [changeArtifacts.changeSetPath, changeArtifacts.diffAuditPath] : []),
      ],
      metadata: {
        generatedImagePaths: designImages.artifactPaths,
        generatedImageItems: designImages.generated,
        generatedImagePageCount: designImages.generated.length,
        imageGenerationWarnings: designImages.warnings,
        generatedImageWarningCount: designImages.warnings.length,
        generatedImageVersionTag: assetVersionTag,
        generatedImageBatchFolder: assetBatchFolder,
        generatedImageManifestPath: designImages.manifestPath,
        generatedImageGeneratedAt: designImages.generatedAt,
        ...(changeArtifacts
          ? {
              designChangeSetPath: changeArtifacts.changeSetPath,
              designDiffAuditPath: changeArtifacts.diffAuditPath,
              designChangeSet,
              designDiffAudit,
              requestedChangeCount: designChangeSet?.items.length ?? 0,
              appliedChangeCount: designDiffAudit?.appliedChangeIds.length ?? 0,
              missedChangeCount: designDiffAudit?.missedChangeIds.length ?? 0,
              unintendedChangeCount: designDiffAudit?.unintendedChanges.length ?? 0,
            }
          : {}),
      },
      summary:
        designImages.generated.length > 0
          ? `${input.outputSpec.title} generated with ${designImages.generated.length} design image(s) from Product Chief report ${input.report.id}.`
          : `${input.outputSpec.title} generated from Product Chief report ${input.report.id}; image generation was not completed.`,
    };
  }

  private async generateDesignPromptPackMarkdown(
    input: {
      report: ProductChiefReport;
      outputId: string;
      outputSpec: ProductChiefReport['requiredGovernedOutputs'][number];
      specialistAgentIds: string[];
      planningContext: ProductPlanningContext;
    },
    fallbackContent: string,
    designChangeSet: DesignChangeSet | null,
  ) {
    const designStageLabel = 'concept design';
    const isDeliveryDesign = false;
    const designSpecificityRule =
      isDeliveryDesign
        ? 'Assume a functional-spec-backed delivery stage. Every page prompt must explicitly reflect functional states, operator actions, exception states, and implementation-facing interaction details.'
        : 'Assume an exploratory concept stage. Use the planning baseline to surface page structure, information hierarchy, and open product questions visually, but do not pretend unresolved details are already implementation-ready. Generate style directions that feel like modern product review boards instead of dense editorial posters.';
    const prompt = [
      'You are PMAIOS design delivery planner.',
      'Return markdown only.',
      `Produce a page-by-page ${designStageLabel} image2 prompt pack in Chinese, but make each "image2 main prompt" directly usable for image generation.`,
      'Do not return placeholders. Infer a minimal but concrete page inventory from the brief.',
      'Assume the default implementation-oriented stack is Next.js App Router + Tailwind CSS + shadcn/ui + Radix Primitives + repo-owned design tokens.',
      'Assume the quality references come from Carbon Design System, Apple Human Interface Guidelines, Material Design 3, and Ant Design Values.',
      designSpecificityRule,
      ...(designChangeSet?.mode === 'patch' && designChangeSet.items.length > 0
        ? [
            'This is a patch-mode design update, not a full rewrite.',
            'Only apply the listed requested changes. Keep all unlisted layout, hierarchy, spacing, visual language, and regions unchanged.',
            'If a requested change conflicts with readability, preserve the default page readability first and move interaction state into a separated detail surface.',
            'Treat protected regions as locked unless a requested change explicitly names them.',
          ]
        : []),
      ...(isDeliveryDesign
        ? []
        : [
            'For concept design, default to modern product review direction instead of old editorial/newspaper boards:',
            '- prefer one dominant hero screen plus a small number of supporting frames',
            '- keep copy short, sharp, and hierarchy-first',
            '- use annotations only when they help decision-making, not to fill space',
            '- preserve whitespace and visual focus instead of covering the canvas with notes',
            '- style should feel contemporary SaaS / software critique / launch review, not print media',
            'Generate separate images instead of packing multiple UI directions into one compressed board unless the requirement explicitly asks for a side-by-side comparison board.',
            'If the brief does not lock design language, style direction, and information density, prepare the prompt pack so generation can produce multiple independent options for real product selection.',
            'When a clicked state, modal, drawer, detail panel, or expanded interaction would compress the default page width or blur hierarchy, separate it from the default page instead of flattening everything into one surface.',
            'Preferred interaction-state expression order: separate image first; detached framed side state second; same-canvas overlay only when the requirement explicitly demands direct comparison.',
          ]),
      'Prohibited default style traits:',
      '- no newspaper or magazine spread feeling',
      '- no beige paper texture or retro editorial atmosphere',
      '- no dense multi-column layout with long narrative body copy',
      '- no excessive numbered stickers or commentary strips',
      '- no fake premium look driven by texture, grain, or over-annotation',
      'Preferred style anchors:',
      '- modern-review',
      '- bold-control-center',
      '- soft-studio-clean',
      'Keep the exact sections below:',
      '# Page-by-page image2 prompt pack',
      '## Design Scope',
      '## Page Inventory',
      '## Page-by-Page Prompt Pack',
      'For each page, include exactly these bullets:',
      '- page name:',
      '- page goal:',
      '- target user / scenario:',
      '- information hierarchy:',
      '- key sections:',
      '- primary actions:',
      '- visual direction:',
      '- layout constraints:',
      '- required components:',
      '- prohibited traits:',
      '- fixed design language:',
      '- fixed style direction:',
      '- fixed information density:',
      '- explicit combined compare board:',
      '- interaction-state separation rule:',
      ...(isDeliveryDesign
        ? []
        : [
            '- explainer overlay strategy:',
            '- callout focus points:',
            '- side example requirement:',
            '- summary strip content:',
          ]),
      '- image2 main prompt:',
      '- optional negative prompt:',
      'Use one "### Page N" section per page.',
      'Default assumption: one page can generate multiple separate image variants for selection; do not compress them into one image.',
      'Default page state should remain standard width and visually readable. Interaction states should be separated unless direct same-canvas comparison is explicitly required.',
      ...(designChangeSet?.mode === 'patch' && designChangeSet.items.length > 0
        ? [
            'Add one extra section before page prompts:',
            '## Design Change Application Plan',
            'List every change id, target page or region, and whether the page prompt addresses it.',
            'For every page section, also include:',
            '- addressed change ids:',
            '- locked areas:',
          ]
        : []),
      'If the brief explicitly names pages, preserve them. Otherwise derive the smallest page set that can satisfy delivery.',
      'Component language should feel implementable in a modern React product stack, not like a print poster or illustration board.',
      ...(designChangeSet?.mode === 'patch' && designChangeSet.items.length > 0
        ? [
            '',
            'Patch-mode requested changes:',
            ...designChangeSet.items.map((item) => `- ${item.changeId}: ${item.request}`),
            '',
            'Protected regions / must-not-change:',
            ...designChangeSet.protectedRegions.map((region) => `- ${region.pageName ?? region.pageKey ?? 'global'} / ${region.regionId}: ${region.rule}`),
            ...designChangeSet.globalMustNotChange.map((rule) => `- global: ${rule}`),
          ]
        : []),
      '',
      `Brief: ${input.report.brief}`,
    ].join('\n');

    const execution = await this.llmRouter.execute(
      {
        runId: `${input.outputId}-design-prompt-pack`,
        stageId: 'product-chief-design-prompt-pack',
        capability: 'text',
        prompt,
      },
      {
        subprojectId: input.report.subprojectId,
        allowCrossCapabilityFallback: false,
      },
    );

    return execution.result.status === 'success' && execution.result.outputText
      ? execution.result.outputText.trim()
      : fallbackContent;
  }

  private isImage2DesignOutput(outputType: string) {
    return outputType === 'concept-design-pack' || outputType === 'design-image2-prompt-pack';
  }

  private supportsDesignChangeGovernance(outputType: string) {
    return outputType === 'concept-design-pack'
      || outputType === 'design-image2-prompt-pack'
      || outputType === 'html-direction-pack';
  }

  private buildDraftDesignChangeSet(input: {
    report: ProductChiefReport;
    outputId: string;
  }): DesignChangeSet {
    const requests = this.extractDesignChangeRequests(input.report.brief);
    const patchMode = requests.length > 0 && this.looksLikePatchDesignBrief(input.report.brief, requests);
    const items: DesignChangeItem[] = requests.map((request, index) => ({
      changeId: `chg-${String(index + 1).padStart(2, '0')}`,
      targetPageKey: null,
      targetPageName: null,
      targetRegion: this.inferDesignTargetRegion(request),
      request,
      mustChange: true,
      status: 'requested',
      evidence: null,
    }));
    return {
      version: 1,
      outputId: input.outputId,
      reportId: input.report.id,
      subprojectId: input.report.subprojectId ?? null,
      generatedAt: new Date().toISOString(),
      mode: patchMode ? 'patch' : 'rewrite',
      source: 'brief',
      summary: patchMode
        ? `Patch-mode design update with ${items.length} requested change(s).`
        : 'Rewrite-mode design generation with no explicit multi-item change contract detected.',
      items,
      protectedRegions: [],
      globalMustNotChange: patchMode
        ? [
            'Do not change unlisted pages, regions, or component hierarchy.',
            'Do not change visual language, color system, spacing rhythm, or information hierarchy unless a requested change explicitly asks for it.',
            'Do not compress the default page width just to show a clicked detail state, modal, drawer, or side panel.',
          ]
        : [],
    };
  }

  private resolveDesignChangeSetTargets(changeSet: DesignChangeSet, pages: DesignPageBlueprint[]): DesignChangeSet {
    if (changeSet.mode !== 'patch' || changeSet.items.length === 0) {
      return changeSet;
    }

    const nextItems = changeSet.items.map((item) => {
      const matchedPage = pages.find((page) => this.matchesDesignPageRequest(item.request, page));
      return {
        ...item,
        targetPageKey: matchedPage ? this.slugify(matchedPage.pageName) : item.targetPageKey,
        targetPageName: matchedPage?.pageName ?? item.targetPageName,
      };
    });

    const protectedRegions = [
      ...pages.map((page) => ({
        pageKey: this.slugify(page.pageName),
        pageName: page.pageName,
        regionId: 'default-page-width',
        rule: 'Keep the default page readable at normal width. Do not flatten clicked detail state into the base page unless direct comparison is explicitly required.',
      })),
      ...nextItems.map((item) => ({
        pageKey: item.targetPageKey,
        pageName: item.targetPageName,
        regionId: item.targetRegion ?? 'untargeted-region',
        rule: `Only modify the requested region for ${item.changeId}; keep all sibling regions unchanged.`,
      })),
    ].filter((region, index, array) =>
      array.findIndex((candidate) => candidate.pageKey === region.pageKey && candidate.regionId === region.regionId) === index,
    );

    return {
      ...changeSet,
      items: nextItems,
      protectedRegions,
    };
  }

  private buildDesignDiffAudit(input: {
    outputId: string;
    mode: DesignChangeSet['mode'];
    changeSet: DesignChangeSet;
    referenceText: string;
  }): DesignDiffAudit {
    const normalizedReference = input.referenceText.toLowerCase();
    const appliedChangeIds: string[] = [];
    const missedChangeIds: string[] = [];

    for (const item of input.changeSet.items) {
      const evidence = this.findDesignChangeEvidence(item.request, normalizedReference);
      if (evidence) {
        appliedChangeIds.push(item.changeId);
        item.status = 'applied';
        item.evidence = evidence;
      } else {
        missedChangeIds.push(item.changeId);
        item.status = 'missed';
        item.evidence = null;
      }
    }

    const unintendedChanges = input.mode === 'patch' && input.changeSet.items.length > 0
      ? [{
          pageKey: null,
          regionId: 'manual-diff-check',
          detail: 'Any region not explicitly listed in the change set should be treated as unintended if it visually drifts. Manual visual diff is still required before approval.',
        }]
      : [];

    return {
      version: 1,
      outputId: input.outputId,
      generatedAt: new Date().toISOString(),
      mode: input.mode,
      appliedChangeIds,
      missedChangeIds,
      unintendedChanges,
      summary:
        input.mode === 'patch'
          ? `Patch audit: ${appliedChangeIds.length}/${input.changeSet.items.length} requested change(s) show structured evidence; ${missedChangeIds.length} still need follow-up.`
          : 'Rewrite audit: no explicit patch-mode change contract was detected.',
    };
  }

  private async writeDesignGovernanceArtifacts(input: {
    outputId: string;
    subprojectId?: string | null;
    changeSet: DesignChangeSet;
    diffAudit: DesignDiffAudit;
  }) {
    const changeSetPath = getProductChiefOutputVariantArtifactPath(input.outputId, 'design-change-set.json', input.subprojectId);
    const diffAuditPath = getProductChiefOutputVariantArtifactPath(input.outputId, 'design-diff-audit.json', input.subprojectId);
    await this.store.writeJson(changeSetPath, input.changeSet);
    await this.store.writeJson(diffAuditPath, input.diffAudit);
    return { changeSetPath, diffAuditPath };
  }

  private appendDesignGovernanceSection(
    markdown: string,
    changeSet: DesignChangeSet | null,
    diffAudit: DesignDiffAudit | null,
  ) {
    if (!changeSet || !diffAudit) {
      return markdown;
    }

    const lines = [markdown.trim(), '', '## Design Change Set', ''];
    lines.push(
      `- mode: ${changeSet.mode}`,
      `- requested changes: ${changeSet.items.length}`,
      `- protected regions: ${changeSet.protectedRegions.length}`,
      '',
    );
    for (const item of changeSet.items) {
      lines.push(
        `- ${item.changeId} / ${item.targetPageName ?? item.targetPageKey ?? 'global'} / ${item.targetRegion ?? 'unscoped'}`,
        `  - request: ${item.request}`,
        `  - status: ${item.status}`,
        `  - evidence: ${item.evidence ?? 'not found in structured output'}`,
      );
    }
    lines.push('', '## Design Diff Audit', '', `- applied: ${diffAudit.appliedChangeIds.length}`, `- missed: ${diffAudit.missedChangeIds.length}`, `- unintended: ${diffAudit.unintendedChanges.length}`, `- summary: ${diffAudit.summary}`, '');
    for (const unintended of diffAudit.unintendedChanges) {
      lines.push(`- unintended / ${unintended.regionId ?? 'unscoped'}: ${unintended.detail}`);
    }
    lines.push('');
    return lines.join('\n');
  }

  private extractDesignChangeRequests(brief: string) {
    const lines = brief
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    const requests = lines
      .filter((line) => /^(\d+[.)、]|[-*•]|[一二三四五六七八九十]+[、.])/u.test(line))
      .map((line) => line.replace(/^(\d+[.)、]|[-*•]|[一二三四五六七八九十]+[、.])\s*/u, '').trim())
      .filter((line) => line.length >= 6);
    return requests;
  }

  private looksLikePatchDesignBrief(brief: string, requests: string[]) {
    if (requests.length === 0) {
      return false;
    }
    const normalized = brief.toLowerCase();
    return ['修改', '改图', '调整', '只改', '保留其他', '不改其他', '基于上一版', '上一版', 'patch', 'keep other'].some((token) => normalized.includes(token));
  }

  private inferDesignTargetRegion(request: string) {
    if (/抽屉|drawer/iu.test(request)) return 'drawer';
    if (/弹窗|modal|dialog/iu.test(request)) return 'modal';
    if (/侧栏|侧边|side detail|detail panel/iu.test(request)) return 'detail-side-panel';
    if (/列表|table|grid/iu.test(request)) return 'list-surface';
    if (/筛选|filter|search/iu.test(request)) return 'filter-toolbar';
    if (/页头|header|导航|sidebar/iu.test(request)) return 'chrome';
    return null;
  }

  private matchesDesignPageRequest(request: string, page: DesignPageBlueprint) {
    const normalizedRequest = request.toLowerCase();
    const normalizedPage = page.pageName.toLowerCase();
    if (normalizedRequest.includes(normalizedPage)) {
      return true;
    }
    if (/详情|detail|drawer|modal|side/iu.test(request) && /详情|detail|drawer|侧栏|side/u.test(page.pageName)) {
      return true;
    }
    if (/默认页|主页面|列表|workspace|主视图/iu.test(request) && /工作台|workspace|list|主/u.test(page.pageName)) {
      return true;
    }
    return false;
  }

  private findDesignChangeEvidence(request: string, normalizedReference: string) {
    const candidates = request
      .toLowerCase()
      .split(/[\s,，。；;、/]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .filter((token) => !['保持', '其他', '地方', '不要', '可以', '默认', '通过', '设计图'].includes(token));
    const hits = candidates.filter((token) => normalizedReference.includes(token));
    if (hits.length >= 2) {
      return `matched keywords: ${hits.slice(0, 4).join(', ')}`;
    }
    return null;
  }

  private async generateDesignImagesFromPromptPack(input: {
    outputId: string;
    outputType: string;
    subprojectId?: string | null;
    markdown: string;
    assetVersionTag: string;
    assetBatchFolder: string;
  }) {
    const prompts = this.extractPagePrompts(input.markdown);
    const generated: GeneratedDesignImageItem[] = [];
    const warnings: string[] = [];
    const artifactPaths: string[] = [];
    const manifestPath = this.getGeneratedImageManifestPath(input.assetVersionTag, input.assetBatchFolder, input.subprojectId);
    const generatedAt = new Date().toISOString();

    if (prompts.length === 0) {
      warnings.push('No page-level image2 prompts could be parsed from the prompt pack.');
      await this.writeGeneratedImageBatchManifest({
        outputId: input.outputId,
        subprojectId: input.subprojectId ?? null,
        assetVersionTag: input.assetVersionTag,
        assetBatchFolder: input.assetBatchFolder,
        generated,
        warnings,
        manifestPath,
        generatedAt,
      });
      return { generated, warnings, artifactPaths, manifestPath, generatedAt };
    }

    let generatedIndex = 0;
    for (let pageIndex = 0; pageIndex < prompts.length; pageIndex += 1) {
      const page = prompts[pageIndex];
      if (page.explicitCombinedCompare) {
        warnings.push(
          `${page.pageName}: explicit combined compare board requested. Keeping request, but generation still stores each returned asset as a separate file path.`,
        );
      }

      const variants = this.expandDesignImageVariants(page);
      for (const variant of variants) {
        const execution = await this.llmRouter.execute(
          {
            runId: `${input.outputId}-design-image-${generatedIndex + 1}`,
            stageId: 'product-chief-design-image-generation',
            capability: 'image-generation',
            prompt: variant.prompt,
            imageGeneration: this.getDesignImageGenerationProfile(input.outputType, page.pageName, variant),
          },
          {
            subprojectId: input.subprojectId,
            preferredProvider: 'gemini',
            allowCrossCapabilityFallback: false,
          },
        );

        if (execution.result.status !== 'success') {
          warnings.push(`${page.pageName} / ${variant.label}: ${execution.result.error ?? 'image generation failed'}`);
          generatedIndex += 1;
          continue;
        }

        const imageAsset = execution.result.assets.find((asset) => asset.kind === 'image' && asset.uri?.startsWith('data:')) ?? null;
        if (!imageAsset?.uri) {
          warnings.push(`${page.pageName} / ${variant.label}: provider returned no inline image asset.`);
          generatedIndex += 1;
          continue;
        }

        const saved = await this.saveGeneratedImageAsset(
          generatedIndex,
          page.pageName,
          variant.id,
          imageAsset,
          input.assetVersionTag,
          input.assetBatchFolder,
          input.subprojectId,
        );
        generated.push({
          pageNumber: page.pageNumber,
          pageName: page.pageName,
          pageKey: `${this.slugify(page.pageName)}--${variant.id}`,
          variantId: variant.id,
          variantLabel: variant.label,
          designLanguage: variant.designLanguage,
          styleDirection: variant.styleDirection,
          informationDensity: variant.informationDensity,
          prompt: variant.prompt,
          assetPath: saved,
        });
        artifactPaths.push(saved);
        generatedIndex += 1;
      }
    }

    await this.writeGeneratedImageBatchManifest({
      outputId: input.outputId,
      subprojectId: input.subprojectId ?? null,
      assetVersionTag: input.assetVersionTag,
      assetBatchFolder: input.assetBatchFolder,
      generated,
      warnings,
      manifestPath,
      generatedAt,
    });
    return { generated, warnings, artifactPaths, manifestPath, generatedAt };
  }

  private getDesignImageGenerationProfile(outputType: string, pageName: string, variant: DesignImageVariantProfile) {
    const delivery = outputType === 'delivery-design-pack';
    return {
      profile: delivery ? 'delivery-handoff' as const : 'concept-review' as const,
      resolution: delivery ? '1536x1024' as const : '1024x1024' as const,
      quality: 'high' as const,
      outputHint: delivery
        ? `Generate a crisp high-resolution product UI screen for ${pageName}. Prioritize sharp typography, readable labels, clean interface edges, and handoff-grade clarity.`
        : `Generate a clear high-resolution concept image for ${pageName}. Use ${variant.designLanguage}, ${variant.styleDirection}, and ${variant.informationDensity} information density. Prioritize sharp type, strong hierarchy, readable UI structure, and one independent image per direction instead of compressed comparison boards.`,
    };
  }

  private extractPagePrompts(markdown: string) {
    const matches = [...markdown.matchAll(/^###\s+Page\s+(\d+)\s*$(?:\r?\n)([\s\S]*?)(?=^###\s+Page\s+\d+\s*$|$)/gmu)];
    return matches
      .map((match) => {
        const pageNumber = Number.parseInt(match[1] ?? '', 10);
        const section = match[2] ?? '';
        const pageName = section.match(/- page name:[ \t]*([^\r\n]+)/i)?.[1]?.trim() ?? null;
        const prompt = section.match(/- image2 main prompt:[ \t]*([^\r\n]+)/i)?.[1]?.trim() ?? null;
        if (!pageName || !prompt || Number.isNaN(pageNumber)) {
          return null;
        }

        return {
          pageNumber,
          pageName,
          prompt,
          fixedDesignLanguage: this.extractMarkdownBullet(section, 'fixed design language'),
          fixedStyleDirection: this.extractMarkdownBullet(section, 'fixed style direction'),
          fixedInformationDensity: this.extractInformationDensity(section),
          explicitCombinedCompare: this.extractBooleanLikeBullet(section, 'explicit combined compare board'),
        };
      })
      .filter((item): item is ParsedDesignImagePrompt => item !== null);
  }

  private expandDesignImageVariants(page: ParsedDesignImagePrompt): Array<DesignImageVariantProfile & { prompt: string }> {
    const lockedLanguage = page.fixedDesignLanguage;
    const lockedStyle = page.fixedStyleDirection;
    const lockedDensity = page.fixedInformationDensity;
    if (lockedLanguage || lockedStyle || lockedDensity) {
      const designLanguage = lockedLanguage ?? 'custom locked language';
      const styleDirection = lockedStyle ?? 'custom locked style';
      const informationDensity = lockedDensity ?? 'medium';
      return [
        {
          id: 'locked',
          label: 'locked direction',
          designLanguage,
          styleDirection,
          informationDensity,
          promptSuffix: '',
          prompt: [
            page.prompt,
            `Design language: ${designLanguage}.`,
            `Style direction: ${styleDirection}.`,
            `Information density: ${informationDensity}.`,
            'Generate one independent image only. Do not combine multiple UI directions or multiple pages into one board unless the requirement explicitly asks for comparison composition.',
            'If this page contains a clicked detail state, drawer, modal, or expanded panel, keep the default page readable at normal width and separate the interaction state instead of flattening both into one crowded frame.',
          ].join(' '),
        },
      ];
    }

    return this.getDefaultDesignImageVariantProfiles().map((variant) => ({
      ...variant,
      prompt: [
        page.prompt,
        variant.promptSuffix,
        `Design language: ${variant.designLanguage}.`,
        `Style direction: ${variant.styleDirection}.`,
        `Information density: ${variant.informationDensity}.`,
        'Generate this as one standalone image for selection. Do not place multiple style options into one compressed comparison board.',
        'If a clicked state, modal, drawer, side detail, or expanded interaction is relevant, preserve the default page readability and separate the interaction state instead of crushing both into one frame.',
      ].join(' '),
    }));
  }

  private getDefaultDesignImageVariantProfiles(): DesignImageVariantProfile[] {
    return [
      {
        id: 'clarity-low',
        label: 'clarity / low density',
        designLanguage: 'Apple-HIG-inspired clarity',
        styleDirection: 'soft studio clean',
        informationDensity: 'low',
        promptSuffix:
          'Favor generous whitespace, calm grouping, clean cards, reduced chrome, and clear product focus suitable for a real software team evaluating a low-density route.',
      },
      {
        id: 'system-medium',
        label: 'system / medium density',
        designLanguage: 'Material-3-informed modern SaaS system',
        styleDirection: 'bold control center',
        informationDensity: 'medium',
        promptSuffix:
          'Favor strong hierarchy, contemporary product blocks, balanced data exposure, and clear operational rhythm suitable for a medium-density mainstream route.',
      },
      {
        id: 'console-high',
        label: 'console / high density',
        designLanguage: 'Carbon-and-Ant-inspired enterprise console',
        styleDirection: 'data-dense operations cockpit',
        informationDensity: 'high',
        promptSuffix:
          'Favor enterprise-grade structure, denser but still readable panels, powerful table/list/dashboard surfaces, and serious operator tooling suitable for a high-density route.',
      },
    ];
  }

  private extractInformationDensity(section: string): 'low' | 'medium' | 'high' | null {
    const raw = this.extractMarkdownBullet(section, 'fixed information density')?.toLowerCase() ?? null;
    if (raw === 'low' || raw === 'medium' || raw === 'high') {
      return raw;
    }
    return null;
  }

  private extractBooleanLikeBullet(section: string, label: string) {
    const raw = this.extractMarkdownBullet(section, label)?.toLowerCase() ?? '';
    return ['yes', 'true', 'required', 'compare', 'comparison', '需要', '是'].some((token) => raw.includes(token));
  }

  private extractDesignPageBlueprints(markdown: string): DesignPageBlueprint[] {
    const matches = [...markdown.matchAll(/^###\s+Page\s+(\d+)\s*$(?:\r?\n)([\s\S]*?)(?=^###\s+Page\s+\d+\s*$|$)/gmu)];
    return matches
      .map((match) => {
        const pageNumber = Number.parseInt(match[1] ?? '', 10);
        const section = match[2] ?? '';
        const pageName = this.extractMarkdownBullet(section, 'page name');
        if (!pageName || Number.isNaN(pageNumber)) {
          return null;
        }

        return {
          pageNumber,
          pageName,
          pageGoal: this.extractMarkdownBullet(section, 'page goal'),
          targetScenario: this.extractMarkdownBullet(section, 'target user / scenario'),
          informationHierarchy: this.extractMarkdownBullet(section, 'information hierarchy'),
          keySections: this.extractCommaSeparatedBullet(section, 'key sections'),
          primaryActions: this.extractCommaSeparatedBullet(section, 'primary actions'),
          visualDirection: this.extractMarkdownBullet(section, 'visual direction'),
        } satisfies DesignPageBlueprint;
      })
      .filter((item): item is DesignPageBlueprint => item !== null);
  }

  private extractMarkdownBullet(section: string, label: string) {
    const pattern = new RegExp(`-\\s*${label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}:[ \\t]*([^\\r\\n]+)`, 'i');
    return section.match(pattern)?.[1]?.trim() ?? null;
  }

  private extractCommaSeparatedBullet(section: string, label: string) {
    const raw = this.extractMarkdownBullet(section, label);
    if (!raw) {
      return [];
    }
    return raw
      .split(/[、,，/]/u)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  private getDesignStyleProfiles(): DesignStyleProfile[] {
    return [
      {
        id: 'modern-review',
        label: 'Modern Review',
        direction: '清爽现代 SaaS 评审板',
        lookSummary: '明亮、高对比、留白明确，一个主屏配少量支持屏，适合第一轮结构判断。',
        bodyClass: 'style-modern-review',
        palette: {
          background: '#f4f7fb',
          panel: '#ffffff',
          panelAlt: '#ebf2ff',
          ink: '#0f172a',
          muted: '#526071',
          accent: '#1d4ed8',
          accentSoft: '#dbeafe',
          line: '#d7e2f0',
        },
        typeface: {
          display: '"Space Grotesk", "Segoe UI", sans-serif',
          body: '"Manrope", "Segoe UI", sans-serif',
          mono: '"IBM Plex Mono", Consolas, monospace',
        },
      },
      {
        id: 'bold-control-center',
        label: 'Bold Control Center',
        direction: '强对比控制台 / 运营中控方向',
        lookSummary: '更偏中控和运营驾驶舱，强调模块边界、关键数据面板和主操作区。',
        bodyClass: 'style-bold-control-center',
        palette: {
          background: '#09111f',
          panel: '#111c31',
          panelAlt: '#17233d',
          ink: '#f8fbff',
          muted: '#9fb4d1',
          accent: '#52d2c4',
          accentSoft: '#103b40',
          line: '#2a3b5a',
        },
        typeface: {
          display: '"Sora", "Segoe UI", sans-serif',
          body: '"IBM Plex Sans", "Segoe UI", sans-serif',
          mono: '"JetBrains Mono", Consolas, monospace',
        },
      },
      {
        id: 'soft-studio-clean',
        label: 'Soft Studio Clean',
        direction: '柔和工作室 / 产品展示混合方向',
        lookSummary: '适合更友好的工作流产品外观，但仍保持软件界面感，不走复古纸媒风。',
        bodyClass: 'style-soft-studio-clean',
        palette: {
          background: '#fffaf3',
          panel: '#ffffff',
          panelAlt: '#fff1d9',
          ink: '#1f2937',
          muted: '#6b7280',
          accent: '#ea580c',
          accentSoft: '#ffedd5',
          line: '#f0d7bd',
        },
        typeface: {
          display: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
          body: '"Instrument Sans", "Segoe UI", sans-serif',
          mono: '"IBM Plex Mono", Consolas, monospace',
        },
      },
    ];
  }

  private async generateDesignHtmlCandidatePack(input: {
    outputId: string;
    subprojectId?: string | null;
    markdown: string;
    report: ProductChiefReport;
    outputSpec: ProductChiefReport['requiredGovernedOutputs'][number];
  }) {
    const profiles = this.getDesignStyleProfiles();
    const pages = this.extractDesignPageBlueprints(input.markdown);
    const generated: GeneratedDesignHtmlCandidate[] = [];
    const artifactPaths: string[] = [];

    for (const [index, profile] of profiles.entries()) {
      const html = this.buildDesignHtmlCandidateDocument({
        profile,
        pages,
        report: input.report,
        outputSpec: input.outputSpec,
      });
      const assetPath = getProductChiefOutputVariantArtifactPath(
        input.outputId,
        `${profile.id}.html`,
        input.subprojectId,
      );
      await this.store.write(assetPath, html);
      artifactPaths.push(assetPath);
      generated.push({
        styleId: profile.id,
        styleLabel: profile.label,
        direction: profile.direction,
        recommended: index === 0,
        assetPath,
      });
    }

    return {
      generated,
      artifactPaths,
    };
  }

  private buildDesignHtmlCandidateDocument(input: {
    profile: DesignStyleProfile;
    pages: DesignPageBlueprint[];
    report: ProductChiefReport;
    outputSpec: ProductChiefReport['requiredGovernedOutputs'][number];
  }) {
    const { profile, report, outputSpec } = input;
    const pages = input.pages.length > 0
      ? input.pages
      : [
          {
            pageNumber: 1,
            pageName: 'Main Screen',
            pageGoal: '把核心工作流先收成一个可判断的主界面',
            targetScenario: '首次评审 / 方向比较',
            informationHierarchy: 'Hero / workspace / side evidence',
            keySections: ['Hero', 'Workspace', 'Evidence Rail'],
            primaryActions: ['Review', 'Compare', 'Refine'],
            visualDirection: profile.direction,
          } satisfies DesignPageBlueprint,
        ];
    const heroPage = pages[0];
    const navItemsDelivery = (heroPage.keySections.length > 0 ? heroPage.keySections : ['概览', '需求', '规则', '审查', '报表'])
      .slice(0, 5)
      .map((section, index) => `
        <button class="app-nav__item${index === 1 ? ' is-active' : ''}" type="button">
          <span class="app-nav__icon">${this.renderDeliveryHtmlIcon(index === 0 ? 'home' : index === 1 ? 'layers' : index === 2 ? 'shield' : index === 3 ? 'clipboard' : 'chart')}</span>
          <span>${this.escapeHtml(section)}</span>
        </button>
      `).join('\n');
    const metricCardsDelivery = pages.slice(0, 4).map((page, index) => `
      <article class="metric-card">
        <div class="metric-card__icon">${this.renderDeliveryHtmlIcon(index % 2 === 0 ? 'sparkles' : 'chart')}</div>
        <div class="metric-card__body">
          <span class="metric-card__label">${this.escapeHtml(page.pageName)}</span>
          <strong>${String((page.keySections.length || 3) * (index + 2))}</strong>
          <p>${this.escapeHtml(page.pageGoal ?? '结构已进入交付级页面表达。')}</p>
        </div>
      </article>
    `).join('\n');
    const tableRowsDelivery = pages.map((page, index) => `
      <button class="data-row${index === 0 ? ' is-selected' : ''}" type="button" data-page-name="${this.escapeHtml(page.pageName)}" data-page-goal="${this.escapeHtml(page.pageGoal ?? '待补目标')}" data-page-scenario="${this.escapeHtml(page.targetScenario ?? '默认场景')}" data-page-actions="${this.escapeHtml((page.primaryActions.length > 0 ? page.primaryActions : ['查看详情']).join(' / '))}">
        <span class="data-row__id">P-${String(index + 1).padStart(3, '0')}</span>
        <span class="data-row__name">${this.escapeHtml(page.pageName)}</span>
        <span class="data-row__status status-${index % 3 === 0 ? 'ok' : index % 3 === 1 ? 'warn' : 'draft'}">${index % 3 === 0 ? '已对齐' : index % 3 === 1 ? '待校对' : '草稿中'}</span>
        <span class="data-row__action">${this.escapeHtml(page.primaryActions[0] ?? '查看详情')}</span>
      </button>
    `).join('\n');
    const pageCardsDelivery = pages.map((page) => `
      <article class="page-card">
        <div class="page-card__eyebrow">Page ${page.pageNumber}</div>
        <h3>${this.escapeHtml(page.pageName)}</h3>
        <p>${this.escapeHtml(page.pageGoal ?? '待从需求中进一步收口该页面目标。')}</p>
        <div class="mini-page">
          <div class="mini-page__toolbar">
            <span class="mini-pill">${this.escapeHtml(page.targetScenario ?? '默认场景')}</span>
            <span class="mini-icon">${this.renderDeliveryHtmlIcon('search')}</span>
          </div>
          <div class="mini-page__canvas">
            <div class="mini-page__rail"></div>
            <div class="mini-page__table"><span></span><span></span><span></span><span></span></div>
          </div>
        </div>
        <dl class="page-meta">
          <div><dt>Scenario</dt><dd>${this.escapeHtml(page.targetScenario ?? '未指定')}</dd></div>
          <div><dt>Sections</dt><dd>${this.escapeHtml((page.keySections.length > 0 ? page.keySections : ['待补模块']).join(' / '))}</dd></div>
          <div><dt>Actions</dt><dd>${this.escapeHtml((page.primaryActions.length > 0 ? page.primaryActions : ['待补动作']).join(' / '))}</dd></div>
        </dl>
      </article>
    `).join('\n');
    const calloutItemsDelivery = [
      '这是企业交付级 HTML 页面，不是线框感评审板。',
      '默认包含真实导航、工具栏、筛选、列表、详情侧栏、状态标签和按钮。',
      '图标采用内联 SVG，前端可直接承接组件结构。',
      '交互至少体现行选中、详情切换和操作入口，不只表达版式。',
      `当前方向：${profile.direction}`,
    ].map((item) => `<li>${this.escapeHtml(item)}</li>`).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(outputSpec.title)} / ${this.escapeHtml(profile.label)}</title>
  <style>
    :root { --bg: ${profile.palette.background}; --panel: ${profile.palette.panel}; --panel-alt: ${profile.palette.panelAlt}; --ink: ${profile.palette.ink}; --muted: ${profile.palette.muted}; --accent: ${profile.palette.accent}; --accent-soft: ${profile.palette.accentSoft}; --line: ${profile.palette.line}; --display: ${profile.typeface.display}; --body: ${profile.typeface.body}; --mono: ${profile.typeface.mono}; --ok-bg: rgba(34, 197, 94, 0.14); --ok-ink: #15803d; --warn-bg: rgba(245, 158, 11, 0.16); --warn-ink: #b45309; --draft-bg: rgba(99, 102, 241, 0.16); --draft-ink: #4338ca; }
    * { box-sizing: border-box; } body { margin: 0; font-family: var(--body); background: radial-gradient(circle at top left, var(--panel-alt), transparent 28%), linear-gradient(180deg, var(--bg), #ffffff 72%); color: var(--ink); } button, input { font: inherit; }
    .shell { max-width: 1560px; margin: 0 auto; padding: 26px; display: grid; gap: 20px; } .hero { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.55fr); gap: 18px; } .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 24px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); overflow: hidden; } .hero-copy { padding: 26px; display: grid; gap: 14px; } .eyebrow { display: inline-flex; width: fit-content; padding: 6px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; } h1, h2, h3, h4, strong { margin: 0; font-family: var(--display); } h1 { font-size: clamp(34px, 4vw, 58px); line-height: 0.98; } p { margin: 0; color: var(--muted); line-height: 1.6; }
    .enterprise-app { margin-top: 8px; border-radius: 20px; overflow: hidden; border: 1px solid var(--line); background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.9)); } .app-topbar { height: 62px; padding: 0 18px; display: grid; grid-template-columns: auto auto 1fr auto auto; align-items: center; gap: 14px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.92); }
    .brand-mark, .metric-card__icon, .app-nav__icon, .icon-inline, .mini-icon { width: 18px; height: 18px; display: inline-grid; place-items: center; color: currentColor; } .brand-mark { width: 30px; height: 30px; border-radius: 10px; background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 42%, white)); color: white; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12); } .brand-name { font-size: 18px; font-weight: 700; font-family: var(--display); } .version-pill, .role-pill, .search-box, .toolbar-chip, .action-btn, .ghost-chip { border: 1px solid var(--line); background: #fff; border-radius: 14px; } .version-pill, .role-pill, .ghost-chip { padding: 8px 12px; font-size: 13px; color: var(--muted); } .search-box { height: 42px; display: flex; align-items: center; gap: 10px; padding: 0 14px; color: var(--muted); min-width: 0; } .search-box span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .app-workspace { display: grid; grid-template-columns: 216px minmax(0, 1fr) 360px; min-height: 580px; } .app-sidebar { padding: 16px 12px; border-right: 1px solid var(--line); background: color-mix(in srgb, var(--panel-alt) 46%, #fff); display: grid; align-content: start; gap: 10px; } .app-nav__item { height: 44px; padding: 0 12px; border-radius: 14px; border: 1px solid transparent; background: transparent; color: var(--ink); display: flex; align-items: center; gap: 10px; text-align: left; cursor: pointer; } .app-nav__item.is-active { background: var(--accent-soft); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 28%, var(--line)); font-weight: 700; }
    .app-main { padding: 20px; display: grid; gap: 16px; background: linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.9)); } .main-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; } .main-header__title { display: grid; gap: 8px; } .main-header__title strong { font-size: 24px; } .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; } .toolbar-chip { padding: 10px 12px; font-size: 13px; color: var(--muted); } .toolbar-chip.is-active { background: var(--accent-soft); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, var(--line)); font-weight: 700; } .action-btn { height: 42px; padding: 0 14px; display: inline-flex; align-items: center; gap: 8px; color: var(--ink); } .action-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } .metric-card { padding: 16px; border-radius: 18px; border: 1px solid var(--line); background: var(--panel); display: flex; gap: 12px; align-items: flex-start; } .metric-card__icon { width: 36px; height: 36px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); flex: 0 0 auto; } .metric-card__body { display: grid; gap: 4px; } .metric-card__label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; } .metric-card__body strong { font-size: 22px; } .metric-card__body p { font-size: 13px; }
    .main-grid { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 16px; } .list-panel, .detail-panel { border: 1px solid var(--line); border-radius: 20px; background: var(--panel); display: grid; } .list-panel__head, .detail-panel__head { padding: 16px 18px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; } .list-panel__head strong, .detail-panel__head strong { font-size: 18px; } .data-table { display: grid; gap: 10px; padding: 14px; } .data-row { width: 100%; border: 1px solid var(--line); border-radius: 16px; background: #fff; padding: 14px 16px; display: grid; grid-template-columns: 82px minmax(0, 1fr) 86px 120px; gap: 10px; align-items: center; text-align: left; color: inherit; cursor: pointer; } .data-row.is-selected { background: color-mix(in srgb, var(--accent-soft) 70%, #fff); border-color: color-mix(in srgb, var(--accent) 34%, var(--line)); } .data-row__id { font-family: var(--mono); font-size: 12px; color: var(--muted); } .data-row__name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .data-row__action { color: var(--muted); font-size: 13px; white-space: nowrap; } .data-row__status { justify-self: start; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; } .status-ok { background: var(--ok-bg); color: var(--ok-ink); } .status-warn { background: var(--warn-bg); color: var(--warn-ink); } .status-draft { background: var(--draft-bg); color: var(--draft-ink); }
    .detail-panel { grid-template-rows: auto 1fr auto; } .detail-panel__body { padding: 18px; display: grid; gap: 14px; } .detail-section { border: 1px solid var(--line); border-radius: 16px; padding: 14px; background: color-mix(in srgb, var(--panel-alt) 46%, #fff); display: grid; gap: 10px; } .detail-section h4 { font-size: 14px; } .detail-grid { display: grid; gap: 10px; } .detail-fact { display: grid; gap: 4px; } .detail-fact__label { font-size: 11px; letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; } .detail-actions { padding: 16px 18px; border-top: 1px solid var(--line); display: flex; gap: 10px; flex-wrap: wrap; }
    .hero-notes { padding: 22px; display: grid; gap: 16px; background: var(--panel); } .hero-notes ul { margin: 0; padding-left: 18px; color: var(--muted); display: grid; gap: 10px; } .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; } .summary-card { padding: 18px; border-radius: 20px; background: var(--panel); border: 1px solid var(--line); display: grid; gap: 8px; } .summary-card strong { font-size: 20px; } .page-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; } .page-card { padding: 18px; border-radius: 22px; background: var(--panel); border: 1px solid var(--line); display: grid; gap: 12px; } .page-card__eyebrow { font-size: 12px; font-weight: 700; color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; }
    .mini-page { border-radius: 18px; background: var(--panel-alt); border: 1px solid var(--line); overflow: hidden; } .mini-page__toolbar { padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--line); } .mini-pill { border-radius: 999px; padding: 4px 8px; font-size: 11px; border: 1px solid var(--line); background: #fff; color: var(--muted); } .mini-page__canvas { padding: 14px; display: grid; grid-template-columns: 76px 1fr; gap: 10px; } .mini-page__rail, .mini-page__table span { display: block; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.74); } .mini-page__rail { min-height: 92px; } .mini-page__table { display: grid; gap: 8px; } .mini-page__table span { height: 18px; } .page-meta { margin: 0; display: grid; gap: 8px; } .page-meta div { display: grid; gap: 2px; } .page-meta dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); font-weight: 700; } .page-meta dd { margin: 0; color: var(--muted); } .footer-bar { padding: 18px 22px; border-radius: 20px; border: 1px dashed var(--line); background: color-mix(in srgb, var(--panel) 84%, var(--panel-alt)); font-family: var(--mono); font-size: 13px; color: var(--muted); }
    @media (max-width: 1180px) { .hero { grid-template-columns: 1fr; } .app-topbar { grid-template-columns: auto 1fr auto; } .app-workspace, .main-grid { grid-template-columns: 1fr; } .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .data-row { grid-template-columns: 1fr; } .summary-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body class="${this.escapeHtml(profile.bodyClass)}">
  <main class="shell">
    <section class="hero">
      <article class="panel hero-copy">
        <span class="eyebrow">${this.escapeHtml(profile.label)}</span>
        <h1>${this.escapeHtml(heroPage.pageName)}</h1>
        <p>${this.escapeHtml(heroPage.pageGoal ?? '本轮直接输出企业交付级前端交互页面，而不是线框评审板。')}</p>
        <div class="enterprise-app">
          <header class="app-topbar">
            <div class="brand-mark">${this.renderDeliveryHtmlIcon('cube')}</div>
            <div class="brand-name">${this.escapeHtml(report.subprojectId ?? 'PMAIOS')}</div>
            <div class="search-box"><span class="icon-inline">${this.renderDeliveryHtmlIcon('search')}</span><span>${this.escapeHtml(heroPage.targetScenario ?? '搜索事务 ID / 页面 / 参数 / 负责人')}</span></div>
            <div class="version-pill">${this.escapeHtml(profile.label)}</div>
            <div class="ghost-chip">${this.escapeHtml(profile.direction)}</div>
          </header>
          <div class="app-workspace">
            <aside class="app-sidebar">${navItemsDelivery}</aside>
            <section class="app-main">
              <div class="main-header">
                <div class="main-header__title"><strong>${this.escapeHtml(heroPage.pageName)}</strong><p>${this.escapeHtml(heroPage.informationHierarchy ?? '导航 / 顶栏 / 指标 / 工具栏 / 列表 / 详情')}</p></div>
                <div class="toolbar">
                  <div class="toolbar-chip is-active">${this.escapeHtml(heroPage.primaryActions[0] ?? '筛选')}</div>
                  <div class="toolbar-chip">${this.escapeHtml(heroPage.primaryActions[1] ?? '查看详情')}</div>
                  <div class="toolbar-chip">${this.escapeHtml(heroPage.primaryActions[2] ?? '批量操作')}</div>
                  <button class="action-btn"><span class="icon-inline">${this.renderDeliveryHtmlIcon('download')}</span>导出</button>
                  <button class="action-btn primary"><span class="icon-inline">${this.renderDeliveryHtmlIcon('sparkles')}</span>批量执行</button>
                </div>
              </div>
              <section class="metric-grid">${metricCardsDelivery}</section>
              <section class="main-grid">
                <article class="list-panel"><div class="list-panel__head"><strong>主列表</strong><span class="role-pill">交付级交互页面</span></div><div class="data-table">${tableRowsDelivery}</div></article>
                <article class="detail-panel">
                  <div class="detail-panel__head"><strong id="detail-title">${this.escapeHtml(heroPage.pageName)} / 详情</strong><span class="data-row__status status-ok">已对齐</span></div>
                  <div class="detail-panel__body">
                    <div class="detail-section"><h4>目标</h4><p id="detail-goal">${this.escapeHtml(heroPage.pageGoal ?? '待补目标')}</p></div>
                    <div class="detail-section"><h4>结构与动作</h4><div class="detail-grid"><div class="detail-fact"><span class="detail-fact__label">场景</span><strong id="detail-scenario">${this.escapeHtml(heroPage.targetScenario ?? '默认场景')}</strong></div><div class="detail-fact"><span class="detail-fact__label">动作</span><strong id="detail-actions">${this.escapeHtml((heroPage.primaryActions.length > 0 ? heroPage.primaryActions : ['查看详情']).join(' / '))}</strong></div></div></div>
                    <div class="detail-section"><h4>实现提示</h4><p>真实 DOM 区块、真实按钮、真实列表和详情切换，前端应直接承接这些结构与状态，不再靠看图猜组件。</p></div>
                  </div>
                  <div class="detail-actions"><button class="action-btn"><span class="icon-inline">${this.renderDeliveryHtmlIcon('copy')}</span>复制 JSON</button><button class="action-btn"><span class="icon-inline">${this.renderDeliveryHtmlIcon('arrow')}</span>查看关联</button><button class="action-btn primary"><span class="icon-inline">${this.renderDeliveryHtmlIcon('sparkles')}</span>确认状态</button></div>
                </article>
              </section>
            </section>
          </div>
        </div>
      </article>
      <aside class="panel hero-notes"><span class="eyebrow">Direction</span><h2>${this.escapeHtml(profile.direction)}</h2><p>${this.escapeHtml(profile.lookSummary)}</p><ul>${calloutItemsDelivery}</ul></aside>
    </section>
    <section class="summary-grid">
      <article class="summary-card"><span class="eyebrow">Brief</span><strong>${this.escapeHtml(outputSpec.title)}</strong><p>${this.escapeHtml(report.brief.slice(0, 180))}${report.brief.length > 180 ? '…' : ''}</p></article>
      <article class="summary-card"><span class="eyebrow">Primary Scenario</span><strong>${this.escapeHtml(heroPage.targetScenario ?? '待补充')}</strong><p>${this.escapeHtml(heroPage.informationHierarchy ?? '导航 / 顶栏 / 指标 / 工具栏 / 列表 / 详情')}</p></article>
      <article class="summary-card"><span class="eyebrow">Delivery Rule</span><strong>delivery-html + schema-delivery</strong><p>HTML 负责企业交互页面表达，schema 负责状态、动作、数据引用和结构契约，两者同时作为交付依据。</p></article>
    </section>
    <section class="page-grid">${pageCardsDelivery}</section>
    <section class="footer-bar">profile=${this.escapeHtml(profile.id)} / recommended=${profile.id === 'modern-review' ? 'yes' : 'no'} / generated-from=${this.escapeHtml(outputSpec.type)}</section>
  </main>
  <script>
    const rows = Array.from(document.querySelectorAll('.data-row'));
    const detailTitle = document.getElementById('detail-title');
    const detailGoal = document.getElementById('detail-goal');
    const detailScenario = document.getElementById('detail-scenario');
    const detailActions = document.getElementById('detail-actions');
    rows.forEach((row) => {
      row.addEventListener('click', () => {
        rows.forEach((item) => item.classList.remove('is-selected'));
        row.classList.add('is-selected');
        if (detailTitle) detailTitle.textContent = row.dataset.pageName + ' / 详情';
        if (detailGoal) detailGoal.textContent = row.dataset.pageGoal || '待补目标';
        if (detailScenario) detailScenario.textContent = row.dataset.pageScenario || '默认场景';
        if (detailActions) detailActions.textContent = row.dataset.pageActions || '查看详情';
      });
    });
  </script>
</body>
</html>`;
    const pageCards = pages.map((page) => `
      <article class="page-card">
        <div class="page-card__eyebrow">Page ${page.pageNumber}</div>
        <h3>${this.escapeHtml(page.pageName)}</h3>
        <p>${this.escapeHtml(page.pageGoal ?? '待从需求中进一步收口该页目标')}</p>
        <div class="mini-screen">
          <div class="mini-screen__bar"></div>
          <div class="mini-screen__body">
            <div class="mini-screen__hero"></div>
            <div class="mini-screen__grid">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
        <dl class="page-meta">
          <div><dt>Scenario</dt><dd>${this.escapeHtml(page.targetScenario ?? '未指定')}</dd></div>
          <div><dt>Sections</dt><dd>${this.escapeHtml((page.keySections.length > 0 ? page.keySections : ['待补模块']).join(' / '))}</dd></div>
          <div><dt>Actions</dt><dd>${this.escapeHtml((page.primaryActions.length > 0 ? page.primaryActions : ['待补动作']).join(' / '))}</dd></div>
        </dl>
      </article>
    `).join('\n');
    const calloutItems = [
      'HTML 默认按可实现的 Next.js + Tailwind + shadcn/ui + Radix 栈来组织。',
      '整体质量参考 Carbon / Apple HIG / Material 3 / Ant Design Values。',
      '禁止报纸式多栏密排和大段说明文。',
      '主视觉必须有明确中心，不做均匀铺满。',
      '注释只用于帮助决策，不用于堆满信息。',
      `当前方向：${profile.direction}`,
    ].map((item) => `<li>${this.escapeHtml(item)}</li>`).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(outputSpec.title)} · ${this.escapeHtml(profile.label)}</title>
  <style>
    :root {
      --bg: ${profile.palette.background};
      --panel: ${profile.palette.panel};
      --panel-alt: ${profile.palette.panelAlt};
      --ink: ${profile.palette.ink};
      --muted: ${profile.palette.muted};
      --accent: ${profile.palette.accent};
      --accent-soft: ${profile.palette.accentSoft};
      --line: ${profile.palette.line};
      --display: ${profile.typeface.display};
      --body: ${profile.typeface.body};
      --mono: ${profile.typeface.mono};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--body);
      background:
        radial-gradient(circle at top left, var(--panel-alt), transparent 28%),
        linear-gradient(180deg, var(--bg), #ffffff 72%);
      color: var(--ink);
    }
    .shell {
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px;
      display: grid;
      gap: 22px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
      gap: 18px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .hero-copy {
      padding: 28px;
      display: grid;
      gap: 14px;
    }
    .eyebrow {
      display: inline-flex;
      width: fit-content;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1, h2, h3 { margin: 0; font-family: var(--display); }
    h1 { font-size: clamp(34px, 4vw, 62px); line-height: 0.96; }
    p { margin: 0; color: var(--muted); line-height: 1.6; }
    .hero-screen {
      margin-top: 8px;
      padding: 18px;
      border-radius: 20px;
      background: linear-gradient(160deg, var(--panel-alt), var(--panel));
      border: 1px solid var(--line);
      display: grid;
      gap: 14px;
    }
    .hero-screen__top {
      height: 54px;
      border-radius: 14px;
      background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 50%, white));
      opacity: 0.9;
    }
    .hero-screen__workspace {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr) 260px;
      gap: 12px;
      min-height: 340px;
    }
    .hero-screen__rail, .hero-screen__main, .hero-screen__side {
      border-radius: 18px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.65);
      position: relative;
    }
    .hero-screen__main::before, .hero-screen__rail::before, .hero-screen__side::before {
      content: "";
      position: absolute;
      inset: 16px;
      border-radius: 14px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.76), rgba(255,255,255,0.2)),
        repeating-linear-gradient(180deg, transparent, transparent 34px, rgba(15,23,42,0.035) 34px, rgba(15,23,42,0.035) 35px);
    }
    .hero-notes {
      padding: 22px;
      display: grid;
      gap: 16px;
      background: var(--panel);
    }
    .hero-notes ul {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
      display: grid;
      gap: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .summary-card {
      padding: 18px;
      border-radius: 20px;
      background: var(--panel);
      border: 1px solid var(--line);
      display: grid;
      gap: 8px;
    }
    .summary-card strong {
      font-size: 20px;
      font-family: var(--display);
    }
    .page-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .page-card {
      padding: 18px;
      border-radius: 22px;
      background: var(--panel);
      border: 1px solid var(--line);
      display: grid;
      gap: 12px;
    }
    .page-card__eyebrow {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .mini-screen {
      border-radius: 18px;
      background: var(--panel-alt);
      border: 1px solid var(--line);
      overflow: hidden;
    }
    .mini-screen__bar {
      height: 34px;
      background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 35%, white));
    }
    .mini-screen__body {
      padding: 14px;
      display: grid;
      gap: 12px;
    }
    .mini-screen__hero {
      height: 112px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(255,255,255,0.82), rgba(255,255,255,0.16));
      border: 1px solid var(--line);
    }
    .mini-screen__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .mini-screen__grid span {
      height: 70px;
      border-radius: 12px;
      background: rgba(255,255,255,0.74);
      border: 1px solid var(--line);
    }
    .page-meta {
      margin: 0;
      display: grid;
      gap: 8px;
    }
    .page-meta div {
      display: grid;
      gap: 2px;
    }
    .page-meta dt {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      font-weight: 700;
    }
    .page-meta dd {
      margin: 0;
      color: var(--muted);
    }
    .footer-bar {
      padding: 18px 22px;
      border-radius: 20px;
      border: 1px dashed var(--line);
      background: color-mix(in srgb, var(--panel) 84%, var(--panel-alt));
      font-family: var(--mono);
      font-size: 13px;
      color: var(--muted);
    }
    @media (max-width: 1100px) {
      .hero { grid-template-columns: 1fr; }
      .hero-screen__workspace { grid-template-columns: 1fr; min-height: 0; }
      .summary-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body class="${this.escapeHtml(profile.bodyClass)}">
  <main class="shell">
    <section class="hero">
      <article class="panel hero-copy">
        <span class="eyebrow">${this.escapeHtml(profile.label)}</span>
        <h1>${this.escapeHtml(heroPage.pageName)}</h1>
        <p>${this.escapeHtml(heroPage.pageGoal ?? '本轮先用现代化 HTML 评审板而不是报纸式讲解图，帮助团队做风格方向选择。')}</p>
        <div class="hero-screen">
          <div class="hero-screen__top"></div>
          <div class="hero-screen__workspace">
            <div class="hero-screen__rail"></div>
            <div class="hero-screen__main"></div>
            <div class="hero-screen__side"></div>
          </div>
        </div>
      </article>
      <aside class="panel hero-notes">
        <span class="eyebrow">Direction</span>
        <h2>${this.escapeHtml(profile.direction)}</h2>
        <p>${this.escapeHtml(profile.lookSummary)}</p>
        <ul>${calloutItems}</ul>
      </aside>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="eyebrow">Brief</span>
        <strong>${this.escapeHtml(outputSpec.title)}</strong>
        <p>${this.escapeHtml(report.brief.slice(0, 180))}${report.brief.length > 180 ? '…' : ''}</p>
      </article>
      <article class="summary-card">
        <span class="eyebrow">Primary Scenario</span>
        <strong>${this.escapeHtml(heroPage.targetScenario ?? '待补充')}</strong>
        <p>${this.escapeHtml(heroPage.informationHierarchy ?? '先收口层级，再决定细节组件和状态。')}</p>
      </article>
      <article class="summary-card">
        <span class="eyebrow">Visual Rule</span>
        <strong>anti-newspaper</strong>
        <p>不做报纸、多栏、纸张纹理和大段讲解文；保留清晰主视觉与高层级。</p>
      </article>
      <article class="summary-card">
        <span class="eyebrow">Build Stack</span>
        <strong>Next.js + Tailwind + shadcn/ui</strong>
        <p>以 Radix Primitives 做交互底座，以 repo-owned design tokens 控制最终视觉，保证后续可真实进入实现。</p>
      </article>
    </section>

    <section class="page-grid">
      ${pageCards}
    </section>

    <section class="footer-bar">
      profile=${this.escapeHtml(profile.id)} · recommended=${profile.id === 'modern-review' ? 'yes' : 'no'} · generated-from=${this.escapeHtml(outputSpec.type)}
    </section>
  </main>
</body>
</html>`;
  }

  private appendGeneratedHtmlCandidateSection(
    markdown: string,
    generatedResult: {
      generated: GeneratedDesignHtmlCandidate[];
    },
  ) {
    const lines = [markdown.trim(), '', '## Generated HTML Design Directions', ''];
    if (generatedResult.generated.length === 0) {
      lines.push('- No HTML design direction candidate was generated.', '');
      return lines.join('\n');
    }

    for (const item of generatedResult.generated) {
      lines.push(
        `- ${item.styleLabel} / ${item.direction}`,
        `  - style id: ${item.styleId}`,
        `  - recommended: ${item.recommended ? 'yes' : 'no'}`,
        `  - html asset: ${item.assetPath}`,
      );
    }
    lines.push('');
    return lines.join('\n');
  }

  private renderDeliveryHtmlIcon(kind: 'home' | 'layers' | 'shield' | 'clipboard' | 'chart' | 'search' | 'download' | 'sparkles' | 'copy' | 'arrow' | 'cube') {
    const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    switch (kind) {
      case 'home':
        return `<svg ${common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`;
      case 'layers':
        return `<svg ${common}><path d="m12 3 9 4.5-9 4.5L3 7.5 12 3Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/></svg>`;
      case 'shield':
        return `<svg ${common}><path d="M12 3 5 6v6c0 4.2 2.8 7.8 7 9 4.2-1.2 7-4.8 7-9V6l-7-3Z"/></svg>`;
      case 'clipboard':
        return `<svg ${common}><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4.5h6v3H9z"/><path d="M9 11h6"/><path d="M9 15h6"/></svg>`;
      case 'chart':
        return `<svg ${common}><path d="M4 20h16"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-8"/></svg>`;
      case 'search':
        return `<svg ${common}><circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/></svg>`;
      case 'download':
        return `<svg ${common}><path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/></svg>`;
      case 'sparkles':
        return `<svg ${common}><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"/><path d="m19 15 .8 2 .2.2 2 .8-2 .8-.2.2-.8 2-.8-2-.2-.2-2-.8 2-.8.2-.2.8-2Z"/></svg>`;
      case 'copy':
        return `<svg ${common}><rect x="9" y="9" width="10" height="10" rx="2"/><rect x="5" y="5" width="10" height="10" rx="2"/></svg>`;
      case 'arrow':
        return `<svg ${common}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`;
      case 'cube':
        return `<svg ${common}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m12 12 8-4.5"/><path d="M12 12v9"/><path d="M12 12 4 7.5"/></svg>`;
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/gu, '&amp;')
      .replace(/</gu, '&lt;')
      .replace(/>/gu, '&gt;')
      .replace(/"/gu, '&quot;')
      .replace(/'/gu, '&#39;');
  }

  private async saveGeneratedImageAsset(
    index: number,
    pageName: string,
    variantId: string,
    asset: ProviderExecutionAsset,
    versionTag: string,
    batchFolder: string,
    subprojectId?: string | null,
  ) {
    const uri = asset.uri ?? '';
    const match = uri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error(`Unsupported image asset URI for ${pageName}.`);
    }

    const mimeType = match[1];
    const data = match[2];
    const ext = this.extensionFromMimeType(mimeType);
    const safeVersionTag = this.slugifyVersionTag(versionTag);
    const fileName = `${safeVersionTag}-${String(index + 1).padStart(2, '0')}-${this.slugify(pageName)}-${this.slugify(variantId)}.${ext}`;
    const relativePath = getProductChiefOutputGeneratedAssetPath(safeVersionTag, batchFolder, fileName, subprojectId);
    await this.store.writeBytes(relativePath, Buffer.from(data, 'base64'));
    return relativePath;
  }

  private appendGeneratedImageSection(
    markdown: string,
    generatedResult: {
      generated: GeneratedDesignImageItem[];
      warnings: string[];
      manifestPath: string;
      generatedAt: string;
    },
  ) {
    const lines = [markdown.trim(), '', '## Generated Design Images', ''];
    lines.push(
      `- generated at: ${generatedResult.generatedAt}`,
      `- batch manifest: ${generatedResult.manifestPath}`,
      `- warning count: ${generatedResult.warnings.length}`,
      '',
    );

    if (generatedResult.generated.length > 0) {
      for (const item of generatedResult.generated) {
        lines.push(
          `- Page ${item.pageNumber} / ${item.pageName} / ${item.variantLabel}`,
          `  - page key: ${item.pageKey}`,
          `  - design language: ${item.designLanguage}`,
          `  - style direction: ${item.styleDirection}`,
          `  - information density: ${item.informationDensity}`,
          `  - image asset: ${item.assetPath}`,
          `  - prompt: ${item.prompt}`,
        );
      }
      lines.push('');
    } else {
      lines.push('- No design image was generated.', '');
    }

    if (generatedResult.warnings.length > 0) {
      lines.push('## Image Generation Warnings', '', ...generatedResult.warnings.map((warning) => `- ${warning}`), '');
    }

    return lines.join('\n');
  }

  private getGeneratedImageManifestPath(versionTag: string, batchFolder: string, subprojectId?: string | null) {
    return getProductChiefOutputGeneratedAssetPath(versionTag, batchFolder, 'batch-manifest.json', subprojectId);
  }

  private async writeGeneratedImageBatchManifest(input: {
    outputId: string;
    subprojectId: string | null;
    assetVersionTag: string;
    assetBatchFolder: string;
    generated: GeneratedDesignImageItem[];
    warnings: string[];
    manifestPath: string;
    generatedAt: string;
  }) {
    const manifest: GeneratedImageBatchManifest = {
      version: 1,
      outputId: input.outputId,
      subprojectId: input.subprojectId,
      generatedAt: new Date().toISOString(),
      versionTag: input.assetVersionTag,
      batchFolder: input.assetBatchFolder,
      generatedImageGeneratedAt: input.generatedAt,
      pageCount: input.generated.length,
      warningCount: input.warnings.length,
      items: input.generated,
      warnings: input.warnings,
    };
    await this.store.writeJson(input.manifestPath, manifest);
  }

  private extensionFromMimeType(mimeType: string) {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/webp') return 'webp';
    return 'png';
  }

  private slugify(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-')
      .replace(/^-+|-+$/gu, '');
    return normalized || 'page';
  }

  private slugifyVersionTag(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/gu, '-')
      .replace(/^-+|-+$/gu, '');
    return normalized || 'unversioned';
  }

  private resolveGeneratedAssetVersionTag(versionEntries: VersionEntry[]) {
    const latestVersionTag = versionEntries.find((entry) => entry.newVersion?.trim())?.newVersion?.trim()
      ?? versionEntries.find((entry) => entry.previousVersion?.trim())?.previousVersion?.trim()
      ?? 'unversioned';
    return this.slugifyVersionTag(latestVersionTag);
  }

  private buildUiSchemaContract(input: {
    report: ProductChiefReport;
    outputId: string;
    planningContext: ProductPlanningContext;
  }): UISchemaContract {
    const requirementIds = input.planningContext.requirements.slice(0, 8).map((requirement) => requirement.id);
    const requirementFields = input.planningContext.requirements
      .slice(0, 5)
      .map((requirement) => this.slugify(requirement.title))
      .filter(Boolean);
    const sharedOutputTypes = input.report.requiredGovernedOutputs.map((output) => output.type);
    const sharedStateIds = ['default', 'loading', 'empty', 'error', 'permission'];

    return {
      version: 1,
      reportId: input.report.id,
      outputId: input.outputId,
      subprojectId: input.report.subprojectId ?? null,
      generatedAt: new Date().toISOString(),
      sourceBrief: input.report.brief,
      linkedRequirementIds: requirementIds,
      linkedOutputTypes: sharedOutputTypes,
      pageContracts: [
        {
          pageId: 'primary-workspace',
          pageName: '主工作台',
          pagePurpose: '承载核心业务列表、筛选、状态总览与主要操作入口。',
          route: '/workspace',
          classification: 'production',
          layoutShell: 'sidebar + header + primary content + optional secondary panel',
          targetRoles: ['operator', 'reviewer'],
          dataRefs: [
            {
              refId: 'workspace-list',
              label: '主列表视图模型',
              kind: 'list',
              fields: ['id', 'title', 'status', 'owner', 'updatedAt', ...requirementFields].slice(0, 8),
            },
            {
              refId: 'workspace-filters',
              label: '筛选条件',
              kind: 'filter',
              fields: ['keyword', 'status', 'owner', 'priority'],
            },
            {
              refId: 'workspace-metrics',
              label: '摘要指标',
              kind: 'metric',
              fields: ['total', 'active', 'blocked', 'completed'],
            },
          ],
          states: [
            { stateId: 'default', label: '默认态', kind: 'default', trigger: '页面首次进入且数据可用' },
            { stateId: 'loading', label: '加载态', kind: 'loading', trigger: '列表或指标请求进行中' },
            { stateId: 'empty', label: '空态', kind: 'empty', trigger: '筛选后无数据或尚未配置内容' },
            { stateId: 'error', label: '错误态', kind: 'error', trigger: '主数据请求失败' },
            { stateId: 'permission', label: '权限态', kind: 'permission', trigger: '用户无访问或操作权限' },
            { stateId: 'selection', label: '选中态', kind: 'selection', trigger: '用户选中一条或一组记录' },
          ],
          actions: [
            { actionId: 'filter-list', label: '筛选列表', kind: 'filter', sourceBlockId: 'filter-toolbar', target: 'workspace-list', resultStateId: 'default' },
            { actionId: 'open-detail', label: '打开详情', kind: 'open-detail', sourceBlockId: 'primary-list', target: 'detail-secondary-surface', resultStateId: 'selection' },
            { actionId: 'bulk-operate', label: '批量操作', kind: 'bulk-action', sourceBlockId: 'primary-list', target: 'workspace-list', resultStateId: 'selection' },
            { actionId: 'generate-governed-output', label: '触发治理产出', kind: 'custom', sourceBlockId: 'governed-output-queue', target: 'governed-output-queue', resultStateId: 'default' },
          ],
          blocks: [
            {
              blockId: 'summary-metrics',
              label: '摘要指标区',
              type: 'metrics-strip',
              purpose: '展示当前范围内的关键数量与状态概览。',
              required: true,
              sourceRequirementIds: requirementIds,
              sourceOutputTypes: ['functional-spec-pack', 'requirement-baseline', 'ui-schema-spec'],
              stateIds: sharedStateIds,
              actionIds: [],
              dataRefIds: ['workspace-metrics'],
            },
            {
              blockId: 'filter-toolbar',
              label: '筛选工具条',
              type: 'filter-toolbar',
              purpose: '支持按关键词、状态、归属和优先级过滤主工作对象。',
              required: true,
              sourceRequirementIds: requirementIds,
              sourceOutputTypes: ['functional-spec-pack', 'ui-schema-spec'],
              stateIds: sharedStateIds,
              actionIds: ['filter-list'],
              dataRefIds: ['workspace-filters'],
            },
            {
              blockId: 'primary-list',
              label: '主列表区',
              type: 'data-table',
              purpose: '展示主要业务对象，并提供详情和批量动作入口。',
              required: true,
              sourceRequirementIds: requirementIds,
              sourceOutputTypes: ['functional-spec-pack', 'ui-schema-spec'],
              stateIds: [...sharedStateIds, 'selection'],
              actionIds: ['open-detail', 'bulk-operate'],
              dataRefIds: ['workspace-list'],
            },
            {
              blockId: 'governed-output-queue',
              label: '治理产出队列',
              type: 'action-panel',
              purpose: '承载设计、schema 与 handoff 相关的受治理动作。',
              required: true,
              sourceRequirementIds: requirementIds,
              sourceOutputTypes: ['functional-spec-pack', 'ui-schema-spec', 'implementation-handoff'],
              stateIds: sharedStateIds,
              actionIds: ['generate-governed-output'],
              dataRefIds: [],
            },
          ],
        },
        {
          pageId: 'detail-secondary-surface',
          pageName: '详情态 / 二级状态面',
          pagePurpose: '承载点击后详情、抽屉、侧栏或二级交互状态，不压缩默认页的视觉主宽度。',
          route: '/workspace/detail',
          classification: 'production',
          layoutShell: 'detached right panel or separate detail page',
          targetRoles: ['operator', 'reviewer'],
          dataRefs: [
            {
              refId: 'detail-record',
              label: '详情记录视图模型',
              kind: 'detail',
              fields: ['id', 'title', 'status', 'owner', 'history', 'actions'],
            },
            {
              refId: 'detail-selection',
              label: '当前选中对象',
              kind: 'selection',
              fields: ['selectedId', 'selectedType'],
            },
          ],
          states: [
            { stateId: 'default', label: '详情默认态', kind: 'detail', trigger: '用户打开某条记录的详情' },
            { stateId: 'loading', label: '详情加载态', kind: 'loading', trigger: '详情数据请求进行中' },
            { stateId: 'error', label: '详情错误态', kind: 'error', trigger: '详情加载失败' },
            { stateId: 'permission', label: '详情权限态', kind: 'permission', trigger: '用户可见但不可操作' },
            { stateId: 'drawer', label: '抽屉/侧栏态', kind: 'drawer', trigger: '需求明确要求侧栏承载详情' },
          ],
          actions: [
            { actionId: 'close-detail', label: '关闭详情', kind: 'open-panel', sourceBlockId: 'detail-header', target: 'primary-workspace', resultStateId: 'default' },
            { actionId: 'submit-detail-action', label: '执行详情动作', kind: 'submit', sourceBlockId: 'detail-actions', target: 'detail-record', resultStateId: 'success' },
          ],
          blocks: [
            {
              blockId: 'detail-header',
              label: '详情头部',
              type: 'detail-header',
              purpose: '展示标题、状态、关闭动作及关键身份信息。',
              required: true,
              sourceRequirementIds: requirementIds,
              sourceOutputTypes: ['functional-spec-pack', 'ui-schema-spec'],
              stateIds: ['default', 'loading', 'error', 'permission', 'drawer'],
              actionIds: ['close-detail'],
              dataRefIds: ['detail-record', 'detail-selection'],
            },
            {
              blockId: 'detail-content',
              label: '详情内容区',
              type: 'detail-body',
              purpose: '展示对象字段、状态、历史和关联信息。',
              required: true,
              sourceRequirementIds: requirementIds,
              sourceOutputTypes: ['functional-spec-pack', 'ui-schema-spec'],
              stateIds: ['default', 'loading', 'error', 'permission', 'drawer'],
              actionIds: [],
              dataRefIds: ['detail-record'],
            },
            {
              blockId: 'detail-actions',
              label: '详情动作区',
              type: 'action-footer',
              purpose: '承载二级确认、提交、跳转或修正动作。',
              required: true,
              sourceRequirementIds: requirementIds,
              sourceOutputTypes: ['functional-spec-pack', 'implementation-handoff', 'ui-schema-spec'],
              stateIds: ['default', 'permission'],
              actionIds: ['submit-detail-action'],
              dataRefIds: ['detail-record'],
            },
          ],
        },
      ],
      implementationRules: [
        '前端实现必须优先消费 pageContracts / blocks / states / actions / dataRefs，而不是根据设计图猜测结构。',
        '如果概念图、HTML 方向稿或交付设计改变了页面结构、状态或动作，必须同步重生成并审查该 UI schema contract。',
        '点击后详情、抽屉、侧栏与默认页属于不同交互状态时，应采用独立详情面或明显分离的二级表面，而不是压缩默认页主宽度。',
      ],
    };
  }

  private appendGeneratedUiSchemaSection(markdown: string, contract: UISchemaContract, schemaArtifactPath: string) {
    return [
      markdown,
      '',
      '## Machine-Readable UI Schema Contract',
      '',
      `- schema artifact: ${schemaArtifactPath}`,
      `- page contract count: ${contract.pageContracts.length}`,
      '',
      '```json',
      JSON.stringify(contract, null, 2),
      '```',
      '',
    ].join('\n');
  }

  private buildGeneratedAssetBatchFolder(versionTag: string, outputId: string) {
    const now = new Date();
    const parts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ];
    const compact = `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
    const shortOutputId = outputId.replace(/^product-output-/u, '').slice(0, 8) || 'output';
    return `${versionTag}-batch-${compact}-${shortOutputId}`;
  }

  private async runSpecialistTasks(input: {
    report: ProductChiefReport;
    outputId: string;
    outputType: string;
    outputTitle: string;
    specialistAgentIds: string[];
    requirementIds: string[];
  }) {
    const specialists = input.specialistAgentIds
      .map((agentId) => input.report.engagedSpecialists.find((specialist) => specialist.agentId === agentId) ?? null)
      .filter((specialist): specialist is ProductChiefReport['engagedSpecialists'][number] => specialist !== null);

    const tasks: ProductChiefSpecialistTask[] = [];
    for (const specialist of specialists) {
      const taskId = `product-chief-task-${randomUUID()}`;
      const artifactPath = getProductChiefSpecialistTaskArtifactPath(taskId, input.report.subprojectId);
      const now = new Date().toISOString();
      const summary = this.buildSpecialistTaskSummary(specialist.role, input.outputType);
      const task: ProductChiefSpecialistTask = {
        id: taskId,
        reportId: input.report.id,
        outputId: input.outputId,
        subprojectId: input.report.subprojectId,
        agentId: specialist.agentId,
        agentName: specialist.name,
        role: specialist.role,
        status: 'completed',
        assignedAt: now,
        completedAt: now,
        artifactPath,
        outputType: input.outputType,
        outputTitle: input.outputTitle,
        summary,
        requirementIds: input.requirementIds,
        metadata: {
          executionMode: 'deterministic-specialist-runtime',
          reportGeneratedAt: input.report.generatedAt,
        },
      };

      await this.store.write(artifactPath, this.buildSpecialistTaskArtifact(input.report, task, specialist.reason));
      await this.store.writeJson(getProductChiefSpecialistTaskPath(task.id, task.subprojectId), task);
      tasks.push(task);
    }
    return tasks;
  }

  private async runMultiAgentReview(input: {
    report: ProductChiefReport;
    outputId: string;
    outputType: string;
    outputTitle: string;
    outputArtifactPath: string;
    outputRecordPath: string;
    outputContent: string;
    specialistTasks: ProductChiefSpecialistTask[];
    requirementIds: string[];
  }) {
    const reviewId = `product-chief-review-${randomUUID()}`;
    const artifactPath = getProductChiefMultiAgentReviewArtifactPath(reviewId, input.report.subprojectId);
    const now = new Date().toISOString();
    const hasMissingQuestions = input.report.missingQuestions.length > 0;
    const turns = input.specialistTasks.map((task) => {
      const traceSensitiveRole = task.role === 'requirements' || task.role === 'versioning' || task.role === 'review';
      const noEvidence = task.requirementIds.length === 0 || !task.artifactPath;
      const position: 'support' | 'concern' | 'blocker' =
        noEvidence ? 'blocker' : hasMissingQuestions && traceSensitiveRole ? 'concern' : 'support';
      const summary =
        position === 'blocker'
          ? `${task.agentName} cannot approve ${input.outputType} because requirement or artifact evidence is missing.`
          : position === 'concern'
            ? `${task.agentName} supports drafting, but requires human confirmation for unresolved product context.`
            : `${task.agentName} supports the project PM output and links it to auditable evidence.`;

      return {
        agentId: task.agentId,
        agentName: task.agentName,
        role: task.role,
        position,
        summary,
        evidenceTaskId: task.id,
        artifactPath: task.artifactPath,
      };
    });

    const stopConditions = [
      {
        condition: 'At least two product agents participated',
        satisfied: input.specialistTasks.length >= 2,
        detail: `${input.specialistTasks.length} specialist task(s) completed.`,
      },
      {
        condition: 'Project output has requirement trace',
        satisfied: input.requirementIds.length > 0,
        detail: input.requirementIds.length > 0 ? input.requirementIds.join(', ') : 'No requirement id linked.',
      },
      {
        condition: 'Project output has artifact trace',
        satisfied: Boolean(input.outputArtifactPath && input.outputRecordPath),
        detail: `${input.outputArtifactPath}; ${input.outputRecordPath}`,
      },
      {
        condition: 'No agent raised a blocker',
        satisfied: turns.every((turn) => turn.position !== 'blocker'),
        detail: `${turns.filter((turn) => turn.position === 'blocker').length} blocker turn(s).`,
      },
      {
        condition: 'Human-decision context is explicit',
        satisfied: true,
        detail: hasMissingQuestions
          ? 'Missing physical-world questions remain visible before final approval.'
          : 'No missing physical-world questions were detected.',
      },
      this.buildSpecificityStopCondition(input.outputType, input.outputContent),
    ];

    const conflicts =
      hasMissingQuestions
        ? [
            {
              topic: 'physical-world-context',
              positions: input.report.missingQuestions.map((question) => `${question.topic}: ${question.question}`),
              resolution: 'Project PM can use the draft, but final approval needs explicit human answers or waiver.',
              status: 'needs-human-decision' as const,
            },
          ]
        : [];
    const hasBlocker = turns.some((turn) => turn.position === 'blocker') || stopConditions.some((condition) => !condition.satisfied);
    const status = hasBlocker ? 'blocked' : conflicts.some((conflict) => conflict.status === 'needs-human-decision') ? 'needs-human-decision' : 'pass';
    const consensus =
      status === 'pass'
        ? `Project PM output "${input.outputTitle}" can be used as governed product material.`
        : status === 'needs-human-decision'
          ? `Project PM output "${input.outputTitle}" is usable as a draft, with explicit human decisions required before final approval.`
          : `Project PM output "${input.outputTitle}" is blocked until missing evidence is added.`;

    const review: ProductChiefMultiAgentReview = {
      id: reviewId,
      reportId: input.report.id,
      outputId: input.outputId,
      subprojectId: input.report.subprojectId,
      mode: 'deterministic-multi-agent-review',
      status,
      startedAt: now,
      completedAt: now,
      participantTaskIds: input.specialistTasks.map((task) => task.id),
      artifactPath,
      consensus,
      turns,
      conflicts,
      stopConditions,
      requirementIds: input.requirementIds,
      metadata: {
        outputType: input.outputType,
        outputTitle: input.outputTitle,
        projectPmUsable: status !== 'blocked',
      },
    };

    await this.store.write(artifactPath, this.buildMultiAgentReviewArtifact(input.report, review, input.outputArtifactPath));
    await this.store.writeJson(getProductChiefMultiAgentReviewPath(review.id, review.subprojectId), review);
    return review;
  }

  private async resolveOutputRequirementIds(input: {
    report: ProductChiefReport;
    outputId: string;
    outputType: string;
    outputTitle: string;
    outputPriority: ProductChiefReport['requiredGovernedOutputs'][number]['priority'];
    summary: string;
    artifactPaths: string[];
    requirementIds?: string[];
  }) {
    const existingIds = [...new Set((input.requirementIds ?? []).map((id) => id.trim()).filter(Boolean))];
    if (existingIds.length > 0) {
      return existingIds;
    }

    const requirement = await new RequirementService(this.memoryService).createRequirement({
      subprojectId: input.report.subprojectId,
      title: `Review governed output: ${input.outputTitle}`,
      description: [
        input.summary,
        '',
        `Product Chief report: ${input.report.id}`,
        `Output id: ${input.outputId}`,
        `Output type: ${input.outputType}`,
        '',
        input.report.brief,
      ].join('\n'),
      category: 'feature',
      priority: input.outputPriority,
      source: {
        kind: 'product-output',
        sessionId: null,
        messageId: null,
        runId: null,
        sourceRef: {
          entityType: 'product-chief-report',
          entityId: input.report.id,
          path: input.artifactPaths[0] ?? null,
          label: input.outputType,
        },
      },
      artifactPaths: input.artifactPaths,
      metadata: {
        source: 'product-chief-output',
        productChiefReportId: input.report.id,
        productChiefOutputId: input.outputId,
        outputType: input.outputType,
      },
    });
    return [requirement.id];
  }

  private async ensureAgentHierarchy(subprojectId?: string | null) {
    const existing = await this.productAgentService.listAgents(subprojectId);
    if (existing.length > 0) {
      return existing;
    }

    return this.productAgentService.bootstrapManagementHierarchy(subprojectId);
  }

  private async resolveEvidencePaths(subprojectId?: string | null, contextPaths?: string[]) {
    const truthSources = await this.memoryService.loadTruthSourceDocuments(subprojectId);
    const contextDocs = await this.memoryService.loadContextDocuments(subprojectId);
    return [...new Set([...(contextPaths ?? []), ...truthSources.map((document) => document.path), ...contextDocs.map((document) => document.path)])];
  }

  private async findRecommendedSkills(brief: string, subprojectId?: string | null): Promise<ProductChiefReport['recommendedSkills']> {
    const matches = await this.skillRegistry.findSkills({
      query: brief,
      subprojectId,
      limit: 8,
    });
    return matches.map((match) => ({
      skillId: match.skill.id,
      name: match.skill.name,
      category: match.skill.category,
      ownerRole: match.skill.ownerRole,
      promptPath: match.skill.promptPath,
      score: match.score,
      reasons: match.reasons,
      deploymentStatus: match.skill.deployment.status,
      tool: match.skill.tool,
    }));
  }

  private selectSpecialists(agents: ProductAgent[], brief: string): ProductChiefReport['engagedSpecialists'] {
    const lowerBrief = brief.toLowerCase();
    const desiredRoles = new Set<string>(['requirements', 'versioning', 'review', 'workflow', 'delivery']);
    if (/market|competitor|open source|ecosystem|framework|行业|竞品|开源|生态/u.test(lowerBrief)) {
      desiredRoles.add('product-management');
      desiredRoles.add('review');
    }
    if (/ui|frontend|interface|console|schema|页面|界面|组件/u.test(lowerBrief)) {
      desiredRoles.add('workflow');
      desiredRoles.add('delivery');
    }
    if (/learn|cognition|method|mental|学习|认知|方法/u.test(lowerBrief)) {
      desiredRoles.add('retrospective');
    }

    return agents
      .filter((agent) => agent.level === 'specialist' || agent.level === 'manager')
      .filter((agent) => desiredRoles.has(agent.role) || /research|analysis|roadmap|documentation|design/i.test(agent.name))
      .slice(0, 8)
      .map((agent) => ({
        agentId: agent.id,
        name: agent.name,
        role: agent.role,
        level: agent.level,
        reason: `Selected for brief coverage: ${agent.summary}`,
      }));
  }

  private buildMissingQuestions(brief: string, evidencePaths: string[]): ProductChiefReport['missingQuestions'] {
    const lowerBrief = brief.toLowerCase();
    const questions: ProductChiefReport['missingQuestions'] = [];
    const add = (topic: string, question: string, reason: string, requiredFor: string[]) => {
      questions.push({
        id: `question-${questions.length + 1}`,
        topic,
        question,
        reason,
        requiredFor,
      });
    };

    if (!/user|customer|persona|用户|客户|使用者/u.test(lowerBrief)) {
      add('target-users', 'Who are the exact users or stakeholders affected by this work?', 'The brief does not name the real-world user group.', [
        'requirement evaluation',
        'roadmap priority',
      ]);
    }
    if (!/metric|kpi|okr|success|指标|成功|衡量/u.test(lowerBrief)) {
      add('success-metrics', 'What measurable outcome proves this work succeeded?', 'No success metric or OKR is stated.', [
        'review gate',
        'version planning',
      ]);
    }
    if (!/deadline|date|timeline|release|截止|时间|上线|版本/u.test(lowerBrief)) {
      add('timeline', 'Is there a real deadline, launch window, or external dependency?', 'No timing constraint is visible.', [
        'release planning',
        'delivery risk',
      ]);
    }
    if (!/budget|headcount|team|owner|stakeholder|资源|团队|负责人|协作/u.test(lowerBrief)) {
      add('ownership', 'Who owns the final decision, and which teams must coordinate?', 'Decision rights and coordination load are missing.', [
        'human approval',
        'delivery planning',
      ]);
    }
    if (evidencePaths.length === 0) {
      add('context-evidence', 'Which source documents or real-world notes should this decision rely on?', 'No repository evidence is attached to the analysis.', [
        'auditability',
      ]);
    }

    return questions;
  }

  private buildLearningGuidance(brief: string): ProductChiefReport['learningGuidance'] {
    const guidance: ProductChiefReport['learningGuidance'] = [
      {
        id: 'learning-1',
        title: 'Separate solution complexity from coordination complexity',
        recommendation: 'Estimate the work using AI-first effort, coordination load, external dependency, and confidence.',
        whyNow: 'The version plan requires AI-speed estimation rather than historical human-only pacing.',
        templatePath: 'docs/operations/ai-product-office-roadmap.md',
      },
      {
        id: 'learning-2',
        title: 'Apply build-vs-buy before custom implementation',
        recommendation: 'Run open-source and external-pattern scouting before approving strategic build work.',
        whyNow: 'The review gate and v0.5 plan require external pattern scouting for strategic proposals.',
        templatePath: 'docs/templates/ecosystem_landscape_scan_template.md',
      },
    ];

    if (/ui|schema|frontend|界面|页面|组件/u.test(brief)) {
      guidance.push({
        id: 'learning-3',
        title: 'Use schema-first UI thinking',
        recommendation: 'Define business blocks, state contracts, and interaction rules before screen-level implementation.',
        whyNow: 'The brief appears to affect operator surfaces or reusable UI capability.',
        templatePath: 'docs/templates/ui_schema_spec_template.md',
      });
    }

    return guidance;
  }

  private buildRequiredOutputs(brief: string): ProductChiefReport['requiredGovernedOutputs'] {
    const createOutput = (spec: {
      type: string;
      title: string;
      templatePath: string | null;
      priority: 'P0' | 'P1' | 'P2';
      reason: string;
      dependsOn?: string[];
      autoBackfillOnSkip?: boolean;
    }) => ({
      ...spec,
      dependsOn: spec.dependsOn ?? [],
      autoBackfillOnSkip: spec.autoBackfillOnSkip ?? false,
    });

    const outputs: ProductChiefReport['requiredGovernedOutputs'] = [
      createOutput({
        type: 'physical-world-profile',
        title: 'Physical-world profile update',
        templatePath: 'docs/templates/physical_world_profile_template.md',
        priority: 'P0',
        reason: 'Missing organizational context should be captured before committing scope.',
      }),
      createOutput({
        type: 'product-definition-baseline',
        title: 'Product definition baseline',
        templatePath: 'docs/templates/product_definition_baseline_template.md',
        priority: 'P0',
        reason: 'Any downstream design, schema, or implementation work must trace back to an explicit product definition baseline.',
      }),
      createOutput({
        type: 'requirement-baseline',
        title: 'Requirement baseline package',
        templatePath: 'docs/templates/requirement_baseline_template.md',
        priority: 'P0',
        reason: 'Requirement truth-sources must exist before design, schema, or implementation outputs are allowed to drift into execution.',
        dependsOn: ['product-definition-baseline'],
        autoBackfillOnSkip: true,
      }),
      createOutput({
        type: 'original-demand-review',
        title: 'Original user demand review',
        templatePath: 'docs/templates/original_user_demand_review_template.md',
        priority: 'P0',
        reason: 'Final solutions must be reviewed against the earliest imported user demand and in-process user feedback, not only the converged requirement list.',
        dependsOn: ['product-definition-baseline', 'requirement-baseline'],
        autoBackfillOnSkip: true,
      }),
      createOutput({
        type: 'plan-prd',
        title: 'Planning PRD',
        templatePath: 'docs/templates/plan_prd_template.md',
        priority: 'P0',
        reason: 'Large-scope product work should first converge into a planning PRD that defines target, scope, modules, and phased boundaries before functional-level decomposition starts.',
        dependsOn: ['product-definition-baseline', 'requirement-baseline', 'original-demand-review'],
        autoBackfillOnSkip: true,
      }),
      createOutput({
        type: 'ecosystem-scan',
        title: 'External pattern and open-source scouting',
        templatePath: 'docs/templates/ecosystem_landscape_scan_template.md',
        priority: 'P0',
        reason: 'Strategic proposals must check reusable external patterns before custom build work.',
      }),
      createOutput({
        type: 'strategic-radar',
        title: 'Strategic radar',
        templatePath: 'docs/templates/special_research_report_template.md',
        priority: 'P1',
        reason: 'Agent patterns, frameworks, and skill ecosystems should be watched before platform investment decisions.',
      }),
      createOutput({
        type: 'version-plan',
        title: 'Version planning document',
        templatePath: 'docs/templates/version_planning_template.md',
        priority: 'P1',
        reason: 'The work must map into version scope, acceptance, and rollout sequence.',
      }),
      createOutput({
        type: 'roadmap',
        title: 'Roadmap planning document',
        templatePath: 'docs/templates/roadmap_template.md',
        priority: 'P1',
        reason: 'Roadmap planning should be generated from active requirements and version traces.',
      }),
      createOutput({
        type: 'daily-intelligence-report',
        title: 'Daily intelligence report',
        templatePath: 'docs/templates/daily_intelligence_report_template.md',
        priority: 'P1',
        reason: 'Daily intelligence should summarize active requirement/version movement and new evidence gaps.',
      }),
      createOutput({
        type: 'weekly-product-brief',
        title: 'Weekly product brief',
        templatePath: 'docs/templates/weekly_product_brief_template.md',
        priority: 'P1',
        reason: 'Weekly briefs should roll up product progress, risks, and next decisions from governed context.',
      }),
      createOutput({
        type: 'learning-upgrade-memo',
        title: 'Learning and cognitive upgrade memo',
        templatePath: 'docs/templates/requirement_evaluation_feedback_template.md',
        priority: 'P1',
        reason: 'Recurring operator blind spots should be converted into explicit learning guidance.',
      }),
      createOutput({
        type: 'demo-script',
        title: 'Demo script',
        templatePath: 'docs/templates/demo_script_template.md',
        priority: 'P1',
        reason: 'Demo scripts should be generated from accepted capabilities, operator flows, and version state.',
      }),
      createOutput({
        type: 'user-manual',
        title: 'User manual',
        templatePath: 'docs/templates/user_manual_template.md',
        priority: 'P1',
        reason: 'User manuals should be generated from governed capability/version state rather than ad-hoc notes.',
      }),
      createOutput({
        type: 'external-capability-evaluation',
        title: 'External skill/plugin/framework evaluation',
        templatePath: 'docs/templates/subproject_capability_adoption_checklist.md',
        priority: 'P2',
        reason: 'External skills, plugins, and frameworks need governed adopt/adapt/watch/reject/build evaluation before adoption.',
      }),
    ];

    if (/ui|schema|frontend|console|feature|flow|interaction|prd|spec|界面|页面|组件|功能|交互|详细|原型|实现/u.test(brief)) {
      outputs.push(
        createOutput({
          type: 'functional-spec-pack',
          title: 'Functional spec pack',
          templatePath: 'docs/templates/functional_spec_pack_template.md',
          priority: 'P0',
          reason: 'PRD should not stop at planning level; downstream design and implementation need feature-level trigger, flow, state, field, exception, and acceptance specifications.',
          dependsOn: ['product-definition-baseline', 'requirement-baseline', 'original-demand-review', 'plan-prd'],
          autoBackfillOnSkip: true,
        }),
      );
      outputs.push(
        createOutput({
          type: 'ui-schema-spec',
          title: 'Schema-driven UI and business-block spec',
          templatePath: 'docs/templates/ui_schema_spec_template.md',
          priority: 'P0',
          reason: 'UI work should start from reusable business blocks and interaction contracts.',
          dependsOn: ['product-definition-baseline', 'requirement-baseline', 'original-demand-review', 'functional-spec-pack'],
          autoBackfillOnSkip: true,
        }),
      );
      outputs.push(
        createOutput({
          type: 'implementation-handoff',
          title: 'Implementation handoff package',
          templatePath: 'docs/templates/workflow_handoff_template.md',
          priority: 'P1',
          reason: 'Frontend or implementation work must receive a governed handoff package instead of depending on conversational design drift.',
          dependsOn: ['product-definition-baseline', 'requirement-baseline', 'original-demand-review', 'functional-spec-pack', 'ui-schema-spec'],
          autoBackfillOnSkip: true,
        }),
      );
    }

    if (/design|image2|mockup|wireframe|prototype|ui|frontend|screen|page|视觉|设计图|界面图|原型|出图|页面/u.test(brief)) {
      outputs.splice(
        3,
        0,
        createOutput({
          type: 'concept-design-pack',
          title: 'Concept design pack (image2)',
          templatePath: 'docs/templates/concept_design_pack_template.md',
          priority: 'P0',
          reason: 'Design should first run one exploratory image2 pass from planning-level truth so page structure, information hierarchy, and hidden product gaps become visible before delivery-grade design is attempted.',
          dependsOn: ['product-definition-baseline', 'requirement-baseline', 'original-demand-review', 'plan-prd'],
          autoBackfillOnSkip: true,
        }),
      );
      outputs.splice(
        4,
        0,
        createOutput({
          type: 'html-direction-pack',
          title: 'HTML direction pack (multi-style UI routes)',
          templatePath: 'docs/templates/concept_design_pack_template.md',
          priority: 'P0',
          reason: 'Before structured delivery, the team should compare multiple HTML-based UI directions as a separate decision layer instead of mixing them into concept image outputs.',
          dependsOn: ['product-definition-baseline', 'requirement-baseline', 'original-demand-review', 'plan-prd', 'functional-spec-pack'],
          autoBackfillOnSkip: true,
        }),
      );
      outputs.splice(
        5,
        0,
        createOutput({
          type: 'delivery-design-pack',
          title: 'Delivery design pack (Figma / JSON schema / page-structure DSL)',
          templatePath: 'docs/templates/delivery_design_pack_template.md',
          priority: 'P0',
          reason: 'Actual UI delivery should not depend on image2. Final delivery must be grounded in functional spec and ui-schema-spec, then bound to Figma or equivalent schema/DSL handoff assets.',
          dependsOn: ['product-definition-baseline', 'requirement-baseline', 'original-demand-review', 'plan-prd', 'functional-spec-pack', 'html-direction-pack', 'ui-schema-spec'],
          autoBackfillOnSkip: true,
        }),
      );
    }

    const needsUiDesign = /design|mockup|wireframe|prototype|ui|frontend|screen|page|html|界面|设计图|前端|页面|原型/u.test(brief);
    const needsImage2ConceptBoards = /image2|architecture|flow|board|panorama|explainer|report board|架构|流程|讲解|汇报|全景|页面结构/u.test(brief);
    if (needsUiDesign && !needsImage2ConceptBoards) {
      return outputs.filter((output) => output.type !== 'concept-design-pack');
    }

    return outputs;
  }

  private selectOutputSpecialists(report: ProductChiefReport, type: string) {
    const roleHints =
      type === 'ecosystem-scan' || type === 'strategic-radar'
        ? ['industry-research', 'competitive-analysis', 'strategy', 'review', 'product-management']
        : type === 'version-plan' || type === 'roadmap'
          ? ['requirements', 'versioning', 'roadmap-planning', 'strategy', 'product-management']
          : type === 'daily-intelligence-report' || type === 'weekly-product-brief'
            ? ['industry-research', 'competitive-analysis', 'stakeholder-analysis', 'documentation', 'product-management']
            : type === 'learning-upgrade-memo'
              ? ['retrospective', 'documentation', 'strategy', 'product-management']
              : type === 'product-definition-baseline' || type === 'requirement-baseline'
                ? ['requirements', 'documentation', 'strategy', 'product-management']
                : type === 'original-demand-review'
                  ? ['requirements', 'review', 'documentation', 'product-management']
                : type === 'concept-design-pack' || type === 'delivery-design-pack' || type === 'design-image2-prompt-pack' || type === 'html-direction-pack'
                  ? ['experience-design', 'delivery', 'workflow', 'documentation', 'product-management']
                  : type === 'functional-spec-pack'
                    ? ['requirements', 'workflow', 'documentation', 'delivery', 'product-management']
                  : type === 'implementation-handoff'
                    ? ['requirements', 'workflow', 'delivery', 'documentation', 'product-management']
                    : type === 'demo-script' || type === 'user-manual'
                      ? ['documentation', 'experience-design', 'workflow', 'delivery', 'product-management']
                      : type === 'external-capability-evaluation'
                        ? ['industry-research', 'strategy', 'review', 'delivery', 'product-management']
                        : type === 'ui-schema-spec'
                          ? ['experience-design', 'workflow', 'delivery', 'documentation', 'product-management']
                          : ['requirements', 'versioning', 'documentation', 'product-management'];

    return report.engagedSpecialists
      .filter((specialist) => roleHints.includes(specialist.role))
      .map((specialist) => specialist.agentId)
      .slice(0, 5);
  }

  private buildOutputMarkdown(
    report: ProductChiefReport,
    outputSpec: ProductChiefReport['requiredGovernedOutputs'][number],
    specialistAgentIds: string[],
    planningContext: ProductPlanningContext,
    autoBackfilledOutputs: ProductChiefOutput[],
  ) {
    const base = [
      `# ${outputSpec.title}`,
      '',
      `- reportId: ${report.id}`,
      `- type: ${outputSpec.type}`,
      `- priority: ${outputSpec.priority}`,
      `- generatedAt: ${new Date().toISOString()}`,
      `- templatePath: ${outputSpec.templatePath ?? '-'}`,
      `- dependsOn: ${outputSpec.dependsOn.join(', ') || '-'}`,
      `- autoBackfillOnSkip: ${String(outputSpec.autoBackfillOnSkip)}`,
      `- specialistAgentIds: ${specialistAgentIds.join(', ') || '-'}`,
      '',
      '## Brief',
      '',
      report.brief,
      '',
      '## Why This Output Is Required',
      '',
      outputSpec.reason,
      '',
      '## Missing Physical-World Questions',
      '',
      ...report.missingQuestions.map((question) => `- ${question.topic}: ${question.question}`),
      '',
      '## Learning Guidance',
      '',
      ...report.learningGuidance.map((guidance) => `- ${guidance.title}: ${guidance.recommendation}`),
      '',
      '## Recommended Skills',
      '',
      ...(report.recommendedSkills.length > 0
        ? report.recommendedSkills.map(
            (skill) =>
              `- ${skill.name} (${skill.skillId}): ${skill.deploymentStatus}; ${skill.reasons.join(', ') || 'matched by Product Chief brief'}`,
          )
        : ['- No skill recommendation matched this brief.']),
      '',
      '## Backfill Status',
      '',
      ...(autoBackfilledOutputs.length > 0
        ? autoBackfilledOutputs.map(
            (output) =>
              `- Auto-backfilled ${output.type} (${output.id}) because ${outputSpec.type} was requested before prerequisite truth-source artifacts were generated.`,
          )
        : ['- No prerequisite artifact had to be backfilled for this output.']),
      '',
    ];

    if (planningContext.hermesReports.length > 0) {
      base.push(
        '## Hermes Policy Signals',
        '',
        ...planningContext.hermesReports.slice(0, 5).map((report) => `- ${report.id} [${report.status}]: ${report.enhancements.length} enhancement(s)`),
        '',
      );
    }

    if (outputSpec.type === 'ecosystem-scan' || outputSpec.type === 'strategic-radar') {
      return [
        ...base,
        '## Ecosystem / Open-Source Scouting',
        '',
        '| Candidate | Classification | Reuse Boundary | Risk | Next Action |',
        '| --- | --- | --- | --- | --- |',
        '| To research | watch | Identify comparable open-source/project patterns before custom build | Unknown until researched | Run scouting task |',
        '',
        '## Classification Rules',
        '',
        '- `adopt`: can be reused directly with acceptable cost/risk.',
        '- `adapt`: useful pattern or component, but requires integration changes.',
        '- `watch`: relevant but not ready for adoption.',
        '- `reject`: incompatible with constraints.',
        '- `build`: custom work is justified after comparison.',
        '',
        '## Strategic Radar',
        '',
        '- Agent patterns: watch multi-agent review loops, memory compaction, and autonomous task governance.',
        '- Frameworks: compare LangGraph-style workflow control, MCP tool routing, and typed evaluation runners.',
        '- Skill ecosystems: track reusable skill/plugin distribution only when adoption can be evaluated and rolled back.',
        '- Investment rule: prefer adopt/adapt/watch before build unless PMAIOS traceability or offline constraints require custom work.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'ui-schema-spec') {
      return [
        ...base,
        '## Schema-Driven UI / Business Blocks',
        '',
        '### Domain Blocks',
        '',
        '- ProductChiefReportBlock',
        '- MissingQuestionListBlock',
        '- SpecialistEngagementBlock',
        '- GovernedOutputQueueBlock',
        '',
        '### State Contract',
        '',
        '```json',
        JSON.stringify(
          {
            reportId: report.id,
            missingQuestions: 'ProductChiefQuestion[]',
            engagedSpecialists: 'ProductChiefSpecialistEngagement[]',
            requiredGovernedOutputs: 'GovernedOutputSpec[]',
          },
          null,
          2,
        ),
        '```',
        '',
        '### Interaction Rules',
        '',
        '- User can generate governed outputs from required output specs.',
        '- Generated artifacts must link back to the Product Chief report.',
        '- Specialist engagement must remain auditable.',
        '- Production screens must render business content and interaction contracts, not stakeholder explanation copy unless explicitly required.',
        '',
        '### Page Content Policy',
        '',
        '- Declare each page as `production`, `promo`, `confirmation`, or `demo` before implementation.',
        '- `production` pages may contain labels, hints, empty states, and operational guidance only when they directly support the task flow.',
        '- Requirement explanation, pitch narrative, and scope commentary must stay in governed docs, not in production screen body copy.',
        '',
        '## Machine-Readable Contract Rule',
        '',
        '- This artifact must also emit a machine-readable UI schema JSON contract.',
        '- Frontend implementation should consume page contracts, block contracts, state contracts, and action contracts from the JSON layer instead of relying on screenshot interpretation alone.',
        '- If the visual design changes structure, states, or actions, regenerate and review the UI schema contract before implementation continues.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'product-definition-baseline') {
      return [
        ...base,
        '## Product Definition',
        '',
        '- One-sentence definition:',
        '- Target user / operator:',
        '- Core scenario:',
        '- Why this product should exist:',
        '',
        '## Problem Statement',
        '',
        '- Current user problem:',
        '- Existing workaround / status quo:',
        '- Why the status quo is insufficient:',
        '',
        '## Scope Boundary',
        '',
        '- In scope:',
        '- Out of scope:',
        '- Explicit non-goals:',
        '',
        '## Core Value',
        '',
        '- Primary value created:',
        '- Evidence or signals supporting this value:',
        '- What must stay true before downstream design or implementation begins:',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'requirement-baseline') {
      return [
        ...base,
        '## Requirement Truth-Source Rule',
        '',
        '- Design, prompt-pack, schema, and frontend work must link back to this governed requirement baseline.',
        '- Conversational debugging or image iteration is not a substitute for requirement truth-source documentation.',
        '',
        '## Requirement Inventory',
        '',
        '| Requirement | User Outcome | Acceptance Signal | Linked Artifact |',
        '| --- | --- | --- | --- |',
        '| To define | To define | To define | Product Chief report / requirement doc |',
        '',
        '## Alignment Rule',
        '',
        '- If design already exists, restate the requirement that the design is supposed to satisfy.',
        '- If frontend already exists, verify each implemented module against governed requirement wording instead of screen appearance alone.',
        '- If requirement and design conflict, requirement baseline must be updated or explicitly waived before implementation continues.',
        '',
        '## Open Gaps',
        '',
        '- Missing user facts:',
        '- Missing acceptance criteria:',
        '- Missing delivery constraints:',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'original-demand-review') {
      return [
        ...base,
        '## Review Rule',
        '',
        '- This review must compare the final solution against the earliest imported user demand and in-process user feedback.',
        '- The converged requirement list is evidence, but it is not the only evidence source.',
        '- Final delivery and release testing must still map back to user stories derived from the original demand.',
        '- If the final plan is coherent yet no longer solves the user\'s original real problem, mark the result as `partial` or `unsolved`.',
        '',
        '## Original Demand Sources',
        '',
        '- Earliest inbox source:',
        '- Earliest user wording or equivalent statement:',
        '- Important later user corrections:',
        '',
        '## Mapping Review',
        '',
        '| Original Demand / Feedback | Final Solution Element | Preserved / Weakened / Dropped / Reinterpreted | Notes |',
        '| --- | --- | --- | --- |',
        '| To review | To review | To review | To review |',
        '',
        '## User Story And Test Mapping',
        '',
        '| Original Demand / Feedback | User Story | Test Case / Acceptance Flow | Covered / Partial / Missing | Notes |',
        '| --- | --- | --- | --- | --- |',
        '| To review | To review | To review | To review | To review |',
        '',
        '## Loss Audit',
        '',
        '- Which original demands were fully preserved:',
        '- Which were only partially preserved:',
        '- Which were dropped during divergence or regrouping:',
        '- Which were turned into a different product mechanism:',
        '',
        '## Final Judgment',
        '',
        '- Does the final solution solve the user\'s earliest real problem:',
        '- Does it solve the latest user-corrected problem:',
        '- Do final test cases still point back to user stories derived from the original demand:',
        '- Is the solution only internally consistent at the product-requirement layer:',
        '- status: `solved / partial / unsolved`',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'plan-prd') {
      return [
        ...base,
        '## Planning PRD Rule',
        '',
        '- This artifact is a planning-layer PRD, not a delivery-ready functional specification.',
        '- It must define objective, scope, module map, boundary, release slicing, and open questions.',
        '- It must not pretend feature triggers, state transitions, field contracts, and exception paths are already complete if they are not.',
        '',
        '## Product Goal',
        '',
        '- Goal statement:',
        '- Target user / operator:',
        '- Why now:',
        '',
        '## Scope And Boundary',
        '',
        '- In scope:',
        '- Out of scope:',
        '- Deferred / later phase:',
        '',
        '## Capability / Module Breakdown',
        '',
        '| Module | User value | Why needed in this phase | Upstream dependency | Downstream dependency |',
        '| --- | --- | --- | --- | --- |',
        '| To define | To define | To define | To define | To define |',
        '',
        '## Page / Surface Inventory',
        '',
        '- Core surfaces:',
        '- Secondary surfaces:',
        '- Non-goals for this version:',
        '',
        '## Open Questions Before Functional Spec',
        '',
        '- Which modules still lack feature-level definition:',
        '- Which operator flows still need decomposition:',
        '- Which risks block delivery-grade PRD or design output:',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'functional-spec-pack') {
      return [
        ...base,
        '## Functional Spec Rule',
        '',
        '- This artifact must go beyond planning PRD and decompose work into feature-level implementation-facing specifications.',
        '- If trigger, flow, state, fields, exception, and acceptance cannot be stated, this output is not complete.',
        '- Functional spec is the minimum upstream truth required before delivery design and implementation handoff are allowed.',
        '',
        '## Feature Spec Matrix',
        '',
        '| Feature | User scenario | Trigger | Main output | Primary owner | Priority |',
        '| --- | --- | --- | --- | --- | --- |',
        '| To define | To define | To define | To define | To define | P0 |',
        '',
        '## Functional Units',
        '',
        '### Unit 1',
        '',
        '- feature name:',
        '- user scenario:',
        '- trigger / entry:',
        '- preconditions:',
        '- main flow:',
        '- branch flow:',
        '- exception handling:',
        '- state transition:',
        '- key fields / entities:',
        '- permissions / role difference:',
        '- events / logs / metrics:',
        '- acceptance cases:',
        '- out-of-scope notes:',
        '',
        '## Specificity Gate',
        '',
        '- Can frontend/backend tasks be split directly from this spec:',
        '- Can API/field/state draft be derived from this spec:',
        '- Can test cases be written from this spec:',
        '- If any answer is no, list the missing specificity explicitly:',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'concept-design-pack' || outputSpec.type === 'design-image2-prompt-pack') {
      return [
        ...base,
        '## Concept Design Rule',
        '',
        '- This design pack is an exploratory image2 package for concept boards only, not the default stage for actual UI screen design.',
        '- Every page must have its own image2 prompt entry.',
        '- A single global prompt is not sufficient when multiple pages are involved.',
        '- Do not place multiple UI directions into one compressed image by default.',
        '- Unless the requirement explicitly asks for side-by-side comparison, generate multiple separate images instead.',
        '- If design language, style direction, and information density are not explicitly locked, default to multiple variants for real product selection.',
        '- If an interaction state would compress the standard page width or flatten hierarchy, separate it from the default page instead of merging both into one ambiguous surface.',
        '- image2 is allowed for product architecture boards, user/agent flows, concept UI, report boards, page structure views, and panorama overviews.',
        '- This pass may surface open questions and structural uncertainty; do not hide them by over-polishing the concept images.',
        '- Prefer modern review-board composition over editorial posters or newspaper-like explainer sheets.',
        '- Use annotations sparingly; the board should explain design logic without turning into a text-heavy board.',
        '',
        '## Required Page Inventory',
        '',
        '1. List every page that needs design output.',
        '2. For each page, define its user goal, primary scenario, and key modules.',
        '3. Mark which pages are core pages, secondary pages, and optional exploration pages.',
        '',
        '## Page-by-Page Prompt Pack',
        '',
        '### Page 1',
        '',
        '- page name:',
        '- page goal:',
        '- target user / scenario:',
        '- page mode:',
        '- on-page explanatory copy policy:',
        '- information hierarchy:',
        '- key sections:',
        '- primary actions:',
        '- visual direction:',
        '- layout constraints:',
        '- required components:',
        '- prohibited traits:',
        '- production content rule:',
        '- fixed design language:',
        '- fixed style direction:',
        '- fixed information density:',
        '- explicit combined compare board:',
        '- interaction-state separation rule:',
        '- explainer overlay strategy:',
        '- callout focus points:',
        '- side example requirement:',
        '- summary strip content:',
        '- image2 main prompt:',
        '- optional negative prompt:',
        '',
        '### Page 2',
        '',
        '- page name:',
        '- page goal:',
        '- target user / scenario:',
        '- page mode:',
        '- on-page explanatory copy policy:',
        '- information hierarchy:',
        '- key sections:',
        '- primary actions:',
        '- visual direction:',
        '- layout constraints:',
        '- required components:',
        '- prohibited traits:',
        '- production content rule:',
        '- fixed design language:',
        '- fixed style direction:',
        '- fixed information density:',
        '- explicit combined compare board:',
        '- interaction-state separation rule:',
        '- explainer overlay strategy:',
        '- callout focus points:',
        '- side example requirement:',
        '- summary strip content:',
        '- image2 main prompt:',
        '- optional negative prompt:',
        '',
        '## Generation Order',
        '',
        '- Generate design images only after the prompt pack is reviewed.',
        '- Start from the highest-priority page and then expand page by page.',
        '- If one page changes structure materially, update that page prompt before regenerating images.',
        '',
        '## Concept Explainability Gate',
        '',
        '- Page hierarchy is visible without reading large text paragraphs.',
        '- The board reveals product gaps instead of hiding them with style polish.',
        '- Annotations stay secondary to the interface itself.',
        '- This artifact must not be treated as the final UI delivery source.',
        '',
        '## Review Checklist',
        '',
        '- Each page declares whether it is `production`, `promo`, `confirmation`, or `demo`.',
        '- `production` pages do not carry explanatory, pitch-style, or requirement-confirmation body copy unless explicitly required.',
        '- Each page prompt maps to one clear page, not a mixed flow.',
        '- Default generation should create separate image files for separate design variants unless explicit comparison composition is requested.',
        '- Default variant set should cover different design language, style direction, and low/medium/high information density when no fixed constraint is given.',
        '- Default page view should remain readable at standard width; clicked states, drawers, and detail panels should be separated or clearly detached instead of visually crushing the base page.',
        '- Visual instructions reflect product structure, not only style adjectives.',
        '- Default style must avoid newspaper, magazine, and retro editorial composition.',
        '- Output order remains: page inventory -> prompt pack -> design images.',
        '- Concept boards should visibly explain the design judgment only when that helps alignment; do not fill the board with explanation by default.',
        '- If responsive shape or context-side comparison matters, include it explicitly instead of assuming it from the main page alone.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'html-direction-pack') {
      return [
        ...base,
        '## HTML Direction Rule',
        '',
        '- This is the default stage for actual UI design, built as multiple HTML routes rather than screen images.',
        '- Use it to compare visual hierarchy, layout language, operator emphasis, and component structure before final delivery binding.',
        '- Every direction must feel structurally implementable in Next.js App Router + Tailwind CSS + shadcn/ui + Radix Primitives + repo-owned design tokens.',
        '- Keep SVG-like clarity: strong boundaries, crisp hierarchy, flat vector-like surfaces, low texture, no newspaper/editorial poster composition.',
        '',
        '## Required Direction Comparison',
        '',
        '- Compare at least three style directions.',
        '- Mark one recommended default direction and explain why it is the best route.',
        '- Each direction should expose page hierarchy, component blocks, and primary actions clearly.',
        '',
        '## HTML Direction Gate',
        '',
        '- Delivery cannot skip this package when actual UI direction is still undecided.',
        '- The result must be real HTML assets, not screenshots wrapped in markdown.',
        '- This package should not pretend to be final Figma / schema / DSL delivery.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'delivery-design-pack') {
      return [
        ...base,
        '## Delivery Design Rule',
        '',
        '- This is a structured UI delivery package, not an image2 package.',
        '- Final UI delivery should bind functional spec to ui-schema-spec, html-direction-pack, figma frames, jsonschema, and page-structure DSL.',
        '- image2 may inform concept direction, but must not be used as the final UI source of truth.',
        '',
        '## Required Delivery Binding',
        '',
        '- figma file / page / frame references:',
        '- jsonschema refs:',
        '- page-structure DSL refs:',
        '- mapped functional-spec units:',
        '- mapped ui-schema blocks:',
        '- required states:',
        '- component mapping notes:',
        '- implementation-ready action contracts:',
        '',
        '## Delivery Specificity Gate',
        '',
        '- Each page must map back to one or more functional-spec units.',
        '- Each page must map back to ui-schema blocks or DSL entities.',
        '- Required states should include normal / empty / exception / permission-difference when applicable.',
        '- Any implied action must have a named trigger and expected result in functional spec.',
        '- Delivery cannot depend on image2-only interpretation.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'implementation-handoff') {
      return [
        ...base,
        '## Handoff Rule',
        '',
        '- Implementation must consume governed requirement, product-definition, and UI-schema artifacts instead of relying on chat memory or image interpretation only.',
        '- If any prerequisite artifact is missing, it must be backfilled before coding continues.',
        '',
        '## Required Inputs',
        '',
        '- Product definition baseline',
        '- Requirement baseline package',
        '- UI schema / business-block spec',
        '- Approved design or prompt-pack artifacts when visual fidelity matters',
        '',
        '## Frontend Alignment Checklist',
        '',
        '- Each page is tagged as `production`, `promo`, `confirmation`, or `demo` before implementation starts.',
        '- `production` pages must not absorb explanatory or stakeholder-facing narrative content just because it helped during design review.',
        '- Every screen/module maps to a named requirement.',
        '- Final delivery test cases must map back to user stories derived from the original demand, not only the converged requirement list.',
        '- Every visual block maps to a governed domain block or interaction contract.',
        '- Any deviation from design is recorded as a product decision, not a silent implementation choice.',
        '- Missing constraints are escalated back into requirements before continuing implementation.',
        '',
        '## Production Page Content Policy',
        '',
        '- Keep page body content limited to business information, task guidance, labels, feedback states, and controls needed for real operation.',
        '- Put requirement explanation, product positioning, review commentary, and stakeholder persuasion copy into docs, demos, or onboarding assets instead of production UI.',
        '- If a page is actually a promo page or confirmation page, mark it explicitly rather than silently mixing those goals into production screens.',
        '',
        '## Delivery Contract',
        '',
        '- Engineering receives artifact links, not only narrative instructions.',
        '- Acceptance criteria must be testable against governed documents.',
        '- Test cases and acceptance flows must retain traceability to original-demand-derived user stories.',
        '- Output must record unresolved gaps, waivers, and follow-up product decisions.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'version-plan' || outputSpec.type === 'roadmap') {
      const activeRequirements = planningContext.requirements.slice(0, 12);
      const recentVersions = planningContext.versionEntries.slice(0, 12);
      return [
        ...base,
        '## Requirement Inputs',
        '',
        ...(activeRequirements.length > 0
          ? activeRequirements.map(
              (requirement) =>
                `- ${requirement.id} [${requirement.priority}/${requirement.status}/${requirement.category}]: ${requirement.title}`,
            )
          : ['- No governed requirements found yet. Generate or ingest requirements before approval.']),
        '',
        '## Version Trace Inputs',
        '',
        ...(recentVersions.length > 0
          ? recentVersions.map(
              (entry) =>
                `- ${entry.id} [${entry.entityType}/${entry.changeType}]: ${entry.summary}`,
            )
          : ['- No version entries found yet. Create version records before release approval.']),
        '',
        '## Proposed Roadmap / Release Sequence',
        '',
        '- P0: close missing physical-world questions, trace gaps, and blocked review evidence.',
        '- P1: generate governed roadmap/version/daily/weekly outputs from active requirements and version records.',
        '- P2: run production smoke, CI artifact checks, and external capability evaluations.',
        '',
        '## Acceptance Gates',
        '',
        '- Every roadmap item must link to a requirement or explicitly record why it is exploratory.',
        '- Every release candidate must have version entries, review evidence, and rollback metadata.',
        '- Generated outputs must list specialist task artifacts before implementation work starts.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'daily-intelligence-report' || outputSpec.type === 'weekly-product-brief') {
      const activeRequirements = planningContext.requirements.slice(0, 8);
      const recentVersions = planningContext.versionEntries.slice(0, 8);
      return [
        ...base,
        '## Executive Signal',
        '',
        `- Active governed requirements observed: ${planningContext.requirements.length}`,
        `- Recent version entries observed: ${planningContext.versionEntries.length}`,
        `- Missing physical-world questions still open: ${report.missingQuestions.length}`,
        '',
        '## Movement Since Last Review',
        '',
        ...(recentVersions.length > 0
          ? recentVersions.map((entry) => `- ${entry.createdAt}: ${entry.entityType}/${entry.changeType} - ${entry.summary}`)
          : ['- No version movement recorded yet.']),
        '',
        '## Requirement Watchlist',
        '',
        ...(activeRequirements.length > 0
          ? activeRequirements.map((requirement) => `- ${requirement.id} [${requirement.priority}/${requirement.status}]: ${requirement.title}`)
          : ['- No active requirement records available.']),
        '',
        '## Decisions Needed',
        '',
        ...report.missingQuestions.map((question) => `- ${question.topic}: ${question.question}`),
        '',
        '## Next Product-Chief Actions',
        '',
        '- Convert unresolved signals into requirement updates or explicit waivers.',
        '- Generate roadmap/version output if scope or release sequence changed.',
        '- Require ecosystem or UI-schema output before approving strategic build work.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'learning-upgrade-memo') {
      return [
        ...base,
        '## Cognitive Upgrade Focus',
        '',
        ...report.learningGuidance.map((guidance) => `- ${guidance.title}: ${guidance.recommendation}`),
        '',
        '## Recurring Blind Spot Controls',
        '',
        '- Do not start implementation before missing physical-world questions are answered or explicitly waived.',
        '- Do not approve custom build work before ecosystem/open-source scouting is recorded.',
        '- Do not treat chat memory as the backlog; update version plan and execution log after material work.',
        '- Do not publish capabilities from frontend booleans; require real evaluation and review evidence.',
        '',
        '## Practice Change',
        '',
        '- Convert every repeated correction into a repo-tracked rule, requirement, version entry, or Product Chief output.',
        '- Surface environment/tooling blockers early when they require product-owner awareness or local machine action.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'demo-script' || outputSpec.type === 'user-manual') {
      const recentVersions = planningContext.versionEntries.slice(0, 10);
      return [
        ...base,
        '## Audience And Scenario',
        '',
        '- Primary audience: PMAIOS operator or stakeholder reviewing governed product work.',
        '- Scenario: explain the current capability/workflow state using requirement and version evidence.',
        '',
        '## Capability / Version Evidence',
        '',
        ...(recentVersions.length > 0
          ? recentVersions.map((entry) => `- ${entry.entityType}/${entry.changeType}: ${entry.summary}`)
          : ['- No version evidence available yet. Create capability/version records before external demo.']),
        '',
        '## Walkthrough Flow',
        '',
        '- Start from the active requirement or Product Chief report.',
        '- Show generated governed outputs and linked specialist task artifacts.',
        '- Show version trace, approval state, and rollback/readiness metadata.',
        '- Close with unresolved questions, next actions, and operator decision points.',
        '',
        '## User-Facing Instructions',
        '',
        '- Use the Product Chief panel to analyze a brief and generate governed outputs.',
        '- Use Requirement + Version Desk to verify traceability before release decisions.',
        '- Use Capability Ops only after evaluation and linked review evidence pass.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'external-capability-evaluation') {
      return [
        ...base,
        '## Evaluation Scope',
        '',
        '- Target: external skill, plugin, MCP server, framework, or hosted tool.',
        '- Decision classes: adopt / adapt / watch / reject / build.',
        '- Required evidence: source, license, maintenance signal, security posture, integration boundary, rollback path.',
        '',
        '## Adoption Rubric',
        '',
        '| Criterion | Evidence Required | Decision Impact |',
        '| --- | --- | --- |',
        '| Fit | Maps to a current requirement or Product Chief output | Reject if no governed demand exists |',
        '| Traceability | Can produce auditable artifacts or logs | Reject/adapt if opaque |',
        '| Reversibility | Can be disabled without corrupting PMAIOS state | Reject if no rollback path |',
        '| Cost / lock-in | Runtime and vendor dependency are explicit | Watch/adapt when uncertain |',
        '| Security | Secrets, filesystem, and network scope are bounded | Reject if unsafe |',
        '',
        '## Required Version Action',
        '',
        '- Create a capability/version record before production use.',
        '- Link evaluation artifact to the requirement trace.',
        '- Re-run review gate before publishing any wrapper capability.',
        '',
      ].join('\n');
    }

    return [
      ...base,
      '## Output Draft',
      '',
      '- This governed output was generated from Product Chief analysis and is ready for specialist review.',
      '',
    ].join('\n');
  }

  private buildSpecialistTaskSummary(role: ProductChiefSpecialistTask['role'], outputType: string) {
    if (role === 'industry-research' || role === 'competitive-analysis' || role === 'strategy') {
      return `Reviewed ${outputType} for external pattern, adoption boundary, and strategic fit.`;
    }
    if (role === 'experience-design' || role === 'workflow' || role === 'delivery') {
      return `Reviewed ${outputType} for operator workflow, UI contract, and delivery risk.`;
    }
    if (role === 'requirements' || role === 'versioning') {
      return `Reviewed ${outputType} for requirement traceability, version scope, and acceptance criteria.`;
    }
    return `Reviewed ${outputType} from the ${role} specialist perspective.`;
  }

  private buildSpecificityStopCondition(outputType: string, outputContent: string) {
    const headingSets: Record<string, string[]> = {
      'plan-prd': ['## Planning PRD Rule', '## Capability / Module Breakdown'],
      'functional-spec-pack': ['## Functional Units', '- trigger / entry:', '- state transition:', '- key fields / entities:', '- acceptance cases:'],
      'concept-design-pack': ['## Concept Design Rule', '## Required Page Inventory'],
      'delivery-design-pack': ['## Delivery Design Rule', '## Delivery Specificity Gate', '- Each page must map back to one or more functional-spec units.'],
    };
    const requiredHeadings = headingSets[outputType];
    if (!requiredHeadings) {
      return {
        condition: 'Output-specific specificity gate',
        satisfied: true,
        detail: 'No extra specificity gate was defined for this output type.',
      };
    }

    const missing = requiredHeadings.filter((heading) => !outputContent.includes(heading));
    return {
      condition: 'Output-specific specificity gate',
      satisfied: missing.length === 0,
      detail: missing.length === 0
        ? `Specificity structure is present for ${outputType}.`
        : `Missing specificity markers for ${outputType}: ${missing.join('; ')}`,
    };
  }

  private buildSpecialistTaskArtifact(report: ProductChiefReport, task: ProductChiefSpecialistTask, selectionReason: string) {
    return [
      `# Specialist Product Agent Task`,
      '',
      `- taskId: ${task.id}`,
      `- reportId: ${task.reportId}`,
      `- outputId: ${task.outputId}`,
      `- agentId: ${task.agentId}`,
      `- agentName: ${task.agentName}`,
      `- role: ${task.role}`,
      `- status: ${task.status}`,
      `- completedAt: ${task.completedAt}`,
      '',
      '## Assignment',
      '',
      `Generate specialist review input for Product Chief output "${task.outputTitle}" (${task.outputType}).`,
      '',
      '## Specialist Selection Reason',
      '',
      selectionReason,
      '',
      '## Independent Specialist Output',
      '',
      `- ${task.summary}`,
      '- Validate missing physical-world questions before approving scope.',
      '- Keep generated output linked to requirement, version, and artifact trace records.',
      '- Escalate any open-source, UI-schema, or rollout gaps before implementation starts.',
      '',
      '## Input Brief',
      '',
      report.brief,
      '',
      '## Requirement Links',
      '',
      ...task.requirementIds.map((requirementId) => `- ${requirementId}`),
      '',
    ].join('\n');
  }

  private buildMultiAgentReviewArtifact(
    report: ProductChiefReport,
    review: ProductChiefMultiAgentReview,
    outputArtifactPath: string,
  ) {
    return [
      '# Multi-Agent Review Loop',
      '',
      `- reviewId: ${review.id}`,
      `- reportId: ${review.reportId}`,
      `- outputId: ${review.outputId}`,
      `- status: ${review.status}`,
      `- mode: ${review.mode}`,
      `- completedAt: ${review.completedAt}`,
      `- projectPmUsable: ${review.status !== 'blocked'}`,
      '',
      '## Project Product Output',
      '',
      `- outputArtifactPath: ${outputArtifactPath}`,
      `- requirementIds: ${review.requirementIds.join(', ') || '-'}`,
      '',
      '## Participants',
      '',
      ...(review.turns.length > 0
        ? review.turns.map((turn) => `- ${turn.agentName} (${turn.role}) -> ${turn.position}: ${turn.summary}`)
        : ['- No specialist product agents participated.']),
      '',
      '## Conflicts',
      '',
      ...(review.conflicts.length > 0
        ? review.conflicts.map((conflict) => `- ${conflict.topic} [${conflict.status}]: ${conflict.resolution}`)
        : ['- No unresolved conflict recorded.']),
      '',
      '## Stop Conditions',
      '',
      ...review.stopConditions.map((condition) => `- ${condition.satisfied ? 'PASS' : 'BLOCK'} ${condition.condition}: ${condition.detail}`),
      '',
      '## Final Decision',
      '',
      review.consensus,
      '',
      '## Source Brief',
      '',
      report.brief,
      '',
    ].join('\n');
  }

  private async buildPlanningContext(subprojectId?: string | null): Promise<ProductPlanningContext> {
    const [requirements, versionEntries, hermesReports] = await Promise.all([
      this.memoryService.listRequirements(subprojectId),
      this.memoryService.listVersionEntries(subprojectId),
      new HermesPolicyService(this.store, this.memoryService).listReports(subprojectId),
    ]);
    return { requirements, versionEntries, hermesReports };
  }

  private assertProjectScopedImageGeneration(subprojectId: string | null | undefined, outputType: string) {
    if (!this.isImage2DesignOutput(outputType)) {
      return;
    }
    if (subprojectId) {
      return;
    }
    throw new Error(
      'image2 design generation requires an explicit subprojectId. Please select a target subproject first so generated images are written into that project directory instead of the platform root.',
    );
  }
}
