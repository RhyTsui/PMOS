export type EntityType =
  | 'media'
  | 'app'
  | 'campaign'
  | 'material'
  | 'account'
  | 'team'
  | 'app_package_type'
  | 'package'
  | 'terminal'
  | 'terminal_os';

export type IdentifierKey =
  | 'media_id'
  | 'app_id'
  | 'campaign_id'
  | 'material_id'
  | 'account_id'
  | 'team_id'
  | 'app_package_type'
  | 'app_package_id'
  | 'terminal_id'
  | 'os_type';

export type EntityResolutionStatus =
  | 'resolved'
  | 'needs_user_selection'
  | 'needs_enrichment'
  | 'not_found'
  | 'capability_unavailable'
  | 'output_invalid';

export interface EntityCandidate {
  id: string;
  name?: string;
  aliases?: string[];
  confidence: number;
  source?: string;
  sourceCapabilityId?: string;
  rawRef?: string;
  qualityFlags?: Array<'id_only' | 'label_missing' | 'alias_missing' | 'server_side_match' | 'schema_inferred'>;
  metadata?: Record<string, unknown>;
}

export type DictionaryCandidate = EntityCandidate;

export interface EntityResolution {
  entityType: EntityType;
  rawText: string;
  normalizedId?: string;
  normalizedName?: string;
  confidence: number;
  status: EntityResolutionStatus;
  candidates?: EntityCandidate[];
  identifierKey?: IdentifierKey;
  normalizationCapabilityId?: string;
  normalizationToolName?: string;
}

export interface EntityDependency {
  entityType: EntityType;
  identifierKey: IdentifierKey;
  required: boolean;
}

export interface EntityResolutionTraceStep {
  entityType: EntityType;
  stage: 'detected' | 'alias_match' | 'capability_selection' | 'normalization' | 'validation' | 'decision';
  status: EntityResolutionStatus | 'matched' | 'skipped';
  detail: string;
  capabilityId?: string;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

export function identifierKeyForEntityType(entityType: EntityType): IdentifierKey {
  const mapping: Record<EntityType, IdentifierKey> = {
    media: 'media_id',
    app: 'app_id',
    campaign: 'campaign_id',
    material: 'material_id',
    account: 'account_id',
    team: 'team_id',
    app_package_type: 'app_package_type',
    package: 'app_package_id',
    terminal: 'terminal_id',
    terminal_os: 'os_type',
  };
  return mapping[entityType];
}

export function entityLabel(entityType: EntityType): string {
  const mapping: Record<EntityType, string> = {
    app_package_type: '应用类型',
    media: '媒体平台',
    app: '应用',
    campaign: '广告计划',
    material: '素材',
    account: '账户',
    team: '团队',
    package: '包体',
    terminal: '终端',
    terminal_os: '终端系统',
  };
  return mapping[entityType];
}
