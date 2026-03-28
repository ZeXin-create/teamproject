'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'

interface Training {
  id: string
  team_id: string
  title: string
  description: string
  training_time: string
  location: string
  created_by: string
  created_at: string
  attendees?: string[]
}

export default function TrainingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [trainings, setTrainings] = useState<Training[]>([])
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null)
  const [is队长, setIs队长] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 表单状态
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [trainingTime, setTrainingTime] = useState('')
  const [location, setLocation] = useState('')
  
  const fetchTeamData = useCallback(async () => {
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
      setIs队长(teamMember.role === '队长' || teamMember.role === '副队长')
      
      // 获取战队信息
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamMember.team_id)
        .single()
      
      if (teamError) {
        throw teamError
      }
      
      setTeam(teamData)
      
      // 获取训练安排
      await fetchTrainings(teamMember.team_id)
    } catch (err: unknown) {
      console.error('获取战队信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取战队信息失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTrainings = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_trainings')
        .select('*')
        .eq('team_id', teamId)
        .order('training_time', { ascending: true })
      
      if (error) {
        throw error
      }
      
      setTrainings(data)
    } catch (err: unknown) {
      console.error('获取训练安排失败:', err)
    }
  }, [user])
  
  useEffect(() => {
    if (user) {
      fetchTeamData()
    } else {
      setLoading(false)
    }
  }, [user, fetchTeamData])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!title || !trainingTime || !location) {
      setError('请填写所有必填字段')
      return
    }
    
    try {
      const { error } = await supabase
        .from('team_trainings')
        .insert({
          team_id: team?.id,
          title,
          description,
          training_time: trainingTime,
          location,
          created_by: user?.id
        })
      
      if (error) {
        throw error
      }
      
      // 重置表单
      setTitle('')
      setDescription('')
      setTrainingTime('')
      setLocation('')
      setShowModal(false)
      setSuccess('训练安排添加成功！')
      
      // 重新获取训练安排
      await fetchTrainings(team?.id || '')
    } catch (err: unknown) {
      console.error('添加训练安排失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '添加训练安排失败，请稍后重试')
    }
  }
  
  const handleAttend = async (trainingId: string) => {
    try {
      // 实现报名参加训练的功能
      const { error } = await supabase
        .from('team_training_attendees')
        .insert({
          training_id: trainingId,
          user_id: user?.id,
          status: 'confirmed'
        })
      
      if (error) {
        throw error
      }
      
      setSuccess('报名成功！')
    } catch (err: unknown) {
      console.error('报名失败:', err)
      setError('报名失败，请稍后重试')
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <button 
            className="mr-4 text-pink-500 hover:text-pink-600 glass-button px-4 py-2 rounded-lg"
            onClick={() => router.back()}
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-800">战队训练安排</h1>
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
        
        {is队长 && (
          <div className="mb-6">
            <button 
              className="glass-button px-6 py-3 text-white font-medium"
              onClick={() => setShowModal(true)}
            >
              添加训练安排
            </button>
          </div>
        )}
        
        <div className="glass-card p-6 rounded-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6">训练计划</h2>
          
          {trainings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏋️‍♂️</div>
              <p className="text-gray-600">暂无训练安排</p>
              {is队长 && (
                <p className="text-gray-400 mt-2">点击上方按钮添加训练安排</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {trainings.map((training) => (
                <div key={training.id} className="glass-card p-4 hover:scale-[1.01] transition-transform">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800">{training.title}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      {new Date(training.training_time).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">⏰</span>
                      <span className="text-gray-700">{new Date(training.training_time).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📍</span>
                      <span className="text-gray-700">{training.location}</span>
                    </div>
                  </div>
                  
                  {training.description && (
                    <p className="text-gray-600 mb-4">{training.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      创建于 {new Date(training.created_at).toLocaleString()}
                    </span>
                    <button 
                      className="glass-button px-4 py-2 text-white text-sm font-medium"
                      onClick={() => handleAttend(training.id)}
                    >
                      报名参加
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 添加训练安排模态框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold gradient-text">🏋️‍♂️ 添加训练安排</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setShowModal(false)}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-gray-700 mb-2">
                    训练标题 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    className="w-full px-4 py-3 glass-input focus:outline-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-gray-700 mb-2">
                    训练描述
                  </label>
                  <textarea
                    id="description"
                    className="w-full px-4 py-3 glass-input focus:outline-none"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="trainingTime" className="block text-gray-700 mb-2">
                    训练时间 *
                  </label>
                  <input
                    type="datetime-local"
                    id="trainingTime"
                    className="w-full px-4 py-3 glass-input focus:outline-none"
                    value={trainingTime}
                    onChange={(e) => setTrainingTime(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-gray-700 mb-2">
                    训练地点 *
                  </label>
                  <input
                    type="text"
                    id="location"
                    className="w-full px-4 py-3 glass-input focus:outline-none"
                    placeholder="例如：游戏内房间号、语音频道等"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    className="px-6 py-3 glass-input hover:bg-white/60 rounded-lg"
                    onClick={() => setShowModal(false)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 glass-button text-white font-medium"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}