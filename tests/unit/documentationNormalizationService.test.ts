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
    await store.write('docs/sources/inbox/roadmap-note.md', '# Roadmap Note\n\nP0: schema UI must be planned before release.\n');
    await store.write('docs/sources/inbox/raw-upload.xlsx', 'binary-placeholder');
    const service = new DocumentationNormalizationService(store);

    const run = await service.normalize();

    expect(run.status).toBe('completed');
    expect(run.normalizedSources).toHaveLength(2);
    expect(run.requirementIds).toHaveLength(2);
    expect(run.versionEntryIds).toHaveLength(2);

    const memoryService = new MemoryService(store);
    const markdownSource = run.normalizedSources.find((source) => source.sourcePath.endsWith('roadmap-note.md'))!;
    const requirement = await memoryService.loadRequirement(markdownSource.requirementId);
    const versionEntry = await memoryService.loadVersionEntry(markdownSource.versionEntryId);
    const extractedRequirement = await memoryService.loadRequirement(markdownSource.extractedRequirementIds[0]!);

    expect(await store.read(markdownSource.artifactPath)).toContain('contains:ui-scope');
    expect(requirement.priority).toBe('P0');
    expect(requirement.source.kind).toBe('document-normalization');
    expect(requirement.source.sourceRef?.path).toBe(markdownSource.sourcePath);
    expect(requirement.trace.linkedVersionIds).toContain(versionEntry.id);
    expect(requirement.trace.artifactPaths).toContain(markdownSource.artifactPath);
    expect(markdownSource.extractedRequirementIds).toHaveLength(1);
    expect(extractedRequirement.title).toContain('Extracted source requirement');
    expect(extractedRequirement.source.kind).toBe('document');
    expect(extractedRequirement.source.sourceRef?.path).toBe(markdownSource.sourcePath);
    expect(extractedRequirement.trace.artifactPaths).toContain(markdownSource.artifactPath);
    expect(versionEntry.entityType).toBe('document-normalization');
    expect(versionEntry.requirementIds).toContain(requirement.id);

    const runs = await service.listRuns();
    expect(runs[0]?.id).toBe(run.id);
  });
});
