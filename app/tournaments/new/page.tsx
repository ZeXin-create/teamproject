'use client'

import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

interface TournamentFormData {
  name: string
  description: string
  region: string
  start_time: string
  end_time: string
  registration_deadline: string
  max_teams: number
  prize_pool: string
  rules: string
}

export default function CreateTournamentPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState<TournamentFormData>({
    name: '',
    description: '',
    region: 'iOS QQ',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    registration_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    max_teams: 8,
    prize_pool: '',
    rules: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // 验证表单
      if (!formData.name) {
        throw new Error('请输入赛事名称')
      }

      if (!formData.description) {
        throw new Error('请输入赛事描述')
      }

      if (new Date(formData.start_time) < new Date()) {
        throw new Error('开始时间不能早于当前时间')
      }

      if (new Date(formData.end_time) < new Date(formData.start_time)) {
        throw new Error('结束时间不能早于开始时间')
      }

      if (new Date(formData.registration_deadline) < new Date()) {
        throw new Error('报名截止时间不能早于当前时间')
      }

      if (new Date(formData.registration_deadline) > new Date(formData.start_time)) {
        throw new Error('报名截止时间不能晚于开始时间')
      }

      if (formData.max_teams < 2) {
        throw new Error('最大参赛队伍数至少为2')
      }

      // 创建赛事
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          description: formData.description,
          region: formData.region,
          start_time: formData.start_time,
          end_time: formData.end_time,
          registration_deadline: formData.registration_deadline,
          max_teams: formData.max_teams,
          prize_pool: formData.prize_pool,
          rules: formData.rules,
          created_by: user?.id
        })
        .select('id')
        .single()

      if (error) {
        throw error
      }

      setSuccess('赛事创建成功！')
      setTimeout(() => {
        router.push(`/tournaments/${data.id}`)
      }, 1000)
    } catch (err: unknown) {
      console.error('创建赛事失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '创建赛事失败，请稍后重试')
    } finally {
      setLoading(false)
    }
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
            <span>✨</span> 创建赛事
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>📋</span> 基本信息
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">🏆 赛事名称</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    placeholder="请输入赛事名称"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">📝 赛事描述</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    rows={4}
                    placeholder="请输入赛事描述"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">🎮 游戏大区</label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    required
                  >
                    <option value="iOS QQ">iOS QQ</option>
                    <option value="安卓QQ">安卓QQ</option>
                    <option value="微信iOS">微信iOS</option>
                    <option value="微信安卓">微信安卓</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 时间设置 */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>⏰</span> 时间设置
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">开始时间</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">结束时间</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">报名截止</label>
                  <input
                    type="datetime-local"
                    name="registration_deadline"
                    value={formData.registration_deadline}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 其他设置 */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>⚙️</span> 其他设置
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">👥 最大参赛队伍数</label>
                  <input
                    type="number"
                    name="max_teams"
                    value={formData.max_teams}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    min="2"
                    max="64"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">🏆 奖励池</label>
                  <input
                    type="text"
                    name="prize_pool"
                    value={formData.prize_pool}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    placeholder="请输入奖励内容"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">📝 比赛规则</label>
                  <textarea
                    name="rules"
                    value={formData.rules}
                    onChange={handleInputChange}
                    className="glass-input w-full px-4 py-3 outline-none"
                    rows={6}
                    placeholder="请输入比赛规则"
                  />
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                className="px-6 py-3 rounded-2xl text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all"
                onClick={() => router.push('/tournaments')}
              >
                取消
              </button>
              <button
                type="submit"
                className="glass-button px-8 py-3 text-white font-medium"
                disabled={loading}
              >
                {loading ? '创建中...' : '✨ 创建赛事'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
