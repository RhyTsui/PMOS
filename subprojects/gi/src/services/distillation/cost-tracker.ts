/**
 * 蒸馏成本追踪器
 *
 * 追踪每次 LLM 调用的 token 消耗和成本。
 * 支持：
 * - 按供应商统计
 * - 按任务类型统计
 * - 每日预算上限
 */

export interface CostRecord {
  providerId: string;
  providerName: string;
  model: string;
  taskType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  timestamp: string;
}

export interface DailyCostSummary {
  date: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  byProvider: Record<string, {
    calls: number;
    tokens: number;
    costUsd: number;
  }>;
  byTaskType: Record<string, {
    calls: number;
    tokens: number;
    costUsd: number;
  }>;
}

export class CostTracker {
  private records: CostRecord[] = [];
  private dailyBudgetUsd: number = 10; // 默认每日 $10

  constructor(dailyBudgetUsd?: number) {
    if (dailyBudgetUsd !== undefined) {
      this.dailyBudgetUsd = dailyBudgetUsd;
    }
  }

  /**
   * 记录一次调用
   */
  record(
    providerId: string,
    providerName: string,
    model: string,
    taskType: string,
    promptTokens: number,
    completionTokens: number,
    costPer1mInput: number = 0,
    costPer1mOutput: number = 0,
  ): CostRecord {
    const costUsd = this.calculateCost(
      promptTokens,
      completionTokens,
      costPer1mInput,
      costPer1mOutput,
    );

    const record: CostRecord = {
      providerId,
      providerName,
      model,
      taskType,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costUsd,
      timestamp: new Date().toISOString(),
    };

    this.records.push(record);
    return record;
  }

  /**
   * 计算成本
   */
  private calculateCost(
    promptTokens: number,
    completionTokens: number,
    costPer1mInput: number,
    costPer1mOutput: number,
  ): number {
    const inputCost = (promptTokens / 1_000_000) * costPer1mInput;
    const outputCost = (completionTokens / 1_000_000) * costPer1mOutput;
    return inputCost + outputCost;
  }

  /**
   * 获取今日成本汇总
   */
  getTodaySummary(): DailyCostSummary {
    const today = new Date().toISOString().split('T')[0];
    return this.getSummaryForDate(today);
  }

  /**
   * 获取指定日期的成本汇总
   */
  getSummaryForDate(date: string): DailyCostSummary {
    const dayRecords = this.records.filter((r) => r.timestamp.startsWith(date));

    const summary: DailyCostSummary = {
      date,
      totalCalls: dayRecords.length,
      totalTokens: dayRecords.reduce((sum, r) => sum + r.totalTokens, 0),
      totalCostUsd: dayRecords.reduce((sum, r) => sum + r.costUsd, 0),
      byProvider: {},
      byTaskType: {},
    };

    // 按供应商统计
    for (const record of dayRecords) {
      if (!summary.byProvider[record.providerId]) {
        summary.byProvider[record.providerId] = { calls: 0, tokens: 0, costUsd: 0 };
      }
      const provider = summary.byProvider[record.providerId];
      provider.calls++;
      provider.tokens += record.totalTokens;
      provider.costUsd += record.costUsd;
    }

    // 按任务类型统计
    for (const record of dayRecords) {
      if (!summary.byTaskType[record.taskType]) {
        summary.byTaskType[record.taskType] = { calls: 0, tokens: 0, costUsd: 0 };
      }
      const taskType = summary.byTaskType[record.taskType];
      taskType.calls++;
      taskType.tokens += record.totalTokens;
      taskType.costUsd += record.costUsd;
    }

    return summary;
  }

  /**
   * 检查是否超过每日预算
   */
  isOverBudget(): boolean {
    const today = this.getTodaySummary();
    return today.totalCostUsd >= this.dailyBudgetUsd;
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudgetUsd(): number {
    const today = this.getTodaySummary();
    return Math.max(0, this.dailyBudgetUsd - today.totalCostUsd);
  }

  /**
   * 设置每日预算
   */
  setDailyBudget(usd: number): void {
    this.dailyBudgetUsd = usd;
  }

  /**
   * 获取所有记录（用于持久化）
   */
  getAllRecords(): CostRecord[] {
    return [...this.records];
  }

  /**
   * 加载记录（从持久化恢复）
   */
  loadRecords(records: CostRecord[]): void {
    this.records = records;
  }

  /**
   * 清理旧记录（保留最近 N 天）
   */
  cleanupOldRecords(daysToKeep: number = 30): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    const cutoffStr = cutoff.toISOString();

    this.records = this.records.filter((r) => r.timestamp >= cutoffStr);
  }
}

// 全局单例
let costTrackerInstance: CostTracker | null = null;

export function getCostTracker(): CostTracker {
  if (!costTrackerInstance) {
    costTrackerInstance = new CostTracker();
  }
  return costTrackerInstance;
}
