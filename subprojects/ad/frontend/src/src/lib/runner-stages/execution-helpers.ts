import { cleanQuestion } from '@/lib/chat-runtime/project-context';
import { executeCallbackAttributionDiagnosisSkill } from '@/lib/skill-orchestration';
import { listMcpServers } from '@/lib/mcp-server-store';
import { executeReportQueryStep, type ReportQueryResult, type CapabilityUnderstanding } from '@/lib/report-query-orchestrator';
import { createDemandPoolItem } from '@/lib/demand-pool-store';
import type { WorkflowStepRecord } from '@/lib/workflow-task-store';

function buildBlockedReportAnswer(reportStep: Awaited<ReturnType<typeof executeReportQueryStep>>): string {
  const lines = [
    '## 结果',
    reportStep.message,
  ];
  const preflight = reportStep.preflight;
  if (preflight?.missing_capabilities.length) {
    lines.push('', '## 缺少的能力：');
    preflight.missing_capabilities.forEach(item => lines.push(`- ${item}`));
  }
  if (preflight?.missing_context_fields.length || reportStep.missing_fields?.length) {
    const fields = Array.from(new Set([...(preflight?.missing_context_fields || []), ...(reportStep.missing_fields || [])]));
    lines.push('', '## 还需要补充：');
    fields.forEach(item => lines.push(`- ${item}`));
  }
  return lines.join('\n');
}

function shouldCreateReportFailureCase(reportStep: Awaited<ReturnType<typeof executeReportQueryStep>>): boolean {
  if (reportStep.status === 'not_configured' || reportStep.status === 'failed' || reportStep.status === 'blocked' || reportStep.status === 'business_failed') return true;
  if (reportStep.preflight?.missing_capabilities.length) return true;
  return Boolean((reportStep.call_result?.status === 'failed' || reportStep.call_result?.status === 'business_failed') && !reportStep.missing_fields?.length);
}

async function createReportFailureCase(params: {
  message: string;
  conversationId: string;
  taskId: string;
  reportStep: Awaited<ReturnType<typeof executeReportQueryStep>>;
}): Promise<string | undefined> {
  if (!shouldCreateReportFailureCase(params.reportStep)) return undefined;
  const step = params.reportStep;
  const selected = step.selection_trace;
  const caseItem = await createDemandPoolItem({
    title: `问数失败案例：${cleanQuestion(params.message).slice(0, 40) || '未命名问题：'}`,
    problem_statement: [
      `用户问题：${cleanQuestion(params.message)}`,
      `会话：${params.conversationId}`,
      `任务：${params.taskId}`,
      `状态：${step.status}`,
      `系统说明：${step.message}`,
      selected ? `候选能力：${selected.selected_server}.${selected.selected_tool}` : '',
      step.missing_fields?.length ? `缺失字段：${step.missing_fields.join('，')}` : '',
      step.preflight?.missing_capabilities.length ? `缺失能力：${step.preflight.missing_capabilities.join('，')}` : '',
      step.call_result?.error ? `工具错误：${step.call_result.error}` : '',
    ].filter(Boolean).join('\n'),
    target_users: ['优化师', '投放运营', 'Chat 运维'],
    core_scenarios: ['问数失败闭环', '报表 MCP 调用', '能力发现与补充'],
    acceptance_criteria: [
      '明确失败原因属于缺能力、缺权限、工具不可用、返回无法解析还是用户字段缺失。',
      '补齐后同一问题可重新执行并保留 Trace 证据。',
    ],
    scope_in: ['检查 MCP 能力配置', '核对字典/项目/权限上下文', '检查 ReportQueryPlan 与 tool_chain'],
    scope_out: ['不由模型编造报表数据', '不绕过项目权限直接查询'],
    dependencies: [],
    deliverables: ['失败 Case 处理记录', '修复后的问数回归结果'],
    phase: 'phase1',
    priority: step.status === 'not_configured' || step.preflight?.missing_capabilities.length ? 'P0' : 'P1',
    business_flow: 'diagnosis',
    automation_boundary: 'human-machine',
    status: 'reviewing',
    proposer: 'xiaoqiao-chat',
    owner: 'xiaoqiao-ops',
  });
  return caseItem.id;
}

function workflowStepsFromDiagnosisTrace(trace: Awaited<ReturnType<typeof executeCallbackAttributionDiagnosisSkill>>['workflowTrace']): WorkflowStepRecord[] {
  return trace.map(item => ({
    key: item.key,
    label: item.label,
    status: item.status === 'error' ? 'failed' : item.status === 'skipped' ? 'skipped' : item.status === 'waiting' ? 'running' : 'success',
    message: item.summary,
    input: item.input,
    output: item.output,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }));
}

function buildDiagnosisAnswer(execution: Awaited<ReturnType<typeof executeCallbackAttributionDiagnosisSkill>>): string {
  const lines = [
    '## 结论',
    execution.summary,
    '',
    '## 当前分支',
    `- ${execution.branchStatus}`,
  ];
  if (execution.conclusion.length > 0) {
    lines.push('', '## 说明', ...execution.conclusion.map(item => `- ${item}`));
  }
  if (execution.warnings.length > 0) {
    lines.push('', '## 提醒', ...execution.warnings.map(item => `- ${item}`));
  }
  lines.push('', '## 下一步：', ...execution.nextActions.map(item => `- ${item.label}`));
  return lines.join('\n');
}

async function executeReportQueryStepWithTrace(args: {
  servers: Awaited<ReturnType<typeof listMcpServers>>;
  message: string;
  question: string;
  baseInput: Record<string, unknown>;
  userScopeKey?: string;
  llmUnderstandings?: CapabilityUnderstanding[];
  capabilityDecision?: {
    selected?: { capabilityId?: string; source?: { toolName?: string } };
    fallbackUsed?: boolean;
    fallbackReason?: string;
    warnings?: string[];
    candidates?: Array<{ capability?: { capabilityId?: string; source?: { toolName?: string } } }>;
    dataCoverage?: { covered?: boolean; missing?: string[]; reasons?: string[]; supportLevel?: string };
    presentationCoverage?: { covered?: boolean; missing?: string[]; reasons?: string[] };
  } | null;
  conversationId: string;
  taskId: string;
  runId: string;
  routeReason?: string;
  traceId: string;
  executionContract?: {
    request_id?: string;
    requires_execution: boolean;
    execution_confidence: 'high' | 'medium' | 'low';
    route_intent?: string;
    route_reason?: string;
    expected_capability_id?: string;
    expected_tool_name?: string;
  };
}): Promise<Awaited<ReturnType<typeof executeReportQueryStep>>> {
  return executeReportQueryStep({
    servers: args.servers,
    message: args.message,
    baseInput: args.baseInput,
    userScopeKey: args.userScopeKey,
    capabilityDecision: args.capabilityDecision,
    executionContract: args.executionContract,
    llmUnderstandings: args.llmUnderstandings,
  });
}

export {
  buildBlockedReportAnswer,
  shouldCreateReportFailureCase,
  createReportFailureCase,
  workflowStepsFromDiagnosisTrace,
  buildDiagnosisAnswer,
  executeReportQueryStepWithTrace,
};
