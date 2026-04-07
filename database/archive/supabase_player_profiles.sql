-- 创建player_profiles表
CREATE TABLE IF NOT EXISTS public.player_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  game_id TEXT,
  current_rank TEXT,
  main_positions JSONB,
  position_stats JSONB,
  available_time JSONB,
  accept_position_adjustment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_player_profiles_user_id ON public.player_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_player_profiles_team_id ON public.player_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_player_profiles_user_team ON public.player_profiles(user_id, team_id);
