import type { Message, MessageContract } from '@/types';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';

export interface CopyResult {
  ok: boolean;
  method?: 'clipboard' | 'textarea';
  error?: string;
}

export async function copyTextWithFallback(text: string): Promise<CopyResult> {
  const value = String(text || '');
  if (!value) return { ok: false, error: 'empty' };

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return { ok: true, method: 'clipboard' };
    }
  } catch {
    // Fall through to textarea fallback.
  }

  if (typeof document === 'undefined') {
    return { ok: false, error: 'clipboard unavailable' };
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const ok = document.execCommand('copy');
    return ok ? { ok: true, method: 'textarea' } : { ok: false, error: 'execCommand failed' };
  } finally {
    document.body.removeChild(textarea);
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function collectContractText(contract: MessageContract | null | undefined): string[] {
  const lines: string[] = [];
  const legacy = readRecord(contract);
  const answerMarkdown = readString(contract?.answer_markdown);
  if (answerMarkdown) lines.push(answerMarkdown);
  const embeddedResult = readRecord(legacy?.semantic_result);
  const embeddedAnswer = readRecord(embeddedResult?.answer);
  const embeddedSummary = readString(embeddedResult?.summary) || readString(embeddedAnswer?.summary) || readString(embeddedAnswer?.text);
  if (embeddedSummary) lines.push(embeddedSummary);

  const presentation = readRecord(legacy?.presentation);
  const regions = Array.isArray(presentation?.regions) ? presentation.regions : [];
  for (const region of regions) {
    const data = readRecord(region?.data);
    const markdown = readString(data?.markdown) || readString(data?.content) || readString(data?.text);
    if (markdown) lines.push(markdown);
  }
  return lines;
}

export function serializeMessageForCopy(message: Message): string {
  const lines: string[] = [];
  const contract = readRecord(message.metadata?.message_contract) as MessageContract | null;
  lines.push(...collectContractText(contract));

  const semanticResult = readRecord(message.metadata?.semantic_result) as SemanticResultContract | null;
  if (semanticResult?.title) lines.push(semanticResult.title);
  if (semanticResult?.description) lines.push(semanticResult.description);
  if (Array.isArray(semanticResult?.regions)) {
    for (const region of semanticResult.regions) {
      const data = readRecord(region.data);
      const markdown = readString(data?.markdown) || readString(data?.content) || readString(data?.text);
      if (markdown) lines.push(markdown);
    }
  }

  const content = readString(message.content);
  if (content) lines.push(content);

  return Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean))).join('\n\n');
}

export function downloadTextFile(filename: string, text: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export interface SafePreviewOptions {
  maxLines: number;
  maxChars: number;
}

export interface SafePreview {
  preview: string;
  lineCount: number;
  charCount: number;
  previewLineCount: number;
  truncated: boolean;
}

export function createSafeTextPreview(value: string, options: SafePreviewOptions): SafePreview {
  const text = String(value || '');
  const charCount = text.length;
  let totalLines = text.length ? 1 : 0;
  let previewEnd = Math.min(text.length, options.maxChars);
  let previewLines = text.length ? 1 : 0;
  let reachedLineLimit = false;

  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) {
      totalLines += 1;
      if (!reachedLineLimit && index < options.maxChars) {
        previewLines += 1;
        if (previewLines > options.maxLines) {
          previewEnd = index;
          reachedLineLimit = true;
        }
      }
    }
  }

  if (!reachedLineLimit && charCount <= options.maxChars) {
    previewEnd = charCount;
  }

  const preview = text.slice(0, previewEnd);
  const previewLineCount = preview ? preview.split('\n').length : 0;
  return {
    preview,
    lineCount: totalLines,
    charCount,
    previewLineCount,
    truncated: previewEnd < charCount || totalLines > options.maxLines,
  };
}
