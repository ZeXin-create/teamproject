import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const batchId = url.searchParams.get('batch_id');
    
    if (!batchId) {
      return NextResponse.json({ error: '缺少 batch_id' }, { status: 400 });
    }
    
    // 获取该批次的所有成员
    const { data: members, error } = await supabase
      .from('group_members')
      .select('user_id, group_name, position, score')
      .eq('batch_id', batchId);
    
    if (error) {
      throw new Error('获取分组成员失败: ' + error.message);
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
    
    for (const member of members || []) {
      if (!groupsMap[member.group_name]) {
        groupsMap[member.group_name] = {
          name: member.group_name,
          members: []
        };
      }
      
      groupsMap[member.group_name].members.push({
        user_id: member.user_id,
        position: member.position,
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
