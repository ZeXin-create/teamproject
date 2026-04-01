'use client'

import React from 'react'

interface FixItem {
  id: string
  title: string
  description: string
  status: 'fixed' | 'pending'
}

interface VersionInfoProps {
  version: string
  fixes: FixItem[]
}

const VersionInfo: React.FC<VersionInfoProps> = ({ version, fixes }) => {
  return (
    <div className="bg-gray-50 border-t border-gray-200 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">版本：</span>{version}
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">
              <span className="font-medium">修复信息：</span>
              <div className="mt-1 space-y-1">
                {fixes.map(fix => (
                  <div key={fix.id} className="text-xs text-gray-500">
                    • {fix.title} - {fix.description}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VersionInfo