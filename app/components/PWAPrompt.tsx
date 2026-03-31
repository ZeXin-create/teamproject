'use client'

import React, { useState, useEffect } from 'react'

interface PWAPromptProps {
  isLoggedIn: boolean
}

export const PWAPrompt: React.FC<PWAPromptProps> = ({ isLoggedIn }) => {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // 检查用户是否已经拒绝过提示
    const hasRejectedPrompt = localStorage.getItem('pwaPromptRejected') === 'true'
    if (hasRejectedPrompt) {
      return
    }

    // 检查是否支持PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
    if (isPWA) {
      return
    }

    // 监听beforeinstallprompt事件
    const handleBeforeInstallPrompt = (e: Event) => {
      // 阻止Chrome 67及更早版本自动显示安装提示
      e.preventDefault()
      // 保存事件以便稍后触发
      setDeferredPrompt(e)
      // 只有在用户登录后才显示提示
      if (isLoggedIn) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isLoggedIn])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // 显示安装提示
    deferredPrompt.prompt()

    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice
    console.log(`用户选择: ${outcome}`)

    // 无论结果如何，都不再显示提示
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // 记录用户拒绝，不再显示提示
    localStorage.setItem('pwaPromptRejected', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="glass-card p-4 rounded-2xl shadow-lg max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold gradient-text">📱 添加到桌面</h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={handleDismiss}
          >
            ×
          </button>
        </div>
        <p className="text-gray-600 mb-4">
          将王者荣耀战队助手添加到桌面，快速访问战队功能
        </p>
        <div className="flex gap-3">
          <button
            className="glass-button px-4 py-2 text-white font-medium"
            onClick={handleInstall}
          >
            添加
          </button>
          <button
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-white/50 transition-all"
            onClick={handleDismiss}
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAPrompt