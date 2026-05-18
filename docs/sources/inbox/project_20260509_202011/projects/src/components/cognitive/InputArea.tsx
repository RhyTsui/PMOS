'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Sparkles } from 'lucide-react';
import { AttachmentBar } from '@/components/cognitive/AttachmentBar';
import { ContextSummaryBar } from '@/components/cognitive/ContextSummaryBar';
import { useAgent } from '@/hooks/useAgent';
import type { AttachmentRecord, IntentType, ConversationMode, TaskContext } from '@/types';

interface InputAreaProps {
  onSendMessage: (content: string) => void;
  isTyping: boolean;
  currentRouting?: {
    intent_type: IntentType;
    is_business_related: boolean;
  } | null;
  conversationMode?: ConversationMode | null;
  taskContext?: TaskContext | null;
}

const intentLabels: Record<string, string> = {
  help: '使用帮助',
  demand: '需求沟通',
  diagnosis: '问题排查',
  debugging: '广告联调',
  general: '普通对话',
  monitor: '监控大屏',
  'material-analysis': '素材分析',
  forecast: '广告预测',
};

export function InputArea({
  onSendMessage,
  isTyping,
  currentRouting,
  conversationMode,
  taskContext,
}: InputAreaProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { attachments, addAttachment, removeAttachment } = useAgent();

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    onSendMessage(input.trim());
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [input, isTyping, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const handleUpload = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      const kind = file.type.startsWith('image/') ? 'image' as const
        : file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? 'table' as const
        : file.name.endsWith('.log') || file.name.endsWith('.txt') ? 'log' as const
        : 'document' as const;

      const attachment: AttachmentRecord = {
        id: `att_new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        conversation_id: 'conv_new',
        name: file.name,
        filename: file.name,
        kind,
        type: kind,
        mime_type: file.type,
        size: file.size,
        status: 'uploading',
        created_at: new Date().toISOString(),
      };
      addAttachment(attachment);

      // Simulate upload
      setTimeout(() => {
        addAttachment({ ...attachment, status: 'parsed', summary: `${file.name} 已解析` });
      }, 1500);
    });
  }, [addAttachment]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const dt = new DataTransfer();
          dt.items.add(file);
          handleUpload(dt.files);
        }
        break;
      }
    }
  }, [handleUpload]);

  return (
    <div className="border-t border-[rgba(255,255,255,0.06)]">
      {/* Context Summary Bar */}
      <ContextSummaryBar
        taskContext={taskContext || null}
        conversationMode={conversationMode || null}
      />

      {/* Route Badge */}
      {currentRouting && currentRouting.is_business_related && (
        <div className="px-4 py-1.5 border-b border-[rgba(255,255,255,0.04)] flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-[#00D9FF]" />
          <span className="text-[10px] text-[#8B9DC3]">已识别为</span>
          <span className="px-2 py-0.5 rounded-full bg-[rgba(0,217,255,0.1)] text-[#00D9FF] text-[10px] font-medium">
            {intentLabels[currentRouting.intent_type] || currentRouting.intent_type}
          </span>
        </div>
      )}

      {/* Attachments (from context) */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.04)]">
          <AttachmentBar
            attachments={attachments}
            onRemove={removeAttachment}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="描述问题或需求，小乔会自动识别并进入对应业务流..."
            rows={1}
            className="w-full resize-none rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] px-4 py-2.5 pr-10 text-sm text-[#c8d6e5] placeholder-[#5a6a8a] focus:outline-none focus:border-[rgba(0,217,255,0.3)] focus:bg-[rgba(0,217,255,0.03)] transition-colors"
          />
          <label className="absolute right-3 bottom-2.5 cursor-pointer text-[#5a6a8a] hover:text-[#00D9FF] transition-colors">
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.log"
            />
          </label>
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#00D9FF] text-[#0A0E1A] flex items-center justify-center hover:bg-[#00b8d9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
