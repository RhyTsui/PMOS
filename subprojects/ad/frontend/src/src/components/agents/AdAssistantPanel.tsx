'use client';

import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/CodeBlock';
import {
  Search, Book, HelpCircle, FileText, Send, Plus,
  Compass, Ruler, ShieldCheck, Wrench, ExternalLink, ChevronRight,
  MessageSquare, ArrowRight,
} from 'lucide-react';

// ==========================================
// Types & Constants
// ==========================================

type HelpQuestionType = 'metric_definition' | 'system_path' | 'rule_reference' | 'technical_issue';
type HelpTab = 'qa' | 'metrics' | 'paths' | 'rules';

const QUESTION_TYPE_CONFIG: Record<HelpQuestionType, { label: string; icon: typeof HelpCircle; color: string; desc: string }> = {
  metric_definition: { label: '指标口径', icon: Ruler, color: '#00D9FF', desc: '指标定义、计算公式、口径说明' },
  system_path: { label: '系统路径', icon: Compass, color: '#00FF88', desc: '功能入口、操作步骤、页面导航' },
  rule_reference: { label: '规则引用', icon: ShieldCheck, color: '#7B61FF', desc: '广告规则、审核规则、投放策略' },
  technical_issue: { label: '技术问题', icon: Wrench, color: '#FFB800', desc: 'SDK接入、回传异常、归因逻辑' },
};

const HELP_TABS: { id: HelpTab; label: string; icon: typeof HelpCircle }[] = [
  { id: 'qa', label: '智能问答', icon: MessageSquare },
  { id: 'metrics', label: '指标口径', icon: Ruler },
  { id: 'paths', label: '系统路径', icon: Compass },
  { id: 'rules', label: '规则引用', icon: ShieldCheck },
];

// ==========================================
// Mock Data - HelpResult structured per design doc
// ==========================================

const HELP_RESULTS = [
  {
    id: 'hr_001',
    question_type: 'metric_definition' as HelpQuestionType,
    subject: 'ROAS - 广告支出回报率',
    definition_text: 'ROAS (Return on Ad Spend) 衡量每投入1元广告支出带来的收入回报。计算公式: ROAS = 广告收入 / 广告支出。',
    system_path: '广告管理平台 → 数据报表 → 投放效果 → ROAS 列',
    source_refs: ['广告指标口径文档 v3.2', '投放数据字典'],
    confidence_level: 'high' as const,
    next_actions: ['查看其他ROI相关指标', '对比不同渠道ROAS'],
  },
  {
    id: 'hr_002',
    question_type: 'metric_definition' as HelpQuestionType,
    subject: 'CVR - 转化率',
    definition_text: 'CVR (Conversion Rate) 是点击广告后完成目标转化的比例。计算公式: CVR = 转化次数 / 点击次数 × 100%。',
    system_path: '广告管理平台 → 数据报表 → 转化分析 → CVR 列',
    source_refs: ['广告指标口径文档 v3.2'],
    confidence_level: 'high' as const,
    next_actions: ['查看转化漏斗分析', '对比不同素材CVR'],
  },
  {
    id: 'hr_003',
    question_type: 'system_path' as HelpQuestionType,
    subject: '回传配置入口',
    definition_text: '服务端回传 (S2S Postback) 的配置入口在广告管理平台的"开发者设置"中，支持URL模板配置和鉴权信息管理。',
    system_path: '广告管理平台 → 设置 → 开发者设置 → 服务端回传',
    source_refs: ['媒体接入文档 - 巨量引擎'],
    confidence_level: 'high' as const,
    next_actions: ['查看回传配置详细步骤', '测试回传连通性'],
  },
  {
    id: 'hr_004',
    question_type: 'rule_reference' as HelpQuestionType,
    subject: '巨量引擎素材审核规则',
    definition_text: '巨量引擎素材审核规则涵盖: 1) 不得使用绝对化用语; 2) 不得虚假承诺收益; 3) 游戏类素材需标注"仅供参考"标识; 4) 不得使用未授权IP。',
    system_path: '巨量引擎 → 帮助中心 → 审核规范 → 素材审核标准',
    source_refs: ['巨量引擎广告审核规范 2026Q1', '素材合规指南'],
    confidence_level: 'high' as const,
    next_actions: ['下载完整审核规范PDF', '提交素材预审'],
  },
  {
    id: 'hr_005',
    question_type: 'technical_issue' as HelpQuestionType,
    subject: 'SDK 事件上报延迟排查',
    definition_text: 'SDK事件上报延迟常见原因: 1) 网络环境差导致请求堆积; 2) 批量上报间隔设置过长; 3) 客户端时间不同步; 4) 事件触发条件配置错误。',
    system_path: '开发者工具 → SDK诊断 → 事件上报状态',
    source_refs: ['SDK集成文档 v5.1', '常见技术FAQ'],
    confidence_level: 'medium' as const,
    next_actions: ['进入问题排查流程', '查看SDK上报日志'],
  },
];

