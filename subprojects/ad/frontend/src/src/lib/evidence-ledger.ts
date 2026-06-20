/**
 * Evidence Ledger — 证据账本
 *
 * 迭代条目：#82-86
 *
 * 设计原则：
 * 1. 所有工具执行事实、知识检索、公开网络、用户输入 都入账
 * 2. Planner inference 单独分类为 `planner_inference`，与 `tool_result` 物理隔离
 * 3. Answer Composer 只能基于 Ledger 生成答案
 * 4. Ledger 区分 `confirmed_fact` / `high_probability_inference` / `unverified`
 *
 * Stage 0 实现：定义类型 + 基础 API。
 * 接入 route.ts 在后续 Task 2.6-2.8 完成。
 */

// ─── Evidence Types ──────────────────────────────────────

export type EvidenceSource =
  | 'tool_result'           // 工具执行结果
  | 'planner_inference'     // Planner 推理（不伪装成工具结果）
  | 'knowledge'             // 知识库检索
  | 'public_web'            // 公开网络
  | 'user_input'            // 用户输入
  | 'context_history';      // 对话历史

export type EvidenceConfidence =
  | 'confirmed_fact'        // 已确认事实
  | 'high_probability'      // 高概率推断
  | 'unverified';           // 未验证

export interface EvidenceEntry {
  /** 唯一 ID */
  id: string;
  /** 证据所属 case，可与 CaseFrame 对齐。 */
  caseId?: string;
  /** 证据所属会话。 */
  conversationId?: string;
  /** 产生证据的 pipeline stage。 */
  stage?: 'understanding' | 'planning' | 'public_web' | 'diagnosis' | 'package' | 'open_answer' | 'multi_query' | 'report_query' | 'automation' | 'unknown';
  /** 来源类型 */
  source: EvidenceSource;
  /** 来源标识（tool_name / knowledge_base_id / url 等） */
  sourceId?: string;
  /** 置信度 */
  confidence: EvidenceConfidence;
  /** 事实内容（结构化） */
  content: Record<string, unknown>;
  /** 关联的 source_ref ID */
  sourceRefId?: string;
  /** 关联的 evidence_ref ID */
  evidenceRefId?: string;
  /** 入账时间 ISO */
  recorded_at: string;
}

// ─── Evidence Ledger ─────────────────────────────────────

export interface EvidenceLedger {
  caseId?: string;
  conversationId?: string;
  entries: EvidenceEntry[];
  /** 按来源类型统计 */
  counts: Record<EvidenceSource, number>;
  /** 按 pipeline stage 统计，用于跨 stage case 证据链。 */
  stageCounts: Record<string, number>;
  /** 总条目数 */
  total: number;
}

export function createEmptyEvidenceLedger(meta: { caseId?: string; conversationId?: string } = {}): EvidenceLedger {
  return {
    caseId: meta.caseId,
    conversationId: meta.conversationId,
    entries: [],
    counts: {
      tool_result: 0,
      planner_inference: 0,
      knowledge: 0,
      public_web: 0,
      user_input: 0,
      context_history: 0,
    },
    stageCounts: {},
    total: 0,
  };
}

/**
 * 向 Ledger 入账一条证据。
 */
export function recordEvidence(
  ledger: EvidenceLedger,
  entry: Omit<EvidenceEntry, 'id' | 'recorded_at'>,
): EvidenceLedger {
  const counts = ledger.counts || createEmptyEvidenceLedger().counts;
  const stageCounts = ledger.stageCounts || {};
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const newEntry: EvidenceEntry = {
    ...entry,
    id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    recorded_at: new Date().toISOString(),
  };
  return {
    caseId: ledger.caseId || newEntry.caseId,
    conversationId: ledger.conversationId || newEntry.conversationId,
    entries: [...entries, newEntry],
    counts: {
      ...counts,
      [entry.source]: (counts[entry.source] || 0) + 1,
    },
    stageCounts: newEntry.stage
      ? {
        ...stageCounts,
        [newEntry.stage]: (stageCounts[newEntry.stage] || 0) + 1,
      }
      : stageCounts,
    total: (ledger.total || entries.length) + 1,
  };
}

/**
 * 批量入账。
 */
export function recordEvidenceBatch(
  ledger: EvidenceLedger,
  entries: Array<Omit<EvidenceEntry, 'id' | 'recorded_at'>>,
): EvidenceLedger {
  let result = ledger;
  for (const entry of entries) {
    result = recordEvidence(result, entry);
  }
  return result;
}

/**
 * 查询 Ledger 中指定来源的所有证据。
 */
export function queryEvidenceBySource(ledger: EvidenceLedger, source: EvidenceSource): EvidenceEntry[] {
  return ledger.entries.filter((e) => e.source === source);
}

/**
 * 检查 Ledger 中是否有任何 tool_result 或 planner_inference 证据。
 */
export function hasBusinessEvidence(ledger: EvidenceLedger): boolean {
  return ledger.counts.tool_result > 0
    || ledger.counts.knowledge > 0
    || ledger.counts.public_web > 0;
}

/**
 * 序列化为可附加到 response contract 的轻量结构。
 */
export function serializeLedgerForMetadata(ledger: EvidenceLedger): Record<string, unknown> {
  return {
    total: ledger.total,
    counts: ledger.counts,
    stage_counts: ledger.stageCounts,
    case_id: ledger.caseId,
    conversation_id: ledger.conversationId,
    has_business_evidence: hasBusinessEvidence(ledger),
    last_entry_at: ledger.entries.length > 0
      ? ledger.entries[ledger.entries.length - 1].recorded_at
      : undefined,
  };
}
