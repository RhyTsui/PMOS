import { FileStore } from './fileStore.js';
import { SubprojectRegistry } from './subprojectRegistry.js';

type McpServerConfig = {
  name: string;
  transport: string;
  command: string;
  args: string[];
  enabled: boolean;
  tools: string[];
};

export class McpRegistry {
  constructor(
    private readonly store: FileStore,
    private readonly subprojectRegistry = new SubprojectRegistry(store),
  ) {}

  async listServers(subprojectId?: string | null): Promise<McpServerConfig[]> {
    const configPath = await this.resolveMcpConfigPath(subprojectId);
    const config = await this.store.readJson<{ servers: McpServerConfig[] }>(configPath ?? 'mcp/mcp-servers.example.json');
    return config.servers;
  }

  private async resolveMcpConfigPath(subprojectId?: string | null) {
    if (!subprojectId) {
      return null;
    }

    const subproject = await this.subprojectRegistry.loadSubproject(subprojectId);
    return subproject.overrides.mcpConfigPath ?? null;
  }
}
