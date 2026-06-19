/**
 * Object Resolver
 *
 * 从 Domain Ontology 解析业务对象。
 *
 * 设计原则：
 * 1. 只负责解析业务对象，不负责决定是否执行
 * 2. 泛词（surfaceCues）只记录命中，不产生 BusinessObjectReference
 * 3. 更具体的概念（specificity 高）覆盖父概念
 * 4. matchSpan 基于原文计算，支持空格变体匹配
 */

import type {
  DomainOntology,
  BusinessObjectConcept,
  BusinessObjectReference,
  BusinessObjectRole,
  ObjectResolverInput,
  ObjectResolverResult,
  ObjectResolverTrace,
  SurfaceCueHit,
} from '@/contracts/request-understanding/domain-ontology-contract';
import { ADVERTISING_DOMAIN_ONTOLOGY } from './advertising-domain-ontology';

// ─── Main Entry ──────────────────────────────────────────

/**
 * 从用户输入中解析业务对象。
 *
 * @param input - 解析输入，包含 message 和可选的 ontologies
 * @returns 解析结果，包含 objects、trace、surfaceCueHits
 */
export function resolveBusinessObjects(input: ObjectResolverInput): ObjectResolverResult {
  const ontologies = input.ontologies && input.ontologies.length > 0
    ? input.ontologies
    : [ADVERTISING_DOMAIN_ONTOLOGY];

  const text = input.message;

  // Phase 1: 收集所有候选匹配（带 span）
  const candidates: ObjectResolverTrace[] = [];

  for (const ontology of ontologies) {
    for (const concept of ontology.concepts) {
      if (concept.enabled === false) continue;

      for (const alias of concept.aliases) {
        const span = findMatchSpan(text, alias);
        if (!span) continue;

        candidates.push({
          conceptId: concept.conceptId,
          matchedAlias: alias,
          matchSpan: span,
          confidence: calculateConfidence(concept, alias),
          source: 'ontology',
          priority: concept.priority,
          specificity: concept.specificity,
        });
      }
    }
  }

  // Phase 2: 仲裁 — 同一 span 上，更具体/更长/更高优先级的概念胜出
  const { winners, rejected } = arbitrateCandidates(candidates);

  // Phase 3: 构建 BusinessObjectReference（去重，不重复 primary_target）
  const objects = buildObjectReferences(winners);

  // Phase 4: 收集 surface cue hits
  const surfaceCueHits = collectSurfaceCueHits(text, ontologies);

  return { objects, trace: [...winners, ...rejected], surfaceCueHits };
}

// ─── Match Span Calculation ──────────────────────────────

/**
 * 计算别名在原文中的匹配位置。
 * 支持空格变体匹配（如 "D1 ROI 报表" 匹配 "D1ROI报表"）。
 * span 始终映射回原文坐标。
 */
function findMatchSpan(originalText: string, alias: string): { start: number; end: number } | null {
  // 1. 精确匹配（alias 和原文完全一致）
  const normalizedAlias = alias.toLowerCase();
  const normalizedText = originalText.toLowerCase();
  const exactIndex = normalizedText.indexOf(normalizedAlias);
  if (exactIndex !== -1) {
    return { start: exactIndex, end: exactIndex + alias.length };
  }

  // 2. 空格归一化匹配（处理 "D1 ROI 报表" vs "D1ROI报表"）
  const aliasNoSpace = alias.replace(/\s+/g, '').toLowerCase();
  const textNoSpace = originalText.replace(/\s+/g, '').toLowerCase();

  // 建立 normalized → original 的位置映射
  const posMap: number[] = [];
  for (let i = 0, j = 0; i < originalText.length; i++) {
    if (!/\s/.test(originalText[i])) {
      posMap[j] = i;
      j++;
    }
  }
  posMap[posMap.length] = originalText.length;  // 结束位置

  const normalizedIndex = textNoSpace.indexOf(aliasNoSpace);
  if (normalizedIndex !== -1) {
    const start = posMap[normalizedIndex];
    const end = posMap[normalizedIndex + aliasNoSpace.length];
    return { start, end };
  }

  return null;
}

// ─── Candidate Arbitration ───────────────────────────────

/**
 * 仲裁候选匹配。
 * 同一 span 上，更具体/更长/更高优先级的概念胜出。
 */
