import { supabase } from '../lib/supabase';
import { PlayerProfile } from '../types/teamGrouping';

// 智谱AI API配置
const ZHIPU_API_KEY = '242547db85954199ae6decacda106ddd.PSNp9my5FoajqbyA'; // 请替换为实际的API密钥
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 王者荣耀战队赛规则知识库（重要：战队赛只在周五、周六、周日开放）
const 王者荣耀知识库 = {
  规则: `
  王者荣耀战队赛规则：
  1. 战队赛每周开放时间：每周五、周六、周日的12:00-24:00（共3天，每天12小时）
  2. 每个战队每周最多可参加5场战队赛
  3. 每场比赛需要至少3名队员参与
  4. 战队赛采用5v5模式，地图为王者峡谷
  5. 比赛胜利可获得战队活跃点和个人贡献点
  6. 战队赛排名根据战队总活跃点计算
  7. 赛季末根据排名发放奖励
  `,
  加分扣分: `
  王者荣耀战队赛加分扣分规则：
  1. 胜利加分：根据对手战队实力和比赛表现，一般为10-30点活跃点
  2. 失败扣分：一般为5-15点活跃点
  3. 连胜加成：连胜场次越多，额外加分越多
  4. 参与奖：即使失败也会获得少量活跃点作为参与奖
  5. 队员贡献：根据个人在比赛中的表现获得贡献点
  `,
  贡献计算: `
  王者荣耀战队赛贡献计算：
  1. 参与比赛：基础贡献点10点
  2. 比赛胜利：额外贡献点15点
  3. KDA表现：根据击杀、助攻、死亡计算，最高可获得10点
  4. 推塔数：每推一座塔获得2点贡献
  5. 首杀/首塔：额外获得5点贡献
  6. 每周贡献上限：200点
  `,
  胜率提升: `
  王者荣耀战队赛胜率提升建议：
  1. 合理阵容搭配：确保有坦克、法师、射手、刺客、辅助
  2. 沟通配合：使用语音或文字沟通，制定战术
  3. ban/pick策略：针对对手强势英雄进行ban选
  4. 团队经济分配：确保核心输出位置有足够经济
  5. 视野控制：合理布置视野，了解敌方动向
  6. 练习配合：定期组织训练赛，提高团队默契
  7. 分析对手：研究对手打法，制定针对性策略
  `
};

// 计算时间重叠度
const calculateTimeOverlap = (player1: PlayerProfile, player2: PlayerProfile): number => {
  let overlapCount = 0;
  
  // 简单计算时间重叠：相同天且时间范围有重叠
  player1.available_time.forEach(time1 => {
    player2.available_time.forEach(time2 => {
      if (time1.day === time2.day) {
        const start1 = parseInt(time1.start_time.replace(':', ''));
        const end1 = parseInt(time1.end_time.replace(':', ''));
        const start2 = parseInt(time2.start_time.replace(':', ''));
        const end2 = parseInt(time2.end_time.replace(':', ''));
        
        if (Math.max(start1, start2) < Math.min(end1, end2)) {
          overlapCount++;
        }
      }
    });
  });
  
  return overlapCount;
};

// 计算位置多样性分数
const calculatePositionDiversity = (group: PlayerProfile[]): number => {
  const positionSet = new Set<string>();
  group.forEach(player => {
    player.main_positions.forEach(pos => positionSet.add(pos));
  });
  return positionSet.size;
};



// 计算英雄搭配分数
const calculateHeroSynergy = (group: PlayerProfile[]): number => {
  let synergyScore = 0;
  const allHeroes = group.flatMap(player => player.heroes || []);
  
  // 检查英雄位置分布
  const positionCounts: Record<string, number> = {};
  allHeroes.forEach(hero => {
    if (hero.position) {
      positionCounts[hero.position] = (positionCounts[hero.position] || 0) + 1;
    }
  });
  
  // 理想的位置分布：1上单 + 1打野 + 1中单 + 1射手 + 1辅助
  const idealPositions = ['上单', '打野', '中单', '射手', '辅助'];
  idealPositions.forEach(pos => {
    if (positionCounts[pos] >= 1) {
      synergyScore += 10;
    }
  });
  
  // 检查英雄克制关系（简化版）
  // 这里可以添加更复杂的英雄克制逻辑
  
  return synergyScore;
};

// 计算队伍战术体系分数
const calculateTeamStrategy = (group: PlayerProfile[]): number => {
  let strategyScore = 0;
  
  // 检查队伍平均段位
  const avgRating = group.reduce((sum, player) => sum + (player.recent_rating || 0), 0) / group.length;
  
  // 段位越高，战术体系分数越高
  if (avgRating >= 1800) strategyScore += 20;
  else if (avgRating >= 1600) strategyScore += 15;
  else if (avgRating >= 1400) strategyScore += 10;
  else if (avgRating >= 1200) strategyScore += 5;
  
  // 检查位置多样性
  const positionDiversity = calculatePositionDiversity(group);
  strategyScore += positionDiversity * 2;
  
  return strategyScore;
};

