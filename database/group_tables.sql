-- 智能分组模块新增 - 数据库表
-- 表名前缀: group_

-- 分组批次表
CREATE TABLE IF NOT EXISTS group_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  batch_name VARCHAR(100),
  group_count INTEGER NOT NULL DEFAULT 2,
  algorithm VARCHAR(50) DEFAULT 'genetic_algorithm',
  generations INTEGER DEFAULT 100,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 分组结果表
CREATE TABLE IF NOT EXISTS group_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES group_batches(id) ON DELETE CASCADE,
  group_index INTEGER NOT NULL,
  group_name VARCHAR(50) NOT NULL,
  average_score DECIMAL(5,2),
  position_coverage TEXT[],
  hero_diversity DECIMAL(3,2),
  time_overlap DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 分组成员表
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES group_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  position VARCHAR(20) NOT NULL,
  score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(result_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_group_batches_team_id ON group_batches(team_id);
CREATE INDEX IF NOT EXISTS idx_group_batches_status ON group_batches(status);
CREATE INDEX IF NOT EXISTS idx_group_batches_created_at ON group_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_results_batch_id ON group_results(batch_id);
CREATE INDEX IF NOT EXISTS idx_group_members_result_id ON group_members(result_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- 添加注释
COMMENT ON TABLE group_batches IS '智能分组批次表';
COMMENT ON TABLE group_results IS '智能分组结果表';
COMMENT ON TABLE group_members IS '智能分组成员表';
