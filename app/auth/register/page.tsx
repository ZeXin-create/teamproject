'use client'

import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { register, isLoading } = useAuth()
  const router = useRouter()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    
    try {
      await register(email, password)
      router.push('/')
    } catch (err) {
      setError('注册失败，请稍后重试')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-3xl font-bold gradient-text">创建账号</h1>
          <p className="text-gray-500 mt-2">加入战队管理系统，开启游戏之旅</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200 text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              📧 邮箱
            </label>
            <input
              type="email"
              id="email"
              className="glass-input w-full px-4 py-3 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              🔒 密码
            </label>
            <input
              type="password"
              id="password"
              className="glass-input w-full px-4 py-3 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请设置密码（至少6位）"
              required
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
              🔐 确认密码
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="glass-input w-full px-4 py-3 outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full glass-button py-3 text-white font-medium text-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">✨</span> 注册中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🎉 立即注册
              </span>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            已有账号？{' '}
            <Link href="/auth/login" className="text-pink-500 hover:text-pink-600 font-medium transition-colors">
              立即登录 🚀
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
