'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Image from 'next/image'

interface Tournament {
  id: string
  name: string
  region: string
  registration_deadline: string
  max_teams: number
  status: string
}

interface Team {
  id: string
  name: string
  avatar_url: string
  region: string
  member_count: number
}

export default function RegisterTournamentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [userTeams, setUserTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTournament = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, region, registration_deadline, max_teams, status')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      setTournament(data)
    } catch (err: unknown) {
      console.error('获取赛事信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取赛事信息失败，请稍后重试')
    }
  }, [id])

  const fetchUserTeams = useCallback(async () => {
    if (!user) return

    try {
      // 获取用户所在的战队
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (teamMembers && teamMembers.length > 0) {
        const teams = await Promise.all(
          teamMembers.map(async (member) => {
            // 获取战队信息
            const { data: teamData } = await supabase
              .from('teams')
              .select('id, name, avatar_url, region')
              .eq('id', member.team_id)
              .single()

            // 获取战队成员数
            const { data: memberCount } = await supabase
              .from('team_members')
              .select('id')
              .eq('team_id', member.team_id)
              .eq('status', 'active')

            if (teamData) {
              return {
                id: teamData.id,
                name: teamData.name,
                avatar_url: teamData.avatar_url || '',
                region: teamData.region,
                member_count: memberCount?.length || 0
              }
            }
            return null
          })
        )

        const validTeams = teams.filter((team): team is Team => team !== null)
        setUserTeams(validTeams)
        if (validTeams.length > 0) {
          setSelectedTeamId(validTeams[0].id)
        }
      }
    } catch (err: unknown) {
      console.error('获取用户战队失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取用户战队失败，请稍后重试')
    }
  }, [user])

  useEffect(() => {
    if (id) {
      fetchTournament()
      fetchUserTeams()
    } else {
      setLoading(false)
    }
  }, [id, fetchTournament, fetchUserTeams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!tournament) {
        throw new Error('赛事信息不存在')
      }

      if (!selectedTeamId) {
        throw new Error('请选择要报名的战队')
      }

      // 检查报名截止时间
      if (new Date(tournament.registration_deadline) < new Date()) {
        throw new Error('报名已截止')
      }

      // 检查赛事状态
      if (tournament.status !== 'pending') {
        throw new Error('赛事已开始或已结束，无法报名')
      }

      // 检查战队是否已经报名
      const { data: existingRegistration } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', id)
        .eq('team_id', selectedTeamId)
        .single()

      if (existingRegistration) {
        throw new Error('该战队已经报名此赛事')
      }

      // 检查报名队伍数是否已满
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', id)
        .eq('status', 'approved')

      if (registrations && registrations.length >= tournament.max_teams) {
        throw new Error('赛事报名队伍数已满')
      }

      // 检查战队大区是否匹配
      const { data: teamData } = await supabase
        .from('teams')
        .select('region')
        .eq('id', selectedTeamId)
        .single()

      if (teamData && teamData.region !== tournament.region) {
        throw new Error('战队大区与赛事大区不匹配')
      }

      // 提交报名
      const { error } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: id,
          team_id: selectedTeamId,
          registered_by: user?.id
        })

      if (error) {
        throw error
      }

      setSuccess('报名成功！请等待审核')
      setTimeout(() => {
        router.push(`/tournaments/${id}`)
      }, 1000)
    } catch (err: unknown) {
      console.error('报名失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '报名失败，请稍后重试')
    } finally {
      setSubmitting(false)
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

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 text-lg">赛事不存在</p>
          <button 
            className="mt-4 glass-button px-6 py-3 text-white font-medium"
            onClick={() => router.push('/tournaments')}
          >
            返回赛事列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <button 
            className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2 mr-4"
            onClick={() => router.push(`/tournaments/${id}`)}
          >
            <span>←</span> 返回
          </button>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <span>📝</span> 赛事报名
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-2xl border border-green-200">
            {success}
          </div>
        )}

        <div className="glass-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{tournament.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <span>🎮</span>
                <span>大区：{tournament.region}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⏰</span>
                <span>报名截止：{new Date(tournament.registration_deadline).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span>最大队伍数：{tournament.max_teams}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>📊</span>
                <span>状态：{tournament.status === 'pending' ? '待开始' : tournament.status === 'active' ? '进行中' : '已结束'}</span>
              </div>
            </div>
          </div>

          {userTeams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-600 text-lg">您还没有加入任何战队</p>
              <p className="text-gray-400 text-sm mt-2">请先加入或创建一个战队，然后再报名参赛</p>
              <button 
                className="mt-4 glass-button px-6 py-3 text-white font-medium"
                onClick={() => router.push('/teams/join')}
              >
                加入战队
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>👥</span> 选择战队
                </h3>
                <div className="space-y-3">
                  {userTeams.map((team) => (
                    <div 
                      key={team.id}
                      className={`glass-card p-4 cursor-pointer transition-all ${selectedTeamId === team.id ? 'ring-2 ring-pink-400 bg-pink-50' : 'hover:bg-white/60'}`}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <div className="flex items-center gap-4">
                        {team.avatar_url ? (
                          <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/50">
                            <Image 
                              src={team.avatar_url} 
                              alt={team.name}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                          >
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{team.name}</h4>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-pink-500 px-2 py-0.5 bg-pink-100 rounded-full">
                              {team.region}
                            </span>
                            <span className="text-gray-500">
                              {team.member_count} 人
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${selectedTeamId === team.id ? 'bg-pink-400 border-pink-400' : 'border-gray-300'}`}>
                          {selectedTeamId === team.id && (
                            <div className="w-3 h-3 rounded-full bg-white mx-auto mt-1"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  className="px-6 py-3 rounded-2xl text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all"
                  onClick={() => router.push(`/tournaments/${id}`)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="glass-button px-8 py-3 text-white font-medium"
                  disabled={submitting}
                >
                  {submitting ? '报名中...' : '📝 提交报名'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
