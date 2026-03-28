// 帖子分类枚举
export enum PostCategory {
  TEAM_RECRUIT = 'team_recruit',      // 战队招募
  TEAM_SHARE = 'team_share',          // 战队分享
  GAME_STRATEGY = 'game_strategy',    // 游戏攻略
  HERO_DISCUSSION = 'hero_discussion', // 英雄讨论
  MATCH_DISCUSSION = 'match_discussion', // 比赛讨论
  OFF_TOPIC = 'off_topic'             // 其他话题
}

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
export function getCategoryLabel(category: PostCategory): string {
  switch (category) {
    case PostCategory.TEAM_RECRUIT:
      return '战队招募';
    case PostCategory.TEAM_SHARE:
      return '战队分享';
    case PostCategory.GAME_STRATEGY:
      return '游戏攻略';
    case PostCategory.HERO_DISCUSSION:
      return '英雄讨论';
    case PostCategory.MATCH_DISCUSSION:
      return '比赛讨论';
    case PostCategory.OFF_TOPIC:
      return '其他话题';
    default:
      return '未知分类';
  }
}

// 获取分类颜色
export function getCategoryColor(category: PostCategory): string {
  switch (category) {
    case PostCategory.TEAM_RECRUIT:
      return 'bg-blue-100 text-blue-600';
    case PostCategory.TEAM_SHARE:
      return 'bg-green-100 text-green-600';
    case PostCategory.GAME_STRATEGY:
      return 'bg-purple-100 text-purple-600';
    case PostCategory.HERO_DISCUSSION:
      return 'bg-orange-100 text-orange-600';
    case PostCategory.MATCH_DISCUSSION:
      return 'bg-red-100 text-red-600';
    case PostCategory.OFF_TOPIC:
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}