import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FileStore } from './fileStore.js';
import { SkillRegistry, type SkillDefinition } from './skillRegistry.js';

type CodexLocalSkillScope = 'system' | 'runtime' | 'user';

export type CodexLocalSkill = {
  id: string;
  path: string;
  hasSkillMd: boolean;
  scope: CodexLocalSkillScope;
};

export type CodexLocalPlugin = {
  id: string;
  enabled: boolean;
  source: 'config' | 'cache' | 'config+cache';
  cachePath: string | null;
};

export type CodexStateDiff = {
  localOnlySkills: string[];
  pmaiosOnlyExternalSkills: string[];
  localVisibleAndRegisteredSkills: string[];
  runtimeVisibleOnlySkills: string[];
  enabledPluginsNotTrackedByPmaios: string[];
};

export type CodexLocalStateSnapshot = {
  codexHome: string;
  configPath: string;
  skillsPath: string;
  pluginsPath: string;
  configExists: boolean;
  localSkills: CodexLocalSkill[];
  runtimeVisibleSkills: Array<{
    id: string;
    name: string;
    scope: 'personal' | 'system';
    description: string;
  }>;
  governedRuntimeCapabilities: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    targetRegistry: string;
  }>;
  governedLocalRuntimeCore: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    targetRegistry: string;
  }>;
  localPlugins: CodexLocalPlugin[];
  governedPlugins: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    runtimeVisibleSkillId: string | null;
  }>;
  enabledPluginIds: string[];
  pmaiosExternalSkills: Array<{
    id: string;
    name: string;
    promptPath: string;
    command: string | null;
    deploymentStatus: string;
  }>;
  pmaiosReadiness: {
    total: number;
    enabled: number;
    integrated: number;
    autoTriggerable: number;
    byStatus: Record<string, number>;
  };
  diff: CodexStateDiff;
};

type CodexRuntimeVisibleSkillDocument = {
  version: string;
  source: string;
  skills: Array<{
    id: string;
    name: string;
    visibility: string;
    scope: 'personal' | 'system';
    description: string;
  }>;
};

type CodexPluginToolRegistryDocument = {
  version: string;
  source: string;
  items: Array<{
    id: string;
    name: string;
    type: string;
    runtimeVisibleSkillId?: string | null;
    scope: string;
    status: string;
  }>;
};

type CodexRuntimeCapabilityClassificationDocument = {
  version: string;
  source: string;
  items: Array<{
    id: string;
    name: string;
    type: string;
    scope: string;
    status: string;
    targetRegistry: string;
  }>;
};

type CodexLocalRuntimeCoreClassificationDocument = {
  version: string;
  source: string;
  items: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    targetRegistry: string;
  }>;
};

export class CodexLocalStateService {
  private readonly codexHome = path.join(os.homedir(), '.codex');
  private readonly configPath = path.join(this.codexHome, 'config.toml');
  private readonly skillsPath = path.join(this.codexHome, 'skills');
  private readonly pluginsPath = path.join(this.codexHome, 'plugins');

  constructor(
    private readonly store: FileStore,
    private readonly skillRegistry = new SkillRegistry(store),
  ) {}

