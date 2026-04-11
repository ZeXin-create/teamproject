-- 权限体系修复

-- 1. 统一 team_members 表的角色取值
-- 更新现有角色值为英文
UPDATE team_members SET role = 'captain' WHERE role = '队长';
UPDATE team_members SET role = 'vice_captain' WHERE role = '副队长';
UPDATE team_members SET role = 'leader' WHERE role = '领队';
UPDATE team_members SET role = 'group_leader' WHERE role = '组长';
UPDATE team_members SET role = 'member' WHERE role = '队员';

-- 2. 为所有核心表启用 RLS
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_sales ENABLE ROW LEVEL SECURITY;

-- 3. 补全 player_profiles 表的 RLS 策略
-- 所有成员可读自己的资料
CREATE POLICY "用户可读自己的资料" ON player_profiles
  FOR SELECT USING (user_id = auth.uid());

-- 队长、副队长、领队可读所有成员资料
CREATE POLICY "领导可读所有资料" ON player_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.user_id = auth.uid() 
      AND team_members.team_id = player_profiles.team_id 
      AND team_members.role IN ('captain', 'vice_captain', 'leader')
    )
  );

-- 所有成员可写自己的资料
CREATE POLICY "用户可写自己的资料" ON player_profiles
  FOR ALL USING (user_id = auth.uid());

-- 4. 补全 forum_posts 表的 RLS 策略
-- 所有人可读
CREATE POLICY "所有人可读帖子" ON forum_posts
  FOR SELECT USING (true);

-- 作者可更新、删除自己的帖子
CREATE POLICY "作者可管理自己的帖子" ON forum_posts
  FOR ALL USING (author_id = auth.uid());

-- 队长可管理所有帖子
CREATE POLICY "队长可管理所有帖子" ON forum_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.user_id = auth.uid() 
      AND team_members.team_id = forum_posts.team_id 
      AND team_members.role = 'captain'
    )
  );

-- 5. 补全 team_sales 表的 RLS 策略
-- 所有人可读
CREATE POLICY "所有人可读商品" ON team_sales
  FOR SELECT USING (true);

-- 卖家可更新、删除自己的商品
CREATE POLICY "卖家可管理自己的商品" ON team_sales
  FOR ALL USING (seller_id = auth.uid());

-- 队长可管理所有商品
CREATE POLICY "队长可管理所有商品" ON team_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.user_id = auth.uid() 
      AND team_members.team_id = team_sales.team_id 
      AND team_members.role = 'captain'
    )
  );

-- 6. 更新 team_members 表的 RLS 策略，添加副队长权限
-- 副队长可读所有成员记录
CREATE POLICY "副队长可读所有成员" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members as tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.team_id = team_members.team_id 
      AND tm.role = 'vice_captain'
    )
  );

-- 副队长可踢出普通队员（更新或删除）
CREATE POLICY "副队长可踢出队员" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members as tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.team_id = team_members.team_id 
      AND tm.role = 'vice_captain'
    )
    AND team_members.role IN ('member', 'group_leader')
  );
