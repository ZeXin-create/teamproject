'use client'

import React, { useState, useEffect } from 'react'

interface NotificationProps {
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
  onClose?: () => void
}

export default function Notification({ 
  message, 
  type, 
  duration = 3000, 
  onClose 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          onClose?.()
        }, 300)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500',
          border: 'border-green-600',
          icon: '✓',
          shadow: 'shadow-green-200'
        }
      case 'error':
        return {
          bg: 'bg-red-500',
          border: 'border-red-600',
          icon: '✕',
          shadow: 'shadow-red-200'
        }
      case 'info':
        return {
          bg: 'bg-blue-500',
          border: 'border-blue-600',
          icon: 'ℹ',
          shadow: 'shadow-blue-200'
        }
      default:
        return {
          bg: 'bg-gray-500',
          border: 'border-gray-600',
          icon: 'ℹ',
          shadow: 'shadow-gray-200'
        }
    }
  }

  const styles = getTypeStyles()

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full ${styles.bg} ${styles.border} border-l-4 text-white p-4 rounded-lg shadow-lg ${styles.shadow} transform transition-all duration-300 ease-out animate-slide-in-right`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => {
              onClose?.()
            }, 300)
          }}
          className="text-white/80 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// 通知管理钩子
export function useNotification() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'info'
    duration?: number
  }>>([])

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { id, message, type, duration }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const success = (message: string, duration?: number) => {
    addNotification(message, 'success', duration)
  }

  const error = (message: string, duration?: number) => {
    addNotification(message, 'error', duration)
  }

  const info = (message: string, duration?: number) => {
    addNotification(message, 'info', duration)
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info
  }
}

// 通知容器组件
export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification()

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}