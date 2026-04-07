-- 创建 teams 表
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL, -- iOS QQ / 安卓QQ / 微信iOS / 微信安卓
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  declaration TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 team_members 表
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 队长 / 副队长 / 队员
  status TEXT DEFAULT 'active', -- active / pending / removed
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- 创建 team_applications 表
CREATE TABLE IF NOT EXISTS team_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending / approved / rejected
  -- 游戏资料字段（队长同意后转移到player_profiles）
  game_id TEXT, -- 游戏ID
  current_rank TEXT, -- 当前段位
  main_positions TEXT[], -- 常用位置
  position_stats JSONB, -- 位置数据（包含胜率、KDA、评分、战力、常用英雄）
  available_time JSONB, -- 可比赛时间段
  accept_position_adjustment BOOLEAN DEFAULT false, -- 是否接受位置微调
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 team_recruits 表
CREATE TABLE IF NOT EXISTS team_recruits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  requirements TEXT NOT NULL,
  contact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 indexes
CREATE INDEX IF NOT EXISTS idx_teams_region ON teams(region);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_applications_user_id ON team_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_team_applications_team_id ON team_applications(team_id);
CREATE INDEX IF NOT EXISTS idx_team_recruits_team_id ON team_recruits(team_id);

-- 创建函数更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 teams 表添加触发器
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 为 team_applications 表添加触发器
CREATE TRIGGER update_team_applications_updated_at
BEFORE UPDATE ON team_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 为 team_recruits 表添加触发器
CREATE TRIGGER update_team_recruits_updated_at
BEFORE UPDATE ON team_recruits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();