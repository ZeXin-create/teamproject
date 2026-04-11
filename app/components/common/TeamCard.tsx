import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TeamCardProps {
  id: string;
  name: string;
  avatar_url?: string;
  declaration?: string;
  memberCount?: number;
  winRate?: string;
  className?: string;
}

export default function TeamCard({ 
  id, 
  name, 
  avatar_url, 
  declaration, 
  memberCount, 
  winRate, 
  className = '' 
}: TeamCardProps) {
  return (
    <Link href={`/teams/${id}/profile`} className={`card p-4 hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex items-start gap-4">
        {/* 战队头像 */}
        <div className="flex-shrink-0 relative">
          {avatar_url ? (
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/50">
              <Image
                src={avatar_url}
                alt={name}
                width={64}
                height={64}
                className="object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* 战队信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{name}</h3>
          {declaration && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {declaration}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {memberCount !== undefined && (
              <span className="flex items-center gap-1">
                <span>👥</span> {memberCount} 成员
              </span>
            )}
            {winRate && (
              <span className="flex items-center gap-1">
                <span>🏆</span> {winRate} 胜率
              </span>
            )}
          </div>
        </div>

        {/* 箭头 */}
        <div className="flex-shrink-0 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
