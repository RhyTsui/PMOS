'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Tooltip, Dropdown } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  ExpandOutlined,
  CompressOutlined,
  SettingOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import { useThemeColors } from '@/hooks/useTheme';

/* ─── Code Style Themes ─── */
export type CodeStyle = 'fancy' | 'minimal' | 'github' | 'dracula' | 'one-dark';

export const CODE_STYLES: Record<CodeStyle, { label: string; headerBg: string; bodyBg: string; headerColor: string; borderColor: string; langBadgeBg: string; langBadgeColor: string }> = {
  fancy: { label: '花式', headerBg: 'var(--code-fancy-header)', bodyBg: 'var(--code-fancy-body)', headerColor: 'var(--code-fancy-header-text)', borderColor: 'var(--code-fancy-border)', langBadgeBg: 'var(--accent)', langBadgeColor: '#fff' },
  minimal: { label: '极简', headerBg: 'transparent', bodyBg: 'var(--code-minimal-body)', headerColor: 'var(--text-secondary)', borderColor: 'var(--border)', langBadgeBg: 'var(--bg-subtle)', langBadgeColor: 'var(--text-secondary)' },
  github: { label: 'GitHub', headerBg: 'var(--code-github-header)', bodyBg: 'var(--code-github-body)', headerColor: 'var(--code-github-header-text)', borderColor: 'var(--code-github-border)', langBadgeBg: '#d73a4920', langBadgeColor: '#d73a49' },
  dracula: { label: 'Dracula', headerBg: '#1a1a2e', bodyBg: '#16162a', headerColor: '#bd93f9', borderColor: '#bd93f930', langBadgeBg: '#bd93f920', langBadgeColor: '#bd93f9' },
  'one-dark': { label: 'One Dark', headerBg: '#282c34', bodyBg: '#21252b', headerColor: '#abb2bf', borderColor: '#3e445140', langBadgeBg: '#61afef20', langBadgeColor: '#61afef' },
};

/* ─── Line Count Thresholds ─── */
export const LINE_COLLAPSE_THRESHOLD = 15;

interface FancyCodeBlockProps {
  children: string;
  language?: string;
  codeStyle?: CodeStyle;
  showLineNumbers?: boolean;
}

export default function FancyCodeBlock({
  children,
  language = 'text',
  codeStyle = 'fancy',
  showLineNumbers = true,
}: FancyCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const c = useThemeColors();

  const style = CODE_STYLES[codeStyle] || CODE_STYLES.fancy;
  const lines = children.split('\n');
  const totalLines = lines.length;
  const isLong = totalLines > LINE_COLLAPSE_THRESHOLD;
  const displayLines = expanded ? lines : lines.slice(0, LINE_COLLAPSE_THRESHOLD);
  const hasHiddenLines = isLong && !expanded;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  const langDisplay = language && language !== 'text' ? language : '';

  return (
    <div
      style={{
        margin: '12px 0',
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${style.borderColor}`,
        background: style.bodyBg,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: style.headerBg,
          borderBottom: `1px solid ${style.borderColor}`,
          fontSize: 12,
        }}
      >
        {/* Traffic Lights (macOS style) */}
        {codeStyle === 'fancy' && (
          <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          </div>
        )}

        {/* Language Badge */}
        {langDisplay && (
          <span
            style={{
              padding: '1px 8px',
              borderRadius: 4,
              background: style.langBadgeBg,
              color: style.langBadgeColor,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
            }}
          >
            {langDisplay}
          </span>
        )}

        {/* Title (filename placeholder) */}
        <span style={{ color: style.headerColor, fontSize: 11, opacity: 0.6 }}>
          {totalLines} 行
        </span>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        {isLong && (
          <Tooltip title={expanded ? '收起' : '展开全部'}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: style.headerColor,
                opacity: 0.6,
                padding: '2px 4px',
                borderRadius: 4,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'none'; }}
            >
              {expanded ? <CompressOutlined style={{ fontSize: 12 }} /> : <ExpandOutlined style={{ fontSize: 12 }} />}
            </button>
          </Tooltip>
        )}

        <Tooltip title={copied ? '已复制' : '复制代码'}>
          <button
            onClick={handleCopy}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: copied ? c.success : style.headerColor,
              opacity: copied ? 1 : 0.6,
              padding: '2px 4px',
              borderRadius: 4,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
            }}
            onMouseEnter={e => { if (!copied) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
            onMouseLeave={e => { if (!copied) { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'none'; } }}
          >
            {copied ? <CheckOutlined style={{ fontSize: 11 }} /> : <CopyOutlined style={{ fontSize: 11 }} />}
            {copied ? '已复制' : ''}
          </button>
        </Tooltip>
      </div>

      {/* Code Body */}
      <div
        style={{
          padding: '12px 16px',
          overflowX: 'auto',
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: 'var(--font-mono)',
          color: c.textBody,
          position: 'relative',
        }}
      >
        <pre style={{ margin: 0, whiteSpace: 'pre', tabSize: 2 }}>
          <code>
            {displayLines.map((line, idx) => (
              <div key={idx} style={{ display: 'flex' }}>
                {showLineNumbers && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 40,
                      minWidth: 40,
                      textAlign: 'right',
                      paddingRight: 16,
                      color: c.textMuted,
                      opacity: 0.4,
                      userSelect: 'none',
                      fontSize: 12,
                    }}
                  >
                    {idx + 1}
                  </span>
                )}
                <span style={{ flex: 1 }}>{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>

        {/* Collapsed overlay */}
        {hasHiddenLines && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              background: `linear-gradient(transparent, ${style.bodyBg})`,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 8,
            }}
          >
            <button
              onClick={() => setExpanded(true)}
              style={{
                background: style.headerBg,
                border: `1px solid ${style.borderColor}`,
                borderRadius: 6,
                padding: '3px 12px',
                color: style.headerColor,
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = style.langBadgeBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = style.headerBg; }}
            >
              <ExpandOutlined style={{ fontSize: 10 }} />
              展开剩余 {totalLines - LINE_COLLAPSE_THRESHOLD} 行
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Code Style Selector ─── */
export function CodeStyleSelector({
  value,
  onChange,
}: {
  value: CodeStyle;
  onChange: (style: CodeStyle) => void;
}) {
  const c = useThemeColors();

  const menuItems = useMemo(() => ({
    items: Object.entries(CODE_STYLES).map(([key, style]) => ({
      key,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 16,
            height: 12,
            borderRadius: 3,
            background: style.bodyBg,
            border: `1px solid ${style.borderColor}`,
          }} />
          <span style={{ color: key === value ? c.accent : c.textSecondary, fontSize: 12 }}>
            {style.label}
          </span>
        </div>
      ),
    })),
    onClick: (info: { key: string }) => onChange(info.key as CodeStyle),
    selectedKeys: [value],
  }), [value, onChange, c]);

  return (
    <Dropdown menu={menuItems} trigger={['click']}>
      <Tooltip title="代码块风格">
        <button
          style={{
            background: 'none',
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            padding: '3px 8px',
            color: c.textMuted,
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.borderColor = c.borderActive; }}
          onMouseLeave={e => { e.currentTarget.style.color = c.textMuted; e.currentTarget.style.borderColor = c.border; }}
        >
          <SettingOutlined style={{ fontSize: 11 }} />
          代码风格
        </button>
      </Tooltip>
    </Dropdown>
  );
}
