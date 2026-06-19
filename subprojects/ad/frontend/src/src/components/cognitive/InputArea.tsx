'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Tooltip } from 'antd';
import { ArrowUp, Keyboard, Loader2, Mic, Paperclip, Square, X } from 'lucide-react';
import type { AgentType, AttachmentRecord } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { ZHITOU_CHAT_COLORS } from '@/lib/zhitou-chat-colors';
import { AssetPreview } from './AssetPreview';
import type { ComposerRecommendation } from './message-presentation-projection';

const AGENT_OPTIONS: Array<{
  key: AgentType;
  label: string;
  colorVar: string;
}> = [
  { key: 'demand', label: '需求跟踪', colorVar: '--flow-demand' },
  { key: 'diagnosis', label: '排查记录', colorVar: '--flow-diagnosis' },
  { key: 'debugging', label: '联调记录', colorVar: '--aifs-success' },
  { key: 'delivery', label: '验流程', colorVar: '--flow-info' },
];

const AGENT_COLOR_FALLBACK: Partial<Record<AgentType, string>> = {
  demand: ZHITOU_CHAT_COLORS.info,
  diagnosis: ZHITOU_CHAT_COLORS.danger,
  debugging: ZHITOU_CHAT_COLORS.success,
  delivery: ZHITOU_CHAT_COLORS.primary,
};

const BRAND_BLUE = ZHITOU_CHAT_COLORS.primary;
const BRAND_BORDER_SUBTLE = '#BBD1FE';
const BRAND_FOCUS_RING = 'rgba(46, 117, 254, 0.06)';
const BRAND_SOFT_BG = ZHITOU_CHAT_COLORS.primarySoftBg;
const COMPOSER_CONTROL_RADIUS = 10;
const COMPOSER_MAIN_RADIUS = 20;
const MODEL_STATUS_LOAD_DELAY_MS = 2500;

type RecommendationItem = {
  title: string;
  description: string;
  prompt: string;
};

interface ReferencedAsset {
  id: string;
  title: string;
  type: string;
}

interface ModelRuntimeStatus {
  connected: boolean;
  loading: boolean;
  modelName: string;
}

interface InputAreaProps {
  onSend: (message: string) => void;
  onStopGeneration?: () => void;
  onAgentChange: (agent: AgentType) => void;
  currentAgent?: AgentType;
  disabled?: boolean;
  statusHint?: {
    type: 'info' | 'error';
    text: string;
  };
  isSending?: boolean;
  onFileUpload?: (files: FileList | File[], sourceType?: 'click' | 'drag' | 'paste') => void;
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
  attachments?: AttachmentRecord[];
  onRemoveAttachment?: (attachmentId: string) => void;
  onRetryAttachment?: (attachmentId: string) => void;
  onPreviewAttachment?: (attachment: AttachmentRecord) => void;
  resultRecommendations?: ComposerRecommendation[];
  showRecommendations?: boolean;
  recommendationConversationId?: string;
  recommendationActiveAgent?: string;
  recommendationProjectContext?: string;
}

function shortenFileName(name: string) {
  if (name.length <= 10) return name;
  const dotIndex = name.lastIndexOf('.');
  const ext = dotIndex > 0 ? name.slice(dotIndex) : '';
  const baseLength = Math.max(4, 10 - ext.length);
  return `${name.slice(0, baseLength)}...${ext}`;
}

function getAttachmentPreviewFormat(attachment: AttachmentRecord) {
  const name = attachment.name.toLowerCase();
  if (attachment.kind === 'image') return name.endsWith('.jpg') || name.endsWith('.jpeg') ? 'JPG' : name.endsWith('.webp') ? 'WEBP' : 'PNG';
  if (attachment.kind === 'video') return name.endsWith('.mov') ? 'MOV' : 'MP4';
  if (attachment.kind === 'table') return name.endsWith('.csv') ? 'CSV' : 'Excel';
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word';
  if (name.endsWith('.txt') || name.endsWith('.log')) return 'TXT';
  return '文件';
}

