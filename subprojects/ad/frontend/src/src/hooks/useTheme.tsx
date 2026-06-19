'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ZHITOU_CHAT_COLORS, ZHITOU_CHAT_PRESENTATION_TOKENS } from '@/lib/zhitou-chat-colors';

type Theme = 'light' | 'dark';

export interface AccentPreset {
  key: string;
  label: string;
  dark: string;
  light: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { key: 'cyan',    label: '青空', dark: ZHITOU_CHAT_COLORS.primary, light: ZHITOU_CHAT_COLORS.primary },
  { key: 'blue',    label: '极光蓝', dark: ZHITOU_CHAT_COLORS.primary, light: ZHITOU_CHAT_COLORS.primary },
  { key: 'purple',  label: '星云紫', dark: '#8B5CF6', light: '#7C3AED' },
  { key: 'green',   label: '翡翠绿', dark: '#10B981', light: '#059669' },
  { key: 'orange',  label: '落日橙', dark: '#F59E0B', light: '#D97706' },
  { key: 'rose',    label: '樱粉红', dark: '#F43F5E', light: '#E11D48' },
];

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  accent: string;
  accentKey: string;
  setAccentKey: (key: string) => void;
  accentPresets: AccentPreset[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  accent: ZHITOU_CHAT_COLORS.primary,
  accentKey: 'cyan',
  setAccentKey: () => {},
  accentPresets: ACCENT_PRESETS,
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Parse hex to RGB tuple */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

/** Generate rgba string */
function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Darken a hex color by a factor (0-1) */
function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color by mixing with white */
function lighten(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/**
 * Theme-aware color tokens for inline styles.
 * Dynamically derived from accent color selection.
 */
export function useThemeColors() {
  const { isDark } = useTheme();
  const accent = ZHITOU_CHAT_COLORS.primary;
  const chatTokens = ZHITOU_CHAT_PRESENTATION_TOKENS;

  return useMemo(() => ({
    // Accent (dynamic)
    accent,
    accentDark: darken(accent, 0.25),
    accentLight: lighten(accent, 0.15),
    accentGlow: rgba(accent, 0.3),
    accentSoft: rgba(accent, 0.1),
    accentBg: rgba(accent, 0.08),
    accentBgFaint: rgba(accent, 0.05),
    accentBgStrong: rgba(accent, 0.15),
    accentBorder: rgba(accent, 0.25),
    accentBorderFaint: rgba(accent, 0.1),

    // Semantic (fixed)
    success: isDark ? '#00FF88' : ZHITOU_CHAT_COLORS.success,
    warning: isDark ? '#FFB800' : ZHITOU_CHAT_COLORS.warning,
    danger: isDark ? '#FF3366' : ZHITOU_CHAT_COLORS.danger,
    info: isDark ? '#7B61FF' : ZHITOU_CHAT_COLORS.info,

    // Text
    textPrimary: isDark ? '#FFFFFF' : ZHITOU_CHAT_COLORS.textPrimary,
    textSecondary: isDark ? '#8B9DC3' : ZHITOU_CHAT_COLORS.textSecondary,
    textMuted: isDark ? '#4A5568' : ZHITOU_CHAT_COLORS.textMuted,
    textSubtle: isDark ? '#3A4558' : '#8EA0B8',
    textBody: isDark ? '#C8D0DC' : ZHITOU_CHAT_COLORS.textBody,

    // Surfaces
    bgMain: isDark ? '#0F1724' : '#F8FAFC',
    bgCard: isDark ? '#1A2438' : '#FFFFFF',
    bgElevated: isDark ? '#1E2A3D' : '#FFFFFF',
    bgContainer: isDark ? 'rgba(13, 17, 23, 0.8)' : 'rgba(248, 250, 252, 0.85)',
    bgSubtle: rgba(accent, 0.04),
    bgInput: isDark ? 'rgba(15, 20, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    bgSection: isDark ? 'rgba(15, 20, 35, 0.6)' : 'rgba(241, 245, 249, 0.7)',
    bgGlass: isDark ? 'rgba(10, 14, 26, 0.85)' : 'rgba(255, 255, 255, 0.88)',

    // Header
    headerBg: isDark ? 'rgba(13, 18, 32, 0.9)' : 'rgba(248, 250, 252, 0.92)',
    headerBorder: rgba(accent, 0.06),

    // Borders
    border: rgba(accent, 0.15),
    borderActive: rgba(accent, 0.5),
    borderFaint: rgba(accent, 0.08),

    // Input
    inputBorder: rgba(accent, 0.15),
    inputBorderFocus: rgba(accent, 0.5),
    inputText: isDark ? '#E8ECF4' : ZHITOU_CHAT_COLORS.textPrimary,
    inputPlaceholder: isDark ? '#5A6B80' : ZHITOU_CHAT_COLORS.textMuted,
    inputCaret: accent,
    inputShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.06)',
    inputShadowFocused: isDark
      ? `0 0 0 1px ${rgba(accent, 0.3)}, 0 0 20px ${rgba(accent, 0.1)}`
      : `0 0 0 1px ${rgba(accent, 0.2)}, 0 0 12px ${rgba(accent, 0.08)}`,
    inputBg: isDark ? 'rgba(15, 20, 35, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    inputBgFocused: isDark ? 'rgba(15, 20, 35, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    inputGlowBackdrop: isDark
      ? `0 0 30px ${rgba(accent, 0.08)}, 0 0 60px ${rgba(accent, 0.04)}`
      : `0 0 20px ${rgba(accent, 0.06)}, 0 0 40px ${rgba(accent, 0.02)}`,

    // Send Button
    sendBtnBg: `linear-gradient(135deg, ${accent}, ${darken(accent, 0.2)})`,
    sendBtnBgDisabled: isDark ? '#2A3441' : '#CBD5E1',
    sendBtnColor: isDark ? '#0A0E1A' : '#FFFFFF',
    sendBtnShadow: isDark
      ? `0 0 12px ${rgba(accent, 0.3)}, 0 2px 4px rgba(0, 0, 0, 0.2)`
      : `0 0 8px ${rgba(accent, 0.2)}, 0 1px 3px rgba(0, 0, 0, 0.08)`,

    // Bubble
    bubbleAiBg: isDark ? 'rgba(18, 24, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    bubbleAiShadow: isDark
      ? `0 2px 12px rgba(0, 0, 0, 0.3), 0 0 1px ${rgba(accent, 0.15)}`
      : `0 2px 12px rgba(0, 0, 0, 0.06), 0 0 1px ${rgba(accent, 0.1)}`,
    bubbleUserBg: rgba(accent, 0.12),

    // Code
    codeBg: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(241, 245, 249, 0.8)',

    // Buttons
    btnMuted: isDark ? '#4A5568' : '#94A3B8',
    btnMutedHover: isDark ? '#8899B0' : '#64748B',
    btnMutedBg: rgba(accent, 0.04),

    // Logo
    logoGradientStart: isDark ? '#0A2647' : '#E0F2FE',
    logoGradientEnd: isDark ? '#144272' : '#BAE6FD',

    // Flow (keep distinct per flow)
    flowHelp: accent,
    flowDemand: isDark ? '#7B61FF' : '#6B46E0',
    flowDiagnosis: isDark ? '#FF3366' : '#E0204A',
    flowDebugging: isDark ? '#FFB800' : '#D49600',

    // Glow shadows (accent-derived)
    shadowGlow: isDark
      ? `0 0 15px ${rgba(accent, 0.15)}, 0 0 30px ${rgba(accent, 0.05)}`
      : `0 0 10px ${rgba(accent, 0.1)}, 0 0 20px ${rgba(accent, 0.03)}`,
    shadowGlowStrong: isDark
      ? `0 0 20px ${rgba(accent, 0.25)}, 0 0 40px ${rgba(accent, 0.1)}`
      : `0 0 15px ${rgba(accent, 0.15)}, 0 0 30px ${rgba(accent, 0.05)}`,

    chat: {
      surface: {
        ...chatTokens.surface,
        canvas: isDark ? '#0F1724' : chatTokens.surface.canvas,
        panel: isDark ? '#1A2438' : chatTokens.surface.panel,
        panelSubtle: isDark ? 'rgba(15, 20, 35, 0.62)' : chatTokens.surface.panelSubtle,
        user: isDark ? rgba(accent, 0.16) : chatTokens.surface.user,
        assistant: isDark ? '#1A2438' : chatTokens.surface.assistant,
        status: isDark ? 'rgba(15, 20, 35, 0.72)' : chatTokens.surface.status,
      },
      border: {
        ...chatTokens.border,
        subtle: isDark ? 'rgba(255, 255, 255, 0.08)' : chatTokens.border.subtle,
        default: isDark ? 'rgba(255, 255, 255, 0.12)' : chatTokens.border.default,
        focus: rgba(accent, 0.35),
      },
      text: {
        primary: isDark ? '#FFFFFF' : chatTokens.text.primary,
        secondary: isDark ? '#8B9DC3' : chatTokens.text.secondary,
        muted: isDark ? '#5A6B80' : chatTokens.text.muted,
      },
      status: {
        success: isDark ? '#00FF88' : chatTokens.status.success,
        warning: isDark ? '#FFB800' : chatTokens.status.warning,
        danger: isDark ? '#FF3366' : chatTokens.status.danger,
        info: isDark ? '#7B61FF' : chatTokens.status.info,
        degraded: isDark ? '#D6A600' : chatTokens.status.degraded,
      },
      radius: chatTokens.radius,
      shadow: {
        message: isDark ? '0 6px 18px rgba(0, 0, 0, 0.22)' : chatTokens.shadow.message,
        panel: isDark ? '0 10px 28px rgba(0, 0, 0, 0.26)' : chatTokens.shadow.panel,
      },
      spacing: chatTokens.spacing,
      motion: chatTokens.motion,
    },
  }), [isDark, accent, chatTokens]);
}

const THEME_STORAGE_KEY = 'xiaoqiao-theme';
const ACCENT_STORAGE_KEY = 'xiaoqiao-accent';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [accentKey, setAccentKeyState] = useState('cyan');

  useEffect(() => {
    setTheme('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    const storedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (storedAccent && ACCENT_PRESETS.some(p => p.key === storedAccent)) {
      setAccentKeyState(storedAccent);
    }
  }, []);

  // Sync <html> class + CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  // Sync accent CSS custom properties
  useEffect(() => {
    const color = ZHITOU_CHAT_COLORS.primary;
    const root = document.documentElement;

    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-rgb', hexToRgb(color).join(', '));
    root.style.setProperty('--accent-dark', darken(color, 0.25));
    root.style.setProperty('--accent-light', lighten(color, 0.15));
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
  }, []);

  const setAccentKey = useCallback((key: string) => {
    setAccentKeyState(key);
    localStorage.setItem(ACCENT_STORAGE_KEY, key);
  }, []);

  const accent = useMemo(() => ZHITOU_CHAT_COLORS.primary, []);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    accent,
    accentKey,
    setAccentKey,
    accentPresets: ACCENT_PRESETS,
  }), [theme, toggleTheme, accent, accentKey, setAccentKey]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
