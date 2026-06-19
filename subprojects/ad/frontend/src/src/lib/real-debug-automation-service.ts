const DEFAULT_BASE_URL = 'http://pre-xiaoqiao.hz.com/api/v1/xiaoqiao/debug-automation';

export class DebugAutomationServiceError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(typeof body === 'string' ? body : JSON.stringify(body));
    this.name = 'DebugAutomationServiceError';
    this.status = status;
    this.body = body;
  }
}

function serviceBaseUrl() {
  return (process.env.XIAOQIAO_DEBUG_AUTOMATION_SERVICE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function parseJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function requestDebugAutomationService<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${serviceBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok) {
    throw new DebugAutomationServiceError(response.status, body || response.statusText);
  }
  return body as T;
}

export async function ensureRealDebugAutomationMode() {
  return requestDebugAutomationService('/runtime-features', {
    method: 'PUT',
    body: JSON.stringify({ mock_mode: 'off', speed: 2 }),
  });
}

export async function getRuntimeFeatures() {
  return requestDebugAutomationService('/runtime-features');
}

export async function updateRuntimeFeatures(input: Record<string, unknown>) {
  return requestDebugAutomationService('/runtime-features', {
    method: 'PUT',
    body: JSON.stringify({
      ...input,
      mock_mode: input.mock_mode === 'windows_agent' ? 'windows_agent' : 'off',
      speed: input.speed || 2,
    }),
  });
}

export function buildRealDebugCreatePayload(input: Record<string, unknown>) {
  const taskId = readString(input, ['task_id', 'taskId', 'id']) || `debug-task-${Date.now()}`;
  const config = isRecord(input.config)
    ? input.config
    : {
        media: input.media,
        terminal: input.terminal || 'android',
        project: input.app_name || input.project,
        debug_type: input.debug_type,
        account: input.account,
        package_name: input.package_name,
        environment: input.environment || 'test',
        channel_config: {
          game_package: input.package_name,
        },
        mobile_env: {
          device_id: input.device || input.device_id,
        },
        poll_config: {
          event_names: Array.isArray(input.targets) ? input.targets : ['激活', '注册', '付费', '关键行为'],
        },
      };
  return { task_id: taskId, config };
}

export function normalizeDebugTask(input: unknown) {
  const record = isRecord(input) ? input : {};
  const taskId = readString(record, ['task_id', 'taskId', 'id']);
  const status = readString(record, ['status', 'state']) || 'UNKNOWN';
  const phase = readString(record, ['phase']);
  const statusLabel = readString(record, ['status_label', 'statusLabel']) || status;
  const errorMessage = readString(record, ['error_message', 'errorMessage']);
  const currentStep = readString(record, ['current_step', 'currentStep']);
  return {
    ...record,
    id: taskId,
    task_id: taskId,
    conversation_id: readString(record, ['conversation_id', 'conversationId']),
    media: readString(record, ['media']) || readString(record, ['channel']),
    debug_type: readString(record, ['debug_type', 'debugType']) || '自动联调',
    account: readString(record, ['account', 'account_id', 'accountId']),
    app_name: readString(record, ['app_name', 'appName', 'project']),
    package_name: readString(record, ['package_name', 'packageName']),
    device: readString(record, ['device', 'device_id', 'deviceId']),
    environment: readString(record, ['environment']) || 'test',
    status,
    status_label: statusLabel,
    current_stage: phase || statusLabel,
    current_step: currentStep,
    requires_manual_confirm: ['CREATED', 'WAITING_CONFIRM', 'MANUAL_TAKEOVER'].includes(status.toUpperCase()),
    current_blocker: errorMessage || undefined,
    error_message: errorMessage,
    created_at: readString(record, ['created_at', 'createdAt']),
    updated_at: readString(record, ['updated_at', 'updatedAt']),
    closed_at: readString(record, ['closed_at', 'closedAt']) || undefined,
  };
}

function parseStepProgress(record: Record<string, unknown>) {
  const logText = readString(record, ['logText', 'log_text', 'log']);
  if (!logText) return {};
  const parsed = parseJson(logText);
  return isRecord(parsed) && isRecord(parsed.progress) ? parsed.progress : {};
}

export function normalizeDebugStep(input: unknown, index: number, taskId: string) {
  const record = isRecord(input) ? input : {};
  const progress = parseStepProgress(record);
  const status = readString(record, ['status']) || readString(progress, ['status']) || 'pending';
  const stepName = readString(progress, ['step_description', 'step_name'])
    || readString(record, ['step_name', 'stepName', 'name', 'title'])
    || `步骤 ${index + 1}`;
  return {
    ...record,
    id: readString(record, ['id', 'step_id', 'stepId']) || `${taskId}-step-${index + 1}`,
    task_id: taskId,
    stage: readString(record, ['stage', 'phase']) || readString(progress, ['phase']),
    step_name: stepName,
    step_order: Number(readString(record, ['step_order', 'stepOrder', 'stepIndex', 'step_index']) || index + 1),
    status: status.toLowerCase(),
    screenshot_url: readString(record, ['screenshot_url', 'screenshotUrl']),
    log_summary: readString(record, ['log_summary', 'logSummary', 'error_message', 'errorMessage']) || readString(record, ['logText', 'log_text']),
    started_at: readString(record, ['started_at', 'startedAt', 'created_at', 'createdAt']),
    completed_at: readString(record, ['completed_at', 'completedAt']),
  };
}

export function normalizeDebugResult(input: unknown, taskId: string, task?: unknown) {
  const record = isRecord(input) ? input : {};
  const taskRecord = isRecord(task) ? task : {};
  const status = readString(record, ['status']) || readString(taskRecord, ['status']);
  const errorMessage = readString(record, ['error_message', 'errorMessage'])
    || readString(taskRecord, ['error_message', 'errorMessage']);
  const failedStep = readString(taskRecord, ['current_step', 'currentStep']);
  const success = /^(SUCCESS|SUCCEEDED|COMPLETED|DONE)$/i.test(status);
  return {
    ...record,
    task_id: taskId,
    success,
    success_criteria: '完成联调任务并产生可追踪结果',
    failure_code: !success && status ? status : undefined,
    failure_reason: errorMessage || undefined,
    evidence_json: JSON.stringify({ task: taskRecord, result: record }),
    execution_log_summary: errorMessage || (status ? `当前状态：${status}` : ''),
    key_screenshots: [],
    final_report_url: readString(record, ['final_report_url', 'finalReportUrl']) || undefined,
    final_report_markdown: readString(record, ['final_report_markdown', 'finalReportMarkdown']) || undefined,
    manual_takeover_flag: /^MANUAL_TAKEOVER$/i.test(status),
    failed_step: errorMessage ? failedStep || undefined : undefined,
  };
}

