import type { DictionaryCandidate, EntityCandidate, EntityResolution, EntityResolutionStatus, EntityType, IdentifierKey, EntityResolutionTraceStep } from '@/contracts/request-understanding/entity-resolution';

function firstValue(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || value === '') continue;
    return String(value);
  }
  return '';
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function isInvalidIdentifier(value: string): boolean {
  const normalized = normalizeText(value);
  return normalized === '-1' || normalized === '0' || normalized === 'null' || normalized === 'undefined';
}

function dedupeCandidates(candidates: EntityCandidate[]): EntityCandidate[] {
  const seen = new Set<string>();
  const output: EntityCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.id}::${candidate.name || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(candidate);
  }
  return output;
}

function bestScoreForCandidate(params: {
  raw: string;
  aliases: string[];
  id: string;
  name: string;
  candidateAliases: string[];
  rowValues: string[];
}): { score: number; reason: string } {
  const terms = Array.from(new Set([params.raw, ...params.aliases].map(normalizeText).filter(Boolean)));
  const id = normalizeText(params.id);
  const name = normalizeText(params.name);
  const candidateAliases = params.candidateAliases.map(normalizeText).filter(Boolean);
  const rowValues = params.rowValues.map(normalizeText).filter(Boolean);
  let best = { score: 0, reason: 'no_match' };
  const apply = (score: number, reason: string) => {
    if (score > best.score) best = { score, reason };
  };

  for (const term of terms) {
    if (id && id === term) apply(0.99, 'identifier_exact');
    if (name && name === term) apply(0.98, 'canonical_exact');
    if (candidateAliases.some(alias => alias === term)) apply(0.96, 'alias_exact');
    if (name && term.length >= 2 && name.startsWith(term)) apply(0.94, 'canonical_prefix');
    if (name && term.length >= 2 && name.includes(term)) apply(0.91, 'canonical_contains');
    if (candidateAliases.some(alias => term.length >= 2 && alias.startsWith(term))) apply(0.90, 'alias_prefix');
    if (candidateAliases.some(alias => term.length >= 2 && alias.includes(term))) apply(0.88, 'alias_contains');
    if (name && name.length >= 2 && term.includes(name)) apply(0.90, 'raw_contains_canonical');
    if (rowValues.some(value => value === term)) apply(0.82, 'row_value_exact');
    if (rowValues.some(value => term.length >= 2 && value.includes(term))) apply(0.72, 'row_value_contains');
  }

  return best;
}

function isStrongExactMatch(reason: string): boolean {
  return reason === 'identifier_exact' || reason === 'canonical_exact' || reason === 'alias_exact';
}

function hasQualityFlag(candidate: EntityCandidate, flag: string): boolean {
  return Boolean(candidate.qualityFlags?.includes(flag as never));
}

export interface DictionaryEntityResolutionInput {
  entityType: EntityType;
  rawText: string;
  label: string;
  identifierKey: IdentifierKey;
  aliases: string[];
  rows: Array<Record<string, unknown>>;
  candidates?: DictionaryCandidate[];
  idKeys: string[];
  nameKeys: string[];
  capabilityId?: string;
  toolName?: string;
  capabilityAvailable: boolean;
  preferredCandidateIds?: string[];
  preferredCandidateNames?: string[];
}

export interface DictionaryEntityResolutionResult {
  resolution: EntityResolution;
  candidateIds: string[];
  trace: EntityResolutionTraceStep[];
  missingField?: string;
  missingCapability?: string;
  risk?: string;
}

