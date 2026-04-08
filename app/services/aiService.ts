import { supabase } from '../lib/supabase';
import { PlayerProfile } from '../types/teamGrouping';

// 智谱AI API配置
const ZHIPU_API_KEY = '4014fe8f30994f64b9b0eeb8c03fc43d.Tjkbe4GJfmKIOcu1'; // 直接使用API密钥
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 英雄数据映射表 - 用于将英雄ID转换为英雄名称
const heroesMap = new Map<number, string>([
  // 上单英雄
  [1, '扁鹊'], [2, '曹操'], [3, '嫦娥'], [4, '达摩'], [5, '大司命'],
  [6, '典韦'], [7, '蚩奼'], [8, '宫本武藏'], [9, '关羽'], [10, '海诺'],
  [11, '花木兰'], [12, '姬小满'], [13, '橘右京'], [14, '铠'], [15, '狂铁'],
  [16, '澜'], [17, '老夫子'], [18, '李信'], [19, '刘备'], [20, '吕布'],
  [21, '马超'], [22, '芈月'], [23, '墨子'], [24, '哪吒'], [25, '盘古'],
  [26, '司空震'], [27, '孙策'], [28, '夏侯惇'], [29, '夏洛特'], [30, '项羽'],
  [31, '雅典娜'], [32, '亚连'], [33, '亚瑟'], [34, '杨戬'], [35, '曜'],
  [36, '元流之子'], [37, '云缨'], [38, '赵怀真'], [39, '赵云'], [40, '钟无艳'],
  [41, '周瑜'], [42, '阿古朵'], [43, '白起'], [44, '程咬金'], [45, '大禹'],
  [46, '盾山'], [47, '廉颇'], [48, '刘邦'], [49, '刘禅'], [50, '鲁班大师'],
  [51, '梦奇'], [52, '蒙恬'], [53, '牛魔'], [54, '苏烈'], [55, '太乙真人'],
  [56, '张飞'], [57, '钟馗'], [58, '猪八戒'], [59, '庄周'],
  // 打野英雄
  [60, '阿轲'], [61, '百里守约'], [62, '百里玄策'], [63, '不知火舞'], [64, '蚩奼'],
  [65, '暃'], [66, '宫本武藏'], [67, '韩信'], [68, '镜'], [69, '橘右京'],
  [70, '兰陵王'], [71, '澜'], [72, '李白'], [73, '露娜'], [74, '娜可露露'],
  [75, '裴擒虎'], [76, '司马懿'], [77, '孙悟空'], [78, '雅典娜'], [79, '曜'],
  [80, '元歌'], [81, '元流之子'], [82, '云缨'], [83, '云中君'], [84, '赵云'],
  // 中单英雄
  [85, '安琪拉'], [86, '扁鹊'], [87, '不知火舞'], [88, '蔡文姬'], [89, '嫦娥'],
  [90, '妲己'], [91, '大乔'], [92, '貂蝉'], [93, '东皇太一'], [94, '朵莉亚'],
  [95, '干将莫邪'], [96, '高渐离'], [97, '鬼谷子'], [98, '海诺'], [99, '海月'],
  [100, '姜子牙'], [101, '金蝉'], [102, '刘邦'], [103, '露娜'], [104, '梦奇'],
  [105, '米莱狄'], [106, '明世隐'], [107, '芈月'], [108, '墨子'], [109, '女娲'],
  [110, '桑启'], [111, '上官婉儿'], [112, '沈梦溪'], [113, '司空震'], [114, '王昭君'],
  [115, '西施'], [116, '小乔'], [117, '杨玉环'], [118, '弈星'], [119, '嬴政'],
  [120, '张良'], [121, '甄姬'], [122, '周瑜'], [123, '诸葛亮'], [124, '元流之子'],
  // 射手英雄
  [125, '艾琳'], [126, '敖隐'], [127, '百里守约'], [128, '蚩奼'], [129, '成吉思汗'],
  [130, '狄仁杰'], [131, '公孙离'], [132, '戈娅'], [133, '后羿'], [134, '黄忠'],
  [135, '伽罗'], [136, '李元芳'], [137, '刘备'], [138, '鲁班七号'], [139, '马可波罗'],
  [140, '蒙犽'], [141, '孙尚香'], [142, '虞姬'], [143, '元流之子'],
  // 辅助英雄
  [144, '蔡文姬'], [145, '大乔'], [146, '大禹'], [147, '朵莉亚'], [148, '鬼谷子'],
  [149, '金蝉'], [150, '鲁班大师'], [151, '明世隐'], [152, '牛魔'], [153, '少司缘'],
  [154, '太乙真人'], [155, '孙膑'], [156, '瑶'], [157, '张飞'], [158, '庄周'],
  [159, '元流之子']
]);

