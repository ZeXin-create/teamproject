import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(req: Request) {
  try {
    const { userId, teamId, kickedBy } = await req.json()
    
    console.log('踢出队员请求:', { userId, teamId, kickedBy })
    
    if (!userId || !teamId) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 })
    }

    // 1. 检查操作者权限（队长或副队长）
    const operatorResponse = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', kickedBy)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single()

    const operator = 'data' in operatorResponse ? operatorResponse.data : null
    const operatorError = 'error' in operatorResponse ? operatorResponse.error : null

    console.log('操作者权限检查:', { operator, operatorError })

    if (operatorError || !operator) {
      return NextResponse.json({ success: false, error: '无权操作' }, { status: 403 })
    }

    const allowedRoles = ['captain', 'vice_captain']
    if (!allowedRoles.includes(operator.role) && kickedBy !== userId) {
      return NextResponse.json({ success: false, error: '无权踢出队员' }, { status: 403 })
    }

    // 2. 检查被踢者身份
    const targetResponse = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single()

    const target = 'data' in targetResponse ? targetResponse.data : null
    const targetError = 'error' in targetResponse ? targetResponse.error : null

    console.log('被踢者身份检查:', { target, targetError })

    if (targetError || !target) {
      return NextResponse.json({ success: false, error: '队员不存在' }, { status: 404 })
    }

    // 队长不能被踢
    if (target.role === 'captain' && kickedBy !== userId) {
      return NextResponse.json({ success: false, error: '不能踢出队长' }, { status: 403 })
    }

    // 3. 删除 player_profiles 记录
    console.log('开始删除 player_profiles:', { userId, teamId })
    const deleteProfileResponse = await supabase
      .from('player_profiles')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .select()

    const deleteProfileData = 'data' in deleteProfileResponse ? deleteProfileResponse.data : null
    const deleteProfileError = 'error' in deleteProfileResponse ? deleteProfileResponse.error : null

    console.log('player_profiles 删除结果:', { deleteProfileError, deleteProfileData })

    if (deleteProfileError) {
      console.error('删除 player_profiles 失败:', deleteProfileError)
    }

    // 4. 删除 team_members 记录
    console.log('开始删除 team_members:', { userId, teamId })
    const deleteMemberResponse = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId)

    const deleteMemberError = 'error' in deleteMemberResponse ? deleteMemberResponse.error : null

    console.log('team_members 删除结果:', { deleteMemberError })

    if (deleteMemberError) throw deleteMemberError

    // 5. 更新申请状态为 rejected
    console.log('更新申请状态为 rejected:', { userId, teamId })
    const updateAppResponse = await supabase
      .from('team_applications')
      .update({ status: 'rejected' })
      .eq('user_id', userId)
      .eq('team_id', teamId)

    const updateAppError = 'error' in updateAppResponse ? updateAppResponse.error : null

    console.log('申请状态更新结果:', { updateAppError })

    return NextResponse.json({ 
      success: true, 
      message: '已踢出战队',
      details: {
        profileDeleted: !deleteProfileError,
        memberDeleted: !deleteMemberError
      }
    })
  } catch (error: unknown) {
    console.error('踢出队员错误:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : '踢出队员时发生错误' }, { status: 500 })
  }
}
