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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // 检查是否已经安装过或用户已拒绝
    const hasInstalled = localStorage.getItem('pwa_installed') === 'true'
    const hasDismissed = localStorage.getItem('pwa_dismissed') === 'true'
    
    if (hasInstalled || hasDismissed) {
      console.log('[PWA] 已安装或用户已拒绝，不显示安装提示')
      return
    }

    // 注册Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/'
        })
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
      console.log('[PWA] 收到beforeinstallprompt事件')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 监听appinstalled事件
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowInstallButton(false)
      localStorage.setItem('pwa_installed', 'true')
      console.log('[PWA] 应用已安装')
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    // 检查是否已安装
    const checkInstalled = () => {
      if (isStandalone()) {
        console.log('[PWA] 应用已在独立模式运行')
        setShowInstallButton(false)
        localStorage.setItem('pwa_installed', 'true')
      } else {
        console.log('[PWA] 应用未安装')
      }
    }

    checkInstalled()

    // 监听用户交互，触发安装提示
    const handleUserInteraction = () => {
      console.log('[PWA] 用户交互，检查安装状态')
      // 确保只有在未安装且没有延迟提示时才触发
      if (!isStandalone() && !deferredPrompt && !hasInstalled && !hasDismissed) {
        console.log('[PWA] 等待beforeinstallprompt事件')
        // 主动显示安装按钮，即使beforeinstallprompt事件没有触发
        setShowInstallButton(true)
      }
    }

    // 添加用户交互事件监听器
    window.addEventListener('click', handleUserInteraction, { once: true })
    window.addEventListener('touchstart', handleUserInteraction, { once: true })
    window.addEventListener('scroll', handleUserInteraction, { once: true })

    // 3秒后自动显示安装提示
    const timer = setTimeout(() => {
      if (!isStandalone() && !deferredPrompt && !hasInstalled && !hasDismissed) {
        console.log('[PWA] 3秒后自动显示安装提示')
        setShowInstallButton(true)
      }
    }, 3000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('click', handleUserInteraction)
      window.removeEventListener('touchstart', handleUserInteraction)
      window.removeEventListener('scroll', handleUserInteraction)
    }
  }, [deferredPrompt, mounted])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('[PWA] 用户接受安装')
      } else {
        console.log('[PWA] 用户拒绝安装')
      }

      setDeferredPrompt(null)
      setShowInstallButton(false)
    } else {
      // 当deferredPrompt为null时，显示手动安装指南
      console.log('[PWA] 显示手动安装指南')
      alert('请按照以下步骤手动添加到主屏幕：\n\n1. 点击浏览器右上角的菜单按钮\n2. 选择"添加到主屏幕"或"安装应用"\n3. 按照提示完成安装')
    }
  }

  // 检查是否已安装
  const isStandalone = () => {
    if (!mounted) {
      return false
    }
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  }



  if (!mounted || isStandalone()) {
    return null
  }

  return (
    <>
      {/* 安装提示弹窗 */}
      {showInstallButton && (
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
                onClick={() => {
                  setShowInstallButton(false)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('pwa_dismissed', 'true')
                    console.log('[PWA] 用户点击了稍后，不再显示安装提示')
                  }
                }}
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
      )}
    </>
  )
}
