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
        'group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-150 text-left',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/40 hover:bg-white/5 hover:text-white/70'
      )}
    >
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
        isActive ? 'bg-[#175CD3] text-white' : 'bg-white/5 text-white/40 group-hover:bg-white/10'
      )}>
        {Icon ? <Icon className="w-4 h-4" /> : <span className="text-xs font-mono">{config.name[0]}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-sm font-medium truncate',
          isActive ? 'text-white' : 'text-white/50 group-hover:text-white/70'
        )}>
          {config.name}
        </div>
        <div className="text-[11px] text-white/25 truncate mt-0.5">{config.desc}</div>
      </div>
      {isActive && (
        <div className="w-1 h-4 rounded-full bg-[#175CD3]" />
      )}
    </button>
  );
}

const DOCK_AGENTS: AgentType[] = ['hub', 'help', 'diagnosis', 'demand', 'debugging', 'monitoring', 'material', 'prediction'];

export function AgentDock() {
  const { setCurrentAgent, uiState } = useAgent();

  return (
    <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#0a0e1a] flex flex-col">
      {/* Agent groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* Core flows */}
        <div className="px-3 py-1.5">
          <span className="text-[11px] font-medium text-white/20 uppercase tracking-wider">核心业务流</span>
        </div>
        {DOCK_AGENTS.slice(0, 5).map((agentId) => (
          <AgentDockItem
            key={agentId}
            agentId={agentId}
            isActive={agentId === uiState.activeAgent}
            onClick={() => setCurrentAgent(agentId)}
          />
        ))}

        {/* Special pages */}
        <div className="px-3 py-1.5 mt-2">
          <span className="text-[11px] font-medium text-white/20 uppercase tracking-wider">专项能力</span>
        </div>
        {DOCK_AGENTS.slice(5).map((agentId) => (
          <AgentDockItem
            key={agentId}
            agentId={agentId}
            isActive={agentId === uiState.activeAgent}
            onClick={() => setCurrentAgent(agentId)}
          />
        ))}
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-[11px] text-white/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>系统在线</span>
        </div>
      </div>
    </aside>
  );
}
