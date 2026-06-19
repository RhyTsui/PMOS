import type { DictionaryCandidate, IdentifierKey } from '@/contracts/request-understanding/entity-resolution';
import type {
  AgentRuntimeTask,
  AutomationTask,
  McpWorkflowBusinessOutcome,
  McpWorkflowRunStatus,
  McpWorkflowStatus,
  TaskArtifact,
} from '@/contracts/automation';
import type { CapabilityExpectation, ReportToolCapability } from './report-capability-manifest';

export interface DictionaryOutputAdapterConfig {
  candidate_array_paths?: string[];
  id_keys?: string[];
  label_keys?: string[];
  alias_keys?: string[];
  matched_id_keys?: string[];
}

export interface DictionaryToolOutputAdapterInput {
  raw: unknown;
  capability: ReportToolCapability;
  expectation: CapabilityExpectation;
  idKeys?: string[];
  nameKeys?: string[];
  toolName?: string;
}

export interface DictionaryToolOutputAdapterResult {
  candidates: DictionaryCandidate[];
  rows: Array<Record<string, unknown>>;
  row_count: number;
  raw_result_preview: unknown;
  warnings: string[];
  business_status?: 'success' | 'failed';
  business_code?: string | number;
  business_error?: string;
}

export interface McpBusinessErrorNormalization {
  business_status: 'failed';
  business_code?: string | number;
  business_error: string;
  error_code: 'app_scope_not_supported' | 'capability_not_available' | 'permission_or_scope' | 'missing_required_input' | 'business_failed_invalid_argument' | 'invalid_params' | 'business_execution_failed';
  error_message: string;
  business_outcome: 'capability_not_available' | 'execution_failed';
  tool_execution_status: 'business_failed';
  canRetryWithSameTool: boolean;
  suggestedAction: 'select_supported_tool_or_check_project_capability' | 'check_permission_or_scope' | 'complete_required_input' | 'fix_argument_mapping' | 'check_tool_business_error';
  raw_payload_preview: unknown;
  internalReason?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.map(item => item.trim()).filter(Boolean)));
}

function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (isRecord(value)) return value;
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function collectJsonObjects(payload: unknown): Array<Record<string, unknown>> {
  const output: Array<Record<string, unknown>> = [];
  const visit = (value: unknown) => {
    const parsed = parseJsonObject(value);
    if (parsed) {
      output.push(parsed);
      if (Array.isArray(parsed.content)) parsed.content.forEach(visit);
      if (typeof parsed.text === 'string') visit(parsed.text);
      for (const item of Object.values(parsed)) {
        if (isRecord(item) || Array.isArray(item)) visit(item);
      }
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
  };
  visit(payload);
  return output;
}

function collectTextSnippets(payload: unknown): string[] {
  const output: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      output.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isRecord(value)) return;
    if (typeof value.text === 'string') output.push(value.text);
    if (Array.isArray(value.content)) value.content.forEach(visit);
    if (isRecord(value.result)) visit(value.result);
    if (isRecord(value.error)) visit(value.error);
  };
  visit(payload);
  return output;
}

function codeIndicatesFailure(code: unknown): boolean {
  if (code === undefined || code === null || code === '') return false;
  if (typeof code === 'number') return code >= 400 || (code !== 0 && code !== 200);
  const normalized = String(code).trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === '0' || normalized === '200' || normalized === 'ok' || normalized === 'success') return false;
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return numeric >= 400 || (numeric !== 0 && numeric !== 200);
  return /error|failed|fail|unsupported|not[_ -]?support|not[_ -]?configured|permission|forbidden|missing/.test(normalized);
}

function readErrorMessage(object: Record<string, unknown>): string {
  const direct = object.msg ?? object.message ?? object.errorMessage;
  if (direct !== undefined && direct !== null && direct !== '') return String(direct);
  if (typeof object.error === 'string') return object.error;
  if (isRecord(object.error)) {
    const nested = object.error.message ?? object.error.msg ?? object.error.errorMessage ?? object.error.code;
    if (nested !== undefined && nested !== null && nested !== '') return String(nested);
  }
  return '';
}

