import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { CloudMirrorService } from '../../src/core/cloudMirrorService';
import type { DocumentGovernanceAudit, TaskSsotState } from '../../src/shared/schemas';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-cloud-mirror-'));
  return new FileStore(root);
}

describe('CloudMirrorService', () => {
  it('writes platform runtime status mirror from task ssot and runtime summaries', async () => {
    const store = createStore();
    const service = new CloudMirrorService(store);
    const now = '2026-05-21T10:00:00.000Z';
    const taskState: TaskSsotState = {
      version: 1,
      generatedAt: now,
      source: 'mcp-context-bootstrap',
      tasks: [
        {
          taskId: 'task-1',
          sourceType: 'mcp-context-task',
          sourceRef: 'task-1',
          originalDemandRefs: ['user:pmos-non-page'],
          subprojectId: null,
          title: '推进 PMOS v1.0 非页面待办收口',
          summary: '深拆默认产物与云镜像状态承接。',
          collaborationLevel: 'L1',
          status: 'blocked',
          currentStage: 'runtime-closure',
          currentOwnerAgentId: 'codex',
          createdAt: now,
          updatedAt: now,
          stages: [],
          gateChecks: [
            {
              taskId: 'task-1',
              gateId: 'latest-state-mirror',
              status: 'block',
              reason: 'Cloud latest-state mirror was missing.',
              evidencePaths: ['docs/operations/v1.0-gap-list.md'],
              checkedAt: now,
            },
          ],
          gateHistory: [],
          artifactLinks: [
            {
              taskId: 'task-1',
              artifactType: 'review-packet',
              artifactId: 'review-1',
              artifactPath: 'docs/review/requirement-to-function-demo.json',
              roleInTask: 'review-evidence',
            },
          ],
          agentAssignments: [],
          syncEnvelopes: [],
          continuation: {
            mainlineLabel: 'PMOS v1.0 非页面待办',
            nextSafeStep: 'Write runtime status mirror.',
            parkedLines: ['PMOS 页面重建'],
            blockerType: 'dependency',
            resumeAnchor: 'docs/operations/v1.0-gap-list.md',
            lastMeaningfulAdvanceAt: now,
            currentAttention: null,
          },
        },
      ],
      continuation: {
        activeMainlineTaskId: 'task-1',
        activeMainlineLabel: 'PMOS v1.0 非页面待办',
        parkedTaskIds: [],
        blockedTaskIds: ['task-1'],
        resumeAnchor: 'docs/operations/v1.0-gap-list.md',
        activeMainlineAttention: null,
      },
    };
    const documentGovernanceAudit: DocumentGovernanceAudit = {
      generatedAt: now,
      subprojectId: null,
      entryCount: 2,
      activeTopicCount: 1,
      issueCount: 1,
      issues: [
        {
          code: 'entry-file-missing',
          topicKey: 'runtime-status',
          severity: 'block',
          message: 'latest state mirror missing',
          path: 'cloud-mirror/runtime-status.json',
          relatedPaths: [],
        },
      ],
      summary: '1 issue found.',
    };

    const result = await service.writeRuntimeStatus({
      mcpContext: {
        currentMode: 'default',
        currentTaskId: 'task-1',
        lastUpdated: now,
        tasks: [{ id: 'task-1', label: '推进 PMOS v1.0 非页面待办收口', status: 'in_progress', updatedAt: now }],
        checkpoints: [{ id: 'cp-1', label: '开始非页面收口', taskId: 'task-1', timestamp: now }],
      },
      taskState,
      outboxRuntime: { total: 0, pending: 0 },
      schedulerRuntime: { total: 0, dueNow: 0 },
      documentGovernanceAudit,
    });

    expect(result.jsonPath).toBe('cloud-mirror/runtime-status.json');
    expect(result.markdownPath).toBe('cloud-mirror/runtime-status.md');
    expect(await store.exists(result.jsonPath)).toBe(true);
    expect(await store.exists(result.markdownPath)).toBe(true);
    const persisted = await store.readJson<typeof result.status>(result.jsonPath);
    expect(persisted.currentProductVersion).toBe('v1.0');
    expect(persisted.currentRuntimeBaseline).toBe('v0.7');
    expect(persisted.blockers.gateCount).toBe(1);
    expect(persisted.blockers.gateSampleCount).toBe(1);
    expect(persisted.latestReviewSummary.evidencePaths).toContain('docs/review/requirement-to-function-demo.json');
    expect(await store.read(result.markdownPath)).toContain('# PMOS Runtime Status');
  });
});
