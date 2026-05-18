import { describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { RequirementExcelPoolService } from '../../src/core/requirementExcelPoolService';
import type { Requirement } from '../../src/shared/schemas';

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-req-pool-'));
  const store = new FileStore(root);
  const memoryService = new MemoryService(store);
  const service = new RequirementExcelPoolService(store, memoryService);
  return { store, memoryService, service };
}

function buildRequirement(overrides: Partial<Requirement> = {}): Requirement {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? 'req-existing',
    subprojectId: overrides.subprojectId ?? null,
    title: overrides.title ?? 'Existing requirement',
    description: overrides.description ?? 'Existing description',
    category: overrides.category ?? 'feature',
    status: overrides.status ?? 'draft',
    priority: overrides.priority ?? 'P1',
    source: overrides.source ?? {
      kind: 'manual',
      sessionId: null,
      messageId: null,
      runId: null,
    },
    trace: overrides.trace ?? {
      relatedRequirementIds: [],
      linkedVersionIds: [],
      linkedRunIds: [],
      artifactPaths: [],
    },
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    metadata: overrides.metadata ?? {
      poolScope: 'platform',
      lifecycle: 'normalized',
    },
  };
}

describe('RequirementExcelPoolService', () => {
  it('exports requirements into an Excel workbook with governed columns', async () => {
    const { memoryService, service, store } = createFixture();
    await memoryService.saveRequirement(
      buildRequirement({
        metadata: {
          poolScope: 'platform',
          lifecycle: 'promoted',
          linkedTaskIds: ['task-1'],
          linkedGateIds: ['gate-1'],
          linkedOutputIds: ['output-1'],
          owner: 'pmos',
        },
        trace: {
          relatedRequirementIds: ['req-related'],
          linkedVersionIds: ['ver-1'],
          linkedRunIds: ['run-1'],
          artifactPaths: ['docs/a.md'],
        },
      }),
    );

    const result = await service.exportWorkbook('docs/operations/test-requirement-pool.xlsx');
    const workbook = XLSX.read(await store.read(result.outputPath, 'binary'), { type: 'binary' });
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets['Requirement Pool'], {
      defval: '',
      raw: false,
    });

    expect(result.rowCount).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('req-existing');
    expect(rows[0]?.pool_scope).toBe('platform');
    expect(rows[0]?.lifecycle).toBe('promoted');
    expect(rows[0]?.linked_task_ids).toContain('task-1');
    expect(rows[0]?.linked_gate_ids).toContain('gate-1');
    expect(rows[0]?.linked_output_ids).toContain('output-1');
  });

  it('imports workbook rows by updating existing requirements and creating new ones', async () => {
    const { memoryService, service, store } = createFixture();
    await memoryService.saveRequirement(
      buildRequirement({
        id: 'req-existing',
        title: 'Old title',
        description: 'Old description',
        metadata: {
          poolScope: 'platform',
          lifecycle: 'normalized',
        },
      }),
    );

    await service.exportWorkbook('docs/operations/test-requirement-pool.xlsx');
    const workbook = XLSX.read(await store.read('docs/operations/test-requirement-pool.xlsx', 'binary'), {
      type: 'binary',
    });
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets['Requirement Pool'], {
      defval: '',
      raw: false,
    });

    rows[0] = {
      ...rows[0],
      title: 'Updated title',
      description: 'Updated description',
      status: 'active',
      lifecycle: 'active',
      linked_task_ids: 'task-a\ntask-b',
      linked_gate_ids: 'gate-a',
      linked_output_ids: 'output-a',
      owner: 'real-pm',
      notes: 'updated from excel',
    };
    rows.push({
      id: '',
      pool_scope: 'platform',
      subproject_id: '',
      title: 'New requirement from Excel',
      description: 'Created by import',
      category: 'architecture',
      priority: 'P0',
      status: 'draft',
      lifecycle: 'normalized',
      source_kind: 'meeting-note',
      source_entity_type: 'document',
      source_entity_id: 'mtg-1',
      source_path: 'docs/context/meeting.md',
      source_label: 'meeting notes',
      source_session_id: '',
      source_message_id: '',
      source_run_id: '',
      linked_requirement_ids: '',
      linked_version_ids: '',
      linked_run_ids: '',
      linked_task_ids: 'task-new',
      linked_gate_ids: '',
      linked_output_ids: '',
      artifact_paths: 'docs/evidence/new.md',
      owner: 'virtual-pm',
      notes: 'seeded from workbook',
      created_at: '',
      updated_at: '',
    });

    workbook.Sheets['Requirement Pool'] = XLSX.utils.json_to_sheet(rows);
    await store.writeBytes(
      'docs/operations/test-requirement-pool.xlsx',
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    );

    const result = await service.importWorkbook('docs/operations/test-requirement-pool.xlsx');
    const updated = await memoryService.loadRequirement('req-existing');
    const allRequirements = await memoryService.listRequirements();
    const created = allRequirements.find((item) => item.title === 'New requirement from Excel');

    expect(result.updatedCount).toBe(1);
    expect(result.createdCount).toBe(1);
    expect(updated.title).toBe('Updated title');
    expect(updated.status).toBe('active');
    expect(updated.metadata.lifecycle).toBe('active');
    expect(updated.metadata.linkedTaskIds).toEqual(['task-a', 'task-b']);
    expect(updated.metadata.owner).toBe('real-pm');
    expect(created).toBeTruthy();
    expect(created?.priority).toBe('P0');
    expect(created?.source.kind).toBe('meeting-note');
    expect(created?.metadata.linkedTaskIds).toEqual(['task-new']);
  });
});
