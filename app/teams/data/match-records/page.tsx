'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { TeamDataService, MatchRecord } from '../../../services/teamDataService'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'

// 定义权限常量
const MATCH_RECORD_PERMISSIONS = ['队长', '副队', '领队', '组长']

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
            <h1 className="text-2xl font-bold gradient-text">比赛记录管理</h1>
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

          {/* 创建新记录 */}
          {hasMatchRecordPermission() ? (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">添加比赛记录</h2>
              <form onSubmit={editingRecord ? handleUpdateRecord : handleCreateRecord} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">比赛日期</label>
                    <input
                      type="date"
                      value={(editingRecord || newRecord).match_date}
                      onChange={(e) => editingRecord ? 
                        setEditingRecord({ ...editingRecord, match_date: e.target.value }) : 
                        setNewRecord({ ...newRecord, match_date: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">对手</label>
                    <input
                      type="text"
                      value={(editingRecord || newRecord).opponent}
                      onChange={(e) => editingRecord ? 
                        setEditingRecord({ ...editingRecord, opponent: e.target.value }) : 
                        setNewRecord({ ...newRecord, opponent: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="输入对手名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">结果</label>
                    <select
                      value={(editingRecord || newRecord).result}
                      onChange={(e) => editingRecord ? 
                        setEditingRecord({ ...editingRecord, result: e.target.value }) : 
                        setNewRecord({ ...newRecord, result: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="胜利">胜利</option>
                      <option value="失败">失败</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">比分</label>
                    <input
                      type="text"
                      value={(editingRecord || newRecord).score || ''}
                      onChange={(e) => editingRecord ? 
                        setEditingRecord({ ...editingRecord, score: e.target.value }) : 
                        setNewRecord({ ...newRecord, score: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如：2-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分析</label>
                  <textarea
                    value={(editingRecord || newRecord).analysis || ''}
                    onChange={(e) => editingRecord ? 
                      setEditingRecord({ ...editingRecord, analysis: e.target.value }) : 
                      setNewRecord({ ...newRecord, analysis: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="输入比赛分析"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  {editingRecord && (
                    <button
                      type="button"
                      onClick={() => setEditingRecord(null)}
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
                    {saving ? '保存中...' : (editingRecord ? '更新' : '添加')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mb-8 p-4 bg-gray-100 text-gray-600 rounded-lg">
              <p>您没有权限添加比赛记录</p>
            </div>
          )}

          {/* 比赛记录列表 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">比赛记录列表</h2>
            {matchRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无比赛记录
              </div>
            ) : (
              <div className="space-y-4">
                {matchRecords.map((record) => (
                  <div key={record.id} className="glass-card p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{record.opponent}</div>
                        <div className="text-sm text-gray-600">{record.match_date}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        record.result === '胜利' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.result}
                      </div>
                    </div>
                    {record.score && (
                      <div className="mt-2 text-sm text-gray-600">比分: {record.score}</div>
                    )}
                    {record.analysis && (
                      <div className="mt-2 text-sm">{record.analysis}</div>
                    )}
                    <div className="mt-4 flex justify-end space-x-2">
                      {hasMatchRecordPermission() && (
                        <>
                          <button
                            onClick={() => setEditingRecord(record)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id || '')}
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