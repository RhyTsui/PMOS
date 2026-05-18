import { describe, expect, it } from 'vitest';
import { ProofOfWorkService } from '../../src/core/proofOfWorkService';
import type { TaskSsotTask, WorkflowRun } from '../../src/shared/schemas';

describe('ProofOfWorkService', () => {
  it('builds a proof-of-work bundle from task, workflow, review, and outbox evidence', () => {
    const service = new ProofOfWorkService();
    const task: TaskSsotTask = {
      taskId: 'task-1',
      sourceType: 'workflow-run-task',
      sourceRef: 'run-1',
      originalDemandRefs: ['req-1'],
      subprojectId: 'demo',
      title: 'Demo Task',
      summary: 'demo summary',
      collaborationLevel: 'L2',
      status: 'ready_for_delivery',
      currentStage: 'review',
      currentOwnerAgentId: 'workflow-role:reviewer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stages: [],
      gateChecks: [
        { taskId: 'task-1', gateId: 'project-truth-gate', status: 'pass', reason: 'ok', evidencePaths: ['docs/a.md'], checkedAt: new Date().toISOString() },
        { taskId: 'task-1', gateId: 'review-convergence-gate', status: 'warn', reason: 'needs follow-up', evidencePaths: ['docs/b.md'], checkedAt: new Date().toISOString() },
      ],
      gateHistory: [
        {
          id: 'gate-event-1',
          taskId: 'task-1',
          gateId: 'review-convergence-gate',
          stageId: 'review',
          action: 'review-passed',
          fromStatus: 'warn',
          toStatus: 'pass',
          actorRole: 'review-committee',
          artifactRefs: ['docs/review.md'],
          evidenceRefs: ['docs/b.md'],
          sourceEventId: 'evt-1',
          recordedAt: new Date().toISOString(),
          summary: 'review gate moved to pass',
        },
        {
          id: 'gate-event-2',
          taskId: 'task-1',
          gateId: 'design-confirmed-gate',
          stageId: 'review',
          action: 'checkpoint-recorded',
          fromStatus: 'warn',
          toStatus: 'block',
          actorRole: 'shared-context-owner',
          artifactRefs: ['docs/memory/mcp-context/session-state.json#checkpoint:ckpt-1'],
          evidenceRefs: ['docs/operations/confirmation-chain-object-and-gate.md'],
          sourceEventId: 'evt-2',
          recordedAt: new Date(Date.now() + 1000).toISOString(),
          summary: 'design confirmation is still blocked',
        },
      ],
      artifactLinks: [
        { taskId: 'task-1', artifactType: 'doc', artifactId: 'a', artifactPath: 'docs/a.md', roleInTask: 'working-output' },
      ],
      agentAssignments: [
        {
          taskId: 'task-1',
          agentId: 'workflow-role:reviewer',
          role: 'reviewer',
          assignmentType: 'reviewer',
          status: 'active',
        },
      ],
      syncEnvelopes: [],
      continuation: {
        mainlineLabel: 'Demo Mainline',
        nextSafeStep: 'continue',
        parkedLines: [],
        blockerType: null,
        resumeAnchor: null,
        lastMeaningfulAdvanceAt: null,
        currentAttention: null,
      },
    };
    const workflowRun: WorkflowRun = {
      id: 'run-1',
      subprojectId: 'demo',
      projectName: 'Demo',
      projectRoot: 'subprojects/demo',
      selectedProvider: null,
      providerConfigPath: null,
      mcpConfigPath: null,
      name: 'Demo Run',
      status: 'running',
      currentStageId: 'review',
      stages: [],
      tasks: [
        {
          id: 'task-1',
          runId: 'run-1',
          stageId: 'review',
          title: 'Demo Task',
          description: 'desc',
          ownerRole: 'reviewer',
          priority: 'P0',
          dependsOn: [],
          status: 'active',
          acceptanceCriteria: [],
          artifactPaths: ['docs/review.md'],
          blockedReason: null,
          summary: null,
          metadata: {},
        },
      ],
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memory: {
        projectMemoryPath: 'docs/memory/project-memory.md',
        runStatePath: 'docs/memory/runs/run-1.json',
        eventLogPath: 'docs/memory/events/run-1.jsonl',
        projectRoot: 'subprojects/demo',
        loadedAt: new Date().toISOString(),
      },
      providerCount: 0,
      mcpServerCount: 0,
      reworkCount: 0,
      executionSummary: null,
      lastReview: null,
      activeCapability: 'review',
      rework: null,
      metadata: {},
    };

    const bundle = service.buildBundle({
      task,
      workflowRun,
      review: {
        overallConclusion: 'looks good',
        nextStage: true,
        reworkRequired: false,
        gate: {
          decision: 'conditional',
          blocked: false,
          issueCount: 1,
          blockingStageId: null,
        },
        roles: [],
        activationTrace: [
          {
            role: 'Delivery Review',
            required: true,
            activated: true,
            source: 'stage-specialist-runtime',
            status: 'active',
          },
          {
            role: 'Development Review',
            required: true,
            activated: true,
            source: 'stage-specialist-runtime',
            status: 'active',
          },
          {
            role: 'Research Review',
            required: true,
            activated: true,
            source: 'stage-specialist-runtime',
            status: 'active',
          },
          {
            role: 'Hermes Governance',
            required: true,
            activated: true,
            source: 'governance-aggregator',
            status: 'active',
          },
          {
            role: 'Human Final Approval',
            required: true,
            activated: true,
            source: 'final-approval-gate',
            status: 'active',
          },
        ],
        hermes: {
          overallDecision: 'revise',
          summary: 'Need one more review pass before promotion.',
          actions: [
            {
              action: 'revise',
              target: 'review',
              reason: 'Close the last warning before promotion.',
            },
          ],
          knowledgeGrounding: {
            configured: true,
            query: 'demo review',
            resultCount: 1,
            summary: 'Hermes found one grounded system-state retrieval hit.',
          },
          writebackClosure: {
            totalTargets: 2,
            completedTargets: 1,
            openTargets: 1,
            activeTaskCount: 1,
            summary: '1/2 Hermes writeback targets still need governed closure.',
          },
          watchClosure: {
            activeFindings: 1,
            resolvedFindings: 1,
            recurringFindings: 1,
            suppressedFindings: 1,
            openTaskCount: 1,
            closureEvidenceCount: 2,
            summary: '1 Hermes watch task remains open and 2 closure evidence items are already attached.',
          },
        },
        summary: 'conditional pass',
        recommendedReworkStageId: null,
      },
      outboxEnvelopes: [
        {
          syncId: 'sync-1',
          taskId: 'task-1',
          entityType: 'product-output',
          entityId: 'output-1',
          targetSystem: 'figma',
          targetCategory: 'design',
          topicKey: 'product-output:publish',
          action: 'publish',
          payloadRef: 'docs/a.md',
          status: 'completed',
          retryCount: 0,
          maxRetries: 3,
          scheduledAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          receiptRef: 'figma://frame/1',
          error: null,
        },
      ],
    });

    expect(bundle.taskId).toBe('task-1');
    expect(bundle.review.decision).toBe('conditional');
    expect(bundle.review.hermesDecision).toBe('revise');
    expect(bundle.review.hermesActions[0]?.action).toBe('revise');
    expect(bundle.gateSummary.warn).toBe(1);
    expect(bundle.gateHistory.total).toBe(2);
    expect(bundle.gateHistory.recentEvents[0]?.gateId).toBe('design-confirmed-gate');
    expect(bundle.gateHistory.latestDecisionEvent?.gateId).toBe('design-confirmed-gate');
    expect(bundle.gateHistory.latestDecisionEvent?.toStatus).toBe('block');
    expect(bundle.gateHistory.currentAttention.gateId).toBe('design-confirmed-gate');
    expect(bundle.gateHistory.currentAttention.status).toBe('block');
    expect(bundle.gateHistory.currentAttention.taskId).toBe('task-1');
    expect(bundle.gateHistory.currentAttention.workflowRunId).toBe('run-1');
    expect(bundle.gateHistory.currentAttention.mainlineLabel).toBe('Demo Mainline');
    expect(bundle.gateHistory.currentAttention.nextSafeStep).toBe('continue');
    expect(bundle.gateHistory.currentAttention.suggestedActions[0]).toContain('Execute 1 Hermes writeback target');
    expect(bundle.gateHistory.currentAttention.suggestedActions[1]).toContain('Resolve 1 Hermes watch task');
    expect(bundle.gateHistory.currentAttention.suggestedActions.some((action) => action.includes('design confirmation'))).toBe(true);
    expect(bundle.gateHistory.currentAttention.suggestedActions.some((action) => action.includes('Next safe step'))).toBe(true);
    expect(bundle.gateHistory.currentAttention.operatorEntries[0]?.actionId).toBe('execute-hermes-writeback');
    expect(bundle.gateHistory.currentAttention.operatorEntries.some((entry) => entry.actionId === 'execute-hermes-writeback')).toBe(true);
    expect(bundle.gateHistory.currentAttention.operatorEntries.some((entry) => entry.actionId === 'close-hermes-loop')).toBe(true);
    expect(bundle.gateHistory.currentAttention.operatorEntries[0]?.targetTaskId).toBe('task-1');
    expect(bundle.gateHistory.currentAttention.operatorEntries[0]?.targetWorkflowRunId).toBe('run-1');
    expect(bundle.gateHistory.currentAttention.operatorEntries.some((entry) => entry.actionId === 'tick-run')).toBe(true);
    expect(bundle.ownership.ownerAgentId).toBe('workflow-role:reviewer');
    expect(bundle.ownership.reviewerAgentIds).toContain('workflow-role:reviewer');
    expect(bundle.ownership.approvalStatus).toBe('conditional');
    expect(bundle.ownership.approver).toBe('review-committee');
    expect(bundle.acceptancePackage.verdict).toBe('blocked');
    expect(bundle.acceptancePackage.requiredEvidence.some((item) => item.id === 'gate-traceability' && item.status === 'block')).toBe(true);
    expect(bundle.acceptancePackage.requiredEvidence.some((item) => item.id === 'review-decision' && item.status === 'warn')).toBe(true);
    expect(bundle.acceptancePackage.requiredEvidence.some((item) => item.id === 'specialist-activation' && item.status === 'pass')).toBe(true);
    expect(bundle.acceptancePackage.requiredEvidence.some((item) => item.id === 'hermes-governance' && item.status === 'warn')).toBe(true);
    expect(bundle.acceptancePackage.requiredEvidence.some((item) => item.id === 'hermes-loop-closure' && item.status === 'warn')).toBe(true);
    expect(bundle.acceptancePackage.handoff.mainlineLabel).toBe('Demo Mainline');
    expect(bundle.acceptancePackage.handoff.currentStage).toBe('review');
    expect(bundle.acceptancePackage.handoff.nextSafeStep).toBe('continue');
    expect(bundle.acceptancePackage.missingEvidence).toContain('resume anchor');
    expect(bundle.artifactPaths).toContain('docs/a.md');
    expect(bundle.artifactPaths).toContain('docs/review.md');
    expect(bundle.outbox.completed).toBe(1);
    expect(bundle.outbox.receiptRefs).toContain('figma://frame/1');
    expect(bundle.contextBundle.collaborationLevel).toBe('L2');
    expect(bundle.contextBundle.projectLabel).toBe('Demo');
    expect(bundle.pipelineLauncher).toHaveLength(0);
  });

  it('surfaces assumed specialist activation as attention to close', () => {
    const service = new ProofOfWorkService();
    const baseTime = new Date().toISOString();
    const bundle = service.buildBundle({
      task: {
        taskId: 'task-2',
        sourceType: 'workflow-run-task',
        sourceRef: 'run-2',
        originalDemandRefs: ['req-2'],
        subprojectId: 'demo',
        title: 'Demo Task 2',
        summary: 'demo summary',
        collaborationLevel: 'L2',
        status: 'ready_for_delivery',
        currentStage: 'frontend-page',
        currentOwnerAgentId: 'workflow-role:frontend',
        createdAt: baseTime,
        updatedAt: baseTime,
        stages: [],
        gateChecks: [],
        gateHistory: [],
        artifactLinks: [],
        agentAssignments: [],
        syncEnvelopes: [],
        continuation: {
          mainlineLabel: 'Demo Mainline 2',
          nextSafeStep: 'continue frontend delivery',
          parkedLines: [],
          blockerType: null,
          resumeAnchor: 'docs/memory/runs/run-2.json#stage:frontend-page',
          lastMeaningfulAdvanceAt: null,
          currentAttention: null,
        },
      },
      workflowRun: null,
      review: {
        overallConclusion: 'review exists',
        nextStage: true,
        reworkRequired: false,
        gate: {
          decision: 'pass',
          blocked: false,
          issueCount: 0,
          blockingStageId: null,
        },
        roles: [],
        activationTrace: [
          {
            role: 'Design Review',
            required: true,
            activated: true,
            source: 'implicit-stage-default',
            status: 'assumed',
          },
        ],
        hermes: {
          overallDecision: 'keep',
          summary: 'keep current baseline',
          actions: [{ action: 'keep', target: 'frontend-page', reason: 'baseline is stable' }],
          knowledgeGrounding: {
            configured: false,
            query: null,
            resultCount: 0,
            summary: null,
          },
          writebackClosure: {
            totalTargets: 0,
            completedTargets: 0,
            openTargets: 0,
            activeTaskCount: 0,
            summary: 'No Hermes-governed writeback targets were attached to this review package.',
          },
          watchClosure: {
            activeFindings: 0,
            resolvedFindings: 0,
            recurringFindings: 0,
            suppressedFindings: 0,
            openTaskCount: 0,
            closureEvidenceCount: 0,
            summary: 'No Hermes watch findings were attached to this review package.',
          },
        },
        summary: 'review summary',
        recommendedReworkStageId: null,
      },
      outboxEnvelopes: [],
    });

    expect(bundle.acceptancePackage.requiredEvidence.some((item) => item.id === 'specialist-activation' && item.status === 'warn')).toBe(true);
    expect(bundle.acceptancePackage.missingEvidence).toContain('specialist activation evidence');
    expect(bundle.gateHistory.currentAttention.suggestedActions.some((action) => action.includes('implicit specialist activation default'))).toBe(true);
    expect(bundle.gateHistory.currentAttention.operatorEntries.some((entry) => entry.actionId === 'resume-current-stage')).toBe(true);
    expect(bundle.contextBundle.nextSafeStep).toBe('continue frontend delivery');
  });
});
