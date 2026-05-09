import { promises as fs } from 'node:fs';
import { z } from 'zod';
import { FileStore } from './fileStore.js';
import {
  SubprojectSchema,
  type Subproject,
} from '../shared/schemas.js';
import {
  createPlatformProjectContext,
  getProjectMemoryPath,
  getProjectRoot,
  getSubprojectManifestPath,
  type ProjectContext,
} from './projectPaths.js';

const SubprojectIdSchema = z.string().min(1).regex(/^[a-z0-9._-]+$/u, 'subproject id 只能包含小写字母、数字、点、下划线和中划线');

export class SubprojectRegistry {
  constructor(private readonly store: FileStore) {}

  async listSubprojects(): Promise<Subproject[]> {
    const subprojectsDir = this.store.resolve('subprojects');

    try {
      const entries = await fs.readdir(subprojectsDir, { withFileTypes: true });
      const subprojects = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            try {
              return await this.loadSubproject(entry.name);
            } catch {
              return null;
            }
          }),
      );

      return subprojects
        .filter((subproject): subproject is Subproject => subproject !== null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
      return [];
    }
  }

  async loadSubproject(subprojectId: string): Promise<Subproject> {
    const manifest = await this.store.readJson<unknown>(getSubprojectManifestPath(subprojectId));
    return SubprojectSchema.parse(manifest);
  }

  async createSubproject(input: {
    id: string;
    name?: string;
    description?: string;
    defaultWorkflow?: string;
    overrides?: {
      provider?: string;
      providerConfigPath?: string;
      workflow?: string;
      mcpConfigPath?: string;
      skillConfigPath?: string;
      dataki?: {
        agentId?: string;
        knowledgeBaseId?: string;
        knowledgeBaseIds?: string[];
      };
    };
  }): Promise<Subproject> {
    const id = SubprojectIdSchema.parse(input.id.trim());
    const manifestPath = getSubprojectManifestPath(id);
    if (await this.store.exists(manifestPath)) {
      throw new Error(`subproject ${id} 已存在。`);
    }

    const now = new Date().toISOString();
    const rootPath = getProjectRoot(id);
    const memoryPath = getProjectMemoryPath(id);
    const subproject: Subproject = {
      id,
      name: input.name?.trim() || id,
      description: input.description?.trim() || `${id} 业务子项目`,
      status: 'active',
      createdAt: now,
      defaultWorkflow: input.defaultWorkflow ?? 'ai-os-v2-main',
      rootPath,
      memoryPath,
      overrides: {
        provider: input.overrides?.provider?.trim() || undefined,
        providerConfigPath: input.overrides?.providerConfigPath?.trim() || undefined,
        workflow: input.overrides?.workflow?.trim() || undefined,
        mcpConfigPath: input.overrides?.mcpConfigPath?.trim() || undefined,
        skillConfigPath: input.overrides?.skillConfigPath?.trim() || undefined,
        dataki: input.overrides?.dataki
          ? {
              agentId: input.overrides.dataki.agentId?.trim() || undefined,
              knowledgeBaseId: input.overrides.dataki.knowledgeBaseId?.trim() || undefined,
              knowledgeBaseIds: (input.overrides.dataki.knowledgeBaseIds ?? []).map((item) => item.trim()).filter(Boolean),
            }
          : undefined,
      },
    };

    await this.store.writeJson(manifestPath, subproject);
    await this.store.write(
      memoryPath,
      ['# Project Memory', `- projectId: ${subproject.id}`, `- projectName: ${subproject.name}`, `- description: ${subproject.description}`].join(
        '\n',
      ),
    );

    return subproject;
  }

  async resolveProjectContext(subprojectId?: string | null): Promise<ProjectContext> {
    if (!subprojectId) {
      return createPlatformProjectContext();
    }

    const subproject = await this.loadSubproject(subprojectId);
    return {
      subprojectId: subproject.id,
      projectName: subproject.name,
      projectDescription: subproject.description,
      projectRoot: subproject.rootPath,
      projectMemoryPath: subproject.memoryPath,
      selectedProvider: subproject.overrides.provider ?? null,
      providerConfigPath: subproject.overrides.providerConfigPath ?? null,
      mcpConfigPath: subproject.overrides.mcpConfigPath ?? null,
    };
  }

  async updateOverrides(
    subprojectId: string,
    overrides: {
      provider?: string | null;
      providerConfigPath?: string | null;
      workflow?: string | null;
      mcpConfigPath?: string | null;
      skillConfigPath?: string | null;
      dataki?:
        | {
            agentId?: string | null;
            knowledgeBaseId?: string | null;
            knowledgeBaseIds?: string[] | null;
          }
        | null;
    },
  ): Promise<Subproject> {
    const subproject = await this.loadSubproject(subprojectId);
    const nextSubproject: Subproject = {
      ...subproject,
      overrides: {
        provider: overrides.provider !== undefined ? overrides.provider?.trim() || undefined : subproject.overrides.provider,
        providerConfigPath:
          overrides.providerConfigPath !== undefined
            ? overrides.providerConfigPath?.trim() || undefined
            : subproject.overrides.providerConfigPath,
        workflow: overrides.workflow !== undefined ? overrides.workflow?.trim() || undefined : subproject.overrides.workflow,
        mcpConfigPath:
          overrides.mcpConfigPath !== undefined ? overrides.mcpConfigPath?.trim() || undefined : subproject.overrides.mcpConfigPath,
        skillConfigPath:
          overrides.skillConfigPath !== undefined ? overrides.skillConfigPath?.trim() || undefined : subproject.overrides.skillConfigPath,
        dataki:
          overrides.dataki !== undefined
            ? overrides.dataki
              ? {
                  agentId: overrides.dataki.agentId?.trim() || undefined,
                  knowledgeBaseId: overrides.dataki.knowledgeBaseId?.trim() || undefined,
                  knowledgeBaseIds: (overrides.dataki.knowledgeBaseIds ?? []).map((item) => item.trim()).filter(Boolean),
                }
              : undefined
            : subproject.overrides.dataki,
      },
    };

    await this.store.writeJson(getSubprojectManifestPath(subprojectId), nextSubproject);
    return nextSubproject;
  }
}
