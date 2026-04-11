// 战队管理后台菜单配置
import { Home, User, Settings, ClipboardList, Megaphone, BarChart3, BarChart, Info, MessageSquare, Target, Calendar, Trophy } from 'lucide-react'

export interface MenuItem {
  label: string
  href: string
  icon: React.ReactNode
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
      { label: '战队概览', href: '/teams/space', icon: <Home size={20} />, requirePermission: false, isCore: true },
      { label: '个人游戏资料', href: '/teams/{teamId}/profile', icon: <User size={20} />, requirePermission: false, isCore: true },
    ]
  },
  {
    title: '战队管理',
    items: [
      { label: '成员管理', href: '/teams/manage', icon: <Settings size={20} />, requirePermission: ['captain', 'vice_captain', 'leader', 'group_leader'], isCore: true },
      { label: '入队申请', href: '/teams/applications', icon: <ClipboardList size={20} />, requirePermission: ['captain', 'vice_captain'], isCore: true },
      { label: '招募管理', href: '/teams/recruitment-management', icon: <Megaphone size={20} />, requirePermission: ['captain', 'vice_captain'], isCore: true },
    ]
  },
  {
    title: '数据中心',
    items: [
      { label: '比赛记录', href: '/teams/data/match-records', icon: <BarChart3 size={20} />, requirePermission: ['captain', 'vice_captain', 'leader', 'group_leader'], isCore: true },
      { label: '数据统计', href: '/teams/data/analytics', icon: <BarChart size={20} />, requirePermission: ['captain', 'vice_captain', 'leader'], isCore: false },
      { label: '战队信息', href: '/teams/data/team-info', icon: <Info size={20} />, requirePermission: ['captain', 'vice_captain'], isCore: false },
    ]
  },
  {
    title: '智能功能',
    items: [
      { label: '智能助手', href: '/teams/ai-chat', icon: <MessageSquare size={20} />, requirePermission: false, isCore: true },
      { label: '智能分组', href: '/group', icon: <Target size={20} />, requirePermission: ['captain', 'vice_captain', 'leader', 'group_leader'], isCore: true },
    ]
  },
  {
    title: '活动管理',
    items: [
      { label: '训练计划', href: '/teams/data/training-plans', icon: <Calendar size={20} />, requirePermission: ['captain', 'vice_captain', 'leader'], isCore: false },
      { label: '赛事中心', href: '/tournaments', icon: <Trophy size={20} />, requirePermission: false, isCore: false },
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
        icon: <User size={20} />,
        requirePermission: false,
        isCore: true
      },
      {
        label: '好友管理',
        href: `/friends`,
        icon: <User size={20} />,
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
        icon: <MessageSquare size={20} />,
        requirePermission: false,
        isCore: false
      }
    ]
  }
]
