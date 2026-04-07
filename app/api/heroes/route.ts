import { NextResponse } from 'next/server'

// 用户提供的英雄数据
const heroData = {
  战士: [
    '扁鹊', '曹操', '嫦娥', '达摩', '大司命', '典韦', '蚩奼', '宫本武藏', '关羽', '海诺', 
    '花木兰', '姬小满', '橘右京', '铠', '狂铁', '澜', '老夫子', '李信', '刘备', '吕布', 
    '马超', '芈月', '墨子', '哪吒', '盘古', '司空震', '孙策', '夏侯惇', '夏洛特', '项羽', 
    '雅典娜', '亚连', '亚瑟', '杨戬', '曜', '元流之子', '云缨', '赵怀真', '赵云', '钟无艳', '周瑜'
  ],
  刺客: [
    '阿轲', '百里守约', '百里玄策', '不知火舞', '蚩奼', '暃', '宫本武藏', '韩信', '镜', '橘右京', 
    '兰陵王', '澜', '李白', '露娜', '娜可露露', '裴擒虎', '司马懿', '孙悟空', '雅典娜', '曜', 
    '元歌', '元流之子', '云缨', '云中君', '赵云'
  ],
  法师: [
    '安琪拉', '扁鹊', '不知火舞', '蔡文姬', '嫦娥', '妲己', '大乔', '貂蝉', '东皇太一', '朵莉亚', 
    '干将莫邪', '高渐离', '鬼谷子', '海诺', '海月', '姜子牙', '金蝉', '刘邦', '露娜', '梦奇', 
    '米莱狄', '明世隐', '芈月', '墨子', '女娲', '桑启', '上官婉儿', '沈梦溪', '司空震', '王昭君', 
    '西施', '小乔', '杨玉环', '弈星', '嬴政', '张良', '甄姬', '周瑜', '诸葛亮', '元流之子'
  ],
  射手: [
    '艾琳', '敖隐', '百里守约', '蚩奼', '成吉思汗', '狄仁杰', '公孙离', '戈娅', '后羿', '黄忠', 
    '伽罗', '李元芳', '刘备', '鲁班七号', '马可波罗', '蒙犽', '孙尚香', '虞姬', '元流之子'
  ],
  辅助: [
    '蔡文姬', '大乔', '大禹', '朵莉亚', '鬼谷子', '金蝉', '鲁班大师', '明世隐', '牛魔', '少司缘', 
    '太乙真人', '孙膑', '瑶', '张飞', '庄周', '元流之子'
  ],
  坦克: [
    '阿古朵', '白起', '蚩奼', '程咬金', '达摩', '大禹', '盾山', '关羽', '铠', '狂铁', 
    '廉颇', '刘邦', '刘禅', '鲁班大师', '吕布', '梦奇', '蒙恬', '牛魔', '苏烈', '孙策', 
    '太乙真人', '夏侯惇', '项羽', '亚连', '亚瑟', '张飞', '钟馗', '钟无艳', '猪八戒', '庄周', '元流之子'
  ]
};

// 位置映射（按照王者荣耀选英雄机制）
const positionMapping: Record<string, string[]> = {
  '上单': ['战士', '坦克'],
  '打野': ['刺客', '战士'],
  '中单': ['法师'],
  '射手': ['射手'],
  '辅助': ['辅助', '坦克']
};

// 生成英雄ID和头像URL
function generateHeroData() {
  let id = 1;
  const heroes: Array<{ id: number; name: string; position: string; avatar: string; types: string[] }> = [];
  
  // 位置优先级（越高越优先）
  const positionPriority: Record<string, number> = {
    '中单': 5,
    '射手': 4,
    '打野': 3,
    '上单': 2,
    '辅助': 1
  };
  
  // 为每个类型的英雄生成数据
  Object.entries(heroData).forEach(([type, heroNames]) => {
    heroNames.forEach(name => {
      // 为每个英雄生成唯一ID
      const heroId = id++;
      // 生成头像URL（使用统一格式）
      const avatar = `https://pvp.qq.com/web201605/img/hero/default/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.jpg`;
      
      // 查找英雄已存在的记录
      const existingHero = heroes.find(h => h.name === name);
      if (existingHero) {
        // 如果英雄已存在，添加类型
        existingHero.types.push(type);
        // 重新确定位置，选择优先级更高的位置
        let bestPosition = existingHero.position;
        let bestPriority = positionPriority[existingHero.position] || 0;
        
        // 检查新类型对应的位置
        for (const [pos, types] of Object.entries(positionMapping)) {
          if (types.includes(type)) {
            const currentPriority = positionPriority[pos] || 0;
            if (currentPriority > bestPriority) {
              bestPosition = pos;
              bestPriority = currentPriority;
            }
          }
        }
        
        // 更新位置
        existingHero.position = bestPosition;
      } else {
        // 确定英雄的位置，选择优先级最高的位置
        let bestPosition = '其他';
        let bestPriority = 0;
        
        for (const [pos, types] of Object.entries(positionMapping)) {
          if (types.includes(type)) {
            const currentPriority = positionPriority[pos] || 0;
            if (currentPriority > bestPriority) {
              bestPosition = pos;
              bestPriority = currentPriority;
            }
          }
        }
        
        // 创建新英雄
        heroes.push({
          id: heroId,
          name,
          position: bestPosition,
          avatar,
          types: [type]
        });
      }
    });
  });
  
  return heroes;
}

