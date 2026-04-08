'use client'

import { useState, useEffect, useCallback } from 'react'

// 断点定义
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

type Breakpoint = keyof typeof breakpoints

export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = windowSize.width < breakpoints.md
  const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg
  const isDesktop = windowSize.width >= breakpoints.lg
  const isLargeDesktop = windowSize.width >= breakpoints.xl

  const isGreaterThan = useCallback((bp: Breakpoint) => {
    return windowSize.width >= breakpoints[bp]
  }, [windowSize.width])

  const isLessThan = useCallback((bp: Breakpoint) => {
    return windowSize.width < breakpoints[bp]
  }, [windowSize.width])

  const isBetween = useCallback((min: Breakpoint, max: Breakpoint) => {
    return windowSize.width >= breakpoints[min] && windowSize.width < breakpoints[max]
  }, [windowSize.width])

  return {
    width: windowSize.width,
    height: windowSize.height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isGreaterThan,
    isLessThan,
    isBetween,
    breakpoints
  }
}

// 设备方向检测
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const handleOrientationChange = () => {
      const angle = window.screen.orientation?.angle || 0
      setOrientation(angle === 0 || angle === 180 ? 'portrait' : 'landscape')
    }

    handleOrientationChange()
    window.addEventListener('orientationchange', handleOrientationChange)
    return () => window.removeEventListener('orientationchange', handleOrientationChange)
  }, [])

  return orientation
}

// 触摸设备检测
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      )
    }

    checkTouch()
  }, [])

  return isTouch
}

// 安全区域Insets（用于刘海屏等）
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  useEffect(() => {
    // 检测CSS环境变量支持
    const computedStyle = getComputedStyle(document.documentElement)
    
    setInsets({
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
      right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
      left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10)
    })
  }, [])

  return insets
}

// 虚拟键盘检测
export function useVirtualKeyboard() {
  const [isOpen, setIsOpen] = useState(false)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      const visualHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.innerHeight
      const keyboardHeight = windowHeight - visualHeight
      
      setIsOpen(keyboardHeight > 100)
      setHeight(keyboardHeight)
    }

    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  return { isOpen, height }
}

// 滚动位置检测
export function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(false)

  useEffect(() => {
    let lastScrollY = 0

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const direction = currentScrollY > lastScrollY ? 'down' : 'up'
      
      setScrollY(currentScrollY)
      setScrollDirection(direction)
      setIsAtTop(currentScrollY < 10)
      setIsAtBottom(
        currentScrollY + window.innerHeight >= document.documentElement.scrollHeight - 10
      )
      
      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return {
    scrollY,
    scrollDirection,
    isAtTop,
    isAtBottom
  }
}

// 媒体查询Hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    const updateMatch = () => setMatches(media.matches)
    updateMatch()

    media.addEventListener('change', updateMatch)
    return () => media.removeEventListener('change', updateMatch)
  }, [query])

  return matches
}

// 深色模式检测
export function useDarkMode() {
  const isDark = useMediaQuery('(prefers-color-scheme: dark)')
  return { isDark }
}

// 减少动画偏好检测
export function usePrefersReducedMotion() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  return { prefersReducedMotion }
}
