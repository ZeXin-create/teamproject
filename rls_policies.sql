-- 启用 RLS 并配置基本策略

-- 1. teams 表
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 队长可写（需要通过 team_members 表判断角色）
CREATE POLICY "队长可写 teams" ON teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid() 
      AND role = '队长'
    )
  );

CREATE POLICY "队长可更新 teams" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid() 
      AND role = '队长'
    )
  );

CREATE POLICY "队长可删除 teams" ON teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid() 
      AND role = '队长'
    )
  );

-- 所有成员可读
CREATE POLICY "成员可读 teams" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid()
    )
  );

-- 2. team_members 表
-- 暂时禁用 RLS 以避免无限递归问题
-- ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 暂时不创建 team_members 的 RLS 策略，避免无限递归
-- 后续将设计更安全的策略


-- 3. player_profiles 表
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

-- 用户可读写自己的资料
CREATE POLICY "用户可写自己的 player_profiles" ON player_profiles
  FOR ALL USING (
    user_id = auth.uid()
  );

-- 队长可读所有
CREATE POLICY "队长可读所有 player_profiles" ON player_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = player_profiles.team_id 
      AND user_id = auth.uid() 
      AND role = '队长'
    )
  );

-- 4. forum_posts 表
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- 作者可写
CREATE POLICY "作者可写 forum_posts" ON forum_posts
  FOR ALL USING (
    author_id = auth.uid()
  );

-- 所有人可读
CREATE POLICY "所有人可读 forum_posts" ON forum_posts
  FOR SELECT USING (
    true
  );

-- 5. team_sales 表
ALTER TABLE team_sales ENABLE ROW LEVEL SECURITY;

-- 卖家可写
CREATE POLICY "卖家可写 team_sales" ON team_sales
  FOR ALL USING (
    seller_id = auth.uid()
  );

-- 所有人可读
CREATE POLICY "所有人可读 team_sales" ON team_sales
  FOR SELECT USING (
    true
  );
