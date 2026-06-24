/**
 * 因果推理骨架 — 诊断域
 *
 * 为诊断链路提供结构化因果骨架，输出「已确认 / 高概率 / 待验证」三级结论。
 * 每个因果节点标注 confidence，供下游展示和追问使用。
 */

// ─── 因果节点类型 ──────────────────────────────────────────

export type CausalConclusionLevel = 'confirmed' | 'high_probability' | 'unverified';

export interface CausalNode {
  /** 节点 ID */
  id: string;
  /** 因果维度标签 */
  label: string;
  /** 结论级别 */
  conclusion: CausalConclusionLevel;
  /** 置信度 0-1 */
  confidence: number;
  /** 证据来源 */
  evidenceRefs?: string[];
  /** 子节点（下一层因果） */
  children?: CausalNode[];
}

export interface CausalSkeleton {
  /** 根问题描述 */
  rootQuestion: string;
  /** 因果树 */
  tree: CausalNode[];
  /** 整体诊断置信度 */
  overallConfidence: number;
}

// ─── 广告领域因果模板 ────────────────────────────────────────

/**
 * 效果下降因果模板
 * 效果下降 → 消耗维度 / 转化维度 / 回传维度
 */
function buildPerformanceDeclineTemplate(): CausalNode[] {
  return [
    {
      id: 'cost_dimension',
      label: '消耗维度',
      conclusion: 'unverified',
      confidence: 0,
      children: [
        {
          id: 'cost_trend',
          label: '消耗趋势是否正常',
          conclusion: 'unverified',
          confidence: 0,
        },
        {
          id: 'cost_distribution',
          label: '消耗是否集中在某媒体/计划',
          conclusion: 'unverified',
          confidence: 0,
        },
      ],
    },
    {
      id: 'conversion_dimension',
      label: '转化维度',
      conclusion: 'unverified',
      confidence: 0,
      children: [
        {
          id: 'activation_rate',
          label: '激活率是否正常',
          conclusion: 'unverified',
          confidence: 0,
        },
        {
          id: 'registration_rate',
          label: '注册率是否正常',
          conclusion: 'unverified',
          confidence: 0,
        },
        {
          id: 'payment_rate',
          label: '付费率是否正常',
          conclusion: 'unverified',
          confidence: 0,
        },
      ],
    },
    {
      id: 'callback_dimension',
      label: '回传维度',
      conclusion: 'unverified',
      confidence: 0,
      children: [
        {
          id: 'callback_delay',
          label: '回传是否延迟',
          conclusion: 'unverified',
          confidence: 0,
        },
        {
          id: 'callback_completeness',
          label: '回传是否完整',
          conclusion: 'unverified',
          confidence: 0,
        },
      ],
    },
  ];
}

/**
 * 基于证据填充因果骨架
 */
export function buildCausalSkeleton(input: {
  rootQuestion: string;
  serviceType?: string;
  evidenceSummary?: Record<string, unknown>;
}): CausalSkeleton {
  const { rootQuestion, serviceType, evidenceSummary } = input;

  // 根据服务类型选择因果模板
  let tree: CausalNode[];
  if (serviceType === 'roi_diagnosis' || serviceType === 'data_issue_diagnosis') {
    tree = buildPerformanceDeclineTemplate();
  } else {
    // 通用因果模板
    tree = [
      {
        id: 'data_check',
        label: '数据检查',
        conclusion: 'unverified',
        confidence: 0,
      },
      {
        id: 'config_check',
        label: '配置检查',
        conclusion: 'unverified',
        confidence: 0,
      },
    ];
  }

  // 基于 evidenceSummary 更新因果节点的结论和置信度
  if (evidenceSummary) {
    updateCausalNodesFromEvidence(tree, evidenceSummary);
  }

  // 计算整体置信度
  const allLeaves = flattenCausalNodes(tree);
  const overallConfidence = allLeaves.length > 0
    ? allLeaves.reduce((sum, node) => sum + node.confidence, 0) / allLeaves.length
    : 0;

  return {
    rootQuestion,
    tree,
    overallConfidence,
  };
}

/**
 * 基于证据更新因果节点
 */
function updateCausalNodesFromEvidence(
  nodes: CausalNode[],
  evidence: Record<string, unknown>,
): void {
  for (const node of nodes) {
    // 检查证据中是否有该节点的结论
    const evidenceKey = `causal_${node.id}`;
    const evidenceValue = evidence[evidenceKey];
    if (evidenceValue && typeof evidenceValue === 'object') {
      const ev = evidenceValue as Record<string, unknown>;
      if (typeof ev.conclusion === 'string') {
        node.conclusion = ev.conclusion as CausalConclusionLevel;
      }
      if (typeof ev.confidence === 'number') {
        node.confidence = Math.max(0, Math.min(1, ev.confidence));
      }
      if (Array.isArray(ev.evidenceRefs)) {
        node.evidenceRefs = ev.evidenceRefs.filter((r): r is string => typeof r === 'string');
      }
    }
    // 递归更新子节点
    if (node.children) {
      updateCausalNodesFromEvidence(node.children, evidence);
    }
  }
}

/**
 * 展平因果树为叶子节点列表
 */
function flattenCausalNodes(nodes: CausalNode[]): CausalNode[] {
  const result: CausalNode[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      result.push(...flattenCausalNodes(node.children));
    } else {
      result.push(node);
    }
  }
  return result;
}
