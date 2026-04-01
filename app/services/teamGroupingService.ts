import { supabase } from '../lib/supabase';
import { Hero, PlayerProfile, TeamGroup, CreatePlayerProfileRequest, CreateGroupsRequest, UpdateGroupMembersRequest } from '../types/teamGrouping';

// 默认英雄列表 - 2026年最新数据
const DEFAULT_HEROES: Hero[] = [
  // 上单 (对抗路)
  { id: 1, name: '亚瑟', position: '上单' },
  { id: 2, name: '吕布', position: '上单' },
  { id: 3, name: '程咬金', position: '上单' },
  { id: 4, name: '花木兰', position: '上单' },
  { id: 5, name: '铠', position: '上单' },
  { id: 6, name: '李信', position: '上单' },
  { id: 7, name: '马超', position: '上单' },
  { id: 8, name: '关羽', position: '上单' },
  { id: 9, name: '老夫子', position: '上单' },
  { id: 10, name: '狂铁', position: '上单' },
  { id: 11, name: '夏洛特', position: '上单' },
  { id: 12, name: '司空震', position: '上单' },
  { id: 13, name: '蒙恬', position: '上单' },
  { id: 14, name: '猪八戒', position: '上单' },
  { id: 15, name: '廉颇', position: '上单' },
  { id: 16, name: '白起', position: '上单' },
  { id: 17, name: '项羽', position: '上单' },
  { id: 18, name: '刘邦', position: '上单' },
  { id: 19, name: '哪吒', position: '上单' },
  { id: 20, name: '杨戬', position: '上单' },
  { id: 21, name: '达摩', position: '上单' },
  { id: 22, name: '钟无艳', position: '上单' },
  { id: 23, name: '夏侯惇', position: '上单' },
  { id: 24, name: '曜', position: '上单' },
  { id: 25, name: '赵怀真', position: '上单' },
  { id: 26, name: '姬小满', position: '上单' },
  { id: 27, name: '亚连', position: '上单' },
  { id: 28, name: '海诺', position: '上单' },
  { id: 29, name: '大司命', position: '上单' },
  { id: 30, name: '元流之子', position: '上单' },

  // 打野
  { id: 31, name: '韩信', position: '打野' },
  { id: 32, name: '李白', position: '打野' },
  { id: 33, name: '赵云', position: '打野' },
  { id: 34, name: '兰陵王', position: '打野' },
  { id: 35, name: '孙悟空', position: '打野' },
  { id: 36, name: '娜可露露', position: '打野' },
  { id: 37, name: '百里玄策', position: '打野' },
  { id: 38, name: '裴擒虎', position: '打野' },
  { id: 39, name: '云中君', position: '打野' },
  { id: 40, name: '镜', position: '打野' },
  { id: 41, name: '澜', position: '打野' },
  { id: 42, name: '云缨', position: '打野' },
  { id: 43, name: '暃', position: '打野' },
  { id: 44, name: '宫本武藏', position: '打野' },
  { id: 45, name: '典韦', position: '打野' },
  { id: 46, name: '阿轲', position: '打野' },
  { id: 47, name: '露娜', position: '打野' },
  { id: 48, name: '雅典娜', position: '打野' },
  { id: 49, name: '刘备', position: '打野' },
  { id: 50, name: '盘古', position: '打野' },
  { id: 51, name: '橘右京', position: '打野' },
  { id: 52, name: '司马懿', position: '打野' },
  { id: 53, name: '诸葛亮', position: '打野' },
  { id: 54, name: '芈月', position: '打野' },
  { id: 55, name: '曜', position: '打野' },
  { id: 56, name: '铠', position: '打野' },
  { id: 57, name: '曹操', position: '打野' },
  { id: 58, name: '大司命', position: '打野' },
  { id: 59, name: '影', position: '打野' },
  { id: 60, name: '元流之子', position: '打野' },

  // 中单
  { id: 61, name: '妲己', position: '中单' },
  { id: 62, name: '安琪拉', position: '中单' },
  { id: 63, name: '王昭君', position: '中单' },
  { id: 64, name: '小乔', position: '中单' },
  { id: 65, name: '貂蝉', position: '中单' },
  { id: 66, name: '不知火舞', position: '中单' },
  { id: 67, name: '干将莫邪', position: '中单' },
  { id: 68, name: '上官婉儿', position: '中单' },
  { id: 69, name: '西施', position: '中单' },
  { id: 70, name: '杨玉环', position: '中单' },
  { id: 71, name: '女娲', position: '中单' },
  { id: 72, name: '武则天', position: '中单' },
  { id: 73, name: '嬴政', position: '中单' },
  { id: 74, name: '周瑜', position: '中单' },
  { id: 75, name: '诸葛亮', position: '中单' },
  { id: 76, name: '司马懿', position: '中单' },
  { id: 77, name: '高渐离', position: '中单' },
  { id: 78, name: '扁鹊', position: '中单' },
  { id: 79, name: '张良', position: '中单' },
  { id: 80, name: '芈月', position: '中单' },
  { id: 81, name: '嫦娥', position: '中单' },
  { id: 82, name: '弈星', position: '中单' },
  { id: 83, name: '沈梦溪', position: '中单' },
  { id: 84, name: '米莱狄', position: '中单' },
  { id: 85, name: '金蝉', position: '中单' },
  { id: 86, name: '海月', position: '中单' },
  { id: 87, name: '姜子牙', position: '中单' },
  { id: 88, name: '甄姬', position: '中单' },
  { id: 89, name: '墨子', position: '中单' },
  { id: 90, name: '元流之子', position: '中单' },

  // 射手
  { id: 201, name: '后羿', position: '射手' },
  { id: 202, name: '鲁班七号', position: '射手' },
  { id: 203, name: '孙尚香', position: '射手' },
  { id: 204, name: '狄仁杰', position: '射手' },
  { id: 205, name: '马可波罗', position: '射手' },
  { id: 206, name: '公孙离', position: '射手' },
  { id: 207, name: '虞姬', position: '射手' },
  { id: 208, name: '黄忠', position: '射手' },
  { id: 209, name: '百里守约', position: '射手' },
  { id: 210, name: '蒙犽', position: '射手' },
  { id: 211, name: '伽罗', position: '射手' },
  { id: 212, name: '李元芳', position: '射手' },
  { id: 213, name: '成吉思汗', position: '射手' },
  { id: 214, name: '艾琳', position: '射手' },
  { id: 215, name: '戈娅', position: '射手' },
  { id: 216, name: '莱西奥', position: '射手' },
  { id: 217, name: '敖隐', position: '射手' },
  { id: 218, name: '苍', position: '射手' },
  { id: 219, name: '元流之子', position: '射手' },

  // 辅助
  { id: 301, name: '庄周', position: '辅助' },
  { id: 302, name: '蔡文姬', position: '辅助' },
  { id: 303, name: '瑶', position: '辅助' },
  { id: 304, name: '明世隐', position: '辅助' },
  { id: 305, name: '孙膑', position: '辅助' },
  { id: 306, name: '大乔', position: '辅助' },
  { id: 307, name: '鬼谷子', position: '辅助' },
  { id: 308, name: '东皇太一', position: '辅助' },
  { id: 309, name: '盾山', position: '辅助' },
  { id: 310, name: '鲁班大师', position: '辅助' },
  { id: 311, name: '太乙真人', position: '辅助' },
  { id: 312, name: '牛魔', position: '辅助' },
  { id: 313, name: '张飞', position: '辅助' },
  { id: 314, name: '刘禅', position: '辅助' },
  { id: 315, name: '钟馗', position: '辅助' },
  { id: 316, name: '苏烈', position: '辅助' },
  { id: 317, name: '廉颇', position: '辅助' },
  { id: 318, name: '项羽', position: '辅助' },
  { id: 319, name: '桑启', position: '辅助' },
  { id: 320, name: '金蝉', position: '辅助' },
  { id: 321, name: '朵莉亚', position: '辅助' },
  { id: 322, name: '少司缘', position: '辅助' },
  { id: 323, name: '元流之子', position: '辅助' },
  { id: 91, name: '大禹', position: '辅助' },
];

