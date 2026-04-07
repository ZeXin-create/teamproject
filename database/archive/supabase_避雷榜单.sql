-- 创建避雷榜单表
CREATE TABLE IF NOT EXISTS避雷榜单 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  evidence TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_避雷榜单_team_id ON 避雷榜单(team_id);
CREATE INDEX IF NOT EXISTS idx_避雷榜单_reporter_id ON 避雷榜单(reporter_id);
