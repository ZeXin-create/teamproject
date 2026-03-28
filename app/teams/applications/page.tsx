'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '../../components/Navbar'

interface Application {
  id: string
  user_id: string
  team_id: string
  status: string
  created_at: string
  user?: {
    email: string
    user_metadata?: {
      avatar?: string
    }
  }
}

export default function ApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const getTeamApplications = useCallback(async () => {
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
      if (teamMember.role !== '队长' && teamMember.role !== '副队长') {
        setError('您没有权限查看申请')
        setLoading(false)
        return
      }
      
      setTeamId(teamMember.team_id)
      
      // 获取战队申请
      const { data, error } = await supabase
        .from('team_applications')
        .select('id, user_id, team_id, status, created_at, user_id')
        .eq('team_id', teamMember.team_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      // 获取用户信息
      if (data && data.length > 0) {
        const processedApplications: Application[] = []
        
        for (const item of data) {
          const app: Application = {
            id: item.id,
            user_id: item.user_id,
            team_id: item.team_id,
            status: item.status,
            created_at: item.created_at
          }
          
          const { data: userData } = await supabase
            .from('auth.users')
            .select('email, user_metadata')
            .eq('id', app.user_id)
            .single()
          
          if (userData) {
            app.user = userData
          }
          
          processedApplications.push(app)
        }
        
        setApplications(processedApplications)
      } else {
        setApplications([])
      }
      
      if (error) {
        throw error
      }
    } catch (err: unknown) {
      console.error('获取战队申请失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取战队申请失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [user])
  
  useEffect(() => {
    if (user) {
      getTeamApplications()
    } else {
      setLoading(false)
    }
  }, [user, getTeamApplications])
  
  const handleApprove = async (applicationId: string, userId: string) => {
    try {
      // 开始事务
      const { error: updateError } = await supabase
        .from('team_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId)
      
      if (updateError) {
        throw updateError
      }
      
      // 添加用户到战队
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: teamId,
          role: '队员'
        })
      
      if (insertError) {
        throw insertError
      }
      
      setApplications(applications.filter(app => app.id !== applicationId))
      setSuccess('批准申请成功')
    } catch (err: unknown) {
      console.error('批准申请失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '批准申请失败，请稍后重试')
    }
  }
  
  const handleReject = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('team_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)
      
      if (error) {
        throw error
      }
      
      setApplications(applications.filter(app => app.id !== applicationId))
      setSuccess('拒绝申请成功')
    } catch (err: unknown) {
      console.error('拒绝申请失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '拒绝申请失败，请稍后重试')
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <button 
            className="mr-4 text-pink-500 hover:text-pink-600 glass-button px-4 py-2 rounded-lg"
            onClick={() => router.back()}
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-800">战队申请管理</h1>
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
        
        <div className="glass-card p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">待审批申请</h2>
          
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">暂无待审批的申请</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border border-gray-300 rounded-lg p-4 glass-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-pink-500">
                      <Image 
                        src={app.user?.user_metadata?.avatar || 'https://via.placeholder.com/40'} 
                        alt={app.user?.email || '用户'}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{app.user?.email}</h3>
                      <p className="text-sm text-gray-600">申请时间：{new Date(app.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-colors"
                      onClick={() => handleReject(app.id)}
                    >
                      拒绝
                    </button>
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-colors"
                      onClick={() => handleApprove(app.id, app.user_id)}
                    >
                      批准
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}