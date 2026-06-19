import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createGeneratedAttachment } from './attachment-store';
import { buildAutomationDraftSuggestion } from './automation-draft-store';
import {
  appendAutomationExecutionStep,
  createAutomationExecution,
  finishAutomationExecution,
  updateAutomationExecution,
} from './automation-execution-store';
import { listMcpServers } from './mcp-server-store';
import { runtimeDataPath } from './runtime-data-path';
import { createAutomationNotification } from './notification-store';
import { executeReportQueryStep } from './report-query-orchestrator';
import type { ScheduledTask, ScheduledTaskExecution, ScheduledTaskStatus, ScheduledTaskType } from '@/types';

const STORE_PATH = runtimeDataPath('scheduled-tasks.json');
const FAILURE_CASES_PATH = runtimeDataPath('automation-failure-cases.json');

interface ScheduledTasksFile {
  tasks: ScheduledTask[];
}

interface AutomationFailureCasesFile {
  cases: Array<Record<string, unknown>>;
}

function now() {
  return Date.now();
}

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function ensureArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[\n,，、]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

async function readStore(): Promise<ScheduledTasksFile> {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ScheduledTasksFile>;
    return { tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [] };
  } catch {
    return { tasks: [] };
  }
}

async function writeStore(store: ScheduledTasksFile): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function normalizeExecution(input: Partial<ScheduledTaskExecution> & { task_id: string }): ScheduledTaskExecution {
  const startedAt = input.started_at ?? now();
  const finishedAt = input.finished_at ?? startedAt;
  return {
    id: input.id || `execution-${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
    task_id: input.task_id,
    status: input.status || 'queued',
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: input.duration_ms ?? Math.max(0, finishedAt - startedAt),
    result_summary: safeText(input.result_summary, '已完成'),
    artifact_name: input.artifact_name,
    artifact_url: input.artifact_url,
    artifact_attachment_id: input.artifact_attachment_id,
    alert_triggered: input.alert_triggered ?? false,
    alert_details: input.alert_details,
    error_message: input.error_message,
    failure_category: input.failure_category,
    retry_attempt: input.retry_attempt ?? 0,
    next_retry_at: input.next_retry_at,
    retry_reason: input.retry_reason,
    failure_case_id: input.failure_case_id,
    step_runs: input.step_runs,
  };
}

function normalizeTask(input: Partial<ScheduledTask>): ScheduledTask {
  const timestamp = now();
  const taskId = input.id || `scheduled-task-${timestamp}`;
  const status = (input.status || 'active') as ScheduledTaskStatus;
  const enabled = input.enabled ?? !['paused', 'disabled', 'failed'].includes(status);
  return {
    id: taskId,
    name: input.name?.trim() || '未命名任务',
    description: input.description?.trim() || '',
    task_type: (input.task_type || 'report_generate') as ScheduledTaskType,
    status,
    frequency: (input.frequency || 'daily') as ScheduledTask['frequency'],
    cron_expression: input.cron_expression?.trim() || undefined,
    next_run_at: input.next_run_at ?? timestamp + 24 * 60 * 60 * 1000,
    last_run_at: input.last_run_at,
    created_by: input.created_by?.trim() || '',
    project_binding: input.project_binding,
    account_ids: ensureArray(input.account_ids),
    app_names: ensureArray(input.app_names),
    monitor_metrics: ensureArray(input.monitor_metrics),
    alert_conditions: Array.isArray(input.alert_conditions) ? input.alert_conditions : [],
    alert_channels: Array.isArray(input.alert_channels) && input.alert_channels.length ? input.alert_channels : ['in_app'],
    alert_targets: ensureArray(input.alert_targets),
    notification_policy: input.notification_policy && typeof input.notification_policy === 'object' ? input.notification_policy : {
      on_success: true,
      on_failure: true,
      on_partial: true,
      target_scope: 'creator',
    },
    mcp_skill_id: input.mcp_skill_id,
    custom_params: input.custom_params && typeof input.custom_params === 'object' ? input.custom_params : {},
    recent_executions: Array.isArray(input.recent_executions)
      ? input.recent_executions.map((item) => normalizeExecution({ ...(item as Partial<ScheduledTaskExecution>), task_id: taskId }))
      : [],
    total_executions: input.total_executions ?? 0,
    success_count: input.success_count ?? 0,
    failure_count: input.failure_count ?? 0,
    enabled,
    created_at: input.created_at ?? timestamp,
    updated_at: timestamp,
  };
}

function cloneTask(task: ScheduledTask): ScheduledTask {
  return {
    ...task,
    account_ids: [...task.account_ids],
    app_names: [...task.app_names],
    monitor_metrics: [...task.monitor_metrics],
    alert_conditions: task.alert_conditions.map((item) => ({ ...item })),
    alert_channels: [...task.alert_channels],
    alert_targets: [...task.alert_targets],
    notification_policy: task.notification_policy ? { ...task.notification_policy } : undefined,
    custom_params: { ...task.custom_params },
    recent_executions: task.recent_executions.map((item) => ({ ...item })),
  };
}

function cloneStore(store: ScheduledTasksFile): ScheduledTasksFile {
  return { tasks: store.tasks.map(cloneTask) };
}

function isProjectBoundVisible(projectBinding: ScheduledTask['project_binding'], projectRefs: string[] = []) {
  const refs = projectRefs.map((item) => String(item).trim()).filter(Boolean);
  if (!projectBinding || projectBinding.project_refs.length === 0) return true;
  if (!refs.length) return true;
  return refs.some((ref) => projectBinding.project_refs.includes(ref));
}

function computeNextRunAt(task: ScheduledTask, baseTime = now()) {
  const day = 24 * 60 * 60 * 1000;
  if (task.frequency === 'hourly') return baseTime + 60 * 60 * 1000;
  if (task.frequency === 'every_30min') return baseTime + 30 * 60 * 1000;
  if (task.frequency === 'every_15min') return baseTime + 15 * 60 * 1000;
  if (task.frequency === 'every_5min') return baseTime + 5 * 60 * 1000;
  if (task.frequency === 'weekly') return baseTime + 7 * day;
  return baseTime + day;
}

function classifyAutomationFailure(message: string): ScheduledTaskExecution['failure_category'] {
  const text = message.toLowerCase();
  if (/permission|unauthorized|forbidden|权限|授权/.test(text)) return 'permission';
  if (/missing|required|缺少|字段|参数/.test(text)) return 'missing_input';
  if (/timeout|超时/.test(text)) return 'timeout';
  if (/not_configured|unavailable|未配置|不可用/.test(text)) return 'tool_unavailable';
  if (/data|query|查询|数据/.test(text)) return 'data_source';
  return 'unknown';
}

function getRetryDelayMs(category: ScheduledTaskExecution['failure_category'], attempt: number) {
  if (category === 'permission' || category === 'missing_input') return 0;
  const base = category === 'timeout' || category === 'tool_unavailable' ? 5 * 60 * 1000 : 10 * 60 * 1000;
  return Math.min(base * Math.max(1, attempt + 1), 60 * 60 * 1000);
}

async function createFailureCase(input: {
  scopeKey: string;
  task: ScheduledTask;
  executionId: string;
  category: ScheduledTaskExecution['failure_category'];
  message: string;
  steps: unknown[];
  retryAttempt: number;
}) {
  const caseId = `automation-failure-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let store: AutomationFailureCasesFile = { cases: [] };
  try {
    const raw = await readFile(FAILURE_CASES_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AutomationFailureCasesFile>;
    store = { cases: Array.isArray(parsed.cases) ? parsed.cases : [] };
  } catch {
    store = { cases: [] };
  }
  store.cases.unshift({
    id: caseId,
    scope_key: input.scopeKey,
    task_id: input.task.id,
    task_name: input.task.name,
    execution_id: input.executionId,
    category: input.category,
    message: input.message,
    retry_attempt: input.retryAttempt,
    steps: input.steps,
    created_at: now(),
  });
  await mkdir(path.dirname(FAILURE_CASES_PATH), { recursive: true });
  await writeFile(FAILURE_CASES_PATH, `${JSON.stringify({ cases: store.cases.slice(0, 200) }, null, 2)}\n`, 'utf8');
  return caseId;
}

function shouldNotify(task: ScheduledTask, status: ScheduledTaskExecution['status']) {
  const policy = task.notification_policy || {};
  if (status === 'failed') return policy.on_failure !== false;
  if (status === 'partial_succeeded') return policy.on_partial !== false;
  return policy.on_success !== false;
}

function isRunnableTask(task: ScheduledTask, currentTime = now()) {
  return task.enabled
    && task.status === 'active'
    && typeof task.next_run_at === 'number'
    && task.next_run_at <= currentTime;
}

function buildArtifactName(task: ScheduledTask, executionId: string) {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = task.name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 32) || 'report';
  return `${safeName}-${date}-${executionId.slice(-4)}.md`;
}

function buildExecutionContent(task: ScheduledTask, startedAt: number) {
  const metrics = task.monitor_metrics.length > 0 ? task.monitor_metrics.join('、') : '核心指标';
  const dimensions = normalizeTextList(task.custom_params?.dimension || task.custom_params?.dimensions || task.app_names);
  const appNames = task.app_names.length > 0 ? task.app_names.join('、') : '未指定';
  const accountIds = task.account_ids.length > 0 ? task.account_ids.join('、') : '未指定';
  const notes = safeText(task.custom_params?.notes) || safeText(task.description, '自动生成');

  return [
    `# ${task.name}`,
    '',
    `- 任务类型：${task.task_type}`,
    `- 执行时间：${new Date(startedAt).toLocaleString('zh-CN')}`,
    `- 关注指标：${metrics}`,
    `- 关注维度：${dimensions.length > 0 ? dimensions.join('、') : '默认维度'}`,
    `- 账户范围：${accountIds}`,
    `- 应用范围：${appNames}`,
    `- 说明：${notes}`,
    '',
    '## 结果摘要',
    `已按当前任务配置生成结果文件，文件已写入我的资产。`,
  ].join('\n');
}

function buildResultSummary(task: ScheduledTask, artifactName: string) {
  const metrics = task.monitor_metrics.length > 0 ? task.monitor_metrics.join('、') : '核心指标';
  return `已生成「${task.name}」结果文件 ${artifactName}，覆盖 ${metrics}。`;
}

function markdownTable(columns: string[], rows: Array<Record<string, unknown>>) {
  if (!columns.length || !rows.length) return '';
  const head = `| ${columns.join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.slice(0, 12).map((row) => `| ${columns.map((column) => String(row[column] ?? '')).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

function buildArtifactContent(params: {
  task: ScheduledTask;
  startedAt: number;
  prompt: string;
  draft: Awaited<ReturnType<typeof buildAutomationDraftSuggestion>>;
  queryResult?: Awaited<ReturnType<typeof executeReportQueryStep>>;
}) {
  const { task, startedAt, prompt, draft, queryResult } = params;
  const rows = queryResult?.report_query_result?.rows || [];
  const columns = queryResult?.report_query_result?.columns || [];
  const table = markdownTable(columns, rows);
  const missing = queryResult?.report_query_result?.quality_check?.missing_fields || [];
  const nextActions = queryResult?.report_query_result?.quality_check?.recommended_next_actions || [];
  const status = queryResult?.status || 'not_configured';

  return [
    `# ${task.name}`,
    '',
    `- 执行时间：${new Date(startedAt).toLocaleString('zh-CN')}`,
    `- 触发方式：${draft.trigger_type}`,
    `- 频率：${draft.frequency}`,
    `- 指标：${draft.monitor_metrics.join('、') || '未指定'}`,
    `- 维度：${draft.dimensions.join('、') || '未指定'}`,
    `- 当前状态：${status}`,
    '',
    '## 任务说明',
    task.description || prompt || '自动生成',
    '',
    '## 运行摘要',
    queryResult?.report_query_result?.message
      || queryResult?.message
      || draft.reason,
    '',
    '## 文件预览',
    table || '当前没有可展示的数据行。',
    '',
    '## 需要补充',
    missing.length ? missing.map((item) => `- ${item}`).join('\n') : '- 无',
    '',
    '## 下一步',
    nextActions.length ? nextActions.map((item) => `- ${item}`).join('\n') : '- 打开文件查看完整结果',
    '',
    '## 输入快照',
    prompt,
  ].join('\n');
}

export async function listScheduledTasks(filters: { task_type?: string; status?: string; project_refs?: string[] } = {}): Promise<ScheduledTask[]> {
  const store = await readStore();
  return store.tasks
    .filter((task) => (
      (!filters.task_type || task.task_type === filters.task_type)
      && (!filters.status || task.status === filters.status)
      && isProjectBoundVisible(task.project_binding, filters.project_refs)
    ))
    .map(cloneTask);
}

export async function getScheduledTask(id: string): Promise<ScheduledTask | undefined> {
  const store = await readStore();
  const task = store.tasks.find((item) => item.id === id);
  return task ? cloneTask(task) : undefined;
}

export async function createScheduledTask(input: Partial<ScheduledTask>): Promise<ScheduledTask> {
  const store = await readStore();
  const task = normalizeTask(input);
  await writeStore({ tasks: [task, ...store.tasks] });
  return cloneTask(task);
}

export async function updateScheduledTask(id: string, input: Partial<ScheduledTask>): Promise<ScheduledTask | undefined> {
  const store = await readStore();
  let updated: ScheduledTask | undefined;
  const tasks = store.tasks.map((task) => {
    if (task.id !== id) return task;
    updated = normalizeTask({ ...task, ...input, id, created_at: task.created_at, recent_executions: task.recent_executions });
    return updated;
  });
  if (!updated) return undefined;
  await writeStore({ tasks });
  return cloneTask(updated);
}

export async function deleteScheduledTask(id: string): Promise<boolean> {
  const store = await readStore();
  const tasks = store.tasks.filter((task) => task.id !== id);
  if (tasks.length === store.tasks.length) return false;
  await writeStore({ tasks });
  return true;
}

export async function pauseScheduledTask(id: string): Promise<ScheduledTask | undefined> {
  return updateScheduledTask(id, { status: 'paused', enabled: false });
}

export async function resumeScheduledTask(id: string): Promise<ScheduledTask | undefined> {
  return updateScheduledTask(id, {
    status: 'active',
    enabled: true,
    next_run_at: now() + 24 * 60 * 60 * 1000,
  });
}

export async function runScheduledTask(
  id: string,
  scopeKey: string,
): Promise<{ task: ScheduledTask; execution: ScheduledTaskExecution; artifact?: { id: string; url: string; name: string }; notificationId: string } | undefined> {
  const store = await readStore();
  const index = store.tasks.findIndex((item) => item.id === id);
  if (index < 0) return undefined;

  const current = store.tasks[index];
  if (current.created_by !== scopeKey) return undefined;
  const startedAt = now();
  const executionId = `automation-execution-${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
  const artifactName = buildArtifactName(current, executionId);
  const prompt = safeText(current.description, current.name);
  const draft = await buildAutomationDraftSuggestion({
    scopeKey,
    conversationId: current.custom_params?.conversation_id ? String(current.custom_params.conversation_id) : undefined,
    attachmentIds: ensureArray(current.custom_params?.source_attachment_ids),
    message: prompt,
  });

  await createAutomationExecution(scopeKey, {
    id: executionId,
    task_id: current.id,
    project_binding: current.project_binding,
    status: 'running',
    started_at: startedAt,
    input_snapshot: {
      task_name: current.name,
      task_type: current.task_type,
      frequency: current.frequency,
      monitor_metrics: current.monitor_metrics,
      account_ids: current.account_ids,
      app_names: current.app_names,
      source_attachment_ids: draft.source_attachment_ids,
      confirmation_state: draft.missing_fields.length > 0 ? 'pending' : 'not_required',
    },
    prompt_snapshot: prompt,
    result_summary: '正在生成结果',
    source_attachment_ids: draft.source_attachment_ids,
    confirmation_state: draft.missing_fields.length > 0 ? 'pending' : 'not_required',
    llm_summary: draft.reason,
    trace_snapshot: {
      llm_use_case: 'automation_summary',
      source_attachment_ids: draft.source_attachment_ids,
      missing_fields: draft.missing_fields,
    },
  });

  await appendAutomationExecutionStep(scopeKey, executionId, {
    id: `${executionId}-parse`,
    execution_id: executionId,
    task_id: current.id,
    key: 'parse',
    label: '整理任务要求',
    status: 'success',
    started_at: startedAt,
    finished_at: now(),
    input: { prompt },
    output: {
      trigger_type: draft.trigger_type,
      frequency: draft.frequency,
      monitor_metrics: draft.monitor_metrics,
      dimensions: draft.dimensions,
      source_attachment_ids: draft.source_attachment_ids,
      missing_fields: draft.missing_fields,
      confidence: draft.confidence,
    },
  });

  const reportStartedAt = now();
  const servers = await listMcpServers();
  const queryResult = await executeReportQueryStep({
    servers,
    message: prompt,
    baseInput: {
      account_ids: current.account_ids,
      app_names: current.app_names,
      metrics: current.monitor_metrics,
      dimensions: normalizeTextList(current.custom_params?.dimension || current.custom_params?.dimensions || current.app_names),
    },
  }).catch((error: unknown) => ({
    status: 'failed' as const,
    message: error instanceof Error ? error.message : '查询当前数据失败',
    tool_chain: [],
  }));

  await appendAutomationExecutionStep(scopeKey, executionId, {
    id: `${executionId}-query`,
    execution_id: executionId,
    task_id: current.id,
    key: 'query',
    label: '读取相关数据',
    status: queryResult.status === 'failed' ? 'failed' : queryResult.status === 'not_configured' ? 'skipped' : 'success',
    started_at: reportStartedAt,
    finished_at: now(),
    input: { message: prompt },
    output: {
      status: queryResult.status,
      message: queryResult.message,
      tool_chain: queryResult.tool_chain,
    },
    error_message: queryResult.status === 'failed' ? queryResult.message : undefined,
  });

  const failureMessage = queryResult.status === 'failed'
    ? queryResult.message
    : queryResult.status === 'not_configured'
      ? queryResult.message || '数据读取能力暂不可用'
      : '';
  const finalStatus: ScheduledTaskExecution['status'] = queryResult.status === 'failed'
    ? 'failed'
    : queryResult.status === 'not_configured'
      ? 'partial_succeeded'
      : 'success';
  const failureCategory = failureMessage ? classifyAutomationFailure(failureMessage) : undefined;
  const retryAttempt = Number(current.custom_params?.retry_attempt || 0);
  const retryDelayMs = failureCategory ? getRetryDelayMs(failureCategory, retryAttempt) : 0;
  const nextRetryAt = retryDelayMs > 0 ? now() + retryDelayMs : undefined;
  const retryReason = nextRetryAt ? `系统将在 ${Math.round(retryDelayMs / 60000)} 分钟后自动重试` : undefined;
  const failureCaseId = failureMessage ? await createFailureCase({
    scopeKey,
    task: current,
    executionId,
    category: failureCategory,
    message: failureMessage,
    steps: queryResult.tool_chain || [],
    retryAttempt,
  }) : undefined;

  const artifactContent = buildArtifactContent({
    task: current,
    startedAt,
    prompt,
    draft,
    queryResult,
  });
  const artifactAttachment = await createGeneratedAttachment(
    current.custom_params?.conversation_id ? String(current.custom_params.conversation_id) : `automation-${current.id}`,
    scopeKey,
    {
      fileName: artifactName,
      content: artifactContent,
      mimeType: 'text/markdown',
      sourceType: 'automation',
      summary: buildResultSummary(current, artifactName),
      assetState: 'committed',
      projectBinding: current.project_binding,
    },
  );

  await appendAutomationExecutionStep(scopeKey, executionId, {
    id: `${executionId}-artifact`,
    execution_id: executionId,
    task_id: current.id,
    key: 'artifact',
    label: '生成结果文件',
    status: 'success',
    started_at: now(),
    finished_at: now(),
    output: {
      artifact_attachment_id: artifactAttachment.id,
      artifact_name: artifactName,
      artifact_url: artifactAttachment.asset_url,
    },
  });

  const finishedAt = now();
  const execution: ScheduledTaskExecution = normalizeExecution({
    id: executionId,
    task_id: current.id,
    status: finalStatus,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: finishedAt - startedAt,
    result_summary: finalStatus === 'failed'
      ? `本次没有生成完整结果：${failureMessage}`
      : finalStatus === 'partial_succeeded'
        ? `本次生成了诊断文件，但部分数据暂不可用：${failureMessage}`
        : buildResultSummary(current, artifactName),
    artifact_name: artifactName,
    artifact_url: artifactAttachment.asset_url,
    artifact_attachment_id: artifactAttachment.id,
    alert_triggered: finalStatus !== 'success',
    alert_details: failureMessage || undefined,
    error_message: finalStatus === 'failed' ? failureMessage : undefined,
    failure_category: failureCategory,
    retry_attempt: retryAttempt,
    next_retry_at: nextRetryAt,
    retry_reason: retryReason,
    failure_case_id: failureCaseId,
    llm_summary: draft.reason,
    source_attachment_ids: draft.source_attachment_ids,
    confirmation_state: draft.missing_fields.length > 0 ? 'pending' : 'not_required',
    parse_snapshot: {
      draft,
      query_status: queryResult.status,
      tool_chain: queryResult.tool_chain,
    },
  });
  const executionRecord = await finishAutomationExecution(scopeKey, executionId, {
    status: finalStatus,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: finishedAt - startedAt,
    result_summary: execution.result_summary,
    artifact_attachment_ids: [artifactAttachment.id],
    artifact_names: [artifactName],
    artifact_urls: [artifactAttachment.asset_url || artifactAttachment.url || ''],
    error_message: execution.error_message,
    failure_category: failureCategory,
    retry_attempt: retryAttempt,
    next_retry_at: nextRetryAt,
    retry_reason: retryReason,
    failure_case_id: failureCaseId,
    llm_summary: draft.reason,
    source_attachment_ids: draft.source_attachment_ids,
    confirmation_state: draft.missing_fields.length > 0 ? 'pending' : 'not_required',
    trace_snapshot: {
      draft,
      query_status: queryResult.status,
      tool_chain: queryResult.tool_chain,
      artifact_attachment_id: artifactAttachment.id,
    },
  });
  const executionWithSteps: ScheduledTaskExecution = {
    ...execution,
    step_runs: executionRecord?.step_runs,
  };

  const nextTask: ScheduledTask = cloneTask({
    ...current,
    last_run_at: finishedAt,
    next_run_at: nextRetryAt || computeNextRunAt(current, finishedAt),
    total_executions: current.total_executions + 1,
    success_count: current.success_count + (finalStatus === 'success' ? 1 : 0),
    failure_count: current.failure_count + (finalStatus === 'failed' ? 1 : 0),
    recent_executions: [executionWithSteps, ...current.recent_executions].slice(0, 10),
    custom_params: {
      ...current.custom_params,
      retry_attempt: finalStatus === 'success' ? 0 : retryAttempt + 1,
      last_failure_case_id: failureCaseId,
    },
    project_binding: current.project_binding,
    updated_at: finishedAt,
  });

  store.tasks[index] = nextTask;
  await writeStore(store);

  const notification = await createAutomationNotification(scopeKey, {
    task_id: current.id,
    execution_id: execution.id,
    type: finalStatus === 'failed' ? 'task_run_failed' : finalStatus === 'partial_succeeded' ? 'task_run_partial' : 'artifact_ready',
    title: `已生成 ${current.name}`,
    summary: execution.result_summary,
    action_label: '查看文件',
    action_url: artifactAttachment.asset_url,
    artifact_attachment_id: artifactAttachment.id,
    artifact_url: artifactAttachment.asset_url,
    severity: finalStatus === 'failed' ? 'critical' : finalStatus === 'partial_succeeded' ? 'warning' : 'info',
    channels: current.alert_channels,
    targets: current.alert_targets,
  });

  return {
    task: nextTask,
    execution: executionWithSteps,
    artifact: {
      id: artifactAttachment.id,
      url: artifactAttachment.asset_url || artifactAttachment.url || '',
      name: artifactName,
    },
    notificationId: notification.id,
  };
}

export async function runDueScheduledTasks(options: {
  currentTime?: number;
  limit?: number;
} = {}): Promise<Array<NonNullable<Awaited<ReturnType<typeof runScheduledTask>>>>> {
  const currentTime = options.currentTime ?? now();
  const limit = Math.max(1, options.limit ?? 5);
  const store = await readStore();
  const dueTasks = store.tasks
    .filter((task) => isRunnableTask(task, currentTime))
    .sort((a, b) => (a.next_run_at || 0) - (b.next_run_at || 0))
    .slice(0, limit)
    .map((task) => ({ id: task.id, scopeKey: task.created_by }));

  const results: Array<NonNullable<Awaited<ReturnType<typeof runScheduledTask>>>> = [];
  for (const task of dueTasks) {
    const result = await runScheduledTask(task.id, task.scopeKey).catch(() => undefined);
    if (result) results.push(result);
  }
  return results;
}
