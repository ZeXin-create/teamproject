import { supabase } from '../lib/supabase';
import { PlayerProfile, Hero } from '../types/teamGrouping';

// 类型定义
export interface Team {
  id: string;
  name: string;
  game_id: string;
  rank: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  team_id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  team_id: string;
  opponent_name: string;
  result: string;
  match_time: string;
  participants?: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamMemberStats {
  user_id: string;
  name: string;
  role: string;
  matches: number;
  wins: number;
  win_rate: string;
}

export interface TeamMatchStats {
  total_matches: number;
  total_wins: number;
  win_rate: string;
}

// 英雄数据
export const heroes: Hero[] = [];

// 上单英雄
const topHeroes = [
  '扁鹊', '曹操', '嫦娥', '达摩', '大司命', '典韦', '蚩奼', '宫本武藏', '关羽', '海诺',
  '花木兰', '姬小满', '橘右京', '铠', '狂铁', '澜', '老夫子', '李信', '刘备', '吕布',
  '马超', '芈月', '墨子', '哪吒', '盘古', '司空震', '孙策', '夏侯惇', '夏洛特', '项羽',
  '雅典娜', '亚连', '亚瑟', '杨戬', '曜', '元流之子', '云缨', '赵怀真', '赵云', '钟无艳',
  '周瑜', '阿古朵', '白起', '程咬金', '大禹', '廉颇', '刘邦', '刘禅', '鲁班大师',
  '梦奇', '蒙恬', '牛魔', '苏烈', '太乙真人', '张飞', '钟馗', '猪八戒', '庄周'
];

// 打野英雄
const jungleHeroes = [
  '阿轲', '百里玄策', '不知火舞', '蚩奼', '暃', '宫本武藏', '韩信', '镜', '橘右京',
  '兰陵王', '澜', '李白', '露娜', '娜可露露', '裴擒虎', '司马懿', '孙悟空', '雅典娜',
  '曜', '元歌', '元流之子', '云缨', '云中君', '赵云', '阿古朵', '刘备', '铠', '典韦', '盘古',
  '影'
];

// 中单英雄
const midHeroes = [
  '安琪拉', '扁鹊', '不知火舞', '蔡文姬', '嫦娥', '妲己', '大乔', '貂蝉', '东皇太一', '朵莉亚',
  '干将莫邪', '高渐离', '鬼谷子', '海诺', '海月', '姜子牙', '金蝉', '刘邦', '露娜', '梦奇',
  '米莱狄', '明世隐', '芈月', '墨子', '女娲', '桑启', '上官婉儿', '沈梦溪', '司空震', '王昭君',
  '西施', '小乔', '杨玉环', '弈星', '嬴政', '张良', '甄姬', '周瑜', '诸葛亮', '元流之子',
  '武则天'
];

// 射手英雄
const botHeroes = [
  '艾琳', '敖隐', '百里守约', '成吉思汗', '狄仁杰', '公孙离', '戈娅', '后羿', '黄忠',
  '伽罗', '李元芳', '鲁班七号', '马可波罗', '蒙犽', '孙尚香', '虞姬', '阿古朵', '刘备', '元流之子',
  '莱西奥'
];

// 辅助英雄
const supportHeroes = [
  '蔡文姬', '大乔', '大禹', '朵莉亚', '鬼谷子', '金蝉', '鲁班大师', '明世隐', '牛魔', '少司缘',
  '太乙真人', '孙膑', '瑶', '张飞', '庄周', '盾山', '刘邦', '钟馗', '廉颇', '刘禅', '苏烈', '东皇太一', '桑启',
  '空空儿', '元流之子'
];

// 生成英雄数据
topHeroes.forEach((name, index) => {
  heroes.push({ id: index + 1, name, position: '上单' });
});

jungleHeroes.forEach((name, index) => {
  heroes.push({ id: topHeroes.length + index + 1, name, position: '打野' });
});

midHeroes.forEach((name, index) => {
  heroes.push({ id: topHeroes.length + jungleHeroes.length + index + 1, name, position: '中单' });
});

botHeroes.forEach((name, index) => {
  heroes.push({ id: topHeroes.length + jungleHeroes.length + midHeroes.length + index + 1, name, position: '射手' });
});

supportHeroes.forEach((name, index) => {
  heroes.push({ id: topHeroes.length + jungleHeroes.length + midHeroes.length + botHeroes.length + index + 1, name, position: '辅助' });
});

// 根据位置获取英雄
export function getHeroesByPosition(position: string): Hero[] {
  return heroes.filter(hero => hero.position === position);
}

// 检查英雄是否存在
export function getHeroById(id: number): Hero | undefined {
  return heroes.find(hero => hero.id === id);
}

// 获取所有英雄
export function getHeroes(): Hero[] {
  return heroes;
}

// 保存或更新队员游戏资料
export async function createOrUpdatePlayerProfile(profileData: Partial<PlayerProfile>): Promise<PlayerProfile> {
  try {
    if (!profileData.user_id || !profileData.team_id) {
      throw new Error('用户ID和战队ID是必填项');
    }

    const { data: existingProfile, error: checkError } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('user_id', profileData.user_id)
      .eq('team_id', profileData.team_id)
      .single();

    let profileId: string;

    if (checkError || !existingProfile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('player_profiles')
        .insert({
          user_id: profileData.user_id,
          team_id: profileData.team_id,
          game_id: profileData.game_id || '',
          current_rank: profileData.current_rank || '',
          main_positions: profileData.main_positions || [],
          position_stats: profileData.position_stats || {},
          available_time: profileData.available_time || [],
          accept_position_adjustment: profileData.accept_position_adjustment || false
        })
        .select()
        .single();

      if (insertError) {
        const errorMessage = typeof insertError === 'object' && insertError !== null 
          ? (insertError.message || (('code' in insertError) ? insertError.code : '未知错误'))
          : String(insertError);
        throw new Error('创建资料失败: ' + errorMessage);
      }

      profileId = newProfile.id;
    } else {
      profileId = existingProfile.id;
      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({
          game_id: profileData.game_id,
          current_rank: profileData.current_rank,
          main_positions: profileData.main_positions,
          position_stats: profileData.position_stats,
          available_time: profileData.available_time,
          accept_position_adjustment: profileData.accept_position_adjustment
        })
        .eq('id', profileId)
        .select()
        .single();

      if (updateError) {
        const errorMessage = typeof updateError === 'object' && updateError !== null 
          ? (updateError.message || (('code' in updateError) ? updateError.code : '未知错误'))
          : String(updateError);
        throw new Error('更新资料失败: ' + errorMessage);
      }
    }

    // 处理位置统计中的英雄数据
    if (profileData.position_stats) {
      // 可以在这里添加位置英雄数据的处理逻辑
      // 目前英雄数据已经存储在 position_stats 中，不需要额外的表关联
    }

    const { data: finalProfile, error: finalError } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (finalError) {
      const errorMessage = typeof finalError === 'object' && finalError !== null 
        ? (finalError.message || (('code' in finalError) ? finalError.code : '未知错误'))
        : String(finalError);
      throw new Error('获取资料失败: ' + errorMessage);
    }

    // 确保 position_stats 结构完整
    if (!finalProfile.position_stats) {
      finalProfile.position_stats = {
        '上单': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
        '打野': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
        '中单': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
        '射手': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
        '辅助': { win_rate: '', kda: '', rating: '', power: '', heroes: [] }
      };
    }

    // 确保每个位置的 heroes 数组存在
    Object.keys(finalProfile.position_stats).forEach(position => {
      if (!finalProfile.position_stats[position].heroes) {
        finalProfile.position_stats[position].heroes = [];
      }
    });

    return finalProfile;
  } catch (error) {
    console.error('创建或更新队员资料失败:', error);
    throw error;
  }
}

// 获取队员游戏资料
export async function getPlayerProfile(userId: string, teamId: string): Promise<PlayerProfile | null> {
  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (error) {
      console.error('获取队员资料失败:', error);
      return null;
    }

    // 确保 position_stats 结构完整
    if (!data.position_stats) {
      data.position_stats = {
        '上单': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
        '打野': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
        '中单': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
        '射手': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
        '辅助': { winRate: '', kda: '', rating: '', power: '', heroes: [] }
      };
    }

    // 确保每个位置的 heroes 数组存在
    Object.keys(data.position_stats).forEach(position => {
      if (!data.position_stats[position].heroes) {
        data.position_stats[position].heroes = [];
      }
    });

    return data;
  } catch (error) {
    console.error('获取队员资料出错:', error);
    return null;
  }
}

