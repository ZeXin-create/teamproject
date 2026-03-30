'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  pullDistance?: number
  maxPullDistance?: number
  refreshThreshold?: number
  indicator?: React.ReactNode
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = '',
  pullDistance = 80,
  maxPullDistance = 120,
  refreshThreshold = 60,
  indicator
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const [canPull, setCanPull] = useState(true)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isDragging = useRef(false)

  // 检查是否可以下拉（是否在顶部）
  const checkCanPull = useCallback(() => {
    if (!containerRef.current) return false
    const scrollTop = containerRef.current.scrollTop
    return scrollTop <= 0
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!checkCanPull() || isRefreshing) return
    
    startY.current = e.touches[0].clientY
    currentY.current = startY.current
    isDragging.current = true
    setCanPull(true)
  }, [checkCanPull, isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !canPull) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    // 只有向下拉动才触发
    if (diff > 0) {
      e.preventDefault()
      
      // 使用阻尼效果
      const dampedDiff = Math.min(diff * 0.5, maxPullDistance)
      setPullProgress(dampedDiff)
      setIsPulling(dampedDiff > 10)
    }
  }, [canPull, maxPullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return
    
    isDragging.current = false
    setIsPulling(false)

    // 如果拉动距离超过阈值，触发刷新
    if (pullProgress >= refreshThreshold) {
      setIsRefreshing(true)
      setPullProgress(pullDistance)
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('刷新失败:', error)
      } finally {
        setIsRefreshing(false)
        setPullProgress(0)
      }
    } else {
      // 未达到阈值，回弹
      setPullProgress(0)
    }
  }, [pullProgress, refreshThreshold, pullDistance, onRefresh])

  // 监听滚动，更新是否可以下拉
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setCanPull(container.scrollTop <= 0)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // 计算指示器旋转角度
  const rotation = Math.min((pullProgress / refreshThreshold) * 360, 360)

  const defaultIndicator = (
    <div className="flex flex-col items-center justify-center py-4">
      <div 
        className={`w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent transition-all duration-200 ${
          isRefreshing ? 'animate-spin' : ''
        }`}
        style={{
          transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
          opacity: pullProgress > 10 ? 1 : 0
        }}
      />
      <span className="text-xs text-gray-500 mt-2">
        {isRefreshing 
          ? '刷新中...' 
          : pullProgress >= refreshThreshold 
            ? '释放刷新' 
            : '下拉刷新'
        }
      </span>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto overflow-x-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      {/* 下拉指示器区域 */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: pullProgress,
          opacity: pullProgress > 0 ? 1 : 0
        }}
      >
        {indicator || defaultIndicator}
      </div>

      {/* 内容区域 */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isPulling || isRefreshing ? pullProgress * 0.3 : 0}px)`
        }}
      >
        {children}
      </div>
    </div>
  )
}

// 简化的下拉刷新Hook
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  return {
    isRefreshing,
    handleRefresh,
    PullToRefreshComponent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <PullToRefresh onRefresh={handleRefresh} className={className}>
        {children}
      </PullToRefresh>
    )
  }
}
