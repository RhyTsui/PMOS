/**
 * Resolver Chain — Context → Entity → Dictionary → Default Policy → Required Input Assist
 *
 * Stage 4 (task 4.5) 落地：将分散的 resolver 统一为顺序链路。
 * 每个 resolver 接收上游输出，补充/覆盖值，最终产出完整的 ResolvedInputs。
 *
 * 设计原则：
 * 1. 每个 resolver 是独立的，可单独测试
 * 2. resolver 之间有明确的输入输出契约
 * 3. 上游 resolver 的优先级高于下游（context > entity > dictionary > default）
 * 4. 每个 resolver 必须记录 trace，便于观测和调试
 */

import type { BusinessContextSnapshot, MissingField } from '@/types';
import type { RequestSemanticFrame } from '@/contracts/request-understanding/semantic-frame-contract';
import type { UserRequirementContract } from '@/contracts/request-understanding/user-requirement-contract';
import { findFieldDefinition, findFieldDefinitionsByLabelOrSynonym, matchReportTypeBySignal } from './schema-registry';

// ─── 链路类型定义 ────────────────────────────────────────────

/** Resolver Chain 的输入。 */
export interface ResolverChainInput {
  /** 用户消息原文。 */
  message: string;
  /** 当前业务上下文（来自 context 编译）。 */
  businessContext: BusinessContextSnapshot | null;
  /** Semantic Frame（来自 understanding 阶段）。 */
  semanticFrame: RequestSemanticFrame | null;
  /** 用户要求合约（来自 understanding 阶段）。 */
  userRequirement: UserRequirementContract | null;
  /** 工具声明的 requiredInputs（来自 capability manifest）。 */
  toolRequiredInputs?: string[];
  /** 工具声明的 optionalInputs。 */
  toolOptionalInputs?: string[];
}

/** 单个 slot/field 的解析结果。 */
export interface ResolvedInput {
  /** 输入名称（与 tool.requiredInputs / optionalInputs 对应）。 */
  name: string;
  /** 解析出的值。 */
  value: unknown;
  /** 值的来源。 */
  source: ResolverSource;
  /** 置信度。 */
  confidence: 'high' | 'medium' | 'low';
  /** 解析说明（trace）。 */
  reason: string;
}

export type ResolverSource =
  | 'context'       // 来自 BusinessContextSnapshot（最高优先级）
  | 'entity'        // 来自 Entity/Object Resolver
  | 'dictionary'    // 来自 Schema Registry / Metric/Dimension Catalog
  | 'semantic_frame' // 来自 Semantic Frame
  | 'default_policy' // 默认策略填充
  | 'user_explicit' // 用户显式提供
  | 'missing';      // 缺失，无法解析

/** Resolver Chain 的完整输出。 */
export interface ResolverChainOutput {
  /** 所有已解析的输入（按 name 索引）。 */
  resolved: Record<string, ResolvedInput>;
  /** 仍然缺失的必填输入。 */
  missingRequired: string[];
  /** 未解析的可选输入。 */
  missingOptional: string[];
  /** 每个 resolver 的 trace。 */
  trace: ResolverChainTrace;
  /** 缺失字段（面向 UI 展示）。 */
  missingFields: MissingField[];
}

export interface ResolverTraceEntry {
  resolver: 'context' | 'entity' | 'dictionary' | 'semantic_frame' | 'default_policy' | 'required_input_assist';
  resolved: string[];
  skipped: string[];
  notes: string[];
}

export interface ResolverChainTrace {
  entries: ResolverTraceEntry[];
  totalResolved: number;
  totalMissing: number;
}

// ─── 各阶段 Resolver ────────────────────────────────────────

/**
 * Context Resolver — 从 BusinessContextSnapshot 提取已有值。
 * 优先级最高：context 已有的值不会被后续 resolver 覆盖。
 */
