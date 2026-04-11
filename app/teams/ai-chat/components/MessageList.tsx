import React, { useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble';

// 类型定义
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isDarkMode: boolean;
  onCopyMessage: (content: string) => void;
  onQuoteMessage: (content: string) => void;
  onEditMessage: (content: string) => void;
}

export default function MessageList({ 
  messages, 
  isLoading, 
  isDarkMode, 
  onCopyMessage, 
  onQuoteMessage, 
  onEditMessage 
}: MessageListProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  return (
    <div
      className="h-[calc(100vh-360px)] min-h-[400px] overflow-y-auto mb-4 space-y-4 px-2 py-4"
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
          {/* 消息渲染 */}
          {messages.map((msg) => (
            <ChatBubble 
              key={msg.id} 
              message={msg} 
              isDarkMode={isDarkMode}
              onCopy={() => onCopyMessage(msg.content)}
              onQuote={() => onQuoteMessage(msg.content)}
              onEdit={() => onEditMessage(msg.content)}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 flex-shrink-0 flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className={`py-3 px-4 rounded-2xl ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-pink-100'} shadow-md`}>
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
  );
}
