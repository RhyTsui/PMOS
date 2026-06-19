'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Layers3,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Workflow,
} from 'lucide-react';
import { xiaoqiaoApi } from '@/lib/api';
import type { EvidenceItem, McpServerConfig, McpSkill, PromptConfig, SkillContract, Task, WorkflowResult } from '@/types';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type WorkflowStepDraft = {
  key: string;
  label: string;
  tool_bindings_text: string;
  ui_component: string;
};

type WorkflowDraft = {
  skill_id: string;
  name: string;
  description: string;
  category: SkillContract['category'];
  priority: NonNullable<SkillContract['priority']>;
  enabled: boolean;
  version: string;
  intent_triggers_text: string;
  input_schema_text: string;
  clarification_schema_text: string;
  workflow_steps: WorkflowStepDraft[];
  output_schema_text: string;
  evaluation_cases_text: string;
  risk_guardrails_text: string;
};

type TaskRunRecord = {
  run_id: string;
  task_id: string;
  conversation_id?: string;
  intent_type: string;
  workflow_level: 'light' | 'heavy';
  state: string;
  status: 'created' | 'running' | 'blocked' | 'completed' | 'failed';
  route_reason?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  steps: Array<{
    key: string;
    label: string;
    status?: 'planned' | 'running' | 'success' | 'failed' | 'blocked' | 'skipped';
    message?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    started_at?: string;
    completed_at?: string;
  }>;
  trace_id?: string;
  evidence_ids?: string[];
  result_id?: string;
  metadata?: Record<string, unknown>;
};

type WorkflowTaskItem = Task & {
  route_reason?: string;
  workflow_state?: string;
  latest_result_id?: string;
  latest_evidence_ids?: string[];
  workflow_run_count?: number;
  last_error?: string;
  workflow_runs?: unknown[];
};

type ReportQueryPolicy = {
  enabled: boolean;
  lookup_tool_step_key: string;
  lookup_tool_keywords: string[];
  trigger_terms: string[];
  exclude_terms: string[];
  require_chinese_project_name: boolean;
  skip_when_app_id_present: boolean;
  updated_at?: string;
};

const ADMIN_WORKFLOW_STORAGE_KEY = 'xiaoqiao-admin-workflow-id';
const ADMIN_WORKFLOW_TASK_STORAGE_KEY = 'xiaoqiao-admin-workflow-task-id';

const ROUTE_OVERVIEW = [
  {
    intent: 'help',
    agent: 'help',
    workflowLevel: 'light',
    description: '解释概念、口径和用法。',
  },
  {
    intent: 'demand',
    agent: 'demand',
    workflowLevel: 'heavy',
    description: '收集需求、梳理范围、形成可交付条目。',
  },
  {
    intent: 'diagnosis',
    agent: 'diagnosis',
    workflowLevel: 'heavy',
    description: '查清异常、对齐口径、给出证据和下一步。',
  },
  {
    intent: 'debugging',
    agent: 'debugging',
    workflowLevel: 'heavy',
    description: '联调排查、看步骤、看回传、看阻塞点。',
  },
  {
    intent: 'get_delivery_packages',
    agent: 'delivery',
    workflowLevel: 'heavy',
    description: '确认可交付包、补齐条件、输出阻塞项。',
  },
  {
    intent: 'monitor',
    agent: 'monitoring',
    workflowLevel: 'heavy',
    description: '巡检投放和数据链路，先发现异常。',
  },
  {
    intent: 'report_query',
    agent: 'material',
    workflowLevel: 'light',
    description: '分析素材表现和素材差异。',
  },
  {
    intent: 'forecast',
    agent: 'prediction',
    workflowLevel: 'light',
    description: '做趋势判断和预估。',
  },
  {
    intent: 'general',
    agent: 'hub',
    workflowLevel: 'light',
    description: '兜底一般性问题和信息分发。',
  },
] as const;

function readClientStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeClientStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage failures
  }
}

function splitLines(value: string): string[] {
  return value
    .split(/[\n,，]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function joinLines(value: string[] | undefined): string {
  return Array.isArray(value) ? value.join('\n') : '';
}

function stringifyJson(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonText<T>(value: string): { ok: true; value: T } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: {} as T };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    };
  }
}

function normalizeWorkflowStep(step: SkillContract['workflow_steps'][number]): WorkflowStepDraft {
  return {
    key: step.key,
    label: step.label,
    tool_bindings_text: joinLines(step.tool_bindings),
    ui_component: step.ui_component || '',
  };
}

function buildWorkflowDraft(contract: SkillContract): WorkflowDraft {
  return {
    skill_id: contract.skill_id,
    name: contract.name,
    description: contract.description || '',
    category: contract.category,
    priority: contract.priority || 'P1',
    enabled: Boolean(contract.enabled),
    version: contract.version || '',
    intent_triggers_text: joinLines(contract.intent_triggers),
    input_schema_text: stringifyJson(contract.input_schema),
    clarification_schema_text: contract.clarification_schema ? stringifyJson(contract.clarification_schema) : '',
    workflow_steps: (contract.workflow_steps || []).map(normalizeWorkflowStep),
    output_schema_text: stringifyJson(contract.output_schema),
    evaluation_cases_text: joinLines(contract.evaluation_cases),
    risk_guardrails_text: joinLines(contract.risk_guardrails || []),
  };
}

