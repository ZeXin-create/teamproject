'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  type: 'team' | 'profile'
  teamId?: string
  userRole?: string
}

const Sidebar: React.FC<SidebarProps> = ({ type, teamId, userRole }) => {
  const pathname = usePathname()

  // 检查当前路径是否匹配
  const isActive = (href: string) => pathname.includes(href)

  // 战队空间侧边栏菜单
  const teamMenuItems = [
    {
      title: '基础信息',
      items: [
        {
          label: '战队概览',
          href: `/teams/space`,
          icon: '🏠',
          requirePermission: false
        },
        {
          label: '个人游戏资料',
          href: `/teams/${teamId}/profile`,
          icon: '🎮',
          requirePermission: false
        }
      ]
    },
    {
      title: '管理功能',
      items: [
        {
          label: '比赛记录',
          href: `/teams/data/match-records`,
          icon: '📊',
          requirePermission: ['队长', '副队长', '领队', '组长']
        },
        {
          label: '训练安排',
          href: `/teams/data/training-plans`,
          icon: '🏋️',
          requirePermission: ['队长', '副队长', '领队']
        },
        {
          label: '战队信息',
          href: `/teams/data/team-info`,
          icon: 'ℹ️',
          requirePermission: ['队长', '副队长']
        },
        {
          label: '数据可视化',
          href: `/teams/data/analytics`,
          icon: '📈',
          requirePermission: ['队长', '副队长', '领队']
        },
        {
          label: '管理战队',
          href: `/teams/manage`,
          icon: '⚙️',
          requirePermission: ['队长', '副队长', '领队', '组长']
        },
        {
          label: '申请管理',
          href: `/teams/applications`,
          icon: '📋',
          requirePermission: ['队长', '副队长']
        },
        {
          label: '招募队员',
          href: `/teams/recruit`,
          icon: '👥',
          requirePermission: ['队长']
        }
      ]
    },
    {
      title: '智能功能',
      items: [
        {
          label: '智能助手',
          href: `/teams/ai-chat`,
          icon: '🤖',
          requirePermission: false
        },
        {
          label: '自动分组',
          href: `/teams/${teamId}/grouping`,
          icon: '🎯',
          requirePermission: false
        }
      ]
    }
  ]

  // 个人中心侧边栏菜单
  const profileMenuItems = [
    {
      title: '个人信息',
      items: [
        {
          label: '个人资料',
          href: `/profile`,
          icon: '👤',
          requirePermission: false
        },
        {
          label: '我的好友',
          href: `/friends`,
          icon: '🤝',
          requirePermission: false
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
          requirePermission: false
        }
      ]
    }
  ]

  const menuItems = type === 'team' ? teamMenuItems : profileMenuItems

  // 检查是否有权限访问
  const hasPermission = (requirePermission: boolean | string[]) => {
    if (!requirePermission) return true
    if (Array.isArray(requirePermission)) {
      return requirePermission.includes(userRole || '')
    }
    return true
  }

  return (
    <div className="w-64 glass sticky top-24 h-[calc(100vh-6rem)] p-4 overflow-y-auto">
      <nav>
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.items
                .filter(item => hasPermission(item.requirePermission))
                .map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-pink-100 text-pink-600 font-medium'
                          : 'text-gray-700 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}

export default Sidebar