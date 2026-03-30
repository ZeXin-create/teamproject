'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
        return 'rounded-none'
      case 'rounded':
        return 'rounded-xl'
      case 'text':
      default:
        return 'rounded-md'
    }
  }

  const getAnimationClasses = () => {
    switch (animation) {
      case 'wave':
        return 'animate-shimmer'
      case 'pulse':
        return 'animate-pulse'
      case 'none':
      default:
        return ''
    }
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`bg-gray-200 ${getVariantClasses()} ${getAnimationClasses()} ${className}`}
      style={style}
    />
  )
}

// 骨架屏组合组件
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton width="60%" height={20} className="mb-2" />
          <Skeleton width="40%" height={14} />
        </div>
      </div>
      <Skeleton width="100%" height={80} className="mb-4" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rounded" />
        <Skeleton width={80} height={32} variant="rounded" />
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton width="50%" height={18} className="mb-2" />
            <Skeleton width="30%" height={14} />
          </div>
          <Skeleton width={60} height={28} variant="rounded" />
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col items-center mb-6">
        <Skeleton variant="circular" width={96} height={96} className="mb-4" />
        <Skeleton width={120} height={24} className="mb-2" />
        <Skeleton width={80} height={16} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <Skeleton width="60%" height={28} className="mx-auto mb-1" />
          <Skeleton width="80%" height={14} className="mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton width="60%" height={28} className="mx-auto mb-1" />
          <Skeleton width="80%" height={14} className="mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton width="60%" height={28} className="mx-auto mb-1" />
          <Skeleton width="80%" height={14} className="mx-auto" />
        </div>
      </div>
      <Skeleton width="100%" height={100} variant="rounded" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {/* 表头 */}
      <div className="flex gap-4 p-4 bg-gray-50 border-b">
        <Skeleton width="25%" height={20} />
        <Skeleton width="25%" height={20} />
        <Skeleton width="25%" height={20} />
        <Skeleton width="25%" height={20} />
      </div>
      {/* 表体 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
          <Skeleton width="25%" height={18} />
          <Skeleton width="25%" height={18} />
          <Skeleton width="25%" height={18} />
          <Skeleton width="25%" height={18} />
        </div>
      ))}
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {/* AI消息 */}
      <div className="flex justify-start">
        <div className="flex gap-3 max-w-[85%]">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-2">
            <Skeleton width="100%" height={60} variant="rounded" />
          </div>
        </div>
      </div>
      {/* 用户消息 */}
      <div className="flex justify-end">
        <div className="flex gap-3 max-w-[85%] flex-row-reverse">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton width="200px" height={40} variant="rounded" />
        </div>
      </div>
      {/* AI消息 */}
      <div className="flex justify-start">
        <div className="flex gap-3 max-w-[85%]">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-2">
            <Skeleton width="100%" height={80} variant="rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <Skeleton width={40} height={40} variant="rounded" className="mb-3" />
            <Skeleton width="60%" height={28} className="mb-1" />
            <Skeleton width="40%" height={14} />
          </div>
        ))}
      </div>
      {/* 图表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <Skeleton width="40%" height={20} className="mb-4" />
          <Skeleton width="100%" height={200} variant="rounded" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <Skeleton width="40%" height={20} className="mb-4" />
          <Skeleton width="100%" height={200} variant="rounded" />
        </div>
      </div>
    </div>
  )
}