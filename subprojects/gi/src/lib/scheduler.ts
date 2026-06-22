/**
 * 调度器服务
 *
 * 管理所有定时任务：
 * - 采集任务（按源配置调度）
 * - 种子进化（每周评估）
 * - 健康检查（每小时）
 * - 去重清理（每天）
 * - 源发现（每周自动发现新源）
 * - 每日统计报告（每天晚上 10 点）
 *
 * @see docs/design/05-采集器设计.md
 */
import cron, { type ScheduledTask } from 'node-cron';
import { IntelSourceRepository } from '../repositories/intel-source-repository.js';
import { SystemSettingsRepository } from '../repositories/system-settings-repository.js';
import { CollectionService } from '../services/collection/index.js';
import { SeedService } from '../services/seed/index.js';
import { GapDetectionService } from '../services/gap-detection/index.js';
import { SourceHealthService } from '../services/health/index.js';
import { SourceDiscoveryService } from '../services/source-discovery/index.js';
import { DailyReportService } from '../services/daily-report/index.js';
import { getDatabase } from './database.js';
import type { IntelSource } from '../models/types.js';

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  enabled: boolean;             // 服务启动后是否自动运行调度器

  // 全局调度
  healthCheckCron: string;      // 健康检查 cron（默认每小时）
  evolutionCron: string;        // 种子进化 cron（默认每周一）
  cleanupCron: string;          // 清理任务 cron（默认每天凌晨）
  gapDetectionCron: string;    // 漏采检测 cron（默认每天 9 点）
  sourceDiscoveryCron: string; // 源发现 cron（默认每周日凌晨 4 点）
  dailyReportCron: string;     // 每日报告 cron（默认每天晚上 10 点）

  // 采集调度
  enableAutoCollection: boolean; // 是否启用自动采集
  defaultCron: string;          // 默认采集 cron（如果源没配置）
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  enabled: true,
  healthCheckCron: '0 * * * *',     // 每小时
  evolutionCron: '0 3 * * 1',       // 每周一凌晨 3 点
  cleanupCron: '0 2 * * *',         // 每天凌晨 2 点
  gapDetectionCron: '0 9 * * *',    // 每天 9 点
  sourceDiscoveryCron: '0 4 * * 0', // 每周日凌晨 4 点
  dailyReportCron: '0 22 * * *',    // 每天晚上 10 点
  enableAutoCollection: true,
  defaultCron: '*/30 * * * *',      // 每 30 分钟
};

const SCHEDULER_CONFIG_KEY = 'scheduler.config';

/**
 * 调度器服务
 */
