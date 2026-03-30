'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

interface NavItem {
  path: string
  label: string
  icon: string
  activeIcon?: string
  requireAuth?: boolean
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: '首页',
    icon: '🏠',
    activeIcon: '🏡'
  },
  {
    path: '/teams/space',
    label: '战队',
    icon: '👥',
    activeIcon: '👨‍👩‍👧‍👦',
    requireAuth: true
  },
  {
    path: '/ai-assistant',
    label: 'AI助手',
    icon: '🤖',
    activeIcon: '🦾',
    requireAuth: true
  },
  {
    path: '/forum',
    label: '社区',
    icon: '💬',
    activeIcon: '💭'
  },
  {
    path: '/profile',
    label: '我的',
    icon: '👤',
    activeIcon: '🙋',
    requireAuth: true
  }
]

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // 滚动时隐藏/显示导航栏
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // 向下滚动超过100px时隐藏，向上滚动时显示
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // 检查是否是移动端
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isMobile) return null

  const handleNavClick = (item: NavItem) => {
    if (item.requireAuth && !user) {
      router.push('/auth/login')
      return
    }
    router.push(item.path)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  return (
    <>
      {/* 底部安全区域占位 */}
      <div className="h-16 md:hidden" />
      
      {/* 底部导航栏 */}
      <nav 
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.path)
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="text-xl mb-0.5 transition-transform duration-200">
                  {active && item.activeIcon ? item.activeIcon : item.icon}
                </span>
                <span className={`text-xs ${active ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
                
                {/* 活动指示器 */}
                {active && (
                  <div className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

// 浮动操作按钮（FAB）
interface FloatingActionButtonProps {
  icon: string
  onClick: () => void
  label?: string
  position?: 'right' | 'left'
  color?: string
}

export function FloatingActionButton({
  icon,
  onClick,
  label,
  position = 'right',
  color = 'bg-blue-500'
}: FloatingActionButtonProps) {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isMobile) return null

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-20 ${position === 'right' ? 'right-4' : 'left-4'} z-40 ${color} text-white rounded-full shadow-lg active:scale-95 transition-all duration-200 flex items-center gap-2 px-4 py-3`}
      style={{
        bottom: 'calc(5rem + env(safe-area-inset-bottom))'
      }}
    >
      <span className="text-xl">{icon}</span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  )
}

// 快速操作菜单
export function QuickActionsMenu({
  actions
}: {
  actions: Array<{
    icon: string
    label: string
    onClick: () => void
    color?: string
  }>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isMobile) return null

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      {/* 操作按钮列表 */}
      <div className={`flex flex-col gap-2 mb-2 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick()
              setIsOpen(false)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white active:scale-95 transition-all duration-200 ${
              action.color || 'bg-blue-500'
            }`}
            style={{
              transitionDelay: `${index * 50}ms`
            }}
          >
            <span>{action.icon}</span>
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
      
      {/* 主按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg text-white active:scale-95 transition-all duration-300 flex items-center justify-center ${
          isOpen ? 'bg-red-500 rotate-45' : 'bg-blue-500'
        }`}
        style={{
          bottom: 'calc(5rem + env(safe-area-inset-bottom))'
        }}
      >
        <span className="text-2xl">+</span>
      </button>
    </div>
  )
}
