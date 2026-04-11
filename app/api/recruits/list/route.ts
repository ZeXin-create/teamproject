import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// 强制动态渲染，因为使用了 request.url
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const teamId = searchParams.get('teamId');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('team_recruits')
      .select(`
        *,
        teams (
          id,
          name,
          avatar_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('获取招募列表失败:', error);
      return NextResponse.json(
        { error: '获取招募列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('API 错误:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
