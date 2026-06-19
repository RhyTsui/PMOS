import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';
import type { EntityType, IdentifierKey } from '@/contracts/request-understanding/entity-resolution';
import type { CapabilityKind, CapabilitySlotMapping, ReportCapabilityDomain } from './report-capability-manifest';
import type { DictionaryOutputAdapterConfig } from './mcp-tool-output-adapter';

export interface ReportCapabilityOverride {
  id: string;
  enabled: boolean;
  capability_id?: string;
  server_id?: string;
  tool_name?: string;
  capability_kind?: CapabilityKind;
  supported_entity_types?: EntityType[];
  identifier_keys?: IdentifierKey[];
  label_keys?: string[];
  output_adapter?: DictionaryOutputAdapterConfig;
  slot_mappings?: CapabilitySlotMapping[];
  report_domains?: ReportCapabilityDomain[];
  required_dictionary_tools?: string[];
  route_terms?: string[];
  notes?: string;
}

export interface ReportCapabilityOverrideConfig {
  schema_version: 1;
  enabled: boolean;
  overrides: ReportCapabilityOverride[];
  updated_at: string;
}

const STORE_PATH = runtimeDataPath('report-capability-overrides.json');
const ALLOWED_DOMAINS = new Set<ReportCapabilityDomain>([
  'daily',
  'weekly',
  'monthly',
  'hourly',
  'roi',
  'retention',
  'dictionary',
  'project',
]);
const ALLOWED_CAPABILITY_KINDS = new Set<CapabilityKind>([
  'identifier_normalization',
  'context_lookup',
  'knowledge_lookup',
  'report_query',
  'workflow',
  'general',
]);
const ALLOWED_ENTITY_TYPES = new Set<EntityType>([
  'media',
  'app',
  'campaign',
  'material',
  'account',
  'team',
  'app_package_type',
  'package',
  'terminal',
  'terminal_os',
]);
const ALLOWED_IDENTIFIER_KEYS = new Set<IdentifierKey>([
  'media_id',
  'app_id',
  'campaign_id',
  'material_id',
  'account_id',
  'team_id',
  'app_package_type',
  'app_package_id',
  'terminal_id',
  'os_type',
]);

function normalizeStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const output = value.map(item => String(item || '').trim()).filter(Boolean);
  return output.length ? Array.from(new Set(output)) : undefined;
}

function normalizeDomains(value: unknown): ReportCapabilityDomain[] | undefined {
  const list = normalizeStringList(value);
  if (!list) return undefined;
  const domains = list.filter(item => ALLOWED_DOMAINS.has(item as ReportCapabilityDomain)) as ReportCapabilityDomain[];
  return domains.length ? Array.from(new Set(domains)) : undefined;
}

function normalizeCapabilityKind(value: unknown): CapabilityKind | undefined {
  const normalized = String(value || '').trim();
  return ALLOWED_CAPABILITY_KINDS.has(normalized as CapabilityKind) ? normalized as CapabilityKind : undefined;
}

function normalizeEntityTypes(value: unknown): EntityType[] | undefined {
  const list = normalizeStringList(value);
  if (!list) return undefined;
  const entityTypes = list.filter(item => ALLOWED_ENTITY_TYPES.has(item as EntityType)) as EntityType[];
  return entityTypes.length ? Array.from(new Set(entityTypes)) : undefined;
}

function normalizeIdentifierKeys(value: unknown): IdentifierKey[] | undefined {
  const list = normalizeStringList(value);
  if (!list) return undefined;
  const identifierKeys = list.filter(item => ALLOWED_IDENTIFIER_KEYS.has(item as IdentifierKey)) as IdentifierKey[];
  return identifierKeys.length ? Array.from(new Set(identifierKeys)) : undefined;
}

function normalizeAdapterConfig(value: unknown): DictionaryOutputAdapterConfig | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as DictionaryOutputAdapterConfig;
  const config: DictionaryOutputAdapterConfig = {
    candidate_array_paths: normalizeStringList(input.candidate_array_paths),
    id_keys: normalizeStringList(input.id_keys),
    label_keys: normalizeStringList(input.label_keys),
    alias_keys: normalizeStringList(input.alias_keys),
    matched_id_keys: normalizeStringList(input.matched_id_keys),
  };
  return Object.values(config).some(item => Array.isArray(item) && item.length > 0) ? config : undefined;
}

