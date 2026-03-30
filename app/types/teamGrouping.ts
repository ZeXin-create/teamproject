// 位置类型
export type Position = '上单' | '打野' | '中单' | '射手' | '辅助';

// 英雄类型
export interface Hero {
  id: number;
  name: string;
  position: Position;
  image_url?: string;
}

// 可比赛时间段类型
export interface AvailableTime {
  day: string; // 周一到周日
  start_time: string; // 开始时间，格式：HH:MM
  end_time: string; // 结束时间，格式：HH:MM
}

// 队员游戏资料类型
export interface PlayerProfile {
  id: string;
  user_id: string;
  team_id: string;
  game_id?: string;
  main_positions: Position[];
  historical_rating?: number;
  recent_rating?: number;
  position_stats?: Record<string, PositionStats>;
  available_time: AvailableTime[];
  accept_position_adjustment: boolean;
  current_rank?: string;
  rank_updated_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    nickname?: string;
    avatar?: string;
  };
  heroes?: Hero[];
}

// 分组类型
export interface TeamGroup {
  id: string;
  team_id: string;
  group_name: string;
  created_at: string;
  updated_at: string;
  members?: {
    id: string;
    user_id: string;
    user: {
      id: string;
      email: string;
      nickname?: string;
      avatar?: string;
    };
    profile?: PlayerProfile;
  }[];
}

// 位置统计数据类型
export interface PositionStats {
  win_rate: string;
  kda: string;
  rating: string;
  heroes: number[];
}

// 创建/更新队员资料请求类型
export interface CreatePlayerProfileRequest {
  game_id?: string;
  current_rank?: string;
  main_positions?: Position[];
  position_stats?: Record<string, PositionStats>;
  available_time?: AvailableTime[];
  accept_position_adjustment: boolean;
  hero_ids?: number[];
}

// 分组请求类型
export interface CreateGroupsRequest {
  team_id: string;
  group_count: number; // 要创建的小组数量
}

// 手动调整分组请求类型
export interface UpdateGroupMembersRequest {
  group_id: string;
  user_ids: string[];
}
