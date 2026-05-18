import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { DocumentationNormalizationService } from '../../src/core/documentationNormalizationService';
import { MemoryService } from '../../src/core/memoryService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-docnorm-'));
  return new FileStore(root);
}

describe('DocumentationNormalizationService', () => {
  it('normalizes inbox documents into auditable requirements and version entries', async () => {
    const store = createStore();
    await store.write('docs/sources/inbox/ad-roadmap-note.md', '# Roadmap Note\n\nP0: schema UI must be planned before release.\n');
    await store.write('docs/sources/inbox/meeting-notes.md', '# Meeting Notes\n\n- Need owner confirmation chain for release gate.\n');
    await store.write('docs/sources/inbox/raw-upload.xlsx', 'binary-placeholder');
    const service = new DocumentationNormalizationService(store);

    const run = await service.normalize();

    expect(run.status).toBe('completed');
    expect(run.normalizedSources).toHaveLength(3);
    expect(run.requirementIds).toHaveLength(3);
    expect(run.versionEntryIds).toHaveLength(3);

    const memoryService = new MemoryService(store);
    const markdownSource = run.normalizedSources.find((source) => source.sourcePath.endsWith('ad-roadmap-note.md'))!;
    const requirement = await memoryService.loadRequirement(markdownSource.requirementId);
    const versionEntry = await memoryService.loadVersionEntry(markdownSource.versionEntryId);
    const extractedRequirement = await memoryService.loadRequirement(markdownSource.extractedRequirementIds[0]!);

    expect(await store.read(markdownSource.artifactPath)).toContain('contains:ui-scope');
    expect(markdownSource.backgroundContextPath).toContain('docs/context/project/inbox-background/');
    expect(markdownSource.projectContextPaths.length).toBeGreaterThan(0);
    expect(markdownSource.projectContextPaths[0]).toContain('docs/context/project/by-tag/');
    expect(markdownSource.sourceFingerprint).toBeTruthy();
    expect(markdownSource.notionPageId).toBeNull();
    expect(markdownSource.notionPageUrl).toBeNull();
    expect(requirement.priority).toBe('P0');
    expect(requirement.source.kind).toBe('document-normalization');
    expect(requirement.source.sourceRef?.path).toBe(markdownSource.sourcePath);
    expect(requirement.trace.linkedVersionIds).toContain(versionEntry.id);
    expect(requirement.trace.artifactPaths).toContain(markdownSource.artifactPath);
    expect(requirement.trace.artifactPaths).toContain(markdownSource.projectContextPaths[0]);
    expect(markdownSource.extractedRequirementIds).toHaveLength(1);
    expect(extractedRequirement.title).toContain('Extracted source requirement');
    expect(extractedRequirement.source.kind).toBe('document');
    expect(extractedRequirement.source.sourceRef?.path).toBe(markdownSource.sourcePath);
    expect(extractedRequirement.trace.artifactPaths).toContain(markdownSource.artifactPath);
    expect(versionEntry.entityType).toBe('document-normalization');
    expect(versionEntry.requirementIds).toContain(requirement.id);

    const meetingSource = run.normalizedSources.find((source) => source.sourcePath.endsWith('meeting-notes.md'))!;
    const meetingRequirement = await memoryService.loadRequirement(meetingSource.requirementId);
    const extractedMeetingRequirement = await memoryService.loadRequirement(meetingSource.extractedRequirementIds[0]!);
    expect(meetingRequirement.source.kind).toBe('meeting-note');
    expect(meetingRequirement.source.sourceRef?.label).toBe('meeting-notes');
    expect(extractedMeetingRequirement.source.kind).toBe('meeting-note');

    const runs = await service.listRuns();
    expect(runs[0]?.id).toBe(run.id);
  });

  it('ingests only changed inbox files for incremental updates', async () => {
    const store = createStore();
    await store.write('docs/sources/inbox/roadmap-note.md', '# Roadmap Note\n\nP0: schema UI must be planned before release.\n');
    const service = new DocumentationNormalizationService(store);

    const firstRun = await service.ingestInboxUpdates();
    expect(firstRun.normalizedSources).toHaveLength(1);

    const secondRun = await service.ingestInboxUpdates();
    expect(secondRun.status).toBe('empty');
    expect(secondRun.normalizedSources).toHaveLength(0);

    await store.write('docs/sources/inbox/周报-产品组-徐韵-0509.md', '# 周报\n\n- 本周推进 Hermes 与 inbox 自动知识更新。\n');
    const thirdRun = await service.ingestInboxUpdates();
    expect(thirdRun.normalizedSources).toHaveLength(1);
    expect(thirdRun.normalizedSources[0]?.sourcePath).toContain('0509');
    expect(thirdRun.normalizedSources[0]?.backgroundContextPath).toContain('inbox-background');
    expect(thirdRun.normalizedSources[0]?.projectContextPaths[0]).toContain('by-tag');
  });
});