function normalizeSlotMappings(value: unknown): CapabilitySlotMapping[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const mappings = value.flatMap((item): CapabilitySlotMapping[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const input = item as Partial<CapabilitySlotMapping>;
    const entityType = normalizeEntityTypes([input.entity_type])?.[0];
    const identifierKey = normalizeIdentifierKeys([input.identifier_key])?.[0];
    const targetKeys = normalizeStringList(input.target_keys);
    if (!entityType || !identifierKey || !targetKeys?.length) return [];
    const valueFormat = input.value_format === 'string' || input.value_format === 'csv' || input.value_format === 'array'
      ? input.value_format
      : undefined;
    return [{
      entity_type: entityType,
      identifier_key: identifierKey,
      target_keys: targetKeys,
      value_format: valueFormat,
      required: input.required === true,
    }];
  });
  return mappings.length ? mappings : undefined;
}

function normalizeOverride(input: Partial<ReportCapabilityOverride>, index: number): ReportCapabilityOverride | null {
  const capabilityId = String(input.capability_id || '').trim();
  const serverId = String(input.server_id || '').trim();
  const toolName = String(input.tool_name || '').trim();
  if (!capabilityId && (!serverId || !toolName)) return null;
  return {
    id: String(input.id || capabilityId || `${serverId}:${toolName}` || `override-${index}`).trim(),
    enabled: input.enabled !== false,
    capability_id: capabilityId || undefined,
    server_id: serverId || undefined,
    tool_name: toolName || undefined,
    capability_kind: normalizeCapabilityKind(input.capability_kind),
    supported_entity_types: normalizeEntityTypes(input.supported_entity_types),
    identifier_keys: normalizeIdentifierKeys(input.identifier_keys),
    label_keys: normalizeStringList(input.label_keys),
    output_adapter: normalizeAdapterConfig(input.output_adapter),
    slot_mappings: normalizeSlotMappings(input.slot_mappings),
    report_domains: normalizeDomains(input.report_domains),
    required_dictionary_tools: normalizeStringList(input.required_dictionary_tools),
    route_terms: normalizeStringList(input.route_terms),
    notes: String(input.notes || '').trim() || undefined,
  };
}

export function normalizeReportCapabilityOverrideConfig(input?: Partial<ReportCapabilityOverrideConfig>): ReportCapabilityOverrideConfig {
  const overrides = Array.isArray(input?.overrides)
    ? input.overrides
      .map((item, index) => normalizeOverride(item, index))
      .filter(Boolean) as ReportCapabilityOverride[]
    : [];
  return {
    schema_version: 1,
    enabled: input?.enabled !== false,
    overrides,
    updated_at: String(input?.updated_at || new Date().toISOString()),
  };
}

export function loadReportCapabilityOverrideConfigSync(): ReportCapabilityOverrideConfig {
  try {
    if (!existsSync(STORE_PATH)) return normalizeReportCapabilityOverrideConfig();
    const raw = readFileSync(STORE_PATH, 'utf8');
    return normalizeReportCapabilityOverrideConfig(JSON.parse(raw) as Partial<ReportCapabilityOverrideConfig>);
  } catch {
    return normalizeReportCapabilityOverrideConfig();
  }
}

export function loadReportCapabilityOverridesSync(): ReportCapabilityOverride[] {
  const config = loadReportCapabilityOverrideConfigSync();
  return config.enabled ? config.overrides.filter(item => item.enabled) : [];
}

export async function saveReportCapabilityOverrideConfig(
  patch: Partial<ReportCapabilityOverrideConfig>,
): Promise<ReportCapabilityOverrideConfig> {
  const next = normalizeReportCapabilityOverrideConfig({
    ...loadReportCapabilityOverrideConfigSync(),
    ...patch,
    updated_at: new Date().toISOString(),
  });
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