// 获取英雄库
export const getHeroes = async (): Promise<Hero[]> => {
  try {
    const { data, error } = await supabase
      .from('heroes')
      .select('*');

    if (error) {
      console.warn('从数据库获取英雄失败，使用默认英雄列表:', error);
      return DEFAULT_HEROES;
    }

    // 如果数据库中没有数据，返回默认英雄列表
    if (!data || data.length === 0) {
      console.warn('数据库中没有英雄数据，使用默认英雄列表');
      return DEFAULT_HEROES;
    }

    // 确保返回的英雄列表包含所有默认英雄，避免英雄ID不匹配问题
    const databaseHeroes = data;
    const allHeroes = [...DEFAULT_HEROES];

    // 用数据库中的英雄数据更新默认英雄列表
    databaseHeroes.forEach(dbHero => {
      const existingIndex = allHeroes.findIndex(hero => hero.id === dbHero.id);
      if (existingIndex !== -1) {
        allHeroes[existingIndex] = dbHero;
      } else {
        // 检查是否已有同名英雄，避免重复
        const existingNameIndex = allHeroes.findIndex(hero => hero.name === dbHero.name);
        if (existingNameIndex === -1) {
          allHeroes.push(dbHero);
        }
      }
    });

    // 去重，确保没有重复的英雄
    const uniqueHeroes = Array.from(new Map(allHeroes.map(hero => [hero.name, hero])).values());

    return uniqueHeroes;
  } catch (error) {
    console.warn('获取英雄库失败，使用默认英雄列表:', error);
    return DEFAULT_HEROES;
  }
};

