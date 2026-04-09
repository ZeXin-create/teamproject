'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { getHeroes } from '../../services/teamGroupingService'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '../../components/Navbar'



interface Application {
  id: string
  user_id: string
  team_id: string
  status: string
  created_at: string
  user?: {
    email: string
    user_metadata?: {
      avatar?: string
    }
  }
  game_id?: string
  current_rank?: string
  main_positions?: string[]
  position_stats?: Record<string, {
    winRate: string
    kda: string
    rating: string
    power: string
    heroes: number[]
  }>
  available_time?: Array<{
    day: string
    start_time: string
    end_time: string
  }>
  accept_position_adjustment?: boolean
  user_profile?: {
    id: string
    name: string
    avatar_url?: string
    systemId?: string
    level?: number
    game_data?: Record<string, unknown>
  }
}

export default function ApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null) // 跟踪正在审批的申请ID
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 英雄数据状态
  interface Hero {
    id: number;
    name: string;
  }
  const [heroes, setHeroes] = useState<Hero[]>([])

  // 初始化英雄数据
  useEffect(() => {
    const fetchHeroes = () => {
      const heroData = getHeroes()
      setHeroes(heroData)
    }
    fetchHeroes()
  }, [])

  // 根据英雄ID获取英雄名称
  const getHeroNameById = (id: number): string => {
    const hero = heroes.find(hero => hero.id === id)
    return hero ? hero.name : id.toString()
  }

  const getTeamApplications = useCallback(async () => {
    setLoading(true)
    try {
      // 获取用户所在的战队
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (memberError) {
        throw memberError
      }

      // 检查是否是队长或副队长
      if (teamMember.role !== '队长' && teamMember.role !== '副队长') {
        setError('您没有权限查看申请')
        setLoading(false)
        return
      }

      setTeamId(teamMember.team_id)

      // 获取战队申请，包括详细游戏资料
      const { data, error } = await supabase
        .from('team_applications')
        .select(`
          id, 
          user_id, 
          team_id, 
          status, 
          created_at,
          game_id,
          current_rank,
          main_positions,
          position_stats,
          available_time,
          accept_position_adjustment
        `)
        .eq('team_id', teamMember.team_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      // 获取用户信息和详细资料
      if (data && data.length > 0) {
        const processedApplications: Application[] = []

        for (const item of data) {
          const app: Application = {
            id: item.id,
            user_id: item.user_id,
            team_id: item.team_id,
            status: item.status,
            created_at: item.created_at,
            game_id: item.game_id,
            current_rank: item.current_rank,
            main_positions: item.main_positions,
            position_stats: item.position_stats,
            available_time: item.available_time,
            accept_position_adjustment: item.accept_position_adjustment
          }

          // 获取用户基本信息
          const { data: userData } = await supabase
            .from('auth.users')
            .select('email, user_metadata')
            .eq('id', app.user_id)
            .single()

          if (userData) {
            app.user = userData
          }

          // 获取用户详细资料
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', app.user_id)
            .single()

          if (profileData && profileData.id && profileData.nickname) {
            app.user_profile = {
              id: profileData.id,
              name: profileData.nickname,
              avatar_url: profileData.avatar_url,
              systemId: profileData.system_id,
              level: profileData.level,
              game_data: profileData.game_data
            }
          }

          processedApplications.push(app)
        }

        setApplications(processedApplications)
      } else {
        setApplications([])
      }

      if (error) {
        throw error
      }
    } catch (err: unknown) {
      console.error('获取战队申请失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取战队申请失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      getTeamApplications()

      // 添加实时订阅，监听申请状态变化
      const subscription = supabase
        .channel('public:team_applications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'team_applications',
          filter: `team_id=eq.${teamId}`
        }, () => {
          // 当申请状态变化时，重新获取申请列表
          getTeamApplications()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    } else {
      setLoading(false)
    }
  }, [user, getTeamApplications, teamId])

  const handleApprove = async (applicationId: string, userId: string) => {
    setApproving(applicationId)
    try {
      // 调用 API 处理审批
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          applicationId,
          teamId,
          userId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '批准申请失败')
      }

      setApplications(applications.filter(app => app.id !== applicationId))
      setSuccess('批准申请成功')
    } catch (err: unknown) {
      console.error('批准申请失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '批准申请失败，请稍后重试')
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    setApproving(applicationId)
    try {
      // 调用 API 处理拒绝
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          applicationId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '拒绝申请失败')
      }

      setApplications(applications.filter(app => app.id !== applicationId))
      setSuccess('拒绝申请成功')
    } catch (err: unknown) {
      console.error('拒绝申请失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '拒绝申请失败，请稍后重试')
    } finally {
      setApproving(null)
    }
  }

  // 骨架屏组件
  const SkeletonApplicationCard = () => (
    <div className="border border-gray-300 rounded-lg p-4 glass-card animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-200"></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-40 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="mt-3 text-sm mb-4">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-4">
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 pb-8">
          <div className="flex items-center mb-6">
            <div className="mr-4 glass-button px-4 py-2 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="glass-card p-6 rounded-xl">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <SkeletonApplicationCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-8">
        <div className="flex items-center mb-6">
          <button
            className="mr-4 text-pink-500 hover:text-pink-600 glass-button px-4 py-2 rounded-lg"
            onClick={() => router.back()}
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-800">战队申请管理</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg glass-card">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-600 rounded-lg glass-card">
            {success}
          </div>
        )}

        <div className="glass-card p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">待审批申请</h2>

          {applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">暂无待审批的申请</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border border-gray-300 rounded-lg p-4 glass-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-pink-500">
                      <Image
                        src={app.user_profile?.avatar_url || app.user?.user_metadata?.avatar || 'https://via.placeholder.com/40'}
                        alt={app.user_profile?.name || app.user?.email || '用户'}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{app.user_profile?.name || app.user?.email}</h3>
                      {app.user_profile?.systemId && (
                        <p className="text-xs text-gray-500">ID: {app.user_profile.systemId}</p>
                      )}
                      <p className="text-sm text-gray-600">申请时间：{new Date(app.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* 队员提交的详细游戏资料 */}
                  <div className="mt-3 text-sm mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">申请资料：</h4>
                    <div className="text-xs text-gray-600 space-y-2">
                      {app.game_id && (
                        <div>游戏ID: {app.game_id}</div>
                      )}
                      {app.current_rank && (
                        <div>当前段位: {app.current_rank}</div>
                      )}
                      {app.main_positions && app.main_positions.length > 0 && (
                        <div>擅长位置: {app.main_positions.join('、')}</div>
                      )}
                      {app.position_stats && Object.keys(app.position_stats).length > 0 && (
                        <div>
                          <div className="font-medium mt-2">位置数据：</div>
                          {Object.entries(app.position_stats).map(([position, stats]) => {
                            // 检查该位置是否有实际数据
                            const hasData = stats.winRate || stats.kda || stats.rating || stats.power || (stats.heroes && stats.heroes.length > 0);
                            if (!hasData) return null;

                            return (
                              <div key={position} className="ml-2 mt-1">
                                <div className="font-medium">{position}：</div>
                                <div className="ml-2">
                                  {stats.winRate && <span>胜率: {stats.winRate}, </span>}
                                  {stats.kda && <span>KDA: {stats.kda}, </span>}
                                  {stats.rating && <span>评分: {stats.rating}, </span>}
                                  {stats.power && <span>战力: {stats.power}</span>}
                                </div>
                                {stats.heroes && stats.heroes.length > 0 && (
                                  <div className="ml-2">常用英雄: {stats.heroes.map(heroId => getHeroNameById(Number(heroId))).join('、')}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {app.available_time && app.available_time.length > 0 && (
                        <div>
                          <div className="font-medium mt-2">可比赛时间：</div>
                          {app.available_time.map((time, index) => (
                            <div key={index} className="ml-2">
                              {time.day}: {time.start_time} - {time.end_time}
                            </div>
                          ))}
                        </div>
                      )}
                      {app.accept_position_adjustment !== undefined && (
                        <div>接受位置微调: {app.accept_position_adjustment ? '是' : '否'}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      onClick={() => handleReject(app.id)}
                      disabled={approving === app.id}
                    >
                      {approving === app.id && (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {approving === app.id ? '处理中...' : '拒绝'}
                    </button>
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      onClick={() => handleApprove(app.id, app.user_id)}
                      disabled={approving === app.id}
                    >
                      {approving === app.id && (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {approving === app.id ? '处理中...' : '批准'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
