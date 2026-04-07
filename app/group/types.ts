// 分组相关类型定义

// 队员信息
export interface TeamMember {
  user_id: string;
  game_id: string;
  main_position: string;
  second_position?: string;
  score: number;
  unassigned_reason?: string;
}

// 分组信息
export interface Group {
  name: string;
  members: TeamMember[];
  average_score: number;
  hero_overlap_rate: number;
  warning?: string;
  missing_positions?: string[];
}

// 分组分析结果
export interface GroupAnalysis {
  totalScore: number;
  averageScore: number;
  positionCount: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
}

// 分组响应数据
export interface GroupResponse {
  groups: Group[];
  unassigned: TeamMember[];
  error?: string;
}
