import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

interface TabContentProps {
  activeTab: number
}

interface BlacklistItem {
  id: string
  team_id: string
  reporter_id: string
  reason: string
  evidence?: string
  created_at: string
  custom_team?: string
  region?: string
  team?: {
    name: string
    avatar_url?: string
    region?: string
  }
  reporter?: {
    email: string
    nickname?: string
    avatar?: string
  }
}

export default function TabContent({ activeTab }: TabContentProps) {
  const { user } = useAuth()
  const [避雷信息, set避雷信息] = useState<Array<BlacklistItem>>([])
  const [loading, setLoading] = useState(false)
  const [is队长, setIs队长] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [customTeam, setCustomTeam] = useState('')
  const [region, setRegion] = useState('')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [evidenceImage, setEvidenceImage] = useState<File | null>(null)
  const [teams, setTeams] = useState<Array<{ id: string; name: string; avatar_url?: string; region?: string }>>([])
  const [rankedTeams, setRankedTeams] = useState<Array<{ id: string; name: string; rank: number; avatar_url?: string; region?: string }>>([])
  const [selectedRegion, setSelectedRegion] = useState('')

  const fetch避雷信息 = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('避雷榜单')
        .select('id, team_id, reporter_id, reason, evidence, created_at, custom_team, region')
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        const processedData: BlacklistItem[] = []
        
        for (const item of data) {
          const info: BlacklistItem = {
            id: item.id,
            team_id: item.team_id,
            reporter_id: item.reporter_id,
            reason: item.reason,
            evidence: item.evidence,
            created_at: item.created_at,
            custom_team: item.custom_team,
            region: item.region
          }
          
          // 首先检查是否有自定义战队名称
          if (info.custom_team) {
            info.team = {
              name: info.custom_team,
              region: info.region,
              avatar_url: ''
            }
          } else {
            // 获取战队信息
            try {
              const { data: teamData } = await supabase
                .from('teams')
                .select('name, avatar_url, region')
                .eq('id', info.team_id)
                .single()
              if (teamData) {
                info.team = teamData
              } else {
                info.team = {
                  name: '未知战队',
                  region: info.region || '',
                  avatar_url: ''
                }
              }
            } catch (teamError) {
              console.error('获取战队信息失败:', teamError)
              info.team = {
                name: '未知战队',
                region: info.region || '',
                avatar_url: ''
              }
            }
          }

          // 获取举报者信息
          try {
            const { data: userData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', info.reporter_id)
              .maybeSingle()
            
            if (userData) {
              info.reporter = {
                email: userData.email || info.reporter_id,
                nickname: userData.nickname || userData.email?.split('@')[0] || '未知用户',
                avatar: userData.avatar || ''
              }
            } else {
              // 如果profiles表中没有数据，使用默认值
              info.reporter = {
                email: info.reporter_id,
                nickname: '未知用户',
                avatar: ''
              }
            }
          } catch (error) {
            console.error('获取举报者信息失败:', error)
            // 出错时使用默认值
            info.reporter = {
              email: info.reporter_id,
              nickname: '未知用户',
              avatar: ''
            }
          }
          
          processedData.push(info)
        }
        
        set避雷信息(processedData)
      } else {
        set避雷信息([])
      }
    } catch (error) {
      console.error('获取避雷信息失败:', error)
      set避雷信息([])
    } finally {
      setLoading(false)
    }
  }, [])

  const checkUserRole = useCallback(async () => {
    if (!user) return

    try {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (teamMember && (teamMember.role === '队长' || teamMember.role === '副队长')) {
        setIs队长(true)
      }
    } catch (error) {
      console.error('检查用户角色失败:', error)
    }
  }, [user])

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('teams')
        .select('id, name, avatar_url, region')

      if (data) {
        setTeams(data)
      }
    } catch (error) {
      console.error('获取战队列表失败:', error)
    }
  }, [])

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

  useEffect(() => {
    if (activeTab === 0) {
      fetch避雷信息()
      checkUserRole()
      fetchTeams()
    } else if (activeTab === 4) {
      fetchTeams()
    } else if (activeTab === 5) {
      fetchRankedTeams()
    }
  }, [activeTab, user, selectedRegion, fetch避雷信息, checkUserRole, fetchTeams, fetchRankedTeams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason || !region || !customTeam) {
      alert('请填写所有必填字段')
      return
    }

    try {
      let evidenceUrl = evidence

      // 上传证据图片
      if (evidenceImage) {
        const { data, error: uploadError } = await supabase
          .storage
          .from('evidence-images')
          .upload(`evidence_${Date.now()}-${evidenceImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`, evidenceImage, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          console.error('上传证据失败:', uploadError)
          throw uploadError
        }

        const { data: urlData } = supabase
          .storage
          .from('evidence-images')
          .getPublicUrl(data.path)

        evidenceUrl = urlData.publicUrl
      }

      const { error } = await supabase
        .from('避雷榜单')
        .insert({
          reporter_id: user?.id,
          reason,
          evidence: evidenceUrl,
          region,
          custom_team: customTeam
        })

      if (error) {
        console.error('发布避雷信息失败:', error)
        alert(`发布失败: ${error.message}`)
        return
      }

      setShowModal(false)
      setCustomTeam('')
      setRegion('')
      setReason('')
      setEvidence('')
      setEvidenceImage(null)
      fetch避雷信息()
    } catch (error: unknown) {
      console.error('发布避雷信息失败:', error)
      alert(`发布失败: ${typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '发布失败，请稍后重试'}`)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">⚡ 避雷榜单</h2>
              {is队长 && (
                <button 
                  className="glass-button px-6 py-3 text-white font-medium flex items-center gap-2"
                  onClick={() => setShowModal(true)}
                >
                  <span>✨</span> 发布避雷信息
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="glass-card p-12 text-center">
                <div className="animate-pulse text-pink-500 text-lg">✨ 加载中...</div>
              </div>
            ) : 避雷信息.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🌸</div>
                <p className="text-gray-600 text-lg">暂无避雷信息</p>
                <p className="text-gray-400 text-sm mt-2">当前环境很安全呢~</p>
              </div>
            ) : (
              <div className="space-y-4">
                {避雷信息.map((info) => (
                  <div key={info.id} className="glass-card p-6 hover:scale-[1.02] transition-transform duration-300">
                    {/* 顶部信息：举报者和战队 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {info.reporter?.avatar ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                            <Image 
                              src={info.reporter.avatar?.replace(/[`]/g, '') || ''} 
                              alt={info.reporter?.nickname || '举报者'}
                              width={40}
                              height={40}
                              className="object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          </div>
                        ) : null}
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${info.reporter?.avatar ? 'hidden' : ''}`}
                          style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                        >
                          {(info.reporter?.nickname || info.reporter?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-800">{info.reporter?.nickname || info.reporter?.email}</span>
                          {info.team?.region && (
                            <span className="text-xs text-pink-500 ml-2 px-2 py-1 bg-pink-100 rounded-full">{info.team?.region}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">
                        {new Date(info.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* 战队信息 */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-pink-500">⚠️</span> {info.team?.name}
                      </h3>
                    </div>
                    
                    {/* 避雷原因 */}
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-4">
                      <p className="text-gray-700 leading-relaxed">{info.reason}</p>
                    </div>
                    
                    {/* 证据 */}
                    {info.evidence && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                        <span className="text-pink-400">📎</span>
                        <span>{info.evidence}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 发布避雷信息模态框 */}
            {showModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold gradient-text flex items-center gap-2">
                      <span>⚡</span> 发布避雷信息
                    </h3>
                    <button 
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                      onClick={() => setShowModal(false)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-3">
                        🎮 游戏大区
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['iOS QQ', '安卓QQ', '微信iOS', '微信安卓'].map((option) => (
                          <label 
                            key={option} 
                            className={`glass-card p-4 cursor-pointer transition-all ${
                              region === option ? 'ring-2 ring-pink-400 bg-pink-50' : 'hover:bg-white/60'
                            }`}
                          >
                            <input
                              type="radio"
                              name="region"
                              value={option}
                              checked={region === option}
                              onChange={(e) => setRegion(e.target.value)}
                              className="hidden"
                            />
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full border-2 ${
                                region === option ? 'bg-pink-400 border-pink-400' : 'border-gray-300'
                              }`} />
                              <span className="font-medium">{option}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        ⚠️ 战队名称
                      </label>
                      <input 
                        type="text" 
                        className="glass-input w-full px-4 py-3 outline-none"
                        value={customTeam}
                        onChange={(e) => setCustomTeam(e.target.value)}
                        placeholder="请输入要避雷的战队名称"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        📝 避雷原因
                      </label>
                      <textarea 
                        className="glass-input w-full px-4 py-3 outline-none"
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="请详细描述避雷原因，帮助其他玩家避坑..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        📄 文字证据（可选）
                      </label>
                      <textarea 
                        className="glass-input w-full px-4 py-3 outline-none"
                        rows={2}
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        placeholder="如有聊天记录、战绩截图等文字证据可在此填写"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        🖼️ 图片证据（可选）
                      </label>
                      <div className="glass-input p-4">
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setEvidenceImage(e.target.files[0])
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4">
                      <button 
                        type="button"
                        className="px-6 py-3 rounded-2xl text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all"
                        onClick={() => setShowModal(false)}
                      >
                        取消
                      </button>
                      <button 
                        type="submit"
                        className="glass-button px-8 py-3 text-white font-medium"
                      >
                        🚀 发布避雷
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )
      case 1:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">信息榜单</h2>
            <p>这里展示战队交易信息</p>
          </div>
        )
      case 2:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">约战信息</h2>
            <p>这里展示战队对战信息</p>
          </div>
        )
      case 3:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">招募大厅</h2>
            <p>这里展示队长发布的招募信息</p>
          </div>
        )
      case 4:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold gradient-text mb-6 flex items-center gap-2">
              <span>🏆</span> 战队列表
            </h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team, index) => (
                  <div key={team.id} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-4 mb-4">
                      {team.avatar_url ? (
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/50">
                          <Image 
                            src={team.avatar_url?.replace(/[`]/g, '') || ''}
                            alt={team.name}
                            width={56}
                            height={56}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                        >
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{team.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-pink-500">#{String(index + 1).padStart(3, '0')}</span>
                          {team.region && (
                            <span className="text-xs text-blue-500 px-2 py-0.5 bg-blue-100 rounded-full">
                              {team.region}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button className="glass-button px-4 py-2 text-white text-sm font-medium">
                        🔍 查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 5:
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
                  <option value="iOS QQ">📱 iOS QQ</option>
                  <option value="安卓QQ">🤖 安卓QQ</option>
                  <option value="微信iOS">💬 微信iOS</option>
                  <option value="微信安卓">💚 微信安卓</option>
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