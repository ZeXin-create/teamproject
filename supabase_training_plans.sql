-- 创建训练计划表

CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL, -- 训练计划名称
  training_date DATE NOT NULL, -- 训练日期
  start_time TIME, -- 开始时间
  end_time TIME, -- 结束时间
  participants TEXT[], -- 参与人员（用户ID数组）
  content TEXT, -- 训练内容
 效果_analysis TEXT, -- 训练效果分析
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为training_plans表添加触发器
CREATE TRIGGER update_training_plans_updated_at
BEFORE UPDATE ON training_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_training_plans_team_id ON training_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_training_date ON training_plans(training_date);