export function resolveDictionaryEntity(input: DictionaryEntityResolutionInput): DictionaryEntityResolutionResult {
  const trace: EntityResolutionTraceStep[] = [];
  const normalizedAliases = input.aliases.map(normalizeText).filter(Boolean);
  const normalizedRaw = normalizeText(input.rawText || input.label);
  const preferredCandidateIds = Array.from(new Set(input.preferredCandidateIds || [])).map(normalizeText).filter(Boolean);
  const preferredCandidateNames = Array.from(new Set(input.preferredCandidateNames || [])).map(normalizeText).filter(Boolean);
  const aliasMatchedRows: Array<Record<string, unknown>> = [];
  const candidates: EntityCandidate[] = [];
  const idOnlyCandidates: EntityCandidate[] = [];

  trace.push({
    entityType: input.entityType,
    stage: 'detected',
    status: 'matched',
    detail: `识别到 ${input.label}: ${input.rawText || input.label}`,
    capabilityId: input.capabilityId,
    toolName: input.toolName,
  });

  if (!input.capabilityAvailable) {
    const identifierText = input.identifierKey;
    return {
      resolution: {
        entityType: input.entityType,
        rawText: input.rawText || input.label,
        confidence: 0,
        status: 'capability_unavailable',
        identifierKey: input.identifierKey,
        normalizationCapabilityId: input.capabilityId,
        normalizationToolName: input.toolName,
      },
      candidateIds: [],
      trace: trace.concat([{
        entityType: input.entityType,
        stage: 'capability_selection',
        status: 'capability_unavailable',
        detail: `当前未接入 ${input.label} 归一化能力，无法将自然语言转换为标准 ${identifierText}。`,
      }]),
      missingCapability: `${input.label}归一化能力`,
      risk: `capability_unavailable:${input.entityType}`,
    };
  }

  const sourceCandidates: DictionaryCandidate[] = input.candidates?.length
    ? input.candidates
    : input.rows.map((row, index) => {
      const id = firstValue(row, input.idKeys);
      const name = firstValue(row, input.nameKeys);
      return {
        id,
        name: name || undefined,
        confidence: 0.84,
        source: input.toolName || input.capabilityId || 'dictionary',
        sourceCapabilityId: input.capabilityId,
        rawRef: `row:${index}`,
        metadata: { row },
      } satisfies DictionaryCandidate;
    }).filter(candidate => Boolean(candidate.id));

  for (const candidate of sourceCandidates) {
    const id = candidate.id;
    const name = candidate.name || '';
    const aliases = candidate.aliases || [];
    const rowValues = candidate.metadata?.row && typeof candidate.metadata.row === 'object' && !Array.isArray(candidate.metadata.row)
      ? Object.values(candidate.metadata.row as Record<string, unknown>).map((value) => String(value || ''))
      : [];
    const searchText = normalizeText([id, name, ...aliases, ...rowValues].join(' '));
    const candidateHasLabelEvidence = Boolean(name || aliases.length);
    const exactIdHit = Boolean(normalizedRaw && normalizeText(id) === normalizedRaw);
    const scored = bestScoreForCandidate({
      raw: normalizedRaw,
      aliases: normalizedAliases,
      id,
      name,
      candidateAliases: aliases,
      rowValues,
    });
    let preferenceBoost = 0;
    if (preferredCandidateIds.some((value) => normalizeText(value) === normalizeText(id))) {
      preferenceBoost = Math.max(preferenceBoost, 0.08);
    }
    if (preferredCandidateNames.some((value) => normalizeText(value) === normalizeText(name))) {
      preferenceBoost = Math.max(preferenceBoost, 0.05);
    }
    if (preferredCandidateNames.some((value) => aliases.some((alias) => normalizeText(alias) === normalizeText(value)))) {
      preferenceBoost = Math.max(preferenceBoost, 0.04);
    }
    const aliasHit = scored.score > 0 || (normalizedAliases.length === 0 ? Boolean(normalizedRaw && searchText.includes(normalizedRaw)) : false);
    if (!candidateHasLabelEvidence && !exactIdHit) {
      if (id && !isInvalidIdentifier(id)) idOnlyCandidates.push(candidate);
      continue;
    }
    if (!aliasHit) continue;
    if (candidate.metadata?.row && typeof candidate.metadata.row === 'object' && !Array.isArray(candidate.metadata.row)) {
      aliasMatchedRows.push(candidate.metadata.row as Record<string, unknown>);
    }
    if (id && !isInvalidIdentifier(id)) {
      candidates.push({
        ...candidate,
        id,
        name: candidate.name || id,
        confidence: Math.min(0.99, Math.max(scored.score, exactIdHit || normalizeText(name) === normalizedRaw ? 0.98 : 0, candidate.confidence || 0.84) + preferenceBoost),
        source: input.toolName || input.capabilityId || 'dictionary',
        metadata: {
          ...(candidate.metadata || {}),
          match: {
            score: Math.max(scored.score, exactIdHit ? 0.99 : 0),
            reason: scored.reason,
          },
        },
      });
    }
  }

  const deduped = dedupeCandidates(candidates.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)));
  const uniqueIds = Array.from(new Set(deduped.map((item) => item.id).filter((id) => Boolean(id) && !isInvalidIdentifier(String(id)))));
  const strongExactCandidates = dedupeCandidates(deduped.filter((candidate) => {
    const metadata = candidate.metadata && typeof candidate.metadata === 'object' && !Array.isArray(candidate.metadata)
      ? candidate.metadata as Record<string, unknown>
      : {};
    const match = metadata.match && typeof metadata.match === 'object' && !Array.isArray(metadata.match)
      ? metadata.match as Record<string, unknown>
      : {};
    return typeof match.reason === 'string' && isStrongExactMatch(match.reason);
  }));
  const strongExactIds = Array.from(new Set(strongExactCandidates.map((item) => item.id).filter((id) => Boolean(id) && !isInvalidIdentifier(String(id)))));

  if (strongExactIds.length === 1) {
    const winner = strongExactCandidates.find(candidate => candidate.id === strongExactIds[0]) || strongExactCandidates[0];
    trace.push({
      entityType: input.entityType,
      stage: 'validation',
      status: 'resolved',
      detail: `已将 ${input.label} 精确匹配为标准 ${input.identifierKey}: ${winner.id}`,
      capabilityId: input.capabilityId,
      toolName: input.toolName,
    });
    return {
      resolution: {
        entityType: input.entityType,
        rawText: input.rawText || input.label,
        normalizedId: winner.id,
        normalizedName: winner.name,
        confidence: Math.max(winner.confidence || 0, 0.98),
        status: 'resolved',
        candidates: deduped,
        identifierKey: input.identifierKey,
        normalizationCapabilityId: input.capabilityId,
        normalizationToolName: input.toolName,
      },
      candidateIds: [winner.id],
      trace,
    };
  }

  const topCandidate = deduped[0];
  const secondCandidate = deduped.find(candidate => candidate.id !== topCandidate?.id);
  const highConfidenceThreshold = 0.88;
  const decisiveMargin = 0.06;
  const hasDecisiveWinner = Boolean(
    topCandidate
      && uniqueIds.length > 1
      && (topCandidate.confidence || 0) >= highConfidenceThreshold
      && (
        !secondCandidate
        || (secondCandidate.confidence || 0) < highConfidenceThreshold
        || ((topCandidate.confidence || 0) - (secondCandidate.confidence || 0)) >= decisiveMargin
      ),
  );

  if ((uniqueIds.length === 1 && (topCandidate?.confidence || 0) >= highConfidenceThreshold) || hasDecisiveWinner) {
    const winner = topCandidate || deduped[0];
    const resolvedIds = [winner.id];
    const candidate = deduped[0];
    trace.push({
      entityType: input.entityType,
      stage: 'validation',
      status: 'resolved',
      detail: `已将 ${input.label} 归一化为标准 ${input.identifierKey}: ${candidate.id}`,
      capabilityId: input.capabilityId,
      toolName: input.toolName,
    });
    return {
      resolution: {
        entityType: input.entityType,
        rawText: input.rawText || input.label,
        normalizedId: winner.id,
        normalizedName: winner.name,
        confidence: winner.confidence,
        status: 'resolved',
        candidates: deduped,
        identifierKey: input.identifierKey,
        normalizationCapabilityId: input.capabilityId,
        normalizationToolName: input.toolName,
      },
      candidateIds: resolvedIds,
      trace,
    };
  }

  if (uniqueIds.length >= 1) {
    trace.push({
      entityType: input.entityType,
      stage: 'decision',
      status: 'needs_user_selection',
      detail: `找到多个可能的 ${input.label}，需要用户选择后继续。`,
      capabilityId: input.capabilityId,
      toolName: input.toolName,
    });
    return {
      resolution: {
        entityType: input.entityType,
        rawText: input.rawText || input.label,
        confidence: Math.min(topCandidate?.confidence || 0.5, 0.85),
        status: 'needs_user_selection',
        candidates: deduped,
        identifierKey: input.identifierKey,
        normalizationCapabilityId: input.capabilityId,
        normalizationToolName: input.toolName,
      },
      candidateIds: uniqueIds,
      trace,
      missingField: `${input.label}选择`,
      risk: `needs_user_selection:${input.entityType}`,
    };
  }

  const dedupedIdOnly = dedupeCandidates(idOnlyCandidates);
  const idOnlyIds = Array.from(new Set(dedupedIdOnly.map(item => item.id).filter(id => Boolean(id) && !isInvalidIdentifier(String(id)))));
  if (idOnlyIds.length > 1) {
    trace.push({
      entityType: input.entityType,
      stage: 'decision',
      status: 'needs_user_selection',
      detail: `${input.label} candidates are missing label or alias evidence; user selection is required.`,
      capabilityId: input.capabilityId,
      toolName: input.toolName,
    });
    return {
      resolution: {
        entityType: input.entityType,
        rawText: input.rawText || input.label,
        confidence: 0.4,
        status: 'needs_user_selection',
        candidates: dedupedIdOnly,
        identifierKey: input.identifierKey,
        normalizationCapabilityId: input.capabilityId,
        normalizationToolName: input.toolName,
      },
      candidateIds: idOnlyIds,
      trace,
      missingField: `${input.label}选择`,
      risk: `needs_user_selection:${input.entityType}`,
    };
  }

  if (idOnlyIds.length === 1) {
    const winner = dedupedIdOnly.find(candidate => candidate.id === idOnlyIds[0]) || dedupedIdOnly[0];
    if (winner && hasQualityFlag(winner, 'server_side_match')) {
      trace.push({
        entityType: input.entityType,
        stage: 'validation',
        status: 'resolved',
        detail: `${input.label} resolved from server-side dictionary match as ${input.identifierKey}: ${winner.id}`,
        capabilityId: input.capabilityId,
        toolName: input.toolName,
      });
      return {
        resolution: {
          entityType: input.entityType,
          rawText: input.rawText || input.label,
          normalizedId: winner.id,
          normalizedName: winner.name,
          confidence: Math.max(winner.confidence || 0, 0.9),
          status: 'resolved',
          candidates: dedupedIdOnly,
          identifierKey: input.identifierKey,
          normalizationCapabilityId: input.capabilityId,
          normalizationToolName: input.toolName,
        },
        candidateIds: [winner.id],
        trace,
      };
    }
    trace.push({
      entityType: input.entityType,
      stage: 'validation',
      status: 'needs_enrichment',
      detail: `${input.label} candidate only contains an identifier; enrichment or confirmation is required.`,
      capabilityId: input.capabilityId,
      toolName: input.toolName,
    });
    return {
      resolution: {
        entityType: input.entityType,
        rawText: input.rawText || input.label,
        confidence: 0.4,
        status: 'needs_enrichment',
        candidates: dedupedIdOnly,
        identifierKey: input.identifierKey,
        normalizationCapabilityId: input.capabilityId,
        normalizationToolName: input.toolName,
      },
      candidateIds: idOnlyIds,
      trace,
      missingField: `${input.label}确认`,
      risk: `needs_enrichment:${input.entityType}`,
    };
  }

  if (input.rows.length === 0) {
    trace.push({
      entityType: input.entityType,
      stage: 'validation',
      status: 'not_found',
      detail: `未找到可用于归一化 ${input.label} 的候选项。`,
      capabilityId: input.capabilityId,
      toolName: input.toolName,
    });
    return {
      resolution: {
        entityType: input.entityType,
        rawText: input.rawText || input.label,
        confidence: 0.2,
        status: 'not_found',
        identifierKey: input.identifierKey,
        normalizationCapabilityId: input.capabilityId,
        normalizationToolName: input.toolName,
      },
      candidateIds: [],
      trace,
      missingField: `${input.label}`,
      risk: `not_found:${input.entityType}`,
    };
  }

  const invalidOutput = aliasMatchedRows.length > 0
    || input.rows.some((row) => input.idKeys.some((key) => row[key] !== undefined && row[key] !== null && row[key] !== ''));

  trace.push({
    entityType: input.entityType,
    stage: 'validation',
    status: invalidOutput ? 'output_invalid' : 'not_found',
    detail: invalidOutput
      ? `${input.label} 解析工具返回了候选行，但没有返回标准 ${input.identifierKey}。`
      : `未能从 ${input.label} 解析工具中匹配到可用候选项。`,
    capabilityId: input.capabilityId,
    toolName: input.toolName,
  });
  return {
    resolution: {
      entityType: input.entityType,
      rawText: input.rawText || input.label,
      confidence: 0.3,
      status: invalidOutput ? 'output_invalid' : 'not_found',
      identifierKey: input.identifierKey,
      normalizationCapabilityId: input.capabilityId,
      normalizationToolName: input.toolName,
    },
    candidateIds: [],
    trace,
    missingField: invalidOutput ? `${input.label}解析输出` : `${input.label}`,
    risk: invalidOutput ? `output_invalid:${input.entityType}` : `not_found:${input.entityType}`,
  };
}
