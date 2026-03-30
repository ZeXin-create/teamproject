'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import { getTeamGroups, createGroups, updateGroupMembers, getTeamMissingProfilesCount } from '../../../services/teamGroupingService'
import Navbar from '../../../components/Navbar'
import Image from 'next/image'

interface AvailableTime {
  day: string;
  start_time: string;
  end_time: string;
}

interface Hero {
  id: number;
  name: string;
  position: string;
  image_url?: string;
}

interface PlayerProfile {
  id: string;
  user_id: string;
  team_id: string;
  game_id?: string;
  main_positions: string[];
  historical_rating?: number;
  recent_rating?: number;
  position_stats?: Record<string, {
    win_rate: string;
    kda: string;
    rating: string;
    heroes: number[];
  }>;
  available_time: AvailableTime[];
  accept_position_adjustment: boolean;
  current_rank?: string;
  created_at: string;
  updated_at: string;
  heroes?: Hero[];
}

interface GroupMember {
  id: string;
  user_id: string;
  user: {
    id: string;
    email: string;
    nickname?: string;
    avatar?: string;
  };
  profile?: PlayerProfile;
}

interface TeamGroup {
  id: string;
  team_id: string;
  group_name: string;
  created_at: string;
  updated_at: string;
  members?: GroupMember[] | undefined;
}

