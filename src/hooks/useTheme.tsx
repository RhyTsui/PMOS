'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

type Theme = 'light' | 'dark';

export interface AccentPreset {
  key: string;
  label: string;
  dark: string;
  light: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { key: 'cyan',    label: '青空', dark: '#00D9FF', light: '#0088CC' },
  { key: 'blue',    label: '极光蓝', dark: '#3B82F6', light: '#2563EB' },
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
  accent: '#0088CC',
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
  const { isDark, accent } = useTheme();

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
    success: isDark ? '#00FF88' : '#00B368',
    warning: isDark ? '#FFB800' : '#D49600',
    danger: isDark ? '#FF3366' : '#E0204A',
    info: isDark ? '#7B61FF' : '#6B46E0',

    // Text
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSecondary: isDark ? '#8B9DC3' : '#64748B',
    textMuted: isDark ? '#4A5568' : '#94A3B8',
    textSubtle: isDark ? '#3A4558' : '#B0BEC5',
    textBody: isDark ? '#C8D0DC' : '#334155',

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
    inputText: isDark ? '#E8ECF4' : '#1E293B',
    inputPlaceholder: isDark ? '#5A6B80' : '#94A3B8',
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
  }), [isDark, accent]);
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
    const preset = ACCENT_PRESETS.find(p => p.key === accentKey) ?? ACCENT_PRESETS[0];
    const color = theme === 'dark' ? preset.dark : preset.light;
    const root = document.documentElement;

    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-rgb', hexToRgb(color).join(', '));
    root.style.setProperty('--accent-dark', darken(color, 0.25));
    root.style.setProperty('--accent-light', lighten(color, 0.15));
  }, [theme, accentKey]);

  const toggleTheme = useCallback(() => {
    setTheme('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
  }, []);

  const setAccentKey = useCallback((key: string) => {
    setAccentKeyState(key);
    localStorage.setItem(ACCENT_STORAGE_KEY, key);
  }, []);

  const accent = useMemo(() => {
    const preset = ACCENT_PRESETS.find(p => p.key === accentKey) ?? ACCENT_PRESETS[0];
    return theme === 'dark' ? preset.dark : preset.light;
  }, [theme, accentKey]);

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
