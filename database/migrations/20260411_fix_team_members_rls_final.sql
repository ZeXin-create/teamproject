-- 修复 team_members RLS 问题

-- 1. 在 teams 表中添加 captain_id 字段
ALTER TABLE teams ADD COLUMN captain_id UUID REFERENCES profiles(id);

-- 2. 为 team_members 表启用 RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. 创建 team_members 表的 RLS 策略
-- 所有成员可读自己的记录
CREATE POLICY "成员可读自己的记录" ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- 队长可读、写、删所有成员记录
CREATE POLICY "队长可管理所有成员" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.captain_id = auth.uid()
    )
  );

-- 4. 为 teams 表更新 RLS 策略，使用 captain_id
-- 删除旧策略
DROP POLICY IF EXISTS "队长可更新 teams" ON teams;
DROP POLICY IF EXISTS "所有成员可读 teams" ON teams;

-- 创建新策略
CREATE POLICY "队长可管理战队" ON teams
  FOR ALL USING (captain_id = auth.uid());

CREATE POLICY "所有成员可读战队" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
    )
  );
