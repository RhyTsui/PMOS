/**
 * 源健康监控服务
 *
 * 监控各情报源的健康状态，自动检测和告警
 */
import { v4 as uuidv4 } from 'uuid';
import { SourceHealthRepository } from '../../repositories/source-health-repository.js';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import type { SourceHealth, HealthStatus, IntelSource } from '../../models/types.js';

/**
 * 健康监控配置
 */
export interface HealthMonitorConfig {
  // 降级阈值
  degradedMinScore: number;        // 低于此分降级
  degradedMaxFailRate: number;     // 失败率超过此值降级

  // 下线阈值
  downMaxFailRate: number;         // 失败率超过此值下线
  downMinConsecutiveFailures: number; // 连续失败次数超过此值下线
}

const DEFAULT_CONFIG: HealthMonitorConfig = {
  degradedMinScore: 50,
  degradedMaxFailRate: 0.3,
  downMaxFailRate: 0.7,
  downMinConsecutiveFailures: 5,
};

/**
 * 源健康监控服务
 */
export class SourceHealthService {
  private healthRepo: SourceHealthRepository;
  private sourceRepo: IntelSourceRepository;
  private config: HealthMonitorConfig;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.healthRepo = new SourceHealthRepository();
    this.sourceRepo = new IntelSourceRepository();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 记录采集成功
   */
  recordSuccess(sourceId: string, duration: number, evidenceCount: number): void {
    let health = this.healthRepo.findBySourceId(sourceId);
    const now = new Date().toISOString();

    if (!health) {
      // 创建新记录
      health = {
        id: uuidv4(),
        sourceId,
        lastCollectedAt: now,
        lastSuccessAt: now,
        totalCollections: 1,
        successCount: 1,
        failCount: 0,
        evidenceProduced: evidenceCount,
        avgResponseTime: duration,
        healthStatus: 'healthy',
        healthScore: 100,
        consecutiveFailures: 0,
        updatedAt: now,
      };
      this.healthRepo.create(health);
    } else {
      // 更新现有记录
      const newSuccessCount = health.successCount + 1;
      const newTotal = health.totalCollections + 1;
      const newAvgResponse = (health.avgResponseTime * health.totalCollections + duration) / newTotal;

      const updated: Partial<SourceHealth> = {
        lastCollectedAt: now,
        lastSuccessAt: now,
        totalCollections: newTotal,
        successCount: newSuccessCount,
        evidenceProduced: health.evidenceProduced + evidenceCount,
        avgResponseTime: newAvgResponse,
        consecutiveFailures: 0,
        updatedAt: now,
      };

      // 重新计算健康评分
      updated.healthScore = this.calculateHealthScore({
        ...health,
        ...updated,
      } as SourceHealth);

      // 重新计算健康状态
      updated.healthStatus = this.calculateHealthStatus({
        ...health,
        ...updated,
      } as SourceHealth);

      this.healthRepo.update(health.id, updated);
    }
  }

  /**
   * 记录采集失败
   */
  recordFailure(sourceId: string, error: string): void {
    let health = this.healthRepo.findBySourceId(sourceId);
    const now = new Date().toISOString();

    if (!health) {
      // 创建新记录
      health = {
        id: uuidv4(),
        sourceId,
        lastCollectedAt: now,
        lastErrorAt: now,
        lastError: error,
        totalCollections: 1,
        successCount: 0,
        failCount: 1,
        evidenceProduced: 0,
        avgResponseTime: 0,
        healthStatus: 'degraded',
        healthScore: 50,
        consecutiveFailures: 1,
        updatedAt: now,
      };
      this.healthRepo.create(health);
    } else {
      // 更新现有记录
      const newFailCount = health.failCount + 1;
      const newTotal = health.totalCollections + 1;

      const updated: Partial<SourceHealth> = {
        lastCollectedAt: now,
        lastErrorAt: now,
        lastError: error,
        totalCollections: newTotal,
        failCount: newFailCount,
        consecutiveFailures: health.consecutiveFailures + 1,
        updatedAt: now,
      };

      // 重新计算健康评分
      updated.healthScore = this.calculateHealthScore({
        ...health,
        ...updated,
      } as SourceHealth);

      // 重新计算健康状态
      updated.healthStatus = this.calculateHealthStatus({
        ...health,
        ...updated,
      } as SourceHealth);

      this.healthRepo.update(health.id, updated);
    }
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(health: SourceHealth): number {
    let score = 100;

    // 失败率惩罚
    const failRate = health.totalCollections > 0
      ? health.failCount / health.totalCollections
      : 0;
    score -= failRate * 50;  // 失败率 100% 扣 50 分

    // 连续失败惩罚
    score -= health.consecutiveFailures * 10;  // 每次连续失败扣 10 分

    // 响应时间惩罚（超过 10s 开始扣分）
    if (health.avgResponseTime > 10000) {
      const overtime = (health.avgResponseTime - 10000) / 1000;
      score -= Math.min(20, overtime);  // 最多扣 20 分
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 计算健康状态
   */
  private calculateHealthStatus(health: SourceHealth): HealthStatus {
    const failRate = health.totalCollections > 0
      ? health.failCount / health.totalCollections
      : 0;

    // 下线判断
    if (
      health.consecutiveFailures >= this.config.downMinConsecutiveFailures ||
      failRate >= this.config.downMaxFailRate
    ) {
      return 'down';
    }

    // 降级判断
    if (
      health.healthScore < this.config.degradedMinScore ||
      failRate >= this.config.degradedMaxFailRate
    ) {
      return 'degraded';
    }

    // 健康
    if (health.totalCollections > 0) {
      return 'healthy';
    }

    return 'unknown';
  }

  /**
   * 获取所有源的健康状态
   */
  getAllHealth(): SourceHealth[] {
    return this.healthRepo.findAll();
  }

  /**
   * 获取不健康的源
   */
  getUnhealthySources(): SourceHealth[] {
    return this.healthRepo.findUnhealthy();
  }

  /**
   * 获取健康统计
   */
  getStats(): HealthStats {
    const byStatus = this.healthRepo.countByStatus();
    const total = Object.values(byStatus).reduce((sum: number, c: number) => sum + c, 0);

    return {
      total,
      healthy: byStatus.healthy,
      degraded: byStatus.degraded,
      down: byStatus.down,
      unknown: byStatus.unknown,
    };
  }
}

/**
 * 健康统计
 */
export interface HealthStats {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
}
