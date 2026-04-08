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
    const { data: existingProfile } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('user_id', user_id)
      .eq('team_id', team_id)
      .single()

    let profileId: string

    if (existingProfile) {
      // 更新现有资料
      const { data: updatedProfile, error: updateError } = await supabase
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

      if (updateError) {
        throw new Error('更新队员资料失败: ' + updateError.message)
      }

      profileId = updatedProfile.id
    } else {
      // 创建新资料
      const { data: newProfile, error: insertError } = await supabase
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

      if (insertError) {
        throw new Error('创建队员资料失败: ' + insertError.message)
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
