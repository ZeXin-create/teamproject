'use client'

import React from 'react'

export const ScrollingAnnouncement: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white py-2 overflow-hidden">
      <div className="relative">
        <div className="animate-marquee whitespace-nowrap flex">
          <span className="mx-8 flex items-center gap-2">
            📢 欢迎加入战队系统！点击右上角三条杠进入战队管理后台，选择创建或加入战队
          </span>
          <span className="mx-8 flex items-center gap-2">
            🎮 填写个人游戏资料，参与战队分组，一起征战王者峡谷
          </span>
          <span className="mx-8 flex items-center gap-2">
            👥 寻找志同道合的队友，组建最强战队
          </span>
          <span className="mx-8 flex items-center gap-2">
            📢 欢迎加入战队系统！点击右上角三条杠进入战队管理后台，选择创建或加入战队
          </span>
          <span className="mx-8 flex items-center gap-2">
            🎮 填写个人游戏资料，参与战队分组，一起征战王者峡谷
          </span>
          <span className="mx-8 flex items-center gap-2">
            👥 寻找志同道合的队友，组建最强战队
          </span>
        </div>
      </div>
    </div>
  )
}

export default ScrollingAnnouncement
