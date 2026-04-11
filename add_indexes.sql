CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_recruits_created_at ON team_recruits(created_at DESC); CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_batches_team_id ON group_batches(team_id);
