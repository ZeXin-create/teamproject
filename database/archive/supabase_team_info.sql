-- 创建战队信息表

CREATE TABLE IF NOT EXISTS team_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  establishment_date DATE, -- 成立时间
  team_declaration TEXT, -- 战队宣言
  management_rules TEXT, -- 队内管理制度
  training_schedule TEXT, -- 训练安排
  competition_strategy TEXT, -- 比赛策略
  short_term_goals TEXT, -- 短期目标
  long_term_goals TEXT, -- 长期目标
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id)
);

-- 为team_info表添加触发器
CREATE TRIGGER update_team_info_updated_at
BEFORE UPDATE ON team_info
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_team_info_team_id ON team_info(team_id);