function readBusinessCode(object: Record<string, unknown>): string | number | undefined {
  if ('code' in object) return object.code as string | number;
  if ('statusCode' in object) return object.statusCode as string | number;
  if ('result_status' in object) return object.result_status as string | number;
  if ('status_code' in object) return object.status_code as string | number;
  if ('returnCode' in object) return object.returnCode as string | number;
  if ('resultStatus' in object) return object.resultStatus as string | number;
  if ('errorCode' in object) return object.errorCode as string | number;
  if (isRecord(object.error) && 'code' in object.error) return object.error.code as string | number;
  return undefined;
}

function hasExplicitBusinessFailureStatus(object: Record<string, unknown>): boolean {
  if (object.success === false || object.ok === false) return true;
  const status = String(object.status || object.state || object.resultStatus || '').trim().toLowerCase();
  return /failed|failure|error|business_failed|not[_ -]?supported|unsupported|unavailable|blocked/.test(status)
    || String(object.result_status || '').trim().toLowerCase() === 'failed'
    || String(object.status_code || '').trim().toLowerCase() === 'failed';
}

function looksLikeBusinessStatusObject(object: Record<string, unknown>): boolean {
  if ('statusCode' in object || 'errorCode' in object) return true;
  if ('result_status' in object || 'resultStatus' in object || 'status_code' in object || 'returnCode' in object) return true;
  if (isRecord(object.error) && ('code' in object.error || 'message' in object.error)) return true;
  if ('success' in object || 'ok' in object || 'status' in object || 'state' in object || 'resultStatus' in object) return true;
  if (!('code' in object)) return false;
  if ('msg' in object || 'message' in object || 'errorMessage' in object || 'error' in object) return true;
  if ('data' in object || 'result' in object || 'rows' in object || 'items' in object || 'list' in object || 'records' in object) return true;
  return false;
}

