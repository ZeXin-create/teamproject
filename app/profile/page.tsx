'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { getLevelProgress, getLevelTitle, getLevelColor } from '../lib/userLevels'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userInfo, setUserInfo] = useState({
    email: user?.email || '',
    avatar: '',
    nickname: '',
    gender: '',
    birthday: ''
  })
  const [avatar, setAvatar] = useState<File | null>(null)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  // 用户等级信息
  const [userLevel, setUserLevel] = useState({
    experience: 0,
    level: 1,
    activityScore: 0,
    contributionScore: 0,
    lastActive: new Date().toISOString()
  })

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle()

      if (data) {
        setUserInfo({
          email: data.email || user?.email || '',
          avatar: data.avatar || '',
          nickname: data.nickname || '',
          gender: data.gender || '',
          birthday: data.birthday || ''
        })
      } else {
        setUserInfo({
          email: user?.email || '',
          avatar: '',
          nickname: '',
          gender: '',
          birthday: ''
        })
      }
    } catch {
      setUserInfo({
        email: user?.email || '',
        avatar: '',
        nickname: '',
        gender: '',
        birthday: ''
      })
    } finally {
      setLoading(false)
    }
  }, [user])



  // 获取用户等级信息
  const fetchUserLevel = useCallback(async () => {
    if (!user) return

    try {
      // 尝试获取用户等级信息
      const { data, error } = await supabase
        .from('user_levels')
        .select('experience, level, activity_score, contribution_score, last_active')
        .eq('user_id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // 用户等级记录不存在，创建默认记录
        await supabase
          .from('user_levels')
          .insert({
            user_id: user.id,
            experience: 0,
            level: 1,
            activity_score: 0,
            contribution_score: 0
          })

        setUserLevel({
          experience: 0,
          level: 1,
          activityScore: 0,
          contributionScore: 0,
          lastActive: new Date().toISOString()
        })
      } else if (data) {
        setUserLevel({
          experience: data.experience,
          level: data.level,
          activityScore: data.activity_score,
          contributionScore: data.contribution_score,
          lastActive: data.last_active
        })
      }
    } catch (err) {
      console.error('获取用户等级信息失败:', err)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      // 使用setTimeout确保在渲染完成后执行导航
      setTimeout(() => {
        router.push('/auth/login')
      }, 0)
    } else {
      fetchUserProfile()
      fetchUserLevel()

      // 设置实时订阅，监听用户数据变化
      const subscription = supabase
        .channel('public:team_members')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${user.id}`
        }, () => {
          // 当战队成员状态变化时，刷新页面
          router.refresh()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [user, router, fetchUserProfile, fetchUserLevel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      let avatarUrl = userInfo.avatar

      // 立即显示预览头像，提供实时反馈
      if (avatar && previewAvatar) {
        setUserInfo(prev => ({
          ...prev,
          avatar: previewAvatar,
          nickname: userInfo.nickname,
          gender: userInfo.gender,
          birthday: userInfo.birthday
        }))
      }

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

      // 上传完成后更新为实际的头像URL
      setUserInfo(prev => ({
        ...prev,
        avatar: avatarUrl,
        nickname: userInfo.nickname,
        gender: userInfo.gender,
        birthday: userInfo.birthday
      }))

      setSuccess('个人信息更新成功！')
    } catch (err: unknown) {
      console.error('更新个人信息失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '更新个人信息失败，请稍后重试')
      // 出错时恢复原来的状态
      setUserInfo(prev => ({
        ...prev,
        nickname: userInfo.nickname,
        gender: userInfo.gender,
        birthday: userInfo.birthday
      }))
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

    setAvatarLoading(true)
    try {
      // 立即显示预览头像，提供实时反馈
      if (previewAvatar) {
        setUserInfo({ ...userInfo, avatar: previewAvatar })
      }

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

      // 上传完成后更新为实际的头像URL
      setUserInfo({ ...userInfo, avatar: avatarUrl })
      setSuccess('头像更新成功！')
      setShowAvatarModal(false)
      setPreviewAvatar(null)
    } catch (err: unknown) {
      console.error('更新头像失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '更新头像失败，请稍后重试')
      // 出错时恢复原来的头像
      setUserInfo({ ...userInfo })
    } finally {
      setAvatarLoading(false)
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
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏 */}
          <div className="hidden lg:block">
            <Sidebar type="profile" />
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
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
                      <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/50 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                        <Image
                          src={userInfo.avatar}
                          alt="用户头像"
                          width={112}
                          height={112}
                          className="object-cover"
                          priority // 首屏图片，设置优先级
                          onClick={handleAvatarClick}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      </div>
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

                  {/* 用户等级信息 */}
                  <div className="mt-4 w-full max-w-xs">
                    <div className="glass-card p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <span className={`font-bold ${getLevelColor(userLevel.level)}`}>
                            Lv.{userLevel.level} {getLevelTitle(userLevel.level)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          经验值: {userLevel.experience}
                        </div>
                      </div>

                      {/* 等级进度条 */}
                      <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
                        <div
                          className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${getLevelProgress(userLevel.level, userLevel.experience)}%` }}
                        ></div>
                      </div>

                      {/* 活跃度和贡献度 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <div className="text-sm text-gray-500 mb-1">活跃度</div>
                          <div className="font-bold text-blue-600">{userLevel.activityScore}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500 mb-1">贡献度</div>
                          <div className="font-bold text-pink-600">{userLevel.contributionScore}</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    onClick={() => router.push('/')}
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

            {/* 移动端导航（仅在小屏幕显示） */}
            <div className="lg:hidden mb-8">
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-4">快捷导航</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/friends" className="glass-card p-3 text-center hover:scale-105 transition-all duration-300">
                    <div className="text-xl mb-1">👥</div>
                    <div className="text-sm font-medium text-gray-800">我的好友</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 头像编辑模态框 */}
        {showAvatarModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-lg mb-4">
                    <Image
                      src={previewAvatar || userInfo.avatar}
                      alt="头像预览"
                      width={128}
                      height={128}
                      className="object-cover"
                    />
                  </div>
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
                  disabled={avatarLoading}
                >
                  {avatarLoading ? '保存中...' : '💾 保存头像'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
