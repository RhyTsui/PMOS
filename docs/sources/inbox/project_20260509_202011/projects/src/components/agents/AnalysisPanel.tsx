'use client';

import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import {
  Film, Search, BarChart3, FileText, Layers, Copy,
  ChevronRight, Download, Eye, Sparkles, ArrowRight,
  Play, Image, Palette,
} from 'lucide-react';

// ==========================================
// Types
// ==========================================

type AnalysisTab = 'script' | 'similarity' | 'report';

const TAB_CONFIG: { id: AnalysisTab; label: string; icon: typeof Film }[] = [
  { id: 'script', label: '创意脚本解析', icon: Film },
  { id: 'similarity', label: '相似度匹配', icon: Layers },
  { id: 'report', label: '报表生成', icon: BarChart3 },
];

// ==========================================
// Mock Data
// ==========================================

const SCRIPT_ANALYSIS = {
  id: 'sa_001',
  title: '手游公会招募视频',
  script_breakdown: [
    { timestamp: '0-3s', type: '钩子', content: '高燃开场，角色特效全屏释放', emotion: 'excited' },
    { timestamp: '3-8s', type: '核心卖点', content: '展示公会战场景，强调团队协作', emotion: 'epic' },
    { timestamp: '8-12s', type: '利益点', content: '展示公会福利: 每日钻石+专属皮肤', emotion: 'desire' },
    { timestamp: '12-15s', type: '行动号召', content: '限时入会礼包，点击下载', emotion: 'urgent' },
  ],
  elements: [
    { element: '角色', count: 3, style: '3D写实' },
    { element: '场景', count: 2, style: '战斗场景+公会大厅' },
    { element: '文案', count: 4, style: '大字+弹幕式' },
    { element: 'BGM', count: 1, style: '燃向电子' },
  ],
  tags: ['手游', '公会', '3D', '战斗', '招募', '限时礼包'],
};

const SIMILARITY_RESULTS = [
  { id: 'sim_001', title: 'RPG公会战宣传片', similarity: 0.87, status: 'high', media: '巨量引擎', ctr: 2.8, cvr: 4.2 },
  { id: 'sim_002', title: '手游组队招募广告', similarity: 0.72, status: 'medium', media: 'TikTok', ctr: 2.1, cvr: 3.5 },
  { id: 'sim_003', title: '策略游戏公会福利', similarity: 0.65, status: 'medium', media: '巨量引擎', ctr: 1.9, cvr: 3.1 },
  { id: 'sim_004', title: 'MMO公会战招募', similarity: 0.51, status: 'low', media: '快手', ctr: 1.5, cvr: 2.8 },
];

const REPORT_SUMMARY = {
  period: '2026-04-01 ~ 2026-04-30',
  total_creatives: 48,
  top_performer: 'RPG公会战宣传片',
  avg_ctr: 2.3,
  avg_cvr: 3.6,
  insights: [
    { type: 'positive', text: '3D写实风格素材CTR比卡通风格高42%' },
    { type: 'positive', text: '限时福利类素材CVR提升显著(+35%)' },
    { type: 'warning', text: '超过15秒的视频完播率下降明显' },
    { type: 'negative', text: '纯文案类素材CTR持续走低，建议减少使用' },
  ],
};

// ==========================================
// Sub-Components
// ==========================================

