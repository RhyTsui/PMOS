'use client';

import { useState, useMemo } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle, Activity, Zap, Clock, CheckCircle, AlertTriangle,
  Monitor, Upload, ArrowDownToLine, GitBranch, Settings, RefreshCw,
  ArrowUpRight, ArrowDownRight, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ==========================================
// Types & Constants
// ==========================================

type MonitorTab = 'operation' | 'upload' | 'postback' | 'attribution';

const TAB_CONFIG: { id: MonitorTab; label: string; icon: typeof Activity; color: string }[] = [
  { id: 'operation', label: '操作监控', icon: Monitor, color: '#00D9FF' },
  { id: 'upload', label: '上报监控', icon: Upload, color: '#00FF88' },
  { id: 'postback', label: '回推监控', icon: ArrowDownToLine, color: '#FFB800' },
  { id: 'attribution', label: '归因监控', icon: GitBranch, color: '#7B61FF' },
];

const STATUS_COLORS: Record<string, string> = {
  normal: '#00FF88',
  warning: '#FFB800',
  critical: '#FF3366',
};

interface MonitorMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  threshold: number;
  trend: 'up' | 'down';
}

// ==========================================
// Mock Data Generators
// ==========================================

function generateTimeSeries(base: number, variance: number, count: number, label: string, label2?: string, base2?: number, variance2?: number) {
  return Array.from({ length: count }, (_, i) => {
    const point: Record<string, string | number | null> = {
      time: `${String(Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}`,
      [label]: Math.round(base + Math.sin(i * 0.5) * variance + i * 0.5),
    };
    if (label2 && base2 !== undefined && variance2 !== undefined) {
      point[label2] = Math.round(base2 + Math.cos(i * 0.3) * variance2 + i * 0.3);
    }
    return point;
  });
}

/** 操作监控数据 */
const OPERATION_METRICS: MonitorMetric[] = [
  { id: 'op_sessions', name: '活跃会话', value: 47, unit: '个', status: 'normal' as const, threshold: 100, trend: 'up' as const },
  { id: 'op_tasks', name: '运行中任务', value: 12, unit: '个', status: 'normal' as const, threshold: 30, trend: 'up' as const },
  { id: 'op_queue', name: '等待队列', value: 3, unit: '个', status: 'normal' as const, threshold: 10, trend: 'down' as const },
  { id: 'op_response', name: '平均响应', value: 1.2, unit: 's', status: 'normal' as const, threshold: 3, trend: 'down' as const },
  { id: 'op_error_rate', name: '操作错误率', value: 0.3, unit: '%', status: 'normal' as const, threshold: 1, trend: 'down' as const },
  { id: 'op_uptime', name: '系统可用性', value: 99.95, unit: '%', status: 'normal' as const, threshold: 99.9, trend: 'up' as const },
];

/** 上报监控数据 */
const UPLOAD_METRICS: MonitorMetric[] = [
  { id: 'ul_sdk_delay', name: 'SDK 上报延迟', value: 120, unit: 'ms', status: 'normal' as const, threshold: 500, trend: 'down' as const },
  { id: 'ul_success_rate', name: '上报成功率', value: 99.2, unit: '%', status: 'normal' as const, threshold: 95, trend: 'up' as const },
  { id: 'ul_volume', name: '上报 QPS', value: 3420, unit: 'req/s', status: 'normal' as const, threshold: 5000, trend: 'up' as const },
  { id: 'ul_abnormal', name: '异常流量占比', value: 2.1, unit: '%', status: 'normal' as const, threshold: 5, trend: 'down' as const },
  { id: 'ul_event_match', name: '事件匹配率', value: 96.8, unit: '%', status: 'warning' as const, threshold: 98, trend: 'down' as const },
  { id: 'ul_parse_error', name: '解析错误率', value: 0.8, unit: '%', status: 'normal' as const, threshold: 2, trend: 'down' as const },
];

/** 回推监控数据 */
/** 回推监控数据 */
const POSTBACK_METRICS: MonitorMetric[] = [
  { id: 'pb_delay', name: '回推延迟', value: 890, unit: 'ms', status: 'critical' as const, threshold: 600, trend: 'up' as const },
  { id: 'pb_success_rate', name: '回推成功率', value: 94.5, unit: '%', status: 'warning' as const, threshold: 97, trend: 'down' as const },
  { id: 'pb_volume', name: '回推 QPS', value: 1580, unit: 'req/s', status: 'normal' as const, threshold: 3000, trend: 'up' as const },
  { id: 'pb_timeout', name: '超时率', value: 3.2, unit: '%', status: 'warning' as const, threshold: 2, trend: 'up' as const },
  { id: 'pb_media_coverage', name: '媒体覆盖率', value: 100, unit: '%', status: 'normal' as const, threshold: 100, trend: 'up' as const },
  { id: 'pb_retry_rate', name: '重试率', value: 5.5, unit: '%', status: 'warning' as const, threshold: 3, trend: 'up' as const },
];

