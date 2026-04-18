import { randomUUID } from 'node:crypto';
import { MemoryService } from './memoryService.js';
import type { Requirement } from '../shared/schemas.js';

export class RequirementService {
  constructor(private readonly memoryService: MemoryService) {}

  async listRequirements(subprojectId?: string | null) {
    return this.memoryService.listRequirements(subprojectId);
  }

  async loadRequirement(requirementId: string, subprojectId?: string | null) {
    return this.memoryService.loadRequirement(requirementId, subprojectId);
  }

  async createRequirement(input: {
    subprojectId?: string | null;
    title: string;
    description: string;
    category: Requirement['category'];
    priority?: Requirement['priority'];
    source?: Requirement['source'];
    relatedRequirementIds?: string[];
    linkedVersionIds?: string[];
    linkedRunIds?: string[];
    artifactPaths?: string[];
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const requirement: Requirement = {
      id: `req-${randomUUID()}`,
      subprojectId: input.subprojectId ?? null,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      status: 'draft',
      priority: input.priority ?? 'P1',
      source: input.source ?? {
        kind: 'manual',
        sessionId: null,
        messageId: null,
        runId: null,
      },
      trace: {
        relatedRequirementIds: input.relatedRequirementIds ?? [],
        linkedVersionIds: input.linkedVersionIds ?? [],
        linkedRunIds: input.linkedRunIds ?? [],
        artifactPaths: input.artifactPaths ?? [],
      },
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };

    await this.memoryService.saveRequirement(requirement);
    return requirement;
  }

  async ingestFromChat(input: {
    sessionId: string;
    messageId?: string | null;
    subprojectId?: string | null;
  }) {
    const messages = await this.memoryService.loadChatMessages(input.sessionId, input.subprojectId);
    const sourceMessage =
      (input.messageId ? messages.find((message) => message.id === input.messageId) : null) ??
      [...messages].reverse().find((message) => message.role === 'user') ??
      null;

    if (!sourceMessage) {
      throw new Error(`no chat message found for session ${input.sessionId}`);
    }

    const content = sourceMessage.content.trim();
    const category = this.classifyRequirement(content);
    const title = this.buildTitle(content, category);

    return this.createRequirement({
      subprojectId: sourceMessage.subprojectId,
      title,
      description: content,
      category,
      priority: this.inferPriority(content),
      source: {
        kind: 'chat',
        sessionId: input.sessionId,
        messageId: sourceMessage.id,
        runId: sourceMessage.runId,
      },
      linkedRunIds: sourceMessage.runId ? [sourceMessage.runId] : [],
      metadata: {
        ingestedFrom: 'chat',
      },
    });
  }

  private classifyRequirement(content: string): Requirement['category'] {
    const normalized = content.toLowerCase();
    if (/(bug|fix|error|异常|报错|故障)/u.test(normalized)) {
      return 'bug';
    }
    if (/(architecture|架构|重构|layer|plane|trace|version)/u.test(normalized)) {
      return 'architecture';
    }
    return 'feature';
  }

  private inferPriority(content: string): Requirement['priority'] {
    if (/(p0|critical|blocker|紧急|必须)/u.test(content.toLowerCase())) {
      return 'P0';
    }
    if (/(p2|low|later|后续)/u.test(content.toLowerCase())) {
      return 'P2';
    }
    return 'P1';
  }

  private buildTitle(content: string, category: Requirement['category']) {
    const normalized = content.replace(/\s+/gu, ' ').trim();
    const excerpt = normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
    return `[${category}] ${excerpt}`;
  }
}
