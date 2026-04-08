'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import PWAPrompt from '../components/PWAPrompt'

interface User {
  id: string
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  successMessage: string | null
  setSuccessMessage: (message: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    // 监听用户登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    // 检查当前用户状态
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          avatar: user.user_metadata?.avatar
        })
      }
      setIsLoading(false)
    }

    checkUser()

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        // 检查是否是邮箱未验证错误
        if (error.message === 'Email not confirmed' || error.message?.includes('Email not confirmed')) {
          throw new Error('邮箱未验证，请前往邮箱点击验证链接完成注册')
        }
        throw error
      }
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // 生成6位数字系统ID
      const systemId = Math.floor(100000 + Math.random() * 900000).toString()
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`
        }
      })
      
      if (!error) {
        // 注册成功后更新用户元数据
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.auth.updateUser({
            data: {
              system_id: systemId,
              nickname: systemId // 将系统ID设为初始昵称
            }
          })
        }
      }
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('注册失败:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, successMessage, setSuccessMessage }}>
      {children}
      <PWAPrompt isLoggedIn={!!user} />
    </AuthContext.Provider>
  )
}