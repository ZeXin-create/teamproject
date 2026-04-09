// 帖子分类枚举
export enum PostCategory {
  TEAM_RECRUIT = 'team_recruit',      // 战队招募
  TEAM_SHARE = 'team_share',          // 战队分享
  GAME_STRATEGY = 'game_strategy',    // 游戏攻略
  HERO_DISCUSSION = 'hero_discussion', // 英雄讨论
  MATCH_DISCUSSION = 'match_discussion', // 比赛讨论
  OFF_TOPIC = 'off_topic'             // 其他话题
}

// 分类映射表（用于字符串到枚举的转换）
const categoryLabelMap: Record<string, string> = {
  'team_recruit': '战队招募',
  'team_share': '战队分享',
  'game_strategy': '游戏攻略',
  'hero_discussion': '英雄讨论',
  'match_discussion': '比赛讨论',
  'off_topic': '其他话题'
};

const categoryColorMap: Record<string, string> = {
  'team_recruit': 'bg-blue-100 text-blue-600',
  'team_share': 'bg-green-100 text-green-600',
  'game_strategy': 'bg-purple-100 text-purple-600',
  'hero_discussion': 'bg-orange-100 text-orange-600',
  'match_discussion': 'bg-red-100 text-red-600',
  'off_topic': 'bg-gray-100 text-gray-600'
};

// 帖子类型定义
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  author_id: string;
  team_id?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    nickname?: string;
    avatar?: string;
  };
  team?: {
    id: string;
    name: string;
  };
  is_liked?: boolean;
}

// 评论类型定义
export interface ForumComment {
  id: string;
  post_id: string;
  parent_id?: string;
  author_id: string;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    nickname?: string;
    avatar?: string;
  };
  replies?: ForumComment[];
  is_liked?: boolean;
}

// 创建帖子请求类型
export interface CreatePostRequest {
  title: string;
  content: string;
  category: PostCategory;
  team_id?: string;
  author_id: string;
}

// 创建评论请求类型
export interface CreateCommentRequest {
  post_id: string;
  parent_id?: string;
  content: string;
}

// 帖子列表查询参数类型
export interface PostQueryParams {
  category?: PostCategory;
  team_id?: string;
  author_id?: string;
  sort_by?: 'created_at' | 'view_count' | 'like_count' | 'comment_count';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

// 获取分类标签
export function getCategoryLabel(category: PostCategory | string): string {
  // 首先尝试从映射表中查找
  const categoryStr = String(category);
  if (categoryLabelMap[categoryStr]) {
    return categoryLabelMap[categoryStr];
  }
  
  // 回退到枚举匹配
  switch (category) {
    case PostCategory.TEAM_RECRUIT:
    case 'team_recruit':
      return '战队招募';
    case PostCategory.TEAM_SHARE:
    case 'team_share':
      return '战队分享';
    case PostCategory.GAME_STRATEGY:
    case 'game_strategy':
      return '游戏攻略';
    case PostCategory.HERO_DISCUSSION:
    case 'hero_discussion':
      return '英雄讨论';
    case PostCategory.MATCH_DISCUSSION:
    case 'match_discussion':
      return '比赛讨论';
    case PostCategory.OFF_TOPIC:
    case 'off_topic':
      return '其他话题';
    default:
      // 如果传入的是其他值，尝试直接显示
      return categoryStr || '未知分类';
  }
}

// 获取分类颜色
export function getCategoryColor(category: PostCategory | string): string {
  // 首先尝试从映射表中查找
  const categoryStr = String(category);
  if (categoryColorMap[categoryStr]) {
    return categoryColorMap[categoryStr];
  }
  
  // 回退到枚举匹配
  switch (category) {
    case PostCategory.TEAM_RECRUIT:
    case 'team_recruit':
      return 'bg-blue-100 text-blue-600';
    case PostCategory.TEAM_SHARE:
    case 'team_share':
      return 'bg-green-100 text-green-600';
    case PostCategory.GAME_STRATEGY:
    case 'game_strategy':
      return 'bg-purple-100 text-purple-600';
    case PostCategory.HERO_DISCUSSION:
    case 'hero_discussion':
      return 'bg-orange-100 text-orange-600';
    case PostCategory.MATCH_DISCUSSION:
    case 'match_discussion':
      return 'bg-red-100 text-red-600';
    case PostCategory.OFF_TOPIC:
    case 'off_topic':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
