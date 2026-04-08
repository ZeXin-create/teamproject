import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId, teamId, kickedBy } = await req.json()
    
    console.log('踢出队员请求:', { userId, teamId, kickedBy })
    
    if (!userId || !teamId) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 })
    }

    // 1. 检查操作者权限（队长或副队长）
    const { data: operator, error: operatorError } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('user_id', kickedBy)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single()

    console.log('操作者权限检查:', { operator, operatorError })

    if (operatorError || !operator) {
      return NextResponse.json({ success: false, error: '无权操作' }, { status: 403 })
    }

    const allowedRoles = ['队长', '副队长']
    if (!allowedRoles.includes(operator.role) && kickedBy !== userId) {
      return NextResponse.json({ success: false, error: '无权踢出队员' }, { status: 403 })
    }

    // 2. 检查被踢者身份
    const { data: target, error: targetError } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single()

    console.log('被踢者身份检查:', { target, targetError })

    if (targetError || !target) {
      return NextResponse.json({ success: false, error: '队员不存在' }, { status: 404 })
    }

    // 队长不能被踢
    if (target.role === '队长' && kickedBy !== userId) {
      return NextResponse.json({ success: false, error: '不能踢出队长' }, { status: 403 })
    }

    // 3. 删除 player_profiles 记录
    console.log('开始删除 player_profiles:', { userId, teamId })
    const { error: deleteProfileError, data: deleteProfileData } = await supabaseAdmin
      .from('player_profiles')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .select()

    console.log('player_profiles 删除结果:', { deleteProfileError, deleteProfileData })

    if (deleteProfileError) {
      console.error('删除 player_profiles 失败:', deleteProfileError)
    }

    // 4. 删除 team_members 记录
    console.log('开始删除 team_members:', { userId, teamId })
    const { error: deleteMemberError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId)

    console.log('team_members 删除结果:', { deleteMemberError })

    if (deleteMemberError) throw deleteMemberError

    // 5. 更新申请状态为 rejected
    console.log('更新申请状态为 rejected:', { userId, teamId })
    const { error: updateAppError } = await supabaseAdmin
      .from('team_applications')
      .update({ status: 'rejected' })
      .eq('user_id', userId)
      .eq('team_id', teamId)

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
