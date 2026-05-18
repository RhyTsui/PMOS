'use client';

import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, AlertTriangle, Shield, RefreshCw, Calendar,
  Target, DollarSign, Clock, BarChart3, ArrowUpRight, Calculator,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ==========================================
// Types
// ==========================================

type PredictionTab = 'roi' | 'ltv' | 'payback';

const TAB_CONFIG: { id: PredictionTab; label: string; icon: typeof TrendingUp; color: string }[] = [
  { id: 'roi', label: 'ROI 预测', icon: Target, color: '#00D9FF' },
  { id: 'ltv', label: 'LTV 预测', icon: TrendingUp, color: '#00FF88' },
  { id: 'payback', label: '回本测算', icon: Calculator, color: '#FFB800' },
];

// ==========================================
// Mock Data
// ==========================================

const ROI_PREDICTION_DATA = [
  { date: '05-01', actual: 4.2, predicted: 4.5, upper: 5.1, lower: 3.9 },
  { date: '05-02', actual: 4.8, predicted: 4.7, upper: 5.3, lower: 4.1 },
  { date: '05-03', actual: 5.1, predicted: 4.9, upper: 5.6, lower: 4.2 },
  { date: '05-04', actual: 4.6, predicted: 5.0, upper: 5.7, lower: 4.3 },
  { date: '05-05', actual: 5.3, predicted: 5.2, upper: 5.9, lower: 4.5 },
  { date: '05-06', actual: null, predicted: 5.5, upper: 6.2, lower: 4.8 },
  { date: '05-07', actual: null, predicted: 5.8, upper: 6.5, lower: 5.1 },
  { date: '05-08', actual: null, predicted: 5.82, upper: 6.6, lower: 5.0 },
];

const ROI_METRICS = [
  { label: '预测 ROAS', value: 5.82, unit: 'x', status: 'normal' as const },
  { label: '置信度', value: 85, unit: '%', status: 'normal' as const },
  { label: '风险指数', value: 0.32, unit: '', status: 'warning' as const },
  { label: '建议预算', value: 18.5, unit: 'K', status: 'normal' as const },
];

const ROI_RISK = [
  { factor: '市场波动', level: 'low', desc: '市场稳定，波动较小' },
  { factor: '季节性', level: 'medium', desc: '春节前流量上涨趋势' },
  { factor: '竞争压力', level: 'medium', desc: '竞争对手投放增加' },
  { factor: '素材疲劳', level: 'low', desc: '当前素材新鲜度良好' },
];

const LTV_CURVE_DATA = [
  { day: 'D1', ltv: 0.8, cumulative_cost: 2.5 },
  { day: 'D3', ltv: 1.5, cumulative_cost: 2.5 },
  { day: 'D7', ltv: 3.2, cumulative_cost: 2.5 },
  { day: 'D14', ltv: 5.8, cumulative_cost: 2.5 },
  { day: 'D30', ltv: 9.5, cumulative_cost: 2.5 },
  { day: 'D60', ltv: 14.2, cumulative_cost: 2.5 },
  { day: 'D90', ltv: 18.5, cumulative_cost: 2.5 },
  { day: 'D120', ltv: 21.8, cumulative_cost: 2.5 },
  { day: 'D180', ltv: 26.3, cumulative_cost: 2.5 },
];

const LTV_METRICS = [
  { label: 'D7 LTV', value: 3.2, unit: '¥', status: 'normal' as const },
  { label: 'D30 LTV', value: 9.5, unit: '¥', status: 'normal' as const },
  { label: 'D90 LTV', value: 18.5, unit: '¥', status: 'normal' as const },
  { label: 'D180 LTV', value: 26.3, unit: '¥', status: 'normal' as const },
];

const PAYBACK_DATA = [
  { day: 'D1', revenue: 320, cost: 2500, cumulative: -2180 },
  { day: 'D3', revenue: 680, cost: 2500, cumulative: -1820 },
  { day: 'D7', revenue: 1280, cost: 2500, cumulative: -1220 },
  { day: 'D14', revenue: 2100, cost: 2500, cumulative: -400 },
  { day: 'D21', revenue: 2950, cost: 2500, cumulative: 450 },
  { day: 'D30', revenue: 3800, cost: 2500, cumulative: 1300 },
  { day: 'D45', revenue: 5200, cost: 2500, cumulative: 2700 },
  { day: 'D60', revenue: 6400, cost: 2500, cumulative: 3900 },
];

