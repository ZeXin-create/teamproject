'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

interface Match {
  id: string
  team_id: string
  opponent: string
  result: string
  score: string
  match_time: string
  notes?: string
}

export default function MatchesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [is队长, setIs队长] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [opponent, setOpponent] = useState('')
  const [result, setResult] = useState('')
  const [score, setScore] = useState('')
  const [matchTime, setMatchTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 统计数据
  const [winCount, setWinCount] = useState(0)
  const [lossCount, setLossCount] = useState(0)
  const [winRate, setWinRate] = useState(0)
  
  useEffect(() => {
    if (user) {
      getTeamMatches()
    } else {
      setLoading(false)
    }
  }, [user])
  
  const getTeamMatches = async () => {
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
      
      setTeamId(teamMember.team_id)
      setIs队长(teamMember.role === '队长' || teamMember.role === '副队长')
      
      // 获取战队比赛记录
      const { data, error } = await supabase
        .from('team_matches')
        .select('*')
        .eq('team_id', teamMember.team_id)
        .order('match_time', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setMatches(data)
      
      // 计算统计数据
      const wins = data.filter(match => match.result === 'win').length
      const losses = data.filter(match => match.result === 'loss').length
      const total = data.length
      const rate = total > 0 ? Math.round((wins / total) * 100) : 0
      
      setWinCount(wins)
      setLossCount(losses)
      setWinRate(rate)
    } catch (err: any) {
      console.error('获取战队比赛记录失败:', err)
      setError(err.message || '获取战队比赛记录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!opponent || !result || !score || !matchTime) {
      setError('请填写所有必填字段')
      return
    }
    
    try {
      const { error } = await supabase
        .from('team_matches')
        .insert({
          team_id: teamId,
          opponent,
          result,
          score,
          match_time: matchTime,
          notes
        })
      
      if (error) {
        throw error
      }
      
      setOpponent('')
      setResult('')
      setScore('')
      setMatchTime('')
      setNotes('')
      setShowModal(false)
      setSuccess('比赛记录添加成功！')
      getTeamMatches()
    } catch (err: any) {
      console.error('添加比赛记录失败:', err)
      setError(err.message || '添加比赛记录失败，请稍后重试')
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
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <button 
            className="mr-4 text-blue-600 hover:text-blue-800"
            onClick={() => router.back()}
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold">战队赛记录</h1>
        </div>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}
        
        {/* 统计数据 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-semibold mb-2">总胜场</h3>
            <p className="text-2xl font-bold text-green-600">{winCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-semibold mb-2">总负场</h3>
            <p className="text-2xl font-bold text-red-600">{lossCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-semibold mb-2">胜率</h3>
            <p className="text-2xl font-bold text-blue-600">{winRate}%</p>
          </div>
        </div>
        
        {is队长 && (
          <div className="mb-6">
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setShowModal(true)}
            >
              添加比赛记录
            </button>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">比赛记录</h2>
          
          {matches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">暂无比赛记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">对阵：{match.opponent}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${match.result === 'win' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {match.result === 'win' ? '胜利' : '失败'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-gray-600">比分：{match.score}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">比赛时间：{new Date(match.match_time).toLocaleString()}</p>
                    </div>
                  </div>
                  {match.notes && (
                    <p className="text-gray-600">备注：{match.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 添加比赛记录模态框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">添加比赛记录</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowModal(false)}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="opponent" className="block text-gray-700 mb-2">
                    对手 *
                  </label>
                  <input
                    type="text"
                    id="opponent"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="result" className="block text-gray-700 mb-2">
                    结果 *
                  </label>
                  <select
                    id="result"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    required
                  >
                    <option value="">请选择结果</option>
                    <option value="win">胜利</option>
                    <option value="loss">失败</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="score" className="block text-gray-700 mb-2">
                    比分 *
                  </label>
                  <input
                    type="text"
                    id="score"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    placeholder="例如：2-0"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="matchTime" className="block text-gray-700 mb-2">
                    比赛时间 *
                  </label>
                  <input
                    type="datetime-local"
                    id="matchTime"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="notes" className="block text-gray-700 mb-2">
                    备注
                  </label>
                  <textarea
                    id="notes"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    onClick={() => setShowModal(false)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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