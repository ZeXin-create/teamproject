'use client'

import React, { useState, useEffect } from 'react'

interface VersionUpdateModalProps {
  version: string
  updateContent: string[]
}

export default function VersionUpdateModal({ version, updateContent }: VersionUpdateModalProps) {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // 检查是否需要显示版本更新弹窗
    const checkVersionUpdate = () => {
      const lastVersion = localStorage.getItem('lastVersion')
      if (lastVersion !== version) {
        setShowModal(true)
      }
    }

    checkVersionUpdate()
  }, [version])

  const handleClose = () => {
    // 存储当前版本号到 localStorage
    localStorage.setItem('lastVersion', version)
    setShowModal(false)
  }

  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold gradient-text">🎉 版本更新</h3>
          <button 
            className="text-gray-400 hover:text-gray-600 text-2xl"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="text-sm text-gray-400 mb-1">当前版本</div>
            <div className="font-bold text-gray-800">v{version}</div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-2">更新内容</div>
            <div className="glass-card p-4 space-y-2">
              {updateContent.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-800">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full glass-button mt-6 py-3 text-white font-medium"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}