-- 创建分组成员表
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES group_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name VARCHAR(50) NOT NULL,
  position VARCHAR(20),
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建唯一约束：同一批次中同一队员只能出现一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique 
ON group_members(batch_id, user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_group_members_batch_id ON group_members(batch_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_name ON group_members(batch_id, group_name);

-- 启用 RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Team members can view group members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_batches 
      JOIN team_members ON team_members.team_id = group_batches.team_id
      WHERE group_batches.id = group_members.batch_id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team captains can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_batches 
      JOIN team_members ON team_members.team_id = group_batches.team_id
      WHERE group_batches.id = group_members.batch_id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('队长', '副队长')
    )
  );
