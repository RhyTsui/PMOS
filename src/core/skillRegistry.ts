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
});

const SkillRegistrySchema = z.object({
  version: z.string(),
  skills: z.array(SkillDefinitionSchema),
});

export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export type SkillRegistryDocument = z.infer<typeof SkillRegistrySchema>;

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
    return skills.filter((skill) => skill.stageIds.includes(stageId));
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
}
