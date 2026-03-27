'use client'

import React, { useState } from 'react'
import Navbar from './components/Navbar'
import TabContent from './components/TabContent'

export default function Home() {
  const [activeTab, setActiveTab] = useState(0)
  
  const tabs = [
    '招募大厅',
    '战队列表',
    '战区排行',
    '战队/ID出售'
  ]
  
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="flex overflow-x-auto mb-6 border-b">
          {tabs.map((tab, index) => (
            <button
              key={index}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === index ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
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