/** 归因监控数据 */
/** 归因监控数据 */
const ATTRIBUTION_METRICS: MonitorMetric[] = [
  { id: 'at_delay', name: '归因延迟', value: 340, unit: 'ms', status: 'warning' as const, threshold: 300, trend: 'up' as const },
  { id: 'at_match_rate', name: '归因匹配率', value: 87.3, unit: '%', status: 'warning' as const, threshold: 90, trend: 'down' as const },
  { id: 'at_volume', name: '归因 QPS', value: 890, unit: 'req/s', status: 'normal' as const, threshold: 2000, trend: 'up' as const },
  { id: 'at_self_attribution', name: '自归因占比', value: 12.5, unit: '%', status: 'normal' as const, threshold: 20, trend: 'down' as const },
  { id: 'at_window_hit', name: '窗口命中率', value: 94.1, unit: '%', status: 'normal' as const, threshold: 90, trend: 'up' as const },
  { id: 'at_dispute', name: '归因争议率', value: 1.8, unit: '%', status: 'normal' as const, threshold: 3, trend: 'down' as const },
];

/** 告警数据 */
const ALERTS = [
  { id: 'alert_001', tab: 'postback' as MonitorTab, type: '回推延迟', level: 'critical', message: '巨量回推延迟超过阈值 600ms，当前 890ms', timestamp: '2026-05-08T10:05:00Z' },
  { id: 'alert_002', tab: 'attribution' as MonitorTab, type: '归因匹配率', level: 'warning', message: '归因匹配率降至 87.3%，低于 90% 基线', timestamp: '2026-05-08T10:02:00Z' },
  { id: 'alert_003', tab: 'postback' as MonitorTab, type: '回推超时率', level: 'warning', message: '回推超时率 3.2%，超过阈值 2%', timestamp: '2026-05-08T10:00:00Z' },
  { id: 'alert_004', tab: 'upload' as MonitorTab, type: '事件匹配率', level: 'warning', message: '事件匹配率降至 96.8%，低于 98% 基线', timestamp: '2026-05-08T09:55:00Z' },
  { id: 'alert_005', tab: 'attribution' as MonitorTab, type: '归因延迟', level: 'warning', message: '归因延迟 340ms，超过阈值 300ms', timestamp: '2026-05-08T09:50:00Z' },
  { id: 'alert_006', tab: 'operation' as MonitorTab, type: 'SDK 上报', level: 'info', message: 'SDK 上报恢复正常', timestamp: '2026-05-08T09:30:00Z' },
];

// ==========================================
// Sub-Components
// ==========================================

function MetricCard({ metric }: { metric: MonitorMetric }) {
  const TrendIcon = metric.trend === 'up' ? ArrowUpRight : metric.trend === 'down' ? ArrowDownRight : TrendingUp;
  const trendColor = metric.status === 'critical' ? '#FF3366'
    : metric.status === 'warning' ? '#FFB800'
    : metric.trend === 'up' ? '#00FF88' : '#00D9FF';

  return (
    <div className="bg-[#0d1225] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">{metric.name}</span>
        <div className="flex items-center gap-1">
          <TrendIcon size={12} style={{ color: trendColor }} />
          <StatusBadge status={metric.status} size="sm" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-mono font-bold" style={{ color: STATUS_COLORS[metric.status] || '#00D9FF' }}>
          {typeof metric.value === 'number' && metric.value > 999 ? metric.value.toLocaleString() : metric.value}
        </span>
        <span className="text-xs text-gray-500">{metric.unit}</span>
      </div>
      <div className="text-xs text-gray-600 mt-1">
        阈值: {metric.threshold}{metric.unit}
      </div>
    </div>
  );
}

