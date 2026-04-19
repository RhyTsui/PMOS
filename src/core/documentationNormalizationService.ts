import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import {
  getDocumentNormalizationArtifactPath,
  getDocumentNormalizationRunDirectoryPath,
  getDocumentNormalizationRunPath,
  getInputInboxPath,
} from './projectPaths.js';
import { RequirementService } from './requirementService.js';
import { VersionRegistry } from './versionRegistry.js';
import type { DocumentNormalizationRun, DocumentNormalizationSource } from '../shared/schemas.js';

const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.json', '.csv', '.yaml', '.yml']);

export class DocumentationNormalizationService {
  private readonly requirementService: RequirementService;
  private readonly versionRegistry: VersionRegistry;

  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
  ) {
    this.requirementService = new RequirementService(this.memoryService);
    this.versionRegistry = new VersionRegistry(this.memoryService);
  }

  async listRuns(subprojectId?: string | null) {
    const relativeDir = getDocumentNormalizationRunDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as DocumentNormalizationRun[];
    }

    const files = await this.store.list(relativeDir);
    const runs = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<DocumentNormalizationRun>(file)),
    );
    return runs.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  async normalize(input?: {
    subprojectId?: string | null;
    sourceRoot?: string | null;
    sourcePaths?: string[];
    limit?: number | null;
  }): Promise<DocumentNormalizationRun> {
    const subprojectId = input?.subprojectId ?? null;
    const sourceRoot = input?.sourceRoot?.trim() || getInputInboxPath(subprojectId);
    const startedAt = new Date().toISOString();
    const runId = `docnorm-${randomUUID()}`;
    const sourcePaths = await this.resolveSourcePaths(sourceRoot, input?.sourcePaths, input?.limit);
    const normalizedSources: DocumentNormalizationSource[] = [];

    for (const sourcePath of sourcePaths) {
      normalizedSources.push(await this.normalizeSource(runId, sourcePath, sourceRoot, subprojectId));
    }

    const completedAt = new Date().toISOString();
    const run: DocumentNormalizationRun = {
      id: runId,
      subprojectId,
      status: normalizedSources.length > 0 ? 'completed' : 'empty',
      sourceRoot,
      startedAt,
      completedAt,
      normalizedSources,
      requirementIds: normalizedSources.map((source) => source.requirementId),
      versionEntryIds: normalizedSources.map((source) => source.versionEntryId),
      summary:
        normalizedSources.length > 0
          ? `Normalized ${normalizedSources.length} document source(s) from ${sourceRoot}.`
          : `No document sources found under ${sourceRoot}.`,
      metadata: {
        sourcePathCount: sourcePaths.length,
      },
    };

    await this.store.writeJson(getDocumentNormalizationRunPath(run.id, run.subprojectId), run);
    return run;
  }

  private async resolveSourcePaths(sourceRoot: string, sourcePaths?: string[], limit?: number | null) {
    const explicit = [...new Set((sourcePaths ?? []).map((item) => item.trim()).filter(Boolean))];
    const candidates = explicit.length > 0 ? explicit : await this.listFilesRecursively(sourceRoot);
    return candidates.slice(0, Math.max(0, limit ?? candidates.length));
  }

  private async listFilesRecursively(relativeRoot: string): Promise<string[]> {
    if (!(await this.store.exists(relativeRoot))) {
      return [];
    }

    const root = this.store.resolve(relativeRoot);
    const results: string[] = [];
    const walk = async (absoluteDir: string) => {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
      for (const entry of entries) {
        const absolutePath = path.join(absoluteDir, entry.name);
        if (entry.isDirectory()) {
          await walk(absolutePath);
          continue;
        }
        if (entry.isFile()) {
          results.push(path.relative(this.store.resolve(''), absolutePath).replace(/\\/gu, '/'));
        }
      }
    };

    await walk(root);
    return results.sort();
  }

  private async normalizeSource(runId: string, sourcePath: string, sourceRoot: string, subprojectId: string | null) {
    const documentType = this.detectDocumentType(sourcePath);
    const suggestedTarget = this.suggestTargetPath(sourcePath, documentType);
    const preview = await this.readPreview(sourcePath);
    const extractedSignals = this.extractSignals(sourcePath, preview);
    const artifactPath = getDocumentNormalizationArtifactPath(runId, this.slugify(sourcePath), subprojectId);
    const artifact = this.buildArtifact({
      runId,
      sourcePath,
      sourceRoot,
      documentType,
      suggestedTarget,
      extractedSignals,
      preview,
    });

    const requirement = await this.requirementService.createRequirement({
      subprojectId,
      title: `Normalize historical document: ${path.posix.basename(sourcePath)}`,
      description: [
        `Normalize historical source into the governed PMAIOS taxonomy.`,
        '',
        `Source: ${sourcePath}`,
        `Suggested target: ${suggestedTarget}`,
        `Document type: ${documentType}`,
      ].join('\n'),
      category: 'architecture',
      priority: 'P0',
      source: {
        kind: 'document-normalization',
        sessionId: null,
        messageId: null,
        runId: null,
        sourceRef: {
          entityType: 'document-normalization',
          entityId: runId,
          path: sourcePath,
          label: documentType,
        },
      },
      artifactPaths: [sourcePath, artifactPath],
      metadata: {
        source: 'documentation-normalization',
        sourcePath,
        sourceRoot,
        suggestedTarget,
        documentType,
      },
    });
    const versionEntry = await this.versionRegistry.createEntry({
      subprojectId,
      entityType: 'document-normalization',
      entityId: runId,
      changeType: 'normalize',
      summary: `Normalized historical document source ${sourcePath}.`,
      requirementIds: [requirement.id],
      artifactPaths: [sourcePath, artifactPath],
      triggeredBy: 'agent',
      diffSummary: `Created governed normalization artifact ${artifactPath}.`,
      approval: {
        approved: false,
        approver: null,
        approvedAt: null,
        summary: 'Normalization artifact is ready for human review before moving source material.',
      },
      metadata: {
        sourcePath,
        sourceRoot,
        suggestedTarget,
        documentType,
      },
    });

    await this.store.write(artifactPath, artifact);
    const extractedRequirementIds = await this.extractRequirementsFromSource({
      sourcePath,
      sourceRoot,
      preview,
      artifactPath,
      subprojectId,
    });
    return {
      sourcePath,
      artifactPath,
      requirementId: requirement.id,
      versionEntryId: versionEntry.id,
      extractedRequirementIds,
      documentType,
      suggestedTarget,
      extractedSignals,
    } satisfies DocumentNormalizationSource;
  }

  private async extractRequirementsFromSource(input: {
    sourcePath: string;
    sourceRoot: string;
    preview: string | null;
    artifactPath: string;
    subprojectId: string | null;
  }) {
    if (!input.preview) {
      return [];
    }

    const candidates = input.preview
      .split(/\r?\n/u)
      .map((line) => line.replace(/^[-*#\d.\s]+/u, '').trim())
      .filter((line) => this.looksLikeRequirement(line))
      .slice(0, 5);
    const requirementIds: string[] = [];

    for (const candidate of candidates) {
      const requirement = await this.requirementService.createRequirement({
        subprojectId: input.subprojectId,
        title: `Extracted source requirement: ${candidate.slice(0, 72)}`,
        description: [
          candidate,
          '',
          `Extracted from: ${input.sourcePath}`,
          `Normalization artifact: ${input.artifactPath}`,
        ].join('\n'),
        category: this.classifyExtractedRequirement(candidate),
        priority: /p0|critical|blocker|紧急|必须/u.test(candidate.toLowerCase()) ? 'P0' : 'P1',
        source: {
          kind: 'document',
          sessionId: null,
          messageId: null,
          runId: null,
          sourceRef: {
            entityType: 'source-document',
            entityId: null,
            path: input.sourcePath,
            label: 'documentation-requirement-extraction',
          },
        },
        artifactPaths: [input.sourcePath, input.artifactPath],
        metadata: {
          source: 'documentation-requirement-extraction',
          sourcePath: input.sourcePath,
          sourceRoot: input.sourceRoot,
        },
      });
      await this.versionRegistry.createEntry({
        subprojectId: input.subprojectId,
        entityType: 'requirement',
        entityId: requirement.id,
        changeType: 'extract',
        summary: `Extracted requirement from ${input.sourcePath}.`,
        requirementIds: [requirement.id],
        artifactPaths: [input.sourcePath, input.artifactPath],
        triggeredBy: 'agent',
        diffSummary: candidate,
        approval: {
          approved: false,
          approver: null,
          approvedAt: null,
          summary: 'Extracted requirement needs operator review before implementation planning.',
        },
        metadata: {
          sourcePath: input.sourcePath,
          sourceRoot: input.sourceRoot,
        },
      });
      requirementIds.push(requirement.id);
    }

    return requirementIds;
  }

  private async readPreview(sourcePath: string) {
    const extension = path.extname(sourcePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) {
      return null;
    }

    try {
      return (await this.store.read(sourcePath)).slice(0, 4000);
    } catch {
      return null;
    }
  }

  private detectDocumentType(sourcePath: string) {
    const normalized = sourcePath.toLowerCase();
    if (/meeting|transcript|minutes|会议|纪要/u.test(normalized)) {
      return 'meeting-notes';
    }
    if (/roadmap|version|release|planning|计划|版本/u.test(normalized)) {
      return 'version-planning';
    }
    if (/requirement|需求|prd|spec/u.test(normalized)) {
      return 'requirements';
    }
    if (/weekly|daily|brief|report|周报|日报/u.test(normalized)) {
      return 'product-intelligence';
    }
    if (/competitor|market|ecosystem|scan|竞品|市场/u.test(normalized)) {
      return 'ecosystem-scan';
    }
    return 'historical-source';
  }

  private suggestTargetPath(sourcePath: string, documentType: string) {
    const baseName = path.posix.basename(sourcePath);
    const targetRoot =
      documentType === 'requirements'
        ? 'docs/sources/requirements'
        : documentType === 'version-planning'
          ? 'docs/sources/version-planning'
          : documentType === 'ecosystem-scan'
            ? 'docs/sources/ecosystem'
            : documentType === 'product-intelligence'
              ? 'docs/context/weekly'
              : documentType === 'meeting-notes'
                ? 'docs/sources/human-analysis'
                : 'docs/sources/historical';
    return `${targetRoot}/${baseName}`;
  }

  private extractSignals(sourcePath: string, preview: string | null) {
    const signals = new Set<string>();
    const haystack = `${sourcePath}\n${preview ?? ''}`.toLowerCase();
    if (/p0|critical|blocker|紧急|必须/u.test(haystack)) {
      signals.add('priority:P0');
    }
    if (/requirement|需求|should|must|需要|应当/u.test(haystack)) {
      signals.add('contains:requirements');
    }
    if (/version|release|roadmap|版本|发布/u.test(haystack)) {
      signals.add('contains:version-planning');
    }
    if (/ui|schema|frontend|console|界面/u.test(haystack)) {
      signals.add('contains:ui-scope');
    }
    if (/market|competitor|open source|ecosystem|竞品|开源/u.test(haystack)) {
      signals.add('contains:ecosystem-scan');
    }
    return [...signals];
  }

  private looksLikeRequirement(line: string) {
    return line.length >= 8 && /(p0|critical|blocker|must|should|need|requirement|需求|需要|必须|应当|应该|支持)/u.test(line.toLowerCase());
  }

  private classifyExtractedRequirement(content: string) {
    const normalized = content.toLowerCase();
    if (/bug|fix|error|故障|修复/u.test(normalized)) {
      return 'bug' as const;
    }
    if (/architecture|version|trace|policy|治理|架构|版本|链路/u.test(normalized)) {
      return 'architecture' as const;
    }
    return 'feature' as const;
  }

  private buildArtifact(input: {
    runId: string;
    sourcePath: string;
    sourceRoot: string;
    documentType: string;
    suggestedTarget: string;
    extractedSignals: string[];
    preview: string | null;
  }) {
    return [
      `# Documentation Normalization Artifact`,
      '',
      `- runId: ${input.runId}`,
      `- sourceRoot: ${input.sourceRoot}`,
      `- sourcePath: ${input.sourcePath}`,
      `- documentType: ${input.documentType}`,
      `- suggestedTarget: ${input.suggestedTarget}`,
      '',
      '## Extracted Signals',
      '',
      ...(input.extractedSignals.length > 0 ? input.extractedSignals.map((signal) => `- ${signal}`) : ['- none-detected']),
      '',
      '## Normalization Decision',
      '',
      '- Keep the original source immutable until the generated requirement/version trace is reviewed.',
      '- Move or rewrite into the suggested target only after review.',
      '- Preserve this artifact as the audit link between source material and governed repository taxonomy.',
      '',
      '## Source Preview',
      '',
      input.preview ? '```text' : '_Binary or unreadable source; preview intentionally omitted._',
      ...(input.preview ? [input.preview, '```'] : []),
      '',
    ].join('\n');
  }

  private slugify(sourcePath: string) {
    const normalized = sourcePath
      .replace(/\.[^.]+$/u, '')
      .replace(/[^a-zA-Z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .toLowerCase();
    return normalized.slice(0, 80) || 'source';
  }
}