function classifyBusinessError(message: string, code: unknown): Omit<McpBusinessErrorNormalization, 'business_status' | 'business_code' | 'business_error' | 'error_message' | 'raw_payload_preview'> {
  const normalizedCode = String(code || '').trim().toLowerCase();
  const numericCode = Number(normalizedCode);
  if (/timeout|timed out|request timeout|延时|超时|响应超时|gateway timeout/i.test(message)) {
    return {
      error_code: 'business_execution_failed',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: true,
      suggestedAction: 'check_tool_business_error',
      internalReason: `timeout_${normalizedCode || 'unknown'}`,
    };
  }
  if (normalizedCode === '429' || /too many requests|rate limit|qps|quota/i.test(message)) {
    return {
      error_code: 'business_execution_failed',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: true,
      suggestedAction: 'check_tool_business_error',
      internalReason: 'throttled_or_quota_limited',
    };
  }
  if (Number.isFinite(numericCode) && numericCode >= 500 && numericCode <= 599) {
    return {
      error_code: 'business_execution_failed',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: true,
      suggestedAction: 'check_tool_business_error',
      internalReason: `http_${normalizedCode}`,
    };
  }
  // Message-pattern checks that should take priority over generic HTTP code classification
  if (/(app[_ -]?id|project[_ -]?id|项目).*(not support|unsupported)|(?:not support|unsupported).*(app[_ -]?id|project[_ -]?id|项目)/i.test(message)) {
    return {
      error_code: 'app_scope_not_supported',
      business_outcome: 'capability_not_available',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'select_supported_tool_or_check_project_capability',
    };
  }
  if (/not support|unsupported|not configured|not enable|not available/i.test(message)) {
    return {
      error_code: 'capability_not_available',
      business_outcome: 'capability_not_available',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'select_supported_tool_or_check_project_capability',
    };
  }
  if (/missing required|required field|缺少|必填/i.test(message)) {
    return {
      error_code: 'missing_required_input',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: true,
      suggestedAction: 'complete_required_input',
    };
  }
  if (/no permission|permission denied|unauthor|forbidden|权限不足|授权失败|登录/i.test(message)) {
    return {
      error_code: 'permission_or_scope',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'check_permission_or_scope',
    };
  }
  if (Number.isFinite(numericCode) && numericCode >= 400 && numericCode <= 499) {
    if (numericCode === 401 || numericCode === 403 || /permission|unauthor|forbidden|未授权|权限|签名|signature|auth|authorization|401|403/.test(message)) {
      return {
        error_code: 'permission_or_scope',
        business_outcome: 'execution_failed',
        tool_execution_status: 'business_failed',
        canRetryWithSameTool: false,
        suggestedAction: 'check_permission_or_scope',
        internalReason: `http_${normalizedCode}`,
      };
    }
    if (numericCode === 400 || /argument[_ -]?type|argument_type|invalid enum|invalid[_ -]?argument|参数.*错误|参数映射|字段.*无效|参数.*不合法|media[_ -]?id/.test(message)) {
      return {
        error_code: /argument[_ -]?type|argument_type|invalid enum|字段.*无效|参数.*错误|参数映射|media[_ -]?id|promotionSource.*无效|promotionSource.*allowed/i.test(message)
          ? 'business_failed_invalid_argument'
          : 'invalid_params',
        business_outcome: 'execution_failed',
        tool_execution_status: 'business_failed',
        canRetryWithSameTool: false,
        suggestedAction: /promotionSource|参数映射|media[_ -]?id|argument[_ -]?type|invalid enum|字段.*无效/i.test(message)
          ? 'fix_argument_mapping'
          : 'check_tool_business_error',
        internalReason: /promotionSource/i.test(message)
          ? `invalid_promotionSource_${normalizedCode || 'enum'}`
          : /media[_ -]?id/i.test(message)
            ? `invalid_mediaId_${normalizedCode || 'enum'}`
            : `client_input_${normalizedCode}`,
      };
    }
  }
  if (/invalid_signature|签名.*(无效|失败)|signature[_ -]?invalid|signature[_ -]?verify|签名校验|授权签名/.test(message)) {
    return {
      error_code: 'permission_or_scope',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'check_permission_or_scope',
      internalReason: `invalid_signature:${normalizedCode || 'unknown'}`,
    };
  }
  if (/(app[_ -]?id|project[_ -]?id|项目).*(not support|unsupported)|(?:not support|unsupported).*(app[_ -]?id|project[_ -]?id|项目)/i.test(message)) {
    return {
      error_code: 'app_scope_not_supported',
      business_outcome: 'capability_not_available',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'select_supported_tool_or_check_project_capability',
    };
  }
  if (/not support|unsupported|not configured|not enable|not available/i.test(message)) {
    return {
      error_code: 'capability_not_available',
      business_outcome: 'capability_not_available',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'select_supported_tool_or_check_project_capability',
    };
  }
  if (/no permission|permission|unauthor|forbidden|401|403|权限|授权|登录/i.test(message)) {
    return {
      error_code: 'permission_or_scope',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'check_permission_or_scope',
    };
  }
  if (/missing required|required field|缺少|必填/i.test(message)) {
    return {
      error_code: 'missing_required_input',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: true,
      suggestedAction: 'complete_required_input',
    };
  }
  if (/invalid params|invalid[_ -]?argument|参数.*(错误|非法|无效)|因为参数.*(缺少|故从)|字段.*(错误|非法|无效)|allowed values?|允许的值|promotionSource/i.test(message)) {
    return {
      error_code: /promotionSource|字段|参数|argument/i.test(message) ? 'business_failed_invalid_argument' : 'invalid_params',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'fix_argument_mapping',
      internalReason: /promotionSource/i.test(message) && /\b\d+\b|media[_ -]?id/i.test(message)
        ? 'promotionSource was populated by media_id or invalid enum mapping'
        : 'invalid enum or argument mapping',
    };
  }
  return {
    error_code: 'business_execution_failed',
    business_outcome: 'execution_failed',
    tool_execution_status: 'business_failed',
    canRetryWithSameTool: !codeIndicatesFailure(code),
    suggestedAction: 'check_tool_business_error',
  };
}

