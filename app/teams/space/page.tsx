'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '../../components/Navbar'

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
            <Link href="/teams/data/match-records" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-medium text-gray-800">比赛记录</div>
            </Link>
            <Link href="/teams/data/training-plans" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🏋️‍♂️</div>
              <div className="font-medium text-gray-800">训练安排</div>
            </Link>
            <Link href={`/teams/${team?.id}/profile`} className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🎮</div>
              <div className="font-medium text-gray-800">个人游戏资料</div>
            </Link>
            <Link href="/teams/data/team-info" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-gray-800">战队信息</div>
            </Link>
            <Link href="/teams/data/analytics" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-medium text-gray-800">数据可视化</div>
            </Link>
            <Link href="/ai-assistant" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🤖</div>
              <div className="font-medium text-gray-800">智能助手</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}