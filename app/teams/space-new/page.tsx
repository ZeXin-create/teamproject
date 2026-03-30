'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import MobileBottomNav from '../../components/MobileBottomNav'
import PullToRefresh from '../../components/PullToRefresh'
import { CardSkeleton } from '../../components/Skeleton'
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  Settings, 
  Plus,
  ChevronRight,
  Target,
  Award,
  MessageSquare,
  BarChart3,
  Swords
} from 'lucide-react'

interface Team {
  id: string
  name: string
  region: string
  description?: string
  member_count: number
  max_members: number
  created_at: string
  level?: number
  exp?: number
}

interface TeamMember {
  id: string
  user_id: string
  role: 'leader' | 'admin' | 'member'
  status: 'active' | 'inactive'
  joined_at: string
  user: {
    username: string
    avatar_url?: string
  }
  game_profile?: {
    game_nickname?: string
    current_rank?: string
    main_position?: string
  }
}

interface MatchRecord {
  id: string
  match_date: string
  opponent: string
  result: '胜利' | '失败'
  score?: string
  mvp?: string
}

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  created_by: string
}

type TabType = 'overview' | 'members' | 'matches' | 'data' | 'announcements' | 'settings'

export default function TeamSpacePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMatches: 0,
    winRate: 0,
    weeklyMatches: 0,
    pendingApplications: 0
  })

  // 获取用户战队
  const fetchUserTeam = useCallback(async () => {
    if (!user) return
    
    try {
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      
      if (!memberData) {
        setLoading(false)
        return
      }
      
      // 获取战队信息
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', memberData.team_id)
        .single()
      
      if (teamData) {
        setTeam(teamData)
        await fetchTeamData(teamData.id)
      }
    } catch (error) {
      console.error('获取战队信息失败:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // 获取战队相关数据
  const fetchTeamData = async (teamId: string) => {
    try {
      // 获取成员
      const { data: membersData } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users(username, avatar_url),
          game_profile:game_profiles(game_nickname, current_rank, main_position)
        `)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
      
      setMembers(membersData || [])
      
      // 获取比赛记录
      const { data: matchesData } = await supabase
        .from('match_records')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: false })
        .limit(10)
      
      setMatches(matchesData || [])
      
      // 获取公告
      const { data: announcementsData } = await supabase
        .from('team_announcements')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(5)
      
      setAnnouncements(announcementsData || [])
      
      // 计算统计数据
      const totalMatches = matchesData?.length || 0
      const wins = matchesData?.filter(m => m.result === '胜利').length || 0
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
      
      // 获取本周比赛数
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const weeklyMatches = matchesData?.filter(m => 
        new Date(m.match_date) >= oneWeekAgo
      ).length || 0
      
      // 获取待处理申请数
      const { count: pendingCount } = await supabase
        .from('team_applications')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'pending')
      
      setStats({
        totalMatches,
        winRate,
        weeklyMatches,
        pendingApplications: pendingCount || 0
      })
    } catch (error) {
      console.error('获取战队数据失败:', error)
    }
  }

  // 刷新数据
  const handleRefresh = async () => {
    if (team) {
      await fetchTeamData(team.id)
    }
  }

  useEffect(() => {
    fetchUserTeam()
  }, [fetchUserTeam])

  // 标签页配置
  const tabs = [
    { id: 'overview' as TabType, label: '概览', icon: BarChart3 },
    { id: 'members' as TabType, label: '成员', icon: Users },
    { id: 'matches' as TabType, label: '比赛', icon: Trophy },
    { id: 'data' as TabType, label: '数据', icon: TrendingUp },
    { id: 'announcements' as TabType, label: '公告', icon: MessageSquare },
    { id: 'settings' as TabType, label: '设置', icon: Settings },
  ]

  // 快捷操作
  const quickActions = [
    { 
      label: '战队赛分组', 
      icon: Swords, 
      onClick: () => router.push(`/teams/${team?.id}/grouping`),
      color: 'bg-blue-500'
    },
    { 
      label: '记录比赛', 
      icon: Plus, 
      onClick: () => router.push('/teams/data/match-records'),
      color: 'bg-green-500'
    },
    { 
      label: '数据分析', 
      icon: TrendingUp, 
      onClick: () => router.push('/teams/data/analytics'),
      color: 'bg-purple-500'
    },
    { 
      label: '招募队员', 
      icon: Users, 
      onClick: () => router.push('/teams/recruit'),
      color: 'bg-orange-500'
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <CardSkeleton />
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">您还没有加入战队</h2>
          <p className="text-gray-600 mb-8">创建或加入一个战队，开始您的战队之旅</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/teams/new')}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              创建战队
            </button>
            <button
              onClick={() => router.push('/teams/recruit')}
              className="px-6 py-3 bg-white text-blue-500 border border-blue-500 rounded-xl font-medium hover:bg-blue-50 transition-colors"
            >
              浏览招募
            </button>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
          {/* 战队信息卡 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{team.name}</h1>
                  <p className="text-blue-100 text-sm">{team.region} · {team.description || '暂无描述'}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{team.level || 1}</div>
                  <div className="text-xs text-blue-100">战队等级</div>
                </div>
              </div>
              
              {/* 经验条 */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>经验值</span>
                  <span>{team.exp || 0} / {(team.level || 1) * 1000}</span>
                </div>
                <div className="bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all"
                    style={{ width: `${((team.exp || 0) % 1000) / 10}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* 统计数据 */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{members.length}</div>
                <div className="text-xs text-gray-500">战队成员</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalMatches}</div>
                <div className="text-xs text-gray-500">比赛场次</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.winRate}%</div>
                <div className="text-xs text-gray-500">胜率</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.weeklyMatches}</div>
                <div className="text-xs text-gray-500">本周比赛</div>
              </div>
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`${action.color} text-white p-4 rounded-xl flex flex-col items-center gap-2 active:scale-95 transition-transform`}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>

          {/* 待处理提醒 */}
          {stats.pendingApplications > 0 && (
            <div 
              onClick={() => router.push('/teams/applications')}
              className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-orange-900">待处理申请</div>
                  <div className="text-sm text-orange-700">有 {stats.pendingApplications} 位玩家申请加入战队</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-orange-500" />
            </div>
          )}

          {/* 标签页导航 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 标签页内容 */}
            <div className="p-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* 最近比赛 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">最近比赛</h3>
                      <button 
                        onClick={() => setActiveTab('matches')}
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        查看全部
                      </button>
                    </div>
                    {matches.length > 0 ? (
                      <div className="space-y-2">
                        {matches.slice(0, 3).map((match) => (
                          <div 
                            key={match.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${
                                match.result === '胜利' ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              <span className="text-sm">vs {match.opponent}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(match.match_date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">暂无比赛记录</p>
                        <button 
                          onClick={() => router.push('/teams/data/match-records')}
                          className="mt-2 text-sm text-blue-500"
                        >
                          记录第一场比赛
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 活跃成员 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">活跃成员</h3>
                      <button 
                        onClick={() => setActiveTab('members')}
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        查看全部
                      </button>
                    </div>
                    <div className="flex -space-x-2">
                      {members.slice(0, 5).map((member, index) => (
                        <div 
                          key={member.id}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-sm font-medium"
                          style={{ zIndex: 5 - index }}
                        >
                          {member.user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      ))}
                      {members.length > 5 && (
                        <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium">
                          +{members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                        {member.user?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {member.game_profile?.game_nickname || member.user?.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.game_profile?.current_rank || '未设置段位'} · {member.game_profile?.main_position || '未设置位置'}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        member.role === 'leader' 
                          ? 'bg-red-100 text-red-600' 
                          : member.role === 'admin'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.role === 'leader' ? '队长' : member.role === 'admin' ? '管理员' : '成员'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'matches' && (
                <div className="space-y-2">
                  {matches.length > 0 ? (
                    matches.map((match) => (
                      <div 
                        key={match.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            match.result === '胜利' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <span className="text-xl">{match.result === '胜利' ? '🏆' : '❌'}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">vs {match.opponent}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(match.match_date).toLocaleDateString()} · {match.score || '未记录比分'}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          match.result === '胜利' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {match.result}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 mb-4">暂无比赛记录</p>
                      <button 
                        onClick={() => router.push('/teams/data/match-records')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        添加比赛记录
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'data' && (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">详细数据分析</p>
                  <button 
                    onClick={() => router.push('/teams/data/analytics')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    查看完整数据
                  </button>
                </div>
              )}

              {activeTab === 'announcements' && (
                <div className="space-y-3">
                  {announcements.length > 0 ? (
                    announcements.map((announcement) => (
                      <div 
                        key={announcement.id}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                          <span className="text-xs text-gray-400">
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 mb-4">暂无公告</p>
                      <button 
                        onClick={() => router.push('/teams/announcements')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        发布公告
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <button 
                    onClick={() => router.push('/teams/manage')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">战队管理</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button 
                    onClick={() => router.push(`/teams/${team.id}/profile`)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">游戏资料</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button 
                    onClick={() => router.push('/teams/training')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">训练计划</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
      
      <MobileBottomNav />
    </div>
  )
}
