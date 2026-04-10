'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { TeamDataService, TeamInfo } from '../../../services/teamDataService'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'

// 定义权限常量
const TEAM_INFO_PERMISSIONS = ['队长', '副队']

export default function TeamInfoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [teamId, setTeamId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [teamInfo, setTeamInfo] = useState<TeamInfo>({
    team_id: '',
    establishment_date: '',
    team_declaration: '',
    management_rules: '',
    training_schedule: '',
    competition_strategy: '',
    short_term_goals: '',
    long_term_goals: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getTeamId = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (error) {
        setError('获取战队信息失败')
        setLoading(false)
      } else if (data) {
        setTeamId(data.team_id)
        setUserRole(data.role || '')
        setTeamInfo(prev => ({ ...prev, team_id: data.team_id }))
        fetchTeamInfo(data.team_id)
      }
    } catch (err) {
      console.error('获取战队ID失败:', err)
      setError('发生错误')
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      getTeamId()
    } else {
      router.push('/auth/login')
    }
  }, [user, router, getTeamId])

  const fetchTeamInfo = async (teamId: string) => {
    try {
      const info = await TeamDataService.getTeamInfo(teamId)
      if (info) {
        setTeamInfo(info)
      }
    } catch (err) {
      console.error('获取战队信息失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await TeamDataService.createOrUpdateTeamInfo(teamId, teamInfo)
      setSuccess('保存成功')
    } catch (err) {
      setError('保存失败，请重试')
      console.error('保存战队信息失败:', err)
    } finally {
      setSaving(false)
    }
  }

  // 检查用户是否有管理战队信息的权限
  const hasTeamInfoPermission = () => {
    return TEAM_INFO_PERMISSIONS.includes(userRole)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 pt-24 md:pt-28 pb-8">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-pink-50/30">
      {/* 装饰性背景元素 */}
      <div className="fixed top-32 -left-20 w-60 h-60 bg-pink-200/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-20 -right-20 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl pointer-events-none"></div>
      
      <Navbar />
      <div className="container mx-auto px-4 pt-24 md:pt-28 pb-8 relative">
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <button
              className="px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md text-gray-700 hover:text-pink-500 hover:bg-white transition-all duration-300 font-medium flex items-center gap-2 shadow-sm border border-white/50"
              onClick={() => router.push('/teams/space')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回战队管理后台
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xl">🏠</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">战队信息管理</h1>
            </div>
            {hasTeamInfoPermission() && (
              <button
                className="px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md text-gray-700 hover:text-pink-500 hover:bg-white transition-all duration-300 font-medium flex items-center gap-2 shadow-sm border border-white/50"
                onClick={() => router.push('/teams/edit')}
              >
                <span>✏️</span> 编辑战队信息
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-2xl border border-green-200">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>{success}</span>
              </div>
            </div>
          )}

          {hasTeamInfoPermission() ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 基础信息卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">📋</span>
                  </div>
                  基础信息
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>📅</span> 成立时间
                    </label>
                    <input
                      type="date"
                      value={teamInfo.establishment_date || ''}
                      onChange={(e) => setTeamInfo({ ...teamInfo, establishment_date: e.target.value })}
                      className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>💬</span> 战队宣言
                    </label>
                    <input
                      type="text"
                      value={teamInfo.team_declaration || ''}
                      onChange={(e) => setTeamInfo({ ...teamInfo, team_declaration: e.target.value })}
                      className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                      placeholder="输入战队宣言"
                    />
                  </div>
                </div>
              </div>

              {/* 管理制度卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">📜</span>
                  </div>
                  队内管理制度
                </h2>
                <textarea
                  value={teamInfo.management_rules || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, management_rules: e.target.value })}
                  className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                  rows={4}
                  placeholder="输入队内管理制度"
                />
              </div>

              {/* 训练安排卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">🎯</span>
                  </div>
                  训练安排
                </h2>
                <textarea
                  value={teamInfo.training_schedule || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, training_schedule: e.target.value })}
                  className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                  rows={4}
                  placeholder="输入训练安排"
                />
              </div>

              {/* 比赛策略卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">⚔️</span>
                  </div>
                  比赛策略
                </h2>
                <textarea
                  value={teamInfo.competition_strategy || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, competition_strategy: e.target.value })}
                  className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                  rows={4}
                  placeholder="输入比赛策略"
                />
              </div>

              {/* 目标规划卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">🚀</span>
                  </div>
                  目标规划
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>📅</span> 短期目标
                    </label>
                    <textarea
                      value={teamInfo.short_term_goals || ''}
                      onChange={(e) => setTeamInfo({ ...teamInfo, short_term_goals: e.target.value })}
                      className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                      rows={3}
                      placeholder="输入短期目标"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>🎯</span> 长期目标
                    </label>
                    <textarea
                      value={teamInfo.long_term_goals || ''}
                      onChange={(e) => setTeamInfo({ ...teamInfo, long_term_goals: e.target.value })}
                      className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                      rows={3}
                      placeholder="输入长期目标"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl hover:from-pink-600 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : '💾 保存'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              {/* 基础信息卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">📋</span>
                  </div>
                  基础信息
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>📅</span> 成立时间
                    </label>
                    <div className="w-full px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl">
                      {teamInfo.establishment_date || '未设置'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>💬</span> 战队宣言
                    </label>
                    <div className="w-full px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl">
                      {teamInfo.team_declaration || '未设置'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 管理制度卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">📜</span>
                  </div>
                  队内管理制度
                </h2>
                <div className="w-full px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl">
                  {teamInfo.management_rules || '未设置'}
                </div>
              </div>

              {/* 训练安排卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">🎯</span>
                  </div>
                  训练安排
                </h2>
                <div className="w-full px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl">
                  {teamInfo.training_schedule || '未设置'}
                </div>
              </div>

              {/* 比赛策略卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">⚔️</span>
                  </div>
                  比赛策略
                </h2>
                <div className="w-full px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl">
                  {teamInfo.competition_strategy || '未设置'}
                </div>
              </div>

              {/* 目标规划卡片 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-white">🚀</span>
                  </div>
                  目标规划
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>📅</span> 短期目标
                    </label>
                    <div className="w-full px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl">
                      {teamInfo.short_term_goals || '未设置'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>🎯</span> 长期目标
                    </label>
                    <div className="w-full px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl">
                      {teamInfo.long_term_goals || '未设置'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-3xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="font-semibold">您没有权限修改战队信息</p>
                    <p className="text-sm text-gray-500">只有队长和副队可以编辑这些信息</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}