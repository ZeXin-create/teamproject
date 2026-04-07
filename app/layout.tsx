'use client';

import './globals.css'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Inter } from 'next/font/google'

// 优化字体加载
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

import OnboardingGuide from './components/OnboardingGuide'
import VersionUpdateModal from './components/VersionUpdateModal'
import PageTransition from './components/PageTransition'
import { APP_VERSION } from './utils/version'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const hasVisited = localStorage.getItem('hasVisited')
    if (!hasVisited) {
      localStorage.setItem('hasVisited', 'true')
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker 注册成功:', registration.scope)
        })
        .catch((error) => {
          console.log('Service Worker 注册失败:', error)
        })
    }
  }, [])
      
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ff6b9d" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="战队助手" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <NotificationProvider>
            <AnimatePresence mode="wait">
              <PageTransition>
                {children}
              </PageTransition>
            </AnimatePresence>
            <OnboardingGuide />
            <VersionUpdateModal 
              version={APP_VERSION} 
              updateContent={[
                "优化了智能分组页面的性能，添加了数据缓存和虚拟列表",
                "增强了智能分组页面的用户体验，添加了分组动画和进度提示",
                "恢复了智能分组页面的拖拽功能和历史分组功能",
                "优化了智能分组页面的可访问性，添加了键盘导航和ARIA属性",
                "完善了智能分组页面的响应式设计，优化了移动端体验",
                "增强了智能分组页面的错误处理，添加了详细的错误提示",
                "优化了智能分组页面的代码结构，拆分了组件和添加了类型定义",
                "修复了智能分组页面的JSX语法错误，确保页面正常运行"
              ]} 
            />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