const PAYBACK_METRICS = [
  { label: '回本天数', value: 19, unit: '天', status: 'normal' as const },
  { label: '日消耗', value: 2500, unit: '¥', status: 'normal' as const },
  { label: '预估 D30 收入', value: 3800, unit: '¥', status: 'normal' as const },
  { label: 'D30 利润率', value: 34.2, unit: '%', status: 'normal' as const },
];

// ==========================================
// Sub-Components
// ==========================================

function MetricRow({ metrics }: { metrics: typeof ROI_METRICS }) {
  const statusColor = (s: string) => s === 'warning' ? '#FFB800' : s === 'critical' ? '#FF3366' : '#00D9FF';
  return (
    <div className="grid grid-cols-4 gap-3">
      {metrics.map((m, i) => (
        <div key={i} className="bg-[#0d1225] rounded-lg p-3 border border-white/5">
          <div className="text-xs text-gray-400 mb-1">{m.label}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold" style={{ color: statusColor(m.status) }}>
              {typeof m.value === 'number' && m.value > 999 ? m.value.toLocaleString() : m.value}
            </span>
            <span className="text-xs text-gray-500">{m.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// Tab Content Components
// ==========================================

function ROITab() {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('7d');

  return (
    <div className="space-y-4">
      <MetricRow metrics={ROI_METRICS} />

      <GlassPanel title="ROI 预测趋势" icon={TrendingUp}>
        <div className="flex items-center gap-2 mb-3">
          {(['7d', '14d', '30d'] as const).map(r => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeRange === r ? 'bg-[rgba(0,217,255,0.15)] text-[#00D9FF]' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Calendar size={12} className="inline mr-1" />{r === '7d' ? '7天' : r === '14d' ? '14天' : '30天'}
            </button>
          ))}
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ROI_PREDICTION_DATA}>
              <defs>
                <linearGradient id="colorROI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.1)" />
              <XAxis dataKey="date" stroke="#4a5568" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <ReferenceLine y={5} stroke="#00FF88" strokeDasharray="3 3" label={{ value: '目标', fill: '#00FF88', fontSize: 10 }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#colorROI)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="rgba(10,14,26,0.95)" />
              <Area type="monotone" dataKey="predicted" stroke="#00D9FF" strokeWidth={2} fill="none" />
              <Area type="monotone" dataKey="actual" stroke="#00FF88" strokeWidth={2} fill="none" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-2 gap-4">
        <GlassPanel title="风险评估" icon={Shield}>
          <div className="space-y-2">
            {ROI_RISK.map((risk, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-[#0d1225] rounded-lg border border-white/5">
                <div>
                  <p className="text-sm text-white/80">{risk.factor}</p>
                  <p className="text-xs text-gray-500">{risk.desc}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  risk.level === 'low' ? 'bg-[#00FF88]/10 text-[#00FF88]' :
                  risk.level === 'medium' ? 'bg-[#FFB800]/10 text-[#FFB800]' :
                  'bg-[#FF3366]/10 text-[#FF3366]'
                }`}>
                  {risk.level === 'low' ? '低' : risk.level === 'medium' ? '中' : '高'}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
        <GlassPanel title="优化建议" icon={TrendingUp}>
          <div className="space-y-2">
            {[
              { title: '提升预算分配', desc: '建议将日预算从 ¥15,000 提升至 ¥18,500，可增加 8% 的转化量', color: '#00FF88' },
              { title: '素材更新', desc: '当前素材已展示超过 7 天，建议更新 2-3 个新创意以提升 CTR', color: '#00D9FF' },
              { title: '渠道优化', desc: 'TikTok ROI 表现优于 Meta，建议将预算比例从 4:3 调整为 5:3', color: '#FFB800' },
            ].map((s, i) => (
              <div key={i} className="p-2.5 bg-[#0d1225] rounded-lg border-l-2" style={{ borderLeftColor: s.color }}>
                <p className="text-sm text-white/80">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

function LTVTab() {
  return (
    <div className="space-y-4">
      <MetricRow metrics={LTV_METRICS} />

      <GlassPanel title="LTV 曲线" icon={TrendingUp}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={LTV_CURVE_DATA}>
              <defs>
                <linearGradient id="colorLTV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="day" stroke="#4a5568" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <ReferenceLine y={2.5} stroke="#FFB800" strokeDasharray="3 3" label={{ value: 'CAC ¥2.5', fill: '#FFB800', fontSize: 10 }} />
              <Area type="monotone" dataKey="ltv" stroke="#00FF88" fillOpacity={1} fill="url(#colorLTV)" strokeWidth={2} name="LTV (¥)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      <GlassPanel title="各节点 LTV 对比" icon={BarChart3}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LTV_CURVE_DATA.filter((_, i) => [0, 2, 4, 6, 8].includes(i))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="day" stroke="#4a5568" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="ltv" name="LTV (¥)" fill="#00FF88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      <GlassPanel title="LTV 预测输入" icon={DollarSign}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '应用', value: 'com.xx.game' },
            { label: '媒体', value: '巨量引擎' },
            { label: '日新增', value: '500' },
            { label: 'CAC', value: '¥2.5' },
            { label: '预测周期', value: 'D180' },
            { label: '置信区间', value: '95%' },
          ].map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-[#0d1225] rounded-lg px-3 py-2 border border-white/5">
              <span className="text-xs text-gray-400">{f.label}</span>
              <span className="text-sm font-mono text-white/80">{f.value}</span>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3 w-full" variant="outline">
          <RefreshCw size={12} className="mr-1" /> 重新计算 LTV
        </Button>
      </GlassPanel>
    </div>
  );
}

function PaybackTab() {
  return (
    <div className="space-y-4">
      <MetricRow metrics={PAYBACK_METRICS} />

      <GlassPanel title="回本时间线" icon={Clock}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PAYBACK_DATA}>
              <defs>
                <linearGradient id="colorPayback" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFB800" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFB800" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="day" stroke="#4a5568" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <ReferenceLine y={0} stroke="#FF3366" strokeDasharray="3 3" label={{ value: '回本线', fill: '#FF3366', fontSize: 10 }} />
              <Area type="monotone" dataKey="cumulative" stroke="#FFB800" fillOpacity={1} fill="url(#colorPayback)" strokeWidth={2} name="累计利润 (¥)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      <GlassPanel title="回本测算输入" icon={Calculator}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '日消耗预算', value: '¥2,500', editable: true },
            { label: 'D7 回收率', value: '51.2%', editable: true },
            { label: 'D30 回收率', value: '152%', editable: false },
            { label: 'D60 回收率', value: '256%', editable: false },
            { label: '目标回本天数', value: '21天', editable: true },
            { label: '当前回本天数', value: '19天', editable: false },
          ].map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-[#0d1225] rounded-lg px-3 py-2 border border-white/5">
              <span className="text-xs text-gray-400">{f.label}</span>
              <span className={`text-sm font-mono ${f.editable ? 'text-[#00D9FF]' : 'text-white/60'}`}>{f.value}</span>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3 w-full" variant="outline">
          <Calculator size={12} className="mr-1" /> 重新测算
        </Button>
      </GlassPanel>

      <GlassPanel title="各渠道回本对比" icon={BarChart3}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { channel: '巨量', payback: 19, target: 21 },
              { channel: 'TikTok', payback: 23, target: 21 },
              { channel: 'Google', payback: 16, target: 21 },
              { channel: '快手', payback: 28, target: 21 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f36" />
              <XAxis dataKey="channel" stroke="#4a5568" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5568" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1225', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <ReferenceLine y={21} stroke="#FF3366" strokeDasharray="3 3" />
              <Bar dataKey="payback" name="回本天数" fill="#FFB800" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function PredictionPanel() {
  const [activeTab, setActiveTab] = useState<PredictionTab>('roi');

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0d1225] rounded-xl p-1 border border-white/5">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
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
            </button>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 bg-[#FFB800]/5 border border-[#FFB800]/15 rounded-xl px-4 py-2.5">
        <AlertTriangle size={14} className="text-[#FFB800] shrink-0" />
        <span className="text-xs text-[#FFB800]/80">
          预测结果仅供参考，实际投放效果受市场、素材、竞争等多因素影响。投放预算决策需由人负责。
        </span>
      </div>

      {/* Tab Content */}
      {activeTab === 'roi' && <ROITab />}
      {activeTab === 'ltv' && <LTVTab />}
      {activeTab === 'payback' && <PaybackTab />}
    </div>
  );
}
