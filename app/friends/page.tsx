'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

interface User {
  id: string
  email: string
  nickname: string
  avatar: string
  status: string
  last_seen: string
}

interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  created_at: string
  sender: User
}

interface Friend {
  id: string
  friend_id: string
  user: User
  status: string
}

export default function FriendsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
    } else {
      fetchFriends()
      fetchFriendRequests()
    }
  }, [user, router])

  const fetchFriends = async () => {
    try {
      // 获取已接受的好友关系
      const { data: friendData, error } = await supabase
        .from('friends')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          profiles(sender_id: id, nickname, email, avatar),
          profiles(receiver_id: id, nickname, email, avatar)
        `)
        .or(`and(sender_id.eq.${user?.id},status.eq.accepted),and(receiver_id.eq.${user?.id},status.eq.accepted)`)

      if (error) {
        throw error
      }

      if (friendData) {
        const processedFriends: Friend[] = friendData.map((item) => {
          const isSender = item.sender_id === user?.id
          const friendId = isSender ? item.receiver_id : item.sender_id
          const friendProfile = isSender ? item.profiles : item.profiles

          return {
            id: item.id,
            friend_id: friendId,
            user: {
              id: friendId,
              email: friendProfile?.email || '',
              nickname: friendProfile?.nickname || friendProfile?.email?.split('@')[0] || '未知用户',
              avatar: friendProfile?.avatar || '',
              status: 'offline',
              last_seen: new Date().toISOString()
            },
            status: item.status
          }
        })

        // 获取好友在线状态
        for (const friend of processedFriends) {
          const { data: statusData } = await supabase
            .from('user_status')
            .select('status, last_seen')
            .eq('user_id', friend.friend_id)
            .single()

          if (statusData) {
            friend.user.status = statusData.status
            friend.user.last_seen = statusData.last_seen
          }
        }

        setFriends(processedFriends)
      }
    } catch (err: unknown) {
      console.error('获取好友列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      // 获取收到的好友请求
      const { data: requestData, error } = await supabase
        .from('friends')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          profiles(sender_id: id, nickname, email, avatar)
        `)
        .eq('receiver_id', user?.id)
        .eq('status', 'pending')

      if (error) {
        throw error
      }

      if (requestData) {
        const processedRequests: FriendRequest[] = requestData.map((item) => ({
          id: item.id,
          sender_id: item.sender_id,
          receiver_id: item.receiver_id,
          status: item.status,
          created_at: item.created_at,
          sender: {
            id: item.sender_id,
            email: item.profiles?.email || '',
            nickname: item.profiles?.nickname || item.profiles?.email?.split('@')[0] || '未知用户',
            avatar: item.profiles?.avatar || '',
            status: 'offline',
            last_seen: new Date().toISOString()
          }
        }))

        setFriendRequests(processedRequests)
      }
    } catch (err: unknown) {
      console.error('获取好友请求失败:', err)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      // 搜索用户
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nickname, avatar')
        .ilike('nickname', `%${searchQuery}%`)
        .or(`ilike(email, %${searchQuery}%)`)
        .neq('id', user?.id)

      if (error) {
        throw error
      }

      if (data) {
        const processedResults: User[] = data.map((user) => ({
          id: user.id,
          email: user.email,
          nickname: user.nickname || user.email?.split('@')[0] || '未知用户',
          avatar: user.avatar || '',
          status: 'offline',
          last_seen: new Date().toISOString()
        }))

        setSearchResults(processedResults)
      }
    } catch (err: unknown) {
      console.error('搜索用户失败:', err)
      setError('搜索失败，请稍后重试')
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (userId: string) => {
    try {
      // 检查是否已经存在好友关系
      const { data: existing, error: checkError } = await supabase
        .from('friends')
        .select('id')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user?.id})`)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existing) {
        setError('已经发送过好友请求或已经是好友')
        return
      }

      // 发送好友请求
      const { error } = await supabase
        .from('friends')
        .insert({
          sender_id: user?.id,
          receiver_id: userId,
          status: 'pending'
        })

      if (error) {
        throw error
      }

      setSuccess('好友请求已发送')
      setSearchResults(prev => prev.filter(user => user.id !== userId))
    } catch (err: unknown) {
      console.error('发送好友请求失败:', err)
      setError('发送好友请求失败，请稍后重试')
    }
  }

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      if (error) {
        throw error
      }

      setSuccess('好友请求已接受')
      fetchFriends()
      fetchFriendRequests()
    } catch (err: unknown) {
      console.error('接受好友请求失败:', err)
      setError('接受好友请求失败，请稍后重试')
    }
  }

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', requestId)

      if (error) {
        throw error
      }

      setSuccess('好友请求已拒绝')
      fetchFriendRequests()
    } catch (err: unknown) {
      console.error('拒绝好友请求失败:', err)
      setError('拒绝好友请求失败，请稍后重试')
    }
  }

  const removeFriend = async (friendId: string) => {
    if (!confirm('确定要删除这个好友吗？')) return

    try {
      // 查找好友关系记录
      const { data: friendData, error: findError } = await supabase
        .from('friends')
        .select('id')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user?.id})`)
        .single()

      if (findError) {
        throw findError
      }

      if (friendData) {
        const { error } = await supabase
          .from('friends')
          .delete()
          .eq('id', friendData.id)

        if (error) {
          throw error
        }

        setSuccess('好友已删除')
        fetchFriends()
      }
    } catch (err: unknown) {
      console.error('删除好友失败:', err)
      setError('删除好友失败，请稍后重试')
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

        {/* 页面标题 */}
        <h1 className="text-2xl font-bold gradient-text mb-8 text-center">👥 好友系统</h1>

        {/* 搜索用户 */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span>🔍</span> 添加好友
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户昵称或邮箱..."
              className="flex-1 glass-input px-4 py-3"
            />
            <button
              type="submit"
              className="glass-button px-6 py-3 text-white font-medium"
              disabled={searching}
            >
              {searching ? '搜索中...' : '搜索'}
            </button>
          </form>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {searchResults.map((result) => (
                <div key={result.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {result.avatar ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50">
                        <Image 
                          src={result.avatar} 
                          alt={result.nickname}
                          width={48}
                          height={48}
                          className="object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      </div>
                    ) : null}
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${result.avatar ? 'hidden' : ''}`}
                      style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                    >
                      {result.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{result.nickname}</h3>
                      <p className="text-sm text-gray-500">{result.email}</p>
                    </div>
                  </div>
                  <button
                    className="glass-button px-4 py-2 text-white text-sm font-medium"
                    onClick={() => sendFriendRequest(result.id)}
                  >
                    发送请求
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 好友请求 */}
        {friendRequests.length > 0 && (
          <div className="glass-card p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>📋</span> 好友请求
            </h2>
            <div className="space-y-3">
              {friendRequests.map((request) => (
                <div key={request.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {request.sender.avatar ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50">
                        <Image 
                          src={request.sender.avatar} 
                          alt={request.sender.nickname}
                          width={48}
                          height={48}
                          className="object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      </div>
                    ) : null}
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${request.sender.avatar ? 'hidden' : ''}`}
                      style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                    >
                      {request.sender.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{request.sender.nickname}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                      onClick={() => acceptFriendRequest(request.id)}
                    >
                      接受
                    </button>
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                      onClick={() => rejectFriendRequest(request.id)}
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 好友列表 */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span>👥</span> 我的好友
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌸</div>
              <p className="text-gray-600 text-lg">暂无好友</p>
              <p className="text-gray-400 text-sm mt-2">搜索用户并发送好友请求吧~</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.friend_id} className="glass-card p-4 flex items-center justify-between hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-4">
                    {friend.user.avatar ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50">
                        <Image 
                          src={friend.user.avatar} 
                          alt={friend.user.nickname}
                          width={48}
                          height={48}
                          className="object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ${friend.user.status === 'online' ? 'bg-green-500' : friend.user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                      </div>
                    ) : null}
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${friend.user.avatar ? 'hidden' : ''}`}
                      style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                    >
                      <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ${friend.user.status === 'online' ? 'bg-green-500' : friend.user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                      {friend.user.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{friend.user.nickname}</h3>
                      <p className="text-sm text-gray-500">
                        {friend.user.status === 'online' ? '在线' : 
                         friend.user.status === 'away' ? '离开' : 
                         `最后在线: ${new Date(friend.user.last_seen).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                    onClick={() => removeFriend(friend.friend_id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
