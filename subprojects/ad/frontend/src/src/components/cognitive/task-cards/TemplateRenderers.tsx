'use client';

import { useThemeColors } from '@/hooks/useTheme';
import { Download, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// ─── JoinTableResultRenderer — 拼表结果 ─────────────────────────────────────

export interface JoinTableResultData {
  tablePreview?: Array<Record<string, unknown>>;
  totalRows?: number;
  columns?: string[];
  artifactUrl?: string;
  artifactName?: string;
  sourceTables?: string[];
}

export function JoinTableResultRenderer({ data }: { data: JoinTableResultData }) {
  const c = useThemeColors();

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-medium mb-2" style={{ color: c.textSecondary }}>
        📊 拼表结果
        {data.totalRows !== undefined && <span className="ml-2 text-gray-400">{data.totalRows} 行</span>}
      </h4>

      {data.tablePreview && data.tablePreview.length > 0 && (
        <div className="overflow-x-auto mb-2">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                {(data.columns || Object.keys(data.tablePreview[0] || {})).slice(0, 8).map((col) => (
                  <th key={col} className="border border-gray-200 px-2 py-1 text-left font-medium bg-gray-50" style={{ color: c.textSecondary }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tablePreview.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {(data.columns || Object.keys(row)).slice(0, 8).map((col) => (
                    <td key={col} className="border border-gray-200 px-2 py-1" style={{ color: c.textPrimary }}>
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.tablePreview.length > 5 && (
            <p className="text-xs mt-1" style={{ color: c.textMuted }}>仅显示前 5 行</p>
          )}
        </div>
      )}

      {data.sourceTables && data.sourceTables.length > 0 && (
        <p className="text-xs mb-2" style={{ color: c.textMuted }}>
          数据源：{data.sourceTables.join(' + ')}
        </p>
      )}

      {data.artifactUrl && (
        <a
          href={data.artifactUrl}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          download
        >
          <Download size={12} />
          下载 {data.artifactName || 'Excel'}
        </a>
      )}
    </div>
  );
}

// ─── AggregateTableResultRenderer — 聚合表结果 ─────────────────────────────────────

export interface AggregateTableResultData {
  summary?: string;
  tablePreview?: Array<Record<string, unknown>>;
  columns?: string[];
  artifactUrl?: string;
  artifactName?: string;
  hasChart?: boolean;
}

export function AggregateTableResultRenderer({ data }: { data: AggregateTableResultData }) {
  const c = useThemeColors();

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-3">
      {data.summary && (
        <p className="text-sm mb-2" style={{ color: c.textPrimary }}>{data.summary}</p>
      )}

      {data.tablePreview && data.tablePreview.length > 0 && (
        <div className="overflow-x-auto mb-2">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                {(data.columns || Object.keys(data.tablePreview[0] || {})).map((col) => (
                  <th key={col} className="border border-gray-200 px-2 py-1 text-left font-medium bg-gray-50" style={{ color: c.textSecondary }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tablePreview.slice(0, 10).map((row, i) => (
                <tr key={i}>
                  {(data.columns || Object.keys(row)).map((col) => (
                    <td key={col} className="border border-gray-200 px-2 py-1" style={{ color: c.textPrimary }}>
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.artifactUrl && (
        <a
          href={data.artifactUrl}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          download
        >
          <Download size={12} />
          下载 {data.artifactName || '聚合表'}
        </a>
      )}
    </div>
  );
}

// ─── DailyDigestResultRenderer — GI 日报结果 ─────────────────────────────────────

export interface DailyDigestResultData {
  digestMarkdown?: string;
  sources?: Array<{ title: string; url: string; source: string }>;
  keyPoints?: string[];
}

export function DailyDigestResultRenderer({ data }: { data: DailyDigestResultData }) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-medium mb-2" style={{ color: c.textSecondary }}>
        📰 GI 日报
      </h4>

      {data.keyPoints && data.keyPoints.length > 0 && (
        <ul className="text-sm space-y-1 mb-2" style={{ color: c.textPrimary }}>
          {data.keyPoints.slice(0, expanded ? undefined : 3).map((point, i) => (
            <li key={i}>• {point}</li>
          ))}
        </ul>
      )}

      {data.digestMarkdown && expanded && (
        <div className="text-sm mb-2 p-2 bg-gray-50 rounded" style={{ color: c.textPrimary }}>
          {data.digestMarkdown.slice(0, 2000)}
        </div>
      )}

      {data.keyPoints && data.keyPoints.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs mb-2"
          style={{ color: c.textMuted }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? '收起' : `查看全部 ${data.keyPoints.length} 条`}
        </button>
      )}

      {data.sources && data.sources.length > 0 && (
        <div className="mt-2">
          <h5 className="text-xs font-medium mb-1" style={{ color: c.textMuted }}>
            来源 ({data.sources.length})
          </h5>
          <div className="flex flex-wrap gap-1">
            {data.sources.slice(0, expanded ? undefined : 5).map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                style={{ color: c.textSecondary }}
              >
                <ExternalLink size={10} />
                {source.title || source.source}
              </a>
            ))}
            {data.sources.length > 5 && !expanded && (
              <span className="text-xs" style={{ color: c.textMuted }}>
                +{data.sources.length - 5} 更多
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MetricMonitorResultRenderer — 指标监控结果 ─────────────────────────────────────

export interface MetricMonitorResultData {
  alertLevel?: 'normal' | 'warning' | 'critical';
  affectedEntities?: Array<{ name: string; metric: string; value: number; threshold: number }>;
  suggestions?: string[];
  detailTable?: Array<Record<string, unknown>>;
}

export function MetricMonitorResultRenderer({ data }: { data: MetricMonitorResultData }) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  const levelConfig = {
    normal: { color: '#16a34a', bg: '#f0fdf4', label: '正常', icon: '✅' },
    warning: { color: '#b45309', bg: '#fffbeb', label: '警告', icon: '⚠️' },
    critical: { color: '#dc2626', bg: '#fef2f2', label: '严重', icon: '🔴' },
  };

  const level = data.alertLevel || 'normal';
  const config = levelConfig[level];

  return (
    <div className="mt-3 border rounded-lg p-3" style={{ borderColor: config.color + '30' }}>
      <div className="flex items-center gap-2 mb-2">
        <span>{config.icon}</span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: config.bg, color: config.color }}>
          {config.label}
        </span>
        {data.affectedEntities && (
          <span className="text-xs" style={{ color: c.textMuted }}>
            影响 {data.affectedEntities.length} 个实体
          </span>
        )}
      </div>

      {data.affectedEntities && data.affectedEntities.length > 0 && (
        <div className="overflow-x-auto mb-2">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 px-2 py-1 text-left font-medium bg-gray-50" style={{ color: c.textSecondary }}>实体</th>
                <th className="border border-gray-200 px-2 py-1 text-left font-medium bg-gray-50" style={{ color: c.textSecondary }}>指标</th>
                <th className="border border-gray-200 px-2 py-1 text-left font-medium bg-gray-50" style={{ color: c.textSecondary }}>当前值</th>
                <th className="border border-gray-200 px-2 py-1 text-left font-medium bg-gray-50" style={{ color: c.textSecondary }}>阈值</th>
              </tr>
            </thead>
            <tbody>
              {data.affectedEntities.slice(0, expanded ? undefined : 5).map((entity, i) => (
                <tr key={i}>
                  <td className="border border-gray-200 px-2 py-1" style={{ color: c.textPrimary }}>{entity.name}</td>
                  <td className="border border-gray-200 px-2 py-1" style={{ color: c.textPrimary }}>{entity.metric}</td>
                  <td className="border border-gray-200 px-2 py-1 font-medium" style={{ color: config.color }}>{entity.value}</td>
                  <td className="border border-gray-200 px-2 py-1" style={{ color: c.textMuted }}>{entity.threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.affectedEntities.length > 5 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs mt-1"
              style={{ color: c.textMuted }}
            >
              查看全部 {data.affectedEntities.length} 条
            </button>
          )}
        </div>
      )}

      {data.suggestions && data.suggestions.length > 0 && (
        <div className="mt-2">
          <h5 className="text-xs font-medium mb-1" style={{ color: c.textSecondary }}>建议动作</h5>
          <ul className="text-sm space-y-0.5" style={{ color: c.textPrimary }}>
            {data.suggestions.map((s, i) => (
              <li key={i}>💡 {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
