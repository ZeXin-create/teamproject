import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 检查邮箱是否已注册
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 使用 service role key 创建拥有管理员权限的客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 获取所有用户，然后手动检查邮箱
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error checking email:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // 查找匹配的邮箱
    const matchedUser = users?.find(user => user.email === email);
    const isRegistered = !!matchedUser;
    const isVerified = isRegistered ? matchedUser.email_confirmed_at !== null : false;

    return NextResponse.json({
      isRegistered,
      isVerified
    });
  } catch (error) {
    console.error('Error in check-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
