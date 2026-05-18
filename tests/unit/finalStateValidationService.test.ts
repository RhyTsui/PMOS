import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FinalStateValidationService } from '../../src/core/finalStateValidationService';
import { FrontendBrowserVerificationService } from '../../src/core/frontendBrowserVerificationService';
import type { TaskSsotTask } from '../../src/shared/schemas';

function createFrontendTask(rootArtifactPaths: Array<{ path: string; role: TaskSsotTask['artifactLinks'][number]['roleInTask'] }>): TaskSsotTask {
  return {
    taskId: 'task-frontend',
    sourceType: 'workflow-run-task',
    sourceRef: 'run-1',
    originalDemandRefs: ['req-1'],
    subprojectId: 'ad',
    title: 'Frontend delivery',
    summary: 'frontend package',
    collaborationLevel: 'L2',
    status: 'ready_for_delivery',
    currentStage: 'frontend-page',
    currentOwnerAgentId: 'workflow-role:frontend',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: [],
    gateChecks: [],
    gateHistory: [],
    artifactLinks: rootArtifactPaths.map((artifact, index) => ({
      taskId: 'task-frontend',
      artifactType: 'doc',
      artifactId: `artifact-${index + 1}`,
      artifactPath: artifact.path,
      roleInTask: artifact.role,
    })),
    agentAssignments: [],
    syncEnvelopes: [],
    continuation: {
      mainlineLabel: 'Frontend delivery',
      nextSafeStep: 'continue',
      parkedLines: [],
      blockerType: null,
      resumeAnchor: null,
      lastMeaningfulAdvanceAt: null,
      currentAttention: null,
    },
  };
}

describe('FinalStateValidationService', () => {
  it('blocks frontend delivery tasks that reached delivery state before automated acceptance ran', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-final-validation-'));
    fs.mkdirSync(path.join(root, 'docs', 'multimodal'), { recursive: true });
    fs.mkdirSync(path.join(root, 'subprojects', 'ad', 'frontend', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'multimodal', 'ui-schema-contract.json'),
      JSON.stringify({
        linkedRequirementIds: ['req-1'],
        designSystemBaseline: {
          primaryPageLibrary: 'ant-design-x',
          conversationRegionLibrary: 'ant-design-x',
          rules: ['默认前端框架使用 x.ant.design / Ant Design X', '对话区域使用 Ant Design X'],
        },
        pageContracts: [
          {
            classification: 'production',
            route: '/overview',
            layoutShell: 'workspace-shell',
            targetRoles: ['operator'],
            blocks: [{ blockId: 'overview' }],
            actions: [{ actionId: 'submit' }],
            dataRefs: [{ refId: 'results' }],
            states: [{ kind: 'default' }, { kind: 'loading' }, { kind: 'empty' }, { kind: 'error' }],
            componentBindings: [{ blockId: 'overview', library: 'ant-design', componentName: 'Card' }],
          },
        ],
        implementationRules: ['Use x.ant.design / Ant Design X ecosystem components with pageContracts / states / actions / dataRefs / componentBindings.'],
      }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(root, 'subprojects', 'ad', 'frontend', 'src', 'App.jsx'),
      'export function App(){ return <section className="enterprise-shell">ready</section>; }',
      'utf8',
    );

    const service = new FinalStateValidationService(new FrontendBrowserVerificationService(root));
    const report = service.evaluateTask(
      createFrontendTask([
        { path: 'docs/multimodal/ui-schema-contract.json', role: 'working-output' },
        { path: 'subprojects/ad/frontend/src/App.jsx', role: 'working-output' },
      ]),
      null,
    );

    expect(report.status).toBe('blocked');
    expect(report.checks.some((check) => check.id === 'automated-acceptance-gate' && check.status === 'block')).toBe(true);
  });

  it('passes automated acceptance gate once acceptance evidence is attached', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-final-validation-ready-'));
    fs.mkdirSync(path.join(root, 'docs', 'multimodal'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs', 'review'), { recursive: true });
    fs.mkdirSync(path.join(root, 'subprojects', 'ad', 'frontend', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'multimodal', 'ui-schema-contract.json'),
      JSON.stringify({
        linkedRequirementIds: ['req-1'],
        designSystemBaseline: {
          primaryPageLibrary: 'ant-design-x',
          conversationRegionLibrary: 'ant-design-x',
          rules: ['默认前端框架使用 x.ant.design / Ant Design X', '对话区域使用 Ant Design X'],
        },
        pageContracts: [
          {
            classification: 'production',
            route: '/overview',
            layoutShell: 'workspace-shell',
            targetRoles: ['operator'],
            blocks: [{ blockId: 'overview' }],
            actions: [{ actionId: 'submit' }],
            dataRefs: [{ refId: 'results' }],
            states: [{ kind: 'default' }, { kind: 'loading' }, { kind: 'empty' }, { kind: 'error' }],
            componentBindings: [{ blockId: 'overview', library: 'ant-design', componentName: 'Card' }],
          },
        ],
        implementationRules: ['Use x.ant.design / Ant Design X ecosystem components with pageContracts / states / actions / dataRefs / componentBindings.'],
      }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(root, 'subprojects', 'ad', 'frontend', 'src', 'App.jsx'),
      'export function App(){ return <section className="enterprise-shell">ready</section>; }',
      'utf8',
    );
    fs.writeFileSync(path.join(root, 'docs', 'review', 'playwright-browser-verification-task-frontend.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(root, 'docs', 'review', 'auto-acceptance-task-frontend.json'), '{}', 'utf8');

    const service = new FinalStateValidationService(new FrontendBrowserVerificationService(root));
    const report = service.evaluateTask(
      createFrontendTask([
        { path: 'docs/multimodal/ui-schema-contract.json', role: 'working-output' },
        { path: 'subprojects/ad/frontend/src/App.jsx', role: 'working-output' },
        { path: 'docs/review/playwright-browser-verification-task-frontend.json', role: 'review-evidence' },
        { path: 'docs/review/auto-acceptance-task-frontend.json', role: 'review-evidence' },
        { path: 'docs/delivery/final-frontend.md', role: 'final-delivery' },
      ]),
      null,
    );

    expect(report.checks.some((check) => check.id === 'automated-acceptance-gate' && check.status === 'pass')).toBe(true);
    expect(report.status).toBe('ready');
  });
});
