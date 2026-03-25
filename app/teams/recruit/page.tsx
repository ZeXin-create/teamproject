'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Recruit {
  id: string
  team_id: string
  requirements: string
  contact: string
  created_at: string
  team?: {
    name: string
    region: string
  }
}

export default function RecruitPage() {
  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { user } = useAuth()
  
  useEffect(() => {
    getRecruits()
  }, [])
  
  const getRecruits = async () => {
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
          team:teams(
            name,
            region
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      // 处理 team 字段的类型问题
      const processedData: Recruit[] = (data || []).map(item => ({
        ...item,
        team: Array.isArray(item.team) ? item.team[0] : item.team
      }))
      
      setRecruits(processedData)
    } catch (err: unknown) {
      console.error('获取招募信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取招募信息失败，请稍后重试')
    } finally {
      setLoading(false)
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
        <h1 className="text-2xl font-bold mb-6">招募大厅</h1>
        
        {user && (
          <div className="mb-6">
            <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              发布招募信息
            </button>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {recruits.map((recruit) => (
            <div key={recruit.id} className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{recruit.team?.name || '未知战队'}</h3>
                <span className="text-gray-500 text-sm">{new Date(recruit.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-600 mb-2">大区：{recruit.team?.region || '未知'}</p>
              <p className="text-gray-600 mb-2">要求：{recruit.requirements}</p>
              <p className="text-gray-600">联系方式：{recruit.contact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}