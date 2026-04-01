'use client'

import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'

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

export default function JoinTeamPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { user } = useAuth()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    setError('')

    try {
      let query = supabase
        .from('teams')
        .select('*')
        .ilike('name', `%${searchQuery}%`)

      if (selectedRegion) {
        query = query.eq('region', selectedRegion)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      setTeams(data)
    } catch (err: unknown) {
      console.error('搜索战队失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '搜索战队失败，请稍后重试')
    } finally {
      setIsSearching(false)
    }
  }

  const handleJoin = async (teamId: string) => {
    if (!user) {
      setError('请先登录')
      return
    }

    try {
      // 检查是否已经在战队中
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (existingMember && existingMember.length > 0) {
        // 检查是否是队长
        const isCaptain = existingMember.some(member => member.role === '队长')
        if (isCaptain) {
          setError('您是一个战队的队长，不能加入其他战队')
        } else {
          setError('您已经加入了一个战队')
        }
        return
      }

      // 检查是否已经申请过
      const { data: existingApplication } = await supabase
        .from('team_applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .single()

      if (existingApplication) {
        setError('您已经申请过这个战队')
        return
      }

      // 提交申请
      await supabase
        .from('team_applications')
        .insert({
          user_id: user.id,
          team_id: teamId
        })

      setSuccess('申请加入战队成功！等待队长审批')
    } catch (err: unknown) {
      console.error('申请加入战队失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '申请加入战队失败，请稍后重试')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">加入战队</h1>

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

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border border-gray-300 rounded"
              placeholder="搜索战队名称"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="px-4 py-2 border border-gray-300 rounded"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="">所有大区</option>
              <option value="安卓QQ">安卓QQ</option>
              <option value="安卓微信">安卓微信</option>
              <option value="iOS QQ">iOS QQ</option>
              <option value="iOS 微信">iOS 微信</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={isSearching}
            >
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden">
                  <Image
                    src={team.avatar_url || 'https://via.placeholder.com/100'}
                    alt={team.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{team.name}</h3>
                  <p className="text-gray-600">{team.region}</p>
                  <p className="text-gray-600">{team.province} {team.city} {team.district || ''}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{team.declaration || '暂无宣言'}</p>
              <button
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                onClick={() => handleJoin(team.id)}
              >
                申请加入
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}