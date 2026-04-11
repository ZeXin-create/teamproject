import React from 'react';
import { motion } from 'framer-motion';

// 类型定义
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}

interface ChatBubbleProps {
  message: Message;
  isDarkMode: boolean;
  onCopy: () => void;
  onQuote: () => void;
  onEdit: () => void;
}

// Markdown解析组件
const MarkdownContent: React.FC<{ content: string; isDarkMode: boolean }> = ({ content, isDarkMode }) => {
  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 处理代码块
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // 代码块结束
        elements.push(
          <div key={i} className="mb-4">
            <pre className={`${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-800'} p-4 rounded-lg overflow-x-auto text-sm`}>
              <code>{codeContent}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeContent = '';
      } else {
        // 代码块开始
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }
    
    // 处理标题
    if (line.startsWith('## ')) {
      elements.push(
        <h3 
          key={i} 
          className={`text-lg font-bold mb-4 mt-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`} 
          style={{ fontSize: '18px', fontWeight: 'bold' }}
        >
          {line.substring(3)}
        </h3>
      );
    }
    // 处理列表项
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div 
          key={i} 
          className="pl-4 mb-2" 
          style={{ textIndent: '-20px', paddingLeft: '20px' }}
        >
          <span className={`text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>• {line.substring(2)}</span>
        </div>
      );
    }
    // 处理空行（段落间距）
    else if (line.trim() === '') {
      elements.push(
        <div key={i} className="h-3" style={{ height: '12px' }} />
      );
    }
    // 处理普通文本（包含链接）
    else {
      // 处理链接
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const textWithLinks = line.replace(linkRegex, (match, text, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-pink-500 hover:underline">${text}</a>`;
      });
      
      elements.push(
        <p key={i} className={`text-sm mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`} dangerouslySetInnerHTML={{ __html: textWithLinks }} />
      );
    }
  }
  
  return <div>{elements}</div>;
};

export default function ChatBubble({ message, isDarkMode, onCopy, onQuote, onEdit }: ChatBubbleProps) {
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
              : (isDarkMode ? 'bg-gray-700 border border-gray-600 text-gray-100' : 'bg-white border border-pink-100 text-gray-800') + ' rounded-tl-md'
              }`}
          >
            {/* 消息操作菜单 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <button 
                  className={`text-xs p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 这里可以添加消息操作菜单
                  }}
                >
                  ⋯
                </button>
              </div>
            </div>
            
            <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {message.role === 'ai' ? (
                <MarkdownContent content={message.content} isDarkMode={isDarkMode} />
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
                    e.stopPropagation();
                    onCopy();
                  }}
                  className={`text-xs ${message.role === 'user' ? 'text-white/70 hover:text-white' : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
                >
                  📋
                </button>
                
                {/* 引用按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuote();
                  }}
                  className={`text-xs ${message.role === 'user' ? 'text-white/70 hover:text-white' : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
                >
                  💬
                </button>
                
                {/* 编辑按钮（仅用户消息） */}
                {message.role === 'user' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
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
  );
}
