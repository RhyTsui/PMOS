import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { FileStore } from '../../src/core/fileStore.js';
import { MemoryService } from '../../src/core/memoryService.js';
import { LangGraphEngine } from '../../src/langgraph/index.js';
import { ChromaService } from '../../src/chroma/index.js';

function createFixture() {
  const tempDir = path.join(os.tmpdir(), `pmaios-framework-${Date.now()}`);
  const store = new FileStore(tempDir);
  const memoryService = new MemoryService(store);
  return { store, memoryService };
}

describe('Framework integration', () => {
  it('runs a basic LangGraph workflow end-to-end', async () => {
    const { store, memoryService } = createFixture();
    const engine = new LangGraphEngine(store, memoryService);

    await engine.initWorkflow({
      workflowId: 'test-workflow',
      stages: [
        {
          id: 'stage-1',
          label: 'Requirement Analysis',
          ownerRole: 'product-manager',
          description: 'Analyze user requirements',
          acceptanceCriteria: ['Requirement document produced'],
          requiredOutputs: [{ path: 'docs/requirements-*.md', kind: 'markdown' }],
          priority: 'high',
          capability: 'text',
          dependsOn: [],
          gate: { reviewRequired: true },
        },
        {
          id: 'stage-2',
          label: 'Design',
          ownerRole: 'designer',
          description: 'Create product design',
          acceptanceCriteria: ['Design artifact produced'],
          requiredOutputs: [{ path: 'docs/design-*.md', kind: 'markdown' }],
          priority: 'high',
          capability: 'text',
          dependsOn: ['stage-1'],
          gate: { reviewRequired: true },
        },
        {
          id: 'stage-3',
          label: 'Implementation',
          ownerRole: 'developer',
          description: 'Implement the feature',
          acceptanceCriteria: ['Code artifact produced'],
          requiredOutputs: [{ path: 'src/code-*.ts', kind: 'code' }],
          priority: 'high',
          capability: 'code',
          dependsOn: ['stage-2'],
          gate: { reviewRequired: false },
        },
      ],
      subprojectId: null,
    });

    const step1 = await engine.step();
    const step2 = await engine.step();
    const step3 = await engine.step();

    expect(step1.stages['stage-1']?.status).toBe('completed');
    expect(step2.stages['stage-2']?.status).toBe('completed');
    expect(step3.stages['stage-3']?.status).toBe('completed');
    expect(step3.status).toBe('completed');
  });

  it('falls back to in-memory Chroma collections when the remote server is unavailable', async () => {
    const { store, memoryService } = createFixture();
    const chromaService = new ChromaService(store, memoryService, {
      path: 'http://localhost:8000',
    });

    await chromaService.initialize();
    await chromaService.addDocuments('test-collection', [
      {
        id: 'doc-1',
        content: 'PMAIOS uses LangGraph for workflow orchestration.',
        metadata: { category: 'workflow' },
      },
      {
        id: 'doc-2',
        content: 'ChromaDB supports local vector search and retrieval.',
        metadata: { category: 'knowledge' },
      },
    ]);

    const results = await chromaService.search('test-collection', {
      query: 'workflow orchestration',
      topK: 2,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.content).toContain('workflow');
  });
});
