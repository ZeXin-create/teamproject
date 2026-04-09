'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import ErrorBoundary from '../../components/ErrorBoundary'
import Image from 'next/image'

// 简单的数据缓存机制
interface CacheData {
  members: Member[];
  team: Team | null;
  userRole: string;
  timestamp: number;
}

const dataCache: Record<string, CacheData> = {};
const CACHE_DURATION = 5 * 60 * 1000;

const invalidateCache = (userId: string) => {
  delete dataCache[userId];
};

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
      gender?: string
      birthday?: string
    }
  }
  game_id?: string
  current_rank?: string
  main_positions?: string[]
  available_time?: TimeSlot[]
  power_score?: number
}

interface Team {
  id: string
  name: string
}

interface TimeSlot {
  day?: string;
  day_of_week?: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
}

const AVAILABLE_ROLES: Record<string, string[]> = {
  '队长': ['副队长', '领队', '组长', '精英', '成员', '队员'],
  '副队长': ['领队', '组长', '精英', '成员', '队员'],
  '领队': ['组长', '精英', '成员', '队员'],
  '组长': ['精英', '成员', '队员'],
  '精英': ['成员', '队员'],
  '成员': ['队员'],
  '队员': []
}

const KICK_PERMISSIONS: Record<string, string[]> = {
  '队长': ['副队长', '领队', '组长', '精英', '成员', '队员'],
  '副队长': ['领队', '组长', '精英', '成员', '队员'],
  '领队': [],
  '组长': [],
  '精英': [],
  '成员': [],
  '队员': []
}

const ROLE_ICONS: Record<string, string> = {
  '队长': '👑',
  '副队长': '🌟',
  '领队': '📋',
  '组长': '👨‍💼',
  '精英': '💎',
  '成员': '👤',
  '队员': '🎮'
}

interface PlayerStats {
  position_stats?: Record<string, {
    win_rate?: string;
    winRate?: string;
    kda?: string;
    rating?: string;
    power?: string;
  }>;
  main_positions?: string[];
}

