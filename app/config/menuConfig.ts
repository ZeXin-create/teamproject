// 战队管理后台菜单配置
export interface MenuItem {
  label: string
  href: string
  icon: string
  requirePermission: boolean | string[]
  isCore?: boolean // 是否为核心功能
}

export interface MenuSection {
  title: string
  items: MenuItem[]
}

export const teamMenuConfig: MenuSection[] = [
  {
    title: '基础信息',
    items: [
      { label: '战队概览', href: '/teams/space', icon: '🏠', requirePermission: false, isCore: true },
      { label: '个人游戏资料', href: '/teams/{teamId}/profile', icon: '🎮', requirePermission: false, isCore: true },
    ]
  },
  {
    title: '人员管理',
    items: [
      { label: '成员管理', href: '/teams/manage', icon: '⚙️', requirePermission: ['队长', '副队长', '领队', '组长'], isCore: true },
      { label: '入队申请', href: '/teams/applications', icon: '📋', requirePermission: ['队长', '副队长'], isCore: true },
      { label: '招募管理', href: '/teams/recruitment-management', icon: '📢', requirePermission: ['队长', '副队长'], isCore: true },
    ]
  },
  {
    title: '数据中心',
    items: [
      { label: '比赛记录', href: '/teams/data/match-records', icon: '📊', requirePermission: ['队长', '副队长', '领队', '组长'], isCore: true },
      { label: '数据可视化', href: '/teams/data/analytics', icon: '📈', requirePermission: ['队长', '副队长', '领队'], isCore: false },
      { label: '战队信息', href: '/teams/data/team-info', icon: 'ℹ️', requirePermission: ['队长', '副队长'], isCore: false },
    ]
  },
  {
    title: '智能功能',
    items: [
      { label: '智能助手', href: '/teams/ai-chat', icon: '🤖', requirePermission: false, isCore: true },
      { label: '智能分组', href: '/group', icon: '🎯', requirePermission: ['队长', '副队长', '领队', '组长'], isCore: true },
    ]
  },
  {
    title: '活动管理',
    items: [
      { label: '训练计划', href: '/teams/data/training-plans', icon: '📅', requirePermission: ['队长', '副队长', '领队'], isCore: false },
      { label: '赛事管理', href: '/tournaments', icon: '🏆', requirePermission: false, isCore: false },
    ]
  }
];

// 个人中心侧边栏菜单
export const profileMenuConfig: MenuSection[] = [
  {
    title: '个人信息',
    items: [
      {
        label: '个人资料',
        href: `/profile`,
        icon: '👤',
        requirePermission: false,
        isCore: true
      },
      {
        label: '我的好友',
        href: `/friends`,
        icon: '🤝',
        requirePermission: false,
        isCore: true
      }
    ]
  },
  {
    title: '社区互动',
    items: [
      {
        label: '我的帖子',
        href: `/forum?filter=my`,
        icon: '📝',
        requirePermission: false,
        isCore: false
      }
    ]
  }
]
