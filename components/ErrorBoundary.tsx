// ============================================================
// ErrorBoundary - React 錯誤邊界
// 捕捉子元件的渲染錯誤，防止整個應用崩潰
// 提供友善的錯誤顯示和一鍵恢復功能
// ============================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Logger } from '../services/logger';

const log = Logger.create('ErrorBoundary');

interface Props {
  children: ReactNode;
  /** 自定義錯誤畫面 (可選) */
  fallback?: ReactNode;
  /** 元件名稱標籤，方便定位錯誤來源 */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const label = this.props.label || 'Unknown';
    log.error(`元件 [${label}] 發生錯誤`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // 自定義 fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 預設錯誤畫面
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-zinc-950 border border-red-900/50 rounded-sm m-4">
          <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-800 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-2">
            系統發生錯誤
          </h3>
          
          <p className="text-sm text-zinc-400 mb-1">
            模組: <span className="font-mono text-red-400">{this.props.label || 'Unknown'}</span>
          </p>

          <p className="text-xs font-mono text-red-400 mb-6 max-w-md text-center bg-red-950/30 px-4 py-2 rounded border border-red-900/30">
            {this.state.error?.message || 'Unknown error'}
          </p>

          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest rounded-sm border border-zinc-700 transition-colors"
            >
              嘗試恢復
            </button>
            <button
              onClick={this.handleReload}
              className="px-6 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 text-xs font-bold uppercase tracking-widest rounded-sm border border-red-800 transition-colors"
            >
              重新載入頁面
            </button>
          </div>

          {/* 展開錯誤詳情 (開發用) */}
          {this.state.errorInfo && (
            <details className="mt-6 w-full max-w-lg">
              <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 font-mono uppercase tracking-widest">
                展開錯誤詳情 (Debug Info)
              </summary>
              <pre className="mt-2 p-3 bg-black border border-zinc-800 rounded text-[9px] text-zinc-500 font-mono overflow-auto max-h-48">
                {this.state.error?.stack}
                {'\n\n--- Component Stack ---\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
