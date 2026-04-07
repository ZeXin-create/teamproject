-- 创建用户等级表
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience INTEGER DEFAULT 0, -- 经验值
  level INTEGER DEFAULT 1, -- 等级
  activity_score INTEGER DEFAULT 0, -- 活跃度分数
  contribution_score INTEGER DEFAULT 0, -- 贡献度分数
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 最后活跃时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 创建用户活动记录表
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 活动类型：login, recruit, application, battle, etc.
  points INTEGER NOT NULL, -- 获得的经验值或分数
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);

-- 创建函数更新 updated_at
CREATE OR REPLACE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 user_levels 表添加触发器
CREATE TRIGGER update_user_levels_updated_at
BEFORE UPDATE ON user_levels
FOR EACH ROW
EXECUTE FUNCTION update_user_levels_updated_at();

-- 插入默认数据的函数
CREATE OR REPLACE FUNCTION create_user_level(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_levels (user_id, experience, level, activity_score, contribution_score)
  VALUES (user_id, 0, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
