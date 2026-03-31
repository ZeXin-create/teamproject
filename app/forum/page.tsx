'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { PostCategory, ForumPost, PostQueryParams, getCategoryLabel, getCategoryColor } from '../types/forum'
import { getPosts } from '../services/forumService'
import Navbar from '../components/Navbar'
import Image from 'next/image'

export default function ForumPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<ForumPost[]>([])

  const [filters, setFilters] = useState<PostQueryParams>({
    category: undefined,
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    limit: 20
  })

  const [searchQuery, setSearchQuery] = useState('')

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPosts(filters)
      setPosts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取帖子列表失败')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchPosts()
  }, [filters, fetchPosts])

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters(prev => ({
      ...prev,
      search: searchQuery
    }))
  }

  const categories = Object.values(PostCategory)

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2"
              onClick={() => router.push('/')}
            >
              <span>←</span> 返回主页面
            </button>
            <h1 className="text-3xl font-bold gradient-text">王者荣耀贴吧</h1>
          </div>
          <button
            onClick={() => router.push(user ? '/forum/new' : '/auth/login')}
            className="glass-button px-6 py-3 text-white font-medium"
          >
            发布帖子
          </button>
        </div>

        {/* 筛选条件 */}
        <div className="glass-card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">分类</label>
              <select
                name="category"
                value={filters.category || ''}
                onChange={handleFilterChange}
                className="glass-input w-full px-4 py-2"
              >
                <option value="">全部</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">排序</label>
              <select
                name="sort_by"
                value={filters.sort_by}
                onChange={handleFilterChange}
                className="glass-input w-full px-4 py-2"
              >
                <option value="created_at">最新发布</option>
                <option value="view_count">浏览最多</option>
                <option value="like_count">点赞最多</option>
                <option value="comment_count">评论最多</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-2">搜索</label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索帖子..."
                  className="glass-input flex-1 px-4 py-2"
                />
                <button
                  type="submit"
                  className="glass-button px-6 py-2 text-white font-medium"
                >
                  搜索
                </button>
              </form>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 text-lg">暂无帖子</p>
            <p className="text-gray-400 text-sm mt-2">快来发布第一个帖子吧~</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post.id}
                className="glass-card p-6 hover:scale-[1.01] transition-transform cursor-pointer"
                onClick={() => router.push(`/forum/${post.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* 作者头像 */}
                  <div className="flex-shrink-0">
                    {post.author?.avatar ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50">
                        <Image
                          src={post.author.avatar}
                          alt={post.author.nickname || '用户'}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                        style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                      >
                        {(post.author?.nickname || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 帖子内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">
                          置顶
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(post.category)}`}>
                        {getCategoryLabel(post.category)}
                      </span>
                      {post.team && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                          {post.team.name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">
                      {post.title}
                    </h3>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>{post.author?.nickname || '匿名用户'}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span>👁</span> {post.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>❤️</span> {post.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>💬</span> {post.comment_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}