function textSnippetIndicatesBusinessError(text: string): boolean {
  return /(?:\bcode\b|\bstatus(?:_?code)?\b|\berrorCode\b|\breturnCode\b|\bstatusCode\b|\bhttp\b)\s*[:=]\s*['\"]?(?:4\d\d|5\d\d|429|[1-9]\d{2})/i.test(text)
    || /\b(?:result[_ -]?status|resultStatus|status[_ -]?message|result[_ -]?code|status_code|statusCode)\s*[:=]\s*['\"]?[a-z0-9_ -]+/i.test(text)
    || /timeout|timed out|request timeout|连接超时|请求超时|响应超时|gateway timeout/i.test(text)
    || /invalid params|invalid[_ -]?argument|argument[_ -]?type|invalid enum|参数.*(错误|非法|无效)|字段.*(错误|非法|无效)|allowed values?|allowed|promotionSource|invalid_signature|signature[_ -]?invalid|signature[_ -]?verify/i.test(text)
    || (/promotionSource/i.test(text) && /invalid|allowed|enum|错误|非法|无效|允许|4\d\d|5\d\d|429/i.test(text));
}
export function normalizeMcpBusinessError(payload: unknown): McpBusinessErrorNormalization | undefined {
  const normalizedPayload = isRecord(payload) ? {
    ...payload,
  } : undefined;
  if (normalizedPayload?.policy_blocked === true || normalizedPayload?.security_blocked === true) {
    const reason = String(normalizedPayload.blocking_reason || normalizedPayload.error || normalizedPayload.error_code || normalizedPayload.message || '').trim();
    const message = readErrorMessage(normalizedPayload) || reason || 'Tool call blocked by policy/security guardrail';
    return {
      business_status: 'failed',
      business_code: normalizedPayload.security_blocked ? 403 : 403,
      business_error: message,
      error_message: message,
      raw_payload_preview: summarizeRawPreview(payload),
      error_code: 'permission_or_scope',
      business_outcome: 'execution_failed',
      tool_execution_status: 'business_failed',
      canRetryWithSameTool: false,
      suggestedAction: 'check_permission_or_scope',
      internalReason: normalizedPayload.security_blocked ? 'security_blocked' : 'policy_blocked',
    };
  }
  for (const object of collectJsonObjects(payload)) {
    if (!looksLikeBusinessStatusObject(object)) continue;
    const code = readBusinessCode(object);
    const message = readErrorMessage(object);
    const hasJsonRpcError = isRecord(object.error) && ('code' in object.error || 'message' in object.error);
    const hasExplicitFailureStatus = hasExplicitBusinessFailureStatus(object);
    const hasKeywordError = /not support|unsupported|not configured|no permission|missing required|required field/i.test(message);
    if (!codeIndicatesFailure(code) && !hasJsonRpcError && !hasExplicitFailureStatus && !hasKeywordError) continue;
    const errorMessage = message
      || (typeof object.status === 'string' ? object.status : '')
      || (typeof object.state === 'string' ? object.state : '')
      || (code === undefined ? 'Tool business error' : `Business code ${String(code)}`);
    return {
      business_status: 'failed',
      business_code: code,
      business_error: errorMessage,
      error_message: errorMessage,
      raw_payload_preview: summarizeRawPreview(payload),
      ...classifyBusinessError(errorMessage, code),
    };
  }
  const textError = collectTextSnippets(payload)
    .map(item => item.trim())
    .find(textSnippetIndicatesBusinessError);
  if (textError) {
    const code = /\b(4\d\d)\b/.exec(textError)?.[1] || 'business_error';
    return {
      business_status: 'failed',
      business_code: code,
      business_error: textError,
      error_message: textError,
      raw_payload_preview: summarizeRawPreview(payload),
      ...classifyBusinessError(textError, code),
    };
  }
  return undefined;
}

function readBusinessStatus(payload: unknown): Pick<DictionaryToolOutputAdapterResult, 'business_status' | 'business_code' | 'business_error'> {
  const businessError = normalizeMcpBusinessError(payload);
  if (businessError) {
    return {
      business_status: 'failed',
      business_code: businessError.business_code,
      business_error: businessError.business_error,
    };
  }
  for (const object of collectJsonObjects(payload)) {
    if (!looksLikeBusinessStatusObject(object)) continue;
    if (!('code' in object) && !('statusCode' in object) && !('errorCode' in object)) continue;
    const code = object.code ?? object.statusCode ?? object.errorCode;
    if (!codeIndicatesFailure(code)) return { business_status: 'success', business_code: code as string | number };
  }
  return {};
}

function firstValue(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || value === '') continue;
    return String(value);
  }
  return '';
}

function firstString(row: Record<string, unknown>, keys: string[], fallback = ''): string {
  const value = firstValue(row, keys);
  return value || fallback;
}

