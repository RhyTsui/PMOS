import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { SubprojectRegistry } from '../../src/core/subprojectRegistry';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-subproject-'));
  return new FileStore(root);
}

describe('SubprojectRegistry', () => {
  it('creates and loads a subproject manifest', async () => {
    const store = createStore();
    const registry = new SubprojectRegistry(store);

    const created = await registry.createSubproject({
      id: 'crm',
      name: 'CRM',
      description: '客户关系管理子项目',
    });
    const loaded = await registry.loadSubproject('crm');
    const memory = await store.read('subprojects/crm/docs/memory/project-memory.md');

    expect(created.id).toBe('crm');
    expect(loaded.name).toBe('CRM');
    expect(loaded.rootPath).toBe('subprojects/crm');
    expect(memory).toContain('projectId: crm');
    expect(memory).toContain('projectName: CRM');
  });

  it('lists subprojects and resolves project context', async () => {
    const store = createStore();
    const registry = new SubprojectRegistry(store);

    await registry.createSubproject({ id: 'crm', name: 'CRM' });
    await registry.createSubproject({ id: 'erp', name: 'ERP' });

    const subprojects = await registry.listSubprojects();
    const project = await registry.resolveProjectContext('erp');
    const platform = await registry.resolveProjectContext();

    expect(subprojects.map((item) => item.id)).toEqual(['crm', 'erp']);
    expect(project.subprojectId).toBe('erp');
    expect(project.projectRoot).toBe('subprojects/erp');
    expect(project.projectMemoryPath).toBe('subprojects/erp/docs/memory/project-memory.md');
    expect(platform.subprojectId).toBeNull();
    expect(platform.projectRoot).toBe('');
  });
});
