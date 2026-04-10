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
  const [showPreview, setShowPreview] = useState(false)

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

  // 内容验证函数
  const validateContent = (content: string) => {
    const issues: string[] = []
    
    if (content.length < 10) {
      issues.push('内容至少需要10个字符')
    }
    
    if (content.length > 5000) {
      issues.push('内容不能超过5000个字符')
    }
    
    // 检查过度重复的内容
    const words = content.split(/\s+/).filter(w => w.length > 0)
    const wordCount: Record<string, number> = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })
    const mostFrequent = Object.entries(wordCount).sort((a, b) => b[1] - a[1])[0]
    if (mostFrequent && mostFrequent[1] > words.length * 0.5 && words.length > 10) {
      issues.push('请避免过度重复相同内容')
    }
    
    return issues
  }

  // 简单的内容格式化
  const formatContent = (content: string) => {
    // 移除多余的空行
    return content.replace(/\n{3,}/g, '\n\n').trim()
  }

  // 敏感词检测（简单示例）
  const checkSensitiveWords = (content: string) => {
    const sensitiveWords = ['广告', '推销', '链接']
    const found: string[] = []
    sensitiveWords.forEach(word => {
      if (content.includes(word)) {
        found.push(word)
      }
    })
    return found
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

    // 验证内容
    const contentIssues = validateContent(formData.content)
    if (contentIssues.length > 0) {
      setError(contentIssues.join('；'))
      return
    }

    // 检查敏感词
    const sensitiveWords = checkSensitiveWords(formData.title + ' ' + formData.content)
    if (sensitiveWords.length > 0) {
      setError(`内容包含不适合的词汇：${sensitiveWords.join('、')}`)
      return
    }

    setLoading(true)

    try {
      if (!user) {
        throw new Error('请先登录')
      }

      const formattedContent = formatContent(formData.content)

      const data = {
        title: formData.title,
        content: formattedContent,
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
      <div className="container mx-auto px-4 pt-24 md:pt-28 pb-8">
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
            {/* 格式指导提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <span>💡</span> 发帖规范
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 标题清晰简洁，5-100个字符</li>
                <li>• 内容详细具体，10-5000个字符</li>
                <li>• 选择合适的分类，便于其他用户查找</li>
                <li>• 禁止发布广告、推销等违规内容</li>
                <li>• 支持上传最多3张图片</li>
              </ul>
            </div>

            {/* 帖子标题 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="title" className="block text-gray-700 font-medium">
                  帖子标题 *
                </label>
                <span className={`text-sm ${formData.title.length >= 5 && formData.title.length <= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.title.length}/100
                </span>
              </div>
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
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="content" className="block text-gray-700 font-medium">
                  帖子内容 *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                      showPreview ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {showPreview ? '编辑' : '预览'}
                  </button>
                  <span className={`text-sm ${
                    formData.content.length >= 10 && formData.content.length <= 5000 
                      ? 'text-green-600' 
                      : formData.content.length > 5000 
                        ? 'text-red-500' 
                        : 'text-gray-500'
                  }`}>
                    {formData.content.length}/5000
                  </span>
                </div>
              </div>
              
              {showPreview ? (
                <div className="glass-input w-full px-4 py-3 min-h-[200px] whitespace-pre-wrap">
                  {formData.content || <span className="text-gray-400">暂无内容</span>}
                </div>
              ) : (
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="请输入帖子内容（至少10个字符）&#10;&#10;提示：&#10;• 分段描述，便于阅读&#10;• 详细说明你的问题或想法&#10;• 可以上传图片辅助说明"
                  className="glass-input w-full px-4 py-3"
                  rows={10}
                  required
                  minLength={10}
                  maxLength={5000}
                />
              )}
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