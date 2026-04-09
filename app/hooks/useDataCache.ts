'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// 全局缓存存储
const globalCache: Record<string, CacheItem<unknown>> = {};

// 缓存有效期（5分钟）
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * 数据缓存Hook
 * 用于缓存数据，避免重复请求
 */
export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    enabled?: boolean;
    refreshInterval?: number;
  }
) {
  const { enabled = true, refreshInterval } = options || {};
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // 检查缓存
    const cached = globalCache[key] as CacheItem<T> | undefined;
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      // 使用缓存数据
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      
      // 更新缓存
      globalCache[key] = {
        data: result,
        timestamp: now,
      };
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    if (!enabled) return;

    // 首次加载或强制刷新
    if (isFirstLoad.current) {
      fetchData();
      isFirstLoad.current = false;
    }

    // 定时刷新
    let intervalId: NodeJS.Timeout | null = null;
    if (refreshInterval) {
      intervalId = setInterval(() => {
        fetchData(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [enabled, fetchData, refreshInterval]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    delete globalCache[key];
    isFirstLoad.current = true;
    setData(null);
  }, [key]);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate,
  };
}

/**
 * 清除特定缓存
 */
export function invalidateCache(key: string) {
  delete globalCache[key];
}

/**
 * 清除所有缓存
 */
export function clearAllCache() {
  Object.keys(globalCache).forEach(key => {
    delete globalCache[key];
  });
}