// 根据英雄ID获取英雄名称
const getHeroNameById = (id: number | string): string => {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return heroesMap.get(numId) || `英雄${id}`;
};

// 王者荣耀战队赛规则知识库（重要：战队赛只在周五、周六、周日开放）
const 王者荣耀知识库 = {
  规则: `
  王者荣耀战队赛规则：
  1. 战队赛每周开放时间：每周五、周六、周日的12:00-24:00（共3天，每天12小时）
  2. 每个战队每周最多可参加5场战队赛
  3. 每场比赛需要至少5名队员参与
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
  player1.available_time?.forEach(time1 => {
    player2.available_time?.forEach(time2 => {
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
    player.main_positions?.forEach(pos => positionSet.add(pos));
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
    // 检查API密钥是否设置
    if (!ZHIPU_API_KEY) {
      throw new Error('智谱AI API密钥未设置');
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
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
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

      // 检查API密钥是否设置
      if (!ZHIPU_API_KEY) {
        throw new Error('智谱AI API密钥未设置');
      }

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
          const heroNames: string[] = [];

          // 从position_stats中获取常用英雄
          if (positionStats && typeof positionStats === 'object') {
            Object.values(positionStats).forEach((stats) => {
              if (stats && typeof stats === 'object') {
                const statsObj = stats as Record<string, unknown>;
                if (statsObj.heroes && Array.isArray(statsObj.heroes) && statsObj.heroes.length > 0) {
                  statsObj.heroes.forEach((hero: string | number) => {
                    if (hero) {
                      const heroName = getHeroNameById(hero);
                      if (!heroNames.includes(heroName)) {
                        heroNames.push(heroName);
                      }
                    }
                  });
                }
              }
            });
          }

          context += `  游戏ID：${gameId}\n`;
          context += `  段位：${profile.current_rank || '未设置'}\n`;
          context += `  擅长位置：${profile.main_positions?.join('、') || '未设置'}\n`;
          if (heroNames.length > 0) {
            context += `  常用英雄：${heroNames.join('、')}\n`;
          } else {
            context += `  常用英雄：未设置\n`;
          }
          if (positionStats && typeof positionStats === 'object') {
            try {
              const positionsWithData = Object.entries(positionStats).filter((entry) => {
                const stats = entry[1];
                if (stats && typeof stats === 'object') {
                  const statsObj = stats as Record<string, string>;
                  const winRate = statsObj.winRate || statsObj.win_rate || '未设置';
                  const kda = statsObj.kda || '未设置';
                  const rating = statsObj.rating || '未设置';
                  const power = statsObj.power || '未设置';
                  return winRate !== '未设置' || kda !== '未设置' || rating !== '未设置' || power !== '未设置';
                }
                return false;
              });

              if (positionsWithData.length > 0) {
                context += `  位置数据：\n`;
                positionsWithData.forEach(([position, stats]) => {
                  if (stats && typeof stats === 'object') {
                    const statsObj = stats as Record<string, string>;
                    const winRate = statsObj.winRate || statsObj.win_rate || '未设置';
                    const kda = statsObj.kda || '未设置';
                    const rating = statsObj.rating || '未设置';
                    const power = statsObj.power || '未设置';
                    context += `    ${position}：胜率 ${winRate}，KDA ${kda}，评分 ${rating}，战力 ${power}\n`;
                  }
                });
              }
            } catch (positionError) {
              console.error('处理位置数据失败:', positionError);
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

    } catch (error) {
      console.error('获取战队上下文失败:', error);
    }

    return context;
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

        // 从position_stats中获取常用英雄
        const heroes: Array<{ name: string; position: string }> = [];
        if (profile.position_stats && typeof profile.position_stats === 'object') {
          Object.entries(profile.position_stats).forEach(([position, stats]) => {
            if (stats && typeof stats === 'object') {
              const statsObj = stats as Record<string, unknown>;
              if (statsObj.heroes && Array.isArray(statsObj.heroes) && statsObj.heroes.length > 0) {
                statsObj.heroes.forEach((heroId: string | number) => {
                  if (heroId) {
                    heroes.push({ name: getHeroNameById(heroId), position });
                  }
                });
              }
            }
          });
        }

        players.push({
          ...profile,
          user: userData || { id: profile.user_id, email: '', nickname: '未知用户' },
          heroes: heroes
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
          player.main_positions?.forEach(pos => {
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
}
