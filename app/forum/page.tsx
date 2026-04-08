'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { PostCategory, ForumPost, PostQueryParams, getCategoryLabel, getCategoryColor } from '../types/forum'
import { getPosts } from '../services/forumService'
import Navbar from '../components/Navbar'
import ErrorBoundary from '../components/ErrorBoundary'
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

  // 截取内容前50字作为摘要
  const getSummary = (content: string) => {
    return content.length > 50 ? content.substring(0, 50) + '...' : content
  }

  const categories = Object.values(PostCategory)

  // 骨架屏组件
  const SkeletonCard = () => (
    <div className="card p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-200"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                className="px-4 py-2 rounded-lg text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-colors flex items-center gap-2"
                onClick={() => router.push('/')}
              >
                <span>←</span> 返回主页面
              </button>
              <h1 className="text-3xl font-bold gradient-text">王者荣耀贴吧</h1>
            </div>
            <button
              onClick={() => router.push(user ? '/forum/new' : '/auth/login')}
              className="btn-primary px-6 py-3 text-white font-medium"
            >
              发布帖子
            </button>
          </div>
        </div>

        {/* 筛选条件 */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* 分类 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">分类：</span>
              <select
                name="category"
                value={filters.category || ''}
                onChange={handleFilterChange}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">全部</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 排序 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">排序：</span>
              <select
                name="sort_by"
                value={filters.sort_by}
                onChange={handleFilterChange}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="created_at">最新发布</option>
                <option value="view_count">浏览最多</option>
                <option value="like_count">点赞最多</option>
                <option value="comment_count">评论最多</option>
              </select>
            </div>
            
            {/* 搜索 */}
            <div className="flex-1 ml-auto">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索帖子..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-white font-medium"
                >
                  搜索
                </button>
              </form>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 text-lg">暂无帖子</p>
            <p className="text-gray-400 text-sm mt-2">快来发布第一个帖子吧~</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post.id}
                className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/forum/${post.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* 作者头像 */}
                  <div className="flex-shrink-0 relative">
                    {post.author?.avatar ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50">
                        <Image
                          src={post.author.avatar}
                          alt={post.author.nickname || '用户'}
                          width={48}
                          height={48}
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold bg-primary-500"
                      >
                        {(post.author?.nickname || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* 新兵/老兵标签 */}
                    <div className="absolute bottom-0 right-0 transform translate-x-1/4 translate-y-1/4 bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md">
                      {Math.random() > 0.5 ? '老兵' : '新兵'}
                    </div>
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
                      {getSummary(post.content)}
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

                  {/* 缩略图 */}
                  <div className="flex-shrink-0 hidden sm:block">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">📷</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 分页组件 */}
            {!loading && posts.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                  disabled={(filters.page || 1) <= 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-gray-600">
                  第 {(filters.page || 1)} 页
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </ErrorBoundary>
  )
}