'use client';

import React from 'react';

interface MessageErrorBoundaryProps {
  children: React.ReactNode;
  messageId: string;
  fallbackLabel?: string;
  onError?: (messageId: string, error: Error) => void;
}

interface MessageErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * 消息级错误边界：当单条消息渲染失败时，展示占位块而非整页崩溃。
 * 提供消息 ID 便于排查和反馈。
 */
export class MessageErrorBoundary extends React.Component<
  MessageErrorBoundaryProps,
  MessageErrorBoundaryState
> {
  constructor(props: MessageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): MessageErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || '渲染异常' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[MessageErrorBoundary] 消息 ${this.props.messageId} 渲染失败:`,
      error.message,
      info.componentStack,
    );
    this.props.onError?.(this.props.messageId, error);
  }

  handleCopyId = () => {
    void navigator.clipboard.writeText(this.props.messageId);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid #fde68a',
            background: '#fffbeb',
            padding: '12px 14px',
            fontSize: 13,
            color: '#92400e',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {this.props.fallbackLabel || '该消息内容暂无法展示'}
          </div>
          <div style={{ fontSize: 12, color: '#a16207', marginBottom: 8 }}>
            原因：{this.state.errorMessage || '消息格式不兼容（如旧版本插件、自定义卡片类型已下线）'}
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={this.handleCopyId}
              style={{
                border: '1px solid #fcd34d',
                borderRadius: 6,
                background: '#fef3c7',
                color: '#92400e',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              复制消息 ID
            </button>
            <span style={{ color: '#b45309', fontSize: 11 }}>
              ID: {this.props.messageId}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
