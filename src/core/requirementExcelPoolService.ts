import { randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
import { MemoryService } from './memoryService.js';
import { FileStore } from './fileStore.js';
import { getProjectRoot, prefixProjectPath } from './projectPaths.js';
import type { Requirement } from '../shared/schemas.js';

const REQUIREMENT_POOL_SHEET = 'Requirement Pool';
const README_SHEET = 'README';
const ARRAY_DELIMITER = '\n';

type RequirementPoolScope = 'platform' | 'subproject';
type RequirementPoolLifecycle =
  | 'raw-signal'
  | 'normalized'
  | 'promoted'
  | 'active'
  | 'solved'
  | 'archived'
  | 'rejected';

type RequirementExcelRow = {
  id: string;
  pool_scope: RequirementPoolScope;
  subproject_id: string;
  title: string;
  description: string;
  category: Requirement['category'];
  priority: Requirement['priority'];
  status: Requirement['status'];
  lifecycle: RequirementPoolLifecycle;
  source_kind: Requirement['source']['kind'];
  source_entity_type: string;
  source_entity_id: string;
  source_path: string;
  source_label: string;
  source_session_id: string;
  source_message_id: string;
  source_run_id: string;
  linked_requirement_ids: string;
  linked_version_ids: string;
  linked_run_ids: string;
  linked_task_ids: string;
  linked_gate_ids: string;
  linked_output_ids: string;
  artifact_paths: string;
  owner: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type RequirementPoolWorkbookSummary = {
  outputPath: string;
  poolScope: RequirementPoolScope;
  subprojectId: string | null;
  rowCount: number;
};

export class RequirementExcelPoolService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
  ) {}

  async exportWorkbook(outputPath?: string, subprojectId?: string | null): Promise<RequirementPoolWorkbookSummary> {
    const normalizedSubprojectId = normalizeSubprojectId(subprojectId);
    const requirements = await this.memoryService.listRequirements(normalizedSubprojectId);
    const workbook = this.buildWorkbook(requirements, normalizedSubprojectId);
    const targetPath = outputPath?.trim() || this.getDefaultWorkbookPath(normalizedSubprojectId);
    await this.writeWorkbook(targetPath, workbook);

    return {
      outputPath: targetPath,
      poolScope: normalizedSubprojectId ? 'subproject' : 'platform',
      subprojectId: normalizedSubprojectId,
      rowCount: requirements.length,
    };
  }

  async importWorkbook(inputPath: string, subprojectId?: string | null) {
    if (!inputPath.trim()) {
      throw new Error('requirement-pool import requires an input workbook path.');
    }

    const normalizedSubprojectId = normalizeSubprojectId(subprojectId);
    const workbook = XLSX.read(await this.store.read(inputPath, 'binary'), { type: 'binary' });
    const sheet = workbook.Sheets[REQUIREMENT_POOL_SHEET];
    if (!sheet) {
      throw new Error(`Workbook is missing sheet "${REQUIREMENT_POOL_SHEET}".`);
    }

    const rows = XLSX.utils.sheet_to_json<Partial<RequirementExcelRow>>(sheet, {
      defval: '',
      raw: false,
    });
    const touchedRequirementIds: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const normalizedRow = this.normalizeRow(row, normalizedSubprojectId);
      if (!normalizedRow) {
        continue;
      }

      const existingRequirement = normalizedRow.id
        ? await this.tryLoadRequirement(normalizedRow.id, normalizedRow.subproject_id || normalizedSubprojectId)
        : null;

      if (existingRequirement) {
        const updated = await this.updateRequirementFromRow(existingRequirement, normalizedRow);
        touchedRequirementIds.push(updated.id);
        updatedCount += 1;
        continue;
      }

      const created = await this.createRequirementFromRow(normalizedRow);
      touchedRequirementIds.push(created.id);
      createdCount += 1;
    }

    return {
      inputPath,
      poolScope: normalizedSubprojectId ? 'subproject' : 'platform',
      subprojectId: normalizedSubprojectId,
      createdCount,
      updatedCount,
      touchedRequirementIds,
    };
  }

  getDefaultWorkbookPath(subprojectId?: string | null) {
    const normalizedSubprojectId = normalizeSubprojectId(subprojectId);
    const projectRoot = getProjectRoot(normalizedSubprojectId);
    return prefixProjectPath(projectRoot, 'docs/operations/requirement-pool.xlsx');
  }

  private buildWorkbook(requirements: Requirement[], subprojectId?: string | null) {
    const rows = requirements.map((requirement) => this.requirementToRow(requirement));
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: this.getHeaders(),
    });
    XLSX.utils.book_append_sheet(workbook, sheet, REQUIREMENT_POOL_SHEET);

    const readme = XLSX.utils.aoa_to_sheet([
      ['Requirement Pool Workbook'],
      ['pool_scope: platform | subproject'],
      ['lifecycle: raw-signal | normalized | promoted | active | solved | archived | rejected'],
      ['linked_* 字段使用换行分隔多个值。'],
      ['导入时按 id 优先更新；没有 id 时会创建新 requirement。'],
      [`当前作用域: ${subprojectId ? `subproject:${subprojectId}` : 'platform'}`],
    ]);
    XLSX.utils.book_append_sheet(workbook, readme, README_SHEET);

    return workbook;
  }

  private getHeaders(): Array<keyof RequirementExcelRow> {
    return [
      'id',
      'pool_scope',
      'subproject_id',
      'title',
      'description',
      'category',
      'priority',
      'status',
      'lifecycle',
      'source_kind',
      'source_entity_type',
      'source_entity_id',
      'source_path',
      'source_label',
      'source_session_id',
      'source_message_id',
      'source_run_id',
      'linked_requirement_ids',
      'linked_version_ids',
      'linked_run_ids',
      'linked_task_ids',
      'linked_gate_ids',
      'linked_output_ids',
      'artifact_paths',
      'owner',
      'notes',
      'created_at',
      'updated_at',
    ];
  }

  private requirementToRow(requirement: Requirement): RequirementExcelRow {
    const metadata = requirement.metadata ?? {};
    return {
      id: requirement.id,
      pool_scope: metadata.poolScope === 'subproject' ? 'subproject' : 'platform',
      subproject_id: requirement.subprojectId ?? '',
      title: requirement.title,
      description: requirement.description,
      category: requirement.category,
      priority: requirement.priority,
      status: requirement.status,
      lifecycle: normalizeLifecycle(metadata.lifecycle),
      source_kind: requirement.source.kind,
      source_entity_type: stringifyValue(requirement.source.sourceRef?.entityType),
      source_entity_id: stringifyValue(requirement.source.sourceRef?.entityId),
      source_path: stringifyValue(requirement.source.sourceRef?.path),
      source_label: stringifyValue(requirement.source.sourceRef?.label),
      source_session_id: stringifyValue(requirement.source.sessionId),
      source_message_id: stringifyValue(requirement.source.messageId),
      source_run_id: stringifyValue(requirement.source.runId),
      linked_requirement_ids: joinArray(requirement.trace.relatedRequirementIds),
      linked_version_ids: joinArray(requirement.trace.linkedVersionIds),
      linked_run_ids: joinArray(requirement.trace.linkedRunIds),
      linked_task_ids: joinArray(asStringArray(metadata.linkedTaskIds)),
      linked_gate_ids: joinArray(asStringArray(metadata.linkedGateIds)),
      linked_output_ids: joinArray(asStringArray(metadata.linkedOutputIds)),
      artifact_paths: joinArray(requirement.trace.artifactPaths),
      owner: stringifyValue(metadata.owner),
      notes: stringifyValue(metadata.notes),
      created_at: requirement.createdAt,
      updated_at: requirement.updatedAt,
    };
  }

  private normalizeRow(
    row: Partial<RequirementExcelRow>,
    forcedSubprojectId?: string | null,
  ): RequirementExcelRow | null {
    const title = stringifyValue(row.title).trim();
    const description = stringifyValue(row.description).trim();
    if (!title && !description && !stringifyValue(row.id).trim()) {
      return null;
    }

    const normalizedSubprojectId =
      forcedSubprojectId ?? normalizeSubprojectId(row.subproject_id) ?? null;
    const poolScope = normalizedSubprojectId ? 'subproject' : normalizePoolScope(row.pool_scope);

    return {
      id: stringifyValue(row.id).trim(),
      pool_scope: poolScope,
      subproject_id: normalizedSubprojectId ?? '',
      title,
      description,
      category: normalizeCategory(row.category),
      priority: normalizePriority(row.priority),
      status: normalizeStatus(row.status),
      lifecycle: normalizeLifecycle(row.lifecycle),
      source_kind: normalizeSourceKind(row.source_kind),
      source_entity_type: stringifyValue(row.source_entity_type),
      source_entity_id: stringifyValue(row.source_entity_id),
      source_path: stringifyValue(row.source_path),
      source_label: stringifyValue(row.source_label),
      source_session_id: stringifyValue(row.source_session_id),
      source_message_id: stringifyValue(row.source_message_id),
      source_run_id: stringifyValue(row.source_run_id),
      linked_requirement_ids: stringifyValue(row.linked_requirement_ids),
      linked_version_ids: stringifyValue(row.linked_version_ids),
      linked_run_ids: stringifyValue(row.linked_run_ids),
      linked_task_ids: stringifyValue(row.linked_task_ids),
      linked_gate_ids: stringifyValue(row.linked_gate_ids),
      linked_output_ids: stringifyValue(row.linked_output_ids),
      artifact_paths: stringifyValue(row.artifact_paths),
      owner: stringifyValue(row.owner),
      notes: stringifyValue(row.notes),
      created_at: stringifyValue(row.created_at),
      updated_at: stringifyValue(row.updated_at),
    };
  }

  private async createRequirementFromRow(row: RequirementExcelRow) {
    const now = new Date().toISOString();
    const requirement: Requirement = {
      id: row.id || `req-${randomUUID()}`,
      subprojectId: normalizeSubprojectId(row.subproject_id),
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      priority: row.priority,
      source: {
        kind: row.source_kind,
        sessionId: row.source_session_id || null,
        messageId: row.source_message_id || null,
        runId: row.source_run_id || null,
        sourceRef: buildSourceRef(row),
      },
      trace: {
        relatedRequirementIds: splitArray(row.linked_requirement_ids),
        linkedVersionIds: splitArray(row.linked_version_ids),
        linkedRunIds: splitArray(row.linked_run_ids),
        artifactPaths: splitArray(row.artifact_paths),
      },
      createdAt: row.created_at || now,
      updatedAt: now,
      metadata: {
        poolScope: row.pool_scope,
        lifecycle: row.lifecycle,
        linkedTaskIds: splitArray(row.linked_task_ids),
        linkedGateIds: splitArray(row.linked_gate_ids),
        linkedOutputIds: splitArray(row.linked_output_ids),
        owner: row.owner || undefined,
        notes: row.notes || undefined,
      },
    };

    await this.memoryService.saveRequirement(requirement);
    return requirement;
  }

  private async updateRequirementFromRow(existingRequirement: Requirement, row: RequirementExcelRow) {
    const next: Requirement = {
      ...existingRequirement,
      title: row.title || existingRequirement.title,
      description: row.description || existingRequirement.description,
      category: row.category,
      status: row.status,
      priority: row.priority,
      source: {
        kind: row.source_kind,
        sessionId: row.source_session_id || null,
        messageId: row.source_message_id || null,
        runId: row.source_run_id || null,
        sourceRef: buildSourceRef(row),
      },
      trace: {
        relatedRequirementIds: splitArray(row.linked_requirement_ids),
        linkedVersionIds: splitArray(row.linked_version_ids),
        linkedRunIds: splitArray(row.linked_run_ids),
        artifactPaths: splitArray(row.artifact_paths),
      },
      updatedAt: new Date().toISOString(),
      metadata: {
        ...existingRequirement.metadata,
        poolScope: row.pool_scope,
        lifecycle: row.lifecycle,
        linkedTaskIds: splitArray(row.linked_task_ids),
        linkedGateIds: splitArray(row.linked_gate_ids),
        linkedOutputIds: splitArray(row.linked_output_ids),
        owner: row.owner || undefined,
        notes: row.notes || undefined,
      },
    };

    await this.memoryService.saveRequirement(next);
    return next;
  }

  private async tryLoadRequirement(requirementId: string, subprojectId?: string | null) {
    try {
      return await this.memoryService.loadRequirement(requirementId, subprojectId);
    } catch {
      return null;
    }
  }

  private async writeWorkbook(relativePath: string, workbook: XLSX.WorkBook) {
    const data = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    await this.store.writeBytes(relativePath, bytes);
  }
}