function resolveFromContext(input: ResolverChainInput, targetInputs: string[]): {
  resolved: Record<string, ResolvedInput>;
  remaining: string[];
  trace: ResolverTraceEntry;
} {
  const resolved: Record<string, ResolvedInput> = {};
  const remaining: string[] = [];
  const notes: string[] = [];
  const ctx = input.businessContext;

  if (!ctx) {
    return {
      resolved,
      remaining: targetInputs,
      trace: { resolver: 'context', resolved: [], skipped: targetInputs, notes: ['no businessContext available'] },
    };
  }

  const contextMapping: Record<string, { key: keyof BusinessContextSnapshot; label: string }> = {
    project: { key: 'project', label: '项目' },
    app: { key: 'app', label: '应用' },
    media: { key: 'media', label: '媒体' },
    timeRange: { key: 'timeRange', label: '时间范围' },
    metrics: { key: 'metrics', label: '指标' },
    dimensions: { key: 'dimensions', label: '维度' },
    reportSource: { key: 'reportSource', label: '报表来源' },
  };

  for (const name of targetInputs) {
    const mapping = contextMapping[name];
    if (mapping && ctx[mapping.key] !== undefined && ctx[mapping.key] !== null) {
      resolved[name] = {
        name,
        value: ctx[mapping.key],
        source: 'context',
        confidence: 'high',
        reason: `来自 businessContext.${String(mapping.key)}`,
      };
      notes.push(`${name} from context`);
    } else {
      remaining.push(name);
    }
  }

  return {
    resolved,
    remaining,
    trace: { resolver: 'context', resolved: Object.keys(resolved), skipped: remaining, notes },
  };
}

/**
 * Entity Resolver — 从 Semantic Frame 的 objectReferences 提取实体值。
 * 优先级次于 context，但高于 dictionary。
 */
function resolveFromEntity(input: ResolverChainInput, remainingInputs: string[]): {
  resolved: Record<string, ResolvedInput>;
  remaining: string[];
  trace: ResolverTraceEntry;
} {
  const resolved: Record<string, ResolvedInput> = {};
  const remaining: string[] = [];
  const notes: string[] = [];
  const frame = input.semanticFrame;

  if (!frame || !frame.businessObjects || frame.businessObjects.length === 0) {
    return {
      resolved,
      remaining: remainingInputs,
      trace: { resolver: 'entity', resolved: [], skipped: remainingInputs, notes: ['no businessObjects in semanticFrame'] },
    };
  }

  // 将 businessObjects 按 type 索引
  const objectsByType: Record<string, typeof frame.businessObjects> = {};
  for (const ref of frame.businessObjects) {
    const typeKey = ref.type ?? 'unknown';
    if (!objectsByType[typeKey]) objectsByType[typeKey] = [];
    objectsByType[typeKey].push(ref);
  }

  const entityMapping: Record<string, string> = {
    media_id: 'entity',
    app_id: 'entity',
    account_id: 'entity',
    project_id: 'entity',
    package_name: 'entity',
  };

  for (const name of remainingInputs) {
    const entityType = entityMapping[name];
    // 查找 entity 类型的 businessObject 中是否有匹配
    const entityRefs = objectsByType['entity'] ?? [];
    const matchedRef = entityRefs.find((ref) => {
      const displayName = (ref.displayName ?? '').toLowerCase();
      return displayName.includes(name.toLowerCase().replace('_id', '').replace('_name', ''));
    });
    if (matchedRef) {
      resolved[name] = {
        name,
        value: matchedRef.reference,
        source: 'entity',
        confidence: matchedRef.confidence >= 0.8 ? 'high' : matchedRef.confidence >= 0.5 ? 'medium' : 'low',
        reason: `来自 semanticFrame.businessObjects (${matchedRef.type}: ${matchedRef.reference})`,
      };
      notes.push(`${name} from entity (${matchedRef.type})`);
    } else {
      remaining.push(name);
    }
  }

  return {
    resolved,
    remaining,
    trace: { resolver: 'entity', resolved: Object.keys(resolved), skipped: remaining, notes },
  };
}

/**
 * Dictionary Resolver — 从 Schema Registry / Metric/Dimension Catalog 查找字段定义。
 * 适用于 field_definition 类问题。
 */
