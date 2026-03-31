'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AIService } from '../../services/aiService'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  created_at: string
}

export default function AIChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // 加载聊天历史
  const loadChatHistory = useCallback(async () => {
    if (!user) return

    try {
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (sessions) {
        setSessionId(sessions.id)

        const { data: chatMessages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessions.id)
          .order('created_at', { ascending: true })

        if (chatMessages) {
          setMessages(chatMessages.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'ai',
            content: msg.content,
            created_at: msg.created_at
          })))
        }
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadChatHistory()
    }
  }, [user, loadChatHistory])

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 保存消息到数据库
  const saveMessage = async (role: 'user' | 'ai', content: string) => {
    if (!sessionId) return

    try {
      const { data } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content
        })
        .select()
        .single()

      if (data) {
        return {
          id: data.id,
          role: data.role as 'user' | 'ai',
          content: data.content,
          created_at: data.created_at
        }
      }
    } catch (error) {
      console.error('保存消息失败:', error)
    }
  }

  // 创建或获取会话
  const getOrCreateSession = async () => {
    if (!user) return null

    try {
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existingSession) {
        return existingSession.id
      }

      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: '新对话'
        })
        .select()
        .single()

      if (newSession) {
        return newSession.id
      }
    } catch (error) {
      console.error('获取会话失败:', error)
    }

    return null
  }

  const handleSend = async () => {
    if (!input.trim() || !user) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 创建或获取会话
      let currentSessionId = sessionId
      if (!currentSessionId) {
        currentSessionId = await getOrCreateSession()
        if (currentSessionId) {
          setSessionId(currentSessionId)
        }
      }

      // 保存用户消息
      await saveMessage('user', userMessage.content)

      // 获取用户战队ID
      const teamId = await AIService.getUserTeamId(user.id)

      // 调用AI服务
      let response: string
      if (teamId) {
        response = await AIService.processQuery(userMessage.content, teamId, user.id)
      } else {
        response = await AIService.processQueryWithContext(userMessage.content, [], user.id)
      }

      // 保存AI回复
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai' as const,
        content: response,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiMessage])
      await saveMessage('ai', response)

    } catch (error) {
      console.error('AI聊天错误:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: '抱歉，处理您的请求时发生错误，请稍后重试。',
        created_at: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="glass-card p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/teams/space')}
              className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium flex items-center gap-2"
            >
              <span>←</span> 返回战队空间
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <h1 className="text-xl font-bold gradient-text">智能战队助手</h1>
            </div>
            <div className="w-28"></div>
          </div>

          {/* 聊天消息区域 */}
          <div
            ref={messagesContainerRef}
            className="h-[calc(100vh-400px)] min-h-[400px] overflow-y-auto mb-4 space-y-4 px-2"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg font-medium">你好！我是你的智能战队助手</p>
                <p className="mt-2 text-sm">可以询问战队成员数据、战队赛分组、规则等问题</p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-xl">
                  {[
                    { text: '查询战队成员数据', icon: '👥' },
                    { text: '生成战队赛分组', icon: '🎯' },
                    { text: '推荐最佳阵容', icon: '⭐' },
                    { text: '获取段位提升建议', icon: '📈' },
                    { text: '团队建设建议', icon: '🏆' },
                    { text: '预测比赛结果', icon: '🔮' },
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInput(item.text)
                      }}
                      className="px-4 py-2 bg-white/50 rounded-lg hover:bg-white/80 transition-colors text-sm flex items-center gap-2"
                    >
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl ${msg.role === 'user'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-white/50'
                        }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                      </div>
                      <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'
                        }`}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] md:max-w-[75%] p-4 rounded-2xl bg-white/50">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        <span className="ml-2 text-sm text-gray-500">AI正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 输入框 */}
          <div className="bg-white/50 rounded-2xl p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入你的问题..."
                className="flex-1 px-4 py-3 bg-transparent outline-none text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {isLoading ? '发送中...' : '发送'}
              </button>
            </div>
          </div>

          {/* 快捷问题 */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">快捷问题：</p>
            <div className="flex flex-wrap gap-2">
              {[
                '查询战队成员数据',
                '生成战队赛分组',
                '推荐最佳阵容',
                '获取段位提升建议',
                '团队建设建议',
                '预测比赛结果',
                '战队赛规则是什么？',
                '如何提升战队赛胜率？'
              ].map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInput(question)
                  }}
                  className="px-3 py-1 text-xs bg-white/50 rounded-full hover:bg-white/80 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
