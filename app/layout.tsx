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

      // 版本控制和缓存管理
      const storedVersion = localStorage.getItem('appVersion')
      if (storedVersion !== APP_VERSION) {
        console.log(`版本更新: ${storedVersion || '首次访问'} -> ${APP_VERSION}`)
        
        // 清除旧版本缓存
        if ('caches' in window) {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              caches.delete(cacheName)
              console.log('已清除缓存:', cacheName)
            })
          })
        }

        // 清除并重新注册 Service Worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
              registration.unregister()
              console.log('已注销旧的 Service Worker')
            })
          })
        }

        // 存储新版本号
        localStorage.setItem('appVersion', APP_VERSION)
        
        // 强制刷新页面以加载新版本
        if (storedVersion) {
          window.location.reload()
        }
      }

      // 注册新版本的 Service Worker（如果还没注册）
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
        <title>战队系统</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
                "版本更新：从 1.0.6 升级到 1.0.8",
                "战队空间：添加战队统计卡片（成员数、比赛数、胜率）",
                "战队空间：优化近期活动展示，添加动画效果",
                "战队空间：新增地区、省份、城市标签显示",
                "战队空间：改进移动端菜单，采用侧边栏滑入效果",
                "战队空间：优化整体视觉效果，添加玻璃拟态、渐变背景等现代 UI 元素",
                "类型定义：完善论坛分类的类型定义和映射表",
                "类型定义：扩展战队销售的类型定义",
                "类型定义：改进分类标签和颜色的获取函数",
                "数据查询：修复数据查询问题，确保数据正确显示",
                "数据查询：优化类型转换，解决类型错误",
                "工具脚本：添加数据库结构检查脚本，用于验证数据库表结构",
                "代码质量：修复多个 ESLint 错误，确保代码符合规范",
                "用户体验：使用 Framer Motion 实现平滑的动画效果",
                "响应式设计：优化移动端适配，提供更好的移动设备体验"
              ]} 
            />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
