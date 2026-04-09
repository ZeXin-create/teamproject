import { supabase } from '../lib/supabase';

// 战队信息类型
export interface TeamInfo {
  id?: string;
  team_id: string;
  establishment_date?: string;
  team_declaration?: string;
  management_rules?: string;
  training_schedule?: string;
  competition_strategy?: string;
  short_term_goals?: string;
  long_term_goals?: string;
  created_at?: string;
  updated_at?: string;
}

// 队员资料类型
export interface PlayerProfileUpdate {
  game_style?: string;
  current_status?: string;
  current_rank?: string;
  rank_updated_at?: string;
  status_updated_at?: string;
}

// 比赛记录类型
export interface MatchRecord {
  id?: string;
  team_id: string;
  match_date: string;
  opponent: string;
  result: string;
  score?: string;
  analysis?: string;
  created_at?: string;
  updated_at?: string;
}

// 训练计划类型
export interface TrainingPlan {
  id?: string;
  team_id: string;
  plan_name: string;
  training_date: string;
  start_time?: string;
  end_time?: string;
  participants?: string[];
  content?: string;
  效果_analysis?: string;
  created_at?: string;
  updated_at?: string;
}

// 数据管理服务
export class TeamDataService {
  // 战队信息相关
  static async getTeamInfo(teamId: string): Promise<TeamInfo | null> {
    try {
      const { data, error } = await supabase
        .from('team_info')
        .select('*')
        .eq('team_id', teamId)
        .single();
      
      if (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('获取战队信息失败:', error);
      throw error;
    }
  }
  
  static async createOrUpdateTeamInfo(teamId: string, data: TeamInfo): Promise<TeamInfo> {
    try {
      // 检查是否已存在
      const existingInfo = await this.getTeamInfo(teamId);
      
      if (existingInfo) {
        // 更新
        const { data: updatedInfo, error } = await supabase
          .from('team_info')
          .update(data)
          .eq('team_id', teamId)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        return updatedInfo;
      } else {
        // 创建
        const { data: newInfo, error } = await supabase
          .from('team_info')
          .insert({ ...data, team_id: teamId })
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        return newInfo;
      }
    } catch (error) {
      console.error('创建或更新战队信息失败:', error);
      throw error;
    }
  }
  
  // 队员资料相关
  static async updatePlayerProfile(user_id: string, team_id: string, data: PlayerProfileUpdate): Promise<PlayerProfileUpdate | null> {
    try {
      const { data: updatedProfile, error } = await supabase
        .from('player_profiles')
        .update(data)
        .eq('user_id', user_id)
        .eq('team_id', team_id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return updatedProfile;
    } catch (error) {
      console.error('更新队员资料失败:', error);
      throw error;
    }
  }
  

  
  // 数据统计相关
  static async getTeamStatistics(teamId: string): Promise<{
    totalMatches: number;
    wins: number;
    winRate: string;
    statusDistribution: Record<string, number>;
    rankDistribution: Record<string, number>;
    positionDistribution: Record<string, number>;
  }> {
    try {
      // 固定返回默认值
      const totalMatches = 0;
      const wins = 0;
      const winRate = '0.00';
      
      // 获取队员状态分布
      const { data: playerStats } = await supabase
        .from('player_profiles')
        .select('current_status, current_rank, main_positions')
        .eq('team_id', teamId);
      
      // 统计状态分布
      const statusDistribution = (playerStats as Array<{ current_status?: string }>)?.reduce((acc: Record<string, number>, player) => {
        if (player.current_status) {
          acc[player.current_status] = (acc[player.current_status] || 0) + 1;
        }
        return acc;
      }, {}) || {};
      
      // 统计段位分布
      const rankDistribution = (playerStats as Array<{ current_rank?: string }>)?.reduce((acc: Record<string, number>, player) => {
        if (player.current_rank) {
          acc[player.current_rank] = (acc[player.current_rank] || 0) + 1;
        }
        return acc;
      }, {}) || {};
      
      // 统计位置分布
      const positionDistribution = (playerStats as Array<{ main_positions?: string[] }>)?.reduce((acc: Record<string, number>, player) => {
        if (player.main_positions && Array.isArray(player.main_positions)) {
          player.main_positions.forEach(position => {
            acc[position] = (acc[position] || 0) + 1;
          });
        }
        return acc;
      }, {}) || {};
      
      return {
        totalMatches,
        wins,
        winRate,
        statusDistribution,
        rankDistribution,
        positionDistribution
      };
    } catch (error) {
      console.error('获取战队统计失败:', error);
      throw error;
    }
  }
  
  // 比赛记录相关
  static async getMatchRecords(teamId: string): Promise<MatchRecord[]> {
    try {
      const { data, error } = await supabase
        .from('match_records')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: false });
      
      if (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST116') {
          return [];
        }
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('获取比赛记录失败:', error);
      throw error;
    }
  }
  
  static async createMatchRecord(record: MatchRecord): Promise<MatchRecord> {
    try {
      const { data, error } = await supabase
        .from('match_records')
        .insert(record)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('创建比赛记录失败:', error);
      throw error;
    }
  }
  
  static async updateMatchRecord(id: string, record: MatchRecord): Promise<MatchRecord> {
    try {
      const { data, error } = await supabase
        .from('match_records')
        .update(record)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('更新比赛记录失败:', error);
      throw error;
    }
  }
  
  static async deleteMatchRecord(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('match_records')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('删除比赛记录失败:', error);
      throw error;
    }
  }
  
  // 训练计划相关
  static async getTrainingPlans(teamId: string): Promise<TrainingPlan[]> {
    try {
      const { data, error } = await supabase
        .from('training_plans')
        .select('*')
        .eq('team_id', teamId)
        .order('training_date', { ascending: false });
      
      if (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST116') {
          return [];
        }
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('获取训练计划失败:', error);
      throw error;
    }
  }
  
  static async createTrainingPlan(plan: TrainingPlan): Promise<TrainingPlan> {
    try {
      const { data, error } = await supabase
        .from('training_plans')
        .insert(plan)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('创建训练计划失败:', error);
      throw error;
    }
  }
  
  static async updateTrainingPlan(id: string, plan: TrainingPlan): Promise<TrainingPlan> {
    try {
      const { data, error } = await supabase
        .from('training_plans')
        .update(plan)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('更新训练计划失败:', error);
      throw error;
    }
  }
  
  static async deleteTrainingPlan(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('training_plans')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('删除训练计划失败:', error);
      throw error;
    }
  }
}
