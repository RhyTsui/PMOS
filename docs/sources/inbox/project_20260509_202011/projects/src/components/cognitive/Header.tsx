'use client';

import { useState, useEffect } from 'react';
import { useAgent } from '@/hooks/useAgent';
import { MOCK_WORKSPACE } from '@/lib/constants';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Zap, MessageSquare, ListTodo, PanelRight, Settings,
  User, Shield, Bot, Handshake, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

// ==========================================
// Role & Automation Boundary Types (业务视角补充)
// ==========================================

type UserRole = 'ad_support' | '投放' | '设计师' | '投放主管' | '财务' | 'SDK' | 'QA' | '数据分析师';
type AutoBoundary = 'auto' | 'human-machine' | 'manual';

const ROLE_LABELS: Record<string, string> = {
  ad_support: '广告支持',
  '投放': '投放',
  '设计师': '设计师',
  '投放主管': '投放主管',
  '财务': '财务',
  'SDK': 'SDK',
  'QA': 'QA',
  '数据分析师': '数据分析师',
};

const BOUNDARY_CONFIG: Record<AutoBoundary, { label: string; color: string; icon: typeof Bot }> = {
  auto: { label: '可自动', color: '#00FF88', icon: Bot },
  'human-machine': { label: '人机协作', color: '#FFB800', icon: Handshake },
  manual: { label: '必须人工', color: '#FF3366', icon: AlertTriangle },
};

// ==========================================
// Main Component
// ==========================================

export function Header() {
  const { uiState, toggleTaskSidebar } = useAgent();
  const workspace = MOCK_WORKSPACE;
  const [currentRole] = useState<UserRole>('ad_support');
  const [currentBoundary] = useState<AutoBoundary>('human-machine');

  const boundaryConfig = BOUNDARY_CONFIG[currentBoundary];
  const BoundaryIcon = boundaryConfig.icon;

  return (
    <header className="flex items-center justify-between px-4 py-3 glass border-b border-[var(--aifs-border)]">
      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--aifs-accent)] to-[var(--aifs-info)] flex items-center justify-center breathe-subtle">
            <Zap className="w-4 h-4 text-[var(--aifs-primary)]" />
          </div>
          <div className="absolute inset-0 w-9 h-9 rounded-xl bg-[var(--aifs-accent)] blur-xl opacity-20 -z-10" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[var(--aifs-text-primary)] tracking-tight">
            小乔智投
          </h1>
          <p className="text-[10px] text-[var(--aifs-text-secondary)]">
            广告支持与投放协同自动化工作台
          </p>
        </div>
      </div>

      {/* Center: Workspace Status */}
      <div className="flex items-center gap-3">
        {/* Stats */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg glass text-xs">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-[var(--aifs-accent)]" />
            <span className="text-[var(--aifs-text-secondary)]">会话</span>
            <span className="text-[var(--aifs-text-primary)] font-mono">{workspace.conversation_count}</span>
          </div>
          <div className="w-px h-3 bg-[var(--aifs-border)]" />
          <div className="flex items-center gap-1.5">
            <ListTodo className="w-3 h-3 text-[var(--aifs-accent)]" />
            <span className="text-[var(--aifs-text-secondary)]">任务</span>
            <span className="text-[var(--aifs-text-primary)] font-mono">{workspace.task_count}</span>
          </div>
          <div className="w-px h-3 bg-[var(--aifs-border)]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--aifs-text-secondary)]">模式</span>
            <StatusBadge status="active" label={workspace.current_mode} size="sm" />
          </div>
        </div>

        {/* Role Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass text-xs border border-white/5">
          <User className="w-3 h-3 text-[var(--aifs-accent)]" />
          <span className="text-[var(--aifs-text-secondary)]">角色</span>
          <span className="text-[var(--aifs-text-primary)] font-medium">{ROLE_LABELS[currentRole]}</span>
        </div>

        {/* Automation Boundary Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
          style={{ backgroundColor: `${boundaryConfig.color}10`, border: `1px solid ${boundaryConfig.color}25` }}
        >
          <BoundaryIcon className="w-3 h-3" style={{ color: boundaryConfig.color }} />
          <span style={{ color: boundaryConfig.color }}>{boundaryConfig.label}</span>
        </div>

        {/* Active Agent Indicator */}
        {uiState.activeAgent && uiState.activeAgent !== 'hub' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs border border-[var(--aifs-accent)] border-opacity-20">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--aifs-accent)] animate-pulse" />
            <span className="text-[var(--aifs-accent)]">
              {uiState.activeAgent === 'help' && '使用帮助'}
              {uiState.activeAgent === 'demand' && '需求沟通'}
              {uiState.activeAgent === 'diagnosis' && '问题排查'}
              {uiState.activeAgent === 'debugging' && '广告联调'}
              {uiState.activeAgent === 'monitoring' && '监控大屏'}
              {uiState.activeAgent === 'material' && '素材分析'}
              {uiState.activeAgent === 'prediction' && '广告预测'}
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTaskSidebar}
          className={`p-2 rounded-lg hover:bg-[var(--aifs-primary-light)] transition-colors ${
            uiState.showTaskSidebar ? 'text-[var(--aifs-accent)]' : 'text-[var(--aifs-text-secondary)]'
          }`}
          title="历史任务"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        <Link
          href="/admin"
          className="p-2 rounded-lg hover:bg-[var(--aifs-primary-light)] text-[var(--aifs-text-secondary)] transition-colors"
          title="管理页面"
        >
          <Settings className="w-4 h-4" />
        </Link>
        <SystemTime />
      </div>
    </header>
  );
}

function SystemTime() {
  const [time, setTime] = useState<{ time: string; date: string }>({
    time: '',
    date: '',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime({
        time: now.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        date: now.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        }),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time.time) return null;

  return (
    <div className="hidden lg:flex flex-col items-end">
      <span className="text-xs font-mono text-[var(--aifs-text-primary)]">
        {time.time}
      </span>
      <span className="text-[10px] text-[var(--aifs-text-secondary)]">
        {time.date}
      </span>
    </div>
  );
}
