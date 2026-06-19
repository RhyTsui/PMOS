'use client';

import type React from 'react';
import { useMemo, useState } from 'react';
import { App, Button, Modal, Tooltip } from 'antd';
import { CheckOutlined, CopyOutlined, DownloadOutlined, ExpandOutlined, FullscreenOutlined, ShrinkOutlined } from '@ant-design/icons';
import { copyTextWithFallback, createSafeTextPreview, downloadTextFile } from '@/lib/chat-copy';

export const SAFE_CODE_BLOCK_THRESHOLDS = {
  inlineMaxLines: 200,
  inlineMaxChars: 50_000,
  panelMaxLines: 500,
  panelMaxChars: 120_000,
  virtualizeFromLines: 1_000,
  hardPreviewMaxLines: 2_000,
  hardPreviewMaxChars: 300_000,
  hugeBlockLines: 10_000,
  hugeBlockChars: 1_000_000,
} as const;

export type SafeCodeBlockMode = 'inline' | 'panel';

interface SafeCodeBlockProps {
  content: string;
  language?: string;
  mode?: SafeCodeBlockMode;
  title?: string;
  maxHeight?: number;
  fullContent?: string;
  defaultExpanded?: boolean;
  showLineNumbers?: boolean;
  className?: string;
  filename?: string;
}

function formatCount(value: number): string {
  return value >= 10000 ? `${Math.round(value / 1000)}k` : String(value);
}