function normalizeSubprojectId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizePoolScope(value: unknown): RequirementPoolScope {
  return value === 'subproject' ? 'subproject' : 'platform';
}

function normalizeCategory(value: unknown): Requirement['category'] {
  if (value === 'bug' || value === 'architecture') {
    return value;
  }
  return 'feature';
}

function normalizePriority(value: unknown): Requirement['priority'] {
  if (value === 'P0' || value === 'P2') {
    return value;
  }
  return 'P1';
}

function normalizeStatus(value: unknown): Requirement['status'] {
  if (value === 'active' || value === 'done' || value === 'archived') {
    return value;
  }
  return 'draft';
}

function normalizeLifecycle(value: unknown): RequirementPoolLifecycle {
  switch (value) {
    case 'raw-signal':
    case 'promoted':
    case 'active':
    case 'solved':
    case 'archived':
    case 'rejected':
      return value;
    default:
      return 'normalized';
  }
}

function normalizeSourceKind(value: unknown): Requirement['source']['kind'] {
  switch (value) {
    case 'chat':
    case 'manual':
    case 'document':
    case 'product-output':
    case 'capability':
    case 'workflow':
    case 'version':
    case 'document-normalization':
    case 'meeting-note':
    case 'runtime-gate-event':
    case 'acceptance-review':
    case 'auto-capture':
      return value;
    default:
      return 'manual';
  }
}

function stringifyValue(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function splitArray(value: string) {
  return value
    .split(/\r?\n/gu)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinArray(values: string[]) {
  return values.join(ARRAY_DELIMITER);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => stringifyValue(item)).filter(Boolean);
}

function buildSourceRef(row: RequirementExcelRow) {
  const sourceRef = {
    entityType: row.source_entity_type || null,
    entityId: row.source_entity_id || null,
    path: row.source_path || null,
    label: row.source_label || null,
  };
  return Object.values(sourceRef).some((value) => value !== null) ? sourceRef : undefined;
}
