'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface RecruitDynamic {
  id: string
  type: 'recruit' | 'application'
  action: 'create' | 'update' | 'approve' | 'reject'
  title: string
  description: string
  timestamp: string
  relatedId: string
  userAvatar?: string
  userName?: string
}

export default function DynamicsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [dynamics, setDynamics] = useState<RecruitDynamic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscriptions, setSubscriptions] = useState<{ unsubscribe: () => void }[]>([])

  // 获取用户信息
  const getUserInfo = useCallback(async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar, nickname')
        .eq('id', userId)
        .maybeSingle()

      if (profileData) {
        return {
          avatar: profileData.avatar,
          name: profileData.nickname || userId.substring(0, 8)
        }
      }

      const { data: userData } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', userId)
        .single()

      return {
        avatar: '',
        name: userData?.email || userId.substring(0, 8)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return {
        avatar: '',
        name: userId.substring(0, 8)
      }
    }
  }, [])

  // 获取招募信息
  const getRecruitInfo = useCallback(async (recruitId: string) => {
    try {
      const { data } = await supabase
        .from('team_recruits')
        .select(`
          id,
          requirements,
          team:teams(
            name
          )
        `)
        .eq('id', recruitId)
        .single()

      return {
        teamName: data?.team?.name || '未知战队',
        requirements: data?.requirements || ''
      }
    } catch (error) {
      console.error('获取招募信息失败:', error)
      return {
        teamName: '未知战队',
        requirements: ''
      }
    }
  }, [])

  // 获取战队信息
  const getTeamInfo = useCallback(async (teamId: string) => {
    try {
      const { data } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single()

      return data?.name || '未知战队'
    } catch (error) {
      console.error('获取战队信息失败:', error)
      return '未知战队'
    }
  }, [])

  // 加载历史动态
  const loadDynamics = useCallback(async () => {
    if (!user) return

    try {
      // 获取用户所在的战队
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (!teamMembers || teamMembers.length === 0) {
        setDynamics([])
        setLoading(false)
        return
      }

      const teamId = teamMembers[0].team_id
      const tempDynamics: RecruitDynamic[] = []

      // 获取战队的招募信息
      const { data: recruits } = await supabase
        .from('team_recruits')
        .select('id, created_at, team_id')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recruits) {
        for (const recruit of recruits) {
          const recruitInfo = await getRecruitInfo(recruit.id)
          const userInfo = await getUserInfo(user.id)

          tempDynamics.push({
            id: `recruit_${recruit.id}`,
            type: 'recruit',
            action: 'create',
            title: '发布招募信息',
            description: `您的战队 ${recruitInfo.teamName} 发布了新的招募信息`,
            timestamp: recruit.created_at,
            relatedId: recruit.id,
            userAvatar: userInfo.avatar,
            userName: userInfo.name
          })
        }
      }

      // 获取用户的战队申请
      const { data: applications } = await supabase
        .from('team_applications')
        .select('id, team_id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (applications) {
        for (const app of applications) {
          const teamName = await getTeamInfo(app.team_id)
          const userInfo = await getUserInfo(user.id)

          let action: 'create' | 'update' | 'approve' | 'reject' = 'create'
          let title = '申请加入战队'
          let description = `您申请加入战队 ${teamName}`

          if (app.status === 'approved') {
            action = 'approve'
            title = '申请被批准'
            description = `您加入战队 ${teamName} 的申请已被批准`
          } else if (app.status === 'rejected') {
            action = 'reject'
            title = '申请被拒绝'
            description = `您加入战队 ${teamName} 的申请被拒绝`
          }

          tempDynamics.push({
            id: `application_${app.id}`,
            type: 'application',
            action,
            title,
            description,
            timestamp: app.created_at,
            relatedId: app.id,
            userAvatar: userInfo.avatar,
            userName: userInfo.name
          })
        }
      }

      // 按时间排序
      tempDynamics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setDynamics(tempDynamics)
    } catch (err: unknown) {
      console.error('加载动态失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '加载动态失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [user, getRecruitInfo, getTeamInfo, getUserInfo])

  // 设置实时订阅
  const setupSubscriptions = useCallback(() => {
    if (!user) return

    // 订阅招募信息的变化
    const recruitSubscription = supabase
      .channel('public:team_recruits')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_recruits'
      }, async (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.team_id) {
          // 检查是否是用户所在战队的招募信息
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .eq('status', 'active')

          if (teamMembers && teamMembers.some(member => member.team_id === payload.new.team_id)) {
            const recruitInfo = await getRecruitInfo(payload.new.id)
            const userInfo = await getUserInfo(user.id)

            setDynamics(prev => [
              {
                id: `recruit_${payload.new.id}`,
                type: 'recruit',
                action: 'create',
                title: '发布招募信息',
                description: `您的战队 ${recruitInfo.teamName} 发布了新的招募信息`,
                timestamp: payload.new.created_at,
                relatedId: payload.new.id,
                userAvatar: userInfo.avatar,
                userName: userInfo.name
              },
              ...prev
            ])
          }
        }
      })
      .subscribe()

    // 订阅申请状态的变化
    const applicationSubscription = supabase
      .channel('public:team_applications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_applications'
      }, async (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.user_id === user.id) {
          const teamName = await getTeamInfo(payload.new.team_id)
          const userInfo = await getUserInfo(user.id)

          let action: 'update' | 'approve' | 'reject' = 'update'
          let title = '申请状态更新'
          let description = `您加入战队 ${teamName} 的申请状态已更新`

          if (payload.new.status === 'approved') {
            action = 'approve'
            title = '申请被批准'
            description = `您加入战队 ${teamName} 的申请已被批准`
          } else if (payload.new.status === 'rejected') {
            action = 'reject'
            title = '申请被拒绝'
            description = `您加入战队 ${teamName} 的申请被拒绝`
          }

          setDynamics(prev => [
            {
              id: `application_${payload.new.id}`,
              type: 'application',
              action,
              title,
              description,
              timestamp: new Date().toISOString(),
              relatedId: payload.new.id,
              userAvatar: userInfo.avatar,
              userName: userInfo.name
            },
            ...prev
          ])
        }
      })
      .subscribe()

    setSubscriptions([recruitSubscription, applicationSubscription])
  }, [user, getRecruitInfo, getTeamInfo, getUserInfo])

  useEffect(() => {
    if (user) {
      loadDynamics()
      setupSubscriptions()
    } else {
      setLoading(false)
    }

    return () => {
      // 清理订阅
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [user, loadDynamics, setupSubscriptions, subscriptions])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <div className="animate-pulse text-pink-500 text-lg">✨ 加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <button 
            className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2"
            onClick={() => router.back()}
          >
            <span>←</span> 返回
          </button>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <span>📢</span> 招募动态
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span>📊</span> 最新动态
          </h2>

          {dynamics.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 text-lg">暂无动态</p>
              <p className="text-gray-400 text-sm mt-2">发布招募信息或申请加入战队后，这里会显示相关动态</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dynamics.map((dynamic) => (
                <div key={dynamic.id} className="glass-card p-4 hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex items-start gap-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 flex-shrink-0">
                      {dynamic.userAvatar ? (
                        <Image 
                          src={dynamic.userAvatar} 
                          alt={dynamic.userName || '用户'}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
                          style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                        >
                          {dynamic.userName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{dynamic.title}</h3>
                        <span 
                          className={`text-xs px-2 py-1 rounded-full ${ 
                            dynamic.action === 'approve' ? 'bg-green-100 text-green-700' :
                            dynamic.action === 'reject' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {dynamic.action === 'approve' ? '已批准' :
                           dynamic.action === 'reject' ? '已拒绝' :
                           dynamic.action === 'create' ? '已创建' : '已更新'}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{dynamic.description}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(dynamic.timestamp).toLocaleString()}
                      </p>
                    </div>
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
