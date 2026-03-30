import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://adfotpklgxiqmwrhzveh.supabase.co'
// 请替换为实际的 Supabase 发布密钥（应该以 pk_ 开头）
const supabaseKey = 'sb_publishable_j03ltzP6-5Ts2mcuywD3Yg_w_57-wA3'

export const supabase = createClient(supabaseUrl, supabaseKey)