export function SafeCodeBlock({
  content,
  language = 'text',
  mode = 'inline',
  title,
  maxHeight,
  fullContent,
  defaultExpanded = false,
  showLineNumbers = false,
  className,
  filename,
}: SafeCodeBlockProps) {
  const { message: antMessage } = App.useApp();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const source = String(content || '');
  const completeSource = fullContent ?? source;
  const limit = mode === 'panel'
    ? { maxLines: SAFE_CODE_BLOCK_THRESHOLDS.panelMaxLines, maxChars: SAFE_CODE_BLOCK_THRESHOLDS.panelMaxChars }
    : { maxLines: SAFE_CODE_BLOCK_THRESHOLDS.inlineMaxLines, maxChars: SAFE_CODE_BLOCK_THRESHOLDS.inlineMaxChars };

  const hardLimit = {
    maxLines: SAFE_CODE_BLOCK_THRESHOLDS.hardPreviewMaxLines,
    maxChars: SAFE_CODE_BLOCK_THRESHOLDS.hardPreviewMaxChars,
  };

  const previewInfo = useMemo(() => createSafeTextPreview(source, expanded ? hardLimit : limit), [expanded, source, limit.maxLines, limit.maxChars]);
  const isHuge = previewInfo.lineCount >= SAFE_CODE_BLOCK_THRESHOLDS.hugeBlockLines
    || previewInfo.charCount >= SAFE_CODE_BLOCK_THRESHOLDS.hugeBlockChars;
  const canExpand = previewInfo.truncated && !isHuge;
  const visibleText = previewInfo.preview;
  const displayLines = useMemo(() => {
    if (!showLineNumbers) return null;
    return visibleText.split('\n');
  }, [showLineNumbers, visibleText]);
  const modalPreviewInfo = useMemo(() => createSafeTextPreview(completeSource, hardLimit), [completeSource, hardLimit.maxLines, hardLimit.maxChars]);
  const modalLines = useMemo(() => {
    if (!showLineNumbers) return null;
    return modalPreviewInfo.preview.split('\n');
  }, [modalPreviewInfo.preview, showLineNumbers]);

  const copyPreview = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    const result = await copyTextWithFallback(visibleText);
    if (result.ok) {
      setCopied(true);
      antMessage.success('已复制');
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      antMessage.error('复制失败，请手动选择文本');
    }
  };

  const copyFull = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    const result = await copyTextWithFallback(completeSource);
    if (result.ok) {
      setCopied(true);
      antMessage.success('已复制');
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      antMessage.error('复制失败，请手动选择文本');
    }
  };

  const handleDownload = (event: React.MouseEvent) => {
    event.stopPropagation();
    downloadTextFile(filename || `content.${language === 'text' ? 'txt' : language}`, completeSource);
  };

  const toggleExpanded = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canExpand && !expanded) return;
    setExpanded((prev) => !prev);
  };

  const openModal = (event: React.MouseEvent) => {
    event.stopPropagation();
    setModalOpen(true);
  };

  return (
    <>
      <section className={['xq-safe-code', className].filter(Boolean).join(' ')}>
        <header className="xq-safe-code__header">
          <div className="xq-safe-code__meta">
            <span className="xq-safe-code__language">{language || 'text'}</span>
            {title ? <span className="xq-safe-code__title">{title}</span> : null}
            <span className="xq-safe-code__count">{formatCount(previewInfo.lineCount)} 行 · {formatCount(previewInfo.charCount)} 字符</span>
          </div>
          <div className="xq-safe-code__actions">
            {previewInfo.truncated ? (
              <Tooltip title={isHuge ? '内容过大，已使用安全预览' : expanded ? '收起' : '展开安全预览'}>
                <Button
                  type="text"
                  size="small"
                  icon={expanded ? <ShrinkOutlined /> : <ExpandOutlined />}
                  aria-label={isHuge ? '打开安全预览' : expanded ? '收起' : '展开安全预览'}
                  disabled={isHuge && !expanded}
                  onClick={toggleExpanded}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="放大查看">
              <Button
                type="text"
                size="small"
                icon={<FullscreenOutlined />}
                aria-label="放大查看"
                onClick={openModal}
              />
            </Tooltip>
            <Tooltip title={copied ? '已复制' : previewInfo.truncated ? '复制当前预览' : '复制'}>
              <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                aria-label={previewInfo.truncated ? '复制当前预览' : '复制'}
                onClick={copyPreview}
              />
            </Tooltip>
            {previewInfo.truncated && completeSource ? (
              <Tooltip title="复制完整内容">
                <Button type="text" size="small" icon={<CopyOutlined />} aria-label="复制完整内容" onClick={copyFull} />
              </Tooltip>
            ) : null}
            {completeSource ? (
              <Tooltip title="下载完整内容">
                <Button type="text" size="small" icon={<DownloadOutlined />} aria-label="下载完整内容" onClick={handleDownload} />
              </Tooltip>
            ) : null}
          </div>
        </header>
        {previewInfo.truncated ? (
          <div className="xq-safe-code__notice">
            内容过大，已显示前 {previewInfo.previewLineCount} 行，共 {previewInfo.lineCount} 行
          </div>
        ) : null}
        <div className="xq-safe-code__body" style={maxHeight ? { maxHeight } : undefined}>
          <pre className="xq-safe-code__pre">
            <code className="xq-safe-code__code">
              {displayLines ? displayLines.map((line, index) => (
                <span className="xq-safe-code__line" key={index}>
                  <span className="xq-safe-code__line-number">{index + 1}</span>
                  <span className="xq-safe-code__line-content">{line || ' '}</span>
                </span>
              )) : visibleText}
            </code>
          </pre>
        </div>
      </section>
      <Modal
        open={modalOpen}
        title={title || language || '内容'}
        footer={null}
        centered
        width="min(960px, calc(100vw - 40px))"
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        {modalPreviewInfo.truncated ? (
          <div className="xq-safe-code__notice" style={{ marginBottom: 8 }}>
            内容过大，已显示前 {modalPreviewInfo.previewLineCount} 行，共 {modalPreviewInfo.lineCount} 行
          </div>
        ) : null}
        <div className="xq-safe-code__body" style={{ maxHeight: '70vh' }}>
          <pre className="xq-safe-code__pre">
            <code className="xq-safe-code__code">
              {modalLines ? modalLines.map((line, index) => (
                <span className="xq-safe-code__line" key={index}>
                  <span className="xq-safe-code__line-number">{index + 1}</span>
                  <span className="xq-safe-code__line-content">{line || ' '}</span>
                </span>
              )) : modalPreviewInfo.preview}
            </code>
          </pre>
        </div>
      </Modal>
    </>
  );
}

export default SafeCodeBlock;
