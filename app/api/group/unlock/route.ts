import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

/**
 * 解锁队员 - 从分组系统中移除队员的锁定状态
 */
export async function POST(req: Request) {
  try {
    const { team_id, user_id } = await req.json();
    
    if (!team_id || !user_id) {
      return NextResponse.json(
        { error: '缺少 team_id 或 user_id 参数' },
        { status: 400 }
      );
    }
    
    console.log('开始解锁队员，team_id:', team_id, 'user_id:', user_id);
    
    // 1. 获取当前活跃的分组批次
    const { data: activeBatch, error: batchError } = await supabase
      .from('group_batches')
      .select('id')
      .eq('team_id', team_id)
      .eq('status', 'active')
      .single();
    
    // 检查是否有错误
    if (batchError) {
      // 如果是 PGRST116 错误（没有找到记录），直接返回成功
      if (batchError.code === 'PGRST116') {
        console.log('没有活跃的分组批次，直接返回成功');
        return NextResponse.json(
          { success: true, message: '队员已成功解锁' },
          { status: 200 }
        );
      }
      // 其他错误返回 500
      console.error('获取活跃批次失败:', batchError);
      return NextResponse.json(
        { error: '获取分组批次失败' },
        { status: 500 }
      );
    }
    
    if (!activeBatch) {
      // 如果没有活跃的分组批次，直接返回成功
      console.log('没有活跃的分组批次，直接返回成功');
      return NextResponse.json(
        { success: true, message: '队员已成功解锁' },
        { status: 200 }
      );
    }
    
    // 2. 从 group_members 中删除该队员的记录
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('batch_id', activeBatch.id)
      .eq('user_id', user_id);
    
    if (deleteError) {
      console.error('删除分组成员失败:', deleteError);
      return NextResponse.json(
        { error: '解锁队员失败' },
        { status: 500 }
      );
    }
    
    // 3. 检查是否还有其他队员在该批次中
    const { data: remainingMembers, error: checkError } = await supabase
      .from('group_members')
      .select('id')
      .eq('batch_id', activeBatch.id);
    
    if (checkError) {
      console.error('检查剩余队员失败:', checkError);
      // 继续执行，不中断流程
    }
    
    // 4. 如果没有剩余队员，更新批次状态为 completed
    if (!remainingMembers || remainingMembers.length === 0) {
      await supabase
        .from('group_batches')
        .update({ status: 'completed' })
        .eq('id', activeBatch.id);
    }
    
    console.log('队员解锁成功，user_id:', user_id);
    
    return NextResponse.json(
      { success: true, message: '队员已成功解锁' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('解锁队员错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
