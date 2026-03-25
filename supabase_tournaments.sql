-- 创建赛事表
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 赛事名称
  description TEXT, -- 赛事描述
  region TEXT NOT NULL, -- 游戏大区
  start_time TIMESTAMP WITH TIME ZONE NOT NULL, -- 开始时间
  end_time TIMESTAMP WITH TIME ZONE NOT NULL, -- 结束时间
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL, -- 报名截止时间
  max_teams INTEGER NOT NULL, -- 最大参赛队伍数
  status TEXT DEFAULT 'pending', -- 状态：pending, active, completed, cancelled
  prize_pool TEXT, -- 奖励池
  rules TEXT, -- 比赛规则
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建赛事报名表
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 状态：pending, approved, rejected
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, team_id)
);

-- 创建赛程表
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL, -- 轮次
  match_number INTEGER NOT NULL, -- 场次
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- 队伍1
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- 队伍2
  team1_score INTEGER DEFAULT 0, -- 队伍1分数
  team2_score INTEGER DEFAULT 0, -- 队伍2分数
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- 获胜队伍
  match_time TIMESTAMP WITH TIME ZONE, -- 比赛时间
  status TEXT DEFAULT 'scheduled', -- 状态：scheduled, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建赛事结果表
CREATE TABLE IF NOT EXISTS tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL, -- 排名
  prize TEXT, -- 奖励
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_region ON tournaments(region);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team_id ON tournament_registrations(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);

-- 创建函数更新 updated_at
CREATE OR REPLACE FUNCTION update_tournaments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tournament_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为表添加触发器
CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON tournaments
FOR EACH ROW
EXECUTE FUNCTION update_tournaments_updated_at();

CREATE TRIGGER update_tournament_matches_updated_at
BEFORE UPDATE ON tournament_matches
FOR EACH ROW
EXECUTE FUNCTION update_tournament_matches_updated_at();
