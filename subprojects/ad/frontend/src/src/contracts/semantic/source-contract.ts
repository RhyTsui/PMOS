import type { DataFreshness, RedactionPolicy } from './evidence-contract';

export type SourceType =
  | 'warehouse-table'
  | 'warehouse-query'
  | 'api'
  | 'file'
  | 'document'
  | 'url'
  | 'email'
  | 'spreadsheet'
  | 'chart'
  | 'report'
  | 'artifact'
  | 'tool'
  | 'runtime'
  | 'human'
  | 'model'
  | 'system'
  | 'policy'
  | 'web_search'
  | 'web_fetch'
  | 'unknown';

export interface SourceLocator {
  kind:
    | 'table'
    | 'query'
    | 'file'
    | 'document'
    | 'url'
    | 'artifact'
    | 'runtime'
    | 'tool'
    | 'human'
    | 'system'
    | string;
  value: string;
  redacted?: boolean;
  params?: Record<string, unknown>;
}

export interface SourceReliability {
  level: 'verified' | 'trusted' | 'user-provided' | 'model-generated' | 'unknown';
  explanation?: string;
}

export interface CitationPolicy {
  required?: boolean;
  format?: 'inline' | 'panel' | 'footnote' | 'hidden';
  clickable?: boolean;
  quoteAllowed?: boolean;
  maxQuoteLength?: number;
}

export interface SourceRef {
  id: string;
  type: SourceType;
  title: string;
  description?: string;
  locator?: SourceLocator;
  owner?: {
    id?: string;
    name?: string;
    role?: string;
  };
  retrievedAt?: string;
  freshness?: DataFreshness;
  permission?: {
    requiredPermissions?: string[];
    deniedBehavior?: 'hide' | 'redact' | 'disable' | 'request-access';
  };
  redaction?: RedactionPolicy;
  reliability?: SourceReliability;
  citationPolicy?: CitationPolicy;
  metadata?: Record<string, unknown>;
}
