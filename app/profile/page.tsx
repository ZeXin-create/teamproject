'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userInfo, setUserInfo] = useState({
    email: user?.email || '',
    avatar: user?.user_metadata?.avatar || '',
    nickname: user?.user_metadata?.nickname || '',
    gender: user?.user_metadata?.gender || '',
    birthday: user?.user_metadata?.birthday || ''
  })
  const [avatar, setAvatar] = useState<File | null>(null)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [userBlacklistItems, setUserBlacklistItems] = useState<any[]>([])
  const [loadingBlacklist, setLoadingBlacklist] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
    } else {
      fetchUserProfile()
      fetchUserBlacklistItems()
    }
  }, [user, router])

  // 获取用户自己发布的避雷条
  const fetchUserBlacklistItems = async () => {
    setLoadingBlacklist(true)
    try {
      const { data, error } = await supabase
        .from('避雷榜单')
        .select('id, team_id, reason, evidence, created_at, custom_team, region')
        .eq('reporter_id', user?.id)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        for (const item of data) {
          // 首先检查是否有自定义战队名称
          if (item.custom_team) {
            item.team = {
              name: item.custom_team,
              region: item.region
            }
          } else {
            // 获取战队信息
            try {
              const { data: teamData } = await supabase
                .from('teams')
                .select('name, region')
                .eq('id', item.team_id)
                .single()
              if (teamData) {
                item.team = teamData
              } else {
                item.team = {
                  name: '未知战队',
                  region: item.region || ''
                }
              }
            } catch (teamError) {
              console.error('获取战队信息失败:', teamError)
              item.team = {
                name: '未知战队',
                region: item.region || ''
              }
            }
          }
        }
      }

      setUserBlacklistItems(data || [])
    } catch (error) {
      console.error('获取避雷条失败:', error)
      setUserBlacklistItems([])
    } finally {
      setLoadingBlacklist(false)
    }
  }

  // 删除避雷条
  const deleteBlacklistItem = async (id: string) => {
    if (!confirm('确定要删除这条避雷信息吗？')) return

    try {
      const { error } = await supabase
        .from('避雷榜单')
        .delete()
        .eq('id', id)
        .eq('reporter_id', user?.id)

      if (error) {
        throw error
      }

      // 重新获取避雷条列表
      fetchUserBlacklistItems()
      setSuccess('删除成功！')
    } catch (err: any) {
      console.error('删除避雷条失败:', err)
      setError(err.message || '删除失败，请稍后重试')
    }
  }

  // 编辑避雷条
  const editBlacklistItem = (item: any) => {
    setEditingItem(item)
    setShowEditModal(true)
  }

  // 保存编辑的避雷条
  const saveEditedBlacklistItem = async () => {
    if (!editingItem) return

    try {
      const { error } = await supabase
        .from('避雷榜单')
        .update({
          reason: editingItem.reason,
          evidence: editingItem.evidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)
        .eq('reporter_id', user?.id)

      if (error) {
        throw error
      }

      setShowEditModal(false)
      setEditingItem(null)
      fetchUserBlacklistItems()
      setSuccess('修改成功！')
    } catch (err: any) {
      console.error('修改避雷条失败:', err)
      setError(err.message || '修改失败，请稍后重试')
    }
  }

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle()

      if (error) {
        setUserInfo({
          email: user?.email || '',
          avatar: user?.user_metadata?.avatar || '',
          nickname: user?.user_metadata?.nickname || '',
          gender: user?.user_metadata?.gender || '',
          birthday: user?.user_metadata?.birthday || ''
        })
      } else if (data) {
        setUserInfo({
          email: data.email || user?.email || '',
          avatar: data.avatar || user?.user_metadata?.avatar || '',
          nickname: data.nickname || user?.user_metadata?.nickname || '',
          gender: data.gender || user?.user_metadata?.gender || '',
          birthday: data.birthday || user?.user_metadata?.birthday || ''
        })
      } else {
        setUserInfo({
          email: user?.email || '',
          avatar: user?.user_metadata?.avatar || '',
          nickname: user?.user_metadata?.nickname || '',
          gender: user?.user_metadata?.gender || '',
          birthday: user?.user_metadata?.birthday || ''
        })
      }
    } catch (error) {
      setUserInfo({
        email: user?.email || '',
        avatar: user?.user_metadata?.avatar || '',
        nickname: user?.user_metadata?.nickname || '',
        gender: user?.user_metadata?.gender || '',
        birthday: user?.user_metadata?.birthday || ''
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      let avatarUrl = userInfo.avatar

      if (avatar) {
        const { data, error: uploadError } = await supabase
          .storage
          .from('user-avatars')
          .upload(`user_${user?.id}/${Date.now()}-${avatar.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`, avatar, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: urlData } = supabase
          .storage
          .from('user-avatars')
          .getPublicUrl(data.path)

        avatarUrl = urlData.publicUrl
      }

      if (!avatarUrl) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar')
          .eq('id', user?.id)
          .single()
        
        if (profileData && profileData.avatar) {
          avatarUrl = profileData.avatar
        }
      }

      const { error: updateError } = await supabase
        .auth
        .updateUser({
          data: {
            avatar: avatarUrl,
            nickname: userInfo.nickname,
            gender: userInfo.gender,
            birthday: userInfo.birthday
          }
        })

      if (updateError) {
        throw updateError
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: user?.email,
          avatar: avatarUrl,
          nickname: userInfo.nickname,
          gender: userInfo.gender,
          birthday: userInfo.birthday,
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('更新 profiles 表失败:', profileError)
      }

      setUserInfo(prev => ({
        ...prev,
        avatar: avatarUrl,
        nickname: userInfo.nickname,
        gender: userInfo.gender,
        birthday: userInfo.birthday
      }))

      setSuccess('个人信息更新成功！')
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error('更新个人信息失败:', err)
      setError(err.message || '更新个人信息失败，请稍后重试')
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0])
      setPreviewAvatar(URL.createObjectURL(e.target.files[0]))
    }
  }

  const handleAvatarClick = () => {
    setShowAvatarModal(true)
  }

  const handleCloseModal = () => {
    setShowAvatarModal(false)
    setPreviewAvatar(null)
  }

  const handleSaveAvatar = async () => {
    if (!avatar) return

    try {
      const { data, error: uploadError } = await supabase
        .storage
        .from('user-avatars')
        .upload(`user_${user?.id}/${Date.now()}-${avatar.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`, avatar, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: urlData } = supabase
        .storage
        .from('user-avatars')
        .getPublicUrl(data.path)

      const avatarUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .auth
        .updateUser({
          data: {
            avatar: avatarUrl,
            nickname: userInfo.nickname,
            gender: userInfo.gender,
            birthday: userInfo.birthday
          }
        })

      if (updateError) {
        throw updateError
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: user?.email,
          avatar: avatarUrl,
          nickname: userInfo.nickname,
          gender: userInfo.gender,
          birthday: userInfo.birthday,
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('更新 profiles 表失败:', profileError)
      }

      setUserInfo({ ...userInfo, avatar: avatarUrl })
      setSuccess('头像更新成功！')
      setShowAvatarModal(false)
      setPreviewAvatar(null)
      
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error('更新头像失败:', err)
      setError(err.message || '更新头像失败，请稍后重试')
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

        {/* 错误和成功提示 */}
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

        {/* 个人信息卡片 */}
        <div className="glass-card p-8 mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-6 text-center">👤 个人资料</h1>
          
          <form onSubmit={handleSubmit}>
            {/* 头像区域 */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                {userInfo.avatar ? (
                  <img 
                    src={userInfo.avatar} 
                    alt="用户头像"
                    className="w-28 h-28 rounded-full object-cover border-4 border-white/50 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                    onClick={handleAvatarClick}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div 
                  className={`w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg cursor-pointer hover:scale-105 transition-transform ${userInfo.avatar ? 'hidden' : ''}`}
                  style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                  onClick={handleAvatarClick}
                >
                  {(userInfo.nickname || userInfo.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center text-white shadow-md">
                  ✏️
                </div>
              </div>
              <p className="text-sm text-gray-500">点击头像查看或编辑</p>
              <h2 className="text-xl font-bold text-gray-800 mt-2">{userInfo.nickname || userInfo.email}</h2>
            </div>

            {/* 表单字段 */}
            <div className="space-y-6">
              <div>
                <label htmlFor="nickname" className="block text-gray-700 font-medium mb-2">
                  ✨ 昵称
                </label>
                <input
                  type="text"
                  id="nickname"
                  className="glass-input w-full px-4 py-3 outline-none"
                  value={userInfo.nickname}
                  onChange={(e) => setUserInfo({ ...userInfo, nickname: e.target.value })}
                  placeholder="请输入昵称"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-gray-700 font-medium mb-2">
                  🌸 性别
                </label>
                <select
                  id="gender"
                  className="glass-input w-full px-4 py-3 outline-none"
                  value={userInfo.gender}
                  onChange={(e) => setUserInfo({ ...userInfo, gender: e.target.value })}
                >
                  <option value="">请选择</option>
                  <option value="男">👦 男</option>
                  <option value="女">👧 女</option>
                  <option value="其他">✨ 其他</option>
                </select>
              </div>

              <div>
                <label htmlFor="birthday" className="block text-gray-700 font-medium mb-2">
                  🎂 生日
                </label>
                <input
                  type="date"
                  id="birthday"
                  className="glass-input w-full px-4 py-3 outline-none"
                  value={userInfo.birthday}
                  onChange={(e) => setUserInfo({ ...userInfo, birthday: e.target.value })}
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                className="px-6 py-3 rounded-2xl text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all"
                onClick={() => router.back()}
              >
                取消
              </button>
              <button
                type="submit"
                className="glass-button px-8 py-3 text-white font-medium"
              >
                💾 保存修改
              </button>
            </div>
          </form>
        </div>

        {/* 我的避雷条 */}
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold gradient-text mb-6 flex items-center gap-2">
            <span>⚡</span> 我的避雷条
          </h2>
          
          {loadingBlacklist ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-pink-500 text-lg">✨ 加载中...</div>
            </div>
          ) : userBlacklistItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌸</div>
              <p className="text-gray-600 text-lg">暂无发布的避雷条</p>
              <p className="text-gray-400 text-sm mt-2">去主页面发布你的第一条避雷信息吧~</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userBlacklistItems.map((item) => (
                <div key={item.id} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-pink-500">⚠️</span> {item.team?.name || '未知战队'}
                      </h3>
                      {item.team?.region && (
                        <span className="text-xs text-pink-500 mt-1 inline-block px-2 py-1 bg-pink-100 rounded-full">
                          {item.team.region}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                        onClick={() => editBlacklistItem(item)}
                      >
                        ✏️ 编辑
                      </button>
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                        onClick={() => deleteBlacklistItem(item.id)}
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-4">
                    <p className="text-gray-700 leading-relaxed">{item.reason}</p>
                  </div>
                  
                  {item.evidence && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                      <span className="text-pink-400">📎</span>
                      <span>{item.evidence}</span>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-400 mt-4">
                    发布时间：{new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 编辑避雷条模态框 */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold gradient-text">✏️ 编辑避雷信息</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">战队名称</label>
                  <input 
                    type="text" 
                    className="glass-input w-full px-4 py-3"
                    value={editingItem.team?.name || ''}
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">避雷原因</label>
                  <textarea 
                    className="glass-input w-full px-4 py-3"
                    rows={4}
                    value={editingItem.reason}
                    onChange={(e) => setEditingItem({...editingItem, reason: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">证据</label>
                  <textarea 
                    className="glass-input w-full px-4 py-3"
                    rows={2}
                    value={editingItem.evidence || ''}
                    onChange={(e) => setEditingItem({...editingItem, evidence: e.target.value})}
                  />
                </div>
                
                <div className="flex justify-end gap-4">
                  <button 
                    className="px-6 py-3 rounded-2xl text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all"
                    onClick={() => setShowEditModal(false)}
                  >
                    取消
                  </button>
                  <button 
                    className="glass-button px-8 py-3 text-white font-medium"
                    onClick={saveEditedBlacklistItem}
                  >
                    💾 保存修改
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 头像编辑模态框 */}
        {showAvatarModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold gradient-text">✨ 编辑头像</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={handleCloseModal}
                >
                  ×
                </button>
              </div>
              
              <div className="flex flex-col items-center mb-6">
                {previewAvatar || userInfo.avatar ? (
                  <img 
                    src={previewAvatar || userInfo.avatar} 
                    alt="头像预览"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white/50 shadow-lg mb-4"
                  />
                ) : (
                  <div 
                    className="w-32 h-32 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-lg mb-4"
                    style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                  >
                    {(userInfo.nickname || userInfo.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="w-full px-4 py-3 glass-input"
                  onChange={handleAvatarChange}
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  className="px-6 py-3 rounded-2xl text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all"
                  onClick={handleCloseModal}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="glass-button px-8 py-3 text-white font-medium"
                  onClick={handleSaveAvatar}
                >
                  💾 保存头像
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
