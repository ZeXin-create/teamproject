-- 创建分组批次表
CREATE TABLE IF NOT EXISTS group_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_group_batches_team_id ON group_batches(team_id);
CREATE INDEX IF NOT EXISTS idx_group_batches_status ON group_batches(status);
CREATE INDEX IF NOT EXISTS idx_group_batches_team_status ON group_batches(team_id, status);

-- 启用 RLS
ALTER TABLE group_batches ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Team members can view group batches" ON group_batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = group_batches.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team captains can manage group batches" ON group_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = group_batches.team_id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('队长', '副队长')
    )
  );
