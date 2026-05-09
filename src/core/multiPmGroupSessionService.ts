import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import {
  getProductChiefGroupSessionArtifactPath,
  getProductChiefGroupSessionPath,
  getProductChiefMultiAgentReviewDirectoryPath,
  getProductChiefOutputDirectoryPath,
  getProductChiefReportDirectoryPath,
} from './projectPaths.js';
import { TaskSsotService } from './taskSsotService.js';
import { McpContextSyncService } from './mcpContextSyncService.js';
import type {
  MultiPmGroupSession,
  ProductChiefMultiAgentReview,
  ProductChiefOutput,
  ProductChiefReport,
} from '../shared/schemas.js';

const RESPONSIBILITY_BY_ROLE: Record<string, string> = {
  requirements: 'Owns user demand, scope, and acceptance criteria.',
  delivery: 'Owns implementation handoff, proof-of-work, and delivery closure.',
  versioning: 'Owns version fit, priority, and release boundary.',
  review: 'Owns risk, evidence completeness, and blockers.',
  workflow: 'Owns structured design-delivery chain and workflow handoff.',
};

export class MultiPmGroupSessionService {
  constructor(
    private readonly store: FileStore,
    private readonly mcpContextSync = new McpContextSyncService(store.resolve()),
    private readonly taskSsotService = new TaskSsotService(store, new McpContextSyncService(store.resolve())),
  ) {}

  async listSessions(subprojectId?: string | null) {
    const session = await this.buildDerivedSession(subprojectId);
    if (!session) {
      return [] as MultiPmGroupSession[];
    }
    await this.persistSession(session);
    return [session];
  }

