'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { AIService } from '../services/aiService'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'


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
          onComplete: (response: string) => {
            // 完成时移除流式标记
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: response, isStreaming: false }
                : msg
            ))
            // 保存完整的AI回复
            saveMessage('ai', response)
          },
          onError: (error: Error) => {
            console.error('流式响应错误:', error)
            const errorMessage = '抱歉，AI服务暂时不可用，请稍后重试。'
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: errorMessage, isStreaming: false }
                : msg
            ))
            // 保存错误消息
            saveMessage('ai', errorMessage)
          }
        }
      )

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-pink-50">
      {/* 顶部导航 - 参考豆包设计 */}
      <div className="sticky top-0 z-50 bg-white border-b border-pink-100 shadow-sm">
        <div className="max-w-[800px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/teams/space')}
            className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="text-sm font-medium">返回</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">智能战队助手</h1>
              <p className="text-xs text-pink-500">基于智谱AI大模型</p>
            </div>
          </div>

          <div className="w-16"></div>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 max-w-[800px] mx-auto w-full px-5 py-4 overflow-hidden flex">
        {/* 左侧建议列表 */}
        <div className="w-72 p-4 bg-white rounded-2xl shadow-sm border border-pink-100">
          <h3 className="text-sm font-medium text-gray-600 mb-3">快捷指令</h3>
          <div className="space-y-3">
            {[
              { text: '查询战队成员数据', icon: '👥' },
              { text: '生成战队赛分组', icon: '🎯' },
              { text: '推荐最佳阵容', icon: '⭐' },
              { text: '团队建设建议', icon: '🏆' },
              { text: '获取段位提升建议', icon: '📈' },
              { text: '预测比赛结果', icon: '🔮' },
              { text: '战队赛规则是什么？', icon: '📜' },
              { text: '如何提升战队赛胜率？', icon: '💡' }
            ].map((cmd, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setInput(cmd.text)
                  inputRef.current?.focus()
                }}
                whileHover={{ scale: 1.02, backgroundColor: '#fdf2f8' }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-3 rounded-xl bg-pink-50 hover:bg-pink-100 transition-colors flex items-center gap-3 text-left"
              >
                <span className="text-xl">{cmd.icon}</span>
                <span className="font-medium text-gray-800">{cmd.text}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* 中间间距 */}
        <div className="w-8"></div>

        {/* 右侧对话区 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} onWheel={(e) => e.preventDefault()}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="text-7xl mb-6 animate-bounce">🤖</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">你好，我是智能战队助手</h2>
                <p className="text-gray-500 mb-8 text-center max-w-md">
                  我可以帮助你管理战队、查询数据、分析比赛、制定战术等
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} px-2`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                    >
                      {msg.role === 'ai' && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 flex-shrink-0 flex items-center justify-center shadow-md"
                        >
                          <span className="text-white text-xs font-bold">AI</span>
                        </motion.div>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`flex-1 py-3 px-4 rounded-xl ${msg.role === 'user'
                          ? 'bg-gradient-to-r from-pink-400 to-pink-600 text-white rounded-tr-md'
                          : 'bg-white border border-pink-100 text-gray-800 rounded-tl-md'
                          } shadow-md hover:shadow-lg transition-shadow duration-300`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ lineHeight: '1.6' }}>
                          {msg.content}
                          {msg.isStreaming && (
                            <span className="inline-block ml-1 animate-pulse">▊</span>
                          )}
                        </div>
                        <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'
                          }`}>
                          {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </motion.div>
                      {msg.role === 'user' && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-pink-700 flex-shrink-0 flex items-center justify-center shadow-md"
                        >
                          <span className="text-white text-xs font-bold">我</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start px-2">
                    <div className="flex gap-3 max-w-[85%] sm:max-w-[70%]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 flex-shrink-0 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-bold">AI</span>
                      </div>
                      <div className="flex-1 py-3 px-4 rounded-xl bg-white border border-pink-100 shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-sm text-gray-500">AI正在思考...</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                          <div className="bg-gradient-to-r from-pink-400 to-pink-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* 输入区域 - 参考豆包设计 */}
          <div className="bg-white rounded-2xl shadow-md border border-pink-100 p-3">
            {/* 显示上传的图片 */}
            {uploadedImages.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="relative flex-shrink-0 w-20 h-20">
                    <Image
                      src={img}
                      alt="上传图片"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded-lg shadow-sm"
                    />
                    <button
                      onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-pink-500 text-white rounded-full text-xs flex items-center justify-center shadow-sm hover:bg-pink-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              {/* 图片上传按钮 */}
              <label className="cursor-pointer p-2 hover:bg-pink-50 rounded-lg transition-colors">
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
                className="flex-1 px-3 py-2 bg-pink-50 rounded-xl resize-none outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all text-sm"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && uploadedImages.length === 0)}
                className="px-4 py-2 bg-gradient-to-r from-pink-400 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md flex items-center gap-1 sm:px-6 sm:py-3 sm:gap-2"
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
          </div>
        </div>
      </div>
    </div>
  )
}
