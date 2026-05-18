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
    <div className={cn('code-block w-full max-w-full overflow-hidden rounded-xl border border-[#dbe4f0] bg-[#f8fafc]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5edf7] bg-[#f1f5f9] px-4 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#64748b]" />
          <span className="text-xs text-[#64748b] uppercase">
            {languageLabels[language] || language}
          </span>
        </div>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-[#64748b] transition-colors hover:text-[#0f6fff]"
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
      <pre className="w-full max-w-full overflow-x-auto overflow-y-hidden p-4 text-sm leading-relaxed">
        <code className="inline-block min-w-max whitespace-pre font-mono text-[#1f2937]">
          {code}
        </code>
      </pre>
    </div>
  );
}
