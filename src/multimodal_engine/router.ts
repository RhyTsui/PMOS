import type { ProviderCapability, ProviderSummary, MultimodalArtifact, MultimodalExecutionResult } from '../shared/schemas.js';
import { FileStore } from '../core/fileStore.js';
import { ProviderRegistry } from '../core/providerRegistry.js';
import { SubprojectRegistry } from '../core/subprojectRegistry.js';
import { prefixProjectPath } from '../core/projectPaths.js';

type MultimodalRouterScope = {
  subprojectId?: string | null;
  preferredProvider?: string | null;
};

type MultimodalRequest = {
  runId: string;
  stageId: string;
  capability: ProviderCapability;
  prompt: string;
};

export class MultimodalRouter {
  constructor(
    private readonly store: FileStore,
    private readonly registry = new ProviderRegistry(store),
    private readonly subprojectRegistry = new SubprojectRegistry(store),
  ) {}

  async execute(request: MultimodalRequest, scope: MultimodalRouterScope = {}): Promise<MultimodalExecutionResult> {
    const project = await this.subprojectRegistry.resolveProjectContext(scope.subprojectId ?? null);
    const provider = await this.selectProvider(request.capability, scope.subprojectId ?? null, scope.preferredProvider ?? null);
    const artifact = this.buildArtifact(request.prompt, request.capability, provider);
    const relativePath = prefixProjectPath(
      project.projectRoot,
      `design/generated/${request.runId}-${request.stageId}-${artifact.type}.json`,
    );

    await this.store.writeJson(relativePath, artifact);

    return {
      providerName: provider.name,
      providerType: provider.type,
      requestedCapability: request.capability,
      artifactPath: relativePath,
      artifact,
      summaryText: `${artifact.title}\n${artifact.summary}\n已写入：${relativePath}`,
    };
  }

  private async selectProvider(capability: ProviderCapability, subprojectId: string | null, preferredProvider: string | null): Promise<ProviderSummary> {
    const providers = await this.registry.listProviders(subprojectId);
    const matches = providers.filter((provider) => provider.capabilities.includes(capability));
    if (matches.length === 0) {
      throw new Error(`没有 provider 声明支持能力 ${capability}。`);
    }

    const preferred = preferredProvider ? matches.find((provider) => provider.name === preferredProvider) : null;
    return preferred ?? matches.find((provider) => provider.runtimeReady) ?? matches[0]!;
  }

  private buildArtifact(prompt: string, capability: ProviderCapability, provider: ProviderSummary): MultimodalArtifact {
    const normalizedPrompt = prompt.trim();
    if (capability === 'text-multimodal') {
      return {
        type: 'ui-structure',
        title: 'UI 结构草图',
        summary: `基于请求“${normalizedPrompt}”生成的后台页面 UI 结构，共 5 个模块，当前由 ${provider.name} 路由记录。`,
        format: 'structured-json',
        blocks: [
          { id: 'page', label: '管理后台页面', type: 'page', description: '承载导航、筛选、表格与详情抽屉。', children: ['filters', 'table', 'drawer'] },
          { id: 'filters', label: '顶部筛选区', type: 'section', description: '包含时间范围、业务线、负责人筛选。', children: ['actions'] },
          { id: 'actions', label: '快捷操作区', type: 'toolbar', description: '提供查询、导出、创建任务按钮。', children: [] },
          { id: 'table', label: '数据列表区', type: 'table', description: '展示核心指标、状态、更新时间。', children: [] },
          { id: 'drawer', label: '右侧详情抽屉', type: 'panel', description: '查看记录详情、日志和处理建议。', children: [] },
        ],
      };
    }

    return {
      type: 'architecture-outline',
      title: '架构草图',
      summary: `基于请求“${normalizedPrompt}”生成的结构化架构草图，当前由 ${provider.name} 路由记录。`,
      format: 'structured-json',
      blocks: [
        { id: 'entry', label: '入口层', type: 'layer', description: '接收用户请求并触发编排。', children: ['workflow'] },
        { id: 'workflow', label: '工作流层', type: 'layer', description: '负责路由、Agent 调度与状态推进。', children: ['storage'] },
        { id: 'storage', label: '存储层', type: 'layer', description: '保存文档、设计稿和媒体元数据。', children: [] },
      ],
    };
  }
}
