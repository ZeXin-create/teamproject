import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 使用服务端密钥

export async function POST(request: NextRequest) {
  try {
    const { teamId, userId } = await request.json();

    if (!teamId || !userId) {
      return NextResponse.json({ error: '缺少战队 ID 或用户 ID' }, { status: 400 });
    }

    // 使用服务端密钥创建 supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 开始事务

    // 检查用户是否是战队队长
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (memberError || !teamMember || teamMember.role !== '队长') {
      return NextResponse.json({ error: '只有队长可以解散战队' }, { status: 403 });
    }

    // 删除战队相关数据
    // 1. 删除战队招募信息
    await supabase
      .from('team_recruits')
      .delete()
      .eq('team_id', teamId);

    // 2. 删除战队申请
    await supabase
      .from('team_applications')
      .delete()
      .eq('team_id', teamId);

    // 3. 删除战队成员
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId);

    // 4. 删除战队分组批次
    const { data: batches } = await supabase
      .from('group_batches')
      .select('id')
      .eq('team_id', teamId);

    if (batches && batches.length > 0) {
      const batchIds = batches.map(batch => batch.id);
      
      // 删除分组成员
      await supabase
        .from('group_members')
        .delete()
        .in('batch_id', batchIds);

      // 删除分组批次
      await supabase
        .from('group_batches')
        .delete()
        .eq('team_id', teamId);
    }

    // 5. 删除战队相关的交易（如果有）
    await supabase
      .from('team_sales')
      .delete()
      .eq('team_id', teamId);

    // 6. 删除队员个人游戏资料
    await supabase
      .from('player_profiles')
      .delete()
      .eq('team_id', teamId);

    // 7. 删除战队本身
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: '战队已成功解散' });
  } catch (error: unknown) {
    console.error('解散战队失败:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '解散战队失败' }, { status: 500 });
  }
}
