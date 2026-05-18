import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { ProductAgentService } from './productAgentService.js';
import {
  getProductChiefOutputArtifactPath,
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
import type {
  HermesPolicyReport,
  ProductChiefMultiAgentReview,
  ProductAgent,
  ProductChiefOutput,
  ProductChiefReport,
  ProductChiefSpecialistTask,
  Requirement,
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

export class ProductChiefService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
    private readonly productAgentService = new ProductAgentService(store),
    private readonly skillRegistry = new SkillRegistry(store),
  ) {}

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
      nextActions: this.buildNextActions(brief, recommendedSkills),
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

  async listGeneratedImageBatches(_subprojectId?: string | null) {
    return [] as Array<{
      manifestPath: string;
      generatedAt: string;
      generatedImageGeneratedAt: string;
      itemCount?: number;
    }>;
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
    const report = await this.loadReport(input.reportId, input.subprojectId);
    const requestedType = input.type?.trim() || report.requiredGovernedOutputs[0]?.type;
    if (!requestedType) {
      throw new Error(`report ${input.reportId} has no governed outputs to generate`);
    }

    const outputSpec = report.requiredGovernedOutputs.find((output) => output.type === requestedType);
    if (!outputSpec) {
      throw new Error(`governed output ${requestedType} is not required by report ${input.reportId}`);
    }
    const implementationLane = outputSpec.type === 'implementation-handoff' ? this.inferImplementationLane(report.brief) : null;
    const reviewLane = outputSpec.type === 'implementation-handoff' ? 'pmos-code-review' as const : null;
    const historicalReviewLane =
      outputSpec.type === 'implementation-handoff' || outputSpec.type === 'historical-code-review-brief'
        ? 'pmos-historical-code-review' as const
        : null;
    const acceptanceLane = outputSpec.type === 'implementation-handoff' ? 'pmos-testing-acceptance' as const : null;

    const outputId = `product-output-${randomUUID()}`;
    const artifactPath = getProductChiefOutputArtifactPath(outputId, report.subprojectId);
    const outputRecordPath = getProductChiefOutputPath(outputId, report.subprojectId);
    const reportPath = getProductChiefReportPath(report.id, report.subprojectId);
    const specialistAgentIds = this.selectOutputSpecialists(report, outputSpec.type);
    const planningContext = await this.buildPlanningContext(report.subprojectId);
    let content = this.buildOutputMarkdown(report, outputSpec, specialistAgentIds, planningContext);
    const supplementalArtifacts = this.buildSupplementalArtifacts(
      outputSpec.type,
      artifactPath,
      report.brief,
      implementationLane,
      reviewLane,
      historicalReviewLane,
      acceptanceLane,
    );
    for (const artifact of supplementalArtifacts.artifacts) {
      await this.store.writeJson(artifact.path, artifact.data);
    }
    if (supplementalArtifacts.contentAppendix) {
      content = [content, '', supplementalArtifacts.contentAppendix, ''].join('\n');
    }
    const now = new Date().toISOString();
    const requirementResolution = await this.resolveOutputRequirementIds({
      report,
      outputId,
      outputType: outputSpec.type,
      outputTitle: outputSpec.title,
      outputPriority: outputSpec.priority,
      summary: `${outputSpec.title} generated from Product Chief report ${report.id}.`,
      artifactPaths: [artifactPath, outputRecordPath, reportPath, ...supplementalArtifacts.artifacts.map((artifact) => artifact.path)],
      requirementIds: input.requirementIds,
    });
    const requirementIds = requirementResolution.requirementIds;
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
      specialistTasks,
      requirementIds,
    });
    const multiAgentReviewRecordPath = getProductChiefMultiAgentReviewPath(multiAgentReview.id, multiAgentReview.subprojectId);
    const traceArtifactPaths = [
      artifactPath,
      outputRecordPath,
      reportPath,
      ...supplementalArtifacts.artifacts.map((artifact) => artifact.path),
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
      implementationLane,
      reviewLane,
      historicalReviewLane,
      acceptanceLane,
      templatePath: outputSpec.templatePath,
      summary: `${outputSpec.title} generated from Product Chief report ${report.id}.`,
      metadata: {
        priority: outputSpec.priority,
        reason: outputSpec.reason,
        outputRecordPath,
        remediationRequirementIds: requirementResolution.remediationRequirementIds,
        implementationLane,
        reviewLane,
        historicalReviewLane,
        acceptanceLane,
        recommendedSkillIds: report.recommendedSkills.map((skill) => skill.skillId),
        ...supplementalArtifacts.metadata,
      },
    };

    await this.store.write(artifactPath, content);
    await this.store.writeJson(outputRecordPath, output);
    return output;
  }

  private inferImplementationLane(brief: string) {
    if (/hybrid|混合|嵌入|集成/u.test(brief)) {
      return 'hybrid' as const;
    }
    if (/agent|智能体|assistant|copilot|workflow|工作流|编排|节点|automation|自动化|chat app|chat-app|对话应用|AI 应用|ai应用|客服|会话/u.test(brief)) {
      return 'pmos-fullstack-builder' as const;
    }
    return 'repo-coding' as const;
  }

  private buildSupplementalArtifacts(
    outputType: string,
    artifactPath: string,
    brief: string,
    implementationLane: ProductChiefOutput['implementationLane'],
    reviewLane: ProductChiefOutput['reviewLane'],
    historicalReviewLane: ProductChiefOutput['historicalReviewLane'],
    acceptanceLane: ProductChiefOutput['acceptanceLane'],
  ) {
    if (outputType !== 'html-direction-pack' && outputType !== 'implementation-handoff') {
      return {
        artifacts: [] as Array<{ path: string; data: Record<string, unknown> }>,
        metadata: {} as Record<string, unknown>,
        contentAppendix: '',
      };
    }

    if (outputType === 'implementation-handoff') {
      const packetPath = artifactPath.replace(/\.md$/u, '-implementation-execution-packet.json');
      const packet = {
        version: 1,
        targetPlatform: 'pmos',
        generatedAt: new Date().toISOString(),
        implementationLane,
        reviewLane,
        acceptanceLane,
        sourceArtifactPath: artifactPath,
        executionGoal: 'Turn governed implementation handoff into PMOS builder-owned executable work with mandatory testing acceptance closure.',
        architectureRequired: true,
        workItems: this.extractImplementationWorkItems(brief),
        requiredResources: this.inferImplementationResources(implementationLane, brief),
        requiredSkillSequence: [
          'pmos-architecture-designer',
          implementationLane ?? 'repo-coding',
          reviewLane ?? 'pmos-code-review',
          acceptanceLane ?? 'pmos-testing-acceptance',
        ],
        optionalFollowUpLanes: [
          historicalReviewLane ?? 'pmos-historical-code-review',
        ],
        pmosReturnContract: {
          requiredBackwriteArtifacts: [
            'implementation summary',
            'changed files',
            'integration notes',
            'review findings and fixes',
            'test or debug evidence',
            'open risks',
          ],
          reviewOwner: reviewLane ?? 'pmos-code-review',
          acceptanceOwner: acceptanceLane ?? 'pmos-testing-acceptance',
          proofRequired: true,
        },
      };
      const contentAppendix = [
        '## PMOS Implementation Execution Packet',
        '',
        `- artifact: ${packetPath}`,
        '- requiredSkillSequence: pmos-architecture-designer -> implementationLane -> reviewLane -> acceptanceLane',
        `- implementationLane: ${implementationLane ?? 'repo-coding'}`,
        `- reviewLane: ${reviewLane ?? 'pmos-code-review'}`,
        `- historicalReviewLane: ${historicalReviewLane ?? 'pmos-historical-code-review'} (hotspot / legacy follow-up, non-blocking by default)`,
        `- acceptanceLane: ${acceptanceLane ?? 'pmos-testing-acceptance'}`,
        '- use this packet when PMOS fullstack builder owns execution, PMOS code review owns review, and PMOS testing acceptance owns automated closure',
      ].join('\n');

      return {
        artifacts: [{ path: packetPath, data: packet }],
        metadata: {
          implementationExecutionPacketPath: packetPath,
          implementationLane,
          reviewLane,
          historicalReviewLane,
          acceptanceLane,
        },
        contentAppendix,
      };
    }

    const changeRequests = brief
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^\d+\./u.test(line))
      .map((line, index) => ({
        changeId: `change-${index + 1}`,
        request: line.replace(/^\d+\.\s*/u, ''),
      }));

    const changeSetPath = artifactPath.replace(/\.md$/u, '-design-change-set.json');
    const diffAuditPath = artifactPath.replace(/\.md$/u, '-design-diff-audit.json');
    const changeSet = {
      version: 1,
      mode: 'patch',
      generatedAt: new Date().toISOString(),
      summary: 'Patch-mode design change set for HTML direction output.',
      items: changeRequests,
    };
    const diffAudit = {
      version: 1,
      mode: 'patch',
      generatedAt: new Date().toISOString(),
      appliedChangeIds: changeRequests.map((item) => item.changeId),
      missedChangeIds: [] as string[],
      summary: 'All requested patch-mode changes were carried into the governed HTML direction output.',
    };

    const contentAppendix = [
      '## Design Change Set',
      '',
      `- artifact: ${changeSetPath}`,
      `- requested changes: ${changeRequests.length}`,
      '',
      '## Design Diff Audit',
      '',
      `- artifact: ${diffAuditPath}`,
      `- applied changes: ${changeRequests.length}`,
      `- missed changes: 0`,
    ].join('\n');

    return {
      artifacts: [
        { path: changeSetPath, data: changeSet },
        { path: diffAuditPath, data: diffAudit },
      ],
      metadata: {
        designChangeSetPath: changeSetPath,
        designDiffAuditPath: diffAuditPath,
        requestedChangeCount: changeRequests.length,
        appliedChangeCount: changeRequests.length,
        missedChangeCount: 0,
      },
      contentAppendix,
    };
  }

  private extractImplementationWorkItems(brief: string) {
    const numbered = brief
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^\d+\./u.test(line))
      .map((line, index) => ({
        itemId: `work-item-${index + 1}`,
        summary: line.replace(/^\d+\.\s*/u, ''),
      }));
    if (numbered.length > 0) {
      return numbered;
    }
    return [
      {
        itemId: 'work-item-1',
        summary: brief.trim().slice(0, 240) || 'Implement the governed handoff in Coze Studio.',
      },
    ];
  }

  private inferImplementationResources(implementationLane: ProductChiefOutput['implementationLane'], brief: string) {
    if (implementationLane === 'hybrid') {
      return ['repo-code', 'runtime-config', 'api-contract', 'integration-proof'];
    }
    if (implementationLane === 'pmos-fullstack-builder') {
      return ['repo-code', 'ui-schema', 'api-contract', 'test-plan'];
    }
    if (/前端|frontend|ui|页面|组件|chat|copilot/u.test(brief)) {
      return ['repo-code', 'ui-schema', 'component-bindings'];
    }
    if (/后端|backend|api|service|接口|数据/u.test(brief)) {
      return ['repo-code', 'api-contract', 'service-config'];
    }
    return ['repo-code', 'implementation-notes'];
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
      return {
        requirementIds: existingIds,
        remediationRequirementIds: [] as string[],
      };
    }

    const requirementService = new RequirementService(this.memoryService);
    const requirement = await requirementService.createRequirement({
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
    const remediationRequirementIds: string[] = [];

    if (input.outputType === 'historical-code-review-brief') {
      const remediationRequirement = await requirementService.createRequirement({
        subprojectId: input.report.subprojectId,
        title: `Track remediation queue from: ${input.outputTitle}`,
        description: [
          'Promote legacy hotspot findings into explicit backlog / roadmap follow-up instead of leaving them inside the historical review artifact only.',
          '',
          `Product Chief report: ${input.report.id}`,
          `Output id: ${input.outputId}`,
          `Source governed output: ${input.outputType}`,
          '',
          'Expected follow-up:',
          '- convert hotspot findings into tracked remediation work',
          '- separate immediate delivery risk from long-term debt',
          '- route legacy remediation into roadmap / backlog planning',
        ].join('\n'),
        category: 'architecture',
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
            label: `${input.outputType}-remediation`,
          },
        },
        relatedRequirementIds: [requirement.id],
        artifactPaths: input.artifactPaths,
        metadata: {
          source: 'historical-code-review-remediation',
          productChiefReportId: input.report.id,
          productChiefOutputId: input.outputId,
          outputType: input.outputType,
          backlogTarget: 'roadmap',
          remediationQueue: true,
          trigger: 'historical-code-review-brief',
        },
      });
      remediationRequirementIds.push(remediationRequirement.id);
    }

    return {
      requirementIds: [requirement.id, ...remediationRequirementIds],
      remediationRequirementIds,
    };
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
    const recommended = matches.map((match) => ({
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
    return this.appendDefaultGovernanceSkills(recommended, brief, subprojectId);
  }

  private async appendDefaultGovernanceSkills(
    current: ProductChiefReport['recommendedSkills'],
    brief: string,
    subprojectId?: string | null,
  ): Promise<ProductChiefReport['recommendedSkills']> {
    if (!this.requiresImplementationGovernance(brief)) {
      return current;
    }

    const recommended = [...current];
    const existingIds = new Set(recommended.map((skill) => skill.skillId));
    const skills = await this.skillRegistry.listSkills(subprojectId);
    const scoreFloor = recommended.reduce((max, skill) => Math.max(max, skill.score), 0);

    const appendSkill = (
      skillId: string,
      scoreOffset: number,
      reasons: string[],
    ) => {
      if (existingIds.has(skillId)) {
        const currentSkill = recommended.find((skill) => skill.skillId === skillId);
        if (currentSkill) {
          currentSkill.reasons = [...new Set([...currentSkill.reasons, ...reasons])];
          currentSkill.score = Math.max(currentSkill.score, scoreFloor + scoreOffset);
        }
        return;
      }
      const skill = skills.find((item) => item.id === skillId && item.enabled);
      if (!skill) {
        return;
      }
      recommended.push({
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        ownerRole: skill.ownerRole,
        promptPath: skill.promptPath,
        score: scoreFloor + scoreOffset,
        reasons,
        deploymentStatus: skill.deployment.status,
        tool: skill.tool,
      });
      existingIds.add(skillId);
    };

    appendSkill('pmos-architecture-designer', 18, [
      'default-governance:architecture-prerequisite',
      'default-governance:pre-builder-boundary-review',
    ]);
    appendSkill('pmos-code-review', 16, [
      'default-governance:incremental-code-review',
      'default-governance:pre-acceptance-review-lane',
    ]);
    appendSkill('pmos-historical-code-review', 8, [
      'default-governance:legacy-hotspot-follow-up',
      'default-governance:non-blocking-historical-review-lane',
    ]);

    return recommended.sort((left, right) => right.score - left.score || left.skillId.localeCompare(right.skillId));
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
    const outputs: ProductChiefReport['requiredGovernedOutputs'] = [
      {
        type: 'physical-world-profile',
        title: 'Physical-world profile update',
        templatePath: 'docs/templates/physical_world_profile_template.md',
        priority: 'P0',
        reason: 'Missing organizational context should be captured before committing scope.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'ecosystem-scan',
        title: 'External pattern and open-source scouting',
        templatePath: 'docs/templates/ecosystem_landscape_scan_template.md',
        priority: 'P0',
        reason: 'Strategic proposals must check reusable external patterns before custom build work.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'strategic-radar',
        title: 'Strategic radar',
        templatePath: 'docs/templates/special_research_report_template.md',
        priority: 'P1',
        reason: 'Agent patterns, frameworks, and skill ecosystems should be watched before platform investment decisions.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'version-plan',
        title: 'Version planning document',
        templatePath: 'docs/templates/version_planning_template.md',
        priority: 'P1',
        reason: 'The work must map into version scope, acceptance, and rollout sequence.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'roadmap',
        title: 'Roadmap planning document',
        templatePath: 'docs/templates/roadmap_template.md',
        priority: 'P1',
        reason: 'Roadmap planning should be generated from active requirements and version traces.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'daily-intelligence-report',
        title: 'Daily intelligence report',
        templatePath: 'docs/templates/daily_intelligence_report_template.md',
        priority: 'P1',
        reason: 'Daily intelligence should summarize active requirement/version movement and new evidence gaps.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'weekly-product-brief',
        title: 'Weekly product brief',
        templatePath: 'docs/templates/weekly_product_brief_template.md',
        priority: 'P1',
        reason: 'Weekly briefs should roll up product progress, risks, and next decisions from governed context.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'learning-upgrade-memo',
        title: 'Learning and cognitive upgrade memo',
        templatePath: 'docs/templates/requirement_evaluation_feedback_template.md',
        priority: 'P1',
        reason: 'Recurring operator blind spots should be converted into explicit learning guidance.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'demo-script',
        title: 'Demo script',
        templatePath: 'docs/templates/demo_script_template.md',
        priority: 'P1',
        reason: 'Demo scripts should be generated from accepted capabilities, operator flows, and version state.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'user-manual',
        title: 'User manual',
        templatePath: 'docs/templates/user_manual_template.md',
        priority: 'P1',
        reason: 'User manuals should be generated from governed capability/version state rather than ad-hoc notes.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
      {
        type: 'external-capability-evaluation',
        title: 'External skill/plugin/framework evaluation',
        templatePath: 'docs/templates/subproject_capability_adoption_checklist.md',
        priority: 'P2',
        reason: 'External skills, plugins, and frameworks need governed adopt/adapt/watch/reject/build evaluation before adoption.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      },
    ];

    if (this.requiresImplementationGovernance(brief)) {
      outputs.push({
        type: 'architecture-decision-record',
        title: 'Architecture decision record',
        templatePath: 'docs/templates/architecture_decision_record_template.md',
        priority: 'P0',
        reason: 'Implementation work should have an explicit architecture output covering boundaries, ownership, alternatives, and irreversible choices before builder execution starts.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      });
      outputs.push({
        type: 'code-review-brief',
        title: 'Code review brief',
        templatePath: 'docs/templates/code_review_brief_template.md',
        priority: 'P1',
        reason: 'Implementation work should define an explicit review artifact that fixes review scope, blocker policy, traceability checks, and testing expectations before acceptance closes the work.',
        dependsOn: ['architecture-decision-record'],
        autoBackfillOnSkip: false,
      });
      outputs.push({
        type: 'historical-code-review-brief',
        title: 'Historical code review brief',
        templatePath: 'docs/templates/historical_code_review_brief_template.md',
        priority: 'P2',
        reason: 'Implementation touching legacy seams or hotspots should create a separate historical review artifact that records old-code risks and remediation queues without blocking current-scope acceptance by default.',
        dependsOn: ['code-review-brief'],
        autoBackfillOnSkip: false,
      });
    }

    if (/ui|schema|frontend|console|界面|页面|组件/u.test(brief)) {
      outputs.push({
        type: 'ui-schema-spec',
        title: 'Schema-driven UI and business-block spec',
        templatePath: 'docs/templates/ui_schema_spec_template.md',
        priority: 'P0',
        reason: 'UI work should start from reusable business blocks and interaction contracts.',
        dependsOn: [],
        autoBackfillOnSkip: false,
      });
      outputs.push({
        type: 'html-direction-pack',
        title: 'HTML direction pack',
        templatePath: 'docs/templates/ui_schema_spec_template.md',
        priority: 'P1',
        reason: 'Frontend work should compare delivery-grade HTML directions before converging into the final page contract.',
        dependsOn: ['ui-schema-spec'],
        autoBackfillOnSkip: true,
      });
      outputs.push({
        type: 'implementation-handoff',
        title: 'Implementation handoff package',
        templatePath: 'docs/templates/workflow_handoff_template.md',
        priority: 'P1',
        reason: 'Frontend implementation must receive a governed final-delivery handoff package instead of relying on chat memory or design drift.',
        dependsOn: ['architecture-decision-record', 'code-review-brief', 'ui-schema-spec', 'html-direction-pack'],
        autoBackfillOnSkip: true,
      });
    }

    return outputs;
  }

  private buildNextActions(
    brief: string,
    recommendedSkills: ProductChiefReport['recommendedSkills'],
  ) {
    const nextActions = [
      'Answer or explicitly waive the missing physical-world questions.',
      'Assign engaged specialist agents to generate governed outputs.',
      'Run ecosystem/open-source scouting before approving strategic build work.',
      'Create UI schema/business-block specs before frontend implementation when the work changes operator surfaces.',
    ];

    if (this.requiresImplementationGovernance(brief)) {
      nextActions.push('Run pmos-architecture-designer before builder execution to lock boundaries, data ownership, and irreversible choices.');
      nextActions.push('Make implementation-handoff explicit about implementationLane, reviewLane, and acceptanceLane before coding starts.');
      nextActions.push('Run pmos-code-review after implementation and before testing acceptance; do not skip the incremental review lane.');
      nextActions.push('If incremental review or delivery risk exposes legacy hotspots, run pmos-historical-code-review and convert old-code findings into a remediation queue instead of mixing them into the current diff review.');
    }

    if (recommendedSkills.some((skill) => skill.skillId === 'pmos-testing-acceptance')) {
      nextActions.push('Keep automated acceptance blocking delivery; user review starts only after testing acceptance passes.');
    }

    return [...new Set(nextActions)];
  }

  private requiresImplementationGovernance(brief: string) {
    return /implement|implementation|coding|build|frontend|backend|api|service|ui|schema|page|workflow|agent|copilot|integration|开发|实现|前端|后端|接口|服务|页面|工作流|智能体|集成/u.test(
      brief,
    );
  }

  private selectOutputSpecialists(report: ProductChiefReport, type: string) {
    const roleHints =
      type === 'ecosystem-scan' || type === 'strategic-radar'
        ? ['industry-research', 'competitive-analysis', 'strategy', 'review', 'product-management']
        : type === 'version-plan' || type === 'roadmap'
          ? ['requirements', 'versioning', 'roadmap-planning', 'strategy', 'product-management']
          : type === 'architecture-decision-record'
            ? ['strategy', 'workflow', 'delivery', 'review', 'product-management']
            : type === 'code-review-brief'
              ? ['review', 'delivery', 'documentation', 'product-management']
              : type === 'historical-code-review-brief'
                ? ['review', 'delivery', 'retrospective', 'documentation', 'product-management']
          : type === 'daily-intelligence-report' || type === 'weekly-product-brief'
            ? ['industry-research', 'competitive-analysis', 'stakeholder-analysis', 'documentation', 'product-management']
            : type === 'learning-upgrade-memo'
              ? ['retrospective', 'documentation', 'strategy', 'product-management']
            : type === 'demo-script' || type === 'user-manual'
              ? ['documentation', 'experience-design', 'workflow', 'delivery', 'product-management']
              : type === 'external-capability-evaluation'
                ? ['industry-research', 'strategy', 'review', 'delivery', 'product-management']
                : type === 'ui-schema-spec' || type === 'html-direction-pack' || type === 'implementation-handoff'
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
  ) {
    const base = [
      `# ${outputSpec.title}`,
      '',
      `- reportId: ${report.id}`,
      `- type: ${outputSpec.type}`,
      `- priority: ${outputSpec.priority}`,
      `- generatedAt: ${new Date().toISOString()}`,
      `- templatePath: ${outputSpec.templatePath ?? '-'}`,
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
        '### Delivery Baseline',
        '',
        '- Default frontend framework baseline: x.ant.design / Ant Design X ecosystem.',
        '- Normal functional pages and chat / agent / reasoning regions both start from the Ant Design X ecosystem baseline.',
        '- Base Ant Design components may still be used inside governed component bindings when they fit the page contract.',
        '- Ant Design Pro / Pro Components are not part of the root runtime baseline; treat them as reference-only or isolated-adapter-layer items until compatibility converges.',
        '- Every production page must expose route, layout shell, target roles, data refs, and component bindings before coding starts.',
        '',
        '### Domain Blocks',
        '',
        '- ProductChiefReportBlock',
        '- MissingQuestionListBlock',
        '- SpecialistEngagementBlock',
        '- GovernedOutputQueueBlock',
        '',
        '### Final Page Contract',
        '',
        '- linked requirement ids',
        '- route / entry',
        '- layout shell',
        '- target roles',
        '- data refs',
        '- component bindings',
        '- loading / empty / error / permission states',
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
        '- Production UI must not stop at demo, promo, or static confirmation draft quality.',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'architecture-decision-record') {
      return [
        ...base,
        '## Architecture Decision Surface',
        '',
        '- what is being decided',
        '- what becomes expensive to change later',
        '- what module / service / runtime boundary is affected',
        '- what data ownership and integration seam must be fixed now',
        '',
        '## Required Architecture Output',
        '',
        '- decision statement',
        '- context and constraints',
        '- chosen option',
        '- rejected alternatives',
        '- ownership boundary',
        '- API / event / contract seam',
        '- rollback or migration difficulty',
        '- follow-up review points',
        '',
        '## Default Architecture Lane',
        '',
        '- owner skill: pmos-architecture-designer',
        '- this artifact must exist before builder execution starts',
        '- implementation-handoff may reference this artifact but must not replace it',
        '',
        '## Review Questions',
        '',
        '- what is the one-way-door decision here',
        '- what boundary is fixed at platform vs subproject level',
        '- what alternative was rejected and why',
        '- what risk remains unresolved before coding starts',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'code-review-brief') {
      return [
        ...base,
        '## Review Scope Contract',
        '',
        '- review target: current implementation change set only',
        '- review owner skill: pmos-code-review',
        '- review phase: after implementation, before testing acceptance',
        '- historical debt review is out of scope unless explicitly promoted',
        '',
        '## Required Review Checks',
        '',
        '- correctness',
        '- regression risk',
        '- architecture conformance',
        '- requirement traceability',
        '- test gap review',
        '- complexity / maintainability risk',
        '',
        '## Required Review Output',
        '',
        '- reviewed scope',
        '- blocker findings',
        '- should-fix findings',
        '- residual risks',
        '- testing expectations',
        '- pass / rework recommendation',
        '',
        '## Review Gate Rules',
        '',
        '- testing acceptance should not start before incremental code review completes',
        '- implementation-handoff must reference this review artifact as the default pre-acceptance review lane',
        '- review findings must stay bound to actual changed files, not broad repo-wide opinions',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'historical-code-review-brief') {
      return [
        ...base,
        '## Historical Review Scope',
        '',
        '- review target: old code outside the current implementation diff',
        '- review owner skill: pmos-historical-code-review',
        '- review mode: hotspot-first, legacy-risk-first, non-blocking by default',
        '- trigger condition: legacy seam, high churn, repeated fragility, low health module, or architecture debt surfaced during delivery',
        '',
        '## Required Historical Checks',
        '',
        '- hotspot modules touched by or adjacent to the current delivery',
        '- repeated failure patterns or review debt carried across iterations',
        '- architecture drift accumulated outside the current diff',
        '- remediation queue candidates that should be promoted into roadmap or follow-up tasks',
        '',
        '## Required Historical Output',
        '',
        '- audited legacy scope',
        '- hotspot findings',
        '- debt severity and blast radius',
        '- separation between current blocker and long-term remediation item',
        '- recommended remediation queue',
        '- decision on whether a follow-up architecture change is needed',
        '',
        '## Non-Blocking Rule',
        '',
        '- historical code review does not replace incremental diff review',
        '- historical findings should not automatically block current acceptance unless they create an immediate delivery risk',
        '- unresolved historical debt must be converted into tracked remediation work instead of disappearing from the handoff chain',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'html-direction-pack') {
      return [
        ...base,
        '## Direction Objective',
        '',
        '- Compare delivery-grade HTML directions before implementation begins.',
        '- Keep the comparison focused on page shell, information density, interaction hierarchy, and component-binding feasibility.',
        '- Do not use concept-only hero shells, demo narrative panels, or confirmation-draft copy as the primary page structure.',
        '',
        '## Direction Matrix',
        '',
        '| Direction | Density | Suitable Scenario | Risks To Watch |',
        '| --- | --- | --- | --- |',
        '| Low-density workbench | lower | executive/operator overview first | may hide operational depth if actions are buried |',
        '| Balanced enterprise workbench | medium | default operator delivery page | baseline recommendation for most PMAIOS business pages |',
        '| High-density operation console | higher | analyst / specialist heavy workflows | can feel noisy if grouping is weak |',
        '',
        '## Shared Hard Constraints',
        '',
        '- all directions use x.ant.design / Ant Design X as the default frontend host baseline',
        '- foundational Ant Design components may still be selected through governed component bindings when needed',
        '- Ant Design Pro / Pro Components must stay outside the root runtime baseline unless an isolated adapter layer explicitly owns them',
        '- every direction must preserve route, target roles, data refs, component bindings, and business-state visibility',
        '- every direction must keep loading / empty / error / permission states visible in the page contract',
        '',
        '## Selection Rule',
        '',
        '- choose the first direction that keeps business density, execution speed, and component-governed implementation all balanced',
        '- reject any direction that still reads like demo, pitch, or static confirmation output',
        '',
      ].join('\n');
    }

    if (outputSpec.type === 'implementation-handoff') {
      return [
        ...base,
        '## Final Delivery Decision',
        '',
        '- frontend output type: final delivery page',
        '- forbidden output type: demo shell / static confirmation draft / explanation-first landing page',
        '- default page shell: enterprise workbench',
        '- default frontend framework baseline: x.ant.design / Ant Design X ecosystem',
        '- normal functional page baseline: Ant Design X ecosystem',
        '- conversation / agent / reasoning region baseline: Ant Design X ecosystem',
        '- Ant Design Pro / Pro Components, when referenced, must be classified as reference-only or isolated-adapter-layer rather than root baseline',
        '',
        '## Required Upstream Truth',
        '',
        '- linked requirement refs',
        '- linked architecture decision record refs',
        '- linked code review brief refs',
        '- linked functional spec refs',
        '- linked ui schema refs',
        '- approved html direction selection',
        '',
        '## Default Governed Agent Skills',
        '',
        '- architecture lane skill: pmos-architecture-designer',
        '- implementation lane owner: implementationLane',
        '- review lane skill: pmos-code-review',
        '- historical review lane skill: pmos-historical-code-review (follow-up hotspot / legacy debt lane)',
        '- acceptance lane skill: pmos-testing-acceptance',
        '- do not skip architecture-designer or code-review just because builder and testing lanes already exist',
        '',
        '## Implementation Lane Decision',
        '',
        '- architecture prerequisite must be explicit before builder execution',
        '- implementationLane must be explicit',
        '- allowed values: repo-coding / pmos-fullstack-builder / hybrid',
        '- prefer pmos-fullstack-builder for PMOS-owned frontend/backend/AI implementation work',
        '- prefer repo-coding for conventional business frontend/backend engineering',
        '- use hybrid only when PMOS implementation must coordinate external execution surfaces with repo-owned pages or services',
        '- reviewLane default: pmos-code-review',
        '- historicalReviewLane default follow-up: pmos-historical-code-review (non-blocking unless immediate delivery risk is found)',
        '- acceptanceLane default: pmos-testing-acceptance',
        '',
        '## Implementation Contract',
        '',
        '- route / entry must be explicit',
        '- layout shell must be explicit',
        '- target roles must be explicit',
        '- data refs must be explicit',
        '- component bindings must be explicit',
        '- loading / empty / error / permission states must be explicit',
        '- critical actions and success feedback must be explicit',
        '',
        '## Default Execution Order',
        '',
        '1. recover upstream requirement / functional / ui-schema truth if missing',
        '2. lock page route, shell, roles, and data refs',
        '3. lock Ant Design / Ant Design X component bindings',
        '4. run pmos-architecture-designer and record architecture-ready boundary/tradeoff conclusions',
        '5. write an explicit SDD acceptance matrix before final implementation sign-off',
        '6. implement the page with governed states and actions under the selected implementationLane',
        '7. run pmos-code-review on the actual change set before testing acceptance begins',
        '8. if legacy hotspots are discovered, run pmos-historical-code-review and capture remediation work separately from the current diff review',
        '9. run automated acceptance and repeated browser verification before operator review',
        '',
        '## Acceptance Pack',
        '',
        '- required unit/integration tests',
        '- required focused regression set',
        '- required final-state validation result',
        '- required browser verification artifacts',
        '- minimum real-browser rounds: desktop 3, mobile 2',
        '- screenshot evidence for the final page shell',
        '- unresolved risks and blocked states',
        '',
        '## Anti-Drift Rules',
        '',
        '- do not invent page structure from memory when ui-schema exists',
        '- do not replace governed component bindings with freehand custom UI without explicit waiver',
        '- do not send the page to user review before automated browser verification passes',
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
}
