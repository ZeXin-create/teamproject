'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'
import Navbar from '../../components/Navbar'

interface Team {
  id: string
  name: string
  region: string
  province: string
  city: string
  district?: string
  declaration?: string
  avatar_url?: string
}

export default function EditTeamPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [region, setRegion] = useState('')
  const [declaration, setDeclaration] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const regions = [
    'iOS QQ',
    '安卓QQ',
    '微信iOS',
    '微信安卓'
  ]
  
  const getTeamInfo = useCallback(async () => {
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
      
      // 检查是否是队长
      if (teamMember.role !== '队长') {
        setError('您没有权限编辑战队信息')
        setLoading(false)
        return
      }
      
      // 获取战队详情
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamMember.team_id)
        .single()
      
      if (teamError) {
        throw teamError
      }
      
      setTeam(teamData)
      setTeamName(teamData.name)
      setRegion(teamData.region)
      setDeclaration(teamData.declaration || '')
    } catch (err: unknown) {
      console.error('获取战队信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '获取战队信息失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [user])
  
  useEffect(() => {
    if (user) {
      getTeamInfo()
    } else {
      setLoading(false)
    }
  }, [user, getTeamInfo])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!teamName || !region) {
      setError('请填写所有必填字段')
      return
    }
    
    try {
      // 再次验证用户是否是队长
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user?.id)
        .eq('team_id', team?.id)
        .eq('status', 'active')
        .single()
      
      if (memberError || teamMember.role !== '队长') {
        throw new Error('您没有权限编辑战队信息')
      }
      
      let avatarUrl = team?.avatar_url
      
      // 上传战队图标
      if (avatar) {
        try {
          // 确保 team.id 存在
          if (!team?.id) {
            throw new Error('战队信息不完整')
          }
          
          // 生成安全的文件名
          const safeFileName = `${Date.now()}-${avatar.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          const filePath = `team_${team.id}/${safeFileName}`
          
          // 上传文件
          const { data, error: uploadError } = await supabase
            .storage
            .from('team-avatars')
            .upload(filePath, avatar, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (uploadError) {
            console.error('上传失败:', uploadError)
            throw new Error(`上传失败: ${uploadError.message}`)
          }
          
          // 获取图片 URL
          const { data: urlData } = supabase
            .storage
            .from('team-avatars')
            .getPublicUrl(data.path)
          
          avatarUrl = urlData.publicUrl
        } catch (uploadError: unknown) {
          console.error('上传图标失败:', uploadError)
          throw new Error(`上传图标失败: ${typeof uploadError === 'object' && uploadError !== null && 'message' in uploadError ? String(uploadError.message) : '未知错误'}`)
        }
      }
      
      // 更新战队信息
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamName,
          region,
          declaration,
          avatar_url: avatarUrl
        })
        .eq('id', team?.id)
      
      if (error) {
        throw error
      }
      
      setSuccess('战队信息更新成功！')
      setTimeout(() => {
        router.push('/teams/space')
      }, 1000)
    } catch (err: unknown) {
      console.error('更新战队信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '更新战队信息失败，请稍后重试')
    }
  }
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0])
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
          <h1 className="text-2xl font-bold text-gray-800">编辑战队信息</h1>
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
        
        {team && (
          <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl">
            <div className="mb-4">
              <label htmlFor="teamName" className="block text-gray-700 mb-2">
                战队名称 *
              </label>
              <input
                type="text"
                id="teamName"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="region" className="block text-gray-700 mb-2">
                大区 *
              </label>
              <select
                id="region"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                required
              >
                <option value="">请选择大区</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            

            
            <div className="mb-4">
              <label htmlFor="declaration" className="block text-gray-700 mb-2">
                战队宣言
              </label>
              <textarea
                id="declaration"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows={4}
                value={declaration}
                onChange={(e) => setDeclaration(e.target.value)}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="avatar" className="block text-gray-700 mb-2">
                战队图标
              </label>
              <input
                type="file"
                id="avatar"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                onChange={handleAvatarChange}
              />
              {team.avatar_url && (
                <div className="mt-2 relative w-16 h-16 rounded-full overflow-hidden border-2 border-pink-500">
                  <Image 
                    src={team.avatar_url} 
                    alt="当前战队图标"
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                type="button"
                className="px-4 py-2 glass-button hover:bg-white/20 rounded-lg"
                onClick={() => router.push('/teams/space')}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-colors"
              >
                保存修改
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}