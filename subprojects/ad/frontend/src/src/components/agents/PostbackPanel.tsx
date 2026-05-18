'use client';

import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Plus, ToggleLeft, ToggleRight, Trash2, Edit, TestTube,
  Send, ArrowRight, CheckCircle, XCircle, Clock, Settings,
  Webhook, Link, ShieldCheck, AlertTriangle, ChevronDown,
} from 'lucide-react';

// ==========================================
// Types & Constants
// ==========================================

type PostbackTab = 'config' | 'mapping' | 'test';

const TAB_CONFIG: { id: PostbackTab; label: string; icon: typeof Settings }[] = [
  { id: 'config', label: '回传配置', icon: Webhook },
  { id: 'mapping', label: '事件映射', icon: ArrowRight },
  { id: 'test', label: '测试验证', icon: TestTube },
];

interface PostbackStrategy {
  id: string;
  name: string;
  media: string;
  event: string;
  url: string;
  method: 'GET' | 'POST';
  status: 'active' | 'paused' | 'error';
  lastTest?: string;
  authType: 'none' | 'token' | 'oauth';
  authToken?: string;
}

// ==========================================
// Mock Data
// ==========================================

const MOCK_STRATEGIES: PostbackStrategy[] = [
  {
    id: 'pb_001', name: '巨量-购买回传', media: '巨量引擎', event: 'purchase',
    url: 'https://analytics.bytedance.com/v2/event', method: 'POST',
    status: 'active', lastTest: '2分钟前', authType: 'token', authToken: 'ak-****xxxx',
  },
  {
    id: 'pb_002', name: '巨量-激活回传', media: '巨量引擎', event: 'activate',
    url: 'https://analytics.bytedance.com/v2/event', method: 'POST',
    status: 'active', lastTest: '5分钟前', authType: 'token', authToken: 'ak-****xxxx',
  },
  {
    id: 'pb_003', name: 'TikTok-注册回传', media: 'TikTok', event: 'register',
    url: 'https://business-api.tiktok.com/v1.3/event/track', method: 'POST',
    status: 'paused', lastTest: '1小时前', authType: 'token', authToken: 'tt-****yyyy',
  },
  {
    id: 'pb_004', name: 'Google-转化回传', media: 'Google Ads', event: 'conversion',
    url: 'https://www.googleadservices.com/pagead/conversion', method: 'GET',
    status: 'error', lastTest: '失败', authType: 'oauth',
  },
];

const EVENT_MAPPINGS = [
  { app_event: 'app_open', media_events: { '巨量引擎': 'lt_app_open', 'TikTok': 'OpenApp', 'Google': 'first_open' }, priority: '高' },
  { app_event: 'register', media_events: { '巨量引擎': 'lt_register', 'TikTok': 'CompleteRegistration', 'Google': 'sign_up' }, priority: '高' },
  { app_event: 'purchase', media_events: { '巨量引擎': 'lt_purchase', 'TikTok': 'Purchase', 'Google': 'purchase' }, priority: '高' },
  { app_event: 'add_to_cart', media_events: { '巨量引擎': 'lt_add_to_cart', 'TikTok': 'AddToCart', 'Google': 'add_to_cart' }, priority: '中' },
  { app_event: 'level_up', media_events: { '巨量引擎': 'lt_level_up', 'TikTok': 'LevelUp', 'Google': '-' }, priority: '低' },
  { app_event: 'tutorial_complete', media_events: { '巨量引擎': 'lt_tutorial', 'TikTok': 'TutorialComplete', 'Google': '-' }, priority: '低' },
];

// ==========================================
// Sub-Components
// ==========================================

