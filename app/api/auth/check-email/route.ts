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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Missing Supabase URL' },
        { status: 500 }
      );
    }

    let isRegistered = false;
    let isVerified = false;

    // 尝试使用 service role key 检查邮箱
    if (supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(
          supabaseUrl,
          supabaseServiceKey,
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
          console.error('Error checking email with service role:', error);
          // 继续执行备用方案
        } else {
          // 查找匹配的邮箱
          const matchedUser = users?.find(user => user.email === email);
          isRegistered = !!matchedUser;
          isVerified = isRegistered ? matchedUser?.email_confirmed_at !== null : false;
          return NextResponse.json({
            isRegistered,
            isVerified
          });
        }
      } catch (error) {
        console.error('Error with service role client:', error);
        // 继续执行备用方案
      }
    }

    // 备用方案：使用 anon key 检查 profiles 表
    const supabaseAnon = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    try {
      // 检查 profiles 表中是否存在该邮箱
      const { data: profiles, error } = await supabaseAnon
        .from('profiles')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (error) {
        console.error('Error checking profiles table:', error);
        // 继续执行，返回默认值
      } else {
        isRegistered = profiles && profiles.length > 0;
        // 由于使用 anon key，无法获取邮箱验证状态
        isVerified = false;
      }
    } catch (error) {
      console.error('Error with anon client:', error);
      // 继续执行，返回默认值
    }

    // 如果两种方法都失败，返回默认值（邮箱可用）
    return NextResponse.json({
      isRegistered,
      isVerified
    });
  } catch (error) {
    console.error('Error in check-email API:', error);
    // 即使发生错误，也返回邮箱可用，避免阻止用户注册
    return NextResponse.json({
      isRegistered: false,
      isVerified: false
    });
  }
}
