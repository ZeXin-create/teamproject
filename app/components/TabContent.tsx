import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface TabContentProps {
  activeTab: number
}

interface Recruit {
  id: string
  team_id: string
  requirements: string
  contact: string
  created_at: string
  rank_requirement?: string
  positions?: string[]
  online_time?: string
  recruit_count?: number
  deadline?: string
  status?: string
  team?: {
    name: string
    region: string
  }
}

export default function TabContent({ activeTab }: TabContentProps) {
  const router = useRouter()
  
  // 当切换到出售标签时，重定向到出售页面
  useEffect(() => {
    if (activeTab === 3) {
      router.push('/team-sales')
    }
    // 当切换到贴吧社区标签时，重定向到贴吧页面
    if (activeTab === 4) {
      router.push('/forum')
    }
  }, [activeTab, router])
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Array<{ id: string; name: string; avatar_url?: string; region?: string; declaration?: string; city?: string; member_count?: number; images?: string[] }>>([])
  const [rankedTeams, setRankedTeams] = useState<Array<{ id: string; name: string; rank: number; avatar_url?: string; region?: string }>>([])
  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchRegion, setSearchRegion] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; avatar_url?: string; region?: string; declaration?: string; city?: string; member_count?: number; images?: string[] } | null>(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('teams')
        .select('id, name, avatar_url, region, declaration, city, province, district')

      // 根据搜索条件筛选
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }
      if (searchRegion) {
        query = query.eq('region', searchRegion)
      }

      const { data } = await query

      if (data) {
        // 获取每个战队的成员数量
        const teamsWithMembers = await Promise.all(
          data.map(async (team) => {
            const { data: members } = await supabase
              .from('team_members')
              .select('id')
              .eq('team_id', team.id)
              .eq('status', 'active')
            
            return {
              ...team,
              city: team.city || team.province || team.district || '未知城市',
              member_count: members?.length || 0,
              images: [] // 暂时为空，后续可从数据库获取
            }
          })
        )
        setTeams(teamsWithMembers)
      }
    } catch (error) {
      console.error('获取战队列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, searchRegion])

  const fetchRankedTeams = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('teams')
        .select('id, name, region, avatar_url')
        .order('created_at', { ascending: false })

      // 根据选择的大区筛选
      if (selectedRegion) {
        query = query.eq('region', selectedRegion)
      }

      const { data } = await query

      if (data) {
        const ranked = data.map((team, index) => ({
          ...team,
          rank: index + 1
        }))
        setRankedTeams(ranked)
      }
    } catch (error) {
      console.error('获取战队排行失败:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedRegion])

  const fetchRecruits = useCallback(async () => {
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
          rank_requirement,
          positions,
          online_time,
          recruit_count,
          deadline,
          status,
          team:teams(
            name,
            region
          )
        `)
        .eq('status', 'active')
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 0) {
      fetchRecruits()
    } else if (activeTab === 1) {
      fetchTeams()
    } else if (activeTab === 2) {
      fetchRankedTeams()
    }
  }, [activeTab, selectedRegion, fetchTeams, fetchRankedTeams, fetchRecruits])

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold gradient-text mb-6 flex items-center gap-2">
              <span>🎯</span> 招募大厅
            </h2>
            <p className="text-gray-600 mb-6">这里展示所有队长发布的招募信息</p>
            
            {loading ? (
              <div className="glass-card p-12 text-center">
                <div className="animate-pulse text-pink-500 text-lg">✨ 加载中...</div>
              </div>
            ) : recruits.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-gray-600 text-lg">暂无招募信息</p>
                <p className="text-gray-400 text-sm mt-2">队长们还没有发布招募信息</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recruits.map((recruit) => (
                  <div key={recruit.id} className="glass-card p-6 hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{recruit.team?.name || '未知战队'}</h3>
                        {recruit.team?.region && (
                          <span className="text-xs text-pink-500 mt-1 inline-block px-2 py-1 bg-pink-100 rounded-full">
                            {recruit.team.region}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        {new Date(recruit.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {recruit.rank_requirement && (
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">🏆</span>
                          <span className="text-gray-700">段位要求：{recruit.rank_requirement}</span>
                        </div>
                      )}
                      
                      {recruit.positions && recruit.positions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">🎯</span>
                          <span className="text-gray-700">擅长位置：{recruit.positions.join('、')}</span>
                        </div>
                      )}
                      
                      {recruit.online_time && (
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">⏰</span>
                          <span className="text-gray-700">在线时间：{recruit.online_time}</span>
                        </div>
                      )}
                      
                      {recruit.recruit_count && (
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">👥</span>
                          <span className="text-gray-700">招募人数：{recruit.recruit_count}人</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-4">
                      <p className="text-gray-700 leading-relaxed">{recruit.requirements}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                      <span className="text-pink-400">📞</span>
                      <span>联系方式：{recruit.contact}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 1:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold gradient-text mb-6 flex items-center gap-2">
              <span>🏆</span> 战队列表
            </h2>
            
            {/* 搜索功能 */}
            <div className="mb-6">
              <form onSubmit={(e) => { e.preventDefault(); fetchTeams(); }} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索战队名称..."
                  className="flex-1 glass-input px-4 py-3"
                />
                <select
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="glass-input px-4 py-3"
                >
                  <option value="">所有区域</option>
                  <option value="安卓QQ">安卓QQ</option>
                  <option value="安卓微信">安卓微信</option>
                  <option value="iOS QQ">iOS QQ</option>
                  <option value="iOS 微信">iOS 微信</option>
                </select>
                <button
                  type="submit"
                  className="glass-button px-6 py-3 text-white font-medium"
                >
                  搜索
                </button>
              </form>
            </div>
            
            {loading ? (
              <div className="glass-card p-12 text-center">
                <div className="animate-pulse text-pink-500 text-lg">✨ 加载中...</div>
              </div>
            ) : teams.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-gray-600 text-lg">暂无战队</p>
                <p className="text-gray-400 text-sm mt-2">快来创建第一个战队吧~</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="glass-card p-4 hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => setSelectedTeam(team)}>
                    <div className="flex items-center gap-4">
                      {team.avatar_url ? (
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/50">
                          <Image 
                            src={team.avatar_url?.replace(/[`]/g, '') || ''}
                            alt={team.name}
                            width={64}
                            height={64}
                            className="object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        </div>
                      ) : null}
                      <div 
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold ${team.avatar_url ? 'hidden' : ''}`}
                        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{team.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                            {team.region}
                          </span>
                          <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                            成员: {team.member_count || 0}
                          </span>
                        </div>
                        {team.declaration && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                            {team.declaration}
                          </p>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm">
                        查看详情
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 战队详情模态框 */}
            {selectedTeam && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold gradient-text">战队详情</h3>
                    <button 
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                      onClick={() => setSelectedTeam(null)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="flex flex-col items-center mb-6">
                    {selectedTeam.avatar_url ? (
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/50 shadow-lg mb-4">
                        <Image 
                          src={selectedTeam.avatar_url?.replace(/[`]/g, '') || ''}
                          alt={selectedTeam.name}
                          width={96}
                          height={96}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg mb-4"
                        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      >
                        {selectedTeam.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedTeam.name}</h2>
                    <div className="flex flex-wrap justify-center gap-3">
                      <span className="px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                        🎮 {selectedTeam.region}
                      </span>
                      <span className="px-4 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                        👥 {selectedTeam.member_count || 0} 名成员
                      </span>
                      <span className="px-4 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                        📍 {selectedTeam.city}
                      </span>
                    </div>
                  </div>
                  
                  {selectedTeam.declaration && (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-800 mb-2">战队宣言</h4>
                      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4">
                        <p className="text-gray-700 italic">&quot;{selectedTeam.declaration}&quot;</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 战队图片 */}
                  {selectedTeam.images && selectedTeam.images.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-800 mb-4">战队风采</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedTeam.images.map((image, index) => (
                          <div key={index} className="relative rounded-xl overflow-hidden aspect-square">
                            <Image 
                              src={image}
                              alt={`战队图片 ${index + 1}`}
                              width={200}
                              height={200}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button 
                      className="glass-button px-6 py-3 text-white font-medium"
                      onClick={() => setSelectedTeam(null)}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      case 2:
        return (
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                <span>🏅</span> 战区排行
              </h2>
              <div className="w-full md:w-64">
                <select
                  className="glass-input w-full px-4 py-3 outline-none"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <option value="">🎮 所有大区</option>
                  <option value="安卓QQ">🤖 安卓QQ</option>
                  <option value="安卓微信">💚 安卓微信</option>
                  <option value="iOS QQ">📱 iOS QQ</option>
                  <option value="iOS 微信">💬 iOS 微信</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div className="glass-card p-12 text-center">
                <div className="animate-pulse text-pink-500 text-lg">✨ 加载中...</div>
              </div>
            ) : rankedTeams.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-gray-600 text-lg">暂无战队排行</p>
                <p className="text-gray-400 text-sm mt-2">选择其他大区看看吧~</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rankedTeams.map((team) => (
                  <div key={team.id} className="glass-card p-4 flex items-center justify-between hover:scale-[1.01] transition-transform">
                    <div className="flex items-center gap-4">
                      <div 
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold ${
                          team.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                          team.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                          team.rank === 3 ? 'bg-gradient-to-br from-orange-300 to-orange-400' :
                          'bg-gradient-to-br from-blue-400 to-blue-500'
                        }`}
                      >
                        {team.rank === 1 ? '👑' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
                      </div>
                      {team.avatar_url ? (
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/50">
                          <Image 
                            src={team.avatar_url?.replace(/[`]/g, '') || ''}
                            alt={team.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                        >
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{team.name}</h3>
                        <span className="text-sm text-pink-500 px-2 py-0.5 bg-pink-100 rounded-full">
                          {team.region}
                        </span>
                      </div>
                    </div>
                    <button className="glass-button px-4 py-2 text-white text-sm font-medium">
                      🔍 查看
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }
  
  return renderContent()
}