import { randomUUID } from 'node:crypto';
import { LlmRouter } from '../llm_router/index.js';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { SubprojectRegistry } from './subprojectRegistry.js';
import { getProductAgentBlueprintRegistryPath } from './projectPaths.js';
import type { ProductAgent, ProductAgentLevel, ProductAgentRole, ProductAgentScope } from '../shared/schemas.js';

export type ProductAgentBlueprint = {
  id: string;
  name: string;
  role: ProductAgentRole;
  level: ProductAgentLevel;
  scope: ProductAgentScope;
  summary: string;
  problem: string;
  targetUsers?: string[];
  goals?: string[];
  nonGoals?: string[];
  constraints?: string[];
  acceptanceCriteria?: string[];
  relatedPaths?: string[];
  governanceRefs?: string[];
  promptPath?: string | null;
  manages?: string[];
};

type ProductAgentBlueprintRegistry = {
  version: string;
  blueprints: ProductAgentBlueprint[];
};

export class ProductAgentService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
    private readonly subprojectRegistry = new SubprojectRegistry(store),
    private readonly llmRouter = new LlmRouter(store),
  ) {}

  async listAgents(subprojectId?: string | null) {
    return this.memoryService.listProductAgents(subprojectId);
  }

  async loadAgent(agentId: string, subprojectId?: string | null) {
    return this.memoryService.loadProductAgent(agentId, subprojectId);
  }

  async createAgent(input: {
    name: string;
    summary: string;
    problem: string;
    role?: ProductAgentRole;
    level?: ProductAgentLevel;
    scope?: ProductAgentScope;
    targetUsers?: string[];
    goals?: string[];
    nonGoals?: string[];
    constraints?: string[];
    acceptanceCriteria?: string[];
    relatedPaths?: string[];
    governanceRefs?: string[];
    managedAgentIds?: string[];
    promptPath?: string | null;
    templateId?: string | null;
    subprojectId?: string | null;
    chatSessionId?: string | null;
    contextSnapshotId?: string | null;
    generatedByRunId?: string | null;
    source?: ProductAgent['source'];
  }) {
    const project = await this.subprojectRegistry.resolveProjectContext(input.subprojectId ?? null);
    const now = new Date().toISOString();
    const agent: ProductAgent = {
      id: `product-agent-${randomUUID()}`,
      subprojectId: project.subprojectId,
      name: input.name.trim(),
      status: 'ready',
      source: input.source ?? 'api',
      role: input.role ?? 'general',
      level: input.level ?? 'manager',
      scope: input.scope ?? (project.subprojectId ? 'subproject' : 'platform'),
      summary: input.summary.trim(),
      problem: input.problem.trim(),
      targetUsers: this.cleanList(input.targetUsers),
      goals: this.cleanList(input.goals),
      nonGoals: this.cleanList(input.nonGoals),
      constraints: this.cleanList(input.constraints),
      acceptanceCriteria: this.cleanList(input.acceptanceCriteria),
      relatedPaths: this.cleanList(input.relatedPaths),
      governanceRefs: this.cleanList(input.governanceRefs),
      managedAgentIds: this.cleanList(input.managedAgentIds),
      promptPath: input.promptPath?.trim() || null,
      templateId: input.templateId?.trim() || null,
      contextSnapshotId: input.contextSnapshotId ?? null,
      chatSessionId: input.chatSessionId ?? null,
      generatedByRunId: input.generatedByRunId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.memoryService.saveProductAgent(agent);
    return agent;
  }

  async generateAgent(input: {
    brief: string;
    name?: string;
    role?: ProductAgentRole;
    level?: ProductAgentLevel;
    scope?: ProductAgentScope;
    subprojectId?: string | null;
    chatSessionId?: string | null;
    contextSnapshotId?: string | null;
    generatedByRunId?: string | null;
    source?: ProductAgent['source'];
  }) {
    const project = await this.subprojectRegistry.resolveProjectContext(input.subprojectId ?? null);
    const prompt = [
      `你是 ${project.projectName} 的 Product Agent 生成器。`,
      '请基于用户 brief 产出一个结构化产品定义 JSON。',
      '只输出 JSON，不要输出 markdown 代码块。',
      '字段必须包含：name, summary, problem, targetUsers, goals, nonGoals, constraints, acceptanceCriteria, relatedPaths。',
      '其中数组字段必须输出 string[]；若信息不足，可给出最小合理结果，但不要留 null。',
      `brief: ${input.brief.trim()}`,
    ].join('\n');

    const execution = await this.llmRouter.execute(
      {
        runId: input.generatedByRunId ?? `product-agent-${randomUUID()}`,
        stageId: 'product-agent',
        capability: 'text',
        prompt,
      },
      {
        subprojectId: project.subprojectId,
        preferredProvider: project.selectedProvider,
        allowCrossCapabilityFallback: false,
      },
    );

    const parsed = this.parseGeneratedDocument(execution.result.outputText, input.name);
    return this.createAgent({
      ...parsed,
      name: input.name?.trim() || parsed.name,
      role: input.role ?? 'general',
      level: input.level ?? 'manager',
      scope: input.scope ?? (project.subprojectId ? 'subproject' : 'platform'),
      subprojectId: project.subprojectId,
      chatSessionId: input.chatSessionId ?? null,
      contextSnapshotId: input.contextSnapshotId ?? null,
      generatedByRunId: input.generatedByRunId ?? execution.result.operationId,
      source: input.source ?? 'workspace',
    });
  }

  async listBlueprints() {
    const registry = await this.loadBlueprintRegistry();
    return registry.blueprints;
  }

  async bootstrapManagementHierarchy(subprojectId?: string | null) {
    const project = await this.subprojectRegistry.resolveProjectContext(subprojectId ?? null);
    const blueprints = await this.listBlueprints();
    const existingAgents = await this.listAgents(project.subprojectId);
    const existingByTemplateId = new Map(
      existingAgents
        .filter((agent) => agent.templateId)
        .map((agent) => [agent.templateId as string, agent]),
    );

    const orderedBlueprints = [...blueprints].sort((left, right) => {
      if (left.role === 'product-management') {
        return -1;
      }
      if (right.role === 'product-management') {
        return 1;
      }
      return left.name.localeCompare(right.name, 'zh-CN');
    });

    const createdOrReused: ProductAgent[] = [];
    for (const blueprint of orderedBlueprints) {
      const existing = existingByTemplateId.get(blueprint.id);
      if (existing) {
        createdOrReused.push(existing);
        continue;
      }

      const created = await this.createAgent({
        name: blueprint.name,
        summary: blueprint.summary,
        problem: blueprint.problem,
        role: blueprint.role,
        level: blueprint.level,
        scope: blueprint.scope === 'platform' && project.subprojectId ? 'shared' : blueprint.scope,
        targetUsers: blueprint.targetUsers,
        goals: blueprint.goals,
        nonGoals: blueprint.nonGoals,
        constraints: blueprint.constraints,
        acceptanceCriteria: blueprint.acceptanceCriteria,
        relatedPaths: blueprint.relatedPaths,
        governanceRefs: blueprint.governanceRefs,
        promptPath: blueprint.promptPath ?? null,
        templateId: blueprint.id,
        subprojectId: project.subprojectId,
        source: 'workspace',
      });
      createdOrReused.push(created);
      existingByTemplateId.set(blueprint.id, created);
    }

    for (const blueprint of orderedBlueprints) {
      const current = existingByTemplateId.get(blueprint.id);
      if (!current) {
        continue;
      }

      const managedAgentIds = (blueprint.manages ?? [])
        .map((templateId) => existingByTemplateId.get(templateId)?.id ?? null)
        .filter((value): value is string => Boolean(value));

      if (this.sameList(current.managedAgentIds, managedAgentIds)) {
        continue;
      }

      const updated: ProductAgent = {
        ...current,
        managedAgentIds,
        updatedAt: new Date().toISOString(),
      };
      await this.memoryService.saveProductAgent(updated);
      const index = createdOrReused.findIndex((agent) => agent.id === updated.id);
      if (index >= 0) {
        createdOrReused[index] = updated;
      } else {
        createdOrReused.push(updated);
      }
    }

    return createdOrReused.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  }

  private cleanList(values?: string[]) {
    return (values ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private async loadBlueprintRegistry(): Promise<ProductAgentBlueprintRegistry> {
    return this.store.readJson<ProductAgentBlueprintRegistry>(getProductAgentBlueprintRegistryPath());
  }

  private sameList(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private parseGeneratedDocument(raw: string | null, fallbackName?: string) {
    if (!raw) {
      return {
        name: fallbackName?.trim() || 'Untitled Product Agent',
        summary: '待补充产品摘要',
        problem: '待补充待解决问题',
        targetUsers: [],
        goals: [],
        nonGoals: [],
        constraints: [],
        acceptanceCriteria: [],
        relatedPaths: [],
      };
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        name: this.readString(parsed.name) ?? fallbackName?.trim() ?? 'Untitled Product Agent',
        summary: this.readString(parsed.summary) ?? '待补充产品摘要',
        problem: this.readString(parsed.problem) ?? '待补充待解决问题',
        targetUsers: this.readStringList(parsed.targetUsers),
        goals: this.readStringList(parsed.goals),
        nonGoals: this.readStringList(parsed.nonGoals),
        constraints: this.readStringList(parsed.constraints),
        acceptanceCriteria: this.readStringList(parsed.acceptanceCriteria),
        relatedPaths: this.readStringList(parsed.relatedPaths),
      };
    } catch {
      return {
        name: fallbackName?.trim() || 'Untitled Product Agent',
        summary: raw.trim(),
        problem: '待从 brief 中进一步提炼问题定义',
        targetUsers: [],
        goals: [],
        nonGoals: [],
        constraints: [],
        acceptanceCriteria: [],
        relatedPaths: [],
      };
    }
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readStringList(value: unknown) {
    return Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : [];
  }
}
