'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

interface Member {
  id: string
  user_id: string
  team_id: string
  role: string
  status: string
  joined_at: string
  user?: {
    email: string
    user_metadata?: {
      nickname?: string
      avatar?: string
    }
  }
}

interface Group {
  id: number
  name: string
  members: Member[]
}

export default function TeamSpacePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [hasTeam, setHasTeam] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState('')
  const [timeRange, setTimeRange] = useState('')
  const [heroPower, setHeroPower] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [showGroupResult, setShowGroupResult] = useState(false)
  
  useEffect(() => {
    if (user) {
      checkUserTeam()
    } else {
      setLoading(false)
    }
  }, [user])
  
  const checkUserTeam = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()
      
      if (error) {
        console.error('查询战队失败:', error)
        setHasTeam(false)
      } else if (data) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', data.team_id)
          .single()
        
        if (teamError) {
          console.error('查询战队详情失败:', teamError)
          setHasTeam(false)
        } else {
          setTeam(teamData)
          setHasTeam(true)
          await getTeamMembers(data.team_id)
        }
      } else {
        setHasTeam(false)
      }
    } catch (error) {
      console.error('检查战队失败:', error)
      setHasTeam(false)
    } finally {
      setLoading(false)
    }
  }
  
  const getTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, user_id, team_id, role, status, joined_at')
        .eq('team_id', teamId)
        .eq('status', 'active')
      
      if (error) {
        throw error
      }
      
      if (data && data.length > 0) {
        for (const member of data) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', member.user_id)
              .maybeSingle()
            
            if (profileError) {
              member.user = {
                email: member.user_id,
                user_metadata: {
                  nickname: '未知用户',
                  avatar: ''
                }
              }
            } else if (profileData) {
              member.user = {
                email: profileData.email || member.user_id,
                user_metadata: {
                  nickname: profileData.nickname || profileData.email?.split('@')[0] || '未知用户',
                  avatar: profileData.avatar || ''
                }
              }
            } else {
              member.user = {
                email: member.user_id,
                user_metadata: {
                  nickname: '未知用户',
                  avatar: ''
                }
              }
            }
          } catch (profileError) {
            member.user = {
              email: member.user_id,
              user_metadata: {
                nickname: '未知用户',
                avatar: ''
              }
            }
          }
        }
      }
      
      setMembers(data)
    } catch (err: any) {
      console.error('获取战队成员失败:', err)
    }
  }
  
  const handleGroupMatch = () => {
    const filteredMembers = members.filter(member => {
      return true
    })
    
    const groups: Group[] = []
    const groupSize = 5
    const availableMembers = [...filteredMembers]
    
    while (availableMembers.length > 0) {
      const groupMembers: Member[] = []
      const positions = ['上单', '打野', '中单', '射手', '辅助']
      
      for (const pos of positions) {
        if (availableMembers.length === 0) break
        const randomIndex = Math.floor(Math.random() * availableMembers.length)
        const member = availableMembers[randomIndex]
        groupMembers.push(member)
        availableMembers.splice(randomIndex, 1)
      }
      
      while (groupMembers.length < groupSize && availableMembers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableMembers.length)
        const member = availableMembers[randomIndex]
        groupMembers.push(member)
        availableMembers.splice(randomIndex, 1)
      }
      
      if (groupMembers.length > 0) {
        groups.push({
          id: groups.length + 1,
          name: `第${groups.length + 1}小组`,
          members: groupMembers
        })
      }
    }
    
    setGroups(groups)
    setShowGroupForm(false)
    setShowGroupResult(true)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <div className="animate-pulse text-pink-500 text-xl">✨ 加载中...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* 返回按钮 */}
        <div className="flex items-center mb-8">
          <button 
            className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2"
            onClick={() => router.back()}
          >
            <span>←</span> 返回
          </button>
        </div>
        
        {hasTeam && team ? (
          <div className="space-y-8">
            {/* 战队信息卡片 */}
            <div className="glass-card p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  {team.avatar_url ? (
                    <img 
                      src={team.avatar_url} 
                      alt="战队图标"
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white/50 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-3xl font-bold gradient-text mb-2">{team.name}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <span className="px-4 py-1 bg-pink-100 text-pink-600 rounded-full text-sm font-medium">
                      🎮 {team.region}
                    </span>
                    <span className="px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      👥 {members.length} 名成员
                    </span>
                    <span className="px-4 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                      📍 {team.city}
                    </span>
                  </div>
                  {team.declaration && (
                    <p className="text-gray-600 mt-3 italic">"{team.declaration}"</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* 功能导航 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/teams/edit" 
                className="glass-card p-6 text-center hover:scale-105 transition-transform group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✏️</div>
                <h3 className="font-bold text-gray-800">编辑信息</h3>
                <p className="text-sm text-gray-500 mt-1">修改战队资料</p>
              </Link>
              <Link href="/teams/applications" 
                className="glass-card p-6 text-center hover:scale-105 transition-transform group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📋</div>
                <h3 className="font-bold text-gray-800">申请管理</h3>
                <p className="text-sm text-gray-500 mt-1">审核入队申请</p>
              </Link>
              <Link href="/teams/announcements" 
                className="glass-card p-6 text-center hover:scale-105 transition-transform group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📢</div>
                <h3 className="font-bold text-gray-800">战队公告</h3>
                <p className="text-sm text-gray-500 mt-1">发布重要通知</p>
              </Link>
              <Link href="/teams/matches" 
                className="glass-card p-6 text-center hover:scale-105 transition-transform group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏆</div>
                <h3 className="font-bold text-gray-800">战队赛记录</h3>
                <p className="text-sm text-gray-500 mt-1">查看比赛历史</p>
              </Link>
            </div>

            {/* 智能分组按钮 */}
            <div className="text-center">
              <button 
                className="glass-button px-8 py-4 text-white font-bold text-lg flex items-center gap-3 mx-auto"
                onClick={() => setShowGroupForm(true)}
              >
                <span className="text-2xl">🎯</span> 智能战队赛分组
              </button>
            </div>
            
            {/* 战队成员 */}
            <div className="glass-card p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold gradient-text flex items-center gap-2">
                  <span>👥</span> 战队成员
                </h3>
                <Link href="/teams/manage" 
                  className="glass-button px-6 py-2 text-white text-sm font-medium">
                  ⚙️ 管理成员
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div key={member.id} className="glass-card p-4 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-4">
                      {member.user?.user_metadata?.avatar ? (
                        <img 
                          src={member.user.user_metadata.avatar} 
                          alt={member.user?.email || '用户'}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white/50"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${member.user?.user_metadata?.avatar ? 'hidden' : ''}`}
                        style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}>
                        {(member.user?.user_metadata?.nickname || member.user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{member.user?.user_metadata?.nickname || member.user?.email?.split('@')[0] || member.user?.email}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            member.role === '队长' ? 'bg-yellow-100 text-yellow-600' :
                            member.role === '副队长' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        加入时间：{new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-6">🎮</div>
            <h2 className="text-2xl font-bold gradient-text mb-4">您还没有加入任何战队</h2>
            <p className="text-gray-600 mb-8 text-lg">加入或创建一个战队，开始您的战队之旅</p>
            <div className="flex justify-center gap-6">
              <Link href="/teams/new" 
                className="glass-button px-8 py-3 text-white font-medium">
                ✨ 创建战队
              </Link>
              <Link href="/teams/join" 
                className="px-8 py-3 rounded-2xl bg-white/50 text-gray-700 hover:bg-white/80 transition-all font-medium">
                🔍 加入战队
              </Link>
            </div>
          </div>
        )}
        
        {/* 分组表单模态框 */}
        {showGroupForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold gradient-text">🎯 智能战队赛分组</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setShowGroupForm(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">🎮 位置</label>
                  <select 
                    className="glass-input w-full px-4 py-3"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    <option value="">全部位置</option>
                    <option value="上单">上单</option>
                    <option value="打野">打野</option>
                    <option value="中单">中单</option>
                    <option value="射手">射手</option>
                    <option value="辅助">辅助</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">⏰ 时间区间</label>
                  <select 
                    className="glass-input w-full px-4 py-3"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <option value="">全部时间</option>
                    <option value="周五 12:00-24:00">周五 12:00-24:00</option>
                    <option value="周六 12:00-24:00">周六 12:00-24:00</option>
                    <option value="周日 12:00-24:00">周日 12:00-24:00</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">⚡ 英雄战力</label>
                  <input 
                    type="number" 
                    className="glass-input w-full px-4 py-3"
                    placeholder="最低战力要求"
                    value={heroPower}
                    onChange={(e) => setHeroPower(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <button 
                  className="px-6 py-3 rounded-2xl text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all"
                  onClick={() => setShowGroupForm(false)}
                >
                  取消
                </button>
                <button 
                  className="glass-button px-8 py-3 text-white font-medium"
                  onClick={handleGroupMatch}
                >
                  🚀 开始匹配分组
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 分组结果模态框 */}
        {showGroupResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold gradient-text">🎉 分组结果</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setShowGroupResult(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {groups.map((group) => (
                  <div key={group.id} className="glass-card p-6">
                    <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 text-white flex items-center justify-center text-sm">
                        {group.id}
                      </span>
                      {group.name}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {group.members.map((member, index) => (
                        <div key={member.id} className="text-center">
                          <div className="relative mb-2">
                            {member.user?.user_metadata?.avatar ? (
                              <img 
                                src={member.user.user_metadata.avatar} 
                                alt={member.user?.email || '用户'}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white/50 mx-auto"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto ${member.user?.user_metadata?.avatar ? 'hidden' : ''}`}
                              style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}>
                              {(member.user?.user_metadata?.nickname || member.user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 text-white text-xs flex items-center justify-center">
                              {['上', '野', '中', '射', '辅'][index] || '?'}
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {member.user?.user_metadata?.nickname || member.user?.email?.split('@')[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-right">
                <button 
                  className="glass-button px-8 py-3 text-white font-medium"
                  onClick={() => setShowGroupResult(false)}
                >
                  ✨ 确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
