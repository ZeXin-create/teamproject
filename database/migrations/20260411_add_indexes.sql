-- 数据库索引优化

-- team_members 表：按 team_id 和 role 索引，加速队长查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team_role ON team_members(team_id, role);

-- player_profiles 表：按 team_id 和 user_id 索引，加速用户资料查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_profiles_team_user ON player_profiles(team_id, user_id);

-- forum_posts 表：按 created_at 降序索引，加速最新帖子查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);

-- team_sales 表：按 status 和 created_at 降序索引，加速交易列表查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_sales_status_created ON team_sales(status, created_at DESC);

-- team_recruits 表：按 created_at 降序索引，加速招募列表查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_recruits_created_at ON team_recruits(created_at DESC);

-- group_batches 表：按 team_id 索引，加速分组批次查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_batches_team_id ON group_batches(team_id);
