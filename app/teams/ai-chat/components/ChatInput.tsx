import React, { useState, useRef } from 'react';

// 类型定义
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition?: new () => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition?: new () => any;
  }
}

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  isDarkMode: boolean;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function ChatInput({ 
  input, 
  setInput, 
  isLoading, 
  isDarkMode, 
  errorMessage, 
  setErrorMessage, 
  onSend, 
  onKeyDown 
}: ChatInputProps) {
  const [showQuickQuestions, setShowQuickQuestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 常用问题快捷输入
  const quickQuestions = [
    '战队赛的规则是什么？',
    '如何提高战队赛的胜率？',
    '如何管理战队成员？',
    '如何创建一支强大的战队？',
    '如何提升队员的段位？',
    '如何安排战队赛的阵容？'
  ];

  // 语音输入功能
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音输入功能');
      return;
    }

    const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition)!;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;

    setIsListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(input + transcript);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-pink-100'} rounded-2xl shadow-md p-3 pb-safe`}>
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
                  setInput(question);
                  inputRef.current?.focus();
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
            onKeyDown={onKeyDown}
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
          onClick={onSend}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-pink-400 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md"
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
