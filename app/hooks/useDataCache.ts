'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface UseDataCacheOptions<T> {
  key: string
  fetcher: () => Promise<T>
  ttl?: number // 缓存有效期（毫秒），默认5分钟
  enabled?: boolean
  onError?: (error: Error) => void
}

export function useDataCache<T>({
  key,
  fetcher,
  ttl = 5 * 60 * 1000, // 5分钟
  enabled = true,
  onError
}: UseDataCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)

  // 生成缓存键
  const getCacheKey = useCallback(() => `data_cache_${key}`, [key])

  // 从缓存读取数据
  const getCachedData = useCallback((): CacheEntry<T> | null => {
    try {
      const cached = localStorage.getItem(getCacheKey())
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached)
        if (Date.now() < entry.expiresAt) {
          return entry
        }
        // 缓存过期，删除
        localStorage.removeItem(getCacheKey())
      }
    } catch (e) {
      console.error('读取缓存失败:', e)
    }
    return null
  }, [getCacheKey])

  // 保存数据到缓存
  const setCachedData = useCallback((newData: T) => {
    try {
      const entry: CacheEntry<T> = {
        data: newData,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      }
      localStorage.setItem(getCacheKey(), JSON.stringify(entry))
    } catch (e) {
      console.error('保存缓存失败:', e)
    }
  }, [getCacheKey, ttl])

  // 清除缓存
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(getCacheKey())
      setData(null)
    } catch (e) {
      console.error('清除缓存失败:', e)
    }
  }, [getCacheKey])

  // 刷新数据（强制重新获取）
  const refresh = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const newData = await fetcher()
      if (isMountedRef.current) {
        setData(newData)
        setCachedData(newData)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取数据失败')
      if (isMountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [enabled, fetcher, setCachedData, onError])

  // 初始加载
  useEffect(() => {
    if (!enabled) return

    const cached = getCachedData()
    if (cached) {
      setData(cached.data)
    } else {
      refresh()
    }
  }, [enabled, getCachedData, refresh])

  // 清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    data,
    isLoading,
    error,
    refresh,
    clearCache
  }
}

// 内存缓存（用于组件间共享数据）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoryCache = new Map<string, CacheEntry<any>>()

export function useMemoryCache<T>({
  key,
  fetcher,
  ttl = 5 * 60 * 1000,
  enabled = true,
  onError
}: UseDataCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)

  // 从内存缓存读取
  const getCachedData = useCallback((): CacheEntry<T> | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined
    if (entry && Date.now() < entry.expiresAt) {
      return entry
    }
    if (entry) {
      memoryCache.delete(key)
    }
    return null
  }, [key])

  // 保存到内存缓存
  const setCachedData = useCallback((newData: T) => {
    const entry: CacheEntry<T> = {
      data: newData,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
    memoryCache.set(key, entry)
  }, [key, ttl])

  // 清除缓存
  const clearCache = useCallback(() => {
    memoryCache.delete(key)
    setData(null)
  }, [key])

  // 刷新数据
  const refresh = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const newData = await fetcher()
      if (isMountedRef.current) {
        setData(newData)
        setCachedData(newData)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取数据失败')
      if (isMountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [enabled, fetcher, setCachedData, onError])

  // 初始加载
  useEffect(() => {
    if (!enabled) return

    const cached = getCachedData()
    if (cached) {
      setData(cached.data)
    } else {
      refresh()
    }
  }, [enabled, getCachedData, refresh])

  // 清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    data,
    isLoading,
    error,
    refresh,
    clearCache
  }
}

// 批量预加载数据
export function usePrefetchData<T>(
  keys: string[],
  fetchers: Record<string, () => Promise<T>>
) {
  useEffect(() => {
    keys.forEach((key) => {
      const fetcher = fetchers[key]
      if (fetcher) {
        fetcher().catch((err) => {
          console.error(`预加载数据失败 [${key}]:`, err)
        })
      }
    })
  }, [keys, fetchers])
}

// 清理过期缓存
export function clearExpiredCache() {
  const now = Date.now()
  
  // 清理localStorage缓存
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith('data_cache_')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entry: CacheEntry<any> = JSON.parse(localStorage.getItem(key) || '')
          if (now > entry.expiresAt) {
            localStorage.removeItem(key)
          }
        } catch {
          localStorage.removeItem(key)
        }
      }
    }
  } catch (e) {
    console.error('清理localStorage缓存失败:', e)
  }

  // 清理内存缓存
  memoryCache.forEach((entry, key) => {
    if (now > entry.expiresAt) {
      memoryCache.delete(key)
    }
  })
}