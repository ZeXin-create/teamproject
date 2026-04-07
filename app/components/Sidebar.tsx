'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { teamMenuConfig, profileMenuConfig, MenuSection } from '../config/menuConfig'

interface SidebarProps {
  type: 'team' | 'profile'
  teamId?: string
  userRole?: string
}

const Sidebar: React.FC<SidebarProps> = ({ type, teamId, userRole }) => {
  const pathname = usePathname()

  // 检查当前路径是否匹配
  const isActive = (href: string) => pathname.includes(href)

  // 处理战队菜单的teamId占位符
  const getMenuItems = (): MenuSection[] => {
    if (type === 'team') {
      return teamMenuConfig.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          href: item.href.replace('{teamId}', teamId || '')
        }))
      }))
    }
    return profileMenuConfig
  }

  const menuItems = getMenuItems()

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
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(item.href)
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