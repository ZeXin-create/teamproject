-- 智能分组模块 - 第二阶段功能扩展
-- 添加第二位置、固定核心、排除名单等功能

-- 1. 为player_profiles表添加第二位置字段
ALTER TABLE player_profiles 
ADD COLUMN IF NOT EXISTS secondary_positions TEXT[];

COMMENT ON COLUMN player_profiles.secondary_positions IS '第二擅长位置（替补位置）';

-- 2. 为group_batches表添加固定核心和排除名单字段
ALTER TABLE group_batches
ADD COLUMN IF NOT EXISTS fixed_members JSONB DEFAULT '[]'::jsonb;

ALTER TABLE group_batches
ADD COLUMN IF NOT EXISTS excluded_members UUID[] DEFAULT '{}'::uuid[];

COMMENT ON COLUMN group_batches.fixed_members IS '固定核心队员（必须同组），格式：[{user_id, position}]';
COMMENT ON COLUMN group_batches.excluded_members IS '排除名单（不参与本次分组）';

-- 3. 为group_results表添加分组理由字段
ALTER TABLE group_results
ADD COLUMN IF NOT EXISTS grouping_reasons JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN group_results.grouping_reasons IS '分组理由说明，格式：[{reason, description}]';

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_player_profiles_secondary_positions ON player_profiles USING GIN(secondary_positions);
CREATE INDEX IF NOT EXISTS idx_group_batches_fixed_members ON group_batches USING GIN(fixed_members);
CREATE INDEX IF NOT EXISTS idx_group_batches_excluded_members ON group_batches USING GIN(excluded_members);
