-- 优化数据库表结构

-- 1. 修改 player_profiles 表
ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. 创建 player_position_stats 表
CREATE TABLE IF NOT EXISTS player_position_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  position VARCHAR(20) NOT NULL,
  win_rate DECIMAL(5,2),
  kda DECIMAL(4,2),
  rating DECIMAL(5,1),
  power INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_profile_id, position)
);

-- 3. 修改 player_heroes 表
ALTER TABLE player_heroes
  ADD COLUMN IF NOT EXISTS proficiency INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_frequency INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. 修改 team_members 表
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS join_method VARCHAR(20) DEFAULT 'apply',
  ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 5. 修改 team_groups 表
ALTER TABLE team_groups
  ADD COLUMN IF NOT EXISTS group_type VARCHAR(20) DEFAULT 'training',
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 6. 修改 group_members 表
ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 7. 添加索引
CREATE INDEX IF NOT EXISTS idx_player_profiles_user_team ON player_profiles(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_player_position_stats_profile ON player_position_stats(player_profile_id);
CREATE INDEX IF NOT EXISTS idx_player_heroes_profile ON player_heroes(player_profile_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_groups_team ON team_groups(team_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
