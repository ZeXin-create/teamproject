'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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
}

interface Team {
  id: string
  name: string
}



const AVAILABLE_ROLES: Record<string, string[]> = {
  '队长': ['副队长', '领队', '精英', '成员'],
  '副队长': ['领队', '精英', '成员'],
  '领队': ['精英', '成员'],
  '精英': ['成员'],
  '成员': []
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

  const fetchTeamData = useCallback(async () => {
    setLoading(true)
    try {
      // 获取用户所在的所有战队
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user?.id)
        .eq('status', 'active')

      if (memberError || !memberData || memberData.length === 0) {
        router.push('/teams/space')
        return
      }

      // 查找用户作为队长的战队
      const captainTeam = memberData.find(member => member.role === '队长')

      // 如果有队长战队，优先使用队长战队
      // 否则使用第一个战队
      const targetTeam = captainTeam || memberData[0]
      setUserRole(targetTeam.role)

      // 获取战队信息
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', targetTeam.team_id)
        .single()

      if (teamData) {
        setTeam(teamData)
      }

      // 获取战队成员
      await fetchMembers(targetTeam.team_id)
    } catch (error) {
      console.error('获取战队数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [user, router])

  const fetchMembers = async (teamId: string) => {
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

          processedMembers.push(member)
        }

        setMembers(processedMembers)
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error('获取成员失败:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTeamData()
    }
  }, [user, fetchTeamData])

  const handleMemberClick = (member: Member) => {
    // 不能对自己操作
    if (member.user_id === user?.id) return

    setSelectedMember(member)
    setShowActionModal(true)
  }

  const handleViewProfile = () => {
    setShowActionModal(false)
    setShowProfileModal(true)
  }

  const handleAppoint = () => {
    setShowActionModal(false)
    setNewRole('')
    setShowRoleModal(true)
  }

  const handleKick = () => {
    setShowActionModal(false)
    setShowKickConfirm(true)
  }

  const confirmKick = async () => {
    if (!selectedMember) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', selectedMember.id)

      if (error) throw error

      setShowKickConfirm(false)
      setSelectedMember(null)
      fetchMembers(team?.id || '')
    } catch (error) {
      console.error('踢出成员失败:', error)
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
      fetchMembers(team?.id || '')
    } catch (error) {
      console.error('任命失败:', error)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case '队长': return 'bg-yellow-100 text-yellow-600'
      case '副队长': return 'bg-purple-100 text-purple-600'
      case '领队': return 'bg-blue-100 text-blue-600'
      case '精英': return 'bg-green-100 text-green-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <div className="animate-pulse text-pink-500 text-xl">✨ 加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 返回按钮 */}
        <div className="flex items-center mb-8">
          <button
            className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2"
            onClick={() => router.back()}
          >
            <span>←</span> 返回
          </button>
        </div>

        {/* 标题 */}
        <div className="glass-card p-8 mb-8">
          <h1 className="text-3xl font-bold gradient-text text-center">
            👥 {team?.name} - 成员管理
          </h1>
          <p className="text-center text-gray-500 mt-2">
            点击成员可查看资料、任命职位或踢出战队
          </p>
        </div>

        {/* 成员列表 */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>📋</span> 成员列表
            <span className="text-sm font-normal text-gray-400">({members.length}人)</span>
          </h2>

          <div className="space-y-3">
            {members.map((member) => {
              // 简化权限检查，只要不是自己就可以管理
              const canManage = member.user_id !== user?.id

              return (
                <div
                  key={member.id}
                  onClick={() => canManage && handleMemberClick(member)}
                  className={`glass-card p-4 flex items-center gap-4 ${canManage ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''
                    }`}
                >
                  {/* 头像 */}
                  {member.user?.user_metadata?.avatar ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/50">
                      <Image
                        src={member.user.user_metadata.avatar}
                        alt="头像"
                        width={56}
                        height={56}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                      style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                    >
                      {(member.user?.user_metadata?.nickname || member.user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* 信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-gray-800">
                        {member.user?.user_metadata?.nickname || member.user?.email?.split('@')[0]}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                      {member.user_id === user?.id && (
                        <span className="text-xs text-pink-500">(我)</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      加入时间：{new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* 管理标识 */}
                  {canManage && (
                    <div className="text-gray-400">
                      ⚙️
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 操作模态框 */}
        {showActionModal && selectedMember && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-sm">
              <div className="text-center mb-6">
                {selectedMember.user?.user_metadata?.avatar ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white/50 mx-auto mb-4">
                    <Image
                      src={selectedMember.user.user_metadata.avatar}
                      alt="头像"
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4"
                    style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                  >
                    {(selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                </h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getRoleColor(selectedMember.role)}`}>
                  {selectedMember.role}
                </span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleViewProfile}
                  className="w-full glass-card p-4 text-left hover:bg-white/60 transition-all flex items-center gap-3"
                >
                  <span className="text-2xl">�</span>
                  <div>
                    <div className="font-medium text-gray-800">查看资料</div>
                    <div className="text-sm text-gray-400">查看该成员的详细信息</div>
                  </div>
                </button>

                {AVAILABLE_ROLES[userRole]?.length > 0 && (
                  <button
                    onClick={handleAppoint}
                    className="w-full glass-card p-4 text-left hover:bg-white/60 transition-all flex items-center gap-3"
                  >
                    <span className="text-2xl">⭐</span>
                    <div>
                      <div className="font-medium text-gray-800">成员任命</div>
                      <div className="text-sm text-gray-400">调整该成员的职位</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={handleKick}
                  className="w-full glass-card p-4 text-left hover:bg-red-50 transition-all flex items-center gap-3"
                >
                  <span className="text-2xl">🚫</span>
                  <div>
                    <div className="font-medium text-red-600">踢出战队</div>
                    <div className="text-sm text-gray-400">将该成员移出战队</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowActionModal(false)}
                  className="w-full p-4 text-center text-gray-500 hover:text-gray-700 transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 查看资料模态框 */}
        {showProfileModal && selectedMember && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold gradient-text">👤 成员资料</h3>
                <button
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setShowProfileModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="text-center mb-6">
                {selectedMember.user?.user_metadata?.avatar ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/50 mx-auto mb-4">
                    <Image
                      src={selectedMember.user.user_metadata.avatar}
                      alt="头像"
                      width={96}
                      height={96}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4"
                    style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                  >
                    {(selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                </h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getRoleColor(selectedMember.role)}`}>
                  {selectedMember.role}
                </span>
              </div>

              <div className="space-y-4">
                <div className="glass-card p-4">
                  <div className="text-sm text-gray-400 mb-1">📧 邮箱</div>
                  <div className="font-medium text-gray-800">{selectedMember.user?.email}</div>
                </div>

                {selectedMember.user?.user_metadata?.gender && (
                  <div className="glass-card p-4">
                    <div className="text-sm text-gray-400 mb-1">🌸 性别</div>
                    <div className="font-medium text-gray-800">
                      {selectedMember.user.user_metadata.gender === '男' ? '👦' :
                        selectedMember.user.user_metadata.gender === '女' ? '👧' : '✨'}
                      {selectedMember.user.user_metadata.gender}
                    </div>
                  </div>
                )}

                {selectedMember.user?.user_metadata?.birthday && (
                  <div className="glass-card p-4">
                    <div className="text-sm text-gray-400 mb-1">🎂 生日</div>
                    <div className="font-medium text-gray-800">{selectedMember.user.user_metadata.birthday}</div>
                  </div>
                )}

                <div className="glass-card p-4">
                  <div className="text-sm text-gray-400 mb-1">📅 加入时间</div>
                  <div className="font-medium text-gray-800">
                    {new Date(selectedMember.joined_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full glass-button mt-6 py-3 text-white font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {/* 任命职位模态框 */}
        {showRoleModal && selectedMember && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-sm">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold gradient-text">⭐ 成员任命</h3>
                <p className="text-gray-500 mt-2">
                  将 <span className="font-medium text-gray-800">
                    {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                  </span> 任命为：
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {AVAILABLE_ROLES[userRole]?.map((role) => (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    className={`w-full glass-card p-4 text-left transition-all ${newRole === role ? 'ring-2 ring-pink-400 bg-pink-50' : 'hover:bg-white/60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded-full border-2 ${newRole === role ? 'bg-pink-400 border-pink-400' : 'border-gray-300'
                        }`} />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                        {role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmAppoint}
                  disabled={!newRole}
                  className="flex-1 glass-button px-6 py-3 text-white font-medium disabled:opacity-50"
                >
                  确认任命
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 踢出战队确认模态框 */}
        {showKickConfirm && selectedMember && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-sm text-center">
              <div className="text-5xl mb-4">🚫</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">确认踢出战队？</h3>
              <p className="text-gray-500 mb-6">
                是否将 <span className="font-medium text-gray-800">
                  {selectedMember.user?.user_metadata?.nickname || selectedMember.user?.email?.split('@')[0]}
                </span> 踢出战队？
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowKickConfirm(false)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmKick}
                  className="flex-1 glass-button px-6 py-3 text-white font-medium bg-gradient-to-r from-red-400 to-red-500"
                >
                  确认踢出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
