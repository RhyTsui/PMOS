'use client';

import { BookOpen, Bot, Globe, Search } from 'lucide-react';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-white/80 mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold text-white/80 mt-3 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-semibold text-white/90 mt-3 mb-1">{line.slice(2)}</h1>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} className="flex gap-2"><span className="text-white/30">-</span><span>{line.slice(2)}</span></div>;
        const numMatch = line.match(/^(\d+)\.\s/);
        if (numMatch) return <div key={i} className="flex gap-2"><span className="text-white/30 min-w-[1.2em]">{numMatch[1]}.</span><span>{line.slice(numMatch[0].length)}</span></div>;
        if (line.trim() === '') return <div key={i} className="h-2" />;
        return <span key={i}>{line}</span>;
      })}
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const meta = message.metadata as Record<string, unknown> | undefined;
  const toolCalls = (meta?.tool_calls as Array<{ name: string; result?: string }>) || [];
  const routeInfo = meta?.route as { intent_type?: string; workflow_level?: string } | undefined;

  if (isSystem) return null;

  return (
    <div className={`px-5 py-4 ${isUser ? '' : 'bg-white/[0.01]'}`}>
      <div className="max-w-3xl mx-auto">
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-md bg-[#175CD3]/15 flex items-center justify-center">
              <Bot className="w-3 h-3 text-[#4f8ff7]" />
            </div>
            <span className="text-xs text-white/30 font-medium">小乔智投</span>
            {routeInfo?.intent_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/20 ml-1">
                {routeInfo.intent_type}
              </span>
            )}
          </div>
        )}

        {!isUser && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {toolCalls.map((tool, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px]"
              >
                {tool.name.includes('knowledge') ? (
                  <BookOpen className="w-3 h-3 text-emerald-400/60" />
                ) : tool.name.includes('web') ? (
                  <Globe className="w-3 h-3 text-blue-400/60" />
                ) : (
                  <Search className="w-3 h-3 text-white/30" />
                )}
                <span className="text-white/35 font-mono">{tool.name}</span>
                {tool.result && <span className="text-white/15 ml-1">✓</span>}
              </div>
            ))}
          </div>
        )}

        <div className={`${isUser ? 'text-white/85' : 'text-white/70'}`}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <SimpleMarkdown content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}
