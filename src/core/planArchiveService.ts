import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { FileStore } from './fileStore.js';
import { getPlanArchiveDirectoryPath, getPlanArchiveIndexPath } from './projectPaths.js';
import {
  PlanArchiveIndexSchema,
  type PlanArchiveIndex,
  type PlanArchiveRecord,
  type PlanArchiveSource,
} from '../shared/schemas.js';

type ArchivePlanInput = {
  title: string;
  content: string;
  source: PlanArchiveSource;
  subprojectId?: string | null;
  taskId?: string | null;
  planThreadId?: string | null;
  triggerRef?: string | null;
  createdAt?: string | null;
};

export class PlanArchiveService {
  constructor(private readonly store: FileStore) {}

  async archivePlan(input: ArchivePlanInput) {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title) {
      throw new Error('plan archive requires title.');
    }
    if (!content) {
      throw new Error('plan archive requires content.');
    }

    const subprojectId = input.subprojectId ?? null;
    const index = await this.loadIndex(subprojectId);
    const contentHash = this.hashContent(content);
    const existingDuplicate = this.findActiveDuplicate(index, {
      contentHash,
      source: input.source,
      taskId: input.taskId ?? null,
      planThreadId: input.planThreadId ?? null,
    });
    if (existingDuplicate) {
      return { record: existingDuplicate, index, duplicate: true };
    }

    const now = input.createdAt?.trim() || new Date().toISOString();
    const planThreadId = input.planThreadId?.trim() || `plan-thread-${randomUUID()}`;
    const threadRecords = index.records
      .filter((record) => record.planThreadId === planThreadId)
      .sort((left, right) => right.version - left.version);
    const previousActive = threadRecords.find((record) => record.status === 'active') ?? threadRecords[0] ?? null;
    const version = (threadRecords[0]?.version ?? 0) + 1;
    const archivePath = await this.buildArchivePath({
      subprojectId,
      createdAt: now,
      title,
      version,
    });

    const record: PlanArchiveRecord = {
      id: `plan-archive-${randomUUID()}`,
      planThreadId,
      version,
      status: 'active',
      title,
      summary: this.summarize(content),
      source: input.source,
      subprojectId,
      taskId: input.taskId?.trim() || null,
      triggerRef: input.triggerRef?.trim() || null,
      path: archivePath,
      supersedes: previousActive?.path ?? null,
      latestPath: archivePath,
      contentHash,
      createdAt: now,
      updatedAt: now,
    };

    const nextRecords = index.records.map((candidate) =>
      candidate.planThreadId === planThreadId
        ? {
            ...candidate,
            status: 'superseded' as const,
            latestPath: archivePath,
            updatedAt: now,
          }
        : candidate,
    );
    nextRecords.push(record);

    const nextIndex: PlanArchiveIndex = {
      version: 1,
      generatedAt: now,
      subprojectId,
      records: nextRecords.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    };

    await this.store.write(archivePath, this.renderMarkdown(record, content));
    await this.store.writeJson(getPlanArchiveIndexPath(subprojectId), nextIndex);

