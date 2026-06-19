import { buildModelBreakerKey, getModelBreakerSnapshot } from '../src/lib/model-resilience';
import { buildEffectiveModelRoute, getModelServiceConfig } from '../src/lib/runtime-config';

async function main(): Promise<void> {
  const modelService = await getModelServiceConfig();
  const effectiveRoute = buildEffectiveModelRoute(modelService, 'chat_answer');
  const breakerKey = buildModelBreakerKey({
    useCase: 'chat_answer',
    modelProfileId: effectiveRoute.modelProfileId,
    modelName: effectiveRoute.modelName,
  });
  const snapshot = await getModelBreakerSnapshot(breakerKey);
  const openUntilMs = snapshot?.openUntil ? Date.parse(snapshot.openUntil) : 0;
  const activeOpen = snapshot?.state === 'open' && Number.isFinite(openUntilMs) && openUntilMs > Date.now();

  console.log(JSON.stringify({
    validation_mode: 'real_runtime_state_no_mock',
    use_case: 'chat_answer',
    model_enabled: modelService.enabled,
    route_enabled: effectiveRoute.enabled,
    route_mode: effectiveRoute.routeMode,
    is_real_llm_call: effectiveRoute.isRealLLMCall,
    model_profile_id: effectiveRoute.modelProfileId,
    model_name: effectiveRoute.modelName,
    breaker_key: breakerKey,
    breaker_state: snapshot?.state || 'closed',
    breaker_active_open: activeOpen,
    open_until: snapshot?.openUntil,
    last_failure_at: snapshot?.lastFailureAt,
    last_error_kind: snapshot?.lastErrorKind,
    last_status_code: snapshot?.lastStatusCode,
  }, null, 2));

  if (activeOpen) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
