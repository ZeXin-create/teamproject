'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [step, setStep] = useState<'input' | 'verify'>('input')
  const [errorCount, setErrorCount] = useState(0)
  const [otpExpiryCountdown, setOtpExpiryCountdown] = useState(300) // 5分钟，与阿里云设置一致
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'valid' | 'registered' | 'error'>('idle')
  const [emailMessage, setEmailMessage] = useState('')
  const { register, isLoading, successMessage, setSuccessMessage } = useAuth()
  const codeInputRef = useRef<HTMLInputElement>(null)

  // 倒计时效果
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  // 当步骤切换到验证时，自动聚焦到验证码输入框
  useEffect(() => {
    if (step === 'verify' && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [step])

  // 验证码有效期倒计时
  useEffect(() => {
    if (step === 'verify' && otpExpiryCountdown > 0) {
      const timer = setTimeout(() => {
        setOtpExpiryCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [step, otpExpiryCountdown])

  // 检查邮箱是否已注册
  const checkEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle')
      setEmailMessage('')
      return
    }

    setEmailChecking(true)
    setEmailStatus('idle')
    setEmailMessage('')

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.isRegistered) {
          setEmailStatus('registered')
          setEmailMessage(data.isVerified ? '该邮箱已注册，请直接登录' : '该邮箱已注册但未验证，请检查邮箱或直接登录')
        } else {
          setEmailStatus('valid')
          setEmailMessage('邮箱可用')
        }
      } else {
        throw new Error(data.error || '检查邮箱失败')
      }
    } catch (err: unknown) {
      setEmailStatus('error')
      setEmailMessage('检查邮箱失败，请稍后重试')
      console.error('Error checking email:', err)
    } finally {
      setEmailChecking(false)
    }
  }

  // 处理验证码输入变化
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 只允许输入数字
    const value = e.target.value.replace(/[^0-9]/g, '')
    setVerificationCode(value)
    
    // 输入完成6位后自动提交
    if (value.length === 6) {
      handleSubmit(e as any)
    }
  }

  // 发送验证码
  const handleSendCode = async () => {
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    try {
      // 检查邮箱状态
      if (emailStatus === 'registered') {
        setError('该邮箱已注册，请直接登录')
        // 3秒后跳转到登录页
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 3000)
        return
      }

      // 发送验证码前再次检查邮箱是否已注册（防止并发注册）
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok && data.isRegistered) {
        setError('该邮箱已注册，请直接登录')
        // 3秒后跳转到登录页
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 3000)
        return
      }

      // 发送验证码，显式设置有效期为 300 秒
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: true,
          data: {
            password
          },
          // 设置验证码有效期为 300 秒，与阿里云设置一致
          emailOtpExpiry: 300
        }
      })

      if (error) {
        throw error
      }

      setSuccessMessage('验证码已发送，请前往邮箱查收')
      setStep('verify')
      // 开始倒计时，60秒后才能重新发送
      setResendCountdown(60)
      // 重置验证码有效期倒计时
      setOtpExpiryCountdown(300)
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发送验证码失败，请稍后重试'
      setError(errorMessage)
      // 3秒后清除错误消息
      setTimeout(() => {
        setError('')
      }, 3000)
    }
  }

  // 验证验证码
  const handleVerifyCode = async (isAutoSubmit = false) => {
    // 检查错误次数
    if (errorCount >= 3) {
      setError('错误次数过多，请重新发送验证码')
      return
    }

    // 验证验证码格式
    if (!/^\d{6}$/.test(verificationCode)) {
      // 只有在非自动提交时才显示错误
      if (!isAutoSubmit) {
        setError('请输入6位数字验证码')
      }
      return
    }

    try {
      // 验证验证码，但不自动登录用户
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email'
      })

      if (error) {
        // 增加错误次数
        setErrorCount(prev => prev + 1)
        
        // 提供更具体的错误提示
        if (error.message.includes('expired')) {
          throw new Error('验证码已过期，请重新发送')
        } else if (error.message.includes('invalid')) {
          throw new Error('验证码错误，请重新输入')
        } else {
          throw error
        }
      }

      // 验证成功后，先退出登录（如果已自动登录）
      if (data.session) {
        await supabase.auth.signOut()
      }

      setSuccessMessage('验证成功！账号已创建，请前往登录')
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '验证码错误，请重试'
      setError(errorMessage)
      // 3秒后清除错误消息
      setTimeout(() => {
        setError('')
      }, 3000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (step === 'input') {
      await handleSendCode()
    } else {
      await handleVerifyCode(false)
    }
  }

  // 重新发送验证码
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
      // 重新发送验证码前检查邮箱是否已注册
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok && data.isRegistered) {
        setError('该邮箱已注册，请直接登录')
        // 3秒后跳转到登录页
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 3000)
        return
      }

      // 重置错误次数
      setErrorCount(0)
      // 重置验证码有效期倒计时
      setOtpExpiryCountdown(300)

      // 重新发送验证码，显式设置有效期为 300 秒
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: true,
          // 设置验证码有效期为 300 秒，与阿里云设置一致
          emailOtpExpiry: 300
        }
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
        // 3秒后清除错误消息
        setTimeout(() => {
          setError('')
        }, 3000)
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

        {!successMessage && step === 'input' && (
          <div className="mb-6 p-4 bg-blue-100/80 backdrop-blur-sm text-blue-700 rounded-2xl border border-blue-200">
            <div className="flex items-start gap-2">
              <span className="text-xl">📧</span>
              <div>
                <p className="font-medium">邮箱验证提示</p>
                <p className="text-sm mt-1">注册成功后，我们将发送6位验证码到您的邮箱，请查收并输入验证码完成注册。</p>
              </div>
            </div>
          </div>
        )}

        {!successMessage && step === 'verify' && (
          <div className="mb-6 p-4 bg-blue-100/80 backdrop-blur-sm text-blue-700 rounded-2xl border border-blue-200">
            <div className="flex items-start gap-2">
              <span className="text-xl">📧</span>
              <div>
                <p className="font-medium">验证码已发送</p>
                <p className="text-sm mt-1">请查看您的邮箱，输入收到的6位验证码完成注册。</p>
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
              onBlur={() => checkEmail(email)}
              placeholder="请输入邮箱地址"
              required
              disabled={!!successMessage || step === 'verify'}
            />
            {emailChecking && (
              <p className="text-sm text-gray-500 mt-1">
                正在检查邮箱...
              </p>
            )}
            {emailStatus === 'valid' && (
              <p className="text-sm text-green-500 mt-1">
                ✅ {emailMessage}
              </p>
            )}
            {emailStatus === 'registered' && (
              <p className="text-sm text-yellow-500 mt-1">
                ⚠️ {emailMessage}
              </p>
            )}
            {emailStatus === 'error' && (
              <p className="text-sm text-red-500 mt-1">
                ❌ {emailMessage}
              </p>
            )}
          </div>

          {!successMessage && step === 'input' && (
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

          {step === 'verify' && (
            <div>
              <label htmlFor="verificationCode" className="block text-gray-700 font-medium mb-2">
                🔑 验证码
              </label>
              <div className="relative">
                <div className="flex justify-between gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div key={index} className="flex-1">
                      <input
                        ref={index === 0 ? codeInputRef : null}
                        type="text"
                        className="w-full h-12 glass-input text-center text-xl font-medium"
                        value={verificationCode[index] || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          if (value) {
                            const newCode = verificationCode.split('')
                            newCode[index] = value[0]
                            const updatedCode = newCode.join('')
                            setVerificationCode(updatedCode)
                            // 自动聚焦到下一个输入框
                            if (index < 5) {
                              const nextInput = document.getElementById(`code-${index + 1}`) as HTMLInputElement
                              nextInput?.focus()
                            }
                            // 输入完成6位后自动提交
                            if (updatedCode.length === 6) {
                              // 使用 setTimeout 确保状态更新后再提交
                              setTimeout(() => {
                                handleVerifyCode(true)
                              }, 100)
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // 处理退格键
                          if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                            const newCode = verificationCode.split('')
                            newCode.splice(index - 1, 1)
                            setVerificationCode(newCode.join(''))
                            const prevInput = document.getElementById(`code-${index - 1}`) as HTMLInputElement
                            prevInput?.focus()
                          }
                        }}
                        placeholder=""
                        maxLength={1}
                        inputMode="numeric"
                        id={`code-${index}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                请输入邮箱收到的6位验证码（{Math.floor(otpExpiryCountdown / 60)}:{(otpExpiryCountdown % 60).toString().padStart(2, '0')}后过期）
              </p>
            </div>
          )}

          {step === 'verify' || !successMessage ? (
            <button
              type="submit"
              className="w-full glass-button py-3 text-white font-medium text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">✨</span> {step === 'input' ? '注册中...' : '验证中...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {step === 'input' ? '🎉 立即注册' : '🔑 验证验证码'}
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
                    📧 重新发送验证码
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
