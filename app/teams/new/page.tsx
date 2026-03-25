'use client'

import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState('')
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [declaration, setDeclaration] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { user } = useAuth()
  const router = useRouter()
  
  const regions = [
    'iOS QQ',
    '安卓QQ',
    '微信iOS',
    '微信安卓'
  ]
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    
    if (!teamName || !region || !province || !city) {
      setError('请填写所有必填字段')
      setLoading(false)
      return
    }
    
    try {
      let avatarUrl: string | undefined
      
      // 上传战队图标
      if (avatar) {
        const { data, error: uploadError } = await supabase
          .storage
          .from('team-avatars')
          .upload(`${Date.now()}-${avatar.name}`, avatar)
        
        if (uploadError) {
          throw uploadError
        }
        
        // 获取图片 URL
        const { data: urlData } = supabase
          .storage
          .from('team-avatars')
          .getPublicUrl(data.path)
        
        avatarUrl = urlData.publicUrl
      }
      
      // 创建战队
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          region,
          province,
          city,
          district,
          declaration,
          avatar_url: avatarUrl
        })
        .select()
        .single()
      
      if (teamError) {
        throw teamError
      }
      
      // 将创建者添加为队长
      await supabase
        .from('team_members')
        .insert({
          user_id: user?.id,
          team_id: team.id,
          role: '队长'
        })
      
      setSuccess('战队创建成功！')
      setTimeout(() => {
        router.push('/teams/space')
      }, 1000)
    } catch (err: unknown) {
      console.error('创建战队失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '创建战队失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0])
    }
  }
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">创建战队</h1>
        
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
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label htmlFor="teamName" className="block text-gray-700 mb-2">
              战队名称 *
            </label>
            <input
              type="text"
              id="teamName"
              className="w-full px-4 py-2 border border-gray-300 rounded"
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
              className="w-full px-4 py-2 border border-gray-300 rounded"
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
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="province" className="block text-gray-700 mb-2">
                省份 *
              </label>
              <input
                type="text"
                id="province"
                className="w-full px-4 py-2 border border-gray-300 rounded"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-gray-700 mb-2">
                城市 *
              </label>
              <input
                type="text"
                id="city"
                className="w-full px-4 py-2 border border-gray-300 rounded"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="district" className="block text-gray-700 mb-2">
                区县
              </label>
              <input
                type="text"
                id="district"
                className="w-full px-4 py-2 border border-gray-300 rounded"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="declaration" className="block text-gray-700 mb-2">
              战队宣言
            </label>
            <textarea
              id="declaration"
              className="w-full px-4 py-2 border border-gray-300 rounded"
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
              className="w-full px-4 py-2 border border-gray-300 rounded"
              onChange={handleAvatarChange}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? '创建中...' : '创建战队'}
          </button>
        </form>
      </div>
    </div>
  )
}