function calculatePowerScore(player: PlayerStats): number {
  const positionStats = player.position_stats || {};
  const mainPosition = player.main_positions?.[0] || '中单';
  const stats = positionStats[mainPosition] || {};
  
  const winRate = parseFloat(stats.win_rate || stats.winRate || '0') || 0;
  const kda = parseFloat(stats.kda || '0') || 0;
  const rating = parseFloat(stats.rating || '0') || 0;
  const power = parseFloat(stats.power || '0') || 0;
  
  const score = (
    (winRate / 100) * 0.3 +
    (kda / 20) * 0.3 +
    (rating / 100) * 0.2 +
    (power / 10000) * 0.2
  ) * 100;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function formatAvailableTime(availableTime: TimeSlot[]): string {
  if (!availableTime || availableTime.length === 0) return '未设置';
  
  return availableTime.map(slot => {
    const day = slot.day || slot.day_of_week;
    const start = slot.start_time || slot.startTime;
    const end = slot.end_time || slot.endTime;
    if (day && start && end) {
      return `${day}${start}-${end}`;
    }
    return '';
  }).filter(Boolean).join('、');
}

const getRoleColor = (role: string) => {
  switch (role) {
    case '队长': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
    case '副队长': return 'bg-gradient-to-r from-purple-400 to-purple-600 text-white'
    case '领队': return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
    case '组长': return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
    case '精英': return 'bg-gradient-to-r from-green-400 to-green-600 text-white'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const getPowerScoreColor = (score: number) => {
  if (score >= 80) return 'text-red-500'
  if (score >= 60) return 'text-orange-500'
  if (score >= 40) return 'text-green-500'
  return 'text-gray-400'
}

const getPowerScoreProgressColor = (score: number) => {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-green-500'
  return 'bg-gray-300'
}

const getRankInfo = (rank: string) => {
  if (!rank || rank === '未设置') return { icon: '🏆', color: 'text-gray-400', bg: 'bg-gray-50', progress: 0 }
  if (rank.includes('王者')) return { icon: '👑', color: 'text-yellow-500', bg: 'bg-yellow-50', progress: 100 }
  if (rank.includes('星耀')) return { icon: '💎', color: 'text-purple-500', bg: 'bg-purple-50', progress: 85 }
  if (rank.includes('钻石')) return { icon: '💠', color: 'text-cyan-500', bg: 'bg-cyan-50', progress: 70 }
  if (rank.includes('铂金')) return { icon: '🔷', color: 'text-blue-500', bg: 'bg-blue-50', progress: 55 }
  if (rank.includes('黄金')) return { icon: '🥇', color: 'text-yellow-600', bg: 'bg-yellow-50', progress: 40 }
  if (rank.includes('白银')) return { icon: '🥈', color: 'text-gray-500', bg: 'bg-gray-50', progress: 25 }
  if (rank.includes('青铜')) return { icon: '🥉', color: 'text-orange-600', bg: 'bg-orange-50', progress: 10 }
  return { icon: '🏆', color: 'text-gray-400', bg: 'bg-gray-50', progress: 0 }
}

const getPositionIcon = (position: string) => {
  const icons: Record<string, string> = {
    '上单': '🛡️',
    '打野': '⚔️',
    '中单': '🔮',
    '射手': '🏹',
    '辅助': '💚',
  }
  return icons[position] || '🎯'
}

// 空状态组件
const EmptyState = ({ onRefresh }: { onRefresh: () => void }) => (
  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
    <div className="relative w-32 h-32 mx-auto mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full animate-pulse"></div>
      <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
        <span className="text-5xl">👥</span>
      </div>
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center animate-bounce">
        <span className="text-lg">✨</span>
      </div>
      <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center animate-bounce delay-150">
        <span className="text-sm">💫</span>
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-800 mb-2">暂无成员</h3>
    <p className="text-gray-500 mb-6 text-sm">您的战队还没有成员加入</p>
    <button
      onClick={onRefresh}
      className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all"
    >
      🔄 刷新页面
    </button>
  </div>
)

// 增强骨架屏组件
const SkeletonCard = () => (
  <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-4">
      <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-gray-200 flex-shrink-0"></div>
      <div className="flex-1 pt-0.5 md:pt-1">
        <div className="h-4 md:h-5 bg-gray-200 rounded w-20 md:w-24 mb-1.5 md:mb-2"></div>
        <div className="h-3 md:h-4 bg-gray-200 rounded w-12 md:w-16"></div>
      </div>
    </div>
    <div className="space-y-1.5 md:space-y-2">
      <div className="flex gap-1.5 md:gap-2">
        <div className="h-5 md:h-6 bg-gray-200 rounded w-16 md:w-20"></div>
        <div className="h-5 md:h-6 bg-gray-200 rounded w-14 md:w-16"></div>
      </div>
      <div className="h-3 md:h-4 bg-gray-200 rounded w-full pt-1.5 md:pt-2"></div>
    </div>
  </div>
)

// 战力进度条组件
const PowerScoreBar = ({ score }: { score: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500 ${getPowerScoreProgressColor(score)}`}
        style={{ width: `${score}%` }}
      ></div>
    </div>
    <span className={`text-xs md:text-sm font-bold ${getPowerScoreColor(score)} min-w-[28px] md:min-w-[32px] text-right`}>
      {score}
    </span>
  </div>
)

// 懒加载头像组件
const LazyAvatar = ({ src, alt, size = 'md' }: { src?: string, alt: string, size?: 'sm' | 'md' }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '50px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const sizeClasses = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14'
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg'

  return (
    <div ref={imgRef} className={`${sizeClasses} rounded-lg md:rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white ${textSize} font-bold`}>
      {isInView && src ? (
        <Image
          src={src}
          alt={alt}
          width={56}
          height={56}
          className={`object-cover w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        alt.charAt(0).toUpperCase()
      )}
    </div>
  )
}

export default function TeamManagePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showKickConfirm, setShowKickConfirm] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState('')
  
  // 加载状态
  const [isKicking, setIsKicking] = useState(false)
  
  // 下拉刷新状态
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 长按菜单状态
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [showLongPressMenu, setShowLongPressMenu] = useState(false)
  
  // 拖拽排序状态
  const [draggedMember, setDraggedMember] = useState<Member | null>(null)
  const [dragOverMember, setDragOverMember] = useState<string | null>(null)

  const fetchTeamData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    const cacheKey = user.id;
    const cachedData = dataCache[cacheKey];
    const now = Date.now();
    
    if (!forceRefresh && cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      setMembers(cachedData.members);
      setTeam(cachedData.team);
      setUserRole(cachedData.userRole);
      setLoading(false);
      return;
    }
    
    setLoading(true)
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user?.id)
        .eq('status', 'active')

      if (memberError || !memberData || memberData.length === 0) {
        router.push('/teams/space')
        return
      }

      const captainTeam = memberData.find(member => member.role === '队长')
      const targetTeam = captainTeam || memberData[0]
      setUserRole(targetTeam.role)

      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', targetTeam.team_id)
        .single()

      if (teamData) {
        setTeam(teamData)
      }

      const processedMembers = await fetchMembers(targetTeam.team_id)
      
      if (processedMembers && teamData) {
        dataCache[cacheKey] = {
          members: processedMembers,
          team: teamData,
          userRole: targetTeam.role,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('获取战队数据失败:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [user, router])

  const fetchMembers = async (teamId: string): Promise<Member[]> => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, user_id, team_id, role, status, joined_at')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('role', { ascending: false })

      if (error) throw error

      if (data) {
        const processedMembers: Member[] = []

        for (const item of data) {
          const member: Member = {
            id: item.id,
            user_id: item.user_id,
            team_id: item.team_id,
            role: item.role,
            status: item.status,
            joined_at: item.joined_at
          }

          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', member.user_id)
              .maybeSingle()

            if (profileData) {
              member.user = {
                email: profileData.email || member.user_id,
                user_metadata: {
                  nickname: profileData.nickname || profileData.email?.split('@')[0] || '未知用户',
                  avatar: profileData.avatar || '',
                  gender: profileData.gender || '',
                  birthday: profileData.birthday || ''
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
          } catch {
            member.user = {
              email: member.user_id,
              user_metadata: {
                nickname: '未知用户',
                avatar: ''
              }
            }
          }

          try {
            const { data: playerProfile } = await supabase
              .from('player_profiles')
              .select('*')
              .eq('team_id', teamId)
              .eq('user_id', member.user_id)
              .maybeSingle()

            if (playerProfile) {
              member.game_id = playerProfile.game_id || '未设置'
              member.current_rank = playerProfile.current_rank || '未设置'
              member.main_positions = playerProfile.main_positions || []
              member.available_time = playerProfile.available_time || []
              member.power_score = calculatePowerScore(playerProfile)
            }
          } catch {
            member.game_id = '未设置'
            member.current_rank = '未设置'
            member.main_positions = []
            member.available_time = []
            member.power_score = 50
          }

          processedMembers.push(member)
        }

        setMembers(processedMembers)
        return processedMembers;
      } else {
        setMembers([])
        return [];
      }
    } catch (error) {
      console.error('获取成员失败:', error)
      return [];
    }
  }

  useEffect(() => {
    if (user) {
      fetchTeamData(false)
    }
  }, [user, fetchTeamData])

  // 下拉刷新处理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && touchStartY.current > 0) {
      const distance = e.touches[0].clientY - touchStartY.current
      if (distance > 0 && distance < 100) {
        setPullDistance(distance)
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      setIsRefreshing(true)
      fetchTeamData(true)
    }
    setPullDistance(0)
    touchStartY.current = 0
  }

  // 长按处理
  const handleTouchStartLongPress = (member: Member) => {
    if (member.user_id === user?.id) return
    const timer = setTimeout(() => {
      setSelectedMember(member)
      setShowLongPressMenu(true)
    }, 500)
    setLongPressTimer(timer)
  }

  const handleTouchEndLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // 拖拽排序处理 - 仅本地排序，不保存到数据库
  const handleDragStart = (member: Member) => {
    if (userRole !== '队长') return
    setDraggedMember(member)
  }

  const handleDragOver = (e: React.DragEvent, memberId: string) => {
    e.preventDefault()
    setDragOverMember(memberId)
  }

  const handleDrop = async (e: React.DragEvent, targetMember: Member) => {
    e.preventDefault()
    if (!draggedMember || draggedMember.id === targetMember.id || userRole !== '队长') return

    const newMembers = [...members]
    const draggedIndex = newMembers.findIndex(m => m.id === draggedMember.id)
    const targetIndex = newMembers.findIndex(m => m.id === targetMember.id)

    newMembers.splice(draggedIndex, 1)
    newMembers.splice(targetIndex, 0, draggedMember)

    setMembers(newMembers)
    setDraggedMember(null)
    setDragOverMember(null)
  }

  const handleMemberClick = (member: Member) => {
    if (member.user_id === user?.id) return
    setSelectedMember(member)
    setShowActionModal(true)
  }

  const handleViewProfile = () => {
    setShowActionModal(false)
    setShowLongPressMenu(false)
    setShowProfileModal(true)
  }

  const handleAppoint = () => {
    setShowActionModal(false)
    setShowLongPressMenu(false)
    setNewRole('')
    setShowRoleModal(true)
  }

  const handleKick = () => {
    if (!selectedMember) return
    const hasKickPermission = KICK_PERMISSIONS[userRole]?.includes(selectedMember.role)
    if (!hasKickPermission) {
      alert('您没有权限执行此操作')
      return
    }
    if (selectedMember.role === '队长') {
      alert('队长不能被踢出')
      return
    }
    setShowActionModal(false)
    setShowLongPressMenu(false)
    setShowKickConfirm(true)
  }

  const handleUnlockMember = async () => {
    if (!selectedMember || !team?.id) return;
    try {
      const res = await fetch('/api/group/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: team.id, user_id: selectedMember.user_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error as string);
      alert('队员已解锁');
      setShowActionModal(false);
      setShowLongPressMenu(false);
      if (user?.id) {
        invalidateCache(user.id);
      }
      fetchMembers(team.id);
    } catch (error) {
      console.error('解锁队员失败:', error);
      alert('解锁失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  const confirmKick = async () => {
    if (!selectedMember) return
    setIsKicking(true)
    try {
      const { error: deleteProfileError } = await supabase
        .from('player_profiles')
        .delete()
        .eq('team_id', selectedMember.team_id)
        .eq('user_id', selectedMember.user_id)
      if (deleteProfileError) {
        console.error('删除游戏资料失败:', deleteProfileError)
      }
      const { error: deleteMemberError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', selectedMember.id)
      if (deleteMemberError) throw deleteMemberError
      if (team?.id) {
        try {
          const response = await fetch('/api/group/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: team.id, user_id: selectedMember.user_id })
          });
          if (!response.ok) {
            console.error('解锁队员失败:', await response.text());
          }
        } catch (error) {
          console.error('解锁队员失败:', error);
        }
      }
      await supabase
        .from('team_applications')
        .update({ status: 'rejected' })
        .eq('team_id', selectedMember.team_id)
        .eq('user_id', selectedMember.user_id)
      setShowKickConfirm(false)
      setSelectedMember(null)
      if (user?.id) {
        invalidateCache(user.id);
      }
      await fetchMembers(team?.id || '')
    } catch (error) {
      console.error('踢出成员失败:', error)
    } finally {
      setIsKicking(false)
    }
  }

  const confirmAppoint = async () => {
    if (!selectedMember || !newRole) return
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', selectedMember.id)
      if (error) throw error
      setShowRoleModal(false)
      setSelectedMember(null)
      if (user?.id) {
        invalidateCache(user.id);
      }
      fetchMembers(team?.id || '')
    } catch (error) {
      console.error('任命失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 pt-24 md:pt-28">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center mb-6">
            <button
              className="bg-white px-4 py-2 rounded-xl text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2 shadow-sm border border-gray-100"
              onClick={() => router.back()}
            >
              <span>←</span> 返回
            </button>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div 
        ref={containerRef}
        className="min-h-screen bg-gray-50 py-6 pt-24 md:pt-28 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 下拉刷新指示器 */}
        <div 
          className="fixed top-20 left-0 right-0 flex justify-center items-center transition-transform duration-200 z-40 pointer-events-none"
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          <div className={`bg-white rounded-full p-3 shadow-lg transition-opacity duration-200 ${pullDistance > 60 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`text-2xl ${isRefreshing ? 'animate-spin' : pullDistance > 60 ? 'animate-bounce' : ''}`}>
              {isRefreshing ? '🔄' : pullDistance > 60 ? '👆' : '👇'}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-7xl">
          {/* 返回按钮 */}
          <div className="flex items-center mb-6">
            <button
              className="bg-white px-4 py-2 rounded-xl text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2 shadow-sm border border-gray-100 hover:shadow-md"
              onClick={() => router.back()}
            >
              <span>←</span> 返回
            </button>
          </div>

          {/* 标题 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              👥 {team?.name} - 成员管理
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              共 {members.length} 名成员 · 点击卡片查看详情
              {userRole === '队长' && ' · 拖拽可排序'}
            </p>
          </div>

          {/* 成员卡片网格 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {members.map((member) => {
              const canManage = member.user_id !== user?.id
              const nickname = member.user?.user_metadata?.nickname || member.user?.email?.split('@')[0] || '未知用户'
              const avatar = member.user?.user_metadata?.avatar
              const firstPosition = member.main_positions?.[0]
              const rankInfo = getRankInfo(member.current_rank)
              const isDragOver = dragOverMember === member.id
              
              return (
                <div
                  key={member.id}
                  draggable={userRole === '队长'}
                  onDragStart={() => handleDragStart(member)}
                  onDragOver={(e) => handleDragOver(e, member.id)}
                  onDrop={(e) => handleDrop(e, member)}
                  onClick={() => canManage && handleMemberClick(member)}
                  onTouchStart={() => handleTouchStartLongPress(member)}
                  onTouchEnd={handleTouchEndLongPress}
                  onMouseDown={() => handleTouchStartLongPress(member)}
                  onMouseUp={handleTouchEndLongPress}
                  onMouseLeave={handleTouchEndLongPress}
                  className={`group bg-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm border-2 transition-all duration-200 hover:shadow-lg hover:border-pink-200 ${
                    canManage ? 'cursor-pointer' : 'cursor-default'
                  } ${isDragOver ? 'border-pink-400 scale-105' : 'border-gray-100'} ${
                    draggedMember?.id === member.id ? 'opacity-50' : ''
                  }`}
                >
                  {/* 头部：头像 + 昵称 + 角色 */}
                  <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-4">
                    {/* 头像 - 懒加载 */}
                    <div className="relative flex-shrink-0">
                      <LazyAvatar src={avatar} alt={nickname} size="sm" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-4 md:h-4 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    
                    {/* 昵称和角色 */}
                    <div className="flex-1 min-w-0 pt-0.5 md:pt-1">
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800 truncate text-sm md:text-base">
                          {nickname}
                        </h3>
                        {member.user_id === user?.id && (
                          <span className="text-[10px] md:text-xs bg-pink-100 text-pink-600 px-1.5 md:px-2 py-0.5 rounded-full font-medium">我</span>
                        )}
                      </div>
                      {/* 角色图标 */}
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium mt-1 ${getRoleColor(member.role)}`}>
                        <span>{ROLE_ICONS[member.role] || '👤'}</span>
                        <span>{member.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* 核心信息 */}
                  <div className="space-y-1.5 md:space-y-2">
                    {/* 段位和位置 */}
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                      <div className={`flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg ${rankInfo.bg} ${rankInfo.color}`}>
                        <span className="text-xs md:text-sm">{rankInfo.icon}</span>
                        <span className="text-[10px] md:text-xs font-medium truncate max-w-[50px] md:max-w-none">{member.current_rank || '未设置'}</span>
                      </div>
                      
                      {firstPosition && (
                        <div className="flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-blue-50 text-blue-600">
                          <span className="text-xs md:text-sm">{getPositionIcon(firstPosition)}</span>
                          <span className="text-[10px] md:text-xs font-medium">{firstPosition}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 战力进度条 */}
                    <div className="pt-1.5 md:pt-2 border-t border-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] md:text-xs text-gray-400">战力</span>
                        <span className="text-[10px] md:text-xs text-gray-400">{member.game_id || '未设置'}</span>
                      </div>
                      <PowerScoreBar score={member.power_score || 0} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 空状态 */}
          {members.length === 0 && (
            <EmptyState onRefresh={() => fetchTeamData(true)} />
          )}

          {/* 操作模态框 */}
          {showActionModal && selectedMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <div className="text-center mb-6">
                  {selectedMember.user?.user_metadata?.avatar ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm mx-auto mb-4">
                      <Image
                        src={selectedMember.user.user_metadata.avatar}
                        alt="头像"
                        width={80}
                        height={80}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-sm">
                      {(selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-800">
                    {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium mt-2 ${getRoleColor(selectedMember.role)}`}>
                    <span>{ROLE_ICONS[selectedMember.role] || '👤'}</span>
                    <span>{selectedMember.role}</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleViewProfile}
                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-3.5 text-left transition-all flex items-center gap-3 border border-gray-100"
                  >
                    <span className="text-xl">👤</span>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">查看资料</div>
                      <div className="text-xs text-gray-400">查看该成员的详细信息</div>
                    </div>
                  </button>

                  {AVAILABLE_ROLES[userRole]?.length > 0 && (
                    <button
                      onClick={handleAppoint}
                      className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-3.5 text-left transition-all flex items-center gap-3 border border-gray-100"
                    >
                      <span className="text-xl">⭐</span>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">成员任命</div>
                        <div className="text-xs text-gray-400">调整该成员的职位</div>
                      </div>
                    </button>
                  )}

                  {selectedMember && KICK_PERMISSIONS[userRole]?.includes(selectedMember.role) && selectedMember.role !== '队长' && (
                    <button
                      onClick={handleKick}
                      className="w-full bg-red-50 hover:bg-red-100 rounded-xl p-3.5 text-left transition-all flex items-center gap-3 border border-red-100"
                    >
                      <span className="text-xl">🚫</span>
                      <div>
                        <div className="font-medium text-red-600 text-sm">踢出战队</div>
                        <div className="text-xs text-gray-400">将该成员移出战队</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={handleUnlockMember}
                    className="w-full bg-blue-50 hover:bg-blue-100 rounded-xl p-3.5 text-left transition-all flex items-center gap-3 border border-blue-100"
                  >
                    <span className="text-xl">🔓</span>
                    <div>
                      <div className="font-medium text-blue-600 text-sm">解锁队员</div>
                      <div className="text-xs text-gray-400">将该成员从分组中解锁</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowActionModal(false)}
                    className="w-full p-3.5 text-center text-gray-500 hover:text-gray-700 transition-all text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 长按菜单模态框 */}
          {showLongPressMenu && selectedMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 sm:items-center">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm shadow-xl animate-slide-up">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 sm:hidden"></div>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">
                    {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium mt-2 ${getRoleColor(selectedMember.role)}`}>
                    <span>{ROLE_ICONS[selectedMember.role] || '👤'}</span>
                    <span>{selectedMember.role}</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleViewProfile}
                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 text-left transition-all flex items-center gap-3"
                  >
                    <span className="text-2xl">👤</span>
                    <span className="font-medium text-gray-800">查看资料</span>
                  </button>

                  {AVAILABLE_ROLES[userRole]?.length > 0 && (
                    <button
                      onClick={handleAppoint}
                      className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 text-left transition-all flex items-center gap-3"
                    >
                      <span className="text-2xl">⭐</span>
                      <span className="font-medium text-gray-800">成员任命</span>
                    </button>
                  )}

                  {selectedMember && KICK_PERMISSIONS[userRole]?.includes(selectedMember.role) && selectedMember.role !== '队长' && (
                    <button
                      onClick={handleKick}
                      className="w-full bg-red-50 hover:bg-red-100 rounded-xl p-4 text-left transition-all flex items-center gap-3"
                    >
                      <span className="text-2xl">🚫</span>
                      <span className="font-medium text-red-600">踢出战队</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowLongPressMenu(false)}
                    className="w-full p-4 text-center text-gray-500 hover:text-gray-700 transition-all font-medium"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 查看资料模态框 */}
          {showProfileModal && selectedMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">👤 成员资料</h3>
                  <button
                    className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
                    onClick={() => setShowProfileModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="text-center mb-6">
                  {selectedMember.user?.user_metadata?.avatar ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm mx-auto mb-4">
                      <Image
                        src={selectedMember.user.user_metadata.avatar}
                        alt="头像"
                        width={96}
                        height={96}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-sm">
                      {(selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-800">
                    {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium mt-2 ${getRoleColor(selectedMember.role)}`}>
                    <span>{ROLE_ICONS[selectedMember.role] || '👤'}</span>
                    <span>{selectedMember.role}</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">📧 邮箱</div>
                    <div className="font-medium text-gray-800 text-sm">{selectedMember.user?.email}</div>
                  </div>

                  {selectedMember.user?.user_metadata?.gender && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 mb-1">🌸 性别</div>
                      <div className="font-medium text-gray-800 text-sm">
                        {selectedMember.user.user_metadata.gender === '男' ? '👦' :
                          selectedMember.user.user_metadata.gender === '女' ? '👧' : '✨'}
                        {selectedMember.user.user_metadata.gender}
                      </div>
                    </div>
                  )}

                  {selectedMember.user?.user_metadata?.birthday && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 mb-1">🎂 生日</div>
                      <div className="font-medium text-gray-800 text-sm">{selectedMember.user.user_metadata.birthday}</div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">🎮 游戏ID</div>
                    <div className="font-medium text-gray-800 text-sm">{selectedMember.game_id || '未设置'}</div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">🏆 段位</div>
                    <div className="font-medium text-gray-800 text-sm">{selectedMember.current_rank || '未设置'}</div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">📍 擅长位置</div>
                    <div className="font-medium text-gray-800 text-sm">
                      {selectedMember.main_positions && selectedMember.main_positions.length > 0 
                        ? selectedMember.main_positions.join('、') 
                        : '未设置'
                      }
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">⏰ 可比赛时间</div>
                    <div className="font-medium text-gray-800 text-sm">{formatAvailableTime(selectedMember.available_time || [])}</div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">💪 综合实力</div>
                    <PowerScoreBar score={selectedMember.power_score || 0} />
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">📅 加入时间</div>
                    <div className="font-medium text-gray-800 text-sm">
                      {new Date(selectedMember.joined_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-full mt-6 bg-gray-800 text-white py-3 rounded-xl font-medium hover:bg-gray-900 transition-all"
                >
                  关闭
                </button>
              </div>
            </div>
          )}

          {/* 任命职位模态框 */}
          {showRoleModal && selectedMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">⭐ 成员任命</h3>
                  <p className="text-gray-500 mt-2 text-sm">
                    将 <span className="font-medium text-gray-800">
                      {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                    </span> 任命为：
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  {AVAILABLE_ROLES[userRole]?.map((role) => (
                    <button
                      key={role}
                      onClick={() => setNewRole(role)}
                      className={`w-full rounded-xl p-3.5 text-left transition-all border ${newRole === role ? 'ring-2 ring-pink-400 bg-pink-50 border-pink-200' : 'bg-gray-50 hover:bg-gray-100 border-gray-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full border-2 ${newRole === role ? 'bg-pink-400 border-pink-400' : 'border-gray-300'}`} />
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${getRoleColor(role)}`}>
                          <span>{ROLE_ICONS[role] || '👤'}</span>
                          <span>{role}</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmAppoint}
                    disabled={!newRole}
                    className="flex-1 px-6 py-3 rounded-xl bg-gray-800 text-white font-medium hover:bg-gray-900 disabled:opacity-50 transition-all text-sm"
                  >
                    确认任命
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 踢出战队确认模态框 */}
          {showKickConfirm && selectedMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
                <div className="text-4xl mb-4">🚫</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">确认踢出战队？</h3>
                <p className="text-gray-500 mb-6 text-sm">
                  是否将 <span className="font-medium text-gray-800">
                    {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                  </span> 踢出战队？
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowKickConfirm(false)}
                    disabled={isKicking}
                    className="flex-1 px-6 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-all font-medium text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmKick}
                    disabled={isKicking}
                    className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {isKicking && (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {isKicking ? '踢出中...' : '确认踢出'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
