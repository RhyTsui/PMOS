import type { WorkflowRun } from '../shared/schemas.js';
import { FileStore } from './fileStore.js';
import type { ModelProviderRequest, ProviderExecutionBundle } from './modelProvider.js';
import { LlmRouter } from '../llm_router/index.js';

export class ProviderRouter {
  constructor(
    private readonly store: FileStore,
    private readonly llmRouter = new LlmRouter(store),
  ) {}

  async execute(request: ModelProviderRequest, run?: WorkflowRun): Promise<ProviderExecutionBundle> {
    return this.llmRouter.execute(request, {
      subprojectId: run?.subprojectId ?? null,
      preferredProvider: run?.selectedProvider ?? null,
    });
  }
}