  private async buildDerivedSession(subprojectId?: string | null): Promise<MultiPmGroupSession | null> {
    const [reports, outputs, reviews, taskState, mcpState] = await Promise.all([
      this.loadJsonRecords<ProductChiefReport>(getProductChiefReportDirectoryPath(subprojectId)),
      this.loadJsonRecords<ProductChiefOutput>(getProductChiefOutputDirectoryPath(subprojectId)),
      this.loadJsonRecords<ProductChiefMultiAgentReview>(getProductChiefMultiAgentReviewDirectoryPath(subprojectId)),
      this.taskSsotService.getState(subprojectId),
      this.mcpContextSync.getState(),
    ]);
    const latestReport = reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null;
    if (!latestReport) {
      return null;
    }

    const latestOutputs = outputs
      .filter((item) => item.reportId === latestReport.id)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const reportReviews = reviews
      .filter((item) => item.reportId === latestReport.id)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const generatedOutputTypes = new Set(latestOutputs.map((item) => item.type));
    const pendingOutputs = latestReport.requiredGovernedOutputs.filter((item) => !generatedOutputTypes.has(item.type));
    const deliveryTargetOutput = pendingOutputs[0] ?? latestReport.requiredGovernedOutputs[0] ?? null;
    const deliveryTarget = deliveryTargetOutput
      ? `${deliveryTargetOutput.type}: ${deliveryTargetOutput.title}`
      : latestReport.nextActions[0] ?? 'Close the current governed product delivery gap.';
    const activeTask = taskState.tasks.find((task) => task.taskId === taskState.continuation.activeMainlineTaskId) ?? null;
    const nextSafeStep = activeTask?.continuation.nextSafeStep ?? latestReport.nextActions[0] ?? null;
    const currentGap =
      pendingOutputs.length > 0
        ? `Still missing ${pendingOutputs.length} governed output(s) before delivery target is fully closed.`
        : reportReviews.some((item) => item.status === 'blocked' || item.status === 'needs-human-decision')
          ? 'Outputs exist, but at least one multi-agent review still needs convergence or human decision.'
          : 'Current delivery target is near closure; remaining work is convergence, backwrite, and implementation follow-through.';

    const chair = {
      agentId: 'chief-pm',
      agentName: 'Chief PM',
      role: 'product-management' as const,
      responsibility: 'Owns convergence, backwrite targets, and next safe step around the delivery target.',
    };
    const participants = latestReport.engagedSpecialists.slice(0, 4).map((item) => ({
      agentId: item.agentId,
      agentName: item.name,
      role: item.role,
      responsibility: RESPONSIBILITY_BY_ROLE[item.role] ?? item.reason,
    }));

    const pma = participants[0] ?? {
      agentId: 'requirements-pm',
      agentName: 'Requirements PM',
      role: 'requirements' as const,
      responsibility: RESPONSIBILITY_BY_ROLE.requirements,
    };
    const pmb = participants[1] ?? {
      agentId: 'delivery-pm',
      agentName: 'Delivery PM',
      role: 'delivery' as const,
      responsibility: RESPONSIBILITY_BY_ROLE.delivery,
    };
    const pmc = participants[2] ?? {
      agentId: 'version-pm',
      agentName: 'Version PM',
      role: 'versioning' as const,
      responsibility: RESPONSIBILITY_BY_ROLE.versioning,
    };

    const message1Id = `msg-${randomUUID()}`;
    const message2Id = `msg-${randomUUID()}`;
    const message3Id = `msg-${randomUUID()}`;
    const message4Id = `msg-${randomUUID()}`;
    const sessionStatus =
      reportReviews.some((item) => item.status === 'blocked')
        ? 'blocked'
        : reportReviews.some((item) => item.status === 'needs-human-decision')
          ? 'needs-human-decision'
          : pendingOutputs.length > 0
            ? 'active'
            : 'converged';

    const backwriteTargets = [
      {
        targetType: 'requirements' as const,
        targetPath: 'docs/memory/requirements',
        changeSummary: 'Backwrite requirement changes so frontend and design do not drift.',
        sourceMessageIds: [message1Id, message2Id],
      },
      {
        targetType: 'design' as const,
        targetPath: 'docs/templates/ui_schema_spec_template.md',
        changeSummary: 'Backwrite delivery-page and schema-delivery constraints into the design contract.',
        sourceMessageIds: [message2Id, message3Id],
      },
      {
        targetType: 'delivery' as const,
        targetPath: 'docs/operations/prd-and-design-two-step-governance.md',
        changeSummary: 'Backwrite the current delivery-target handoff constraints into governed delivery truth.',
        sourceMessageIds: [message3Id, message4Id],
      },
    ];

    const session: MultiPmGroupSession = {
      id: `group-session-${latestReport.id}`,
      subprojectId: latestReport.subprojectId,
      reportId: latestReport.id,
      sourceReviewIds: reportReviews.map((item) => item.id),
      taskId: activeTask?.taskId ?? mcpState.currentTaskId ?? null,
      mode: 'delivery-driven-autonomous-dialogue',
      status: sessionStatus,
      sessionGoal: `Align PM collaboration around the delivery target: ${deliveryTarget}`,
      deliveryTarget,
      currentGap,
      chair,
      participants,
      messages: [
        {
          messageId: message1Id,
          speakerId: pma.agentId,
          speakerName: pma.agentName,
          speakerRole: pma.role,
          replyToMessageId: null,
          deliveryTargetRef: deliveryTarget,
          stance: pendingOutputs.length > 0 ? 'proposal' : 'support',
          intent: 'extend',
          summary:
            pendingOutputs.length > 0
              ? `First flatten the target: ${pendingOutputs.length} governed output(s) are still missing, so delivery will drift unless requirement and handoff truth are backwritten.`
              : 'The delivery target is close to closure, but requirement backwrite and handoff truth still need confirmation.',
        },
        {
          messageId: message2Id,
          speakerId: pmb.agentId,
          speakerName: pmb.agentName,
          speakerRole: pmb.role,
          replyToMessageId: message1Id,
          deliveryTargetRef: deliveryTarget,
          stance: 'concern',
          intent: 'challenge',
          summary:
            'I am picking that up: if the team only reads design files or HTML without requirement/schema backwrite, frontend will keep guessing. Delivery must be grounded in delivery-html plus schema-delivery.',
        },
        {
          messageId: message3Id,
          speakerId: pmc.agentId,
          speakerName: pmc.agentName,
          speakerRole: pmc.role,
          replyToMessageId: message2Id,
          deliveryTargetRef: deliveryTarget,
          stance: sessionStatus === 'blocked' ? 'blocker' : sessionStatus === 'needs-human-decision' ? 'concern' : 'proposal',
          intent: 'correct',
          summary:
            sessionStatus === 'blocked'
              ? 'There is still a blocker, so this cannot be treated as a completed delivery. Evidence, backwrite, or review blockage must be resolved first.'
              : sessionStatus === 'needs-human-decision'
                ? 'The direction can continue, but some points still require human decision. We should not pretend the delivery is fully closed.'
                : 'This can keep moving in the current version, but only if design, requirement, and delivery constraints are synchronized back into truth sources.',
        },
        {
          messageId: message4Id,
          speakerId: chair.agentId,
          speakerName: chair.agentName,
          speakerRole: chair.role,
          replyToMessageId: message3Id,
          deliveryTargetRef: deliveryTarget,
          stance: 'decision',
          intent: 'converge',
          summary:
            sessionStatus === 'converged'
              ? 'Conclusion: the current delivery target can continue on the mainline, with focus shifting to implementation handoff and proof-of-work.'
              : `Conclusion: keep pushing on "${deliveryTarget}", backwrite the agreed truth, and execute the next safe step: ${nextSafeStep ?? 'return to mainline and keep closing the delivery gap'}.`,
        },
      ],
      conflicts:
        sessionStatus === 'needs-human-decision'
          ? [
              {
                conflictId: `conflict-${randomUUID()}`,
                deliveryTargetRef: deliveryTarget,
                topic: 'human-decision-needed',
                positionA: 'Current delivery chain is good enough to continue drafting.',
                positionB: 'Final approval still requires explicit human decision or waived ambiguity.',
                whyConflicting: 'The output is usable as draft material but not yet fully approved for final delivery.',
                resolutionOwner: chair.agentId,
                status: 'needs-human-decision',
              },
            ]
          : [],
      backwriteTargets,
      nextSafeStep,
      generatedAt: new Date().toISOString(),
      metadata: {
        pendingOutputTypes: pendingOutputs.map((item) => item.type),
        generatedOutputTypes: [...generatedOutputTypes],
        activeMainlineLabel: taskState.continuation.activeMainlineLabel,
      },
    };

    return session;
  }