function arbitrateCandidates(candidates: ObjectResolverTrace[]): {
  winners: ObjectResolverTrace[];
  rejected: ObjectResolverTrace[];
} {
  if (candidates.length === 0) {
    return { winners: [], rejected: [] };
  }

  // 按 span 分组（使用 start+end 作为 key）
  const spanGroups = new Map<string, ObjectResolverTrace[]>();

  for (const candidate of candidates) {
    const key = `${candidate.matchSpan.start}-${candidate.matchSpan.end}`;
    const group = spanGroups.get(key) || [];
    group.push(candidate);
    spanGroups.set(key, group);
  }

  const winners: ObjectResolverTrace[] = [];
  const rejected: ObjectResolverTrace[] = [];

  for (const [, group] of spanGroups) {
    if (group.length === 1) {
      winners.push(group[0]);
      continue;
    }

    // 排序规则：
    // 1. specificity 高的优先（子概念 > 父概念）
    // 2. alias 长度长的优先
    // 3. priority 高的优先
    group.sort((a, b) => {
      if (a.specificity !== b.specificity) {
        return b.specificity - a.specificity;
      }
      if (a.matchedAlias.length !== b.matchedAlias.length) {
        return b.matchedAlias.length - a.matchedAlias.length;
      }
      return b.priority - a.priority;
    });

    // 第一个是胜者
    winners.push(group[0]);

    // 其余的被拒绝
    const winner = group[0];
    for (let i = 1; i < group.length; i++) {
      const loser = group[i];
      let rejectedReason: ObjectResolverTrace['rejectedReason'];

      if (winner.specificity > loser.specificity) {
        rejectedReason = 'overridden_by_more_specific';
      } else if (winner.matchedAlias.length > loser.matchedAlias.length) {
        rejectedReason = 'overridden_by_longer_alias';
      } else {
        rejectedReason = 'overridden_by_higher_priority';
      }

      rejected.push({
        ...loser,
        rejectedReason,
      });
    }
  }

  return { winners, rejected };
}

// ─── Confidence Calculation ──────────────────────────────

/**
 * 计算匹配置信度。
 * 完全匹配 displayName → 高置信度
 * 别名匹配 → 中置信度
 */
function calculateConfidence(concept: BusinessObjectConcept, matchedAlias: string): number {
  if (matchedAlias === concept.displayName) {
    return 0.9;
  }
  // 别名长度越长，置信度越高
  const lengthBonus = Math.min(matchedAlias.length * 0.01, 0.1);
  return 0.8 + lengthBonus;
}

// ─── Build Object References ─────────────────────────────

/**
 * 从胜出的候选构建 BusinessObjectReference。
 * 去重，不重复 primary_target。
 */
function buildObjectReferences(winners: ObjectResolverTrace[]): BusinessObjectReference[] {
  const objects: BusinessObjectReference[] = [];
  const seenTypes = new Set<string>();

  for (const winner of winners) {
    // 查找概念定义以获取 type
    const concept = findConceptById(winner.conceptId);
    if (!concept) continue;

    // 去重：同一 type 只保留一个 primary_target
    const dedupeKey = `${concept.type}:primary_target`;
    if (seenTypes.has(dedupeKey)) {
      continue;
    }
    seenTypes.add(dedupeKey);

    const role = inferObjectRole(concept);

    objects.push({
      type: concept.type,
      reference: winner.matchedAlias,
      conceptId: winner.conceptId,
      displayName: concept.displayName,
      role,
      source: 'ontology',
      resolved: false,
      confidence: winner.confidence,
    });
  }

  return objects;
}

/**
 * 根据概念 ID 查找概念定义。
 */
function findConceptById(conceptId: string): BusinessObjectConcept | null {
  const ontology = ADVERTISING_DOMAIN_ONTOLOGY;
  return ontology.concepts.find(c => c.conceptId === conceptId) || null;
}

/**
 * 推导业务对象角色。
 */
function inferObjectRole(concept: BusinessObjectConcept): BusinessObjectRole {
  switch (concept.type) {
    case 'report':
    case 'metric':
    case 'workflow':
    case 'package':
      return 'primary_target';
    case 'time_range':
      return 'constraint';
    case 'dimension':
    case 'entity':
      return 'context';
    default:
      return 'context';
  }
}

// ─── Surface Cue Collection ──────────────────────────────

/**
 * 收集泛词表面线索命中。
 * 只记录命中，不产生 BusinessObjectReference。
 */
function collectSurfaceCueHits(text: string, ontologies: DomainOntology[]): SurfaceCueHit[] {
  const hits: SurfaceCueHit[] = [];
  const seenCues = new Set<string>();

  for (const ontology of ontologies) {
    for (const concept of ontology.concepts) {
      if (!concept.surfaceCues || concept.surfaceCues.length === 0) continue;

      for (const cue of concept.surfaceCues) {
        const span = findMatchSpan(text, cue);
        if (!span) continue;

        const key = `${cue}:${span.start}`;
        if (seenCues.has(key)) {
          // 已存在，追加关联概念
          const existing = hits.find(h => h.cue === cue && h.span.start === span.start);
          if (existing && !existing.associatedConceptIds.includes(concept.conceptId)) {
            existing.associatedConceptIds.push(concept.conceptId);
          }
          continue;
        }
        seenCues.add(key);

        hits.push({
          cue,
          span,
          associatedConceptIds: [concept.conceptId],
        });
      }
    }
  }

  return hits;
}
