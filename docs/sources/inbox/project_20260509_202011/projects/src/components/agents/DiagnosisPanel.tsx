'use client';

import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { EvidenceItem } from '@/types';
import { MOCK_EVIDENCE } from '@/lib/constants';
import {
  Search, FileText, Clock, ChevronRight, CheckCircle, XCircle,
  AlertCircle, RefreshCw, Shield, TrendingUp, TrendingDown,
  Upload, MessageCircle, ArrowRight
} from 'lucide-react';

type AnomalyType = 'activation' | 'payment' | 'postback' | 'attribution' | 'bi_inconsistency';

interface DiagnosisEvidence extends EvidenceItem {
  relevance: 'high' | 'medium' | 'low';
  time: string;
}

interface MissingEvidence {
  field: string;
  reason: string;
  source_hint: string;
}

interface DiagnosisResultData {
  id: string;
  anomaly_type: AnomalyType;
  media: string;
  app: string;
  time_range: string;
  summary_conclusion: string;
  confidence_level: number;
  risk_level: 'high' | 'medium' | 'low';
  evidence_items: DiagnosisEvidence[];
  missing_evidence_items: MissingEvidence[];
  next_actions: { action: string; owner: string }[];
  owner_roles: string[];
}

const anomalyLabels: Record<AnomalyType, string> = {
  activation: '激活异常',
  payment: '付费异常',
  postback: '回传异常',
  attribution: '归因异常',
  bi_inconsistency: 'BI不一致',
};

const anomalyIcons: Record<AnomalyType, React.ReactNode> = {
  activation: <TrendingDown className="w-4 h-4" />,
  payment: <TrendingDown className="w-4 h-4" />,
  postback: <ArrowRight className="w-4 h-4" />,
  attribution: <Shield className="w-4 h-4" />,
  bi_inconsistency: <AlertCircle className="w-4 h-4" />,
};

const mockDiagnosisResults: DiagnosisResultData[] = [
  {
    id: 'diag_001',
    anomaly_type: 'activation',
    media: '巨量引擎',
    app: '指间山海',
    time_range: '2026-05-07 ~ 2026-05-08',
    summary_conclusion: '激活缺口主要集中在首登回传链路，SDK 上报正常但 S2S 回传存在约 28% 丢失',
    confidence_level: 0.82,
    risk_level: 'high',
    evidence_items: MOCK_EVIDENCE.slice(0, 3).map((e, i) => ({
      ...e,
      relevance: i === 0 ? 'high' : i === 1 ? 'high' : 'medium',
      time: `2026-05-08 ${10 + i}:00`,
    })) as DiagnosisEvidence[],
    missing_evidence_items: [
      { field: '设备级激活明细', reason: '需确认 SDK 上报到 S2S 之间的丢包环节', source_hint: '数仓激活明细表' },
      { field: '巨量后台激活数', reason: '需对比媒体侧归因结果', source_hint: '巨量后台报告' },
    ],
    next_actions: [
      { action: '核对 SDK 回传与媒体映射配置', owner: '广告支持' },
      { action: '拉取设备级激活明细对比', owner: '数据分析' },
      { action: '检查 S2S 回传超时配置', owner: '后端开发' },
    ],
    owner_roles: ['广告支持', '数据分析', '后端开发'],
  },
  {
    id: 'diag_002',
    anomaly_type: 'attribution',
    media: 'Google Ads',
    app: '星界冒险',
    time_range: '2026-05-06 ~ 2026-05-08',
    summary_conclusion: '归因结果与 BI 报表不一致，差异主要来自时区口径不同（UTC+8 vs UTC+0）',
    confidence_level: 0.71,
    risk_level: 'medium',
    evidence_items: MOCK_EVIDENCE.slice(2, 4).map((e, i) => ({
      ...e,
      relevance: i === 0 ? 'high' : 'medium',
      time: `2026-05-07 ${14 + i}:30`,
    })) as DiagnosisEvidence[],
    missing_evidence_items: [
      { field: 'Google 归因时区配置', reason: '确认媒体侧归因使用的时区口径', source_hint: 'Google Ads 设置' },
    ],
    next_actions: [
      { action: '确认双方时区口径', owner: '数据分析' },
      { action: '统一时区后重新对比', owner: '数据分析' },
    ],
    owner_roles: ['数据分析'],
  },
];

