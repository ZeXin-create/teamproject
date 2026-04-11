import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NotificationBell from '../NotificationBell';

interface User {
  id: string;
  email: string;
}

interface NavLinksProps {
  user: User | null;
  userProfile: {
    nickname: string;
    avatar: string;
  };
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
}

export default function NavLinks({ 
  user, 
  userProfile, 
  showUserMenu, 
  setShowUserMenu 
}: NavLinksProps) {
  return (
    <div className="hidden md:flex items-center gap-6">
      <Link
        href="/"
        className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
      >
        🏠 主页
      </Link>
      {user ? (
        <>
          <Link
            href="/teams/space"
            className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
          >
            🎮 战队管理后台
          </Link>
          <Link
            href="/profile"
            className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
          >
            👤 个人中心
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 card px-4 py-2 hover:scale-105 transition-transform"
              >
                {userProfile.avatar ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                    <Image
                      src={userProfile.avatar}
                      alt="用户头像"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                  >
                    {userProfile.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-gray-800 font-medium">{userProfile.nickname}</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <Link
            href="/forum"
            className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
          >
            📝 社区
          </Link>
          <Link
            href="/team-sales"
            className="px-4 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
          >
            💰 交易
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-2 rounded-xl text-gray-700 hover:text-primary-500 hover:bg-white/50 transition-all duration-300 font-medium"
          >
            登录
          </Link>
          <Link
            href="/auth/register"
            className="btn-primary"
          >
            注册
          </Link>
        </>
      )}
    </div>
  );
}