function getAttachmentPreviewTone(attachment: AttachmentRecord) {
  const format = getAttachmentPreviewFormat(attachment);
  if (attachment.kind === 'video') return '#7c3aed';
  if (attachment.kind === 'image') return '#0ea5e9';
  if (format === 'Excel' || format === 'CSV' || attachment.kind === 'table') return '#16a34a';
  return '#4f7cff';
}

function normalizeRecommendations(payload: unknown): RecommendationItem[] {
  const source = (() => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, any>;
      if (Array.isArray(record.items)) return record.items;
      if (Array.isArray(record.recommendations)) return record.recommendations;
      if (Array.isArray(record.data)) return record.data;
      if (record.data && Array.isArray(record.data.items)) return record.data.items;
      if (record.result && Array.isArray(record.result.items)) return record.result.items;
    }
    return [];
  })();

  return source
    .slice(0, 3)
    .map((item: any) => ({
      title: String(item?.title || item?.name || ''),
      description: String(item?.description || item?.reason || item?.desc || ''),
      prompt: String(item?.prompt || item?.text || ''),
    }))
    .filter((item: RecommendationItem) => item.title && item.prompt);
}

function fileExtensionFromMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('jpeg')) return 'jpg';
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  return 'png';
}

export default function InputArea({
  onSend,
  onStopGeneration,
  onAgentChange,
  currentAgent,
  disabled = false,
  statusHint,
  isSending = false,
  onFileUpload,
  longTextThreshold = 2000,
  onToggleAutoSpeak,
  referencedAssets = [],
  onRemoveReferencedAsset,
  draftValue,
  onDraftConsumed,
  placeholder = '输入问题、需求或操作任务',
  hideAgentOptions = false,
  onOpenAgentPanel,
  attachments = [],
  onRemoveAttachment,
  onRetryAttachment,
  onPreviewAttachment,
  resultRecommendations = [],
  showRecommendations = false,
  recommendationConversationId,
  recommendationActiveAgent,
  recommendationProjectContext,
}: InputAreaProps) {
  const { notification } = App.useApp();
  const c = useThemeColors();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [pasteFileHint, setPasteFileHint] = useState<string | null>(null);
  const [mobileInputMode, setMobileInputMode] = useState<'voice' | 'text'>(isMobile ? 'voice' : 'text');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [localSending, setLocalSending] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [modelRuntimeStatus, setModelRuntimeStatus] = useState<ModelRuntimeStatus>({
    connected: false,
    loading: true,
    modelName: '检测中',
  });
  const localSendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) return;
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [disabled]);

  useEffect(() => {
    let active = true;

    const loadModelRuntimeStatus = async () => {
      try {
        const response = await fetch('/api/xiaoqiao/admin/model-service-config', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error(`unexpected status ${response.status}`);

        const config = await response.json() as {
          enabled?: boolean;
          apiKey?: string;
          baseUrl?: string;
          modelBaseUrl?: string;
          modelName?: string;
        };

        const connected = Boolean(
          config.enabled &&
          config.apiKey &&
          config.baseUrl &&
          config.modelBaseUrl &&
          config.modelName,
        );

        if (!active) return;
        setModelRuntimeStatus({
          connected,
          loading: false,
          modelName: config.modelName?.trim() || '未接通',
        });
      } catch {
        if (!active) return;
        setModelRuntimeStatus({
          connected: false,
          loading: false,
          modelName: '未接通',
        });
      }
    };

    const timer = window.setTimeout(() => {
      void loadModelRuntimeStatus();
    }, MODEL_STATUS_LOAD_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const isMobileVoiceMode = isMobile && mobileInputMode === 'voice' && !value.trim();
  const sending = isSending || localSending;
  const hasContent = value.trim().length > 0;
  const hasReadyAttachment = attachments.some((attachment) => attachment.status === 'parsed');
  const hasInputPayload = hasContent || hasReadyAttachment || referencedAssets.length > 0;
  const sendButtonState = sending ? 'processing' : hasInputPayload ? 'ready' : 'empty';
  const canSubmit = !disabled && sendButtonState === 'ready';
  const canStop = sendButtonState === 'processing' && Boolean(onStopGeneration);
  const sendButtonLabel = sendButtonState === 'processing'
    ? '停止生成'
    : sendButtonState === 'ready'
      ? '发送'
      : '请输入内容';
  const hasComposerHeader = referencedAssets.length > 0 || attachments.length > 0;
  const composerActionPosition: React.CSSProperties = hasComposerHeader
    ? { bottom: 16 }
    : { top: '50%', transform: 'translateY(-50%)' };
  const displayRecommendations = useMemo<RecommendationItem[]>(() => {
    if (!showRecommendations) return [];
    const source = recommendations.length > 0 ? recommendations : resultRecommendations;
    const byPrompt = new Map<string, RecommendationItem>();
    for (const item of source) {
      const title = String(item.title || '').trim();
      const prompt = String(item.prompt || '').trim();
      if (!title || !prompt) continue;
      const key = prompt.toLowerCase();
      if (!byPrompt.has(key)) {
        byPrompt.set(key, {
          title,
          prompt,
          description: String(item.description || '').trim(),
        });
      }
    }
    return [...byPrompt.values()].slice(0, 3);
  }, [recommendations, resultRecommendations, showRecommendations]);

  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 52), 144)}px`;
  }, []);

  const loadRecommendations = useCallback(async () => {
    if (!recommendationConversationId && !recommendationActiveAgent && !recommendationProjectContext) return;
    if (recommendationLoading) return;
    setRecommendationLoading(true);
    try {
      const response = await fetch('/api/xiaoqiao/recommendations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          force: true,
          conversationId: recommendationConversationId,
          activeAgent: recommendationActiveAgent,
          projectContext: recommendationProjectContext,
        }),
      });
      if (!response.ok) {
        setRecommendations([]);
        return;
      }
      const payload = await response.json().catch(() => null);
      const items = payload ? normalizeRecommendations(payload) : [];
      setRecommendations(items);
    } catch {
      setRecommendations([]);
    } finally {
      setRecommendationLoading(false);
    }
  }, [recommendationConversationId, recommendationActiveAgent, recommendationProjectContext, recommendationLoading]);

  const submitMessage = useCallback(() => {
    if (sending && onStopGeneration) {
      if (localSendingTimerRef.current) {
        window.clearTimeout(localSendingTimerRef.current);
        localSendingTimerRef.current = null;
      }
      setLocalSending(false);
      onStopGeneration();
      return;
    }
    const payload = value.trim() || (
      hasReadyAttachment
        ? '请结合已上传的文件继续处理。'
        : referencedAssets.length > 0
          ? '请结合已引用的资料继续处理。'
          : ''
    );
    if (!payload || disabled || sending) return;
    setLocalSending(true);
    if (localSendingTimerRef.current) {
      window.clearTimeout(localSendingTimerRef.current);
    }
    localSendingTimerRef.current = window.setTimeout(() => {
      setLocalSending(false);
      localSendingTimerRef.current = null;
    }, 8000);
    setRecommendations([]);
    onSend(payload);
    void loadRecommendations();
    setValue('');
    if (isMobile) {
      setMobileInputMode('voice');
    }
    requestAnimationFrame(() => {
      resizeTextarea();
      textareaRef.current?.focus();
    });
  }, [disabled, hasReadyAttachment, isMobile, loadRecommendations, onSend, onStopGeneration, referencedAssets.length, resizeTextarea, sending, value]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && onFileUpload) {
      onFileUpload(event.target.files, 'click');
    }
    event.target.value = '';
  }, [onFileUpload]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onFileUpload) return;
    const clipboardItems = Array.from(event.clipboardData.items || []);
    const pastedImages = clipboardItems
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item, index) => {
        const blob = item.getAsFile();
        if (!blob) return null;
        const ext = fileExtensionFromMimeType(blob.type);
        return new File([blob], `screenshot-${Date.now()}-${index + 1}.${ext}`, {
          type: blob.type || 'image/png',
          lastModified: Date.now(),
        });
      })
      .filter((file): file is File => Boolean(file));

    if (pastedImages.length > 0) {
      event.preventDefault();
      onFileUpload(pastedImages, 'paste');
      setPasteFileHint(`已添加 ${pastedImages.length} 张截图。`);
      window.setTimeout(() => setPasteFileHint(null), 2400);
      return;
    }

    const pastedText = event.clipboardData.getData('text/plain');
    if (pastedText.length <= longTextThreshold) return;

    event.preventDefault();
    const blob = new Blob([pastedText], { type: 'text/plain' });
    const file = new File([blob], `paste-${Date.now()}.txt`, { type: 'text/plain' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    onFileUpload(dataTransfer.files, 'paste');

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
    if (isSending) {
      if (localSendingTimerRef.current) {
        window.clearTimeout(localSendingTimerRef.current);
        localSendingTimerRef.current = null;
      }
      setLocalSending(false);
    }
  }, [isSending]);

  useEffect(() => () => {
    if (localSendingTimerRef.current) {
      window.clearTimeout(localSendingTimerRef.current);
    }
  }, []);

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
  }, [resizeTextarea, value, mobileInputMode, referencedAssets.length, attachments.length]);

  useEffect(() => {
    if (attachments.length === 0) return;
    setMobileInputMode('text');
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [attachments.length, resizeTextarea]);

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

  useEffect(() => {
    setRecommendations([]);
    setRecommendationLoading(false);
  }, [showRecommendations, recommendationConversationId, recommendationActiveAgent, recommendationProjectContext]);

  const showRecommendationList = showRecommendations && displayRecommendations.length > 0;

  return (
    <div
      className="xiaoqiao-composer-area relative"
      style={{
        padding: isMobile ? '10px 18px calc(env(safe-area-inset-bottom, 0px) + 12px)' : '12px 18px 18px',
      }}
    >
      <div style={{ maxWidth: isMobile ? '100%' : 776, margin: '0 auto' }}>
        {!hideAgentOptions && <div className="flex min-w-0 flex-wrap items-center gap-2" style={{ width: '100%', maxWidth: '100%', marginBottom: isMobile ? 16 : 10, padding: '0', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          {AGENT_OPTIONS.map((agent) => {
            const isActive = currentAgent === agent.key;
            const agentColor = AGENT_COLOR_FALLBACK[agent.key] || c.accent;

            return (
              <button
                key={agent.key}
                type="button"
                data-composer-control="agent"
                onClick={() => {
                  onAgentChange(agent.key);
                  onOpenAgentPanel?.(agent.key);
                }}
                className="text-xs font-medium transition-all duration-200"
                style={{
                  padding: '8px 12px',
                  borderRadius: COMPOSER_CONTROL_RADIUS,
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

        {showRecommendationList && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 2px 8px' }}>
            {displayRecommendations.map((item) => (
              <Tooltip key={item.title} title={item.description || undefined} placement="top" mouseEnterDelay={0.25} arrow={false}>
                <button
                  type="button"
                  data-composer-control="recommendation"
                  onClick={() => {
                    if (disabled) return;
                    // 直接发送推荐内容，走意图路由和业务流引导
                    setValue(item.prompt);
                    setMobileInputMode('text');
                    // 延迟发送，确保状态已更新
                    window.setTimeout(() => {
                      submitMessage();
                    }, 50);
                  }}
                  style={{
                    height: 30,
                    maxWidth: isMobile ? '100%' : 220,
                    padding: '0 11px',
                    borderRadius: COMPOSER_CONTROL_RADIUS,
                    border: `1px solid ${c.borderFaint}`,
                    background: 'rgba(255,255,255,0.86)',
                    color: c.textSecondary,
                    boxShadow: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    textRendering: 'geometricPrecision',
                    WebkitFontSmoothing: 'antialiased',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'border-color 180ms cubic-bezier(0.4, 0, 0.2, 1), color 180ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {item.title}
                </button>
              </Tooltip>
            ))}
          </div>
        )}

        {statusHint && (
          <div
            style={{
              marginBottom: 6,
              padding: '8px 12px',
              borderRadius: 12,
              background: statusHint.type === 'error' ? '#fff7ed' : c.accentBgFaint,
              border: `1px solid ${statusHint.type === 'error' ? '#fed7aa' : c.accentBorder}`,
              color: statusHint.type === 'error' ? '#9a3412' : c.accent,
              fontSize: 12,
              lineHeight: '18px',
            }}
          >
            {statusHint.text}
          </div>
        )}

        <div
          className="xiaoqiao-input-shell"
          style={{
            position: 'relative',
            borderRadius: COMPOSER_MAIN_RADIUS,
            overflow: 'hidden',
            isolation: 'isolate',
            minHeight: 124,
            background: c.bgCard,
            border: `1px solid ${c.borderFaint}`,
            boxShadow: 'none',
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              borderRadius: COMPOSER_MAIN_RADIUS,
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
                    borderRadius: COMPOSER_CONTROL_RADIUS,
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
                      data-composer-control="remove-referenced-asset"
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

          {attachments.length > 0 && (
            <div
              style={{
                padding: referencedAssets.length > 0 ? '8px 14px 0 14px' : '12px 14px 0 14px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {attachments.map((attachment) => {
                const isMedia = attachment.kind === 'image' || attachment.kind === 'video';
                const isLoading = attachment.status === 'uploading' || attachment.status === 'parsing';
                const isFailed = attachment.status === 'upload_failed' || attachment.status === 'parse_failed';
                const previewSize = isMedia ? 38 : 24;
                return (
                  <div
                    key={attachment.id}
                    role="button"
                    tabIndex={0}
                    title={attachment.name}
                    onClick={() => onPreviewAttachment?.(attachment)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onPreviewAttachment?.(attachment);
                    }}
                    style={{
                      height: 38,
                      maxWidth: isMedia ? 38 : 132,
                      minWidth: isMedia ? 38 : 92,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      borderRadius: 12,
                      padding: isMedia ? 0 : '0 8px',
                      border: `1px solid ${isFailed ? c.danger : focused ? c.accentBorder : c.borderFaint}`,
                      background: isFailed ? `${c.danger}10` : c.bgCard,
                      color: c.textSecondary,
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        position: 'relative',
                        width: previewSize,
                        height: previewSize,
                        borderRadius: isMedia ? 12 : 8,
                        overflow: 'hidden',
                        display: 'inline-flex',
                        flexShrink: 0,
                      }}
                    >
                      <AssetPreview
                        kind={attachment.kind}
                        format={getAttachmentPreviewFormat(attachment)}
                        previewUrl={attachment.preview_image_url || attachment.preview_url}
                        tone={getAttachmentPreviewTone(attachment)}
                        thumbnailStatus={attachment.thumbnail_status}
                      />
                      {isLoading && (
                        <span
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.56)',
                            color: getAttachmentPreviewTone(attachment),
                          }}
                        >
                          <Loader2 size={14} className="animate-spin" />
                        </span>
                      )}
                    </span>
                    {!isMedia && (
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {shortenFileName(attachment.name)}
                      </span>
                    )}
                    {isFailed && onRetryAttachment && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRetryAttachment(attachment.id);
                        }}
                        style={{ border: 'none', background: 'transparent', color: c.danger, fontSize: 11, padding: 0, cursor: 'pointer' }}
                      >
                        重试
                      </button>
                    )}
                    {onRemoveAttachment && (
                      <button
                        type="button"
                        aria-label="移除附件"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveAttachment(attachment.id);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: c.textSubtle,
                          padding: 0,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          flexShrink: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isMobileVoiceMode ? (
            <div
              style={{
                minHeight: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.textSecondary,
                fontSize: 14,
              }}
            >
              松开发送，上滑取消
            </div>
          ) : (
            <textarea
              id="xiaoqiao-chat-composer"
              name="message"
              ref={textareaRef}
              data-composer-control="input"
              rows={2}
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => {
                setValue(event.target.value);
                if (isMobile) setMobileInputMode('text');
                requestAnimationFrame(resizeTextarea);
              }}
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
                WebkitAppearance: 'none',
                color: c.textPrimary,
                textAlign: 'left',
                padding: `${referencedAssets.length > 0 ? 12 : 16}px 14px 8px 20px`,
                minHeight: 68,
                maxHeight: 144,
                lineHeight: '24px',
                fontSize: 16,
                borderRadius: COMPOSER_MAIN_RADIUS,
                caretColor: BRAND_BLUE,
                overflowY: 'auto',
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '10px 12px 12px',
            }}
          >
            <Tooltip title="上传文件，支持各类excle、截图，最多5个，每个5MB" placement="top" mouseEnterDelay={0.25} arrow={false}>
              <button
                type="button"
                aria-label="添加附件"
                data-composer-control="attach"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: COMPOSER_CONTROL_RADIUS,
                  border: 'none',
                  background: 'transparent',
                  color: '#111827',
                  boxShadow: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <Paperclip size={17} strokeWidth={2} />
              </button>
            </Tooltip>

            {isMobileVoiceMode && (
              <button
                type="button"
                data-composer-control="voice-hold"
                onMouseDown={() => onToggleAutoSpeak?.()}
                onTouchStart={() => onToggleAutoSpeak?.()}
                style={{
                  flex: 1,
                  minHeight: 36,
                  borderRadius: COMPOSER_CONTROL_RADIUS,
                  border: 'none',
                  background: 'transparent',
                  color: '#111827',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                按住说话
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {isMobile && sendButtonState === 'empty' ? (
                <Tooltip title="切换语音输入" placement="top" mouseEnterDelay={0.2} arrow={false}>
                  <button
                    type="button"
                    data-composer-control="voice"
                    onClick={() => setMobileInputMode('voice')}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: 'none',
                      background: BRAND_BLUE,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Mic size={16} />
                  </button>
                </Tooltip>
              ) : (
                <Tooltip
                  title={!canSubmit && !canStop ? '请输入你的问题、需求或操作任务' : sendButtonLabel}
                  placement="top"
                  mouseEnterDelay={0.2}
                  arrow={false}
                >
                  <button
                    type="button"
                    className="xiaoqiao-send-button"
                    data-composer-control="send"
                    data-composer-state={sendButtonState}
                    onClick={submitMessage}
                    disabled={!canSubmit && !canStop}
                    aria-label={sendButtonLabel}
                    aria-busy={sendButtonState === 'processing'}
                    title={sendButtonLabel}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: 'none',
                      background: BRAND_BLUE,
                      color: sendButtonState !== 'empty' ? '#fff' : c.textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: sendButtonState === 'empty' ? 0.48 : sendButtonState === 'processing' ? 0.86 : 1,
                      boxShadow: 'none',
                      cursor: canSubmit || canStop ? 'pointer' : 'not-allowed',
                      transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {sendButtonState === 'processing' ? (
                      <Square aria-hidden="true" size={14} strokeWidth={2.3} fill="#fff" color="#fff" />
                    ) : (
                      <ArrowUp aria-hidden="true" size={16} strokeWidth={2.3} color="#fff" />
                    )}
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          <input
            id="xiaoqiao-composer-file-input"
            name="attachments"
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".csv,.xlsx,.xls,.txt,.log,.json,.pdf,.doc,.docx,image/*,video/*"
            onChange={handleFileChange}
          />
          </div>
        </div>
      </div>
    </div>
  );
}
