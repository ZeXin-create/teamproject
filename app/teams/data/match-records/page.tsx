'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { TeamDataService, MatchRecord } from '../../../services/teamDataService'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import PageLayout from '../../../components/layout/PageLayout'

// 定义权限常量
const MATCH_RECORD_PERMISSIONS = ['captain', '队长', 'vice_captain', '副队', 'leader', '领队', 'group_leader', '组长']

export default function MatchRecordsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [teamId, setTeamId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([])
  const [newRecord, setNewRecord] = useState<MatchRecord>({
    team_id: '',
    match_date: new Date().toISOString().split('T')[0],
    opponent: '',
    result: '胜利',
    score: '',
    analysis: ''
  })
  const [editingRecord, setEditingRecord] = useState<MatchRecord | null>(null)
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
        setNewRecord(prev => ({ ...prev, team_id: data.team_id }))
        fetchMatchRecords(data.team_id)
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

  const fetchMatchRecords = async (teamId: string) => {
    try {
      const records = await TeamDataService.getMatchRecords(teamId)
      setMatchRecords(records)
    } catch (err) {
      console.error('获取比赛记录失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await TeamDataService.createMatchRecord(newRecord)
      setSuccess('创建成功')
      setNewRecord({
        team_id: teamId,
        match_date: new Date().toISOString().split('T')[0],
        opponent: '',
        result: '胜利',
        score: '',
        analysis: ''
      })
      fetchMatchRecords(teamId)
    } catch (err) {
      setError('创建失败，请重试')
      console.error('创建比赛记录失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await TeamDataService.updateMatchRecord(editingRecord.id || '', editingRecord)
      setSuccess('更新成功')
      setEditingRecord(null)
      fetchMatchRecords(teamId)
    } catch (err) {
      setError('更新失败，请重试')
      console.error('更新比赛记录失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return
    if (!id) {
      setError('记录ID不存在')
      return
    }

    try {
      await TeamDataService.deleteMatchRecord(id)
      setSuccess('删除成功')
      fetchMatchRecords(teamId)
    } catch (err) {
      setError('删除失败，请重试')
      console.error('删除比赛记录失败:', err)
    }
  }

  // 检查用户是否有管理比赛记录的权限
  const hasMatchRecordPermission = () => {
    return MATCH_RECORD_PERMISSIONS.includes(userRole)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <PageLayout>
          <div className="container mx-auto px-4 pb-8">
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">加载中...</p>
              </div>
            </div>
          </div>
        </PageLayout>
      </div>
    )
  }

  // 计算比赛统计数据
  const getMatchStats = () => {
    const total = matchRecords.length
    const wins = matchRecords.filter(r => r.result === '胜利').length
    const losses = matchRecords.filter(r => r.result === '失败').length
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
    
    return { total, wins, losses, winRate }
  }

  const stats = getMatchStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-pink-50/30">
      <Navbar />
      <PageLayout>
        <div className="container mx-auto px-4 pb-8">
          {/* 装饰性背景元素 */}
          <div className="fixed top-32 -left-20 w-60 h-60 bg-pink-200/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="fixed bottom-20 -right-20 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative">
            {/* 页面头部 */}
            <div className="flex items-center justify-between mb-8">
              <button
                className="btn-secondary px-4 py-2 flex items-center gap-2"
                onClick={() => router.push('/teams/space')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回战队管理后台
              </button>
              <h1 className="text-3xl font-bold gradient-text">🎮 比赛记录管理</h1>
              <div className="w-48"></div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card card-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-lg">📊</span>
                  </div>
                  <span className="text-gray-500 font-medium">总场次</span>
                </div>
                <div className="text-4xl font-bold gradient-text">{stats.total}</div>
              </div>
              
              <div className="card card-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-lg">🏆</span>
                  </div>
                  <span className="text-gray-500 font-medium">胜场</span>
                </div>
                <div className="text-4xl font-bold text-green-600">{stats.wins}</div>
              </div>
              
              <div className="card card-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-lg">💔</span>
                  </div>
                  <span className="text-gray-500 font-medium">负场</span>
                </div>
                <div className="text-4xl font-bold text-red-600">{stats.losses}</div>
              </div>
              
              <div className="card card-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-lg">📈</span>
                  </div>
                  <span className="text-gray-500 font-medium">胜率</span>
                </div>
                <div className="text-4xl font-bold text-purple-600">{stats.winRate}%</div>
              </div>
            </div>

            <div className="card p-8">
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

              {/* 创建新记录 */}
              {hasMatchRecordPermission() ? (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center">
                      <span className="text-white">➕</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">添加比赛记录</h2>
                  </div>
                  <form onSubmit={editingRecord ? handleUpdateRecord : handleCreateRecord} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">📅 比赛日期</label>
                        <input
                          type="date"
                          value={(editingRecord || newRecord).match_date}
                          onChange={(e) => editingRecord ? 
                            setEditingRecord({ ...editingRecord, match_date: e.target.value }) : 
                            setNewRecord({ ...newRecord, match_date: e.target.value })
                          }
                          className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">⚔️ 对手</label>
                        <input
                          type="text"
                          value={(editingRecord || newRecord).opponent}
                          onChange={(e) => editingRecord ? 
                            setEditingRecord({ ...editingRecord, opponent: e.target.value }) : 
                            setNewRecord({ ...newRecord, opponent: e.target.value })
                          }
                          className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                          placeholder="输入对手名称"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">🏅 结果</label>
                        <select
                          value={(editingRecord || newRecord).result}
                          onChange={(e) => editingRecord ? 
                            setEditingRecord({ ...editingRecord, result: e.target.value }) : 
                            setNewRecord({ ...newRecord, result: e.target.value })
                          }
                          className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                        >
                          <option value="胜利">🏆 胜利</option>
                          <option value="失败">💔 失败</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">📝 比分</label>
                        <input
                          type="text"
                          value={(editingRecord || newRecord).score || ''}
                          onChange={(e) => editingRecord ? 
                            setEditingRecord({ ...editingRecord, score: e.target.value }) : 
                            setNewRecord({ ...newRecord, score: e.target.value })
                          }
                          className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                          placeholder="例如：2-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">💭 分析</label>
                      <textarea
                        value={(editingRecord || newRecord).analysis || ''}
                        onChange={(e) => editingRecord ? 
                          setEditingRecord({ ...editingRecord, analysis: e.target.value }) : 
                          setNewRecord({ ...newRecord, analysis: e.target.value })
                        }
                        className="w-full px-5 py-3 bg-white/70 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                        rows={4}
                        placeholder="输入比赛分析..."
                      />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      {editingRecord && (
                        <button
                          type="button"
                          onClick={() => setEditingRecord(null)}
                          className="btn-secondary px-8 py-3"
                        >
                          取消
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? '保存中...' : (editingRecord ? '✨ 更新' : '✅ 添加')}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="mb-10 p-6 bg-gray-100/80 backdrop-blur-sm text-gray-600 rounded-2xl border border-gray-200">
                  <p className="flex items-center gap-2">
                    <span>🔒</span> 您没有权限添加比赛记录
                  </p>
                </div>
              )}

              {/* 比赛记录列表 */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                    <span className="text-white">📋</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">比赛记录列表</h2>
                </div>
                
                {matchRecords.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-7xl mb-6">🎮</div>
                    <p className="text-xl text-gray-500 mb-2">暂无比赛记录</p>
                    <p className="text-gray-400">开始记录你们的第一场比赛吧！</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchRecords.map((record) => (
                      <div key={record.id} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                              record.result === '胜利' 
                                ? 'bg-gradient-to-br from-green-400 to-green-600' 
                                : 'bg-gradient-to-br from-red-400 to-red-600'
                            }`}>
                              {record.result === '胜利' ? '🏆' : '💔'}
                            </div>
                            <div>
                              <div className="text-xl font-bold text-gray-800">{record.opponent}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                <span>📅</span>
                                {record.match_date}
                              </div>
                            </div>
                          </div>
                          <div className={`px-5 py-2 rounded-full text-sm font-bold ${
                            record.result === '胜利' 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {record.result}
                          </div>
                        </div>
                        
                        {record.score && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-semibold">📝 比分:</span>
                              <span className="font-bold">{record.score}</span>
                            </div>
                          </div>
                        )}
                        
                        {record.analysis && (
                          <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                            <div className="flex items-start gap-2">
                              <span className="text-pink-500 mt-1">💭</span>
                              <p className="text-gray-700 leading-relaxed">{record.analysis}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                          {hasMatchRecordPermission() && (
                            <>
                              <button
                                onClick={() => setEditingRecord(record)}
                                className="btn-primary px-5 py-2 text-sm font-medium"
                              >
                                ✏️ 编辑
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id || '')}
                                className="btn-secondary px-5 py-2 text-sm font-medium text-red-600 border border-red-200"
                              >
                                🗑️ 删除
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
      </PageLayout>
    </div>
  )
}