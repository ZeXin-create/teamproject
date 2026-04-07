'use client'

import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import { useAuth } from './context/AuthContext'
import { supabase } from './lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [activeTab, setActiveTab] = useState(0)
  const { user } = useAuth()
  const [hasTeam, setHasTeam] = useState(false)
  const [teamInfo, setTeamInfo] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState(0)
  const [pendingApplications, setPendingApplications] = useState(0)
  const [loading, setLoading] = useState(true)

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

  // 标签内容组件
  const TabContent = ({ activeTab }: { activeTab: number }) => {
    // 招募大厅组件
    const RecruitmentHall = () => {
      const [recruits, setRecruits] = useState<any[]>([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [showModal, setShowModal] = useState(false)
      const [selectedRecruit, setSelectedRecruit] = useState<any>(null)

      useEffect(() => {
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
          } catch (err: any) {
            console.error('获取招募信息失败:', err)
            setError(err.message || '获取招募信息失败')
          } finally {
            setLoading(false)
          }
        }

        fetchRecruits()
      }, [])

      const handleCardClick = (recruit: any) => {
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
                    className="card p-4 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
                    onClick={() => handleCardClick(recruit)}
                  >
                    {/* 图片显示 */}
                    <div className="w-full h-32 mb-3 rounded-t-xl overflow-hidden">
                      {recruit.image_url ? (
                        <img 
                          src={recruit.image_url} 
                          alt={recruit.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=esports%20team%20recruitment%20poster&image_size=square`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-4xl">🎮</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">急招</span>
                      <span className="text-xs text-gray-500">{new Date(recruit.created_at).toLocaleString()}</span>
                    </div>
                    <h4 className="font-bold text-lg mb-3">{recruit.title}</h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-gray-600 flex items-center">
                        🏢 <span className="ml-2">{recruit.teams?.name || '未知战队'}</span>
                      </p>
                      <p className="text-gray-600 flex items-center">
                        📍 <span className="ml-2">{recruit.position}</span>
                      </p>
                      <p className="text-gray-600 flex items-center">
                        🏅 <span className="ml-2">{recruit.rank}</span>
                      </p>
                      <p className="text-gray-600 flex items-center">
                        👥 <span className="ml-2">需要 {recruit.members_needed} 人</span>
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600 flex items-center text-sm">
                        📞 <span className="ml-2 truncate max-w-[120px]">{recruit.contact}</span>
                      </p>
                      <button 
                        className="btn-secondary text-sm px-3 py-1"
                        onClick={() => handleCardClick(recruit)}
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link 
                  href="/teams/recruitment-management" 
                  className="btn-primary"
                >
                  查看更多
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🏃‍♂️</div>
              <p className="text-gray-500">暂无招募信息</p>
            </div>
          )}

          {/* 模态框 */}
          {showModal && selectedRecruit && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">招募详情</h3>
                    <button 
                      onClick={closeModal}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">标题</p>
                      <p className="font-medium">{selectedRecruit.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">战队</p>
                      <p className="font-medium">{selectedRecruit.teams?.name || '未知战队'}</p>
                    </div>
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
                      <p className="text-sm text-gray-500 mb-1">联系方式</p>
                      <p className="font-medium">{selectedRecruit.contact}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">要求</p>
                      <p className="font-medium">{selectedRecruit.requirements || '无特殊要求'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">发布时间</p>
                      <p className="font-medium">{new Date(selectedRecruit.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 战队空间组件
    const TeamSpace = () => {
      const [team, setTeam] = useState<any>(null)
      const [memberCount, setMemberCount] = useState(0)
      const [winRate, setWinRate] = useState('暂无')
      const [loading, setLoading] = useState(true)

      useEffect(() => {
        const fetchUserTeam = async () => {
          if (!user) {
            setLoading(false)
            return
          }

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
            const { data: matches, error: matchesError } = await supabase
              .from('match_records')
              .select('result')
              .eq('team_id', teamId)

            if (!matchesError && matches && matches.length > 0) {
              const totalMatches = matches.length
              const winMatches = matches.filter(match => match.result === 'win').length
              const rate = Math.round((winMatches / totalMatches) * 100)
              setWinRate(`${rate}%`)
            }
          } catch (err) {
            console.error('获取战队信息失败:', err)
          } finally {
            setLoading(false)
          }
        }

        fetchUserTeam()
      }, [user])

      if (loading) {
        return (
          <div className="card p-6 animate-fade-in">
            <h3 className="text-xl font-bold mb-4">战队管理后台</h3>
            <div className="space-y-4">
              <div className="card p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      if (!user) {
        return (
          <div className="card p-6 animate-fade-in text-center">
            <h3 className="text-xl font-bold mb-4">战队管理后台</h3>
            <div className="text-6xl mb-4">🔐</div>
            <p className="text-gray-600 mb-6">请先登录</p>
            <Link 
              href="/auth/login" 
              className="btn-primary"
            >
              登录
            </Link>
          </div>
        )
      }

      if (!team) {
        return (
          <div className="card p-6 animate-fade-in text-center">
            <h3 className="text-xl font-bold mb-4">战队管理后台</h3>
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-gray-600 mb-6">您还没有加入战队</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/teams/new" 
                className="btn-primary"
              >
                创建战队
              </Link>
              <Link 
                href="/teams/join" 
                className="btn-secondary"
              >
                加入战队
              </Link>
            </div>
          </div>
        )
      }

      return (
        <div className="card p-6 animate-fade-in">
          <h3 className="text-xl font-bold mb-4">战队管理后台</h3>
          <div className="card p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6">
              <div>
                <h4 className="text-2xl font-bold mb-2">{team.name}</h4>
                <p className="text-gray-600 mb-2">宣言：{team.declaration || '暂无宣言'}</p>
                <p className="text-sm text-gray-500">创建时间：{new Date(team.created_at).toLocaleString()}</p>
              </div>
              <Link 
                href="/teams/space" 
                className="mt-4 md:mt-0 btn-primary"
              >
                进入战队管理后台
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{memberCount}</div>
                <div className="text-gray-600">战队成员</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{winRate}</div>
                <div className="text-gray-600">胜率</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-gray-600">最近分组</div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 战队/ID出售组件
    const TeamSales = () => {
      const [sales, setSales] = useState<any[]>([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [showModal, setShowModal] = useState(false)
      const [selectedSale, setSelectedSale] = useState<any>(null)

      useEffect(() => {
        const fetchSales = async () => {
          try {
            setError('')
            const { data, error } = await supabase
              .from('team_sales')
              .select('*')
              .eq('status', 'ON_SALE')
              .order('created_at', { ascending: false })
              .limit(10)

            if (error) throw error
            setSales(data || [])
          } catch (err: any) {
            console.error('获取出售信息失败:', err)
            setError(err.message || '获取出售信息失败')
          } finally {
            setLoading(false)
          }
        }

        fetchSales()
      }, [])

      const handleCardClick = (sale: any) => {
        setSelectedSale(sale)
        setShowModal(true)
      }

      const closeModal = () => {
        setShowModal(false)
        setSelectedSale(null)
      }

      if (loading) {
        return (
          <div className="card p-6 animate-fade-in">
            <h3 className="text-xl font-bold mb-4">战队/ID出售</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
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
          <h3 className="text-xl font-bold mb-4">战队/ID出售</h3>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {sales.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sales.map((sale) => (
                  <div 
                    key={sale.id} 
                    className="card p-4 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
                    onClick={() => handleCardClick(sale)}
                  >
                    {/* 图片显示 */}
                    <div className="w-full h-32 mb-3 rounded-t-xl overflow-hidden">
                      {sale.image_url ? (
                        <img 
                          src={sale.image_url} 
                          alt={sale.description} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=esports%20team%20sale%20poster&image_size=square`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-4xl">💼</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className={`px-2 py-1 text-xs rounded ${sale.goods_type === 'TEAM' ? 'bg-blue-100 text-blue-700' : sale.goods_type === 'ID' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {sale.goods_type === 'TEAM' ? '战队' : sale.goods_type === 'ID' ? '账号' : '战队+账号'}
                      </span>
                      <span className="text-lg font-bold text-green-600">¥{sale.price}</span>
                    </div>
                    <h4 className="font-bold text-lg mb-3">{sale.description}</h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-gray-600 flex items-center">
                        🖥️ <span className="ml-2">{sale.server_area}</span>
                      </p>
                      <p className="text-sm text-gray-500">发布时间：{new Date(sale.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600 flex items-center text-sm">
                        📞 <span className="ml-2 truncate max-w-[120px]">{sale.contact}</span>
                      </p>
                      <button 
                        className="btn-secondary text-sm px-3 py-1"
                        onClick={() => handleCardClick(sale)}
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link 
                  href="/team-sales" 
                  className="btn-primary"
                >
                  查看更多
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💼</div>
              <p className="text-gray-500">暂无出售信息</p>
            </div>
          )}

          {/* 模态框 */}
          {showModal && selectedSale && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">商品详情</h3>
                    <button 
                      onClick={closeModal}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">标题</p>
                      <p className="font-medium">{selectedSale.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">类型</p>
                      <p className="font-medium">{selectedSale.goods_type === 'TEAM' ? '战队' : selectedSale.goods_type === 'ID' ? '账号' : '战队+账号'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">服务器</p>
                      <p className="font-medium">{selectedSale.server_area}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">价格</p>
                      <p className="font-medium">¥{selectedSale.price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">联系方式</p>
                      <p className="font-medium">{selectedSale.contact}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">详细描述</p>
                      <p className="font-medium">{selectedSale.description || '暂无描述'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">发布时间</p>
                      <p className="font-medium">{new Date(selectedSale.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 贴吧社区组件
    const ForumCommunity = () => {
      const [posts, setPosts] = useState<any[]>([])
      const [loading, setLoading] = useState(true)

      useEffect(() => {
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
      }, [])

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
                  <Link key={post.id} href={`/forum/${post.id}`} className="block">
                    <div className="card p-4 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer">
                      <h4 className="font-bold text-lg mb-2">{post.title}</h4>
                      <p className="text-gray-600 mb-2">作者：{post.profiles?.nickname || '未知用户'}</p>
                      <p className="text-gray-600 mb-2">分类：{post.category}</p>
                      <p className="text-gray-600 mb-2 line-clamp-2">{post.content?.substring(0, 50)}...</p>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-gray-500">
                          浏览 {post.view_count} | 点赞 {post.like_count} | 评论 {post.comment_count}
                        </p>
                        <p className="text-sm text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
                      </div>
                      <button className="btn-secondary text-sm w-full">
                        阅读更多
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link 
                  href="/forum" 
                  className="btn-primary"
                >
                  查看更多
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500">暂无帖子信息</p>
            </div>
          )}
        </div>
      )
    }

    switch (activeTab) {
      case 0:
        return <RecruitmentHall />
      case 1:
        if (user && hasTeam) {
          return <TeamSpace />
        } else if (user) {
          return <TeamSales />
        } else {
          return <ForumCommunity />
        }
      case 2:
        return <TeamSales />
      case 3:
        return <ForumCommunity />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* 用户状态卡片 */}
        {loading ? (
          <div className="mb-8">
            <SkeletonCard />
          </div>
        ) : (
          <div className="mb-8">
            {!user ? (
              // 未登录状态
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">🎮</div>
                <h2 className="text-2xl font-bold mb-4">欢迎来到战队管理系统</h2>
                <p className="text-gray-600 mb-6">登录后即可创建战队、加入战队、管理队员</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link 
                    href="/auth/login" 
                    className="btn-primary"
                  >
                    登录
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="btn-secondary"
                  >
                    注册
                  </Link>
                </div>
              </div>
            ) : !hasTeam ? (
              // 已登录无战队
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold mb-4">您还没有加入战队</h2>
                <p className="text-gray-600 mb-6">创建自己的战队或加入现有战队，开始您的游戏之旅</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link 
                    href="/teams/new" 
                    className="btn-primary"
                  >
                    创建战队
                  </Link>
                  <Link 
                    href="/teams/join" 
                    className="btn-secondary"
                  >
                    加入战队
                  </Link>
                </div>
              </div>
            ) : (
              // 已有战队
              <div className="card p-6">
                <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{teamInfo?.team_name}</h2>
                    <p className="text-gray-600">{teamInfo?.team_description || '暂无战队描述'}</p>
                  </div>
                  <Link 
                    href="/teams/space" 
                    className="mt-4 md:mt-0 btn-primary"
                  >
                    进入战队管理后台
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{teamMembers}</div>
                    <div className="text-gray-600">战队成员</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{pendingApplications}</div>
                    <div className="text-gray-600">待处理申请</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">0</div>
                    <div className="text-gray-600">最近分组</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 标签页 */}
        <div className="flex overflow-x-auto mb-0 border-b border-gray-200 pb-2">
          {tabs.map((tab, index) => (
            <button
              key={index}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-300 transform hover:scale-105 hover:shadow-accent ${activeTab === index ? 'border-b-2 border-accent-500 text-accent-600 shadow-sm' : 'text-gray-600 hover:text-accent-500'}`}
              onClick={() => setActiveTab(index)}
            >
              {tab}
            </button>
          ))}
        </div>
        <TabContent activeTab={activeTab} />
      </div>
    </div>
  )
}
