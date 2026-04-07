import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { team_id, user_id } = await request.json()

    if (!team_id || !user_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 查询当前战队下的活跃批次
    const { data: batch, error: batchError } = await supabase
      .from('group_batches')
      .select('id')
      .eq('team_id', team_id)
      .eq('status', 'active')
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: 'No active batch found' }, { status: 404 })
    }

    const batch_id = batch.id

    // 从group_members中删除该队员的记录
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('batch_id', batch_id)
      .eq('user_id', user_id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to unlock member' }, { status: 500 })
    }

    // 检查该批次下是否还有成员
    const { count: memberCount } = await supabase
      .from('group_members')
      .select('*', { count: 'exact' })
      .eq('batch_id', batch_id)

    // 如果该批次下没有成员了，将该批次的状态改为archived
    if (memberCount === 0) {
      await supabase
        .from('group_batches')
        .update({ status: 'archived' })
        .eq('id', batch_id)
    }

    return NextResponse.json({ success: true, message: 'Member unlocked successfully' })
  } catch (error) {
    console.error('Unlock member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}