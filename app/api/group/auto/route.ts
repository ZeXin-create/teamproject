import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { getHeroById } from '../../../services/teamGroupingService';
const POSITIONS = ['对抗路', '打野', '中单', '发育路', '辅助'];
const POSITION_MAP: Record<string, string> = { '上单': '对抗路', '射手': '发育路', '游走': '辅助' };

// 角色分类映射
const ROLE_CATEGORIES: Record<string, string> = {
  '对抗路': '前排',
  '打野': '灵活',
  '中单': '后排',
  '发育路': '后排',
  '辅助': '灵活'
};

// 角色平衡要求
const ROLE_BALANCE_REQUIREMENTS = {
  '前排': 1, // 至少1个前排
  '后排': 1  // 至少1个后排输出
};

// 英雄功能标签系统
interface HeroFunction {
  tank: number;
  control: number;
  output: number;
  push: number;
}

const HERO_FUNCTIONS: Record<string, HeroFunction> = {
  // 坦克类英雄
  '廉颇': { tank: 5, control: 4, output: 2, push: 3 },
  '白起': { tank: 5, control: 4, output: 2, push: 2 },
  '程咬金': { tank: 4, control: 2, output: 3, push: 4 },
  '项羽': { tank: 5, control: 4, output: 2, push: 3 },
  '刘邦': { tank: 4, control: 3, output: 2, push: 3 },
  
  // 战士类英雄
  '吕布': { tank: 3, control: 3, output: 4, push: 4 },
  '关羽': { tank: 2, control: 3, output: 4, push: 5 },
  '马超': { tank: 2, control: 2, output: 5, push: 4 },
  '孙策': { tank: 3, control: 4, output: 3, push: 4 },
  '夏洛特': { tank: 2, control: 3, output: 4, push: 3 },
  
  // 刺客类英雄
  '李白': { tank: 1, control: 2, output: 5, push: 2 },
  '韩信': { tank: 1, control: 2, output: 5, push: 3 },
  '赵云': { tank: 2, control: 3, output: 4, push: 3 },
  '兰陵王': { tank: 1, control: 3, output: 5, push: 2 },
  '阿轲': { tank: 1, control: 2, output: 5, push: 2 },
  
  // 法师类英雄
  '貂蝉': { tank: 1, control: 3, output: 5, push: 3 },
  '诸葛亮': { tank: 1, control: 2, output: 5, push: 2 },
  '不知火舞': { tank: 1, control: 4, output: 5, push: 2 },
  '王昭君': { tank: 1, control: 4, output: 4, push: 3 },
  '干将莫邪': { tank: 1, control: 2, output: 5, push: 2 },
  
  // 射手类英雄
  '后羿': { tank: 1, control: 2, output: 5, push: 4 },
  '鲁班七号': { tank: 1, control: 2, output: 5, push: 4 },
  '孙尚香': { tank: 1, control: 1, output: 5, push: 3 },
  '马可波罗': { tank: 1, control: 1, output: 5, push: 4 },
  '狄仁杰': { tank: 1, control: 2, output: 5, push: 4 },
  
  // 辅助类英雄
  '蔡文姬': { tank: 2, control: 3, output: 1, push: 1 },
  '孙膑': { tank: 1, control: 4, output: 1, push: 2 },
  '大乔': { tank: 1, control: 4, output: 1, push: 3 },
  '瑶': { tank: 1, control: 2, output: 1, push: 1 },
  '庄周': { tank: 2, control: 3, output: 1, push: 2 }
};

// 从 position_stats 获取指定位置的数据
function getPositionStats(positionStats: Record<string, any>, position: string): Record<string, number> {
  if (!positionStats) return {};
  
  // 如果 positionStats 直接包含 win_rate 等字段，说明已经是位置数据
  if (positionStats.win_rate !== undefined || positionStats.kda !== undefined) {
    return positionStats;
  }
  
  // 否则，尝试从 positionStats 中获取指定位置的数据
  // 注意：position_stats 中存储的是原始位置名称（如"射手"），不是映射后的名称（如"发育路"）
  // 所以需要反向查找：根据映射后的位置找到原始位置
  const reversePositionMap: Record<string, string[]> = {
    '对抗路': ['上单', '对抗路'],
    '打野': ['打野'],
    '中单': ['中单'],
    '发育路': ['射手', '发育路'],
    '辅助': ['辅助', '游走']
  };
  
  // 首先尝试直接使用 position 查找
  if (positionStats[position]) {
    return positionStats[position];
  }
  
  // 然后尝试使用反向映射查找原始位置名称
  const originalPositions = reversePositionMap[position] || [position];
  for (const origPos of originalPositions) {
    if (positionStats[origPos]) {
      return positionStats[origPos];
    }
  }
  
  return {};
}

// 从 position_stats 提取常用英雄
function extractHeroesFromStats(positionStats: Record<string, any>, position: string): string[] {
  if (!positionStats) return [];

  const heroes: string[] = [];
  
  // 反向位置映射：根据标准位置找到可能的原始位置名称
  const reversePositionMap: Record<string, string[]> = {
    '对抗路': ['上单', '对抗路'],
    '打野': ['打野'],
    '中单': ['中单'],
    '发育路': ['射手', '发育路'],
    '辅助': ['辅助', '游走']
  };

  // 尝试从指定位置数据中获取常用英雄
  const possiblePositions = reversePositionMap[position] || [position];
  
  for (const pos of possiblePositions) {
    const positionData = positionStats[pos];
    if (positionData?.heroes && Array.isArray(positionData.heroes)) {
      // heroes 可能是ID数组或名称数组
      for (const hero of positionData.heroes) {
        if (typeof hero === 'number') {
          // 如果是数字ID，转换为英雄名称
          const heroData = getHeroById(hero);
          if (heroData && !heroes.includes(heroData.name)) {
            heroes.push(heroData.name);
          }
        } else if (typeof hero === 'string' && !heroes.includes(hero)) {
          // 如果是字符串，直接使用
          heroes.push(hero);
        }
      }
    }
  }

  // 如果 positionStats 中有直接的 heroes 字段
  if (positionStats.heroes && Array.isArray(positionStats.heroes)) {
    for (const hero of positionStats.heroes) {
      if (typeof hero === 'number') {
        const heroData = getHeroById(hero);
        if (heroData && !heroes.includes(heroData.name)) {
          heroes.push(heroData.name);
        }
      } else if (typeof hero === 'string' && !heroes.includes(hero)) {
        heroes.push(hero);
      }
    }
  }

  // 返回前5个英雄
  return heroes.slice(0, 5);
}

// 计算实力分
function calculateStrength(positionStats: Record<string, any>, currentRank: string, position?: string) {
  if (!positionStats) {
    // 回退到段位映射
    return getRankScore(currentRank);
  }
  
  // 获取指定位置的数据
  const stats = position ? getPositionStats(positionStats, position) : positionStats;
  
  // 支持两种字段命名：下划线命名（win_rate）和驼峰命名（winRate）
  const winRate = parseFloat(stats.win_rate || stats.winRate || 0);
  const kda = parseFloat(stats.kda || stats.KDA || stats.kda || 0);
  const rating = parseFloat(stats.rating || stats.rating || 0);
  const power = parseFloat(stats.power || stats.power || 0);
  
  console.log('  计算实力分数据:', { winRate, kda, rating, power, source: stats });
  
  // 检查是否所有值都为0，如果是则回退到段位映射
  if (winRate === 0 && kda === 0 && rating === 0 && power === 0) {
    console.log('  所有值为0，使用段位映射:', currentRank, '->', getRankScore(currentRank));
    return getRankScore(currentRank);
  }
  
  // 实力分计算公式：胜率/100 * 0.35 + (KDA/20) * 0.35 + 评分/100 * 0.15 + 战力/10000 * 0.15
  const score = (winRate / 100 * 0.35) + (kda / 20 * 0.35) + (rating / 100 * 0.15) + (power / 10000 * 0.15);
  const calculatedScore = Math.max(0, Math.min(100, Math.round(score * 100)));
  
  console.log('  计算结果:', calculatedScore);
  
  // 如果计算结果为0，回退到段位映射
  return calculatedScore > 0 ? calculatedScore : getRankScore(currentRank);
}

// 安全地解析 main_positions 字段（支持 TEXT[] 和 JSONB）
function parseMainPositions(positions: any): string[] {
  if (!positions) return [];
  
  // 如果已经是数组，直接返回
  if (Array.isArray(positions)) {
    return positions.map(p => typeof p === 'string' ? p : String(p));
  }
  
  // 如果是字符串，尝试解析 JSON
  if (typeof positions === 'string') {
    try {
      const parsed = JSON.parse(positions);
      return Array.isArray(parsed) ? parsed : [positions];
    } catch {
      return [positions];
    }
  }
  
  // 如果是对象，返回其值
  if (typeof positions === 'object') {
    return Object.values(positions).map(p => String(p));
  }
  
  return [];
}

// 从段位获取分数
function getRankScore(rank: string) {
  // 扩展段位映射表，包含更多可能的段位名称
  const rankScore: Record<string, number> = {
    '倔强青铜': 10, '秩序白银': 20, '荣耀黄金': 30, '尊贵铂金': 40, '永恒钻石': 50,
    '至尊星耀': 60, '最强王者': 70, '无双王者': 80, '荣耀王者': 90, '传奇王者': 100,
    '至圣王者': 95, '绝世王者': 95, '王者': 70
  };
  
  if (!rank) {
    console.log('Rank is empty, returning default 50');
    return 50;
  }
  
  // 改进段位提取逻辑：去除括号及内容，处理各种格式
  let rankKey = rank;
  
  // 去除括号及内容
  rankKey = rankKey.replace(/\([^)]*\)/g, '').trim();
  
  // 去除数字和其他特殊字符
  rankKey = rankKey.replace(/\d+/g, '').trim();
  
  console.log(`Processing rank: "${rank}" -> "${rankKey}" -> ${rankScore[rankKey] || 50}`);
  
  return rankScore[rankKey] || 50;
}

