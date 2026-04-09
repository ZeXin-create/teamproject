'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Image from 'next/image'

// 包装 useSearchParams 的组件
function SearchParamsWrapper({ children }: { children: (searchParams: ReturnType<typeof useSearchParams>) => React.ReactNode }) {
  const searchParams = useSearchParams()
  return children(searchParams)
}

export default function RecruitPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // 状态定义
  const [title, setTitle] = useState('')
  const [position, setPosition] = useState('')
  const [rank, setRank] = useState('')
  const [membersNeeded, setMembersNeeded] = useState(1)
  const [requirements, setRequirements] = useState('')
  const [contact, setContact] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [teamId, setTeamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editId, setEditId] = useState<string | null>(null)

  const positions = ['上单', '打野', '中单', '射手', '辅助', '任意位置']
  const ranks = ['青铜', '白银', '黄金', '铂金', '钻石', '星耀', '王者']

  // 获取用户战队信息
  const fetchUserTeam = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) {
        console.error('获取用户战队信息失败:', error)
        setError('获取战队信息失败')
      } else if (data && data.length > 0) {
        setTeamId((data as Array<{ team_id: string }>)[0].team_id)
      } else {
        setError('您还没有加入战队')
      }
    } catch (error) {
      console.error('获取用户战队信息失败:', error)
      setError('获取战队信息失败')
    }
  }, [user])

  // 获取编辑的招募信息
  const fetchRecruitInfo = useCallback(async () => {
    if (!editId || !teamId) return

    try {
      const { data, error } = await supabase
        .from('team_recruits')
        .select('*')
        .eq('id', editId)
        .eq('team_id', teamId)
        .single()

      if (error) {
        console.error('获取招募信息失败:', error)
        setError('获取招募信息失败')
      } else {
        setTitle(data.title)
        setPosition(data.position)
        setRank(data.rank)
        setMembersNeeded(data.members_needed)
        setRequirements(data.requirements)
        setContact(data.contact)
        setImageUrl(data.image_url || '')
      }
    } catch (error) {
      console.error('获取招募信息失败:', error)
      setError('获取招募信息失败')
    }
  }, [editId, teamId])

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = '请输入招募标题'
    }

    if (!position) {
      newErrors.position = '请选择招募位置'
    }

    if (!rank) {
      newErrors.rank = '请选择段位要求'
    }

    if (membersNeeded < 1 || membersNeeded > 10) {
      newErrors.membersNeeded = '需求人数应在1-10之间'
    }

    if (!contact.trim()) {
      newErrors.contact = '请输入联系方式'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    if (!teamId) return

    try {
      // 获取当前用户
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error('请先登录')
      }

      // 生成纯 UUID 文件名（不带后缀）
      const fileName = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
      const filePath = `${authUser.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(filePath, file, {
          contentType: file.type, // 关键：指定 MIME 类型，让 Supabase 识别图片
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('上传错误详情:', uploadError)
        throw uploadError
      }

      // 获取公开 URL（Supabase 会自动处理，无需加后缀）
      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('上传图片失败:', error)
      throw error
    }
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    if (!teamId) {
      setError('未找到战队信息')
      return
    }

    setLoading(true)

    try {
      let finalImageUrl = imageUrl

      // 上传图片
      if (image) {
        const uploadedUrl = await handleImageUpload(image)
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl
        }
      }

      const recruitData = {
        title,
        position,
        rank,
        members_needed: membersNeeded,
        requirements,
        contact,
        status: 'active',
        image_url: finalImageUrl
      }

      if (editId) {
        // 更新招募信息
        const { error } = await supabase
          .from('team_recruits')
          .update(recruitData)
          .eq('id', editId)
          .eq('team_id', teamId)

        if (error) {
          throw error
        }

        setSuccess('招募信息更新成功！')
      } else {
        // 创建新招募
        const { error } = await supabase
          .from('team_recruits')
          .insert({
            ...recruitData,
            team_id: teamId,
            created_by: user?.id
          })

        if (error) {
          throw error
        }

        setSuccess('招募信息发布成功！')
      }

      // 重置表单
      if (!editId) {
        setTitle('')
        setPosition('')
        setRank('')
        setMembersNeeded(1)
        setRequirements('')
        setContact('')
        setImage(null)
        setImageUrl('')
      }

      // 跳转到招募管理页面
      setTimeout(() => {
        router.push('/teams/recruitment-management')
      }, 1000)
    } catch (error) {
      console.error('提交失败:', error)
      setError(error instanceof Error ? error.message : '提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserTeam()
    } else {
      router.push('/auth/login')
    }
  }, [user, fetchUserTeam, router])

  useEffect(() => {
    if (teamId && editId) {
      fetchRecruitInfo()
    }
  }, [teamId, editId, fetchRecruitInfo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="glass-card p-12 text-center"><div className="animate-pulse text-pink-500 text-lg">✨ 加载中...</div></div></div>}>
      <SearchParamsWrapper>
        {(searchParams) => {
          // 设置 editId
          if (searchParams.get('edit') !== editId) {
            setEditId(searchParams.get('edit'))
          }

          return (
            <div className="min-h-screen">
              <Navbar />
              <div className="container mx-auto px-4 pt-24 pb-8">
                <div className="flex items-center mb-6">
                  <button
                    onClick={() => router.back()}
                    className="btn-secondary px-4 py-2 mr-4"
                  >
                    ← 返回
                  </button>
                  <h1 className="text-2xl font-bold gradient-text">
                    {editId ? '编辑招募信息' : '发布招募信息'}
                  </h1>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-100 text-red-600 rounded-lg">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-green-100 text-green-600 rounded-lg">
                    {success}
                  </div>
                )}

                <div className="card p-6">
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 基本信息 */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 mb-2">
                            招募标题 *
                          </label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => {
                              if (!title.trim()) {
                                setErrors(prev => ({ ...prev, title: '请输入招募标题' }))
                              } else {
                                setErrors(prev => {
                                  const newErrors = { ...prev }
                                  delete newErrors.title
                                  return newErrors
                                })
                              }
                            }}
                            className="input w-full"
                            placeholder="例如：招收钻石以上打野"
                          />
                          {errors.title && (
                            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-gray-700 mb-2">
                            招募位置 *
                          </label>
                          <select
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            onBlur={() => {
                              if (!position) {
                                setErrors(prev => ({ ...prev, position: '请选择招募位置' }))
                              } else {
                                setErrors(prev => {
                                  const newErrors = { ...prev }
                                  delete newErrors.position
                                  return newErrors
                                })
                              }
                            }}
                            className="input w-full"
                          >
                            <option value="">请选择位置</option>
                            {positions.map((pos) => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                          {errors.position && (
                            <p className="text-red-500 text-sm mt-1">{errors.position}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-gray-700 mb-2">
                            段位要求 *
                          </label>
                          <select
                            value={rank}
                            onChange={(e) => setRank(e.target.value)}
                            onBlur={() => {
                              if (!rank) {
                                setErrors(prev => ({ ...prev, rank: '请选择段位要求' }))
                              } else {
                                setErrors(prev => {
                                  const newErrors = { ...prev }
                                  delete newErrors.rank
                                  return newErrors
                                })
                              }
                            }}
                            className="input w-full"
                          >
                            <option value="">请选择段位</option>
                            {ranks.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          {errors.rank && (
                            <p className="text-red-500 text-sm mt-1">{errors.rank}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-gray-700 mb-2">
                            需求人数 *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={membersNeeded}
                            onChange={(e) => setMembersNeeded(Number(e.target.value))}
                            onBlur={() => {
                              if (membersNeeded < 1 || membersNeeded > 10) {
                                setErrors(prev => ({ ...prev, membersNeeded: '需求人数应在1-10之间' }))
                              } else {
                                setErrors(prev => {
                                  const newErrors = { ...prev }
                                  delete newErrors.membersNeeded
                                  return newErrors
                                })
                              }
                            }}
                            className="input w-full"
                          />
                          {errors.membersNeeded && (
                            <p className="text-red-500 text-sm mt-1">{errors.membersNeeded}</p>
                          )}
                        </div>
                      </div>

                      {/* 其他信息 */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 mb-2">
                            联系方式 *
                          </label>
                          <input
                            type="text"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            onBlur={() => {
                              if (!contact.trim()) {
                                setErrors(prev => ({ ...prev, contact: '请输入联系方式' }))
                              } else {
                                setErrors(prev => {
                                  const newErrors = { ...prev }
                                  delete newErrors.contact
                                  return newErrors
                                })
                              }
                            }}
                            className="input w-full"
                            placeholder="例如：QQ 123456789"
                          />
                          {errors.contact && (
                            <p className="text-red-500 text-sm mt-1">{errors.contact}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-gray-700 mb-2">
                            招募要求
                          </label>
                          <textarea
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                            className="input w-full h-24"
                            placeholder="例如：要有团队意识，能经常在线..."
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 mb-2">
                            招募图片
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setImage(e.target.files[0])
                              }
                            }}
                            className="input w-full"
                          />
                          {imageUrl && (
                            <div className="mt-2 relative w-32 h-32">
                              <Image
                                src={imageUrl}
                                alt="招募图片"
                                width={128}
                                height={128}
                                className="object-cover rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn-secondary px-6 py-2"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="btn-primary px-6 py-2"
                        disabled={loading}
                      >
                        {loading ? '提交中...' : (editId ? '更新' : '发布')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )
        }}
      </SearchParamsWrapper>
    </Suspense>
  )
}