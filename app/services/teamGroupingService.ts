import { supabase } from '../lib/supabase';
import { Hero, PlayerProfile, TeamGroup, CreatePlayerProfileRequest, CreateGroupsRequest, UpdateGroupMembersRequest } from '../types/teamGrouping';

// 获取英雄库
export const getHeroes = async (): Promise<Hero[]> => {
  const { data, error } = await supabase
    .from('heroes')
    .select('*');

  if (error) {
    throw new Error('获取英雄库失败');
  }

  return data;
};

// 按位置获取英雄
export const getHeroesByPosition = async (position: string): Promise<Hero[]> => {
  const { data, error } = await supabase
    .from('heroes')
    .select('*')
    .eq('position', position);

  if (error) {
    throw new Error('获取英雄失败');
  }

  return data;
};

// 检查用户是否是战队成员
export const checkTeamMembership = async (user_id: string, team_id: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', user_id)
    .eq('team_id', team_id)
    .eq('status', 'active')
    .single();

  return !error && data !== null;
};

// 检查用户是否是战队队长
export const checkTeamCaptain = async (user_id: string, team_id: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', user_id)
    .eq('team_id', team_id)
    .eq('role', '队长')
    .eq('status', 'active')
    .single();

  return !error && data !== null;
};

// 获取队员游戏资料
export const getPlayerProfile = async (user_id: string, team_id: string): Promise<PlayerProfile | null> => {
  // 检查用户是否是战队成员
  const isMember = await checkTeamMembership(user_id, team_id);
  if (!isMember) {
    throw new Error('您不是该战队的成员');
  }

  // 获取队员资料
  const { data: profile, error: profileError } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', user_id)
    .eq('team_id', team_id)
    .single();

  if (profileError) {
    // PGRST116: 记录不存在
    // 406: Not Acceptable - 记录不存在或请求格式问题
    if (profileError.code === 'PGRST116' || profileError.code === '406') {
      return null;
    }
    console.error('获取队员资料失败:', profileError);
    throw new Error('获取队员资料失败: ' + profileError.message);
  }

  // 获取用户信息
  const { data: userData } = await supabase
    .from('profiles')
    .select('id, email, nickname, avatar')
    .eq('id', user_id)
    .single();

  // 获取擅长英雄
  const { data: heroData } = await supabase
    .from('player_heroes')
    .select('hero:hero_id(id, name, position, image_url)')
    .eq('player_profile_id', profile.id);

  return {
    ...profile,
    user: userData || { id: user_id, email: '', nickname: '未知用户' },
    heroes: heroData ? heroData.map((item) => item.hero) : []
  };
};

// 创建/更新队员游戏资料
export const createOrUpdatePlayerProfile = async (user_id: string, team_id: string, data: CreatePlayerProfileRequest): Promise<PlayerProfile> => {
  // 检查用户是否是战队成员
  const isMember = await checkTeamMembership(user_id, team_id);
  if (!isMember) {
    throw new Error('您不是该战队的成员');
  }

  // 检查是否已存在资料
  const existingProfile = await getPlayerProfile(user_id, team_id);

  let profileId: string;

  if (existingProfile) {
    // 更新现有资料
    const { data: updatedProfile, error } = await supabase
      .from('player_profiles')
      .update({
        main_positions: data.main_positions,
        historical_rating: data.historical_rating,
        recent_rating: data.recent_rating,
        available_time: data.available_time,
        accept_position_adjustment: data.accept_position_adjustment
      })
      .eq('user_id', user_id)
      .eq('team_id', team_id)
      .select()
      .single();

    if (error) {
      throw new Error('更新队员资料失败');
    }

    profileId = updatedProfile.id;

    // 删除旧的英雄关联
    await supabase
      .from('player_heroes')
      .delete()
      .eq('player_profile_id', profileId);
  } else {
    // 创建新资料
    const { data: newProfile, error } = await supabase
      .from('player_profiles')
      .insert({
        user_id,
        team_id,
        main_positions: data.main_positions,
        historical_rating: data.historical_rating,
        recent_rating: data.recent_rating,
        available_time: data.available_time,
        accept_position_adjustment: data.accept_position_adjustment
      })
      .select()
      .single();

    if (error) {
      throw new Error('创建队员资料失败');
    }

    profileId = newProfile.id;
  }

  // 添加新的英雄关联
  if (data.hero_ids.length > 0) {
    const heroInserts = data.hero_ids.map(hero_id => ({
      player_profile_id: profileId,
      hero_id
    }));

    const { error } = await supabase
      .from('player_heroes')
      .insert(heroInserts);

    if (error) {
      throw new Error('关联英雄失败');
    }
  }

  // 返回更新后的资料
  return await getPlayerProfile(user_id, team_id) as PlayerProfile;
};

