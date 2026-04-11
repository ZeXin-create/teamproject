-- 为 teams 表添加 captain_id 外键约束

-- 先检查并添加 captain_id 列（如果不存在）
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_id UUID;

-- 添加外键约束
ALTER TABLE teams ADD CONSTRAINT fk_teams_captain FOREIGN KEY (captain_id) REFERENCES profiles(id);