function ScriptTab() {
  return (
    <div className="space-y-4">
      {/* Upload / Input */}
      <GlassPanel title="创意脚本解析" icon={Film}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="输入素材URL或上传视频文件..."
              className="w-full pl-4 pr-10 py-2 rounded-lg bg-[#0d1225] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D9FF]/50"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
          <Button size="sm" variant="outline"><Play size={12} className="mr-1" />解析</Button>
        </div>

        {/* Script Breakdown Timeline */}
        <div className="space-y-2">
          {SCRIPT_ANALYSIS.script_breakdown.map((seg, i) => {
            const typeColor = seg.type === '钩子' ? '#FF3366' : seg.type === '核心卖点' ? '#00D9FF' : seg.type === '利益点' ? '#00FF88' : '#FFB800';
            return (
              <div key={i} className="flex items-start gap-3 bg-[#0d1225] rounded-lg p-3 border border-white/5">
                <span className="text-xs font-mono text-gray-500 shrink-0 mt-0.5">{seg.timestamp}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>
                      {seg.type}
                    </span>
                    <span className="text-xs text-gray-500">情绪: {seg.emotion}</span>
                  </div>
                  <p className="text-xs text-gray-300">{seg.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* Elements Summary */}
      <GlassPanel title="素材元素" icon={Palette}>
        <div className="grid grid-cols-2 gap-2">
          {SCRIPT_ANALYSIS.elements.map((el, i) => (
            <div key={i} className="flex items-center justify-between bg-[#0d1225] rounded-lg p-2.5 border border-white/5">
              <div className="flex items-center gap-2">
                <Image size={12} className="text-[#7B61FF]" />
                <span className="text-xs text-white/80">{el.element}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#00D9FF]">x{el.count}</span>
                <span className="text-xs text-gray-500">{el.style}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Tags */}
      <GlassPanel title="标签" icon={Sparkles}>
        <div className="flex items-center gap-2 flex-wrap">
          {SCRIPT_ANALYSIS.tags.map((tag, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[rgba(0,217,255,0.08)] text-[#00D9FF] border border-[#00D9FF]/15">
              {tag}
            </span>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function SimilarityTab() {
  const statusColor = (s: string) => s === 'high' ? '#00FF88' : s === 'medium' ? '#FFB800' : '#FF3366';
  const statusLabel = (s: string) => s === 'high' ? '高度相似' : s === 'medium' ? '中度相似' : '低度相似';

  return (
    <div className="space-y-4">
      <GlassPanel title="相似素材匹配" icon={Layers}>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="输入参考素材URL或关键词..."
            className="flex-1 pl-4 pr-4 py-2 rounded-lg bg-[#0d1225] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D9FF]/50"
          />
          <Button size="sm" variant="outline"><Search size={12} className="mr-1" />匹配</Button>
        </div>

        <div className="space-y-2">
          {SIMILARITY_RESULTS.map(r => (
            <div key={r.id} className="flex items-center gap-3 bg-[#0d1225] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-white/80">{r.title}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${statusColor(r.status)}15`, color: statusColor(r.status) }}>
                    {statusLabel(r.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{r.media}</span>
                  <span>CTR: <span className="text-[#00D9FF]">{r.ctr}%</span></span>
                  <span>CVR: <span className="text-[#00FF88]">{r.cvr}%</span></span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-bold" style={{ color: statusColor(r.status) }}>
                  {(r.similarity * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">相似度</div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function ReportTab() {
  const insightColor = (t: string) => t === 'positive' ? '#00FF88' : t === 'warning' ? '#FFB800' : '#FF3366';
  const insightIcon = (t: string) => t === 'positive' ? '↑' : t === 'warning' ? '⚠' : '✕';

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '素材总量', value: REPORT_SUMMARY.total_creatives, unit: '个' },
          { label: '最佳素材', value: REPORT_SUMMARY.top_performer, unit: '' },
          { label: '平均CTR', value: REPORT_SUMMARY.avg_ctr, unit: '%' },
          { label: '平均CVR', value: REPORT_SUMMARY.avg_cvr, unit: '%' },
        ].map((m, i) => (
          <div key={i} className="bg-[#0d1225] rounded-lg p-3 border border-white/5 text-center">
            <div className="text-xs text-gray-400 mb-1">{m.label}</div>
            <div className="text-sm font-mono font-bold text-[#00D9FF]">
              {typeof m.value === 'number' ? m.value : m.value.length > 6 ? m.value.substring(0, 6) + '...' : m.value}
            </div>
            {m.unit && <span className="text-xs text-gray-500">{m.unit}</span>}
          </div>
        ))}
      </div>

      {/* Insights */}
      <GlassPanel title={`分析洞察 (${REPORT_SUMMARY.period})`} icon={Sparkles}>
        <div className="space-y-2">
          {REPORT_SUMMARY.insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 bg-[#0d1225] rounded-lg p-3 border border-white/5">
              <span className="text-xs shrink-0 mt-0.5" style={{ color: insightColor(ins.type) }}>
                {insightIcon(ins.type)}
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1">
          <Download size={12} className="mr-1" /> 导出报表
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <Eye size={12} className="mr-1" /> 查看详情
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function AnalysisPanel() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('script');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-white/90">素材分析</h2>
        <p className="text-xs text-gray-400 mt-0.5">创意脚本解析、相似度匹配、报表生成</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0d1225] rounded-xl p-1 border border-white/5">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-[rgba(255,255,255,0.08)] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'script' && <ScriptTab />}
      {activeTab === 'similarity' && <SimilarityTab />}
      {activeTab === 'report' && <ReportTab />}
    </div>
  );
}
