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
    avatar_url?: string
  }
}

export default function TabContent({ activeTab }: TabContentProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Array<{ id: string; name: string; avatar_url?: string; region?: string; declaration?: string; city?: string; member_count?: number; images?: string[] }>>([])
  // 战队排行状态
  const [rankedTeams, setRankedTeams] = useState<Array<{ id: string; name: string; rank: number; avatar_url?: string; region?: string }>>([])
  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchRegion, setSearchRegion] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; avatar_url?: string; region?: string; declaration?: string; city?: string; member_count?: number; images?: string[] } | null>(null)

  // 当切换到出售标签时，重定向到出售页面
  useEffect(() => {
    if (activeTab === 1) {
      router.push('/teams/space')
    } else if (activeTab === 2) {
      router.push('/team-sales')
    } else if (activeTab === 3) {
      router.push('/forum')
    }
    // 切换标签时重置选中的战队
    setSelectedTeam(null)
  }, [activeTab, router, setSelectedTeam])

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

  // 获取战队排行
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
        // 为每个战队添加排名
        const rankedTeams = data.map((team, index) => ({
          ...team,
          rank: index + 1
        }))
        setRankedTeams(rankedTeams)
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
            region,
            avatar_url
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
  }, [activeTab, selectedRegion, fetchTeams, fetchRecruits, fetchRankedTeams])

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="p-6">
            {/* 搜索和筛选 */}
            <div className="mb-6 glass-card p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="搜索战队名称或招募要求..."
                  className="flex-1 glass-input px-4 py-3"
                />
                <div className="flex flex-wrap gap-2">
                  <select className="glass-input px-4 py-3 text-sm">
                    <option value="">所有段位</option>
                    <option value="王者">王者</option>
                    <option value="星耀">星耀</option>
                    <option value="钻石">钻石</option>
                    <option value="铂金">铂金</option>
                  </select>
                  <select className="glass-input px-4 py-3 text-sm">
                    <option value="">所有位置</option>
                    <option value="上单">上单</option>
                    <option value="打野">打野</option>
                    <option value="中单">中单</option>
                    <option value="射手">射手</option>
                    <option value="辅助">辅助</option>
                  </select>
                  <select className="glass-input px-4 py-3 text-sm">
                    <option value="">战队规模</option>
                    <option value="5-10">5-10人</option>
                    <option value="10-20">10-20人</option>
                    <option value="20+">20人以上</option>
                  </select>
                </div>
              </div>
            </div>

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
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 左侧卡片列表 */}
                <div className="lg:w-1/3">
                  <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                    {recruits.map((recruit) => {
                      const isSelected = selectedTeam?.id === recruit.team_id;
                      return (
                        <div
                          key={recruit.id}
                          className={`glass-card p-4 transition-all duration-300 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md hover:translate-y-[-2px]'}`}
                          onClick={() => setSelectedTeam({
                            id: recruit.team_id,
                            name: recruit.team?.name || '未知战队',
                            region: recruit.team?.region,
                            avatar_url: recruit.team?.avatar_url,
                            declaration: '',
                            city: '',
                            member_count: 0,
                            images: []
                          })}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {recruit.team?.avatar_url ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden">
                                <Image
                                  src={recruit.team.avatar_url?.replace(/[`]/g, '') || ''}
                                  alt={recruit.team.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                {recruit.team?.name?.charAt(0).toUpperCase() || '未'}
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{recruit.team?.name || '未知战队'}</h3>
                            </div>
                            <button className="text-gray-400 hover:text-yellow-500 transition-colors">
                              ⭐
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {recruit.rank_requirement && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {recruit.rank_requirement}
                              </span>
                            )}
                            {recruit.positions && recruit.positions.length > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {recruit.positions.join('、')}
                              </span>
                            )}
                            {recruit.recruit_count && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                缺{recruit.recruit_count}人
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {recruit.requirements.substring(0, 50)}{recruit.requirements.length > 50 ? '...' : ''}
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>{recruit.team?.region || '未知区域'}</span>
                            <span suppressHydrationWarning>{new Date(recruit.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 右侧详情页 */}
                <div className="lg:w-2/3">
                  {selectedTeam ? (
                    <div className="glass-card p-6">
                      {/* 战队信息 */}
                      <div className="mb-6">
                        <div className="flex items-center gap-4 mb-4">
                          {selectedTeam.avatar_url ? (
                            <div className="w-16 h-16 rounded-2xl overflow-hidden">
                              <Image
                                src={selectedTeam.avatar_url?.replace(/[`]/g, '') || ''}
                                alt={selectedTeam.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                              {selectedTeam.name?.charAt(0).toUpperCase() || '未'}
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-bold">{selectedTeam.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                                🎮 {selectedTeam.region}
                              </span>
                              <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                                👥 {selectedTeam.member_count || 0} 名成员
                              </span>
                              <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                                📍 {selectedTeam.city || '未知城市'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 战队照片 */}
                        <div className="mb-4">
                          <h4 className="font-bold text-lg mb-3">战队风采</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                                <span className="text-gray-400">📷</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 战队简介 */}
                        {selectedTeam.declaration && (
                          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-4">
                            <h4 className="font-bold text-lg mb-2">战队简介</h4>
                            <p className="text-gray-700 italic">&quot;{selectedTeam.declaration}&quot;</p>
                          </div>
                        )}
                      </div>

                      {/* 招募详情 */}
                      <div className="mb-6">
                        <h4 className="font-bold text-lg mb-3">招募详情</h4>
                        {recruits.find(r => r.team_id === selectedTeam.id)?.requirements && (
                          <div className="text-gray-700 leading-relaxed">
                            {recruits.find(r => r.team_id === selectedTeam.id)?.requirements}
                          </div>
                        )}
                      </div>

                      {/* 联系方式 */}
                      <div className="mb-6">
                        <h4 className="font-bold text-lg mb-3">联系方式</h4>
                        {recruits.find(r => r.team_id === selectedTeam.id)?.contact && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-gray-700">{recruits.find(r => r.team_id === selectedTeam.id)?.contact}</p>
                          </div>
                        )}
                      </div>

                      {/* 成员列表 */}
                      <div>
                        <h4 className="font-bold text-lg mb-3">核心成员</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                              队
                            </div>
                            <div>
                              <div className="font-medium">队长</div>
                              <div className="text-xs text-gray-500">创建者</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold">
                              副
                            </div>
                            <div>
                              <div className="font-medium">副队长</div>
                              <div className="text-xs text-gray-500">核心成员</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card p-12 text-center">
                      <div className="text-6xl mb-4">👀</div>
                      <p className="text-gray-600 text-lg">请选择一个招募信息</p>
                      <p className="text-gray-400 text-sm mt-2">从左侧列表中选择一个招募信息查看详情</p>
                    </div>
                  )}
                </div>
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
                            priority // 首屏图片，设置优先级
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
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold ${team.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
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

  // 当activeTab为1、2或3时，不渲染任何内容，因为会通过useEffect重定向
  if (activeTab === 1 || activeTab === 2 || activeTab === 3) {
    return null
  }

  return renderContent()
}