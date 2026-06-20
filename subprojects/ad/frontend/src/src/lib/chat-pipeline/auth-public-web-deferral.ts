import { detectPublicWebNeed } from '@/lib/public-web-runtime';

type BusinessContextLike = object | null | undefined;
type BusinessContextFields = {
  latestResult?: unknown;
  qualityCheck?: unknown;
  timeRange?: unknown;
  metrics?: unknown;
  project?: unknown;
  app?: unknown;
  media?: unknown;
};

export function hasInternalBusinessContext(businessContext: BusinessContextLike): boolean {
  if (!businessContext) return false;
  const context = businessContext as BusinessContextFields;
  return Boolean(
    context.latestResult
    || context.qualityCheck
    || context.timeRange
    || context.metrics
    || context.project
    || context.app
    || context.media
  );
}

export async function shouldUsePublicWebBeforeAuth(params: {
  question: string;
  conversationIntent?: string;
  hasUserScope: boolean;
  authRequired: boolean;
  businessContext: BusinessContextLike;
}): Promise<boolean> {
  const hasInternalContext = hasInternalBusinessContext(params.businessContext);
  if (params.hasUserScope || !params.authRequired) return false;
  const result = await detectPublicWebNeed(params.question, {
    context: {
      conversationIntent: params.conversationIntent,
      hasInternalBusinessSignal: hasInternalContext,
    },
  }).catch(() => null);
  return Boolean(
    result?.required
    && result.searchPlan?.allowed !== false
    && result.providerEligibility?.eligible !== false
    && result.factNeed?.fact_visibility === 'public'
    && !hasInternalContext
  );
}
