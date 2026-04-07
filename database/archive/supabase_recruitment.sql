-- 创建team_recruits表
CREATE TABLE IF NOT EXISTS public.team_recruits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  rank TEXT NOT NULL,
  members_needed INTEGER NOT NULL,
  requirements TEXT,
  contact TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_team_recruits_team_id ON public.team_recruits(team_id);
CREATE INDEX IF NOT EXISTS idx_team_recruits_status ON public.team_recruits(status);

-- 创建team_applications表
CREATE TABLE IF NOT EXISTS public.team_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  rank TEXT NOT NULL,
  position TEXT NOT NULL,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  game_id TEXT,
  current_rank TEXT,
  main_positions JSONB,
  position_stats JSONB,
  available_time JSONB,
  accept_position_adjustment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_team_applications_team_id ON public.team_applications(team_id);
CREATE INDEX IF NOT EXISTS idx_team_applications_user_id ON public.team_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_team_applications_status ON public.team_applications(status);

-- 创建notifications表
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('team_application', 'team_invitation', 'match_result', 'system')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
