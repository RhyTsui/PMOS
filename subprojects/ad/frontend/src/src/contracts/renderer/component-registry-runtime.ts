import type { SemanticRegion, SemanticResultContract, ComponentBinding } from '../semantic/semantic-result-contract';
import type {
  ComponentRegistry,
  RegisteredRenderer,
  RendererContext,
  ValidationResult,
} from './component-registry';

export interface RenderedFallbackRegion {
  kind: 'renderer-fallback';
  binding: string;
  regionId: string;
  title?: string;
  reason: string;
  message?: string;
  rawData?: unknown;
}

export interface RenderedResult<TRendered = unknown> {
  kind: 'semantic-result-rendered';
  resultId: string;
  screenType: string;
  regions: TRendered[];
}

export interface ComponentRegistryOptions<TRendered = unknown> {
  fallbackRenderer?: (region: SemanticRegion, context: RendererContext, reason: string) => TRendered;
  onRendererError?: (error: unknown, region: SemanticRegion, binding: string) => void;
  sortRegions?: (regions: SemanticRegion[]) => SemanticRegion[];
}

export function createComponentRegistry<TRendered = unknown>(
  options: ComponentRegistryOptions<TRendered> = {},
): ComponentRegistry<TRendered> {
  const renderers = new Map<ComponentBinding, RegisteredRenderer<unknown, unknown, TRendered>>();

  const fallbackRenderer = options.fallbackRenderer ?? ((region, _context, reason) => ({
    kind: 'renderer-fallback',
    binding: region.componentBinding,
    regionId: region.id,
    title: region.title,
    reason,
    message: region.fallback?.message ?? `展示方式已降级：${reason}`,
    rawData: region.data,
  }) as TRendered);

  const sortRegions = options.sortRegions ?? ((regions: SemanticRegion[]) => [...regions].sort((a, b) => {
    const ap = a.layoutHints?.priority ?? a.priority ?? 100;
    const bp = b.layoutHints?.priority ?? b.priority ?? 100;
    return ap - bp;
  }));

  function register(renderer: RegisteredRenderer<unknown, unknown, TRendered>): void {
    if (!renderer.binding) throw new Error('Renderer binding is required.');
    if (!renderer.validate) throw new Error(`Renderer ${renderer.binding} must define validate().`);
    if (!renderer.render) throw new Error(`Renderer ${renderer.binding} must define render().`);
    renderers.set(renderer.binding, renderer);
  }

  function unregister(binding: ComponentBinding): void {
    renderers.delete(binding);
  }

  function resolve(binding: ComponentBinding): RegisteredRenderer<unknown, unknown, TRendered> | undefined {
    return renderers.get(binding);
  }

  function renderRegion(region: SemanticRegion, context: RendererContext): TRendered {
    const renderer = resolve(region.componentBinding);

    if (!renderer) {
      context.telemetry?.track('renderer_fallback_used', {
        reason: 'unknown_binding',
        binding: region.componentBinding,
        regionId: region.id,
      });
      return fallbackRenderer(region, context, 'unknown_binding');
    }

    const permissionAllowed = context.permissionChecker?.(region.permission?.requiredPermissions) ?? true;
    const visible = context.visibilityEvaluator?.(region) ?? region.visibility?.defaultVisible ?? true;

    if (!visible) {
      return fallbackRenderer(region, context, 'hidden_by_visibility_policy');
    }

    if (!permissionAllowed) {
      context.telemetry?.track('renderer_fallback_used', {
        reason: 'permission_denied',
        binding: region.componentBinding,
        regionId: region.id,
      });
      return renderer.fallback?.(region, context, 'permission_denied') ?? fallbackRenderer(region, context, 'permission_denied');
    }

    let validation: ValidationResult<unknown>;
    try {
      validation = renderer.validate(region.data, region);
    } catch (error) {
      options.onRendererError?.(error, region, region.componentBinding);
      context.telemetry?.track('renderer_validation_threw', {
        binding: region.componentBinding,
        regionId: region.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return renderer.fallback?.(region, context, 'validator_error') ?? fallbackRenderer(region, context, 'validator_error');
    }

    if (!validation.valid) {
      context.telemetry?.track('renderer_fallback_used', {
        reason: 'invalid_data',
        binding: region.componentBinding,
        regionId: region.id,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return renderer.fallback?.(region, context, 'invalid_data') ?? fallbackRenderer(region, context, 'invalid_data');
    }

    try {
      return renderer.render(region, context);
    } catch (error) {
      options.onRendererError?.(error, region, region.componentBinding);
      context.telemetry?.track('renderer_error', {
        binding: region.componentBinding,
        regionId: region.id,
        rendererVersion: renderer.version,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        fallbackUsed: true,
      });
      return renderer.fallback?.(region, context, 'render_error') ?? fallbackRenderer(region, context, 'render_error');
    }
  }

  function renderResult(result: SemanticResultContract, context: RendererContext): TRendered {
    const regions = sortRegions(result.regions).map((region) => renderRegion(region, context));
    return {
      kind: 'semantic-result-rendered',
      resultId: result.resultId,
      screenType: result.screenType,
      regions,
    } as TRendered;
  }

  return {
    register,
    unregister,
    resolve,
    renderRegion,
    renderResult,
  };
}
