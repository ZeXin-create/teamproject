'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '../../components/Navbar'

// 战队招募信息组件
const TeamRecruits: React.FC<{ teamId: string | undefined }> = ({ teamId }) => {
  const [recruits, setRecruits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    const fetchTeamRecruits = async () => {
      if (!teamId) return

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('team_recruits')
          .select(`
            id,
            requirements,
            contact,
            created_at,
            rank_requirement,
            positions,
            online_time,
            recruit_count,
            deadline,
            status
          `)
          .eq('team_id', teamId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        setRecruits(data || [])
      } catch (err: unknown) {
        console.error('获取招募信息失败:', err)
        setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取招募信息失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    fetchTeamRecruits()
  }, [teamId])

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse text-pink-500 text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
          {error}
        </div>
      )}

      {recruits.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎮</div>
          <p className="text-gray-600 text-lg">暂无招募信息</p>
          <p className="text-gray-400 mt-2">队长可以发布招募信息吸引新队员</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recruits.map((recruit) => (
            <div key={recruit.id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-800">招募信息</h3>
                <span className="text-sm text-gray-400">
                  {new Date(recruit.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {recruit.rank_requirement && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-500">🏆</span>
                    <span className="text-gray-700">段位要求：{recruit.rank_requirement}</span>
                  </div>
                )}

                {recruit.positions && recruit.positions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-500">🎯</span>
                    <span className="text-gray-700">擅长位置：{recruit.positions.join('、')}</span>
                  </div>
                )}

                {recruit.online_time && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-500">⏰</span>
                    <span className="text-gray-700">在线时间：{recruit.online_time}</span>
                  </div>
                )}

                {recruit.recruit_count && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-500">👥</span>
                    <span className="text-gray-700">招募人数：{recruit.recruit_count}人</span>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-4">
                <p className="text-gray-700 leading-relaxed">{recruit.requirements}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 rounded-xl p-3">
                <span className="text-pink-400">📞</span>
                <span>联系方式：{recruit.contact}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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





export default function TeamSpacePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [hasTeam, setHasTeam] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  const checkUserTeam = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (error) {
        console.error('查询战队失败:', error)
        setHasTeam(false)
      } else if (data) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', data.team_id)
          .single()

        if (teamError) {
          console.error('查询战队详情失败:', teamError)
          setHasTeam(false)
        } else {
          setTeam(teamData)
          setHasTeam(true)
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
  }, [user])

  useEffect(() => {
    if (user) {
      checkUserTeam()
    } else {
      setLoading(false)
    }
  }, [user, checkUserTeam])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    )
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
        {/* 战队信息 */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium flex items-center gap-2"
              onClick={() => router.push('/')}
            >
              <span>←</span> 返回主页面
            </button>
            <div className="flex items-center">
              {team?.avatar_url ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                  <Image
                    src={team.avatar_url}
                    alt={team.name}
                    width={80}
                    height={80}
                    className="object-cover"
                    loading="lazy" // 启用懒加载
                    priority={false} // 非首屏图片不需要优先级
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
              <Link href="/teams/recruit" className="glass-button px-4 py-2 text-white font-medium">
                招募队员
              </Link>
            </div>
          </div>

          {/* 功能导航 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Link href="/teams/edit" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">✏️</div>
              <div className="font-medium text-gray-800">编辑资料</div>
            </Link>
            <Link href="/teams/applications" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium text-gray-800">申请管理</div>
            </Link>
            <Link href="/teams/matches" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-medium text-gray-800">战队赛记录</div>
            </Link>
            <Link href="/teams/training" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🏋️‍♂️</div>
              <div className="font-medium text-gray-800">训练安排</div>
            </Link>
            <Link href={`/teams/${team?.id}/profile`} className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🎮</div>
              <div className="font-medium text-gray-800">游戏资料</div>
            </Link>
            <Link href={`/teams/${team?.id}/grouping`} className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-gray-800">战队分组</div>
            </Link>
          </div>

          {/* 战队招募信息 */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🎯</span> 战队招募信息
            </h2>
            <TeamRecruits teamId={team?.id} />
          </div>
        </div>




      </div>
    </div>
  )
}