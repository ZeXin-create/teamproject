import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
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

// 计算实力分
function calculateStrength(positionStats: Record<string, number>, currentRank: string) {
  if (!positionStats) {
    // 回退到段位映射
    return getRankScore(currentRank);
  }
  
  const winRate = positionStats.win_rate || 0;
  const kda = positionStats.kda || 0;
  const rating = positionStats.rating || 0;
  const power = positionStats.power || 0;
  
  // 检查是否所有值都为0，如果是则回退到段位映射
  if (winRate === 0 && kda === 0 && rating === 0 && power === 0) {
    return getRankScore(currentRank);
  }
  
  // 实力分计算公式：胜率/100 * 0.35 + (KDA/20) * 0.35 + 评分/100 * 0.15 + 战力/10000 * 0.15
  const score = (winRate / 100 * 0.35) + (kda / 20 * 0.35) + (rating / 100 * 0.15) + (power / 10000 * 0.15);
  const calculatedScore = Math.max(0, Math.min(100, Math.round(score * 100)));
  
  // 如果计算结果为0，回退到段位映射
  return calculatedScore > 0 ? calculatedScore : getRankScore(currentRank);
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
      // 获取已锁定的队员（在 active 批次中的队员）
      const { data: activeBatches } = await supabase
        .from('group_batches')
        .select('id')
        .eq('team_id', team_id)
        .eq('status', 'active');
      
      if (activeBatches && activeBatches.length > 0) {
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
      const { data: profiles, error } = await supabase.from('player_profiles').select('*').eq('team_id', team_id);
      if (error) {
        console.error('获取队员数据失败:', error);
        // 提供友好的错误信息
        return NextResponse.json({ error: '获取队员数据失败，请稍后重试' }, { status: 500 });
      }
      
      console.log('获取到的队员数量:', profiles?.length || 0);
      
      if (!profiles || profiles.length === 0) {
        console.log('未找到队员数据');
        return NextResponse.json({
          success: true,
          groups: [],
          unassigned: [],
          total_players: 0,
          fallback_reason: '未找到队员数据',
          tips: []
        });
      }
      
      for (const p of profiles) {
        // 排除已锁定的队员
        if (lockedUserIds.has(p.user_id)) {
          console.log('排除已锁定的队员:', p.user_id, p.game_id);
          continue;
        }
        
        const pos = POSITION_MAP[p.main_positions?.[0] || ''] || p.main_positions?.[0] || '';
        if (!POSITIONS.includes(pos)) {
          console.log('排除位置无效的队员:', p.user_id, p.game_id, '位置:', pos);
          unassigned.push({
            user_id: p.user_id, 
            game_id: p.game_id || '未设置', 
            main_position: pos,
            second_position: p.main_positions?.[1] ? (POSITION_MAP[p.main_positions[1]] || p.main_positions[1]) : null,
            accept_position_adjustment: p.accept_position_adjustment || false,
            available_time: p.available_time || [],
            heroes: p.heroes || [],
            score: calculateStrength(p.position_stats, p.current_rank),
            unassigned_reason: '位置无效'
          });
          continue;
        }
        
        // 从 position_stats 计算实力分
        const score = calculateStrength(p.position_stats, p.current_rank);
        
        const player = {
          user_id: p.user_id, 
          game_id: p.game_id || '未设置', 
          main_position: pos,
          second_position: p.main_positions?.[1] ? (POSITION_MAP[p.main_positions[1]] || p.main_positions[1]) : null,
          accept_position_adjustment: p.accept_position_adjustment || false,
          available_time: p.available_time || [],
          heroes: p.heroes || [], // 确保 heroes 属性存在
          score 
        };
        
        // 分离有可用时间和无可用时间的队员
        if (player.available_time && player.available_time.length > 0) {
          players.push(player);
        } else {
          unassigned.push({
            ...player,
            unassigned_reason: '无可用时间'
          });
        }
      }
      
      console.log('处理完成，有效队员数量:', players.length, '未分配队员数量:', unassigned.length);
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
      
      // 将时间段转换为数组并排序
      const sortedTimeSlots = Object.values(timeSlots).sort((a, b) => {
        // 按出现次数降序
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        // 次数相同按持续时间升序
        const durationA = calculateDuration(a.start_time, a.end_time);
        const durationB = calculateDuration(b.start_time, b.end_time);
        return durationA - durationB;
      });
      
      // 标记已分组的队员
      const groupedUserIds = new Set<string>();
      
      // 遍历时间段，创建小组
      for (const timeSlot of sortedTimeSlots) {
        // 过滤出未分组的队员
        const availablePlayers = timeSlot.players.filter(p => !groupedUserIds.has(p.user_id));
        
        if (availablePlayers.length >= 5) {
          // 按位置分类并排序
          const byPos: Record<string, Player[]> = {};
          for (const pos of POSITIONS) byPos[pos] = [];
          for (const p of availablePlayers) {
            // 确保只将队员添加到有效的位置类别中
            if (POSITIONS.includes(p.main_position)) {
              byPos[p.main_position].push(p);
            }
          }
          for (const pos of POSITIONS) byPos[pos].sort((a, b) => b.score - a.score);
          
          // 尝试组成完整的5人组，每个位置一个人
          const members: Player[] = [];
          const selectedUserIds = new Set<string>();
          
          // 优先选择只会单一位置的队员，让会多个位置的队员留作补位
          for (const pos of POSITIONS) {
            if (byPos[pos].length > 0) {
              // 优先选择没有第二位置的队员，或第二位置不有效的队员
              const singlePositionPlayers = byPos[pos].filter(p => !p.second_position || !POSITIONS.includes(p.second_position));
              
              if (singlePositionPlayers.length > 0) {
                // 选择最强的单一位置队员
                singlePositionPlayers.sort((a, b) => b.score - a.score);
                const player = singlePositionPlayers[0];
                members.push(player);
                selectedUserIds.add(player.user_id);
              } else {
                // 如果没有单一位置队员，选择最强的队员
                byPos[pos].sort((a, b) => b.score - a.score);
                const player = byPos[pos][0];
                members.push(player);
                selectedUserIds.add(player.user_id);
              }
            }
          }
          
          // 检查是否组成了完整的5人组
          if (members.length < 5) {
            // 尝试用有第二位置的队员补位
            const missingPositions = POSITIONS.filter(pos => !members.some(m => m.main_position === pos));
            
            for (const pos of missingPositions) {
              // 寻找有第二位置且未被选中的队员
              const potentialPlayers = availablePlayers.filter(p => 
                !selectedUserIds.has(p.user_id) && 
                (p.second_position === pos || (p.accept_position_adjustment && p.second_position))
              );
              
              if (potentialPlayers.length > 0) {
                // 按实力分排序，选择最强的
                potentialPlayers.sort((a, b) => b.score - a.score);
                const selected = potentialPlayers[0];
                // 标记队员的位置调整
                selected.original_position = selected.main_position;
                selected.main_position = pos;
                selected.position_adjusted = true;
                members.push(selected);
                selectedUserIds.add(selected.user_id);
              }
            }
          }
          
          // 检查是否组成了完整的5人组
          if (members.length === 5) {
            const avg = Math.round(members.reduce((s, m) => s + m.score, 0) / members.length);
            const overlapRate = calculateHeroOverlap(members);
            const positionBalance = checkPositionBalance(members);
            const roleBalance = checkRoleBalance(members);
            const functionCoverage = checkFunctionCoverage(members);
            
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
            missing_positions: positionBalance.missingPositions,
            repeated_positions: positionBalance.repeatedPositions,
            hero_overlap_rate: overlapRate,
            function_coverage: functionCoverage,
            role_balance: roleBalance,
            warning: warnings.length > 0 ? warnings.join('\n') : null,
            common_time: `${timeSlot.day} ${timeSlot.start_time}-${timeSlot.end_time}`,
            suggested_time: suggestedTime
          });
          }
        }
      }
      
      // 尝试处理部分重叠的时间段
      if (groups.length === 0 && players.length >= 5) {
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
          if (dayPlayers.length >= 5) {
            // 按位置分类并排序
            const byPos: Record<string, Player[]> = {};
            for (const pos of POSITIONS) byPos[pos] = [];
            for (const p of dayPlayers) {
              if (POSITIONS.includes(p.main_position)) {
                byPos[p.main_position].push(p);
              }
            }
            for (const pos of POSITIONS) byPos[pos].sort((a, b) => b.score - a.score);
            
            // 尝试组成完整的5人组
            const members: Player[] = [];
            for (const pos of POSITIONS) {
              if (byPos[pos].length > 0) {
                const player = byPos[pos][0];
                members.push(player);
              }
            }
            
            if (members.length === 5) {
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
    
    // 处理位置重复和缺失的情况
    const checkPositionBalance = (members: Player[]) => {
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
    const checkRoleBalance = (members: Player[]) => {
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
    const checkFunctionCoverage = (members: Player[]) => {
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
    
    // 为队员推荐英雄
    const recommendHeroes = (members: Player[]) => {
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
    
    // 计算英雄重复率
    const calculateHeroOverlap = (members: Player[]) => {
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
    
    // 尝试用第二位置填补缺失位置
    const fillMissingPositions = (members: Player[], missingPositions: string[]) => {
      if (missingPositions.length === 0) return members;
      
      // 从剩余队员中寻找可以填补缺失位置的队员
      for (const pos of missingPositions) {
        // 优先考虑接受位置调整的队员，且第二位置匹配
        const potentialPlayers = players.filter(p => 
          !members.some(m => m.user_id === p.user_id) &&
          (p.second_position === pos || (p.accept_position_adjustment && p.second_position))
        );
        
        if (potentialPlayers.length > 0) {
          // 按实力分排序，选择最强的
          potentialPlayers.sort((a, b) => b.score - a.score);
          const selected = potentialPlayers[0];
          // 标记队员的位置调整
          selected.original_position = selected.main_position;
          selected.main_position = pos;
          selected.position_adjusted = true;
          members.push(selected);
          // 从原数组中移除
          const index = players.findIndex(p => p.user_id === selected.user_id);
          if (index > -1) players.splice(index, 1);
          // 从位置分类中移除
          const posIndex = byPos[selected.original_position].findIndex(p => p.user_id === selected.user_id);
          if (posIndex > -1) byPos[selected.original_position].splice(posIndex, 1);
        } else {
          // 如果没有合适的队员，尝试从已有的队员中调整
          const flexiblePlayers = members.filter(m => 
            m.accept_position_adjustment && 
            !missingPositions.includes(m.main_position)
          );
          
          if (flexiblePlayers.length > 0) {
            // 选择实力较弱的队员进行位置调整
            flexiblePlayers.sort((a, b) => a.score - b.score);
            const selected = flexiblePlayers[0];
            // 标记该队员被调整了位置
            selected.original_position = selected.main_position;
            selected.main_position = pos;
            selected.position_adjusted = true;
          }
        }
      }
      
      return members;
    }
    
    // 为未分组的队员生成未分组原因
    const generateUnassignedReasons = (unassignedPlayers: Player[]) => {
      return unassignedPlayers.map(player => {
        // 检查是否有可用时间
        const hasAvailableTime = player.available_time && player.available_time.length > 0;
        
        // 检查位置是否有效
        const hasValidPosition = POSITIONS.includes(player.main_position);
        
        // 生成未分组原因
        const reasons = [];
        if (!hasAvailableTime) {
          reasons.push('无可用时间');
        }
        if (!hasValidPosition) {
          reasons.push('位置无效');
        }
        
        // 检查是否因为位置冲突未被分组
        const positionConflict = groups.some(group => {
          return group.members.some(member => member.main_position === player.main_position);
        });
        
        if (positionConflict) {
          reasons.push('位置冲突，该位置已有队员');
        }
        
        return {
          ...player,
          unassigned_reason: reasons.length > 0 ? reasons.join('; ') : '暂无合适的分组'
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
        const filledMembers = fillMissingPositions(members, initialBalance.missingPositions);
        
        // 再次检查位置平衡
        const positionBalance = checkPositionBalance(filledMembers);
        const roleBalance = checkRoleBalance(filledMembers);
        const functionCoverage = checkFunctionCoverage(filledMembers);
        const overlapRate = calculateHeroOverlap(filledMembers);
        const avg = Math.round(filledMembers.reduce((s, m) => s + m.score, 0) / filledMembers.length);
        
        // 为队员推荐英雄
        const membersWithRecommendations = recommendHeroes(filledMembers);
        
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
        if (filledMembers.length < 5) {
          warnings.push(`小组人数不足5人，当前只有${filledMembers.length}人`);
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
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '分组过程中发生错误' }, { status: 500 });
  }
}