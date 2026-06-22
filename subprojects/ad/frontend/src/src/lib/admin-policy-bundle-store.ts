import { createHash } from 'node:crypto';
import type {
  AdminFeatureFlagPolicy,
  AdminPolicyBundle,
  AdminPolicyRiskLevel,
  AdminPolicySource,
  AdminPolicyStatus,
  AdminPolicyVersionRef,
  EffectiveChatRuntimeConfig,
} from '@/contracts/admin-control-plane';
import { buildReportCapabilityManifest } from '@/lib/report-capability-manifest';
import { listMcpServers } from '@/lib/mcp-server-store';
import { listFeatureSwitches } from '@/lib/feature-switch-store';
import { loadReportCapabilityOverrideConfigSync } from '@/lib/report-capability-override-store';
import { loadReportQueryPolicySync } from '@/lib/report-query-policy-store';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { listEffectiveModelRoutes } from '@/lib/runtime-config';
import { listPrompts } from '@/lib/prompt-store';
import { getEvidenceSafetyPoliciesSync } from '@/lib/evidence-safety-policy-store';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function checksum(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

function versionRef(params: {
  key: string;
  value: unknown;
  updatedAt?: string;
  owner?: string;
  source?: AdminPolicySource;
  riskLevel?: AdminPolicyRiskLevel;
  status?: AdminPolicyStatus;
}): AdminPolicyVersionRef {
  const updatedAt = params.updatedAt || new Date().toISOString();
  const hash = checksum(params.value);
  return {
    key: params.key,
    version: `${params.key}@${hash}`,
    updatedAt,
    owner: params.owner || 'admin-control-plane',
    source: params.source || 'derived_runtime',
    riskLevel: params.riskLevel || 'medium',
    status: params.status || 'active',
    checksum: hash,
  };
}

function featureValue(flag: AdminFeatureFlagPolicy): boolean | number {
  if (flag.type === 'number') {
    const value = Number(flag.config?.value);
    return flag.enabled && Number.isFinite(value) ? value : 0;
  }
  return flag.enabled;
}

function toFeatureFlagPolicy(flag: Awaited<ReturnType<typeof listFeatureSwitches>>[number]): AdminFeatureFlagPolicy {
  return {
    key: flag.key,
    name: flag.name,
    enabled: flag.enabled,
    type: flag.type,
    scope: flag.scope,
    runtimeBinding: flag.runtimeBinding,
    riskLevel: flag.riskLevel,
    owner: flag.owner,
    updatedAt: flag.updatedAt,
    configVersion: flag.configVersion,
    checksum: flag.checksum,
    description: flag.description,
    config: flag.config,
  };
}

export function getAdminConfigVersionMap(bundle: AdminPolicyBundle): Record<string, string> {
  return {
    bundle: bundle.version.version,
    capability: bundle.capability.version.version,
    tool_contract: bundle.toolContract.version.version,
    route_policy: bundle.routePolicy.version.version,
    model_prompt: bundle.modelPrompt.version.version,
    evidence_policy: bundle.evidencePolicy.version.version,
    safety_policy: bundle.safetyPolicy.version.version,
    trace_policy: bundle.tracePolicy.version.version,
    feature_flags: bundle.featureFlags.version.version,
  };
}

export async function getAdminPolicyBundle(): Promise<AdminPolicyBundle> {
  const [
    servers,
    switches,
    modelRoutes,
    prompts,
  ] = await Promise.all([
    listMcpServers(),
    listFeatureSwitches(),
    listEffectiveModelRoutes(),
    listPrompts(),
  ]);
  const manifest = buildReportCapabilityManifest(servers);
  const overrides = loadReportCapabilityOverrideConfigSync();
  const routePolicy = loadReportQueryPolicySync();
  const traceConfig = getTraceConfigSync();
  const { evidencePolicy, safetyPolicy } = getEvidenceSafetyPoliciesSync();
  const featureFlags = switches.map(toFeatureFlagPolicy);
  const now = new Date().toISOString();
  const enabledServers = servers.filter(server => server.enabled !== false);
  const toolCount = servers.reduce((sum, server) => sum + (Array.isArray(server.tools) ? server.tools.length : 0), 0);
  const activePrompts = prompts.filter(prompt => prompt.status === 'active');
  const enabledModelRoutes = modelRoutes.filter(route => route.enabled);

  const capability = {
    manifestCount: manifest.tools.length + manifest.dictionary_tools.length,
    overrideCount: overrides.overrides.length,
    enabledOverrideCount: overrides.overrides.filter(item => item.enabled).length,
    warningCount: manifest.warnings.length,
  };
  const toolContract = {
    serverCount: servers.length,
    enabledServerCount: enabledServers.length,
    toolCount,
  };
  const routePolicySummary = {
    enabled: routePolicy.enabled,
    ruleCount: routePolicy.tool_selection_rules.length,
    fallbackPolicy: 'planner_candidate_plus_config_fallback',
    governedSeed: routePolicy.packs.length > 0,
  };
  const modelPrompt = {
    modelRouteCount: modelRoutes.length,
    enabledModelRouteCount: enabledModelRoutes.length,
    promptCount: prompts.length,
    activePromptCount: activePrompts.length,
  };

  const partial = {
    capability,
    toolContract,
    routePolicy: routePolicySummary,
    modelPrompt,
    evidencePolicyVersion: evidencePolicy.version.version,
    safetyPolicyVersion: safetyPolicy.version.version,
    tracePolicy: {
      enabled: traceConfig.enabled,
      sampleRate: traceConfig.sampleRate,
      serviceName: traceConfig.serviceName,
      env: traceConfig.env,
    },
    featureFlags: featureFlags.map(item => ({ key: item.key, enabled: item.enabled, checksum: item.checksum })),
  };
  const warnings: string[] = [];
  if (!traceConfig.enabled) warnings.push('Trace 当前未启用，主链路会继续运行但观测会降级。');
  if (manifest.warnings.length > 0) warnings.push(`能力清单有 ${manifest.warnings.length} 条提示需要关注。`);
  if (enabledServers.length === 0) warnings.push('当前没有启用的 MCP 接入。');

  const bundleVersion = versionRef({ key: 'admin-policy-bundle', value: partial, updatedAt: now, riskLevel: 'high' });
  return {
    schemaVersion: 'admin-policy-bundle/v1',
    version: bundleVersion,
    capability: {
      version: versionRef({ key: 'capability-policy', value: { manifest, overrides }, updatedAt: overrides.updated_at, source: 'derived_runtime', riskLevel: 'high' }),
      ...capability,
    },
    toolContract: {
      version: versionRef({ key: 'tool-contract-policy', value: servers.map(server => ({ id: server.id, enabled: server.enabled, tools: server.tools?.length || 0, updated_at: server.updated_at })), updatedAt: now, source: 'admin_store', riskLevel: 'high' }),
      ...toolContract,
    },
    routePolicy: {
      version: versionRef({ key: 'route-policy', value: routePolicy, updatedAt: routePolicy.updated_at, source: 'admin_store', riskLevel: 'high' }),
      ...routePolicySummary,
    },
    modelPrompt: {
      version: versionRef({ key: 'model-prompt-policy', value: { modelRoutes, prompts: prompts.map(prompt => ({ id: prompt.id, status: prompt.status, version: prompt.current_version, hash: prompt.content_hash })) }, updatedAt: now, source: 'admin_store', riskLevel: 'high' }),
      ...modelPrompt,
    },
    evidencePolicy,
    safetyPolicy,
    tracePolicy: {
      version: versionRef({ key: 'trace-policy', value: traceConfig, updatedAt: now, source: 'admin_store', riskLevel: 'medium' }),
      enabled: traceConfig.enabled,
      sampleRate: traceConfig.sampleRate,
      serviceName: traceConfig.serviceName,
      env: traceConfig.env,
    },
    featureFlags: {
      version: versionRef({ key: 'feature-flags', value: featureFlags, updatedAt: now, source: 'admin_store', riskLevel: 'high' }),
      flags: featureFlags,
    },
    health: {
      status: warnings.length ? 'degraded' : 'healthy',
      warnings,
      generatedAt: now,
    },
  };
}

export async function getEffectiveChatRuntimeConfig(): Promise<EffectiveChatRuntimeConfig> {
  const bundle = await getAdminPolicyBundle();
  return {
    schemaVersion: 'effective-chat-runtime-config/v1',
    generatedAt: bundle.health.generatedAt,
    adminConfigVersions: getAdminConfigVersionMap(bundle),
    featureFlags: Object.fromEntries(bundle.featureFlags.flags.map(flag => [flag.key, featureValue(flag)])),
    safetyPolicy: bundle.safetyPolicy,
    evidencePolicy: bundle.evidencePolicy,
    tracePolicy: bundle.tracePolicy,
    routePolicy: {
      version: bundle.routePolicy.version.version,
      enabled: bundle.routePolicy.enabled,
      ruleCount: bundle.routePolicy.ruleCount,
      fallbackPolicy: bundle.routePolicy.fallbackPolicy,
      governedSeed: bundle.routePolicy.governedSeed,
    },
    capabilityPolicy: {
      version: bundle.capability.version.version,
      manifestCount: bundle.capability.manifestCount,
      overrideCount: bundle.capability.overrideCount,
      enabledOverrideCount: bundle.capability.enabledOverrideCount,
      warningCount: bundle.capability.warningCount,
    },
    modelPromptPolicy: {
      version: bundle.modelPrompt.version.version,
      modelRouteCount: bundle.modelPrompt.modelRouteCount,
      enabledModelRouteCount: bundle.modelPrompt.enabledModelRouteCount,
      promptCount: bundle.modelPrompt.promptCount,
      activePromptCount: bundle.modelPrompt.activePromptCount,
    },
  };
}
