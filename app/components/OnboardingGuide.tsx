'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  Trophy,
  Users,
  Target,
  MessageSquare,
  Sparkles
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action?: string
  actionLabel?: string
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到王者战队助手',
    description: '这里是专业的王者荣耀战队管理工具，帮助你更好地管理团队、提升战绩。',
    icon: <Sparkles className="w-12 h-12 text-yellow-500" />,
  },
  {
    id: 'profile',
    title: '完善个人资料',
    description: '填写你的游戏昵称、段位和擅长位置，让战队更好地了解你。',
    icon: <Target className="w-12 h-12 text-blue-500" />,
    action: '/profile',
    actionLabel: '去完善资料'
  },
  {
    id: 'team',
    title: '加入或创建战队',
    description: '寻找志同道合的队友，或者创建属于自己的战队。',
    icon: <Users className="w-12 h-12 text-green-500" />,
    action: '/teams/space',
    actionLabel: '查看战队'
  },
  {
    id: 'match',
    title: '记录比赛数据',
    description: '记录每一场战队赛的结果，系统会自动分析胜率、MVP等数据。',
    icon: <Trophy className="w-12 h-12 text-purple-500" />,
    action: '/teams/data/match-records',
    actionLabel: '记录比赛'
  },
  {
    id: 'ai',
    title: '使用AI助手',
    description: '智能AI助手可以帮你分析战队数据、制定分组策略、提供段位提升建议。',
    icon: <MessageSquare className="w-12 h-12 text-pink-500" />,
    action: '/ai-assistant',
    actionLabel: '体验AI助手'
  }
]

export default function OnboardingGuide() {
  const { user } = useAuth()
  const router = useRouter()
  const [showGuide, setShowGuide] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || !mounted) return
      
      // 首先检查localStorage
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`)
      if (hasCompletedOnboarding === 'true') {
        return
      }
      
      try {
        // 检查用户是否已完成新手引导
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) {
          // 如果字段不存在或其他错误，默认显示引导
          setShowGuide(true)
          return
        }
        
        if (data && data.onboarding_completed !== true) {
          setShowGuide(true)
        } else if (data && data.onboarding_completed === true) {
          // 存储到localStorage
          localStorage.setItem(`onboarding_completed_${user.id}`, 'true')
        } else {
          // 字段不存在，默认显示引导
          setShowGuide(true)
        }
      } catch (error) {
        console.error('检查新手引导状态失败:', error)
        // 出错时默认显示引导
        setShowGuide(true)
      }
    }
    
    checkOnboardingStatus()
  }, [user, mounted])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    if (!user) return
    
    try {
      // 标记新手引导已完成
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
      
      // 存储到localStorage
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true')
      
      setIsCompleted(true)
      setTimeout(() => {
        setShowGuide(false)
      }, 2000)
    } catch (error) {
      console.error('完成新手引导失败:', error)
      // 即使API失败，也存储到localStorage
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true')
      setIsCompleted(true)
      setTimeout(() => {
        setShowGuide(false)
      }, 2000)
    }
  }

  const handleSkip = async () => {
    if (!user) return
    
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
      
      // 存储到localStorage
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true')
      
      setShowGuide(false)
    } catch (error) {
      console.error('跳过新手引导失败:', error)
      // 即使API失败，也存储到localStorage
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true')
      setShowGuide(false)
    }
  }

  const handleAction = () => {
    const step = steps[currentStep]
    if (step.action) {
      router.push(step.action)
      setShowGuide(false)
    }
  }

  if (!showGuide) return null

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  if (isCompleted) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full animate-scale-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">恭喜完成！</h2>
          <p className="text-gray-600">你已经了解了王者战队助手的基本功能，开始你的战队之旅吧！</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-sm text-gray-500">
            步骤 {currentStep + 1} / {steps.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-gray-100 h-1">
          <div 
            className="bg-blue-500 h-1 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 内容 */}
        <div className="p-6 text-center">
          <div className="mb-6">
            {currentStepData.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          {currentStepData.action && (
            <button
              onClick={handleAction}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              {currentStepData.actionLabel}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              {currentStep === steps.length - 1 ? '完成' : '下一步'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 快捷引导提示（用于特定页面）
export function QuickTip({
  title,
  description,
  onDismiss,
  action,
  actionLabel
}: {
  title: string
  description: string
  onDismiss: () => void
  action?: () => void
  actionLabel?: string
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-1">{title}</h4>
          <p className="text-sm text-blue-700 mb-3">{description}</p>
          <div className="flex gap-2">
            {action && actionLabel && (
              <button
                onClick={action}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                {actionLabel}
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-blue-600 text-sm hover:bg-blue-100 rounded-lg transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 功能引导高亮
export function FeatureHighlight({
  children,
  isActive,
  title,
  description,
  onNext
}: {
  children: React.ReactNode
  isActive: boolean
  title: string
  description: string
  onNext: () => void
}) {
  if (!isActive) return <>{children}</>

  return (
    <div className="relative">
      {/* 高亮遮罩 */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      {/* 高亮内容 */}
      <div className="relative z-50">
        <div className="ring-4 ring-blue-500 ring-offset-4 rounded-xl animate-pulse">
          {children}
        </div>
      </div>

      {/* 提示卡片 */}
      <div className="fixed bottom-20 left-4 right-4 z-50">
        <div className="bg-white rounded-xl p-4 shadow-2xl max-w-md mx-auto">
          <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          <button
            onClick={onNext}
            className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  )
}
