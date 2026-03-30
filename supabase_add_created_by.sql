-- 为 team_recruits 表添加 created_by 字段
ALTER TABLE team_recruits
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 为 created_by 字段创建索引
CREATE INDEX IF NOT EXISTS idx_team_recruits_created_by ON team_recruits(created_by);