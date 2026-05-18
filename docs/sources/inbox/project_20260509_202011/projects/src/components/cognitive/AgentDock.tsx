'use client';

import { cn } from '@/lib/utils';
import { useAgent } from '@/hooks/useAgent';
import { AGENT_MAP, AGENT_ICONS } from '@/lib/constants';
import type { AgentType } from '@/types';

interface AgentDockItemProps {
  agentId: AgentType;
  isActive: boolean;
  onClick: () => void;
}

function AgentDockItem({ agentId, isActive, onClick }: AgentDockItemProps) {
  const config = AGENT_MAP[agentId];
  if (!config) return null;

  const Icon = AGENT_ICONS[agentId];

  return (
    <button
      onClick={onClick}
      className={cn(
        'dock-item group relative flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200',
        isActive
          ? 'bg-[var(--aifs-accent)]/20 text-[var(--aifs-accent)] glow-border'
          : 'text-[var(--aifs-text-secondary)] hover:text-[var(--aifs-accent)]'
      )}
    >
      {/* Icon */}
      <div className={cn('relative', isActive && 'breathe-subtle')}>
        {Icon ? <Icon className="w-5 h-5" /> : <span className="w-5 h-5 flex items-center justify-center text-xs font-mono">{config.name[0]}</span>}
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-xs font-medium whitespace-nowrap transition-all',
          isActive ? 'text-[var(--aifs-accent)]' : 'opacity-70 group-hover:opacity-100'
        )}
      >
        {config.name}
      </span>

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 px-3 py-1.5 rounded-lg glass text-xs text-[var(--aifs-text-primary)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
        {config.desc}
      </div>
    </button>
  );
}

const DOCK_AGENTS: AgentType[] = ['hub', 'help', 'diagnosis', 'demand', 'debugging', 'monitoring', 'material', 'prediction'];

export function AgentDock() {
  const { setCurrentAgent, uiState } = useAgent();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {/* Dock Container */}
      <div className="glass-strong rounded-3xl px-4 py-3 flex items-center gap-1">
        {DOCK_AGENTS.map((agentId, index) => (
          <div key={agentId} className="flex items-center">
            <AgentDockItem
              agentId={agentId}
              isActive={agentId === uiState.activeAgent}
              onClick={() => setCurrentAgent(agentId)}
            />
            {/* Divider after hub */}
            {index === 0 && (
              <div className="w-px h-8 mx-2 bg-[var(--aifs-border)]" />
            )}
          </div>
        ))}
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-[var(--aifs-accent)] to-transparent opacity-50" />
    </div>
  );
}
