'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Check, Loader2, X } from 'lucide-react';
import { EXPORT_FORMATS, doExport } from '@/lib/export-formats';
import type { ExportFormat } from '@/lib/export-formats';
import type { Message } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

interface ExportMenuProps {
  messages: Message[];
  title: string;
}

export default function ExportMenu({ messages, title }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [successFormat, setSuccessFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const c = useThemeColors();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (messages.length === 0) return;
    setExporting(format);
    setError(null);
    try {
      await doExport(format, messages, title);
      setSuccessFormat(format);
      setTimeout(() => setSuccessFormat(null), 2000);
      setTimeout(() => setOpen(false), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
      setTimeout(() => setError(null), 3000);
    } finally {
      setExporting(null);
    }
  }, [messages, title]);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: `1px solid ${c.borderFaint}`,
          background: c.bgElevated,
          color: c.textSecondary,
          cursor: 'pointer',
          fontSize: 13,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = c.accent;
          e.currentTarget.style.color = c.accent;
          e.currentTarget.style.background = c.accentBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.borderFaint;
          e.currentTarget.style.color = c.textSecondary;
          e.currentTarget.style.background = c.bgElevated;
        }}
      >
        <Share2 size={14} />
        <span>导出消息</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 300,
            background: c.bgElevated,
            border: `1px solid ${c.borderFaint}`,
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: `1px solid ${c.borderFaint}`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: c.textPrimary }}>
              导出消息
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: c.textMuted,
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 8, maxHeight: 400, overflowY: 'auto' }}>
            {EXPORT_FORMATS.map((fmt) => {
              const isExporting = exporting === fmt.key;
              const isSuccess = successFormat === fmt.key;
              return (
                <button
                  key={fmt.key}
                  onClick={() => handleExport(fmt.key)}
                  disabled={isExporting || messages.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: isSuccess ? `${c.accent}15` : 'transparent',
                    color: c.textPrimary,
                    cursor: isExporting ? 'wait' : 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    opacity: messages.length === 0 ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isExporting) e.currentTarget.style.background = c.accentBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSuccess) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {fmt.icon}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {fmt.label}
                      {isSuccess && <Check size={14} style={{ color: c.accent }} />}
                    </div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                      {fmt.description} · .{fmt.ext}
                    </div>
                  </div>

                  {isExporting && (
                    <Loader2
                      size={16}
                      style={{
                        color: c.accent,
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <div
              style={{
                padding: '8px 16px',
                background: '#FF336620',
                color: '#FF3366',
                fontSize: 12,
                borderTop: `1px solid ${c.borderFaint}`,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              padding: '8px 16px',
              borderTop: `1px solid ${c.borderFaint}`,
              fontSize: 11,
              color: c.textMuted,
              textAlign: 'center',
            }}
          >
            共 {messages.length} 条消息
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
