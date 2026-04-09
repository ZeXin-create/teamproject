'use client';

import './globals.css'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Inter } from 'next/font/google'

// 优化字体加载
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
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
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
            <AnimatePresence>
              <PageTransition>
                {children}
              </PageTransition>
            </AnimatePresence>
            <OnboardingGuide />
            <VersionUpdateModal 
              version={APP_VERSION} 
              updateContent={[
                "智能分组系统：修复数据合并逻辑，确保有效数据不被覆盖",
                "智能分组系统：实现时间区间兼容性，时间多的队员兼容时间少的队员",
                "智能分组系统：修复分组算法，确保每组最多5人，优先覆盖5个位置",
                "智能分组系统：修复位置解析问题，正确读取'射手'映射为'发育路'的数据",
                "智能分组系统：添加23条完整的模拟数据用于测试",
                "智能分组系统：移除可视化分析功能，简化页面",
                "页面样式：优化智能分组页面，添加玻璃拟态、呼吸感设计和现代UI元素",
                "错误修复：修复队长踢出队员时的500错误，修复队长查找失败问题",
                "用户体验：为分组操作添加加载动画和进度提示，改进错误处理"
              ]} 
            />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
