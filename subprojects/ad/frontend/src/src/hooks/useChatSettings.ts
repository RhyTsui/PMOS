'use client';

import { useState, useEffect, useCallback } from 'react';
import { CodeStyle } from '@/components/ui/FancyCodeBlock';

/* ─── Thinking Display Length ─── */
export type ThinkingLength = 'full' | 'summary' | 'hidden';

export const THINKING_LENGTH_OPTIONS: Record<ThinkingLength, { label: string; desc: string }> = {
  full: { label: '完整展示', desc: '展示全部思考过程' },
  summary: { label: '摘要模式', desc: '仅展示前3步，其余折叠' },
  hidden: { label: '自动折叠', desc: '默认折叠，点击可展开' },
};

/* ─── Chat Settings Type ─── */
export interface ChatSettings {
  thinkingLength: ThinkingLength;
  codeStyle: CodeStyle;
  codeLineNumbers: boolean;
  showSystemPrompt: boolean;
  longTextThreshold: number; // chars, paste-as-file threshold
  autoCollapseThinking: boolean;
}

const SETTINGS_KEY = 'xiaoqiao-chat-settings';

const DEFAULT_SETTINGS: ChatSettings = {
  thinkingLength: 'hidden',
  codeStyle: 'fancy',
  codeLineNumbers: true,
  showSystemPrompt: false,
  longTextThreshold: 2000,
  autoCollapseThinking: true,
};

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, loaded]);

  const updateSetting = useCallback(<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((partial: Partial<ChatSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  return { settings, updateSetting, updateSettings, loaded };
}
