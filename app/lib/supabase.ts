import { createClient } from '@supabase/supabase-js'

// 确保环境变量在构建过程中也能正确获取
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://adfotpklgxiqmwrhzveh.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_j03ltzP6-5Ts2mcuywD3Yg_w_57-wA3'

export const supabase = createClient(supabaseUrl, supabaseKey)