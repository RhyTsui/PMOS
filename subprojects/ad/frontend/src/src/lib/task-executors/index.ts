/**
 * Task Executors
 *
 * 4 类标准任务模板的 mock-safe 执行器。
 * 不接真实 GI API，不接真实聚合函数，不编造真实业务数据。
 * 仅用于打通生命周期和 UI 验收。
 *
 * 真实执行器待 GI API / 聚合函数接入后替换。
 */

export { executeJoinTableTask } from './join-table-executor';
export { executeAggregateTableTask } from './aggregate-table-executor';
export { executeDailyDigestTask } from './daily-digest-executor';
export { executeMetricMonitorTask } from './metric-monitor-executor';
export { executeTemplateTask, type TemplateTaskInput, type TemplateTaskOutput } from './executor-registry';
