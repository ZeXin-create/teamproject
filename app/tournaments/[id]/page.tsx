'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'

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
  rules: string
  created_by: string
  created_at: string
}

interface Team {
  id: string
  name: string
  avatar_url?: string
  region: string
}

interface Match {
  id: string
  round: number
  match_number: number
  team1_id?: string
  team2_id?: string
  team1_score: number
  team2_score: number
  winner_id?: string
  match_time: string
  status: string
  team1?: Team
  team2?: Team
  winner?: Team
}

interface Result {
  id: string
  team_id: string
  rank: number
  prize: string
  team?: Team
}

export default function TournamentDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registeredTeams, setRegisteredTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [registrationStatus, setRegistrationStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTournament = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
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

  const fetchRegisteredTeams = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('team_id')
        .eq('tournament_id', id)
        .eq('status', 'approved')

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        const teamIds = (data as Array<{ team_id: string }>).map(item => item.team_id)
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, avatar_url, region')
          .in('id', teamIds)

        if (teamsData) {
          setRegisteredTeams(teamsData as Team[])
        }
      }
    } catch (err: unknown) {
      console.error('获取报名队伍失败:', err)
    }
  }, [id])

  const fetchMatches = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true })

      if (error) {
        throw error
      }

      if (data) {
        // 获取队伍信息
        const matchesWithTeams = await Promise.all(
          data.map(async (match) => {
            let team1, team2, winner

            if (match.team1_id) {
              const { data: team1Data } = await supabase
                .from('teams')
                .select('id, name, avatar_url, region')
                .eq('id', match.team1_id)
                .single()
              team1 = team1Data
            }

            if (match.team2_id) {
              const { data: team2Data } = await supabase
                .from('teams')
                .select('id, name, avatar_url, region')
                .eq('id', match.team2_id)
                .single()
              team2 = team2Data
            }

            if (match.winner_id) {
              const { data: winnerData } = await supabase
                .from('teams')
                .select('id, name, avatar_url, region')
                .eq('id', match.winner_id)
                .single()
              winner = winnerData
            }

            return {
              ...match,
              team1,
              team2,
              winner
            }
          })
        )

        setMatches(matchesWithTeams)
      }
    } catch (err: unknown) {
      console.error('获取赛程失败:', err)
    }
  }, [id])

  const fetchResults = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('tournament_results')
        .select('id, team_id, rank, prize')
        .eq('tournament_id', id)
        .order('rank', { ascending: true })

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        const resultsWithTeam = await Promise.all(
          (data as Array<{ id: string; team_id: string; rank: number; prize: string }>).map(async (result) => {
            const { data: teamData } = await supabase
              .from('teams')
              .select('id, name, avatar_url, region')
              .eq('id', result.team_id)
              .single()

            return {
              ...result,
              team: teamData || undefined
            }
          })
        )
        setResults(resultsWithTeam as Result[])
      }
    } catch (err: unknown) {
      console.error('获取结果失败:', err)
    }
  }, [id])

  const fetchUserTeam = useCallback(async () => {
    if (!user) return

    try {
      // 获取用户所在的战队
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (teamMember) {
        const { data: team } = await supabase
          .from('teams')
          .select('id, name, avatar_url, region')
          .eq('id', teamMember.team_id)
          .single()

        if (team) {
          setUserTeam(team)

          // 检查报名状态
          const { data: registration } = await supabase
            .from('tournament_registrations')
            .select('status')
            .eq('tournament_id', id)
            .eq('team_id', team.id)
            .single()

          if (registration) {
            setRegistrationStatus(registration.status)
          }
        }
      }
    } catch (err: unknown) {
      console.error('获取用户战队失败:', err)
    }
  }, [user, id])

  useEffect(() => {
    if (id) {
      fetchTournament()
      fetchRegisteredTeams()
      fetchMatches()
      fetchResults()
      fetchUserTeam()
    } else {
      setLoading(false)
    }
  }, [id, fetchTournament, fetchRegisteredTeams, fetchMatches, fetchResults, fetchUserTeam])

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
            onClick={() => router.push('/tournaments')}
          >
            <span>←</span> 返回
          </button>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <span>🏆</span> 赛事详情
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        {/* 赛事基本信息 */}
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-800">{tournament.name}</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tournament.status)}`}>
                  {tournament.status === 'pending' ? '待开始' :
                   tournament.status === 'active' ? '进行中' :
                   tournament.status === 'completed' ? '已结束' : '已取消'}
                </span>
              </div>
              <p className="text-gray-600 mb-4">{tournament.description || '暂无描述'}</p>
            </div>
            {userTeam && tournament.status === 'pending' && registrationStatus !== 'approved' && (
              <button 
                className="glass-button px-6 py-3 text-white font-medium"
                onClick={() => router.push(`/tournaments/${id}/register`)}
              >
                报名参赛
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-1">🎮 游戏大区</div>
              <div className="font-semibold text-gray-800">{tournament.region}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-1">⏰ 开始时间</div>
              <div className="font-semibold text-gray-800">{new Date(tournament.start_time).toLocaleString()}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-1">🏁 报名截止</div>
              <div className="font-semibold text-gray-800">{new Date(tournament.registration_deadline).toLocaleString()}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-1">👥 参赛队伍</div>
              <div className="font-semibold text-gray-800">{registeredTeams.length}/{tournament.max_teams}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-1">🏆 奖励池</div>
              <div className="font-semibold text-gray-800">{tournament.prize_pool || '暂无'}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-1">📝 比赛规则</div>
              <div className="font-semibold text-gray-800">{tournament.rules ? '查看规则' : '暂无'}</div>
            </div>
          </div>

          {tournament.rules && (
            <div className="glass-card p-4 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">比赛规则</h3>
              <p className="text-gray-700 whitespace-pre-line">{tournament.rules}</p>
            </div>
          )}
        </div>

        {/* 参赛队伍 */}
        <div className="glass-card p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>👥</span> 参赛队伍
          </h3>
          {registeredTeams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">暂无队伍报名</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {registeredTeams.map((team) => (
                <div key={team.id} className="glass-card p-4 hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-3 mb-2">
                    {team.avatar_url ? (
                      <div className="relative w-10 h-10 rounded-2xl overflow-hidden border-2 border-white/50">
                        <Image 
                          src={team.avatar_url} 
                          alt={team.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-800">{team.name}</h4>
                      <span className="text-xs text-pink-500 px-2 py-0.5 bg-pink-100 rounded-full">
                        {team.region}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 赛程安排 */}
        <div className="glass-card p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📅</span> 赛程安排
          </h3>
          {matches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">赛程尚未安排</p>
            </div>
          ) : (
            <div className="space-y-6">
              {matches.map((match) => (
                <div key={match.id} className="glass-card p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">第{match.round}轮 {match.match_number}场</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${match.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {match.status === 'completed' ? '已完成' : '未开始'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {match.match_time ? new Date(match.match_time).toLocaleString() : '时间待定'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 text-center">
                      {match.team1 ? (
                        <div>
                          {match.team1.avatar_url ? (
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/50 mx-auto mb-2">
                              <Image 
                                src={match.team1.avatar_url} 
                                alt={match.team1.name}
                                width={64}
                                height={64}
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div 
                              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2"
                              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                            >
                              {match.team1.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="font-semibold">{match.team1.name}</div>
                          <div className={`text-2xl font-bold ${match.winner_id === match.team1.id ? 'text-green-600' : ''}`}>
                            {match.team1_score}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400">待定</div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-600">VS</div>
                    <div className="flex-1 text-center">
                      {match.team2 ? (
                        <div>
                          {match.team2.avatar_url ? (
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/50 mx-auto mb-2">
                              <Image 
                                src={match.team2.avatar_url} 
                                alt={match.team2.name}
                                width={64}
                                height={64}
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div 
                              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2"
                              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                            >
                              {match.team2.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="font-semibold">{match.team2.name}</div>
                          <div className={`text-2xl font-bold ${match.winner_id === match.team2.id ? 'text-green-600' : ''}`}>
                            {match.team2_score}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400">待定</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 比赛结果 */}
        {tournament.status === 'completed' && (
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🏆</span> 比赛结果
            </h3>
            {results.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">结果尚未公示</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="glass-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xl font-bold ${result.rank <= 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}
                      >
                        {result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : result.rank === 3 ? '🥉' : result.rank}
                      </div>
                      {result.team ? (
                        <div className="flex items-center gap-3">
                          {result.team.avatar_url ? (
                            <div className="relative w-10 h-10 rounded-2xl overflow-hidden border-2 border-white/50">
                              <Image 
                                src={result.team.avatar_url} 
                                alt={result.team.name}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div 
                              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                            >
                              {result.team.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-800">{result.team.name}</div>
                            <span className="text-xs text-pink-500 px-2 py-0.5 bg-pink-100 rounded-full">
                              {result.team.region}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400">未知队伍</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">{result.prize || '无奖励'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
