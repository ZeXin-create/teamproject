'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import PageLayout from '../components/layout/PageLayout'


interface Tournament {
  id: string
  name: string
  description: string
  region: string
  start_time: string
  end_time: string
  registration_deadline: string
  max_teams: number
  status: string
  prize_pool: string
  created_by: string
  created_at: string
  team_count?: number
}

export default function TournamentsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({
    region: '',
    status: ''
  })

  const getTournaments = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter.region) {
        query = query.eq('region', filter.region)
      }

      if (filter.status) {
        query = query.eq('status', filter.status)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      // 获取每个赛事的报名队伍数
      if (data) {
        const tournamentsWithCount = await Promise.all(
          data.map(async (tournament) => {
            const { data: registrations } = await supabase
              .from('tournament_registrations')
              .select('id')
              .eq('tournament_id', tournament.id)
              .eq('status', 'approved')

            return {
              ...tournament,
              team_count: registrations?.length || 0
            }
          })
        )

        setTournaments(tournamentsWithCount)
      } else {
        setTournaments([])
      }
    } catch (err: unknown) {
      console.error('获取赛事列表失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取赛事列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    getTournaments()
  }, [getTournaments])

  const handleFilterChange = (key: string, value: string) => {
    setFilter(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'active': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

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
      <Navbar />
      <PageLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <span>🏆</span> 赛事管理
            </h1>
            {user && (
              <button 
                className="glass-button px-6 py-3 text-white font-medium"
                onClick={() => router.push('/tournaments/new')}
              >
                ✨ 创建赛事
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
              {error}
            </div>
          )}

          {/* 筛选器 */}
          <div className="glass-card p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🔍</span> 赛事筛选
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">🎮 游戏大区</label>
                <select
                  className="glass-input w-full px-4 py-3 outline-none"
                  value={filter.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                >
                  <option value="">所有大区</option>
                  <option value="iOS QQ">iOS QQ</option>
                  <option value="安卓QQ">安卓QQ</option>
                  <option value="微信iOS">微信iOS</option>
                  <option value="微信安卓">微信安卓</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">📊 赛事状态</label>
                <select
                  className="glass-input w-full px-4 py-3 outline-none"
                  value={filter.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">所有状态</option>
                  <option value="pending">待开始</option>
                  <option value="active">进行中</option>
                  <option value="completed">已结束</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            </div>
          </div>

          {/* 赛事列表 */}
          <div className="space-y-4">
            {tournaments.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-gray-600 text-lg">暂无赛事</p>
                <p className="text-gray-400 text-sm mt-2">点击上方的&ldquo;创建赛事&rdquo;按钮创建新赛事</p>
              </div>
            ) : (
              tournaments.map((tournament) => (
                <div key={tournament.id} className="glass-card p-6 hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{tournament.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tournament.status)}`}>
                          {tournament.status === 'pending' ? '待开始' :
                           tournament.status === 'active' ? '进行中' :
                           tournament.status === 'completed' ? '已结束' : '已取消'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{tournament.description || '暂无描述'}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <span>🎮</span>
                          <span>大区：{tournament.region}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>⏰</span>
                          <span>开始：{new Date(tournament.start_time).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🏁</span>
                          <span>截止：{new Date(tournament.registration_deadline).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>👥</span>
                          <span>队伍：{tournament.team_count}/{tournament.max_teams}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🏆</span>
                          <span>奖励：{tournament.prize_pool || '暂无'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        className="glass-button px-6 py-2 text-white font-medium text-sm"
                        onClick={() => router.push(`/tournaments/${tournament.id}`)}
                      >
                        查看详情
                      </button>
                      {tournament.status === 'pending' && (
                        <button 
                          className="px-6 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-xl text-sm font-medium"
                          onClick={() => router.push(`/tournaments/${tournament.id}/register`)}
                        >
                          报名参赛
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PageLayout>
    </div>
  )
}