function resolveFromDictionary(input: ResolverChainInput, remainingInputs: string[]): {
  resolved: Record<string, ResolvedInput>;
  remaining: string[];
  trace: ResolverTraceEntry;
} {
  const resolved: Record<string, ResolvedInput> = {};
  const remaining: string[] = [];
  const notes: string[] = [];

  // 从消息中提取可能的字段/指标/维度名称
  const message = input.message;

  for (const name of remainingInputs) {
    if (name === 'field_definition' || name === 'metric_definition' || name === 'dimension_definition') {
      // 尝试从消息中找到相关字段
      const matches = findFieldDefinitionsByLabelOrSynonym(message);
      if (matches.length > 0) {
        resolved[name] = {
          name,
          value: matches.map((m) => ({ key: m.key, label: m.label, definition: m.definition })),
          source: 'dictionary',
          confidence: 'medium',
          reason: `从 Schema Registry 匹配到 ${matches.length} 个字段定义`,
        };
        notes.push(`${name}: found ${matches.length} matches in schema registry`);
      } else {
        remaining.push(name);
      }
    } else if (name === 'report_type') {
      const matched = matchReportTypeBySignal(message);
      if (matched) {
        resolved[name] = {
          name,
          value: matched.key,
          source: 'dictionary',
          confidence: 'medium',
          reason: `从 Schema Registry 匹配到报表类型：${matched.label}`,
        };
        notes.push(`report_type: matched ${matched.key}`);
      } else {
        remaining.push(name);
      }
    } else {
      // 尝试在 schema registry 中查找该字段
      const fieldDef = findFieldDefinition(name);
      if (fieldDef) {
        resolved[name] = {
          name,
          value: fieldDef.key,
          source: 'dictionary',
          confidence: 'low',
          reason: `从 Schema Registry 找到字段定义：${fieldDef.label}`,
        };
        notes.push(`${name}: found in schema registry`);
      } else {
        remaining.push(name);
      }
    }
  }

  return {
    resolved,
    remaining,
    trace: { resolver: 'dictionary', resolved: Object.keys(resolved), skipped: remaining, notes },
  };
}

/**
 * Semantic Frame Resolver — 从 semanticFrame 的 semanticTask/executionMode 等提取值。
 */
function resolveFromSemanticFrame(input: ResolverChainInput, remainingInputs: string[]): {
  resolved: Record<string, ResolvedInput>;
  remaining: string[];
  trace: ResolverTraceEntry;
} {
  const resolved: Record<string, ResolvedInput> = {};
  const remaining: string[] = [];
  const notes: string[] = [];
  const frame = input.semanticFrame;

  if (!frame) {
    return {
      resolved,
      remaining: remainingInputs,
      trace: { resolver: 'semantic_frame', resolved: [], skipped: remainingInputs, notes: ['no semanticFrame'] },
    };
  }

  const frameMapping: Record<string, { field: keyof RequestSemanticFrame; label: string }> = {
    service_intent: { field: 'serviceIntent', label: 'serviceIntent' },
    semantic_task: { field: 'semanticTask', label: 'semanticTask' },
    execution_mode: { field: 'executionMode', label: 'executionMode' },
  };

  for (const name of remainingInputs) {
    const mapping = frameMapping[name];
    if (mapping && frame[mapping.field] !== undefined && frame[mapping.field] !== null) {
      resolved[name] = {
        name,
        value: frame[mapping.field],
        source: 'semantic_frame',
        confidence: 'medium',
        reason: `来自 semanticFrame.${mapping.label}`,
      };
      notes.push(`${name} from semanticFrame`);
    } else {
      remaining.push(name);
    }
  }

  return {
    resolved,
    remaining,
    trace: { resolver: 'semantic_frame', resolved: Object.keys(resolved), skipped: remaining, notes },
  };
}

/**
 * Default Policy Resolver — 为未解析的输入应用默认策略。
 * 优先级最低：只有在所有上游 resolver 都无法解析时才填充。
 */
function resolveFromDefaultPolicy(input: ResolverChainInput, remainingInputs: string[]): {
  resolved: Record<string, ResolvedInput>;
  remaining: string[];
  trace: ResolverTraceEntry;
} {
  const resolved: Record<string, ResolvedInput> = {};
  const remaining: string[] = [];
  const notes: string[] = [];

  // 默认策略表
  const defaultPolicies: Record<string, { value: unknown; reason: string }> = {
    timeRange: { value: 'last_7_days', reason: '默认时间范围：近 7 天' },
    outputFormat: { value: 'summary', reason: '默认输出格式：摘要' },
    granularity: { value: 'day', reason: '默认粒度：天级' },
  };

  for (const name of remainingInputs) {
    const policy = defaultPolicies[name];
    if (policy) {
      resolved[name] = {
        name,
        value: policy.value,
        source: 'default_policy',
        confidence: 'low',
        reason: policy.reason,
      };
      notes.push(`${name}: applied default policy`);
    } else {
      remaining.push(name);
    }
  }

  return {
    resolved,
    remaining,
    trace: { resolver: 'default_policy', resolved: Object.keys(resolved), skipped: remaining, notes },
  };
}

/**
 * Required Input Assist — 对最终仍未解析的 required inputs，生成 MissingField 建议。
 */
