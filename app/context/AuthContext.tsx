'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

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
        // 登录时检查并创建用户资料
        createUserProfile(session.user)
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
        // 检查并创建用户资料
        createUserProfile(user)
      }
      setIsLoading(false)
    }

    checkUser()

    return () => subscription.unsubscribe()
  }, [])

  // 创建用户资料
  const createUserProfile = async (user: any) => {
    try {
      // 检查用户资料是否存在
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // 如果资料不存在，创建新资料
      if (!existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            nickname: user.email?.split('@')[0] || '用户'
          })
          .select()
          .single();

        if (error) {
          console.error('创建用户资料失败:', error);
        } else {
          console.log('用户资料创建成功');
        }
      }
    } catch (error) {
      console.error('检查用户资料失败:', error);
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      if (error) {
        console.error('注册失败:', error)
        throw error
      }

      // 注册成功后，用户资料将在首次登录时自动创建
      // 暂时跳过手动创建，避免RLS策略错误
      console.log('注册成功，用户ID:', data.user?.id);
      console.log('用户邮箱:', data.user?.email);
    } catch (error: any) {
      console.error('注册失败:', error)
      // 提供更详细的错误信息
      if (error.code === 'auth/email-already-exists') {
        throw new Error('该邮箱已被注册，请使用其他邮箱')
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('邮箱格式不正确，请检查输入')
      } else if (error.code === 'auth/weak-password') {
        throw new Error('密码强度不足，请设置更强的密码')
      } else if (error.message.includes('Database error saving new user')) {
        throw new Error('数据库错误，请稍后重试或联系管理员')
      } else {
        throw new Error('注册失败，请稍后重试')
      }
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
    </AuthContext.Provider>
  )
}