  async inspect(subprojectId?: string | null): Promise<CodexLocalStateSnapshot> {
    const [localSkills, pluginScan, configExists, registrySkills, readiness] = await Promise.all([
      this.scanLocalSkills(),
      this.scanLocalPlugins(),
      this.exists(this.configPath),
      this.skillRegistry.listSkills(subprojectId),
      this.skillRegistry.describeReadiness(subprojectId),
    ]);
    const runtimeVisibleSkills = await this.readRuntimeVisibleSkills();
    const governedPlugins = await this.readGovernedPlugins();
    const governedRuntimeCapabilities = await this.readGovernedRuntimeCapabilities();
    const governedLocalRuntimeCore = await this.readGovernedLocalRuntimeCore();

    const pmaiosExternalSkills = registrySkills
      .filter((skill) => this.isExternalCodexSkill(skill))
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        promptPath: skill.promptPath,
        command: skill.deployment.command,
        deploymentStatus: skill.deployment.status,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

    const localSkillIds = localSkills
      .filter((skill) => skill.scope !== 'system')
      .map((skill) => skill.id);
    const governedLocalRuntimeCoreIds = governedLocalRuntimeCore.map((item) => item.id);
    const registeredExternalSkillIds = pmaiosExternalSkills.map((skill) => skill.id);
    const runtimeVisibleSkillIds = runtimeVisibleSkills.map((skill) => skill.id);
    const localOnlySkills = localSkillIds
      .filter((skillId) => !registeredExternalSkillIds.includes(skillId))
      .filter((skillId) => !governedLocalRuntimeCoreIds.includes(skillId))
      .sort((left, right) => left.localeCompare(right));
    const pmaiosOnlyExternalSkills = registeredExternalSkillIds
      .filter((skillId) => !localSkillIds.includes(skillId))
      .sort((left, right) => left.localeCompare(right));
    const localVisibleAndRegisteredSkills = localSkillIds
      .filter((skillId) => registeredExternalSkillIds.includes(skillId))
      .sort((left, right) => left.localeCompare(right));
    const governedRuntimeSkillIds = [
      ...governedPlugins.map((item) => item.runtimeVisibleSkillId).filter((value): value is string => Boolean(value)),
      ...governedRuntimeCapabilities.map((item) => item.id),
    ];
    const runtimeVisibleOnlySkills = runtimeVisibleSkillIds
      .filter((skillId) => !registeredExternalSkillIds.includes(skillId))
      .filter((skillId) => !governedRuntimeSkillIds.includes(skillId))
      .sort((left, right) => left.localeCompare(right));

    return {
      codexHome: this.codexHome,
      configPath: this.configPath,
      skillsPath: this.skillsPath,
      pluginsPath: this.pluginsPath,
      configExists,
      localSkills,
      runtimeVisibleSkills,
      governedRuntimeCapabilities,
      governedLocalRuntimeCore,
      localPlugins: pluginScan.plugins,
      governedPlugins,
      enabledPluginIds: pluginScan.enabledPluginIds,
      pmaiosExternalSkills,
      pmaiosReadiness: readiness,
      diff: {
        localOnlySkills,
        pmaiosOnlyExternalSkills,
        localVisibleAndRegisteredSkills: [...new Set([...localVisibleAndRegisteredSkills, ...runtimeVisibleSkillIds.filter((skillId) => registeredExternalSkillIds.includes(skillId))])].sort((left, right) => left.localeCompare(right)),
        runtimeVisibleOnlySkills,
        enabledPluginsNotTrackedByPmaios: pluginScan.enabledPluginIds.filter(
          (pluginId) => !governedPlugins.some((item) => item.id === pluginId),
        ),
      },
    };
  }

  async writeSnapshot(relativePath = 'docs/operations/codex-local-state-sync-status.json', subprojectId?: string | null) {
    const snapshot = await this.inspect(subprojectId);
    await this.store.writeJson(relativePath, snapshot);
    return {
      path: relativePath,
      snapshot,
    };
  }

