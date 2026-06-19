import type { SourceRef } from '@/types';

export type PublicWebCapabilityType =
  | 'web_search'
  | 'web_fetch'
  | 'realtime_public_info'
  | 'public_web_qa'
  | 'external_doc_lookup';

export type PublicWebFreshness = 'realtime' | 'today' | 'recent' | 'any';

/**
 * Search depth hint for provider-specific optimization.
 * - 'standard': Fast search with balanced relevance (default)
 * - 'deep': Multi-step reasoning across many sources (slower but more thorough)
 */
export type PublicWebSearchDepth = 'standard' | 'deep';

export interface WebSearchInput {
  query: string;
  locale?: string;
  freshness?: PublicWebFreshness;
  maxResults?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  /** Search depth hint - providers like Exa can optimize based on this */
  searchDepth?: PublicWebSearchDepth;
}

export interface WebFetchInput {
  url: string;
  extractText?: boolean;
  maxBytes?: number;
  timeoutMs?: number;
}

export interface WebSourceRef extends SourceRef {
  sourceId: string;
  siteName?: string;
  publisher?: string;
  fetchedAt?: string;
  retrievedAt?: string;
  contentHash?: string;
  freshness?: PublicWebFreshness;
  confidence?: number;
}

export interface SourceGroundedAnswer {
  answer: string;
  sourceRefs: WebSourceRef[];
  retrievedAt: string;
  sourceRequired: boolean;
  freshness?: PublicWebFreshness;
  confidence?: number;
  warnings?: string[];
}
