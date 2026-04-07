'use client'

import React, { useEffect, useState } from 'react'
import MobileBottomNav, { FloatingActionButton, QuickActionsMenu } from './MobileBottomNav'
import PullToRefresh from './PullToRefresh'

interface MobileLayoutProps {
  children: React.ReactNode
  className?: string
  showBottomNav?: boolean
  showFab?: boolean
  fabConfig?: {
    icon: string
    onClick: () => void
    label?: string
    position?: 'right' | 'left'
    color?: string
  }
  quickActions?: Array<{
    icon: string
    label: string
    onClick: () => void
    color?: string
  }>
  onRefresh?: () => Promise<void>
  enablePullToRefresh?: boolean
  header?: React.ReactNode
  headerClassName?: string
}

export default function MobileLayout({
  children,
  className = '',
  showBottomNav = true,
  showFab = false,
  fabConfig,
  quickActions,
  onRefresh,
  enablePullToRefresh = false,
  header,
  headerClassName = ''
}: MobileLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const content = enablePullToRefresh && onRefresh ? (
    <PullToRefresh onRefresh={onRefresh} className="min-h-full">
      {children}
    </PullToRefresh>
  ) : (
    children
  )

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* 移动端头部 */}
      {header && isMobile && (
        <header className={`sticky top-0 z-40 bg-white border-b border-gray-200 md:hidden ${headerClassName}`}>
          {header}
        </header>
      )}

      {/* 主内容区域 */}
      <main className={`${isMobile ? 'pb-16' : ''}`}>
        {content}
      </main>

      {/* 底部导航栏 */}
      {showBottomNav && <MobileBottomNav />}

      {/* 浮动操作按钮 */}
      {showFab && fabConfig && (
        <FloatingActionButton {...fabConfig} />
      )}

      {/* 快速操作菜单 */}
      {quickActions && quickActions.length > 0 && (
        <QuickActionsMenu actions={quickActions} />
      )}
    </div>
  )
}

// 移动端卡片组件
export function MobileCard({
  children,
  className = '',
  onClick,
  padding = 'normal'
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  padding?: 'none' | 'small' | 'normal' | 'large'
}) {
  const paddingClasses = {
    none: '',
    small: 'p-3',
    normal: 'p-4',
    large: 'p-6'
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
        paddingClasses[padding]
      } ${onClick ? 'active:scale-[0.98] transition-transform duration-150' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

// 移动端列表项
export function MobileListItem({
  icon,
  title,
  subtitle,
  rightContent,
  onClick,
  className = '',
  showArrow = true
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  rightContent?: React.ReactNode
  onClick?: () => void
  className?: string
  showArrow?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 bg-white active:bg-gray-50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          {icon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{title}</div>
        {subtitle && (
          <div className="text-sm text-gray-500 truncate">{subtitle}</div>
        )}
      </div>

      {rightContent && (
        <div className="flex-shrink-0">{rightContent}</div>
      )}

      {showArrow && onClick && (
        <div className="flex-shrink-0 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  )
}

// 移动端分段控制器
export function MobileSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = ''
}: {
  options: Array<{ value: T; label: string; icon?: string }>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
            value === option.value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option.icon && <span>{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  )
}

// 移动端搜索栏
export function MobileSearchBar({
  value,
  onChange,
  placeholder = '搜索...',
  onSearch,
  className = ''
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSearch?: () => void
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onSearch?.()}
        placeholder={placeholder}
        className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// 移动端标签页
export function MobileTabs({
  tabs,
  activeTab,
  onChange,
  className = ''
}: {
  tabs: Array<{ id: string; label: string; badge?: number }>
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// 移动端空状态
export function MobileEmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: {
  icon: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  )
}
