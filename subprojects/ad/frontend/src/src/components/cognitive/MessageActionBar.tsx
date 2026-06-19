'use client';

import React from 'react';
import { App, Dropdown, Tooltip, type MenuProps } from 'antd';
import {
  CommentOutlined,
  CopyOutlined,
  DislikeFilled,
  DislikeOutlined,
  EditOutlined,
  EyeOutlined,
  LikeFilled,
  LikeOutlined,
  LinkOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SoundOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import type { Message } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

const ACTION_LABELS = {
  more: '\u66f4\u591a',
  quote: '\u5f15\u7528',
  copyLink: '\u590d\u5236\u94fe\u63a5',
  noLink: '\u6682\u65e0\u53ef\u590d\u5236\u7684\u94fe\u63a5',
  callChain: '\u8c03\u7528\u94fe',
  disclosure: '\u8fc7\u7a0b\u4e0e\u4f9d\u636e',
  copy: '\u590d\u5236',
  edit: '\u91cd\u65b0\u7f16\u8f91',
  regenerate: '\u91cd\u65b0\u751f\u6210',
  like: '\u559c\u6b22',
  dislike: '\u4e0d\u559c\u6b22',
  stopSpeaking: '\u505c\u6b62\u64ad\u62a5',
  speak: '\u8bed\u97f3\u64ad\u62a5',
  unsave: '\u53d6\u6d88\u4fdd\u5b58\u5230\u4e2a\u4eba\u77e5\u8bc6\u5e93',
  save: '\u4fdd\u5b58\u5230\u4e2a\u4eba\u77e5\u8bc6\u5e93',
};

interface MessageActionBarProps {
  message: Message;
  isRunning?: boolean;
  onOpenDisclosure?: (message: Message) => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onQuote?: () => void;
  feedbackState?: 'like' | 'dislike';
  onLike?: () => void;
  onDislike?: () => void;
  savedToKnowledge?: boolean;
  onToggleSave?: () => void;
  isSpeaking?: boolean;
  onSpeak?: () => void;
  onShareConversation?: (conversationId: string, title?: string) => void;
  currentConversationTitle?: string;
  onViewCallChain?: () => void;
  devMode?: boolean;
  traceUrl?: string;
}

function IconButton({
  label,
  icon,
  onClick,
  active,
  activeColor,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
}) {
  const c = useThemeColors();
  const color = active ? activeColor || c.accent : c.chat.text.secondary;
  return (
    <Tooltip title={label}>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 10,
          border: '1px solid transparent',
          background: active ? c.accentBg : 'transparent',
          color,
          cursor: onClick ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          fontSize: 13,
          lineHeight: 1,
          transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = active ? c.accentBg : c.accentBgFaint;
          event.currentTarget.style.color = active ? color : c.accent;
          event.currentTarget.style.borderColor = c.accentBorder;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = active ? c.accentBg : 'transparent';
          event.currentTarget.style.color = color;
          event.currentTarget.style.borderColor = 'transparent';
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

const MoreTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
function MoreTrigger(props, ref) {
  const c = useThemeColors();
  return (
    <button
      type="button"
      aria-label={ACTION_LABELS.more}
      title={ACTION_LABELS.more}
      ref={ref}
      {...props}
      style={{
        width: 28,
        height: 28,
        borderRadius: 10,
        border: '1px solid transparent',
        background: 'transparent',
        color: c.chat.text.secondary,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <MoreOutlined />
    </button>
  );
});

export function MessageActionBar({
  message,
  isRunning,
  onOpenDisclosure,
  onCopy,
  onRegenerate,
  onEdit,
  onQuote,
  feedbackState,
  onLike,
  onDislike,
  savedToKnowledge,
  onToggleSave,
  isSpeaking,
  onSpeak,
  onShareConversation,
  currentConversationTitle,
  onViewCallChain,
  devMode,
  traceUrl,
}: MessageActionBarProps) {
  const { message: antMessage } = App.useApp();
  const c = useThemeColors();
  const isUser = message.role === 'user';
  if (isRunning && !isUser) return null;

  if (isUser) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 4,
          flexWrap: 'wrap',
          marginTop: 6,
          color: c.chat.text.secondary,
        }}
      >
        {onCopy && <IconButton label={ACTION_LABELS.copy} icon={<CopyOutlined />} onClick={onCopy} />}
        {onEdit && <IconButton label={ACTION_LABELS.edit} icon={<EditOutlined />} onClick={onEdit} />}
      </div>
    );
  }

  const moreItems = [
    onQuote ? { key: 'quote', label: ACTION_LABELS.quote, icon: <CommentOutlined />, onClick: onQuote } : null,
    onShareConversation ? {
      key: 'share',
      label: ACTION_LABELS.copyLink,
      icon: <LinkOutlined />,
      onClick: () => {
        const conversationId = message.conversation_id || '';
        if (!conversationId) {
          antMessage.info(ACTION_LABELS.noLink);
          return;
        }
        onShareConversation(conversationId, currentConversationTitle);
      },
    } : null,
    devMode && onViewCallChain ? { key: 'call-chain', label: ACTION_LABELS.callChain, onClick: onViewCallChain } : null,
    traceUrl ? {
      key: 'liannu-trace',
      label: '连弩 Trace',
      icon: <LinkOutlined />,
      onClick: () => {
        window.open(traceUrl, '_blank', 'noopener,noreferrer');
      },
    } : null,
  ].filter(Boolean) as NonNullable<MenuProps['items']>;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 4,
        flexWrap: 'wrap',
        marginTop: 6,
        color: c.chat.text.secondary,
      }}
    >
      {onOpenDisclosure && (
        <IconButton label={ACTION_LABELS.disclosure} icon={<EyeOutlined />} onClick={() => onOpenDisclosure(message)} />
      )}
      {onCopy && <IconButton label={ACTION_LABELS.copy} icon={<CopyOutlined />} onClick={onCopy} />}
      {onEdit && <IconButton label={ACTION_LABELS.edit} icon={<EditOutlined />} onClick={onEdit} />}
      {onRegenerate && <IconButton label={ACTION_LABELS.regenerate} icon={<ReloadOutlined />} onClick={onRegenerate} />}
      {onLike && (
        <IconButton
          label={ACTION_LABELS.like}
          icon={feedbackState === 'like' ? <LikeFilled /> : <LikeOutlined />}
          active={feedbackState === 'like'}
          activeColor="#157f54"
          onClick={onLike}
        />
      )}
      {onDislike && (
        <IconButton
          label={ACTION_LABELS.dislike}
          icon={feedbackState === 'dislike' ? <DislikeFilled /> : <DislikeOutlined />}
          active={feedbackState === 'dislike'}
          activeColor="#dc2626"
          onClick={onDislike}
        />
      )}
      {onSpeak && (
        <IconButton
          label={isSpeaking ? ACTION_LABELS.stopSpeaking : ACTION_LABELS.speak}
          icon={isSpeaking ? <PauseCircleOutlined /> : <SoundOutlined />}
          active={isSpeaking}
          onClick={onSpeak}
        />
      )}
      {onToggleSave && (
        <IconButton
          label={savedToKnowledge ? ACTION_LABELS.unsave : ACTION_LABELS.save}
          icon={savedToKnowledge ? <StarFilled /> : <StarOutlined />}
          active={savedToKnowledge}
          activeColor="#f6bd16"
          onClick={onToggleSave}
        />
      )}
      {moreItems.length > 0 && (
        <Dropdown trigger={['click']} placement="bottomRight" menu={{ items: moreItems }}>
          <MoreTrigger />
        </Dropdown>
      )}
    </div>
  );
}

export default MessageActionBar;
