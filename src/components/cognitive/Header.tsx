'use client';

import { Plus, Volume2, VolumeX } from 'lucide-react';
import { RobotOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useThemeColors } from '@/hooks/useTheme';

interface HeaderProps {
  isMobile?: boolean;
  conversationTitle?: string;
  autoSpeakEnabled?: boolean;
  onToggleAutoSpeak?: () => void;
  onCreateConversation?: () => void;
}

export function Header({
  isMobile = false,
  conversationTitle = '智投chat对话',
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
  onCreateConversation,
}: HeaderProps) {
  const c = useThemeColors();

  return (
    <header
      className="flex flex-shrink-0 items-center justify-between gap-3"
      style={{
        minHeight: isMobile ? 56 : 44,
        padding: isMobile ? '10px 12px' : '0 16px',
        background: c.headerBg,
        borderBottom: `1px solid ${c.headerBorder}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${c.logoGradientStart}, ${c.logoGradientEnd})`,
            border: `1px solid ${c.border}`,
            boxShadow: `0 0 8px ${c.accentGlow}`,
          }}
        >
          <RobotOutlined style={{ fontSize: 14, color: c.accent }} />
        </div>
        <div className="min-w-0">
          <div
            style={{
              fontSize: isMobile ? 14 : 13,
              fontWeight: 600,
              color: c.textPrimary,
              letterSpacing: 0.2,
            }}
          >
            智投chat
          </div>
          {!isMobile && (
            <div
              className="truncate"
              style={{
                maxWidth: 260,
                fontSize: 11,
                color: c.textMuted,
              }}
            >
              {conversationTitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isMobile && onToggleAutoSpeak && (
          <Tooltip title={autoSpeakEnabled ? '关闭播报' : '开启播报'}>
            <button
              type="button"
              onClick={onToggleAutoSpeak}
              aria-label={autoSpeakEnabled ? '关闭播报' : '开启播报'}
              className="rounded-xl transition-all duration-200"
              style={{
                padding: '8px',
                color: autoSpeakEnabled ? c.accent : c.btnMuted,
                background: autoSpeakEnabled ? c.accentBg : c.bgCard,
                border: `1px solid ${autoSpeakEnabled ? c.accentBorder : c.borderFaint}`,
                boxShadow: autoSpeakEnabled ? `0 0 16px ${c.accentGlow}` : 'none',
              }}
            >
              {autoSpeakEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </Tooltip>
        )}

        {onCreateConversation && (
          <Tooltip title="发起新对话">
            <button
              type="button"
              onClick={onCreateConversation}
              aria-label="发起新对话"
              className="rounded-xl transition-all duration-200"
              style={{
                padding: isMobile ? '8px' : '7px 9px',
                color: c.accent,
                background: c.accentBg,
                border: `1px solid ${c.accentBorder}`,
              }}
            >
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
