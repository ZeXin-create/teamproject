-- 移除触发器的解决方案

-- 1. 删除现有的触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. 删除现有的触发器函数
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. 确保profiles表存在
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 为现有用户创建资料（如果不存在）
INSERT INTO profiles (id, email, nickname)
SELECT 
  au.id,
  au.email,
  SPLIT_PART(au.email, '@', 1)
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 5. 设置基本的RLS策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 删除现有的策略
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 创建新的策略
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Profiles are viewable by everyone" ON profiles
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
