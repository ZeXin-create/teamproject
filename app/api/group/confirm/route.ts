import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { error: archiveError } = await supabase
      .from('group_batches')
      .update({ status: 'archived' })
      .eq('team_id', team_id)
      .eq('status', 'active');
    
    if (archiveError) {
      throw new Error('归档旧批次失败: ' + archiveError.message);
    }

    // 2. 创建新批次，status='active'
    // 使用 user_id 作为 created_by，如果没有则设为 null
    const batchCreatedBy = user_id || created_by || null;
    
    const { data: newBatch, error: batchError } = await supabase
      .from('group_batches')
      .insert({
        team_id,
        status: 'active',
        created_by: batchCreatedBy
      })
      .select()
      .single();
    
    if (batchError) {
      throw new Error('创建新批次失败: ' + batchError.message);
    }

    // 3. 插入分组结果到 group_members 表
    const groupMembers: any[] = [];
    
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

    const { error: membersError } = await supabase
      .from('group_members')
      .insert(groupMembers);
    
    if (membersError) {
      throw new Error('插入分组成员失败: ' + membersError.message);
    }

    return NextResponse.json({
      success: true,
      message: '分组已确认并锁定',
      batch_id: newBatch.id,
      total_groups: groups.length,
      total_members: groupMembers.length
    });
  } catch (err: any) {
    console.error('确认分组失败:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
