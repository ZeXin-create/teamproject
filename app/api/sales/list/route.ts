import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const goodsType = searchParams.get('goodsType');
    const serverArea = searchParams.get('serverArea');
    const teamBadge = searchParams.get('teamBadge');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('team_sales')
      .select(`
        *,
        profiles (
          id,
          nickname
        )
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (goodsType) {
      query = query.eq('goods_type', goodsType);
    }
    if (serverArea) {
      query = query.eq('server_area', serverArea);
    }
    if (teamBadge) {
      query = query.eq('team_badge', teamBadge);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('获取战队出售列表失败:', error);
      return NextResponse.json(
        { error: '获取战队出售列表失败' },
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
