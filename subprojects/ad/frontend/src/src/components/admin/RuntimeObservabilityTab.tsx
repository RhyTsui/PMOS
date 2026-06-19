'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from 'antd';
import { Activity, AlertTriangle, Database, RefreshCw, Shield } from 'lucide-react';
import {
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type GuardrailCheck = {
  code: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
};

type GuardrailLayerStatus = {
  enabled: boolean;
  checks: GuardrailCheck[];
  integration?: string;
};

type GuardrailStatus = {
  input: GuardrailLayerStatus;
  tool: GuardrailLayerStatus;
  output: GuardrailLayerStatus;
};

type EvidenceSource = {
  type: string;
  description: string;
  integration_points: string[];
};

type ConfidenceLevel = {
  level: string;
  description: string;
};

type EvidenceLedgerSchema = {
  sources: EvidenceSource[];
  confidence_levels: ConfidenceLevel[];
};

type PlannerMetrics = {
  total_observations: number;
  status_counts: Record<string, number>;
  avg_duration_ms: number;
  succeeded_rate: number;
  json_parse_failed_rate: number;
  contract_validation_failed_rate: number;
  task_type_distribution: Record<string, number>;
  updated_at: string;
};

type ObservabilityData = {
  planner_metrics: PlannerMetrics;
  guardrail_status: GuardrailStatus;
  evidence_ledger_schema: EvidenceLedgerSchema;
  generated_at: string;
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  error: { bg: 'bg-red-50', text: 'text-red-700', label: '阻断' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', label: '警告' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', label: '提示' },
};

export function RuntimeObservabilityTab() {
  const [data, setData] = useState<ObservabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/xiaoqiao/admin/runtime-observability');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as ObservabilityData;
      setData(payload);
      setLastLoadedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <AdminCrudShell>
        <AdminCrudHeader
          title="运行观测"
          description="查看计划生成、检查规则和证据记录的运行健康情况。"
        />
        <div className="px-5 py-4">
          <AdminCrudListSkeleton rows={6} />
        </div>
      </AdminCrudShell>
    );
  }

  if (error && !data) {
    return (
      <AdminCrudShell>
        <AdminCrudHeader
          title="运行观测"
          description="查看计划生成、检查规则和证据记录的运行健康情况。"
          actions={<Button icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void load()}>重新读取</Button>}
        />
        <AdminCrudErrorState
          description={error}
          action={<Button size="small" onClick={() => void load()}>重新读取</Button>}
        />
      </AdminCrudShell>
    );
  }

  if (!data) return null;

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="运行观测"
        description="查看计划生成、检查规则和证据记录的运行健康情况。"
        actions={(
          <Button onClick={() => void load()} disabled={loading} icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}>
            刷新
          </Button>
        )}
      />
      {error ? (
        <AdminCrudErrorState
          description={error}
          action={<Button size="small" onClick={() => void load()}>重新读取</Button>}
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-6">
          {lastLoadedAt && (
            <p className="text-xs text-slate-400">
              最后更新：{new Date(lastLoadedAt).toLocaleString('zh-CN')}
            </p>
          )}

      {/* ─── Planner Metrics ────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          <h3 className="text-base font-medium text-slate-900">计划生成观测</h3>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="总观测数"
            value={data.planner_metrics.total_observations.toLocaleString()}
          />
          <MetricCard
            label="成功率"
            value={`${(data.planner_metrics.succeeded_rate * 100).toFixed(1)}%`}
            tone={data.planner_metrics.succeeded_rate > 0.8 ? 'good' : data.planner_metrics.succeeded_rate > 0.5 ? 'warn' : 'bad'}
          />
          <MetricCard
            label="平均耗时"
            value={`${data.planner_metrics.avg_duration_ms.toFixed(0)} ms`}
          />
          <MetricCard
            label="结构化解析失败率"
            value={`${(data.planner_metrics.json_parse_failed_rate * 100).toFixed(1)}%`}
            tone={data.planner_metrics.json_parse_failed_rate < 0.05 ? 'good' : 'bad'}
          />
        </div>

        {/* Status breakdown */}
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium text-slate-700">状态分布</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.planner_metrics.status_counts).map(([status, count]) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                  status === 'succeeded'
                    ? 'bg-emerald-50 text-emerald-700'
                    : status === 'disabled'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-red-50 text-red-700'
                }`}
              >
                {status}
                <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Task type distribution */}
        {Object.keys(data.planner_metrics.task_type_distribution).length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-medium text-slate-700">任务类型分布</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.planner_metrics.task_type_distribution).map(([taskType, count]) => (
                <span
                  key={taskType}
                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                >
                  {taskType}
                  <span className="font-semibold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {data.planner_metrics.total_observations === 0 && (
          <p className="mt-3 text-sm text-slate-400">
            暂无计划生成观测。开启观测后，这里会显示最新运行健康情况。
          </p>
        )}
      </section>

      {/* ─── Guardrail Status ───────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          <h3 className="text-base font-medium text-slate-900">三层安全检查</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(['input', 'tool', 'output'] as const).map((layer) => {
            const layerData = data.guardrail_status[layer];
            const layerLabels = { input: '用户输入', tool: '工具调用', output: '答案输出' };
            return (
              <div key={layer} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">{layerLabels[layer]}</h4>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    layerData.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {layerData.enabled ? '已启用' : '未启用'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {layerData.checks.map((check) => {
                    const style = SEVERITY_STYLE[check.severity] ?? SEVERITY_STYLE.info;
                    return (
                      <div key={check.code} className={`flex items-center justify-between rounded px-2 py-1 ${style.bg}`}>
                        <span className={`text-xs ${style.text}`}>{check.name}</span>
                        <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                      </div>
                    );
                  })}
                </div>
                {layerData.integration && (
                  <p className="mt-3 text-xs text-slate-400">集成：{layerData.integration}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Evidence Ledger Schema ─────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-sky-600" />
          <h3 className="text-base font-medium text-slate-900">证据记录结构</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Sources */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-700">证据来源</h4>
            <div className="space-y-2">
              {data.evidence_ledger_schema.sources.map((source) => (
                <div key={source.type} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
                      {source.type}
                    </code>
                    {source.integration_points.length > 0 ? (
                      <span className="text-xs text-emerald-600">已接入</span>
                    ) : (
                      <span className="text-xs text-slate-400">预留</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{source.description}</p>
                  {source.integration_points.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {source.integration_points.map((point, idx) => (
                        <li key={idx} className="text-xs text-slate-400">· {point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Confidence levels */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-700">置信度等级</h4>
            <div className="space-y-2">
              {data.evidence_ledger_schema.confidence_levels.map((level) => (
                <div key={level.level} className="rounded-lg border border-slate-100 p-3">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
                    {level.level}
                  </code>
                  <p className="mt-1 text-xs text-slate-500">{level.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">查看单次请求的 Ledger</span>
              </div>
              <p className="mt-1 text-xs text-amber-700">
                单次请求的证据记录可在运行过程面板查看，用于核对来源、置信度和检查结果。
              </p>
            </div>
          </div>
        </div>
      </section>
        </div>
      </div>
    </AdminCrudShell>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good'
    ? 'text-emerald-600'
    : tone === 'warn'
      ? 'text-amber-600'
      : tone === 'bad'
        ? 'text-red-600'
        : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
