'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import { ForumPost, ForumComment, getCategoryLabel, getCategoryColor } from '../../types/forum'
import { getPostById, getPostComments, createComment, togglePostLike, toggleCommentLike } from '../../services/forumService'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Image from 'next/image'

export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [post, setPost] = useState<ForumPost | null>(null)
  const [comments, setComments] = useState<ForumComment[]>([])
  const [commentContent, setCommentContent] = useState('')
  const [replyTo, setReplyTo] = useState<ForumComment | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [postImages, setPostImages] = useState<string[]>([])

  const fetchPostImages = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('forum-attachments')
        .list(`forum_posts/${postId}`)

      if (error) {
        console.error('获取图片失败:', error)
        return []
      }

      const images = (data as unknown as Array<{ name: string; isDirectory: boolean }>)
        .filter(item => !item.isDirectory)
        .map(item => {
          const { data: urlData } = supabase
            .storage
            .from('forum-attachments')
            .getPublicUrl(`forum_posts/${postId}/${item.name}`)
          return urlData.publicUrl
        })

      setPostImages(images)
      return images
    } catch (err) {
      console.error('获取图片失败:', err)
      return []
    }
  }, [])

  const fetchPost = useCallback(async () => {
    setLoading(true)
    try {
      const postData = await getPostById(postId, user?.id)
      setPost(postData)

      // 获取帖子图片
      await fetchPostImages(postId)

      const commentsData = await getPostComments(postId, user?.id)
      setComments(commentsData)
    } catch (err) {
      console.error('获取帖子详情失败:', err)
      setError(err instanceof Error ? err.message : '获取帖子详情失败')
    } finally {
      setLoading(false)
    }
  }, [postId, user, fetchPostImages])

  useEffect(() => {
    if (postId) {
      fetchPost()
    }
  }, [postId, user, fetchPost])

  const handlePostLike = async () => {
    if (!user || !post) return

    try {
      const isLiked = await togglePostLike(postId, user.id)
      setPost(prev => prev ? { ...prev, is_liked: isLiked, like_count: isLiked ? prev.like_count + 1 : prev.like_count - 1 } : null)
    } catch (err) {
      console.error('点赞失败:', err)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !commentContent.trim()) return

    try {
      await createComment({
        post_id: postId,
        content: commentContent
      }, user.id)

      setCommentContent('')
      fetchPost()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发表评论失败')
    }
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !replyTo || !replyContent.trim()) return

    try {
      await createComment({
        post_id: postId,
        parent_id: replyTo.id,
        content: replyContent
      }, user.id)

      setReplyTo(null)
      setReplyContent('')
      fetchPost()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发表回复失败')
    }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!user) return

    try {
      await toggleCommentLike(commentId, user.id)
      fetchPost()
    } catch (err) {
      console.error('点赞失败:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="card p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 text-lg">帖子不存在</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => router.back()}
          className="mb-6 text-primary-500 hover:text-primary-600 btn-secondary px-4 py-2 rounded-lg"
        >
          ← 返回
        </button>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* 帖子内容 */}
        <div className="card p-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
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

          <h1 className="text-3xl font-bold text-gray-800 mb-6">{post.title}</h1>

          <div className="flex items-center gap-4 mb-6">
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
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold bg-primary-500"
              >
                {(post.author?.nickname || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium text-gray-800">{post.author?.nickname || '匿名用户'}</div>
              <div className="text-sm text-gray-500">{new Date(post.created_at).toLocaleString()}</div>
            </div>
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* 帖子图片 */}
          {postImages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {postImages.map((image, index) => (
                <div key={index} className="relative">
                  <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-white/50">
                    <Image
                      src={image}
                      alt={`帖子图片 ${index + 1}`}
                      width={300}
                      height={300}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span>👁</span> {post.view_count} 浏览
              </span>
              <span className="flex items-center gap-1">
                <span>💬</span> {post.comment_count} 评论
              </span>
            </div>
            <button
              onClick={handlePostLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${post.is_liked
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <span>{post.is_liked ? '❤️' : '🤍'}</span>
              <span>{post.like_count}</span>
            </button>
          </div>
        </div>

        {/* 发表评论 */}
        {user && !post.is_locked && (
          <div className="card p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">发表评论</h3>
            <form onSubmit={handleCommentSubmit}>
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="写下你的评论..."
                className="w-full px-4 py-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary px-6 py-3 text-white font-medium"
                  disabled={!commentContent.trim()}
                >
                  发表评论
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 评论列表 */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            评论 ({post.comment_count})
          </h3>

          {comments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-gray-600">暂无评论</p>
              <p className="text-gray-400 text-sm mt-2">快来发表第一条评论吧~</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start gap-4">
                    {comment.author?.avatar ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                        <Image
                          src={comment.author.avatar}
                          alt={comment.author.nickname || '用户'}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-primary-500"
                      >
                        {(comment.author?.nickname || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800">{comment.author?.nickname || '匿名用户'}</span>
                        <span className="text-sm text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                      </div>

                      <p className="text-gray-700 mb-3">{comment.content}</p>

                      <div className="flex items-center gap-4 text-sm">
                        <button
                          onClick={() => handleCommentLike(comment.id)}
                          className={`flex items-center gap-1 ${comment.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                          <span>{comment.is_liked ? '❤️' : '🤍'}</span>
                          <span>{comment.like_count}</span>
                        </button>
                        {user && !post.is_locked && (
                          <button
                            onClick={() => setReplyTo(comment)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            回复
                          </button>
                        )}
                      </div>

                      {/* 回复列表 */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 ml-4 space-y-4">
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="flex items-start gap-3">
                              {reply.author?.avatar ? (
                                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/50">
                                  <Image
                                    src={reply.author.avatar}
                                    alt={reply.author.nickname || '用户'}
                                    width={32}
                                    height={32}
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-primary-500"
                                >
                                  {(reply.author?.nickname || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-800 text-sm">{reply.author?.nickname || '匿名用户'}</span>
                                  <span className="text-xs text-gray-500">{new Date(reply.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-700 text-sm mb-2">{reply.content}</p>
                                <button
                                  onClick={() => handleCommentLike(reply.id)}
                                  className={`flex items-center gap-1 text-xs ${reply.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                  <span>{reply.is_liked ? '❤️' : '🤍'}</span>
                                  <span>{reply.like_count}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 回复模态框 */}
        {replyTo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">回复 @{replyTo.author?.nickname || '用户'}</h3>
                <button
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => {
                    setReplyTo(null)
                    setReplyContent('')
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleReplySubmit}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="写下你的回复..."
                  className="w-full px-4 py-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                />
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    className="btn-secondary px-6 py-3 text-gray-700 font-medium"
                    onClick={() => {
                      setReplyTo(null)
                      setReplyContent('')
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-6 py-3 text-white font-medium"
                    disabled={!replyContent.trim()}
                  >
                    发送回复
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}