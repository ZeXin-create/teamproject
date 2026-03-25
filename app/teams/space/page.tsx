'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'

interface Team {
  id: string
  name: string
  region: string
  province: string
  city: string
  district?: string
  declaration?: string
  avatar_url?: string
}





interface ChatMessage {
  id: string
  team_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
}

export default function TeamSpacePage() {
  const { user } = useAuth()
  const [hasTeam, setHasTeam] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  const checkUserTeam = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()
      
      if (error) {
        console.error('查询战队失败:', error)
        setHasTeam(false)
      } else if (data) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', data.team_id)
          .single()
        
        if (teamError) {
          console.error('查询战队详情失败:', teamError)
          setHasTeam(false)
        } else {
          setTeam(teamData)
          setHasTeam(true)
        }
      } else {
        setHasTeam(false)
      }
    } catch (error) {
      console.error('检查战队失败:', error)
      setHasTeam(false)
    } finally {
      setLoading(false)
    }
  }, [user])
  
  useEffect(() => {
    if (user) {
      checkUserTeam()
    } else {
      setLoading(false)
    }
  }, [user, checkUserTeam])
  
  // 缓存机制
  const [cache, setCache] = useState<Record<string, { data: ChatMessage[]; timestamp: number }>>({});
  

  

  
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageInput.trim() || !team) return
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          team_id: team.id,
          user_id: user?.id,
          content: messageInput
        })
        .select()
        .single()
      
      if (error) {
        console.error('发送消息失败:', error)
      } else {
        setChatMessages(prev => [...prev, {
          ...data,
          user_name: user?.email?.split('@')[0] || '匿名用户'
        }])
        setMessageInput('')
      }
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }, [messageInput, team, user])
  
  const fetchChatMessages = useCallback(async () => {
    if (!team) return
    
    // 检查缓存
    const cacheKey = `chat_messages_${team.id}`;
    const cachedData = cache[cacheKey];
    const now = Date.now();
    
    // 如果缓存存在且未过期（1分钟内）
    if (cachedData && (now - cachedData.timestamp) < 60 * 1000) {
      setChatMessages(cachedData.data);
      setLoadingMessages(false);
      return;
    }
    
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('获取聊天消息失败:', error)
      } else {
        // 为每条消息添加user_name字段
        const messagesWithUserName = data.map(message => ({
          ...message,
          user_name: message.user_id.substring(0, 8) // 使用用户ID前8位作为用户名
        }))
        const reversedMessages = messagesWithUserName.reverse();
        setChatMessages(reversedMessages);
        
        // 更新缓存
        setCache(prev => ({
          ...prev,
          [cacheKey]: {
            data: reversedMessages,
            timestamp: now
          }
        }));
      }
    } catch (error) {
      console.error('获取聊天消息失败:', error)
    } finally {
      setLoadingMessages(false)
    }
  }, [team, cache])
  
  useEffect(() => {
    if (team) {
      fetchChatMessages()
      
      // 设置实时订阅
      const subscription = supabase
        .channel(`team_chat_${team.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `team_id=eq.${team.id}`
        }, (payload) => {
          // 新消息插入时更新聊天记录
          const newMessage: ChatMessage = {
            id: payload.new.id,
            team_id: payload.new.team_id,
            user_id: payload.new.user_id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            user_name: payload.new.user_id.substring(0, 8)
          };
          setChatMessages(prev => [...prev, newMessage]);
        })
        .subscribe();
      
      // 清理订阅
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [team, fetchChatMessages])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!hasTeam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">您还没有加入战队</h1>
          <p className="mt-4 text-gray-600">请先创建或加入一个战队</p>
          <div className="mt-8 flex space-x-4 justify-center">
            <Link href="/teams/new" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              创建战队
            </Link>
            <Link href="/teams/join" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
              加入战队
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* 战队信息 */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              {team?.avatar_url ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                  <Image 
                    src={team.avatar_url} 
                    alt={team.name} 
                    width={80} 
                    height={80} 
                    className="object-cover"
                    loading="lazy" // 启用懒加载
                    priority={false} // 非首屏图片不需要优先级
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}>
                  <span className="text-white text-2xl font-bold">{team?.name?.charAt(0) || ''}</span>
                </div>
              )}
              <div className="ml-6">
                <h1 className="text-2xl font-bold gradient-text">{team?.name || ''}</h1>
                <p className="mt-2 text-gray-600">{team?.region} · {team?.province} · {team?.city}</p>
                {team?.declaration && (
                  <p className="mt-3 text-gray-700">{team.declaration}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-4">
              <Link href="/teams/manage" className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium">
                管理战队
              </Link>
              <Link href="/teams/recruit" className="glass-button px-4 py-2 text-white font-medium">
                招募队员
              </Link>
            </div>
          </div>
          
          {/* 功能导航 */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <Link href="/teams/edit" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">✏️</div>
              <div className="font-medium text-gray-800">编辑资料</div>
            </Link>
            <Link href="/teams/applications" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium text-gray-800">申请管理</div>
            </Link>

            <Link href="/teams/matches" className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-medium text-gray-800">战队赛记录</div>
            </Link>
          </div>
        </div>
        

        
        {/* 战队聊天 */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold gradient-text mb-6">战队聊天</h2>
          
          <div className="h-96 glass-input rounded-lg p-4 overflow-y-auto mb-6">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {chatMessages.map(message => {
                  const isOwnMessage = message.user_id === user?.id;
                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isOwnMessage && (
                        <div className="mr-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}>
                            <span className="text-white font-bold">{message.user_name.charAt(0)}</span>
                          </div>
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                        {!isOwnMessage && (
                          <div className="flex items-center mb-1">
                            <span className="font-semibold text-gray-800">{message.user_name}</span>
                            <span className="ml-3 text-xs text-gray-500">{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                        )}
                        <div className={`inline-block p-3 rounded-lg ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                          <p>{message.content}</p>
                        </div>
                        {isOwnMessage && (
                          <div className="flex justify-end mt-1">
                            <span className="text-xs text-gray-500">{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      {isOwnMessage && (
                        <div className="ml-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #4ecdc4, #45b7d1)' }}>
                            <span className="text-white font-bold">{message.user_name.charAt(0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input 
              type="text" 
              value={messageInput} 
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="输入消息..."
              className="flex-1 px-4 py-3 glass-input focus:outline-none"
            />
            <button 
              type="submit" 
              className="glass-button px-6 py-3 text-white font-medium"
            >
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}