function workflowSummary(contract: SkillContract): string {
  const steps = contract.workflow_steps.length;
  const prompts = contract.intent_triggers.slice(0, 3).join('、');
  return `${steps} 个步骤 · ${prompts || '未配置触发词'}`;
}

function badgeClass(status?: string): string {
  switch (status) {
    case 'success':
    case 'completed':
    case 'active':
    case 'enabled':
      return 'bg-[rgba(21,127,84,0.1)] text-[#157f54]';
    case 'running':
    case 'blocked':
    case 'warning':
      return 'bg-[rgba(255,184,0,0.12)] text-[#b7791f]';
    case 'failed':
    case 'error':
      return 'bg-[rgba(220,38,38,0.12)] text-[#c2415c]';
    default:
      return 'bg-[rgba(107,124,147,0.12)] text-[#6b7c93]';
  }
}

export function WorkflowManagementTab() {
  const [contracts, setContracts] = useState<SkillContract[]>([]);
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [skills, setSkills] = useState<McpSkill[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [tasks, setTasks] = useState<WorkflowTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [reportPolicy, setReportPolicy] = useState<ReportQueryPolicy | null>(null);
  const [reportPolicySaving, setReportPolicySaving] = useState(false);

  const [selectedContractIdRaw, setSelectedContractIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_WORKFLOW_STORAGE_KEY));
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkflowDraft | null>(null);

  const [selectedTaskIdRaw, setSelectedTaskIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_WORKFLOW_TASK_STORAGE_KEY));
  const [selectedTask, setSelectedTask] = useState<WorkflowTaskItem | null>(null);
  const [selectedTaskRuns, setSelectedTaskRuns] = useState<TaskRunRecord[]>([]);
  const [selectedTaskResults, setSelectedTaskResults] = useState<WorkflowResult[]>([]);
  const [selectedTaskEvidence, setSelectedTaskEvidence] = useState<EvidenceItem[]>([]);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setMessage('');
    try {
      setLoadError(null);
      const [contractData, promptData, skillData, serverData, taskData, policyData] = await Promise.all([
        xiaoqiaoApi.getSkillContracts(),
        xiaoqiaoApi.getPrompts(),
        xiaoqiaoApi.getSkills(),
        xiaoqiaoApi.getMcpServers(),
        xiaoqiaoApi.getTasks({}),
        fetch('/api/xiaoqiao/admin/report-query-policy', { cache: 'no-store' }).then(res => res.ok ? res.json() : null),
      ]);
      setContracts(Array.isArray(contractData) ? contractData : []);
      setPrompts(Array.isArray(promptData) ? promptData : []);
      setSkills(Array.isArray(skillData) ? skillData : []);
      setMcpServers(Array.isArray(serverData) ? serverData : []);
      setTasks(Array.isArray(taskData) ? taskData as WorkflowTaskItem[] : []);
      setReportPolicy(policyData);
    } catch {
      setLoadError('工作流配置读取失败，请稍后重试。');
      setContracts([]);
      setPrompts([]);
      setSkills([]);
      setMcpServers([]);
      setTasks([]);
      setReportPolicy(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedContract = useMemo(() => {
    if (!contracts.length) return null;
    return contracts.find(contract => contract.skill_id === selectedContractIdRaw) || contracts[0] || null;
  }, [contracts, selectedContractIdRaw]);

  useEffect(() => {
    if (!selectedContract) return;
    const nextSelected = contracts.some(contract => contract.skill_id === selectedContract.skill_id)
      ? selectedContract.skill_id
      : contracts[0]?.skill_id || null;
    setSelectedContractIdRaw(nextSelected);
    writeClientStorage(ADMIN_WORKFLOW_STORAGE_KEY, nextSelected);
    setEditingContractId(null);
    setDraft(buildWorkflowDraft(selectedContract));
  }, [contracts, selectedContract]);

  const selectedTaskRecord = useMemo(() => {
    if (!tasks.length) return null;
    return tasks.find(task => task.id === selectedTaskIdRaw || task.task_id === selectedTaskIdRaw) || tasks[0] || null;
  }, [selectedTaskIdRaw, tasks]);

  useEffect(() => {
    if (!selectedTaskRecord) return;
    const nextSelected = selectedTaskRecord.id || selectedTaskRecord.task_id;
    setSelectedTaskIdRaw(nextSelected);
    writeClientStorage(ADMIN_WORKFLOW_TASK_STORAGE_KEY, nextSelected);
  }, [selectedTaskRecord]);

  useEffect(() => {
    if (!selectedTaskRecord) {
      setSelectedTask(null);
      setSelectedTaskRuns([]);
      setSelectedTaskResults([]);
      setSelectedTaskEvidence([]);
      return;
    }

    let cancelled = false;
    const loadTaskDetail = async () => {
      setTaskDetailLoading(true);
      try {
        const taskId = selectedTaskRecord.id || selectedTaskRecord.task_id;
        const [task, runs, results, evidence] = await Promise.all([
          xiaoqiaoApi.getTask(taskId),
          xiaoqiaoApi.getTaskRuns(taskId),
          xiaoqiaoApi.getTaskResults(taskId),
          xiaoqiaoApi.getTaskEvidence(taskId),
        ]);
        if (cancelled) return;
        setSelectedTask(task);
        setSelectedTaskRuns(Array.isArray(runs) ? (runs as TaskRunRecord[]) : []);
        setSelectedTaskResults(Array.isArray(results) ? results : []);
        setSelectedTaskEvidence(Array.isArray(evidence) ? evidence : []);
      } catch {
        if (cancelled) return;
        setSelectedTask(null);
        setSelectedTaskRuns([]);
        setSelectedTaskResults([]);
        setSelectedTaskEvidence([]);
      } finally {
        if (!cancelled) setTaskDetailLoading(false);
      }
    };
    void loadTaskDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedTaskRecord]);

  const filteredContracts = useMemo(() => {
    return [...contracts].sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      const priorityDiff = (priorityOrder[a.priority || 'P1'] ?? 1) - (priorityOrder[b.priority || 'P1'] ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
  }, [contracts]);

  const relatedPrompts = useMemo(() => {
    if (!selectedContract) return [];
    return prompts.filter(prompt => (
      prompt.binding.workflow === selectedContract.category
      || prompt.binding.workflow === selectedContract.skill_id
      || prompt.applicable_workflows?.includes(selectedContract.category)
      || prompt.applicable_workflows?.includes(selectedContract.skill_id)
    ));
  }, [prompts, selectedContract]);

  const relatedSkills = useMemo(() => {
    if (!selectedContract) return [];
    return skills.filter(skill => skill.category === selectedContract.category);
  }, [selectedContract, skills]);

  const relatedMcpServers = useMemo(() => {
    if (!selectedContract) return [];
    const bindings = new Set(
      selectedContract.workflow_steps.flatMap(step => step.tool_bindings || []),
    );
    return mcpServers.filter(server => server.tools.some(tool => bindings.has(tool.tool_id) || bindings.has(tool.name)));
  }, [mcpServers, selectedContract]);

  const selectedTaskSummary = useMemo(() => {
    if (!selectedTask) return '';
    return [
      selectedTask.task_type,
      selectedTask.workflow_level === 'heavy' ? '重链路' : '轻链路',
      selectedTask.status,
    ].join(' · ');
  }, [selectedTask]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const patchReportPolicy = (patch: Partial<ReportQueryPolicy>) => {
    setReportPolicy(prev => prev ? { ...prev, ...patch } : prev);
  };

  const handleSaveReportPolicy = async () => {
    if (!reportPolicy) return;
    setReportPolicySaving(true);
    setSaveState('saving');
    try {
      const response = await fetch('/api/xiaoqiao/admin/report-query-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPolicy),
      });
      if (!response.ok) throw new Error('save failed');
      const next = await response.json();
      setReportPolicy(next);
      setSaveState('saved');
      setMessage('报表问数项目解析策略已保存');
    } catch {
      setSaveState('error');
      setMessage('报表问数项目解析策略保存失败');
    } finally {
      setReportPolicySaving(false);
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const handleSelectContract = (contract: SkillContract) => {
    setSelectedContractIdRaw(contract.skill_id);
    writeClientStorage(ADMIN_WORKFLOW_STORAGE_KEY, contract.skill_id);
    setEditingContractId(null);
    setDraft(buildWorkflowDraft(contract));
    setMessage('');
  };

  const handleAddStep = () => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workflow_steps: [
          ...prev.workflow_steps,
          { key: '', label: '', tool_bindings_text: '', ui_component: '' },
        ],
      };
    });
  };

  const handleRemoveStep = (index: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workflow_steps: prev.workflow_steps.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const handleSave = async (asClone = false) => {
    if (!draft) return;
    const inputSchema = parseJsonText<Record<string, unknown>>(draft.input_schema_text);
    if (!inputSchema.ok) {
      setSaveState('error');
      setMessage(`输入结构 JSON 解析失败：${inputSchema.error}`);
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    const clarificationSchema = parseJsonText<Record<string, unknown>>(draft.clarification_schema_text);
    if (draft.clarification_schema_text.trim() && !clarificationSchema.ok) {
      setSaveState('error');
      setMessage(`补充说明 JSON 解析失败：${clarificationSchema.error}`);
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    const outputSchema = parseJsonText<Record<string, unknown>>(draft.output_schema_text);
    if (!outputSchema.ok) {
      setSaveState('error');
      setMessage(`输出结构 JSON 解析失败：${outputSchema.error}`);
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }

    const payload: Partial<SkillContract> = {
      skill_id: asClone
        ? `${draft.skill_id || selectedContract?.skill_id || 'workflow'}-custom-${Date.now()}`
        : draft.skill_id,
      name: asClone ? `${draft.name || selectedContract?.name || '未命名工作流'}（副本）` : draft.name,
      description: draft.description,
      category: draft.category,
      priority: draft.priority,
      enabled: draft.enabled,
      version: draft.version,
      intent_triggers: splitLines(draft.intent_triggers_text),
      input_schema: inputSchema.value,
      clarification_schema: clarificationSchema.ok && draft.clarification_schema_text.trim() ? clarificationSchema.value : undefined,
      workflow_steps: draft.workflow_steps.map((step, index) => ({
        key: step.key.trim() || `step-${index + 1}`,
        label: step.label.trim() || `步骤 ${index + 1}`,
        tool_bindings: splitLines(step.tool_bindings_text),
        ui_component: step.ui_component.trim() || undefined,
      })),
      output_schema: outputSchema.value,
      evaluation_cases: splitLines(draft.evaluation_cases_text),
      risk_guardrails: splitLines(draft.risk_guardrails_text),
    };

    setMessage('');
    setSaveState('saving');
    try {
      const response = await fetch(asClone || !selectedContract ? '/api/xiaoqiao/skill-contracts' : `/api/xiaoqiao/skill-contracts/${selectedContract.skill_id}`, {
        method: asClone || !selectedContract ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const saved = await response.json().catch(() => ({})) as SkillContract | { error?: string };
      if (!response.ok || !('skill_id' in saved)) {
        throw new Error((saved as { error?: string }).error || '保存失败');
      }
      await loadData();
      const savedContract = saved as SkillContract;
      setSelectedContractIdRaw(savedContract.skill_id);
      writeClientStorage(ADMIN_WORKFLOW_STORAGE_KEY, savedContract.skill_id);
      setEditingContractId(null);
      setDraft(buildWorkflowDraft(savedContract));
      setSaveState('saved');
      setMessage(asClone ? '工作流已复制为新版本' : '工作流已保存');
    } catch {
      setSaveState('error');
      setMessage('工作流保存失败');
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="工作流管理"
        description={`维护能力触发、执行步骤、提示词绑定和最近处理记录。当前 ${contracts.length} 个工作流，${contracts.filter(item => item.enabled).length} 个已启用。`}
        saveState={saveState}
        actions={(
          <>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] hover:border-[#b8cae6]"
              >
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                刷新
              </button>
              <button
                type="button"
                onClick={() => setEditingContractId(selectedContract?.skill_id || null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] hover:border-[#b8cae6]"
              >
                <Layers3 className="h-3.5 w-3.5" />
                编辑当前工作流
              </button>
              <button
                type="button"
                onClick={() => void handleSave(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6fff] px-3 py-2 text-xs font-medium text-white hover:bg-[#0b5ad1]"
              >
                <Plus className="h-3.5 w-3.5" />
                复制为新工作流
              </button>
          </>
        )}
      />

      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={(
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-lg bg-[#0f6fff] px-3 py-1.5 text-xs font-medium text-white"
            >
              重新加载
            </button>
          )}
        />
      ) : null}

      <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f8fc]">
        <div className="mx-auto max-w-7xl px-5 py-5">
          {message && (
            <div className="mb-4 rounded-2xl border border-[#edf2f8] bg-[#f8fbff] px-4 py-3 text-sm text-[#355070]">
              {message}
            </div>
          )}

        {reportPolicy && (
          <section className="mt-5 rounded-[20px] border border-[#dbe4f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-medium text-[#355070]">报表问数项目解析策略</div>
                <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">
                  当前项目直接使用会话上下文；只有跨项目中文名解析时，才把项目列表工具加入链路。
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => patchReportPolicy({ enabled: !reportPolicy.enabled })}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${reportPolicy.enabled ? 'bg-[#eafaf1] text-[#157f54]' : 'bg-[#f1f5f9] text-[#6b7c93]'}`}
                >
                  {reportPolicy.enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {reportPolicy.enabled ? '已启用' : '已停用'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveReportPolicy()}
                  disabled={reportPolicySaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6fff] px-3 py-2 text-xs font-medium text-white hover:bg-[#0b5ad1] disabled:opacity-60"
                >
                  {reportPolicySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  保存策略
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-[11px] text-[#6b7c93]">项目解析工具关键字</label>
                <textarea
                  value={reportPolicy.lookup_tool_keywords.join('\n')}
                  onChange={(event) => patchReportPolicy({ lookup_tool_keywords: event.target.value.split(/[\n,，]/).map(item => item.trim()).filter(Boolean) })}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-[#dbe4f0] px-3 py-2 font-mono text-xs outline-none focus:border-[#0f6fff]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6b7c93]">触发跨项目解析的表达</label>
                <textarea
                  value={reportPolicy.trigger_terms.join('\n')}
                  onChange={(event) => patchReportPolicy({ trigger_terms: event.target.value.split(/[\n,，]/).map(item => item.trim()).filter(Boolean) })}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-[#dbe4f0] px-3 py-2 font-mono text-xs outline-none focus:border-[#0f6fff]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6b7c93]">不触发表达</label>
                <textarea
                  value={reportPolicy.exclude_terms.join('\n')}
                  onChange={(event) => patchReportPolicy({ exclude_terms: event.target.value.split(/[\n,，]/).map(item => item.trim()).filter(Boolean) })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#dbe4f0] px-3 py-2 font-mono text-xs outline-none focus:border-[#0f6fff]"
                />
              </div>
              <div className="space-y-3 rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-3">
                <label className="flex items-center gap-2 text-xs text-[#355070]">
                  <input
                    type="checkbox"
                    checked={reportPolicy.require_chinese_project_name}
                    onChange={(event) => patchReportPolicy({ require_chinese_project_name: event.target.checked })}
                  />
                  需要出现中文项目名才调用项目列表工具
                </label>
                <label className="flex items-center gap-2 text-xs text-[#355070]">
                  <input
                    type="checkbox"
                    checked={reportPolicy.skip_when_app_id_present}
                    onChange={(event) => patchReportPolicy({ skip_when_app_id_present: event.target.checked })}
                  />
                  已有项目编号时跳过项目列表工具
                </label>
                <div className="text-[11px] leading-5 text-[#8ea0b8]">
                  工具调用使用报表服务自身配置，不读取额外访问令牌。
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <aside className="min-h-0 rounded-[20px] border border-[#dbe4f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#355070]">能力入口</div>
                <div className="mt-1 text-[11px] text-[#8ea0b8]">当前能力的默认入口与处理方式</div>
              </div>
              <GitBranch className="h-4 w-4 text-[#0f6fff]" />
            </div>
            <div className="mt-3 space-y-2">
              {ROUTE_OVERVIEW.map(item => (
                <div key={item.intent} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-[#10233f]">{item.intent}</div>
                    <span className="rounded-full bg-[#eef5ff] px-2 py-0.5 text-[11px] text-[#0f6fff]">
                      {item.workflowLevel === 'heavy' ? '重链路' : '轻链路'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-5 text-[#6b7c93]">
                    {item.agent} · {item.description}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="min-h-0 rounded-[20px] border border-[#dbe4f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-medium text-[#355070]">工作流真源</div>
                <div className="mt-1 text-[11px] text-[#8ea0b8]">编辑完成后，新的处理流程会按这里的设置执行。</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[11px] text-[#0f6fff]">工作流 {contracts.length}</span>
                <span className="rounded-full bg-[#eafaf1] px-3 py-1 text-[11px] text-[#157f54]">已启用 {contracts.filter(item => item.enabled).length}</span>
                <span className="rounded-full bg-[#fff4db] px-3 py-1 text-[11px] text-[#b7791f]">提示词绑定 {relatedPrompts.length}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-3">
                <div className="mb-2 text-[11px] text-[#8ea0b8]">工作流列表</div>
                <div className="max-h-[740px] space-y-2 overflow-y-auto pr-1">
                  {loading ? (
                    <AdminCrudListSkeleton rows={5} />
                  ) : filteredContracts.map(contract => (
                    <button
                      key={contract.skill_id}
                      type="button"
                      onClick={() => handleSelectContract(contract)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                        selectedContract?.skill_id === contract.skill_id
                          ? 'border-[#9cc8ff] bg-[#f3f8ff]'
                          : 'border-[#edf2f8] bg-white hover:border-[#cfe0ff]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium text-[#10233f]">{contract.name}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass(contract.enabled ? 'active' : 'inactive')}`}>
                          {contract.enabled ? '已启用' : '已停用'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-[#6b7c93]">
                        {workflowSummary(contract)}
                      </div>
                    </button>
                  ))}
                  {!loading && filteredContracts.length === 0 && (
                    <AdminCrudEmptyState title="还没有工作流配置" description="复制或编辑能力后，可在这里维护执行步骤。" />
                  )}
                </div>
              </div>

              <div className="min-h-0 space-y-4">
                {selectedContract && draft ? (
                  <>
                    <section className="rounded-2xl border border-[#edf2f8] bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Workflow className="h-4 w-4 text-[#0f6fff]" />
                            <h3 className="truncate text-base font-semibold text-[#10233f]">{selectedContract.name}</h3>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#6b7c93]">{selectedContract.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[11px] text-[#0f6fff]">{selectedContract.category}</span>
                          <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-[11px] text-[#355070]">{selectedContract.priority}</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] ${badgeClass(selectedContract.enabled ? 'active' : 'inactive')}`}>
                            {selectedContract.enabled ? '已启用' : '已停用'}
                          </span>
                        </div>
                      </div>
                    </section>

                    {editingContractId === selectedContract.skill_id ? (
                      <section className="space-y-4 rounded-2xl border border-[#edf2f8] bg-white p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-medium text-[#355070]">编辑工作流</div>
                            <div className="mt-1 text-[11px] text-[#8ea0b8]">修改后会更新工作流合同、步骤和输出约束。</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleAddStep}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] hover:border-[#b8cae6]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              新增步骤
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSave(false)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6fff] px-3 py-2 text-xs font-medium text-white hover:bg-[#0b5ad1]"
                            >
                              <Save className="h-3.5 w-3.5" />
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingContractId(null);
                                setDraft(buildWorkflowDraft(selectedContract));
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] hover:border-[#b8cae6]"
                            >
                              取消
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">工作流 ID</span>
                            <input value={draft.skill_id} disabled className="h-10 rounded-lg border border-[#dbe4f0] bg-[#f8fbff] px-3 text-sm text-[#6b7c93]" />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">名称</span>
                            <input value={draft.name} onChange={(event) => setDraft(prev => prev ? { ...prev, name: event.target.value } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]" />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">分类</span>
                            <select value={draft.category} onChange={(event) => setDraft(prev => prev ? { ...prev, category: event.target.value as SkillContract['category'] } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]">
                              {(['help', 'diagnosis', 'debugging', 'report', 'monitor', 'integration', 'analysis'] as const).map(item => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">优先级</span>
                            <select value={draft.priority} onChange={(event) => setDraft(prev => prev ? { ...prev, priority: event.target.value as WorkflowDraft['priority'] } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]">
                              {(['P0', 'P1', 'P2', 'P3'] as const).map(item => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2 md:col-span-2">
                            <span className="text-xs font-semibold text-[#355070]">描述</span>
                            <textarea value={draft.description} onChange={(event) => setDraft(prev => prev ? { ...prev, description: event.target.value } : prev)} rows={2} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">版本</span>
                            <input value={draft.version} onChange={(event) => setDraft(prev => prev ? { ...prev, version: event.target.value } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]" />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">启用状态</span>
                            <select value={draft.enabled ? 'true' : 'false'} onChange={(event) => setDraft(prev => prev ? { ...prev, enabled: event.target.value === 'true' } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]">
                              <option value="true">已启用</option>
                              <option value="false">已停用</option>
                            </select>
                          </label>
                        </div>

                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-[#355070]">意图触发词</span>
                          <textarea value={draft.intent_triggers_text} onChange={(event) => setDraft(prev => prev ? { ...prev, intent_triggers_text: event.target.value } : prev)} rows={3} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">输入结构 JSON</span>
                            <textarea value={draft.input_schema_text} onChange={(event) => setDraft(prev => prev ? { ...prev, input_schema_text: event.target.value } : prev)} rows={9} className="rounded-lg border border-[#dbe4f0] px-3 py-2 font-mono text-[12px] leading-6 outline-none focus:border-[#0f6fff]" />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">补充说明 JSON</span>
                            <textarea value={draft.clarification_schema_text} onChange={(event) => setDraft(prev => prev ? { ...prev, clarification_schema_text: event.target.value } : prev)} rows={9} className="rounded-lg border border-[#dbe4f0] px-3 py-2 font-mono text-[12px] leading-6 outline-none focus:border-[#0f6fff]" />
                          </label>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-[#355070]">工作流步骤</div>
                              <div className="mt-1 text-[11px] text-[#8ea0b8]">每一步可绑定真实工具，也可以只保留说明。</div>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddStep}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] hover:border-[#b8cae6]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              添加步骤
                            </button>
                          </div>
                          <div className="space-y-3">
                            {draft.workflow_steps.map((step, index) => (
                              <div key={`${step.key || 'step'}-${index}`} className="rounded-2xl border border-[#e5edf7] bg-white p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-xs font-semibold text-[#355070]">步骤 {index + 1}</div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStep(index)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#edf2f8] px-2 py-1 text-[11px] text-[#6b7c93] hover:border-[#cfe0ff]"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    删除
                                  </button>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  <label className="grid gap-2">
                                    <span className="text-[11px] text-[#6b7c93]">步骤标识</span>
                                    <input value={step.key} onChange={(event) => setDraft(prev => prev ? { ...prev, workflow_steps: prev.workflow_steps.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item) } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]" />
                                  </label>
                                  <label className="grid gap-2">
                                    <span className="text-[11px] text-[#6b7c93]">步骤说明</span>
                                    <input value={step.label} onChange={(event) => setDraft(prev => prev ? { ...prev, workflow_steps: prev.workflow_steps.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]" />
                                  </label>
                                  <label className="grid gap-2 md:col-span-2">
                                    <span className="text-[11px] text-[#6b7c93]">绑定工具（每行一个工具名或 tool_id）</span>
                                    <textarea value={step.tool_bindings_text} onChange={(event) => setDraft(prev => prev ? { ...prev, workflow_steps: prev.workflow_steps.map((item, itemIndex) => itemIndex === index ? { ...item, tool_bindings_text: event.target.value } : item) } : prev)} rows={3} className="rounded-lg border border-[#dbe4f0] px-3 py-2 font-mono text-[12px] leading-6 outline-none focus:border-[#0f6fff]" />
                                  </label>
                                  <label className="grid gap-2 md:col-span-2">
                                    <span className="text-[11px] text-[#6b7c93]">渲染组件（可选）</span>
                                    <input value={step.ui_component} onChange={(event) => setDraft(prev => prev ? { ...prev, workflow_steps: prev.workflow_steps.map((item, itemIndex) => itemIndex === index ? { ...item, ui_component: event.target.value } : item) } : prev)} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]" />
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold text-[#355070]">输出结构 JSON</span>
                            <textarea value={draft.output_schema_text} onChange={(event) => setDraft(prev => prev ? { ...prev, output_schema_text: event.target.value } : prev)} rows={8} className="rounded-lg border border-[#dbe4f0] px-3 py-2 font-mono text-[12px] leading-6 outline-none focus:border-[#0f6fff]" />
                          </label>
                          <div className="space-y-4">
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold text-[#355070]">评估用例</span>
                              <textarea value={draft.evaluation_cases_text} onChange={(event) => setDraft(prev => prev ? { ...prev, evaluation_cases_text: event.target.value } : prev)} rows={4} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold text-[#355070]">风险约束</span>
                              <textarea value={draft.risk_guardrails_text} onChange={(event) => setDraft(prev => prev ? { ...prev, risk_guardrails_text: event.target.value } : prev)} rows={4} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
                            </label>
                          </div>
                        </div>
                      </section>
                    ) : (
                      <section className="space-y-4 rounded-2xl border border-[#edf2f8] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-[#355070]">编排结果</div>
                            <div className="mt-1 text-[11px] text-[#8ea0b8]">这里展示当前工作流会实际走哪些步骤、绑定哪些能力。</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContractId(selectedContract.skill_id);
                              setDraft(buildWorkflowDraft(selectedContract));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] hover:border-[#b8cae6]"
                          >
                            编辑
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">触发词</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedContract.intent_triggers.length > 0 ? selectedContract.intent_triggers.map(trigger => (
                                <span key={trigger} className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[11px] text-[#0f6fff]">
                                  {trigger}
                                </span>
                              )) : (
                                <span className="text-[11px] text-[#8ea0b8]">未配置触发词</span>
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">提示词绑定</div>
                            <div className="mt-2 space-y-2">
                              {relatedPrompts.length > 0 ? relatedPrompts.map(prompt => (
                                <div key={prompt.id} className="rounded-xl border border-[#e5edf7] bg-white px-3 py-2">
                                  <div className="text-sm text-[#10233f]">{prompt.name}</div>
                                  <div className="mt-1 text-[11px] text-[#6b7c93]">
                                    {prompt.binding.workflow || '未绑定'} · {prompt.status}
                                  </div>
                                </div>
                              )) : (
                                <div className="text-[11px] text-[#8ea0b8]">当前没有直接绑定的提示词</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">能力列表</div>
                            <div className="mt-2 space-y-2">
                              {relatedSkills.length > 0 ? relatedSkills.map(skill => (
                                <div key={skill.id} className="rounded-xl border border-[#e5edf7] bg-white px-3 py-2">
                                  <div className="text-sm text-[#10233f]">{skill.name}</div>
                                  <div className="mt-1 text-[11px] text-[#6b7c93]">
                                    {skill.installed ? '已启用' : '未启用'} · {skill.expected_tools.length} 个工具
                                  </div>
                                </div>
                              )) : (
                                <div className="text-[11px] text-[#8ea0b8]">当前分类下暂无能力</div>
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">接入服务</div>
                            <div className="mt-2 space-y-2">
                              {relatedMcpServers.length > 0 ? relatedMcpServers.map(server => (
                                <div key={server.id} className="rounded-xl border border-[#e5edf7] bg-white px-3 py-2">
                                  <div className="text-sm text-[#10233f]">{server.name}</div>
                                  <div className="mt-1 text-[11px] text-[#6b7c93]">{server.endpoint_url || '未配置地址'} · {server.tools.length} 个工具</div>
                                </div>
                              )) : (
                                <div className="text-[11px] text-[#8ea0b8]">当前步骤还没有匹配到接入服务</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">输入结构</div>
                            <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-[12px] leading-6 text-[#10233f]">
                              {stringifyJson(selectedContract.input_schema)}
                            </pre>
                          </div>
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">输出结构</div>
                            <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-[12px] leading-6 text-[#10233f]">
                              {stringifyJson(selectedContract.output_schema)}
                            </pre>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">步骤</div>
                            <div className="mt-2 space-y-2">
                              {selectedContract.workflow_steps.map(step => (
                                <div key={step.key} className="rounded-xl border border-[#e5edf7] bg-white px-3 py-2">
                                  <div className="text-sm text-[#10233f]">{step.label}</div>
                                  <div className="mt-1 text-[11px] text-[#6b7c93]">{step.key}{step.ui_component ? ` · ${step.ui_component}` : ''}</div>
                                  {step.tool_bindings && step.tool_bindings.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {step.tool_bindings.map(tool => (
                                        <span key={tool} className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] text-[#355070]">{tool}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                            <div className="text-xs font-semibold text-[#355070]">风险约束</div>
                            <div className="mt-2 space-y-2">
                              {(selectedContract.risk_guardrails || []).length > 0 ? selectedContract.risk_guardrails?.map(item => (
                                <div key={item} className="rounded-xl border border-[#e5edf7] bg-white px-3 py-2 text-[12px] leading-5 text-[#4f647d]">
                                  {item}
                                </div>
                              )) : (
                                <div className="text-[11px] text-[#8ea0b0]">暂无风险约束</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContractId(selectedContract.skill_id);
                              setDraft(buildWorkflowDraft(selectedContract));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] hover:border-[#b8cae6]"
                          >
                            编辑当前工作流
                          </button>
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#dbe4f0] bg-white p-8 text-center text-sm text-[#8ea0b8]">
                    请选择一个工作流查看编排结果。
                  </div>
                )}
              </div>

              <aside className="space-y-4 rounded-[20px] border border-[#dbe4f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-[#355070]">运行回放</div>
                    <div className="mt-1 text-[11px] text-[#8ea0b8]">查看最近任务、步骤、结果和证据。</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#0f6fff]" />
                </div>

                <div className="space-y-2">
                  {tasks.slice(0, 10).map(task => {
                    const active = (task.id || task.task_id) === (selectedTask?.id || selectedTask?.task_id || selectedTaskIdRaw);
                    return (
                      <button
                        key={task.id || task.task_id}
                        type="button"
                        onClick={() => {
                          const next = task.id || task.task_id;
                          setSelectedTaskIdRaw(next);
                          writeClientStorage(ADMIN_WORKFLOW_TASK_STORAGE_KEY, next);
                          setTaskDetailLoading(true);
                        }}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                          active ? 'border-[#9cc8ff] bg-[#f3f8ff]' : 'border-[#edf2f8] bg-[#fbfdff] hover:border-[#cfe0ff]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium text-[#10233f]">{task.title}</div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badgeClass(task.status)}`}>
                            {task.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : null}
                            {task.status}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-[#6b7c93]">
                          {task.task_type} · {task.workflow_level === 'heavy' ? '重链路' : '轻链路'} · {task.updated_at}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                  <div className="text-xs font-semibold text-[#355070]">当前任务</div>
                  {taskDetailLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#6b7c93]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      正在读取任务详情...
                    </div>
                  ) : selectedTask ? (
                    <div className="mt-3 space-y-3">
                      <div className="text-sm font-medium text-[#10233f]">{selectedTask.title}</div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[#0f6fff]">{selectedTaskSummary}</span>
                        {selectedTask.route_reason && (
                          <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[#355070]">{selectedTask.route_reason}</span>
                        )}
                      </div>
                      {selectedTask.last_error && (
                        <div className="inline-flex items-start gap-2 rounded-xl border border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.06)] px-3 py-2 text-[11px] leading-5 text-[#c2415c]">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{selectedTask.last_error}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        {selectedTaskRuns.map(run => (
                          <div key={run.run_id} className="rounded-xl border border-[#e5edf7] bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium text-[#10233f]">{run.intent_type}</div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass(run.status)}`}>{run.status}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-[#6b7c93]">
                              {run.workflow_level === 'heavy' ? '重链路' : '轻链路'} · {run.state}
                              {run.route_reason ? ` · ${run.route_reason}` : ''}
                            </div>
                            <div className="mt-3 space-y-2">
                              {run.steps.map((step, index) => (
                                <div key={`${run.run_id}-${step.key}-${index}`} className="rounded-lg bg-[#fbfdff] px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] font-medium text-[#10233f]">{step.label}</div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass(step.status)}`}>{step.status || 'planned'}</span>
                                  </div>
                                  {(step.message || step.output) && (
                                    <div className="mt-1 text-[11px] leading-5 text-[#6b7c93]">
                                      {step.message || stringifyJson(step.output)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-[#355070]">结果</div>
                        <div className="mt-2 space-y-2">
                          {selectedTaskResults.map(result => (
                            <div key={result.result_id || `${result.task_id}-${result.created_at}`} className="rounded-xl border border-[#e5edf7] bg-white p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium text-[#10233f]">{result.summary}</div>
                                <span className="rounded-full bg-[#eef5ff] px-2 py-0.5 text-[10px] text-[#0f6fff]">{result.result_type}</span>
                              </div>
                              <div className="mt-1 text-[11px] leading-5 text-[#6b7c93]">
                                {result.next_action || '暂无下一步动作'}
                              </div>
                            </div>
                          ))}
                          {selectedTaskResults.length === 0 && (
                            <div className="text-[11px] text-[#8ea0b8]">当前任务还没有结果记录。</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-[#355070]">证据</div>
                        <div className="mt-2 space-y-2">
                          {selectedTaskEvidence.map(item => (
                            <div key={item.evidence_id || `${item.task_id}-${item.title}`} className="rounded-xl border border-[#e5edf7] bg-white p-3">
                              <div className="text-sm font-medium text-[#10233f]">{item.title}</div>
                              <div className="mt-1 text-[11px] leading-5 text-[#6b7c93]">{item.detail}</div>
                            </div>
                          ))}
                          {selectedTaskEvidence.length === 0 && (
                            <div className="text-[11px] text-[#8ea0b0]">当前任务还没有证据记录。</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-[#dbe4f0] px-4 py-8 text-center text-sm text-[#8ea0b8]">
                      还没有可回放的任务。
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </section>
        </section>
        </div>
      </main>
    </AdminCrudShell>
  );
}

export default WorkflowManagementTab;
