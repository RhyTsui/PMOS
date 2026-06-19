/**
 * 调度器服务
 *
 * 管理所有定时任务：
 * - 采集任务（按源配置调度）
 * - 种子进化（每周评估）
 * - 健康检查（每小时）
 * - 去重清理（每天）
 *
 * @see docs/design/05-采集器设计.md
 */
import cron, { type ScheduledTask } from 'node-cron';
import { IntelSourceRepository } from '../repositories/intel-source-repository.js';
import { CollectionService } from '../services/collection/index.js';
import { SeedService } from '../services/seed/index.js';
import type { IntelSource } from '../models/types.js';

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  // 全局调度
  healthCheckCron: string;      // 健康检查 cron（默认每小时）
  evolutionCron: string;        // 种子进化 cron（默认每周一）
  cleanupCron: string;          // 清理任务 cron（默认每天凌晨）

  // 采集调度
  enableAutoCollection: boolean; // 是否启用自动采集
  defaultCron: string;          // 默认采集 cron（如果源没配置）
}

const DEFAULT_CONFIG: SchedulerConfig = {
  healthCheckCron: '0 * * * *',     // 每小时
  evolutionCron: '0 3 * * 1',       // 每周一凌晨 3 点
  cleanupCron: '0 2 * * *',         // 每天凌晨 2 点
  enableAutoCollection: true,
  defaultCron: '*/30 * * * *',      // 每 30 分钟
};

/**
 * 调度器服务
 */
export class Scheduler {
  private config: SchedulerConfig;
  private sourceRepo: IntelSourceRepository;
  private collectionService: CollectionService;
  private seedService: SeedService;
  private jobs: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sourceRepo = new IntelSourceRepository();
    this.collectionService = new CollectionService();
    this.seedService = new SeedService();
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Scheduler] 已在运行中');
      return;
    }

    console.log('[Scheduler] 启动调度器...');

    // 1. 注册全局任务
    this.scheduleGlobalTasks();

    // 2. 注册采集任务（按源配置）
    if (this.config.enableAutoCollection) {
      this.scheduleCollectionTasks();
    }

    this.isRunning = true;
    console.log(`[Scheduler] 调度器已启动，注册了 ${this.jobs.size} 个任务`);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[Scheduler] 停止调度器...');
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`  - 停止任务: ${name}`);
    }
    this.jobs.clear();
    this.isRunning = false;
    console.log('[Scheduler] 调度器已停止');
  }

  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys()),
    };
  }

  /**
   * 手动触发某个任务
   */
  async triggerJob(jobName: string): Promise<void> {
    switch (jobName) {
      case 'health-check':
        await this.runHealthCheck();
        break;
      case 'seed-evolution':
        await this.runSeedEvolution();
        break;
      case 'collection-all':
        await this.runCollectionAll();
        break;
      case 'cleanup':
        await this.runCleanup();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  // ===== 私有方法 =====

  /**
   * 注册全局任务
   */
  private scheduleGlobalTasks(): void {
    // 健康检查
    this.addJob('health-check', this.config.healthCheckCron, () => {
      this.runHealthCheck();
    });

    // 种子进化
    this.addJob('seed-evolution', this.config.evolutionCron, () => {
      this.runSeedEvolution();
    });

    // 清理任务
    this.addJob('cleanup', this.config.cleanupCron, () => {
      this.runCleanup();
    });
  }

  /**
   * 注册采集任务（按源配置）
   */
  private scheduleCollectionTasks(): void {
    const sources = this.sourceRepo.findEnabled();

    for (const source of sources) {
      const cronExpr = source.schedule?.cron || this.config.defaultCron;
      const jobName = `collect-${source.id}`;

      this.addJob(jobName, cronExpr, () => {
        this.runCollectionForSource(source);
      });
    }

    console.log(`  - 注册了 ${sources.length} 个采集任务`);
  }

  /**
   * 添加定时任务
   */
  private addJob(name: string, cronExpr: string, fn: () => Promise<void> | void): void {
    // 验证 cron 表达式
    if (!cron.validate(cronExpr)) {
      console.warn(`[Scheduler] 无效的 cron 表达式: ${cronExpr} (${name})`);
      return;
    }

    const task = cron.schedule(cronExpr, async () => {
      console.log(`[Scheduler] 执行任务: ${name}`);
      try {
        await fn();
        console.log(`[Scheduler] 任务完成: ${name}`);
      } catch (error) {
        console.error(`[Scheduler] 任务失败: ${name}`, error);
      }
    });

    this.jobs.set(name, task);
  }

  /**
   * 运行健康检查
   */
  private async runHealthCheck(): Promise<void> {
    console.log('  → 检查数据源健康状态...');
    // TODO: 实现具体的健康检查逻辑
    // - 检查各源是否可访问
    // - 更新 source_health 表
  }

  /**
   * 运行种子进化
   */
  private async runSeedEvolution(): Promise<void> {
    console.log('  → 运行种子进化周期...');
    try {
      const report = await this.seedService.runEvolution();
      console.log(`  → 进化完成: 评估 ${report.evaluated} 个种子, 新增 ${report.expanded} 个`);
    } catch (error) {
      console.error('  → 种子进化失败:', error);
    }
  }

  /**
   * 运行全量采集
   */
  private async runCollectionAll(): Promise<void> {
    console.log('  → 开始全量采集...');
    try {
      const result = await this.collectionService.collectAll();
      console.log(`  → 采集完成: ${result.totalNew} 条新证据, 失败 ${result.failCount} 个源`);
    } catch (error) {
      console.error('  → 全量采集失败:', error);
    }
  }

  /**
   * 运行指定源采集
   */
  private async runCollectionForSource(source: IntelSource): Promise<void> {
    console.log(`  → 采集源: ${source.name}`);
    try {
      const result = await this.collectionService.collectSource(source.id);
      console.log(`  → 采集完成: ${result.newCount} 条新证据`);
    } catch (error) {
      console.error(`  → 采集失败 [${source.name}]:`, error);
    }
  }

  /**
   * 运行清理任务
   */
  private async runCleanup(): Promise<void> {
    console.log('  → 运行清理任务...');
    // TODO: 实现清理逻辑
    // - 清理过期的 retired 种子
    // - 清理过期的重复证据
  }
}

/**
 * 调度器状态
 */
export interface SchedulerStatus {
  isRunning: boolean;
  jobCount: number;
  jobs: string[];
}

/**
 * 创建全局调度器实例
 */
let schedulerInstance: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler();
  }
  return schedulerInstance;
}
