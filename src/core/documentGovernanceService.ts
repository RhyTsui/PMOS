import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { getDocumentGovernanceAuditPath, getDocumentGovernanceRegistryPath } from './projectPaths.js';
import type {
  DocumentGovernanceAudit,
  DocumentGovernanceAuditIssue,
  DocumentTruthSourceEntry,
  DocumentTruthSourceRegistry,
  DocumentTruthSourceStatus,
} from '../shared/schemas.js';

type UpsertDocumentTruthSourceInput = {
  id?: string | null;
  topicKey: string;
  subprojectId?: string | null;
  title: string;
  path: string;
  status?: DocumentTruthSourceStatus;
  tags?: string[];
  supersedes?: string[];
  successorPath?: string | null;
  note?: string | null;
};

export class DocumentGovernanceService {
  constructor(private readonly store: FileStore) {}

  async listEntries(subprojectId?: string | null) {
    const registry = await this.loadRegistry(subprojectId);
    return registry.entries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async upsertEntry(input: UpsertDocumentTruthSourceInput) {
    if (!input.topicKey.trim()) {
      throw new Error('document governance upsert requires topicKey.');
    }
    if (!input.path.trim()) {
      throw new Error('document governance upsert requires path.');
    }
    if (!input.title.trim()) {
      throw new Error('document governance upsert requires title.');
    }
    const now = new Date().toISOString();
    const registry = await this.loadRegistry(input.subprojectId ?? null);
    const existingIndex = registry.entries.findIndex(
      (entry) => entry.id === input.id || (!input.id && entry.topicKey === input.topicKey && entry.path === input.path),
    );
    const existing = existingIndex >= 0 ? registry.entries[existingIndex] : null;

    const entry: DocumentTruthSourceEntry = {
      id: existing?.id ?? input.id?.trim() ?? `doc-ts-${randomUUID()}`,
      topicKey: input.topicKey.trim(),
      subprojectId: input.subprojectId ?? existing?.subprojectId ?? null,
      title: input.title.trim(),
      path: this.normalizePath(input.path),
      status: input.status ?? existing?.status ?? 'draft',
      tags: this.normalizeStringList(input.tags ?? existing?.tags ?? []),
      supersedes: this.normalizeStringList(input.supersedes ?? existing?.supersedes ?? []),
      successorPath: input.successorPath?.trim() ? this.normalizePath(input.successorPath) : existing?.successorPath ?? null,
      note: input.note?.trim() ? input.note.trim() : existing?.note ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      registry.entries[existingIndex] = entry;
    } else {
      registry.entries.push(entry);
    }

    await this.writeRegistry(
      {
        ...registry,
        generatedAt: now,
      },
      input.subprojectId ?? null,
    );

    return entry;
  }

  async audit(subprojectId?: string | null) {
    const registry = await this.loadRegistry(subprojectId);
    const issues: DocumentGovernanceAuditIssue[] = [];
    const activeByTopic = new Map<string, DocumentTruthSourceEntry[]>();

    for (const entry of registry.entries) {
      if (entry.status === 'active') {
        activeByTopic.set(entry.topicKey, [...(activeByTopic.get(entry.topicKey) ?? []), entry]);
      }
      if (entry.status === 'superseded' && !entry.successorPath) {
        issues.push({
          code: 'superseded-without-successor',
          severity: 'block',
          topicKey: entry.topicKey,
          path: entry.path,
          relatedPaths: [],
          message: `Superseded truth source ${entry.path} is missing successorPath.`,
        });
      }
      if (entry.successorPath && !registry.entries.some((candidate) => candidate.path === entry.successorPath)) {
        issues.push({
          code: 'successor-not-registered',
          severity: 'warn',
          topicKey: entry.topicKey,
          path: entry.path,
          relatedPaths: [entry.successorPath],
          message: `Successor path ${entry.successorPath} is not registered in truth-source registry.`,
        });
      }
      if (!(await this.store.exists(entry.path))) {
        issues.push({
          code: 'entry-file-missing',
          severity: entry.status === 'deleted' ? 'warn' : 'block',
          topicKey: entry.topicKey,
          path: entry.path,
          relatedPaths: [],
          message: `Registered truth-source path ${entry.path} does not exist on disk.`,
        });
      }
    }

    for (const [topicKey, entries] of activeByTopic.entries()) {
      if (entries.length > 1) {
        issues.push({
          code: 'duplicate-active-topic',
          severity: 'block',
          topicKey,
          path: null,
          relatedPaths: entries.map((entry) => entry.path),
          message: `Topic ${topicKey} has ${entries.length} active truth sources.`,
        });
      }
    }

    const audit: DocumentGovernanceAudit = {
      generatedAt: new Date().toISOString(),
      subprojectId: subprojectId ?? null,
      entryCount: registry.entries.length,
      activeTopicCount: [...activeByTopic.keys()].length,
      issueCount: issues.length,
      issues,
      summary:
        issues.length === 0
          ? `Document governance audit passed with ${registry.entries.length} registered truth sources.`
          : `Document governance audit found ${issues.length} issue(s) across ${registry.entries.length} registered truth sources.`,
    };

    await this.store.writeJson(getDocumentGovernanceAuditPath(subprojectId), audit);
    return audit;
  }

  async readLatestAudit(subprojectId?: string | null) {
    const auditPath = getDocumentGovernanceAuditPath(subprojectId);
    if (!(await this.store.exists(auditPath))) {
      return null;
    }
    return this.store.readJson<DocumentGovernanceAudit>(auditPath);
  }

  private async loadRegistry(subprojectId?: string | null) {
    const registryPath = getDocumentGovernanceRegistryPath(subprojectId);
    if (!(await this.store.exists(registryPath))) {
      return {
        version: 1 as const,
        generatedAt: new Date(0).toISOString(),
        subprojectId: subprojectId ?? null,
        entries: [],
      } satisfies DocumentTruthSourceRegistry;
    }
    return this.store.readJson<DocumentTruthSourceRegistry>(registryPath);
  }

  private async writeRegistry(registry: DocumentTruthSourceRegistry, subprojectId?: string | null) {
    await this.store.writeJson(getDocumentGovernanceRegistryPath(subprojectId), registry);
  }

  private normalizePath(value: string) {
    return value.trim().replace(/\\/gu, '/');
  }

  private normalizeStringList(values: string[]) {
    return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
  }
}
