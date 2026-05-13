'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip, notification } from 'antd';
import { ArrowUp, Keyboard, Mic, Paperclip, X } from 'lucide-react';
import type { AgentType } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';

const AGENT_OPTIONS: Array<{
  key: AgentType;
  label: string;
  colorVar: string;
}> = [
  { key: 'demand', label: '需求跟踪', colorVar: '--flow-demand' },
  { key: 'diagnosis', label: '排查记录', colorVar: '--flow-diagnosis' },
  { key: 'debugging', label: '联调记录', colorVar: '--aifs-success' },
];

interface ReferencedAsset {
  id: string;
  title: string;
  type: string;
}

interface InputAreaProps {
  onSend: (message: string) => void;
  onAgentChange: (agent: AgentType) => void;
  currentAgent?: AgentType;
  disabled?: boolean;
  onFileUpload?: (files: FileList) => void;
  longTextThreshold?: number;
  onToggleAutoSpeak?: () => void;
  autoSpeakEnabled?: boolean;
  referencedAssets?: ReferencedAsset[];
  onRemoveReferencedAsset?: (assetId: string) => void;
  draftValue?: string;
  onDraftConsumed?: () => void;
  placeholder?: string;
  hideAgentOptions?: boolean;
  onOpenAgentPanel?: (agent: AgentType) => void;
}

