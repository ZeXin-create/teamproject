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
  main_positions TEXT[], -- 常用位置
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
