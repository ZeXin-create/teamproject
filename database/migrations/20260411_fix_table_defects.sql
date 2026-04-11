-- 修复数据表缺陷

-- 1. 为 team_sales 表添加 seller_id 字段
ALTER TABLE team_sales ADD COLUMN seller_id UUID REFERENCES profiles(id);

-- 2. 为 team_recruits 表添加缺失的字段
ALTER TABLE team_recruits ADD COLUMN position TEXT;
ALTER TABLE team_recruits ADD COLUMN rank TEXT;
ALTER TABLE team_recruits ADD COLUMN members_needed INTEGER;
ALTER TABLE team_recruits ADD COLUMN title TEXT;
ALTER TABLE team_recruits ADD COLUMN image_url TEXT;