// 按位置获取英雄
export const getHeroesByPosition = async (position: string): Promise<Hero[]> => {
  try {
    const { data, error } = await supabase
      .from('heroes')
      .select('*')
      .eq('position', position);

    if (error) {
      console.warn('从数据库获取英雄失败，使用默认英雄列表:', error);
      return DEFAULT_HEROES.filter(hero => hero.position === position);
    }

    // 如果数据库中没有数据，返回默认英雄列表中对应位置的英雄
    if (!data || data.length === 0) {
      console.warn('数据库中没有对应位置的英雄数据，使用默认英雄列表');
      return DEFAULT_HEROES.filter(hero => hero.position === position);
    }

    // 确保返回的英雄列表包含默认英雄列表中对应位置的所有英雄
    const databaseHeroes = data;
    const defaultPositionHeroes = DEFAULT_HEROES.filter(hero => hero.position === position);
    const allHeroes = [...defaultPositionHeroes];

    // 用数据库中的英雄数据更新默认英雄列表
    databaseHeroes.forEach(dbHero => {
      const existingIndex = allHeroes.findIndex(hero => hero.id === dbHero.id);
      if (existingIndex !== -1) {
        allHeroes[existingIndex] = dbHero;
      } else {
        // 检查是否已有同名英雄，避免重复
        const existingNameIndex = allHeroes.findIndex(hero => hero.name === dbHero.name);
        if (existingNameIndex === -1) {
          allHeroes.push(dbHero);
        }
      }
    });

    // 去重，确保没有重复的英雄
    const uniqueHeroes = Array.from(new Map(allHeroes.map(hero => [hero.name, hero])).values());

    return uniqueHeroes;
  } catch (error) {
    console.warn('获取英雄失败，使用默认英雄列表:', error);
    return DEFAULT_HEROES.filter(hero => hero.position === position);
  }
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

  // 处理 406 错误和记录不存在的情况
  if (error) {
    if (error.code === 'PGRST116' || error.code === '406') {
      return false;
    }
    console.error('检查战队成员失败:', error);
  }

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
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id, email, nickname, avatar')
    .eq('id', user_id)
    .single();

  if (userError) {
    console.error('获取用户信息失败:', userError);
  }

  // 获取擅长英雄
  const { data: heroData } = await supabase
    .from('player_heroes')
    .select('hero:hero_id(id, name, position, image_url)')
    .eq('player_profile_id', profile.id);

  // 获取位置统计数据
  const { data: positionStatsData } = await supabase
    .from('player_position_stats')
    .select('*')
    .eq('player_profile_id', profile.id);

  // 构建position_stats对象
  const positionStats: Record<string, { win_rate: string; kda: string; rating: string; power: string; heroes: number[] }> = {};
  if (positionStatsData) {
    positionStatsData.forEach(stat => {
      positionStats[stat.position] = {
        win_rate: stat.win_rate?.toString() || '',
        kda: stat.kda?.toString() || '',
        rating: stat.rating?.toString() || '',
        power: stat.power?.toString() || '',
        heroes: [] // 英雄数据通过player_heroes获取
      };
    });
  }

  return {
    ...profile,
    user: userData || { id: user_id, email: '', nickname: '未知用户' },
    heroes: heroData ? heroData.map((item) => item.hero) : [],
    position_stats: positionStats
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

  // 准备更新或创建数据
  const profileData: Partial<PlayerProfile> = {
    // 使用空数组作为默认值，以满足数据库的 NOT NULL 约束
    main_positions: data.main_positions || [],
    available_time: data.available_time || [],
    accept_position_adjustment: data.accept_position_adjustment
  };

  // 添加可选字段
  if (data.current_rank) profileData.current_rank = data.current_rank;

  try {
    if (existingProfile) {
      // 更新现有资料
      const { data: updatedProfile, error } = await supabase
        .from('player_profiles')
        .update(profileData)
        .eq('user_id', user_id)
        .eq('team_id', team_id)
        .select()
        .single();

      if (error) {
        throw new Error('更新队员资料失败: ' + (error.message || error.code || '未知错误'));
      }

      profileId = updatedProfile.id;

      // 删除旧的英雄关联
      await supabase
        .from('player_heroes')
        .delete()
        .eq('player_profile_id', profileId);

      // 删除旧的位置统计数据
      await supabase
        .from('player_position_stats')
        .delete()
        .eq('player_profile_id', profileId);
    } else {
      // 创建新资料
      const { data: newProfile, error } = await supabase
        .from('player_profiles')
        .insert({
          user_id,
          team_id,
          ...profileData
        })
        .select()
        .single();

      if (error) {
        throw new Error('创建队员资料失败: ' + (error.message || error.code || '未知错误'));
      }

      profileId = newProfile.id;
    }

    // 先删除现有的英雄关联
    try {
      const { error: deleteError } = await supabase
        .from('player_heroes')
        .delete()
        .eq('player_profile_id', profileId);

      if (deleteError) {
        console.warn('删除现有英雄关联失败:', deleteError);
        // 继续执行，不中断流程
      }
    } catch (deleteError) {
      console.warn('删除现有英雄关联出错:', deleteError);
      // 继续执行，不中断流程
    }

    // 添加新的英雄关联
    if (data.hero_ids && data.hero_ids.length > 0) {
      // 确保英雄ID唯一且有效
      const uniqueHeroIds = Array.from(new Set(data.hero_ids)).filter(hero_id => hero_id && typeof hero_id === 'number');

      if (uniqueHeroIds.length > 0) {
        const heroInserts = uniqueHeroIds.map(hero_id => ({
          player_profile_id: profileId,
          hero_id,
          proficiency: 0,
          usage_frequency: 0
        }));

        try {
          const { error } = await supabase
            .from('player_heroes')
            .insert(heroInserts);

          if (error) {
            console.error('关联英雄失败:', error);
            // 继续执行，不中断流程
          }
        } catch (error) {
          console.error('关联英雄出错:', error);
          // 继续执行，不中断流程
        }
      }
    }

    // 先删除现有的位置统计数据
    const { error: deleteStatsError } = await supabase
      .from('player_position_stats')
      .delete()
      .eq('player_profile_id', profileId);

    if (deleteStatsError) {
      console.warn('删除现有位置统计数据失败:', deleteStatsError);
      // 继续执行，不中断流程
    }

    // 处理位置统计数据
    if (data.position_stats) {
      const positionStatsInserts = Object.entries(data.position_stats).map(([position, stats]) => ({
        player_profile_id: profileId,
        position,
        win_rate: stats.win_rate ? parseFloat(stats.win_rate) : null,
        kda: stats.kda ? parseFloat(stats.kda) : null,
        rating: stats.rating ? parseFloat(stats.rating) : null,
        power: stats.power ? parseInt(stats.power) : null
      }));

      if (positionStatsInserts.length > 0) {
        const { error } = await supabase
          .from('player_position_stats')
          .insert(positionStatsInserts);

        if (error) {
          throw new Error('保存位置统计数据失败');
        }
      }
    }

    // 返回更新后的资料
    return await getPlayerProfile(user_id, team_id) as PlayerProfile;
  } catch (error) {
    console.error('保存队员资料失败:', error);
    throw error;
  }
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

      // 获取位置统计数据
      const { data: positionStatsData } = await supabase
        .from('player_position_stats')
        .select('*')
        .eq('player_profile_id', profile.id);

      // 构建position_stats对象
      const positionStats: Record<string, { win_rate: string; kda: string; rating: string; power: string; heroes: number[] }> = {};
      if (positionStatsData) {
        positionStatsData.forEach(stat => {
          positionStats[stat.position] = {
            win_rate: stat.win_rate?.toString() || '',
            kda: stat.kda?.toString() || '',
            rating: stat.rating?.toString() || '',
            power: stat.power?.toString() || '',
            heroes: [] // 英雄数据通过player_heroes获取
          };
        });
      }

      return {
        ...profile,
        user: userData || { id: profile.user_id, email: '', nickname: '未知用户' },
        heroes: heroData ? heroData.map((item) => item.hero) : [],
        position_stats: positionStats
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
    '最强王者': 7,
    '非凡王者': 8,
    '无双王者': 9,
    '绝世王者': 10,
    '至圣王者': 11,
    '荣耀王者': 12,
    '传奇王者': 13
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

  // 按段位排序
  eligiblePlayers.sort((a, b) => {
    // 按段位排序
    const rankDiff = rankToValue(b.current_rank || '') - rankToValue(a.current_rank || '');
    if (rankDiff !== 0) return rankDiff;
    return 0;
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
        group_name: groupName,
        group_type: 'training',
        creator_id: user_id,
        valid_until: null
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
        user_id: player.user_id,
        role: 'member'
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
    return sum + Math.pow((player.recent_rating || 0) - averageRating, 2);
  }, 0) / group.length;

  const isRatingBalanced = ratingVariance < 100; // 评分方差小于100视为均衡

  return {
    hasAllPositions,
    isRatingBalanced,
    rankDifferenceValid,
    positionDistribution,
    averageRating,
    averageRank
  };
};