export function DiagnosisPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyType | null>(null);
  const [currentResult, setCurrentResult] = useState<DiagnosisResultData | null>(null);
  const [history] = useState<DiagnosisResultData[]>(mockDiagnosisResults);

  const startDiagnosis = () => {
    setIsDiagnosing(true);
    setSelectedAnomaly(null);

    setTimeout(() => {
      setCurrentResult(mockDiagnosisResults[0]);
      setIsDiagnosing(false);
    }, 2000);
  };

  const confidenceColor = (level: number) => {
    if (level >= 0.8) return 'var(--aifs-success)';
    if (level >= 0.6) return 'var(--aifs-warning)';
    return 'var(--aifs-danger)';
  };

  const riskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'var(--aifs-danger)';
      case 'medium': return 'var(--aifs-warning)';
      default: return 'var(--aifs-success)';
    }
  };

  const relevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'var(--aifs-danger)';
      case 'medium': return 'var(--aifs-warning)';
      default: return 'var(--aifs-text-muted)';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--aifs-text-primary)]">
            问题排查
          </h2>
          <p className="text-sm text-[var(--aifs-text-secondary)]">
            证据化排查 & 置信度表达 & 结论沉淀
          </p>
        </div>
      </div>

      {/* Search & Anomaly Type Selector */}
      <GlassPanel className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--aifs-text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="描述异常问题，如「为什么激活比 BI 少了 28%」..."
                className="pl-10 bg-[var(--aifs-primary-light)] border-[var(--aifs-border)] focus:border-[var(--aifs-accent)]"
              />
            </div>
            <Button
              onClick={startDiagnosis}
              disabled={isDiagnosing}
              className="bg-[var(--aifs-accent)] hover:bg-[var(--aifs-accent)]/80 gap-2"
            >
              {isDiagnosing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  排查中
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  开始排查
                </>
              )}
            </Button>
          </div>

          {/* Anomaly Type Quick Select */}
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(anomalyLabels) as [AnomalyType, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedAnomaly(selectedAnomaly === key ? null : key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                  selectedAnomaly === key
                    ? 'bg-[var(--aifs-accent)]/20 text-[var(--aifs-accent)] border border-[var(--aifs-accent)]/30'
                    : 'bg-white/5 text-[var(--aifs-text-secondary)] border border-transparent hover:border-[var(--aifs-border)]'
                }`}
              >
                {anomalyIcons[key]}
                {label}
              </button>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Current Diagnosis Result */}
      {currentResult && (
        <div className="space-y-4">
          {/* Conclusion & Confidence */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {anomalyIcons[currentResult.anomaly_type]}
              <h3 className="text-lg font-semibold text-[var(--aifs-text-primary)]">
                排查结论
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  color: riskColor(currentResult.risk_level),
                  backgroundColor: `${riskColor(currentResult.risk_level)}15`,
                }}
              >
                {currentResult.risk_level === 'high' ? '高风险' : currentResult.risk_level === 'medium' ? '中风险' : '低风险'}
              </span>
            </div>

            {/* One-sentence conclusion */}
            <div className="p-4 rounded-xl bg-[var(--aifs-accent)]/5 border border-[var(--aifs-accent)]/20 mb-4">
              <p className="text-[var(--aifs-text-primary)] leading-relaxed">
                {currentResult.summary_conclusion}
              </p>
            </div>

            {/* Confidence Bar */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--aifs-text-secondary)]">置信度</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${currentResult.confidence_level * 100}%`,
                    backgroundColor: confidenceColor(currentResult.confidence_level),
                  }}
                />
              </div>
              <span
                className="text-sm font-mono font-semibold"
                style={{ color: confidenceColor(currentResult.confidence_level) }}
              >
                {currentResult.confidence_level.toFixed(2)}
              </span>
              <span className="text-xs text-[var(--aifs-text-muted)]">
                {currentResult.confidence_level >= 0.8 ? '高' : currentResult.confidence_level >= 0.6 ? '中' : '低'}
              </span>
            </div>

            {/* Context Info */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/5">
              <div className="text-sm">
                <span className="text-[var(--aifs-text-muted)]">媒体</span>
                <span className="ml-2 text-[var(--aifs-text-primary)]">{currentResult.media}</span>
              </div>
              <div className="text-sm">
                <span className="text-[var(--aifs-text-muted)]">应用</span>
                <span className="ml-2 text-[var(--aifs-text-primary)]">{currentResult.app}</span>
              </div>
              <div className="text-sm">
                <span className="text-[var(--aifs-text-muted)]">时间范围</span>
                <span className="ml-2 text-[var(--aifs-text-primary)]">{currentResult.time_range}</span>
              </div>
            </div>
          </GlassPanel>

          {/* Evidence Chain */}
          <GlassPanel className="p-6">
            <h4 className="font-medium text-[var(--aifs-text-primary)] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--aifs-accent)]" />
              证据链
            </h4>
            <div className="space-y-3">
              {currentResult.evidence_items.map((evidence, idx) => (
                <div key={evidence.evidence_id || idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: `${relevanceColor(evidence.relevance)}15`,
                        color: relevanceColor(evidence.relevance),
                      }}
                    >
                      {idx + 1}
                    </div>
                    {idx < currentResult.evidence_items.length - 1 && (
                      <div className="w-px h-6 bg-[var(--aifs-border)] mt-1" />
                    )}
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--aifs-text-primary)]">
                        {evidence.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[var(--aifs-text-muted)]">
                          {evidence.evidence_type}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${relevanceColor(evidence.relevance)}15`,
                            color: relevanceColor(evidence.relevance),
                          }}
                        >
                          {evidence.relevance === 'high' ? '高相关' : evidence.relevance === 'medium' ? '中相关' : '低相关'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--aifs-text-secondary)]">{evidence.summary}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--aifs-text-muted)]">
                      <Clock className="w-3 h-3" />
                      {evidence.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Missing Evidence */}
          {currentResult.missing_evidence_items.length > 0 && (
            <GlassPanel className="p-6 border-[var(--aifs-warning)]/20">
              <h4 className="font-medium text-[var(--aifs-warning)] mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                待补证据
              </h4>
              <div className="space-y-2">
                {currentResult.missing_evidence_items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--aifs-warning)]/5">
                    <div>
                      <p className="text-sm text-[var(--aifs-text-primary)]">{item.field}</p>
                      <p className="text-xs text-[var(--aifs-text-secondary)]">{item.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--aifs-text-muted)]">来源: {item.source_hint}</span>
                      <Button variant="outline" size="sm" className="text-xs gap-1 h-7">
                        <Upload className="w-3 h-3" />
                        补充
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* Next Actions */}
          <GlassPanel className="p-6">
            <h4 className="font-medium text-[var(--aifs-text-primary)] mb-3 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[var(--aifs-accent)]" />
              下一步动作
            </h4>
            <div className="space-y-2">
              {currentResult.next_actions.map((action, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--aifs-accent)]/10 flex items-center justify-center text-xs text-[var(--aifs-accent)]">
                      {idx + 1}
                    </div>
                    <span className="text-sm text-[var(--aifs-text-primary)]">{action.action}</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--aifs-accent)]/10 text-[var(--aifs-accent)]">
                    {action.owner}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
              <Button variant="outline" size="sm" className="gap-1">
                <Upload className="w-4 h-4" />
                上传证据
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <MessageCircle className="w-4 h-4" />
                继续追问
              </Button>
              <Button size="sm" className="gap-1 bg-[var(--aifs-accent)] hover:bg-[var(--aifs-accent)]/80">
                <TrendingUp className="w-4 h-4" />
                升级为 Case
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--aifs-text-primary)] mb-4">
          历史排查
        </h3>
        <div className="space-y-3">
          {history.map((item) => (
            <GlassPanel key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.risk_level === 'high' ? 'critical' : 'online'} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[var(--aifs-text-primary)]">
                        {anomalyLabels[item.anomaly_type]}
                      </p>
                      <span className="text-xs text-[var(--aifs-text-muted)]">
                        {item.media} / {item.app}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--aifs-text-muted)] mt-0.5 line-clamp-1">
                      {item.summary_conclusion}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-[var(--aifs-text-muted)]">
                    <Clock className="w-3 h-3" />
                    {item.time_range}
                  </div>
                  <div
                    className="text-xs font-mono font-medium px-2 py-0.5 rounded-full"
                    style={{
                      color: confidenceColor(item.confidence_level),
                      backgroundColor: `${confidenceColor(item.confidence_level)}15`,
                    }}
                  >
                    {item.confidence_level.toFixed(2)}
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentResult(item)}>
                    查看详情
                  </Button>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
