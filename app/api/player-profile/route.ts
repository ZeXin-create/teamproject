import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    
    const body = await request.json()
    const { 
      user_id, 
      team_id, 
      game_id, 
      current_rank, 
      main_positions, 
      position_stats,
      available_time, 
      accept_position_adjustment 
    } = body

    // 验证必填字段
    if (!user_id || !team_id) {
      return NextResponse.json(
        { error: '缺少必填字段: user_id 和 team_id' },
        { status: 400 }
      )
    }

    // 先检查是否已存在资料
    const existingProfileResponse = await supabase
      .from('player_profiles')
      .select('id')
      .eq('user_id', user_id)
      .eq('team_id', team_id)
      .single()

    const existingProfile = 'data' in existingProfileResponse ? existingProfileResponse.data : null

    let profileId: string

    if (existingProfile) {
      // 更新现有资料
      const updatedProfileResponse = await supabase
        .from('player_profiles')
        .update({
          game_id,
          current_rank,
          main_positions,
          position_stats,
          available_time,
          accept_position_adjustment
        })
        .eq('user_id', user_id)
        .eq('team_id', team_id)
        .select()
        .single()

      const updatedProfile = 'data' in updatedProfileResponse ? updatedProfileResponse.data : null
      const updateError = 'error' in updatedProfileResponse ? updatedProfileResponse.error : null

      if (updateError) {
        throw new Error('更新队员资料失败: ' + updateError.message)
      }

      if (!updatedProfile) {
        throw new Error('更新队员资料失败: 未返回更新后的资料')
      }

      profileId = updatedProfile.id
    } else {
      // 创建新资料
      const newProfileResponse = await supabase
        .from('player_profiles')
        .insert({
          user_id,
          team_id,
          game_id,
          current_rank,
          main_positions,
          position_stats,
          available_time,
          accept_position_adjustment
        })
        .select()
        .single()

      const newProfile = 'data' in newProfileResponse ? newProfileResponse.data : null
      const insertError = 'error' in newProfileResponse ? newProfileResponse.error : null

      if (insertError) {
        throw new Error('创建队员资料失败: ' + insertError.message)
      }

      if (!newProfile) {
        throw new Error('创建队员资料失败: 未返回新创建的资料')
      }

      profileId = newProfile.id
    }

    return NextResponse.json(
      { success: true, profileId },
      { status: 200 }
    )
  } catch (error) {
    console.error('API错误:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: '服务器内部错误', message: errorMessage },
      { status: 500 }
    )
  }
}
