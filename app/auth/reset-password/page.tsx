'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null)
  const router = useRouter()

  // 检查URL中的token
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user) {
        setSession({
          user: {
            id: session.user.id,
            email: session.user.email || ''
          }
        })
      } else {
        setError('重置链接无效或已过期')
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password
      })

      if (error) {
        throw error
      }

      setSuccess('密码重置成功！')
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '密码重置失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold gradient-text">重置密码</h1>
          <p className="text-gray-500 mt-2">设置您的新密码</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-2xl border border-green-200 text-center">
            {success}
          </div>
        )}

        {session ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                🔒 新密码
              </label>
              <input
                type="password"
                id="password"
                className="glass-input w-full px-4 py-3 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
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
                placeholder="请再次输入新密码"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full glass-button py-3 text-white font-medium text-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">✨</span> 重置中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  🎉 重置密码
                </span>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-gray-600 mb-4">重置链接无效或已过期</p>
            <Link 
              href="/auth/forgot-password" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新发送重置链接
            </Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            想起密码了？{' '}
            <Link href="/auth/login" className="text-pink-500 hover:text-pink-600 font-medium transition-colors">
              立即登录 🚀
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}