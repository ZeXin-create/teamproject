// 用户等级计算工具函数

// 等级经验值对照表
const LEVEL_EXPERIENCE = [
  0,      // 1级
  100,    // 2级
  300,    // 3级
  600,    // 4级
  1000,   // 5级
  1500,   // 6级
  2100,   // 7级
  2800,   // 8级
  3600,   // 9级
  4500,   // 10级
  5500,   // 11级
  6600,   // 12级
  7800,   // 13级
  9100,   // 14级
  10500,  // 15级
  12000,  // 16级
  13600,  // 17级
  15300,  // 18级
  17100,  // 19级
  19000,  // 20级
  21000,  // 21级
  23100,  // 22级
  25300,  // 23级
  27600,  // 24级
  30000,  // 25级
  32500,  // 26级
  35100,  // 27级
  37800,  // 28级
  40600,  // 29级
  43500   // 30级
];

// 活动类型对应的经验值和分数
const ACTIVITY_POINTS = {
  login: { experience: 10, activity: 5, contribution: 0 },
  recruit: { experience: 50, activity: 20, contribution: 10 },
  application: { experience: 30, activity: 15, contribution: 5 },
  battle: { experience: 20, activity: 10, contribution: 15 },
  forum_post: { experience: 25, activity: 12, contribution: 8 },
  forum_reply: { experience: 15, activity: 8, contribution: 5 }
};

// 计算用户等级
export function calculateLevel(experience: number): number {
  for (let i = LEVEL_EXPERIENCE.length - 1; i >= 0; i--) {
    if (experience >= LEVEL_EXPERIENCE[i]) {
      return i + 1;
    }
  }
  return 1;
}

// 计算下一等级所需经验
export function getNextLevelExperience(currentLevel: number, currentExperience: number): number {
  if (currentLevel >= LEVEL_EXPERIENCE.length) {
    return 0; // 已达到最高等级
  }
  return LEVEL_EXPERIENCE[currentLevel] - currentExperience;
}

// 计算等级进度百分比
export function getLevelProgress(currentLevel: number, currentExperience: number): number {
  if (currentLevel >= LEVEL_EXPERIENCE.length) {
    return 100; // 已达到最高等级
  }
  
  const currentLevelExp = currentLevel > 1 ? LEVEL_EXPERIENCE[currentLevel - 2] : 0;
  const nextLevelExp = LEVEL_EXPERIENCE[currentLevel - 1];
  const levelRange = nextLevelExp - currentLevelExp;
  const currentLevelProgress = currentExperience - currentLevelExp;
  
  if (levelRange <= 0) {
    return 100;
  }
  
  return Math.min(100, Math.round((currentLevelProgress / levelRange) * 100));
}

// 获取活动类型对应的分数
export function getActivityPoints(activityType: string) {
  return ACTIVITY_POINTS[activityType as keyof typeof ACTIVITY_POINTS] || {
    experience: 0,
    activity: 0,
    contribution: 0
  };
}

// 获取等级称号
export function getLevelTitle(level: number): string {
  const titles = [
    '新兵', '列兵', '下士', '中士', '上士',
    '少尉', '中尉', '上尉', '少校', '中校',
    '上校', '少将', '中将', '上将', '元帅',
    '传奇', '神话', '传说', '不朽', '永恒',
    '创世', '混沌', '秩序', '宇宙', '星际',
    '维度', '超越', '无限', '终极', '至高'
  ];
  
  return titles[Math.min(level - 1, titles.length - 1)] || '至高';
}

// 获取等级颜色
export function getLevelColor(level: number): string {
  if (level <= 5) return 'text-gray-600';
  if (level <= 10) return 'text-green-600';
  if (level <= 15) return 'text-blue-600';
  if (level <= 20) return 'text-purple-600';
  if (level <= 25) return 'text-pink-600';
  return 'text-red-600';
}
