'use client';

import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface ErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

// 错误回退组件
export function ErrorFallback({ resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4">页面出错了</h2>
        <p className="text-gray-600 mb-6">
          很抱歉，页面加载过程中出现了错误。请尝试刷新页面继续使用。
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          刷新页面
        </button>
      </div>
    </div>
  );
}

// 错误边界组件
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;