function ConfigTab() {
  const [strategies, setStrategies] = useState(MOCK_STRATEGIES);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    setStrategies(prev => prev.map(s =>
      s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : s.status === 'paused' ? 'active' : 'paused' } : s
    ));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">共 {strategies.length} 条回传配置</span>
        <Button size="sm" variant="outline"><Plus size={12} className="mr-1" />新增配置</Button>
      </div>

      {strategies.map(s => {
        const isExpanded = expanded === s.id;
        return (
          <div key={s.id} className="bg-[#0d1225] rounded-xl border border-white/5 overflow-hidden">
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpanded(isExpanded ? null : s.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-white/80 font-medium">{s.name}</span>
                  <StatusBadge status={s.status === 'active' ? 'active' : s.status === 'error' ? 'error' : 'warning'} size="sm" />
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">{s.media}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>事件: {s.event}</span>
                  <span>方法: {s.method}</span>
                  <span>鉴权: {s.authType === 'token' ? 'Token' : s.authType === 'oauth' ? 'OAuth' : '无'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); toggleStatus(s.id); }}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  {s.status === 'active' ? <ToggleRight size={18} className="text-[#00FF88]" /> : <ToggleLeft size={18} className="text-gray-500" />}
                </button>
                <ChevronDown size={14} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-3">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">回传 URL</label>
                    <div className="text-xs font-mono text-[#00D9FF] bg-[#080c1a] rounded px-2 py-1.5 truncate">{s.url}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">鉴权信息</label>
                    <div className="text-xs font-mono text-[#00FF88] bg-[#080c1a] rounded px-2 py-1.5">
                      {s.authType === 'token' ? s.authToken : s.authType === 'oauth' ? 'OAuth 2.0' : '无需鉴权'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline"><Edit size={10} className="mr-1" />编辑</Button>
                  <Button size="sm" variant="outline"><TestTube size={10} className="mr-1" />测试</Button>
                  <Button size="sm" variant="outline" className="text-[#FF3366] hover:bg-[#FF3366]/10"><Trash2 size={10} className="mr-1" />删除</Button>
                  <span className="text-xs text-gray-500 ml-auto">最近测试: {s.lastTest || '-'}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MappingTab() {
  return (
    <div className="space-y-4">
      <GlassPanel title="事件映射表" icon={ArrowRight}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-2 text-gray-400 font-medium">应用事件</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium">巨量引擎</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium">TikTok</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium">Google</th>
                <th className="text-center py-2 px-2 text-gray-400 font-medium">优先级</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_MAPPINGS.map((m, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2 px-2 font-mono text-white/80">{m.app_event}</td>
                  <td className="py-2 px-2 font-mono text-[#00D9FF]">{m.media_events['巨量引擎']}</td>
                  <td className="py-2 px-2 font-mono text-[#00FF88]">{m.media_events['TikTok']}</td>
                  <td className="py-2 px-2 font-mono text-[#7B61FF]">{m.media_events['Google']}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      m.priority === '高' ? 'bg-[#FF3366]/10 text-[#FF3366]' :
                      m.priority === '中' ? 'bg-[#FFB800]/10 text-[#FFB800]' :
                      'bg-white/5 text-gray-400'
                    }`}>{m.priority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <GlassPanel title="URL模板变量" icon={Link}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { var: '{{event_name}}', desc: '事件名称' },
            { var: '{{event_time}}', desc: '事件时间戳' },
            { var: '{{device_id}}', desc: '设备ID' },
            { var: '{{app_id}}', desc: '应用包名' },
            { var: '{{media_source}}', desc: '媒体来源' },
            { var: '{{campaign}}', desc: '广告系列' },
          ].map((v, i) => (
            <div key={i} className="flex items-center justify-between bg-[#0d1225] rounded-lg px-3 py-2 border border-white/5">
              <span className="text-xs font-mono text-[#00D9FF]">{v.var}</span>
              <span className="text-xs text-gray-400">{v.desc}</span>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function TestTab() {
  const [testResults] = useState([
    { id: 't_001', strategy: '巨量-购买回传', status: 'success', responseTime: '230ms', timestamp: '2026-05-08 10:05:12' },
    { id: 't_002', strategy: '巨量-激活回传', status: 'success', responseTime: '180ms', timestamp: '2026-05-08 10:04:58' },
    { id: 't_003', strategy: 'TikTok-注册回传', status: 'failed', responseTime: '超时', timestamp: '2026-05-08 10:04:30', error: 'Connection timeout after 10s' },
    { id: 't_004', strategy: 'Google-转化回传', status: 'failed', responseTime: '403', timestamp: '2026-05-08 10:03:45', error: 'OAuth token expired' },
  ]);

  const successCount = testResults.filter(r => r.status === 'success').length;

  return (
    <div className="space-y-4">
      {/* Test Summary */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-[#0d1225] rounded-lg p-3 border border-white/5 text-center">
          <div className="text-xs text-gray-400 mb-1">通过</div>
          <div className="text-lg font-mono font-bold text-[#00FF88]">{successCount}/{testResults.length}</div>
        </div>
        <div className="flex-1 bg-[#0d1225] rounded-lg p-3 border border-white/5 text-center">
          <div className="text-xs text-gray-400 mb-1">失败</div>
          <div className="text-lg font-mono font-bold text-[#FF3366]">{testResults.length - successCount}/{testResults.length}</div>
        </div>
      </div>

      <Button size="sm" className="w-full">
        <TestTube size={12} className="mr-1" /> 批量测试所有回传
      </Button>

      {/* Test Results */}
      <GlassPanel title="最近测试结果" icon={Clock}>
        <div className="space-y-2">
          {testResults.map(r => (
            <div key={r.id} className="bg-[#0d1225] rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {r.status === 'success' ? <CheckCircle size={14} className="text-[#00FF88]" /> : <XCircle size={14} className="text-[#FF3366]" />}
                  <span className="text-sm text-white/80">{r.strategy}</span>
                </div>
                <span className="text-xs font-mono text-gray-500">{r.responseTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{r.timestamp}</span>
                {r.error && (
                  <span className="text-xs text-[#FF3366]">{r.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function PostbackPanel() {
  const [activeTab, setActiveTab] = useState<PostbackTab>('config');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-white/90">回传配置</h2>
        <p className="text-xs text-gray-400 mt-0.5">回传URL配置、事件映射、测试验证</p>
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
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'mapping' && <MappingTab />}
      {activeTab === 'test' && <TestTab />}
    </div>
  );
}
