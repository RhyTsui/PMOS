import { randomUUID } from 'node:crypto';
import { MemoryService } from './memoryService.js';
import type { VersionEntry } from '../shared/schemas.js';

export class VersionRegistry {
  constructor(private readonly memoryService: MemoryService) {}

  async listEntries(subprojectId?: string | null) {
    return this.memoryService.listVersionEntries(subprojectId);
  }

  async createEntry(input: {
    subprojectId?: string | null;
    entityType: VersionEntry['entityType'];
    entityId: string;
    changeType: string;
    summary: string;
    previousVersion?: string | null;
    newVersion?: string | null;
    requirementIds?: string[];
    runId?: string | null;
    artifactPaths?: string[];
    triggeredBy?: VersionEntry['triggeredBy'];
    metadata?: Record<string, unknown>;
  }) {
    const entry: VersionEntry = {
      id: `ver-${randomUUID()}`,
      subprojectId: input.subprojectId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      changeType: input.changeType,
      summary: input.summary.trim(),
      previousVersion: input.previousVersion ?? null,
      newVersion: input.newVersion ?? null,
      requirementIds: input.requirementIds ?? [],
      runId: input.runId ?? null,
      artifactPaths: input.artifactPaths ?? [],
      triggeredBy: input.triggeredBy ?? 'system',
      createdAt: new Date().toISOString(),
      metadata: input.metadata ?? {},
    };

    await this.memoryService.saveVersionEntry(entry);
    await this.backfillRequirementLinks(entry);
    return entry;
  }

  private async backfillRequirementLinks(entry: VersionEntry) {
    await Promise.all(
      entry.requirementIds.map(async (requirementId) => {
        try {
          const requirement = await this.memoryService.loadRequirement(requirementId, entry.subprojectId);
          const next = {
            ...requirement,
            updatedAt: new Date().toISOString(),
            trace: {
              relatedRequirementIds: requirement.trace.relatedRequirementIds,
              linkedVersionIds: [...new Set([...requirement.trace.linkedVersionIds, entry.id])],
              linkedRunIds: [
                ...new Set(
                  entry.runId
                    ? [...requirement.trace.linkedRunIds, entry.runId]
                    : requirement.trace.linkedRunIds,
                ),
              ],
              artifactPaths: [...new Set([...requirement.trace.artifactPaths, ...entry.artifactPaths])],
            },
          };
          await this.memoryService.saveRequirement(next);
        } catch {
          // Ignore missing requirements so version logging remains append-only.
        }
      }),
    );
  }
}
