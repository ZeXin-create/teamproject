-- 创建战队公告表
CREATE TABLE IF NOT EXISTS team_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建战队赛记录表
CREATE TABLE IF NOT EXISTS team_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent TEXT NOT NULL,
  result TEXT NOT NULL, -- win / loss
  score TEXT NOT NULL,
  match_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_team_announcements_team_id ON team_announcements(team_id);
CREATE INDEX IF NOT EXISTS idx_team_announcements_created_at ON team_announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_team_matches_team_id ON team_matches(team_id);
CREATE INDEX IF NOT EXISTS idx_team_matches_match_time ON team_matches(match_time);

-- 为 team_announcements 表添加触发器
CREATE TRIGGER update_team_announcements_updated_at
BEFORE UPDATE ON team_announcements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 为 team_matches 表添加触发器
CREATE TRIGGER update_team_matches_updated_at
BEFORE UPDATE ON team_matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();