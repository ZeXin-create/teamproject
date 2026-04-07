-- 创建比赛记录表

CREATE TABLE IF NOT EXISTS match_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_date DATE NOT NULL, -- 比赛日期
  opponent TEXT NOT NULL, -- 对手
  result TEXT NOT NULL, -- 结果（胜利/失败）
  score TEXT, -- 比分
  analysis TEXT, -- 简单分析
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为match_records表添加触发器
CREATE TRIGGER update_match_records_updated_at
BEFORE UPDATE ON match_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_match_records_team_id ON match_records(team_id);
CREATE INDEX IF NOT EXISTS idx_match_records_match_date ON match_records(match_date);
CREATE INDEX IF NOT EXISTS idx_match_records_result ON match_records(result);