function AlertsList({ alerts }: { alerts: typeof ALERTS }) {
  const LEVEL_ICONS: Record<string, typeof AlertCircle> = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: CheckCircle,
  };

  return (
    <div className="space-y-2">
      {alerts.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">暂无告警</div>
      )}
      {alerts.map((alert) => {
        const Icon = LEVEL_ICONS[alert.level] || AlertCircle;
        return (
          <div key={alert.id} className="flex items-start gap-3 bg-[#0d1225] rounded-lg p-3 border border-white/5">
            <Icon size={16} style={{ color: STATUS_COLORS[alert.level] || '#00D9FF' }} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/80">{alert.type}</span>
                <StatusBadge status={(alert.level === 'info' ? 'active' : alert.level === 'critical' ? 'error' : alert.level) as 'active' | 'warning' | 'error'} size="sm" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{alert.message}</p>
              <span className="text-xs text-gray-600">{new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// Tab Content Components
// ==========================================

function OperationTab() {
  const chartData = useMemo(() => generateTimeSeries(40, 10, 24, '会话数', '任务数', 10, 5), []);

  return (
    <div className="space-y-4">
      <GlassPanel title="操作监控指标" icon={Monitor}>
        <div className="grid grid-cols-3 gap-3">
          {OPERATION_METRICS.map((m) => <MetricCard key={m.id} metric={m} />)}
        </div>
      </GlassPanel>
      <GlassPanel title="会话与任务趋势" icon={TrendingUp}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="time" stroke="#4a5568" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="会话数" stroke="#00D9FF" fillOpacity={1} fill="url(#colorSessions)" />
              <Area type="monotone" dataKey="任务数" stroke="#00FF88" fillOpacity={1} fill="url(#colorTasks)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
      <AlertsList alerts={ALERTS.filter(a => a.tab === 'operation')} />
    </div>
  );
}

function UploadTab() {
  const chartData = useMemo(() => generateTimeSeries(3400, 400, 24, 'QPS', '延迟ms', 120, 30), []);

  return (
    <div className="space-y-4">
      <GlassPanel title="上报监控指标" icon={Upload}>
        <div className="grid grid-cols-3 gap-3">
          {UPLOAD_METRICS.map((m) => <MetricCard key={m.id} metric={m} />)}
        </div>
      </GlassPanel>
      <GlassPanel title="上报量与延迟趋势" icon={Activity}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorUploadQPS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="time" stroke="#4a5568" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="QPS" stroke="#00FF88" fillOpacity={1} fill="url(#colorUploadQPS)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
      <AlertsList alerts={ALERTS.filter(a => a.tab === 'upload')} />
    </div>
  );
}

function PostbackTab() {
  const chartData = useMemo(() => generateTimeSeries(890, 120, 24, '延迟ms'), []);

  return (
    <div className="space-y-4">
      <GlassPanel title="回推监控指标" icon={ArrowDownToLine}>
        <div className="grid grid-cols-3 gap-3">
          {POSTBACK_METRICS.map((m) => <MetricCard key={m.id} metric={m} />)}
        </div>
      </GlassPanel>
      <GlassPanel title="回推延迟趋势" icon={Zap}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPostbackDelay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3366" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF3366" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="time" stroke="#4a5568" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="延迟ms" stroke="#FF3366" fillOpacity={1} fill="url(#colorPostbackDelay)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
      <AlertsList alerts={ALERTS.filter(a => a.tab === 'postback')} />
    </div>
  );
}

function AttributionTab() {
  const chartData = useMemo(() => generateTimeSeries(87, 3, 24, '匹配率%'), []);
  const mediaData = [
    { media: '巨量', match: 89.2, volume: 4520, delay: 280 },
    { media: 'TikTok', match: 85.1, volume: 2380, delay: 420 },
    { media: 'Google', match: 91.3, volume: 1890, delay: 190 },
    { media: '快手', match: 82.7, volume: 1200, delay: 350 },
  ];

  return (
    <div className="space-y-4">
      <GlassPanel title="归因监控指标" icon={GitBranch}>
        <div className="grid grid-cols-3 gap-3">
          {ATTRIBUTION_METRICS.map((m) => <MetricCard key={m.id} metric={m} />)}
        </div>
      </GlassPanel>
      <GlassPanel title="归因匹配率趋势" icon={Activity}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAttrMatch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="time" stroke="#4a5568" tick={{ fontSize: 10 }} />
              <YAxis domain={[80, 100]} stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="匹配率%" stroke="#7B61FF" fillOpacity={1} fill="url(#colorAttrMatch)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
      <GlassPanel title="各媒体归因表现" icon={TrendingUp}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mediaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="media" stroke="#4a5568" tick={{ fontSize: 11 }} />
              <YAxis domain={[75, 100]} stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="match" name="匹配率%" fill="#7B61FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
      <AlertsList alerts={ALERTS.filter(a => a.tab === 'attribution')} />
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function MonitoringPanel() {
  const [activeTab, setActiveTab] = useState<MonitorTab>('operation');
  const alertCounts = useMemo(() => {
    const counts: Record<string, number> = { operation: 0, upload: 0, postback: 0, attribution: 0 };
    ALERTS.forEach(a => { if (a.level !== 'info') counts[a.tab]++; });
    return counts;
  }, []);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0d1225] rounded-xl p-1 border border-white/5">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const count = alertCounts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${
                activeTab === tab.id
                  ? 'bg-[rgba(255,255,255,0.08)] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <Icon size={16} style={{ color: activeTab === tab.id ? tab.color : undefined }} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-mono bg-[#FF3366]/20 text-[#FF3366]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Global Alert Summary */}
      {ALERTS.filter(a => a.level === 'critical').length > 0 && (
        <div className="flex items-center gap-3 bg-[#FF3366]/10 border border-[#FF3366]/20 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-[#FF3366] shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-[#FF3366]">
              {ALERTS.filter(a => a.level === 'critical').length} 个严重告警
            </span>
            <span className="text-xs text-gray-400 ml-2">
              {ALERTS.filter(a => a.level === 'critical').map(a => a.type).join('、')}
            </span>
          </div>
          <Button size="sm" variant="outline" className="text-[#FF3366] border-[#FF3366]/30 hover:bg-[#FF3366]/10">
            <RefreshCw size={12} className="mr-1" /> 刷新
          </Button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'operation' && <OperationTab />}
      {activeTab === 'upload' && <UploadTab />}
      {activeTab === 'postback' && <PostbackTab />}
      {activeTab === 'attribution' && <AttributionTab />}
    </div>
  );
}