export class Scheduler {
  private config: SchedulerConfig;
  private settingsRepo: SystemSettingsRepository;
  private sourceRepo: IntelSourceRepository;
  private collectionService: CollectionService;
  private seedService: SeedService;
  private gapService: GapDetectionService;
  private healthService: SourceHealthService;
  private discoveryService: SourceDiscoveryService;
  private dailyReportService: DailyReportService;
  private jobs: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.settingsRepo = new SystemSettingsRepository();
    const persisted = this.settingsRepo.getJson<SchedulerConfig | null>(SCHEDULER_CONFIG_KEY, null);
    this.config = normalizeSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG, ...(persisted || {}), ...config });
    if (!persisted || Object.keys(config).length > 0) {
      this.persistConfig();
    }
    this.sourceRepo = new IntelSourceRepository();
    this.collectionService = new CollectionService();
    this.seedService = new SeedService();
    this.gapService = new GapDetectionService();
    this.healthService = new SourceHealthService();
    this.discoveryService = new SourceDiscoveryService();
    this.dailyReportService = new DailyReportService();
  }

  /**
   * 启动调度器
   */
  start(persist = true): void {
    if (this.isRunning) {
      console.log('[Scheduler] 已在运行中');
      return;
    }

    if (persist && !this.config.enabled) {
      this.config = { ...this.config, enabled: true };
      this.persistConfig();
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
  stop(persist = true): void {
    if (persist && this.config.enabled) {
      this.config = { ...this.config, enabled: false };
      this.persistConfig();
    }

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
      config: this.getConfig(),
    };
  }

  /**
   * 获取持久化调度器配置
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置并按 enabled 状态热重载任务
   */
  updateConfig(updates: Partial<SchedulerConfig>): SchedulerConfig {
    const next = normalizeSchedulerConfig({ ...this.config, ...updates });
    validateSchedulerConfig(next);

    this.config = next;
    this.persistConfig();

    if (this.config.enabled) {
      if (this.isRunning) {
        this.stop(false);
      }
      this.start(false);
    } else if (this.isRunning) {
      this.stop(false);
    }

    return this.getConfig();
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
      case 'gap-detection':
        this.runGapDetection();
        break;
      case 'source-discovery':
        this.runSourceDiscovery();
        break;
      case 'daily-report':
        await this.runDailyReport();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  // ===== 私有方法 =====

  private persistConfig(): void {
    this.settingsRepo.setJson(SCHEDULER_CONFIG_KEY, this.config, {
      schemaVersion: 1,
      description: 'Scheduler runtime and cron configuration',
    });
  }

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

    // 漏采检测
    this.addJob('gap-detection', this.config.gapDetectionCron, () => {
      this.runGapDetection();
    });

    // 源发现
    this.addJob('source-discovery', this.config.sourceDiscoveryCron, () => {
      this.runSourceDiscovery();
    });

    // 每日报告
    this.addJob('daily-report', this.config.dailyReportCron, () => {
      this.runDailyReport();
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
   *
   * 检查各情报源是否可访问，更新健康状态
   */
  private async runHealthCheck(): Promise<void> {
    console.log('  → 检查数据源健康状态...');
    const sources = this.sourceRepo.findEnabled();
    let healthy = 0;
    let unhealthy = 0;

    for (const source of sources) {
      try {
        const reachable = await this.checkSourceReachable(source);
        if (reachable) {
          healthy++;
        } else {
          unhealthy++;
          this.healthService.recordFailure(source.id, '源不可访问（健康检查）');
        }
      } catch (error) {
        unhealthy++;
        const msg = error instanceof Error ? error.message : String(error);
        this.healthService.recordFailure(source.id, `健康检查异常: ${msg}`);
      }
    }

    console.log(`  → 健康检查完成: ${healthy} 个正常, ${unhealthy} 个异常`);
  }

  /**
   * 检查源是否可访问
   */
  private async checkSourceReachable(source: IntelSource): Promise<boolean> {
    const url = source.feedUrl || source.baseUrl;
    if (!url) return false;

    try {
      const response = await fetch(url, {
        method: source.accessMethod === 'rss' ? 'GET' : 'HEAD',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'GI-HealthCheck/1.0' },
      });
      return response.ok;
    } catch {
      return false;
    }
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
    const startedAt = Date.now();
    const db = getDatabase();

    const result = db.transaction(() => {
      const oldJobs = db.prepare(`
        DELETE FROM collection_jobs
        WHERE status IN ('completed', 'failed', 'cancelled')
          AND started_at < datetime('now', '-30 days')
      `).run();

      const orphanDedupRecords = db.prepare(`
        DELETE FROM dedup_records
        WHERE evidence_id NOT IN (SELECT id FROM raw_evidence)
      `).run();

      return {
        oldCollectionJobs: oldJobs.changes,
        orphanDedupRecords: orphanDedupRecords.changes,
      };
    })();

    console.log(
      `  → 清理完成: 旧采集任务 ${result.oldCollectionJobs} 条, 孤儿去重记录 ${result.orphanDedupRecords} 条, 耗时 ${Date.now() - startedAt}ms`,
    );
  }

  /**
   * 运行漏采检测
   */
  private runGapDetection(): void {
    console.log('  → 运行漏采检测...');
    try {
      const report = this.gapService.detect();
      console.log(`  → 漏采检测完成: 检查 ${report.totalSeedsChecked} 个种子, 发现 ${report.gapsFound} 个漏采`);
      if (report.summary.critical > 0) {
        console.warn(`  → ⚠️ 严重漏采 ${report.summary.critical} 个，请及时处理`);
        report.alerts
          .filter(a => a.severity === 'critical')
          .forEach(a => console.warn(`    - [${a.seedType}] ${a.seedText} (${a.gapDays}天未产出)`));
      }
      if (report.summary.warning > 0) {
        console.log(`  → 警告级漏采 ${report.summary.warning} 个`);
      }
    } catch (error) {
      console.error('  → 漏采检测失败:', error);
    }
  }

  /**
   * 运行源发现
   */
  private async runSourceDiscovery(): Promise<void> {
    console.log('  → 运行源发现...');
    try {
      const report = await this.discoveryService.discover();
      console.log(`  → 源发现完成: 检查 ${report.seedsChecked} 个种子, 发现 ${report.discoveredCount} 个新源`);

      if (report.discoveries.length > 0) {
        console.log(`  → 发现的源:`);
        report.discoveries.forEach(d => {
          console.log(`    - ${d.name} (${d.sourceType}, 置信度: ${d.confidence.toFixed(2)})`);
          console.log(`      ${d.url}`);
          console.log(`      策略: ${d.discoveryMethod}, 理由: ${d.reason}`);
        });
      }

      // 输出统计
      console.log(`  → 发现策略统计:`);
      console.log(`    - LLM 推荐: ${report.stats.llm_recommendation} 个`);
      console.log(`    - 共现提取: ${report.stats.cooccurrence} 个`);
      console.log(`    - 搜索引擎: ${report.stats.search} 个`);
      console.log(`    - 交叉引用: ${report.stats.cross_reference} 个`);
    } catch (error) {
      console.error('  → 源发现失败:', error);
    }
  }

  /**
   * 运行每日报告
   */
  private async runDailyReport(): Promise<void> {
    console.log('  → 生成每日报告...');
    try {
      const report = await this.dailyReportService.generateReport();
      console.log(`  → 每日报告生成完成: ${report.reportDate}`);
      console.log(`  → 采集统计:`);
      console.log(`    - 新增证据: ${report.collection.newEvidenceCount} 条`);
      console.log(`    - 新增结构化事件: ${report.collection.newStructuredEventsCount} 条`);
      console.log(`    - 新增信号: ${report.collection.newSignalsCount} 条`);

      console.log(`  → 信号统计:`);
      console.log(`    - 总信号数: ${report.signals.total}`);
      console.log(`    - P0 信号: ${report.signals.byPriority.P0} 个`);
      console.log(`    - P1 信号: ${report.signals.byPriority.P1} 个`);

      console.log(`  → 源健康:`);
      console.log(`    - 总源数: ${report.sourceHealth.total}`);
      console.log(`    - 启用源: ${report.sourceHealth.enabled}`);
      console.log(`    - 健康: ${report.sourceHealth.byHealthStatus.healthy}`);
      console.log(`    - 降级: ${report.sourceHealth.byHealthStatus.degraded}`);
      console.log(`    - 下线: ${report.sourceHealth.byHealthStatus.down}`);

      if (report.gapAlerts) {
        console.log(`  → 漏采告警:`);
        console.log(`    - 检查种子: ${report.gapAlerts.seedsChecked}`);
        console.log(`    - 漏采数: ${report.gapAlerts.gapsFound}`);
        console.log(`    - 严重: ${report.gapAlerts.criticalCount}`);
        console.log(`    - 警告: ${report.gapAlerts.warningCount}`);
      }

      if (report.trends) {
        console.log(`  → 趋势分析:`);
        console.log(`    - 上升: ${report.trends.risingCount}`);
        console.log(`    - 稳定: ${report.trends.stableCount}`);
        console.log(`    - 下降: ${report.trends.decliningCount}`);
      }

      console.log(`  → 整体健康度: ${report.summary.overallHealth}%`);
      console.log(`  → 建议:`);
      report.summary.recommendations.forEach(r => console.log(`    - ${r}`));
    } catch (error) {
      console.error('  → 每日报告生成失败:', error);
    }
  }
}

/**
 * 调度器状态
 */
export interface SchedulerStatus {
  isRunning: boolean;
  jobCount: number;
  jobs: string[];
  config: SchedulerConfig;
}

export function validateSchedulerConfig(config: SchedulerConfig): void {
  const cronFields: Array<keyof SchedulerConfig> = [
    'healthCheckCron',
    'evolutionCron',
    'cleanupCron',
    'gapDetectionCron',
    'sourceDiscoveryCron',
    'dailyReportCron',
    'defaultCron',
  ];

  for (const field of cronFields) {
    const value = config[field];
    if (typeof value !== 'string' || !cron.validate(value)) {
      throw new Error(`无效的 cron 表达式: ${String(field)}`);
    }
  }

  if (typeof config.enabled !== 'boolean') {
    throw new Error('enabled 必须是 boolean');
  }
  if (typeof config.enableAutoCollection !== 'boolean') {
    throw new Error('enableAutoCollection 必须是 boolean');
  }
}

function normalizeSchedulerConfig(config: Partial<SchedulerConfig>): SchedulerConfig {
  return {
    enabled: config.enabled ?? DEFAULT_SCHEDULER_CONFIG.enabled,
    healthCheckCron: config.healthCheckCron ?? DEFAULT_SCHEDULER_CONFIG.healthCheckCron,
    evolutionCron: config.evolutionCron ?? DEFAULT_SCHEDULER_CONFIG.evolutionCron,
    cleanupCron: config.cleanupCron ?? DEFAULT_SCHEDULER_CONFIG.cleanupCron,
    gapDetectionCron: config.gapDetectionCron ?? DEFAULT_SCHEDULER_CONFIG.gapDetectionCron,
    sourceDiscoveryCron: config.sourceDiscoveryCron ?? DEFAULT_SCHEDULER_CONFIG.sourceDiscoveryCron,
    dailyReportCron: config.dailyReportCron ?? DEFAULT_SCHEDULER_CONFIG.dailyReportCron,
    enableAutoCollection: config.enableAutoCollection ?? DEFAULT_SCHEDULER_CONFIG.enableAutoCollection,
    defaultCron: config.defaultCron ?? DEFAULT_SCHEDULER_CONFIG.defaultCron,
  };
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