function normalizeRunStatus(value: unknown): McpWorkflowRunStatus {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'success' || status === 'succeeded' || status === 'completed' || status === 'done') return 'success';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  if (status === 'waiting_for_input' || status === 'waiting' || status === 'blocked') return 'waiting_for_input';
  if (status === 'approval_required' || status === 'pending_approval') return 'approval_required';
  if (status === 'running' || status === 'in_progress') return 'running';
  return 'pending';
}

function normalizeBusinessOutcome(value: unknown, status: McpWorkflowRunStatus): McpWorkflowBusinessOutcome {
  const outcome = String(value || '').trim().toLowerCase();
  if (outcome === 'need_clarification') return 'need_clarification';
  if (outcome === 'waiting_for_input') return 'waiting_for_input';
  if (outcome === 'approval_required') return 'approval_required';
  if (outcome === 'blocked') return 'blocked';
  if (outcome === 'failed' || status === 'failed') return 'failed';
  if (outcome === 'success' || status === 'success') return 'success';
  return status === 'running' ? 'in_progress' : 'in_progress';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map(item => item.trim()).filter(Boolean);
}

function normalizeArtifacts(value: unknown): TaskArtifact[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => ({
    artifactId: firstString(item, ['artifactId', 'artifact_id', 'id'], `artifact:${index}`),
    artifactType: firstString(item, ['artifactType', 'artifact_type', 'type'], 'operation_result') as TaskArtifact['artifactType'],
    title: firstString(item, ['title', 'name']) || undefined,
    summary: firstString(item, ['summary', 'description']) || undefined,
    uri: firstString(item, ['uri', 'url', 'href']) || undefined,
    metadata: item,
  }));
}

function findWorkflowObject(raw: unknown): Record<string, unknown> | undefined {
  return collectJsonObjects(raw).find(item => (
    'workflowRunId' in item
    || 'workflow_run_id' in item
    || 'workflowId' in item
    || 'workflowType' in item
    || 'workflow_type' in item
  ));
}

function findAutomationTaskObject(raw: unknown): Record<string, unknown> | undefined {
  return collectJsonObjects(raw).find(item => (
    'taskId' in item
    || 'task_id' in item
    || 'taskType' in item
    || 'task_type' in item
  ));
}

function normalizeRows(payload: unknown): Array<Record<string, unknown>> {
  if (typeof payload === 'string') {
    try {
      return normalizeRows(JSON.parse(payload));
    } catch {
      return [];
    }
  }
  if (Array.isArray(payload)) {
    const parsedContentRows = payload.flatMap((item) => {
      if (!isRecord(item) || typeof item.text !== 'string') return [];
      try {
        return normalizeRows(JSON.parse(item.text));
      } catch {
        return [];
      }
    });
    if (parsedContentRows.length) return parsedContentRows;
    const objectRows = payload.filter(isRecord);
    const looksLikeMcpContent = objectRows.length > 0 && objectRows.every((item) => 'type' in item && 'text' in item);
    return looksLikeMcpContent ? [] : objectRows;
  }
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.content)) {
    for (const item of payload.content) {
      if (!isRecord(item) || typeof item.text !== 'string') continue;
      try {
        const nested = normalizeRows(JSON.parse(item.text));
        if (nested.length) return nested;
      } catch {
        // Ignore non-JSON text chunks.
      }
    }
  }
  for (const key of ['tableContent', 'rows', 'records', 'list', 'items', 'data', 'result', 'candidates']) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = normalizeRows(value);
      if (nested.length) return nested;
    }
  }
  for (const value of Object.values(payload)) {
    if (isRecord(value) || Array.isArray(value)) {
      const nested = normalizeRows(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function readPath(root: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, root);
}

function collectMatchedIds(payload: unknown, config?: DictionaryOutputAdapterConfig): string[] {
  const keys = uniqueList([
    ...(config?.matched_id_keys || []),
    'matched_ids',
    'matchedIds',
    'candidate_ids',
    'candidateIds',
    'ids',
  ]);
  const ids: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
        ids.push(...value.map(String));
        return;
      }
      value.forEach(visit);
      return;
    }
    if (!isRecord(value)) return;
    for (const key of keys) {
      const item = value[key];
      if (Array.isArray(item) && item.every(entry => typeof entry === 'string' || typeof entry === 'number')) {
        ids.push(...item.map(String));
      }
    }
    if (Array.isArray(value.content)) {
      for (const item of value.content) {
        if (!isRecord(item) || typeof item.text !== 'string') continue;
        try {
          visit(JSON.parse(item.text));
        } catch {
          // Ignore non-JSON text chunks.
        }
      }
    }
  };
  visit(payload);
  return uniqueList(ids);
}

