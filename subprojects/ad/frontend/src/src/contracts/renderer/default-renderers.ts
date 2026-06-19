import type { SemanticRegion } from '../semantic/semantic-result-contract';
import type { RegisteredRenderer, RendererContext, ValidationResult } from './component-registry';
import { validateRendererData } from '../validation/renderer-data-validator';
import { createComponentRegistry } from './component-registry-runtime';

export interface RendererViewModel {
  kind: string;
  regionId: string;
  title?: string;
  data?: unknown;
  actions?: unknown[];
  evidenceRefs?: string[];
  sourceRefs?: string[];
  runtimeRefs?: unknown[];
  fallbackReason?: string;
}

function validationToRendererResult(validation: ReturnType<typeof validateRendererData>): ValidationResult<unknown> {
  return {
    valid: validation.valid,
    errors: validation.errors.map((issue) => ({ code: issue.code, message: issue.message, path: issue.path })),
    warnings: validation.warnings.map((issue) => ({ code: issue.code, message: issue.message, path: issue.path })),
    normalizedData: validation.value,
  };
}

function createRenderer(binding: SemanticRegion['componentBinding'], kind = binding): RegisteredRenderer<unknown, unknown, RendererViewModel> {
  return {
    binding,
    version: '1.0.0',
    displayName: `${binding} default renderer`,
    validate: (data, region) => validationToRendererResult(validateRendererData(binding, data, region)),
    render: (region: SemanticRegion, _context: RendererContext): RendererViewModel => ({
      kind,
      regionId: region.id,
      title: region.title,
      data: region.data,
      actions: region.actions,
      evidenceRefs: region.evidenceRefs,
      sourceRefs: region.sourceRefs,
      runtimeRefs: region.runtimeRefs,
    }),
    fallback: (region: SemanticRegion, _context: RendererContext, reason: string): RendererViewModel => ({
      kind: 'fallback',
      regionId: region.id,
      title: region.title,
      data: region.data,
      fallbackReason: reason,
    }),
  };
}

export function createDefaultRendererRegistry() {
  const registry = createComponentRegistry<RendererViewModel>();

  const bindings: Array<SemanticRegion['componentBinding']> = [
    'markdown-result',
    'data-visualization',
    'ai-runtime',
    'workflow-trace',
    'asset-reference',
    'decision-card',
    'evidence-panel',
    'source-list',
    'action-bar',
    'disclosure-panel',
    'form-input',
    'feedback-panel',
    'permission-gate',
    'empty-state',
    'error-state',
  ];

  for (const binding of bindings) {
    registry.register(createRenderer(binding));
  }

  return registry;
}
