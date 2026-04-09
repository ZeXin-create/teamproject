'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AIService } from '../../services/aiService'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAIChatData } from './hooks/useAIChatData'

// 类型定义
interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  created_at: string
}

interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  last_message?: string
}

// 消息项组件
interface MessageItemProps {
  message: Message
  isDarkMode: boolean
  onCopy: () => void
  onQuote: () => void
  onEdit: () => void
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isDarkMode, onCopy, onQuote, onEdit }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {message.role === 'ai' && (
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 flex-shrink-0 flex items-center justify-center shadow-md"
          >
            <span className="text-white text-xs font-bold">AI</span>
          </motion.div>
        )}
        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`py-3 px-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 ${message.role === 'user'
              ? 'bg-gradient-to-r from-pink-400 to-pink-600 text-white rounded-tr-md'
              : (isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-pink-100 text-gray-800') + ' rounded-tl-md'
              }`}
          >
            {/* 消息操作菜单 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <button 
                  className={`text-xs p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    // 这里可以添加消息操作菜单
                  }}
                >
                  ⋯
                </button>
              </div>
            </div>
            
            <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {message.role === 'ai' ? (
                <MarkdownContent content={message.content} />
              ) : (
                <span className="text-sm">{message.content}</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className={`text-xs ${message.role === 'user' ? 'text-white/70' : (isDarkMode ? 'text-gray-400' : 'text-gray-400')}`}>
                {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {/* 复制按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopy()
                  }}
                  className={`text-xs ${message.role === 'user' ? 'text-white/70 hover:text-white' : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
                >
                  📋
                </button>
                
                {/* 引用按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onQuote()
                  }}
                  className={`text-xs ${message.role === 'user' ? 'text-white/70 hover:text-white' : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
                >
                  💬
                </button>
                
                {/* 编辑按钮（仅用户消息） */}
                {message.role === 'user' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit()
                    }}
                    className={`text-xs ${message.role === 'user' ? 'text-white/70 hover:text-white' : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
                  >
                    ✏️
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
        {message.role === 'user' && (
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-pink-700 flex-shrink-0 flex items-center justify-center shadow-md"
          >
            <span className="text-white text-xs font-bold">我</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// Markdown解析组件
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  // 安全检查window对象
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  
  const lines = content.split('\n')
  const elements = []
  let inCodeBlock = false
  let codeContent = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 处理代码块
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // 代码块结束
        elements.push(
          <div key={i} className="mb-4">
            <pre className={`${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-800'} p-4 rounded-lg overflow-x-auto text-sm`}>
              <code>{codeContent}</code>
            </pre>
          </div>
        )
        inCodeBlock = false
        codeContent = ''
      } else {
        // 代码块开始
        inCodeBlock = true
      }
      continue
    }
    
    if (inCodeBlock) {
      codeContent += line + '\n'
      continue
    }
    
    // 处理标题
    if (line.startsWith('## ')) {
      elements.push(
        <h3 
          key={i} 
          className={`text-lg font-bold mb-4 mt-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`} 
          style={{ fontSize: '18px', fontWeight: 'bold' }}
        >
          {line.substring(3)}
        </h3>
      )
    }
    // 处理列表项
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div 
          key={i} 
          className="pl-4 mb-2" 
          style={{ textIndent: '-20px', paddingLeft: '20px' }}
        >
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>• {line.substring(2)}</span>
        </div>
      )
    }
    // 处理空行（段落间距）
    else if (line.trim() === '') {
      elements.push(
        <div key={i} className="h-3" style={{ height: '12px' }} />
      )
    }
    // 处理普通文本（包含链接）
    else {
      // 处理链接
      const linkRegex = /\[(.*?)\]\((.*?)\)/g
      const textWithLinks = line.replace(linkRegex, (match, text, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-pink-500 hover:underline">${text}</a>`
      })
      
      elements.push(
        <p key={i} className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`} dangerouslySetInnerHTML={{ __html: textWithLinks }} />
      )
    }
  }
  
  return <div>{elements}</div>
}

export default function AIChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [showSessions, setShowSessions] = useState(false)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showQuickQuestions, setShowQuickQuestions] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showQuickCommands, setShowQuickCommands] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // 使用useAIChatData hook
  const {
    messages,
    sessionId,
    sessions,
    userTeam,
    teamMembers,
    isLoading,
    errorMessage,
    setErrorMessage,
    loadSessions,
    loadUserTeamData,
    loadChatHistory,
    saveMessage,
    createNewSession,
    getOrCreateSession,
    switchSession,
    renameSession,
    deleteSession,
    handleSendMessage
  } = useAIChatData(user?.id)





  // 加载聊天历史
  const loadChatHistoryWithSessions = useCallback(async () => {
    if (!user) return

    try {
      // 先加载会话列表
      const sessionsData = await loadSessions()

      // 如果没有会话，创建一个新会话
      if (!sessionsData || sessionsData.length === 0) {
        const newSessionId = await getOrCreateSession()
        if (newSessionId) {
          // 这里不需要手动设置sessionId，因为createNewSession已经设置了
          await loadSessions()
        }
        return
      }

      // 如果没有选择会话，使用第一个会话
      if (!sessionId && sessionsData.length > 0) {
        await switchSession(sessionsData[0].id)
      } else if (sessionId) {
        // 加载选中会话的消息
        await loadChatHistory(sessionId)
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error)
    }
  }, [user, sessionId, loadSessions, loadChatHistory, getOrCreateSession, switchSession])

  // 初始加载数据 - 只在 user 变化时执行
  useEffect(() => {
    if (user) {
      loadUserTeamData()
      loadChatHistoryWithSessions()
    }
  }, [user])

  // 自动滚动到底部
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'instant' })
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user) return

    setInput('')
    
    // 创建或获取会话
    let currentSessionId = sessionId
    if (!currentSessionId) {
      currentSessionId = await getOrCreateSession()
      if (!currentSessionId) {
        setErrorMessage('创建会话失败')
        return
      }
    }

    // 使用hook中的handleSendMessage函数
    await handleSendMessage(input, currentSessionId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 快捷指令配置
  const quickCommands = [
    { text: '查询战队成员数据', icon: '👥' },
    { text: '生成战队赛分组', icon: '🎯' },
    { text: '推荐最佳阵容', icon: '⭐' },
    { text: '团队建设建议', icon: '🏆' },
    { text: '获取段位提升建议', icon: '📈' },
    { text: '预测比赛结果', icon: '🔮' },
    { text: '战队赛规则是什么？', icon: '📜' },
    { text: '如何提升战队赛胜率？', icon: '💡' }
  ]

  // 常用问题快捷输入
  const quickQuestions = [
    '战队赛的规则是什么？',
    '如何提高战队赛的胜率？',
    '如何管理战队成员？',
    '如何创建一支强大的战队？',
    '如何提升队员的段位？',
    '如何安排战队赛的阵容？'
  ]

  // 语音输入功能
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音输入功能')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false

    setIsListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(prevInput => prevInput + transcript)
    }

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gradient-to-br from-white to-pink-50 text-gray-800'}`}>
      {/* 顶部导航栏 - 高度56px，#eee颜色下边框，z-index:100 */}
      <div 
        className={`fixed top-0 left-0 right-0 z-[100] h-14 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} 
        style={{ borderBottom: `1px solid ${isDarkMode ? '#374151' : '#eee'}` }}
      >
        <div className="max-w-[800px] mx-auto w-full px-5 h-full flex items-center justify-between">
          {/* 左侧菜单按钮 */}
          <button
            onClick={() => setShowQuickCommands(!showQuickCommands)}
            className={`px-3 py-1.5 rounded-xl text-sm ${isDarkMode ? 'text-gray-300 hover:text-pink-400 hover:bg-gray-700' : 'text-gray-600 hover:text-pink-500 hover:bg-gray-50'} transition-all duration-300 font-medium flex items-center gap-1.5 mr-4`}
          >
            ☰ 菜单
          </button>
          
          <button
            onClick={() => router.push('/teams/space')}
            className={`px-3 py-1.5 rounded-xl text-sm ${isDarkMode ? 'text-gray-300 hover:text-pink-400 hover:bg-gray-700' : 'text-gray-600 hover:text-pink-500 hover:bg-gray-50'} transition-all duration-300 font-medium flex items-center gap-1.5`}
          >
            <span className="text-base">←</span> 返回
          </button>
          <div className="flex items-center gap-4">
            {/* 主题切换按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-3 py-1.5 rounded-xl text-sm ${isDarkMode ? 'text-gray-300 hover:text-pink-400 hover:bg-gray-700' : 'text-gray-600 hover:text-pink-500 hover:bg-gray-50'} transition-all duration-300 font-medium flex items-center gap-1.5`}
            >
              {isDarkMode ? '🌞 浅色' : '🌙 深色'}
            </motion.button>
            
            {/* 会话管理按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className={`px-3 py-1.5 rounded-xl text-sm ${isDarkMode ? 'text-gray-300 hover:text-pink-400 hover:bg-gray-800' : 'text-gray-600 hover:text-pink-500 hover:bg-gray-50'} transition-all duration-300 font-medium flex items-center gap-1.5`}
              >
                <span>💬</span> 会话
              </button>
              
              {/* 会话列表弹窗 */}
              {showSessions && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-full right-0 mt-2 w-80 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg z-50 p-2`}
                >
                  <div className="flex items-center justify-between mb-2 px-3">
                    <h3 className={isDarkMode ? 'font-medium text-gray-200' : 'font-medium text-gray-800'}>会话</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        await createNewSession()
                        setShowSessions(false)
                      }}
                      className={`px-2 py-1 text-xs ${isDarkMode ? 'text-pink-400 hover:bg-gray-700' : 'text-pink-500 hover:bg-pink-50'} rounded-lg`}
                    >
                      + 新会话
                    </motion.button>
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {sessions.map((session) => (
                      <motion.div 
                        key={session.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${sessionId === session.id ? (isDarkMode ? 'bg-gray-700' : 'bg-pink-50') : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')}`}
                        onClick={async () => {
                          await switchSession(session.id)
                          setShowSessions(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          {editingSession === session.id ? (
                            <div className="flex-1">
                              <input
                                type="text"
                                value={sessionTitle}
                                onChange={(e) => setSessionTitle(e.target.value)}
                                onBlur={() => renameSession(editingSession, sessionTitle)}
                                onKeyPress={(e) => e.key === 'Enter' && renameSession(editingSession, sessionTitle)}
                                autoFocus
                                className={`w-full text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border border-pink-200 text-gray-800'} rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-pink-500`}
                              />
                            </div>
                          ) : (
                            <div className="flex-1">
                              <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} text-sm truncate`}>{session.title}</p>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-400'} truncate`}>
                                {session.last_message || '无消息'}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {editingSession === session.id ? (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => renameSession(editingSession, sessionTitle)}
                                className={`text-xs ${isDarkMode ? 'text-pink-400 hover:bg-gray-700' : 'text-pink-500 hover:bg-pink-50'} rounded p-1`}
                              >
                                ✔️
                              </motion.button>
                            ) : (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingSession(session.id)
                                    setSessionTitle(session.title)
                                  }}
                                  className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'} rounded p-1`}
                                >
                                  ✏️
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSessionToDelete(session.id)
                                    setShowDeleteConfirm(true)
                                  }}
                                  className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'} rounded p-1`}
                                >
                                  🗑️
                                </motion.button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">AI</span>
              </div>
              <h1 className="text-base font-bold text-gray-800">智能战队助手</h1>
            </div>
          </div>
          <div className="w-16"></div>
        </div>
      </div>
      
      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg p-6 max-w-sm w-full`}
          >
            <h3 className={isDarkMode ? 'font-bold text-gray-200 mb-2' : 'font-bold text-gray-800 mb-2'}>确认删除</h3>
            <p className={isDarkMode ? 'text-gray-400 mb-4' : 'text-gray-600 mb-4'}>确定要删除这个会话吗？所有消息将被永久删除。</p>
            <div className="flex gap-3 justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                取消
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => deleteSession(sessionToDelete)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                删除
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* 复制成功提示 */}
      {showCopySuccess && (
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
        >
          复制成功
        </motion.div>
      )}
      
      {/* 主容器 - 最大宽度800px，水平居中，左右各20px内边距 */}
      <div className="max-w-[800px] mx-auto w-full px-5 pt-20 pb-8">
        {/* 聊天区域 - 右侧自适应 */}
        <div className="flex gap-8">
          {/* 左侧建议列表 - 固定宽度240px，80px margin-top避开导航栏，点击菜单按钮从左侧弹出 */}
          {showQuickCommands && (
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-[240px] flex-shrink-0 mt-20 fixed left-5 z-40"
            >
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-pink-100'} rounded-2xl shadow-sm border p-4 sticky top-24 w-[240px] sm:w-[200px]`}>
                <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>快捷指令</h3>
                <div className="space-y-2">
                  {quickCommands.map((cmd, index) => (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setInput(cmd.text)
                        inputRef.current?.focus()
                      }}
                      whileHover={{ scale: 1.02, backgroundColor: isDarkMode ? '#374151' : '#fdf2f8' }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-3 rounded-xl ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-pink-50 hover:bg-pink-100'} transition-colors flex items-center gap-3 text-left`}
                    >
                      <span className="text-xl">{cmd.icon}</span>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} text-sm sm:text-xs`}>
                        {/* 在小屏幕上显示简化版文字 */}
                        {cmd.text.length > 6 && typeof window !== 'undefined' && window.innerWidth < 640 ? cmd.text.substring(0, 6) + '...' : cmd.text}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 右侧对话区 - 自适应剩余宽度，添加左右内边距 */}
          <div className={`flex-1 flex flex-col px-4 ${showQuickCommands ? 'ml-64 sm:ml-56' : ''} transition-all duration-300`}>
            {/* 聊天消息区域 */}
            <div
              ref={messagesContainerRef}
              className="h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto mb-4 space-y-4 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {messages.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-lg font-medium">你好！我是你的智能战队助手</p>
                  <p className="mt-2 text-sm">可以询问战队成员数据、战队赛分组、规则等问题</p>
                </div>
              ) : (
                <>
                  {/* 消息渲染优化 */}
                  {messages.map((msg) => (
                    <MessageItem 
                      key={msg.id} 
                      message={msg} 
                      isDarkMode={isDarkMode}
                      onCopy={() => {
                        navigator.clipboard.writeText(msg.content)
                        setShowCopySuccess(true)
                        setTimeout(() => setShowCopySuccess(false), 2000)
                      }}
                      onQuote={() => {
                        setInput(`> ${msg.content}\n\n${input}`)
                        inputRef.current?.focus()
                      }}
                      onEdit={() => {
                        setInput(msg.content)
                        inputRef.current?.focus()
                      }}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 flex-shrink-0 flex items-center justify-center shadow-md">
                          <span className="text-white text-xs font-bold">AI</span>
                        </div>
                        <div className={`py-3 px-4 rounded-2xl ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-pink-100'} shadow-md`}>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI正在思考...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 输入框 */}
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-pink-100'} rounded-2xl shadow-md p-3`}>
              {/* 错误提示 */}
              {errorMessage && (
                <div className={`mb-3 p-3 rounded-xl ${isDarkMode ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  <div className="flex justify-between items-center">
                    <span>{errorMessage}</span>
                    <button 
                      onClick={() => setErrorMessage(null)}
                      className={`ml-2 ${isDarkMode ? 'text-red-300 hover:text-red-200' : 'text-red-600 hover:text-red-800'}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              
              {/* 常用问题快捷输入 */}
              {showQuickQuestions && (
                <div className={`mb-3 p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-pink-50'} rounded-xl`}>
                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>常用问题</h4>
                  <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInput(question)
                          inputRef.current?.focus()
                        }}
                        className={`px-3 py-1.5 text-xs ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500' : 'bg-white border border-pink-200 text-gray-700 hover:bg-pink-100'} rounded-lg border transition-colors`}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入你的问题... (Shift+Enter换行)"
                    rows={1}
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:bg-gray-600' : 'bg-pink-50 focus:bg-white'} rounded-xl resize-none outline-none focus:ring-2 focus:ring-pink-500 transition-all text-sm`}
                    style={{ maxHeight: '120px' }}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {/* 语音输入按钮 */}
                    <button
                      onClick={startVoiceInput}
                      disabled={isLoading}
                      className={`p-1.5 rounded-lg transition-colors ${isListening ? 'bg-pink-200 text-pink-600' : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                    >
                      {isListening ? '🎤' : '🎧'}
                    </button>
                    
                    {/* 常用问题按钮 */}
                    <button
                      onClick={() => setShowQuickQuestions(!showQuickQuestions)}
                      className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                    >
                      ❓
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-pink-400 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md"
                >
                  {isLoading ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
