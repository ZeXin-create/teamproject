-- 更新队员游戏资料表结构

-- 添加游戏风格字段
ALTER TABLE IF EXISTS player_profiles
ADD COLUMN IF NOT EXISTS game_style TEXT;

-- 添加近期状态字段
ALTER TABLE IF EXISTS player_profiles
ADD COLUMN IF NOT EXISTS current_status TEXT;

-- 添加段位字段
ALTER TABLE IF EXISTS player_profiles
ADD COLUMN IF NOT EXISTS current_rank TEXT;

-- 添加段位更新时间字段
ALTER TABLE IF EXISTS player_profiles
ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMP WITH TIME ZONE;

-- 添加状态更新时间字段
ALTER TABLE IF EXISTS player_profiles
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;

-- 更新触发器函数，确保updated_at字段在更新时自动更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为player_profiles表添加触发器（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_player_profiles_updated_at'
    AND tgrelid = 'player_profiles'::regclass
  ) THEN
    CREATE TRIGGER update_player_profiles_updated_at
    BEFORE UPDATE ON player_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_player_profiles_current_rank ON player_profiles(current_rank);
CREATE INDEX IF NOT EXISTS idx_player_profiles_current_status ON player_profiles(current_status);