// 智能分组算法
const generateOptimalGroups = (players: PlayerProfile[], groupSize: number = 5) => {
  const groups: PlayerProfile[][] = [];
  const remainingPlayers = [...players];
  
  // 初始化分组
  const totalGroups = Math.ceil(players.length / groupSize);
  for (let i = 0; i < totalGroups; i++) {
    groups.push([]);
  }
  
  // 第一轮：优先分配核心队员到各组
  const sortedPlayers = [...players].sort((a, b) => (b.recent_rating || 0) - (a.recent_rating || 0));
  for (let i = 0; i < totalGroups && i < sortedPlayers.length; i++) {
    groups[i].push(sortedPlayers[i]);
    remainingPlayers.splice(remainingPlayers.findIndex(p => p.id === sortedPlayers[i].id), 1);
  }
  
  // 第二轮：为每个组分配位置互补的队员
  remainingPlayers.forEach(player => {
    let bestGroupIndex = 0;
    let bestScore = -Infinity;
    
    groups.forEach((group, index) => {
      if (group.length >= groupSize) return;
      
      // 计算加入该组后的位置多样性
      const tempGroup = [...group, player];
      const positionDiversity = calculatePositionDiversity(tempGroup);
      
      // 计算时间重叠度
      let totalTimeOverlap = 0;
      group.forEach(groupPlayer => {
        totalTimeOverlap += calculateTimeOverlap(player, groupPlayer);
      });
      
      // 计算英雄搭配分数
      const heroSynergy = calculateHeroSynergy(tempGroup);
      
      // 计算队伍战术体系分数
      const teamStrategy = calculateTeamStrategy(tempGroup);
      
      // 计算综合分数
      const score = positionDiversity * 10 + totalTimeOverlap * 5 + heroSynergy * 8 + teamStrategy * 6;
      
      if (score > bestScore) {
        bestScore = score;
        bestGroupIndex = index;
      }
    });
    
    groups[bestGroupIndex].push(player);
  });
  
  // 第三轮：微调分组，确保各组实力均衡
  // 这里可以添加更复杂的调整逻辑，例如交换队员以平衡实力
  
  return groups;
};

