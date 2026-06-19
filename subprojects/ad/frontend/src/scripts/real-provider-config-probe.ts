import {
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  getPublicWebConfig,
  hasConfiguredKnowledgeCredentials,
  resolveKnowledgeBaseIds,
} from '../src/lib/runtime-config';

async function main(): Promise<void> {
  const model = await getModelServiceConfig();
  const publicWeb = await getPublicWebConfig();
  const knowledgeBaseIds = await resolveKnowledgeBaseIds(model).catch((error) => [`ERROR:${String(error?.message || error)}`]);

  console.log(JSON.stringify({
    evidence_tier: 'real_provider_config_probe',
    uses_mock: false,
    model_enabled: model.enabled,
    kb_has_credentials: hasConfiguredKnowledgeCredentials(model),
    kb_endpoint_set: Boolean(getKnowledgeSearchEndpoint(model)),
    kb_url_set: Boolean(model.knowledgeBaseUrl || model.baseUrl),
    kb_dataset_set: Boolean(model.knowledgeBaseDataset),
    kb_ids_count: knowledgeBaseIds.length,
    kb_ids_sample: knowledgeBaseIds.slice(0, 2).map((item) => `${String(item).slice(0, 8)}***`),
    public_web_enabled: publicWeb.enabled,
    public_web_endpoint_set: Boolean(publicWeb.searchEndpoint),
    public_web_provider: publicWeb.providerLabel,
    public_web_method: publicWeb.method,
    public_web_allowed_domains_count: publicWeb.allowedDomains.length,
    public_web_blocked_domains_count: publicWeb.blockedDomains.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
