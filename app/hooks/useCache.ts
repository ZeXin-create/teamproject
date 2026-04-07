'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds, default 5 minutes
  key?: string;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// 内存缓存存储
const memoryCache = new Map<string, CacheItem<unknown>>();

// 获取缓存
function getCache<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;

  // 检查是否过期
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return item.data as T;
}

// 设置缓存
function setCache<T>(key: string, data: T, ttl: number): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl
  });
}

// 清除缓存
export function clearCache(key?: string): void {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

// 获取缓存统计
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys())
  };
}

// 数据缓存 Hook
export function useCache<T>(
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = DEFAULT_TTL, key } = options;
  const cacheKey = key || fetcher.toString();
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchCount = useRef(0);
  
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      setCache(cacheKey, result, ttl);
      setData(result);
      fetchCount.current++;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [fetcher, cacheKey, ttl]);
  
  useEffect(() => {
    // 首先尝试从缓存获取
    const cached = getCache<T>(cacheKey);
    
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      refresh();
    }
  }, [cacheKey, refresh]);
  
  return {
    data,
    loading,
    error,
    refresh,
    fetchCount: fetchCount.current
  };
}

// 乐观更新 Hook
export function useOptimistic<T>(
  initialData: T,
  updateFn: (current: T, optimistic: Partial<T>) => T
) {
  const [data, setData] = useState<T>(initialData);
  const [isPending, setIsPending] = useState(false);
  
  const update = useCallback(async (
    optimisticData: Partial<T>,
    updatePromise: Promise<T>
  ) => {
    const previousData = data;
    
    // 乐观更新
    setData(current => updateFn(current, optimisticData));
    setIsPending(true);
    
    try {
      const result = await updatePromise;
      setData(result);
      return result;
    } catch (error) {
      // 回滚
      setData(previousData);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [data, updateFn]);
  
  return { data, setData, update, isPending };
}

type AnyFunction<T> = (...args: unknown[]) => Promise<T>;

export function useDebouncedRequest<T>(
  requestFn: AnyFunction<T>,
  delay: number = 300
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback((...args: unknown[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await requestFn(...args);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [requestFn, delay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return { data, loading, error, execute };
}

// 预加载 Hook
export function usePrefetch<T>(
  fetcher: () => Promise<T>,
  condition: boolean = true
) {
  const [prefetched, setPrefetched] = useState(false);
  
  useEffect(() => {
    if (condition && !prefetched) {
      fetcher().then(() => setPrefetched(true));
    }
  }, [condition, fetcher, prefetched]);
  
  return prefetched;
}