function assistMissingInputs(
  input: ResolverChainInput,
  missingRequired: string[],
  missingOptional: string[],
): { missingFields: MissingField[]; trace: ResolverTraceEntry } {
  const missingFields: MissingField[] = [];
  const notes: string[] = [];

  const fieldLabels: Record<string, string> = {
    project: '项目名称',
    app: '应用 ID',
    media: '媒体平台',
    media_id: '媒体账户 ID',
    app_id: '应用 ID',
    timeRange: '时间范围',
    metrics: '指标',
    dimensions: '维度',
    reportSource: '报表来源',
    account_id: '账户 ID',
    package_name: '包名',
  };

  for (const name of missingRequired) {
    missingFields.push({
      field_key: name,
      field_label: fieldLabels[name] ?? name,
      why_required: '必填输入缺失，需要用户补充。',
      suggested_question: `请提供${fieldLabels[name] ?? name}。`,
    });
    notes.push(`${name}: required but missing`);
  }

  for (const name of missingOptional) {
    notes.push(`${name}: optional and missing (not blocking)`);
  }

  return {
    missingFields,
    trace: {
      resolver: 'required_input_assist',
      resolved: [],
      skipped: [...missingRequired, ...missingOptional],
      notes,
    },
  };
}

// ─── 主入口 ──────────────────────────────────────────────────

/**
 * 运行 Resolver Chain，将分散的 resolver 统一为顺序链路。
 *
 * 顺序：Context → Entity → Dictionary → SemanticFrame → DefaultPolicy → RequiredInputAssist
 *
 * 上游 resolver 的优先级高于下游：如果 context 已经解析了某个值，
 * 后续 resolver 不会再尝试解析它。
 */
export function runResolverChain(input: ResolverChainInput): ResolverChainOutput {
  const allRequiredInputs = input.toolRequiredInputs ?? [];
  const allOptionalInputs = input.toolOptionalInputs ?? [];
  const allTargetInputs = [...new Set([...allRequiredInputs, ...allOptionalInputs])];

  const traceEntries: ResolverTraceEntry[] = [];
  const allResolved: Record<string, ResolvedInput> = {};
  let currentRemaining = allTargetInputs;

  // 1. Context Resolver
  const ctxResult = resolveFromContext(input, currentRemaining);
  Object.assign(allResolved, ctxResult.resolved);
  traceEntries.push(ctxResult.trace);
  currentRemaining = ctxResult.remaining;

  // 2. Entity Resolver
  const entityResult = resolveFromEntity(input, currentRemaining);
  Object.assign(allResolved, entityResult.resolved);
  traceEntries.push(entityResult.trace);
  currentRemaining = entityResult.remaining;

  // 3. Dictionary Resolver
  const dictResult = resolveFromDictionary(input, currentRemaining);
  Object.assign(allResolved, dictResult.resolved);
  traceEntries.push(dictResult.trace);
  currentRemaining = dictResult.remaining;

  // 4. Semantic Frame Resolver
  const frameResult = resolveFromSemanticFrame(input, currentRemaining);
  Object.assign(allResolved, frameResult.resolved);
  traceEntries.push(frameResult.trace);
  currentRemaining = frameResult.remaining;

  // 5. Default Policy Resolver
  const defaultResult = resolveFromDefaultPolicy(input, currentRemaining);
  Object.assign(allResolved, defaultResult.resolved);
  traceEntries.push(defaultResult.trace);
  currentRemaining = defaultResult.remaining;

  // 6. Required Input Assist
  const missingRequired = currentRemaining.filter((name) => allRequiredInputs.includes(name));
  const missingOptional = currentRemaining.filter((name) => allOptionalInputs.includes(name));
  const assistResult = assistMissingInputs(input, missingRequired, missingOptional);
  traceEntries.push(assistResult.trace);

  const totalResolved = Object.keys(allResolved).length;
  const totalMissing = missingRequired.length + missingOptional.length;

  return {
    resolved: allResolved,
    missingRequired,
    missingOptional,
    trace: { entries: traceEntries, totalResolved, totalMissing },
    missingFields: assistResult.missingFields,
  };
}

/**
 * 将 ResolverChainOutput 序列化为 trace metadata 可附加的格式。
 */
export function serializeResolverChainOutputForMetadata(output: ResolverChainOutput): Record<string, unknown> {
  return {
    total_resolved: output.trace.totalResolved,
    total_missing: output.trace.totalMissing,
    missing_required: output.missingRequired,
    missing_optional: output.missingOptional,
    resolved_summary: Object.entries(output.resolved).map(([name, r]) => ({
      name,
      source: r.source,
      confidence: r.confidence,
      has_value: r.value !== undefined && r.value !== null,
    })),
    resolver_trace: output.trace.entries.map((e) => ({
      resolver: e.resolver,
      resolved_count: e.resolved.length,
      skipped_count: e.skipped.length,
    })),
  };
}
