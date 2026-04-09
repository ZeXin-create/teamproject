'use client'

import { useEffect } from 'react'

export default function AutoRefresh() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 检查是否是首次访问
      const hasVisited = localStorage.getItem('hasVisited')
      if (!hasVisited) {
        // 标记为已访问
        localStorage.setItem('hasVisited', 'true')
        // 刷新页面
        window.location.reload()
      }
    }
  }, [])

  return null
}
