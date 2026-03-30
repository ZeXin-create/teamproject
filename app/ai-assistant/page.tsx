'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { AIService } from '../services/aiService'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'


interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  created_at: string
  isStreaming?: boolean
}

export default function AIChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  // 快捷指令配置
  const quickCommands = [
    {
      category: '战队管理',
      commands: [
        { text: '查询战队成员数据', icon: '👥', color: 'from-blue-500 to-cyan-500' },
        { text: '生成战队赛分组', icon: '🎯', color: 'from-purple-500 to-pink-500' },
        { text: '推荐最佳阵容', icon: '⭐', color: 'from-yellow-500 to-orange-500' },
        { text: '团队建设建议', icon: '🏆', color: 'from-red-500 to-rose-500' },
      ]
    },
    {
      category: '段位提升',
      commands: [
        { text: '获取段位提升建议', icon: '📈', color: 'from-green-500 to-emerald-500' },
        { text: '分析我的优势劣势', icon: '🔍', color: 'from-indigo-500 to-blue-500' },
      ]
    },
    {
      category: '比赛相关',
      commands: [
        { text: '预测比赛结果', icon: '🔮', color: 'from-violet-500 to-purple-500' },
        { text: '战队赛规则是什么？', icon: '📜', color: 'from-teal-500 to-green-500' },
        { text: '如何提升战队赛胜率？', icon: '💡', color: 'from-amber-500 to-yellow-500' },
      ]
    }
  ]

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

        if (chatMessages && chatMessages.length > 0) {
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
          title: '智能战队助手'
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
    if (!input.trim() || !user || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setUploadedImages([])
    setIsLoading(true)

    try {
      let currentSessionId = sessionId
      if (!currentSessionId) {
        currentSessionId = await getOrCreateSession()
        if (currentSessionId) {
          setSessionId(currentSessionId)
        }
      }

      await saveMessage('user', userMessage.content)

      // 构建上下文（包含历史消息）
      const contextMessages = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      contextMessages.push({ role: 'user', content: currentInput })

      // 创建AI消息（用于流式更新）
      const aiMessageId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'ai',
        content: '',
        created_at: new Date().toISOString(),
        isStreaming: true
      }])

      // 使用流式响应
      let fullResponse = ''
      await AIService.processQueryWithContextStream(
        currentInput,
        contextMessages,
        user.id,
        {
          onChunk: (chunk: string) => {
            // 更新流式内容
            fullResponse += chunk
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: fullResponse }
                : msg
            ))
          },
          onComplete: () => {
            // 完成时移除流式标记
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, isStreaming: false }
                : msg
            ))
          },
          onError: (error: Error) => {
            console.error('流式响应错误:', error)
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: '抱歉，AI服务暂时不可用，请稍后重试。', isStreaming: false }
                : msg
            ))
          }
        }
      )

      // 保存完整的AI回复
      const aiResponse = messages.find(msg => msg.id === aiMessageId)?.content || ''
      await saveMessage('ai', aiResponse)

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

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages(prev => [...prev, event.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/teams/space')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="text-sm font-medium">返回</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">智能战队助手</h1>
              <p className="text-xs text-gray-500">基于智谱AI大模型</p>
            </div>
          </div>

          <div className="w-16"></div>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="text-7xl mb-6 animate-bounce">🤖</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">你好，我是智能战队助手</h2>
              <p className="text-gray-500 mb-8 text-center max-w-md">
                我可以帮助你管理战队、查询数据、分析比赛、制定战术等
              </p>

              {/* 快捷指令分类显示 */}
              {quickCommands.map((category, categoryIndex) => (
                <div key={categoryIndex} className="mb-6 w-full max-w-2xl">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">{category.category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.commands.map((cmd, cmdIndex) => (
                      <button
                        key={cmdIndex}
                        onClick={() => {
                          setInput(cmd.text)
                          inputRef.current?.focus()
                        }}
                        className={`p-4 rounded-xl bg-gradient-to-r ${cmd.color} text-white hover:opacity-90 transition-opacity flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105`}
                      >
                        <span className="text-2xl">{cmd.icon}</span>
                        <span className="font-medium">{cmd.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-400 mb-2">常见问题</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['战队赛规则是什么？', '如何提升战队赛胜率？', '段位差距限制是多少？'].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q)
                        inputRef.current?.focus()
                      }}
                      className="px-3 py-1.5 text-xs bg-white rounded-full text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
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
                    className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                  >
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">AI</span>
                      </div>
                    )}
                    <div
                      className={`flex-1 p-4 rounded-2xl ${msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-tr-md'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-md'
                        } shadow-md`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                        {msg.isStreaming && (
                          <span className="inline-block ml-1 animate-pulse">▊</span>
                        )}
                      </div>
                      <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'
                        }`}>
                        {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex-shrink-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">我</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%] md:max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-white border border-gray-200 shadow-md">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-sm text-gray-500">AI正在思考...</span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3">
          {/* 显示上传的图片 */}
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img src={img} alt="上传图片" className="w-20 h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* 图片上传按钮 */}
            <label className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <span className="text-xl">🖼️</span>
            </label>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题... (Shift+Enter换行)"
              rows={1}
              className="flex-1 px-3 py-2 bg-gray-50 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && uploadedImages.length === 0)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md flex items-center gap-1 sm:px-6 sm:py-3 sm:gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden sm:inline">发送</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">发送</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI可能会产生不准确的信息，请以实际情况为准 · Shift+Enter换行
          </p>
        </div>
      </div>
    </div>
  )
}
