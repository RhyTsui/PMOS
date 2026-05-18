import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FrontendBrowserVerificationService } from '../../src/core/frontendBrowserVerificationService';
import type { TaskSsotTask } from '../../src/shared/schemas';

function createFrontendTask(artifactPaths: string[]): TaskSsotTask {
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
    artifactLinks: artifactPaths.map((artifactPath, index) => ({
      taskId: 'task-frontend',
      artifactType: 'doc',
      artifactId: `artifact-${index + 1}`,
      artifactPath,
      roleInTask: 'working-output' as const,
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

describe('FrontendBrowserVerificationService', () => {
  it('passes governed frontend traceability and component baseline checks', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-browser-verify-'));
    fs.mkdirSync(path.join(root, 'docs', 'multimodal'), { recursive: true });
    fs.mkdirSync(path.join(root, 'subprojects', 'ad', 'frontend', 'src'), { recursive: true });

    fs.writeFileSync(
      path.join(root, 'docs', 'multimodal', 'ui-schema-contract.json'),
      JSON.stringify({
        linkedRequirementIds: ['req-1', 'req-2'],
        designSystemBaseline: {
          primaryPageLibrary: 'ant-design-x',
          conversationRegionLibrary: 'ant-design-x',
          rules: ['默认前端框架使用 x.ant.design / Ant Design X', '对话区域继续使用 Ant Design X'],
        },
        pageContracts: [
          {
            route: '/workspace',
            classification: 'production',
            layoutShell: 'sidebar + content',
            targetRoles: ['operator'],
            blocks: [{ blockId: 'overview' }, { blockId: 'chat' }],
            actions: [{ actionId: 'open-detail' }, { actionId: 'submit-filter' }],
            states: [{ kind: 'default' }, { kind: 'loading' }, { kind: 'empty' }, { kind: 'error' }],
            dataRefs: [{ refId: 'list-1' }],
            componentBindings: [
              { blockId: 'overview', library: 'ant-design', componentName: 'Table' },
              { blockId: 'chat', library: 'ant-design-x', componentName: 'Bubble.List' },
            ],
          },
        ],
        implementationRules: ['前端实现必须优先消费 pageContracts / blocks / states / actions / dataRefs / componentBindings，并遵循 x.ant.design / Ant Design X ecosystem 基线。'],
      }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(root, 'subprojects', 'ad', 'frontend', 'src', 'App.jsx'),
      'export function App(){ return <section className="enterprise-shell ant-design"><div className="results-panel" /></section>; }',
      'utf8',
    );

    const service = new FrontendBrowserVerificationService(root);
    const report = service.evaluateTask(
      createFrontendTask([
        'docs/multimodal/ui-schema-contract.json',
        'subprojects/ad/frontend/src/App.jsx',
      ]),
      null,
    );

    expect(report.applicable).toBe(true);
    expect(report.status).toBe('warn');
    expect(report.checks.some((check) => check.id === 'upstream-traceability' && check.status === 'pass')).toBe(true);
    expect(report.checks.some((check) => check.id === 'governed-component-baseline' && check.status === 'pass')).toBe(true);
    expect(report.checks.some((check) => check.id === 'page-contract-coverage' && check.status === 'pass')).toBe(true);
    expect(report.checks.some((check) => check.id === 'anti-pattern-ban' && check.status === 'pass')).toBe(true);
    expect(report.checks.some((check) => check.id === 'browser-evidence-anchor' && check.status === 'warn')).toBe(true);
  });

  it('blocks frontend packages that miss final-page traceability and component bindings', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-browser-verify-'));
    fs.mkdirSync(path.join(root, 'docs', 'multimodal'), { recursive: true });

    fs.writeFileSync(
      path.join(root, 'docs', 'multimodal', 'ui-schema-contract.json'),
      JSON.stringify({
        linkedRequirementIds: [],
        designSystemBaseline: {
          primaryPageLibrary: 'ant-design-x',
          conversationRegionLibrary: 'ant-design-x',
          rules: [],
        },
        pageContracts: [
          {
            classification: 'production',
            blocks: [{ blockId: 'overview' }],
            actions: [{ actionId: 'open-detail' }],
            states: [{ kind: 'default' }, { kind: 'loading' }, { kind: 'empty' }, { kind: 'error' }],
            componentBindings: [],
          },
        ],
        implementationRules: ['pageContracts only'],
      }),
      'utf8',
    );

    const service = new FrontendBrowserVerificationService(root);
    const report = service.evaluateTask(createFrontendTask(['docs/multimodal/ui-schema-contract.json']), null);

    expect(report.status).toBe('block');
    expect(report.checks.some((check) => check.id === 'upstream-traceability' && check.status === 'block')).toBe(true);
    expect(report.checks.some((check) => check.id === 'governed-component-baseline' && check.status === 'block')).toBe(true);
  });

  it('blocks frontend packages that still carry banned claude-style shell patterns', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-browser-verify-'));
    fs.mkdirSync(path.join(root, 'subprojects', 'ad', 'frontend', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'subprojects', 'ad', 'frontend', 'src', 'App.jsx'),
      'export function App(){ return <section className="summary-card hero-workbench">Claude shell</section>; }',
      'utf8',
    );

    const service = new FrontendBrowserVerificationService(root);
    const report = service.evaluateTask(
      createFrontendTask(['subprojects/ad/frontend/src/App.jsx']),
      null,
    );

    expect(report.status).toBe('block');
    expect(report.checks.some((check) => check.id === 'anti-pattern-ban' && check.status === 'block')).toBe(true);
  });
});
