'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseFormAutoSaveOptions<T> {
  key: string
  data: T
  onRestore?: (data: T) => void
  debounceMs?: number
  enabled?: boolean
}

export function useFormAutoSave<T extends Record<string, unknown>>({
  key,
  data,
  onRestore,
  debounceMs = 1000,
  enabled = true
}: UseFormAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRestoredRef = useRef(false)

  // 保存草稿到localStorage
  const saveDraft = useCallback(() => {
    if (!enabled) return
    
    try {
      const draft = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(`form_draft_${key}`, JSON.stringify(draft))
    } catch (error) {
      console.error('保存草稿失败:', error)
    }
  }, [key, data, enabled])

  // 恢复草稿
  const restoreDraft = useCallback(() => {
    if (!enabled || isRestoredRef.current) return

    try {
      const saved = localStorage.getItem(`form_draft_${key}`)
      if (saved) {
        const draft = JSON.parse(saved)
        // 检查草稿是否过期（7天）
        const isExpired = Date.now() - draft.timestamp > 7 * 24 * 60 * 60 * 1000
        
        if (!isExpired && onRestore) {
          onRestore(draft.data)
          isRestoredRef.current = true
          return draft.data
        } else if (isExpired) {
          // 删除过期草稿
          localStorage.removeItem(`form_draft_${key}`)
        }
      }
    } catch (error) {
      console.error('恢复草稿失败:', error)
    }
    return null
  }, [key, onRestore, enabled])

  // 清除草稿
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`form_draft_${key}`)
      isRestoredRef.current = false
    } catch (error) {
      console.error('清除草稿失败:', error)
    }
  }, [key])

  // 自动保存（防抖）
  useEffect(() => {
    if (!enabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveDraft()
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, saveDraft, debounceMs, enabled])

  // 组件挂载时恢复草稿
  useEffect(() => {
    restoreDraft()
  }, [restoreDraft])

  // 页面关闭前保存
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = () => {
      saveDraft()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveDraft, enabled])

  return {
    saveDraft,
    restoreDraft,
    clearDraft
  }
}

// 使用示例：
// const [formData, setFormData] = useState({ name: '', email: '' })
// 
// const { clearDraft } = useFormAutoSave({
//   key: 'user_profile',
//   data: formData,
//   onRestore: (restoredData) => {
//     setFormData(restoredData)
//   }
// })
// 
// // 提交成功后清除草稿
// const handleSubmit = async () => {
//   await submitForm(formData)
//   clearDraft()
// }