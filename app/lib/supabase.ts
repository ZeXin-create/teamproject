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
  const createMockFilterBuilder = () => {
    const mockFilterBuilder = {
      eq: () => mockFilterBuilder,
      neq: () => mockFilterBuilder,
      gt: () => mockFilterBuilder,
      gte: () => mockFilterBuilder,
      lt: () => mockFilterBuilder,
      lte: () => mockFilterBuilder,
      ilike: () => mockFilterBuilder,
      like: () => mockFilterBuilder,
      in: () => mockFilterBuilder,
      or: () => mockFilterBuilder,
      order: () => mockFilterBuilder,
      limit: () => mockFilterBuilder,
      range: () => mockFilterBuilder,
      is: () => mockFilterBuilder,
      single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      select: (options: { count?: string } = {}) => {
        if (options.count) {
          return {
            ...mockFilterBuilder,
            then: (callback: (value: { data: unknown[]; error: unknown; count?: number }) => unknown) => {
              return Promise.resolve({ data: [], error: null, count: 0 }).then(callback);
            },
            catch: (callback: (reason: unknown) => unknown) => {
              return Promise.resolve({ data: [], error: null, count: 0 }).catch(callback);
            }
          };
        }
        return mockFilterBuilder;
      },
      count: () => Promise.resolve({ count: 0, error: null }),
      then: (callback: (value: { data: unknown[]; error: unknown; count?: number }) => unknown) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(callback);
      },
      catch: (callback: (reason: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).catch(callback);
      }
    };
    return mockFilterBuilder;
  };

  const mockSupabase = {
    from: () => ({
      select: (options: { count?: string } = {}) => {
        const builder = createMockFilterBuilder();
        if (options.count) {
          return {
            ...builder,
            then: (callback: (value: { data: unknown[]; error: unknown; count?: number }) => unknown) => {
              return Promise.resolve({ data: [], error: null, count: 0 }).then(callback);
            },
            catch: (callback: (reason: unknown) => unknown) => {
              return Promise.resolve({ data: [], error: null, count: 0 }).catch(callback);
            }
          };
        }
        return builder;
      },
      insert: () => ({
        select: () => createMockFilterBuilder(),
        then: (callback: (value: { data: unknown; error: unknown }) => unknown) => {
          return Promise.resolve({ data: null, error: null }).then(callback);
        },
        catch: (callback: (reason: unknown) => unknown) => {
          return Promise.resolve({ data: null, error: null }).catch(callback);
        }
      }),
      upsert: () => ({
        select: () => ({
          then: (callback: (value: { data: unknown; error: unknown }) => unknown) => {
            return Promise.resolve({ data: null, error: null }).then(callback);
          },
          catch: (callback: (reason: unknown) => unknown) => {
            return Promise.resolve({ data: null, error: null }).catch(callback);
          }
        }),
        then: (callback: (value: { data: unknown; error: unknown }) => unknown) => {
          return Promise.resolve({ data: null, error: null }).then(callback);
        },
        catch: (callback: (reason: unknown) => unknown) => {
          return Promise.resolve({ data: null, error: null }).catch(callback);
        }
      }),
      update: () => createMockFilterBuilder(),
      delete: () => createMockFilterBuilder()
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      setSession: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      signInWithOtp: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      verifyOtp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }),
      admin: {
        listUsers: () => Promise.resolve({ data: { users: [] }, error: null })
      }
    },
    channel: () => ({
      on: function() {
        return {
          subscribe: function() {
            return {
              unsubscribe: function() {}
            }
          }
        }
      },
      subscribe: function() {
        return {
          unsubscribe: function() {}
        }
      },
      unsubscribe: function() {}
    }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: [], error: null }),
        upload: () => Promise.resolve({ data: { path: '' }, error: null }),
        download: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        remove: () => Promise.resolve({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  };
  
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