const METRICS_DEFS = [
  { name: 'ROAS', fullName: '广告支出回报率', formula: 'ROAS = 广告收入 ÷ 广告支出', description: '衡量每投入1元广告能带来多少收入', goodValue: 'ROAS > 3 通常被认为是良好的表现' },
  { name: 'CPM', fullName: '千次展示成本', formula: 'CPM = (广告支出 ÷ 展示次数) × 1000', description: '广告每获得1000次展示的平均成本', goodValue: 'CPM越低越好，需结合转化率综合评估' },
  { name: 'CPA', fullName: '单次行动成本', formula: 'CPA = 广告支出 ÷ 转化数', description: '每获得一个目标行动的平均成本', goodValue: 'CPA < 目标CPA即为达标' },
  { name: 'CTR', fullName: '点击率', formula: 'CTR = 点击次数 ÷ 展示次数', description: '广告被点击的比例', goodValue: 'CTR > 1% 通常被认为是良好的' },
  { name: 'CVR', fullName: '转化率', formula: 'CVR = 转化次数 ÷ 点击次数', description: '点击广告后完成转化的比例', goodValue: 'CVR因行业和产品而异，需与历史数据对比' },
  { name: 'LTV', fullName: '用户生命周期价值', formula: 'LTV = ARPU × 平均生命周期', description: '单个用户在整个生命周期内创造的价值', goodValue: 'LTV / CAC > 3 为健康水平' },
];

const SYSTEM_PATHS = [
  { id: 'sp_001', title: '回传配置', path: '广告管理平台 → 设置 → 开发者设置 → 服务端回传', media: '巨量引擎' },
  { id: 'sp_002', title: '转化事件管理', path: '广告管理平台 → 工具 → 事件管理 → 转化事件', media: '巨量引擎' },
  { id: 'sp_003', title: '归因窗口设置', path: '广告管理平台 → 设置 → 归因设置 → 窗口配置', media: '巨量引擎' },
  { id: 'sp_004', title: 'SDK集成文档', path: '开发者平台 → SDK下载 → 集成指南 → Android/iOS', media: '通用' },
  { id: 'sp_005', title: '素材审核规范', path: '帮助中心 → 审核规范 → 素材审核标准', media: '巨量引擎' },
  { id: 'sp_006', title: '投放数据报表', path: '广告管理平台 → 数据报表 → 投放效果', media: '巨量引擎' },
];

// ==========================================
// Sub-Components
// ==========================================

