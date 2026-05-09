import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { RequirementService } from './requirementService.js';
import { getGlobalRulesPath } from './projectPaths.js';
import type { ChatMessage, Requirement } from '../shared/schemas.js';

type GovernanceCaptureResult = {
  ruleCaptured: boolean;
  requirementCaptured: boolean;
  requirementId: string | null;
};

export class ConversationGovernanceService {
  private readonly requirementService: RequirementService;

  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
  ) {
    this.requirementService = new RequirementService(this.memoryService);
  }

  async processUserMessage(sessionId: string, message: ChatMessage): Promise<GovernanceCaptureResult> {
    let ruleCaptured = false;
    let requirementCaptured = false;
    let requirementId: string | null = null;

    if (this.looksLikeGlobalRule(message.content)) {
      ruleCaptured = await this.captureGlobalRule(sessionId, message);
    }

    if (this.looksLikeRequirement(message.content)) {
      const requirement = await this.captureRequirement(sessionId, message);
      requirementCaptured = true;
      requirementId = requirement.id;
    }

    return {
      ruleCaptured,
      requirementCaptured,
      requirementId,
    };
  }

  private looksLikeGlobalRule(content: string) {
    return /(规则|约定|规范|默认|统一|必须|都应该|以后|全局使用|固化|沉淀|唯一输入源|输入源文件夹)/u.test(content);
  }

  private looksLikeRequirement(content: string) {
    const normalized = content.trim();
    if (normalized.length < 8) {
      return false;
    }

    return /(需求|要加|加入|需要|希望|应该支持|自动识别|需求池|版本库|能力|功能|支持|触发)/u.test(normalized);
  }

  private async captureRequirement(sessionId: string, message: ChatMessage): Promise<Requirement> {
    const existing = await this.requirementService.listRequirements(message.subprojectId);
    const matched = existing.find(
      (requirement) => requirement.source.kind === 'chat' && requirement.source.messageId === message.id,
    );
    if (matched) {
      return matched;
    }

    return this.requirementService.ingestFromChat({
      sessionId,
      messageId: message.id,
      subprojectId: message.subprojectId,
    });
  }

  private async captureGlobalRule(sessionId: string, message: ChatMessage) {
    const target = getGlobalRulesPath();
    const existing = (await this.store.exists(target))
      ? await this.store.read(target)
      : this.buildInitialGlobalRulesDocument();

    if (existing.includes(`messageId: ${message.id}`)) {
      return false;
    }

    const next = `${existing.trimEnd()}\n\n${this.renderRuleEntry(sessionId, message)}\n`;
    await this.store.write(target, next);
    return true;
  }

  private buildInitialGlobalRulesDocument() {
    return [
      '# Global Rules',
      '',
      '此文件记录从用户对话中沉淀出的全局规则。',
      '',
      '规则含义：',
      '',
      '- 已被当前仓库接受并默认生效',
      '- 默认作为平台级 truth-source 参与后续上下文装载',
      '- 后续若被新决策覆盖，应通过新增记录而不是静默删除',
    ].join('\n');
  }

  private renderRuleEntry(sessionId: string, message: ChatMessage) {
    const createdAt = new Date().toISOString();
    const ruleId = `rule-${randomUUID()}`;
    const canonicalPoints = this.extractCanonicalPoints(message.content);

    return [
      `## ${ruleId}`,
      `- createdAt: ${createdAt}`,
      '- status: active',
      '- source: chat',
      `- sessionId: ${sessionId}`,
      `- messageId: ${message.id}`,
      `- subprojectId: ${message.subprojectId ?? 'platform'}`,
      '- captureMode: heuristic',
      '- canonicalRule:',
      ...canonicalPoints.map((point) => `  - ${point}`),
      '- rawMessage:',
      ...message.content.split(/\r?\n/u).map((line) => `  > ${line}`),
    ].join('\n');
  }

  private extractCanonicalPoints(content: string) {
    const normalized = content.replace(/\s+/gu, ' ').trim();
    const segments = normalized
      .split(/[。！？；;\n]/u)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length >= 6);

    return segments.length > 0 ? segments.slice(0, 4) : [normalized];
  }
}
