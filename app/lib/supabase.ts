import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://adfotpklgxiqmwrhzveh.supabase.co'
const supabaseKey = 'sb_publishable_j03ltzP6-5Ts2mcuywD3Yg_w_57-wA3'

export const supabase = createClient(supabaseUrl, supabaseKey)