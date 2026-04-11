import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// 强制动态渲染，因为使用了 request.url
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get('team_id');
    
    if (!teamId) {
      return NextResponse.json({ error: '缺少 team_id' }, { status: 400 });
    }
    
    const batchesResponse = await supabase
      .from('group_batches')
      .select('id, created_at, status')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    
    const batches = 'data' in batchesResponse ? batchesResponse.data : null;
    const error = 'error' in batchesResponse ? batchesResponse.error : null;
    
    if (error) {
      throw new Error('获取分组批次失败: ' + (typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)));
    }
    
    return NextResponse.json({
      success: true,
      batches: batches || []
    });
  } catch (err: unknown) {
    console.error('获取分组批次失败:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '获取分组批次时发生错误' }, { status: 500 });
  }
}
