'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import ErrorBoundary from '../../components/ErrorBoundary'
import { teamMenuConfig } from '../../config/menuConfig'
import { motion, AnimatePresence } from 'framer-motion'

interface Team {
  id: string
  name: string
  region: string
  province: string
  city: string
  district?: string
  declaration?: string
  avatar_url?: string
}

interface Activity {
  id?: string
  type?: string
  description?: string
  created_at?: string
  team_id?: string
  [key: string]: unknown
}

interface TeamStats {
  memberCount: number
  matchCount: number
  winRate: number
  recentActivities: Activity[]
}

export default function TeamSpacePage() {
  const { user } = useAuth()
  const [hasTeam, setHasTeam] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [teamStats, setTeamStats] = useState<TeamStats>({
    memberCount: 0,
    matchCount: 0,
    winRate: 0,
    recentActivities: []
  })

  // 退出战队对话框状态
  const [showQuitModal, setShowQuitModal] = useState(false)
  // 退出结果提示状态
  const [showQuitResult, setShowQuitResult] = useState(false)
  const [quitResult, setQuitResult] = useState<{ success: boolean; message: string }>({ success: false, message: '' })
  
  // 删除战队状态
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteResult, setShowDeleteResult] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string }>({ success: false, message: '' })

  const fetchTeamStats = useCallback(async (teamId: string) => {
    try {
      // 获取战队成员数量
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'active')

      if (membersError) {
        console.error('获取战队成员失败:', membersError)
      }

      setTeamStats({
        memberCount: members?.length || 0,
        matchCount: 0,
        winRate: 0,
        recentActivities: []
      })
    } catch (error) {
      console.error('获取战队统计数据失败:', error)
    }
  }, [])

  const checkUserTeam = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user?.id)
        .eq('status', 'active')

      if (error) {
        console.error('查询战队失败:', error)
        setHasTeam(false)
      } else if (data && data.length > 0) {
        // 处理多个战队的情况，取第一个战队
        const teamId = data[0].team_id
        const role = data[0].role || ''
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()

        if (teamError) {
          console.error('查询战队详情失败:', teamError)
          setHasTeam(false)
        } else {
          setTeam(teamData)
          setUserRole(role)
          setHasTeam(true)
          // 获取战队统计数据
          await fetchTeamStats(teamId)
        }
      } else {
        setHasTeam(false)
      }
    } catch (error) {
      console.error('检查战队失败:', error)
      setHasTeam(false)
    } finally {
      setLoading(false)
    }
  }, [user, fetchTeamStats])

  useEffect(() => {
    if (user) {
      checkUserTeam()

      // 设置实时订阅，监听战队成员状态变化
      const subscription = supabase
        .channel('public:team_members')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${user.id}`
        }, () => {
          // 当战队成员状态变化时，重新检查用户战队
          checkUserTeam()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    } else {
      setLoading(false)
    }
  }, [user, checkUserTeam])

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 骨架屏组件
  const SkeletonCard = () => (
    <div className="card p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-12 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      <div className="card p-4">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded w-full mb-3"></div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 侧边栏 */}
            <div className="hidden lg:block">
              <div className="card p-6 w-64">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 mt-2 animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
            {/* 主内容区 */}
            <div className="flex-1">
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    )
  }



  // 显示退出战队对话框
  const handleQuitClick = () => {
    if (!team?.id || !user?.id) return
    
    if (userRole === '队长') {
      alert('队长不能退出战队，请先转让队长职务')
      return
    }
    
    setShowQuitModal(true)
  }

  // 确认退出战队
  const confirmQuitTeam = async () => {
    if (!team?.id || !user?.id) return
    
    setShowQuitModal(false)
    
    try {
      const response = await fetch('/api/team/kick-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          teamId: team.id,
          kickedBy: user.id
        })
      })

      const result = await response.json()
      if (result.success) {
        setQuitResult({ success: true, message: '已成功退出战队' })
        setShowQuitResult(true)
        
        // 3秒后跳转到战队空间页面
        setTimeout(() => {
          window.location.href = '/teams/space'
        }, 3000)
      } else {
        setQuitResult({ success: false, message: '退出战队失败：' + (result.error || '未知错误') })
        setShowQuitResult(true)
        
        // 3秒后关闭提示
        setTimeout(() => {
          setShowQuitResult(false)
        }, 3000)
      }
    } catch (error) {
      console.error('退出战队失败:', error)
      setQuitResult({ success: false, message: '退出战队失败，请稍后重试' })
      setShowQuitResult(true)
      
      // 3秒后关闭提示
      setTimeout(() => {
        setShowQuitResult(false)
      }, 3000)
    }
  }

  // 确认解散战队
  const confirmDeleteTeam = async () => {
    if (!team?.id) return
    
    setShowDeleteModal(false)
    
    try {
      // 获取认证令牌
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setDeleteResult({ success: false, message: '请重新登录后再试' })
        setShowDeleteResult(true)
        return
      }
      
      const response = await fetch('/api/team/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: team.id,
          userId: user?.id
        })
      })

      const result = await response.json()
      if (result.success) {
        setDeleteResult({ success: true, message: '战队已成功解散' })
        setShowDeleteResult(true)
        
        // 3秒后跳转到战队空间页面
        setTimeout(() => {
          window.location.href = '/teams/space'
        }, 3000)
      } else {
        setDeleteResult({ success: false, message: '解散战队失败：' + (result.error || '未知错误') })
        setShowDeleteResult(true)
        
        // 3秒后关闭提示
        setTimeout(() => {
          setShowDeleteResult(false)
        }, 3000)
      }
    } catch (error) {
      console.error('解散战队失败:', error)
      setDeleteResult({ success: false, message: '解散战队失败，请稍后重试' })
      setShowDeleteResult(true)
      
      // 3秒后关闭提示
      setTimeout(() => {
        setShowDeleteResult(false)
      }, 3000)
    }
  }

  if (!hasTeam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">您还没有加入战队</h1>
          <p className="mt-4 text-gray-600">请先创建或加入一个战队</p>
          <div className="mt-8 flex space-x-4 justify-center">
            {user ? (
              <>
                <Link href="/teams/new" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  创建战队
                </Link>
                <Link href="/teams/join" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                  加入战队
                </Link>
              </>
            ) : (
              <Link href="/auth/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                登录后创建/加入战队
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏 */}
          <div className="hidden lg:block">
            <div className="card p-6 w-64">
              <Sidebar type="team" teamId={team?.id} userRole={userRole} />
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
            {/* 顶部导航 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  <span>←</span> 返回上一页
                </button>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                >
                  <span>🏠</span> 返回主页面
                </Link>
                <h1 className="text-3xl font-bold gradient-text">{team?.name || ''} 战队管理后台</h1>
              </div>
              <div className="flex items-center gap-4">
                {/* 移动端菜单按钮 */}
                <button 
                  className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <span>☰</span> 菜单
                </button>
                {userRole === '队长' && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:text-red-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  >
                    <span>🗑️</span> 解散战队
                  </button>
                )}
                {userRole !== '队长' && (
                  <button
                    onClick={handleQuitClick}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:text-red-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  >
                    <span>🚪</span> 退出战队
                  </button>
                )}
              </div>
            </div>

            {/* 移动端导航（仅在小屏幕显示） */}
            <div className="lg:hidden mb-8">
              <div className="card p-4">
                <h3 className="text-lg font-semibold mb-4">快捷导航</h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* 从统一的菜单配置中获取核心功能项 */}
                  {teamMenuConfig
                    .flatMap(section => section.items)
                    .filter(item => {
                      // 只显示核心功能
                      if (!item.isCore) return false;
                      // 检查权限
                      if (Array.isArray(item.requirePermission)) {
                        return item.requirePermission.includes(userRole);
                      }
                      return true;
                    })
                    .map((item, index) => (
                      <Link
                        key={index}
                        href={item.href.replace('{teamId}', team?.id || '')}
                        className="card p-3 text-center hover:scale-105 transition-all duration-300"
                      >
                        <div className="text-xl mb-1">{item.icon}</div>
                        <div className="text-sm font-medium text-gray-800">{item.label}</div>
                      </Link>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* 战队概览内容 */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-6 gradient-text">战队概览</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-4 text-center">
                    <div className="text-4xl font-bold text-pink-500 mb-2">{teamStats.memberCount}</div>
                    <div className="text-gray-600">战队成员</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-4xl font-bold text-blue-500 mb-2">{teamStats.matchCount}</div>
                    <div className="text-gray-600">近期比赛</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-4xl font-bold text-green-500 mb-2">{teamStats.winRate}%</div>
                    <div className="text-gray-600">胜率</div>
                  </div>
                </div>

                <div className="card p-4">
                  <h3 className="text-lg font-semibold mb-3">近期活动</h3>
                  <div className="space-y-3">
                    {teamStats.recentActivities.length > 0 ? (
                      teamStats.recentActivities.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                          <div className="text-xl">
                            {activity.type === 'match' ? '🏆' :
                              activity.type === 'member' ? '👥' :
                                activity.type === 'training' ? '📋' : '📅'}
                          </div>
                          <div>
                            <div className="font-medium">{activity.description}</div>
                            <div className="text-sm text-gray-500">
                              {activity.created_at ? new Date(activity.created_at).toLocaleString('zh-CN') : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">📅</div>
                        <p className="text-gray-500 mb-4">暂无近期活动</p>
                        <p className="text-gray-400 text-sm">战队成员的活动将显示在这里</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端抽屉菜单 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween' }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">菜单</h3>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  ×
                </button>
              </div>
              <Sidebar type="team" teamId={team?.id} userRole={userRole} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 退出战队确认对话框 */}
      {showQuitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🚪</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">确认退出战队</h3>
              <p className="text-gray-600 mb-4">
                退出后：
              </p>
              <ul className="text-left text-gray-600 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  <span>你的游戏资料将被清除</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  <span>需要重新申请才能加入该战队</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  <span>所有战队相关数据将被移除</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowQuitModal(false)}
                className="flex-1 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmQuitTeam}
                className="flex-1 px-6 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 退出结果提示 */}
      {showQuitResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className={`text-5xl mb-4 ${quitResult.success ? 'text-green-500' : 'text-red-500'}`}>
                {quitResult.success ? '✅' : '❌'}
              </div>
              <h3 className={`text-xl font-bold mb-4 ${quitResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {quitResult.success ? '退出成功' : '退出失败'}
              </h3>
              <p className="text-gray-600 mb-6">
                {quitResult.message}
              </p>
              {quitResult.success && (
                <p className="text-sm text-gray-500 mb-6">
                  3秒后将自动跳转...
                </p>
              )}
              <button
                onClick={() => setShowQuitResult(false)}
                className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 解散战队确认对话框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🗑️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">确认解散战队</h3>
              <p className="text-gray-600 mb-4">
                解散后：
              </p>
              <ul className="text-left text-gray-600 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  <span>所有战队成员将被移出</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  <span>战队所有数据将被删除</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  <span>此操作不可恢复</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteTeam}
                className="flex-1 px-6 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                确认解散
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 解散结果提示 */}
      {showDeleteResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className={`text-5xl mb-4 ${deleteResult.success ? 'text-green-500' : 'text-red-500'}`}>
                {deleteResult.success ? '✅' : '❌'}
              </div>
              <h3 className={`text-xl font-bold mb-4 ${deleteResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {deleteResult.success ? '解散成功' : '解散失败'}
              </h3>
              <p className="text-gray-600 mb-6">
                {deleteResult.message}
              </p>
              {deleteResult.success && (
                <p className="text-sm text-gray-500 mb-6">
                  3秒后将自动跳转...
                </p>
              )}
              <button
                onClick={() => setShowDeleteResult(false)}
                className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  )
}