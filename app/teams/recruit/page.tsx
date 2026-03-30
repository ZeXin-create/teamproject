'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

interface Recruit {
  id: string
  team_id: string
  requirements: string
  contact: string
  created_at: string
  rank_requirement?: string
  positions?: string[]
  online_time?: string
  recruit_count?: number
  deadline?: string
  status?: string
  created_by?: string
  team?: {
    name: string
    region: string
  }
}

export default function RecruitPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  // 检查用户是否有权限编辑/删除招募信息
  const canManageRecruit = useCallback((recruit: Recruit): boolean => {
    if (!user) return false
    // 用户是该招募信息的创建者
    return recruit.created_by === user.id
  }, [user])

  // 发布招募信息
  const [showRecruitForm, setShowRecruitForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recruitForm, setRecruitForm] = useState({
    rank_requirement: '',
    positions: [] as string[],
    online_time: '',
    recruit_count: 0,
    requirements: '',
    contact: ''
  })

  // 编辑招募信息
  const [editingRecruit, setEditingRecruit] = useState<Recruit | null>(null)

  const getRecruits = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_recruits')
        .select(`
          id,
          team_id,
          requirements,
          contact,
          created_at,
          rank_requirement,
          positions,
          online_time,
          recruit_count,
          deadline,
          status,
          created_by,
          team:teams(
            name,
            region
          )
        `)
        .eq('status', 'active')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      console.log('获取到的招募信息:', data)

      // 处理 team 字段的类型问题
      const processedData: Recruit[] = (data || []).map(item => ({
        ...item,
        team: Array.isArray(item.team) ? item.team[0] : item.team
      }))

      console.log('处理后的招募信息:', processedData)
      setRecruits(processedData)
    } catch (err: unknown) {
      console.error('获取招募信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取招募信息失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    getRecruits()
  }, [getRecruits])

  // 发布招募信息
  const handleRecruitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('请先登录')
      return
    }

    if (!recruitForm.requirements || !recruitForm.contact) {
      setError('请填写招募要求和联系方式')
      return
    }

    setIsSubmitting(true)
    try {
      // 获取用户所在的战队
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (teamMemberError) {
        throw new Error('您还没有加入战队')
      }

      const teamId = teamMember.team_id

      // 创建招募信息
      const { data: newRecruit, error: recruitError } = await supabase
        .from('team_recruits')
        .insert({
          team_id: teamId,
          requirements: recruitForm.requirements,
          contact: recruitForm.contact,
          rank_requirement: recruitForm.rank_requirement,
          positions: recruitForm.positions,
          online_time: recruitForm.online_time,
          recruit_count: recruitForm.recruit_count,
          status: 'active',
          created_by: user.id
        })
        .select(`
          id,
          team_id,
          requirements,
          contact,
          created_at,
          rank_requirement,
          positions,
          online_time,
          recruit_count,
          deadline,
          status,
          created_by,
          team:teams(
            name,
            region
          )
        `)
        .single()

      if (recruitError) {
        throw recruitError
      }

      // 处理 team 字段的类型问题
      const processedRecruit: Recruit = {
        ...newRecruit,
        team: Array.isArray(newRecruit.team) ? newRecruit.team[0] : newRecruit.team
      }

      // 更新招募列表
      setRecruits(prev => [processedRecruit, ...prev])

      // 重置表单
      setRecruitForm({
        rank_requirement: '',
        positions: [] as string[],
        online_time: '',
        recruit_count: 0,
        requirements: '',
        contact: ''
      })

      // 关闭表单
      setShowRecruitForm(false)

      // 显示成功消息
      setError('')
    } catch (err: unknown) {
      console.error('发布招募信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '发布招募信息失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 编辑招募信息
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !editingRecruit) {
      setError('请先登录')
      return
    }

    // 检查权限
    if (!canManageRecruit(editingRecruit)) {
      setError('您没有权限编辑这条招募信息')
      return
    }

    if (!recruitForm.requirements || !recruitForm.contact) {
      setError('请填写招募要求和联系方式')
      return
    }

    setIsSubmitting(true)
    try {
      // 更新招募信息
      const { data: updatedRecruit, error: recruitError } = await supabase
        .from('team_recruits')
        .update({
          requirements: recruitForm.requirements,
          contact: recruitForm.contact,
          rank_requirement: recruitForm.rank_requirement,
          positions: recruitForm.positions,
          online_time: recruitForm.online_time,
          recruit_count: recruitForm.recruit_count
        })
        .eq('id', editingRecruit.id)
        .select(`
          id,
          team_id,
          requirements,
          contact,
          created_at,
          rank_requirement,
          positions,
          online_time,
          recruit_count,
          deadline,
          status,
          created_by,
          team:teams(
            name,
            region
          )
        `)
        .single()

      if (recruitError) {
        throw recruitError
      }

      // 处理 team 字段的类型问题
      const processedRecruit: Recruit = {
        ...updatedRecruit,
        team: Array.isArray(updatedRecruit.team) ? updatedRecruit.team[0] : updatedRecruit.team
      }

      // 更新招募列表
      setRecruits(prev => prev.map(recruit => recruit.id === editingRecruit.id ? processedRecruit : recruit))

      // 关闭表单
      setShowRecruitForm(false)
      setEditingRecruit(null)

      // 显示成功消息
      setError('')
    } catch (err: unknown) {
      console.error('编辑招募信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '编辑招募信息失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除招募信息
  const handleDeleteRecruit = async (recruitId: string) => {
    if (!user) {
      setError('请先登录')
      return
    }

    // 查找要删除的招募信息
    const recruitToDelete = recruits.find(r => r.id === recruitId)
    if (!recruitToDelete) {
      setError('招募信息不存在')
      return
    }

    // 检查权限
    if (!canManageRecruit(recruitToDelete)) {
      setError('您没有权限删除这条招募信息')
      return
    }

    if (!confirm('确定要删除这条招募信息吗？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('team_recruits')
        .update({ status: 'inactive' })
        .eq('id', recruitId)

      if (error) {
        throw error
      }

      // 更新招募列表
      setRecruits(prev => prev.filter(recruit => recruit.id !== recruitId))

      // 显示成功消息
      setError('')
    } catch (err: unknown) {
      console.error('删除招募信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '删除招募信息失败，请稍后重试')
    }
  }

  // 编辑招募信息
  const handleEditRecruit = (recruit: Recruit) => {
    setEditingRecruit(recruit)
    setRecruitForm({
      rank_requirement: recruit.rank_requirement || '',
      positions: recruit.positions || [] as string[],
      online_time: recruit.online_time || '',
      recruit_count: recruit.recruit_count || 0,
      requirements: recruit.requirements,
      contact: recruit.contact
    })
    setShowRecruitForm(true)
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
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <button
            className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2 mr-4"
            onClick={() => router.back()}
          >
            <span>←</span> 返回
          </button>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <span>🎯</span> 招募队员
          </h1>
        </div>

        {user && (
          <div className="mb-6">
            <button
              className="glass-button px-6 py-3 text-white font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-breathe"
              onClick={() => {
                setEditingRecruit(null)
                setRecruitForm({
                  rank_requirement: '',
                  positions: [] as string[],
                  online_time: '',
                  recruit_count: 0,
                  requirements: '',
                  contact: ''
                })
                setShowRecruitForm(true)
              }}
            >
              ✨ 发布招募信息
            </button>
          </div>
        )}

        {/* 发布/编辑招募信息表单 */}
        {showRecruitForm && (
          <div className="glass-card p-6 mb-6 max-w-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>📝</span> {editingRecruit ? '编辑招募信息' : '发布招募信息'}
            </h2>
            <form onSubmit={editingRecruit ? handleEditSubmit : handleRecruitSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">🏆 段位要求</label>
                <select
                  className="glass-input w-full px-4 py-2 outline-none"
                  value={recruitForm.rank_requirement}
                  onChange={(e) => setRecruitForm(prev => ({ ...prev, rank_requirement: e.target.value }))}
                >
                  <option value="">不限段位</option>
                  <option value="王者">王者</option>
                  <option value="星耀">星耀</option>
                  <option value="钻石">钻石</option>
                  <option value="铂金">铂金</option>
                  <option value="黄金">黄金</option>
                  <option value="白银">白银</option>
                  <option value="青铜">青铜</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">🎯 擅长位置</label>
                <div className="grid grid-cols-3 gap-2">
                  {['上单', '打野', '中单', '射手', '辅助'].map(position => (
                    <label key={position} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={recruitForm.positions.includes(position)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRecruitForm(prev => ({ ...prev, positions: [...prev.positions, position] }))
                          } else {
                            setRecruitForm(prev => ({ ...prev, positions: prev.positions.filter(p => p !== position) }))
                          }
                        }}
                        className="mr-2"
                      />
                      <span>{position}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">⏰ 在线时间</label>
                <select
                  className="glass-input w-full px-4 py-2 outline-none"
                  value={recruitForm.online_time}
                  onChange={(e) => setRecruitForm(prev => ({ ...prev, online_time: e.target.value }))}
                >
                  <option value="">不限时间</option>
                  <option value="早上">早上</option>
                  <option value="中午">中午</option>
                  <option value="晚上">晚上</option>
                  <option value="全天">全天</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">👥 招募人数</label>
                <input
                  type="number"
                  className="glass-input w-full px-4 py-2 outline-none"
                  value={recruitForm.recruit_count || ''}
                  onChange={(e) => setRecruitForm(prev => ({ ...prev, recruit_count: parseInt(e.target.value) || 0 }))}
                  placeholder="请输入招募人数"
                  min="1"
                  max="5"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">📝 招募要求</label>
                <textarea
                  className="glass-input w-full px-4 py-2 outline-none"
                  value={recruitForm.requirements}
                  onChange={(e) => setRecruitForm(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="请输入详细的招募要求"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">📞 联系方式</label>
                <input
                  type="text"
                  className="glass-input w-full px-4 py-2 outline-none"
                  value={recruitForm.contact}
                  onChange={(e) => setRecruitForm(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="请输入联系方式（QQ、微信等）"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="glass-button px-6 py-2 text-white font-medium flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '提交中...' : editingRecruit ? '更新招募' : '发布招募'}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 rounded-2xl bg-white/50 text-gray-700 hover:bg-white/80 transition-all font-medium"
                  onClick={() => {
                    setShowRecruitForm(false)
                    setEditingRecruit(null)
                  }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
            {error}
          </div>
        )}



        {/* 招募信息列表 */}
        <div className="space-y-4">
          {recruits.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-gray-600 text-lg">暂无招募信息</p>
              <p className="text-gray-400 text-sm mt-2">点击上方按钮发布招募信息</p>
            </div>
          ) : (
            recruits.map((recruit, index) => (
              <div key={recruit.id} className="glass-card p-6 hover:scale-[1.02] transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{recruit.team?.name || '未知战队'}</h3>
                    {recruit.team?.region && (
                      <span className="text-xs text-pink-500 mt-1 inline-block px-2 py-1 bg-pink-100 rounded-full">
                        {recruit.team.region}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {new Date(recruit.created_at).toLocaleDateString()}
                    </span>
                    {canManageRecruit(recruit) && (
                      <div className="flex items-center gap-2">
                        <button
                          className="text-sm text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          onClick={() => handleEditRecruit(recruit)}
                        >
                          编辑
                        </button>
                        <button
                          className="text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          onClick={() => handleDeleteRecruit(recruit.id)}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
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

                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                  <span className="text-pink-400">📞</span>
                  <span>联系方式：{recruit.contact}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}