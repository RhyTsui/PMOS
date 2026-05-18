'use client';

import { useRef, useEffect, useMemo } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolBar } from './ToolBar';
import { Sparkles } from 'lucide-react';
import { STARTER_QUESTIONS } from '@/lib/constants';
import type { Message } from '@/types';
import type { AgentMeta } from '@/hooks/useConversation';

interface ChatContainerProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  currentAgent?: string;
  agentMeta?: Map<string, AgentMeta>;
}

export function ChatContainer({ messages, isTyping, onSendMessage, currentAgent = 'hub', agentMeta }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Collect all called tool IDs from agentMeta
  const calledTools = useMemo(() => {
    const toolIds = new Set<string>();
    if (agentMeta) {
      agentMeta.forEach((meta) => {
        (meta.toolCalls ?? []).forEach((tc) => toolIds.add(tc.name));
      });
    }
    return Array.from(toolIds);
  }, [agentMeta]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const hasUserMessages = messages.some(m => m.role === 'user');

  return (
    <div className="h-full flex flex-col">
      {/* Tool bar at the top */}
      <ToolBar activeAgent={currentAgent} calledTools={calledTools} />
      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
        {/* Welcome / Starter Questions (only when no user messages) */}
        {!hasUserMessages && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(0,217,255,0.1)] flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-[#00D9FF]" />
            </div>
            <h2 className="text-lg font-medium text-[#c8d6e5] mb-1">小乔智投工作台</h2>
            <p className="text-sm text-[#8B9DC3] mb-6">直接描述问题或需求，自动识别业务流</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {STARTER_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(q.label)}
                  className="text-left p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(0,217,255,0.06)] hover:border-[rgba(0,217,255,0.15)] transition-colors"
                >
                  <div className="text-xs text-[#c8d6e5]">{q.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            meta={agentMeta?.get(message.id)}
          />
        ))}

        {/* Typing Indicator */}
        {isTyping && !messages.some(m => m.role === 'assistant' && m.content === '') && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[rgba(0,217,255,0.15)] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