    return { record, index: nextIndex, duplicate: false };
  }

  async listArchives(input?: {
    subprojectId?: string | null;
    source?: PlanArchiveSource | null;
    limit?: number | null;
  }) {
    const index = await this.loadIndex(input?.subprojectId ?? null);
    const source = input?.source ?? null;
    const limit = input?.limit ?? null;
    const records = source ? index.records.filter((record) => record.source === source) : index.records;
    return typeof limit === 'number' && limit > 0 ? records.slice(0, limit) : records;
  }

  async getArchive(archiveId: string, subprojectId?: string | null) {
    const index = await this.loadIndex(subprojectId ?? null);
    const record = index.records.find((candidate) => candidate.id === archiveId || candidate.path === archiveId) ?? null;
    if (!record) {
      return null;
    }
    const content = await this.store.read(record.path);
    return { record, content };
  }

  async loadIndex(subprojectId?: string | null): Promise<PlanArchiveIndex> {
    const indexPath = getPlanArchiveIndexPath(subprojectId ?? null);
    if (!(await this.store.exists(indexPath))) {
      return {
        version: 1,
        generatedAt: new Date(0).toISOString(),
        subprojectId: subprojectId ?? null,
        records: [],
      };
    }
    const parsed = PlanArchiveIndexSchema.safeParse(await this.store.readJson<unknown>(indexPath));
    return parsed.success
      ? parsed.data
      : {
          version: 1,
          generatedAt: new Date(0).toISOString(),
          subprojectId: subprojectId ?? null,
          records: [],
        };
  }

  private findActiveDuplicate(
    index: PlanArchiveIndex,
    input: {
      contentHash: string;
      source: PlanArchiveSource;
      taskId: string | null;
      planThreadId: string | null;
    },
  ) {
    return index.records.find((record) => {
      if (record.status !== 'active' || record.contentHash !== input.contentHash || record.source !== input.source) {
        return false;
      }
      if (input.planThreadId) {
        return record.planThreadId === input.planThreadId;
      }
      return record.taskId === input.taskId;
    }) ?? null;
  }

  private async buildArchivePath(input: {
    subprojectId: string | null;
    createdAt: string;
    title: string;
    version: number;
  }) {
    const stamp = this.formatStamp(input.createdAt);
    const yearMonth = stamp.slice(0, 7).replace('-', '/');
    const slug = this.slugify(input.title);
    const archiveDir = getPlanArchiveDirectoryPath(input.subprojectId);
    let candidate = path.posix.join(archiveDir, yearMonth, `${stamp}-${slug}-v${input.version}.md`);
    let suffix = 2;
    while (await this.store.exists(candidate)) {
      candidate = path.posix.join(archiveDir, yearMonth, `${stamp}-${slug}-v${input.version}-${suffix}.md`);
      suffix += 1;
    }
    return candidate;
  }

  private renderMarkdown(record: PlanArchiveRecord, content: string) {
    return [
      '---',
      `id: ${record.id}`,
      `planThreadId: ${record.planThreadId}`,
      `version: ${record.version}`,
      `status: ${record.status}`,
      `source: ${record.source}`,
      `subprojectId: ${record.subprojectId ?? ''}`,
      `taskId: ${record.taskId ?? ''}`,
      `triggerRef: ${record.triggerRef ?? ''}`,
      `supersedes: ${record.supersedes ?? ''}`,
      `latestPath: ${record.latestPath}`,
      `contentHash: ${record.contentHash}`,
      `createdAt: ${record.createdAt}`,
      '---',
      '',
      `# ${record.title}`,
      '',
      '## Context',
      '',
      `- source: \`${record.source}\``,
      `- planThreadId: \`${record.planThreadId}\``,
      `- version: \`v${record.version}\``,
      `- status: \`${record.status}\``,
      record.supersedes ? `- supersedes: \`${record.supersedes}\`` : '- supersedes: -',
      record.taskId ? `- taskId: \`${record.taskId}\`` : '- taskId: -',
      record.triggerRef ? `- triggerRef: \`${record.triggerRef}\`` : '- triggerRef: -',
      '',
      '## Plan',
      '',
      content,
      '',
      '## Trace',
      '',
      `- archivedAt: ${record.createdAt}`,
      `- contentHash: \`${record.contentHash}\``,
      '',
    ].join('\n');
  }

  private hashContent(content: string) {
    return createHash('sha256').update(content).digest('hex');
  }

  private summarize(content: string) {
    const line = content
      .split(/\r?\n/u)
      .map((item) => item.trim())
      .find((item) => item && !item.startsWith('#') && !item.startsWith('---'));
    return line?.slice(0, 180) ?? null;
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFKD')
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .toLowerCase()
      .slice(0, 60);
    return slug || 'plan';
  }

  private formatStamp(value: string) {
    const date = new Date(value);
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const pad = (input: number) => input.toString().padStart(2, '0');
    return [
      validDate.getFullYear(),
      pad(validDate.getMonth() + 1),
      pad(validDate.getDate()),
    ].join('-') + `-${pad(validDate.getHours())}${pad(validDate.getMinutes())}${pad(validDate.getSeconds())}`;
  }
}
