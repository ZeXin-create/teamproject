'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const { register, isLoading, successMessage, setSuccessMessage } = useAuth()

  // 倒计时效果
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    try {
      await register(email, password)
      setSuccessMessage('注册成功！验证邮件已发送，请前往邮箱查收')
      // 开始倒计时，60秒后才能重新发送
      setResendCountdown(60)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '注册失败，请稍后重试'
      setError(errorMessage)
    }
  }

  // 重新发送验证邮件
  const handleResendEmail = async () => {
    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    if (resendCountdown > 0) {
      return
    }

    setResendLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        throw error
      }

      setResendSuccess(true)
      setResendCountdown(60) // 60秒后才能再次发送
      setTimeout(() => {
        setResendSuccess(false)
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '重新发送失败，请稍后重试'
      setError(errorMessage)
    } finally {
      setResendLoading(false)
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

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-2xl border border-green-200 text-center">
            {successMessage}
          </div>
        )}

        {resendSuccess && (
          <div className="mb-6 p-4 bg-blue-100/80 backdrop-blur-sm text-blue-700 rounded-2xl border border-blue-200 text-center">
            验证邮件已重新发送，请查收
          </div>
        )}

        {!successMessage && (
          <div className="mb-6 p-4 bg-blue-100/80 backdrop-blur-sm text-blue-700 rounded-2xl border border-blue-200">
            <div className="flex items-start gap-2">
              <span className="text-xl">📧</span>
              <div>
                <p className="font-medium">邮箱验证提示</p>
                <p className="text-sm mt-1">注册成功后，请前往您的邮箱点击确认链接完成注册流程。</p>
              </div>
            </div>
          </div>
        )}

        {/* 邮件发送提示 */}
        {successMessage && (
          <div className="mb-6 p-4 bg-yellow-100/80 backdrop-blur-sm text-yellow-800 rounded-2xl border border-yellow-200">
            <div className="flex items-start gap-2">
              <span className="text-xl">⏰</span>
              <div>
                <p className="font-medium">邮件发送说明</p>
                <p className="text-sm mt-1">
                  邮件可能需要 1-5 分钟到达，请耐心等待。如果长时间未收到，请检查垃圾邮件文件夹或点击重新发送。
                </p>
              </div>
            </div>
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
              disabled={!!successMessage}
            />
          </div>

          {!successMessage && (
            <>
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
            </>
          )}

          {!successMessage ? (
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
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResendEmail}
                className="w-full glass-button py-3 text-white font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={resendLoading || resendCountdown > 0}
              >
                {resendLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">✨</span> 发送中...
                  </span>
                ) : resendCountdown > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    ⏰ {resendCountdown}秒后可重新发送
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    📧 重新发送验证邮件
                  </span>
                )}
              </button>

              <Link
                href="/auth/login"
                className="w-full block text-center py-3 text-pink-500 hover:text-pink-600 font-medium transition-colors border-2 border-pink-500 rounded-2xl hover:bg-pink-50"
              >
                前往登录 🚀
              </Link>
            </div>
          )}
        </form>

        {!successMessage && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              已有账号？{' '}
              <Link href="/auth/login" className="text-pink-500 hover:text-pink-600 font-medium transition-colors">
                立即登录 🚀
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
