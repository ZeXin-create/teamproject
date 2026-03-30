'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import MobileBottomNav from '../../components/MobileBottomNav'
import PullToRefresh from '../../components/PullToRefresh'
import { 
  Search, 
  Filter, 
  MapPin, 
  Trophy, 
  Clock, 
  Users, 
  ChevronRight,
  Plus,
  X,
  Trash2,
  MessageCircle
} from 'lucide-react'

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
    member_count?: number
    max_members?: number
  }
}

const regions = ['全部', '微信区', 'QQ区', 'iOS微信', 'iOSQQ', '安卓微信', '安卓QQ']
const ranks = ['全部', '钻石', '星耀', '王者', '王者1-30星', '王者30-50星', '王者50星以上', '荣耀王者']
const positions = ['全部', '对抗路', '打野', '中路', '发育路', '游走']
const timeSlots = ['全部', '早上', '下午', '晚上', '深夜', '周末']

export default function RecruitPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [loading, setLoading] = useState(true)
  const [userTeamIds, setUserTeamIds] = useState<string[]>([])
  
  // 筛选状态
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    region: '全部',
    rank: '全部',
    position: '全部',
    timeSlot: '全部',
    searchQuery: ''
  })
  
  // 发布招募弹窗
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishForm, setPublishForm] = useState({
    rank_requirement: '',
    positions: [] as string[],
    online_time: '',
    recruit_count: 1,
    requirements: '',
    contact: ''
  })

  // 获取招募列表
  const fetchRecruits = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('team_recruits')
        .select(`
          *,
          team:teams(name, region, member_count, max_members)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      setRecruits(data || [])
    } catch (error) {
      console.error('获取招募信息失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取用户战队
  const fetchUserTeams = useCallback(async () => {
    if (!user) return
    
    try {
      const { data } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
      
      setUserTeamIds(data?.map(item => item.team_id) || [])
    } catch (err) {
      console.error('获取用户战队失败:', err)
    }
  }, [user])

  useEffect(() => {
    fetchRecruits()
    fetchUserTeams()
  }, [fetchRecruits, fetchUserTeams])

  // 筛选逻辑
  const filteredRecruits = recruits.filter(recruit => {
    if (filters.region !== '全部' && recruit.team?.region !== filters.region) return false
    if (filters.rank !== '全部' && !recruit.rank_requirement?.includes(filters.rank)) return false
    if (filters.position !== '全部' && !recruit.positions?.includes(filters.position)) return false
    if (filters.timeSlot !== '全部' && !recruit.online_time?.includes(filters.timeSlot)) return false
    if (filters.searchQuery && !recruit.team?.name?.includes(filters.searchQuery)) return false
    return true
  })

  // 检查是否可以管理招募
  const canManageRecruit = (recruit: Recruit): boolean => {
    if (!user) return false
    return userTeamIds.includes(recruit.team_id)
  }

  // 发布招募
  const handlePublish = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (userTeamIds.length === 0) {
      alert('您需要先加入或创建一个战队才能发布招募')
      return
    }

    // 简化处理，使用第一个战队
    const teamId = userTeamIds[0]

    try {
      const { error } = await supabase
        .from('team_recruits')
        .insert({
          team_id: teamId,
          ...publishForm,
          status: 'active'
        })

      if (error) throw error

      setShowPublishModal(false)
      setPublishForm({
        rank_requirement: '',
        positions: [],
        online_time: '',
        recruit_count: 1,
        requirements: '',
        contact: ''
      })
      fetchRecruits()
    } catch (error) {
      console.error('发布招募失败:', error)
      alert('发布失败，请重试')
    }
  }

  // 删除招募
  const handleDelete = async (recruitId: string) => {
    if (!confirm('确定要删除这条招募信息吗？')) return

    try {
      const { error } = await supabase
        .from('team_recruits')
        .update({ status: 'inactive' })
        .eq('id', recruitId)

      if (error) throw error

      fetchRecruits()
    } catch (error) {
      console.error('删除招募失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 头部搜索区 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索战队名称..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl transition-colors ${showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">游戏大区</label>
                  <select
                    value={filters.region}
                    onChange={(e) => setFilters({...filters, region: e.target.value})}
                    className="w-full p-2 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500"
                  >
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">段位要求</label>
                  <select
                    value={filters.rank}
                    onChange={(e) => setFilters({...filters, rank: e.target.value})}
                    className="w-full p-2 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">招募位置</label>
                  <select
                    value={filters.position}
                    onChange={(e) => setFilters({...filters, position: e.target.value})}
                    className="w-full p-2 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500"
                  >
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">在线时间</label>
                  <select
                    value={filters.timeSlot}
                    onChange={(e) => setFilters({...filters, timeSlot: e.target.value})}
                    className="w-full p-2 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setFilters({
                    region: '全部',
                    rank: '全部',
                    position: '全部',
                    timeSlot: '全部',
                    searchQuery: ''
                  })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  重置筛选
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 招募列表 */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        <PullToRefresh onRefresh={fetchRecruits}>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRecruits.length > 0 ? (
            <div className="space-y-4">
              {filteredRecruits.map((recruit) => (
                <div 
                  key={recruit.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* 头部信息 */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {recruit.team?.name?.[0] || '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{recruit.team?.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>{recruit.team?.region}</span>
                            <span className="text-gray-300">·</span>
                            <Users className="w-3 h-3" />
                            <span>{recruit.team?.member_count || 0}/{recruit.team?.max_members || 50}人</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(recruit.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* 招募详情 */}
                  <div className="p-4 space-y-3">
                    {recruit.rank_requirement && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">段位要求：</span>
                        <span className="text-sm font-medium text-gray-900">{recruit.rank_requirement}</span>
                      </div>
                    )}
                    
                    {recruit.positions && recruit.positions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">招募位置：</span>
                        <div className="flex gap-1 flex-wrap">
                          {recruit.positions.map(pos => (
                            <span key={pos} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                              {pos}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {recruit.online_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">在线时间：</span>
                        <span className="text-sm font-medium text-gray-900">{recruit.online_time}</span>
                      </div>
                    )}
                    
                    {recruit.requirements && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {recruit.requirements}
                      </p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                    {canManageRecruit(recruit) ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(recruit.id)}
                          className="flex items-center gap-1 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    ) : (
                      <div />
                    )}
                    
                    <div className="flex gap-2">
                      {recruit.contact && (
                        <button
                          onClick={() => alert(`联系方式：${recruit.contact}`)}
                          className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          联系
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/teams/join?team=${recruit.team_id}`)}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        申请加入
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无招募信息</h3>
              <p className="text-gray-500 mb-6">还没有战队发布招募，成为第一个吧！</p>
              <button
                onClick={() => setShowPublishModal(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                发布招募
              </button>
            </div>
          )}
        </PullToRefresh>
      </div>

      {/* 发布招募弹窗 */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">发布招募</h2>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">段位要求</label>
                <select
                  value={publishForm.rank_requirement}
                  onChange={(e) => setPublishForm({...publishForm, rank_requirement: e.target.value})}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择段位要求</option>
                  {ranks.filter(r => r !== '全部').map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">招募位置</label>
                <div className="flex flex-wrap gap-2">
                  {positions.filter(p => p !== '全部').map(pos => (
                    <button
                      key={pos}
                      onClick={() => {
                        const newPositions = publishForm.positions.includes(pos)
                          ? publishForm.positions.filter(p => p !== pos)
                          : [...publishForm.positions, pos]
                        setPublishForm({...publishForm, positions: newPositions})
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        publishForm.positions.includes(pos)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">在线时间</label>
                <input
                  type="text"
                  placeholder="例如：晚上8-11点，周末全天"
                  value={publishForm.online_time}
                  onChange={(e) => setPublishForm({...publishForm, online_time: e.target.value})}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">招募人数</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={publishForm.recruit_count}
                  onChange={(e) => setPublishForm({...publishForm, recruit_count: parseInt(e.target.value) || 1})}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">招募要求</label>
                <textarea
                  placeholder="详细描述您的招募要求..."
                  rows={3}
                  value={publishForm.requirements}
                  onChange={(e) => setPublishForm({...publishForm, requirements: e.target.value})}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">联系方式</label>
                <input
                  type="text"
                  placeholder="微信/QQ/游戏ID"
                  value={publishForm.contact}
                  onChange={(e) => setPublishForm({...publishForm, contact: e.target.value})}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
              <button
                onClick={handlePublish}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                发布招募
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  )
}
