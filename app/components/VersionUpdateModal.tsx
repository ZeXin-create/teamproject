'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VersionUpdateModalProps {
  version: string
  updateContent: string[]
}

export default function VersionUpdateModal({ version, updateContent }: VersionUpdateModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // 检查是否需要显示版本更新弹窗
    const checkVersionUpdate = () => {
      const lastVersion = localStorage.getItem('lastVersion')
      if (lastVersion !== version) {
        setShowModal(true)
      }
    }

    checkVersionUpdate()
  }, [version, mounted])

  const handleClose = () => {
    // 存储当前版本号到 localStorage
    localStorage.setItem('lastVersion', version)
    setShowModal(false)
  }

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              duration: 0.3,
              type: "spring",
              damping: 20,
              stiffness: 300
            }}
            className="glass-card p-8 w-full max-w-md"
          >
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
                    <motion.div 
                      key={index} 
                      className="flex items-start gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-800 text-sm">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                onClick={handleClose}
                className="w-full glass-button mt-6 py-3 text-white font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                知道了
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}