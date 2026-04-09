'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState({
    nickname: '',
    avatar: ''
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const fetchUserProfile = useCallback(async () => {
    try {
      // 获取用户资料
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname, avatar')
        .eq('id', user?.id)
        .maybeSingle()

      if (profileData) {
        setUserProfile({
          nickname: profileData.nickname || user?.email?.split('@')[0] || '用户',
          avatar: profileData.avatar || ''
        })
      } else {
        setUserProfile({
          nickname: user?.email?.split('@')[0] || '用户',
          avatar: ''
        })
      }
    } catch (error) {
      console.error('获取用户资料失败:', error)
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
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 50)
      }

      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
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
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm py-3 transition-all duration-300">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              ✨
            </div>
            <span className="text-2xl font-bold gradient-text md:block hidden">
              王者战队助手系统
            </span>
            <span className="text-xl font-bold gradient-text block md:hidden">
              战队助手
            </span>
          </Link>

          {/* 桌面菜单 */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
            >
              🏠 主页
            </Link>
            {user ? (
              <>
                <Link
                  href="/teams/space"
                  className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  🎮 战队管理后台
                </Link>
                <Link
                  href="/profile"
                  className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  👤 个人中心
                </Link>
                <div className="flex items-center gap-3">
                  <NotificationBell />
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-3 card px-4 py-2 hover:scale-105 transition-transform"
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
                    </button>
                    
                    {/* 用户下拉菜单 */}
                    <AnimatePresence>
                      {showUserMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 card p-2 z-50"
                        >
                          <Link
                            href="/profile"
                            className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            个人中心
                          </Link>
                          <Link
                            href="/teams/space"
                            className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            战队管理后台
                          </Link>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              setShowLogoutConfirm(true);
                            }}
                            className="w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            退出登录
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/forum"
                  className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  📝 社区
                </Link>
                <Link
                  href="/team-sales"
                  className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  💰 交易
                </Link>
                <Link
                  href="/auth/login"
                  className="px-6 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="btn-primary"
                >
                  注册
                </Link>
              </>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <button
            className="md:hidden text-gray-700 focus:outline-none w-12 h-12 flex items-center justify-center"
            onClick={() => setShowMobileMenu(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </nav>

      {/* 移动端玻璃罩菜单 */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* 遮罩层 - 点击关闭 */}
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 0.6, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="fixed inset-0 bg-black z-[9999] md:hidden"
              onClick={() => setShowMobileMenu(false)}
            />
            {/* 菜单内容 - 居中显示 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-x-4 top-[45%] -translate-y-1/2 z-[10000] md:hidden"
            >
              <div className="mx-auto max-w-sm">
              <div 
                className="relative bg-white/85 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-pink-200/30 border border-white/60 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 粉色光晕背景 */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 via-white/70 to-purple-100/50 rounded-3xl" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-300/40 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-300/40 rounded-full blur-3xl" />
                
                {/* 内容区域 */}
                <div className="relative p-6">
                {/* 头部标题 */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">菜单</h3>
                  <button 
                    onClick={() => setShowMobileMenu(false)}
                    className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-gray-500 hover:text-pink-500 hover:bg-pink-50 transition-all duration-300 shadow-sm border border-white/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 用户信息（已登录） */}
                {user && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-pink-100/80 to-purple-100/80 rounded-2xl border border-pink-200/50">
                    <div className="flex items-center gap-3">
                      {userProfile.avatar ? (
                        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md">
                          <Image
                            src={userProfile.avatar}
                            alt="用户头像"
                            width={56}
                            height={56}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
                          style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                        >
                          {userProfile.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{userProfile.nickname}</p>
                        <p className="text-sm text-pink-600">欢迎回来 ✨</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 菜单网格 */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <Link
                    href="/"
                    className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/60 hover:bg-pink-50/80 transition-all duration-300 border border-transparent hover:border-pink-200/50"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-200 group-hover:from-pink-200 group-hover:to-pink-300 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all duration-300">🏠</div>
                    <span className="text-xs text-gray-600 group-hover:text-pink-600 transition-colors">主页</span>
                  </Link>
                  
                  {user ? (
                    <>
                      <Link
                        href="/teams/space"
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/60 hover:bg-purple-50/80 transition-all duration-300 border border-transparent hover:border-purple-200/50"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 group-hover:from-purple-200 group-hover:to-purple-300 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all duration-300">🎮</div>
                        <span className="text-xs text-gray-600 group-hover:text-purple-600 transition-colors">战队</span>
                      </Link>
                      <Link
                        href="/profile"
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/60 hover:bg-blue-50/80 transition-all duration-300 border border-transparent hover:border-blue-200/50"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all duration-300">👤</div>
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors">我的</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowLogoutConfirm(true);
                          setShowMobileMenu(false);
                        }}
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/60 hover:bg-red-50/80 transition-all duration-300 border border-transparent hover:border-red-200/50"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 group-hover:from-red-200 group-hover:to-red-300 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all duration-300">🚪</div>
                        <span className="text-xs text-gray-600 group-hover:text-red-600 transition-colors">退出</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/forum"
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/60 hover:bg-green-50/80 transition-all duration-300 border border-transparent hover:border-green-200/50"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 group-hover:from-green-200 group-hover:to-green-300 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all duration-300">📝</div>
                        <span className="text-xs text-gray-600 group-hover:text-green-600 transition-colors">社区</span>
                      </Link>
                      <Link
                        href="/team-sales"
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/60 hover:bg-yellow-50/80 transition-all duration-300 border border-transparent hover:border-yellow-200/50"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-100 to-yellow-200 group-hover:from-yellow-200 group-hover:to-yellow-300 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all duration-300">💰</div>
                        <span className="text-xs text-gray-600 group-hover:text-yellow-600 transition-colors">交易</span>
                      </Link>
                    </>
                  )}
                </div>
                
                {/* 未登录时的登录注册按钮 */}
                {!user && (
                  <div className="space-y-3">
                    <Link
                      href="/auth/login"
                      className="block w-full py-3.5 text-center text-gray-700 font-medium bg-white/80 backdrop-blur-md rounded-2xl hover:bg-pink-50/80 hover:text-pink-600 transition-all duration-300 border border-gray-200 hover:border-pink-200"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      登录
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block w-full py-3.5 text-center text-white font-medium bg-gradient-to-r from-pink-400 to-purple-400 rounded-2xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-pink-200/50"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      注册账号
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 退出登录确认模态框 */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
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
    </>
  )
}
