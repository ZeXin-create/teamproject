-- 创建英雄库表
CREATE TABLE IF NOT EXISTS heroes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL, -- 上单、打野、中单、射手、辅助
  image_url TEXT
);

-- 创建队员游戏资料表
CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_id TEXT, -- 游戏ID
  current_rank TEXT, -- 当前段位
  main_positions TEXT[], -- 常用位置
  position_stats JSONB, -- 位置数据（包含胜率、KDA、评分、战力、常用英雄）
  historical_rating INTEGER, -- 历史评分
  recent_rating INTEGER, -- 近期评分
  available_time JSONB, -- 可比赛时间段
  accept_position_adjustment BOOLEAN DEFAULT false, -- 是否接受位置微调
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- 创建队员擅长英雄表
CREATE TABLE IF NOT EXISTS player_heroes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_profile_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  hero_id INTEGER NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  UNIQUE(player_profile_id, hero_id)
);

-- 创建分组表
CREATE TABLE IF NOT EXISTS team_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL, -- A/B/C等
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建分组队员表
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES team_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id)
);

-- 创建触发器函数更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 player_profiles 表添加触发器
CREATE TRIGGER update_player_profiles_updated_at
BEFORE UPDATE ON player_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 为 team_groups 表添加触发器
CREATE TRIGGER update_team_groups_updated_at
BEFORE UPDATE ON team_groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_player_profiles_user_id ON player_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_player_profiles_team_id ON player_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_player_heroes_player_profile_id ON player_heroes(player_profile_id);
CREATE INDEX IF NOT EXISTS idx_team_groups_team_id ON team_groups(team_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_heroes_position ON heroes(position);

-- ============================================
-- 修复 player_profiles 表结构（解决400错误）
-- ============================================

-- 确保 game_id 字段存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'player_profiles' AND column_name = 'game_id') THEN
    ALTER TABLE player_profiles ADD COLUMN game_id TEXT;
  END IF;
END $$;

-- 确保 current_rank 字段存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'player_profiles' AND column_name = 'current_rank') THEN
    ALTER TABLE player_profiles ADD COLUMN current_rank TEXT;
  END IF;
END $$;

-- 确保 main_positions 字段存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'player_profiles' AND column_name = 'main_positions') THEN
    ALTER TABLE player_profiles ADD COLUMN main_positions TEXT[];
  END IF;
END $$;

-- 确保 position_stats 字段存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'player_profiles' AND column_name = 'position_stats') THEN
    ALTER TABLE player_profiles ADD COLUMN position_stats JSONB;
  END IF;
END $$;

-- 确保 available_time 字段存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'player_profiles' AND column_name = 'available_time') THEN
    ALTER TABLE player_profiles ADD COLUMN available_time JSONB;
  END IF;
END $$;

-- 确保 accept_position_adjustment 字段存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'player_profiles' AND column_name = 'accept_position_adjustment') THEN
    ALTER TABLE player_profiles ADD COLUMN accept_position_adjustment BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 创建 user_activities 表（战队动态）
-- ============================================

CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 活动类型：join/leave/match/training等
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB, -- 额外数据
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_activities_team_id ON user_activities(team_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);

-- ============================================
-- 启用 RLS 并添加策略
-- ============================================

-- 启用 player_profiles 表的 RLS
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（避免重复创建错误）
DROP POLICY IF EXISTS "允许用户查看自己的资料" ON player_profiles;
DROP POLICY IF EXISTS "允许用户插入自己的资料" ON player_profiles;
DROP POLICY IF EXISTS "允许用户更新自己的资料" ON player_profiles;
DROP POLICY IF EXISTS "允许队长查看队员资料" ON player_profiles;
DROP POLICY IF EXISTS "允许所有认证用户插入资料" ON player_profiles;
DROP POLICY IF EXISTS "允许所有认证用户更新资料" ON player_profiles;

-- 允许所有认证用户插入资料（解决403错误）
CREATE POLICY "允许所有认证用户插入资料"
ON player_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许用户查看自己的资料
CREATE POLICY "允许用户查看自己的资料"
ON player_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 允许用户更新自己的资料
CREATE POLICY "允许用户更新自己的资料"
ON player_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 允许队长/副队长查看队员资料
CREATE POLICY "允许队长查看队员资料"
ON player_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = player_profiles.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('队长', '副队长')
    AND tm.status = 'active'
  )
);

-- 启用 user_activities 表的 RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 允许所有认证用户查看战队动态
DROP POLICY IF EXISTS "允许查看战队动态" ON user_activities;
CREATE POLICY "允许查看战队动态"
ON user_activities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = user_activities.team_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
);

-- 允许所有认证用户插入战队动态
DROP POLICY IF EXISTS "允许插入战队动态" ON user_activities;
CREATE POLICY "允许插入战队动态"
ON user_activities FOR INSERT
TO authenticated
WITH CHECK (true);
