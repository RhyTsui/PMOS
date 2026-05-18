'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types';
import { Bot, User, AlertCircle, Loader2, HelpCircle, Stethoscope, FileText, Wrench, ListTodo, ChevronDown, ChevronRight, Search, BookOpen, Globe, Brain, Zap } from 'lucide-react';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AgentMeta, ToolCallRecord } from '@/hooks/useConversation';

const intentIcons: Record<string, React.ElementType> = {
  help: HelpCircle,
  diagnosis: Stethoscope,
  demand: FileText,
  debugging: Wrench,
};

const intentLabels: Record<string, string> = {
  help: '使用帮助',
  diagnosis: '问题排查',
  demand: '需求沟通',
  debugging: '广告联调',
};

const toolIcons: Record<string, React.ElementType> = {
  knowledge_search: BookOpen,
  web_search: Globe,
};

const toolLabels: Record<string, string> = {
  knowledge_search: '知识库搜索',
  web_search: '网络搜索',
};

interface MessageBubbleProps {
  message: Message;
  meta?: AgentMeta;
}

export function MessageBubble({ message, meta }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isLoading = message.content === '' && meta?.phase !== 'done';
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const [toolCallsExpanded, setToolCallsExpanded] = useState(true);

  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('###')) {
        return (
          <p key={i} className="font-semibold text-[var(--aifs-text-primary)] mt-3 mb-1 text-sm">
            {line.replace(/^###\s*/, '')}
          </p>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="font-semibold text-[var(--aifs-text-primary)] mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('```')) {
        return null;
      }
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim() && !c.includes('---'));
        if (cells.length > 0) {
          return (
            <div key={i} className="flex flex-wrap gap-2 py-1">
              {cells.map((cell, j) => (
                <span key={j} className="text-sm text-[var(--aifs-text-secondary)]">
                  {cell.trim()}
                </span>
              ))}
            </div>
          );
        }
        return null;
      }
      if (line.startsWith('- ') || line.match(/^\d+\./)) {
        return (
          <li key={i} className="text-[var(--aifs-text-secondary)] ml-4 list-disc">
            {line.replace(/^[\d]+\.\s|^-\s/, '')}
          </li>
        );
      }
      if (!line.trim()) {
        return <br key={i} />;
      }
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-[var(--aifs-text-secondary)] leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={j} className="text-[var(--aifs-text-primary)] font-medium">
                  {part.replace(/\*\*/g, '')}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: { language: string; code: string }[] = [];
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }
    return blocks;
  };

  const codeBlocks = extractCodeBlocks(message.content);
  const textContent = message.content.replace(/```[\w]*\n[\s\S]*?```/g, '');

  // Phase indicator for active agent
  const phaseLabel: Record<string, string> = {
    thinking: '正在思考',
    tool_calling: '调用工具',
    generating: '生成回复',
    done: '完成',
  };

  return (
    <div
      className={cn(
        'flex gap-3 message-enter',
        isUser && 'flex-row-reverse',
        isSystem && 'justify-center'
      )}
      style={{ animationDelay: '0ms' }}
    >
      {/* Avatar */}
      {!isSystem && (
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            isUser
              ? 'bg-[var(--aifs-accent)]/20 text-[var(--aifs-accent)]'
              : 'glass text-[var(--aifs-accent)]'
          )}
        >
          {isUser ? (
            <User className="w-5 h-5" />
          ) : isLoading && meta?.phase !== 'done' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Bot className="w-5 h-5" />
          )}
        </div>
      )}

      {/* System Message */}
      {isSystem && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-xs text-[var(--aifs-text-muted)]">
          <AlertCircle className="w-3 h-3" />
          <span>{message.content}</span>
        </div>
      )}

      {/* Content */}
      {!isSystem && (
        <div
          className={cn(
            'flex-1 max-w-[80%]',
            isUser && 'flex flex-col items-end'
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center gap-2 mb-1',
              isUser && 'flex-row-reverse'
            )}
          >
            <span className="text-xs font-medium text-[var(--aifs-text-secondary)]">
              {isUser ? '你' : '小乔'}
            </span>
            <span className="text-xs text-[var(--aifs-text-muted)]">
              {formatDistanceToNow(message.timestamp, {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
            {/* Intent type badge */}
            {!isUser && message.intent_type && message.intent_type !== 'general' && (
              <div className="flex items-center gap-1 ml-1">
                {(() => {
                  const Icon = intentIcons[message.intent_type!];
                  return Icon ? <Icon className="w-3 h-3 text-[var(--aifs-accent)]" /> : null;
                })()}
                <span className="text-[10px] text-[var(--aifs-accent)]">
                  {intentLabels[message.intent_type!]}
                </span>
              </div>
            )}
            {/* Phase indicator */}
            {!isUser && meta?.phase && meta.phase !== 'done' && (
              <div className="flex items-center gap-1 ml-1">
                {meta.phase === 'thinking' && <Brain className="w-3 h-3 text-amber-400 animate-pulse" />}
                {meta.phase === 'tool_calling' && <Zap className="w-3 h-3 text-blue-400 animate-pulse" />}
                {meta.phase === 'generating' && <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />}
                <span className="text-[10px] text-[var(--aifs-text-muted)]">
                  {phaseLabel[meta.phase]}
                </span>
              </div>
            )}
          </div>

          {/* Bubble */}
          <div
            className={cn(
              'rounded-2xl px-4 py-3',
              isUser
                ? 'bg-[var(--aifs-accent)]/10 border border-[var(--aifs-accent)]/30 rounded-tr-sm'
                : 'glass rounded-tl-sm'
            )}
          >
            {/* Thinking Chain */}
            {!isUser && meta?.thinking && meta.thinking.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setThinkingExpanded(!thinkingExpanded)}
                  className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
                >
                  {thinkingExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Brain className="w-3 h-3" />
                  <span>思维链</span>
                  <span className="text-[var(--aifs-text-muted)]">
                    ({meta.thinking.length}字)
                  </span>
                </button>
                {thinkingExpanded && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-200/70 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {meta.thinking}
                  </div>
                )}
              </div>
            )}

            {/* Tool Calls */}
            {!isUser && meta?.toolCalls && meta.toolCalls.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setToolCallsExpanded(!toolCallsExpanded)}
                  className="flex items-center gap-1.5 text-xs text-blue-400/80 hover:text-blue-400 transition-colors"
                >
                  {toolCallsExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Zap className="w-3 h-3" />
                  <span>工具调用</span>
                  <span className="text-[var(--aifs-text-muted)]">
                    ({meta.toolCalls.filter(tc => tc.status === 'done').length}/{meta.toolCalls.length})
                  </span>
                </button>
                {toolCallsExpanded && (
                  <div className="mt-2 space-y-2">
                    {meta.toolCalls.map((tc, i) => (
                      <ToolCallCard key={i} toolCall={tc} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading state */}
            {isLoading ? (
              <div className="flex items-center gap-2 text-[var(--aifs-text-secondary)]">
                {meta?.phase === 'thinking' ? (
                  <span className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span className="loading-dots">正在分析问题</span>
                  </span>
                ) : meta?.phase === 'tool_calling' ? (
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    <span className="loading-dots">正在检索信息</span>
                  </span>
                ) : (
                  <span className="loading-dots">正在思考</span>
                )}
              </div>
            ) : (
              <>
                {/* Text content */}
                <div className="space-y-1">{parseMarkdown(textContent)}</div>

                {/* Code blocks */}
                {codeBlocks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {codeBlocks.map((block, i) => (
                      <CodeBlock
                        key={i}
                        language={block.language}
                        code={block.code}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Task created indicator */}
            {!isUser && message.task_id && (
              <div className="mt-2 pt-2 border-t border-[var(--aifs-border)] border-opacity-30 flex items-center gap-2">
                <ListTodo className="w-3 h-3 text-[var(--aifs-accent)]" />
                <span className="text-[10px] text-[var(--aifs-text-secondary)]">
                  任务 {message.task_id}
                </span>
                <StatusBadge status="active" label="查看结果" size="sm" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tool call card showing name, query, and result */
function ToolCallCard({ toolCall }: { toolCall: ToolCallRecord }) {
  const Icon = toolIcons[toolCall.name] || Search;
  const label = toolLabels[toolCall.name] || toolCall.name;

  return (
    <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-blue-300">{label}</span>
        <span className="text-[10px] text-[var(--aifs-text-muted)]">
          查询: {toolCall.query}
        </span>
        {toolCall.status === 'calling' && (
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin ml-auto" />
        )}
        {toolCall.status === 'done' && (
          <span className="text-[10px] text-emerald-400 ml-auto">完成</span>
        )}
        {toolCall.status === 'error' && (
          <span className="text-[10px] text-red-400 ml-auto">失败</span>
        )}
      </div>
      {toolCall.result && (
        <div className="text-xs text-[var(--aifs-text-secondary)] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap pl-5.5">
          {toolCall.result.length > 300
            ? toolCall.result.substring(0, 300) + '...'
            : toolCall.result}
        </div>
      )}
    </div>
  );
}