// 保存比赛记录
export async function saveMatch(matchData: Partial<Match>): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert(matchData)
    .select()
    .single();

  if (error) {
    const errorMessage = typeof error === 'object' && error !== null 
      ? (error.message || (('code' in error) ? error.code : '未知错误'))
      : String(error);
    throw new Error('保存比赛记录失败: ' + errorMessage);
  }

  return data;
}

// 获取战队比赛记录
export async function getTeamMatches(teamId: string): Promise<Match[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('team_id', teamId)
      .order('match_time', { ascending: false });

    if (error) {
      console.error('获取比赛记录失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取比赛记录出错:', error);
    return [];
  }
}

// 分析战队数据
export async function analyzeTeamData(teamId: string): Promise<{
  teamStats: TeamMatchStats;
  memberStats: TeamMemberStats[];
}> {
  try {
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId);

    if (membersError) {
      console.error('获取战队成员失败:', membersError);
      return {
        teamStats: {
          total_matches: 0,
          total_wins: 0,
          win_rate: '0.0'
        },
        memberStats: []
      };
    }

    const matches = await getTeamMatches(teamId);
    const totalMatches = matches.length;
    const totalWins = matches.filter(match => match.result === 'win').length;
    const winRate = totalMatches > 0 ? (totalWins / totalMatches * 100).toFixed(1) : '0.0';

    const memberStats = ((members || []) as Array<{ user_id: string; role: string }>).map(member => {
      const memberMatches = matches.filter(match =>
        match.participants?.includes(member.user_id)
      );
      const memberWins = memberMatches.filter(match => match.result === 'win').length;
      const memberWinRate = memberMatches.length > 0 ? (memberWins / memberMatches.length * 100).toFixed(1) : '0.0';

      return {
        user_id: member.user_id,
        name: member.user_id,
        role: member.role,
        matches: memberMatches.length,
        wins: memberWins,
        win_rate: memberWinRate
      };
    });

    return {
      teamStats: {
        total_matches: totalMatches,
        total_wins: totalWins,
        win_rate: winRate
      },
      memberStats: memberStats
    };
  } catch (error) {
    console.error('分析战队数据失败:', error);
    return {
      teamStats: {
        total_matches: 0,
        total_wins: 0,
        win_rate: '0.0'
      },
      memberStats: []
    };
  }
}

