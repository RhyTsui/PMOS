import type { FileStore } from './fileStore.js';
import { z } from 'zod';
import { SubprojectRegistry } from './subprojectRegistry.js';

const SkillDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  ownerRole: z.string(),
  promptPath: z.string(),
  stageIds: z.array(z.string()),
  outputs: z.array(z.string()),
  enabled: z.boolean().default(true),
  triggerKeywords: z.array(z.string()).default([]),
  tool: z.string().nullable().default(null),
  deployment: z
    .object({
      status: z.enum(['integrated', 'installed', 'configured', 'manual', 'unavailable']).default('manual'),
      command: z.string().nullable().default(null),
      statusPath: z.string().nullable().default(null),
      integration: z.enum(['workflow', 'product-chief', 'cli', 'external-tool', 'repo-skill', 'manual']).default('manual'),
      notes: z.string().nullable().default(null),
    })
    .default({
      status: 'manual',
      command: null,
      statusPath: null,
      integration: 'manual',
      notes: null,
    }),
});

const SkillRegistrySchema = z.object({
  version: z.string(),
  skills: z.array(SkillDefinitionSchema),
});

export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export type SkillRegistryDocument = z.infer<typeof SkillRegistrySchema>;
export type SkillMatch = {
  skill: SkillDefinition;
  score: number;
  reasons: string[];
};

type FindSkillsInput = {
  query?: string | null;
  stageId?: string | null;
  outputType?: string | null;
  limit?: number | null;
  subprojectId?: string | null;
};

export class SkillRegistry {
  constructor(
    private readonly store: FileStore,
    private readonly subprojectRegistry = new SubprojectRegistry(store),
  ) {}

  async loadRegistry(subprojectId?: string | null): Promise<SkillRegistryDocument> {
    const platformRegistry = SkillRegistrySchema.parse(await this.store.readJson<unknown>('skills/registry.json'));
    const overridePath = await this.resolveSkillConfigPath(subprojectId);
    if (!overridePath) {
      return platformRegistry;
    }

    const overrideRegistry = SkillRegistrySchema.parse(await this.store.readJson<unknown>(overridePath));
    return {
      version: overrideRegistry.version,
      skills: this.mergeSkills(platformRegistry.skills, overrideRegistry.skills),
    };
  }

  async listSkills(subprojectId?: string | null): Promise<SkillDefinition[]> {
    const registry = await this.loadRegistry(subprojectId);
    return registry.skills;
  }

  async listSkillsForStage(stageId: string, subprojectId?: string | null): Promise<SkillDefinition[]> {
    const skills = await this.listSkills(subprojectId);
    return skills.filter((skill) => skill.enabled && skill.stageIds.includes(stageId));
  }

  async findSkills(input: FindSkillsInput): Promise<SkillMatch[]> {
    const query = input.query?.trim() ?? '';
    const stageId = input.stageId?.trim() || null;
    const outputType = input.outputType?.trim() || null;
    const tokens = this.tokenize([query, stageId ?? '', outputType ?? ''].join(' '));
    const skills = await this.listSkills(input.subprojectId);
    const matches = skills
      .filter((skill) => skill.enabled)
      .map((skill) => this.scoreSkill(skill, tokens, stageId, outputType))
      .filter((match) => match.score > 0)
      .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id));

    return matches.slice(0, input.limit && input.limit > 0 ? input.limit : 8);
  }

  async describeReadiness(subprojectId?: string | null) {
    const skills = await this.listSkills(subprojectId);
    const byStatus = skills.reduce<Record<string, number>>((acc, skill) => {
      const status = skill.deployment.status;
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: skills.length,
      enabled: skills.filter((skill) => skill.enabled).length,
      disabled: skills.filter((skill) => !skill.enabled).length,
      byStatus,
      autoTriggerable: skills.filter((skill) => skill.enabled && skill.triggerKeywords.length > 0).length,
      integrated: skills.filter((skill) => skill.enabled && skill.deployment.status === 'integrated').length,
    };
  }

  private async resolveSkillConfigPath(subprojectId?: string | null) {
    if (!subprojectId) {
      return null;
    }

    const subproject = await this.subprojectRegistry.loadSubproject(subprojectId);
    return subproject.overrides.skillConfigPath ?? null;
  }

  private mergeSkills(platformSkills: SkillDefinition[], overrideSkills: SkillDefinition[]) {
    const merged = new Map(platformSkills.map((skill) => [skill.id, skill]));
    for (const skill of overrideSkills) {
      const existing = merged.get(skill.id);
      merged.set(skill.id, existing ? { ...existing, ...skill } : skill);
    }
    return [...merged.values()];
  }

  private scoreSkill(skill: SkillDefinition, tokens: string[], stageId: string | null, outputType: string | null): SkillMatch {
    const reasons: string[] = [];
    let score = 0;

    if (stageId && skill.stageIds.includes(stageId)) {
      score += 40;
      reasons.push(`stage:${stageId}`);
    }

    if (outputType && this.fieldContains(skill.outputs, outputType)) {
      score += 24;
      reasons.push(`output:${outputType}`);
    }

    if (outputType && this.fieldContains([skill.id, skill.name, skill.category, skill.description], outputType)) {
      score += 16;
      reasons.push(`type:${outputType}`);
    }

    const searchable = [
      skill.id,
      skill.name,
      skill.category,
      skill.description,
      skill.ownerRole,
      skill.promptPath,
      ...skill.stageIds,
      ...skill.outputs,
      ...skill.triggerKeywords,
      skill.tool ?? '',
      skill.deployment.command ?? '',
      skill.deployment.integration,
    ]
      .join(' ')
      .toLowerCase();

    for (const token of tokens) {
      if (!token) {
        continue;
      }
      if (skill.triggerKeywords.some((keyword) => keyword.toLowerCase() === token)) {
        score += 18;
        reasons.push(`trigger:${token}`);
        continue;
      }
      if (searchable.includes(token)) {
        score += 6;
        reasons.push(`keyword:${token}`);
      }
    }

    if (skill.deployment.status === 'integrated') {
      score += 6;
      reasons.push('integrated');
    } else if (skill.deployment.status === 'installed' || skill.deployment.status === 'configured') {
      score += 3;
      reasons.push(skill.deployment.status);
    }

    return { skill, score, reasons: [...new Set(reasons)] };
  }

  private tokenize(value: string) {
    return [
      ...new Set(
        value
          .toLowerCase()
          .split(/[^a-z0-9\u4e00-\u9fa5]+/u)
          .map((item) => item.trim())
          .filter((item) => item.length >= 2),
      ),
    ];
  }

  private fieldContains(values: string[], needle: string) {
    const normalizedNeedle = needle.toLowerCase();
    return values.some((value) => value.toLowerCase().includes(normalizedNeedle));
  }
}
