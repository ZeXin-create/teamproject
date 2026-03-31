'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import { DashboardSkeleton } from '../../components/Skeleton'

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

      // 获取近期比赛数量和胜率
      const { data: matches, error: matchesError } = await supabase
        .from('match_records')
        .select('result')
        .eq('team_id', teamId)
        .order('match_date', { ascending: false })
        .limit(10)

      if (matchesError) {
        console.error('获取比赛记录失败:', matchesError)
      }

      // 计算胜率
      let winRate = 0
      if (matches && matches.length > 0) {
        const winCount = matches.filter(match => match.result === 'win').length
        winRate = Math.round((winCount / matches.length) * 100)
      }

      // 获取近期活动
      const { data: activities, error: activitiesError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (activitiesError) {
        console.error('获取活动记录失败:', activitiesError)
      }

      setTeamStats({
        memberCount: members?.length || 0,
        matchCount: matches?.length || 0,
        winRate: winRate,
        recentActivities: activities || []
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 侧边栏 */}
            <div className="hidden lg:block">
              <div className="glass-card p-6 w-64">
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
              <DashboardSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 检查用户是否有管理权限（副队或队长）
  const hasManagementPermission = () => {
    return ['队长', '副队'].includes(userRole)
  }

  if (!hasTeam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">您还没有加入战队</h1>
          <p className="mt-4 text-gray-600">请先创建或加入一个战队</p>
          <div className="mt-8 flex space-x-4 justify-center">
            <Link href="/teams/new" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              创建战队
            </Link>
            <Link href="/teams/join" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
              加入战队
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏 */}
          <div className="hidden lg:block">
            <Sidebar type="team" teamId={team?.id} userRole={userRole} />
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
            {/* 战队信息 */}
            <div className="glass-card p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center">
                  {team?.avatar_url ? (
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                      <Image
                        src={team.avatar_url}
                        alt={team.name}
                        width={80}
                        height={80}
                        className="object-cover"
                        priority // 首屏图片，设置优先级
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}>
                      <span className="text-white text-2xl font-bold">{team?.name?.charAt(0) || ''}</span>
                    </div>
                  )}
                  <div className="ml-6">
                    <h1 className="text-2xl font-bold gradient-text">{team?.name || ''}</h1>
                    <p className="mt-2 text-gray-600">{team?.region} · {team?.province} · {team?.city}</p>
                    {team?.declaration && (
                      <p className="mt-3 text-gray-700">{team.declaration}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-4">
                  <Link href="/teams/manage" className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium">
                    管理战队
                  </Link>
                  {userRole === '队长' && (
                    <Link href="/teams/recruit" className="glass-button px-4 py-2 text-white font-medium">
                      招募队员
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* 移动端导航（仅在小屏幕显示） */}
            <div className="lg:hidden mb-8">
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-4">快捷导航</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Link href={`/teams/${team?.id}/profile`} className="glass-card p-3 text-center hover:scale-105 transition-all duration-300">
                    <div className="text-xl mb-1">🎮</div>
                    <div className="text-sm font-medium text-gray-800">个人资料</div>
                  </Link>
                  {hasManagementPermission() && (
                    <Link href="/teams/applications" className="glass-card p-3 text-center hover:scale-105 transition-all duration-300">
                      <div className="text-xl mb-1">📋</div>
                      <div className="text-sm font-medium text-gray-800">申请管理</div>
                    </Link>
                  )}
                  <Link href="/teams/ai-chat" className="glass-card p-3 text-center hover:scale-105 transition-all duration-300">
                    <div className="text-xl mb-1">🤖</div>
                    <div className="text-sm font-medium text-gray-800">智能助手</div>
                  </Link>
                  {hasManagementPermission() && (
                    <Link href="/teams/data/match-records" className="glass-card p-3 text-center hover:scale-105 transition-all duration-300">
                      <div className="text-xl mb-1">🏆</div>
                      <div className="text-sm font-medium text-gray-800">比赛记录</div>
                    </Link>
                  )}
                  {hasManagementPermission() && (
                    <Link href="/teams/data/training-plans" className="glass-card p-3 text-center hover:scale-105 transition-all duration-300">
                      <div className="text-xl mb-1">🏋️</div>
                      <div className="text-sm font-medium text-gray-800">训练安排</div>
                    </Link>
                  )}
                  {hasManagementPermission() && (
                    <Link href="/teams/data/analytics" className="glass-card p-3 text-center hover:scale-105 transition-all duration-300">
                      <div className="text-xl mb-1">📈</div>
                      <div className="text-sm font-medium text-gray-800">数据可视化</div>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* 战队概览内容 */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold mb-6 gradient-text">战队概览</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <div className="text-4xl font-bold text-pink-500 mb-2">{teamStats.memberCount}</div>
                    <div className="text-gray-600">战队成员</div>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <div className="text-4xl font-bold text-blue-500 mb-2">{teamStats.matchCount}</div>
                    <div className="text-gray-600">近期比赛</div>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <div className="text-4xl font-bold text-green-500 mb-2">{teamStats.winRate}%</div>
                    <div className="text-gray-600">胜率</div>
                  </div>
                </div>

                <div className="glass-card p-4">
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
                      <div className="text-center text-gray-500 py-4">
                        暂无近期活动
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}