import { useState, useCallback } from 'react';

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown, defaultMessage = '操作失败，请稍后重试') => {
    console.error('Error:', err);
    
    if (err instanceof Error) {
      showError(err.message);
    } else if (typeof err === 'string') {
      showError(err);
    } else {
      showError(defaultMessage);
    }
  }, [showError]);

  return {
    error,
    showError,
    clearError,
    handleError
  };
}