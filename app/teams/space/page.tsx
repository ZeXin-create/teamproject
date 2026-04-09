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
import { useDataCache } from '../../hooks/useDataCache'

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

const TeamSpacePage = React.memo(() => {
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
  
  // 使用 useDataCache 缓存战队数据
  const { data: teamMemberData, isLoading: teamMemberLoading } = useDataCache(
    `team_member_${user?.id}`,
    async () => {
      if (!user) return null
      const { data } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
      return data
    },
    { enabled: !!user, refreshInterval: 30000 } // 30秒刷新
  )
  
  // 缓存战队详情
  const { data: teamData, isLoading: teamLoading } = useDataCache(
    `team_${teamMemberData?.[0]?.team_id}`,
    async () => {
      if (!teamMemberData || !teamMemberData[0]?.team_id) return null
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamMemberData[0].team_id)
        .single()
      return data
    },
    { enabled: !!teamMemberData?.[0]?.team_id, refreshInterval: 60000 } // 1分钟刷新
  )

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

  // 监听缓存数据变化，更新状态
  useEffect(() => {
    if (teamMemberData && teamData) {
      setTeam(teamData)
      setUserRole(teamMemberData[0]?.role || '')
      setHasTeam(true)
      setLoading(false)
      // 获取战队统计数据
      if (teamData.id) {
        fetchTeamStats(teamData.id)
      }
    } else if (teamMemberData && teamMemberData.length === 0) {
      setHasTeam(false)
      setLoading(false)
    } else {
      setLoading(teamMemberLoading || teamLoading)
    }
  }, [teamMemberData, teamData, teamMemberLoading, teamLoading, fetchTeamStats])

  useEffect(() => {
    if (user) {
      // 设置实时订阅，监听战队成员状态变化
      const subscription = supabase
        .channel('public:team_members')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${user.id}`
        }, () => {
          // 当战队成员状态变化时，重新获取数据（通过缓存的 refreshInterval 自动更新）
          // 这里不需要手动调用，因为 useDataCache 会自动刷新
        })
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    } else {
      setLoading(false)
    }
  }, [user])

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
        <div className="container mx-auto px-4 pt-32 pb-8">
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
          if (typeof window !== 'undefined') {
            window.location.href = '/teams/space'
          }
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
          if (typeof window !== 'undefined') {
            window.location.href = '/teams/space'
          }
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
      <div className="container mx-auto px-4 pt-32 pb-8">
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
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              {/* 左侧导航 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.history.back()
                    }
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  title="返回上一页"
                >
                  <span>←</span>
                </button>
                <Link
                  href="/"
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  title="返回主页面"
                >
                  <span>🏠</span>
                </Link>
              </div>
              
              {/* 中间标题 */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold gradient-text truncate">{team?.name || ''} 战队管理后台</h1>
              </div>
              
              {/* 右侧操作 */}
              <div className="flex items-center gap-2">
                {/* 移动端菜单按钮 */}
                <button 
                  className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
                  onClick={() => setMobileMenuOpen(true)}
                  title="菜单"
                >
                  <span>☰</span>
                </button>
                {userRole === '队长' && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:text-red-500 hover:bg-white/50 transition-all duration-300 font-medium"
                    title="解散战队"
                  >
                    <span>🗑️</span>
                  </button>
                )}
                {userRole !== '队长' && (
                  <button
                    onClick={handleQuitClick}
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:text-red-500 hover:bg-white/50 transition-all duration-300 font-medium"
                    title="退出战队"
                  >
                    <span>🚪</span>
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="card p-6"
            >
              <h2 className="text-2xl font-bold mb-6 gradient-text">战队概览</h2>
              <div className="space-y-8">
                {/* 战队信息卡片 */}
                <motion.div 
                  whileHover={{ boxShadow: '0 20px 25px -5px rgba(236, 72, 153, 0.1), 0 10px 10px -5px rgba(236, 72, 153, 0.04)' }}
                  className="card p-6 bg-gradient-to-br from-white to-pink-50 border border-pink-100/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* 战队头像 */}
                    <div className="relative">
                      {team?.avatar_url ? (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                          <img 
                            src={team.avatar_url} 
                            alt={team.name} 
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                          {team?.name?.charAt(0).toUpperCase() || '战'}
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {teamStats.memberCount}
                      </div>
                    </div>
                    
                    {/* 战队信息 */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                        {team?.name || ''}
                        {userRole === '队长' && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium">
                            队长
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600 mb-4 text-lg leading-relaxed">{team?.declaration || '暂无战队宣言'}</p>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium shadow-sm">
                          {team?.region || '未知区域'}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium shadow-sm">
                          {team?.province || '未知省份'}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium shadow-sm">
                          {team?.city || '未知城市'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div 
                    whileHover={{ y: -8, boxShadow: '0 15px 30px -10px rgba(236, 72, 153, 0.2)' }}
                    className="card p-6 text-center bg-white/80 backdrop-blur-sm border border-pink-100/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="text-5xl font-bold text-pink-500 mb-3">{teamStats.memberCount}</div>
                    <div className="text-gray-600 font-medium">战队成员</div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -8, boxShadow: '0 15px 30px -10px rgba(59, 130, 246, 0.2)' }}
                    className="card p-6 text-center bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="text-5xl font-bold text-blue-500 mb-3">{teamStats.matchCount}</div>
                    <div className="text-gray-600 font-medium">近期比赛</div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -8, boxShadow: '0 15px 30px -10px rgba(16, 185, 129, 0.2)' }}
                    className="card p-6 text-center bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="text-5xl font-bold text-green-500 mb-3">{teamStats.winRate}%</div>
                    <div className="text-gray-600 font-medium">胜率</div>
                  </motion.div>
                </div>

                {/* 近期活动 */}
                <motion.div 
                  whileHover={{ boxShadow: '0 20px 25px -5px rgba(236, 72, 153, 0.1), 0 10px 10px -5px rgba(236, 72, 153, 0.04)' }}
                  className="card p-6 bg-white/80 backdrop-blur-sm border border-pink-100/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-800">近期活动</h3>
                    <Link 
                      href={`/teams/${team?.id}/activity`} 
                      className="text-sm text-pink-600 hover:text-pink-700 transition-colors font-medium"
                    >
                      查看全部 →
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {teamStats.recentActivities.length > 0 ? (
                      teamStats.recentActivities.map((activity, index) => (
                        <motion.div 
                          key={index} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ x: 8, backgroundColor: 'rgba(255, 248, 251, 0.8)' }}
                          className="flex items-center gap-4 p-4 bg-white/50 rounded-xl border border-pink-50 hover:border-pink-100 transition-all duration-300"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-gray-700 shadow-sm">
                            {activity.type === 'match' ? '🏆' :
                              activity.type === 'member' ? '👥' :
                                activity.type === 'training' ? '📋' : '📅'}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{activity.description}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {activity.created_at ? new Date(activity.created_at).toLocaleString('zh-CN') : ''}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center py-12 bg-gradient-to-br from-white to-pink-50 rounded-xl"
                      >
                        <div className="text-7xl mb-6">📅</div>
                        <p className="text-gray-500 mb-4 text-lg font-medium">暂无近期活动</p>
                        <p className="text-gray-400 text-sm">战队成员的活动将显示在这里</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
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
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween' }}
              className="absolute left-0 top-0 bottom-0 w-56 bg-gradient-to-br from-white to-pink-50 p-4 shadow-xl z-50 border-r border-pink-100/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center mb-4">
                <h3 className="text-lg font-semibold flex-1">菜单</h3>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-pink-500 hover:bg-pink-50 transition-all duration-300 shadow-sm border border-white/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 菜单项 */}
              <div className="space-y-1">
                {teamMenuConfig
                  .flatMap(section => section.items)
                  .filter(item => {
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
                      className="group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {/* 背景渐变 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-100/0 via-pink-200/20 to-purple-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* 图标 */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 group-hover:from-pink-200 group-hover:to-purple-200 flex items-center justify-center text-gray-700 group-hover:text-pink-600 transition-all duration-300 shadow-sm group-hover:shadow-md">
                        {item.icon}
                      </div>
                      
                      {/* 文字 */}
                      <span className="font-medium text-gray-800 group-hover:text-pink-600 transition-colors duration-300">{item.label}</span>
                    </Link>
                  ))
                }
              </div>
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
})

export default TeamSpacePage