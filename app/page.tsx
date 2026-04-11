'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import PageLayout from './components/layout/PageLayout'
import { useAuth } from './context/AuthContext'
import { supabase } from './lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { getCategoryLabel } from './types/forum'

export default function Home() {
  const [activeTab, setActiveTab] = useState(0)
  const { user } = useAuth()
  const [hasTeam, setHasTeam] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_teamInfo, setTeamInfo] = useState<{
    team_name: string;
    team_description?: string;
  } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_teamMembers, setTeamMembers] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pendingApplications, setPendingApplications] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loading, setLoading] = useState(true)

  // 检查用户是否有战队
  useEffect(() => {
    const checkTeamStatus = async () => {
      if (user) {
        try {
          // 检查用户是否在战队中
          const { data: teamMember, error } = await supabase
            .from('team_members')
            .select('team_id, role')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single()

          if (!error && teamMember) {
            setHasTeam(true)
            
            // 获取战队信息
            const { data: teamData } = await supabase
              .from('teams')
              .select('*')
              .eq('id', teamMember.team_id)
              .single()
            setTeamInfo(teamData)

            // 获取战队成员数
            const { count: membersCount } = await supabase
              .from('team_members')
              .select('*', { count: 'exact' })
              .eq('team_id', teamMember.team_id)
              .eq('status', 'active')
            setTeamMembers(membersCount || 0)

            // 获取待处理申请数
            const { count: appsCount } = await supabase
              .from('team_applications')
              .select('*', { count: 'exact' })
              .eq('team_id', teamMember.team_id)
              .eq('status', 'pending')
            setPendingApplications(appsCount || 0)
          }
        } catch (err) {
          console.error('检查战队状态失败:', err)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    checkTeamStatus()
  }, [user])

  // 根据登录状态生成标签页
  const getTabs = () => {
    const baseTabs = ['招募大厅', '贴吧社区']
    if (user) {
      baseTabs.splice(1, 0, '战队/ID出售')
      if (hasTeam) {
        baseTabs.splice(1, 0, '战队管理后台')
      }
    }
    return baseTabs
  }

  const tabs = getTabs()

  // 骨架屏组件
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const SkeletonCard = () => (
    <div className="card p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
      <div className="flex gap-4">
        <div className="h-10 bg-gray-200 rounded w-1/2"></div>
        <div className="h-10 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  )

  // 招募大厅组件
  const RecruitmentHall = () => {
    interface Recruit {
      id: string;
      title: string;
      image_url?: string;
      teams?: {
        name: string;
      };
      position: string;
      rank: string;
      members_needed: number;
      contact: string;
      requirements?: string;
      created_at: string;
    }

    const [recruits, setRecruits] = useState<Recruit[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [selectedRecruit, setSelectedRecruit] = useState<Recruit | null>(null)
    const [hasFetched, setHasFetched] = useState(false)

    useEffect(() => {
      // 只有当还没有获取过数据时才请求
      if (!hasFetched) {
        const fetchRecruits = async () => {
          try {
            setError('')
            const { data, error } = await supabase
              .from('team_recruits')
              .select('*, teams(name)')
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(10)

            if (error) throw error
            setRecruits(data || [])
          } catch (err) {
            console.error('获取招募信息失败:', err)
            setError('网络连接失败，请检查网络设置或稍后重试')
          } finally {
            setLoading(false)
            setHasFetched(true)
          }
        }

        fetchRecruits()
      } else {
        // 如果已有数据，直接设置loading为false
        setLoading(false)
      }
    }, [hasFetched])

    const handleCardClick = (recruit: Recruit) => {
      setSelectedRecruit(recruit)
      setShowModal(true)
    }

    const closeModal = () => {
      setShowModal(false)
      setSelectedRecruit(null)
    }

    if (loading) {
      return (
        <div className="card p-6 animate-fade-in">
          <h3 className="text-xl font-bold mb-4">招募大厅</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="card p-6 animate-fade-in">
        <h3 className="text-xl font-bold mb-4">招募大厅</h3>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {recruits.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recruits.map((recruit) => (
                <div 
                  key={recruit.id} 
                  className="group card card-hover cursor-pointer"
                  onClick={() => handleCardClick(recruit)}
                >
                  {/* 玻璃罩渐变背景 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-pink-50/30 to-purple-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                  
                  {/* 粉色光晕效果 */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-300/20 via-purple-300/20 to-pink-300/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
                  
                  {/* 内容区域 */}
                  <div className="relative z-10">
                  {/* 图片显示 */}
                  <div className="w-full h-36 mb-4 rounded-2xl overflow-hidden relative shadow-inner">
                    {recruit.image_url ? (
                      <Image 
                        src={recruit.image_url} 
                        alt={recruit.title} 
                        width={400}
                        height={200}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=esports%20team%20recruitment%20poster&image_size=square`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                        <span className="text-5xl group-hover:scale-110 transition-transform duration-500">🎮</span>
                      </div>
                    )}
                    
                    {/* 类型标签 */}
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1.5 text-xs font-medium rounded-full shadow-md backdrop-blur-md bg-red-500/90 text-white">
                        急招
                      </span>
                    </div>
                  </div>
                  
                  {/* 标题 */}
                  <h4 className="font-bold text-gray-800 text-lg mb-3 line-clamp-2 group-hover:text-pink-600 transition-colors duration-300">{recruit.title}</h4>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">🏢</span>
                      <span className="truncate">{recruit.teams?.name || '未知战队'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-500">📍</span>
                      <span className="truncate">{recruit.position}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-500">🏅</span>
                      <span className="truncate">{recruit.rank}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">👥</span>
                      <span className="truncate">需要 {recruit.members_needed} 人</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">📞</span>
                      <span className="truncate">{recruit.contact}</span>
                    </div>
                  </div>
                  
                  {/* 时间和查看详情按钮 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{new Date(recruit.created_at).toLocaleDateString()}</span>
                    <button 
                      className="btn-primary py-2.5 px-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(recruit);
                      }}
                    >
                      查看详情
                    </button>
                  </div>
                  </div>
                </div>
              ))}
            </div>
            {/* 暂时隐藏查看更多按钮，等待招募大厅页面开发 */}
            {/* <div className="mt-8 text-center">
              <Link 
                href="/teams/recruitment-management" 
                className="py-3 px-8 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-medium rounded-xl shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:from-pink-500 hover:to-purple-500 transition-all duration-300 inline-block"
              >
                查看更多
              </Link>
            </div> */}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🏃‍♂️</div>
            <p className="text-gray-500">暂无招募信息</p>
          </div>
        )}

        {/* 模态框 */}
        {showModal && selectedRecruit && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div 
              className="relative bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-pink-200/30 w-full max-w-md max-h-[85vh] overflow-hidden animate-fade-in border border-white/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 玻璃罩光晕背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100/40 via-white/60 to-purple-100/40 rounded-3xl" />
              
              {/* 粉色光晕装饰 */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-300/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-300/30 rounded-full blur-3xl" />
              
              {/* 头部图片区域 */}
              <div className="relative h-40 bg-gradient-to-br from-pink-200 via-purple-200 to-pink-300">
                {selectedRecruit.image_url ? (
                  <Image 
                    src={selectedRecruit.image_url} 
                    alt={selectedRecruit.title} 
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl drop-shadow-lg">🎮</span>
                  </div>
                )}
                
                {/* 关闭按钮 */}
                <button 
                  onClick={closeModal}
                  className="absolute top-3 right-3 w-10 h-10 bg-white/80 backdrop-blur-md hover:bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-pink-500 transition-all duration-300 shadow-lg hover:shadow-pink-200/50 border border-white/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* 类型标签 */}
                <div className="absolute bottom-3 left-3">
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full shadow-lg backdrop-blur-md bg-red-500/90 text-white">
                    急招
                  </span>
                </div>
              </div>
              
              {/* 内容区域 */}
              <div className="relative p-4">
                {/* 标题 */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight line-clamp-2">{selectedRecruit.title}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100/80 px-2 py-1 rounded-full">{new Date(selectedRecruit.created_at).toLocaleDateString()}</span>
                </div>
                
                {/* 详情信息 */}
                <div className="space-y-3 mb-4">
                  {/* 战队信息卡片 */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100/50 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">战队</p>
                        <p className="font-bold text-gray-900 text-base">{selectedRecruit.teams?.name || '未知战队'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 招募信息卡片 */}
                  <div className="bg-white/60 rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">位置：</span>
                        <span className="font-medium text-sm">{selectedRecruit.position}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">段位：</span>
                        <span className="font-medium text-sm">{selectedRecruit.rank}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">人数：</span>
                        <span className="font-medium text-sm">{selectedRecruit.members_needed}人</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">要求：</span>
                        <span className="font-medium text-sm line-clamp-1">{selectedRecruit.requirements || '无特殊要求'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 联系方式卡片 */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 border border-pink-100/50 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">联系</p>
                        <p className="font-bold text-gray-900 text-base">{selectedRecruit.contact}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <button 
                  onClick={closeModal}
                  className="w-full py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-pink-400 hover:to-purple-400 text-gray-700 hover:text-white font-medium rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-pink-200/50"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 战队空间组件
  const TeamSpace = () => {
    interface Team {
      id: string;
      name: string;
      declaration?: string;
      created_at: string;
    }

    const [team, setTeam] = useState<Team | null>(null)
    const [memberCount, setMemberCount] = useState(0)
    const [winRate, setWinRate] = useState('暂无')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      // 只有当team为空且用户存在时才请求数据
      if (!team && user) {
        const fetchUserTeam = async () => {
          try {
            // 获取用户的战队信息
            const { data: teamMember, error: memberError } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .single()

            if (memberError || !teamMember) {
              setLoading(false)
              return
            }

            const teamId = teamMember.team_id

            // 获取战队信息
            const { data: teamData, error: teamError } = await supabase
              .from('teams')
              .select('*')
              .eq('id', teamId)
              .single()

            if (teamError || !teamData) {
              setLoading(false)
              return
            }

            setTeam(teamData)

            // 获取成员数
            const { count: membersCount } = await supabase
              .from('team_members')
              .select('*', { count: 'exact' })
              .eq('team_id', teamId)
              .eq('status', 'active')

            setMemberCount(membersCount || 0)

            // 计算胜率
            const { data: matchRecords } = await supabase
              .from('match_records')
              .select('result')
              .eq('team_id', teamId)

            if (matchRecords && matchRecords.length > 0) {
              const wins = (matchRecords as Array<{ result: string }>).filter(record => record.result === 'win').length
              const rate = Math.round((wins / matchRecords.length) * 100)
              setWinRate(`${rate}%`)
            }

            setLoading(false)
          } catch (err) {
            console.error('获取战队信息失败:', err)
            setLoading(false)
          }
        }

        fetchUserTeam()
      } else {
        setLoading(false)
      }
    }, [team])

    if (loading) {
      return (
        <div className="card p-6 animate-fade-in">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (!team) {
      return (
        <div className="card p-6 animate-fade-in">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-bold mb-2">您还没有加入战队</h3>
            <p className="text-gray-500 mb-4">加入或创建一个战队，开始您的战队之旅</p>
            <div className="flex gap-4 justify-center">
              <Link 
                href="/teams/join" 
                className="btn-primary py-3 px-8"
              >
                加入战队
              </Link>
              <Link 
                href="/teams/new" 
                className="btn-secondary py-3 px-8"
              >
                创建战队
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">{team.name}</h3>
            <p className="text-gray-500 text-sm">{team.declaration || '暂无宣言'}</p>
          </div>
          <Link 
            href="/teams/space" 
            className="btn-primary py-2 px-4"
          >
            进入战队
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-pink-600">{memberCount}</div>
            <div className="text-sm text-gray-600">战队成员</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{winRate}</div>
            <div className="text-sm text-gray-600">胜率</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{new Date(team.created_at).toLocaleDateString()}</div>
            <div className="text-sm text-gray-600">创建时间</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">活跃</div>
            <div className="text-sm text-gray-600">战队状态</div>
          </div>
        </div>
      </div>
    )
  }

  // 战队/ID出售组件
  const TeamSales = () => {
    interface Sale {
      id: string;
      description: string;
      price: number;
      goods_type: 'TEAM' | 'ID' | 'TEAM_AND_ID';
      status: 'ON_SALE' | 'SOLD' | 'OFF_SHELF';
      created_at: string;
      seller_id?: string;
      contact?: string;
      seller?: {
        nickname: string;
      };
    }

    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const [hasFetched, setHasFetched] = useState(false)

    useEffect(() => {
      // 只有当还没有获取过数据时才请求
      if (!hasFetched) {
        const fetchSales = async () => {
          try {
            console.log('开始获取出售信息...')
            // 先获取出售列表 - 使用正确的状态值 ON_SALE
            const { data: salesData, error: salesError } = await supabase
              .from('team_sales')
              .select('*')
              .eq('status', 'ON_SALE')
              .order('created_at', { ascending: false })
              .limit(10)

            console.log('出售数据:', salesData)
            console.log('错误:', salesError)

            if (salesError) throw salesError

            if (salesData && Array.isArray(salesData)) {
              console.log(`获取到 ${salesData.length} 条出售信息`)
              
              // 打印原始的第一条数据，看看数据库中真正有什么字段
              console.log('原始的第一条 sale 数据:', JSON.stringify(salesData[0], null, 2))
              
              // 获取卖家信息 - 尝试使用各种可能的字段名
              const salesWithSellers = await Promise.all(
                (salesData as Array<any>).map(async (sale) => {
                  let sellerNickname = '未知用户'
                  
                  // 尝试多种可能的卖家ID字段名
                  const sellerId = sale.author_id || sale.seller_id || sale.user_id || sale.created_by
                  
                  console.log('处理 sale，sellerId:', sellerId, '所有字段:', Object.keys(sale))
                  
                  // 或者直接检查是否有 seller 或 profiles 字段
                  if (sale.seller?.nickname) {
                    sellerNickname = sale.seller.nickname
                  } else if (sale.profiles?.nickname) {
                    sellerNickname = sale.profiles.nickname
                  } else if (sellerId) {
                    try {
                      const { data: sellerData } = await supabase
                        .from('profiles')
                        .select('nickname')
                        .eq('id', sellerId)
                        .single()
                      
                      if (sellerData?.nickname) {
                        sellerNickname = sellerData.nickname
                        console.log('成功获取到卖家昵称:', sellerNickname)
                      }
                    } catch (err) {
                      console.log('获取卖家信息失败:', err)
                    }
                  }
                  
                  return {
                    ...sale,
                    seller: {
                      nickname: sellerNickname
                    }
                  }
                })
              )

              console.log('最终数据:', salesWithSellers)
              setSales(salesWithSellers)
            } else {
              console.log('没有获取到出售信息')
              setSales([])
            }
          } catch (err) {
            console.error('获取出售信息失败:', err)
          } finally {
            setLoading(false)
            setHasFetched(true)
          }
        }

        fetchSales()
      } else {
        // 如果已有数据，直接设置loading为false
        setLoading(false)
      }
    }, [hasFetched])

    // 获取商品类型标签
    const getGoodsTypeLabel = (type: string) => {
      switch (type) {
        case 'TEAM':
          return '战队'
        case 'ID':
          return 'ID'
        case 'TEAM_AND_ID':
          return '战队+ID'
        default:
          return '其他'
      }
    }

    if (loading) {
      return (
        <div className="card p-6 animate-fade-in">
          <h3 className="text-xl font-bold mb-4">战队/ID出售</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="card p-6 animate-fade-in">
        <h3 className="text-xl font-bold mb-4">战队/ID出售</h3>
        {sales.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sales.map((sale) => (
                <div key={sale.id} className="card card-hover">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      sale.goods_type === 'TEAM' ? 'bg-blue-100 text-blue-600' : 
                      sale.goods_type === 'ID' ? 'bg-purple-100 text-purple-600' :
                      'bg-pink-100 text-pink-600'
                    }`}>
                      {getGoodsTypeLabel(sale.goods_type)}
                    </span>
                    <span className="text-pink-600 font-bold">¥{sale.price}</span>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2 line-clamp-2">{sale.description}</h4>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>卖家：{sale.seller?.nickname || '未知'}</span>
                    <span>{new Date(sale.created_at).toLocaleDateString()}</span>
                  </div>
                  {sale.contact && (
                    <div className="mt-2 text-sm text-gray-600">
                      联系方式：{sale.contact}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link 
                href="/team-sales" 
                className="btn-primary py-3 px-8 inline-block"
              >
                查看更多
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🏪</div>
            <p className="text-gray-500">暂无出售信息</p>
            <p className="text-gray-400 text-sm mt-2">敬请期待更多优质资源</p>
          </div>
        )}
      </div>
    )
  }

  // 贴吧社区组件
  const ForumCommunity = () => {
    interface Post {
      id: string;
      title: string;
      content: string;
      category: string;
      view_count: number;
      like_count: number;
      comment_count: number;
      created_at: string;
      profiles?: {
        nickname: string;
      };
    }

    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      // 只有当posts为空时才请求数据
      if (posts.length === 0) {
        const fetchPosts = async () => {
          try {
            const { data, error } = await supabase
              .from('forum_posts')
              .select('*, profiles(nickname)')
              .order('created_at', { ascending: false })
              .limit(10)

            if (error) throw error
            setPosts(data || [])
          } catch (err) {
            console.error('获取帖子信息失败:', err)
          } finally {
            setLoading(false)
          }
        }

        fetchPosts()
      } else {
        // 如果已有数据，直接设置loading为false
        setLoading(false)
      }
    }, [posts.length])

    if (loading) {
      return (
        <div className="card p-6 animate-fade-in">
          <h3 className="text-xl font-bold mb-4">贴吧社区</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="card p-6 animate-fade-in">
        <h3 className="text-xl font-bold mb-4">贴吧社区</h3>
        {posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post) => (
                <Link key={post.id} href={`/forum/${post.id}`} className="block group">
                  <div className="group card card-hover">
                    {/* 玻璃罩渐变背景 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-pink-50/30 to-purple-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    
                    {/* 粉色光晕效果 */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-300/20 via-purple-300/20 to-pink-300/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
                    
                    {/* 内容区域 */}
                    <div className="relative z-10">
                      <h4 className="font-bold text-gray-800 text-lg mb-3 line-clamp-2 group-hover:text-pink-600 transition-colors duration-300">{post.title}</h4>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">👤</span>
                          <span className="truncate">作者：{post.profiles?.nickname || '未知用户'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-500">📁</span>
                          <span className="truncate">分类：{getCategoryLabel(post.category)}</span>
                        </div>
                        <p className="text-gray-600 line-clamp-2">{post.content?.substring(0, 80)}...</p>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">👁️ {post.view_count}</span>
                          <span className="flex items-center gap-1">❤️ {post.like_count}</span>
                          <span className="flex items-center gap-1">💬 {post.comment_count}</span>
                        </div>
                        <span className="text-sm text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <button className="w-full btn-primary py-2.5">
                        阅读更多
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link 
                href="/forum" 
                className="btn-primary py-3 px-8 inline-block"
              >
                查看更多
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500">暂无帖子</p>
            <p className="text-gray-400 text-sm mt-2">快来发布第一个帖子吧~</p>
          </div>
        )}
      </div>
    )
  }

  // 渲染内容
  const renderContent = () => {
    const tabName = tabs[activeTab]
    switch (tabName) {
      case '招募大厅':
        return <RecruitmentHall />
      case '战队管理后台':
        return <TeamSpace />
      case '战队/ID出售':
        return <TeamSales />
      case '贴吧社区':
        return <ForumCommunity />
      default:
        return <RecruitmentHall />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Navbar />
      <PageLayout>
        {/* 标签页导航 */}
        <div className="card p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === index
                    ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md shadow-pink-200'
                    : 'text-gray-600 hover:text-pink-500 hover:bg-pink-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        {renderContent()}
      </PageLayout>
    </div>
  )
}