function HelpResultCard({ result }: { result: typeof HELP_RESULTS[number] }) {
  const config = QUESTION_TYPE_CONFIG[result.question_type];
  const Icon = config.icon;
  const confidenceColor = result.confidence_level === 'high' ? '#00FF88' : result.confidence_level === 'medium' ? '#FFB800' : '#FF3366';

  return (
    <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}20` }}>
          <Icon size={16} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
              {config.label}
            </span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${confidenceColor}15`, color: confidenceColor }}>
              {result.confidence_level === 'high' ? '高置信' : result.confidence_level === 'medium' ? '中置信' : '低置信'}
            </span>
          </div>
          <h4 className="text-sm font-medium text-white/90 mb-1.5">{result.subject}</h4>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">{result.definition_text}</p>

          {result.system_path && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <Compass size={12} />
              <span className="font-mono">{result.system_path}</span>
            </div>
          )}

          {result.source_refs.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">来源:</span>
              {result.source_refs.map((ref, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">
                  {ref}
                </span>
              ))}
            </div>
          )}

          {result.next_actions.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
              {result.next_actions.map((action, i) => (
                <button key={i} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#00D9FF] transition-colors">
                  <ArrowRight size={10} />{action}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Tab Content Components
// ==========================================

function QATab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof HELP_RESULTS>([]);

  const handleSearch = () => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const filtered = HELP_RESULTS.filter(r =>
      r.subject.toLowerCase().includes(q) ||
      r.definition_text.toLowerCase().includes(q) ||
      r.question_type.includes(q)
    );
    setResults(filtered.length > 0 ? filtered : HELP_RESULTS.slice(0, 3));
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="输入问题，如: ROAS怎么算? 回传配置在哪? 素材审核规则?"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d1225] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D9FF]/50"
        />
      </div>

      {/* Quick Question Type Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.entries(QUESTION_TYPE_CONFIG) as [HelpQuestionType, typeof QUESTION_TYPE_CONFIG[HelpQuestionType]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => { setQuery(cfg.desc); handleSearch(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/5 hover:border-white/15 transition-all bg-[#0d1225]"
            >
              <Icon size={12} style={{ color: cfg.color }} />
              <span style={{ color: cfg.color }}>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map(r => <HelpResultCard key={r.id} result={r} />)}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare size={32} className="mx-auto text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">输入问题获取帮助</p>
          <p className="text-xs text-gray-500 mt-1">支持指标口径查询、系统路径导航、规则引用、技术问题</p>
        </div>
      )}
    </div>
  );
}

function MetricsTab() {
  return (
    <div className="space-y-3">
      {METRICS_DEFS.map((metric, i) => (
        <div key={i} className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00D9FF]/20 to-[#7B61FF]/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold font-mono text-[#00D9FF]">{metric.name}</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white/90 mb-1">{metric.fullName}</h4>
              <CodeBlock code={metric.formula} language="text" showCopy={false} className="mb-2 !text-xs" />
              <p className="text-xs text-gray-400 mb-1">{metric.description}</p>
              <p className="text-xs text-[#00FF88]">{metric.goodValue}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PathsTab() {
  const [filter, setFilter] = useState<string>('all');

  const filteredPaths = filter === 'all'
    ? SYSTEM_PATHS
    : SYSTEM_PATHS.filter(p => p.media === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {['all', '巨量引擎', '通用'].map(m => (
          <button key={m} onClick={() => setFilter(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === m ? 'bg-[rgba(0,217,255,0.15)] text-[#00D9FF]' : 'text-gray-400 hover:text-gray-200 bg-[#0d1225]'
            }`}
          >
            {m === 'all' ? '全部' : m}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filteredPaths.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-[#0d1225] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
            <Compass size={14} className="text-[#00FF88] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80">{p.title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(123,97,255,0.1)] text-[#7B61FF]">{p.media}</span>
              </div>
              <span className="text-xs font-mono text-gray-500">{p.path}</span>
            </div>
            <ExternalLink size={12} className="text-gray-600 group-hover:text-[#00D9FF] transition-colors shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesTab() {
  const rules = [
    { id: 'r_001', title: '巨量引擎素材审核规范', category: '素材审核', media: '巨量引擎', updated: '2026-04-15' },
    { id: 'r_002', title: '广告文案违禁词清单', category: '文案审核', media: '通用', updated: '2026-04-01' },
    { id: 'r_003', title: '归因窗口配置规则', category: '归因规则', media: '巨量引擎', updated: '2026-03-20' },
    { id: 'r_004', title: '出价策略与预算规则', category: '投放规则', media: '巨量引擎', updated: '2026-04-10' },
    { id: 'r_005', title: '数据回推频率与格式规范', category: '数据规则', media: '通用', updated: '2026-03-01' },
  ];

  return (
    <div className="space-y-3">
      {rules.map(r => (
        <div key={r.id} className="flex items-center gap-3 bg-[#0d1225] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
          <ShieldCheck size={14} className="text-[#7B61FF] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/80">{r.title}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">{r.category}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-500">{r.media}</span>
              <span className="text-xs text-gray-600">更新于 {r.updated}</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-600 group-hover:text-white/60 transition-colors shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function AdAssistantPanel() {
  const [activeTab, setActiveTab] = useState<HelpTab>('qa');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-white/90">使用帮助</h2>
        <p className="text-xs text-gray-400 mt-0.5">指标口径解释、系统路径导航、规则引用、技术问题</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0d1225] rounded-xl p-1 border border-white/5">
        {HELP_TABS.map((tab) => {
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
      {activeTab === 'qa' && <QATab />}
      {activeTab === 'metrics' && <MetricsTab />}
      {activeTab === 'paths' && <PathsTab />}
      {activeTab === 'rules' && <RulesTab />}
    </div>
  );
}
