'use client';

import { supabase } from '../lib/supabase';
import {
  ForumPost,
  ForumComment,
  CreatePostRequest,
  CreateCommentRequest,
  PostQueryParams
} from '../types/forum';
import { sendNotification } from './notificationService';

// 创建帖子
export const createPost = async (data: CreatePostRequest): Promise<ForumPost> => {
  // 验证必填字段
  if (!data.title || !data.content || !data.category || !data.author_id) {
    throw new Error('缺少必填字段');
  }

  // 验证标题长度
  if (data.title.length < 5 || data.title.length > 100) {
    throw new Error('标题长度必须在5-100个字符之间');
  }

  // 验证内容长度
  if (data.content.length < 10) {
    throw new Error('内容长度必须至少10个字符');
  }

  // 创建帖子
  const { data: newPost, error } = await supabase
    .from('forum_posts')
    .insert({
      title: data.title,
      content: data.content,
      category: data.category,
      author_id: data.author_id,
      team_id: data.team_id || null,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      is_pinned: false,
      is_locked: false
    })
    .select()
    .single();

  if (error) {
    throw new Error(`创建帖子失败: ${error.message}`);
  }

  return newPost as ForumPost;
};

// 获取帖子列表
export const getPosts = async (params: PostQueryParams = {}): Promise<ForumPost[]> => {
  let query = supabase
    .from('forum_posts')
    .select('*');

  // 应用筛选条件
  if (params.category) {
    query = query.eq('category', params.category);
  }

  if (params.team_id) {
    query = query.eq('team_id', params.team_id);
  }

  if (params.author_id) {
    query = query.eq('author_id', params.author_id);
  }

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`);
  }

  // 应用排序
  const sortBy = params.sort_by || 'created_at';
  const sortOrder = params.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // 置顶帖子优先
  query = query.order('is_pinned', { ascending: false });

  // 应用分页
  if (params.page && params.limit) {
    const offset = (params.page - 1) * params.limit;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取帖子列表失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
  }

  // 获取作者信息
  const posts = data as ForumPost[];
  for (const post of posts) {
    const { data: authorData } = await supabase
      .from('profiles')
      .select('id, nickname, avatar')
      .eq('id', post.author_id)
      .single();

    if (authorData) {
      post.author = authorData;
    }

    if (post.team_id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', post.team_id)
        .single();

      if (teamData) {
        post.team = teamData;
      }
    }
  }

  return posts;
};

// 获取帖子详情
export const getPostById = async (id: string, userId?: string): Promise<ForumPost> => {
  // 获取帖子详情
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`获取帖子详情失败: ${error.message}`);
  }

  // 增加浏览量
  await supabase
    .from('forum_posts')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id);

  const post = data as ForumPost;

  // 获取作者信息
  const { data: authorData } = await supabase
    .from('profiles')
    .select('id, nickname, avatar')
    .eq('id', post.author_id)
    .single();

  if (authorData) {
    post.author = authorData;
  }

  // 获取战队信息
  if (post.team_id) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', post.team_id)
      .single();

    if (teamData) {
      post.team = teamData;
    }
  }

  // 检查是否已点赞
  if (userId) {
    const { data: likeData } = await supabase
      .from('forum_post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .single();

    post.is_liked = !!likeData;
  }

  return post;
};

// 点赞帖子
export const togglePostLike = async (postId: string, userId: string): Promise<boolean> => {
  // 检查是否已点赞
  const { data: existingLike } = await supabase
    .from('forum_post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    // 取消点赞
    const { error } = await supabase
      .from('forum_post_likes')
      .delete()
      .eq('id', existingLike.id);

    if (error) {
      throw new Error(`取消点赞失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
    }
    return false;
  } else {
    // 点赞
    const { error } = await supabase
      .from('forum_post_likes')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (error) {
      throw new Error(`点赞失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
    }
    return true;
  }
};

// 创建评论
export const createComment = async (data: CreateCommentRequest, userId: string): Promise<ForumComment> => {
  if (!data.content || data.content.trim().length === 0) {
    throw new Error('评论内容不能为空');
  }

  const { data: newComment, error } = await supabase
    .from('forum_comments')
    .insert({
      ...data,
      author_id: userId,
      like_count: 0
    })
    .select()
    .single();

  if (error) {
    throw new Error(`创建评论失败: ${error.message}`);
  }

  // 通知帖子作者
  try {
    // 获取帖子信息，包括作者ID
    const { data: post } = await supabase
      .from('forum_posts')
      .select('author_id, title')
      .eq('id', data.post_id)
      .single();

    // 检查评论者是否是帖子作者
    if (post && post.author_id !== userId) {
      // 发送通知给帖子作者
      await sendNotification({
        user_id: post.author_id,
        title: '新的评论',
        message: `您的帖子《${post.title}》收到了新的评论，快去看看吧！`,
        type: 'info',
        link: `/forum/${data.post_id}`
      });
    }
  } catch (err) {
    console.error('发送评论通知失败:', err);
    // 通知失败不影响评论创建
  }

  return newComment as ForumComment;
};

// 获取帖子评论
export const getPostComments = async (postId: string, userId?: string): Promise<ForumComment[]> => {
  const { data, error } = await supabase
    .from('forum_comments')
    .select('*')
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`获取评论失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
  }

  const comments = data as ForumComment[];

  // 获取作者信息和回复
  for (const comment of comments) {
    const { data: authorData } = await supabase
      .from('profiles')
      .select('id, nickname, avatar')
      .eq('id', comment.author_id)
      .single();

    if (authorData) {
      comment.author = authorData;
    }

    // 检查是否已点赞
    if (userId) {
      const { data: likeData } = await supabase
        .from('forum_comment_likes')
        .select('id')
        .eq('comment_id', comment.id)
        .eq('user_id', userId)
        .single();

      comment.is_liked = !!likeData;
    }

    // 获取回复
    const { data: replies } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('parent_id', comment.id)
      .order('created_at', { ascending: true });

    if (replies && replies.length > 0) {
      comment.replies = replies as ForumComment[];

      // 获取回复作者信息
      for (const reply of comment.replies) {
        const { data: replyAuthorData } = await supabase
          .from('profiles')
          .select('id, nickname, avatar')
          .eq('id', reply.author_id)
          .single();

        if (replyAuthorData) {
          reply.author = replyAuthorData;
        }

        // 检查回复是否已点赞
        if (userId) {
          const { data: replyLikeData } = await supabase
            .from('forum_comment_likes')
            .select('id')
            .eq('comment_id', reply.id)
            .eq('user_id', userId)
            .single();

          reply.is_liked = !!replyLikeData;
        }
      }
    }
  }

  return comments;
};

// 点赞评论
export const toggleCommentLike = async (commentId: string, userId: string): Promise<boolean> => {
  // 检查是否已点赞
  const { data: existingLike } = await supabase
    .from('forum_comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    // 取消点赞
    const { error } = await supabase
      .from('forum_comment_likes')
      .delete()
      .eq('id', existingLike.id);

    if (error) {
      throw new Error(`取消点赞失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
    }
    return false;
  } else {
    // 点赞
    const { error } = await supabase
      .from('forum_comment_likes')
      .insert({
        comment_id: commentId,
        user_id: userId
      });

    if (error) {
      throw new Error(`点赞失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
    }
    return true;
  }
};