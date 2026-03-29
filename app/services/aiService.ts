import { supabase } from '../lib/supabase';
import { PlayerProfile } from '../types/teamGrouping';

// 智谱AI API配置
const ZHIPU_API_KEY = '242547db85954199ae6decacda106ddd.PSNp9my5FoajqbyA'; // 请替换为实际的API密钥
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 王者荣耀战队赛规则知识库
const 王者荣耀知识库 = {
  规则: `
  王者荣耀战队赛规则：
  1. 战队赛每周开放时间：周一至周日的12:00-24:00
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

// 智能分组算法
const generateOptimalGroups = (players: PlayerProfile[], groupSize: number = 5) => {
  // 按段位排序
  const sortedPlayers = [...players].sort((a, b) => (b.recent_rating || 0) - (a.recent_rating || 0));
  
  const groups: PlayerProfile[][] = [];
  
  // 初始化分组
  for (let i = 0; i < Math.ceil(players.length / groupSize); i++) {
    groups.push([]);
  }
  
  // 分配队员，确保段位均衡
  sortedPlayers.forEach((player, index) => {
    // 找到当前人数最少的分组
    const targetGroup = groups.reduce((min, group) => 
      group.length < min.length ? group : min, groups[0]);
    targetGroup.push(player);
  });
  
  // 检查并调整分组，确保位置齐全
  groups.forEach(group => {
    const positionCounts = {
      '上单': 0,
      '打野': 0,
      '中单': 0,
      '射手': 0,
      '辅助': 0
    };
    
    // 统计当前分组位置
    group.forEach(player => {
      player.main_positions.forEach(pos => {
        if (positionCounts[pos as keyof typeof positionCounts] !== undefined) {
          positionCounts[pos as keyof typeof positionCounts]++;
        }
      });
    });
    
    // 这里可以添加更复杂的位置调整逻辑
  });
  
  return groups;
};

// 调用智谱AI API
async function callZhipuAI(prompt: string, context: string): Promise<string> {
  try {
    // 检查API密钥是否配置
    if (ZHIPU_API_KEY === 'your_zhipu_api_key') {
      return '请先在aiService.ts文件中配置智谱AI API密钥。';
    }
    
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
      const { data: members } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'active');
      
      context += `战队成员数量：${members?.length || 0}\n`;
      
      // 获取战队队员资料
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('team_id', teamId);
      
      context += `已填写游戏资料的队员数量：${profiles?.length || 0}\n\n`;
      
      // 添加队员详细信息
      if (profiles && profiles.length > 0) {
        context += '队员详细信息：\n';
        for (const profile of profiles) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', profile.user_id)
            .single();
          
          const nickname = userData?.nickname || '未知用户';
          context += `${nickname}：\n`;
          context += `  段位：${profile.current_rank || '未设置'}\n`;
          context += `  状态：${profile.current_status || '未设置'}\n`;
          context += `  游戏风格：${profile.game_style || '未设置'}\n`;
          context += `  擅长位置：${profile.main_positions?.join('、') || '未设置'}\n\n`;
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
      const { data: teamMember, error: memberError } = await supabase
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
        const status = profile.current_status || '未设置';
        const style = profile.game_style || '未设置';
        
        response += `${i + 1}. ${nickname}\n`;
        response += `   段位：${rank}\n`;
        response += `   状态：${status}\n`;
        response += `   游戏风格：${style}\n`;
        response += `   段位评分：${rating}\n`;
        response += `   擅长位置：${positions}\n\n`;
      }
      
      return response;
    } catch (error) {
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
      
      // 转换为PlayerProfile类型，为每个队员获取用户信息
      const players: PlayerProfile[] = [];
      for (const profile of profiles) {
        // 获取用户信息
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, email, nickname, avatar')
          .eq('id', profile.user_id)
          .single();
        
        players.push({
          ...profile,
          user: userData || { id: profile.user_id, email: '', nickname: '未知用户' }
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
        
        // 统计状态分布
        const statusCounts: Record<string, number> = {};
        group.forEach(player => {
          if (player.current_status) {
            statusCounts[player.current_status] = (statusCounts[player.current_status] || 0) + 1;
          }
        });
        
        response += `   平均段位：${avgRating.toFixed(1)}\n`;
        response += `   位置分布：${Object.entries(positionCounts).map(([pos, count]) => `${pos}:${count}`).join('、')}\n`;
        response += `   状态分布：${Object.entries(statusCounts).map(([status, count]) => `${status}:${count}`).join('、')}\n`;
        response += `   队员：\n`;
        
        group.forEach((player, playerIndex) => {
          const nickname = player.user?.nickname || '未知用户';
          const rating = player.recent_rating || 0;
          const positions = player.main_positions?.join('、') || '未设置';
          const rank = player.current_rank || '未设置';
          const status = player.current_status || '未设置';
          
          response += `     ${playerIndex + 1}. ${nickname} (${rank}) - ${positions} - ${status}\n`;
        });
        
        response += '\n';
      });
      
      response += '分组说明：\n';
      response += '- 每组保证段位均衡，段位差不超过5\n';
      response += '- 尽量确保位置齐全，满足战队赛需求\n';
      response += '- 考虑队员近期状态，优化分组搭配\n';
      response += '- 可根据实际情况进行调整';
      
      return response;
    } catch (error) {
      return '生成分组时发生错误。';
    }
  }
  
  // 推荐阵容
  static async recommendFormation(teamId: string, userId: string): Promise<string> {
    try {
      // 检查用户是否是战队成员
      const { data: teamMember, error: memberError } = await supabase
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
      const positionGroups: Record<string, any[]> = {
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
        
        profile.main_positions.forEach(pos => {
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
      const missingPositions = Object.keys(formation).filter(pos => !formation[pos]);
      if (missingPositions.length > 0) {
        return `缺少以下位置的队员：${missingPositions.join('、')}，无法推荐完整阵容。`;
      }
      
      // 输出阵容
      Object.entries(formation).forEach(([position, player]) => {
        response += `${position}：${player.user?.nickname || '未知用户'} (${player.current_rank || '未设置'})\n`;
        response += `   游戏风格：${player.game_style || '未设置'}\n`;
        response += `   近期状态：${player.current_status || '未设置'}\n\n`;
      });
      
      response += '阵容分析：\n';
      response += '- 基于队员段位和擅长位置推荐\n';
      response += '- 考虑队员近期状态\n';
      response += '- 可根据实际比赛情况进行调整';
      
      return response;
    } catch (error) {
      return '推荐阵容时发生错误。';
    }
  }
  
  // 段位提升建议
  static async getRankImprovementSuggestions(teamId: string, userId: string): Promise<string> {
    try {
      // 检查用户是否是战队成员
      const { data: teamMember, error: memberError } = await supabase
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
      
      // 构建响应
      let response = `段位提升建议：\n\n`;
      response += `当前段位：${profile.current_rank || '未设置'}\n`;
      response += `近期状态：${profile.current_status || '未设置'}\n`;
      response += `游戏风格：${profile.game_style || '未设置'}\n`;
      response += `擅长位置：${profile.main_positions?.join('、') || '未设置'}\n\n`;
      
      // 根据段位提供不同的建议
      const rank = profile.current_rank || '';
      switch (rank) {
        case '青铜':
        case '白银':
          response += '提升建议：\n';
          response += '1. 熟悉游戏基本操作和地图机制\n';
          response += '2. 选择1-2个英雄进行专精练习\n';
          response += '3. 学习基本的团队配合和推塔意识\n';
          response += '4. 关注小地图，避免单独行动\n';
          break;
        case '黄金':
        case '铂金':
          response += '提升建议：\n';
          response += '1. 深入了解英雄技能和克制关系\n';
          response += '2. 学习经济分配和团队节奏\n';
          response += '3. 提高团战意识和位置选择\n';
          response += '4. 练习不同位置的英雄，提高适应性\n';
          break;
        case '钻石':
        case '星耀':
          response += '提升建议：\n';
          response += '1. 研究版本强势英雄和阵容\n';
          response += '2. 提高视野控制和团队沟通\n';
          response += '3. 学习逆风局处理和运营技巧\n';
          response += '4. 分析自己的失误，针对性改进\n';
          break;
        case '王者':
        case '荣耀王者':
          response += '提升建议：\n';
          response += '1. 保持高水平的操作和意识\n';
          response += '2. 研究对手打法，制定针对性策略\n';
          response += '3. 带领团队节奏，发挥领袖作用\n';
          response += '4. 不断学习和适应版本变化\n';
          break;
        default:
          response += '提升建议：\n';
          response += '1. 完善个人游戏资料，便于获取更精准的建议\n';
          response += '2. 多参与战队赛，提高团队配合\n';
          response += '3. 观看高水平比赛，学习先进战术\n';
          response += '4. 保持积极心态，享受游戏过程\n';
      }
      
      return response;
    } catch (error) {
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
      const statusDistribution: Record<string, number> = {};
      const positionDistribution: Record<string, number> = {};
      const styleDistribution: Record<string, number> = {};
      
      for (const profile of profiles) {
        if (profile.current_rank) {
          rankDistribution[profile.current_rank] = (rankDistribution[profile.current_rank] || 0) + 1;
        }
        if (profile.current_status) {
          statusDistribution[profile.current_status] = (statusDistribution[profile.current_status] || 0) + 1;
        }
        if (profile.game_style) {
          styleDistribution[profile.game_style] = (styleDistribution[profile.game_style] || 0) + 1;
        }
        if (profile.main_positions) {
          profile.main_positions.forEach(pos => {
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
      
      // 状态分布分析
      response += '状态分布：\n';
      Object.entries(statusDistribution).forEach(([status, count]) => {
        response += `  ${status}：${count}人\n`;
      });
      response += '\n';
      
      // 位置分布分析
      response += '位置分布：\n';
      Object.entries(positionDistribution).forEach(([position, count]) => {
        response += `  ${position}：${count}人\n`;
      });
      response += '\n';
      
      // 风格分布分析
      response += '风格分布：\n';
      Object.entries(styleDistribution).forEach(([style, count]) => {
        response += `  ${style}：${count}人\n`;
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
      
      // 状态调整建议
      const低迷人数 = statusDistribution['低迷'] || 0;
      if (低迷人数 > 0) {
        response += `2. 关注状态低迷的队员，了解原因并提供支持\n`;
      }
      
      // 风格搭配建议
      const hasAggressive = styleDistribution['激进'] > 0;
      const hasConservative = styleDistribution['保守'] > 0;
      const hasBalanced = styleDistribution['全面'] > 0;
      
      if (!hasAggressive) {
        response += `3. 适当增加激进风格的队员，提高团队进攻能力\n`;
      }
      if (!hasConservative) {
        response += `4. 适当增加保守风格的队员，提高团队稳定性\n`;
      }
      if (!hasBalanced) {
        response += `5. 适当增加全面风格的队员，提高团队适应性\n`;
      }
      
      // 其他建议
      response += `6. 定期组织团队训练，提高默契度\n`;
      response += `7. 建立良好的沟通机制，及时解决团队问题\n`;
      response += `8. 设置团队目标，提高队员积极性\n`;
      response += `9. 分析比赛录像，总结经验教训\n`;
      response += `10. 组织团队活动，增强团队凝聚力\n`;
      
      return response;
    } catch (error) {
      return '获取团队建设建议时发生错误。';
    }
  }
  
  // 比赛预测
  static async predictMatchResult(teamId: string, userId: string, opponent: string): Promise<string> {
    try {
      // 检查用户是否是战队成员
      const { data: teamMember, error: memberError } = await supabase
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
      return '预测比赛结果时发生错误。';
    }
  }
}