  private async persistSession(session: MultiPmGroupSession) {
    await this.store.writeJson(getProductChiefGroupSessionPath(session.id, session.subprojectId), session);
    await this.store.write(getProductChiefGroupSessionArtifactPath(session.id, session.subprojectId), this.buildArtifact(session));
  }

  private buildArtifact(session: MultiPmGroupSession) {
    return [
      `# ${session.deliveryTarget}`,
      '',
      `- session id: ${session.id}`,
      `- mode: ${session.mode}`,
      `- status: ${session.status}`,
      `- task id: ${session.taskId ?? '-'}`,
      `- generated at: ${session.generatedAt}`,
      '',
      '## Session Goal',
      '',
      session.sessionGoal,
      '',
      '## Current Gap',
      '',
      session.currentGap,
      '',
      '## Participants',
      '',
      `- chair: ${session.chair.agentName} (${session.chair.role}) - ${session.chair.responsibility}`,
      ...session.participants.map((item) => `- ${item.agentName} (${item.role}) - ${item.responsibility}`),
      '',
      '## Autonomous Dialogue',
      '',
      ...session.messages.map((item) => `- ${item.speakerName} -> ${item.replyToMessageId ?? 'root'} [${item.intent}/${item.stance}]: ${item.summary}`),
      '',
      '## Backwrite Targets',
      '',
      ...session.backwriteTargets.map((item) => `- ${item.targetType}: ${item.targetPath} - ${item.changeSummary}`),
      '',
      '## Next Safe Step',
      '',
      session.nextSafeStep ?? '-',
      '',
    ].join('\n');
  }

  private async loadJsonRecords<T>(relativeDir: string): Promise<T[]> {
    if (!(await this.store.exists(relativeDir))) {
      return [];
    }
    const files = (await this.store.list(relativeDir)).filter((item) => item.endsWith('.json'));
    const items = await Promise.all(
      files.map(async (file) => {
        try {
          return await this.store.readJson<T>(file);
        } catch {
          return null;
        }
      }),
    );
    return items.filter((item) => item !== null) as T[];
  }
}
