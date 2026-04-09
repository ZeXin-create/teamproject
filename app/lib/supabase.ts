import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here'

// 检查是否使用默认占位符值
const isUsingPlaceholder = supabaseUrl === 'https://your-project.supabase.co' || supabaseKey === 'your-anon-key-here'

let supabaseInstance
let supabaseAdminInstance

if (isUsingPlaceholder) {
  // 当使用占位符值时，返回模拟的客户端
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          }),
          single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
        }),
        in: () => ({
          select: () => Promise.resolve({ data: [], error: null })
        }),
        select: () => ({
          count: () => Promise.resolve({ count: 0, error: null })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
      })
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: { message: 'Supabase not configured' } })
    },
    channel: () => ({
      on: () => ({}),
      subscribe: () => ({}),
      unsubscribe: () => {}
    }),
    removeChannel: () => {}
  }
  
  supabaseInstance = mockSupabase
  supabaseAdminInstance = mockSupabase
} else {
  // 正常初始化 Supabase 客户端
  supabaseInstance = createClient(supabaseUrl, supabaseKey)
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export const supabase = supabaseInstance
export const supabaseAdmin = supabaseAdminInstance