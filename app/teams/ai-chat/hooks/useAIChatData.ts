import { useCallback, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { AIService } from '../../../services/aiService'

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

interface Team {
  id: string
  name: string
  logo: string
  captain_id: string
  created_at: string
  updated_at: string
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: string
  joined_at: string
  user?: {
    id: string
    nickname: string
    avatar: string
    username: string
  }
  application?: {
    game_id: string
    current_rank: string
    main_positions: string[]
    position_stats: Record<string, any>
    available_time: string[]
    accept_position_adjustment: boolean
  }
}

export const useAIChatData = (userId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // 使用 ref 防止重复提交
  const isSubmittingRef = useRef(false)

  /**
   * 加载所有会话
   * @description 从数据库中获取用户的所有会话，并为每个会话获取最后一条消息
   * @returns 返回会话数组，会更新sessions状态
   */
  const loadSessions = useCallback(async () => {
    if (!userId) return []

    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id, user_id, title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('获取会话列表失败:', sessionsError)
        setErrorMessage('获取会话列表失败')
        return []
      }

      if (sessionsData) {
        // 为每个会话获取最后一条消息
        const sessionsWithLastMessage = await Promise.all(
          sessionsData.map(async (session) => {
            const { data: lastMessage } = await supabase
              .from('chat_messages')
              .select('content')
              .eq('session_id', session.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              ...session,
              last_message: lastMessage?.content || ''
            }
          })
        )

        setSessions(sessionsWithLastMessage)
        return sessionsWithLastMessage
      }
      return []
    } catch (error) {
      console.error('加载会话失败:', error)
      setErrorMessage('加载会话失败')
      return []
    }
  }, [userId])

  /**
   * 加载用户战队数据
   * @description 从数据库中获取用户的战队信息和成员数据
   * @returns 无返回值，会更新userTeam和teamMembers状态
   */
  const loadUserTeamData = useCallback(async () => {
    if (!userId) return

    try {
      // 获取用户的战队
      const { data: userTeamData, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single()

      if (teamError) {
        console.error('获取用户战队失败:', teamError)
        // 即使获取战队失败，也继续执行，不影响其他功能
        return
      }

      if (userTeamData) {
        // 获取战队信息
        const { data: teamData, error: teamInfoError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', userTeamData.team_id)
          .single()

        if (teamInfoError) {
          console.error('获取战队信息失败:', teamInfoError)
          // 即使获取战队信息失败，也继续执行，不影响成员数据获取
        } else if (teamData) {
          setUserTeam(teamData)
        }

        // 获取战队成员
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', userTeamData.team_id)

        if (membersError) {
          console.error('获取战队成员失败:', membersError)
          // 即使获取成员失败，也继续执行
        } else if (membersData) {
          // 为每个成员获取用户信息
          const membersWithUserInfo = await Promise.all(
            membersData.map(async (member) => {
              try {
                // 获取用户基本信息
                const { data: userDataArray, error: userDataError } = await supabase
                  .from('profiles')
                  .select('id, nickname, avatar')
                  .eq('id', member.user_id)
                
                const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null
                
                // 获取用户战队申请资料
                const { data: applicationDataArray } = await supabase
                  .from('team_applications')
                  .select('game_id, current_rank, main_positions, position_stats, available_time, accept_position_adjustment')
                  .eq('user_id', member.user_id)
                  .eq('team_id', userTeamData.team_id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                
                const applicationData = applicationDataArray && applicationDataArray.length > 0 ? applicationDataArray[0] : null
                
                if (userDataError) {
                  console.error(`获取用户信息失败 (ID: ${member.user_id}):`, userDataError)
                  // 即使获取用户信息失败，也返回成员数据
                  return {
                    ...member,
                    user: null,
                    application: applicationData
                  }
                }
                
                // 重命名nickname为username
                if (userData) {
                  userData.username = userData.nickname
                }
                return {
                  ...member,
                  user: userData,
                  application: applicationData || null
                }
              } catch (error) {
                console.error(`获取用户信息失败 (ID: ${member.user_id}):`, error)
                // 即使获取用户信息失败，也返回成员数据
                return {
                  ...member,
                  user: null,
                  application: null
                }
              }
            })
          )
          setTeamMembers(membersWithUserInfo)
        }
      }
    } catch (error) {
      console.error('加载战队数据失败:', error)
      // 即使发生错误，也不影响其他功能
    }
  }, [userId])

  /**
   * 加载聊天历史
   * @description 从数据库中获取指定会话的聊天消息
   * @param sessionId 会话ID
   * @returns 无返回值，会更新messages状态
   */
  const loadChatHistory = useCallback(async (sessionId: string | null) => {
    if (!userId || !sessionId) return

    try {
      const { data: chatMessages, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (chatError) {
        console.error('获取聊天消息失败:', chatError)
        setErrorMessage('获取聊天消息失败')
        return
      }

      if (chatMessages) {
        setMessages(chatMessages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'ai',
          content: msg.content,
          created_at: msg.created_at
        })))
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error)
      setErrorMessage('加载聊天历史失败')
    }
  }, [userId])

  /**
   * 保存消息到数据库
   * @description 将消息保存到数据库中
   * @param role 消息角色，'user'或'ai'
   * @param content 消息内容
   * @param sessionId 会话ID
   * @returns 保存的消息对象，包含id、role、content和created_at字段；如果保存失败，返回null
   */
  const saveMessage = useCallback(async (role: 'user' | 'ai', content: string, sessionId: string | null) => {
    if (!userId || !sessionId) return null

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content
        })
        .select()
        .single()

      if (error) {
        console.error('保存消息失败:', error)
        setErrorMessage('保存消息失败')
        return null
      }

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
      setErrorMessage('保存消息失败')
    }
    return null
  }, [userId])

  /**
   * 创建新会话
   * @description 创建一个新的聊天会话
   * @returns 新会话的ID；如果创建失败，返回null
   */
  const createNewSession = useCallback(async () => {
    if (!userId) return

    try {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: '新对话'
        })
        .select()
        .single()

      if (newSession) {
        setSessionId(newSession.id)
        setMessages([])
        await loadSessions()
        return newSession.id
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      setErrorMessage('创建会话失败')
    }
    return null
  }, [userId, loadSessions])

  /**
   * 创建或获取会话
   * @description 如果用户已有会话，返回第一个会话的ID；如果没有，创建一个新会话并返回其ID
   * @returns 会话的ID；如果操作失败，返回null
   */
  const getOrCreateSession = useCallback(async () => {
    if (!userId) return null

    try {
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingSession) {
        return existingSession.id
      }

      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: '新对话'
        })
        .select()
        .single()

      if (newSession) {
        return newSession.id
      }
    } catch (error) {
      console.error('获取会话失败:', error)
      setErrorMessage('获取会话失败')
    }

    return null
  }, [userId])

  /**
   * 切换会话
   * @description 切换到指定的会话，并加载该会话的聊天历史
   * @param sessionId 要切换到的会话ID
   * @returns 无返回值，会更新sessionId和messages状态
   */
  const switchSession = useCallback(async (sessionId: string) => {
    if (!userId) return

    try {
      setSessionId(sessionId)
      await loadChatHistory(sessionId)
    } catch (error) {
      console.error('切换会话失败:', error)
      setErrorMessage('切换会话失败')
    }
  }, [userId, loadChatHistory])

  /**
   * 重命名会话
   * @description 重命名指定的会话
   * @param sessionId 要重命名的会话ID
   * @param title 新的会话标题
   * @returns 无返回值，会更新sessions状态
   */
  const renameSession = useCallback(async (sessionId: string | null, title: string) => {
    if (!userId || !sessionId || !title.trim()) return

    try {
      await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId)

      await loadSessions()
    } catch (error) {
      console.error('重命名会话失败:', error)
      setErrorMessage('重命名会话失败')
    }
  }, [userId, loadSessions])

  /**
   * 删除会话
   * @description 删除指定的会话及其所有消息
   * @param sessionId 要删除的会话ID
   * @returns 无返回值，会更新sessions、sessionId和messages状态
   */
  const deleteSession = useCallback(async (sessionId: string | null) => {
    if (!userId || !sessionId) return

    try {
      // 删除会话的所有消息
      await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId)

      // 删除会话
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)

      // 重新加载会话列表
      await loadSessions()

      // 如果删除的是当前会话，切换到第一个会话或创建新会话
      if (sessionId === sessionId) {
        const updatedSessions = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (updatedSessions.data) {
          setSessionId(updatedSessions.data.id)
          await loadChatHistory(updatedSessions.data.id)
        } else {
          const newSessionId = await createNewSession()
          if (newSessionId) {
            setSessionId(newSessionId)
          }
        }
      }
    } catch (error) {
      console.error('删除会话失败:', error)
      setErrorMessage('删除会话失败')
    }
  }, [userId, loadSessions, loadChatHistory, createNewSession])

  /**
   * 处理发送消息
   * @description 发送用户消息，调用AI服务获取回复，并保存到数据库
   * @param input 用户输入的消息内容
   * @param currentSessionId 会话ID
   * @returns 无返回值，会更新messages、isLoading和errorMessage状态
   */
  const handleSendMessage = useCallback(async (input: string, currentSessionId: string | null) => {
    if (!userId || !input.trim() || !currentSessionId) return
    
    // 防止重复提交
    if (isSubmittingRef.current) {
      console.warn('消息正在发送中，请勿重复提交')
      return
    }
    
    isSubmittingRef.current = true
    setIsLoading(true)
    setErrorMessage(null)

    // 生成唯一ID（使用 crypto.randomUUID 或时间戳+随机数）
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
      }
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const userMessage = {
      id: generateId(),
      role: 'user' as const,
      content: input,
      created_at: new Date().toISOString()
    }

    // 使用函数式更新获取最新消息列表
    let currentMessages: Message[] = []
    setMessages(prev => {
      currentMessages = [...prev, userMessage]
      return currentMessages
    })

    try {
      // 保存用户消息
      await saveMessage('user', userMessage.content, currentSessionId)

      // 构建消息历史（使用最新的消息列表）
      const historyMessages = currentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      
      // 验证消息历史格式
      const validHistoryMessages = historyMessages.filter(msg => {
        const isValid = typeof msg.role === 'string' && typeof msg.content === 'string'
        if (!isValid) {
          console.warn('无效的消息历史格式:', msg)
        }
        return isValid
      })
      
      // 获取用户战队ID
      const teamId = await AIService.getUserTeamId(userId)
      let response: string
      
      if (teamId) {
        response = await AIService.processQuery(userMessage.content, teamId, userId)
      } else {
        response = await AIService.processQueryWithContext(userMessage.content, validHistoryMessages, userId)
      }

      // 保存AI回复
      const aiMessage = {
        id: generateId(),
        role: 'ai' as const,
        content: response,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiMessage])
      await saveMessage('ai', response, currentSessionId)
    } catch (error) {
      console.error('调用AI服务失败:', error)
      setErrorMessage('AI服务暂时不可用，请稍后重试。')
    } finally {
      isSubmittingRef.current = false
      setIsLoading(false)
    }
  }, [userId, saveMessage])

  return {
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
  }
}