export default function InputArea({
  onSend,
  onAgentChange,
  currentAgent,
  disabled = false,
  onFileUpload,
  longTextThreshold = 2000,
  onToggleAutoSpeak,
  referencedAssets = [],
  onRemoveReferencedAsset,
  draftValue,
  onDraftConsumed,
  placeholder = '发消息或按住说话',
  hideAgentOptions = false,
  onOpenAgentPanel,
}: InputAreaProps) {
  const c = useThemeColors();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [pasteFileHint, setPasteFileHint] = useState<string | null>(null);
  const [mobileInputMode, setMobileInputMode] = useState<'voice' | 'text'>(isMobile ? 'voice' : 'text');

  const activeAgent = AGENT_OPTIONS.find((item) => item.key === currentAgent) || AGENT_OPTIONS[0];

  const activeColor = useMemo(() => {
    if (typeof window === 'undefined') return c.accent;
    return getComputedStyle(document.documentElement).getPropertyValue(activeAgent.colorVar).trim() || c.accent;
  }, [activeAgent.colorVar, c.accent]);

  const isMobileVoiceMode = isMobile && mobileInputMode === 'voice' && !value.trim();
  const canSubmit = !disabled;
  const hasContent = value.trim().length > 0;

  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 52), 168)}px`;
  }, []);

  const submitMessage = useCallback(() => {
    const payload = value.trim();
    if (!payload || disabled) return;
    onSend(payload);
    setValue('');
    if (isMobile) {
      setMobileInputMode('voice');
    }
    requestAnimationFrame(() => {
      resizeTextarea();
      textareaRef.current?.focus();
    });
  }, [disabled, isMobile, onSend, resizeTextarea, value]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && onFileUpload) {
      onFileUpload(event.target.files);
    }
    event.target.value = '';
  }, [onFileUpload]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text/plain');
    if (pastedText.length <= longTextThreshold || !onFileUpload) return;

    event.preventDefault();
    const blob = new Blob([pastedText], { type: 'text/plain' });
    const file = new File([blob], `paste-${Date.now()}.txt`, { type: 'text/plain' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    onFileUpload(dataTransfer.files);

    setPasteFileHint(`已将 ${pastedText.length} 字内容转为附件。`);
    notification.info({
      message: '长文本已转为附件',
      description: `粘贴内容超过 ${longTextThreshold} 字，系统已自动转成文本附件。`,
      placement: 'bottomRight',
      duration: 3,
    });

    window.setTimeout(() => setPasteFileHint(null), 2400);
  }, [longTextThreshold, onFileUpload]);

  useEffect(() => {
    if (!isMobile) {
      setMobileInputMode('text');
      const timer = window.setTimeout(() => {
        textareaRef.current?.focus();
        resizeTextarea();
      }, 80);
      return () => window.clearTimeout(timer);
    }

    setMobileInputMode((prev) => (prev === 'text' ? 'text' : 'voice'));
    return undefined;
  }, [isMobile, resizeTextarea]);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value, mobileInputMode, referencedAssets.length]);

  useEffect(() => {
    if (!isMobile || mobileInputMode !== 'text') return;
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isMobile, mobileInputMode]);

  useEffect(() => {
    if (!draftValue) return;
    setValue(draftValue);
    setMobileInputMode('text');
    onDraftConsumed?.();
    window.setTimeout(() => {
      resizeTextarea();
      textareaRef.current?.focus();
    }, 60);
  }, [draftValue, onDraftConsumed, resizeTextarea]);

  return (
    <div
      className="relative"
      style={{
        padding: isMobile ? '10px 18px calc(env(safe-area-inset-bottom, 0px) + 12px)' : '12px 18px 18px',
      }}
    >
      <div style={{ maxWidth: isMobile ? '100%' : 920, margin: '0 auto' }}>
        {!hideAgentOptions && <div className="flex min-w-0 flex-wrap items-center gap-2" style={{ marginBottom: 10, padding: '0 2px' }}>
          {AGENT_OPTIONS.map((agent) => {
            const isActive = currentAgent === agent.key;
            const agentColor = typeof window === 'undefined'
              ? c.accent
              : getComputedStyle(document.documentElement).getPropertyValue(agent.colorVar).trim() || c.accent;

            return (
              <button
                key={agent.key}
                type="button"
                onClick={() => {
                  onAgentChange(agent.key);
                  onOpenAgentPanel?.(agent.key);
                }}
                className="rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  padding: '8px 12px',
                  background: isActive ? `${agentColor}16` : c.bgSubtle,
                  border: `1px solid ${isActive ? `${agentColor}35` : c.borderFaint}`,
                  color: isActive ? agentColor : c.textMuted,
                }}
              >
                {agent.label}
              </button>
            );
          })}
        </div>}

        {pasteFileHint && (
          <div
            style={{
              marginBottom: 6,
              padding: '8px 12px',
              borderRadius: 12,
              background: c.accentBgFaint,
              border: `1px solid ${c.accentBorder}`,
              color: c.accent,
              fontSize: 12,
            }}
          >
            {pasteFileHint}
          </div>
        )}

        <div
          style={{
            position: 'relative',
            borderRadius: 28,
            background: focused ? c.inputBgFocused : c.inputBg,
            border: `1px solid ${focused ? c.borderActive : c.border}`,
            boxShadow: focused ? `0 0 0 2px ${c.accentGlow}` : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {referencedAssets.length > 0 && (
            <div
              style={{
                padding: '12px 14px 0 14px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {referencedAssets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: '100%',
                    borderRadius: 999,
                    padding: '6px 10px',
                    background: c.accentBgFaint,
                    border: `1px solid ${c.accentBorder}`,
                    color: c.textSecondary,
                    fontSize: 12,
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {asset.title}
                  </span>
                  {onRemoveReferencedAsset && (
                    <button
                      type="button"
                      onClick={() => onRemoveReferencedAsset(asset.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: c.textMuted,
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isMobileVoiceMode ? (
            <div
              style={{
                minHeight: 56,
                padding: `${referencedAssets.length > 0 ? 8 : 10}px 96px 10px 58px`,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onMouseDown={() => onToggleAutoSpeak?.()}
                onTouchStart={() => onToggleAutoSpeak?.()}
                style={{
                  width: '100%',
                  minHeight: 36,
                  borderRadius: 999,
                  border: `1px dashed ${c.borderFaint}`,
                  background: c.bgCard,
                  color: c.textSecondary,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                按住说话
              </button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              rows={2}
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onPaste={handlePaste}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage();
                }
              }}
              style={{
                width: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: c.textPrimary,
                padding: `${referencedAssets.length > 0 ? 10 : 14}px 92px 14px 58px`,
                minHeight: 56,
                maxHeight: 168,
                lineHeight: '22px',
                fontSize: 15,
                borderRadius: 28,
                caretColor: activeColor,
                overflowY: 'auto',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 11,
            }}
          >
            <button
              type="button"
              aria-label="添加附件"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: `1px solid ${c.borderFaint}`,
                background: c.bgCard,
                color: c.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Paperclip size={16} />
            </button>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isMobile && !hasContent && (
              <Tooltip title={mobileInputMode === 'voice' ? '切换输入' : '切换语音'}>
                <button
                  type="button"
                  aria-label={mobileInputMode === 'voice' ? '切换输入' : '切换语音'}
                  onClick={() => {
                    const nextMode = mobileInputMode === 'voice' ? 'text' : 'voice';
                    setMobileInputMode(nextMode);
                    if (nextMode === 'voice') {
                      setFocused(false);
                    }
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: `1px solid ${mobileInputMode === 'text' ? c.accentBorder : c.borderFaint}`,
                    background: mobileInputMode === 'text' ? c.accentBg : c.bgCard,
                    color: mobileInputMode === 'text' ? c.accent : c.textMuted,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {mobileInputMode === 'voice' ? <Keyboard size={16} /> : <Mic size={16} />}
                </button>
              </Tooltip>
            )}

            <button
              type="button"
              onClick={submitMessage}
              disabled={!canSubmit}
              aria-label="发送"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: `1px solid ${hasContent ? c.accent : c.borderFaint}`,
                background: hasContent ? c.accent : c.bgCard,
                color: hasContent ? '#fff' : c.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: hasContent ? `0 0 16px ${c.accentGlow}` : 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowUp size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".csv,.xlsx,.xls,.txt,.log,.json,.pdf,.doc,.docx,image/*,video/*"
            onChange={handleFileChange}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            lineHeight: 1.7,
            color: c.textMuted,
            textAlign: 'center',
          }}
        >
          内容由 AI 生成，请仔细甄辨，保护用户隐私和公司数据是员工责任，禁止向无权限者提供敏感信息。
        </div>
      </div>
    </div>
  );
}
