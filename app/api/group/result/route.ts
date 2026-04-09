import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const batchId = url.searchParams.get('batch_id');
    
    if (!batchId) {
      return NextResponse.json({ error: '缺少 batch_id' }, { status: 400 });
    }
    
    // 获取该批次的所有成员
    const membersResponse = await supabase
      .from('group_members')
      .select('user_id, group_name, position, score')
      .eq('batch_id', batchId);
    
    const members = 'data' in membersResponse ? membersResponse.data : null;
    const error = 'error' in membersResponse ? membersResponse.error : null;
    
    if (error) {
      throw new Error('获取分组成员失败: ' + (typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)));
    }
    
    // 按组名分组
    interface GroupData {
      name: string;
      members: Array<{
        user_id: string;
        position: string | null;
        score: number;
      }>;
    }
    const groupsMap: Record<string, GroupData> = {};
    
    for (const member of (members || []) as Array<{ group_name: string; user_id: string; role: string; score: number; main_position: string; second_position: string | null; accept_position_adjustment: boolean; available_time: Array<{ day: string; start_time: string; end_time: string }>; heroes: string[]; recommended_heroes?: string[]; hero_reasons?: Record<string, string> }>) {
      if (!groupsMap[member.group_name]) {
        groupsMap[member.group_name] = {
          name: member.group_name,
          members: []
        };
      }
      
      groupsMap[member.group_name].members.push({
        user_id: member.user_id,
        position: member.main_position,
        score: member.score
      });
    }
    
    // 转换为数组并计算平均分
    const groups = Object.values(groupsMap).map((group: GroupData, idx: number) => {
      const averageScore = group.members.length > 0 
        ? Math.round(group.members.reduce((sum: number, member) => sum + member.score, 0) / group.members.length)
        : 0;
      
      return {
        id: idx,
        name: group.name,
        members: group.members,
        average_score: averageScore,
        missing_positions: []
      };
    });
    
    return NextResponse.json({
      success: true,
      groups
    });
  } catch (err: unknown) {
    console.error('获取分组结果失败:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '获取分组结果时发生错误' }, { status: 500 });
  }
}