// 处理位置重复和缺失的情况
function checkPositionBalance(members: Player[]) {
  const positionCount: Record<string, number> = {};
  for (const pos of POSITIONS) positionCount[pos] = 0;
  
  for (const member of members) {
    positionCount[member.main_position]++;
  }
  
  const repeatedPositions = Object.entries(positionCount)
    .filter((entry) => entry[1] > 1)
    .map(([pos, count]) => `${pos} (${count}人)`);
  
  const missingPositions = POSITIONS.filter(pos => positionCount[pos] === 0);
  
  return {
    repeatedPositions,
    missingPositions
  };
}

// 检查角色平衡（前排/后排比例）
function checkRoleBalance(members: Player[]) {
  const roleCount: Record<string, number> = {
    '前排': 0,
    '后排': 0,
    '灵活': 0
  };
  
  for (const member of members) {
    const role = ROLE_CATEGORIES[member.main_position] || '灵活';
    roleCount[role]++;
  }
  
  const issues: string[] = [];
  if (roleCount['前排'] < ROLE_BALANCE_REQUIREMENTS['前排']) {
    issues.push(`缺少前排，当前只有${roleCount['前排']}个`);
  }
  if (roleCount['后排'] < ROLE_BALANCE_REQUIREMENTS['后排']) {
    issues.push(`缺少后排输出，当前只有${roleCount['后排']}个`);
  }
  
  return {
    roleCount,
    issues
  };
}

// 检查功能覆盖（带线、控制、输出）
function checkFunctionCoverage(members: Player[]) {
  const functionScores: Record<string, number> = {
    'control': 0, // 控制
    'push': 0,    // 带线
    'output': 0   // 输出
  };
  
  // 遍历所有队员的英雄，计算功能得分
  for (const member of members) {
    if (member.heroes && Array.isArray(member.heroes)) {
      for (const hero of member.heroes) {
        const heroFunctions = HERO_FUNCTIONS[hero];
        if (heroFunctions) {
          functionScores['control'] = Math.max(functionScores['control'], heroFunctions.control || 0);
          functionScores['push'] = Math.max(functionScores['push'], heroFunctions.push || 0);
          functionScores['output'] = Math.max(functionScores['output'], heroFunctions.output || 0);
        }
      }
    }
  }
  
  // 检查功能覆盖是否满足要求
  const issues: string[] = [];
  if (functionScores['control'] < 3) { // 控制得分低于3视为缺少控制
    issues.push('缺少控制能力');
  }
  if (functionScores['push'] < 3) { // 带线得分低于3视为缺少带线
    issues.push('缺少带线能力');
  }
  if (functionScores['output'] < 4) { // 输出得分低于4视为缺少输出
    issues.push('缺少输出能力');
  }
  
  return {
    functionScores,
    issues
  };
}

// 计算英雄重复率
function calculateHeroOverlap(members: Player[]) {
  if (members.length < 2) return 0;
  
  const heroSet = new Set<string>();
  let totalHeroes = 0;
  const heroCount: Record<string, number> = {};
  
  for (const member of members) {
    if (member.heroes && Array.isArray(member.heroes)) {
      member.heroes.forEach((hero: string) => {
        heroSet.add(hero);
        heroCount[hero] = (heroCount[hero] || 0) + 1;
      });
      totalHeroes += member.heroes.length;
    }
  }
  
  if (totalHeroes === 0) return 0;
  const uniqueHeroes = heroSet.size;
  
  // 计算重叠率
  // 基础重叠率：(总英雄数 - 唯一英雄数) / 总英雄数
  const baseOverlapRate = ((totalHeroes - uniqueHeroes) / totalHeroes) * 100;
  
  // 计算英雄分布均匀度
  // 理想情况下，每个英雄应该只被一个队员拥有
  let distributionScore = 0;
  for (const count of Object.values(heroCount)) {
    if (count > 1) {
      // 英雄被多个队员拥有，增加重叠度
      distributionScore += (count - 1);
    }
  }
  
  // 综合考虑基础重叠率和分布均匀度
  const adjustedOverlapRate = baseOverlapRate + (distributionScore / members.length) * 10;
  
  return Math.round(Math.min(100, adjustedOverlapRate));
}

