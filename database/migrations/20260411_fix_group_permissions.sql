-- 补充组长权限和细化副队长权限

-- 1. 为 player_profiles 表增加组长可读本小组成员的 RLS 策略
-- 组长可读本小组成员资料
CREATE POLICY "组长可读本小组成员资料" ON player_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN group_members gm ON gm.user_id = tm.user_id
      JOIN group_members gm2 ON gm2.batch_id = gm.batch_id
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'group_leader'
      AND gm2.user_id = player_profiles.user_id
      AND player_profiles.team_id = tm.team_id
    )
  );

-- 2. 细化副队长权限，禁止副队长修改成员的 role 字段
-- 首先删除现有的副队长权限策略
DROP POLICY IF EXISTS "副队长可踢出队员" ON team_members;

-- 创建新的副队长权限策略，只允许删除（踢出），不允许修改角色
CREATE POLICY "副队长可踢出队员" ON team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members as tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.team_id = team_members.team_id 
      AND tm.role = 'vice_captain'
    )
    AND team_members.role IN ('member', 'group_leader')
  );

-- 3. 为 team_members 表添加更新策略，只允许修改非角色字段
CREATE POLICY "副队长可更新队员非角色字段" ON team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members as tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.team_id = team_members.team_id 
      AND tm.role = 'vice_captain'
    )
    AND team_members.role IN ('member', 'group_leader')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members as tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.team_id = team_members.team_id 
      AND tm.role = 'vice_captain'
    )
    AND team_members.role IN ('member', 'group_leader')
  );
