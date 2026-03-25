-- 更新 team_recruits 表结构，添加筛选所需字段
ALTER TABLE team_recruits
ADD COLUMN IF NOT EXISTS rank_requirement TEXT, -- 段位要求
ADD COLUMN IF NOT EXISTS positions TEXT[], -- 擅长位置数组
ADD COLUMN IF NOT EXISTS online_time TEXT, -- 在线时间要求
ADD COLUMN IF NOT EXISTS recruit_count INTEGER, -- 招募人数
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE, -- 招募截止日期
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- 招募状态

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_team_recruits_rank_requirement ON team_recruits(rank_requirement);
CREATE INDEX IF NOT EXISTS idx_team_recruits_status ON team_recruits(status);
