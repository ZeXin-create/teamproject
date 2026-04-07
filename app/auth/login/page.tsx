'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { APP_VERSION } from '../../utils/version'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const { login, isLoading, successMessage, setSuccessMessage } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // 解决 hydration 错误
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)
      setSuccessMessage('登录成功！欢迎回来')
      
      // 1秒后跳转到首页
      setTimeout(() => {
        // 检查是否有重定向参数
        const redirect = searchParams.get('redirect')
        if (redirect) {
          router.push(redirect)
          return
        }

        // 跳转到首页
        router.push('/')
      }, 1000)
    } catch {
      setError('登录失败，请检查邮箱和密码')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold gradient-text">欢迎回来</h1>
          <p className="text-gray-500 mt-2">登录您的战队管理账号</p>
        </div>

        {isMounted && error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200 text-center">
            {error}
          </div>
        )}

        {isMounted && successMessage && (
          <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-2xl border border-green-200 text-center">
            {successMessage}
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
              placeholder="请输入密码"
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
                <span className="animate-spin">✨</span> 登录中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🚀 登录
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            还没有账号？{' '}
            <Link href="/auth/register" className="text-pink-500 hover:text-pink-600 font-medium transition-colors">
              立即注册 ✨
            </Link>
          </p>
          <p className="text-gray-600 mb-4">
            <Link href="/auth/forgot-password" className="text-blue-500 hover:text-blue-600 font-medium transition-colors">
              忘记密码？
            </Link>
          </p>
          <p className="text-gray-400 text-xs mt-4" suppressHydrationWarning={true}>
            当前版本 {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  )
}
