'use client';

import { BookOpen, Globe, ClipboardList, Stethoscope, FileText, CheckSquare, Play, Activity, Code, Image, TrendingUp, Calculator, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { AGENT_TOOLS, type AgentTool } from '@/lib/constants';
import { useState } from 'react';

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen, Globe, ClipboardList, Stethoscope, FileText, CheckSquare, Play, Activity, Code, Image, TrendingUp, Calculator, Wrench,
};

interface ToolBarProps {
  activeAgent: string;
  calledTools?: string[]; // IDs of tools that have been called in current session
}

export function ToolBar({ activeAgent, calledTools = [] }: ToolBarProps) {
  const tools = AGENT_TOOLS[activeAgent] || AGENT_TOOLS.hub;
  const [collapsed, setCollapsed] = useState(false);

  if (tools.length === 0) return null;

  return (
    <div className="border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-sm">
      {/* Tool bar header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-[#00D9FF]/60" />
          <span className="text-xs text-white/40 font-medium">可用工具</span>
          <span className="text-xs text-white/25">({tools.length})</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Tool list */}
      {!collapsed && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
          {tools.map((tool) => {
            const IconComponent = TOOL_ICONS[tool.icon] || Wrench;
            const isCalled = calledTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                className={`
                  group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-200
                  ${isCalled
                    ? 'bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
                  }
                `}
                title={tool.description}
              >
                <IconComponent className={`w-3 h-3 ${isCalled ? 'text-[#00D9FF]' : 'text-white/30'}`} />
                <span className="font-mono text-[11px]">{tool.name}</span>
                {isCalled && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