  private async scanLocalSkills(): Promise<CodexLocalSkill[]> {
    if (!(await this.exists(this.skillsPath))) {
      return [];
    }

    const entries = await fs.readdir(this.skillsPath, { withFileTypes: true });
    const items = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const absolutePath = path.join(this.skillsPath, entry.name);
          return {
            id: entry.name,
            path: absolutePath,
            hasSkillMd: await this.exists(path.join(absolutePath, 'SKILL.md')),
            scope: this.classifySkillScope(entry.name),
          } satisfies CodexLocalSkill;
        }),
    );

    return items.sort((left, right) => left.id.localeCompare(right.id));
  }

  private async scanLocalPlugins(): Promise<{ plugins: CodexLocalPlugin[]; enabledPluginIds: string[] }> {
    const enabledPluginIds = await this.readEnabledPluginIds();
    const pluginMap = new Map<string, CodexLocalPlugin>();

    for (const pluginId of enabledPluginIds) {
      pluginMap.set(pluginId, {
        id: pluginId,
        enabled: true,
        source: 'config',
        cachePath: this.resolvePluginCachePath(pluginId),
      });
    }

    const cacheRoot = path.join(this.pluginsPath, 'cache');
    if (await this.exists(cacheRoot)) {
      const scopeDirs = await fs.readdir(cacheRoot, { withFileTypes: true });
      for (const scopeDir of scopeDirs) {
        if (!scopeDir.isDirectory()) {
          continue;
        }
        const scopePath = path.join(cacheRoot, scopeDir.name);
        const pluginDirs = await fs.readdir(scopePath, { withFileTypes: true });
        for (const pluginDir of pluginDirs) {
          if (!pluginDir.isDirectory()) {
            continue;
          }
          const pluginId = `${pluginDir.name}@${scopeDir.name}`;
          const existing = pluginMap.get(pluginId);
          const cachePath = path.join(scopePath, pluginDir.name);
          pluginMap.set(pluginId, {
            id: pluginId,
            enabled: existing?.enabled ?? false,
            source: existing ? 'config+cache' : 'cache',
            cachePath,
          });
        }
      }
    }

    return {
      enabledPluginIds: [...enabledPluginIds].sort((left, right) => left.localeCompare(right)),
      plugins: [...pluginMap.values()].sort((left, right) => left.id.localeCompare(right.id)),
    };
  }

  private async readEnabledPluginIds(): Promise<string[]> {
    if (!(await this.exists(this.configPath))) {
      return [];
    }

    const content = await fs.readFile(this.configPath, 'utf8');
    const enabled = new Set<string>();
    let currentPluginId: string | null = null;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      const sectionMatch = line.match(/^\[plugins\."([^"]+)"\]$/);
      if (sectionMatch) {
        currentPluginId = sectionMatch[1];
        continue;
      }
      if (line.startsWith('[') && !line.startsWith('[plugins.')) {
        currentPluginId = null;
        continue;
      }
      if (!currentPluginId) {
        continue;
      }
      const enabledMatch = line.match(/^enabled\s*=\s*(true|false)$/i);
      if (enabledMatch && enabledMatch[1].toLowerCase() === 'true') {
        enabled.add(currentPluginId);
      }
    }

    return [...enabled];
  }

  private async readRuntimeVisibleSkills(): Promise<CodexLocalStateSnapshot['runtimeVisibleSkills']> {
    const relativePath = 'docs/operations/codex-runtime-visible-skills.json';
    if (!(await this.store.exists(relativePath))) {
      return [];
    }
    const doc = await this.store.readJson<CodexRuntimeVisibleSkillDocument>(relativePath);
    return (doc.skills ?? [])
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        scope: skill.scope,
        description: skill.description,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  private async readGovernedPlugins(): Promise<CodexLocalStateSnapshot['governedPlugins']> {
    const relativePath = 'docs/operations/codex-plugin-tool-registry.json';
    if (!(await this.store.exists(relativePath))) {
      return [];
    }
    const doc = await this.store.readJson<CodexPluginToolRegistryDocument>(relativePath);
    return (doc.items ?? [])
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        runtimeVisibleSkillId: item.runtimeVisibleSkillId ?? null,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  private async readGovernedRuntimeCapabilities(): Promise<CodexLocalStateSnapshot['governedRuntimeCapabilities']> {
    const relativePath = 'docs/operations/codex-runtime-capability-classification.json';
    if (!(await this.store.exists(relativePath))) {
      return [];
    }
    const doc = await this.store.readJson<CodexRuntimeCapabilityClassificationDocument>(relativePath);
    return (doc.items ?? [])
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        targetRegistry: item.targetRegistry,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  private async readGovernedLocalRuntimeCore(): Promise<CodexLocalStateSnapshot['governedLocalRuntimeCore']> {
    const relativePath = 'docs/operations/codex-local-runtime-core-classification.json';
    if (!(await this.store.exists(relativePath))) {
      return [];
    }
    const doc = await this.store.readJson<CodexLocalRuntimeCoreClassificationDocument>(relativePath);
    return (doc.items ?? [])
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        targetRegistry: item.targetRegistry,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  private isExternalCodexSkill(skill: SkillDefinition) {
    return skill.tool === 'codex-skill' || skill.promptPath.includes('~/.codex/skills/');
  }

  private classifySkillScope(skillId: string): CodexLocalSkillScope {
    if (skillId.startsWith('.')) {
      return 'system';
    }
    if (skillId === 'codex-primary-runtime') {
      return 'runtime';
    }
    return 'user';
  }

  private resolvePluginCachePath(pluginId: string) {
    const [pluginName, scope] = pluginId.split('@');
    if (!pluginName || !scope) {
      return null;
    }
    return path.join(this.pluginsPath, 'cache', scope, pluginName);
  }

  private async exists(targetPath: string) {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}