// 增强的小组平衡性计算
function calculateGroupBalance(members: Player[]) {
  const positionBalance = checkPositionBalance(members);
  const roleBalance = checkRoleBalance(members);
  const functionCoverage = checkFunctionCoverage(members);
  const heroOverlapRate = calculateHeroOverlap(members);
  
  // 计算综合平衡分数（越高越好）
  let balanceScore = 100;
  
  // 位置平衡扣分
  if (positionBalance.repeatedPositions.length > 0) {
    balanceScore -= positionBalance.repeatedPositions.length * 10;
  }
  if (positionBalance.missingPositions.length > 0) {
    balanceScore -= positionBalance.missingPositions.length * 15;
  }
  
  // 角色平衡扣分
  if (roleBalance.issues.length > 0) {
    balanceScore -= roleBalance.issues.length * 8;
  }
  
  // 功能覆盖扣分
  if (functionCoverage.issues.length > 0) {
    balanceScore -= functionCoverage.issues.length * 5;
  }
  
  // 英雄重叠度扣分
  if (heroOverlapRate > 25) {
    balanceScore -= (heroOverlapRate - 25) * 0.5;
  }
  
  // 实力均衡性计算
  const scores = members.map(m => m.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const scoreVariance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const scoreStdDev = Math.sqrt(scoreVariance);
  
  // 实力标准差扣分（标准差越大，扣分越多）
  if (scoreStdDev > 10) {
    balanceScore -= (scoreStdDev - 10) * 2;
  }
  
  return {
    balanceScore: Math.max(0, Math.round(balanceScore)),
    positionBalance,
    roleBalance,
    functionCoverage,
    heroOverlapRate,
    scoreStdDev: Math.round(scoreStdDev * 10) / 10
  };
}

// 为队员推荐英雄
function recommendHeroes(members: Player[]) {
  // 计算小组的功能需求
  const functionCoverage = checkFunctionCoverage(members);
  
  // 为每个队员推荐英雄
  return members.map(member => {
    const recommended: string[] = [];
    const reasons: Record<string, string> = {};
    
    // 优先推荐队员的常用英雄
    if (member.heroes && Array.isArray(member.heroes)) {
      for (const hero of member.heroes) {
        const heroFunctions = HERO_FUNCTIONS[hero];
        if (heroFunctions) {
          // 检查英雄是否符合位置要求
          const isPositionMatch = true; // 简化处理，实际应该根据位置匹配
          
          // 检查英雄是否能满足小组的功能需求
          if (functionCoverage.functionScores.control < 3 && heroFunctions.control >= 3) {
            reasons[hero] = '满足小组控制需求';
          } else if (functionCoverage.functionScores.push < 3 && heroFunctions.push >= 3) {
            reasons[hero] = '满足小组带线需求';
          } else if (functionCoverage.functionScores.output < 4 && heroFunctions.output >= 4) {
            reasons[hero] = '满足小组输出需求';
          } else {
            reasons[hero] = '个人常用英雄';
          }
          
          if (isPositionMatch) {
            recommended.push(hero);
          }
        }
      }
    }
    
    // 如果推荐英雄不足，从英雄库中推荐
    if (recommended.length < 3) {
      // 简化处理，实际应该根据位置和功能需求推荐
      const positionHeroes: Record<string, string[]> = {
        '对抗路': ['廉颇', '吕布', '关羽', '程咬金', '项羽'],
        '打野': ['李白', '韩信', '赵云', '兰陵王', '阿轲'],
        '中单': ['貂蝉', '诸葛亮', '不知火舞', '王昭君', '干将莫邪'],
        '发育路': ['后羿', '鲁班七号', '孙尚香', '马可波罗', '狄仁杰'],
        '辅助': ['蔡文姬', '孙膑', '大乔', '瑶', '庄周']
      };
      
      const positionHeroList = positionHeroes[member.main_position] || [];
      for (const hero of positionHeroList) {
        if (!recommended.includes(hero)) {
          recommended.push(hero);
          reasons[hero] = '位置推荐英雄';
          if (recommended.length >= 3) break;
        }
      }
    }
    
    return {
      ...member,
      recommended_heroes: recommended.slice(0, 3),
      hero_reasons: reasons
    };
  });
}

// 缓存机制
interface Player {
  user_id: string;
  game_id: string;
  main_position: string;
  second_position: string | null;
  accept_position_adjustment: boolean;
  available_time: Array<{
    day: string;
    start_time: string;
    end_time: string;
  }>;
  heroes: string[];
  score: number;
  original_position?: string;
  position_adjusted?: boolean;
  recommended_heroes?: string[];
  hero_reasons?: Record<string, string>;
  unassigned_reason?: string;
}

interface Group {
  id: number;
  name: string;
  members: Player[];
  average_score: number;
  balance_score?: number;
  score_std_dev?: number;
  missing_positions: string[];
  repeated_positions: string[];
  hero_overlap_rate: number;
  function_coverage: {
    functionScores: Record<string, number>;
    issues: string[];
  };
  role_balance: {
    roleCount: Record<string, number>;
    issues: string[];
  };
  warning: string | null;
  common_time?: string;
  suggested_time: string;
  time_fallback_reason?: string;
}

interface ResponseData {
  success: boolean;
  groups: Group[];
  unassigned: Player[];
  total_players: number;
  time_fallback_reason: string | null;
  fallback_reason: string | null;
  tips: string[];
}

// 缓存机制
const cache: Record<string, { data: ResponseData, timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export async function POST(req: Request) {
  try {
    const { team_id } = await req.json();
    if (!team_id) return NextResponse.json({ error: '缺少 team_id' }, { status: 400 });
    
    // 检查缓存
    const cacheKey = `group_${team_id}`;
    const now = Date.now();
    
    // 尝试使用缓存数据
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
      console.log('使用缓存数据');
      return NextResponse.json(cache[cacheKey].data);
    }
    
    console.log('开始处理分组请求，team_id:', team_id);
    
    // 构建队员列表（排除已锁定的队员）
    let players: Player[] = [];
    
    // 使用真实数据
    const useMockData = false; // 设置为 true 使用模拟数据，false 使用真实数据
    
    const groups: Group[] = [];
    const unassigned: Player[] = [];
    const lockedUserIds = new Set<string>();
    
    if (!useMockData) {
      try {
        // 获取已锁定的队员（在 active 批次中的队员）
        const { data: activeBatches, error: batchError } = await supabase
          .from('group_batches')
          .select('id')
          .eq('team_id', team_id)
          .eq('status', 'active');
        
        if (batchError) {
          console.error('获取活跃批次失败:', batchError);
          // 如果表不存在，继续处理
          if (batchError.code === '42P01') {
            console.log('group_batches 表不存在，跳过锁定队员检查');
          }
        } else if (activeBatches && activeBatches.length > 0) {
          const batchIds = activeBatches.map(batch => batch.id);
          const { data: lockedMembers, error: membersError } = await supabase
            .from('group_members')
            .select('user_id')
            .in('batch_id', batchIds);
          
          if (membersError) {
            console.error('获取锁定队员失败:', membersError);
          } else if (lockedMembers) {
            lockedMembers.forEach(member => lockedUserIds.add(member.user_id));
            console.log('已锁定的队员:', Array.from(lockedUserIds));
          }
        }
      } catch (lockError) {
        console.error('检查锁定队员时出错:', lockError);
        // 继续处理，不阻止分组
      }
    }
    
    if (useMockData) {
      // 模拟队员数据
      const allPlayers = [
        {
          user_id: '1',
          game_id: '玩家1',
          main_position: '对抗路',
          second_position: '打野',
          accept_position_adjustment: true,
          available_time: [
            { day: '周一', start_time: '20:00', end_time: '22:00' },
            { day: '周三', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['廉颇', '吕布', '关羽'],
          score: 90
        },
        {
          user_id: '2',
          game_id: '玩家2',
          main_position: '打野',
          second_position: '对抗路',
          accept_position_adjustment: true,
          available_time: [
            { day: '周一', start_time: '20:00', end_time: '22:00' },
            { day: '周三', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['李白', '韩信', '赵云'],
          score: 85
        },
        {
          user_id: '3',
          game_id: '玩家3',
          main_position: '中单',
          second_position: '发育路',
          accept_position_adjustment: true,
          available_time: [
            { day: '周一', start_time: '20:00', end_time: '22:00' },
            { day: '周三', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['貂蝉', '诸葛亮', '不知火舞'],
          score: 95
        },
        {
          user_id: '4',
          game_id: '玩家4',
          main_position: '发育路',
          second_position: '中单',
          accept_position_adjustment: true,
          available_time: [
            { day: '周一', start_time: '20:00', end_time: '22:00' },
            { day: '周三', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['后羿', '鲁班七号', '孙尚香'],
          score: 88
        },
        {
          user_id: '5',
          game_id: '玩家5',
          main_position: '辅助',
          second_position: '打野',
          accept_position_adjustment: true,
          available_time: [
            { day: '周一', start_time: '20:00', end_time: '22:00' },
            { day: '周三', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['蔡文姬', '孙膑', '大乔'],
          score: 82
        },
        {
          user_id: '6',
          game_id: '玩家6',
          main_position: '对抗路',
          second_position: '辅助',
          accept_position_adjustment: true,
          available_time: [
            { day: '周二', start_time: '19:00', end_time: '21:00' },
            { day: '周四', start_time: '19:00', end_time: '21:00' }
          ],
          heroes: ['程咬金', '项羽', '刘邦'],
          score: 78
        },
        {
          user_id: '7',
          game_id: '玩家7',
          main_position: '打野',
          second_position: '对抗路',
          accept_position_adjustment: true,
          available_time: [
            { day: '周二', start_time: '19:00', end_time: '21:00' },
            { day: '周四', start_time: '19:00', end_time: '21:00' }
          ],
          heroes: ['兰陵王', '阿轲', '赵云'],
          score: 80
        },
        {
          user_id: '8',
          game_id: '玩家8',
          main_position: '中单',
          second_position: '发育路',
          accept_position_adjustment: true,
          available_time: [
            { day: '周二', start_time: '19:00', end_time: '21:00' },
            { day: '周四', start_time: '19:00', end_time: '21:00' }
          ],
          heroes: ['王昭君', '干将莫邪', '貂蝉'],
          score: 85
        },
        {
          user_id: '9',
          game_id: '玩家9',
          main_position: '发育路',
          second_position: '中单',
          accept_position_adjustment: true,
          available_time: [
            { day: '周二', start_time: '19:00', end_time: '21:00' },
            { day: '周四', start_time: '19:00', end_time: '21:00' }
          ],
          heroes: ['马可波罗', '狄仁杰', '后羿'],
          score: 83
        },
        {
          user_id: '10',
          game_id: '玩家10',
          main_position: '辅助',
          second_position: '中单',
          accept_position_adjustment: true,
          available_time: [
            { day: '周二', start_time: '19:00', end_time: '21:00' },
            { day: '周四', start_time: '19:00', end_time: '21:00' }
          ],
          heroes: ['瑶', '庄周', '蔡文姬'],
          score: 75
        },
        {
          user_id: '11',
          game_id: '玩家11',
          main_position: '对抗路',
          second_position: '打野',
          accept_position_adjustment: true,
          available_time: [
            { day: '周五', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['马超', '孙策', '夏洛特'],
          score: 87
        },
        {
          user_id: '12',
          game_id: '玩家12',
          main_position: '打野',
          second_position: '中单',
          accept_position_adjustment: true,
          available_time: [
            { day: '周五', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['韩信', '李白', '兰陵王'],
          score: 89
        },
        {
          user_id: '13',
          game_id: '玩家13',
          main_position: '中单',
          second_position: '发育路',
          accept_position_adjustment: true,
          available_time: [
            { day: '周五', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['不知火舞', '诸葛亮', '貂蝉'],
          score: 92
        },
        {
          user_id: '14',
          game_id: '玩家14',
          main_position: '发育路',
          second_position: '辅助',
          accept_position_adjustment: true,
          available_time: [
            { day: '周五', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['孙尚香', '马可波罗', '狄仁杰'],
          score: 86
        },
        {
          user_id: '15',
          game_id: '玩家15',
          main_position: '辅助',
          second_position: '打野',
          accept_position_adjustment: true,
          available_time: [
            { day: '周五', start_time: '20:00', end_time: '22:00' }
          ],
          heroes: ['孙膑', '大乔', '瑶'],
          score: 81
        },
        {
          user_id: '16',
          game_id: '玩家16',
          main_position: '对抗路',
          second_position: '辅助',
          accept_position_adjustment: false,
          available_time: [], // 无可用时间
          heroes: ['廉颇', '吕布'],
          score: 75
        },
        {
          user_id: '17',
          game_id: '玩家17',
          main_position: '打野',
          second_position: '中单',
          accept_position_adjustment: false,
          available_time: [], // 无可用时间
          heroes: ['李白', '韩信'],
          score: 78
        }
      ];
      
      // 过滤已锁定的队员
      const filteredPlayers = allPlayers.filter(p => !lockedUserIds.has(p.user_id));
      
      // 分离有可用时间和无可用时间的队员
      players = filteredPlayers.filter(p => p.available_time && p.available_time.length > 0);
      
      // 无可用时间的队员直接添加到未分配列表
      const noTimePlayers = filteredPlayers.filter(p => !p.available_time || p.available_time.length === 0);
      for (const player of noTimePlayers) {
        unassigned.push({
          ...player,
          unassigned_reason: '无可用时间'
        });
      }
    } else {
      // 使用真实数据
      console.log('获取真实队员数据，team_id:', team_id);
      
      // 首先尝试从 team_applications 表获取数据（因为审批后数据保存在这里）
      console.log('尝试从 team_applications 表获取数据...');
      console.log('查询条件 - team_id:', team_id);
      
      // 首先尝试查询所有记录（不限制 status）
      const { data: allApplications, error: allAppError } = await supabase
        .from('team_applications')
        .select('user_id, game_id, current_rank, main_positions, position_stats, available_time, accept_position_adjustment, status')
        .eq('team_id', team_id)
        .order('created_at', { ascending: false });
      
      console.log('team_applications 所有记录:', { count: allApplications?.length || 0, error: allAppError });
      if (allApplications && allApplications.length > 0) {
        console.log('第一条记录:', JSON.stringify(allApplications[0], null, 2));
        console.log('所有记录的 status:', allApplications.map(a => a.status));
      }
      
      // 然后查询 approved 状态的记录
      const { data: applications, error: appError } = await supabase
        .from('team_applications')
        .select('user_id, game_id, current_rank, main_positions, position_stats, available_time, accept_position_adjustment')
        .eq('team_id', team_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      console.log('team_applications approved 记录:', { count: applications?.length || 0, error: appError });
      
      // 同时查询 player_profiles 表作为后备
      const { data: profiles, error } = await supabase.from('player_profiles').select('*').eq('team_id', team_id);
      
      console.log('player_profiles 查询结果:', { count: profiles?.length || 0, error });
      
      // 合并两个数据源的数据
      const mergedData: Record<string, any> = {};
      
      // 先添加 player_profiles 的数据
      if (profiles && profiles.length > 0) {
        for (const profile of profiles) {
          mergedData[profile.user_id] = profile;
        }
      }
      
      // 用 team_applications 的数据覆盖或补充（因为 applications 数据更完整）
      if (applications && applications.length > 0) {
        for (const app of applications) {
          if (app.user_id) {
            const existing = mergedData[app.user_id] || {};
            
            // 合并数据：优先使用 team_applications 的非空值，否则保留 player_profiles 的值
            mergedData[app.user_id] = {
              user_id: app.user_id,
              game_id: app.game_id ?? existing.game_id ?? null,
              current_rank: app.current_rank ?? existing.current_rank ?? null,
              main_positions: app.main_positions ?? existing.main_positions ?? null,
              position_stats: app.position_stats ?? existing.position_stats ?? null,
              available_time: app.available_time ?? existing.available_time ?? null,
              accept_position_adjustment: app.accept_position_adjustment ?? existing.accept_position_adjustment ?? false
            };
          }
        }
      }
      
      const combinedProfiles = Object.values(mergedData);
      console.log('合并后的数据数量:', combinedProfiles.length);
      
      // 检查合并后的数据是否有效（至少有一个字段不为空）
      const validProfiles = combinedProfiles.filter(p => {
        // 处理 main_positions 可能是 JSON 字符串的情况
        let mainPositions = p.main_positions;
        if (typeof mainPositions === 'string') {
          try {
            mainPositions = JSON.parse(mainPositions);
          } catch (e) {
            mainPositions = [];
          }
        }
        // 更宽松的有效性检查，只要有 user_id 就认为有效
        const isValid = p.user_id;
        console.log('检查队员有效性:', p.user_id, p.game_id, '有效:', isValid);
        return isValid;
      });
      console.log('有效的数据数量:', validProfiles.length);
      
      if (validProfiles.length > 0) {
        console.log('*** 走合并数据分支 ***');
        console.log('第一个队员的完整数据:', JSON.stringify(validProfiles[0], null, 2));
      }
      
      // 暂时跳过英雄数据查询，因为 player_heroes 表结构不匹配
      // 后续可以根据实际表结构进行修复
      const heroesMap: Record<string, string[]> = {};

      // 添加模拟数据功能，当数据库中没有有效数据时使用
      // 当前使用真实数据，模拟数据已关闭
      const useMockData = false; // 关闭模拟数据，使用真实数据
      let finalProfiles = validProfiles;
      
      if (useMockData && validProfiles.length === 0) {
        console.log('*** 使用模拟数据 ***');
        
        // 模拟队员数据（23条）
        const mockMembers = [
          {
            user_id: '451bd86b-9993-44eb-bfdc-24671840a194',
            game_id: '泽心心',
            current_rank: '绝世王者',
            main_positions: ['中单'],
            position_stats: {
              '中单': {
                win_rate: 33.3,
                kda: 3.33,
                rating: 33.3,
                power: 333,
                heroes: [135, 143, 142]
              },
              '打野': {
                win_rate: 44.4,
                kda: 4.44,
                rating: 44.4,
                power: 444,
                heroes: [145, 146, 147]
              }
            },
            available_time: [
              { day: '周五', start_time: '12:00', end_time: '23:59' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '5f14836a-e081-401e-8abb-aaeedbd90785',
            game_id: '月本柚',
            current_rank: '传奇王者',
            main_positions: ['中单'],
            position_stats: {
              '中单': {
                win_rate: 50.0,
                kda: 3.0,
                rating: 80.0,
                power: 5000,
                heroes: [136, 137, 138]
              }
            },
            available_time: [
              { day: '周五', start_time: '18:00', end_time: '23:59' },
              { day: '周六', start_time: '18:00', end_time: '23:59' },
              { day: '周日', start_time: '18:00', end_time: '23:59' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '3706dc8b-aeeb-4869-8147-7ad99ff6dac5',
            game_id: '世一少萝殿下',
            current_rank: '荣耀王者',
            main_positions: ['辅助'],
            position_stats: {
              '辅助': {
                win_rate: 55.0,
                kda: 4.0,
                rating: 85.0,
                power: 6000,
                heroes: [148, 149, 150]
              }
            },
            available_time: [
              { day: '周五', start_time: '18:00', end_time: '23:59' },
              { day: '周六', start_time: '18:00', end_time: '23:59' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: 'c42d12dd-6bc9-4bca-960e-ce2a45fdb164',
            game_id: '泽',
            current_rank: '至圣王者',
            main_positions: ['射手'],
            position_stats: {
              '中单': {
                win_rate: 77.0,
                kda: 7.77,
                rating: 77.7,
                power: 7777,
                heroes: [151, 152, 153]
              },
              '射手': {
                win_rate: 66.0,
                kda: 3.33,
                rating: 33.0,
                power: 555,
                heroes: [154, 155, 156]
              }
            },
            available_time: [
              { day: '周五', start_time: '12:00', end_time: '23:59' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: 'da3c6034-fa28-48aa-9e70-f111c9dfd47d',
            game_id: '轨迹',
            current_rank: '最强王者',
            main_positions: ['辅助', '中单'],
            position_stats: {
              '辅助': {
                win_rate: 50.0,
                kda: 3.5,
                rating: 75.0,
                power: 4500,
                heroes: [157, 158, 159]
              },
              '中单': {
                win_rate: 45.0,
                kda: 3.0,
                rating: 70.0,
                power: 4000,
                heroes: [160, 161, 162]
              }
            },
            available_time: [
              { day: '周五', start_time: '12:00', end_time: '06:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '18e84003-cac0-4678-a95e-7e14d510ab8c',
            game_id: '打野选手',
            current_rank: '至尊星耀',
            main_positions: ['打野'],
            position_stats: {
              '打野': {
                win_rate: 52.0,
                kda: 3.8,
                rating: 82.0,
                power: 5500,
                heroes: [163, 164, 165]
              }
            },
            available_time: [
              { day: '周六', start_time: '14:00', end_time: '22:00' },
              { day: '周日', start_time: '14:00', end_time: '22:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '2be9630e-1679-4e90-a263-bd7edb435bde',
            game_id: '上单选手',
            current_rank: '永恒钻石',
            main_positions: ['上单'],
            position_stats: {
              '上单': {
                win_rate: 48.0,
                kda: 2.8,
                rating: 72.0,
                power: 3500,
                heroes: [166, 167, 168]
              }
            },
            available_time: [
              { day: '周五', start_time: '20:00', end_time: '23:59' },
              { day: '周六', start_time: '20:00', end_time: '23:59' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '6b1c3123-3ccd-4c31-8274-fea24c8ad862',
            game_id: '惊喜',
            current_rank: '荣耀王者',
            main_positions: ['射手'],
            position_stats: {
              '射手': {
                win_rate: 66.0,
                kda: 3.33,
                rating: 66.0,
                power: 6666,
                heroes: [135, 143, 142]
              }
            },
            available_time: [
              { day: '周五', start_time: '12:00', end_time: '23:59' }
            ],
            accept_position_adjustment: false
          },
          {
            user_id: '1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
            game_id: '王者荣耀玩家1',
            current_rank: '最强王者',
            main_positions: ['对抗路'],
            position_stats: {
              '对抗路': {
                win_rate: 55.0,
                kda: 3.2,
                rating: 78.0,
                power: 4800,
                heroes: [1, 2, 3]
              }
            },
            available_time: [
              { day: '周一', start_time: '19:00', end_time: '22:00' },
              { day: '周三', start_time: '19:00', end_time: '22:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
            game_id: '王者荣耀玩家2',
            current_rank: '至尊星耀',
            main_positions: ['打野'],
            position_stats: {
              '打野': {
                win_rate: 58.0,
                kda: 4.1,
                rating: 85.0,
                power: 6200,
                heroes: [4, 5, 6]
              }
            },
            available_time: [
              { day: '周二', start_time: '20:00', end_time: '23:00' },
              { day: '周四', start_time: '20:00', end_time: '23:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
            game_id: '王者荣耀玩家3',
            current_rank: '荣耀王者',
            main_positions: ['中单'],
            position_stats: {
              '中单': {
                win_rate: 62.0,
                kda: 3.8,
                rating: 88.0,
                power: 7500,
                heroes: [7, 8, 9]
              }
            },
            available_time: [
              { day: '周五', start_time: '19:00', end_time: '23:59' },
              { day: '周六', start_time: '19:00', end_time: '23:59' },
              { day: '周日', start_time: '19:00', end_time: '23:59' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s',
            game_id: '王者荣耀玩家4',
            current_rank: '传奇王者',
            main_positions: ['发育路'],
            position_stats: {
              '发育路': {
                win_rate: 65.0,
                kda: 3.5,
                rating: 90.0,
                power: 8000,
                heroes: [10, 11, 12]
              }
            },
            available_time: [
              { day: '周六', start_time: '14:00', end_time: '22:00' },
              { day: '周日', start_time: '14:00', end_time: '22:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t',
            game_id: '王者荣耀玩家5',
            current_rank: '至圣王者',
            main_positions: ['辅助'],
            position_stats: {
              '辅助': {
                win_rate: 59.0,
                kda: 4.2,
                rating: 86.0,
                power: 6800,
                heroes: [13, 14, 15]
              }
            },
            available_time: [
              { day: '周一', start_time: '20:00', end_time: '23:00' },
              { day: '周二', start_time: '20:00', end_time: '23:00' },
              { day: '周三', start_time: '20:00', end_time: '23:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '6f7g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u',
            game_id: '王者荣耀玩家6',
            current_rank: '永恒钻石',
            main_positions: ['对抗路', '打野'],
            position_stats: {
              '对抗路': {
                win_rate: 48.0,
                kda: 2.9,
                rating: 72.0,
                power: 3500,
                heroes: [16, 17, 18]
              },
              '打野': {
                win_rate: 52.0,
                kda: 3.4,
                rating: 76.0,
                power: 4200,
                heroes: [19, 20, 21]
              }
            },
            available_time: [
              { day: '周四', start_time: '19:00', end_time: '22:00' },
              { day: '周五', start_time: '19:00', end_time: '22:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '7g8h9i0j-1k2l-3m4n-5o6p-7q8r9s0t1u2v',
            game_id: '王者荣耀玩家7',
            current_rank: '至尊星耀',
            main_positions: ['中单', '发育路'],
            position_stats: {
              '中单': {
                win_rate: 56.0,
                kda: 3.3,
                rating: 80.0,
                power: 5000,
                heroes: [22, 23, 24]
              },
              '发育路': {
                win_rate: 54.0,
                kda: 3.1,
                rating: 78.0,
                power: 4800,
                heroes: [25, 26, 27]
              }
            },
            available_time: [
              { day: '周六', start_time: '15:00', end_time: '23:00' },
              { day: '周日', start_time: '15:00', end_time: '23:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '8h9i0j1k-2l3m-4n5o-6p7q-8r9s0t1u2v3w',
            game_id: '王者荣耀玩家8',
            current_rank: '最强王者',
            main_positions: ['打野', '辅助'],
            position_stats: {
              '打野': {
                win_rate: 59.0,
                kda: 3.9,
                rating: 84.0,
                power: 6000,
                heroes: [28, 29, 30]
              },
              '辅助': {
                win_rate: 57.0,
                kda: 4.0,
                rating: 82.0,
                power: 5800,
                heroes: [31, 32, 33]
              }
            },
            available_time: [
              { day: '周一', start_time: '21:00', end_time: '00:00' },
              { day: '周三', start_time: '21:00', end_time: '00:00' },
              { day: '周五', start_time: '21:00', end_time: '00:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '9i0j1k2l-3m4n-5o6p-7q8r-9s0t1u2v3w4x',
            game_id: '王者荣耀玩家9',
            current_rank: '荣耀王者',
            main_positions: ['发育路', '中单'],
            position_stats: {
              '发育路': {
                win_rate: 63.0,
                kda: 3.6,
                rating: 89.0,
                power: 7800,
                heroes: [34, 35, 36]
              },
              '中单': {
                win_rate: 61.0,
                kda: 3.7,
                rating: 87.0,
                power: 7200,
                heroes: [37, 38, 39]
              }
            },
            available_time: [
              { day: '周二', start_time: '18:00', end_time: '23:00' },
              { day: '周四', start_time: '18:00', end_time: '23:00' },
              { day: '周六', start_time: '18:00', end_time: '23:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '0j1k2l3m-4n5o-6p7q-8r9s-0t1u2v3w4x5y',
            game_id: '王者荣耀玩家10',
            current_rank: '传奇王者',
            main_positions: ['辅助', '对抗路'],
            position_stats: {
              '辅助': {
                win_rate: 60.0,
                kda: 4.3,
                rating: 87.0,
                power: 6900,
                heroes: [40, 41, 42]
              },
              '对抗路': {
                win_rate: 54.0,
                kda: 3.1,
                rating: 79.0,
                power: 5100,
                heroes: [43, 44, 45]
              }
            },
            available_time: [
              { day: '周日', start_time: '14:00', end_time: '20:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '1k2l3m4n-5o6p-7q8r-9s0t-1u2v3w4x5y6z',
            game_id: '王者荣耀玩家11',
            current_rank: '至圣王者',
            main_positions: ['打野', '中单'],
            position_stats: {
              '打野': {
                win_rate: 64.0,
                kda: 4.2,
                rating: 91.0,
                power: 8500,
                heroes: [46, 47, 48]
              },
              '中单': {
                win_rate: 62.0,
                kda: 3.9,
                rating: 89.0,
                power: 8000,
                heroes: [49, 50, 51]
              }
            },
            available_time: [
              { day: '周一', start_time: '19:30', end_time: '23:30' },
              { day: '周三', start_time: '19:30', end_time: '23:30' },
              { day: '周五', start_time: '19:30', end_time: '23:30' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '2l3m4n5o-6p7q-8r9s-0t1u-2v3w4x5y6z7a',
            game_id: '王者荣耀玩家12',
            current_rank: '永恒钻石',
            main_positions: ['对抗路'],
            position_stats: {
              '对抗路': {
                win_rate: 47.0,
                kda: 2.7,
                rating: 70.0,
                power: 3200,
                heroes: [52, 53, 54]
              }
            },
            available_time: [
              { day: '周六', start_time: '10:00', end_time: '16:00' },
              { day: '周日', start_time: '10:00', end_time: '16:00' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '3m4n5o6p-7q8r-9s0t-1u2v-3w4x5y6z7a8b',
            game_id: '王者荣耀玩家13',
            current_rank: '至尊星耀',
            main_positions: ['发育路'],
            position_stats: {
              '发育路': {
                win_rate: 55.0,
                kda: 3.2,
                rating: 81.0,
                power: 5300,
                heroes: [55, 56, 57]
              }
            },
            available_time: [
              { day: '周二', start_time: '20:30', end_time: '23:30' },
              { day: '周四', start_time: '20:30', end_time: '23:30' }
            ],
            accept_position_adjustment: true
          },
          {
            user_id: '4n5o6p7q-8r9s-0t1u-2v3w-4x5y6z7a8b9c',
            game_id: '王者荣耀玩家14',
            current_rank: '最强王者',
            main_positions: ['辅助'],
            position_stats: {
              '辅助': {
                win_rate: 58.0,
                kda: 4.1,
                rating: 85.0,
                power: 6300,
                heroes: [58, 59, 60]
              }
            },
            available_time: [
              { day: '周五', start_time: '18:30', end_time: '22:30' },
              { day: '周六', start_time: '18:30', end_time: '22:30' },
              { day: '周日', start_time: '18:30', end_time: '22:30' }
            ],
            accept_position_adjustment: true
          }
        ];
        
        finalProfiles = mockMembers;
        console.log('使用模拟数据，队员数量:', finalProfiles.length);
      }
      
      // 处理队员数据
      if (finalProfiles.length > 0) {
        console.log('处理从 player_profiles、team_applications 或模拟数据获取的数据，数量:', finalProfiles.length);

        for (const p of finalProfiles) {
          // 排除已锁定的队员
          if (lockedUserIds.has(p.user_id)) {
            console.log('排除已锁定的队员:', p.user_id, p.game_id);
            continue;
          }
          
          // 调试日志
          console.log('处理队员:', p.user_id);
          console.log('  game_id:', p.game_id, '类型:', typeof p.game_id);
          console.log('  current_rank:', p.current_rank);
          console.log('  main_positions:', p.main_positions);
          console.log('  position_stats:', JSON.stringify(p.position_stats)?.substring(0, 200));
          console.log('  完整数据:', JSON.stringify(p, null, 2).substring(0, 500));
          
          // 解析 main_positions
          const mainPositions = parseMainPositions(p.main_positions);
          const pos = mainPositions[0] ? (POSITION_MAP[mainPositions[0]] || mainPositions[0]) : '';
          
          console.log('  解析后的位置:', pos, '有效位置:', POSITIONS.includes(pos));
          
          if (!POSITIONS.includes(pos)) {
            console.log('排除位置无效的队员:', p.user_id, p.game_id, '位置:', pos);
            unassigned.push({
              user_id: p.user_id, 
              game_id: p.game_id || '未设置', 
              main_position: pos,
              second_position: mainPositions[1] ? (POSITION_MAP[mainPositions[1]] || mainPositions[1]) : null,
              accept_position_adjustment: p.accept_position_adjustment || false,
              available_time: p.available_time || [],
              heroes: [],
              score: 50,
              unassigned_reason: '位置无效'
            });
            continue;
          }
          
          // 从 position_stats 计算实力分（基于主位置）
          let score = calculateStrength(p.position_stats, p.current_rank, pos);
          console.log('  计算的实力分:', score);
          
          // 如果实力分为50（默认值），尝试从段位获取更合理的分数
          if (score === 50 && p.current_rank) {
            const rankScore = getRankScore(p.current_rank);
            if (rankScore !== 50) {
              score = rankScore;
              console.log('  使用段位分数:', score);
            }
          }
          
          // 合并英雄数据来源：player_heroes 表 + position_stats
          const heroesFromTable = heroesMap[p.user_id] || [];
          const heroesFromStats = extractHeroesFromStats(p.position_stats, pos);
          // 合并并去重
          const heroSet = new Set<string>();
          for (const hero of heroesFromTable) heroSet.add(hero);
          for (const hero of heroesFromStats) heroSet.add(hero);
          const allHeroes: string[] = [];
          heroSet.forEach(hero => allHeroes.push(hero));
          
          console.log('  英雄数量:', allHeroes.length, '来自表:', heroesFromTable.length, '来自stats:', heroesFromStats.length);
          
          const player = {
            user_id: p.user_id, 
            game_id: p.game_id || '未设置', 
            main_position: pos,
            second_position: mainPositions[1] ? (POSITION_MAP[mainPositions[1]] || mainPositions[1]) : null,
            accept_position_adjustment: p.accept_position_adjustment ?? true,
            available_time: p.available_time || [],
            heroes: allHeroes.slice(0, 5),
            score 
          };
          
          // 为没有可用时间的队员生成分散的默认可用时间
          if (!player.available_time || player.available_time.length === 0) {
            const userIdHash = p.user_id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            const timeSlots = [
              { day: '周五', start_time: '20:00', end_time: '22:00' },
              { day: '周六', start_time: '14:00', end_time: '18:00' },
              { day: '周六', start_time: '20:00', end_time: '22:00' },
              { day: '周日', start_time: '14:00', end_time: '18:00' },
              { day: '周日', start_time: '20:00', end_time: '22:00' },
              { day: '周一', start_time: '20:00', end_time: '22:00' },
              { day: '周二', start_time: '20:00', end_time: '22:00' },
              { day: '周三', start_time: '20:00', end_time: '22:00' }
            ];
            const numSlots = (userIdHash % 3) + 1;
            const startIndex = userIdHash % timeSlots.length;
            player.available_time = [];
            for (let i = 0; i < numSlots; i++) {
              const index = (startIndex + i) % timeSlots.length;
              player.available_time.push(timeSlots[index]);
            }
            console.log('  生成的默认时间:', player.available_time);
          }
          players.push(player);
        }
        
        console.log('处理完成，有效队员数量:', players.length, '未分配队员数量:', unassigned.length);
      }
    }
    
    // 时间优先分组
    const timeBasedGrouping = () => {
      interface TimeSlot {
        day: string;
        start_time: string;
        end_time: string;
        count: number;
        players: Player[];
      }

      // 收集所有时间段
      const timeSlots: Record<string, TimeSlot> = {};
      
      // 遍历所有队员的可用时间
      for (const player of players) {
        if (player.available_time && Array.isArray(player.available_time)) {
          for (const time of player.available_time) {
            const key = `${time.day}-${time.start_time}-${time.end_time}`;
            if (!timeSlots[key]) {
              timeSlots[key] = {
                day: time.day,
                start_time: time.start_time,
                end_time: time.end_time,
                count: 0,
                players: []
              };
            }
            timeSlots[key].count++;
            timeSlots[key].players.push(player);
          }
        }
      }
      
      // 处理时间区间的兼容性，确保时间多的兼容时间少的
      // 核心逻辑：一个时间区间大的队员可以参加时间区间小的比赛
      // 例如：12:00-23:59 的队员可以参加 20:00-22:00 的比赛
      
      // 1. 创建时间兼容性映射
      // 对于每个队员的每个时间段，找出哪些比赛时间段是兼容的
      const playerCompatibleSlots: Map<string, Set<string>> = new Map(); // player_id -> Set of slot keys
      
      // 获取所有时间槽的key
      const allSlotKeys = Object.keys(timeSlots);
      
      for (const player of players) {
        if (!player.available_time || !Array.isArray(player.available_time)) continue;
        
        const compatibleKeys = new Set<string>();
        
        for (const playerTime of player.available_time) {
          // 检查这个时间是否与哪个时间槽兼容
          for (const [slotKey, slot] of Object.entries(timeSlots)) {
            // 同一天，且队员的时间区间包含时间槽的时间区间
            if (playerTime.day === slot.day) {
              // 将时间转换为分钟数进行比较
              const [playerStartHour, playerStartMin] = playerTime.start_time.split(':').map(Number);
              const [playerEndHour, playerEndMin] = playerTime.end_time.split(':').map(Number);
              const [slotStartHour, slotStartMin] = slot.start_time.split(':').map(Number);
              const [slotEndHour, slotEndMin] = slot.end_time.split(':').map(Number);
              
              const playerStart = playerStartHour * 60 + playerStartMin;
              const playerEnd = playerEndHour * 60 + playerEndMin;
              const slotStart = slotStartHour * 60 + slotStartMin;
              const slotEnd = slotEndHour * 60 + slotEndMin;
              
              // 队员的时间区间包含时间槽的时间区间
              if (playerStart <= slotStart && playerEnd >= slotEnd) {
                compatibleKeys.add(slotKey);
              }
            }
          }
        }
        
        playerCompatibleSlots.set(player.user_id, compatibleKeys);
      }
      
      // 2. 重新计算每个时间槽的兼容队员数
      const compatibleTimeSlots: Record<string, TimeSlot> = {};
      
      for (const [slotKey, slot] of Object.entries(timeSlots)) {
        const compatiblePlayers: Player[] = [];
        
        // 找到所有兼容这个时间槽的队员
        for (const player of players) {
          const compatibleKeys = playerCompatibleSlots.get(player.user_id);
          if (compatibleKeys && compatibleKeys.has(slotKey)) {
            compatiblePlayers.push(player);
          }
        }
        
        compatibleTimeSlots[slotKey] = {
          ...slot,
          players: compatiblePlayers,
          count: compatiblePlayers.length
        };
      }
      
      // 3. 将兼容时间槽转换为数组并排序
      const sortedTimeSlots = Object.values(compatibleTimeSlots).sort((a, b) => {
        // 按出现次数降序
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        // 次数相同按持续时间升序（优先选择时间短的，更精确）
        const durationA = calculateDuration(a.start_time, a.end_time);
        const durationB = calculateDuration(b.start_time, b.end_time);
        return durationA - durationB;
      });
      
      // 标记已分组的队员
      const groupedUserIds = new Set<string>();
      
      // 时间重叠度计算函数
      const calculateTimeOverlap = (time1: { start_time: string; end_time: string }, time2: { start_time: string; end_time: string }) => {
        const [start1Hour, start1Minute] = time1.start_time.split(':').map(Number);
        const [end1Hour, end1Minute] = time1.end_time.split(':').map(Number);
        const [start2Hour, start2Minute] = time2.start_time.split(':').map(Number);
        const [end2Hour, end2Minute] = time2.end_time.split(':').map(Number);
        
        const start1 = start1Hour * 60 + start1Minute;
        const end1 = end1Hour * 60 + end1Minute;
        const start2 = start2Hour * 60 + start2Minute;
        const end2 = end2Hour * 60 + end2Minute;
        
        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);
        
        if (overlapStart >= overlapEnd) return 0;
        return overlapEnd - overlapStart;
      };
      
      // 遍历时间段，创建小组
      for (const timeSlot of sortedTimeSlots) {
        // 过滤出未分组的队员
        const availablePlayers = timeSlot.players.filter(p => !groupedUserIds.has(p.user_id));
        
        if (availablePlayers.length >= 5) { // 至少5人才能组成完整小组
          // 智能分组算法：综合考虑位置、实力、英雄
          const members: Player[] = [];
          const selectedUserIds = new Set<string>();
          
          // 按位置分类（包含主位置和第二位置）
          const byMainPos: Record<string, Player[]> = {};
          const bySecondPos: Record<string, Player[]> = {};
          for (const pos of POSITIONS) {
            byMainPos[pos] = [];
            bySecondPos[pos] = [];
          }
          
          for (const p of availablePlayers) {
            if (POSITIONS.includes(p.main_position)) {
              byMainPos[p.main_position].push(p);
            }
            if (p.second_position && POSITIONS.includes(p.second_position)) {
              bySecondPos[p.second_position].push(p);
            }
          }
          
          // 按实力排序
          for (const pos of POSITIONS) {
            byMainPos[pos].sort((a, b) => b.score - a.score);
            bySecondPos[pos].sort((a, b) => b.score - a.score);
          }
          
          // 第一阶段：确保5个位置都有主位置队员
          for (const pos of POSITIONS) {
            if (members.length >= 5) break;
            
            // 优先选择主位置匹配的队员
            const candidates = byMainPos[pos].filter(p => !selectedUserIds.has(p.user_id));
            if (candidates.length > 0) {
              members.push(candidates[0]);
              selectedUserIds.add(candidates[0].user_id);
            }
          }
          
          // 第二阶段：如果还有空位，用第二位置队员补充
          while (members.length < 5) {
            const currentPositions = new Set(members.map(m => m.main_position));
            const missingPositions = POSITIONS.filter(pos => !currentPositions.has(pos));
            
            let added = false;
            
            // 优先补充缺少的位置
            for (const pos of missingPositions) {
              const candidates = bySecondPos[pos].filter(p => 
                !selectedUserIds.has(p.user_id) && p.accept_position_adjustment
              );
              if (candidates.length > 0) {
                const player = candidates[0];
                player.original_position = player.main_position;
                player.main_position = pos;
                player.position_adjusted = true;
                members.push(player);
                selectedUserIds.add(player.user_id);
                added = true;
                break;
              }
            }
            
            // 如果无法补充缺少的位置，选择实力最强的剩余队员
            if (!added) {
              const remainingPlayers = availablePlayers.filter(p => !selectedUserIds.has(p.user_id));
              if (remainingPlayers.length > 0) {
                remainingPlayers.sort((a, b) => b.score - a.score);
                members.push(remainingPlayers[0]);
                selectedUserIds.add(remainingPlayers[0].user_id);
                added = true;
              }
            }
            
            if (!added) break;
          }
          
          // 检查是否组成了至少3人的小组
          if (members.length >= 3) {
            // 计算小组的时间重叠度
            let totalOverlap = 0;
            const timeOverlapWarnings: string[] = [];
            
            // 检查所有队员之间的时间重叠
            for (let i = 0; i < members.length; i++) {
              for (let j = i + 1; j < members.length; j++) {
                const player1 = members[i];
                const player2 = members[j];
                
                if (player1.available_time && player2.available_time) {
                  let maxOverlap = 0;
                  for (const time1 of player1.available_time) {
                    for (const time2 of player2.available_time) {
                      if (time1.day === time2.day) {
                        const overlap = calculateTimeOverlap(time1, time2);
                        maxOverlap = Math.max(maxOverlap, overlap);
                      }
                    }
                  }
                  totalOverlap += maxOverlap;
                }
              }
            }
            
            const avgOverlap = totalOverlap / (members.length * (members.length - 1) / 2);
            if (avgOverlap < 30) {
              timeOverlapWarnings.push(`时间重叠度较低，平均只有 ${Math.round(avgOverlap)} 分钟`);
            } else if (avgOverlap < 60) {
              timeOverlapWarnings.push(`时间重叠度适中，平均 ${Math.round(avgOverlap)} 分钟`);
            } else {
              timeOverlapWarnings.push(`时间重叠度良好，平均 ${Math.round(avgOverlap)} 分钟`);
            }
            
            // 使用增强的小组平衡性计算
            const balanceResult = calculateGroupBalance(members);
            const avg = Math.round(members.reduce((s, m) => s + m.score, 0) / members.length);
            
            const warnings: string[] = [...timeOverlapWarnings];
            if (balanceResult.heroOverlapRate > 25) {
              warnings.push(`英雄重叠度较高: ${balanceResult.heroOverlapRate}%`);
            }
            if (balanceResult.positionBalance.repeatedPositions.length > 0) {
              warnings.push(`位置重复: ${balanceResult.positionBalance.repeatedPositions.join(', ')}`);
            }
            if (balanceResult.positionBalance.missingPositions.length > 0) {
              warnings.push(`缺少: ${balanceResult.positionBalance.missingPositions.join(', ')}`);
            }
            if (balanceResult.roleBalance.issues.length > 0) {
              warnings.push(...balanceResult.roleBalance.issues);
            }
            if (balanceResult.functionCoverage.issues.length > 0) {
              warnings.push(...balanceResult.functionCoverage.issues);
            }
            if (balanceResult.scoreStdDev > 15) {
              warnings.push(`实力差距较大，标准差: ${balanceResult.scoreStdDev}`);
            }
            if (members.length < 5) {
              warnings.push(`小组人数不足5人，当前只有${members.length}人`);
            }
            
            // 标记队员为已分组
            members.forEach(m => groupedUserIds.add(m.user_id));
            
            // 为队员推荐英雄
            const membersWithRecommendations = recommendHeroes(members);
            
            // 确定小组的建议上线时间
            const suggestedTime = `${timeSlot.day} ${timeSlot.start_time}`;
            
            groups.push({
            id: groups.length,
            name: `${String.fromCharCode(65 + groups.length)}组 (${suggestedTime})`,
            members: membersWithRecommendations,
            average_score: avg,
            balance_score: balanceResult.balanceScore,
            missing_positions: balanceResult.positionBalance.missingPositions,
            repeated_positions: balanceResult.positionBalance.repeatedPositions,
            hero_overlap_rate: balanceResult.heroOverlapRate,
            function_coverage: balanceResult.functionCoverage,
            role_balance: balanceResult.roleBalance,
            score_std_dev: balanceResult.scoreStdDev,
            warning: warnings.length > 0 ? warnings.join('\n') : null,
            common_time: `${timeSlot.day} ${timeSlot.start_time}-${timeSlot.end_time}`,
            suggested_time: suggestedTime
          });
          }
        }
      }
      
      // 尝试处理部分重叠的时间段
      if (groups.length === 0 && players.length >= 3) { // 降低要求，至少3人即可分组
        // 按天分组
        const playersByDay: Record<string, Player[]> = {};
        for (const player of players) {
          if (player.available_time && Array.isArray(player.available_time)) {
            for (const time of player.available_time) {
              if (!playersByDay[time.day]) {
                playersByDay[time.day] = [];
              }
              if (!playersByDay[time.day].some(p => p.user_id === player.user_id)) {
                playersByDay[time.day].push(player);
              }
            }
          }
        }
        
        // 遍历每天的队员
        for (const [day, dayPlayers] of Object.entries(playersByDay)) {
          if (dayPlayers.length >= 3) {
            // 按位置分类并排序
            const byPos: Record<string, Player[]> = {};
            for (const pos of POSITIONS) byPos[pos] = [];
            for (const p of dayPlayers) {
              if (POSITIONS.includes(p.main_position)) {
                byPos[p.main_position].push(p);
              }
            }
            for (const pos of POSITIONS) byPos[pos].sort((a, b) => b.score - a.score);
            
            // 尝试组成小组
            const members: Player[] = [];
            for (const pos of POSITIONS) {
              if (byPos[pos].length > 0) {
                const player = byPos[pos][0];
                members.push(player);
              }
            }
            
            if (members.length >= 3) {
              // 标记队员为已分组
              members.forEach(m => groupedUserIds.add(m.user_id));
              
              const avg = Math.round(members.reduce((s, m) => s + m.score, 0) / members.length);
              const overlapRate = calculateHeroOverlap(members);
              const positionBalance = checkPositionBalance(members);
              const roleBalance = checkRoleBalance(members);
              const functionCoverage = checkFunctionCoverage(members);
              
              // 为队员推荐英雄
              const membersWithRecommendations = recommendHeroes(members);
              
              const warnings: string[] = [];
              if (overlapRate > 25) {
                warnings.push(`英雄重叠度较高: ${overlapRate}%`);
              }
              if (positionBalance.repeatedPositions.length > 0) {
                warnings.push(`位置重复: ${positionBalance.repeatedPositions.join(', ')}`);
              }
              if (positionBalance.missingPositions.length > 0) {
                warnings.push(`缺少: ${positionBalance.missingPositions.join(', ')}`);
              }
              if (roleBalance.issues.length > 0) {
                warnings.push(...roleBalance.issues);
              }
              if (functionCoverage.issues.length > 0) {
                warnings.push(...functionCoverage.issues);
              }
              if (members.length < 5) {
                warnings.push(`小组人数不足5人，当前只有${members.length}人`);
              }
              warnings.push('未找到完全匹配的时间段，但队员在同一天都有可用时间');
              
              // 确定小组的建议上线时间（选择一个合理的默认时间）
              const suggestedTime = `${day} 20:00`;
              
              groups.push({
              id: groups.length,
              name: `${String.fromCharCode(65 + groups.length)}组 (${suggestedTime})`,
              members: membersWithRecommendations,
              average_score: avg,
              missing_positions: positionBalance.missingPositions,
              repeated_positions: positionBalance.repeatedPositions,
              hero_overlap_rate: overlapRate,
              function_coverage: functionCoverage,
              role_balance: roleBalance,
              warning: warnings.length > 0 ? warnings.join('\n') : null,
              common_time: `${day} (时间段需协调)`,
              suggested_time: suggestedTime
            });
            }
          }
        }
      }
      
      // 返回未分组的队员
      return players.filter(p => !groupedUserIds.has(p.user_id));
    }
    
    // 计算时间段持续时间（分钟）
    const calculateDuration = (startTime: string, endTime: string) => {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      return (endHour - startHour) * 60 + (endMinute - startMinute);
    }
    
    // 执行时间优先分组
    const remainingPlayers = timeBasedGrouping();
    
    // 标记时间优先失败的原因
    let timeFallbackReason = null;
    if (remainingPlayers.length === players.length) {
      // 没有队员被时间优先分组
      timeFallbackReason = 'no_common_time';
    } else if (remainingPlayers.length > 0) {
      // 部分队员未被时间优先分组
      timeFallbackReason = 'insufficient_time_overlap';
    }
    
    // 对剩余队员按位置分类并排序
    const byPos: Record<string, Player[]> = {};
    for (const pos of POSITIONS) byPos[pos] = [];
    for (const p of remainingPlayers) byPos[p.main_position].push(p);
    for (const pos of POSITIONS) byPos[pos].sort((a, b) => b.score - a.score);
    
    // 为未分组的队员生成未分组原因
    const generateUnassignedReasons = (unassignedPlayers: Player[]) => {
      return unassignedPlayers.map(player => {
        // 检查是否有可用时间
        const hasAvailableTime = player.available_time && player.available_time.length > 0;
        
        // 检查位置是否有效
        const hasValidPosition = POSITIONS.includes(player.main_position);
        
        // 生成未分组原因
        const reasons = [];
        const suggestions = [];
        
        if (!hasAvailableTime) {
          reasons.push('无可用时间');
          suggestions.push('请设置可比赛时间');
        }
        
        if (!hasValidPosition) {
          reasons.push('位置无效');
          suggestions.push('请设置有效的游戏位置');
        }
        
        // 检查是否有合适的分组时间
        let hasMatchingTime = false;
        for (const group of groups) {
          if (group.common_time) {
            const groupDay = group.common_time.split(' ')[0];
            for (const time of player.available_time) {
              if (time.day === groupDay) {
                hasMatchingTime = true;
                break;
              }
            }
            if (hasMatchingTime) break;
          }
        }
        
        if (!hasMatchingTime && hasAvailableTime) {
          reasons.push('无匹配的时间段');
          suggestions.push('尝试调整可比赛时间，与现有小组时间匹配');
        }
        
        // 检查是否可以通过第二位置加入小组
        let canJoinAsSecondPosition = false;
        let suggestedGroup = null;
        for (const group of groups) {
          const missingPositions = group.missing_positions;
          if (missingPositions.length > 0) {
            for (const pos of missingPositions) {
              if (player.second_position === pos || (player.accept_position_adjustment && player.second_position)) {
                canJoinAsSecondPosition = true;
                suggestedGroup = group.name;
                break;
              }
            }
            if (canJoinAsSecondPosition) break;
          }
        }
        
        if (canJoinAsSecondPosition) {
          reasons.push(`可尝试通过第二位置加入${suggestedGroup || '小组'}`);
          suggestions.push('考虑接受位置调整，以增加分组机会');
        }
        
        // 检查是否因为位置冲突未被分组
        let positionConflict = false;
        for (const group of groups) {
          if (group.members.some(m => m.main_position === player.main_position)) {
            positionConflict = true;
            break;
          }
        }
        
        if (positionConflict) {
          reasons.push('位置冲突，该位置已有队员');
          suggestions.push('考虑设置第二位置或接受位置调整');
        }
        
        // 检查是否因为实力差距过大未被分组
        if (player.score < 30) {
          reasons.push('实力分较低');
          suggestions.push('通过训练提升实力分');
        }
        
        const unassignedReason = reasons.length > 0 ? reasons.join('; ') : '暂无合适的分组';
        const suggestionText = suggestions.length > 0 ? `建议: ${suggestions.join('; ')}` : '';
        
        return {
          ...player,
          unassigned_reason: suggestionText ? `${unassignedReason} (${suggestionText})` : unassignedReason
        };
      });
    }
    
    // 检查是否能组成完整的5人组
    const canFormCompleteGroup = POSITIONS.every(pos => byPos[pos].length > 0);
    
    if (canFormCompleteGroup) {
      // 可以组成完整5人组
      let groupIndex = 0;
      
      // 递归生成完整小组
      while (POSITIONS.every(pos => byPos[pos].length > 0)) {
        const members = POSITIONS.map(pos => byPos[pos].shift()!).filter(Boolean);
        const avg = Math.round(members.reduce((s, m) => s + m.score, 0) / members.length);
        const overlapRate = calculateHeroOverlap(members);
        const positionBalance = checkPositionBalance(members);
        const roleBalance = checkRoleBalance(members);
        const functionCoverage = checkFunctionCoverage(members);
        
        // 为队员推荐英雄
        const membersWithRecommendations = recommendHeroes(members);
        
        const warnings = [];
        if (overlapRate > 25) {
          warnings.push(`英雄重叠度较高: ${overlapRate}%`);
        }
        if (positionBalance.repeatedPositions.length > 0) {
          warnings.push(`位置重复: ${positionBalance.repeatedPositions.join(', ')}`);
        }
        if (positionBalance.missingPositions.length > 0) {
          warnings.push(`缺少: ${positionBalance.missingPositions.join(', ')}`);
        }
        if (roleBalance.issues.length > 0) {
          warnings.push(...roleBalance.issues);
        }
        if (functionCoverage.issues.length > 0) {
          warnings.push(...functionCoverage.issues);
        }
        
        // 确定小组的建议上线时间（选择一个合理的默认时间）
        const suggestedTime = '每天 20:00';
        
        groups.push({
          id: groupIndex,
          name: `${String.fromCharCode(65 + groupIndex)}组 (${suggestedTime})`,
          members: membersWithRecommendations,
          average_score: avg,
          missing_positions: positionBalance.missingPositions,
          repeated_positions: positionBalance.repeatedPositions,
          hero_overlap_rate: overlapRate,
          function_coverage: functionCoverage,
          role_balance: roleBalance,
          warning: warnings.length > 0 ? warnings.join('\n') : null,
          suggested_time: suggestedTime
        });
        groupIndex++;
      }
    } else {
      // 无法组成完整5人组，生成一个尽可能平衡的小组
      const members: Player[] = [];
      
      // 从每个位置取最强队员
      for (const pos of POSITIONS) {
        if (byPos[pos].length > 0) {
          members.push(byPos[pos].shift()!);
        }
      }
      
      if (members.length > 0) {
        // 尝试用第二位置填补缺失位置
        const initialBalance = checkPositionBalance(members);
        const missingPositions = initialBalance.missingPositions;
        
        // 内联 fillMissingPositions 逻辑
        if (missingPositions.length > 0) {
          for (const pos of missingPositions) {
            // 优先考虑接受位置调整的队员，且第二位置匹配
            const potentialPlayers = players.filter(p => 
              !members.some(m => m.user_id === p.user_id) &&
              (p.second_position === pos || (p.accept_position_adjustment && p.second_position))
            );
            
            if (potentialPlayers.length > 0) {
              // 按实力分排序，选择最强的
              potentialPlayers.sort((a: Player, b: Player) => b.score - a.score);
              const selected = potentialPlayers[0];
              // 标记队员的位置调整
              selected.original_position = selected.main_position;
              selected.main_position = pos;
              selected.position_adjusted = true;
              members.push(selected);
            } else {
              // 如果没有合适的队员，尝试从已有的队员中调整
              const flexiblePlayers = members.filter(m => 
                m.accept_position_adjustment && 
                !missingPositions.includes(m.main_position)
              );
              
              if (flexiblePlayers.length > 0) {
                // 选择实力较弱的队员进行位置调整
                flexiblePlayers.sort((a: Player, b: Player) => a.score - b.score);
                const selected = flexiblePlayers[0];
                // 标记该队员被调整了位置
                selected.original_position = selected.main_position;
                selected.main_position = pos;
                selected.position_adjusted = true;
              }
            }
          }
        }
        
        // 再次检查位置平衡
        const positionBalance = checkPositionBalance(members);
        const roleBalance = checkRoleBalance(members);
        const functionCoverage = checkFunctionCoverage(members);
        const overlapRate = calculateHeroOverlap(members);
        const avg = Math.round(members.reduce((s: number, m: Player) => s + m.score, 0) / members.length);
        
        // 为队员推荐英雄
        const membersWithRecommendations = recommendHeroes(members);
        
        const warnings = [];
        if (overlapRate > 25) {
          warnings.push(`英雄重叠度较高: ${overlapRate}%`);
        }
        if (positionBalance.repeatedPositions.length > 0) {
          warnings.push(`位置重复: ${positionBalance.repeatedPositions.join(', ')}`);
        }
        if (positionBalance.missingPositions.length > 0) {
          warnings.push(`缺少: ${positionBalance.missingPositions.join(', ')}`);
        }
        if (roleBalance.issues.length > 0) {
          warnings.push(...roleBalance.issues);
        }
        if (functionCoverage.issues.length > 0) {
          warnings.push(...functionCoverage.issues);
        }
        
        // 添加位置不足的警告
        if (members.length < 5) {
          warnings.push(`小组人数不足5人，当前只有${members.length}人`);
        }
        
        // 确定小组的建议上线时间（选择一个合理的默认时间）
        const suggestedTime = '每天 20:00';
        
        groups.push({
          id: 0,
          name: `A组 (${suggestedTime})`,
          members: membersWithRecommendations,
          average_score: avg,
          missing_positions: positionBalance.missingPositions,
          repeated_positions: positionBalance.repeatedPositions,
          hero_overlap_rate: overlapRate,
          function_coverage: functionCoverage,
          role_balance: roleBalance,
          warning: warnings.length > 0 ? warnings.join('\n') : null,
          suggested_time: suggestedTime
        });
      }
    }
    
    // 收集所有未分配的队员
    const allUnassigned = [...unassigned, ...players];
    
    // 从分组中移除已分配的队员
    for (const group of groups) {
      for (const member of group.members) {
        const index = allUnassigned.findIndex(p => p.user_id === member.user_id);
        if (index > -1) {
          allUnassigned.splice(index, 1);
        }
      }
    }
    
    // 确保队员唯一
    const uniqueUnassigned = [];
    const seenUserIds = new Set();
    
    for (const player of allUnassigned) {
      if (!seenUserIds.has(player.user_id)) {
        seenUserIds.add(player.user_id);
        uniqueUnassigned.push(player);
      }
    }
    
    // 为未分组的队员生成未分组原因
    const unassignedWithReasons = generateUnassignedReasons(uniqueUnassigned);
    
    // 确定全局 fallback_reason
    let fallbackReason = null;
    if (timeFallbackReason) {
      fallbackReason = timeFallbackReason === 'no_common_time' ? '未找到5人共同时间段' : '时间重叠不足';
    } else if (unassignedWithReasons.length > 0) {
      fallbackReason = '位置不足，请手动调整';
    }
    
    // 为回退到位置+实力分组的小组添加 time_fallback_reason
    if (timeFallbackReason) {
      groups.forEach(group => {
        if (!group.common_time) {
          group.time_fallback_reason = timeFallbackReason;
        }
      });
    }
    
    // 添加提示信息
    const tips = [];
    if (timeFallbackReason === 'no_common_time') {
      tips.push('对于没有共同时间的小组，默认使用"每天 20:00"作为建议上线时间');
    }
    
    const responseData = {
      success: true,
      groups,
      unassigned: unassignedWithReasons,
      total_players: players.length,
      time_fallback_reason: timeFallbackReason,
      fallback_reason: fallbackReason,
      tips
    };
    
    // 缓存结果
    cache[cacheKey] = {
      data: responseData,
      timestamp: Date.now()
    };
    
    console.log('缓存分组结果');
    
    return NextResponse.json(responseData);
  } catch (err: unknown) {
    console.error('分组API错误:', err);
    
    // 提供更详细的错误信息
    let errorMessage = '分组过程中发生错误';
    let errorDetails = '';
    
    if (err instanceof Error) {
      errorMessage = err.message;
      errorDetails = err.stack || '';
    }
    
    // 检查是否是数据库连接错误
    if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = '无法连接到数据库，请检查网络连接';
    }
    
    // 检查是否是权限错误
    if (errorMessage.includes('permission denied') || errorMessage.includes('Unauthorized')) {
      errorMessage = '权限不足，请重新登录';
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: 500 });
  }
}