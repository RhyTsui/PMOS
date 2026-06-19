'use client';

import { SafeCodeBlock } from './SafeCodeBlock';

export type CodeStyle = 'fancy' | 'minimal' | 'github' | 'dracula' | 'one-dark';

export const CODE_STYLES: Record<CodeStyle, { label: string; headerBg: string; bodyBg: string; headerColor: string; borderColor: string; langBadgeBg: string; langBadgeColor: string }> = {
  fancy: { label: '清爽', headerBg: 'var(--code-fancy-header)', bodyBg: 'var(--code-fancy-body)', headerColor: 'var(--code-fancy-header-text)', borderColor: 'var(--code-fancy-border)', langBadgeBg: '#e8eef7', langBadgeColor: '#334155' },
  minimal: { label: '简洁', headerBg: 'transparent', bodyBg: 'var(--code-minimal-body)', headerColor: 'var(--text-secondary)', borderColor: 'var(--border)', langBadgeBg: 'var(--bg-subtle)', langBadgeColor: 'var(--text-secondary)' },
  github: { label: 'GitHub', headerBg: 'var(--code-github-header)', bodyBg: 'var(--code-github-body)', headerColor: 'var(--code-github-header-text)', borderColor: 'var(--code-github-border)', langBadgeBg: '#d73a4920', langBadgeColor: '#d73a49' },
  dracula: { label: 'Dracula', headerBg: '#1a1a2e', bodyBg: '#16162a', headerColor: '#bd93f9', borderColor: '#bd93f930', langBadgeBg: '#bd93f920', langBadgeColor: '#bd93f9' },
  'one-dark': { label: 'One Dark', headerBg: '#282c34', bodyBg: '#21252b', headerColor: '#abb2bf', borderColor: '#3e445140', langBadgeBg: '#61afef20', langBadgeColor: '#61afef' },
};

export function CodeStyleSelector({
  value,
  onChange,
}: {
  value: CodeStyle;
  onChange: (style: CodeStyle) => void;
}) {
  return (
    <select
      aria-label="代码风格"
      value={value}
      onChange={(event) => onChange(event.target.value as CodeStyle)}
    >
      {Object.entries(CODE_STYLES).map(([key, style]) => (
        <option key={key} value={key}>{style.label}</option>
      ))}
    </select>
  );
}

interface FancyCodeBlockProps {
  children: string;
  language?: string;
  codeStyle?: CodeStyle;
  showLineNumbers?: boolean;
  fontSize?: number;
  defaultExpanded?: boolean;
}

export default function FancyCodeBlock({
  children,
  language = 'text',
  showLineNumbers = true,
  defaultExpanded = false,
}: FancyCodeBlockProps) {
  return (
    <SafeCodeBlock
      content={children}
      language={language}
      mode="inline"
      showLineNumbers={showLineNumbers}
      defaultExpanded={defaultExpanded}
    />
  );
}
