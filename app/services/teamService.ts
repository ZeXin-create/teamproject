import { supabase } from '../lib/supabase'

// 战队相关API服务
export const teamService = {
  // 获取用户所在的战队
  getUserTeam: async (userId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw error
    if (!data || data.length === 0) throw new Error('用户未加入战队')
    // 处理多个战队的情况，取第一个战队
    return { team_id: data[0].team_id }
  },

  // 获取战队详情
  getTeamDetails: async (teamId: string) => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (error) throw error
    return data
  },

  // 获取战队成员
  getTeamMembers: async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        team_id,
        role,
        status,
        joined_at
      `)
      .eq('team_id', teamId)
      .eq('status', 'active')

    if (error) throw error
    return data || []
  },



  // 获取战队申请
  getTeamApplications: async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_applications')
      .select('id, user_id, team_id, status, created_at')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // 批准战队申请
  approveTeamApplication: async (applicationId: string, userId: string, teamId: string) => {
    // 开始事务
    const { error: updateError } = await supabase
      .from('team_applications')
      .update({ status: 'approved' })
      .eq('id', applicationId)

    if (updateError) throw updateError

    // 添加用户到战队
    const { error: insertError } = await supabase
      .from('team_members')
      .insert({
        user_id: userId,
        team_id: teamId,
        role: '队员'
      })

    if (insertError) throw insertError

    return true
  },

  // 拒绝战队申请
  rejectTeamApplication: async (applicationId: string) => {
    const { error } = await supabase
      .from('team_applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)

    if (error) throw error
    return true
  },

  // 获取战队公告
  getTeamAnnouncements: async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_announcements')
      .select('id, team_id, title, content, created_at, user_id')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // 创建战队公告
  createTeamAnnouncement: async (teamId: string, userId: string, title: string, content: string) => {
    const { data, error } = await supabase
      .from('team_announcements')
      .insert({
        team_id: teamId,
        title,
        content,
        user_id: userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