// 获取战队所有队员资料
export const getTeamPlayerProfiles = async (user_id: string, team_id: string): Promise<PlayerProfile[]> => {
  // 检查用户是否是战队成员
  const isMember = await checkTeamMembership(user_id, team_id);
  if (!isMember) {
    throw new Error('您不是该战队的成员');
  }

  // 获取队员资料列表
  const { data: profiles, error: profilesError } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('team_id', team_id);

  if (profilesError) {
    throw new Error('获取战队队员资料失败');
  }

  // 为每个资料获取用户信息和英雄
  const profilesWithDetails = await Promise.all(
    profiles.map(async (profile) => {
      // 获取用户信息
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, email, nickname, avatar')
        .eq('id', profile.user_id)
        .single();

      // 获取擅长英雄
      const { data: heroData } = await supabase
        .from('player_heroes')
        .select('hero:hero_id(id, name, position, image_url)')
        .eq('player_profile_id', profile.id);

      return {
        ...profile,
        user: userData || { id: profile.user_id, email: '', nickname: '未知用户' },
        heroes: heroData ? heroData.map((item) => item.hero) : []
      };
    })
  );

  return profilesWithDetails;
};

// 获取战队未填写资料的队员数量
export const getTeamMissingProfilesCount = async (user_id: string, team_id: string): Promise<number> => {
  // 检查用户是否是战队成员
  const isMember = await checkTeamMembership(user_id, team_id);
  if (!isMember) {
    throw new Error('您不是该战队的成员');
  }

  // 获取战队所有队员
  const { data: teamMembers, error: membersError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', team_id)
    .eq('status', 'active');

  if (membersError) {
    throw new Error('获取战队队员失败');
  }

  const memberIds = teamMembers.map((member) => member.user_id);

  // 获取已填写资料的队员
  const { data: profiles, error: profilesError } = await supabase
    .from('player_profiles')
    .select('user_id')
    .eq('team_id', team_id)
    .in('user_id', memberIds);

  if (profilesError) {
    throw new Error('获取队员资料失败');
  }

  const profileIds = profiles.map((profile) => profile.user_id);
  const missingCount = memberIds.filter(id => !profileIds.includes(id)).length;

  return missingCount;
};





// 计算小组的位置分布
const calculatePositionDistribution = (group: PlayerProfile[]) => {
  const distribution = {
    '上单': 0,
    '打野': 0,
    '中单': 0,
    '射手': 0,
    '辅助': 0
  };

  group.forEach(player => {
    player.main_positions.forEach(position => {
      distribution[position]++;
    });
  });

  return distribution;
};

// 计算小组的平均评分
const calculateAverageRating = (group: PlayerProfile[]): number => {
  if (group.length === 0) return 0;
  const totalRating = group.reduce((sum, player) => sum + (player.recent_rating || 0), 0);
  return totalRating / group.length;
};

// 段位到数值的映射
const rankToValue = (rank: string): number => {
  const rankValues: Record<string, number> = {
    '青铜': 1,
    '白银': 2,
    '黄金': 3,
    '铂金': 4,
    '钻石': 5,
    '星耀': 6,
    '王者': 7,
    '荣耀王者': 8
  };
  return rankValues[rank] || 0;
};

// 计算小组的平均段位
const calculateAverageRank = (group: PlayerProfile[]): number => {
  if (group.length === 0) return 0;
  const totalRankValue = group.reduce((sum, player) => sum + rankToValue(player.current_rank || ''), 0);
  return totalRankValue / group.length;
};

// 检查小组段位差距
const checkRankDifference = (group: PlayerProfile[]): boolean => {
  if (group.length < 2) return true;
  const ranks = group.map(player => rankToValue(player.current_rank || '')).filter(value => value > 0);
  if (ranks.length === 0) return true;
  const maxRank = Math.max(...ranks);
  const minRank = Math.min(...ranks);
  return maxRank - minRank <= 5;
};

// 生成分组
export const createGroups = async (user_id: string, data: CreateGroupsRequest): Promise<TeamGroup[]> => {
  // 检查用户是否是战队队长
  const isCaptain = await checkTeamCaptain(user_id, data.team_id);
  if (!isCaptain) {
    throw new Error('只有队长才能生成分组');
  }

  // 获取战队所有队员资料
  const profiles = await getTeamPlayerProfiles(user_id, data.team_id);

  // 过滤出有资料的队员
  const eligiblePlayers = profiles.filter(profile =>
    profile.main_positions.length > 0 &&
    profile.available_time.length > 0
  );

  // 按段位和状态排序
  eligiblePlayers.sort((a, b) => {
    // 先按段位排序
    const rankDiff = rankToValue(b.current_rank || '') - rankToValue(a.current_rank || '');
    if (rankDiff !== 0) return rankDiff;
    // 再按状态排序
    const statusValues: Record<string, number> = { '良好': 3, '一般': 2, '低迷': 1 };
    return (statusValues[b.current_status || ''] || 0) - (statusValues[a.current_status || ''] || 0);
  });

  if (eligiblePlayers.length === 0) {
    throw new Error('没有足够的队员资料');
  }

  // 清空旧的分组
  await supabase
    .from('team_groups')
    .delete()
    .eq('team_id', data.team_id);

  // 生成新的分组
  const groups: PlayerProfile[][] = Array(data.group_count).fill(null).map(() => []);

  // 优先匹配时间重合的队员
  // 这里使用简化的分组算法，实际项目中可以使用更复杂的算法
  eligiblePlayers.forEach((player, index) => {
    const groupIndex = index % data.group_count;
    groups[groupIndex].push(player);
  });

  // 创建分组记录
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const createdGroups: TeamGroup[] = [];

  for (let i = 0; i < groups.length; i++) {
    const groupName = groupNames[i] || String.fromCharCode(65 + i);

    const { data: newGroup, error: groupError } = await supabase
      .from('team_groups')
      .insert({
        team_id: data.team_id,
        group_name: groupName
      })
      .select()
      .single();

    if (groupError) {
      throw new Error('创建分组失败');
    }

    // 添加队员到分组
    if (groups[i].length > 0) {
      const memberInserts = groups[i].map(player => ({
        group_id: newGroup.id,
        user_id: player.user_id
      }));

      const { error: memberError } = await supabase
        .from('group_members')
        .insert(memberInserts);

      if (memberError) {
        throw new Error('添加队员到分组失败');
      }
    }

    createdGroups.push(newGroup);
  }

  // 返回分组详情
  return await getTeamGroups(user_id, data.team_id);
};

// 获取战队分组
export const getTeamGroups = async (user_id: string, team_id: string): Promise<TeamGroup[]> => {
  // 检查用户是否是战队成员
  const isMember = await checkTeamMembership(user_id, team_id);
  if (!isMember) {
    throw new Error('您不是该战队的成员');
  }

  // 获取分组列表
  const { data: groups, error: groupsError } = await supabase
    .from('team_groups')
    .select('*')
    .eq('team_id', team_id)
    .order('group_name');

  if (groupsError) {
    throw new Error('获取分组失败');
  }

  // 为每个分组获取成员
  const groupsWithMembers = await Promise.all(
    groups.map(async (group: TeamGroup) => {
      // 获取分组成员
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('id, user_id')
        .eq('group_id', group.id);

      if (membersError) {
        console.error('获取分组成员失败:', membersError);
        return { ...group, members: [] };
      }

      // 获取成员详情
      const membersWithDetails = await Promise.all(
        members.map(async (member: { id: string; user_id: string }) => {
          // 获取用户信息
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, email, nickname, avatar')
            .eq('id', member.user_id)
            .single();

          if (userError) {
            console.error('获取用户信息失败:', userError);
          }

          // 获取用户游戏资料
          const { data: profileData } = await supabase
            .from('player_profiles')
            .select('id, main_positions, historical_rating, recent_rating, available_time, accept_position_adjustment')
            .eq('user_id', member.user_id)
            .eq('team_id', team_id)
            .single();

          let profileWithHeroes = null;
          if (profileData) {
            // 获取用户擅长英雄
            const { data: heroData } = await supabase
              .from('player_heroes')
              .select('hero:hero_id(id, name, position, image_url)')
              .eq('player_profile_id', profileData.id);

            if (heroData) {
              profileWithHeroes = {
                ...profileData,
                heroes: heroData.map((item) => item.hero)
              };
            } else {
              profileWithHeroes = profileData;
            }
          }

          return {
            ...member,
            user: userData || { id: member.user_id, email: '', nickname: '未知用户' },
            profile: profileWithHeroes as PlayerProfile || undefined
          };
        })
      );

      return {
        ...group,
        members: membersWithDetails
      };
    })
  );

  return groupsWithMembers;
};

// 更新分组队员
export const updateGroupMembers = async (user_id: string, data: UpdateGroupMembersRequest): Promise<void> => {
  // 获取分组所属的战队
  const { data: groupData, error: groupError } = await supabase
    .from('team_groups')
    .select('team_id')
    .eq('id', data.group_id)
    .single();

  if (groupError) {
    throw new Error('获取分组信息失败');
  }

  // 检查用户是否是战队队长
  const isCaptain = await checkTeamCaptain(user_id, groupData.team_id);
  if (!isCaptain) {
    throw new Error('只有队长才能调整分组');
  }

  // 清空旧的队员
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', data.group_id);

  // 添加新的队员
  if (data.user_ids.length > 0) {
    const memberInserts = data.user_ids.map(user_id => ({
      group_id: data.group_id,
      user_id
    }));

    const { error } = await supabase
      .from('group_members')
      .insert(memberInserts);

    if (error) {
      throw new Error('更新分组队员失败');
    }
  }
};

// 校验分组平衡性
export const validateGroupBalance = (group: PlayerProfile[]) => {
  const positionDistribution = calculatePositionDistribution(group);
  const averageRating = calculateAverageRating(group);
  const averageRank = calculateAverageRank(group);
  const rankDifferenceValid = checkRankDifference(group);

  // 检查位置分布
  const hasAllPositions = Object.values(positionDistribution).every(count => count > 0);

  // 检查评分均衡性（简化版）
  const ratingVariance = group.reduce((sum, player) => {
    return sum + Math.pow(player.recent_rating - averageRating, 2);
  }, 0) / group.length;

  const isRatingBalanced = ratingVariance < 100; // 评分方差小于100视为均衡

  // 检查状态分布
  const statusDistribution = group.reduce((acc: any, player) => {
    if (player.current_status) {
      acc[player.current_status] = (acc[player.current_status] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    hasAllPositions,
    isRatingBalanced,
    rankDifferenceValid,
    positionDistribution,
    statusDistribution,
    averageRating,
    averageRank
  };
};
