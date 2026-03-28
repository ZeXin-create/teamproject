-- 战队训练安排表
CREATE TABLE team_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  title TEXT NOT NULL,
  description TEXT,
  training_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_team_trainings_team_id ON team_trainings(team_id);
CREATE INDEX idx_team_trainings_training_time ON team_trainings(training_time);

-- 战队训练报名表
CREATE TABLE team_training_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES team_trainings(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(training_id, user_id)
);

-- 创建索引
CREATE INDEX idx_team_training_attendees_training_id ON team_training_attendees(training_id);
CREATE INDEX idx_team_training_attendees_user_id ON team_training_attendees(user_id);