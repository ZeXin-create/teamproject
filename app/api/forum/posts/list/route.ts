import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const teamId = searchParams.get('teamId');
    const authorId = searchParams.get('authorId');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles!forum_posts_author_id_fkey (
          id,
          nickname,
          avatar
        ),
        team:teams (
          id,
          name
        )
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }
    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    if (authorId) {
      query = query.eq('author_id', authorId);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('获取论坛帖子列表失败:', error);
      return NextResponse.json(
        { error: '获取论坛帖子列表失败' },
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
