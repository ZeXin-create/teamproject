import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'
import { notifyApplicationApproved, notifyApplicationRejected } from '../../services/notificationService'

export async function POST(req: Request) {
  try {
    const { action, applicationId, teamId, userId } = await req.json()
    
    console.log('收到请求:', { action, applicationId, teamId, userId })

    if (action === 'approve') {
      // 1. 获取申请详情（包括 user_id 和 team_id）
      console.log('正在查询申请记录, applicationId:', applicationId)
      
      const { data: applicationData, error: fetchError } = await supabase
        .from('team_applications')
        .select(`
          user_id,
          team_id,
          game_id,
          current_rank,
          main_positions,
          position_stats,
          available_time,
          accept_position_adjustment
        `)
        .eq('id', applicationId)
        .single()

      console.log('查询结果:', { applicationData, fetchError })

      if (fetchError) {
        console.error('获取申请详情失败:', fetchError)
        throw new Error(`获取申请详情失败: ${fetchError.message}`)
      }

      if (!applicationData) {
        throw new Error('未找到申请记录')
      }

      // 使用申请记录中的 user_id 和 team_id（更可靠）
      const applicantUserId = applicationData.user_id || userId
      const applicantTeamId = applicationData.team_id || teamId

      console.log('准备插入的数据:', {
        applicantUserId,
        applicantTeamId,
        game_id: applicationData.game_id,
        current_rank: applicationData.current_rank,
        main_positions: applicationData.main_positions,
        position_stats: applicationData.position_stats,
        available_time: applicationData.available_time,
        accept_position_adjustment: applicationData.accept_position_adjustment
      })

      // 2. 更新申请状态
      const { error: updateError } = await supabase
        .from('team_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId)

      if (updateError) {
        console.error('更新申请状态失败:', updateError)
        throw new Error(`更新申请状态失败: ${updateError.message}`)
      }

      console.log('申请状态已更新为 approved')

      // 3. 将队员添加到战队
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          user_id: applicantUserId,
          team_id: applicantTeamId,
          role: '队员',
          status: 'active',
          joined_at: new Date().toISOString(),
          join_method: 'application',
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('添加队员到战队失败:', insertError)
        throw new Error(`添加队员到战队失败: ${insertError.message}`)
      }

      console.log('team_members 插入成功')

      // 4. 保存游戏资料到 player_profiles 表
      // 确保数据格式正确
      const profileData = {
        user_id: applicantUserId,
        team_id: applicantTeamId,
        game_id: applicationData.game_id || null,
        current_rank: applicationData.current_rank || null,
        main_positions: applicationData.main_positions || [],
        position_stats: applicationData.position_stats || {},
        available_time: applicationData.available_time || [],
        accept_position_adjustment: applicationData.accept_position_adjustment || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('准备插入 player_profiles:', JSON.stringify(profileData, null, 2))

      const { data: insertedProfile, error: profileError } = await supabase
        .from('player_profiles')
        .upsert(profileData, { onConflict: 'user_id, team_id' })
        .select()

      console.log('player_profiles 插入结果:', { insertedProfile, profileError })

      if (profileError) {
        console.error('保存游戏资料失败:', profileError)
        console.error('错误详情:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        throw new Error(`保存游戏资料失败: ${profileError.message}`)
      }

      console.log('player_profiles 插入成功:', insertedProfile)

      // 获取战队名称
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('name')
        .eq('id', applicantTeamId)
        .single();

      if (!teamError && team) {
        // 通知申请人申请已批准
        await notifyApplicationApproved(applicantUserId, team.name, applicantTeamId);
      }

      return NextResponse.json({ 
        success: true, 
        message: '申请已批准',
        data: {
          user_id: applicantUserId,
          team_id: applicantTeamId,
          game_id: applicationData.game_id,
          current_rank: applicationData.current_rank
        }
      })
    } else if (action === 'reject') {
      // 拒绝申请
      const { error: updateError } = await supabase
        .from('team_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)

      if (updateError) {
        console.error('拒绝申请失败:', updateError)
        throw new Error(`拒绝申请失败: ${updateError.message}`)
      }

      // 获取申请详情，包括用户ID和战队ID
      const { data: applicationData, error: fetchError } = await supabase
        .from('team_applications')
        .select('user_id, team_id')
        .eq('id', applicationId)
        .single();

      if (!fetchError && applicationData) {
        // 获取战队名称
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('name')
          .eq('id', applicationData.team_id)
          .single();

        if (!teamError && team) {
          // 通知申请人申请已拒绝
          await notifyApplicationRejected(applicationData.user_id, team.name);
        }
      }

      return NextResponse.json({ success: true, message: '申请已拒绝' })
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 })
  } catch (error: unknown) {
    console.error('处理申请错误:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : '处理申请时发生错误' }, { status: 500 })
  }
}
