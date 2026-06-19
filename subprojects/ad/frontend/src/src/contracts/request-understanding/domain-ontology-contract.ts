/**
 * Domain Ontology Contract
 *
 * 定义业务对象的本体论结构。
 *
 * 设计原则：
 * 1. 业务对象（report、metric、dimension 等）由 ontology 定义，不是硬编码正则
 * 2. 泛词（如"数据"、"报表"）只能作为 surfaceCues，不能作为具体对象的 aliases
 * 3. 更具体的概念（specificity 高）覆盖父概念
 * 4. Object Resolver 只解析对象，不决定 execution
 */

// ─── Business Object Reference Type ──────────────────────

/**
 * 业务对象引用类型。
 * 扩展了原有的 report/metric/dimension 等，新增 workflow/package/operation
 * 以区分工作流类对象，不降级为 entity。
 */
export type BusinessObjectReferenceType =
  | 'report'        // 报表（日报/ROI报表/留存报表等）
  | 'metric'        // 指标（ROI/消耗/激活等）
  | 'dimension'     // 维度（媒体/账户/计划等）
  | 'time_range'    // 时间范围（今天/昨天/本周等）
  | 'entity'        // 实体实例（巨量/腾讯等媒体）
  | 'field'         // 字段名
  | 'field_value'   // 字段值
  | 'workflow'      // 工作流（联调、配置检查等）
  | 'package'       // 投放包、广告包
  | 'operation';    // 配置操作等

// ─── Business Object Role ────────────────────────────────

export type BusinessObjectRole =
  | 'primary_target'    // 主要目标
  | 'constraint'        // 约束条件
  | 'term'              // 术语
  | 'context';          // 上下文

// ─── Business Object Reference ───────────────────────────

/**
 * 业务对象引用。
 * 由 Object Resolver 从 ontology 解析得到。
 */
export interface BusinessObjectReference {
  type: BusinessObjectReferenceType;
  reference: string;            // 原始文本引用
  conceptId?: string;           // 概念 ID（来自 ontology）
  displayName?: string;         // 显示名称
  role: BusinessObjectRole;
  source: 'ontology' | 'capability_manifest' | 'user_explicit' | 'fallback';
  resolved?: boolean;           // 是否已解析到具体能力
  confidence: number;
}

// ─── Capability Reference ────────────────────────────────

/**
 * 能力引用。
 * 用于将业务对象链接到 capability manifest。
 * P1-2 只存储 capability_id 或 tool_name 字符串，
 * P1-3 需要实现 resolver 层，不直接用 tool_name 做能力选择。
 */
export interface CapabilityRef {
  type: 'capability_id' | 'tool_name';
  value: string;
}

// ─── Business Object Concept ─────────────────────────────

/**
 * 业务对象概念定义。
 * 用于 Domain Ontology 中描述一个业务对象类型。
 */
export interface BusinessObjectConcept {
  /** 概念 ID，使用点分层级，如 'report.daily' */
  conceptId: string;

  /** 业务对象类型 */
  type: BusinessObjectReferenceType;

  /** 中文显示名称 */
  displayName: string;

  /**
   * 精确别名列表。
   * 用于匹配用户输入。
   * 不允许包含泛词（如"数据"、"报表"），泛词应放在 surfaceCues 中。
   */
  aliases: string[];

  /** 父概念 ID，用于概念继承 */
  parentConceptId?: string;

  /** 关联的能力引用（P1-2 只存储，P1-3 做 resolver） */
  capabilityRefs?: CapabilityRef[];

  /**
   * 泛词表面线索。
   * 只记录命中，不直接产生 BusinessObjectReference。
   * 用于辅助判断，不作为具体业务对象的别名。
   */
  surfaceCues?: string[];

  /** 匹配优先级（高优先） */
  priority: number;

  /**
   * 具体度（子概念 > 父概念）。
   * 同一 span 上，specificity 高的概念覆盖低的。
   */
  specificity: number;

  /** 是否启用 */
  enabled?: boolean;
}

// ─── Domain Ontology ─────────────────────────────────────

/**
 * Domain Ontology 定义。
 * 描述一个业务领域的所有业务对象概念。
 */
export interface DomainOntology {
  /** 版本号 */
  version: string;

  /** 领域名称，如 'advertising' */
  domain: string;

  /** 概念列表 */
  concepts: BusinessObjectConcept[];
}

// ─── Object Resolver Types ───────────────────────────────

/**
 * Object Resolver 输入。
 */
export interface ObjectResolverInput {
  /** 用户输入消息 */
  message: string;

  /** 可选：自定义 ontology 列表，默认使用 advertising ontology */
  ontologies?: DomainOntology[];
}

/**
 * Object Resolver 输出。
 */
export interface ObjectResolverResult {
  /** 解析出的业务对象引用 */
  objects: BusinessObjectReference[];

  /** 匹配追踪信息 */
  trace: ObjectResolverTrace[];

  /** 泛词表面线索命中记录 */
  surfaceCueHits: SurfaceCueHit[];
}

/**
 * 匹配追踪信息。
 * 记录每个概念的匹配详情。
 */
export interface ObjectResolverTrace {
  /** 概念 ID */
  conceptId: string;

  /** 命中的别名 */
  matchedAlias: string;

  /** 匹配位置（基于原文坐标） */
  matchSpan: { start: number; end: number };

  /** 置信度 */
  confidence: number;

  /** 来源 */
  source: 'ontology' | 'fallback';

  /** 优先级 */
  priority: number;

  /** 具体度 */
  specificity: number;

  /** 被拒绝的原因（如果是被覆盖的候选） */
  rejectedReason?: 'overridden_by_more_specific' | 'overridden_by_longer_alias' | 'overridden_by_higher_priority';
}

/**
 * 泛词表面线索命中记录。
 */
export interface SurfaceCueHit {
  /** 命中的泛词 */
  cue: string;

  /** 命中位置 */
  span: { start: number; end: number };

  /** 关联的概念 ID 列表（哪些概念把这个词作为 surfaceCue） */
  associatedConceptIds: string[];
}
