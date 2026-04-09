import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const { team_id, groups, created_by, user_id } = await req.json();
    
    if (!team_id) {
      return NextResponse.json({ success: false, error: '缺少 team_id' }, { status: 400 });
    }
    
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json({ success: false, error: '缺少分组数据' }, { status: 400 });
    }

    // 1. 将当前战队所有 status='active' 的批次改为 archived
    const archiveResponse = await supabase
      .from('group_batches')
      .update({ status: 'archived' })
      .eq('team_id', team_id)
      .eq('status', 'active');
    
    const archiveError = 'error' in archiveResponse ? archiveResponse.error : null;
    
    if (archiveError) {
      throw new Error('归档旧批次失败: ' + (typeof archiveError === 'object' && archiveError !== null && 'message' in archiveError ? archiveError.message : String(archiveError)));
    }

    // 2. 创建新批次，status='active'
    // 使用 user_id 作为 created_by，如果没有则设为 null
    const batchCreatedBy = user_id || created_by || null;
    
    const batchResponse = await supabase
      .from('group_batches')
      .insert({
        team_id,
        status: 'active',
        created_by: batchCreatedBy
      })
      .select()
      .single();
    
    const newBatch = 'data' in batchResponse ? batchResponse.data : null;
    const batchError = 'error' in batchResponse ? batchResponse.error : null;
    
    if (batchError) {
      throw new Error('创建新批次失败: ' + batchError.message);
    }
    
    if (!newBatch) {
      throw new Error('创建新批次失败: 未返回批次数据');
    }

    // 3. 插入分组结果到 group_members 表
    interface GroupMember {
      batch_id: string;
      user_id: string;
      group_name: string;
      position: string | null;
      score: number;
    }
    const groupMembers: GroupMember[] = [];
    
    for (const group of groups) {
      for (const member of group.members) {
        groupMembers.push({
          batch_id: newBatch.id,
          user_id: member.user_id,
          group_name: group.name,
          position: member.assigned_position || member.main_positions?.[0] || null,
          score: member.score || 0
        });
      }
    }

    const membersResponse = await supabase
      .from('group_members')
      .insert(groupMembers);
    
    const membersError = 'error' in membersResponse ? membersResponse.error : null;
    
    if (membersError) {
      throw new Error('插入分组成员失败: ' + (typeof membersError === 'object' && membersError !== null && 'message' in membersError ? membersError.message : String(membersError)));
    }

    return NextResponse.json({
      success: true,
      message: '分组已确认并锁定',
      batch_id: newBatch.id,
      total_groups: groups.length,
      total_members: groupMembers.length
    });
  } catch (err: unknown) {
    console.error('确认分组失败:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : '确认分组时发生错误' }, { status: 500 });
  }
}
