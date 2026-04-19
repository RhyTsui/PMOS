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
  ) {}

  async analyze(input: ProductChiefInput): Promise<ProductChiefReport> {
    const brief = input.brief.trim();
    if (!brief) {
      throw new Error('brief is required');
    }

    const agents = await this.ensureAgentHierarchy(input.subprojectId);
    const engagedSpecialists = this.selectSpecialists(agents, brief);
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

    const outputId = `product-output-${randomUUID()}`;
    const artifactPath = getProductChiefOutputArtifactPath(outputId, report.subprojectId);
    const outputRecordPath = getProductChiefOutputPath(outputId, report.subprojectId);
    const reportPath = getProductChiefReportPath(report.id, report.subprojectId);
    const specialistAgentIds = this.selectOutputSpecialists(report, outputSpec.type);
    const planningContext = await this.buildPlanningContext(report.subprojectId);
    const content = this.buildOutputMarkdown(report, outputSpec, specialistAgentIds, planningContext);
    const now = new Date().toISOString();
    const requirementIds = await this.resolveOutputRequirementIds({
      report,
      outputId,
      outputType: outputSpec.type,
      outputTitle: outputSpec.title,
      outputPriority: outputSpec.priority,
      summary: `${outputSpec.title} generated from Product Chief report ${report.id}.`,
      artifactPaths: [artifactPath, outputRecordPath, reportPath],
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
      specialistTasks,
      requirementIds,
    });
    const multiAgentReviewRecordPath = getProductChiefMultiAgentReviewPath(multiAgentReview.id, multiAgentReview.subprojectId);
    const traceArtifactPaths = [
      artifactPath,
      outputRecordPath,
      reportPath,
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
      summary: `${outputSpec.title} generated from Product Chief report ${report.id}.`,
      metadata: {
        priority: outputSpec.priority,
        reason: outputSpec.reason,
        outputRecordPath,
      },
    };

    await this.store.write(artifactPath, content);
    await this.store.writeJson(outputRecordPath, output);
    return output;
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
      },
      {
        type: 'ecosystem-scan',
        title: 'External pattern and open-source scouting',
        templatePath: 'docs/templates/ecosystem_landscape_scan_template.md',
        priority: 'P0',
        reason: 'Strategic proposals must check reusable external patterns before custom build work.',
      },
      {
        type: 'strategic-radar',
        title: 'Strategic radar',
        templatePath: 'docs/templates/special_research_report_template.md',
        priority: 'P1',
        reason: 'Agent patterns, frameworks, and skill ecosystems should be watched before platform investment decisions.',
      },
      {
        type: 'version-plan',
        title: 'Version planning document',
        templatePath: 'docs/templates/version_planning_template.md',
        priority: 'P1',
        reason: 'The work must map into version scope, acceptance, and rollout sequence.',
      },
      {
        type: 'roadmap',
        title: 'Roadmap planning document',
        templatePath: 'docs/templates/roadmap_template.md',
        priority: 'P1',
        reason: 'Roadmap planning should be generated from active requirements and version traces.',
      },
      {
        type: 'daily-intelligence-report',
        title: 'Daily intelligence report',
        templatePath: 'docs/templates/daily_intelligence_report_template.md',
        priority: 'P1',
        reason: 'Daily intelligence should summarize active requirement/version movement and new evidence gaps.',
      },
      {
        type: 'weekly-product-brief',
        title: 'Weekly product brief',
        templatePath: 'docs/templates/weekly_product_brief_template.md',
        priority: 'P1',
        reason: 'Weekly briefs should roll up product progress, risks, and next decisions from governed context.',
      },
      {
        type: 'learning-upgrade-memo',
        title: 'Learning and cognitive upgrade memo',
        templatePath: 'docs/templates/requirement_evaluation_feedback_template.md',
        priority: 'P1',
        reason: 'Recurring operator blind spots should be converted into explicit learning guidance.',
      },
      {
        type: 'demo-script',
        title: 'Demo script',
        templatePath: 'docs/templates/demo_script_template.md',
        priority: 'P1',
        reason: 'Demo scripts should be generated from accepted capabilities, operator flows, and version state.',
      },
      {
        type: 'user-manual',
        title: 'User manual',
        templatePath: 'docs/templates/user_manual_template.md',
        priority: 'P1',
        reason: 'User manuals should be generated from governed capability/version state rather than ad-hoc notes.',
      },
      {
        type: 'external-capability-evaluation',
        title: 'External skill/plugin/framework evaluation',
        templatePath: 'docs/templates/subproject_capability_adoption_checklist.md',
        priority: 'P2',
        reason: 'External skills, plugins, and frameworks need governed adopt/adapt/watch/reject/build evaluation before adoption.',
      },
    ];

    if (/ui|schema|frontend|console|界面|页面|组件/u.test(brief)) {
      outputs.push({
        type: 'ui-schema-spec',
        title: 'Schema-driven UI and business-block spec',
        templatePath: 'docs/templates/ui_schema_spec_template.md',
        priority: 'P0',
        reason: 'UI work should start from reusable business blocks and interaction contracts.',
      });
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
