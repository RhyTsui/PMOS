'use client';

import { cn } from '@/lib/utils';
import { Check, Copy, Code2 } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  showCopy = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languageLabels: Record<string, string> = {
    javascript: 'JS',
    js: 'JS',
    typescript: 'TS',
    ts: 'TS',
    python: 'PY',
    url: 'URL',
    json: 'JSON',
    sql: 'SQL',
    text: 'TXT',
  };

  return (
    <div className={cn('code-block overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-[var(--aifs-border)]">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[var(--aifs-accent)]" />
          <span className="text-xs text-[var(--aifs-text-secondary)] uppercase">
            {languageLabels[language] || language}
          </span>
        </div>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-[var(--aifs-text-secondary)] hover:text-[var(--aifs-accent)] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono text-[var(--aifs-text-primary)] whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}
