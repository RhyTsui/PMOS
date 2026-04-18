/**
 * v0.4 Impact Engine - 影响传播引擎
 *
 * 核心职责：
 * 1. 分析 DAG 依赖图
 * 2. 当上游节点变更时，传播影响范围到下游节点
 * 3. 标记受影响的节点为 dirty
 * 4. 支持影响链追踪（直接/间接/传递）
 */

import { type DAGGraph, type DAGNode, type ImpactAnalysisResult, type DAGChangeEvent } from '../shared/schemas.js';

export class ImpactEngine {
  constructor(private readonly graph: DAGGraph) {}

  /**
   * 核心方法：当节点发生变更时，分析并传播影响
   */
  analyzeAndPropagate(changedNodeId: string): ImpactAnalysisResult {
    // 1. 分析受影响节点
    const impactedNodes = this.analyzeImpact(changedNodeId);

    // 2. 确定需要标记为 dirty 的节点
    const dirtyNodes = impactedNodes
      .filter(n => n.impactType !== 'transitive' || this.hasDirectDependency(n.nodeId, changedNodeId))
      .map(n => n.nodeId);

    // 3. 判断是否需要全量重跑
    const requiresFullRerun = dirtyNodes.length > this.graph.nodes.length * 0.7;

    return {
      sourceNodeId: changedNodeId,
      impactedNodes,
      dirtyNodes,
      requiresFullRerun,
    };
  }

  /**
   * 分析单个节点变更对整个图的影响
   */
  analyzeImpact(nodeId: string): ImpactAnalysisResult['impactedNodes'] {
    const impacted: ImpactAnalysisResult['impactedNodes'] = [];
    const visited = new Set<string>();

    // BFS 遍历下游节点
    const queue: string[] = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // 找到直接依赖 currentId 的下游节点
      const downstreamNodes = this.getDownstreamNodes(currentId);

      for (const downstream of downstreamNodes) {
        if (downstream === nodeId) continue; // 跳过自身

        const propagationPath = this.getPropagationPath(nodeId, downstream);
        const impactType = this.determineImpactType(nodeId, downstream, propagationPath);

        impacted.push({
          nodeId: downstream,
          impactType,
          propagationPath,
        });

        // 继续传播（对于强依赖）
        const downstreamNode = this.getNode(downstream);
        if (downstreamNode && propagationPath.length <= 5) { // 限制传播深度
          queue.push(downstream);
        }
      }
    }

    return impacted;
  }

  /**
   * 标记一组节点为 dirty
   */
  markDirty(nodeIds: string[]): void {
    for (const nodeId of nodeIds) {
      const node = this.getNode(nodeId);
      if (node && node.state === 'clean') {
        node.state = 'dirty';
        node.metadata = {
          ...node.metadata,
          markedDirtyAt: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * 从 dirty 恢复为 clean（当节点重新执行成功后）
   */
  resolveDirty(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (node && node.state === 'dirty') {
      node.state = 'clean';
      node.version = this.bumpVersion(node.version);
      node.metadata = {
        ...node.metadata,
        resolvedAt: new Date().toISOString(),
        previousVersion: node.metadata.previousVersion ?? node.version,
      };
    }
  }

  /**
   * 冻结节点（Manual 模式下使用）
   */
  freeze(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (node) {
      node.state = 'frozen';
      node.metadata = {
        ...node.metadata,
        frozenAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 解冻节点
   */
  unfreeze(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (node && node.state === 'frozen') {
      node.state = 'dirty'; // 解冻后标记为 dirty，需要重新执行
    }
  }

  /**
   * 获取可执行的 dirty 节点（排除 frozen）
   */
  getExecutableNodes(): DAGNode[] {
    return this.graph.nodes.filter(
      node => node.state === 'dirty' && !node.metadata.isFrozen
    );
  }

  /**
   * 获取影响分析摘要
   */
  getImpactSummary(): {
    totalNodes: number;
    cleanCount: number;
    dirtyCount: number;
    staleCount: number;
    frozenCount: number;
    impactChains: Map<string, string[]>;
  } {
    const counts = {
      clean: 0,
      dirty: 0,
      stale: 0,
      frozen: 0,
    };

    for (const node of this.graph.nodes) {
      counts[node.state as keyof typeof counts]++;
    }

    // 追踪影响链
    const impactChains = new Map<string, string[]>();
    for (const node of this.graph.nodes) {
      if (node.state === 'dirty') {
        const impacted = this.analyzeImpact(node.id);
        impactChains.set(node.id, impacted.map(i => i.nodeId));
      }
    }

    return {
      totalNodes: this.graph.nodes.length,
      cleanCount: counts.clean,
      dirtyCount: counts.dirty,
      staleCount: counts.stale,
      frozenCount: counts.frozen,
      impactChains,
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 获取下游节点（直接依赖此节点的所有节点）
   */
  private getDownstreamNodes(nodeId: string): string[] {
    const downstream: string[] = [];

    for (const edge of this.graph.edges) {
      if (edge.sourceId === nodeId) {
        downstream.push(edge.targetId);
      }
    }

    // 也检查节点的 implicit 依赖（通过 dependencies 字段）
    const node = this.getNode(nodeId);
    if (node) {
      for (const otherNode of this.graph.nodes) {
        if (otherNode.dependencies.includes(nodeId) && !downstream.includes(otherNode.id)) {
          downstream.push(otherNode.id);
        }
      }
    }

    return [...new Set(downstream)]; // 去重
  }

  /**
   * 获取从源节点到目标节点的传播路径
   */
  private getPropagationPath(sourceId: string, targetId: string): string[] {
    const path: string[] = [sourceId];
    const visited = new Set<string>([sourceId]);
    const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];

    while (queue.length > 0) {
      const { id, path: currentPath } = queue.shift()!;

      if (id === targetId) {
        return currentPath;
      }

      const downstream = this.getDownstreamNodes(id);
      for (const downstreamId of downstream) {
        if (!visited.has(downstreamId)) {
          visited.add(downstreamId);
          queue.push({
            id: downstreamId,
            path: [...currentPath, downstreamId],
          });
        }
      }
    }

    return path;
  }

  /**
   * 确定影响类型
   */
  private determineImpactType(
    sourceId: string,
    targetId: string,
    propagationPath: string[]
  ): 'direct' | 'indirect' | 'transitive' {
    if (propagationPath.length === 2) {
      return 'direct';
    }
    if (propagationPath.length <= 4) {
      return 'indirect';
    }
    return 'transitive';
  }

  /**
   * 检查是否存在直接依赖关系
   */
  private hasDirectDependency(nodeId: string, sourceId: string): boolean {
    const node = this.getNode(nodeId);
    return node ? node.dependencies.includes(sourceId) : false;
  }

  /**
   * 获取节点
   */
  private getNode(nodeId: string): DAGNode | undefined {
    return this.graph.nodes.find(n => n.id === nodeId);
  }

  /**
   * 递增版本号
   */
  private bumpVersion(version: string): string {
    const match = version.match(/^v(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `v${num}`;
    }
    return 'v1';
  }
}

/**
 * 工厂函数：从 DAG 变更事件创建 ImpactEngine
 */
export function createImpactEngineFromGraph(graph: DAGGraph): ImpactEngine {
  return new ImpactEngine(graph);
}

/**
 * 从变更事件创建影响分析
 */
export function analyzeChangeEvent(
  graph: DAGGraph,
  event: DAGChangeEvent
): ImpactAnalysisResult {
  const engine = new ImpactEngine(graph);
  return engine.analyzeAndPropagate(event.nodeId);
}