'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('正在处理验证...')
  const [error, setError] = useState('')

  // 使用useState和useEffect来模拟useSearchParams的功能
  const [searchParams, setSearchParams] = useState<Record<string, string>>({})

  useEffect(() => {
    // 在客户端获取URL参数
    const params = new URLSearchParams(window.location.search)
    const paramsObj: Record<string, string> = {}
    params.forEach((value, key) => {
      paramsObj[key] = value
    })
    setSearchParams(paramsObj)
  }, [])

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (Object.keys(searchParams).length === 0) return

      try {
        // 获取 URL 中的 access_token 和 refresh_token
        const accessToken = searchParams['access_token']
        const refreshToken = searchParams['refresh_token']
        const type = searchParams['type']

        if (type === 'signup' || type === 'recovery') {
          if (accessToken && refreshToken) {
            // 使用 token 设置会话
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (error) {
              throw error
            }

            setMessage('验证成功！正在跳转...')
            setTimeout(() => {
              router.push('/')
            }, 2000)
          } else {
            throw new Error('验证链接无效或已过期')
          }
        } else {
          // 其他类型的回调
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            throw error
          }

          if (session) {
            setMessage('验证成功！正在跳转...')
            setTimeout(() => {
              router.push('/')
            }, 2000)
          } else {
            throw new Error('验证失败，请重试')
          }
        }
      } catch (err: unknown) {
        console.error('验证回调处理失败:', err)
        const errorMessage = err instanceof Error ? err.message : '验证失败'
        setError(errorMessage)
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="glass-card p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">{error ? '❌' : '✨'}</div>
        <h1 className="text-2xl font-bold gradient-text mb-4">
          {error ? '验证失败' : '邮箱验证'}
        </h1>
        
        {error ? (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
            {error}
            <p className="text-sm mt-2">即将跳转到登录页面...</p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-blue-100/80 backdrop-blur-sm text-blue-700 rounded-2xl border border-blue-200">
            <div className="animate-pulse">{message}</div>
          </div>
        )}
      </div>
    </div>
  )
}
