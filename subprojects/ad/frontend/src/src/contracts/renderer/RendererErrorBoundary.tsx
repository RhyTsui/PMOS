import React from 'react';

export interface RendererErrorBoundaryProps {
  regionId: string;
  binding: string;
  rendererVersion?: string;
  onError?: (error: Error, info: React.ErrorInfo, context: { regionId: string; binding: string; rendererVersion?: string }) => void;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export interface RendererErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class RendererErrorBoundary extends React.Component<RendererErrorBoundaryProps, RendererErrorBoundaryState> {
  state: RendererErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info, {
      regionId: this.props.regionId,
      binding: this.props.binding,
      rendererVersion: this.props.rendererVersion,
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" data-renderer-error-boundary="true" data-region-id={this.props.regionId}>
          当前区域渲染失败，已降级展示。
        </div>
      );
    }

    return this.props.children;
  }
}
