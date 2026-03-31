'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { TeamDataService, TrainingPlan } from '../../../services/teamDataService'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'

// 定义权限常量
const TRAINING_PLAN_PERMISSIONS = ['队长', '副队', '领队']

export default function TrainingPlansPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [teamId, setTeamId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([])
  const [newPlan, setNewPlan] = useState<TrainingPlan>({
    team_id: '',
    plan_name: '',
    training_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    participants: [],
    content: '',
    效果_analysis: ''
  })
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null)
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])
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
        setNewPlan(prev => ({ ...prev, team_id: data.team_id }))
        fetchTeamMembers(data.team_id)
        fetchTrainingPlans(data.team_id)
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

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .eq('status', 'active')

      if (data) {
        const members = await Promise.all(
          data.map(async (member) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('id, username')
              .eq('id', member.user_id)
              .single()
            return { id: userData?.id || '', name: userData?.username || '' }
          })
        )
        setTeamMembers(members)
      }
    } catch (err) {
      console.error('获取队员信息失败:', err)
    }
  }

  const fetchTrainingPlans = async (teamId: string) => {
    try {
      const plans = await TeamDataService.getTrainingPlans(teamId)
      setTrainingPlans(plans)
    } catch (err) {
      console.error('获取训练计划失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await TeamDataService.createTrainingPlan(newPlan)
      setSuccess('创建成功')
      setNewPlan({
        team_id: teamId,
        plan_name: '',
        training_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        participants: [],
        content: '',
        效果_analysis: ''
      })
      fetchTrainingPlans(teamId)
    } catch (err) {
      setError('创建失败，请重试')
      console.error('创建训练计划失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await TeamDataService.updateTrainingPlan(editingPlan.id || '', editingPlan)
      setSuccess('更新成功')
      setEditingPlan(null)
      fetchTrainingPlans(teamId)
    } catch (err) {
      setError('更新失败，请重试')
      console.error('更新训练计划失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm('确定要删除这条训练计划吗？')) return

    try {
      await TeamDataService.deleteTrainingPlan(id)
      setSuccess('删除成功')
      fetchTrainingPlans(teamId)
    } catch (err) {
      setError('删除失败，请重试')
      console.error('删除训练计划失败:', err)
    }
  }

  const handleParticipantChange = (userId: string) => {
    if (editingPlan) {
      const currentParticipants = editingPlan.participants || []
      setEditingPlan({
        ...editingPlan,
        participants: currentParticipants.includes(userId)
          ? currentParticipants.filter(id => id !== userId)
          : [...currentParticipants, userId]
      })
    } else {
      const currentParticipants = newPlan.participants || []
      setNewPlan({
        ...newPlan,
        participants: currentParticipants.includes(userId)
          ? currentParticipants.filter(id => id !== userId)
          : [...currentParticipants, userId]
      })
    }
  }

  // 检查用户是否有管理训练计划的权限
  const hasTrainingPlanPermission = () => {
    return TRAINING_PLAN_PERMISSIONS.includes(userRole)
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
            <h1 className="text-2xl font-bold gradient-text">训练计划管理</h1>
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

          {/* 创建新计划 */}
          {hasTrainingPlanPermission() ? (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">添加训练计划</h2>
              <form onSubmit={editingPlan ? handleUpdatePlan : handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">计划名称</label>
                    <input
                      type="text"
                      value={(editingPlan || newPlan).plan_name}
                      onChange={(e) => editingPlan ? 
                        setEditingPlan({ ...editingPlan, plan_name: e.target.value }) : 
                        setNewPlan({ ...newPlan, plan_name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="输入计划名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">训练日期</label>
                    <input
                      type="date"
                      value={(editingPlan || newPlan).training_date}
                      onChange={(e) => editingPlan ? 
                        setEditingPlan({ ...editingPlan, training_date: e.target.value }) : 
                        setNewPlan({ ...newPlan, training_date: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                      <input
                        type="time"
                        value={(editingPlan || newPlan).start_time || ''}
                        onChange={(e) => editingPlan ? 
                          setEditingPlan({ ...editingPlan, start_time: e.target.value }) : 
                          setNewPlan({ ...newPlan, start_time: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                      <input
                        type="time"
                        value={(editingPlan || newPlan).end_time || ''}
                        onChange={(e) => editingPlan ? 
                          setEditingPlan({ ...editingPlan, end_time: e.target.value }) : 
                          setNewPlan({ ...newPlan, end_time: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">参与人员</label>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map((member) => (
                      <label key={member.id} className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={((editingPlan || newPlan).participants || []).includes(member.id)}
                          onChange={() => handleParticipantChange(member.id)}
                        />
                        <span>{member.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">训练内容</label>
                  <textarea
                    value={(editingPlan || newPlan).content || ''}
                    onChange={(e) => editingPlan ? 
                      setEditingPlan({ ...editingPlan, content: e.target.value }) : 
                      setNewPlan({ ...newPlan, content: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="输入训练内容"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">训练效果分析</label>
                  <textarea
                    value={(editingPlan || newPlan).效果_analysis || ''}
                    onChange={(e) => editingPlan ? 
                      setEditingPlan({ ...editingPlan, 效果_analysis: e.target.value }) : 
                      setNewPlan({ ...newPlan, 效果_analysis: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="输入训练效果分析"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  {editingPlan && (
                    <button
                      type="button"
                      onClick={() => setEditingPlan(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      取消
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? '保存中...' : (editingPlan ? '更新' : '添加')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mb-8 p-4 bg-gray-100 text-gray-600 rounded-lg">
              <p>您没有权限添加训练计划</p>
            </div>
          )}

          {/* 训练计划列表 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">训练计划列表</h2>
            {trainingPlans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无训练计划
              </div>
            ) : (
              <div className="space-y-4">
                {trainingPlans.map((plan) => (
                  <div key={plan.id} className="glass-card p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{plan.plan_name}</div>
                        <div className="text-sm text-gray-600">{plan.training_date} {plan.start_time} - {plan.end_time}</div>
                      </div>
                    </div>
                    {plan.participants && plan.participants.length > 0 && (
                      <div className="mt-2 text-sm">
                        参与人员: {plan.participants.map(id => {
                          const member = teamMembers.find(m => m.id === id)
                          return member?.name || id
                        }).join(', ')}
                      </div>
                    )}
                    {plan.content && (
                      <div className="mt-2 text-sm">{plan.content}</div>
                    )}
                    {plan.效果_analysis && (
                      <div className="mt-2 text-sm font-medium">效果分析: {plan.效果_analysis}</div>
                    )}
                    <div className="mt-4 flex justify-end space-x-2">
                      {hasTrainingPlanPermission() && (
                        <>
                          <button
                            onClick={() => setEditingPlan(plan)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id || '')}
                            className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}