function summarizeRawPreview(payload: unknown): unknown {
  const rows = normalizeRows(payload);
  if (rows.length) return { row_count: rows.length, preview_rows: rows.slice(0, 3) };
  if (!isRecord(payload)) return payload;
  if (Array.isArray(payload.content)) {
    return {
      content: payload.content.slice(0, 1).map((item) => {
        if (!isRecord(item)) return item;
        const text = typeof item.text === 'string' ? item.text.slice(0, 1000) : item.text;
        return { ...item, text };
      }),
      isError: payload.isError,
    };
  }
  return Object.fromEntries(Object.entries(payload).slice(0, 20));
}

function identifierKeyAliases(identifierKey?: IdentifierKey): string[] {
  if (!identifierKey) return [];
  const camel = identifierKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return [identifierKey, camel];
}

export function adaptDictionaryToolOutput(input: DictionaryToolOutputAdapterInput): DictionaryToolOutputAdapterResult {
  const config = input.capability.output_adapter;
  const business = readBusinessStatus(input.raw);
  const pathRows = (config?.candidate_array_paths || [])
    .flatMap(path => normalizeRows(readPath(input.raw, path)));
  const rows = pathRows.length ? pathRows : normalizeRows(input.raw);
  const idKeys = uniqueList([
    ...(config?.id_keys || []),
    ...(input.idKeys || []),
    ...input.capability.identifier_keys.flatMap(identifierKeyAliases),
    'id',
    'value',
    'code',
  ]);
  const labelKeys = uniqueList([
    ...(config?.label_keys || []),
    ...(input.nameKeys || []),
    ...input.capability.label_keys,
    'name',
    'label',
    'text',
    'title',
  ]);
  const aliasKeys = uniqueList([...(config?.alias_keys || []), 'aliases', 'alias', 'aliasNames', 'keywords']);
  const rowCandidates: DictionaryCandidate[] = rows.flatMap((row, index) => {
    const id = firstValue(row, idKeys);
    if (!id) return [];
    const name = firstValue(row, labelKeys);
    const aliases = uniqueList(aliasKeys.flatMap((key) => {
      const value = row[key];
      if (Array.isArray(value)) return value.map(String);
      return value ? [String(value)] : [];
    }));
    const qualityFlags: DictionaryCandidate['qualityFlags'] = ['schema_inferred'];
    if (!name) qualityFlags.push('label_missing');
    if (!aliases.length) qualityFlags.push('alias_missing');
    if (!name && !aliases.length) qualityFlags.push('id_only');
    return [{
      id,
      name: name || undefined,
      aliases,
      confidence: name || aliases.length ? 0.84 : 0.45,
      source: input.toolName || input.capability.tool_name,
      sourceCapabilityId: input.capability.capability_id,
      rawRef: `row:${index}`,
      qualityFlags,
      metadata: { adapter: 'dictionary-output/v1' },
    } satisfies DictionaryCandidate];
  });
  const matchedIdCandidates: DictionaryCandidate[] = collectMatchedIds(input.raw, config).map((id, index) => ({
    id,
    confidence: 0.45,
    source: input.toolName || input.capability.tool_name,
    sourceCapabilityId: input.capability.capability_id,
    rawRef: `matched_ids:${index}`,
    qualityFlags: ['id_only', 'label_missing', 'alias_missing', 'server_side_match'] as DictionaryCandidate['qualityFlags'],
    metadata: { adapter: 'dictionary-output/v1' },
  }));
  const byId = new Map<string, DictionaryCandidate>();
  for (const candidate of [...rowCandidates, ...matchedIdCandidates]) {
    const existing = byId.get(candidate.id);
    if (!existing || (candidate.name && !existing.name)) byId.set(candidate.id, candidate);
  }
  const candidates = Array.from(byId.values());
  const warnings = candidates.some(candidate => candidate.qualityFlags?.includes('id_only'))
    ? ['dictionary_candidate_missing_label_or_alias']
    : [];
  if (business.business_status === 'failed') warnings.push('business_failed');
  return {
    candidates,
    rows,
    row_count: rows.length || matchedIdCandidates.length,
    raw_result_preview: summarizeRawPreview(input.raw),
    warnings,
    ...business,
  };
}

