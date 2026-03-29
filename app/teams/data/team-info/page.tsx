'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { TeamDataService, TeamInfo } from '../../../services/teamDataService'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'

export default function TeamInfoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [teamId, setTeamId] = useState('')
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

  useEffect(() => {
    if (user) {
      getTeamId()
    } else {
      router.push('/auth/login')
    }
  }, [user, router, getTeamId])

  const getTeamId = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (error) {
        setError('获取战队信息失败')
        setLoading(false)
      } else if (data) {
        setTeamId(data.team_id)
        setTeamInfo({ ...teamInfo, team_id: data.team_id })
        fetchTeamInfo(data.team_id)
      }
    } catch (err) {
      console.error('获取战队ID失败:', err)
      setError('发生错误')
      setLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium flex items-center gap-2"
              onClick={() => router.push('/teams/space')}
            >
              <span>←</span> 返回战队空间
            </button>
            <h1 className="text-2xl font-bold gradient-text">战队信息管理</h1>
            <div className="w-20"></div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">成立时间</label>
                <input
                  type="date"
                  value={teamInfo.establishment_date || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, establishment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">战队宣言</label>
                <input
                  type="text"
                  value={teamInfo.team_declaration || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, team_declaration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入战队宣言"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">队内管理制度</label>
              <textarea
                value={teamInfo.management_rules || ''}
                onChange={(e) => setTeamInfo({ ...teamInfo, management_rules: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="输入队内管理制度"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">训练安排</label>
              <textarea
                value={teamInfo.training_schedule || ''}
                onChange={(e) => setTeamInfo({ ...teamInfo, training_schedule: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="输入训练安排"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">比赛策略</label>
              <textarea
                value={teamInfo.competition_strategy || ''}
                onChange={(e) => setTeamInfo({ ...teamInfo, competition_strategy: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="输入比赛策略"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">短期目标</label>
              <textarea
                value={teamInfo.short_term_goals || ''}
                onChange={(e) => setTeamInfo({ ...teamInfo, short_term_goals: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="输入短期目标"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">长期目标</label>
              <textarea
                value={teamInfo.long_term_goals || ''}
                onChange={(e) => setTeamInfo({ ...teamInfo, long_term_goals: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="输入长期目标"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}