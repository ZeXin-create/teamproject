import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get('team_id');
    
    if (!teamId) {
      return NextResponse.json({ error: '缺少 team_id' }, { status: 400 });
    }
    
    const { data: batches, error } = await supabase
      .from('group_batches')
      .select('id, created_at, status')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error('获取分组批次失败: ' + error.message);
    }
    
    return NextResponse.json({
      success: true,
      batches: batches || []
    });
  } catch (err: any) {
    console.error('获取分组批次失败:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
