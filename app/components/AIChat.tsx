'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { AIService } from '../services/aiService'

interface AIChatProps {
  teamId: string
}

const AIChat: React.FC<AIChatProps> = ({ teamId }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 滚动到聊天底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user) return

    // 添加用户消息
    const newMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 调用AI服务处理查询
      const response = await AIService.processQuery(input, teamId, user.id)
      // 添加AI回复
      setMessages(prev => [...prev, { role: 'ai' as const, content: response }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai' as const, content: '抱歉，处理您的请求时发生错误，请稍后重试。' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="glass-card p-6 h-[500px] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold">AI</span>
        </div>
        <h2 className="text-xl font-bold">智能战队助手</h2>
      </div>

      {/* 聊天消息 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-lg">你好！我是你的智能战队助手</p>
            <p className="mt-2">可以询问战队成员数据、战队赛分组、规则等问题</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-pink-500 text-white' : 'bg-gray-100'}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-gray-100">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 输入框 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入你的问题..."
          className="flex-1 glass-input px-4 py-3 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="glass-button px-6 py-3 text-white font-medium"
        >
          {isLoading ? '处理中...' : '发送'}
        </button>
      </div>

      {/* 快捷问题 */}
      <div className="mt-4 flex flex-wrap gap-2">
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
              handleSend()
            }}
            className="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AIChat