export default function TeamGroupingPage() {
  const params = useParams()
  const teamId = params.id as string
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [groups, setGroups] = useState<TeamGroup[]>([])
  const [missingProfilesCount, setMissingProfilesCount] = useState(0)
  const [groupCount, setGroupCount] = useState(2)
  const [isGenerating, setIsGenerating] = useState(false)
  const [draggedMember, setDraggedMember] = useState<string | null>(null)
  const [draggedFromGroup, setDraggedFromGroup] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 获取分组
      const groupsData = await getTeamGroups(user!.id, teamId)
      setGroups(groupsData)

      // 获取未填写资料的队员数量
      const missingCount = await getTeamMissingProfilesCount(user!.id, teamId)
      setMissingProfilesCount(missingCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [user, teamId])

  useEffect(() => {
    if (user && teamId) {
      fetchData()
    }
  }, [user, teamId, fetchData])

  const handleGenerateGroups = async () => {
    setError('')
    setSuccess('')

    if (groupCount < 2) {
      setError('至少需要创建2个小组')
      return
    }

    setIsGenerating(true)
    try {
      const newGroups = await createGroups(user!.id, {
        team_id: teamId,
        group_count: groupCount
      })
      setGroups(newGroups)
      setSuccess('分组生成成功！')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成分组失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMoveMember = async (fromGroupId: string, toGroupId: string, userId: string) => {
    // 从原分组移除
    const fromGroup = groups.find(g => g.id === fromGroupId)
    if (!fromGroup || !fromGroup.members) return
    const updatedFromMembers = fromGroup.members.filter(m => m.user_id !== userId)

    // 添加到新分组
    const toGroup = groups.find(g => g.id === toGroupId)
    if (!toGroup) return
    const updatedToMembers = [...(toGroup.members || []), { user_id: userId } as GroupMember]

    try {
      // 更新原分组
      await updateGroupMembers(user!.id, {
        group_id: fromGroupId,
        user_ids: updatedFromMembers.map(m => m.user_id)
      })

      // 更新新分组
      await updateGroupMembers(user!.id, {
        group_id: toGroupId,
        user_ids: updatedToMembers.map(m => m.user_id)
      })

      // 重新获取分组数据
      await fetchData()
      setSuccess('队员移动成功！')
    } catch (err) {
      setError(err instanceof Error ? err.message : '移动队员失败，请稍后重试')
    }
  }

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, memberId: string, groupId: string) => {
    setDraggedMember(memberId)
    setDraggedFromGroup(groupId)
  }

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedMember(null)
    setDraggedFromGroup(null)
  }

  // 拖拽放置
  const handleDrop = async (e: React.DragEvent, toGroupId: string) => {
    e.preventDefault()
    if (draggedMember && draggedFromGroup && draggedFromGroup !== toGroupId) {
      await handleMoveMember(draggedFromGroup, toGroupId, draggedMember)
    }
    handleDragEnd()
  }

  // 允许放置
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold gradient-text mb-6 text-center">战队分组管理</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-2xl border border-green-200">
              {success}
            </div>
          )}

          {/* 未填写资料提醒 */}
          {missingProfilesCount > 0 && (
            <div className="mb-6 p-4 bg-yellow-100/80 backdrop-blur-sm text-yellow-700 rounded-2xl border border-yellow-200">
              注意：还有 {missingProfilesCount} 名队员未填写游戏资料，他们将不被纳入分组
            </div>
          )}

          {/* 生成分组 */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl">
            <h2 className="text-xl font-bold mb-4">生成分组</h2>
            <div className="flex items-center gap-4 mb-4">
              <label htmlFor="groupCount" className="text-gray-700 font-medium">
                小组数量：
              </label>
              <input
                type="number"
                id="groupCount"
                value={groupCount}
                onChange={(e) => setGroupCount(parseInt(e.target.value) || 2)}
                min="2"
                max="10"
                className="glass-input w-20 px-4 py-2"
              />
              <button
                onClick={handleGenerateGroups}
                className="glass-button px-6 py-2 text-white font-medium"
                disabled={isGenerating}
              >
                {isGenerating ? '生成中...' : '生成分组'}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              系统将根据队员的可比赛时间、位置和评分自动生成均衡的分组
            </p>
          </div>

          {/* 分组列表 */}
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map(group => (
                <div
                  key={group.id}
                  className="glass-card p-6"
                  onDrop={(e) => handleDrop(e, group.id)}
                  onDragOver={handleDragOver}
                >
                  <h3 className="text-xl font-bold mb-4">{group.group_name}组</h3>

                  {/* 小组队员 */}
                  <div className="space-y-4">
                    {group.members && group.members.length > 0 ? (
                      group.members.map(member => (
                        <div
                          key={member.user_id}
                          className="p-4 bg-gray-50 rounded-lg shadow-sm cursor-move"
                          draggable
                          onDragStart={(e) => handleDragStart(e, member.user_id, group.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {member.user.avatar ? (
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50">
                                <Image
                                  src={member.user.avatar}
                                  alt={member.user.nickname || '用户'}
                                  width={48}
                                  height={48}
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                              >
                                {(member.user.nickname || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">{member.user.nickname || '匿名用户'}</div>
                              {member.profile && (
                                <div className="text-sm text-gray-600">
                                  {member.profile.current_rank || '未设置'}
                                </div>
                              )}
                            </div>
                          </div>

                          {member.profile && (
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">擅长位置：</span>
                                {member.profile.main_positions.join('、')}
                              </div>
                              {member.profile.heroes && member.profile.heroes.length > 0 && (
                                <div>
                                  <span className="font-medium">常用英雄：</span>
                                  {member.profile.heroes.map(h => h.name).join('、')}
                                </div>
                              )}
                              {member.profile.available_time && member.profile.available_time.length > 0 && (
                                <div>
                                  <span className="font-medium">可比赛时间：</span>
                                  {member.profile.available_time.map(t => `${t.day} ${t.start_time}-${t.end_time}`).join('、')}
                                </div>
                              )}
                              {member.profile.position_stats && Object.keys(member.profile.position_stats).length > 0 && (
                                <div>
                                  <span className="font-medium">核心数据：</span>
                                  {Object.entries(member.profile.position_stats).map(([pos, stats]) => (
                                    <div key={pos} className="ml-4">
                                      {pos}：胜率 {stats.win_rate}，KDA {stats.kda}，评分 {stats.rating}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 移动按钮 */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {groups.map(targetGroup => {
                              if (targetGroup.id !== group.id) {
                                return (
                                  <button
                                    key={targetGroup.id}
                                    onClick={() => handleMoveMember(group.id, targetGroup.id, member.user_id)}
                                    className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                  >
                                    移到{targetGroup.group_name}组
                                  </button>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        暂无队员
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎮</div>
              <p className="text-gray-600 text-lg">还未生成分组</p>
              <p className="text-gray-400 mt-2">点击上方按钮生成分组</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
