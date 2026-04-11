-- 删除 team_members 表的所有 RLS 策略，以解决无限递归问题

-- 删除可能存在的策略
DROP POLICY IF EXISTS "Team members can view group batches" ON team_members;
DROP POLICY IF EXISTS "Team captains can manage group batches" ON team_members;
DROP POLICY IF EXISTS "队长可写 team_members" ON team_members;
DROP POLICY IF EXISTS "成员可读自己的 team_members 记录" ON team_members;

-- 禁用 team_members 表的 RLS
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
