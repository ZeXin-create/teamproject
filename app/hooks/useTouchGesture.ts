'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface TouchPosition {
  x: number
  y: number
}

interface SwipeData {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
}

interface UseTouchGestureOptions {
  onSwipeLeft?: (data: SwipeData) => void
  onSwipeRight?: (data: SwipeData) => void
  onSwipeUp?: (data: SwipeData) => void
  onSwipeDown?: (data: SwipeData) => void
  onTap?: (position: TouchPosition) => void
  onLongPress?: (position: TouchPosition) => void
  onPinch?: (scale: number) => void
  onRotate?: (angle: number) => void
  threshold?: number
  longPressDelay?: number
}

export function useTouchGesture(options: UseTouchGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onLongPress,
    onPinch,
    onRotate,
    threshold = 50,
    longPressDelay = 500
  } = options

  const elementRef = useRef<HTMLElement | null>(null)
  const startPos = useRef<TouchPosition | null>(null)
  const startTime = useRef<number>(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)
  
  // 多点触控
  const initialDistance = useRef<number>(0)
  const initialAngle = useRef<number>(0)

  const getTouchPosition = (touch: Touch): TouchPosition => ({
    x: touch.clientX,
    y: touch.clientY
  })

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getAngle = (touch1: Touch, touch2: Touch): number => {
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    ) * (180 / Math.PI)
  }

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    startPos.current = getTouchPosition(touch)
    startTime.current = Date.now()
    isLongPress.current = false

    // 长按检测
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress?.(startPos.current!)
    }, longPressDelay)

    // 双指缩放/旋转
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches[0], e.touches[1])
      initialAngle.current = getAngle(e.touches[0], e.touches[1])
    }
  }, [longPressDelay, onLongPress])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // 清除长按计时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // 双指手势
    if (e.touches.length === 2 && startPos.current) {
      e.preventDefault()
      
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const currentAngle = getAngle(e.touches[0], e.touches[1])
      
      if (initialDistance.current > 0) {
        const scale = currentDistance / initialDistance.current
        onPinch?.(scale)
      }
      
      if (initialAngle.current !== 0) {
        const rotation = currentAngle - initialAngle.current
        onRotate?.(rotation)
      }
    }
  }, [onPinch, onRotate])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // 清除长按计时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (!startPos.current || isLongPress.current) return

    const touch = e.changedTouches[0]
    const endPos = getTouchPosition(touch)
    const endTime = Date.now()
    
    const deltaX = endPos.x - startPos.current.x
    const deltaY = endPos.y - startPos.current.y
    const deltaTime = endTime - startTime.current
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / deltaTime

    // 检测滑动
    if (distance > threshold) {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      
      const swipeData: SwipeData = {
        direction: absX > absY 
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up'),
        distance,
        velocity
      }

      if (absX > absY) {
        if (deltaX > 0) {
          onSwipeRight?.(swipeData)
        } else {
          onSwipeLeft?.(swipeData)
        }
      } else {
        if (deltaY > 0) {
          onSwipeDown?.(swipeData)
        } else {
          onSwipeUp?.(swipeData)
        }
      }
    } else if (distance < 10 && deltaTime < 200) {
      // 点击
      onTap?.(endPos)
    }

    startPos.current = null
    initialDistance.current = 0
    initialAngle.current = 0
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return elementRef
}

// 滑动切换Hook（用于轮播、标签页等）
export function useSwipeSwitch(
  onSwitch: (direction: 'left' | 'right') => void,
  threshold = 50
) {
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const currentX = e.touches[0].clientX
    const diff = currentX - startX
    setTranslateX(diff)
  }, [isDragging, startX])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    if (translateX > threshold) {
      onSwitch('right')
    } else if (translateX < -threshold) {
      onSwitch('left')
    }
    
    setIsDragging(false)
    setTranslateX(0)
  }, [isDragging, translateX, threshold, onSwitch])

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    translateX,
    isDragging
  }
}

// 双指缩放Hook
export function usePinchZoom(
  onZoom: (scale: number) => void,
  minScale = 0.5,
  maxScale = 3
) {
  const [scale, setScale] = useState(1)
  const initialDistance = useRef(0)
  const initialScale = useRef(1)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      )
      initialDistance.current = distance
      initialScale.current = scale
    }
  }, [scale])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const distance = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      )
      
      if (initialDistance.current > 0) {
        const newScale = Math.min(
          maxScale,
          Math.max(minScale, initialScale.current * (distance / initialDistance.current))
        )
        setScale(newScale)
        onZoom(newScale)
      }
    }
  }, [minScale, maxScale, onZoom])

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = 0
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1)
    onZoom(1)
  }, [onZoom])

  return {
    scale,
    resetZoom,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
}