export async function GET() {
  try {
    // 生成英雄数据
    const heroes = generateHeroData();
    
    // 按位置分组并确保各位置都有英雄
    const heroesByPosition = heroes.reduce((acc: Record<string, typeof heroes>, hero) => {
      if (!acc[hero.position]) {
        acc[hero.position] = [];
      }
      acc[hero.position].push(hero);
      return acc;
    }, {});
    
    // 确保所有位置都有英雄
    const requiredPositions = ['上单', '打野', '中单', '射手', '辅助'];
    requiredPositions.forEach(pos => {
      if (!heroesByPosition[pos] || heroesByPosition[pos].length === 0) {
        // 如果某个位置没有英雄，添加一些默认英雄
        const defaultHeroes: typeof heroes = [];
        switch (pos) {
          case '上单':
            defaultHeroes.push({ id: 1, name: '关羽', position: '上单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/guanyu.jpg', types: ['战士'] });
            break;
          case '打野':
            defaultHeroes.push({ id: 2, name: '李白', position: '打野', avatar: 'https://pvp.qq.com/web201605/img/hero/default/libai.jpg', types: ['刺客'] });
            break;
          case '中单':
            defaultHeroes.push({ id: 3, name: '诸葛亮', position: '中单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/zhugeliang.jpg', types: ['法师'] });
            break;
          case '射手':
            defaultHeroes.push({ id: 4, name: '马可波罗', position: '射手', avatar: 'https://pvp.qq.com/web201605/img/hero/default/makeboluo.jpg', types: ['射手'] });
            break;
          case '辅助':
            defaultHeroes.push({ id: 5, name: '盾山', position: '辅助', avatar: 'https://pvp.qq.com/web201605/img/hero/default/dunshan.jpg', types: ['坦克'] });
            break;
        }
        heroesByPosition[pos] = defaultHeroes;
      }
    });
    
    // 合并所有英雄
    const allHeroes = Object.values(heroesByPosition).flat();
    
    return NextResponse.json(allHeroes);
  } catch (error) {
    console.error('获取英雄列表失败:', error);
    
    // 失败时返回模拟数据
    const mockHeroes = [
      // 上单
      { id: 1, name: '关羽', position: '上单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/guanyu.jpg', types: ['战士'] },
      { id: 2, name: '吕布', position: '上单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/lvbu.jpg', types: ['战士'] },
      { id: 3, name: '花木兰', position: '上单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/hualamulan.jpg', types: ['战士'] },
      
      // 打野
      { id: 4, name: '李白', position: '打野', avatar: 'https://pvp.qq.com/web201605/img/hero/default/libai.jpg', types: ['刺客'] },
      { id: 5, name: '韩信', position: '打野', avatar: 'https://pvp.qq.com/web201605/img/hero/default/hanxin.jpg', types: ['刺客'] },
      { id: 6, name: '澜', position: '打野', avatar: 'https://pvp.qq.com/web201605/img/hero/default/lan.jpg', types: ['刺客'] },
      
      // 中单
      { id: 7, name: '诸葛亮', position: '中单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/zhugeliang.jpg', types: ['法师'] },
      { id: 8, name: '貂蝉', position: '中单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/diaochan.jpg', types: ['法师'] },
      { id: 9, name: '不知火舞', position: '中单', avatar: 'https://pvp.qq.com/web201605/img/hero/default/huowu.jpg', types: ['法师'] },
      
      // 射手
      { id: 10, name: '马可波罗', position: '射手', avatar: 'https://pvp.qq.com/web201605/img/hero/default/makeboluo.jpg', types: ['射手'] },
      { id: 11, name: '孙尚香', position: '射手', avatar: 'https://pvp.qq.com/web201605/img/hero/default/sunshangxiang.jpg', types: ['射手'] },
      { id: 12, name: '公孙离', position: '射手', avatar: 'https://pvp.qq.com/web201605/img/hero/default/gongsunli.jpg', types: ['射手'] },
      
      // 辅助
      { id: 13, name: '盾山', position: '辅助', avatar: 'https://pvp.qq.com/web201605/img/hero/default/dunshan.jpg', types: ['坦克'] },
      { id: 14, name: '蔡文姬', position: '辅助', avatar: 'https://pvp.qq.com/web201605/img/hero/default/caiwenji.jpg', types: ['辅助'] },
      { id: 15, name: '东皇太一', position: '辅助', avatar: 'https://pvp.qq.com/web201605/img/hero/default/donghuang.jpg', types: ['法师'] }
    ];
    
    return NextResponse.json(mockHeroes);
  }
}
