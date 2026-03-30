'use client'

import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import TabContent from './components/TabContent'

export default function Home() {
  const [activeTab, setActiveTab] = useState(0)

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

  const tabs = [
    '招募大厅',
    '战队列表',
    '战区排行',
    '战队/ID出售',
    '贴吧社区'
  ]

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="flex overflow-x-auto mb-6 border-b">
          {tabs.map((tab, index) => (
            <button
              key={index}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-300 transform hover:scale-105 hover:shadow-md ${activeTab === index ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab(index)}
            >
              {tab}
            </button>
          ))}
        </div>
        <TabContent activeTab={activeTab} />
      </div>
    </div>
  )
}