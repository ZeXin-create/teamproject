'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState({
    nickname: '',
    avatar: ''
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])
  
  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, avatar')
        .eq('id', user?.id)
        .maybeSingle()
      
      if (data) {
        setUserProfile({
          nickname: data.nickname || data.email?.split('@')[0] || user?.email?.split('@')[0] || '用户',
          avatar: data.avatar || ''
        })
      } else {
        setUserProfile({
          nickname: user?.user_metadata?.nickname || user?.email?.split('@')[0] || '用户',
          avatar: user?.user_metadata?.avatar || ''
        })
      }
    } catch (error) {
      setUserProfile({
        nickname: user?.user_metadata?.nickname || user?.email?.split('@')[0] || '用户',
        avatar: user?.user_metadata?.avatar || ''
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login')
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }
  
  if (isLoading) {
    return (
      <nav className="glass sticky top-0 z-50 py-4">
        <div className="container mx-auto px-4 text-center">
          <span className="gradient-text text-lg font-semibold">加载中...</span>
        </div>
      </nav>
    )
  }
  
  return (
    <nav className="glass sticky top-0 z-50 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            ✨
          </div>
          <span className="text-2xl font-bold gradient-text">
            战队管理
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link 
                href="/teams/space" 
                className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              >
                🎮 战队空间
              </Link>
              <Link 
                href="/profile" 
                className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              >
                👤 个人中心
              </Link>
              <div className="flex items-center gap-3">
                <Link 
                  href="/profile"
                  className="flex items-center gap-3 glass-card px-4 py-2 hover:scale-105 transition-transform"
                >
                  {userProfile.avatar ? (
                    <img 
                      src={userProfile.avatar} 
                      alt="用户头像"
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${userProfile.avatar ? 'hidden' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                  >
                    {userProfile.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-800 font-medium">{userProfile.nickname}</span>
                </Link>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="glass-card px-3 py-2 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="退出登录"
                >
                  🚪
                </button>
              </div>
            </>
          ) : (
            <>
              <Link 
                href="/auth/login" 
                className="px-6 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              >
                登录
              </Link>
              <Link 
                href="/auth/register" 
                className="glass-button px-6 py-2 text-white font-medium"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 退出登录确认模态框 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 w-full max-w-md text-center">
            <div className="text-5xl mb-4">🚪</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">确认退出登录？</h3>
            <p className="text-gray-500 mb-6">退出后需要重新登录才能使用功能</p>
            <div className="flex justify-center gap-4">
              <button
                className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                onClick={() => setShowLogoutConfirm(false)}
              >
                取消
              </button>
              <button
                className="glass-button px-6 py-3 text-white font-medium bg-gradient-to-r from-red-400 to-red-500"
                onClick={handleLogout}
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
