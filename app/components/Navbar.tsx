'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState({
    nickname: '',
    avatar: ''
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('nickname, avatar')
        .eq('id', user?.id)
        .maybeSingle()

      if (data) {
        setUserProfile({
          nickname: data.nickname || user?.email?.split('@')[0] || '用户',
          avatar: data.avatar || ''
        })
      } else {
        setUserProfile({
          nickname: user?.email?.split('@')[0] || '用户',
          avatar: ''
        })
      }
    } catch {
      setUserProfile({
        nickname: user?.email?.split('@')[0] || '用户',
        avatar: ''
      })
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user, fetchUserProfile])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    try {
      // 先关闭确认模态框
      setShowLogoutConfirm(false)
      // 调用退出登录函数
      await logout()
      // 导航到登录页面
      router.push('/auth/login')
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  if (isLoading) {
    return (
      <nav className={`sticky top-0 z-50 py-4 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-lg shadow-md' : 'glass'}`}>
        <div className="container mx-auto px-4 text-center">
          <span className="gradient-text text-lg font-semibold">加载中...</span>
        </div>
      </nav>
    )
  }

  return (
    <nav className={`sticky top-0 z-50 py-4 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-lg shadow-md' : 'glass'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            ✨
          </div>
          <span className="text-2xl font-bold gradient-text">
            王者战队助手系统
          </span>
        </Link>

        {/* 桌面菜单 */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
          >
            🏠 主页
          </Link>
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
              <Link
                href="/forum"
                className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              >
                📝 社区
              </Link>
              <Link
                href="/team-sales"
                className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              >
                💰 交易
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 glass-card px-4 py-2 hover:scale-105 transition-transform"
                >
                  {userProfile.avatar ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                      <Image
                        src={userProfile.avatar}
                        alt="用户头像"
                        width={40}
                        height={40}
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    </div>
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
                href="/forum"
                className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              >
                📝 社区
              </Link>
              <Link
                href="/team-sales"
                className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              >
                💰 交易
              </Link>
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

        {/* 移动端菜单按钮 */}
        <button
          className="md:hidden text-gray-700 focus:outline-none"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {showMobileMenu ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>

      {/* 移动端菜单 */}
      {showMobileMenu && (
        <div className="md:hidden container mx-auto px-4 py-4">
          <div className="flex flex-col space-y-4">
            <Link
              href="/"
              className="px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
              onClick={() => setShowMobileMenu(false)}
            >
              🏠 主页
            </Link>
            {user ? (
              <>
                <Link
                  href="/teams/space"
                  className="px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  🎮 战队空间
                </Link>
                <Link
                  href="/profile"
                  className="px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  👤 个人中心
                </Link>
                <Link
                  href="/forum"
                  className="px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  📝 社区
                </Link>
                <Link
                  href="/team-sales"
                  className="px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  💰 交易
                </Link>
                <div className="flex items-center gap-3 glass-card p-4">
                  {userProfile.avatar ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                      <Image
                        src={userProfile.avatar}
                        alt="用户头像"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                    >
                      {userProfile.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-800 font-medium">{userProfile.nickname}</span>
                </div>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(true);
                    setShowMobileMenu(false);
                  }}
                  className="px-4 py-3 rounded-2xl text-gray-700 hover:text-red-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  🚪 退出登录
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/forum"
                  className="px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  📝 社区
                </Link>
                <Link
                  href="/team-sales"
                  className="px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  💰 交易
                </Link>
                <Link
                  href="/auth/login"
                  className="px-6 py-3 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-3 glass-button text-white font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* 退出登录确认模态框 */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
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
              className="glass-card p-8 w-full max-w-md text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="text-5xl mb-4"
              >
                🚪
              </motion.div>
              <motion.h3
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold text-gray-800 mb-2"
              >
                确认退出登录？
              </motion.h3>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500 mb-6"
              >
                退出后需要重新登录才能使用功能
              </motion.p>
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass-button px-6 py-3 text-white font-medium bg-gradient-to-r from-red-400 to-red-500"
                  onClick={handleLogout}
                >
                  确认退出
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
