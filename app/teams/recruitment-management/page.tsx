'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'

interface TeamRecruit {
  id: string
  team_id: string
  team: {
    id: string
    name: string
    avatar_url?: string
  }
  title: string
  position: string
  rank: string
  members_needed: number
  requirements: string
  contact: string
  status: string
  created_at: string
  created_by: string
}

export default function RecruitmentManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [recruits, setRecruits] = useState<TeamRecruit[]>([])
  const [selectedRecruit, setSelectedRecruit] = useState<TeamRecruit | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [teamId, setTeamId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  // 获取用户战队信息和角色
  const fetchUserTeam = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) {
        console.error('获取用户战队信息失败:', error)
      } else if (data && data.length > 0) {
        setTeamId(data[0].team_id)
        setUserRole(data[0].role || '')
      }
    } catch (error) {
      console.error('获取用户战队信息失败:', error)
    }
  }, [user])

  // 获取招募帖子列表
  const fetchRecruits = useCallback(async () => {
    if (!teamId) return

    try {
      const { data, error } = await supabase
        .from('team_recruits')
        .select(`
          id,
          team_id,
          title,
          position,
          rank,
          members_needed,
          requirements,
          contact,
          status,
          created_at,
          created_by
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('获取招募帖子失败:', error)
      } else {
        // 为每个招募帖子获取战队信息
        const formattedRecruits = await Promise.all((data || []).map(async (recruit: any) => {
          const { data: teamData } = await supabase
            .from('teams')
            .select('id, name, avatar_url')
            .eq('id', recruit.team_id)
            .single();

          return {
            ...recruit,
            team: teamData || { id: '', name: '', avatar_url: '' }
          };
        }));
        setRecruits(formattedRecruits);
        // 默认选中第一个
        if (formattedRecruits.length > 0 && !selectedRecruit) {
          setSelectedRecruit(formattedRecruits[0]);
        }
      }
    } catch (error) {
      console.error('获取招募帖子失败:', error)
    }
  }, [teamId, selectedRecruit])

  // 初始化数据
  useEffect(() => {
    if (user) {
      fetchUserTeam()
    }
  }, [user, fetchUserTeam])

  // 当战队ID变化时，获取招募帖子
  useEffect(() => {
    if (teamId) {
      setLoading(true)
      fetchRecruits().finally(() => setLoading(false))
    }
  }, [teamId, fetchRecruits])

  // 检查用户是否有管理权限（队长或副队）
  const hasManagementPermission = () => {
    return ['队长', '副队'].includes(userRole)
  }

  // 复制联系方式
  const copyContact = (contact: string) => {
    navigator.clipboard.writeText(contact)
      .then(() => {
        alert('联系方式已复制到剪贴板')
      })
      .catch(err => {
        console.error('复制失败:', err)
      })
  }

  // 骨架屏组件
  const SkeletonCard = () => (
    <div className="card p-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  )

  if (!user) {
    router.push('/auth/login')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 侧边栏 */}
            <div className="hidden lg:block">
              <div className="card p-6 w-64">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 mt-2 animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 主内容区 */}
            <div className="flex-1">
              {/* 搜索栏 */}
              <div className="card p-4 mb-6">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              {/* 左侧列表 */}
              <div className="w-full lg:w-96 mb-6 lg:mb-0">
                <div className="card p-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse mb-4"></div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 右侧详情 */}
              <div className="flex-1">
                <div className="card p-6">
                  <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse mb-6"></div>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!hasManagementPermission()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">权限不足</h1>
          <p className="mt-4 text-gray-600">只有队长和副队可以管理招募</p>
          <div className="mt-8">
            <button
              onClick={() => router.push('/teams/space')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回战队管理后台
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏 */}
          <div className="hidden lg:block">
            <div className="card p-6 w-64">
              <Sidebar type="team" teamId={teamId} userRole={userRole} />
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
            {/* 页面标题和搜索栏 */}
            <div className="card p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold gradient-text">招募管理</h1>
                  <p className="mt-2 text-gray-600">管理战队招募帖子</p>
                </div>
                <div className="flex gap-4">
                  <div className="relative">
                    <input
                      type="search"
                      placeholder="搜索招募信息..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                  </div>
                  <button
                    onClick={() => router.push('/teams/recruit')}
                    className="btn-primary px-4 py-2 text-white font-medium"
                  >
                    发布招募帖
                  </button>
                </div>
              </div>
            </div>

            {/* 主体布局 */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* 左侧列表 */}
              <div className="w-full lg:w-96">
                <div className="card p-4">
                  <h2 className="text-xl font-semibold mb-4">招募帖子</h2>
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2 space-y-4">
                    {recruits.length > 0 ? (
                      recruits.map((recruit) => (
                        <div
                          key={recruit.id}
                          className={`card p-4 cursor-pointer transition-all duration-300 ${selectedRecruit?.id === recruit.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'}`}
                          onClick={() => {
                            setSelectedRecruit(recruit)
                            setMobileDetailOpen(true)
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {recruit.team.avatar_url ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden">
                                  <img
                                    src={recruit.team.avatar_url}
                                    alt={recruit.team.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-500 text-white font-bold">
                                  {recruit.team.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold">{recruit.title || '无标题'}</h3>
                                <div className="flex gap-2 mt-1">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{recruit.position}</span>
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">{recruit.rank}</span>
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{recruit.members_needed}人</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  {new Date(recruit.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`px-2 py-1 rounded-full text-xs ${recruit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {recruit.status === 'active' ? '招募中' : '已结束'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        暂无招募信息
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 右侧详情 */}
              <div className="hidden lg:block flex-1">
                {selectedRecruit ? (
                  <div className="card p-6">
                    <h2 className="text-xl font-semibold mb-4">招募详情</h2>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {selectedRecruit.team.avatar_url ? (
                          <div className="w-16 h-16 rounded-full overflow-hidden">
                            <img
                              src={selectedRecruit.team.avatar_url}
                              alt={selectedRecruit.team.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary-500 text-white font-bold text-xl">
                            {selectedRecruit.team.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold">{selectedRecruit.title}</h3>
                          <p className="text-gray-600">{selectedRecruit.team.name}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">位置</p>
                          <p className="font-medium">{selectedRecruit.position}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">段位</p>
                          <p className="font-medium">{selectedRecruit.rank}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">需求人数</p>
                          <p className="font-medium">{selectedRecruit.members_needed}人</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">状态</p>
                          <p className={`font-medium ${selectedRecruit.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                            {selectedRecruit.status === 'active' ? '招募中' : '已结束'}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">联系方式</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{selectedRecruit.contact}</p>
                          <button
                            onClick={() => copyContact(selectedRecruit.contact)}
                            className="text-primary-500 hover:text-primary-600 transition-colors"
                          >
                            复制
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">要求</p>
                        <p className="font-medium">{selectedRecruit.requirements || '无特殊要求'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">发布时间</p>
                        <p className="font-medium">{new Date(selectedRecruit.created_at).toLocaleString()}</p>
                      </div>
                      
                      <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => router.push(`/teams/recruit?edit=${selectedRecruit.id}`)}
                          className="btn-primary px-4 py-2 text-white font-medium"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => {
                            // 切换招募状态
                            supabase
                              .from('team_recruits')
                              .update({ status: selectedRecruit.status === 'active' ? 'closed' : 'active' })
                              .eq('id', selectedRecruit.id)
                              .then(() => fetchRecruits())
                          }}
                          className="btn-secondary px-4 py-2 text-gray-700 font-medium"
                        >
                          {selectedRecruit.status === 'active' ? '结束招募' : '重新招募'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card p-12 text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-gray-500">请选择一个招募帖子查看详情</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端详情模态框 */}
      {mobileDetailOpen && selectedRecruit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center lg:hidden">
          <div className="bg-white rounded-t-xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">招募详情</h2>
                <button
                  onClick={() => setMobileDetailOpen(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selectedRecruit.team.avatar_url ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img
                        src={selectedRecruit.team.avatar_url}
                        alt={selectedRecruit.team.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary-500 text-white font-bold text-xl">
                      {selectedRecruit.team.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold">{selectedRecruit.title}</h3>
                    <p className="text-gray-600">{selectedRecruit.team.name}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">位置</p>
                    <p className="font-medium">{selectedRecruit.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">段位</p>
                    <p className="font-medium">{selectedRecruit.rank}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">需求人数</p>
                    <p className="font-medium">{selectedRecruit.members_needed}人</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">状态</p>
                    <p className={`font-medium ${selectedRecruit.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedRecruit.status === 'active' ? '招募中' : '已结束'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-1">联系方式</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedRecruit.contact}</p>
                    <button
                      onClick={() => copyContact(selectedRecruit.contact)}
                      className="text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      复制
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-1">要求</p>
                  <p className="font-medium">{selectedRecruit.requirements || '无特殊要求'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-1">发布时间</p>
                  <p className="font-medium">{new Date(selectedRecruit.created_at).toLocaleString()}</p>
                </div>
                
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push(`/teams/recruit?edit=${selectedRecruit.id}`)}
                    className="btn-primary px-4 py-2 text-white font-medium flex-1"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => {
                      // 切换招募状态
                      supabase
                        .from('team_recruits')
                        .update({ status: selectedRecruit.status === 'active' ? 'closed' : 'active' })
                        .eq('id', selectedRecruit.id)
                        .then(() => {
                          fetchRecruits()
                          setMobileDetailOpen(false)
                        })
                    }}
                    className="btn-secondary px-4 py-2 text-gray-700 font-medium flex-1"
                  >
                    {selectedRecruit.status === 'active' ? '结束招募' : '重新招募'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
