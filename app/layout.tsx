'use client'

import './globals.css'
import { AuthProvider } from './context/AuthContext'
import { useEffect } from 'react'
import PWARegister from './components/PWARegister'
import OnboardingGuide from './components/OnboardingGuide'

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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="战队管理" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <PWARegister />
          <OnboardingGuide />
        </AuthProvider>
      </body>
    </html>
  )
}
