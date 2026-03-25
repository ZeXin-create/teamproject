'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

interface Announcement {
  id: string
  team_id: string
  title: string
  content: string
  created_at: string
  user_id: string
  user?: {
    email: string
  }
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [is队长, setIs队长] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  useEffect(() => {
    if (user) {
      getTeamAnnouncements()
    } else {
      setLoading(false)
    }
  }, [user])
  
  const getTeamAnnouncements = async () => {
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
      
      // 获取战队公告
      const { data, error } = await supabase
        .from('team_announcements')
        .select('id, team_id, title, content, created_at, user_id')
        .eq('team_id', teamMember.team_id)
        .order('created_at', { ascending: false })
      
      // 获取用户信息
      if (data && data.length > 0) {
        for (const announcement of data) {
          const { data: userData } = await supabase
            .from('auth.users')
            .select('email')
            .eq('id', announcement.user_id)
            .single()
          
          if (userData) {
            announcement.user = userData
          }
        }
      }
      
      if (error) {
        throw error
      }
      
      setAnnouncements(data)
    } catch (err: any) {
      console.error('获取战队公告失败:', err)
      setError(err.message || '获取战队公告失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!title || !content) {
      setError('请填写标题和内容')
      return
    }
    
    try {
      const { error } = await supabase
        .from('team_announcements')
        .insert({
          team_id: teamId,
          title,
          content,
          user_id: user?.id
        })
      
      if (error) {
        throw error
      }
      
      setTitle('')
      setContent('')
      setShowModal(false)
      setSuccess('公告发布成功！')
      getTeamAnnouncements()
    } catch (err: any) {
      console.error('发布公告失败:', err)
      setError(err.message || '发布公告失败，请稍后重试')
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
          <h1 className="text-2xl font-bold">战队公告</h1>
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
        
        {is队长 && (
          <div className="mb-6">
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setShowModal(true)}
            >
              发布公告
            </button>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">公告列表</h2>
          
          {announcements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">暂无公告</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(announcement.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{announcement.content}</p>
                  <p className="text-sm text-gray-500">
                    发布者：{announcement.user?.email}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 发布公告模态框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">发布公告</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowModal(false)}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="title" className="block text-gray-700 mb-2">
                    标题 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="content" className="block text-gray-700 mb-2">
                    内容 *
                  </label>
                  <textarea
                    id="content"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
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
                    发布
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