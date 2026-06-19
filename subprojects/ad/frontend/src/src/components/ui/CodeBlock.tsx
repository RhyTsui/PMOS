'use client';

import { SafeCodeBlock } from './SafeCodeBlock';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  className,
}: CodeBlockProps) {
  return (
    <SafeCodeBlock
      content={code}
      language={language}
      mode="inline"
      className={className}
      showLineNumbers
    />
  );
}