// 获取战队成员
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      console.error('获取战队成员失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取战队成员出错:', error);
    return [];
  }
}

// 处理入队申请
export async function handleTeamApplication(applicationId: string, status: 'approved' | 'rejected'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('处理入队申请失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('处理入队申请出错:', error);
    return false;
  }
}

// 搜索战队
export async function searchTeams(name: string): Promise<Team[]> {
  try {
    const { data, error } = await supabase
      .from('team_groups')
      .select('*')
      .ilike('name', `%${name}%`);

    if (error) {
      console.error('搜索战队失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('搜索战队出错:', error);
    return [];
  }
}

// 创建战队
export async function createTeam(teamData: {
  name: string;
  game_id: string;
  rank: string;
  user_id: string;
}): Promise<Team | null> {
  try {
    const { data: team, error: teamError } = await supabase
      .from('team_groups')
      .insert({
        name: teamData.name,
        game_id: teamData.game_id,
        rank: teamData.rank
      })
      .select()
      .single();

    if (teamError) {
      console.error('创建战队失败:', teamError);
      return null;
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: teamData.user_id,
        role: 'captain',
        status: 'active'
      });

    if (memberError) {
      console.error('添加队长失败:', memberError);
    }

    return team;
  } catch (error) {
    console.error('创建战队出错:', error);
    return null;
  }
}

// 申请加入战队
export async function applyToTeam(applicationData: {
  team_id: string;
  user_id: string;
}): Promise<Application | null> {
  try {
    const { data, error } = await supabase
      .from('team_applications')
      .insert({
        team_id: applicationData.team_id,
        user_id: applicationData.user_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('申请加入战队失败:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('申请加入战队出错:', error);
    return null;
  }
}

// 获取战队申请
export async function getTeamApplications(teamId: string): Promise<Application[]> {
  try {
    const { data, error } = await supabase
      .from('team_applications')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取战队申请失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取战队申请出错:', error);
    return [];
  }
}

// 获取战队分组
export async function getTeamGroups(teamId: string) {
  try {
    const { data, error } = await supabase
      .from('team_groups')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error) {
      console.error('获取战队分组失败:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取战队分组出错:', error);
    return null;
  }
}

// 获取战队缺失资料的成员数量
export async function getTeamMissingProfilesCount(teamId: string): Promise<number> {
  try {
    const members = await getTeamMembers(teamId);
    let missingCount = 0;
    for (const member of members) {
      const profile = await getPlayerProfile(member.user_id, teamId);
      if (!profile) {
        missingCount++;
      }
    }
    return missingCount;
  } catch (error) {
    console.error('获取缺失资料数量失败:', error);
    return 0;
  }
}

// 创建分组
export async function createGroups(teamId: string, groupCount: number, userId: string): Promise<boolean> {
  try {
    // 1. 获取战队所有成员及其资料
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        profiles:user_id (id, email, nickname, avatar),
        player_profiles!inner (*)
      `)
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (membersError) {
      console.error('获取战队成员失败:', membersError);
      throw new Error('获取战队成员失败');
    }

    if (!members || members.length === 0) {
      throw new Error('战队没有成员');
    }

    // 2. 过滤出有完整资料的成员
    const validMembers = (members as Array<{
      player_profiles: Array<{
        main_positions?: string[];
      }>;
    }>).filter((m) =>
      m.player_profiles &&
      m.player_profiles.length > 0 &&
      m.player_profiles[0].main_positions &&
      m.player_profiles[0].main_positions.length > 0
    );

    if (validMembers.length === 0) {
      throw new Error('没有成员填写了完整的游戏资料');
    }

    // 3. 删除旧的分组
    const { error: deleteError } = await supabase
      .from('team_groups')
      .delete()
      .eq('team_id', teamId);

    if (deleteError) {
      console.error('删除旧分组失败:', deleteError);
    }

    // 4. 创建新分组
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const groups = [];

    for (let i = 0; i < Math.min(groupCount, 10); i++) {
      const { data: group, error: groupError } = await supabase
        .from('team_groups')
        .insert({
          team_id: teamId,
          name: `${groupNames[i]}组`,
          group_type: 'training',
          creator_id: userId
        })
        .select()
        .single();

      if (groupError) {
        console.error('创建分组失败:', groupError);
        continue;
      }

      groups.push({
        id: group.id,
        name: group.name,
        members: []
      });
    }

    if (groups.length === 0) {
      throw new Error('创建分组失败');
    }

    // 5. 计算每个成员的综合评分
    interface MemberWithScore {
      user_id: string;
      player_profiles: {
        position_stats?: Record<string, { rating?: string }>;
        current_rank?: string;
      };
      finalScore: number;
    }

    interface PositionStats {
      rating?: string;
    }

    const membersWithScore: MemberWithScore[] = (validMembers as Array<{
      user_id: string;
      player_profiles: Array<{
        position_stats?: Record<string, { rating?: string }>;
        current_rank?: string;
        main_positions?: string[];
      }>;
    }>).map((member) => {
      const profile = member.player_profiles[0];
      let totalScore = 0;
      let positionCount = 0;

      // 计算位置评分
      if (profile.position_stats) {
        Object.values(profile.position_stats).forEach((stats) => {
          const positionStats = stats as PositionStats;
          if (positionStats.rating) {
            totalScore += parseFloat(positionStats.rating) || 0;
            positionCount++;
          }
        });
      }

      const avgScore = positionCount > 0 ? totalScore / positionCount : 0;

      // 计算段位分数
      const rankScores: Record<string, number> = {
        '最强王者': 100,
        '非凡王者': 95,
        '无双王者': 90,
        '绝世王者': 85,
        '至圣王者': 80,
        '荣耀王者': 75,
        '传奇王者': 70
      };
      const rankScore = rankScores[profile.current_rank || ''] || 50;

      // 综合评分 = 位置评分 * 0.6 + 段位评分 * 0.4
      const finalScore = avgScore * 0.6 + rankScore * 0.4;

      return {
        user_id: member.user_id,
        player_profiles: profile,
        finalScore
      };
    });

    // 6. 按评分排序（高分在前）
    membersWithScore.sort((a, b) => b.finalScore - a.finalScore);

    // 7. 使用蛇形分配算法（Snake Draft）分配成员
    // 这样可以让每个小组的实力更均衡
    let direction = 1; // 1 表示正向，-1 表示反向
    let currentGroupIndex = 0;

    for (let i = 0; i < membersWithScore.length; i++) {
      const member = membersWithScore[i];

      // 添加到当前分组
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groups[currentGroupIndex].id,
          user_id: member.user_id,
          role: 'member'
        });

      if (memberError) {
        console.error('添加成员到分组失败:', memberError);
      }

      // 更新分组索引（蛇形分配）
      if (direction === 1) {
        currentGroupIndex++;
        if (currentGroupIndex >= groups.length) {
          currentGroupIndex = groups.length - 1;
          direction = -1;
        }
      } else {
        currentGroupIndex--;
        if (currentGroupIndex < 0) {
          currentGroupIndex = 0;
          direction = 1;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('创建分组失败:', error);
    throw error;
  }
}

// 更新分组成员
export async function updateGroupMembers(groupId: string, members: string[]): Promise<boolean> {
  try {
    // 1. 删除该分组的所有成员
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId);

    if (deleteError) {
      console.error('删除旧成员失败:', deleteError);
      throw new Error('删除旧成员失败');
    }

    // 2. 添加新成员
    if (members.length > 0) {
      const memberRecords = members.map(userId => ({
        group_id: groupId,
        user_id: userId,
        role: 'member'
      }));

      const { error: insertError } = await supabase
        .from('group_members')
        .insert(memberRecords);

      if (insertError) {
        console.error('添加新成员失败:', insertError);
        throw new Error('添加新成员失败');
      }
    }

    return true;
  } catch (error) {
    console.error('更新分组成员失败:', error);
    throw error;
  }
}

// 移动成员到另一个分组
export async function moveMemberToGroup(memberId: string, fromGroupId: string, toGroupId: string): Promise<boolean> {
  try {
    // 1. 从原分组删除
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', fromGroupId)
      .eq('user_id', memberId);

    if (deleteError) {
      console.error('从原分组移除成员失败:', deleteError);
      throw new Error('从原分组移除成员失败');
    }

    // 2. 添加到新分组
    const { error: insertError } = await supabase
      .from('group_members')
      .insert({
        group_id: toGroupId,
        user_id: memberId,
        role: 'member'
      });

    if (insertError) {
      console.error('添加到新分组失败:', insertError);
      throw new Error('添加到新分组失败');
    }

    return true;
  } catch (error) {
    console.error('移动成员失败:', error);
    throw error;
  }
}