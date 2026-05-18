import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import {
  getDocumentNormalizationArtifactPath,
  getDocumentNormalizationBackgroundArtifactPath,
  getDocumentNormalizationInboxStatePath,
  getDocumentNormalizationProjectContextPath,
  getDocumentNormalizationRunDirectoryPath,
  getDocumentNormalizationRunPath,
  getInputInboxPath,
} from './projectPaths.js';
import { NotionService, type InboxKnowledgeDigestRecord } from './notionService.js';
import { KnowledgeReader, type ParsedDocument } from './knowledgeReader.js';
import { RequirementService } from './requirementService.js';
import { VersionRegistry } from './versionRegistry.js';
import type { DocumentNormalizationRun, DocumentNormalizationSource } from '../shared/schemas.js';

const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.json', '.csv', '.yaml', '.yml']);

type NormalizeInput = {
  subprojectId?: string | null;
  sourceRoot?: string | null;
  sourcePaths?: string[];
  limit?: number | null;
  mode?: 'full' | 'incremental';
  sourceFingerprints?: Record<string, string>;
};

export class DocumentationNormalizationService {
  private readonly requirementService: RequirementService;
  private readonly versionRegistry: VersionRegistry;
  private readonly knowledgeReader: KnowledgeReader;

  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
    private readonly notionService = new NotionService(store),
  ) {
    this.requirementService = new RequirementService(this.memoryService);
    this.versionRegistry = new VersionRegistry(this.memoryService);
    this.knowledgeReader = new KnowledgeReader(store);
  }

  async listRuns(subprojectId?: string | null) {
    const relativeDir = getDocumentNormalizationRunDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as DocumentNormalizationRun[];
    }

    const files = await this.store.list(relativeDir);
    const runs = await Promise.all(
      files.filter((file) => file.endsWith('.json')).map((file) => this.store.readJson<DocumentNormalizationRun>(file)),
    );
    return runs.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  async ingestInboxUpdates(input?: {
    subprojectId?: string | null;
    sourceRoot?: string | null;
    limit?: number | null;
  }): Promise<DocumentNormalizationRun> {
    const subprojectId = input?.subprojectId ?? null;
    const sourceRoot = input?.sourceRoot?.trim() || getInputInboxPath(subprojectId);
    const allSourcePaths = await this.resolveSourcePaths(sourceRoot, undefined, input?.limit);
    const currentFingerprints = await this.buildFingerprintMap(allSourcePaths);
    const previousFingerprints = await this.readInboxStateFingerprints(subprojectId, sourceRoot);
    const changedSourcePaths = allSourcePaths.filter((sourcePath) => currentFingerprints[sourcePath] !== previousFingerprints[sourcePath]);

    return this.normalize({
      subprojectId,
      sourceRoot,
      sourcePaths: changedSourcePaths,
      mode: 'incremental',
      sourceFingerprints: currentFingerprints,
    });
  }

  async normalize(input?: NormalizeInput): Promise<DocumentNormalizationRun> {
    const subprojectId = input?.subprojectId ?? null;
    const sourceRoot = input?.sourceRoot?.trim() || getInputInboxPath(subprojectId);
    const startedAt = new Date().toISOString();
    const runId = `docnorm-${randomUUID()}`;
    const sourcePaths = await this.resolveSourcePaths(sourceRoot, input?.sourcePaths, input?.limit);
    const sourceFingerprints = input?.sourceFingerprints ?? (await this.buildFingerprintMap(sourcePaths));
    const normalizedSources: DocumentNormalizationSource[] = [];

    for (const sourcePath of sourcePaths) {
      normalizedSources.push(
        await this.normalizeSource({
          runId,
          sourcePath,
          sourceRoot,
          subprojectId,
          sourceFingerprint: sourceFingerprints[sourcePath] ?? null,
        }),
      );
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
        mode: input?.mode ?? 'full',
        sourcePathCount: sourcePaths.length,
        sourceFingerprints,
        backgroundContextPaths: normalizedSources.map((source) => source.backgroundContextPath).filter(Boolean),
        notionPageIds: normalizedSources.map((source) => source.notionPageId).filter(Boolean),
      },
    };

    await this.store.writeJson(getDocumentNormalizationRunPath(run.id, run.subprojectId), run);
    await this.writeInboxState(run.subprojectId, sourceRoot, sourceFingerprints);
    return run;
  }

  private async normalizeSource(input: {
    runId: string;
    sourcePath: string;
    sourceRoot: string;
    subprojectId: string | null;
    sourceFingerprint: string | null;
  }): Promise<DocumentNormalizationSource> {
    const parsedSource = await this.readSource(input.sourcePath);
    const preview = parsedSource?.content.slice(0, 4000) ?? null;
    const documentType = this.detectDocumentType(input.sourcePath, preview, parsedSource);
    const suggestedTarget = this.suggestTargetPath(input.sourcePath, documentType);
    const extractedSignals = this.extractSignals(input.sourcePath, preview);
    const projectHints = this.extractProjectHints(input.sourcePath, preview, input.subprojectId, parsedSource);
    const sourceSlug = this.slugify(input.sourcePath);
    const artifactPath = getDocumentNormalizationArtifactPath(input.runId, sourceSlug, input.subprojectId);
    const backgroundContextPath = getDocumentNormalizationBackgroundArtifactPath(input.runId, sourceSlug, input.subprojectId);
    const projectContextPaths = projectHints.map((tag) =>
      getDocumentNormalizationProjectContextPath(tag, input.runId, sourceSlug, input.subprojectId),
    );
    const artifact = this.buildArtifact({
      runId: input.runId,
      sourcePath: input.sourcePath,
      sourceRoot: input.sourceRoot,
      documentType,
      suggestedTarget,
      extractedSignals,
      preview,
      projectHints,
    });
    const knowledgeDigest = this.buildKnowledgeDigest({
      sourcePath: input.sourcePath,
      documentType,
      suggestedTarget,
      preview,
      extractedSignals,
      projectHints,
    });

    await this.store.write(artifactPath, artifact);
    await this.store.write(backgroundContextPath, this.buildBackgroundDigestMarkdown(knowledgeDigest));
    for (const projectContextPath of projectContextPaths) {
      await this.store.write(projectContextPath, this.buildProjectContextMarkdown(projectContextPath, knowledgeDigest));
    }

    const notionPage = await this.syncKnowledgeDigestToNotion(knowledgeDigest);
    const artifactPaths = [input.sourcePath, artifactPath, backgroundContextPath, ...projectContextPaths];

    const requirement = await this.requirementService.createRequirement({
      subprojectId: input.subprojectId,
      title: `Normalize historical document: ${path.posix.basename(input.sourcePath)}`,
      description: [
        'Normalize inbox source into governed PMAIOS taxonomy and background knowledge.',
        '',
        `Source: ${input.sourcePath}`,
        `Suggested target: ${suggestedTarget}`,
        `Document type: ${documentType}`,
        `Project hints: ${projectHints.join(', ') || 'none'}`,
      ].join('\n'),
      category: 'architecture',
      priority: 'P0',
      source: {
        kind: documentType === 'meeting-notes' ? 'meeting-note' : 'document-normalization',
        sessionId: null,
        messageId: null,
        runId: null,
        sourceRef: {
          entityType: 'document-normalization',
          entityId: input.runId,
          path: input.sourcePath,
          label: documentType,
        },
      },
      artifactPaths,
      metadata: {
        source: 'documentation-normalization',
        sourcePath: input.sourcePath,
        sourceRoot: input.sourceRoot,
        suggestedTarget,
        documentType,
        projectHints,
        backgroundContextPath,
        projectContextPaths,
        notionPageId: notionPage?.id ?? null,
        notionPageUrl: notionPage?.url ?? null,
      },
    });

    const versionEntry = await this.versionRegistry.createEntry({
      subprojectId: input.subprojectId,
      entityType: 'document-normalization',
      entityId: input.runId,
      changeType: 'normalize',
      summary: `Normalized historical document source ${input.sourcePath}.`,
      requirementIds: [requirement.id],
      artifactPaths,
      triggeredBy: 'agent',
      diffSummary: `Created governed normalization artifact ${artifactPath} and background digest ${backgroundContextPath}.`,
      approval: {
        approved: false,
        approver: null,
        approvedAt: null,
        summary: 'Normalization and background knowledge assets are ready for review before moving source material.',
      },
      metadata: {
        sourcePath: input.sourcePath,
        sourceRoot: input.sourceRoot,
        suggestedTarget,
        documentType,
        projectHints,
        backgroundContextPath,
        projectContextPaths,
        notionPageId: notionPage?.id ?? null,
        notionPageUrl: notionPage?.url ?? null,
      },
    });

    const extractedRequirementIds = await this.extractRequirementsFromSource({
      sourcePath: input.sourcePath,
      sourceRoot: input.sourceRoot,
      preview,
      artifactPath,
      backgroundContextPath,
      subprojectId: input.subprojectId,
      documentType,
    });

    return {
      sourcePath: input.sourcePath,
      artifactPath,
      backgroundContextPath,
      projectContextPaths,
      notionPageId: notionPage?.id ?? null,
      notionPageUrl: notionPage?.url ?? null,
      requirementId: requirement.id,
      versionEntryId: versionEntry.id,
      extractedRequirementIds,
      documentType,
      suggestedTarget,
      extractedSignals,
      projectHints,
      sourceFingerprint: input.sourceFingerprint,
    };
  }

  private async extractRequirementsFromSource(input: {
    sourcePath: string;
    sourceRoot: string;
    preview: string | null;
    artifactPath: string;
    backgroundContextPath: string;
    subprojectId: string | null;
    documentType: string;
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
          `Background digest: ${input.backgroundContextPath}`,
        ].join('\n'),
        category: this.classifyExtractedRequirement(candidate),
        priority: /p0|critical|blocker|绱ф€蹇呴』/u.test(candidate.toLowerCase()) ? 'P0' : 'P1',
        source: {
          kind: input.documentType === 'meeting-notes' ? 'meeting-note' : 'document',
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
        artifactPaths: [input.sourcePath, input.artifactPath, input.backgroundContextPath],
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
        artifactPaths: [input.sourcePath, input.artifactPath, input.backgroundContextPath],
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

  private async syncKnowledgeDigestToNotion(record: InboxKnowledgeDigestRecord) {
    if (!process.env.NOTION_API_KEY || (!process.env.NOTION_DATABASE_ID && !process.env.NOTION_PAGE_ID)) {
      return null;
    }

    try {
      return await this.notionService.syncInboxKnowledgeDigest(record);
    } catch {
      return null;
    }
  }

  private async resolveSourcePaths(sourceRoot: string, sourcePaths?: string[], limit?: number | null) {
    const explicit = sourcePaths ? [...new Set(sourcePaths.map((item) => item.trim()).filter(Boolean))] : null;
    const candidates = explicit ? explicit : await this.listFilesRecursively(sourceRoot);
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

  private async buildFingerprintMap(sourcePaths: string[]) {
    const entries = await Promise.all(sourcePaths.map(async (sourcePath) => [sourcePath, await this.getSourceFingerprint(sourcePath)] as const));
    return Object.fromEntries(entries);
  }

  private async getSourceFingerprint(sourcePath: string) {
    const buffer = await fs.readFile(this.store.resolve(sourcePath));
    return createHash('sha1').update(buffer).digest('hex');
  }

  private async readInboxStateFingerprints(subprojectId: string | null, sourceRoot: string) {
    const statePath = getDocumentNormalizationInboxStatePath(subprojectId);
    if (!(await this.store.exists(statePath))) {
      return {} as Record<string, string>;
    }

    const state = await this.store.readJson<{ sourceRoot?: unknown; sourceFingerprints?: unknown }>(statePath);
    if (typeof state.sourceRoot !== 'string' || state.sourceRoot !== sourceRoot) {
      return {} as Record<string, string>;
    }

    const candidate = state.sourceFingerprints;
    if (!candidate || typeof candidate !== 'object') {
      return {} as Record<string, string>;
    }

    return Object.fromEntries(
      Object.entries(candidate as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  }

  private async writeInboxState(subprojectId: string | null, sourceRoot: string, sourceFingerprints: Record<string, string>) {
    await this.store.writeJson(getDocumentNormalizationInboxStatePath(subprojectId), {
      sourceRoot,
      sourceFingerprints,
      updatedAt: new Date().toISOString(),
    });
  }

  private async readSource(sourcePath: string): Promise<ParsedDocument | null> {
    const extension = path.extname(sourcePath).toLowerCase();
    if (TEXT_EXTENSIONS.has(extension)) {
      try {
        const content = await this.store.read(sourcePath);
        return {
          path: sourcePath,
          type: 'markdown',
          content,
          metadata: {},
        };
      } catch {
        return null;
      }
    }

    if (!['.docx', '.xlsx', '.xls'].includes(extension)) {
      return null;
    }
    try {
      return await this.knowledgeReader.readDocument(sourcePath);
    } catch {
      return null;
    }
  }

  private detectDocumentType(sourcePath: string, preview: string | null, parsedSource: ParsedDocument | null) {
    const normalized = sourcePath.toLowerCase();
    const metadataHaystack = `${parsedSource?.metadata.title ?? ''}\n${parsedSource?.metadata.project ?? ''}`.toLowerCase();
    const previewHaystack = preview?.toLowerCase() ?? '';
    const haystack = `${normalized}\n${metadataHaystack}\n${previewHaystack}`;
    if (/meeting|transcript|minutes|会议|纪要/u.test(haystack)) {
      return 'meeting-notes';
    }
    if (/roadmap|version|release|planning|计划|版本/u.test(haystack)) {
      return 'version-planning';
    }
    if (/requirement|需求|prd|spec/u.test(haystack)) {
      return 'requirements';
    }
    if (/weekly|daily|brief|report|周报|日报/u.test(haystack)) {
      return 'product-intelligence';
    }
    if (/competitor|market|ecosystem|scan|竞品|市场/u.test(haystack)) {
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
    const haystack = `${sourcePath}
${preview ?? ''}`.toLowerCase();
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

  private extractProjectHints(sourcePath: string, preview: string | null, subprojectId: string | null, parsedSource: ParsedDocument | null) {
    const hints = new Set<string>();
    if (subprojectId) {
      hints.add(subprojectId);
    }

    const haystack = `${sourcePath}
${preview ?? ''}`.toLowerCase();
    const projectMeta = parsedSource?.metadata.project?.toLowerCase() ?? '';
    const titleMeta = parsedSource?.metadata.title?.toLowerCase() ?? '';
    const metadataHaystack = `${projectMeta}
${titleMeta}`;
    if (/(^|[^a-z])ad([^a-z]|$)|小乔|智投|ad os|ad agent|广告/u.test(haystack)) {
      hints.add('ad');
    }
    if (/埋点|tracking|验收/u.test(haystack)) {
      hints.add('tracking-acceptance');
    }
    if (/测试|连弩/u.test(haystack)) {
      hints.add('testing-platform');
    }
    if (/dataki|知识库|版本库/u.test(haystack)) {
      hints.add('knowledge-base');
    }
    if (/pmaios|pmos|平台|workflow|hermes/u.test(haystack)) {
      hints.add('platform');
    }
    if (/(^|[^a-z])ad([^a-z]|$)|小乔|智投|广告/u.test(metadataHaystack)) {
      hints.add('ad');
    }
    if (/测试|连弩/u.test(metadataHaystack)) {
      hints.add('testing-platform');
    }

    return [...hints];
  }

  private buildKnowledgeDigest(input: {
    sourcePath: string;
    documentType: string;
    suggestedTarget: string;
    preview: string | null;
    extractedSignals: string[];
    projectHints: string[];
  }): InboxKnowledgeDigestRecord {
    const cleanedLines = (input.preview ?? '')
      .split(/\r?\n/u)
      .map((line) => line.replace(/^[-*#\d.\s]+/u, '').trim())
      .filter(Boolean);
    const facts = cleanedLines.slice(0, 4);
    const judgments = [
      `该材料被识别为 ${input.documentType}，建议进入 ${input.suggestedTarget} 对应治理链。`,
      input.projectHints.length > 0
        ? `当前命中的项目/平台提示为：${input.projectHints.join(' / ')}。`
        : '当前未命中明确项目归属，需要人工确认路由。',
    ];
    const unknowns = [
      input.projectHints.length === 0 ? '缺少明确项目归属。' : '',
      input.preview ? '' : '原文为二进制或当前不可直接读取，需后续补充结构化摘要。',
    ].filter(Boolean);
    const nextActions = [
      '将该摘要作为后续 Hermes / review / workflow 的背景知识输入。',
      '如内容涉及版本、需求或系统现状，优先回写原真源而不是新增平行补充文档。',
    ];
    const title = `Inbox Knowledge Digest / ${path.posix.basename(input.sourcePath)}`;

    return {
      title,
      project: input.projectHints[0] ?? 'platform',
      sourcePath: input.sourcePath,
      documentType: input.documentType,
      summary:
        facts.length > 0
          ? `已从 inbox 新材料中提炼出 ${facts.length} 条可复用背景事实，并准备同步到知识层供后续 agent grounding 使用。`
          : '该 inbox 材料已进入治理链，但当前仅建立了来源和路由信息，尚未提取到足够正文事实。',
      facts,
      judgments,
      unknowns,
      nextActions,
    };
  }

  private buildArtifact(input: {
    runId: string;
    sourcePath: string;
    sourceRoot: string;
    documentType: string;
    suggestedTarget: string;
    extractedSignals: string[];
    preview: string | null;
    projectHints: string[];
  }) {
    return [
      '# Documentation Normalization Artifact',
      '',
      `- runId: ${input.runId}`,
      `- sourceRoot: ${input.sourceRoot}`,
      `- sourcePath: ${input.sourcePath}`,
      `- documentType: ${input.documentType}`,
      `- suggestedTarget: ${input.suggestedTarget}`,
      `- projectHints: ${input.projectHints.join(', ') || 'none'}`,
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

  private buildBackgroundDigestMarkdown(record: InboxKnowledgeDigestRecord) {
    return [
      `# ${record.title}`,
      '',
      `- project: ${record.project}`,
      `- sourcePath: ${record.sourcePath}`,
      `- documentType: ${record.documentType}`,
      '',
      '## Summary',
      '',
      record.summary,
      '',
      '## Facts',
      '',
      ...(record.facts.length > 0 ? record.facts.map((item) => `- ${item}`) : ['- none']),
      '',
      '## Judgments',
      '',
      ...(record.judgments.length > 0 ? record.judgments.map((item) => `- ${item}`) : ['- none']),
      '',
      '## Unknowns',
      '',
      ...(record.unknowns.length > 0 ? record.unknowns.map((item) => `- ${item}`) : ['- none']),
      '',
      '## Next Actions',
      '',
      ...(record.nextActions.length > 0 ? record.nextActions.map((item) => `- ${item}`) : ['- none']),
      '',
    ].join('\n');
  }

  private buildProjectContextMarkdown(projectContextPath: string, record: InboxKnowledgeDigestRecord) {
    return [
      '# 项目背景提炼',
      '',
      `- route: ${projectContextPath}`,
      `- sourcePath: ${record.sourcePath}`,
      `- documentType: ${record.documentType}`,
      `- project: ${record.project}`,
      '',
      '## 摘要',
      '',
      record.summary || '暂无摘要',
      '',
      ...(record.facts.length > 0 ? ['## 事实', '', ...record.facts.map((item) => `- ${item}`), ''] : []),
      ...(record.judgments.length > 0 ? ['## 判断', '', ...record.judgments.map((item) => `- ${item}`), ''] : []),
      ...(record.unknowns.length > 0 ? ['## 待确认', '', ...record.unknowns.map((item) => `- ${item}`), ''] : []),
      ...(record.nextActions.length > 0 ? ['## 后续动作', '', ...record.nextActions.map((item) => `- ${item}`), ''] : []),
    ].join('\n');
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

  private slugify(sourcePath: string) {
    const normalized = sourcePath
      .replace(/\.[^.]+$/u, '')
      .replace(/[^a-zA-Z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .toLowerCase();
    return normalized.slice(0, 80) || 'source';
  }
}

