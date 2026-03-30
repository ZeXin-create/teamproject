'use client'

import './globals.css'
import { AuthProvider } from './context/AuthContext'
import { useEffect } from 'react'

import OnboardingGuide from './components/OnboardingGuide'
import VersionUpdateModal from './components/VersionUpdateModal'
import { APP_VERSION } from './utils/version'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // 检查是否是首次访问
    const hasVisited = localStorage.getItem('hasVisited')
    if (!hasVisited) {
      // 标记为已访问
      localStorage.setItem('hasVisited', 'true')
      // 刷新页面
      window.location.reload()
    }
  }, [])

  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="战队管理" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <OnboardingGuide />
          <VersionUpdateModal 
            version={APP_VERSION} 
            updateContent={[
              "修复了加入战队功能的数据同步问题",
              "优化了战队管理页面的权限检查逻辑",
              "添加了版本更新提示功能",
              "修复了部分图标显示异常的问题"
            ]} 
          />
        </AuthProvider>
      </body>
    </html>
  )
}
