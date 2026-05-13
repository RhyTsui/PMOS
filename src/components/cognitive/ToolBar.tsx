'use client';

import { BookOpen, Globe, ClipboardList, Stethoscope, FileText, CheckSquare, Play, Activity, Code, Image, TrendingUp, Calculator, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { AGENT_TOOLS } from '@/lib/constants';
import { useState } from 'react';
import { useThemeColors } from '@/hooks/useTheme';

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen, Globe, ClipboardList, Stethoscope, FileText, CheckSquare, Play, Activity, Code, Image, TrendingUp, Calculator, Wrench,
};

interface ToolBarProps {
  activeAgent: string;
  calledTools?: string[];
}

export function ToolBar({ activeAgent, calledTools = [] }: ToolBarProps) {
  const tools = AGENT_TOOLS[activeAgent] || AGENT_TOOLS.hub;
  const [collapsed, setCollapsed] = useState(false);
  const c = useThemeColors();

  if (tools.length === 0) return null;

  return (
    <div style={{
      borderBottom: `1px solid ${c.border}`,
      background: c.bgContainer,
      backdropFilter: 'blur(8px)',
    }}>
      {/* Tool bar header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: c.accent, opacity: 0.6 }}><Wrench className="w-3.5 h-3.5" /></span>
          <span style={{ fontSize: 12, color: c.textMuted, fontWeight: 500 }}>可用工具</span>
          <span style={{ fontSize: 12, color: c.textSubtle }}>({tools.length})</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: c.textSubtle, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s', padding: 0, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = c.textMuted}
          onMouseLeave={e => e.currentTarget.style.color = c.textSubtle}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Tool list */}
      {!collapsed && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 10px' }}>
          {tools.map((tool) => {
            const IconComponent = TOOL_ICONS[tool.icon] || Wrench;
            const isCalled = calledTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  transition: 'all 0.2s',
                  background: isCalled ? c.accentSoft : c.bgCard,
                  color: isCalled ? c.accent : c.textMuted,
                  border: `1px solid ${isCalled ? `${c.accent}4D` : c.border}`,
                  cursor: 'default',
                }}
                title={tool.description}
              >
                <span style={{ color: isCalled ? c.accent : c.textSubtle, display: 'flex' }}>
                  <IconComponent className="w-3 h-3" />
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{tool.name}</span>
                {isCalled && (
                  <span style={{
                    marginLeft: 2, width: 6, height: 6,
                    borderRadius: '50%', background: c.accent,
                    animation: 'pulse 2s ease-in-out infinite',
                    display: 'inline-block',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