export function normalizeMcpWorkflowStatus(raw: unknown): McpWorkflowStatus | undefined {
  const object = findWorkflowObject(raw);
  if (!object) return undefined;
  const status = normalizeRunStatus(object.status);
  return {
    workflowRunId: firstString(object, ['workflowRunId', 'workflow_run_id', 'workflowId', 'runId'], 'workflow:unknown'),
    workflowType: firstString(object, ['workflowType', 'workflow_type', 'type'], 'mcp_workflow'),
    status,
    businessOutcome: normalizeBusinessOutcome(object.businessOutcome ?? object.business_outcome, status),
    progress: typeof object.progress === 'number' ? object.progress : undefined,
    steps: Array.isArray(object.steps)
      ? object.steps.filter(isRecord).map((step, index) => ({
        stepId: firstString(step, ['stepId', 'step_id', 'id'], `step:${index}`),
        title: firstString(step, ['title', 'name']) || undefined,
        status: normalizeRunStatus(step.status),
        startedAt: firstString(step, ['startedAt', 'started_at']) || undefined,
        endedAt: firstString(step, ['endedAt', 'ended_at']) || undefined,
        summary: firstString(step, ['summary', 'description']) || undefined,
        logs: normalizeStringArray(step.logs),
        metadata: step,
      }))
      : undefined,
    artifacts: normalizeArtifacts(object.artifacts),
    blockingRequirements: normalizeStringArray(object.blockingRequirements ?? object.blocking_requirements),
    evidenceRefs: normalizeStringArray(object.evidenceRefs ?? object.evidence_refs),
    sourceRefs: normalizeStringArray(object.sourceRefs ?? object.source_refs),
    metadata: object,
  };
}

export function normalizeAutomationTask(raw: unknown): AutomationTask | undefined {
  const object = findAutomationTaskObject(raw);
  if (!object) return undefined;
  return {
    taskId: firstString(object, ['taskId', 'task_id', 'id'], 'task:unknown'),
    taskType: firstString(object, ['taskType', 'task_type', 'type'], 'one_off_task') as AutomationTask['taskType'],
    trigger: firstString(object, ['trigger'], 'immediate') as AutomationTask['trigger'],
    status: normalizeRunStatus(object.status) as AutomationTask['status'],
    nextRunAt: firstString(object, ['nextRunAt', 'next_run_at']) || undefined,
    lastRunAt: firstString(object, ['lastRunAt', 'last_run_at']) || undefined,
    ownerUserId: firstString(object, ['ownerUserId', 'owner_user_id']) || undefined,
    workspaceId: firstString(object, ['workspaceId', 'workspace_id']) || undefined,
    projectId: firstString(object, ['projectId', 'project_id']) || undefined,
    artifacts: normalizeArtifacts(object.artifacts),
    metadata: object,
  };
}

export function normalizeAgentRuntimeTask(raw: unknown): AgentRuntimeTask | undefined {
  const task = normalizeAutomationTask(raw);
  const workflow = normalizeMcpWorkflowStatus(raw);
  if (!task && !workflow) return undefined;
  const fallbackStatus = workflow?.status || normalizeRunStatus(task?.status);
  return {
    taskId: task?.taskId || workflow?.workflowRunId || 'task:unknown',
    serviceIntent: firstString((task?.metadata || workflow?.metadata || {}) as Record<string, unknown>, ['serviceIntent', 'service_intent'], 'system_operation'),
    plan: normalizeStringArray((task?.metadata || workflow?.metadata || {})?.plan),
    toolCalls: [],
    collaborationState: workflow?.status === 'approval_required'
      ? 'approval_required'
      : workflow?.status === 'waiting_for_input'
        ? 'waiting_for_input'
        : 'none',
    taskState: task?.status || workflow?.status || 'pending',
    businessOutcome: workflow?.businessOutcome || normalizeBusinessOutcome(task?.status, fallbackStatus),
    metadata: { task, workflow },
  };
}


