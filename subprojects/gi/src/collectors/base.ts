/**
 * 采集器统一接口
 *
 * 所有采集器实现此接口，返回统一格式的 RawEvidence
 *
 * @see docs/design/05-采集器设计.md
 */
import type { IntelSource, Seed, RawEvidence, AccessMethod } from '../models/types.js';

/**
 * 采集器接口
 */
export interface Collector {
  /** 采集器类型 */
  readonly type: AccessMethod;

  /**
   * 执行采集
   * @param source - 目标情报源
   * @param seeds  - 本次使用的种子（用于过滤/构造查询）
   * @returns 采集到的原始证据列表
   */
  collect(source: IntelSource, seeds: Seed[]): Promise<RawEvidence[]>;

  /**
   * 健康检查
   * @returns 采集器是否可用
   */
  healthCheck?(): Promise<boolean>;
}

/**
 * 采集器工厂
 */
export class CollectorFactory {
  private collectors = new Map<AccessMethod, Collector>();

  /**
   * 注册采集器
   */
  register(collector: Collector): void {
    this.collectors.set(collector.type, collector);
  }

  /**
   * 获取采集器
   */
  getCollector(method: AccessMethod): Collector {
    const collector = this.collectors.get(method);
    if (!collector) {
      throw new Error(`No collector registered for method: ${method}`);
    }
    return collector;
  }

  /**
   * 检查采集器是否已注册
   */
  hasCollector(method: AccessMethod): boolean {
    return this.collectors.has(method);
  }

  /**
   * 获取所有已注册的采集器类型
   */
  getRegisteredTypes(): AccessMethod[] {
    return Array.from(this.collectors.keys());
  }
}

/**
 * 全局采集器工厂实例
 */
export const collectorFactory = new CollectorFactory();
