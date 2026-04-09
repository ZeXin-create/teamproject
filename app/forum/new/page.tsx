'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import { PostCategory, getCategoryLabel } from '../../types/forum'
import { createPost } from '../../services/forumService'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Image from 'next/image'

interface Team {
  id: string
  name: string
}

export default function NewPostPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: PostCategory.OFF_TOPIC,
    team_id: ''
  })

  const fetchUserTeams = useCallback(async () => {
    try {
      // 获取用户所在的战队
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')

      if (memberData && memberData.length > 0) {
        const teamIds = (memberData as Array<{ team_id: string }>).map(m => m.team_id)
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds)

        if (teamsData) {
          setTeams(teamsData as Team[])
        }
      }
    } catch (err) {
      console.error('获取战队失败:', err)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchUserTeams()
    }
  }, [user, fetchUserTeams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length > 0) {
      // 限制最多3张图片
      const remainingSlots = 3 - images.length
      const newFiles = files.slice(0, remainingSlots)

      setImages(prev => [...prev, ...newFiles])

      // 生成预览
      newFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const target = e.target;
          if (target?.result) {
            setImagePreviews(prev => [...prev, target.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (postId: string): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (const image of images) {
      try {
        const safeFileName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `forum_posts/${postId}/${safeFileName}`

        const { data, error: uploadError } = await supabase
          .storage
          .from('forum-attachments')
          .upload(filePath, image, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: urlData } = supabase
          .storage
          .from('forum-attachments')
          .getPublicUrl(data.path)

        uploadedUrls.push(urlData.publicUrl)
      } catch (error) {
        console.error('上传图片失败:', error)
      }
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!user) {
        throw new Error('请先登录')
      }

      const data = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        author_id: user.id,
        team_id: formData.team_id || undefined
      }

      const newPost = await createPost(data)

      // 上传图片
      if (images.length > 0) {
        await uploadImages(newPost.id)
      }

      setSuccess('帖子发布成功！')

      setTimeout(() => {
        router.push('/forum')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const categories = Object.values(PostCategory)

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold gradient-text mb-6 text-center">发布帖子</h1>

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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 帖子标题 */}
            <div>
              <label htmlFor="title" className="block text-gray-700 font-medium mb-2">
                帖子标题 *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="请输入帖子标题（5-100个字符）"
                className="glass-input w-full px-4 py-3"
                required
                minLength={5}
                maxLength={100}
              />
            </div>

            {/* 帖子分类 */}
            <div>
              <label htmlFor="category" className="block text-gray-700 font-medium mb-2">
                帖子分类 *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3"
                required
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* 关联战队 */}
            {teams.length > 0 && (
              <div>
                <label htmlFor="team_id" className="block text-gray-700 font-medium mb-2">
                  关联战队（可选）
                </label>
                <select
                  id="team_id"
                  name="team_id"
                  value={formData.team_id}
                  onChange={handleChange}
                  className="glass-input w-full px-4 py-3"
                >
                  <option value="">不关联战队</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 帖子内容 */}
            <div>
              <label htmlFor="content" className="block text-gray-700 font-medium mb-2">
                帖子内容 *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="请输入帖子内容（至少10个字符）"
                className="glass-input w-full px-4 py-3"
                rows={10}
                required
                minLength={10}
              />
            </div>

            {/* 图片上传 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                图片（最多3张）
              </label>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-white/50">
                      <Image
                        src={preview}
                        alt={`图片 ${index + 1}`}
                        width={150}
                        height={150}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <div className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <label className="cursor-pointer text-center">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="text-gray-500">
                        <div className="text-2xl mb-1">📷</div>
                        <div className="text-sm">点击上传</div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                取消
              </button>
              <button
                type="submit"
                className="glass-button px-6 py-3 text-white font-medium"
                disabled={loading}
              >
                {loading ? '发布中...' : '发布帖子'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}