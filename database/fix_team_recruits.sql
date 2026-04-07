-- 为 team_recruits 表添加缺失的列
-- 请在 Supabase SQL Editor 中执行

-- 添加 title 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_recruits' AND column_name = 'title'
    ) THEN
        ALTER TABLE team_recruits ADD COLUMN title TEXT;
    END IF;
END $$;

-- 添加 description 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_recruits' AND column_name = 'description'
    ) THEN
        ALTER TABLE team_recruits ADD COLUMN description TEXT;
    END IF;
END $$;

-- 添加 requirements 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_recruits' AND column_name = 'requirements'
    ) THEN
        ALTER TABLE team_recruits ADD COLUMN requirements TEXT;
    END IF;
END $$;

-- 检查表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_recruits' 
ORDER BY ordinal_position;