// 调用智谱AI API
async function callZhipuAI(prompt: string, context: string): Promise<string> {
  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          {
            role: 'system',
            content: `你是一个王者荣耀战队管理助手，专门回答关于战队赛、队员管理、分组策略等问题。

知识库：
${王者荣耀知识库.规则}

${王者荣耀知识库.加分扣分}

${王者荣耀知识库.贡献计算}

${王者荣耀知识库.胜率提升}

${context}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 检查响应格式
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('智谱AI API响应:', data);
      throw new Error('API响应格式不正确: ' + JSON.stringify(data));
    }
    
    const choice = data.choices[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error('API响应缺少必要字段');
    }
    
    return choice.message.content;
  } catch (error) {
    console.error('调用智谱AI失败:', error);
    // 失败时使用默认响应
    return '抱歉，AI服务暂时不可用，请稍后重试。';
  }
}

// AI服务类
export class AIService {
  // 获取用户所在的战队ID
  static async getUserTeamId(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error || !data) {
        return null
      }
      return data.team_id
    } catch (error) {
      console.error('获取用户战队ID失败:', error)
      return null
    }
  }

  // 处理用户查询（支持上下文记忆和战队数据）
  static async processQueryWithContext(
    query: string, 
    historyMessages: Array<{ role: string; content: string }>,
    userId: string
  ): Promise<string> {
    try {
      // 获取用户战队数据
      const teamId = await this.getUserTeamId(userId)
      let teamContext = ''
      
      if (teamId) {
        teamContext = await this.getTeamContext(teamId, userId)
      } else {
        teamContext = '用户尚未加入任何战队，无法提供战队相关数据。'
      }
      
      // 构建消息历史
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: `你是一个王者荣耀战队管理助手，专门回答关于战队赛、队员管理、分组策略等问题。

重要提醒：
1. 战队赛只在每周周五、周六、周日的12:00-24:00开放，不是周一到周日！
2. 如果用户之前告诉过你某些信息，请记住并在后续对话中使用
3. 请根据用户战队的实际数据来回答问题，不要凭空编造数据

战队数据（重要）：
${teamContext}

知识库：
${王者荣耀知识库.规则}

${王者荣耀知识库.加分扣分}

${王者荣耀知识库.贡献计算}

${王者荣耀知识库.胜率提升}

请记住用户告诉你的任何信息，并在后续对话中准确使用。`
        }
      ];
      
      // 添加历史消息
      historyMessages.forEach(msg => {
        messages.push({
          role: msg.role === 'ai' ? 'assistant' : msg.role,
          content: msg.content
        });
      });
      
      // 添加当前问题
      messages.push({
        role: 'user',
        content: query
      });
      
      // 调用智谱AI
      const response = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZHIPU_API_KEY}`
        },
        body: JSON.stringify({
          model: 'glm-4',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1500
        })
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('API响应格式不正确');
      }
      
      const choice = data.choices[0];
      if (!choice || !choice.message || !choice.message.content) {
        throw new Error('API响应缺少必要字段');
      }
      
      return choice.message.content;
    } catch (error) {
      console.error('处理查询失败:', error);
      return '抱歉，处理您的请求时发生错误，请稍后重试。';
    }
  }
  
  // 处理用户查询
  static async processQuery(query: string, teamId: string, userId: string): Promise<string> {
    try {
      // 获取战队相关信息作为上下文
      const context = await this.getTeamContext(teamId, userId);
      
      // 调用智谱AI
      const response = await callZhipuAI(query, context);
      return response;
    } catch (error) {
      console.error('处理查询失败:', error);
      return '抱歉，处理您的请求时发生错误，请稍后重试。';
    }
  }
  
  // 获取战队上下文信息
  static async getTeamContext(teamId: string, userId: string): Promise<string> {
    let context = '';
    
    try {
      // 检查用户是否是战队成员
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();
      
      if (teamMember) {
        context += `用户角色：${teamMember.role}\n`;
      }
      
      // 获取战队队员数量
      let memberCount = 0;
      try {
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('status', 'active');
        
        if (!membersError && members) {
          memberCount = members.length;
        }
      } catch (membersError) {
        console.error('获取战队成员数量失败:', membersError);
      }
      
      context += `战队成员数量：${memberCount}\n`;
      
      // 获取战队统计数据
      try {
        const { totalMatches, wins, winRate, statusDistribution, rankDistribution, positionDistribution } = await import('../services/teamDataService').then(module => module.TeamDataService.getTeamStatistics(teamId));
        
        context += `总比赛数：${totalMatches}\n`;
        context += `胜利数：${wins}\n`;
        context += `胜率：${winRate}%\n\n`;
        
        if (Object.keys(statusDistribution).length > 0) {
          context += '队员状态分布：\n';
          Object.entries(statusDistribution).forEach(([status, count]) => {
            context += `  ${status}：${count}人\n`;
          });
          context += '\n';
        }
        
        if (Object.keys(rankDistribution).length > 0) {
          context += '队员段位分布：\n';
          Object.entries(rankDistribution).forEach(([rank, count]) => {
            context += `  ${rank}：${count}人\n`;
          });
          context += '\n';
        }
        
        if (Object.keys(positionDistribution).length > 0) {
          context += '队员位置分布：\n';
          Object.entries(positionDistribution).forEach(([position, count]) => {
            context += `  ${position}：${count}人\n`;
          });
          context += '\n';
        }
      } catch (statsError) {
        console.error('获取战队统计数据失败:', statsError);
      }
      
      // 获取战队队员资料
      let profilesCount = 0;
      let profilesData = null;
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('player_profiles')
          .select('*')
          .eq('team_id', teamId);
        
        if (!profilesError && profiles) {
          profilesCount = profiles.length;
          profilesData = profiles;
        }
      } catch (profilesError) {
        console.error('获取战队队员资料失败:', profilesError);
      }
      
      context += `已填写游戏资料的队员数量：${profilesCount}\n\n`;
      
      // 添加队员详细信息
      if (profilesData && profilesData.length > 0) {
        context += '队员详细信息：\n';
        for (const profile of profilesData) {
          let userData = null;
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', profile.user_id)
              .single();
            
            if (!error) {
              userData = data;
            }
          } catch (userError) {
            console.error('获取用户信息失败:', userError);
          }
          
          const nickname = userData?.nickname || '未知用户';
          context += `${nickname}：\n`;
          
          // 尝试从本地存储获取完整资料
          let gameId = profile.game_id || '未设置';
          let positionStats = profile.position_stats;
          
          // 从本地存储获取资料 - 只在客户端执行
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
              const storedProfile = localStorage.getItem(`playerProfile_${profile.user_id}_${teamId}`);
              if (storedProfile) {
                const parsedProfile = JSON.parse(storedProfile);
                gameId = parsedProfile.gameId || gameId;
                positionStats = parsedProfile.positionStats;
              }
            } catch (localStorageError) {
              console.error('从本地存储获取资料失败:', localStorageError);
            }
          }
          
          // 获取用户擅长英雄
          let heroData = null;
          try {
            const { data, error } = await supabase
              .from('player_heroes')
              .select('hero_id')
              .eq('player_profile_id', profile.id);
            
            if (!error && data && data.length > 0) {
              // 获取英雄详细信息
              const heroIds = data.map(item => item.hero_id);
              const { data: heroesData } = await supabase
                .from('heroes')
                .select('id, name, position, image_url')
                .in('id', heroIds);
              heroData = heroesData ? heroesData.map(hero => ({ hero })) : null;
            }
          } catch (heroError) {
            console.error('获取英雄数据失败:', heroError);
          }
          
          context += `  游戏ID：${gameId}\n`;
          context += `  段位：${profile.current_rank || '未设置'}\n`;
          context += `  擅长位置：${profile.main_positions?.join('、') || '未设置'}\n`;
          if (heroData && heroData.length > 0) {
            const heroNames = [];
            for (const item of heroData) {
              if (item.hero && typeof item.hero === 'object' && 'name' in item.hero) {
                heroNames.push(item.hero.name);
              }
            }
            context += `  常用英雄：${heroNames.join('、')}\n`;
          } else {
            context += `  常用英雄：未设置\n`;
          }
          if (positionStats && typeof positionStats === 'object') {
            context += `  位置数据：\n`;
            try {
              Object.entries(positionStats).forEach(([position, stats]) => {
                if (stats && typeof stats === 'object') {
                  const statsObj = stats as Record<string, string>;
                  const winRate = statsObj.winRate || statsObj.win_rate || '未设置';
                  const kda = statsObj.kda || '未设置';
                  const rating = statsObj.rating || '未设置';
                  const power = statsObj.power || '未设置';
                  if (winRate || kda || rating || power) {
                    context += `    ${position}：胜率 ${winRate}，KDA ${kda}，评分 ${rating}，战力 ${power}\n`;
                  }
                }
              });
            } catch (positionError) {
              console.error('处理位置数据失败:', positionError);
              context += `    位置数据获取失败\n`;
            }
          }
          if (profile.available_time && Array.isArray(profile.available_time) && profile.available_time.length > 0) {
            context += `  可比赛时间：\n`;
            try {
              profile.available_time.forEach((time: unknown) => {
                if (time && typeof time === 'object') {
                  const timeObj = time as Record<string, string>;
                  const day = timeObj.day || timeObj.day_of_week || '未知';
                  const startTime = timeObj.start_time || timeObj.startTime || '00:00';
                  const endTime = timeObj.end_time || timeObj.endTime || '23:59';
                  context += `    ${day} ${startTime}-${endTime}\n`;
                }
              });
            } catch (timeError) {
              console.error('处理时间数据失败:', timeError);
              context += `    时间数据获取失败\n`;
            }
          } else {
            context += `  可比赛时间：未设置\n`;
          }
          context += `\n`;
        }
      }
      
      // 获取战队比赛记录
      const { data: matchRecords } = await supabase
        .from('match_records')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: false })
        .limit(5);
      
      if (matchRecords && matchRecords.length > 0) {
        context += '最近比赛记录：\n';
        matchRecords.forEach(record => {
          context += `${record.match_date} vs ${record.opponent} - ${record.result}\n`;
        });
        context += '\n';
      }
      
    } catch (error) {
      console.error('获取战队上下文失败:', error);
    }
    
    return context;
  }
  
  // 获取战队成员数据
  static async getTeamMembersData(teamId: string, userId: string): Promise<string> {
    try {
      // 检查用户是否是战队成员
      const { error: memberError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();
      
      if (memberError) {
        return '您不是该战队的成员，无法查询战队数据。';
      }
      
      // 获取战队所有队员资料
      const { data: profiles, error: profilesError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('team_id', teamId);
      
      if (profilesError) {
        return '获取战队成员数据失败。';
      }
      
      if (!profiles || profiles.length === 0) {
        return '该战队暂无队员资料。';
      }
      
      // 构建响应
      let response = `战队成员数据：\n\n`;
      
      // 为每个队员获取用户信息
      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        
        // 获取用户信息
        const { data: userData } = await supabase
          .from('profiles')
          .select('nickname, avatar')
          .eq('id', profile.user_id)
          .single();
        
        const nickname = userData?.nickname || '未知用户';
        const rating = profile.recent_rating || 0;
        const positions = profile.main_positions?.join('、') || '未设置';
        const rank = profile.current_rank || '未设置';
        
        response += `${i + 1}. ${nickname}\n`;
        response += `   段位：${rank}\n`;
        response += `   段位评分：${rating}\n`;
        response += `   擅长位置：${positions}\n\n`;
      }
      
      return response;
    } catch (error) {
      console.error('获取战队成员数据失败:', error);
      return '查询战队成员数据时发生错误。';
    }
  }
  
  // 生成战队分组
  static async generateTeamGroups(teamId: string, userId: string): Promise<string> {
    try {
      // 检查用户是否是战队队长
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();
      
      if (memberError || teamMember?.role !== '队长') {
        return '只有队长才能生成战队分组。';
      }
      
      // 获取战队所有队员资料
      const { data: profiles, error: profilesError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('team_id', teamId);
      
      if (profilesError) {
        return '获取战队成员数据失败。';
      }
      
      if (!profiles || profiles.length < 5) {
        return '战队成员不足5人，无法生成分组。';
      }
      
      // 转换为PlayerProfile类型，为每个队员获取用户信息和英雄数据
      const players: PlayerProfile[] = [];
      for (const profile of profiles) {
        // 获取用户信息
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, email, nickname, avatar')
          .eq('id', profile.user_id)
          .single();
        
        // 获取用户擅长英雄
        const { data: heroData } = await supabase
          .from('player_heroes')
          .select('hero:hero_id(id, name, position, image_url)')
          .eq('player_profile_id', profile.id);
        
        players.push({
          ...profile,
          user: userData || { id: profile.user_id, email: '', nickname: '未知用户' },
          heroes: heroData ? heroData.map((item) => item.hero) : []
        });
      }
      
      // 生成最优分组
      const groups = generateOptimalGroups(players);
      
      // 构建响应
      let response = `智能战队赛分组方案：\n\n`;
      groups.forEach((group, groupIndex) => {
        response += `第${groupIndex + 1}组：\n`;
        
        // 计算分组平均段位
        const avgRating = group.reduce((sum, player) => sum + (player.recent_rating || 0), 0) / group.length;
        
        // 统计位置分布
        const positionCounts: Record<string, number> = {};
        group.forEach(player => {
          player.main_positions.forEach(pos => {
            positionCounts[pos] = (positionCounts[pos] || 0) + 1;
          });
        });
        
        // 统计常用英雄
        const heroCounts: Record<string, number> = {};
        group.forEach(player => {
          player.heroes?.forEach(hero => {
            heroCounts[hero.name] = (heroCounts[hero.name] || 0) + 1;
          });
        });
        
        response += `   平均段位：${avgRating.toFixed(1)}\n`;
        response += `   位置分布：${Object.entries(positionCounts).map(([pos, count]) => `${pos}:${count}`).join('、')}\n`;
        if (Object.keys(heroCounts).length > 0) {
          response += `   常用英雄：${Object.keys(heroCounts).slice(0, 5).join('、')}\n`;
        }

        response += `   队员：\n`;
        
        group.forEach((player, playerIndex) => {
          const nickname = player.user?.nickname || '未知用户';
          const positions = player.main_positions?.join('、') || '未设置';
          const rank = player.current_rank || '未设置';
          const heroes = player.heroes?.map(h => h.name).join('、') || '未设置';
          
          response += `     ${playerIndex + 1}. ${nickname} (${rank})\n`;
          response += `       位置：${positions}\n`;
          response += `       常用英雄：${heroes}\n`;
          if (player.available_time && player.available_time.length > 0) {
            response += `       可比赛时间：${player.available_time.map(t => `${t.day} ${t.start_time}-${t.end_time}`).join('、')}\n`;
          }
        });
        
        response += '\n';
      });
      
      response += '分组说明：\n';
      response += '- 每组保证段位均衡，段位差不超过5\n';
      response += '- 优先匹配位置不重复、可比赛时间重叠的队员\n';
      response += '- 结合胜率、KDA、评分、战力及常用英雄均衡分组\n';
      response += '- 可根据实际情况进行调整';
      
      return response;
    } catch (error) {
      console.error('生成分组失败:', error);
      return '生成分组时发生错误。';
    }
  }
  
  // 推荐阵容
  static async recommendFormation(teamId: string, userId: string): Promise<string> {
    try {
      // 检查用户是否是战队成员
      const { error: memberError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();
      
      if (memberError) {
        return '您不是该战队的成员，无法获取阵容推荐。';
      }
      
      // 获取战队所有队员资料
      const { data: profiles, error: profilesError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('team_id', teamId);
      
      if (profilesError) {
        return '获取战队成员数据失败。';
      }
      
      if (!profiles || profiles.length < 5) {
        return '战队成员不足5人，无法推荐阵容。';
      }
      
      // 构建响应
      let response = `最佳阵容推荐：\n\n`;
      
      // 按位置分组队员
      const positionGroups: Record<string, PlayerProfile[]> = {
        '上单': [],
        '打野': [],
        '中单': [],
        '射手': [],
        '辅助': []
      };
      
      for (const profile of profiles) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', profile.user_id)
          .single();
        
        profile.user = userData || { id: profile.user_id, nickname: '未知用户' };
        
        profile.main_positions.forEach((pos: string) => {
          if (positionGroups[pos]) {
            positionGroups[pos].push(profile);
          }
        });
      }
      
      // 为每个位置选择最佳队员
      const formation = {
        '上单': positionGroups['上单'].sort((a, b) => (b.recent_rating || 0) - (a.recent_rating || 0))[0],
        '打野': positionGroups['打野'].sort((a, b) => (b.recent_rating || 0) - (a.recent_rating || 0))[0],
        '中单': positionGroups['中单'].sort((a, b) => (b.recent_rating || 0) - (a.recent_rating || 0))[0],
        '射手': positionGroups['射手'].sort((a, b) => (b.recent_rating || 0) - (a.recent_rating || 0))[0],
        '辅助': positionGroups['辅助'].sort((a, b) => (b.recent_rating || 0) - (a.recent_rating || 0))[0]
      };
      
      // 检查是否所有位置都有队员
      const missingPositions = Object.keys(formation).filter((pos) => !formation[pos as keyof typeof formation]);
      if (missingPositions.length > 0) {
        return `缺少以下位置的队员：${missingPositions.join('、')}，无法推荐完整阵容。`;
      }
      
      // 输出阵容
      Object.entries(formation).forEach(([position, player]) => {
        response += `${position}：${player.user?.nickname || '未知用户'} (${player.current_rank || '未设置'})\n\n`;
      });
      
      response += '阵容分析：\n';
      response += '- 基于队员段位和擅长位置推荐\n';
      response += '- 考虑队员近期状态\n';
      response += '- 可根据实际比赛情况进行调整';
      
      return response;
    } catch (error) {
      console.error('推荐阵容失败:', error);
      return '推荐阵容时发生错误。';
    }
  }
  
  // 段位提升建议
  static async getRankImprovementSuggestions(teamId: string, userId: string): Promise<string> {
    try {
      // 检查用户是否是战队成员
      const { error: memberError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();
      
      if (memberError) {
        return '您不是该战队的成员，无法获取段位提升建议。';
      }
      
      // 获取用户资料
      const { data: profile, error: profileError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .single();
      
      if (profileError) {
        return '获取您的游戏资料失败。';
      }
      
      if (!profile) {
        return '您尚未填写游戏资料，请先完善个人信息。';
      }
      
      // 获取用户擅长英雄
      const { data: heroData } = await supabase
        .from('player_heroes')
        .select('hero:hero_id(id, name, position, image_url)')
        .eq('player_profile_id', profile.id);
      
      // 构建响应
      let response = `段位提升建议：\n\n`;
      response += `当前段位：${profile.current_rank || '未设置'}\n`;
      response += `擅长位置：${profile.main_positions?.join('、') || '未设置'}\n`;
      if (heroData && heroData.length > 0) {
        const heroNames = [];
        for (const item of heroData) {
          if (item.hero && typeof item.hero === 'object' && 'name' in item.hero) {
            heroNames.push(item.hero.name);
          }
        }
        response += `常用英雄：${heroNames.join('、')}\n\n`;
      } else {
        response += `常用英雄：未设置\n\n`;
      }
      
      // 根据段位提供不同的建议
      const rank = profile.current_rank || '';
      
      // 判断段位类型
      const isLowRank = ['青铜', '白银'].includes(rank);
      const isMidRank = ['黄金', '铂金'].includes(rank);
      const isHighRank = ['钻石', '星耀'].includes(rank);
      const isKingRank = rank === '王者' || rank.startsWith('王者');
      const isGloryKing = rank === '荣耀王者';
      
      if (isLowRank) {
        response += '提升建议：\n';
        response += '1. 熟悉游戏基本操作和地图机制\n';
        response += '2. 选择1-2个英雄进行专精练习\n';
        response += '3. 学习基本的团队配合和推塔意识\n';
        response += '4. 关注小地图，避免单独行动\n';
      } else if (isMidRank) {
        response += '提升建议：\n';
        response += '1. 深入了解英雄技能和克制关系\n';
        response += '2. 学习经济分配和团队节奏\n';
        response += '3. 提高团战意识和位置选择\n';
        response += '4. 练习不同位置的英雄，提高适应性\n';
      } else if (isHighRank) {
        response += '提升建议：\n';
        response += '1. 研究版本强势英雄和阵容\n';
        response += '2. 提高视野控制和团队沟通\n';
        response += '3. 学习逆风局处理和运营技巧\n';
        response += '4. 分析自己的失误，针对性改进\n';
      } else if (isKingRank) {
        // 根据王者星数提供不同建议
        if (rank === '王者' || rank === '王者1-30星') {
          response += '提升建议（王者初阶）：\n';
          response += '1. 巩固基础操作，减少失误\n';
          response += '2. 学习高端局节奏控制\n';
          response += '3. 扩大英雄池，适应不同阵容\n';
          response += '4. 培养全局观和指挥能力\n';
        } else if (rank === '王者30-50星' || rank === '王者50-80星') {
          response += '提升建议（王者中阶）：\n';
          response += '1. 精进细节操作，提高上限\n';
          response += '2. 深入研究版本meta和强势组合\n';
          response += '3. 提升指挥和团队协调能力\n';
          response += '4. 针对性练习弱势对局\n';
        } else if (rank === '王者80-100星' || rank === '王者100-120星') {
          response += '提升建议（王者高阶）：\n';
          response += '1. 保持稳定的竞技状态\n';
          response += '2. 研究顶尖选手的打法思路\n';
          response += '3. 提升临场应变和决策能力\n';
          response += '4. 带领团队，发挥核心作用\n';
        } else {
          response += '提升建议（王者顶尖）：\n';
          response += '1. 冲击荣耀王者，挑战极限\n';
          response += '2. 保持高水平操作和意识\n';
          response += '3. 研究对手打法，制定针对性策略\n';
          response += '4. 不断学习和适应版本变化\n';
        }
      } else if (isGloryKing) {
        response += '提升建议（荣耀王者）：\n';
        response += '1. 保持巅峰竞技状态\n';
        response += '2. 挑战更高星数，冲击国服\n';
        response += '3. 研究职业比赛，学习顶尖战术\n';
        response += '4. 成为战队核心，带领团队进步\n';
      } else {
        response += '提升建议：\n';
        response += '1. 完善个人游戏资料，便于获取更精准的建议\n';
        response += '2. 多参与战队赛，提高团队配合\n';
        response += '3. 观看高水平比赛，学习先进战术\n';
        response += '4. 保持积极心态，享受游戏过程\n';
      }
      
      return response;
    } catch (error) {
      console.error('获取段位提升建议失败:', error);
      return '获取段位提升建议时发生错误。';
    }
  }
  
  // 团队建设建议
  static async getTeamBuildingSuggestions(teamId: string, userId: string): Promise<string> {
    try {
      // 检查用户是否是战队队长
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();
      
      if (memberError || teamMember?.role !== '队长') {
        return '只有队长才能获取团队建设建议。';
      }
      
      // 获取战队所有队员资料
      const { data: profiles, error: profilesError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('team_id', teamId);
      
      if (profilesError) {
        return '获取战队成员数据失败。';
      }
      
      if (!profiles || profiles.length === 0) {
        return '该战队暂无队员资料。';
      }
      
      // 分析战队情况
      const rankDistribution: Record<string, number> = {};
      const positionDistribution: Record<string, number> = {};
      
      for (const profile of profiles) {
        if (profile.current_rank) {
          rankDistribution[profile.current_rank] = (rankDistribution[profile.current_rank] || 0) + 1;
        }
        if (profile.main_positions) {
          profile.main_positions.forEach((pos: string) => {
            positionDistribution[pos] = (positionDistribution[pos] || 0) + 1;
          });
        }
      }
      
      // 构建响应
      let response = `团队建设建议：\n\n`;
      
      // 段位分布分析
      response += '段位分布：\n';
      Object.entries(rankDistribution).forEach(([rank, count]) => {
        response += `  ${rank}：${count}人\n`;
      });
      response += '\n';
      
      // 位置分布分析
      response += '位置分布：\n';
      Object.entries(positionDistribution).forEach(([position, count]) => {
        response += `  ${position}：${count}人\n`;
      });
      response += '\n';
      
      // 团队建设建议
      response += '建设建议：\n';
      
      // 位置平衡建议
      const positions = ['上单', '打野', '中单', '射手', '辅助'];
      const missingPositions = positions.filter(pos => !positionDistribution[pos]);
      if (missingPositions.length > 0) {
        response += `1. 补充缺少的位置：${missingPositions.join('、')}\n`;
      }
      

      
      // 其他建议
      response += `2. 定期组织团队训练，提高默契度\n`;
      response += `3. 建立良好的沟通机制，及时解决团队问题\n`;
      response += `4. 设置团队目标，提高队员积极性\n`;
      response += `5. 分析比赛录像，总结经验教训\n`;
      response += `6. 组织团队活动，增强团队凝聚力\n`;
      
      return response;
    } catch (error) {
      console.error('获取团队建设建议失败:', error);
      return '获取团队建设建议时发生错误。';
    }
  }
  
  // 比赛预测
  static async predictMatchResult(teamId: string, userId: string, opponent: string): Promise<string> {
    try {
      // 检查用户是否是战队成员
      const { error: memberError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();
      
      if (memberError) {
        return '您不是该战队的成员，无法预测比赛结果。';
      }
      
      // 获取战队最近比赛记录
      const { data: matchRecords, error: matchError } = await supabase
        .from('match_records')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: false })
        .limit(10);
      
      if (matchError) {
        return '获取比赛记录失败。';
      }
      
      // 分析战队近期表现
      let winCount = 0;
      let totalMatches = 0;
      
      if (matchRecords && matchRecords.length > 0) {
        totalMatches = matchRecords.length;
        winCount = matchRecords.filter(record => record.result === '胜利').length;
      }
      
      const winRate = totalMatches > 0 ? (winCount / totalMatches * 100).toFixed(2) : '0.00';
      
      // 构建响应
      let response = `比赛预测：\n\n`;
      response += `对手：${opponent}\n`;
      response += `近期战绩：${winCount}胜 ${totalMatches - winCount}负 (胜率：${winRate}%)\n\n`;
      
      // 基于近期表现预测
      if (totalMatches === 0) {
        response += '预测结果：\n';
        response += '由于缺乏比赛数据，无法准确预测比赛结果。\n';
        response += '建议：充分准备，全力以赴！\n';
      } else if (parseFloat(winRate) >= 70) {
        response += '预测结果：\n';
        response += '基于近期良好的表现，获胜概率较高。\n';
        response += '建议：保持状态，继续发挥团队优势。\n';
      } else if (parseFloat(winRate) >= 40) {
        response += '预测结果：\n';
        response += '比赛结果较为胶着，胜负取决于临场发挥。\n';
        response += '建议：做好充分准备，关注细节，争取胜利。\n';
      } else {
        response += '预测结果：\n';
        response += '获胜难度较大，需要团队共同努力。\n';
        response += '建议：分析失败原因，制定针对性策略，放手一搏。\n';
      }
      
      response += '\n风险提示：\n';
      response += '- 比赛结果受多种因素影响，预测仅供参考\n';
      response += '- 团队状态、队员配合、战术执行等都会影响比赛结果\n';
      response += '- 保持良好心态，享受比赛过程\n';
      
      return response;
    } catch (error) {
      console.error('预测比赛结果失败:', error);
      return '预测比赛结果时发生错误。';
    }
  }

  // 处理用户查询（支持流式响应）
  static async processQueryWithContextStream(
    query: string,
    historyMessages: Array<{ role: string; content: string }>,
    userId: string,
    callbacks: {
      onChunk: (chunk: string) => void;
      onComplete: (fullResponse: string) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      // 获取用户战队数据
      const teamId = await this.getUserTeamId(userId)
      let teamContext = ''
      
      if (teamId) {
        teamContext = await this.getTeamContext(teamId, userId)
      } else {
        teamContext = '用户尚未加入任何战队，无法提供战队相关数据。'
      }
      
      // 构建消息历史
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: `你是一个王者荣耀战队管理助手，专门回答关于战队赛、队员管理、分组策略等问题。

重要提醒：
1. 战队赛只在每周周五、周六、周日的12:00-24:00开放，不是周一到周日！
2. 如果用户之前告诉过你某些信息，请记住并在后续对话中使用
3. 请根据用户战队的实际数据来回答问题，不要凭空编造数据

战队数据（重要）：
${teamContext}

知识库：
${王者荣耀知识库.规则}

${王者荣耀知识库.加分扣分}

${王者荣耀知识库.贡献计算}

${王者荣耀知识库.胜率提升}

请记住用户告诉你的任何信息，并在后续对话中准确使用。`
        }
      ];
      
      // 添加历史消息
      historyMessages.forEach(msg => {
        messages.push({
          role: msg.role === 'ai' ? 'assistant' : msg.role,
          content: msg.content
        });
      });
      
      // 添加当前问题
      messages.push({
        role: 'user',
        content: query
      });
      
      // 调用智谱AI流式接口
      const response = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZHIPU_API_KEY}`
        },
        body: JSON.stringify({
          model: 'glm-4',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1500,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('响应体为空');
      }
      
      // 读取流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          callbacks.onComplete(fullResponse);
          break;
        }
        
        // 解码收到的数据
        const chunk = decoder.decode(value, { stream: true });
        
        // 解析SSE格式的数据
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              callbacks.onComplete(fullResponse);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                const content = parsed.choices[0].delta.content || '';
                if (content) {
                  fullResponse += content;
                  callbacks.onChunk(content);
                }
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('流式处理查询失败:', error);
      callbacks.onError(error instanceof Error ? error : new Error('未知错误'));
    }
  }
}
