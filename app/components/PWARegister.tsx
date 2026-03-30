'use client'

import { useEffect, useState } from 'react'

// PWA安装提示事件类型
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    // 注册Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker注册成功:', registration.scope)
        })
        .catch((error) => {
          console.error('[PWA] Service Worker注册失败:', error)
        })
    }

    // 监听beforeinstallprompt事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 监听appinstalled事件
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowInstallButton(false)
      console.log('[PWA] 应用已安装')
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('[PWA] 用户接受安装')
    } else {
      console.log('[PWA] 用户拒绝安装')
    }

    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  // 检查是否已安装
  const isStandalone = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  }

  if (!showInstallButton || isStandalone()) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 border border-gray-100 animate-fade-in-up">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <span className="text-white text-2xl">📱</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">添加到主屏幕</h3>
          <p className="text-sm text-gray-500">像原生应用一样快速访问</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInstallButton(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            稍后
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            安装
          </button>
        </div>
      </div>
    </div>
  )
}
